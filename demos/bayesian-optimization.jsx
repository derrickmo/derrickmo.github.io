// demos/bayesian-optimization.jsx — optimize an expensive black-box function by
// fitting a GP surrogate and sampling where an acquisition function says to look
// next. Real GP posterior (RBF kernel, exact matrix inverse), real Expected
// Improvement / UCB / Probability-of-Improvement acquisitions, real argmax
// sequential selection. The point: it finds the global max in a handful of
// evals by trading exploration (high variance) against exploitation (high mean).

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 380;
const XMIN = 0, XMAX = 1, GRID = 140;

function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function erf(x) { const s = Math.sign(x); x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return s * y; }
const Phi = z => 0.5 * (1 + erf(z / Math.SQRT2));
const phi = z => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);

// random smooth multimodal objective (sum of a few bumps), seedable
function makeObjective(seed) {
  const rng = mulberry32(seed);
  const bumps = [];
  const nb = 3 + Math.floor(rng() * 2);
  for (let i = 0; i < nb; i++) bumps.push({ c: 0.08 + rng() * 0.84, w: 0.05 + rng() * 0.13, h: 0.4 + rng() * 0.9, s: rng() < 0.78 ? 1 : -0.7 });
  const f = x => bumps.reduce((a, b) => a + b.s * b.h * Math.exp(-((x - b.c) ** 2) / (2 * b.w * b.w)), 0);
  // precompute true max on a fine grid
  let bx = 0, bv = -Infinity; for (let i = 0; i <= 600; i++) { const x = i / 600, v = f(x); if (v > bv) { bv = v; bx = x; } }
  return { f, trueMaxX: bx, trueMax: bv };
}

// D x D inverse (Gauss-Jordan)
function matInv(A) {
  const n = A.length, I = A.map((r, i) => r.map((_, j) => (i === j ? 1 : 0))), M = A.map(r => r.slice());
  for (let c = 0; c < n; c++) {
    let piv = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];[I[c], I[piv]] = [I[piv], I[c]];
    const d = M[c][c] || 1e-12; for (let j = 0; j < n; j++) { M[c][j] /= d; I[c][j] /= d; }
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c]; for (let j = 0; j < n; j++) { M[r][j] -= f * M[c][j]; I[r][j] -= f * I[c][j]; } }
  }
  return I;
}

function BayesianOptimizationDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const objRef = _useRef(null);
  const obsRef = _useRef([]); // {x,y}
  const rngRef = _useRef(mulberry32(3));
  const nextRef = _useRef(null);
  const rafRef = _useRef(null);

  const [seed, setSeed] = _useState(3);
  const [acq, setAcq] = _useState("ei");
  const [ell, setEll] = _useState(0.1);
  const [explore, setExplore] = _useState(0.4);
  const [running, setRunning] = _useState(false);
  const [evals, setEvals] = _useState(0);
  const [best, setBest] = _useState(-Infinity);
  const [, setTick] = _useState(0);

  const acqRef = _useRef(acq), ellRef = _useRef(ell), expRef = _useRef(explore);
  _useEffect(() => { acqRef.current = acq; recompute(); }, [acq]);
  _useEffect(() => { ellRef.current = ell; recompute(); }, [ell]);
  _useEffect(() => { expRef.current = explore; recompute(); }, [explore]);

  const SIGN = 1e-3; // observation noise std (small)
  const kern = (a, b) => Math.exp(-((a - b) ** 2) / (2 * ellRef.current * ellRef.current));

  function gpPredict(grid) {
    const obs = obsRef.current, n = obs.length;
    if (n === 0) return grid.map(() => ({ m: 0, s: 1 }));
    const K = []; for (let i = 0; i < n; i++) { const row = []; for (let j = 0; j < n; j++) row.push(kern(obs[i].x, obs[j].x) + (i === j ? SIGN * SIGN + 1e-7 : 0)); K.push(row); }
    const Kinv = matInv(K);
    const y = obs.map(o => o.y);
    const alpha = Kinv.map(row => row.reduce((s, v, j) => s + v * y[j], 0));
    return grid.map(x => {
      const ks = obs.map(o => kern(x, o.x));
      const m = ks.reduce((s, v, i) => s + v * alpha[i], 0);
      const Kik = Kinv.map(row => row.reduce((s, v, j) => s + v * ks[j], 0));
      const v = 1 - ks.reduce((s, vv, i) => s + vv * Kik[i], 0);
      return { m, s: Math.sqrt(Math.max(v, 1e-9)) };
    });
  }

  function acquisition(pred, fbest) {
    const ex = expRef.current;
    return pred.map(({ m, s }) => {
      if (acqRef.current === "ucb") return m + (ex * 3) * s;
      const xi = ex * 0.15, imp = m - fbest - xi;
      if (s < 1e-9) return Math.max(imp, 0);
      const z = imp / s;
      if (acqRef.current === "pi") return Phi(z);
      return imp * Phi(z) + s * phi(z); // EI
    });
  }

  const gridArr = () => Array.from({ length: GRID + 1 }, (_, i) => XMIN + (i / GRID) * (XMAX - XMIN));

  function recompute() {
    const grid = gridArr(), pred = gpPredict(grid);
    const fbest = obsRef.current.length ? Math.max(...obsRef.current.map(o => o.y)) : 0;
    const acqv = acquisition(pred, fbest);
    let bi = 0; for (let i = 1; i < acqv.length; i++) if (acqv[i] > acqv[bi]) bi = i;
    nextRef.current = { x: grid[bi], pred, acqv, grid };
    setTick(v => v + 1); draw();
  }

  function stepOnce() {
    if (!nextRef.current) recompute();
    const nx = nextRef.current.x, ny = objRef.current.f(nx);
    obsRef.current.push({ x: nx, y: ny });
    setEvals(obsRef.current.length);
    setBest(Math.max(...obsRef.current.map(o => o.y)));
    recompute();
  }

  function resetRun(newSeed) {
    const s = newSeed != null ? newSeed : seed;
    objRef.current = makeObjective(s);
    obsRef.current = [];
    rngRef.current = mulberry32(s * 101 + 7);
    // seed two initial evaluations
    for (const x of [0.15 + rngRef.current() * 0.2, 0.6 + rngRef.current() * 0.25]) obsRef.current.push({ x, y: objRef.current.f(x) });
    setEvals(obsRef.current.length); setBest(Math.max(...obsRef.current.map(o => o.y)));
    recompute();
  }

  function draw() {
    // objRef is set by resetRun() in the mount effect below, which React runs AFTER the
    // [acq]/[ell]/[explore] effects declared above it — and those call recompute(), which
    // sets nextRef and calls draw(). So there is one frame where nextRef is populated and
    // objRef is still null; without objRef here, obj.f() below threw and blanked the page.
    const cv = canvasRef.current; if (!cv || !nextRef.current || !objRef.current) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const obj = objRef.current, { pred, acqv, grid, x: nx } = nextRef.current;
    const x0 = 36, x1 = 512;
    const mapX = x => x0 + (x - XMIN) / (XMAX - XMIN) * (x1 - x0);
    // y-range for objective panel
    let lo = Infinity, hi = -Infinity;
    grid.forEach((x, i) => { const fv = obj.f(x), mu = pred[i].m, up = pred[i].m + 2 * pred[i].s, dn = pred[i].m - 2 * pred[i].s; lo = Math.min(lo, fv, dn); hi = Math.max(hi, fv, up); });
    obsRef.current.forEach(o => { lo = Math.min(lo, o.y); hi = Math.max(hi, o.y); });
    const pad = (hi - lo) * 0.1 || 1; lo -= pad; hi += pad;
    const topY = 26, midY = 246;
    const mapY = v => midY - (v - lo) / (hi - lo) * (midY - topY);

    // GP +/-2sigma band
    ctx.fillStyle = "rgba(96,165,250,0.16)"; ctx.beginPath();
    grid.forEach((x, i) => { const px = mapX(x), py = mapY(pred[i].m + 2 * pred[i].s); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
    for (let i = grid.length - 1; i >= 0; i--) ctx.lineTo(mapX(grid[i]), mapY(pred[i].m - 2 * pred[i].s));
    ctx.closePath(); ctx.fill();
    // true objective (faint dashed)
    ctx.strokeStyle = "rgba(148,163,184,0.6)"; ctx.lineWidth = 1.4; ctx.setLineDash([5, 4]); ctx.beginPath();
    grid.forEach((x, i) => { const px = mapX(x), py = mapY(obj.f(x)); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke(); ctx.setLineDash([]);
    // GP mean
    ctx.strokeStyle = "#60a5fa"; ctx.lineWidth = 2.2; ctx.beginPath();
    grid.forEach((x, i) => { const px = mapX(x), py = mapY(pred[i].m); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke();
    // true max marker
    const [tmx, tmy] = [mapX(obj.trueMaxX), mapY(obj.trueMax)];
    ctx.strokeStyle = "#34d399"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(tmx, tmy, 6, 0, Math.PI * 2); ctx.stroke();
    // observations
    obsRef.current.forEach(o => { ctx.fillStyle = "#fff"; ctx.strokeStyle = "#0a0e1a"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(mapX(o.x), mapY(o.y), 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); });
    // next sample vertical line
    ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(mapX(nx), topY); ctx.lineTo(mapX(nx), 360); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px JetBrains Mono, monospace"; ctx.textAlign = "left";
    ctx.fillText("SURROGATE: true objective (dashed) - GP mean + 2 sigma", x0, 16);

    // acquisition panel
    const aTop = 278, aBot = 356;
    let amx = Math.max(...acqv), amn = Math.min(...acqv); if (amx - amn < 1e-9) amx = amn + 1;
    const aY = v => aBot - (v - amn) / (amx - amn) * (aBot - aTop);
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.strokeRect(x0, aTop, x1 - x0, aBot - aTop);
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillText("ACQUISITION (next sample = its argmax)", x0, aTop - 5);
    ctx.fillStyle = "rgba(192,132,252,0.2)"; ctx.strokeStyle = "#c084fc"; ctx.lineWidth = 1.8; ctx.beginPath();
    ctx.moveTo(mapX(grid[0]), aBot);
    grid.forEach((x, i) => ctx.lineTo(mapX(x), aY(acqv[i])));
    ctx.lineTo(mapX(grid[grid.length - 1]), aBot); ctx.closePath(); ctx.fill();
    ctx.beginPath(); grid.forEach((x, i) => { const px = mapX(x), py = aY(acqv[i]); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke();
    ctx.strokeStyle = "#fbbf24"; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(mapX(nx), aTop); ctx.lineTo(mapX(nx), aBot); ctx.stroke(); ctx.setLineDash([]);
  }

  function handleRun() { if (running) { setRunning(false); return; } setRunning(true); }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    resetRun(seed);
  }, []);

  _useEffect(() => {
    if (!running) return;
    let alive = true, last = 0;
    const loop = (ts) => {
      if (!alive) return;
      if (ts - last > 420) { stepOnce(); last = ts; if (obsRef.current.length >= 22) { setRunning(false); return; } }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, [running]);

  const obj = objRef.current;
  const gap = obj && isFinite(best) ? (obj.trueMax - best) : 0;
  const stage = (<canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />);

  const controls = (
    <ControlGroup>
      <SegmentedControl label="// ACQUISITION" tone="violet" value={acq} onChange={setAcq}
        options={[{ value: "ei", label: "Exp. Improve" }, { value: "ucb", label: "UCB" }, { value: "pi", label: "Prob. Improve" }]}
        help="The rule that scores where to sample next. Expected Improvement weighs how much AND how likely you beat the current best; UCB is mean + kappa*sigma (pure optimism); Probability of Improvement only asks if you'll beat it at all (greedier)." />
      <Slider label="// EXPLORATION" min={0} max={1} step={0.05} value={explore} onChange={setExplore} tone="violet"
        help="How much the acquisition favors uncertain regions. For UCB this is kappa (the sigma weight); for EI/PI it's the xi margin. Higher = explore the unknown more before exploiting the best-known peak." />
      <Slider label="// GP LENGTHSCALE" min={0.03} max={0.4} step={0.01} value={ell} onChange={setEll}
        help="Smoothness assumed by the surrogate. Short = wiggly, trusts data only nearby (wide uncertainty between points); long = smooth, generalizes far but can miss sharp peaks." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={handleRun} primary>{running ? "PAUSE" : "RUN"}</DemoButton>
        <DemoButton onClick={() => { stepOnce(); }} disabled={running}>EVALUATE NEXT</DemoButton>
        <DemoButton onClick={() => resetRun(seed)}>RESET</DemoButton>
        <DemoButton onClick={() => { const s = seed + 1; setSeed(s); resetRun(s); }}>NEW FUNCTION</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="EVALUATIONS" value={evals} />
        <StatReadout label="BEST FOUND" value={isFinite(best) ? best.toFixed(3) : "-"} accent="var(--violet-lt)" />
        <StatReadout label="TRUE MAX" value={obj ? obj.trueMax.toFixed(3) : "-"} accent="#34d399" />
        <StatReadout label="GAP TO MAX" value={gap.toFixed(3)} accent={gap < 0.02 ? "#34d399" : "#fbbf24"} />
      </div>
      <Legend items={[
        { color: "#94a3b8", label: "TRUE OBJECTIVE" },
        { color: "#60a5fa", label: "GP MEAN +/-2 sigma" },
        { color: "#c084fc", label: "ACQUISITION" },
        { color: "#fbbf24", label: "NEXT SAMPLE" },
      ]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        When each evaluation of <i>f</i> is expensive — a hyperparameter sweep, a lab experiment,
        a wet-chemistry assay — you can't grid-search. Bayesian optimization fits a cheap
        <a href={`${window.__DM_BASE || "../../"}visualize/gaussian-process/`}> Gaussian-process</a> surrogate
        to the points seen so far (blue mean + band), then a tiny inner optimization picks the next
        point by maximizing an <b>acquisition function</b> (violet) — not where the mean is highest,
        but where the expected <i>payoff</i> is, blending high predicted value with high uncertainty.
      </DemoP>
      <DemoP>
        Step through it: early on the band is wide and the acquisition sends probes into unexplored
        regions; as the GP learns the shape, sampling homes in on the true peak (green) and the
        <b> gap to max</b> collapses — usually in a dozen-ish evals, far fewer than blind search.
        Push <b>exploration</b> up and it surveys broadly before committing; down and it greedily
        exploits the current best, risking a local optimum. Different acquisitions encode different
        risk appetites for that same exploration/exploitation trade.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        This is how modern AutoML and hyperparameter tuners work under the hood — Optuna, Ax/BoTorch,
        Vizier, and SigOpt all run Bayesian optimization to choose learning rates, architectures, and
        regularization with a tiny budget of expensive training runs. The same loop drives experiment
        design in drug discovery, materials science, and A/B-test allocation. It is the continuous-space
        sibling of the <a href={`${window.__DM_BASE || "../../"}visualize/thompson-vs-ucb/`}>bandit</a>
        explore/exploit problem, with a GP standing in for the per-arm posteriors.
      </DemoP>
      <DemoP>
        The whole method lives or dies on <b>calibrated uncertainty</b>: the acquisition function only
        knows where to look because the GP honestly reports where it's unsure. That's the recurring
        Bayesian payoff — the same posterior <a href={`${window.__DM_BASE || "../../"}visualize/bayesian-linear-regression/`}>error
        bars</a> that quantify what you know also tell you what to do next. Its limits are the GP's:
        the cubic cost of the kernel inverse and a struggle in very high dimensions, where random or
        evolutionary search can catch up.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      title="Bayesian Optimization"
      subtitle="Find the max of an expensive function in a handful of evals - a GP surrogate plus an acquisition function that decides where to look next."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/foundations/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="violet"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<BayesianOptimizationDemo />);
