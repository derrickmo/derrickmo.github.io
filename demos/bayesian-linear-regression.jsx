// demos/bayesian-linear-regression.jsx — exact Bayesian linear regression.
// Gaussian RBF basis, conjugate Gaussian prior w ~ N(0, alpha^-1 I) and known
// noise precision beta. Closed-form Gaussian posterior (S_N^-1 = alphaI +
// beta Phi^T Phi, m_N = beta S_N Phi^T t) and predictive distribution. Click
// to add data; watch the predictive band tighten near data and fan out away
// from it, and sampled functions collapse from the prior toward the fit. All
// real linear algebra (Gauss-Jordan inverse + Cholesky sampling).

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 380;
const XMIN = -1, XMAX = 1, YMIN = -1.6, YMAX = 1.6;
const M = 9; // RBF centers
const CENTERS = Array.from({ length: M }, (_, j) => XMIN + (j / (M - 1)) * (XMAX - XMIN));
const D = M + 1; // + bias

function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function gauss(rng) { let u = 0, v = 0; while (u === 0) u = rng(); while (v === 0) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const trueFn = x => 0.85 * Math.sin(2.4 * x) - 0.25 * x;

function phi(x, width) {
  const out = [1];
  for (let j = 0; j < M; j++) out.push(Math.exp(-((x - CENTERS[j]) ** 2) / (2 * width * width)));
  return out;
}

// D x D inverse via Gauss-Jordan
function matInv(A) {
  const n = A.length, I = A.map((r, i) => r.map((_, j) => (i === j ? 1 : 0)));
  const Mt = A.map(r => r.slice());
  for (let c = 0; c < n; c++) {
    let piv = c; for (let r = c + 1; r < n; r++) if (Math.abs(Mt[r][c]) > Math.abs(Mt[piv][c])) piv = r;
    [Mt[c], Mt[piv]] = [Mt[piv], Mt[c]];[I[c], I[piv]] = [I[piv], I[c]];
    const d = Mt[c][c] || 1e-12;
    for (let j = 0; j < n; j++) { Mt[c][j] /= d; I[c][j] /= d; }
    for (let r = 0; r < n; r++) if (r !== c) { const f = Mt[r][c]; for (let j = 0; j < n; j++) { Mt[r][j] -= f * Mt[c][j]; I[r][j] -= f * I[c][j]; } }
  }
  return I;
}
// Cholesky: A = L L^T (A SPD)
function chol(A) {
  const n = A.length, L = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
    let s = A[i][j]; for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
    if (i === j) L[i][j] = Math.sqrt(Math.max(s, 1e-12)); else L[i][j] = s / (L[j][j] || 1e-12);
  }
  return L;
}
const matVec = (Mt, v) => Mt.map(row => row.reduce((s, a, j) => s + a * v[j], 0));
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

// posterior given data points [{x,y}], alpha, beta, width
function posterior(data, alpha, beta, width) {
  const PtP = Array.from({ length: D }, () => new Array(D).fill(0));
  const Pt_t = new Array(D).fill(0);
  for (const p of data) {
    const f = phi(p.x, width);
    for (let i = 0; i < D; i++) { Pt_t[i] += f[i] * p.y; for (let j = 0; j < D; j++) PtP[i][j] += f[i] * f[j]; }
  }
  const precision = PtP.map((row, i) => row.map((v, j) => beta * v + (i === j ? alpha : 0)));
  const SN = matInv(precision); // covariance
  const mN = matVec(SN, Pt_t).map(v => beta * v);
  return { SN, mN };
}

function BayesianLinearRegressionDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const dataRef = _useRef([]);
  const rngRef = _useRef(mulberry32(11));
  const sampleZRef = _useRef([]); // fixed standard-normal draws so sample curves are stable across re-renders

  const [alpha, setAlpha] = _useState(2);
  const [beta, setBeta] = _useState(25);
  const [width, setWidth] = _useState(0.22);
  const [nSamp, setNSamp] = _useState(5);
  const [n, setN] = _useState(0);

  const alphaRef = _useRef(alpha), betaRef = _useRef(beta), widthRef = _useRef(width), nSampRef = _useRef(nSamp);
  _useEffect(() => { alphaRef.current = alpha; draw(); }, [alpha]);
  _useEffect(() => { betaRef.current = beta; draw(); }, [beta]);
  _useEffect(() => { widthRef.current = width; draw(); }, [width]);
  _useEffect(() => { nSampRef.current = nSamp; ensureZ(); draw(); }, [nSamp]);

  function ensureZ() {
    while (sampleZRef.current.length < nSampRef.current) sampleZRef.current.push(Array.from({ length: D }, () => gauss(rngRef.current)));
  }

  function toPx(x, y) { return [(x - XMIN) / (XMAX - XMIN) * W, (1 - (y - YMIN) / (YMAX - YMIN)) * H]; }
  function toParam(px, py) { return [XMIN + px / W * (XMAX - XMIN), YMIN + (1 - py / H) * (YMAX - YMIN)]; }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // grid + zero line
    ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 1;
    for (let gx = -1; gx <= 1; gx += 0.5) { const [px] = toPx(gx, 0); ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke(); }
    const [, zy] = toPx(0, 0);
    ctx.strokeStyle = "rgba(255,255,255,0.14)"; ctx.beginPath(); ctx.moveTo(0, zy); ctx.lineTo(W, zy); ctx.stroke();

    const al = alphaRef.current, be = betaRef.current, wd = widthRef.current;
    const { SN, mN } = posterior(dataRef.current, al, be, wd);

    const G = 120;
    const xs = [], mean = [], sd = [];
    for (let i = 0; i <= G; i++) {
      const x = XMIN + (i / G) * (XMAX - XMIN), f = phi(x, wd);
      const mu = dot(f, mN);
      const v = 1 / be + dot(f, matVec(SN, f));
      xs.push(x); mean.push(mu); sd.push(Math.sqrt(Math.max(v, 0)));
    }
    // predictive +/-2sigma band
    ctx.fillStyle = "rgba(96,165,250,0.16)"; ctx.beginPath();
    for (let i = 0; i <= G; i++) { const [px, py] = toPx(xs[i], mean[i] + 2 * sd[i]); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    for (let i = G; i >= 0; i--) { const [px, py] = toPx(xs[i], mean[i] - 2 * sd[i]); ctx.lineTo(px, py); }
    ctx.closePath(); ctx.fill();

    // sampled functions from posterior: w = mN + L z
    const L = chol(SN); ensureZ();
    ctx.lineWidth = 1.3;
    for (let s = 0; s < nSampRef.current; s++) {
      const z = sampleZRef.current[s];
      const Lz = matVec(L, z), w = mN.map((m, i) => m + Lz[i]);
      ctx.strokeStyle = "rgba(192,132,252,0.5)"; ctx.beginPath();
      for (let i = 0; i <= G; i++) { const x = xs[i], f = phi(x, wd); const [px, py] = toPx(x, dot(f, w)); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke();
    }
    // posterior mean
    ctx.strokeStyle = "#60a5fa"; ctx.lineWidth = 2.4; ctx.beginPath();
    for (let i = 0; i <= G; i++) { const [px, py] = toPx(xs[i], mean[i]); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.stroke();

    // data points
    for (const p of dataRef.current) {
      const [px, py] = toPx(p.x, p.y);
      ctx.fillStyle = "#fff"; ctx.strokeStyle = "#0a0e1a"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    // labels
    ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.font = "10px JetBrains Mono, monospace"; ctx.textAlign = "left";
    ctx.fillText(dataRef.current.length === 0 ? "PRIOR (no data) - click to add a point" : "POSTERIOR", 10, 16);
  }

  function onDown(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const [x, y] = toParam((e.clientX - rect.left) / (rect.width / W), (e.clientY - rect.top) / (rect.height / H));
    if (x < XMIN || x > XMAX) return;
    dataRef.current.push({ x, y }); setN(dataRef.current.length); draw();
  }
  function addRandom() {
    const rng = rngRef.current, x = XMIN + rng() * (XMAX - XMIN);
    const y = trueFn(x) + gauss(rng) * Math.sqrt(1 / betaRef.current);
    dataRef.current.push({ x, y }); setN(dataRef.current.length); draw();
  }
  function clearData() { dataRef.current = []; setN(0); draw(); }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    // seed a few points
    const rng = rngRef.current;
    for (let k = 0; k < 4; k++) { const x = XMIN + rng() * (XMAX - XMIN); dataRef.current.push({ x, y: trueFn(x) + gauss(rng) * 0.2 }); }
    setN(dataRef.current.length); ensureZ(); draw();
  }, []);

  const stage = (<canvas ref={canvasRef} onPointerDown={onDown} style={{ touchAction: "none", cursor: "crosshair", maxWidth: "100%", borderRadius: 4 }} />);

  const controls = (
    <ControlGroup>
      <Slider label="// PRIOR PRECISION alpha" min={0.2} max={10} step={0.2} value={alpha} onChange={setAlpha}
        help="How strongly the prior pulls the weights toward zero (precision = 1/variance). High alpha = a confident, smooth prior that resists the data; low alpha = a vague prior that lets the data dominate." />
      <Slider label="// NOISE PRECISION beta" min={2} max={100} step={2} value={beta} onChange={setBeta}
        help="How much you trust each observation: beta = 1/noise-variance. High beta makes the band hug the points tightly; low beta treats points as noisy so the posterior stays broad." />
      <Slider label="// RBF WIDTH" min={0.08} max={0.5} step={0.01} value={width} onChange={setWidth}
        help="Width of the Gaussian basis functions. Narrow = wiggly, locally flexible fits; wide = smoother, stiffer fits. Controls how far a single data point's influence spreads." />
      <Slider label="// POSTERIOR SAMPLES" min={0} max={8} step={1} value={nSamp} onChange={setNSamp}
        help="Number of functions drawn from the posterior over weights. They spread out where there is no data (uncertainty) and bunch together near observations." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={addRandom} primary>ADD POINT</DemoButton>
        <DemoButton onClick={clearData}>CLEAR</DemoButton>
      </div>
      <StatReadout label="DATA POINTS" value={n} accent="var(--blue-lt)" />
      <Legend items={[
        { color: "#60a5fa", label: "POSTERIOR MEAN" },
        { color: "rgba(96,165,250,0.5)", label: "PREDICTIVE +/-2 sigma" },
        { color: "#c084fc", label: "SAMPLED FUNCTIONS" },
        { color: "#fff", label: "DATA", border: "1px solid #0a0e1a" },
      ]} />
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>Tip: click anywhere on the plot to place a data point.</div>
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Instead of fitting <i>one</i> best line, Bayesian regression keeps a whole
        <b> distribution</b> over functions consistent with the data. With a Gaussian prior
        on the weights and Gaussian noise, the posterior is exactly Gaussian and available in
        closed form — no sampling needed. The blue curve is the posterior <b>mean</b>, the
        shaded region is the <b>predictive ±2σ</b> band, and each violet curve is a function
        drawn from the posterior.
      </DemoP>
      <DemoP>
        With <b>no data</b> you see the prior: samples wander freely and the band is wide
        everywhere. Add points (click the plot) and the posterior <b>contracts</b> — tightly
        where you have data, while still fanning out in the gaps and beyond the edges, because
        the model honestly reports that it doesn't know there. Raise <b>β</b> to trust the data
        more (band hugs the points); raise <b>α</b> for a stiffer prior that resists overfitting.
        This calibrated "I don't know" is the whole point of being Bayesian.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Quantified uncertainty is what separates a Bayesian model from a point estimate, and it
        is exactly what high-stakes ML needs: active learning queries the points where the band
        is widest, Bayesian optimization balances exploration against exploitation using these
        error bars, and Thompson sampling (see the <a href={`${window.__DM_BASE || "../../"}visualize/bandit/`}>bandit</a> demo) acts
        by drawing from the posterior. The closed-form posterior here is the linear, finite-basis
        cousin of a <a href={`${window.__DM_BASE || "../../"}visualize/gaussian-process/`}>Gaussian process</a> — take
        the number of basis functions to infinity and you get a GP.
      </DemoP>
      <DemoP>
        The prior precision α is L2 regularization in disguise: the posterior mean here is exactly
        ridge regression with λ = α/β, so <a href={`${window.__DM_BASE || "../../"}visualize/overfitting/`}>regularization</a> falls
        out as the MAP estimate of a Bayesian model. The catch is scale: exact inference needs a
        matrix inverse, so for deep or huge models people fall back on approximations —
        variational inference, Laplace, or MC-dropout — to recover these error bars cheaply.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      topic="BAYESIAN"
      title="Bayesian Linear Regression"
      subtitle="Fit a distribution over functions, not a single line - and watch uncertainty shrink where the data is."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/foundations/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="blue"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<BayesianLinearRegressionDemo />);
