// demos/conformal-regression.jsx — split conformal prediction for regression.
//
// A point prediction f̂(x) says nothing about how uncertain it is. Split
// conformal turns any regressor into a PREDICTION INTERVAL with a coverage
// promise: P(y ∈ [lo(x), hi(x)]) >= 1 - alpha, distribution-free.
//   1. Fit f̂ on a training split.
//   2. On a separate calibration split, score each point. Two scores shown:
//        constant : s_i = |y_i - f̂(x_i)|              → fixed-width band
//        adaptive : s_i = |y_i - f̂(x_i)| / σ̂(x_i)     → band scales with local spread
//   3. q̂ = ceil((n+1)(1-alpha))/n empirical quantile of the scores.
//   4. Interval at x: f̂(x) ± q̂           (constant)
//                     f̂(x) ± q̂·σ̂(x)      (adaptive, locally varying width)
// Marginal coverage holds for ANY f̂. A worse model just gives wider bands;
// a heteroscedastic-aware score gives bands that breathe with the noise.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480;
function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

// ground-truth mean curve on x ∈ [0,1]
function truef(x) { return 0.5 + 0.35 * Math.sin(6.2 * x) - 0.25 * x; }

// least-squares polynomial fit via normal equations (small degree → fine).
function polyfit(xs, ys, deg) {
  const n = xs.length, m = deg + 1;
  // design powers
  const A = Array.from({ length: m }, () => new Array(m).fill(0));
  const b = new Array(m).fill(0);
  for (let i = 0; i < n; i++) {
    const pw = [1]; for (let k = 1; k < 2 * m; k++) pw[k] = pw[k - 1] * xs[i];
    for (let r = 0; r < m; r++) {
      b[r] += pw[r] * ys[i];
      for (let c = 0; c < m; c++) A[r][c] += pw[r + c];
    }
  }
  // Gaussian elimination
  for (let c = 0; c < m; c++) {
    let piv = c; for (let r = c + 1; r < m; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    [A[c], A[piv]] = [A[piv], A[c]]; [b[c], b[piv]] = [b[piv], b[c]];
    const d = A[c][c] || 1e-9;
    for (let cc = c; cc < m; cc++) A[c][cc] /= d; b[c] /= d;
    for (let r = 0; r < m; r++) if (r !== c) { const f = A[r][c]; for (let cc = c; cc < m; cc++) A[r][cc] -= f * A[c][cc]; b[r] -= f * b[c]; }
  }
  return b; // coefficients, low → high
}
function polyval(coef, x) { let p = 1, s = 0; for (let k = 0; k < coef.length; k++) { s += coef[k] * p; p *= x; } return s; }

const N_TRAIN = 120, N_CAL = 300, N_TEST = 1500;

function ConformalRegressionDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [alpha, setAlpha] = _useState(0.1);
  const [noise, setNoise] = _useState(0.08);
  const [hetero, setHetero] = _useState(0.18);
  const [degree, setDegree] = _useState(4);
  const [method, setMethod] = _useState("adaptive");
  const [, setTick] = _useState(0);
  const dataRef = _useRef({ train: [], cal: [], test: [] });

  // noise std as a function of x: base + hetero growth toward x=1
  const sig = (x) => noise + hetero * x;

  function gen() {
    const mk = (n) => Array.from({ length: n }, () => {
      const x = Math.random();
      const y = truef(x) + sig(x) * randn();
      return { x, y };
    });
    dataRef.current = { train: mk(N_TRAIN), cal: mk(N_CAL), test: mk(N_TEST) };
  }
  _useEffect(() => { gen(); setTick(t => t + 1); /* eslint-disable-next-line */ }, [noise, hetero]);

  const { train, cal, test } = dataRef.current;

  // fit mean f̂ on train, and a spread model σ̂ on |residual| (also degree-capped)
  let fhat = [0], shat = [0.1];
  if (train.length) {
    fhat = polyfit(train.map(d => d.x), train.map(d => d.y), degree);
    const absres = train.map(d => Math.abs(d.y - polyval(fhat, d.x)));
    shat = polyfit(train.map(d => d.x), absres, Math.min(degree, 3));
  }
  const sigHat = (x) => Math.max(0.02, polyval(shat, x)); // floor to avoid blow-up

  // calibrate q̂
  let qhat = 0;
  if (cal.length) {
    const scores = cal.map(d => {
      const r = Math.abs(d.y - polyval(fhat, d.x));
      return method === "adaptive" ? r / sigHat(d.x) : r;
    }).sort((a, b) => a - b);
    const idx = Math.min(scores.length - 1, Math.ceil((scores.length + 1) * (1 - alpha)) - 1);
    qhat = scores[Math.max(0, idx)];
  }
  const band = (x) => method === "adaptive" ? qhat * sigHat(x) : qhat;

  // coverage + avg width on test
  let cover = 0, width = 0;
  test.forEach(d => {
    const c = polyval(fhat, d.x), h = band(d.x);
    if (d.y >= c - h && d.y <= c + h) cover++;
    width += 2 * h;
  });
  const coverage = test.length ? cover / test.length : 0;
  const avgWidth = test.length ? width / test.length : 0;
  const target = 1 - alpha;

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";

    // plot region
    const pad = 36, plotH = H - 150;
    const yLo = -0.4, yHi = 1.4;
    const X = (x) => pad + x * (W - 2 * pad);
    const Y = (y) => pad + (1 - (y - yLo) / (yHi - yLo)) * (plotH - pad);

    ctx.fillStyle = "#94a3b8";
    ctx.fillText("PREDICTION BAND  ·  f̂(x) ± q̂" + (method === "adaptive" ? "·σ̂(x)" : ""), pad, 20);

    // band fill
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) { const x = i / 120; const yy = polyval(fhat, x) + band(x); i === 0 ? ctx.moveTo(X(x), Y(yy)) : ctx.lineTo(X(x), Y(yy)); }
    for (let i = 120; i >= 0; i--) { const x = i / 120; const yy = polyval(fhat, x) - band(x); ctx.lineTo(X(x), Y(yy)); }
    ctx.closePath();
    ctx.fillStyle = "rgba(96,165,250,0.16)"; ctx.fill();

    // test points (covered / missed)
    for (let i = 0; i < test.length; i += 3) {
      const d = test[i], c = polyval(fhat, d.x), h = band(d.x);
      const ok = d.y >= c - h && d.y <= c + h;
      ctx.fillStyle = ok ? "rgba(148,163,184,0.30)" : "rgba(248,113,113,0.85)";
      ctx.beginPath(); ctx.arc(X(d.x), Y(d.y), ok ? 1.4 : 2.2, 0, 7); ctx.fill();
    }

    // true mean (dashed) + fitted mean (solid)
    ctx.setLineDash([4, 3]); ctx.strokeStyle = "rgba(52,211,153,0.55)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); for (let i = 0; i <= 120; i++) { const x = i / 120; const yy = truef(x); i === 0 ? ctx.moveTo(X(x), Y(yy)) : ctx.lineTo(X(x), Y(yy)); } ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 2.2;
    ctx.beginPath(); for (let i = 0; i <= 120; i++) { const x = i / 120; const yy = polyval(fhat, x); i === 0 ? ctx.moveTo(X(x), Y(yy)) : ctx.lineTo(X(x), Y(yy)); } ctx.stroke();

    // axes baseline
    ctx.strokeStyle = "rgba(148,163,184,0.25)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, Y(yLo)); ctx.lineTo(W - pad, Y(yLo)); ctx.stroke();

    // coverage gauge (zoomed 0.5..1)
    const gY = plotH + 24, gX = pad, gW = W - 2 * pad;
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono";
    ctx.fillText("EMPIRICAL COVERAGE  vs  target 1−α", gX, gY - 6);
    const cmap = (v) => gX + ((Math.max(0.5, v) - 0.5) / 0.5) * gW;
    ctx.fillStyle = "rgba(148,163,184,0.15)"; ctx.fillRect(gX, gY + 4, gW, 16);
    ctx.fillStyle = "rgba(52,211,153,0.6)"; ctx.fillRect(gX, gY + 4, cmap(coverage) - gX, 16);
    ctx.strokeStyle = "#fbbf24"; ctx.setLineDash([4, 3]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cmap(target), gY); ctx.lineTo(cmap(target), gY + 24); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#e2e8f0"; ctx.font = "10px JetBrains Mono";
    ctx.fillText((coverage * 100).toFixed(1) + "%", cmap(coverage) - 16, gY + 36);
    ctx.fillStyle = "#fbbf24"; ctx.fillText("target " + (target * 100).toFixed(0) + "%", cmap(target) - 24, gY - 6);

    ctx.fillStyle = "#c084fc"; ctx.font = "600 22px Space Grotesk, JetBrains Mono";
    ctx.fillText("avg width " + avgWidth.toFixed(3), gX, gY + 70);
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
      <SegmentedControl label="// INTERVAL SCORE" value={method} onChange={setMethod}
        options={[{ value: "constant", label: "Constant" }, { value: "adaptive", label: "Adaptive σ̂(x)" }]}
        help="Constant uses |residual| → a fixed-width band everywhere. Adaptive divides by a local spread estimate σ̂(x), so the band widens where the data is noisy and tightens where it's clean — both keep the same coverage." />
      <Slider label="// ALPHA (miscoverage)" min={0.02} max={0.4} step={0.02} value={alpha} onChange={setAlpha} tone="violet"
        help="Tolerated miss rate: the interval is guaranteed to contain y at least (1−α) of the time. Lower α → stronger promise → wider band." />
      <Slider label="// BASE NOISE" min={0.02} max={0.2} step={0.02} value={noise} onChange={setNoise}
        help="Irreducible scatter present at all x. More noise means wider bands are needed to keep coverage." />
      <Slider label="// HETEROSCEDASTICITY" min={0} max={0.4} step={0.02} value={hetero} onChange={setHetero}
        help="How much the noise grows toward x=1. Crank it up, then compare Constant (over-wide on the left, too tight on the right) vs Adaptive (band breathes with the noise)." />
      <Slider label="// FIT DEGREE" min={1} max={8} step={1} value={degree} onChange={setDegree}
        help="Polynomial degree of the mean model f̂. Underfit it (degree 1) and coverage STILL holds — the band just grows to absorb the bias. That's the distribution-free guarantee." />
      <DemoButton onClick={() => { gen(); setTick(t => t + 1); }} primary>RESAMPLE</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="COVERAGE" value={(coverage * 100).toFixed(1) + "%"} accent={Math.abs(coverage - target) < 0.03 ? "#34d399" : "#fbbf24"} />
        <StatReadout label="TARGET" value={(target * 100).toFixed(0) + "%"} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="AVG WIDTH" value={avgWidth.toFixed(3)} accent="#c084fc" />
        <StatReadout label="q̂" value={qhat.toFixed(3)} />
      </div>
      <Legend items={[
        { color: "#a855f7", label: "fitted f̂(x)" },
        { color: "#34d399", label: "true mean" },
        { color: "#60a5fa", label: "band" },
        { color: "#f87171", label: "missed point" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        A regressor hands you one number per x. Split conformal upgrades it to an
        interval with a promise: the true y lands inside at least (1−α) of the time.
        It fits the mean f̂ on a training split, then on a <i>separate</i> calibration
        split measures the residuals and takes their (1−α) quantile q̂. The band is
        f̂(x) ± q̂. Each dot is a test point; red ones are the (≤ α) that fall outside.
      </DemoP>
      <DemoP>
        Switch INTERVAL SCORE with heteroscedasticity cranked up. The constant band
        is one-size-fits-all — wastefully wide on the calm left side, dangerously
        tight on the noisy right. The adaptive score divides residuals by a local
        spread estimate σ̂(x), so the band breathes with the noise while coverage
        stays pinned to target. Now drop FIT DEGREE to 1: the mean is badly underfit,
        yet coverage <i>still</i> holds — the band simply swells to swallow the bias.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        This is the regression face of{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/conformal/`} style={{ color: "#a855f7" }}>conformal prediction</a>:
        same recipe (calibrate a score, take a quantile), but the output is an
        interval instead of a label set. The adaptive variant generalizes to
        Conformalized Quantile Regression (CQR, Romano et al.), which calibrates two
        learned quantile regressors and tends to give the tightest valid bands. It's
        the go-to for distribution-free uncertainty in forecasting, scientific
        regression, and any setting where a wrong point estimate is costly.
      </DemoP>
      <DemoP>
        Caveats mirror the classification case. Coverage is <i>marginal</i>, not
        conditional — averaged over x, so it can still be uneven across regions even
        when the adaptive band helps. It assumes exchangeability of calibration and
        test data, so distribution shift voids the guarantee (online/adaptive
        conformal patches this). And it pairs naturally with{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/calibration/`} style={{ color: "#a855f7" }}>calibration</a> and{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/forecasting/`} style={{ color: "#a855f7" }}>forecasting</a>,
        where honest intervals matter as much as the point prediction.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="TRUSTWORTHY ML" title="Conformal Regression"
      subtitle="Turn a point regressor into a prediction interval with a coverage guarantee. Watch coverage hold even when the mean is underfit — and see the band breathe with the noise once you make the score locally adaptive."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/ml-theory/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ConformalRegressionDemo />);
