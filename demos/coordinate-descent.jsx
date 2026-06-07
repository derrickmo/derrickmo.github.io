// demos/coordinate-descent.jsx — minimize one coordinate at a time.
// Exact cyclic/random coordinate descent on a rotatable, ill-conditioned 2D
// quadratic, with an optional gradient-descent overlay. The teaching point:
// coordinate descent makes axis-aligned moves, so it is fast when the surface's
// principal axes align with the coordinate axes and crawls (a long staircase)
// when the coordinates are correlated (the quadratic is rotated). Real exact
// line minimizations; analytic gradient for the GD overlay.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, Toggle, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 380;
const DOM = { xmin: -3, xmax: 3, ymin: -3, ymax: 3 };
const START = { x: 2.6, y: 2.6 };

// A(lambda1, lambda2, theta): SPD quadratic 0.5 z^T A z, rotated by theta.
function buildA(l1, l2, thetaDeg) {
  const t = (thetaDeg * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t);
  return {
    a11: l1 * c * c + l2 * s * s,
    a22: l1 * s * s + l2 * c * c,
    a12: (l1 - l2) * c * s,
  };
}
const fOf = (A, x, y) => 0.5 * (A.a11 * x * x + 2 * A.a12 * x * y + A.a22 * y * y);
const gradOf = (A, x, y) => [A.a11 * x + A.a12 * y, A.a12 * x + A.a22 * y];

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
const C_CD = "#c084fc", C_GD = "#fbbf24";

function CoordinateDescentDemo() {
  const canvasRef = _useRef(null);
  const bgRef = _useRef(null);
  const cdRef = _useRef({ ...START });
  const gdRef = _useRef({ ...START });
  const cdPathRef = _useRef([{ ...START }]);
  const gdPathRef = _useRef([{ ...START }]);
  const axisRef = _useRef(0); // which coordinate CD updates next (0=x,1=y)
  const rafRef = _useRef(null);
  const dprRef = _useRef(1);

  const [cond, setCond] = _useState(12);
  const [theta, setTheta] = _useState(35);
  const [sweep, setSweep] = _useState("cyclic");
  const [showGd, setShowGd] = _useState(true);
  const [speed, setSpeed] = _useState(1);
  const [running, setRunning] = _useState(false);
  const [cdSteps, setCdSteps] = _useState(0);
  const [cdLoss, setCdLoss] = _useState(0);
  const [gdLoss, setGdLoss] = _useState(0);
  const [status, setStatus] = _useState("IDLE");

  const condRef = _useRef(cond), thetaRef = _useRef(theta), sweepRef = _useRef(sweep), speedRef = _useRef(speed), showGdRef = _useRef(showGd);
  const cdDoneRef = _useRef(false), gdDoneRef = _useRef(false);
  _useEffect(() => { sweepRef.current = sweep; }, [sweep]);
  _useEffect(() => { speedRef.current = speed; }, [speed]);
  _useEffect(() => { showGdRef.current = showGd; draw(); }, [showGd]);

  function A() { return buildA(condRef.current, 1, thetaRef.current); }

  function toPx(x, y) {
    return [(x - DOM.xmin) / (DOM.xmax - DOM.xmin) * W, (1 - (y - DOM.ymin) / (DOM.ymax - DOM.ymin)) * H];
  }
  function toParam(px, py) {
    return [DOM.xmin + px / W * (DOM.xmax - DOM.xmin), DOM.ymin + (1 - py / H) * (DOM.ymax - DOM.ymin)];
  }

  function buildBg() {
    const Amat = buildA(cond, 1, theta);
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i <= 80; i++) for (let j = 0; j <= 56; j++) {
      const x = DOM.xmin + (i / 80) * (DOM.xmax - DOM.xmin), y = DOM.ymin + (j / 56) * (DOM.ymax - DOM.ymin);
      const v = fOf(Amat, x, y); lo = Math.min(lo, v); hi = Math.max(hi, v);
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
      ctx.fillStyle = rampColor(norm(fOf(Amat, x, y)));
      ctx.fillRect(px, py, CS, CS);
    }
    bgRef.current = bg;
  }

  function resetRun() {
    cdRef.current = { ...START }; gdRef.current = { ...START };
    cdPathRef.current = [{ ...START }]; gdPathRef.current = [{ ...START }];
    axisRef.current = 0; cdDoneRef.current = false; gdDoneRef.current = false;
    const L0 = fOf(A(), START.x, START.y);
    setCdSteps(0); setCdLoss(+L0.toFixed(4)); setGdLoss(+L0.toFixed(4)); setStatus("IDLE");
    draw();
  }

  function stepOnce() {
    const Amat = A();
    // coordinate descent: exact minimization along the chosen axis
    if (!cdDoneRef.current) {
      const p = cdRef.current;
      let axis = axisRef.current;
      if (sweepRef.current === "random") axis = Math.random() < 0.5 ? 0 : 1;
      if (axis === 0) p.x = clamp(-(Amat.a12 * p.y) / Amat.a11, DOM.xmin, DOM.xmax);
      else p.y = clamp(-(Amat.a12 * p.x) / Amat.a22, DOM.ymin, DOM.ymax);
      axisRef.current = 1 - axisRef.current;
      cdPathRef.current.push({ x: p.x, y: p.y });
      const L = fOf(Amat, p.x, p.y);
      setCdSteps(v => v + 1); setCdLoss(+L.toFixed(4));
      if (L < 1e-6) cdDoneRef.current = true;
    }
    // gradient-descent overlay: stable step lr = 0.9/lambda_max
    if (showGdRef.current && !gdDoneRef.current) {
      const p = gdRef.current, lr = 0.9 / Math.max(condRef.current, 1);
      const [gx, gy] = gradOf(Amat, p.x, p.y);
      p.x = clamp(p.x - lr * gx, DOM.xmin, DOM.xmax);
      p.y = clamp(p.y - lr * gy, DOM.ymin, DOM.ymax);
      gdPathRef.current.push({ x: p.x, y: p.y });
      const L = fOf(Amat, p.x, p.y);
      setGdLoss(+L.toFixed(4));
      if (Math.hypot(gx, gy) < 1e-3) gdDoneRef.current = true;
    }
    if (cdDoneRef.current && (!showGdRef.current || gdDoneRef.current)) { setStatus("CONVERGED"); return true; }
    setStatus("DESCENDING");
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
    path.forEach(q => { const [px, py] = toPx(q.x, q.y); ctx.beginPath(); ctx.arc(px, py, 2.2, 0, Math.PI * 2); ctx.fill(); });
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (bgRef.current) ctx.drawImage(bgRef.current, 0, 0, W, H);
    // minimum at origin
    const [ox, oy] = toPx(0, 0);
    ctx.strokeStyle = "#34d399"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ox, oy, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox - 10, oy); ctx.lineTo(ox + 10, oy); ctx.moveTo(ox, oy - 10); ctx.lineTo(ox, oy + 10); ctx.stroke();

    if (showGdRef.current) drawPath(ctx, gdPathRef.current, C_GD, 1.6);
    drawPath(ctx, cdPathRef.current, C_CD, 2);

    const sp = cdPathRef.current[0];
    if (sp) { const [px, py] = toPx(sp.x, sp.y); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI * 2); ctx.fill(); }
    const head = (p, color) => { const [px, py] = toPx(p.x, p.y); ctx.fillStyle = "#0a0e1a"; ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); };
    if (showGdRef.current) head(gdRef.current, C_GD);
    head(cdRef.current, C_CD);
  }

  function handleRun() { if (running) { setRunning(false); return; } if (cdDoneRef.current && (!showGdRef.current || gdDoneRef.current)) resetRun(); setRunning(true); }
  function handleStep() { if (running) return; stepOnce(); draw(); }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    buildBg(); resetRun();
  }, []);

  _useEffect(() => { condRef.current = cond; thetaRef.current = theta; setRunning(false); buildBg(); resetRun(); }, [cond, theta]);

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
      <Slider label="// CONDITIONING" min={1} max={30} step={1} value={cond} onChange={setCond} tone="violet"
        help="Ratio of the surface's two curvatures (the condition number). 1 = a round bowl; high = a stretched ravine. Coordinate descent and gradient descent both slow down as this grows." />
      <Slider label="// ROTATION" min={0} max={90} step={1} value={theta} onChange={setTheta} suffix={"°"} tone="violet"
        help="Rotates the ravine relative to the x/y axes. At 0 the principal axes line up with the coordinates, so coordinate descent finishes in two exact moves. Near 45 the coordinates become strongly correlated and it crawls in a long staircase." />
      <SegmentedControl label="// SWEEP ORDER" value={sweep} onChange={v => { setSweep(v); }}
        options={[{ value: "cyclic", label: "Cyclic" }, { value: "random", label: "Random" }]}
        help="How the next coordinate is chosen each step: cyclic alternates x, y, x, y; random picks one at random (closer to how large-scale coordinate-descent solvers actually run)." />
      <Toggle label="// SHOW GRADIENT DESCENT" checked={showGd} onChange={setShowGd} tone="violet"
        help="Overlay a gradient-descent run (gold) at the largest stable step. GD moves diagonally along the true downhill direction; coordinate descent is locked to axis-aligned moves." />
      <Slider label="// SPEED" min={1} max={12} value={speed} onChange={setSpeed} suffix=" /frame"
        help="Coordinate updates per animation frame. Visual pacing only." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={handleRun} primary>{running ? "PAUSE" : "RUN"}</DemoButton>
        <DemoButton onClick={handleStep} disabled={running}>STEP</DemoButton>
        <DemoButton onClick={resetRun}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="CD UPDATES" value={cdSteps} accent={C_CD} />
        <StatReadout label="CD LOSS" value={cdLoss} accent={C_CD} />
      </div>
      {showGd && <StatReadout label="GD LOSS (same step count)" value={gdLoss} accent={C_GD} />}
      <StatReadout label="STATUS" value={status} accent={status === "CONVERGED" ? "#34d399" : "var(--blue-lt)"} />
      <Legend items={[
        { color: C_CD, label: "COORDINATE DESCENT" },
        { color: C_GD, label: "GRADIENT DESCENT" },
        { color: "#34d399", label: "MINIMUM", border: "1px solid #34d399" },
      ]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Coordinate descent minimizes one variable at a time, holding the rest
        fixed — so every move is <b>axis-aligned</b> (purely horizontal, then purely
        vertical). Here each step is an <i>exact</i> line minimization: it jumps to the
        lowest point of the surface along the current axis. With the ravine aligned to
        the axes (<b>rotation 0</b>), two moves are enough. Rotate it toward 45° and the
        coordinates become correlated — now no single axis move makes much progress, and
        the path turns into a long <b>staircase</b>.
      </DemoP>
      <DemoP>
        Turn on the gradient-descent overlay to see the contrast: GD steps along the true
        downhill direction (diagonally), so it isn't confused by rotation, but it has its
        own trouble with conditioning — it zig-zags across a stretched ravine. The two
        methods fail for <i>different</i> reasons: coordinate descent hates <b>correlation</b>
        between variables; gradient descent hates <b>ill-conditioning</b>.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Coordinate descent is the workhorse behind sparse linear models: <b>glmnet</b>, the
        standard Lasso/elastic-net solver, cycles through coordinates doing exactly this kind
        of one-variable update (with a soft-threshold instead of a plain line-min — see the
        <a href={`${window.__DM_BASE || "../../"}visualize/ista/`}> ISTA / proximal-gradient demo</a>).
        It is attractive when each coordinate update is cheap and closed-form, and when you
        want sparsity to emerge coordinate by coordinate. SMO, the classic <a href={`${window.__DM_BASE || "../../"}visualize/svm/`}>SVM</a> trainer,
        is a block-coordinate method too.
      </DemoP>
      <DemoP>
        The catch you are watching is real: coordinate descent's convergence degrades when
        features are <b>correlated</b>, because progress along any single axis is small. That
        is exactly why practitioners standardize and sometimes decorrelate features before
        running it, and why methods that move along the true gradient (or use <a href={`${window.__DM_BASE || "../../"}visualize/newton-vs-gradient/`}>curvature</a>)
        can be preferable on coupled problems. The same intuition explains why deep-learning
        optimizers update <i>all</i> parameters at once rather than one at a time.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      topic="OPTIMIZATION"
      title="Coordinate Descent"
      subtitle="Minimize one variable at a time, and watch axis-aligned moves stall when the coordinates are correlated."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/foundations/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="violet"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<CoordinateDescentDemo />);
