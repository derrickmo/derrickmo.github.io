// demos/ista.jsx — proximal gradient descent for L1 (Lasso) via soft-thresholding.
// Real sparse linear regression: A x* + noise = b, with x* sparse. ISTA / FISTA
// minimize 0.5||Ax-b||^2 + lambda||x||_1; the proximal (soft-threshold) step
// pushes small coefficients EXACTLY to zero, recovering the support. All real
// linear algebra: matrix-vector products, power-iteration Lipschitz constant,
// exact soft-threshold prox, FISTA momentum.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 380;
const N = 24, P = 16, KTRUE = 4; // samples, features, true nonzeros

function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function gauss(rng) { let u = 0, v = 0; while (u === 0) u = rng(); while (v === 0) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

const matVec = (Amat, x) => Amat.map(row => row.reduce((s, a, j) => s + a * x[j], 0)); // A x  (length N)
function matTVec(Amat, r) { const out = new Array(P).fill(0); for (let i = 0; i < N; i++) for (let j = 0; j < P; j++) out[j] += Amat[i][j] * r[i]; return out; } // A^T r (length P)
const soft = (z, t) => Math.sign(z) * Math.max(Math.abs(z) - t, 0);

// Build a Lasso problem: standardized design A, sparse x*, b = A x* + noise.
function buildProblem(seed, noise) {
  const rng = mulberry32(seed);
  const A = [];
  for (let i = 0; i < N; i++) { const row = []; for (let j = 0; j < P; j++) row.push(gauss(rng)); A.push(row); }
  // standardize columns to unit-ish scale
  for (let j = 0; j < P; j++) {
    let m = 0; for (let i = 0; i < N; i++) m += A[i][j]; m /= N;
    let s = 0; for (let i = 0; i < N; i++) s += (A[i][j] - m) ** 2; s = Math.sqrt(s / N) || 1;
    for (let i = 0; i < N; i++) A[i][j] = (A[i][j] - m) / s / Math.sqrt(N);
  }
  const xTrue = new Array(P).fill(0);
  const idx = [...Array(P).keys()]; for (let i = idx.length - 1; i > 0; i--) { const k = Math.floor(rng() * (i + 1));[idx[i], idx[k]] = [idx[k], idx[i]]; }
  for (let s = 0; s < KTRUE; s++) xTrue[idx[s]] = (rng() < 0.5 ? -1 : 1) * (0.6 + rng() * 1.0);
  const b = matVec(A, xTrue).map(v => v + noise * gauss(rng));
  // Lipschitz L = largest eigenvalue of A^T A via power iteration
  let v = new Array(P).fill(0).map(() => rng());
  let L = 1;
  for (let it = 0; it < 40; it++) {
    const Av = matVec(A, v), AtAv = matTVec(A, Av);
    const nrm = Math.sqrt(AtAv.reduce((s, q) => s + q * q, 0)) || 1;
    L = nrm; v = AtAv.map(q => q / nrm);
  }
  // lambda_max = max_j |A^T b|  (above this, all coefs are zero)
  const Atb = matTVec(A, b);
  const lamMax = Math.max(...Atb.map(Math.abs));
  return { A, b, xTrue, L, lamMax };
}

function objective(A, b, x, lam) {
  const r = matVec(A, x).map((v, i) => v - b[i]);
  return 0.5 * r.reduce((s, q) => s + q * q, 0) + lam * x.reduce((s, q) => s + Math.abs(q), 0);
}

function IstaDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const probRef = _useRef(null);
  const xRef = _useRef(new Array(P).fill(0));
  const yRef = _useRef(new Array(P).fill(0)); // FISTA momentum point
  const xPrevRef = _useRef(new Array(P).fill(0));
  const tkRef = _useRef(1);
  const histRef = _useRef([]);
  const rafRef = _useRef(null);

  const [seed, setSeed] = _useState(7);
  const [lamFrac, setLamFrac] = _useState(0.18);
  const [algo, setAlgo] = _useState("fista");
  const [noise, setNoise] = _useState(0.06);
  const [speed, setSpeed] = _useState(2);
  const [running, setRunning] = _useState(false);
  const [iter, setIter] = _useState(0);
  const [obj, setObj] = _useState(0);
  const [nnz, setNnz] = _useState(0);
  const [support, setSupport] = _useState(0);
  const [status, setStatus] = _useState("IDLE");

  const lamFracRef = _useRef(lamFrac), algoRef = _useRef(algo), speedRef = _useRef(speed);
  const doneRef = _useRef(false), prevObjRef = _useRef(Infinity);
  _useEffect(() => { lamFracRef.current = lamFrac; }, [lamFrac]);
  _useEffect(() => { algoRef.current = algo; resetRun(); }, [algo]);
  _useEffect(() => { speedRef.current = speed; }, [speed]);

  const lambda = () => lamFracRef.current * (probRef.current ? probRef.current.lamMax : 1);

  function rebuild() { probRef.current = buildProblem(seed, noise); resetRun(); }

  function resetRun() {
    xRef.current = new Array(P).fill(0); yRef.current = new Array(P).fill(0);
    xPrevRef.current = new Array(P).fill(0); tkRef.current = 1;
    histRef.current = []; doneRef.current = false; prevObjRef.current = Infinity;
    const pr = probRef.current;
    setIter(0); setStatus("IDLE");
    if (pr) { const o = objective(pr.A, pr.b, xRef.current, lambda()); setObj(+o.toFixed(3)); histRef.current = [o]; }
    setNnz(0); setSupport(0);
    draw();
  }

  function stepOnce() {
    const pr = probRef.current; if (!pr || doneRef.current) return true;
    const lam = lambda(), t = 1 / pr.L, tau = t * lam;
    if (algoRef.current === "ista") {
      const r = matVec(pr.A, xRef.current).map((v, i) => v - pr.b[i]);
      const g = matTVec(pr.A, r);
      xRef.current = xRef.current.map((xi, j) => soft(xi - t * g[j], tau));
    } else { // FISTA
      const y = yRef.current;
      const r = matVec(pr.A, y).map((v, i) => v - pr.b[i]);
      const g = matTVec(pr.A, r);
      const xNew = y.map((yi, j) => soft(yi - t * g[j], tau));
      const tNext = (1 + Math.sqrt(1 + 4 * tkRef.current * tkRef.current)) / 2;
      const mom = (tkRef.current - 1) / tNext;
      yRef.current = xNew.map((xn, j) => xn + mom * (xn - xRef.current[j]));
      xPrevRef.current = xRef.current; xRef.current = xNew; tkRef.current = tNext;
    }
    const o = objective(pr.A, pr.b, xRef.current, lam);
    histRef.current.push(o);
    const it = iter + histRef.current.length; // not used directly
    setIter(v => v + 1);
    setObj(+o.toFixed(3));
    const k = xRef.current.filter(v => Math.abs(v) > 1e-4).length;
    setNnz(k);
    let sup = 0; for (let j = 0; j < P; j++) if ((Math.abs(xRef.current[j]) > 1e-4) && (Math.abs(pr.xTrue[j]) > 1e-9)) sup++;
    setSupport(sup);
    if (Math.abs(prevObjRef.current - o) < 1e-7) { doneRef.current = true; setStatus("CONVERGED"); return true; }
    prevObjRef.current = o; setStatus("OPTIMIZING");
    return false;
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const pr = probRef.current; if (!pr) return;

    // ---- coefficient bar chart (hero) ----
    const x0 = 30, x1 = 510, top = 18, zeroY = 118, halfH = 92;
    const maxMag = Math.max(0.1, ...pr.xTrue.map(Math.abs), ...xRef.current.map(Math.abs)) * 1.1;
    const bw = (x1 - x0) / P;
    ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, zeroY); ctx.lineTo(x1, zeroY); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px JetBrains Mono, monospace"; ctx.textAlign = "left";
    ctx.fillText("COEFFICIENTS", x0, top - 2);
    for (let j = 0; j < P; j++) {
      const cx = x0 + j * bw + bw / 2;
      // true coef: hollow outline
      const tH = (pr.xTrue[j] / maxMag) * halfH;
      if (Math.abs(pr.xTrue[j]) > 1e-9) {
        ctx.strokeStyle = "rgba(52,211,153,0.9)"; ctx.lineWidth = 1.4;
        ctx.strokeRect(cx - bw * 0.34, zeroY - Math.max(tH, 0), bw * 0.68, Math.abs(tH));
        if (tH < 0) ctx.strokeRect(cx - bw * 0.34, zeroY, bw * 0.68, -tH);
      }
      // estimate: filled
      const eH = (xRef.current[j] / maxMag) * halfH;
      const isOn = Math.abs(xRef.current[j]) > 1e-4;
      ctx.fillStyle = isOn ? "#c084fc" : "rgba(168,85,247,0.15)";
      const bh = Math.abs(eH);
      if (eH >= 0) ctx.fillRect(cx - bw * 0.26, zeroY - bh, bw * 0.52, bh);
      else ctx.fillRect(cx - bw * 0.26, zeroY, bw * 0.52, bh);
      if (!isOn) { ctx.fillStyle = "rgba(168,85,247,0.45)"; ctx.beginPath(); ctx.arc(cx, zeroY, 1.6, 0, Math.PI * 2); ctx.fill(); }
    }

    // ---- soft-threshold inset (bottom-left) ----
    const sx = 36, sy = 250, sw = 170, sh = 110;
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillText("SOFT-THRESHOLD prox", sx, sy - 8);
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.strokeRect(sx, sy, sw, sh);
    const tau = (1 / pr.L) * lambda();
    const rng = maxMag;
    const mapx = z => sx + ((z + rng) / (2 * rng)) * sw;
    const mapy = z => sy + sh / 2 - (z / rng) * (sh / 2);
    // identity (dashed) and soft-threshold curve
    ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.setLineDash([3, 3]); ctx.beginPath();
    ctx.moveTo(mapx(-rng), mapy(-rng)); ctx.lineTo(mapx(rng), mapy(rng)); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = "#c084fc"; ctx.lineWidth = 1.8; ctx.beginPath();
    for (let i = 0; i <= 80; i++) { const z = -rng + (i / 80) * 2 * rng; const o = soft(z, tau); const px = mapx(z), py = mapy(Math.max(-rng, Math.min(rng, o))); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.stroke();
    // dead zone shading
    ctx.fillStyle = "rgba(248,113,113,0.14)"; ctx.fillRect(mapx(-tau), sy, mapx(tau) - mapx(-tau), sh);
    ctx.fillStyle = "rgba(248,113,113,0.8)"; ctx.font = "9px JetBrains Mono, monospace"; ctx.textAlign = "center";
    ctx.fillText("dead zone +/- t.lambda", (mapx(-tau) + mapx(tau)) / 2, sy + sh - 6);
    ctx.textAlign = "left";

    // ---- objective curve inset (bottom-right) ----
    const ox = 300, oy = 250, ow = 204, oh = 110;
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillText("OBJECTIVE vs ITERATION", ox, oy - 8);
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.strokeRect(ox, oy, ow, oh);
    const hist = histRef.current;
    if (hist.length > 1) {
      const lo = Math.min(...hist), hi = Math.max(...hist), span = hi - lo || 1;
      ctx.strokeStyle = "#60a5fa"; ctx.lineWidth = 1.8; ctx.beginPath();
      hist.forEach((v, i) => { const px = ox + (i / (hist.length - 1)) * ow; const py = oy + oh - ((v - lo) / span) * (oh - 8) - 4; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
      ctx.stroke();
    }
  }

  function handleRun() { if (running) { setRunning(false); return; } if (doneRef.current) resetRun(); setRunning(true); }
  function handleStep() { if (running) return; stepOnce(); draw(); }
  function handleResample() { setRunning(false); setSeed(s => s + 1); }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    rebuild();
  }, []);
  _useEffect(() => { rebuild(); }, [seed, noise]);
  _useEffect(() => { if (probRef.current) { const o = objective(probRef.current.A, probRef.current.b, xRef.current, lambda()); setObj(+o.toFixed(3)); draw(); } }, [lamFrac]);

  _useEffect(() => {
    if (!running) return;
    let alive = true;
    const loop = () => {
      if (!alive) return;
      let done = false;
      for (let i = 0; i < speedRef.current && !done; i++) done = stepOnce();
      draw();
      if (done) { setRunning(false); return; }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, [running]);

  const stage = (<canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />);

  const controls = (
    <ControlGroup>
      <Slider label="// REGULARIZATION lambda" min={0.02} max={0.6} step={0.01} value={lamFrac} onChange={setLamFrac} tone="violet"
        help="L1 penalty strength, as a fraction of the value above which every coefficient is forced to zero. Higher = sparser (fewer nonzeros) but more bias; lower = denser, closer to plain least squares." />
      <SegmentedControl label="// ALGORITHM" tone="violet" value={algo} onChange={setAlgo}
        options={[{ value: "ista", label: "ISTA" }, { value: "fista", label: "FISTA" }]}
        help="ISTA is plain proximal gradient. FISTA adds Nesterov momentum, converging at O(1/k^2) instead of O(1/k) - watch the objective curve drop faster for the same iteration count." />
      <Slider label="// NOISE" min={0} max={0.4} step={0.02} value={noise} onChange={setNoise} tone="violet"
        help="Standard deviation of the noise added to the measurements b. More noise makes the true support harder to recover and usually calls for a larger lambda." />
      <Slider label="// SPEED" min={1} max={20} value={speed} onChange={setSpeed} suffix=" /frame"
        help="Proximal steps per animation frame. Visual pacing only." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={handleRun} primary>{running ? "PAUSE" : "RUN"}</DemoButton>
        <DemoButton onClick={handleStep} disabled={running}>STEP</DemoButton>
        <DemoButton onClick={resetRun}>RESET</DemoButton>
        <DemoButton onClick={handleResample}>RESAMPLE</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="ITERATION" value={iter} />
        <StatReadout label="OBJECTIVE" value={obj} accent="var(--blue-lt)" />
        <StatReadout label="NONZEROS" value={`${nnz} / ${P}`} accent="var(--violet-lt)" />
        <StatReadout label="SUPPORT FOUND" value={`${support} / ${KTRUE}`} accent={support === KTRUE && nnz === KTRUE ? "#34d399" : "#fbbf24"} />
      </div>
      <StatReadout label="STATUS" value={status} accent={status === "CONVERGED" ? "#34d399" : "var(--blue-lt)"} />
      <Legend items={[
        { color: "#c084fc", label: "ESTIMATE" },
        { color: "#34d399", label: "TRUE COEF", border: "1px solid #34d399" },
        { color: "#f87171", label: "SHRUNK TO ZERO" },
      ]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        This fits a linear model whose true coefficients are mostly <b>zero</b> (only four
        of sixteen features actually matter). Plain least squares would give every feature
        some nonzero weight; the <b>L1 penalty</b> instead drives irrelevant coefficients
        <i> exactly</i> to zero. The engine is <b>proximal gradient descent</b>: take a
        normal gradient step on the data-fit term, then apply the L1 <b>proximal operator</b> —
        which is just <b>soft-thresholding</b>, shown bottom-left. Anything inside the
        <span style={{ color: "#f87171" }}> dead zone</span> ±tλ is snapped to zero; everything
        else is shrunk toward zero.
      </DemoP>
      <DemoP>
        Raise <b>λ</b> and watch coefficients switch off one by one until only the true four
        survive (SUPPORT FOUND turns green) — push it too far and even real ones die. Switch
        from <b>ISTA</b> to <b>FISTA</b> and the objective curve plunges far faster for the
        same number of steps: that is Nesterov momentum turning O(1/k) convergence into
        O(1/k²), the single most-cited trick in convex optimization.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Soft-thresholding is the workhorse of <b>sparse</b> modeling — Lasso regression,
        compressed sensing, sparse coding, and the L1 penalties sprinkled across modern ML to
        prune features or compress models. The key idea generalizes far beyond L1:
        <b> proximal gradient</b> methods handle any objective that splits into a smooth part
        (here the squared error, which you optimize with a <a href={`${window.__DM_BASE || "../../"}visualize/gradient-descent/`}>gradient step</a>)
        plus a non-smooth regularizer with a cheap proximal operator. Group Lasso, total-variation
        denoising, and nuclear-norm (low-rank) recovery all use the same template.
      </DemoP>
      <DemoP>
        Note the two solvers for the very same Lasso problem: this proximal view, and the
        <a href={`${window.__DM_BASE || "../../"}visualize/coordinate-descent/`}> coordinate-descent</a> view
        (what glmnet actually runs). The deeper lesson is that the <i>structure</i> of your
        regularizer — not just its value — determines which algorithm is efficient, and that a
        well-chosen penalty buys you <b>feature selection for free</b> as a side effect of optimization.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      topic="OPTIMIZATION"
      title="ISTA / Proximal Gradient (L1)"
      subtitle="Recover a sparse model with soft-thresholding - the proximal step that snaps small coefficients to exactly zero."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/ml-theory/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="violet"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<IstaDemo />);
