// demos/gaussian-process.jsx — Gaussian-process regression you can click on.
//
// A GP puts a distribution over FUNCTIONS. With an RBF kernel
//   k(x,x') = σ_f² exp(−(x−x')² / 2ℓ²)
// the posterior after seeing data (X,y) with noise σ_n² is closed-form:
//   mean(x*)  = k*ᵀ (K + σ_n²I)⁻¹ y
//   var(x*)   = k(x*,x*) − k*ᵀ (K + σ_n²I)⁻¹ k*
// The mean interpolates the points; the variance (shaded ±2σ band) shrinks near
// data and balloons where you have none — honest uncertainty. We also draw a few
// functions sampled from the posterior. Click the plot to add points and watch
// the band collapse around them.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 440;
const PAD = 40, YLO = -3, YHI = 3;
const G = 120;

function GaussianProcessDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [ell, setEll] = _useState(0.12);
  const [sigf, setSigf] = _useState(1.0);
  const [noise, setNoise] = _useState(0.1);
  const [pts, setPts] = _useState(() => [{ x: 0.2, y: 0.8 }, { x: 0.5, y: -0.6 }, { x: 0.8, y: 0.9 }]);
  const [sampleSeed, setSampleSeed] = _useState(1);
  const post = _useRef(null);

  const PX = (x) => PAD + x * (W - 2 * PAD);
  const PY = (y) => PAD + (1 - (y - YLO) / (YHI - YLO)) * (H - 60 - PAD);
  const invPX = (px) => (px - PAD) / (W - 2 * PAD);
  const invPY = (py) => YLO + (1 - (py - PAD) / (H - 60 - PAD)) * (YHI - YLO);

  const kern = (a, b) => sigf * sigf * Math.exp(-((a - b) ** 2) / (2 * ell * ell));

  // n×n inverse via Gauss-Jordan
  function inv(A) {
    const n = A.length, M = A.map((r, i) => r.concat(Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))));
    for (let c = 0; c < n; c++) {
      let piv = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
      [M[c], M[piv]] = [M[piv], M[c]];
      const d = M[c][c] || 1e-9; for (let k = 0; k < 2 * n; k++) M[c][k] /= d;
      for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c]; for (let k = 0; k < 2 * n; k++) M[r][k] -= f * M[c][k]; }
    }
    return M.map(r => r.slice(n));
  }
  function chol(A) { // lower-triangular L, A = L Lᵀ (with jitter)
    const n = A.length, L = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
      let s = A[i][j]; for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
      if (i === j) L[i][j] = Math.sqrt(Math.max(1e-9, s)); else L[i][j] = s / (L[j][j] || 1e-9);
    }
    return L;
  }

  function compute() {
    const grid = Array.from({ length: G }, (_, i) => i / (G - 1));
    const n = pts.length;
    let mean = new Array(G).fill(0), sd = grid.map(() => Math.abs(sigf));
    let Kinv = null, ys = null;
    if (n > 0) {
      const K = pts.map((a, i) => pts.map((b, j) => kern(a.x, b.x) + (i === j ? noise * noise + 1e-7 : 0)));
      Kinv = inv(K); ys = pts.map(p => p.y);
      const Kinvy = Kinv.map(row => row.reduce((s, v, j) => s + v * ys[j], 0));
      for (let g = 0; g < G; g++) {
        const ks = pts.map(p => kern(grid[g], p.x));
        mean[g] = ks.reduce((s, v, i) => s + v * Kinvy[i], 0);
        // var = k** - ksᵀ Kinv ks
        let q = 0; for (let i = 0; i < n; i++) { let t = 0; for (let j = 0; j < n; j++) t += Kinv[i][j] * ks[j]; q += ks[i] * t; }
        sd[g] = Math.sqrt(Math.max(1e-6, sigf * sigf - q));
      }
    }
    // posterior samples over the grid (subsample grid for speed)
    const SG = 60, sgrid = Array.from({ length: SG }, (_, i) => i / (SG - 1));
    const r = (() => { let s = (sampleSeed * 99991) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
    const randn = () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    // posterior cov on sgrid
    const Kss = sgrid.map(a => sgrid.map(b => kern(a, b)));
    let pmean = sgrid.map(() => 0);
    if (n > 0) {
      const Kstar = sgrid.map(a => pts.map(p => kern(a, p.x)));            // SG×n
      const T = Kstar.map(row => row.map((_, j) => row.reduce((s, kv, k) => s + kv * Kinv[k][j], 0))); // SG×n = Kstar·Kinv
      pmean = T.map(row => row.reduce((s, v, j) => s + v * ys[j], 0));
      for (let i = 0; i < SG; i++) for (let j = 0; j < SG; j++) {
        let red = 0; for (let k = 0; k < n; k++) red += T[i][k] * Kstar[j][k];
        Kss[i][j] -= red;
      }
    }
    for (let i = 0; i < SG; i++) Kss[i][i] += 1e-6;
    const Lc = chol(Kss);
    const samples = [];
    for (let s = 0; s < 3; s++) {
      const z = sgrid.map(() => randn());
      const f = sgrid.map((_, i) => { let acc = pmean[i]; for (let k = 0; k <= i; k++) acc += Lc[i][k] * z[k]; return acc; });
      samples.push(f);
    }
    post.current = { grid, mean, sd, sgrid, samples };
  }
  _useEffect(() => { compute(); draw(); /* eslint-disable-next-line */ }, [pts, ell, sigf, noise, sampleSeed]);

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";
    const st = post.current; if (!st) return;

    // axes
    ctx.strokeStyle = "rgba(148,163,184,0.25)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD, PY(0)); ctx.lineTo(W - PAD, PY(0)); ctx.stroke();
    ctx.fillStyle = "#94a3b8"; ctx.fillText("GP POSTERIOR  ·  click to add a point  ·  band = ±2σ uncertainty", PAD, 20);

    // ±2σ band
    ctx.beginPath();
    st.grid.forEach((x, g) => { const xx = PX(x), yy = PY(st.mean[g] + 2 * st.sd[g]); g === 0 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy); });
    for (let g = G - 1; g >= 0; g--) { const xx = PX(st.grid[g]), yy = PY(st.mean[g] - 2 * st.sd[g]); ctx.lineTo(xx, yy); }
    ctx.closePath(); ctx.fillStyle = "rgba(96,165,250,0.18)"; ctx.fill();

    // posterior samples
    ctx.lineWidth = 1; ctx.strokeStyle = "rgba(168,85,247,0.4)";
    st.samples.forEach(f => { ctx.beginPath(); st.sgrid.forEach((x, i) => { const xx = PX(x), yy = PY(Math.max(YLO, Math.min(YHI, f[i]))); i === 0 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy); }); ctx.stroke(); });

    // mean
    ctx.strokeStyle = "#60a5fa"; ctx.lineWidth = 2.6;
    ctx.beginPath(); st.grid.forEach((x, g) => { const xx = PX(x), yy = PY(Math.max(YLO, Math.min(YHI, st.mean[g]))); g === 0 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy); }); ctx.stroke();

    // training points
    ctx.fillStyle = "#e2e8f0";
    pts.forEach(p => { ctx.beginPath(); ctx.arc(PX(p.x), PY(Math.max(YLO, Math.min(YHI, p.y))), 4.5, 0, 7); ctx.fill(); ctx.strokeStyle = "rgba(15,23,42,0.6)"; ctx.lineWidth = 1.2; ctx.stroke(); });
  }

  function onClick(e) {
    const cv = canvasRef.current, rect = cv.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (W / rect.width), py = (e.clientY - rect.top) * (H / rect.height);
    const x = invPX(px), y = invPY(py);
    if (x < 0 || x > 1 || y < YLO || y > YHI) return;
    setPts(p => [...p, { x, y }]);
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  });

  const stage = <canvas ref={canvasRef} onMouseDown={onClick} style={{ maxWidth: "100%", borderRadius: 4, cursor: "crosshair" }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// LENGTHSCALE ℓ" min={0.03} max={0.5} step={0.01} value={ell} onChange={setEll} tone="violet"
        help="How far the kernel reaches: small ℓ = wiggly functions that only trust nearby points (band snaps back to wide between points); large ℓ = smooth functions that share information over long ranges." />
      <Slider label="// SIGNAL σ_f" min={0.3} max={2} step={0.1} value={sigf} onChange={setSigf}
        help="Prior amplitude — how far functions are expected to swing from zero. Sets the width of the band where you have no data." />
      <Slider label="// NOISE σ_n" min={0.01} max={0.6} step={0.01} value={noise} onChange={setNoise}
        help="Assumed observation noise. Higher = the mean no longer passes exactly through points (it smooths through them) and the band stays wider even at the data." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setSampleSeed(s => s + 1)} primary>NEW SAMPLES</DemoButton>
        <DemoButton onClick={() => setPts([])}>CLEAR</DemoButton>
      </div>
      <StatReadout label="OBSERVATIONS" value={pts.length} accent="#e2e8f0" />
      <Legend items={[
        { color: "#60a5fa", label: "posterior mean" },
        { color: "#60a5fa", label: "±2σ band" },
        { color: "#a855f7", label: "sampled functions" },
        { color: "#e2e8f0", label: "your points (click)" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        A Gaussian process is a distribution over functions: before any data, every
        smooth curve is plausible (the purple samples fan out across the whole band).
        Click to drop an observation and the posterior updates in closed form — the
        mean (blue) bends to pass near your point and the ±2σ band pinches shut right
        there, because the GP is now certain nearby. Move away from data and the band
        flares back open: that widening is honest "I don't know here," the thing a
        single point-prediction model can never tell you.
      </DemoP>
      <DemoP>
        The kernel sets the personality. Shrink LENGTHSCALE ℓ and functions become
        twitchy — each point only constrains its immediate neighborhood, so the band
        re-opens fast between observations. Stretch ℓ and one point informs a wide
        region. Raise NOISE σ_n and the mean stops threading exactly through the dots
        (it assumes they're noisy) and keeps a floor of uncertainty even at the data.
        These three knobs are the GP's entire inductive bias.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Gaussian processes are the go-to model for regression with calibrated
        uncertainty on small data: the gold standard for Bayesian optimization
        (hyperparameter tuning, experiment design), surrogate modeling, geostatistics
        (kriging), and any setting where knowing <i>what you don't know</i> matters.
        The kernel choice is exactly the kind explored in the{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/svm/`} style={{ color: "#a855f7" }}>SVM</a> kernel
        trick, and the uncertainty bands are the Bayesian counterpart to the
        distribution-free intervals in{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/conformal-regression/`} style={{ color: "#a855f7" }}>conformal regression</a>.
      </DemoP>
      <DemoP>
        Caveats: exact GP inference inverts an n×n matrix, so it's O(n³) — fine for
        the handful of points here, painful past a few thousand without sparse/inducing-
        point approximations. The uncertainty is only as honest as the kernel and noise
        assumptions: pick the wrong lengthscale and the bands are confidently wrong.
        And vanilla GPs assume stationary, Gaussian-noise, low-dimensional inputs;
        deep kernel learning and neural-network GPs extend them to richer data.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="CLASSICAL ML" title="Gaussian Processes"
      subtitle="A distribution over functions with closed-form uncertainty. Click to add observations and watch the posterior mean bend and the ±2σ band pinch shut at data and flare open where you have none. Tune the kernel to reshape the prior."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/ml-theory/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<GaussianProcessDemo />);
