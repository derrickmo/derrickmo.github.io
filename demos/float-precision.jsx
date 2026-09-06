// demos/float-precision.jsx — where floating point stops telling the truth.
// Benched first, in fp32 via Math.fround: summing 1e6 copies of 1e-3 gives 991.14 rather than
// 1000 (0.886% error), Kahan recovers 1000.0001, and 1.0 + 1e-8 is exactly 1.0. Every number
// on this page is computed live in the browser, not quoted.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const { DemoLayout, DemoP, Slider, StatReadout, SegmentedControl, DemoButton } = window;

const W = 560, H = 380;
const f32 = (x) => Math.fround(x);

// fp16 has no native JS type; round-trip through its 10-bit mantissa to emulate it
function toF16(x) {
  if (x === 0) return 0;
  if (!isFinite(x)) return x;
  const sign = Math.sign(x); x = Math.abs(x);
  if (x > 65504) return sign * Infinity;
  if (x < 6.103515625e-5) {                        // subnormal region
    const step = 5.960464477539063e-8;
    return sign * Math.round(x / step) * step;
  }
  const e = Math.floor(Math.log2(x));
  const step = Math.pow(2, e - 10);
  return sign * Math.round(x / step) * step;
}

const FORMATS = {
  fp32: { round: f32, eps: 1.1920929e-7, max: 3.4e38, minNormal: 1.18e-38, mant: 23, label: "fp32" },
  fp16: { round: toF16, eps: 9.77e-4, max: 65504, minNormal: 6.10e-5, mant: 10, label: "fp16" },
};

function FloatPrecisionDemo() {
  const cvRef = _useRef(null);
  const [fmt, setFmt] = _useState("fp32");
  const [logN, setLogN] = _useState(6);            // 10^6 terms
  const [logTerm, setLogTerm] = _useState(-3);     // each term 10^-3
  const [kahan, setKahan] = _useState(false);

  const F = FORMATS[fmt];
  const N = Math.round(Math.pow(10, logN));
  const term = Math.pow(10, logTerm);
  const trueSum = N * term;

  // ⚠ NO SCALING. A previous version summed 300k terms and multiplied by N/300k to stay
  // responsive; that does not approximate the error, it INVERTS it — the scaled partial read
  // 1003.86 (over) where the real million-term sum reads 991.14 (under). The page then
  // disagreed with its own prose. 1e6 fround adds measure 6.4 ms, so just do the work.
  const reps = N;
  let naive = F.round(0), comp = F.round(0), cc = F.round(0);
  const t = F.round(term);
  for (let i = 0; i < reps; i++) {
    naive = F.round(naive + t);
    const y = F.round(t - cc), s2 = F.round(comp + y);
    cc = F.round(F.round(s2 - comp) - y); comp = s2;
  }
  const naiveSum = naive, kahanSum = comp;
  const shown = kahan ? kahanSum : naiveSum;
  const relErr = Math.abs(shown - trueSum) / trueSum * 100;

  // when does adding `term` to the running total stop changing it?
  const stallsAt = term / F.eps;

  _useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = window.fitCanvas ? window.fitCanvas(cv, W, H) : cv.getContext("2d");
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = "#0b1530"; ctx.fillRect(0, 0, W, H);

    const pad = 46, w = W - pad * 2, h = H - pad * 2;
    ctx.strokeStyle = "#1e3a6e"; ctx.lineWidth = 1;
    ctx.strokeRect(pad, pad, w, h);

    // running sum vs the true line, sampled
    const pts = 90;
    let a = F.round(0), b = F.round(0), c2 = F.round(0);
    const stepN = Math.max(1, Math.floor(reps / pts));
    const seriesN = [], seriesK = [];
    for (let i = 0, k = 0; i < reps; i++) {
      a = F.round(a + t);
      const y = F.round(t - c2), s2 = F.round(b + y); c2 = F.round(F.round(s2 - b) - y); b = s2;
      if (i % stepN === 0) { seriesN.push(a); seriesK.push(b); k++; }
    }
    const all = seriesN.concat(seriesK, [trueSum]);
    const lo = Math.min(...all), hi = Math.max(...all);
    const span = (hi - lo) || 1;
    const X = (i, arr) => pad + (i / (arr.length - 1 || 1)) * w;
    const Y = (v) => pad + h - ((v - lo) / span) * h;

    // the truth
    ctx.strokeStyle = "#64748b"; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(pad, Y(trueSum)); ctx.lineTo(pad + w, Y(trueSum)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = "10px JetBrains Mono, monospace"; ctx.fillStyle = "#94a3b8";
    ctx.fillText("exact  " + trueSum.toPrecision(6), pad + 4, Y(trueSum) - 6);

    const draw = (arr, colour) => {
      ctx.strokeStyle = colour; ctx.lineWidth = 1.8; ctx.beginPath();
      arr.forEach((v, i) => { const x = X(i, arr), y = Y(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke();
    };
    draw(seriesN, "#fbbf24");
    if (kahan) draw(seriesK, "#34d399");

    ctx.fillStyle = "#fbbf24"; ctx.fillText("naive", pad + w - 88, pad + 16);
    if (kahan) { ctx.fillStyle = "#34d399"; ctx.fillText("compensated", pad + w - 88, pad + 32); }
    ctx.fillStyle = "#64748b";
    ctx.fillText("terms accumulated ->", pad, H - 16);
  }, [fmt, logN, logTerm, kahan]);

  const stage = (
    <canvas ref={cvRef} width={W} height={H}
      style={{ width: "100%", maxWidth: W * 1.35, borderRadius: 6, border: "1px solid var(--border)", background: "#0b1530" }} />
  );

  const controls = (
    <>
      <SegmentedControl label="// FORMAT" value={fmt} onChange={setFmt}
        options={[{ value: "fp32", label: "FP32" }, { value: "fp16", label: "FP16" }]}
        help="fp16 keeps 10 mantissa bits against fp32's 23, so its gaps between representable numbers are about 8000x wider." />
      <Slider label="TERMS (10^n)" min={3} max={6} step={1} value={logN} onChange={setLogN}
        help="More terms means a larger running total, and a larger total has coarser gaps - so the error grows faster than linearly." />
      <Slider label="EACH TERM (10^n)" min={-6} max={-1} step={1} value={logTerm} onChange={setLogTerm}
        help="Smaller terms are swallowed sooner. The STALLS AT readout is the total beyond which adding one does nothing at all." />
      <SegmentedControl label="// SUMMATION" value={kahan ? "kahan" : "naive"} onChange={(v) => setKahan(v === "kahan")}
        options={[{ value: "naive", label: "NAIVE" }, { value: "kahan", label: "COMPENSATED" }]}
        help="Kahan summation carries the lost low-order bits in a second variable and adds them back. Same arithmetic type, far less error." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginTop: 14 }}>
        <StatReadout label="EXACT" value={trueSum.toPrecision(6)} accent="#94a3b8" />
        <StatReadout label="COMPUTED" value={shown.toPrecision(6)} accent={kahan ? "#34d399" : "#fbbf24"} />
        <StatReadout label="RELATIVE ERROR" value={relErr < 0.001 ? relErr.toExponential(1) + "%" : relErr.toFixed(3) + "%"} accent={relErr > 0.1 ? "#f87171" : "#34d399"} />
        <StatReadout label="STALLS AT" value={stallsAt.toExponential(1)} accent="#60a5fa" />
      </div>
    </>
  );

  const explainer = (
    <>
      <DemoP>
        Floating point stores a fixed number of significant digits, not a fixed spacing. The gap
        between representable numbers grows with magnitude, so <code>1.0 + 1e-8</code> in fp32 is
        exactly <code>1.0</code> — the addend falls below one unit in the last place and there is
        nowhere to put it. Nothing errors, nothing warns.
      </DemoP>
      <DemoP>
        Watch the naive curve bend away from the dashed exact line. Summing a million copies of
        <code> 1e-3</code> in fp32 gives about <strong>991.14</strong>, not 1000 — a
        <strong> 0.886% error</strong> from arithmetic alone, and it gets worse as the running total
        grows because the gaps widen with it. The STALLS AT readout is where the process dies
        entirely: once the total exceeds term / epsilon, every further addition is a no-op and the
        sum simply stops moving.
      </DemoP>
      <DemoP>
        Switch to <strong>COMPENSATED</strong>. Kahan summation keeps the bits that fell off the
        end in a second variable and feeds them back next iteration, recovering ~1000.0001 in the
        same fp32. The lesson is not "use float64" — it is that the <em>order and method</em> of
        accumulation matter as much as the type. Then switch to <strong>FP16</strong> and watch it
        fall apart much sooner: 10 mantissa bits instead of 23, and a subnormal floor near 6e-8
        below which a gradient is not small, it is zero.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        This is the whole reason
        {" "}<a href={`${window.__DM_BASE || "../../"}visualize/mixed-precision/`}>mixed precision</a>{" "}
        exists. fp16 halves memory and doubles throughput, but gradients routinely live below its
        subnormal floor — so loss scaling multiplies them up into representable range before the
        backward pass and divides back after. bf16 solves it differently, keeping fp32's exponent
        range and sacrificing mantissa bits instead, which is why it usually needs no scaler at all.
      </DemoP>
      <DemoP>
        The same effect explains a batch-size-dependent bug you will eventually meet: accumulate
        enough terms in fp16 and the running sum stops updating, so a loss that is a mean over many
        elements quietly stops matching the same loss computed in fp32. Reductions are normally
        forced to fp32 for exactly this reason, even when the surrounding maths is half precision.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      title="Floating-Point Precision"
      subtitle="Where the arithmetic stops telling the truth - 1.0 + 1e-8 = 1.0, a million small terms that sum to the wrong number, and the fp16 floor."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/foundations/complexity/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="violet"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<FloatPrecisionDemo />);
