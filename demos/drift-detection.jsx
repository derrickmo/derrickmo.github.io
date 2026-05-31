// demos/drift-detection.jsx — data drift monitoring (covariate shift + PSI alarm).
//
// A model is trained on a reference distribution, then deployed on a live stream
// whose feature distribution slowly drifts (the mean shifts). A monitor compares
// a sliding window of recent data against the fixed reference with the Population
// Stability Index, PSI = Σ_bins (cur − ref)·ln(cur/ref), and raises an alarm when
// PSI crosses a threshold. Watch the current histogram peel away from the
// reference and the PSI climb past the line — the moment you'd retrain.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480, BINS = 14, LO = -4, HI = 5;
function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function histProp(samples) {
  const h = new Array(BINS).fill(0);
  samples.forEach(s => { let b = Math.floor((s - LO) / (HI - LO) * BINS); b = Math.max(0, Math.min(BINS - 1, b)); h[b]++; });
  const n = samples.length || 1; return h.map(c => c / n);
}
function psi(ref, cur) { let s = 0; for (let i = 0; i < BINS; i++) { const r = ref[i] + 1e-4, c = cur[i] + 1e-4; s += (c - r) * Math.log(c / r); } return s; }

function DriftDetectionDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const lastRef = _useRef(0);
  const [driftMag, setDriftMag] = _useState(1.6);
  const [thresh, setThresh] = _useState(0.2);
  const [winN, setWinN] = _useState(300);
  const [speed, setSpeed] = _useState(8);
  const [running, setRunning] = _useState(false);
  const [, force] = _useState(0);
  const st = _useRef(null);

  function fresh() {
    const ref0 = Array.from({ length: 800 }, () => randn());
    st.current = { ref: histProp(ref0), win: Array.from({ length: winN }, () => randn()), t: 0, hist: [], alarmAt: -1 };
    force(v => v + 1);
  }
  if (!st.current) fresh();

  function tick() {
    const s = st.current;
    const mu = driftMag * Math.max(0, Math.min(1, (s.t - 15) / 40));
    for (let i = 0; i < 24; i++) s.win.push(mu + randn());
    while (s.win.length > winN) s.win.shift();
    const cur = histProp(s.win), p = psi(s.ref, cur);
    s.hist.push(p); if (s.hist.length > 160) s.hist.shift();
    if (s.alarmAt < 0 && p > thresh) s.alarmAt = s.t;
    s.t += 1; s.curHist = cur; s.mu = mu; s.psi = p;
  }

  _useEffect(() => {
    if (!running) return;
    const loop = (now) => { if (now - lastRef.current >= 1000 / speed) { lastRef.current = now; tick(); force(v => v + 1); } rafRef.current = requestAnimationFrame(loop); };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line
  }, [running, speed, driftMag, thresh, winN]);

  const s = st.current;
  const cur = s.curHist || s.ref, curPsi = s.psi || 0, alarm = curPsi > thresh;

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#94a3b8"; ctx.fillText("FEATURE DISTRIBUTION  ·  reference (outline) vs live window (filled)", 20, 22);

    // histograms
    const px = 30, py = 40, pw = W - 60, ph = 180, bw = pw / BINS;
    const maxP = Math.max(...s.ref, ...cur, 0.01);
    for (let i = 0; i < BINS; i++) {
      const x = px + i * bw;
      const ch = (cur[i] / maxP) * ph;
      ctx.fillStyle = alarm ? "rgba(248,113,113,0.6)" : "rgba(96,165,250,0.6)"; ctx.fillRect(x + 2, py + ph - ch, bw - 4, ch);
      const rh = (s.ref[i] / maxP) * ph;
      ctx.strokeStyle = "rgba(226,232,240,0.6)"; ctx.lineWidth = 1.5; ctx.strokeRect(x + 2, py + ph - rh, bw - 4, rh);
    }
    ctx.strokeStyle = "rgba(148,163,184,0.3)"; ctx.beginPath(); ctx.moveTo(px, py + ph); ctx.lineTo(px + pw, py + ph); ctx.stroke();
    ctx.fillStyle = "#64748b"; ctx.font = "9px JetBrains Mono"; ctx.fillText("mean shift: " + (s.mu || 0).toFixed(2), px, py + ph + 12);

    // PSI over time
    const sy = py + ph + 36, sh = 130, sX = 30, sW = W - 60, N = 160;
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono"; ctx.fillText("DRIFT (PSI) over time  ·  alarm when it crosses the threshold", sX, sy - 6);
    ctx.strokeStyle = "rgba(96,165,250,0.18)"; ctx.strokeRect(sX, sy, sW, sh);
    const maxPsi = Math.max(thresh * 2, ...s.hist, 0.4);
    const yOf = (p) => sy + sh - (p / maxPsi) * (sh - 8) - 4;
    // threshold
    ctx.strokeStyle = "rgba(248,113,113,0.5)"; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(sX, yOf(thresh)); ctx.lineTo(sX + sW, yOf(thresh)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "rgba(248,113,113,0.8)"; ctx.fillText("threshold " + thresh.toFixed(2), sX + sW - 110, yOf(thresh) - 4);
    if (s.hist.length > 1) {
      ctx.lineWidth = 1.8; ctx.beginPath();
      s.hist.forEach((p, i) => { const x = sX + (i / Math.max(1, N - 1)) * sW, y = yOf(p); ctx.strokeStyle = "#60a5fa"; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
      ctx.stroke();
      const lp = s.hist[s.hist.length - 1], lx = sX + ((s.hist.length - 1) / Math.max(1, N - 1)) * sW;
      ctx.fillStyle = lp > thresh ? "#f87171" : "#34d399"; ctx.beginPath(); ctx.arc(lx, yOf(lp), 4, 0, Math.PI * 2); ctx.fill();
    }
    // status
    ctx.font = "600 16px Space Grotesk, JetBrains Mono"; ctx.fillStyle = alarm ? "#f87171" : "#34d399";
    ctx.fillText(alarm ? "⚠ DRIFT DETECTED — retrain" : "✓ stable (PSI " + curPsi.toFixed(2) + ")", sX, sy + sh + 26);
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
      <Slider label="// DRIFT MAGNITUDE" min={0} max={3} step={0.1} value={driftMag} onChange={setDriftMag} tone="violet"
        help="How far the live feature mean eventually shifts from the reference. At 0 the stream stays on-distribution (PSI hovers near 0); larger values drive a bigger divergence and trip the alarm sooner once drift begins." />
      <Slider label="// ALARM THRESHOLD (PSI)" min={0.05} max={0.5} step={0.05} value={thresh} onChange={setThresh}
        help="The PSI level that triggers a retrain alert. Rules of thumb: <0.1 no real shift, 0.1–0.25 moderate, >0.25 major. Lower threshold = earlier (but noisier) alarms; higher = fewer false alarms but slower to react." />
      <Slider label="// WINDOW SIZE" min={100} max={600} step={50} value={winN} onChange={setWinN}
        help="How many recent samples the live histogram is built from. Smaller windows react faster to drift but are noisier (more false alarms); larger windows are stable but lag the change." />
      <Slider label="// SPEED" min={2} max={30} step={2} value={speed} onChange={setSpeed} help="Stream speed (batches/sec)." />
      <DemoButton onClick={() => setRunning(r => !r)} primary>{running ? "PAUSE" : "STREAM"}</DemoButton>
      <DemoButton onClick={fresh}>RESET</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="PSI" value={curPsi.toFixed(2)} accent={alarm ? "#f87171" : "#34d399"} />
        <StatReadout label="STATUS" value={alarm ? "DRIFT" : "STABLE"} accent={alarm ? "#f87171" : "#34d399"} />
      </div>
      <Legend items={[
        { color: "#e2e8f0", label: "reference (training)" },
        { color: "#60a5fa", label: "live window" },
        { color: "#f87171", label: "drift / alarm" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        A model is only valid on data like what it was trained on — but the world
        moves. Here the live feature stream starts matching the reference (white
        outline) and then its mean slowly drifts, so the filled histogram peels
        away. You can't see labels in production fast enough to catch this by
        accuracy, so you monitor the inputs directly: the Population Stability Index
        sums how far each bin's live frequency has moved from the reference.
      </DemoP>
      <DemoP>
        Watch the PSI trace climb as the distributions diverge and cross the red
        threshold — that's the alarm that says "the data you're serving no longer
        looks like training data; investigate or retrain." The controls expose the
        real tradeoffs: a tighter window reacts faster but cries wolf more, and a
        lower threshold catches drift earlier at the cost of false alarms. Set drift
        magnitude to 0 and the stream stays stable, PSI flat near zero — no alarm.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Drift detection is the monitoring backbone of MLOps. This is <i>covariate
        shift</i> — the input distribution P(X) changes; its cousins are label
        shift (P(Y) moves) and concept drift (the X→Y relationship itself changes).
        Detectors range from population statistics like PSI and KL divergence to
        two-sample tests (Kolmogorov–Smirnov, MMD) and sequential change-point
        methods (ADWIN, DDM) that watch a live error stream.
      </DemoP>
      <DemoP>
        It closes the trustworthy-ML loop: a model can be perfectly{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/calibration/`} style={{ color: "#a855f7" }}>calibrated</a>{" "}
        and well-explained at launch and still rot silently as the world shifts. In
        practice drift alarms trigger investigation, shadow evaluation, and
        retraining or rollback — and the hard parts the demo abstracts away are
        choosing what to monitor (raw features, embeddings, predictions, or
        delayed-label performance) and tuning thresholds so the alerts are
        trustworthy rather than ignored.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="MLOPS / MONITORING" title="Data Drift Detection"
      subtitle="Deployed models rot as the world shifts. Watch the live distribution peel away from the reference and a PSI monitor trip the retrain alarm."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/mlops/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<DriftDetectionDemo />);
