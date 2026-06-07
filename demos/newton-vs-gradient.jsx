// demos/newton-vs-gradient.jsx — first-order vs second-order optimization.
// Gradient descent (step = -eta*grad) raced against Newton's method
// (step = -H^-1 grad) from the same start, with the local quadratic model
// Newton jumps to the center of drawn as an ellipse. Real analytic gradients
// AND Hessians; exact 2x2 solve + eigendecomposition for the model ellipse.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, Toggle, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 380;

// Each surface exposes f, grad, hess (2x2 symmetric [[a,b],[b,c]]), a domain,
// a start point, and the stationary point Newton is solving toward.
const SURFACES = {
  illcond: {
    label: "Ill-conditioned",
    domain: { xmin: -3, xmax: 3, ymin: -3, ymax: 3 },
    start: { x: 2.7, y: 2.7 }, target: { x: 0, y: 0 }, targetKind: "min",
    cond: 18,
    f: (x, y) => 0.5 * (x * x + 18 * y * y),
    grad: (x, y) => [x, 18 * y],
    hess: () => [1, 0, 18],
  },
  rosenbrock: {
    label: "Rosenbrock",
    domain: { xmin: -2, xmax: 2, ymin: -1, ymax: 3 },
    start: { x: -1.5, y: 2.6 }, target: { x: 1, y: 1 }, targetKind: "min",
    f: (x, y) => (1 - x) ** 2 + 100 * (y - x * x) ** 2,
    grad: (x, y) => [-2 * (1 - x) - 400 * x * (y - x * x), 200 * (y - x * x)],
    hess: (x, y) => [2 - 400 * (y - x * x) + 800 * x * x, -400 * x, 200],
  },
  saddle: {
    label: "Saddle",
    domain: { xmin: -2.5, xmax: 2.5, ymin: -2.5, ymax: 2.5 },
    start: { x: -2, y: 0.22 }, target: { x: 0, y: 0 }, targetKind: "saddle",
    f: (x, y) => x * x - y * y,
    grad: (x, y) => [2 * x, -2 * y],
    hess: () => [2, 0, -2],
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

// Eigendecomposition of a symmetric 2x2 [[a,b],[b,c]]: returns {l1,l2,v1,v2}.
function eigSym(a, b, c) {
  const tr = a + c, disc = Math.sqrt(((a - c) / 2) ** 2 + b * b);
  const l1 = tr / 2 + disc, l2 = tr / 2 - disc;
  let v1;
  if (Math.abs(b) > 1e-9) v1 = [l1 - c, b];
  else v1 = a >= c ? [1, 0] : [0, 1];
  const n1 = Math.hypot(v1[0], v1[1]); v1 = [v1[0] / n1, v1[1] / n1];
  const v2 = [-v1[1], v1[0]];
  return { l1, l2, v1, v2 };
}

const C_GD = "#fbbf24", C_NEWTON = "#c084fc";

function NewtonVsGradientDemo() {
  const canvasRef = _useRef(null);
  const bgRef = _useRef(null);
  const gdRef = _useRef({ x: 0, y: 0 });
  const ntRef = _useRef({ x: 0, y: 0 });
  const gdPathRef = _useRef([]);
  const ntPathRef = _useRef([]);
  const rafRef = _useRef(null);
  const dprRef = _useRef(1);

  const [surf, setSurf] = _useState("illcond");
  const [lr, setLr] = _useState(0.09);
  const [damp, setDamp] = _useState(1);
  const [showModel, setShowModel] = _useState(true);
  const [speed, setSpeed] = _useState(1);
  const [running, setRunning] = _useState(false);
  const [gdSteps, setGdSteps] = _useState(0);
  const [ntSteps, setNtSteps] = _useState(0);
  const [gdLoss, setGdLoss] = _useState(0);
  const [ntLoss, setNtLoss] = _useState(0);
  const [status, setStatus] = _useState("IDLE");

  const surfRef = _useRef(surf), lrRef = _useRef(lr), dampRef = _useRef(damp), speedRef = _useRef(speed);
  const gdDoneRef = _useRef(false), ntDoneRef = _useRef(false);
  _useEffect(() => { lrRef.current = lr; }, [lr]);
  _useEffect(() => { dampRef.current = damp; }, [damp]);
  _useEffect(() => { speedRef.current = speed; }, [speed]);

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
    const CS = 6;
    const span = hi - lo || 1;
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
    gdRef.current = { ...S.start }; ntRef.current = { ...S.start };
    gdPathRef.current = [{ ...S.start }]; ntPathRef.current = [{ ...S.start }];
    gdDoneRef.current = false; ntDoneRef.current = false;
    setGdSteps(0); setNtSteps(0);
    setGdLoss(+S.f(S.start.x, S.start.y).toFixed(3));
    setNtLoss(+S.f(S.start.x, S.start.y).toFixed(3));
    setStatus("IDLE");
    draw();
  }

  // Newton target = p - H^-1 g (the minimum of the local quadratic model).
  function newtonTarget(S, p) {
    const [gx, gy] = S.grad(p.x, p.y);
    const [a, b, c] = S.hess(p.x, p.y);
    const det = a * c - b * b;
    if (Math.abs(det) < 1e-9) return null;
    // H^-1 g
    const ix = (c * gx - b * gy) / det;
    const iy = (-b * gx + a * gy) / det;
    return { tx: p.x - ix, ty: p.y - iy, gx, gy, a, b, c, det };
  }

  function stepOnce() {
    const S = SURFACES[surfRef.current], d = S.domain;
    // gradient descent
    if (!gdDoneRef.current) {
      const p = gdRef.current, a = lrRef.current;
      const [gx, gy] = S.grad(p.x, p.y);
      p.x = clamp(p.x - a * gx, d.xmin, d.xmax);
      p.y = clamp(p.y - a * gy, d.ymin, d.ymax);
      gdPathRef.current.push({ x: p.x, y: p.y });
      const L = S.f(p.x, p.y);
      setGdSteps(v => v + 1); setGdLoss(+L.toFixed(3));
      if (!isFinite(L) || L > 1e8) gdDoneRef.current = true;
      else if (Math.hypot(gx, gy) < 1e-3) gdDoneRef.current = true;
    }
    // Newton's method (damped)
    if (!ntDoneRef.current) {
      const p = ntRef.current, f = dampRef.current;
      const nt = newtonTarget(S, p);
      if (!nt) { ntDoneRef.current = true; }
      else {
        p.x = clamp(p.x + f * (nt.tx - p.x), d.xmin, d.xmax);
        p.y = clamp(p.y + f * (nt.ty - p.y), d.ymin, d.ymax);
        ntPathRef.current.push({ x: p.x, y: p.y });
        const L = S.f(p.x, p.y);
        setNtSteps(v => v + 1); setNtLoss(+L.toFixed(3));
        if (!isFinite(L) || L > 1e8) ntDoneRef.current = true;
        else if (Math.hypot(nt.gx, nt.gy) < 1e-4) ntDoneRef.current = true;
      }
    }
    if (gdDoneRef.current && ntDoneRef.current) {
      const ntAtSaddle = S.targetKind === "saddle";
      setStatus(ntAtSaddle ? "NEWTON -> SADDLE" : "CONVERGED");
      return true;
    }
    setStatus("OPTIMIZING");
    return false;
  }

  function drawPath(ctx, path, color) {
    if (path.length > 1) {
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.globalAlpha = 0.95;
      ctx.beginPath();
      path.forEach((q, i) => { const [px, py] = toPx(q.x, q.y); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
      ctx.stroke(); ctx.globalAlpha = 1;
    }
    // step dots
    ctx.fillStyle = color;
    path.forEach(q => { const [px, py] = toPx(q.x, q.y); ctx.beginPath(); ctx.arc(px, py, 2.4, 0, Math.PI * 2); ctx.fill(); });
  }

  function drawModelEllipse(ctx) {
    const S = SURFACES[surfRef.current], p = ntRef.current;
    const nt = newtonTarget(S, p);
    if (!nt) return;
    const { l1, l2, v1, v2 } = eigSym(nt.a, nt.b, nt.c);
    if (l1 <= 1e-6 || l2 <= 1e-6) return; // only when model bowl is convex (PD Hessian)
    // ellipse through current point p: 0.5 (p-center)^T H (p-center) = k
    const wx = p.x - nt.tx, wy = p.y - nt.ty;
    // (p-center)^T H (p-center)
    const quad = nt.a * wx * wx + 2 * nt.b * wx * wy + nt.c * wy * wy;
    const k = 0.5 * quad;
    if (k <= 1e-9) return;
    const r1 = Math.sqrt(2 * k / l1), r2 = Math.sqrt(2 * k / l2);
    ctx.strokeStyle = "rgba(192,132,252,0.55)"; ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 4]); ctx.beginPath();
    for (let i = 0; i <= 64; i++) {
      const th = (i / 64) * Math.PI * 2;
      const dx = r1 * Math.cos(th) * v1[0] + r2 * Math.sin(th) * v2[0];
      const dy = r1 * Math.cos(th) * v1[1] + r2 * Math.sin(th) * v2[1];
      const [px, py] = toPx(nt.tx + dx, nt.ty + dy);
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
    // the model's minimum (where Newton wants to jump)
    const [cx, cy] = toPx(nt.tx, nt.ty);
    ctx.strokeStyle = "rgba(192,132,252,0.9)"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(cx - 5, cy); ctx.lineTo(cx + 5, cy); ctx.moveTo(cx, cy - 5); ctx.lineTo(cx, cy + 5); ctx.stroke();
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (bgRef.current) ctx.drawImage(bgRef.current, 0, 0, W, H);

    const S = SURFACES[surfRef.current];
    // target / stationary point marker
    const [tx, ty] = toPx(S.target.x, S.target.y);
    ctx.strokeStyle = S.targetKind === "saddle" ? "#f87171" : "#34d399";
    ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(tx, ty, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tx - 10, ty); ctx.lineTo(tx + 10, ty); ctx.moveTo(tx, ty - 10); ctx.lineTo(tx, ty + 10); ctx.stroke();

    if (showModel && !ntDoneRef.current) drawModelEllipse(ctx);

    drawPath(ctx, gdPathRef.current, C_GD);
    drawPath(ctx, ntPathRef.current, C_NEWTON);

    // start point
    const sp = gdPathRef.current[0];
    if (sp) { const [px, py] = toPx(sp.x, sp.y); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI * 2); ctx.fill(); }
    // current heads
    const drawHead = (p, color) => { const [px, py] = toPx(p.x, p.y); ctx.fillStyle = "#0a0e1a"; ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); };
    drawHead(gdRef.current, C_GD);
    drawHead(ntRef.current, C_NEWTON);
  }

  function onDown(e) {
    setRunning(false);
    const rect = canvasRef.current.getBoundingClientRect();
    const [x, y] = toParam((e.clientX - rect.left) / (rect.width / W), (e.clientY - rect.top) / (rect.height / H));
    const S = SURFACES[surfRef.current];
    gdRef.current = { x, y }; ntRef.current = { x, y };
    gdPathRef.current = [{ x, y }]; ntPathRef.current = [{ x, y }];
    gdDoneRef.current = false; ntDoneRef.current = false;
    setGdSteps(0); setNtSteps(0);
    setGdLoss(+S.f(x, y).toFixed(3)); setNtLoss(+S.f(x, y).toFixed(3));
    setStatus("IDLE"); draw();
  }

  function handleRun() {
    if (running) { setRunning(false); return; }
    if (gdDoneRef.current && ntDoneRef.current) resetRun();
    setRunning(true);
  }
  function handleStep() { if (running) return; stepOnce(); draw(); }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    buildBg(); resetRun();
  }, []);

  _useEffect(() => { surfRef.current = surf; buildBg(); resetRun(); }, [surf]);
  _useEffect(() => { draw(); }, [showModel]);

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

  const stage = (
    <canvas ref={canvasRef} onPointerDown={onDown}
      style={{ touchAction: "none", cursor: "crosshair", maxWidth: "100%", borderRadius: 4 }} />
  );

  const controls = (
    <ControlGroup>
      <SegmentedControl label="// SURFACE" value={surf} onChange={v => { setRunning(false); setSurf(v); }}
        options={Object.entries(SURFACES).map(([k, v]) => ({ value: k, label: v.label }))}
        help="The function both methods minimize. Ill-conditioned = a stretched bowl (curvature 18x sharper one way). Rosenbrock = a curved banana valley. Saddle = a stationary point that is a minimum one way and a maximum the other." />
      <Slider label="// GD LEARNING RATE" min={0.005} max={0.12} step={0.005} value={lr} onChange={setLr}
        help="Step size for gradient descent (gold). It has no curvature information, so on an ill-conditioned surface it must stay small enough for the sharp direction and then crawls along the flat one." />
      <Slider label="// NEWTON DAMPING" min={0.1} max={1} step={0.05} value={damp} onChange={setDamp}
        help="Fraction of the full Newton step taken (violet). 1.0 = jump straight to the minimum of the local quadratic model. Less than 1 is safer when that quadratic is only locally accurate, as on Rosenbrock." />
      <Toggle label="// SHOW QUADRATIC MODEL" checked={showModel} onChange={setShowModel}
        help="Draw the local second-order Taylor model Newton builds at its current point as a dashed ellipse. Newton jumps to that ellipse's center (the small cross)." />
      <Slider label="// SPEED" min={1} max={12} value={speed} onChange={setSpeed} suffix=" /frame"
        help="Optimizer steps per animation frame. Visual pacing only; it does not change the math." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={handleRun} primary>{running ? "PAUSE" : "RUN"}</DemoButton>
        <DemoButton onClick={handleStep} disabled={running}>STEP</DemoButton>
        <DemoButton onClick={resetRun}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="GD STEPS" value={gdSteps} accent={C_GD} />
        <StatReadout label="GD LOSS" value={gdLoss} accent={C_GD} />
        <StatReadout label="NEWTON STEPS" value={ntSteps} accent={C_NEWTON} />
        <StatReadout label="NEWTON LOSS" value={ntLoss} accent={C_NEWTON} />
      </div>
      <StatReadout label="STATUS" value={status}
        accent={status === "CONVERGED" ? "#34d399" : status.indexOf("SADDLE") >= 0 ? "#f87171" : "var(--blue-lt)"} />
      <Legend items={[
        { color: C_GD, label: "GRADIENT DESCENT" },
        { color: C_NEWTON, label: "NEWTON" },
        { color: "#34d399", label: "TRUE MIN", border: "1px solid #34d399" },
        { color: "#a855f7", label: "HIGH LOSS" },
      ]} />
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>Tip: click the surface to drop a new shared start point.</div>
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Both points start together and minimize the same surface. <b style={{ color: C_GD }}>Gradient
        descent</b> only knows the slope, so it takes a fixed step downhill. <b style={{ color: C_NEWTON }}>Newton's
        method</b> also uses the <i>curvature</i> — the Hessian — to build a local quadratic
        model of the surface (the dashed ellipse) and jumps straight to that model's
        minimum (the small cross).
      </DemoP>
      <DemoP>
        On the <b>Ill-conditioned</b> bowl the lesson is stark: gradient descent zig-zags
        across the steep direction and crawls along the flat one, while Newton lands on the
        true minimum in a <b>single step</b> — curvature cancels the conditioning. On
        <b> Rosenbrock</b>, the quadratic model is only locally valid, so full Newton can
        overshoot; lower the damping and it still beats GD by a wide margin. On the
        <b> Saddle</b>, watch the catch: Newton solves "gradient = 0", so it is pulled
        straight <span style={{ color: "#f87171" }}>onto the saddle</span> — a stationary
        point that is <i>not</i> a minimum — while gradient descent slides off and escapes.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Second-order information is the difference between the optimizers you use by hand
        and the ones that scale. Pure Newton needs the full Hessian (O(n²) memory) and its
        inverse (O(n³)) — impossible for a model with billions of parameters — which is why
        deep learning runs on first-order methods like <a href={`${window.__DM_BASE || "../../"}visualize/gradient-descent/`}>SGD and Adam</a> instead.
        The practical middle ground is <b>quasi-Newton</b> (L-BFGS) and <b>natural-gradient</b>
        methods, which approximate the curvature cheaply; Adam's per-parameter scaling is
        itself a crude diagonal-curvature estimate.
      </DemoP>
      <DemoP>
        The saddle case is not a toy curiosity. In high dimensions the stationary points of
        a deep network's loss are <i>overwhelmingly</i> saddles, not local minima — so an
        optimizer that naively chases "gradient = 0" gets stuck. Understanding that Newton
        finds stationary points (and why you damp it, or modify the Hessian to stay
        positive-definite, as trust-region and Levenberg–Marquardt methods do) is the bridge
        from textbook optimization to why training large models is its own engineering problem.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      topic="OPTIMIZATION"
      title="Newton vs Gradient Descent"
      subtitle="Race a first-order step against a second-order one that uses curvature to jump to the minimum."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/foundations/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="blue"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<NewtonVsGradientDemo />);
