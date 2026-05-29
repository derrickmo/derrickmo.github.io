// demos/kv-cache.jsx — the KV cache that powers autoregressive LLM inference.
// We run a tiny single-head self-attention with cached vs uncached generation,
// step token by token, and visualize: the K-matrix (left), the V-matrix
// (middle), and the per-step FLOP cost (right bars).

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup, Toggle,
} = window;

const Dk = 6;                  // head dim
const VOCAB = 12;              // tiny vocab
const MAX = 14;                // max generation length

// Random fixed embeddings + Wq/Wk/Wv so the visuals are reproducible.
function fixedRng(seed) { let s = seed * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
const rng = fixedRng(7);
const EMB = Array.from({ length: VOCAB }, () => Array.from({ length: Dk }, () => rng() * 2 - 1));
const Wq = Array.from({ length: Dk }, () => Array.from({ length: Dk }, () => (rng() * 2 - 1) * 0.6));
const Wk = Array.from({ length: Dk }, () => Array.from({ length: Dk }, () => (rng() * 2 - 1) * 0.6));
const Wv = Array.from({ length: Dk }, () => Array.from({ length: Dk }, () => (rng() * 2 - 1) * 0.6));

function matVec(M, v) { return M.map(row => row.reduce((s, r, j) => s + r * v[j], 0)); }
function dot(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
function softmax(xs) { const m = Math.max(...xs); const e = xs.map(x => Math.exp(x - m)); const z = e.reduce((s, x) => s + x, 0); return e.map(x => x / z); }

// Generate a token deterministically from the previous (pretend the LM samples
// argmax over a Wo·attn_out). We just hash the attention output to a vocab id.
function tokenFromOutput(out) {
  const h = out.reduce((s, x, i) => s + x * (i + 1), 0);
  return Math.abs(Math.round(h * 7)) % VOCAB;
}

function KVCacheDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [step, setStep] = _useState(1);
  const [useCache, setUseCache] = _useState(true);
  const [auto, setAuto] = _useState(false);
  const seqRef = _useRef([3]); // start with one token
  const KRef = _useRef([]);    // cached keys
  const VRef = _useRef([]);    // cached values
  const [, force] = _useState(0);
  const flopsRef = _useRef(0); // cumulative
  const stepFlopsRef = _useRef([]); // per-step

  function reset() {
    seqRef.current = [3];
    KRef.current = [];
    VRef.current = [];
    flopsRef.current = 0;
    stepFlopsRef.current = [];
    setStep(1);
  }

  function attendOnce() {
    const seq = seqRef.current;
    const t = seq.length - 1;
    const x = EMB[seq[t]];
    const q = matVec(Wq, x);

    let K, V;
    if (useCache) {
      // Only compute the new K, V for the current token; reuse old.
      const newK = matVec(Wk, x), newV = matVec(Wv, x);
      KRef.current.push(newK); VRef.current.push(newV);
      K = KRef.current; V = VRef.current;
    } else {
      // Recompute K and V for every token in the sequence (no cache).
      K = []; V = [];
      for (let i = 0; i < seq.length; i++) {
        const xi = EMB[seq[i]];
        K.push(matVec(Wk, xi));
        V.push(matVec(Wv, xi));
      }
    }

    const scale = 1 / Math.sqrt(Dk);
    const scores = K.map(k => dot(q, k) * scale);
    const attn = softmax(scores);
    const out = Array(Dk).fill(0);
    for (let i = 0; i < V.length; i++) for (let j = 0; j < Dk; j++) out[j] += attn[i] * V[i][j];

    // FLOPs accounting (Dk*Dk matmul per Wk/Wv computation; Dk dot product per score).
    // Cached: 3 small matmuls (Q, K, V for the new token) + L dots for scores.
    // Uncached: 1 Q + L K + L V matmuls + L dots.
    const L = seq.length;
    const matmul = Dk * Dk;
    const stepFlops = useCache
      ? (3 * matmul) + (L * Dk)
      : ((1 + 2 * L) * matmul) + (L * Dk);
    flopsRef.current += stepFlops;
    stepFlopsRef.current.push(stepFlops);
    return out;
  }

  function step1() {
    if (seqRef.current.length >= MAX) return;
    const out = attendOnce();
    const next = tokenFromOutput(out);
    seqRef.current.push(next);
    setStep(s => s + 1);
  }

  _useEffect(() => {
    if (KRef.current.length === 0 && seqRef.current.length === 1) {
      // initialize cache for the prompt token
      const x0 = EMB[seqRef.current[0]];
      KRef.current = [matVec(Wk, x0)];
      VRef.current = [matVec(Wv, x0)];
    }
    // eslint-disable-next-line
  }, []);

  _useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => {
      if (seqRef.current.length >= MAX) { setAuto(false); return; }
      step1();
    }, 450);
    return () => clearInterval(id);
    // eslint-disable-next-line
  }, [auto, useCache]);

  // Reset everything when cache toggle flips so the comparison is fair.
  _useEffect(() => { reset(); /* eslint-disable-next-line */ }, [useCache]);

  // Draw
  const W = 520, H = 460;
  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const K = useCache ? KRef.current : (() => { const out = []; for (const tok of seqRef.current) out.push(matVec(Wk, EMB[tok])); return out; })();
    const V = useCache ? VRef.current : (() => { const out = []; for (const tok of seqRef.current) out.push(matVec(Wv, EMB[tok])); return out; })();

    const padL = 24, padT = 30;
    const cellH = 22, cellW = 22;
    const colGap = 32;

    function drawGrid(x0, label, M, accent) {
      ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono";
      ctx.fillText(label, x0, padT - 8);
      ctx.strokeStyle = "rgba(96,165,250,0.18)";
      ctx.strokeRect(x0, padT, Dk * cellW, MAX * cellH);
      for (let t = 0; t < MAX; t++) {
        for (let j = 0; j < Dk; j++) {
          if (t < M.length) {
            const v = M[t][j];
            const mag = Math.min(1, Math.abs(v));
            ctx.fillStyle = v >= 0 ? `rgba(${accent[0]},${accent[1]},${accent[2]},${0.1 + 0.8 * mag})` : `rgba(192,132,252,${0.1 + 0.8 * mag})`;
            ctx.fillRect(x0 + j * cellW + 1, padT + t * cellH + 1, cellW - 2, cellH - 2);
          }
        }
        // row labels
        ctx.fillStyle = t < seqRef.current.length ? "#e2e8f0" : "#334155";
        ctx.font = "9px JetBrains Mono";
        ctx.fillText("t" + t, x0 - 18, padT + t * cellH + 14);
      }
    }
    drawGrid(padL + 18, "K (keys)", K, [96, 165, 250]);
    drawGrid(padL + 18 + Dk * cellW + colGap + 18, "V (values)", V, [52, 211, 153]);

    // FLOPs bar chart on the right
    const x0 = padL + 18 + 2 * (Dk * cellW) + 2 * colGap + 18;
    const barW = (W - x0 - 12) / MAX;
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono";
    ctx.fillText("FLOPs / step", x0, padT - 8);
    ctx.strokeStyle = "rgba(96,165,250,0.18)";
    ctx.strokeRect(x0, padT, MAX * barW, MAX * cellH);
    const fs = stepFlopsRef.current;
    const maxF = Math.max(1, ...fs);
    for (let t = 0; t < fs.length; t++) {
      const h = (fs[t] / maxF) * (MAX * cellH - 8);
      ctx.fillStyle = useCache ? "#60a5fa" : "#c084fc";
      ctx.fillRect(x0 + t * barW + 1, padT + MAX * cellH - h - 2, barW - 2, h);
    }
    // x-axis line
    ctx.strokeStyle = "rgba(96,165,250,0.3)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, padT + MAX * cellH); ctx.lineTo(x0 + MAX * barW, padT + MAX * cellH); ctx.stroke();
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw(); force(x => x + 1);
    // eslint-disable-next-line
  }, [step, useCache]);

  const seq = seqRef.current;
  const total = flopsRef.current;
  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Toggle label="// KV CACHE" checked={useCache} onChange={setUseCache}
        help="When ON, we only compute K and V for the new token each step (the rest stay in the cache). When OFF, we recompute K and V for every token in the prefix — wasted work, the standard 'no-cache' baseline." />
      <DemoButton onClick={step1} primary disabled={seq.length >= MAX}>STEP +1 TOKEN</DemoButton>
      <DemoButton onClick={() => setAuto(a => !a)} tone="violet">{auto ? "PAUSE" : "AUTO"}</DemoButton>
      <DemoButton onClick={reset}>RESET</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="TOKENS" value={seq.length} />
        <StatReadout label="TOTAL FLOPS" value={total.toLocaleString()} accent={useCache ? "var(--blue-lt)" : "#c084fc"} />
      </div>
      <Legend items={[
        { color: "#60a5fa", label: "K row" },
        { color: "#34d399", label: "V row" },
        { color: useCache ? "#60a5fa" : "#c084fc", label: "step FLOPs" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Autoregressive generation feeds the model one new token at a time. The
        expensive part of each step is self-attention's keys (<i>K</i>) and values
        (<i>V</i>) for every token in the prefix. Without a cache, you recompute
        every K and V every step — quadratic work. The <b>KV cache</b> stashes them
        so the new step only computes one new K and one new V, then runs a single
        dot product against the cache.
      </DemoP>
      <DemoP>
        Toggle the cache off and the per-step FLOPs bar grows linearly with sequence
        length — total cost is <i>O(n²)</i> over n steps. Toggle it on and per-step
        FLOPs stays nearly flat (just the new row). The K and V grids show the cache
        filling row by row; with cache off, you're recomputing the same rows you
        already saw, every single step.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        The KV cache is the single largest reason production LLM inference is feasible.
        Without it, generating a 4k-token response would re-do attention on the entire
        prefix at every token — quadratic in length on top of an already enormous
        model. Memory cost grows linearly (<i>2 · L · n_layers · n_heads · d_head</i>
        per request), which is why <b>context length</b> is a hardware question:
        Llama 3 70B at 128k context needs tens of gigabytes of KV alone, per request.
      </DemoP>
      <DemoP>
        Almost every modern inference-time optimization is a tweak on top of the KV
        cache: <b>GQA/MQA</b> (heads share K/V to shrink the cache 4-8x);
        <b> PagedAttention</b>, vLLM's trick of treating the cache like virtual
        memory pages to avoid fragmentation; <b>speculative decoding</b> still uses
        the cache, just generates K tokens in parallel. The cache is the substrate;
        the rest is plumbing.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="TRANSFORMERS" title="KV Cache"
      subtitle="Toggle the KV cache and watch per-step compute either stay flat or grow with prefix length — the trick that makes LLM inference tractable."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/llm-systems/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="blue" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<KVCacheDemo />);
