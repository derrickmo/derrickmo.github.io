// demos/lora.jsx — LoRA / low-rank adaptation. A full fine-tuning update ΔW is
// approximated by a rank-r product B·A. Real truncated SVD (power iteration with
// deflation) shows how few parameters recover most of the update.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const D = 24, W = 520, H = 460;

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// a structured "ideal" update: a few dominant directions + a little noise
function makeTarget(seed) {
  const rng = mulberry32(seed);
  const g = () => { let u = 0, v = 0; while (!u) u = rng(); while (!v) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const M = Array.from({ length: D }, () => new Array(D).fill(0));
  const comps = [{ s: 3.0 }, { s: 1.7 }, { s: 0.9 }];
  for (const comp of comps) {
    const u = Array.from({ length: D }, () => g()), v = Array.from({ length: D }, () => g());
    const nu = Math.hypot(...u), nv = Math.hypot(...v);
    for (let i = 0; i < D; i++) for (let j = 0; j < D; j++) M[i][j] += comp.s * (u[i] / nu) * (v[j] / nv);
  }
  for (let i = 0; i < D; i++) for (let j = 0; j < D; j++) M[i][j] += 0.06 * g();
  return M;
}

function truncatedSVD(M, r, iters = 80) {
  const d = M.length;
  const R = M.map(row => row.slice());
  const comps = [];
  const matVec = (A, x) => A.map(row => row.reduce((s, a, j) => s + a * x[j], 0));
  const matTVec = (A, x) => { const out = new Array(d).fill(0); for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) out[j] += A[i][j] * x[i]; return out; };
  const norm = (x) => Math.hypot(...x) || 1e-12;
  let seed = 7;
  for (let k = 0; k < r; k++) {
    let v = new Array(d).fill(0).map(() => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff - 0.5; });
    let nv = norm(v); v = v.map(x => x / nv);
    for (let it = 0; it < iters; it++) { const RtRv = matTVec(R, matVec(R, v)); const n = norm(RtRv); v = RtRv.map(x => x / n); }
    const Rv = matVec(R, v); const s = norm(Rv); const u = Rv.map(x => x / (s || 1e-12));
    comps.push({ u, v, s });
    for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) R[i][j] -= s * u[i] * v[j];
  }
  return comps;
}

function LoRADemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const targetRef = _useRef(makeTarget(3));
  const seedRef = _useRef(3);
  const [rank, setRank] = _useState(2);
  const [stats, setStats] = _useState({ full: 0, lora: 0, save: 0, err: 0 });

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const T = targetRef.current;
    const comps = truncatedSVD(T, rank);

    // approx = sum s u v^T ; factors B (d×r), A (r×d) with sqrt(s) split
    const approx = Array.from({ length: D }, () => new Array(D).fill(0));
    for (const c of comps) for (let i = 0; i < D; i++) for (let j = 0; j < D; j++) approx[i][j] += c.s * c.u[i] * c.v[j];

    let maxAbs = 0;
    for (let i = 0; i < D; i++) for (let j = 0; j < D; j++) maxAbs = Math.max(maxAbs, Math.abs(T[i][j]));
    const cell = (v) => { const m = Math.min(1, Math.abs(v) / (maxAbs || 1)); return v >= 0 ? `rgba(96,165,250,${0.12 + 0.85 * m})` : `rgba(192,132,252,${0.12 + 0.85 * m})`; };

    const heat = (M, ox, oy, sz, cols, label) => {
      const cw = sz / M[0].length, ch = sz / M.length;
      for (let i = 0; i < M.length; i++) for (let j = 0; j < cols; j++) { ctx.fillStyle = cell(M[i][j]); ctx.fillRect(ox + j * cw, oy + i * ch, cw + 0.5, ch + 0.5); }
      ctx.strokeStyle = "rgba(96,165,250,0.25)"; ctx.lineWidth = 1; ctx.strokeRect(ox, oy, cw * cols, ch * M.length);
      ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono, monospace"; ctx.textAlign = "left"; ctx.fillText(label, ox, oy - 7);
    };

    const sz = 180;
    heat(T, 30, 30, sz, D, "ΔW  (full update · d×d)");
    heat(approx, 310, 30, sz, D, "B·A  (rank-" + rank + " approx)");

    // factor matrices
    const Bm = Array.from({ length: D }, (_, i) => comps.map(c => Math.sqrt(c.s) * c.u[i]));
    const Am = comps.map(c => Array.from({ length: D }, (_, j) => Math.sqrt(c.s) * c.v[j]));
    const fcw = 10;
    heat(Bm, 30, 270, Bm.length * (sz / D), rank, "B  (d×r)");
    // draw A as r rows
    const Aw = sz, Ah = (sz / D) * rank;
    heat(Am, 310, 270, Aw, D, "A  (r×d)");

    const full = D * D, lora = 2 * D * rank;
    let num = 0, den = 0;
    for (let i = 0; i < D; i++) for (let j = 0; j < D; j++) { const e = T[i][j] - approx[i][j]; num += e * e; den += T[i][j] * T[i][j]; }
    const err = Math.sqrt(num / den) * 100;
    setStats({ full, lora, save: Math.round(100 * (1 - lora / full)), err });
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  }, []);
  _useEffect(() => { draw(); /* eslint-disable-next-line */ }, [rank]);

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label={`// RANK r (of ${D})`} min={1} max={12} value={rank} onChange={setRank}
        help="The rank of the B·A approximation — how many directions the update is allowed. Higher rank fits ΔW more exactly but uses more parameters (2·d·r vs the full d²)." />
      <DemoButton onClick={() => { seedRef.current += 1; targetRef.current = makeTarget(seedRef.current); draw(); }} primary>NEW UPDATE</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="FULL PARAMS" value={stats.full} accent="#c084fc" />
        <StatReadout label="LoRA PARAMS" value={stats.lora} accent="#60a5fa" />
        <StatReadout label="PARAMS SAVED" value={stats.save + "%"} accent="#34d399" />
        <StatReadout label="RECON ERROR" value={stats.err.toFixed(1) + "%"} accent="#fbbf24" />
      </div>
      <Legend items={[{ color: "#60a5fa", label: "POSITIVE" }, { color: "#c084fc", label: "NEGATIVE" }]} />
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>r = 1 → 12. Even a tiny rank rebuilds most of the update at a fraction of the parameters.</div>
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Full fine-tuning learns a dense update <b>ΔW</b> for every weight matrix —
        billions of trainable parameters. <b>LoRA</b> bets that the update you actually
        need is <i>low-rank</i>, so it freezes W and learns only two thin matrices,
        <b> B</b> (d×r) and <b>A</b> (r×d), whose product B·A stands in for ΔW. Slide
        the <b>rank r</b> and compare the panels: the right one is the best rank-r
        approximation of the full update on the left (real truncated SVD), and the
        reconstruction error drops fast because real fine-tuning updates concentrate
        their energy in a few directions.
      </DemoP>
      <DemoP>
        The win is the parameter count: full = d², LoRA = 2·d·r. At r = 2 on this
        24×24 matrix you're already training a fraction of the weights while recovering
        most of the update — and at GPT scale that's the difference between needing a
        cluster and fine-tuning on a single GPU. This is why LoRA (and QLoRA) became
        the default way to adapt large models, and why you can ship dozens of tiny
        per-task adapters instead of dozens of full model copies.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        LoRA is the default way to adapt large models on a budget. Instead of fine-tuning
        billions of weights, you train two thin matrices per layer — often under 1% of the
        parameters — which means a single GPU instead of a cluster, and tiny per-task
        adapters (a few MB) you can swap or stack at serving time rather than storing full
        model copies. <b>QLoRA</b> pushes it further by combining LoRA with a 4-bit
        quantized base.
      </DemoP>
      <DemoP>
        It works because fine-tuning updates are empirically <i>low-rank</i> — adapting a
        pretrained model nudges a few directions rather than rewriting everything (the same
        low-rank/SVD intuition behind PCA and matrix factorization). That insight powers a
        whole family of parameter-efficient methods (adapters, prefix and prompt tuning),
        and it's what makes the ecosystem of community fine-tunes and per-customer
        customization economically possible.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="LoRA — Low-Rank Adaptation"
      subtitle="Approximate a full weight update with two thin matrices — most of the change, a fraction of the parameters."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/fine-tuning/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<LoRADemo />);
