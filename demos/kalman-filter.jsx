// demos/kalman-filter.jsx — 1D Kalman filter (constant-velocity model), live.
//
// A real 2-state Kalman filter tracks a maneuvering target from noisy position
// measurements. State x = [position, velocity], constant-velocity transition
//   F = [[1, dt],[0, 1]],  measure position only  H = [1, 0].
// Each step:  predict  x⁻=Fx, P⁻=FPFᵀ+Q   then  update with gain
//   K = P⁻Hᵀ(HP⁻Hᵀ+R)⁻¹,  x = x⁻ + K(z − Hx⁻),  P = (I−KH)P⁻.
// The true track is a sum of sines (so the constant-velocity model is wrong and
// must adapt). Process-noise Q says "trust the model less"; measurement-noise R
// says "trust the sensor less" — the gain K balances them. We plot true position,
// raw measurements, the filtered estimate, and its ±2σ uncertainty band, and we
// score estimate-RMSE vs raw-measurement-RMSE so you can see the filter actually
// beats its own sensor.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, Toggle, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 560, H = 460;
const WIN = 96;           // visible time window (steps)
const DT = 1;

function KalmanDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const [qNoise, setQNoise] = _useState(0.6);   // process noise intensity
  const [rNoise, setRNoise] = _useState(16);    // measurement noise std (world units)
  const [showBand, setShowBand] = _useState(true);
  const [running, setRunning] = _useState(true);
  const [seed, setSeed] = _useState(1);
  const [, setTick] = _useState(0);
  const sim = _useRef(null);

  function rng(s0) { let s = s0 >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function randn(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  // true target position at time t (world units): a smooth maneuvering track
  function truePos(t) {
    return 70 * Math.sin(t * 0.045) + 34 * Math.sin(t * 0.13 + 1.1) + 16 * Math.sin(t * 0.31 + 0.4);
  }

  function reset() {
    const r = rng(seed * 2246822519 + 13);
    sim.current = {
      r, t: 0,
      x: [truePos(0), 0],                 // initial state estimate
      P: [[400, 0], [0, 400]],            // initial covariance (uncertain)
      hist: [],                            // {t, tru, meas, est, std}
      seSum: 0, meSum: 0, n: 0, K0: 0,
    };
    setTick(t => t + 1);
  }
  _useEffect(() => { reset(); /* eslint-disable-next-line */ }, [seed]);

  function step() {
    const st = sim.current; if (!st) return;
    const { r } = st;
    const q = qNoise, Rvar = rNoise * rNoise;
    st.t += 1;
    const tru = truePos(st.t);
    const meas = tru + randn(r) * rNoise;

    // --- predict ---
    let [p, v] = st.x;
    const P = st.P;
    const xp0 = p + v * DT, xp1 = v;
    // Pp = F P Fᵀ + Q   (F = [[1,dt],[0,1]])
    const dt = DT;
    const FP00 = P[0][0] + dt * P[1][0], FP01 = P[0][1] + dt * P[1][1];
    const FP10 = P[1][0],                FP11 = P[1][1];
    let Pp00 = FP00 + dt * FP01, Pp01 = FP01;
    let Pp10 = FP10 + dt * FP11, Pp11 = FP11;
    // process noise Q = q * [[dt³/3, dt²/2],[dt²/2, dt]]
    Pp00 += q * (dt * dt * dt / 3); Pp01 += q * (dt * dt / 2);
    Pp10 += q * (dt * dt / 2);      Pp11 += q * dt;

    // --- update (H = [1,0]) ---
    const S = Pp00 + Rvar;
    const K0 = Pp00 / S, K1 = Pp10 / S;
    const y = meas - xp0;
    const ex = xp0 + K0 * y, ev = xp1 + K1 * y;
    const nP00 = (1 - K0) * Pp00, nP01 = (1 - K0) * Pp01;
    const nP10 = Pp10 - K1 * Pp00, nP11 = Pp11 - K1 * Pp01;
    st.x = [ex, ev];
    st.P = [[nP00, nP01], [nP10, nP11]];
    st.K0 = K0;

    const std = Math.sqrt(Math.max(0, nP00));
    st.hist.push({ t: st.t, tru, meas, est: ex, std });
    if (st.hist.length > WIN) st.hist.shift();
    // rolling RMSE over the visible window
    st.seSum += (ex - tru) ** 2;
    st.meSum += (meas - tru) ** 2;
    st.n += 1;
    if (st.n > WIN) { /* keep a running estimate; recompute from window for honesty */ }
  }

  _useEffect(() => {
    let last = performance.now();
    const tick = (now) => {
      if (running && now - last > 70) { last = now; step(); setTick(t => t + 1); }
      draw();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    /* eslint-disable-next-line */
  }, [running, qNoise, rNoise, showBand]);

  // RMSE computed from the current visible window (honest, matches what you see)
  function windowRMSE() {
    const st = sim.current; if (!st || !st.hist.length) return { est: 0, meas: 0 };
    let se = 0, me = 0; for (const h of st.hist) { se += (h.est - h.tru) ** 2; me += (h.meas - h.tru) ** 2; }
    return { est: Math.sqrt(se / st.hist.length), meas: Math.sqrt(me / st.hist.length) };
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const st = sim.current; if (!st) return;
    const hist = st.hist;

    const padL = 16, padR = 16, padT = 34, padB = 26;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const SCALE = plotH / 2 / 150;     // world ±150 -> half height
    const midY = padT + plotH / 2;
    const PX = (i) => padL + (i / (WIN - 1)) * plotW;
    const PY = (p) => midY - p * SCALE;

    // axes / midline
    ctx.strokeStyle = "rgba(148,163,184,0.18)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, midY); ctx.lineTo(W - padR, midY); ctx.stroke();
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono";
    ctx.fillText("POSITION vs TIME  ·  true track, noisy sensor, Kalman estimate + 2sigma", padL, 20);

    if (hist.length > 1) {
      // ±2σ uncertainty band
      if (showBand) {
        ctx.beginPath();
        for (let i = 0; i < hist.length; i++) { const x = PX(i), y = PY(hist[i].est + 2 * hist[i].std); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        for (let i = hist.length - 1; i >= 0; i--) { const x = PX(i), y = PY(hist[i].est - 2 * hist[i].std); ctx.lineTo(x, y); }
        ctx.closePath(); ctx.fillStyle = "rgba(168,85,247,0.16)"; ctx.fill();
      }
      // true track
      ctx.strokeStyle = "#34d399"; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i < hist.length; i++) { const x = PX(i), y = PY(hist[i].tru); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
      // estimate
      ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i < hist.length; i++) { const x = PX(i), y = PY(hist[i].est); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
      // measurements
      ctx.fillStyle = "rgba(96,165,250,0.85)";
      for (let i = 0; i < hist.length; i++) { ctx.beginPath(); ctx.arc(PX(i), PY(hist[i].meas), 2.4, 0, 7); ctx.fill(); }
      // current estimate head
      const li = hist.length - 1;
      ctx.fillStyle = "#a855f7"; ctx.beginPath(); ctx.arc(PX(li), PY(hist[li].est), 4.5, 0, 7); ctx.fill();
    }
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  });

  const st = sim.current;
  const rm = windowRMSE();
  const lift = rm.meas > 1e-6 ? rm.meas / Math.max(1e-6, rm.est) : 1;
  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// MEASUREMENT NOISE  R" min={2} max={40} step={1} value={rNoise} onChange={setRNoise} tone="violet"
        help="Std-dev of the sensor noise (blue dots). Bigger R = noisier sensor, so the filter leans on its motion model and the estimate smooths more (gain K shrinks)." />
      <Slider label="// PROCESS NOISE  Q" min={0.02} max={4} step={0.02} value={qNoise} onChange={setQNoise}
        help="How much the filter distrusts its constant-velocity model. Raise Q to track sharp maneuvers (gain K grows, estimate hugs measurements); lower Q for a smoother but laggier track that overshoots on turns." />
      <Toggle label="SHOW 2-SIGMA BAND" checked={showBand} onChange={setShowBand}
        help="Shade the estimate's ±2 standard-deviation interval from the covariance P. It widens during prediction and snaps tighter after each measurement update." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setRunning(r => !r)} primary>{running ? "PAUSE" : "RESUME"}</DemoButton>
        <DemoButton onClick={() => setSeed(s => s + 1)}>RESTART</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="ESTIMATE RMSE" value={st ? rm.est.toFixed(1) : "—"} accent="#a855f7" />
        <StatReadout label="SENSOR RMSE" value={st ? rm.meas.toFixed(1) : "—"} accent="#60a5fa" />
        <StatReadout label="KALMAN GAIN K" value={st ? st.K0.toFixed(2) : "—"} accent="#34d399" />
        <StatReadout label="NOISE REDUCED" value={st ? lift.toFixed(2) + "x" : "—"} accent="#fbbf24" />
      </div>
      <Legend items={[
        { color: "#34d399", label: "true position" },
        { color: "#60a5fa", label: "measurement" },
        { color: "#a855f7", label: "KF estimate ±2σ" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        The green curve is where the target really is; the blue dots are all the
        filter ever sees — the same position, buried in sensor noise. The purple
        line is the Kalman estimate, and the shaded band is its own sense of how
        unsure it is (±2σ). Each tick it does two things: <b>predict</b> the next
        position from a constant-velocity model (the band widens), then <b>update</b>
        toward the new measurement by an amount set by the Kalman gain K (the band
        snaps tight). K is the optimal blend of "how much do I trust my model" vs
        "how much do I trust this sensor."
      </DemoP>
      <DemoP>
        Watch NOISE REDUCED: the estimate's RMSE is well below the raw sensor's,
        so the filter genuinely denoises in real time. Crank MEASUREMENT NOISE R up
        and K shrinks — the estimate ignores the wild dots and glides on its model.
        Crank PROCESS NOISE Q up and K grows — the estimate chases every dot and
        gets jumpy. The art is matching Q and R to reality: too little Q and the
        estimate lags and overshoots on the sharp turns; too much and you've just
        re-drawn the noise.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        The Kalman filter is the optimal recursive estimator for a linear system
        with Gaussian noise — exact Bayesian belief updating where the belief stays
        Gaussian, so you only carry a mean and covariance. It runs everywhere state
        must be inferred from noisy streams: GPS/IMU sensor fusion, robotics and
        SLAM, flight control, object tracking, even smoothing financial series. It's
        the continuous-state cousin of the discrete-state filtering you'd do with an{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/markov/`} style={{ color: "#a855f7" }}>HMM</a>,
        and the recursive-Bayes idea ties back to{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/bayes/`} style={{ color: "#a855f7" }}>Bayesian updating</a>.
      </DemoP>
      <DemoP>
        Caveats: optimality assumes the model (F), noise covariances (Q, R), and
        linearity are all correct and Gaussian — get them wrong and the filter is
        confidently off, or diverges. Real targets maneuver and sensors are
        nonlinear, which is why practitioners reach for the Extended or Unscented
        Kalman filter, or particle filters for multimodal beliefs. Tuning Q and R
        is the whole game, and it's the same denoise-by-prediction logic behind
        classical time-series{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/forecasting/`} style={{ color: "#a855f7" }}>forecasting</a>.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Kalman Filter"
      subtitle="A real 2-state (position, velocity) Kalman filter tracks a maneuvering target from noisy measurements. Tune process noise Q and sensor noise R to move the Kalman gain — and watch the estimate denoise the sensor in real time."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/foundations/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<KalmanDemo />);
