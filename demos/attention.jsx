// demos/attention.jsx — scaled dot-product self-attention heatmap.
// Real attention math (Q·Kᵀ / √dₖ → softmax) on deterministic per-token
// embeddings with seeded random projections. Mechanism is real; the projection
// weights are random (not trained), so patterns illustrate the operation, not
// learned semantics — except that identical tokens share an embedding and so
// attend to each other.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  SegmentedControl, Toggle, StatReadout, Legend, ControlGroup, TextField,
} = window;

const D = 24;          // embedding dim
const W = 540, H = 460;

// seeded PRNG (mulberry32)
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function gaussFrom(rng) { let u = 0, v = 0; while (!u) u = rng(); while (!v) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

// deterministic embedding per token
function embed(tok) {
  const rng = mulberry32(hashStr(tok.toLowerCase()));
  const e = new Array(D); for (let i = 0; i < D; i++) e[i] = gaussFrom(rng);
  return e;
}
// seeded projection matrix D×D for a head
function projMatrix(seed) {
  const rng = mulberry32(seed);
  const m = []; for (let i = 0; i < D; i++) { const row = new Array(D); for (let j = 0; j < D; j++) row[j] = gaussFrom(rng) / Math.sqrt(D); m.push(row); }
  return m;
}
function matVec(m, v) { const out = new Array(D).fill(0); for (let i = 0; i < D; i++) { let s = 0; for (let j = 0; j < D; j++) s += m[i][j] * v[j]; out[i] = s; } return out; }
function dot(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }

const RAMP = [[8, 14, 30], [30, 58, 138], [59, 130, 246], [168, 85, 247]];
function ramp(t) {
  t = Math.max(0, Math.min(1, t)) * (RAMP.length - 1);
  const i = Math.min(RAMP.length - 2, Math.floor(t)), f = t - i;
  const m = j => Math.round(RAMP[i][j] + (RAMP[i + 1][j] - RAMP[i][j]) * f);
  return `rgb(${m(0)},${m(1)},${m(2)})`;
}

function AttentionDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const hoverRef = _useRef(-1);
  const dataRef = _useRef({ tokens: [], attn: [] });

  const [text, setText] = _useState("the cat sat on the mat");
  const [head, setHead] = _useState(0);
  const [causal, setCausal] = _useState(false);
  const [scale, setScale] = _useState(true);

  function compute() {
    let tokens = text.trim().split(/\s+/).filter(Boolean).slice(0, 12);
    if (tokens.length === 0) tokens = ["∅"];
    const E = tokens.map(embed);
    const Wq = projMatrix(1000 + head * 7), Wk = projMatrix(5000 + head * 13);
    const Q = E.map(e => matVec(Wq, e)), K = E.map(e => matVec(Wk, e));
    const n = tokens.length, attn = [];
    for (let i = 0; i < n; i++) {
      const scores = [];
      for (let j = 0; j < n; j++) {
        let s = dot(Q[i], K[j]);
        if (scale) s /= Math.sqrt(D);
        if (causal && j > i) s = -Infinity;
        scores.push(s);
      }
      const mx = Math.max(...scores.filter(isFinite));
      const exps = scores.map(s => s === -Infinity ? 0 : Math.exp(s - mx));
      const sum = exps.reduce((a, b) => a + b, 0) || 1;
      attn.push(exps.map(e => e / sum));
    }
    dataRef.current = { tokens, attn };
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const { tokens, attn } = dataRef.current;
    const n = tokens.length;
    const leftM = 92, topM = 96;
    const cell = Math.min((W - leftM - 14) / n, (H - topM - 14) / n, 46);
    const gx = leftM, gy = topM;

    // key labels (top, rotated)
    ctx.save();
    ctx.font = "11px 'JetBrains Mono', monospace"; ctx.fillStyle = "var(--blue-lt)";
    ctx.fillStyle = "#60a5fa";
    for (let j = 0; j < n; j++) {
      ctx.save();
      ctx.translate(gx + j * cell + cell / 2, gy - 8);
      ctx.rotate(-Math.PI / 4); ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(tokens[j].slice(0, 9), 0, 0);
      ctx.restore();
    }
    ctx.restore();

    // cells + query labels
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = hoverRef.current === i ? "#c084fc" : "#94a3b8";
      ctx.font = (hoverRef.current === i ? "bold " : "") + "12px 'JetBrains Mono', monospace";
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.fillText(tokens[i].slice(0, 10), gx - 10, gy + i * cell + cell / 2);
      for (let j = 0; j < n; j++) {
        const w = attn[i][j];
        ctx.fillStyle = ramp(w);
        ctx.globalAlpha = hoverRef.current === -1 || hoverRef.current === i ? 1 : 0.25;
        ctx.fillRect(gx + j * cell + 1, gy + i * cell + 1, cell - 2, cell - 2);
        ctx.globalAlpha = 1;
        if (cell >= 30) {
          ctx.fillStyle = w > 0.5 ? "#fff" : "rgba(224,231,255,0.55)";
          ctx.font = "9px 'JetBrains Mono', monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(w.toFixed(2), gx + j * cell + cell / 2, gy + i * cell + cell / 2);
        }
      }
    }
    // axis hints
    ctx.fillStyle = "#475569"; ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = "left"; ctx.fillText("KEYS (attended to) →", gx, 22);
    ctx.save(); ctx.translate(20, gy + (n * cell) / 2); ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center"; ctx.fillText("QUERIES →", 0, 0); ctx.restore();
  }

  function recompute() { compute(); draw(); }

  function onMove(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const y = (e.clientY - rect.top) / (rect.height / H);
    const x = (e.clientX - rect.left) / (rect.width / W);
    const { tokens } = dataRef.current; const n = tokens.length;
    const leftM = 92, topM = 96;
    const cell = Math.min((W - leftM - 14) / n, (H - topM - 14) / n, 46);
    const i = Math.floor((y - topM) / cell);
    hoverRef.current = (x > leftM - 14 && i >= 0 && i < n) ? i : -1;
    draw();
  }
  function onLeave() { hoverRef.current = -1; draw(); }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    recompute();
  }, []);
  _useEffect(() => { recompute(); }, [text, head, causal, scale]);

  const stage = (
    <canvas ref={canvasRef} onPointerMove={onMove} onPointerLeave={onLeave}
      style={{ touchAction: "none", maxWidth: "100%", borderRadius: 4 }} />
  );

  const tokenCount = dataRef.current.tokens.length;
  const controls = (
    <ControlGroup>
      <TextField label="// INPUT TEXT" value={text} onChange={setText} rows={3} tone="violet"
        placeholder="type a short sentence…" />
      <SegmentedControl label="// HEAD" tone="violet" value={head} onChange={setHead}
        options={[0, 1, 2, 3].map(h => ({ value: h, label: "H" + (h + 1) }))}
        help="Which attention head to view. Each head uses its own query/key projection, so each produces a different pattern — real transformers run many in parallel." />
      <Toggle label="// CAUSAL MASK" checked={causal} onChange={setCausal}
        help="Block each token from attending to later ones (the upper triangle goes dark). This is what makes left-to-right generation possible in GPT-style decoders." />
      <Toggle label="// SCALE BY √dₖ" checked={scale} onChange={setScale}
        help="Divide scores by √dₖ before softmax. Without it, large dot products saturate the softmax into near one-hot weights and gradients vanish — why the scale factor exists." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="TOKENS" value={tokenCount} />
        <StatReadout label="HEAD" value={"H" + (head + 1)} accent="var(--violet-lt)" />
      </div>
      <Legend items={[{ color: ramp(0.05), label: "LOW" }, { color: ramp(0.5), label: "MED" }, { color: ramp(1), label: "HIGH" }]} />
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>Hover a row to isolate one query's attention.</div>
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Each row is a <b>query</b> token asking "who should I pay attention to?";
        each column is a <b>key</b> token answering. The cell is the attention
        weight — how much the row token pulls from the column token — and every row
        sums to 1 (that's the softmax). Concretely, we project each token's
        embedding into a query and a key, score every pair with a dot product,
        divide by <i>√dₖ</i>, and softmax across the row: <i>softmax(QKᵀ/√dₖ)</i>.
      </DemoP>
      <DemoP>
        Turn off <b>scaling</b> and watch the weights get spikier — without the
        <i> √dₖ</i> term, large dot products saturate the softmax and gradients
        vanish, which is exactly why the scale factor exists. Turn on the
        <b> causal mask</b> and the upper triangle goes dark: a token can only
        attend to itself and earlier tokens, the rule that makes GPT-style
        generation possible. Repeat a word (note the two "the"s) — identical tokens
        share an embedding, so they light up for each other. <em>Projections here
        are random, not trained, so this shows the mechanism, not learned
        meaning.</em>
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Scaled dot-product attention is the single operation the entire transformer era is
        built on — GPT, BERT, Llama, Claude, plus vision (ViT), audio, and multimodal
        models all stack it. Its superpower over RNNs is that every token can look at every
        other token in one step (full context, fully parallelizable), which is what made
        training on internet-scale data practical.
      </DemoP>
      <DemoP>
        The mechanics you're toggling are load-bearing in production. The √dₖ scaling keeps
        gradients healthy; the causal mask is what separates <b>decoder</b> (generation)
        from <b>encoder</b> (understanding) models; and "every token attends to all others"
        is also attention's cost — <i>O(n²)</i> in sequence length, the bottleneck that
        FlashAttention, KV-caching, and sparse/linear-attention variants all attack.
        Interpretability researchers read these very heatmaps to find induction and other
        circuits.
      </DemoP>
    </>
  );
  return (
    <DemoLayout
      title="Attention Heatmap"
      subtitle="Type a sentence and watch scaled dot-product self-attention decide which tokens look at which."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/transformers/self-attention/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="violet"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<AttentionDemo />);
