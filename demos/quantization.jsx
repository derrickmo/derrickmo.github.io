// demos/quantization.jsx — post-training weight quantization (fp32 -> int b-bit).
//
// Real symmetric per-tensor quantization: scale = max|w| / (2^(b-1) - 1); each
// weight maps to q = clamp(round(w/scale)) and dequantizes to q*scale, snapping
// to one of ~2^b evenly spaced levels. Fewer bits = smaller model but a coarser
// grid and more error. A few OUTLIERS stretch the scale so the levels spread out
// and the dense bulk of weights all land far from a level — the core problem in
// LLM quantization, which CLIP (clip outliers before scaling) partly fixes.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, Toggle, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480, N = 90;
function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

function QuantizationDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [bits, setBits] = _useState(4);
  const [outlier, setOutlier] = _useState(0.3);
  const [clip, setClip] = _useState(false);
  const [, force] = _useState(0);
  const wRef = _useRef([]);
  const yRef = _useRef([]);

  function gen() {
    const w = [], nOut = Math.round(outlier * 8);
    for (let i = 0; i < N; i++) w.push(0.4 * randn());
    for (let i = 0; i < nOut; i++) w[(Math.random() * N) | 0] = (Math.random() < 0.5 ? -1 : 1) * (2.5 + 2 * Math.random());
    wRef.current = w;
    yRef.current = w.map(() => 78 + Math.random() * 162);
    force(x => x + 1);
  }
  _useEffect(() => { gen(); /* eslint-disable-next-line */ }, [outlier]);

  const w = wRef.current;
  const absMax = Math.max(...w.map(Math.abs), 1e-6);
  // clip threshold = 99th percentile of |w| when clipping
  let clipVal = absMax;
  if (clip) { const s = w.map(Math.abs).sort((a, b) => a - b); clipVal = s[Math.floor(0.97 * (s.length - 1))] || absMax; }
  const qmax = Math.pow(2, bits - 1) - 1;
  const scale = clipVal / qmax;
  const quant = (v) => Math.max(-qmax, Math.min(qmax, Math.round(v / scale))) * scale;
  const wq = w.map(quant);
  let mse = 0, varw = 0, mean = w.reduce((a, b) => a + b, 0) / N, maxErr = 0;
  w.forEach((v, i) => { const e = v - wq[i]; mse += e * e; varw += (v - mean) * (v - mean); if (Math.abs(e) > maxErr) maxErr = Math.abs(e); });
  mse /= N; varw /= N;
  const rmse = Math.sqrt(mse), sqnr = 10 * Math.log10(varw / Math.max(mse, 1e-12)), levels = 2 * qmax + 1;
  const axisMax = absMax * 1.08;

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(bits + "-bit quantization  ·  each weight snaps to the nearest grid level", 20, 24);

    const xOf = (v) => 40 + ((v + axisMax) / (2 * axisMax)) * (W - 80);
    const axisY = 252;
    // clip shading
    if (clip) {
      ctx.fillStyle = "rgba(248,113,113,0.08)";
      ctx.fillRect(40, 60, xOf(-clipVal) - 40, axisY - 60);
      ctx.fillRect(xOf(clipVal), 60, (W - 40) - xOf(clipVal), axisY - 60);
    }
    // quantization level grid
    for (let k = -qmax; k <= qmax; k++) {
      const x = xOf(k * scale);
      ctx.strokeStyle = k === 0 ? "rgba(96,165,250,0.5)" : "rgba(96,165,250,0.22)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, 60); ctx.lineTo(x, axisY); ctx.stroke();
    }
    // axis
    ctx.strokeStyle = "rgba(148,163,184,0.4)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(40, axisY); ctx.lineTo(W - 40, axisY); ctx.stroke();
    ctx.fillStyle = "#64748b"; ctx.font = "9px JetBrains Mono";
    ctx.fillText("0", xOf(0) - 3, axisY + 12);

    // weights snapping to levels
    w.forEach((v, i) => {
      const y = yRef.current[i], x1 = xOf(v), x2 = xOf(wq[i]);
      const err = Math.abs(v - wq[i]) / (scale * 1.0);
      const col = err < 0.25 ? "#34d399" : err < 0.6 ? "#fbbf24" : "#f87171";
      ctx.strokeStyle = col + ""; ctx.globalAlpha = 0.7; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(226,232,240,0.7)"; ctx.beginPath(); ctx.arc(x1, y, 2.2, 0, Math.PI * 2); ctx.fill();   // original
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x2, y, 2.6, 0, Math.PI * 2); ctx.fill();                      // quantized
    });

    // metrics
    const my = 290;
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono";
    ctx.fillText("LEVELS: " + levels + "   ·   step (scale): " + scale.toFixed(3) + (clip ? "   ·   clipped at ±" + clipVal.toFixed(2) : ""), 40, my);
    ctx.fillStyle = "#60a5fa"; ctx.font = "600 26px Space Grotesk, JetBrains Mono";
    ctx.fillText((32 / bits).toFixed(1) + "×", 40, my + 36);
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono"; ctx.fillText("smaller", 40, my + 52);
    ctx.fillStyle = rmse < scale * 0.4 ? "#34d399" : "#fbbf24"; ctx.font = "600 26px Space Grotesk, JetBrains Mono";
    ctx.fillText(rmse.toFixed(3), 160, my + 36);
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono"; ctx.fillText("RMSE", 160, my + 52);
    ctx.fillStyle = "#c084fc"; ctx.font = "600 26px Space Grotesk, JetBrains Mono";
    ctx.fillText(sqnr.toFixed(1) + "dB", 300, my + 36);
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono"; ctx.fillText("signal/quant-noise", 300, my + 52);
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  });

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// BITS" min={2} max={8} step={1} value={bits} onChange={setBits} tone="violet"
        help="Bit-width of the quantized weights. Each bit halves the model size (vs 32-bit float) but halves the number of grid levels — 8-bit is nearly lossless, 4-bit is the LLM sweet spot, 2-bit is brutally coarse. Watch RMSE and levels move." />
      <Slider label="// OUTLIERS" min={0} max={1} step={0.05} value={outlier} onChange={setOutlier}
        help="How many large outlier weights to inject. Outliers blow up max|w|, so the scale stretches and the grid lines spread out — now the dense bulk of normal weights all sit far from any level and quantize badly. This is THE problem in LLM quantization." />
      <Toggle label="// CLIP OUTLIERS" checked={clip} onChange={setClip}
        help="Clip the largest weights (at the 97th percentile) before computing the scale, so the grid is sized for the bulk instead of the outliers. Big drop in RMSE for most weights, at the cost of clipping a few — the intuition behind outlier-aware methods like AWQ." />
      <DemoButton onClick={gen} primary>RESAMPLE</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="LEVELS" value={levels} />
        <StatReadout label="COMPRESSION" value={(32 / bits).toFixed(1) + "×"} accent="#60a5fa" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="RMSE" value={rmse.toFixed(3)} accent="#fbbf24" />
        <StatReadout label="MAX ERR" value={maxErr.toFixed(2)} accent="#f87171" />
      </div>
      <Legend items={[
        { color: "#e2e8f0", label: "fp32 weight" },
        { color: "#34d399", label: "small error" },
        { color: "#f87171", label: "large error" },
        { color: "#60a5fa", label: "quant level" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        A model in 32-bit float is mostly wasted precision. Quantization snaps each
        weight to one of a small number of evenly spaced levels (the blue grid) so
        it can be stored in b bits. The scale that sets the grid spacing is just
        max|w| divided by the largest integer b bits can hold. White dots are the
        original weights; each slides to its nearest level (colored by how far it
        had to move). Fewer BITS means fewer levels, a coarser grid, and bigger
        rounding error — but a smaller, faster model.
      </DemoP>
      <DemoP>
        Now raise OUTLIERS. A handful of large weights drag max|w| way out, the
        whole grid stretches to reach them, and suddenly every ordinary weight in
        the dense cluster is stranded between far-apart levels — RMSE jumps even
        though almost all the weights are small. That single effect is why naive
        low-bit quantization wrecks LLMs. Flip CLIP on: sizing the grid for the
        bulk instead of the outliers restores a fine grid where the mass is, and
        the error collapses.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Quantization is the headline model-efficiency technique: 4-bit weights make
        a 70B model run on a single consumer GPU. Post-training quantization (shown
        here) just rounds a trained model; quantization-aware training simulates the
        rounding during training for better accuracy. The outlier problem you can
        trigger is exactly what modern LLM methods target — per-channel scales,
        GPTQ's error-compensated rounding, AWQ's activation-aware scaling, and
        QLoRA's NF4 format all exist to handle it.
      </DemoP>
      <DemoP>
        It sits in the efficiency toolkit beside pruning (zero out unimportant
        weights), distillation (train a small student from a big teacher), and
        mixed precision, and it pairs with{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/lora/`} style={{ color: "#a855f7" }}>LoRA</a>{" "}
        in QLoRA for cheap fine-tuning. The fundamental tradeoff never goes away:
        bits bought in memory and speed are paid for in precision — the art is
        spending the few bits you keep where the weights actually are, which is the
        whole story this demo tells.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Quantization"
      subtitle="Round fp32 weights to b-bit integers — smaller and faster, but coarser. Watch weights snap to the grid, and how outliers wreck it until you clip them."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/training-systems/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<QuantizationDemo />);
