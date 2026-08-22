// demos/batch-norm.jsx — what BatchNorm actually does to activations.
//
// Push a mini-batch through a deep stack of random linear layers + a
// nonlinearity and watch the per-layer activation distribution. With a weight
// gain ≠ 1 the activations either explode (variance blows up, ReLU) or saturate
// (everything pinned at ±1, tanh) as you go deeper — training stalls. BatchNorm
// inserts a step that re-standardizes each feature across the batch:
//      ẑ = (z − μ_B) / sqrt(σ_B² + ε),   y = γ·ẑ + β
// so every layer sees a clean ~unit-variance input regardless of the weights
// above it. Toggle it on and the distribution stops drifting across depth.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, Toggle, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480;
const B = 64, D = 24;

function BatchNormDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [gain, setGain] = _useState(1.8);
  const [depth, setDepth] = _useState(9);
  const [act, setAct] = _useState("tanh");
  const [bn, setBn] = _useState(false);
  const [gamma, setGamma] = _useState(1.0);
  const [beta, setBeta] = _useState(0.0);
  const [seed, setSeed] = _useState(1);
  const [, setTick] = _useState(0);
  const ref = _useRef(null);

  function rng(s0) { let s = s0 >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function randn(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  const relu = (x) => Math.max(0, x);
  const tanh = (x) => Math.tanh(x);

  function run() {
    const r = rng(seed * 1000003 + depth * 97 + (act === "relu" ? 7 : 0));
    // input batch B×D ~ N(0,1)
    let a = Array.from({ length: B }, () => Array.from({ length: D }, () => randn(r)));
    const layers = []; // store per-layer flattened post-activations + stats
    const f = act === "relu" ? relu : tanh;
    for (let l = 0; l < depth; l++) {
      // weight D×D, entries N(0, gain²/D) → preserves variance at gain=1 (linear)
      const sd = gain / Math.sqrt(D);
      const Wt = Array.from({ length: D }, () => Array.from({ length: D }, () => sd * randn(r)));
      // z = a · W   (B×D)
      let z = a.map(row => { const o = new Array(D).fill(0); for (let j = 0; j < D; j++) { let s = 0; for (let i = 0; i < D; i++) s += row[i] * Wt[i][j]; o[j] = s; } return o; });
      // BatchNorm across the batch dimension (per feature column)
      if (bn) {
        for (let j = 0; j < D; j++) {
          let mu = 0; for (let i = 0; i < B; i++) mu += z[i][j]; mu /= B;
          let vv = 0; for (let i = 0; i < B; i++) { const d = z[i][j] - mu; vv += d * d; } vv /= B;
          const inv = 1 / Math.sqrt(vv + 1e-5);
          for (let i = 0; i < B; i++) z[i][j] = gamma * ((z[i][j] - mu) * inv) + beta;
        }
      }
      // activation
      a = z.map(row => row.map(f));
      // stats
      const flat = []; for (let i = 0; i < B; i++) for (let j = 0; j < D; j++) flat.push(a[i][j]);
      let mean = 0; flat.forEach(v => mean += v); mean /= flat.length;
      let varr = 0; flat.forEach(v => varr += (v - mean) * (v - mean)); varr /= flat.length;
      let sat = 0;
      if (act === "tanh") flat.forEach(v => { if (Math.abs(v) > 0.95) sat++; });
      else flat.forEach(v => { if (v === 0) sat++; });
      layers.push({ flat, mean, std: Math.sqrt(varr), sat: sat / flat.length });
    }
    ref.current = { layers };
  }
  _useEffect(() => { run(); setTick(t => t + 1); /* eslint-disable-next-line */ }, [gain, depth, act, bn, gamma, beta, seed]);

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";
    const st = ref.current; if (!st) return;
    const L = st.layers.length, pad = 36, plotH = H - 92;

    // y-range from data (robust clamp)
    const allAbs = []; st.layers.forEach(ly => ly.flat.forEach(v => allAbs.push(Math.abs(v))));
    allAbs.sort((a, b) => a - b);
    const p98 = allAbs[Math.floor(allAbs.length * 0.98)] || 1;
    const yr = Math.min(8, Math.max(1.1, p98 * 1.05));
    const lo = act === "relu" ? 0 : -yr, hi = yr;
    const PX = (l) => pad + (l + 0.5) / L * (W - 2 * pad);
    const PY = (v) => pad + (1 - (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * (plotH - pad);

    ctx.fillStyle = "#e2e8f0"; ctx.fillText("ACTIVATION DISTRIBUTION across depth" + (bn ? "  ·  BatchNorm ON" : ""), pad, 20);
    // zero line
    ctx.strokeStyle = "rgba(148,163,184,0.25)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, PY(0)); ctx.lineTo(W - pad, PY(0)); ctx.stroke();

    const colW = (W - 2 * pad) / L;
    st.layers.forEach((ly, l) => {
      const cx = PX(l);
      // ±std ribbon
      ctx.fillStyle = "rgba(96,165,250,0.18)";
      ctx.fillRect(cx - colW * 0.32, PY(ly.mean + ly.std), colW * 0.64, Math.max(2, PY(ly.mean - ly.std) - PY(ly.mean + ly.std)));
      // sampled points (jittered)
      const step = Math.max(1, Math.floor(ly.flat.length / 90));
      ctx.fillStyle = "rgba(168,85,247,0.5)";
      for (let i = 0; i < ly.flat.length; i += step) {
        const jx = cx + (Math.random() - 0.5) * colW * 0.5;
        ctx.beginPath(); ctx.arc(jx, PY(ly.flat[i]), 1.3, 0, 7); ctx.fill();
      }
      // mean tick
      ctx.strokeStyle = "#60a5fa"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx - colW * 0.34, PY(ly.mean)); ctx.lineTo(cx + colW * 0.34, PY(ly.mean)); ctx.stroke();
      // layer label
      ctx.fillStyle = "#64748b"; ctx.font = "8px JetBrains Mono"; ctx.fillText(String(l + 1), cx - 3, plotH + 12);
    });
    ctx.fillStyle = "#64748b"; ctx.font = "9px JetBrains Mono"; ctx.fillText("layer →", pad, plotH + 24);

    // std-across-depth strip
    const sy = plotH + 34, sH = 34, smax = Math.max(...st.layers.map(l => l.std), 1e-6);
    ctx.fillStyle = "#94a3b8"; ctx.font = "10px JetBrains Mono"; ctx.fillText("std per layer (flat = healthy):", pad, sy + 4);
    ctx.strokeStyle = "#34d399"; ctx.lineWidth = 2; ctx.beginPath();
    st.layers.forEach((ly, l) => { const x = PX(l), y = sy + 16 + (1 - ly.std / smax) * sH; l === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
    ctx.stroke();
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  });

  const st = ref.current;
  const last = st && st.layers.length ? st.layers[st.layers.length - 1] : null;
  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Toggle label="// BATCHNORM" checked={bn} onChange={setBn}
        help="Insert a BatchNorm step before each activation that re-standardizes features across the batch (then scales by γ, shifts by β). Toggle it to see the activation distribution snap from exploding/saturating to stable across all layers." />
      <Slider label="// WEIGHT GAIN" min={0.4} max={3} step={0.1} value={gain} onChange={setGain}
        help="Scale on the random weights (1.0 ≈ variance-preserving init). Above 1 the signal grows with depth, below 1 it shrinks. Without BatchNorm this wrecks deep layers; with it on, the layers stay healthy regardless." />
      <Slider label="// DEPTH" min={3} max={14} step={1} value={depth} onChange={setDepth}
        help="Number of layers. The deeper the stack, the worse an un-normalized signal drifts — and the more BatchNorm helps." />
      <SegmentedControl label="// ACTIVATION" value={act} onChange={setAct}
        options={[{ value: "tanh", label: "tanh" }, { value: "relu", label: "ReLU" }]}
        help="tanh saturates (values pile up at ±1) when the signal is too large; ReLU lets variance explode and can kill units (stuck at 0). BatchNorm addresses both failure modes." />
      <Slider label="// γ (scale)" min={0.2} max={2} step={0.1} value={gamma} onChange={setGamma}
        help="BatchNorm's learnable scale. Only active when BatchNorm is on; lets the network undo normalization if it actually wants a different variance." />
      <Slider label="// β (shift)" min={-1} max={1} step={0.1} value={beta} onChange={setBeta}
        help="BatchNorm's learnable shift. Only active when BatchNorm is on; recenters the normalized activations." />
      <DemoButton onClick={() => setSeed(s => s + 1)} primary>RESAMPLE WEIGHTS</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="FINAL-LAYER STD" value={last ? last.std.toFixed(2) : "—"} accent={last && last.std > 0.2 && last.std < 3 ? "#34d399" : "#f87171"} />
        <StatReadout label={act === "tanh" ? "SATURATED" : "DEAD UNITS"} value={last ? (last.sat * 100).toFixed(0) + "%" : "—"} accent={last && last.sat < 0.3 ? "#34d399" : "#fbbf24"} />
      </div>
      <Legend items={[
        { color: "#a855f7", label: "activations" },
        { color: "#60a5fa", label: "mean / ±1 std" },
        { color: "#34d399", label: "std across depth" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Each column is one layer; the purple cloud is the spread of that layer's
        activations over a 64-example batch, with the blue band marking ±1 standard
        deviation. With BatchNorm OFF, set WEIGHT GAIN above 1 and walk your eye left
        to right: with tanh the cloud collapses onto ±1 (saturated — gradients die),
        with ReLU the band balloons (variance explodes). Below 1, everything shrinks
        toward zero. Either way the green "std across depth" line slopes off instead
        of staying flat — the deep layers are sick.
      </DemoP>
      <DemoP>
        Flip BATCHNORM on. Every layer now re-standardizes its features across the
        batch before the nonlinearity, so the distribution stops drifting no matter
        what the weights above did — the std line goes flat and saturation drops.
        That decoupling is why BatchNorm lets you train much deeper nets at higher
        learning rates. The γ and β knobs are the learnable scale/shift that let the
        network choose a non-unit distribution if it helps.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        BatchNorm (Ioffe & Szegedy 2015) was a turning point for training deep CNNs:
        it stabilizes the distribution of layer inputs, smooths the loss landscape,
        and acts as a mild regularizer via batch noise. Its relatives — LayerNorm
        (the norm of choice in{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/attention/`} style={{ color: "#a855f7" }}>transformers</a>,
        since it doesn't depend on batch statistics), RMSNorm, GroupNorm — share the
        same idea of controlling activation scale. It works hand in hand with good{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/activations/`} style={{ color: "#a855f7" }}>activation</a>
        choices and{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/gradient-clipping/`} style={{ color: "#a855f7" }}>gradient clipping</a> for stable training.
      </DemoP>
      <DemoP>
        Caveats: BatchNorm couples examples within a batch, so it behaves differently
        at train vs inference (it switches to running averages) and degrades with tiny
        batches — which is why sequence and large-model work leans on LayerNorm/RMSNorm
        instead. The original "internal covariate shift" explanation is now contested;
        the smoothing-of-the-loss-landscape account is better supported. And it adds
        compute and a train/eval discrepancy you have to get right.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Batch Normalization"
      subtitle="Watch a mini-batch's activation distribution drift, explode, or saturate across a deep stack — then turn BatchNorm on and see every layer snap back to a healthy unit-variance spread."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/training-systems/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<BatchNormDemo />);
