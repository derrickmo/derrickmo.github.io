// demos/weight-init.jsx — why initialization scale makes or breaks deep nets.
//
// Forward-propagate a batch through a deep stack of linear layers + a
// nonlinearity and track the activation standard deviation at each layer. The
// only thing we change is how the weights are drawn:
//   naive   W ~ N(0, gain²)            (no fan-in scaling — the classic mistake)
//   Xavier  W ~ N(0, gain²/fan_in)     (keeps variance ~1 through tanh/linear)
//   He      W ~ N(0, gain²·2/fan_in)   (keeps variance ~1 through ReLU)
// Pick the wrong scale and the signal's std explodes (→ saturation / NaNs) or
// collapses toward zero (→ vanishing gradients) exponentially with depth. The
// right scale keeps the std pinned near 1 all the way down — that's the whole
// reason Xavier/He init exist. The y-axis is log(std) so both failure modes show.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480;
const B = 64, D = 24;

function WeightInitDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [scheme, setScheme] = _useState("xavier");
  const [gain, setGain] = _useState(1.0);
  const [depth, setDepth] = _useState(20);
  const [act, setAct] = _useState("tanh");
  const [seed, setSeed] = _useState(1);
  const [, setTick] = _useState(0);
  const ref = _useRef(null);

  function rng(s0) { let s = s0 >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function randn(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  const relu = (x) => Math.max(0, x);
  const tanh = (x) => Math.tanh(x);

  function sdFor(sch) {
    if (sch === "naive") return gain;                       // no fan-in scaling
    if (sch === "he") return gain * Math.sqrt(2 / D);        // He
    return gain * Math.sqrt(1 / D);                          // Xavier/Glorot
  }

  function forward(sch, r) {
    const f = act === "relu" ? relu : tanh;
    const sd = sdFor(sch);
    let a = Array.from({ length: B }, () => Array.from({ length: D }, () => randn(r)));
    const stds = []; let lastFlat = null, sat = 0;
    for (let l = 0; l < depth; l++) {
      const Wt = Array.from({ length: D }, () => Array.from({ length: D }, () => sd * randn(r)));
      const z = a.map(row => { const o = new Array(D).fill(0); for (let j = 0; j < D; j++) { let s = 0; for (let i = 0; i < D; i++) s += row[i] * Wt[i][j]; o[j] = s; } return o; });
      a = z.map(row => row.map(f));
      const flat = []; for (let i = 0; i < B; i++) for (let j = 0; j < D; j++) flat.push(a[i][j]);
      let mean = 0; flat.forEach(v => mean += v); mean /= flat.length;
      let varr = 0; flat.forEach(v => varr += (v - mean) * (v - mean)); varr /= flat.length;
      stds.push(Math.sqrt(varr) || 1e-9);
      if (l === depth - 1) {
        lastFlat = flat;
        if (act === "tanh") flat.forEach(v => { if (Math.abs(v) > 0.95) sat++; });
        else flat.forEach(v => { if (v === 0) sat++; });
        sat /= flat.length;
      }
    }
    return { stds, lastFlat, sat };
  }

  function run() {
    const base = seed * 1000003 + depth * 91 + (act === "relu" ? 5 : 0);
    // compute all three schemes from the SAME random stream offset for fair compare
    const all = {};
    ["naive", "xavier", "he"].forEach((s, idx) => { all[s] = forward(s, rng(base + idx * 17)); });
    ref.current = { all, sel: all[scheme] };
  }
  _useEffect(() => { run(); setTick(t => t + 1); /* eslint-disable-next-line */ }, [scheme, gain, depth, act, seed]);

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";
    const st = ref.current; if (!st) return;

    // ---- Panel A: log(std) vs depth, all three schemes ----
    const pad = 44, aTop = 36, aH = 250;
    const L = depth;
    const logLo = -3, logHi = 3; // log10(std)
    const AX = (l) => pad + l / Math.max(1, L - 1) * (W - pad - 20);
    const AY = (s) => { const lg = Math.max(logLo, Math.min(logHi, Math.log10(s))); return aTop + (1 - (lg - logLo) / (logHi - logLo)) * aH; };

    ctx.fillStyle = "#e2e8f0"; ctx.fillText("ACTIVATION std across depth  (log scale)", pad, 20);
    // target std=1 line
    ctx.strokeStyle = "rgba(251,191,36,0.7)"; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(pad, AY(1)); ctx.lineTo(W - 20, AY(1)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#fbbf24"; ctx.font = "9px JetBrains Mono"; ctx.fillText("ideal std = 1 (healthy)", W - 150, AY(1) - 4);
    // gridlines at 0.01,0.1,1,10,100
    ctx.fillStyle = "#475569"; [0.01, 0.1, 1, 10, 100].forEach(v => ctx.fillText(v.toString(), 8, AY(v) + 3));

    const colors = { naive: "#f87171", xavier: "#60a5fa", he: "#34d399" };
    ["naive", "xavier", "he"].forEach(s => {
      const sel = s === scheme;
      ctx.strokeStyle = colors[s]; ctx.globalAlpha = sel ? 1 : 0.35; ctx.lineWidth = sel ? 2.6 : 1.5;
      ctx.beginPath(); st.all[s].stds.forEach((v, l) => { const x = AX(l), y = AY(v); l === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }); ctx.stroke();
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#64748b"; ctx.font = "9px JetBrains Mono"; ctx.fillText("layer →  (1 … " + L + ")", pad, aTop + aH + 14);

    // ---- Panel B: final-layer activation histogram (selected scheme) ----
    const bTop = aTop + aH + 36, bH = H - bTop - 20, bPad = 44;
    const flat = st.sel.lastFlat || [];
    const rng2 = act === "relu" ? [0, Math.max(0.5, Math.min(6, percentile(flat, 0.98)))] : [-1.05, 1.05];
    const bins = 30, hist = new Array(bins).fill(0);
    flat.forEach(v => { const t = (Math.max(rng2[0], Math.min(rng2[1], v)) - rng2[0]) / (rng2[1] - rng2[0]); hist[Math.min(bins - 1, Math.floor(t * bins))]++; });
    const hmax = Math.max(...hist, 1), bw = (W - 2 * bPad) / bins;
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono"; ctx.fillText("FINAL-LAYER ACTIVATIONS  (" + scheme + ")", bPad, bTop - 6);
    hist.forEach((c, i) => { const h = (c / hmax) * bH; ctx.fillStyle = colors[scheme]; ctx.globalAlpha = 0.6; ctx.fillRect(bPad + i * bw + 1, bTop + bH - h, bw - 2, h); });
    ctx.globalAlpha = 1;
  }
  function percentile(arr, p) { if (!arr || !arr.length) return 1; const s = arr.map(Math.abs).sort((a, b) => a - b); return s[Math.floor(s.length * p)] || 1; }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  });

  const st = ref.current;
  const sel = st ? st.sel : null;
  const finalStd = sel ? sel.stds[sel.stds.length - 1] : 0;
  const healthy = finalStd > 0.3 && finalStd < 3 && (!sel || sel.sat < 0.4);
  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <SegmentedControl label="// INIT SCHEME" value={scheme} onChange={setScheme}
        options={[{ value: "naive", label: "Naive" }, { value: "xavier", label: "Xavier" }, { value: "he", label: "He" }]}
        help="Naive draws weights N(0,1) with no fan-in scaling (the signal blows up). Xavier scales by 1/√fan-in (right for tanh/linear). He scales by √2/√fan-in (right for ReLU, which halves the variance). The bold curve is the selected one." />
      <Slider label="// GAIN" min={0.3} max={2.5} step={0.1} value={gain} onChange={setGain}
        help="Extra multiplier on the init scale. Even with the right scheme, detune the gain and the std curve tilts off the ideal line — too low collapses, too high explodes." />
      <Slider label="// DEPTH" min={3} max={40} step={1} value={depth} onChange={setDepth}
        help="Number of layers. The deeper the stack, the more exponentially a slightly-wrong scale diverges from std=1 — depth is what turns a small init error into a dead network." />
      <SegmentedControl label="// ACTIVATION" value={act} onChange={setAct}
        options={[{ value: "tanh", label: "tanh" }, { value: "relu", label: "ReLU" }]}
        help="Switch between tanh (where Xavier is correct) and ReLU (where He is correct — note Xavier now undershoots because ReLU zeroes half the signal). The matching scheme is the one that stays flat." />
      <DemoButton onClick={() => setSeed(s => s + 1)} primary>RESAMPLE WEIGHTS</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="FINAL STD" value={finalStd < 0.001 ? finalStd.toExponential(1) : finalStd.toFixed(2)} accent={healthy ? "#34d399" : "#f87171"} />
        <StatReadout label={act === "tanh" ? "SATURATED" : "DEAD UNITS"} value={sel ? (sel.sat * 100).toFixed(0) + "%" : "—"} accent={sel && sel.sat < 0.4 ? "#34d399" : "#fbbf24"} />
      </div>
      <StatReadout label="VERDICT" value={healthy ? "signal preserved" : finalStd >= 3 ? "exploding" : "vanishing"} accent={healthy ? "#34d399" : "#f87171"} />
      <Legend items={[
        { color: "#f87171", label: "Naive (no scaling)" },
        { color: "#60a5fa", label: "Xavier (1/√n)" },
        { color: "#34d399", label: "He (√2/√n)" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        The top panel tracks the standard deviation of activations layer by layer,
        on a log scale so a healthy run sits flat on the yellow std=1 line. Pick
        Naive init: with no fan-in scaling each layer multiplies the variance by the
        fan-in, so the red curve rockets up (or with tanh, pins at saturation) within
        a few layers — gradients downstream are dead on arrival. Pick Xavier and the
        blue curve hugs std=1 the whole way: that 1/√fan-in scaling is exactly what
        cancels the variance growth for a linear/tanh layer.
      </DemoP>
      <DemoP>
        Now switch ACTIVATION to ReLU. Watch Xavier start drifting <i>down</i> — ReLU
        zeroes half its inputs, halving the variance each layer, so the variance-
        preserving scale needs an extra factor of √2. That's He init (green), which
        now stays flat instead. The lesson: the right init depends on the
        nonlinearity, and getting it wrong fails exponentially in depth. This is the
        problem <a href={`${window.__DM_BASE || "../../"}visualize/batch-norm/`} style={{ color: "#a855f7" }}>BatchNorm</a> later
        made the network robust to.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Initialization scale is one of the quiet reasons deep learning works.
        Xavier/Glorot (2010) and He (2015) init derive the weight variance that keeps
        forward activations — and backward gradients — at unit scale through many
        layers, which is what makes training deep nets without exotic tricks
        possible. The same variance-budgeting logic shows up in residual scaling,
        LayerNorm, and the careful init of modern transformers. It pairs directly
        with the <a href={`${window.__DM_BASE || "../../"}visualize/activations/`} style={{ color: "#a855f7" }}>activation</a> choice
        and is the static cousin of <a href={`${window.__DM_BASE || "../../"}visualize/batch-norm/`} style={{ color: "#a855f7" }}>normalization</a>.
      </DemoP>
      <DemoP>
        Caveats: this demo shows the forward signal; the matching argument for the
        backward gradient is what really matters, and Glorot's full criterion
        averages the two (fan-in and fan-out). Real nets also have biases, residual
        connections, and normalization layers that change the calculus — modern
        architectures are often robust to init precisely because they add those.
        Still, on a plain deep MLP, a √2 you forgot is the difference between training
        and a flat loss curve.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="NEURAL NETWORKS" title="Weight Initialization"
      subtitle="The activation signal's std either stays near 1 or diverges exponentially with depth, depending entirely on how the weights are scaled. Compare Naive vs Xavier vs He, and switch the activation to see which scheme is right."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/training-systems/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<WeightInitDemo />);
