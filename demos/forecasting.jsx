// demos/forecasting.jsx — time-series forecasting. Real moving-average, simple /
// double (Holt) / triple (Holt-Winters) exponential smoothing, fit on history and
// scored against a held-out future so you can see each method's error.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  SegmentedControl, Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 420, N = 132, HOLD = 24, M = 12;

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function genSeries(seed) {
  const rng = mulberry32(seed);
  const g = () => { let u = 0, v = 0; while (!u) u = rng(); while (!v) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const slope = 0.04 + rng() * 0.05, amp = 4 + rng() * 5, base = 20 + rng() * 10;
  const s = [];
  for (let t = 0; t < N; t++) s.push(base + slope * t + amp * Math.sin(2 * Math.PI * t / M) + g() * 1.6);
  return s;
}

function forecast(hist, method, alpha, beta) {
  const h = HOLD, out = [];
  if (method === "ma") {
    const w = 8; let m = 0; for (let i = hist.length - w; i < hist.length; i++) m += hist[i]; m /= w;
    for (let i = 0; i < h; i++) out.push(m);
    return out;
  }
  if (method === "ses") {
    let level = hist[0];
    for (let t = 1; t < hist.length; t++) level = alpha * hist[t] + (1 - alpha) * level;
    for (let i = 0; i < h; i++) out.push(level);
    return out;
  }
  if (method === "holt") {
    let level = hist[0], trend = hist[1] - hist[0];
    for (let t = 1; t < hist.length; t++) { const pl = level; level = alpha * hist[t] + (1 - alpha) * (level + trend); trend = beta * (level - pl) + (1 - beta) * trend; }
    for (let i = 0; i < h; i++) out.push(level + (i + 1) * trend);
    return out;
  }
  // holt-winters additive
  const gamma = 0.4;
  let level = 0; for (let i = 0; i < M; i++) level += hist[i]; level /= M;
  let trend = 0; for (let i = 0; i < M; i++) trend += (hist[M + i] - hist[i]) / M; trend /= M;
  const seas = []; for (let i = 0; i < M; i++) seas.push(hist[i] - level);
  for (let t = M; t < hist.length; t++) {
    const pl = level; const si = t % M;
    level = alpha * (hist[t] - seas[si]) + (1 - alpha) * (level + trend);
    trend = beta * (level - pl) + (1 - beta) * trend;
    seas[si] = gamma * (hist[t] - level) + (1 - gamma) * seas[si];
  }
  for (let i = 0; i < h; i++) out.push(level + (i + 1) * trend + seas[(hist.length + i) % M]);
  return out;
}

function ForecastDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const seriesRef = _useRef(genSeries(9));
  const seedRef = _useRef(9);
  const [method, setMethod] = _useState("holt-winters");
  const [alpha, setAlpha] = _useState(0.4);
  const [beta, setBeta] = _useState(0.1);
  const [stats, setStats] = _useState({ mae: 0 });

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const s = seriesRef.current;
    const hist = s.slice(0, N - HOLD), future = s.slice(N - HOLD);
    const fc = forecast(hist, method, alpha, beta);

    const pad = 40, x0 = pad, x1 = W - 16, y0 = 24, y1 = H - 36;
    const all = s.concat(fc);
    const lo = Math.min(...all), hi = Math.max(...all);
    const xx = (t) => x0 + t / (N - 1) * (x1 - x0);
    const yy = (v) => y1 - (v - lo) / (hi - lo || 1) * (y1 - y0);

    // axes
    ctx.strokeStyle = "rgba(96,165,250,0.15)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x1, y1); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.stroke();
    // split marker
    const splitX = xx(N - HOLD - 1);
    ctx.strokeStyle = "rgba(251,191,36,0.35)"; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(splitX, y0); ctx.lineTo(splitX, y1); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#64748b"; ctx.font = "10px JetBrains Mono, monospace"; ctx.textAlign = "left";
    ctx.fillText("history", x0 + 4, y0 + 4); ctx.textAlign = "right"; ctx.fillText("held-out future", x1 - 2, y0 + 4);

    // history
    ctx.beginPath(); hist.forEach((v, t) => { const X = xx(t), Y = yy(v); t ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
    ctx.strokeStyle = "#60a5fa"; ctx.lineWidth = 2; ctx.stroke();
    // actual future (faint)
    ctx.beginPath();
    ctx.moveTo(xx(N - HOLD - 1), yy(hist[hist.length - 1]));
    future.forEach((v, i) => { ctx.lineTo(xx(N - HOLD + i), yy(v)); });
    ctx.strokeStyle = "rgba(224,231,255,0.5)"; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
    // forecast
    ctx.beginPath();
    ctx.moveTo(xx(N - HOLD - 1), yy(hist[hist.length - 1]));
    fc.forEach((v, i) => { const t = N - HOLD + i; ctx.lineTo(xx(t), yy(v)); });
    ctx.strokeStyle = "#c084fc"; ctx.lineWidth = 2.4; ctx.stroke();

    let mae = 0; for (let i = 0; i < HOLD; i++) mae += Math.abs(fc[i] - future[i]); mae /= HOLD;
    setStats({ mae });
  }

  function reseed() { seedRef.current += 1; seriesRef.current = genSeries(seedRef.current); draw(); }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  }, []);
  _useEffect(() => { draw(); /* eslint-disable-next-line */ }, [method, alpha, beta]);

  const showBeta = method === "holt" || method === "holt-winters";
  const showAlpha = method !== "ma";
  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <SegmentedControl label="// METHOD" value={method} onChange={setMethod}
        options={[{ value: "ma", label: "Moving Avg" }, { value: "ses", label: "SES" }, { value: "holt", label: "Holt" }, { value: "holt-winters", label: "Holt-Winters" }]}
        help="The forecasting model. Moving Avg and SES predict a flat line; Holt adds a sloping trend; Holt-Winters adds a repeating seasonal cycle — the only one that tracks the wave." />
      {showAlpha && <Slider label="// α (level)" min={0.02} max={0.95} step={0.02} value={alpha} onChange={setAlpha}
        help="How fast the level adapts to recent observations. High reacts quickly (and to noise); low is smooth and sluggish." />}
      {showBeta && <Slider label="// β (trend)" min={0.0} max={0.6} step={0.02} value={beta} onChange={setBeta} tone="violet"
        help="How fast the trend (slope) adapts. High lets the forecast re-aim quickly; low holds a steady slope — too high chases noise into wild extrapolation." />}
      <DemoButton onClick={reseed} primary>NEW SERIES</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
        <StatReadout label="HOLDOUT MAE (lower is better)" value={stats.mae.toFixed(2)} accent="#fbbf24" />
      </div>
      <Legend items={[{ color: "#60a5fa", label: "HISTORY" }, { color: "#c084fc", label: "FORECAST" }, { color: "#e0e7ff", label: "ACTUAL FUTURE" }]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Forecasting starts simple and adds structure. A <b>moving average</b> just
        repeats the recent mean — flat, blind to trend or season. <b>Simple
        exponential smoothing</b> (SES) weights recent points more via <b>α</b>, but
        still forecasts a flat line. <b>Holt</b> adds a <b>trend</b> term (β) so the
        forecast can slope, and <b>Holt-Winters</b> adds a repeating <b>seasonal</b>
        component — the only one that can reproduce the wave. The forecast is fit on the
        history and drawn against the <i>held-out</i> future, with MAE measuring how
        close it landed.
      </DemoP>
      <DemoP>
        Step through the methods on a seasonal series and watch the error drop as the
        model gains the structure the data actually has — then overshoot if you crank
        α/β too high and let it chase noise. That tension (enough flexibility to track
        real patterns, not so much that it fits randomness) is the same bias-variance
        story as the rest of ML, and these smoothing models remain strong, cheap
        baselines that deep forecasters have to beat.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Time-series forecasting is one of the most commercially deployed forms of ML:
        demand and inventory planning, capacity and staffing, energy load, finance, and
        anomaly detection on operational metrics all run on it. Exponential smoothing and
        ARIMA are decades old and still the backbone of tools like Prophet — cheap,
        interpretable, and genuinely hard to beat on many real series.
      </DemoP>
      <DemoP>
        The level/trend/seasonality decomposition you're toggling is the mental model
        behind the whole field, including modern neural forecasters (DeepAR, N-BEATS,
        Temporal Fusion Transformers) that <i>learn</i> those components instead of
        hand-specifying them. Two field-specific lessons surface here: you must validate on
        the <b>held-out future</b> (never shuffle time-series data), and these classical
        models are the baseline any fancier method has to justify beating.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="TIME SERIES · FORECASTING" title="Time-Series Forecasting"
      subtitle="Level, trend, and seasonality: classic exponential smoothing fit on history and scored on a held-out future."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/ml-applications/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="blue" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ForecastDemo />);
