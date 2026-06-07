// demos/l-bfgs.jsx — limited-memory quasi-Newton (L-BFGS) vs steepest descent.
// Real L-BFGS: the two-loop recursion reconstructs a Newton-like search
// direction from the last m gradient-difference pairs (s_k, y_k) WITHOUT ever
// forming a Hessian, plus a backtracking (Armijo) line search. Raced against
// steepest descent with the same line search, so only the DIRECTION differs.
// All exact analytic gradients.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, Toggle, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 380;

// rotated ill-conditioned quadratic helper
function quadA(l1, l2, thetaDeg) {
  const t = (thetaDeg * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t);
  return { a11: l1 * c * c + l2 * s * s, a22: l1 * s * s + l2 * c * c, a12: (l1 - l2) * c * s };
}
const QA = quadA(1, 20, 35);

const SURFACES = {
  rosenbrock: {
    label: "Rosenbrock", domain: { xmin: -2, xmax: 2, ymin: -1, ymax: 3 },
    start: { x: -1.5, y: 2.6 }, min: { x: 1, y: 1 },
    f: (x, y) => (1 - x) ** 2 + 100 * (y - x * x) ** 2,
    grad: (x, y) => [-2 * (1 - x) - 400 * x * (y - x * x), 200 * (y - x * x)],
  },
  illcond: {
    label: "Ill-conditioned", domain: { xmin: -3, xmax: 3, ymin: -3, ymax: 3 },
    start: { x: 2.7, y: 2.7 }, min: { x: 0, y: 0 },
    f: (x, y) => 0.5 * (x * x + 20 * y * y),
    grad: (x, y) => [x, 20 * y],
  },
  rotated: {
    label: "Correlated", domain: { xmin: -3, xmax: 3, ymin: -3, ymax: 3 },
    start: { x: 2.7, y: 2.7 }, min: { x: 0, y: 0 },
    f: (x, y) => 0.5 * (QA.a11 * x * x + 2 * QA.a12 * x * y + QA.a22 * y * y),
    grad: (x, y) => [QA.a11 * x + QA.a12 * y, QA.a12 * x + QA.a22 * y],
  },
};

const RAMP = [
  { t: 0, c: [8, 14, 30] }, { t: 0.4, c: [30, 58, 138] },
  { t: 0.72, c: [59, 130, 246] }, { t: 1, c: [168, 85, 247] },
];
function rampColor(t) {
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < RAMP.length; i++) {
    if (t <= RAMP[i].t) {
      const a = RAMP[i - 1], b = RAMP[i], f = (t - a.t) / (b.t - a.t);
      const m = j => Math.round(a.c[j] + (b.c[j] - a.c[j]) * f);
      return `rgb(${m(0)},${m(1)},${m(2)})`;
    }
  }
  return "rgb(168,85,247)";
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const C_LB = "#c084fc", C_GD = "#fbbf24";

function LBFGSDemo() {
  const canvasRef = _useRef(null);
  const bgRef = _useRef(null);
  const lbRef = _useRef({ x: 0, y: 0 });
  const gdRef = _useRef({ x: 0, y: 0 });
  const lbPathRef = _useRef([]);
  const gdPathRef = _useRef([]);
  const histRef = _useRef([]); // L-BFGS memory: {s:[2], y:[2], rho}
  const rafRef = _useRef(null);
  const dprRef = _useRef(1);

  const [surf, setSurf] = _useState("rosenbrock");
  const [mem, setMem] = _useState(5);
  const [showGd, setShowGd] = _useState(true);
  const [speed, setSpeed] = _useState(1);
  const [running, setRunning] = _useState(false);
  const [lbSteps, setLbSteps] = _useState(0);
  const [lbLoss, setLbLoss] = _useState(0);
  const [gdLoss, setGdLoss] = _useState(0);
  const [pairs, setPairs] = _useState(0);
  const [status, setStatus] = _useState("IDLE");

  const surfRef = _useRef(surf), memRef = _useRef(mem), speedRef = _useRef(speed), showGdRef = _useRef(showGd);
  const lbDoneRef = _useRef(false), gdDoneRef = _useRef(false);
  _useEffect(() => { memRef.current = mem; }, [mem]);
  _useEffect(() => { speedRef.current = speed; }, [speed]);
  _useEffect(() => { showGdRef.current = showGd; draw(); }, [showGd]);

  function toPx(x, y) {
    const d = SURFACES[surfRef.current].domain;
    return [(x - d.xmin) / (d.xmax - d.xmin) * W, (1 - (y - d.ymin) / (d.ymax - d.ymin)) * H];
  }
  function toParam(px, py) {
    const d = SURFACES[surfRef.current].domain;
    return [d.xmin + px / W * (d.xmax - d.xmin), d.ymin + (1 - py / H) * (d.ymax - d.ymin)];
  }

  function buildBg() {
    const S = SURFACES[surf], d = S.domain;
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i <= 80; i++) for (let j = 0; j <= 56; j++) {
      const x = d.xmin + (i / 80) * (d.xmax - d.xmin), y = d.ymin + (j / 56) * (d.ymax - d.ymin);
      const v = S.f(x, y); lo = Math.min(lo, v); hi = Math.max(hi, v);
    }
    const dpr = dprRef.current;
    const bg = document.createElement("canvas");
    bg.width = W * dpr; bg.height = H * dpr;
    const ctx = bg.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const CS = 6, span = hi - lo || 1;
    const norm = v => Math.log(1 + (v - lo)) / Math.log(1 + span);
    for (let px = 0; px < W; px += CS) for (let py = 0; py < H; py += CS) {
      const [x, y] = toParam(px + CS / 2, py + CS / 2);
      ctx.fillStyle = rampColor(norm(S.f(x, y)));
      ctx.fillRect(px, py, CS, CS);
    }
    bgRef.current = bg;
  }

  function resetRun() {
    const S = SURFACES[surfRef.current];
    lbRef.current = { ...S.start }; gdRef.current = { ...S.start };
    lbPathRef.current = [{ ...S.start }]; gdPathRef.current = [{ ...S.start }];
    histRef.current = []; lbDoneRef.current = false; gdDoneRef.current = false;
    const L0 = S.f(S.start.x, S.start.y);
    setLbSteps(0); setLbLoss(+L0.toFixed(4)); setGdLoss(+L0.toFixed(4)); setPairs(0); setStatus("IDLE");
    draw();
  }

  // L-BFGS two-loop recursion: returns the search direction d = -H_k grad.
  function lbfgsDirection(g, hist) {
    if (hist.length === 0) return [-g[0], -g[1]];
    const q = [g[0], g[1]], alpha = new Array(hist.length);
    for (let i = hist.length - 1; i >= 0; i--) {
      const h = hist[i]; const a = h.rho * dot(h.s, q); alpha[i] = a;
      q[0] -= a * h.y[0]; q[1] -= a * h.y[1];
    }
    const last = hist[hist.length - 1];
    const gamma = dot(last.s, last.y) / dot(last.y, last.y);
    const r = [gamma * q[0], gamma * q[1]];
    for (let i = 0; i < hist.length; i++) {
      const h = hist[i]; const b = h.rho * dot(h.y, r);
      r[0] += h.s[0] * (alpha[i] - b); r[1] += h.s[1] * (alpha[i] - b);
    }
    return [-r[0], -r[1]];
  }

  // backtracking (Armijo) line search along direction d
  function lineSearch(S, p, d, g) {
    const c1 = 1e-4, gd = dot(g, d), fx = S.f(p.x, p.y);
    let t = 1;
    for (let k = 0; k < 30; k++) {
      const nx = p.x + t * d[0], ny = p.y + t * d[1];
      if (S.f(nx, ny) <= fx + c1 * t * gd) return t;
      t *= 0.5;
    }
    return t;
  }

  function stepOnce() {
    const S = SURFACES[surfRef.current], d = S.domain;
    // L-BFGS
    if (!lbDoneRef.current) {
      const p = lbRef.current;
      const g = S.grad(p.x, p.y);
      const dir = lbfgsDirection(g, histRef.current);
      const t = lineSearch(S, p, dir, g);
      const nx = clamp(p.x + t * dir[0], d.xmin, d.xmax), ny = clamp(p.y + t * dir[1], d.ymin, d.ymax);
      const gNew = S.grad(nx, ny);
      const s = [nx - p.x, ny - p.y], y = [gNew[0] - g[0], gNew[1] - g[1]];
      const ys = dot(y, s);
      if (ys > 1e-10) { histRef.current.push({ s, y, rho: 1 / ys }); while (histRef.current.length > memRef.current) histRef.current.shift(); }
      p.x = nx; p.y = ny;
      lbPathRef.current.push({ x: nx, y: ny });
      setLbSteps(v => v + 1); setLbLoss(+S.f(nx, ny).toFixed(4)); setPairs(histRef.current.length);
      if (Math.hypot(gNew[0], gNew[1]) < 1e-3) lbDoneRef.current = true;
    }
    // steepest descent overlay (same line search)
    if (showGdRef.current && !gdDoneRef.current) {
      const p = gdRef.current;
      const g = S.grad(p.x, p.y), dir = [-g[0], -g[1]];
      const t = lineSearch(S, p, dir, g);
      p.x = clamp(p.x + t * dir[0], d.xmin, d.xmax); p.y = clamp(p.y + t * dir[1], d.ymin, d.ymax);
      gdPathRef.current.push({ x: p.x, y: p.y });
      setGdLoss(+S.f(p.x, p.y).toFixed(4));
      if (Math.hypot(g[0], g[1]) < 1e-3) gdDoneRef.current = true;
    }
    if (lbDoneRef.current && (!showGdRef.current || gdDoneRef.current)) { setStatus("CONVERGED"); return true; }
    setStatus("OPTIMIZING");
    return false;
  }

  function drawPath(ctx, path, color, w) {
    if (path.length > 1) {
      ctx.strokeStyle = color; ctx.lineWidth = w; ctx.globalAlpha = 0.95;
      ctx.beginPath();
      path.forEach((q, i) => { const [px, py] = toPx(q.x, q.y); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
      ctx.stroke(); ctx.globalAlpha = 1;
    }
    ctx.fillStyle = color;
    path.forEach(q => { const [px, py] = toPx(q.x, q.y); ctx.beginPath(); ctx.arc(px, py, 2.3, 0, Math.PI * 2); ctx.fill(); });
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (bgRef.current) ctx.drawImage(bgRef.current, 0, 0, W, H);
    const S = SURFACES[surfRef.current];
    const [mx, my] = toPx(S.min.x, S.min.y);
    ctx.strokeStyle = "#34d399"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(mx, my, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mx - 10, my); ctx.lineTo(mx + 10, my); ctx.moveTo(mx, my - 10); ctx.lineTo(mx, my + 10); ctx.stroke();

    if (showGdRef.current) drawPath(ctx, gdPathRef.current, C_GD, 1.6);
    drawPath(ctx, lbPathRef.current, C_LB, 2);

    const sp = lbPathRef.current[0];
    if (sp) { const [px, py] = toPx(sp.x, sp.y); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI * 2); ctx.fill(); }
    const head = (p, color) => { const [px, py] = toPx(p.x, p.y); ctx.fillStyle = "#0a0e1a"; ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); };
    if (showGdRef.current) head(gdRef.current, C_GD);
    head(lbRef.current, C_LB);
  }

  function handleRun() { if (running) { setRunning(false); return; } if (lbDoneRef.current && (!showGdRef.current || gdDoneRef.current)) resetRun(); setRunning(true); }
  function handleStep() { if (running) return; stepOnce(); draw(); }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    buildBg(); resetRun();
  }, []);
  _useEffect(() => { surfRef.current = surf; setRunning(false); buildBg(); resetRun(); }, [surf]);
  _useEffect(() => { setRunning(false); resetRun(); }, [mem]);

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

  const stage = (<canvas ref={canvasRef} style={{ touchAction: "none", maxWidth: "100%", borderRadius: 4 }} />);

  const controls = (
    <ControlGroup>
      <SegmentedControl label="// SURFACE" value={surf} onChange={v => { setRunning(false); setSurf(v); }}
        options={Object.entries(SURFACES).map(([k, v]) => ({ value: k, label: v.label }))}
        help="The function to minimize. Rosenbrock = a curved banana valley. Ill-conditioned = an axis-aligned stretched bowl. Correlated = the same bowl rotated, so the variables are coupled." />
      <Slider label="// MEMORY m" min={1} max={10} step={1} value={mem} onChange={setMem} tone="violet"
        help="How many recent (gradient-difference) pairs L-BFGS keeps to approximate curvature. m=1 is barely better than steepest descent; larger m approaches full BFGS / Newton, at the cost of memory." />
      <Toggle label="// SHOW STEEPEST DESCENT" checked={showGd} onChange={setShowGd} tone="violet"
        help="Overlay plain steepest descent (gold) using the SAME backtracking line search, so the only difference is the search direction L-BFGS computes from its curvature memory." />
      <Slider label="// SPEED" min={1} max={10} value={speed} onChange={setSpeed} suffix=" /frame"
        help="Optimizer iterations per animation frame. Visual pacing only." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={handleRun} primary>{running ? "PAUSE" : "RUN"}</DemoButton>
        <DemoButton onClick={handleStep} disabled={running}>STEP</DemoButton>
        <DemoButton onClick={resetRun}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="L-BFGS STEPS" value={lbSteps} accent={C_LB} />
        <StatReadout label="L-BFGS LOSS" value={lbLoss} accent={C_LB} />
        <StatReadout label="PAIRS STORED" value={`${pairs} / ${mem}`} accent={C_LB} />
        {showGd && <StatReadout label="STEEPEST LOSS" value={gdLoss} accent={C_GD} />}
      </div>
      <StatReadout label="STATUS" value={status} accent={status === "CONVERGED" ? "#34d399" : "var(--blue-lt)"} />
      <Legend items={[
        { color: C_LB, label: "L-BFGS" },
        { color: C_GD, label: "STEEPEST DESCENT" },
        { color: "#34d399", label: "MINIMUM", border: "1px solid #34d399" },
      ]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        L-BFGS gets near-<a href={`${window.__DM_BASE || "../../"}visualize/newton-vs-gradient/`}>Newton</a> convergence
        without ever forming a Hessian. Each step it reconstructs a curvature-aware search
        direction from just the last <b>m</b> pairs of (how the point moved, how the gradient
        changed) using the famous <b>two-loop recursion</b>, then takes a backtracking line
        search along it. Steepest descent (gold) uses the exact same line search — the only
        difference you see is the <i>direction</i>.
      </DemoP>
      <DemoP>
        On <b>Rosenbrock</b>, steepest descent gets trapped oscillating across the banana
        valley while L-BFGS quickly learns the valley's shape and curves down it. Drop the
        memory to <b>m = 1</b> and L-BFGS degrades toward steepest descent; raise it and it
        sharpens toward full Newton. On the <b>Correlated</b> surface, notice L-BFGS handles
        the coupling that crippled <a href={`${window.__DM_BASE || "../../"}visualize/coordinate-descent/`}>coordinate descent</a> —
        it works in the full space, not one axis at a time.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        L-BFGS is the default optimizer for <b>smooth, deterministic</b> problems with up to
        millions of parameters: logistic regression, CRFs, full-batch fine-tuning, and the
        inner loop of many scientific-computing and classical-ML solvers (it is what
        <code> scipy.optimize.minimize</code> reaches for). Its trick — approximating the
        inverse Hessian with O(m·n) memory instead of O(n²) — is the practical answer to the
        scaling wall that stops pure <a href={`${window.__DM_BASE || "../../"}visualize/newton-vs-gradient/`}>Newton's method</a>.
      </DemoP>
      <DemoP>
        Why isn't it the default for deep learning? Because it assumes a <i>consistent</i>
        gradient, and mini-batch <a href={`${window.__DM_BASE || "../../"}visualize/gradient-descent/`}>SGD</a> gradients
        are noisy — the (s, y) curvature pairs become unreliable, and the line search needs
        full-batch evaluations that are too expensive. That trade-off (cheap noisy first-order
        steps vs expensive accurate curvature) is exactly why large models train with Adam, not
        L-BFGS, and it's a clean illustration of how the <i>data regime</i> picks the optimizer.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      topic="OPTIMIZATION"
      title="L-BFGS (Quasi-Newton)"
      subtitle="Approximate curvature from a short memory of past gradients - Newton-like convergence with no Hessian."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/foundations/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="violet"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<LBFGSDemo />);
