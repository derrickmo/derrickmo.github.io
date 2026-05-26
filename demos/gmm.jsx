// demos/gmm.jsx — Gaussian Mixture Models fit by Expectation-Maximization.
// Real EM: soft responsibilities (E-step) + weighted mean/covariance updates
// (M-step). Covariance ellipses via analytic 2x2 eigen-decomposition.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  SegmentedControl, DemoButton, Toggle, StatReadout, Legend, ControlGroup,
} = window;

const W = 460, H = 460, SC = 130;
const cx = W / 2, cy = H / 2;
const px = (x) => cx + x * SC, py = (y) => cy - y * SC;
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const PAL = [[96, 165, 250], [192, 132, 252], [52, 211, 153], [251, 191, 36]];

function genData(n = 200) {
  const blobs = [
    { mx: -0.6, my: 0.45, sx: 0.26, sy: 0.18, rot: 0.5 },
    { mx: 0.6, my: 0.5, sx: 0.32, sy: 0.14, rot: -0.4 },
    { mx: 0.05, my: -0.6, sx: 0.22, sy: 0.3, rot: 0.2 },
  ];
  const pts = [];
  for (let i = 0; i < n; i++) {
    const b = blobs[i % blobs.length];
    const a = gauss() * b.sx, c = gauss() * b.sy;
    const ca = Math.cos(b.rot), sa = Math.sin(b.rot);
    pts.push({ x: b.mx + a * ca - c * sa, y: b.my + a * sa + c * ca });
  }
  return pts;
}

function eig2(a, b, c) {
  const m = (a + c) / 2, disc = Math.sqrt(Math.max(0, (a - c) * (a - c) / 4 + b * b));
  const l1 = m + disc, l2 = m - disc;
  let v1 = Math.abs(b) > 1e-9 ? [l1 - c, b] : (a >= c ? [1, 0] : [0, 1]);
  const nrm = Math.hypot(v1[0], v1[1]) || 1; v1 = [v1[0] / nrm, v1[1] / nrm];
  return { l1, l2, v1 };
}

function density(p, comp) {
  const [a, b, c] = comp.cov;
  const det = a * c - b * b || 1e-9;
  const dx = p.x - comp.mean[0], dy = p.y - comp.mean[1];
  const quad = (c * dx * dx - 2 * b * dx * dy + a * dy * dy) / det;
  return Math.exp(-0.5 * quad) / (2 * Math.PI * Math.sqrt(Math.abs(det)));
}

function initModel(pts, K) {
  const comps = [];
  const used = new Set();
  for (let k = 0; k < K; k++) {
    let i; do { i = (Math.random() * pts.length) | 0; } while (used.has(i)); used.add(i);
    comps.push({ mean: [pts[i].x, pts[i].y], cov: [0.15, 0, 0.15], pi: 1 / K });
  }
  return comps;
}

function GMMDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const dataRef = _useRef(genData());
  const compsRef = _useRef([]);
  const respRef = _useRef([]);
  const timerRef = _useRef(null);
  const [K, setK] = _useState(3);
  const [running, setRunning] = _useState(false);
  const [stats, setStats] = _useState({ iter: 0, ll: 0 });
  const iterRef = _useRef(0);

  function estep() {
    const pts = dataRef.current, comps = compsRef.current, n = pts.length, K = comps.length;
    const resp = new Array(n); let ll = 0;
    for (let i = 0; i < n; i++) {
      const w = new Array(K); let s = 0;
      for (let k = 0; k < K; k++) { w[k] = comps[k].pi * density(pts[i], comps[k]) + 1e-12; s += w[k]; }
      for (let k = 0; k < K; k++) w[k] /= s;
      resp[i] = w; ll += Math.log(s);
    }
    respRef.current = resp;
    return ll;
  }
  function mstep() {
    const pts = dataRef.current, comps = compsRef.current, resp = respRef.current, n = pts.length, K = comps.length;
    for (let k = 0; k < K; k++) {
      let nk = 0, mx = 0, my = 0;
      for (let i = 0; i < n; i++) { const r = resp[i][k]; nk += r; mx += r * pts[i].x; my += r * pts[i].y; }
      nk = nk || 1e-9; mx /= nk; my /= nk;
      let a = 0, b = 0, c = 0;
      for (let i = 0; i < n; i++) { const r = resp[i][k], dx = pts[i].x - mx, dy = pts[i].y - my; a += r * dx * dx; b += r * dx * dy; c += r * dy * dy; }
      a = a / nk + 1e-3; b /= nk; c = c / nk + 1e-3;
      comps[k] = { mean: [mx, my], cov: [a, b, c], pi: nk / n };
    }
  }
  function step() {
    estep(); mstep();
    const ll = estep();
    iterRef.current += 1;
    setStats({ iter: iterRef.current, ll: ll / dataRef.current.length });
    draw();
  }
  function reset() {
    stopRun();
    compsRef.current = initModel(dataRef.current, K);
    iterRef.current = 0;
    const ll = estep();
    setStats({ iter: 0, ll: ll / dataRef.current.length });
    draw();
  }
  function stopRun() { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } setRunning(false); }
  function toggleRun() {
    if (timerRef.current) { stopRun(); return; }
    setRunning(true);
    timerRef.current = setInterval(step, 240);
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const pts = dataRef.current, comps = compsRef.current, resp = respRef.current;

    ctx.strokeStyle = "rgba(96,165,250,0.1)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();

    for (let i = 0; i < pts.length; i++) {
      let r = 90, g = 110, b = 140;
      if (resp[i]) {
        r = 0; g = 0; b = 0;
        for (let k = 0; k < comps.length; k++) { const w = resp[i][k]; r += w * PAL[k % PAL.length][0]; g += w * PAL[k % PAL.length][1]; b += w * PAL[k % PAL.length][2]; }
      }
      ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
      ctx.beginPath(); ctx.arc(px(pts[i].x), py(pts[i].y), 3, 0, Math.PI * 2); ctx.fill();
    }

    for (let k = 0; k < comps.length; k++) {
      const comp = comps[k], col = PAL[k % PAL.length];
      const { l1, l2, v1 } = eig2(comp.cov[0], comp.cov[1], comp.cov[2]);
      const rot = -Math.atan2(v1[1], v1[0]);
      for (const nstd of [1, 2]) {
        ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${nstd === 1 ? 0.9 : 0.4})`;
        ctx.lineWidth = nstd === 1 ? 2 : 1.2;
        ctx.beginPath();
        ctx.ellipse(px(comp.mean[0]), py(comp.mean[1]), Math.sqrt(Math.max(0, l1)) * SC * nstd, Math.sqrt(Math.max(0, l2)) * SC * nstd, rot, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
      ctx.beginPath(); ctx.arc(px(comp.mean[0]), py(comp.mean[1]), 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#050816"; ctx.lineWidth = 1.5; ctx.stroke();
    }
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    reset();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);
  _useEffect(() => { reset(); /* eslint-disable-next-line */ }, [K]);

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <SegmentedControl label="// COMPONENTS (K)" value={String(K)} onChange={v => setK(parseInt(v))}
        options={[{ value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" }]}
        help="How many Gaussians to fit. Match it to the true number of blobs — too few merges clusters, too many splits one cluster into overlapping pieces." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => { stopRun(); step(); }} primary>STEP EM</DemoButton>
        <DemoButton onClick={toggleRun} tone="violet">{running ? "PAUSE" : "RUN"}</DemoButton>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={reset}>RESET FIT</DemoButton>
        <DemoButton onClick={() => { stopRun(); dataRef.current = genData(); reset(); }}>NEW DATA</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="ITERATION" value={stats.iter} />
        <StatReadout label="AVG LOG-LIK" value={stats.ll.toFixed(2)} accent="var(--violet-lt)" />
      </div>
      <Legend items={[{ color: "rgb(96,165,250)", label: "COMP 1" }, { color: "rgb(192,132,252)", label: "COMP 2" }, { color: "rgb(52,211,153)", label: "COMP 3" }, { color: "rgb(251,191,36)", label: "COMP 4" }]} />
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>Point color blends its soft responsibilities; ellipses are 1σ and 2σ.</div>
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Where k-means draws hard boundaries, a <b>Gaussian Mixture Model</b> says each
        point is generated by one of K Gaussians — but we don't know which. EM solves
        the chicken-and-egg problem in two repeating steps. The <b>E-step</b> computes
        each point's <i>responsibility</i>: the probability it belongs to each
        component (its color here is those probabilities blended together). The
        <b> M-step</b> then re-fits every Gaussian's mean, covariance, and weight using
        those soft assignments. <b>Step EM</b> once at a time, or <b>Run</b> to watch
        the ellipses snap onto the clusters.
      </DemoP>
      <DemoP>
        Each step is guaranteed not to decrease the log-likelihood (watch it climb and
        plateau at convergence). Unlike k-means, GMM captures <i>elongated,
        rotated</i> clusters because each component carries a full covariance matrix —
        the same ellipse geometry comes straight from its 2×2 eigen-decomposition.
        This soft-assignment idea is the backbone of mixture models, speaker
        clustering, and the variational methods behind modern generative models.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        GMMs are the canonical soft-clustering and density-estimation model: speaker and
        audio clustering, background subtraction in vision, anomaly detection (low-density
        points are the outliers), and as a flexible distribution you can sample from.
        Because each component carries a full <i>covariance</i>, GMMs capture elongated,
        correlated, rotated clusters that k-means — with its round, hard cells — cannot.
      </DemoP>
      <DemoP>
        The deeper prize is <b>EM</b> itself: alternating between soft assignments
        (E-step) and parameter updates (M-step) to maximize a likelihood you can't optimize
        directly. That exact pattern — and the "responsibility / latent variable" framing —
        is the conceptual ancestor of variational inference and the ELBO objective that
        trains VAEs and other modern latent-variable generative models.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="UNSUPERVISED LEARNING" title="Gaussian Mixtures & EM"
      subtitle="Soft clustering: fit overlapping Gaussians with Expectation-Maximization and watch the log-likelihood climb."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/unsupervised-learning/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<GMMDemo />);
