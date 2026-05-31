// demos/mixed-precision.jsx — mixed-precision training: fp16/bf16 dynamic range
// and loss scaling.
//
// fp16 stores numbers in a NARROW range (min normal 2^-14 ≈ 6.1e-5, max 65504):
// gradients smaller than the min flush to zero (underflow → lost signal), larger
// than the max become inf (overflow → NaN training). LOSS SCALING multiplies the
// loss (hence every gradient) by S before backprop, shifting the gradient
// histogram up into fp16's window, then unscales before the optimizer step.
// bf16 keeps fp32's exponent range (no scaling needed) but fewer mantissa bits.
// Real format bounds; honest log-scale gradient histogram you shift with S.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  SegmentedControl, Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480;
const FMT = {
  fp16: { min: Math.pow(2, -14), max: 65504, mant: 10, label: "fp16" },
  bf16: { min: Math.pow(2, -126), max: 3.39e38, mant: 7, label: "bf16" },
  fp32: { min: Math.pow(2, -126), max: 3.4e38, mant: 23, label: "fp32" },
};
const LMIN = -10, LMAX = 6;
function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

function MixedPrecisionDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [fmt, setFmt] = _useState("fp16");
  const [logScale, setLogScale] = _useState(0);     // loss scale = 2^logScale
  const [gradMedian, setGradMedian] = _useState(-4); // log10 of typical |grad|
  const [, force] = _useState(0);
  const gradsRef = _useRef([]);

  function gen() { gradsRef.current = Array.from({ length: 2400 }, () => Math.pow(10, gradMedian + 0.9 * randn())); force(x => x + 1); }
  _useEffect(() => { gen(); /* eslint-disable-next-line */ }, [gradMedian]);

  const f = FMT[fmt], S = Math.pow(2, logScale);
  const grads = gradsRef.current.map(g => g * S);
  let under = 0, over = 0, ok = 0;
  grads.forEach(g => { if (g < f.min) under++; else if (g > f.max) over++; else ok++; });
  const n = grads.length || 1;

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#94a3b8"; ctx.fillText("GRADIENT MAGNITUDES (log scale) vs the " + f.label + " representable window", 20, 24);

    const px = 30, pw = W - 60, axisY = 250, top = 50;
    const xOf = (L) => px + ((L - LMIN) / (LMAX - LMIN)) * pw;
    // format band
    const bandL = Math.max(LMIN, Math.log10(f.min)), bandR = Math.min(LMAX, Math.log10(f.max));
    ctx.fillStyle = "rgba(52,211,153,0.10)"; ctx.fillRect(xOf(bandL), top, xOf(bandR) - xOf(bandL), axisY - top);
    ctx.strokeStyle = "rgba(52,211,153,0.5)"; ctx.lineWidth = 1.5;
    ctx.strokeRect(xOf(bandL), top, xOf(bandR) - xOf(bandL), axisY - top);
    ctx.fillStyle = "rgba(248,113,113,0.07)"; ctx.fillRect(px, top, xOf(bandL) - px, axisY - top); // underflow
    if (bandR < LMAX) ctx.fillRect(xOf(bandR), top, xOf(LMAX) - xOf(bandR), axisY - top);          // overflow

    // histogram (log-binned, after scaling)
    const BINS = 64, counts = new Array(BINS).fill(0);
    grads.forEach(g => { const L = Math.log10(g); const b = Math.max(0, Math.min(BINS - 1, Math.floor((L - LMIN) / (LMAX - LMIN) * BINS))); counts[b]++; });
    const maxC = Math.max(...counts, 1), bw = pw / BINS;
    for (let b = 0; b < BINS; b++) {
      const L = LMIN + (b + 0.5) / BINS * (LMAX - LMIN), inBand = Math.pow(10, L) >= f.min && Math.pow(10, L) <= f.max;
      const h = (counts[b] / maxC) * (axisY - top - 6), x = px + b * bw;
      ctx.fillStyle = inBand ? "#60a5fa" : "#f87171";
      ctx.fillRect(x, axisY - h, bw - 1, h);
    }
    // axis ticks (powers of 10)
    ctx.strokeStyle = "rgba(148,163,184,0.3)"; ctx.beginPath(); ctx.moveTo(px, axisY); ctx.lineTo(px + pw, axisY); ctx.stroke();
    ctx.fillStyle = "#64748b"; ctx.font = "9px JetBrains Mono"; ctx.textAlign = "center";
    for (let L = LMIN; L <= LMAX; L += 4) ctx.fillText("1e" + L, xOf(L), axisY + 12);
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(248,113,113,0.8)"; ctx.fillText("← underflow → 0", px + 4, top + 14);
    if (bandR < LMAX) { ctx.textAlign = "right"; ctx.fillText("overflow → inf →", px + pw - 4, top + 14); ctx.textAlign = "left"; }

    // readout bars
    const by = axisY + 40;
    ctx.font = "11px JetBrains Mono";
    const bar = (yy, label, frac, col) => {
      ctx.fillStyle = "#94a3b8"; ctx.fillText(label, 30, yy + 12);
      ctx.fillStyle = "rgba(148,163,184,0.15)"; ctx.fillRect(160, yy, W - 240, 16);
      ctx.fillStyle = col; ctx.fillRect(160, yy, (W - 240) * frac, 16);
      ctx.fillStyle = "#e2e8f0"; ctx.fillText((frac * 100).toFixed(1) + "%", 160 + (W - 240) * frac + 6, yy + 12);
    };
    bar(by, "preserved", ok / n, "rgba(52,211,153,0.8)");
    bar(by + 26, "underflowed (lost)", under / n, "rgba(248,113,113,0.7)");
    bar(by + 52, "overflowed (NaN)", over / n, "rgba(251,191,36,0.8)");
    ctx.fillStyle = "#64748b"; ctx.font = "10px JetBrains Mono";
    ctx.fillText("loss scale S = " + S.toLocaleString() + "   ·   mantissa: " + f.mant + " bits   ·   format: " + f.label, 30, by + 80);
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
      <SegmentedControl label="// FORMAT" tone="violet" value={fmt} onChange={setFmt}
        options={[{ value: "fp16", label: "fp16" }, { value: "bf16", label: "bf16" }, { value: "fp32", label: "fp32" }]}
        help="The storage format for activations/gradients. fp16 has a narrow exponent range (loss scaling needed); bf16 keeps fp32's range (almost nothing under/overflows) but only 7 mantissa bits; fp32 is the full-precision baseline." />
      <Slider label="// LOSS SCALE (2^x)" min={0} max={16} step={1} value={logScale} onChange={setLogScale}
        help="Multiplies the loss — and so every gradient — by 2^x before backprop, sliding the whole histogram right into the format's window so small gradients stop flushing to zero. Push it too far in fp16 and the big tail overflows to inf. (Unscaled before the optimizer step.)" />
      <Slider label="// TYPICAL |GRAD| (1e^x)" min={-7} max={-1} step={0.5} value={gradMedian} onChange={setGradMedian}
        help="Where the gradient magnitudes sit (their median, as a power of ten). Late in training or in deep stacks they get tiny — exactly when fp16 underflow bites and loss scaling earns its keep." />
      <DemoButton onClick={gen} primary>RESAMPLE</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="PRESERVED" value={(ok / n * 100).toFixed(0) + "%"} accent={ok / n > 0.95 ? "#34d399" : "#fbbf24"} />
        <StatReadout label="LOST" value={((under + over) / n * 100).toFixed(0) + "%"} accent={(under + over) / n < 0.05 ? "#34d399" : "#f87171"} />
      </div>
      <StatReadout label="MANTISSA BITS" value={f.mant} accent="#60a5fa" />
      <Legend items={[
        { color: "#34d399", label: "format window" },
        { color: "#60a5fa", label: "representable grads" },
        { color: "#f87171", label: "under/overflow" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Training in 16-bit halves memory and doubles throughput on tensor-core
        hardware, but fp16 pays for it with a narrow dynamic range. The green band
        is everything fp16 can represent; gradients to its left underflow and flush
        to zero (lost signal), and any to its right overflow to infinity (which
        poisons the whole step as NaN). Slide TYPICAL |GRAD| down and watch a big
        red chunk of the histogram fall off the left edge — the tiny gradients deep
        nets produce simply vanish.
      </DemoP>
      <DemoP>
        Loss scaling is the fix: multiply the loss by a big constant S so every
        gradient scales up by S too, sliding the whole histogram right into the
        green window — then divide it back out before the optimizer updates the
        weights, so the math is unchanged but nothing underflowed. Raise LOSS SCALE
        and watch "preserved" climb to ~100%; overshoot in fp16 and the right tail
        starts overflowing. Switch to bf16 and the window stretches across the whole
        axis — no scaling needed — but you've traded mantissa bits (precision) for
        that range.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Mixed precision (Micikevicius et al., 2018) is standard for training large
        models: keep a master copy of weights in fp32, run the forward/backward in
        16-bit for speed and memory, and use loss scaling (often dynamic — back off
        on overflow, ramp up otherwise) to keep fp16 gradients in range. It's the
        numeric-format sibling of{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/quantization/`} style={{ color: "#a855f7" }}>quantization</a>:
        both spend precision for speed and memory, and both live or die on dynamic
        range vs the values' actual magnitudes.
      </DemoP>
      <DemoP>
        bf16 won the training format war precisely because its fp32-matching
        exponent range removes the underflow/overflow headache (no loss scaling),
        and training tolerates its coarser mantissa better than inference tolerates
        a tiny range — which is why bf16 dominates pretraining while fp16/int8 show
        up more in inference. The frontier pushes further: fp8 (E4M3/E5M2) and
        microscaling formats apply the same range-vs-precision tradeoff at ever
        lower bit-widths.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="EFFICIENCY" title="Mixed Precision"
      subtitle="fp16's narrow range makes small gradients vanish and big ones blow up. Slide loss scaling to rescue them — or switch to bf16 and trade precision for range."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/training-systems/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<MixedPrecisionDemo />);
