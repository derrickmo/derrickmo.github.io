// demos/gradient-descent.jsx — optimizer playground on 2D loss surfaces.
// Real SGD / Momentum / RMSProp / Adam descending real analytic gradients.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 380;

const SURFACES = {
  bowl: {
    label: "Ravine", domain: { xmin: -2.6, xmax: 2.6, ymin: -2.6, ymax: 2.6 },
    start: { x: -2.2, y: 2.2 },
    f: (x, y) => x * x + 6 * y * y,
    grad: (x, y) => [2 * x, 12 * y],
  },
  saddle: {
    label: "Saddle", domain: { xmin: -2.2, xmax: 2.2, ymin: -2.2, ymax: 2.2 },
    start: { x: -1.8, y: 0.06 },
    f: (x, y) => x * x - y * y,
    grad: (x, y) => [2 * x, -2 * y],
  },
  rosenbrock: {
    label: "Rosenbrock", domain: { xmin: -2, xmax: 2, ymin: -1, ymax: 3 },
    start: { x: -1.5, y: 2.6 },
    f: (x, y) => (1 - x) ** 2 + 100 * (y - x * x) ** 2,
    grad: (x, y) => [-2 * (1 - x) - 400 * x * (y - x * x), 200 * (y - x * x)],
  },
  ripples: {
    label: "Many minima", domain: { xmin: -2.4, xmax: 2.4, ymin: -2.4, ymax: 2.4 },
    start: { x: 1.95, y: 1.95 },
    f: (x, y) => Math.sin(3 * x) * Math.cos(3 * y) + 0.25 * (x * x + y * y),
    grad: (x, y) => [3 * Math.cos(3 * x) * Math.cos(3 * y) + 0.5 * x, -3 * Math.sin(3 * x) * Math.sin(3 * y) + 0.5 * y],
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

function GradientDescentDemo() {
  const canvasRef = _useRef(null);
  const bgRef = _useRef(null);
  const pRef = _useRef({ x: 0, y: 0 });
  const pathRef = _useRef([]);
  const optRef = _useRef({});
  const rafRef = _useRef(null);
  const dprRef = _useRef(1);

  const [surf, setSurf] = _useState("bowl");
  const [opt, setOpt] = _useState("sgd");
  const [lr, setLr] = _useState(0.03);
  const [speed, setSpeed] = _useState(3);
  const [running, setRunning] = _useState(false);
  const [steps, setSteps] = _useState(0);
  const [loss, setLoss] = _useState(0);
  const [status, setStatus] = _useState("IDLE");

  const surfRef = _useRef(surf), optNameRef = _useRef(opt), lrRef = _useRef(lr), speedRef = _useRef(speed);
  _useEffect(() => { optNameRef.current = opt; resetOpt(); }, [opt]);
  _useEffect(() => { lrRef.current = lr; }, [lr]);
  _useEffect(() => { speedRef.current = speed; }, [speed]);

  function toPx(x, y) {
    const d = SURFACES[surfRef.current].domain;
    return [(x - d.xmin) / (d.xmax - d.xmin) * W, (1 - (y - d.ymin) / (d.ymax - d.ymin)) * H];
  }
  function toParam(px, py) {
    const d = SURFACES[surfRef.current].domain;
    return [d.xmin + px / W * (d.xmax - d.xmin), d.ymin + (1 - py / H) * (d.ymax - d.ymin)];
  }
  function resetOpt() { optRef.current = { vx: 0, vy: 0, sx: 0, sy: 0, mx: 0, my: 0, t: 0 }; }

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
    const norm = v => Math.log(1 + v - lo) / Math.log(1 + hi - lo);
    for (let px = 0; px < W; px += CS) for (let py = 0; py < H; py += CS) {
      const [x, y] = toParam(px + CS / 2, py + CS / 2);
      ctx.fillStyle = rampColor(norm(SURFACES[surf].f(x, y)));
      ctx.fillRect(px, py, CS, CS);
    }
    bgRef.current = bg;
  }

  function resetRun() {
    pRef.current = { ...SURFACES[surfRef.current].start };
    pathRef.current = [{ ...pRef.current }];
    resetOpt();
    setSteps(0);
    setLoss(+SURFACES[surfRef.current].f(pRef.current.x, pRef.current.y).toFixed(3));
    setStatus("IDLE");
    draw();
  }

  function stepOnce() {
    const S = SURFACES[surfRef.current], p = pRef.current, o = optRef.current, a = lrRef.current;
    let [gx, gy] = S.grad(p.x, p.y);
    const gnorm = Math.hypot(gx, gy);
    let dx = 0, dy = 0;
    const name = optNameRef.current;
    if (name === "sgd") { dx = -a * gx; dy = -a * gy; }
    else if (name === "momentum") { o.vx = 0.9 * o.vx - a * gx; o.vy = 0.9 * o.vy - a * gy; dx = o.vx; dy = o.vy; }
    else if (name === "rmsprop") {
      o.sx = 0.9 * o.sx + 0.1 * gx * gx; o.sy = 0.9 * o.sy + 0.1 * gy * gy;
      dx = -a * gx / (Math.sqrt(o.sx) + 1e-8); dy = -a * gy / (Math.sqrt(o.sy) + 1e-8);
    } else { // adam
      o.t += 1;
      o.mx = 0.9 * o.mx + 0.1 * gx; o.my = 0.9 * o.my + 0.1 * gy;
      o.vx = 0.999 * o.vx + 0.001 * gx * gx; o.vy = 0.999 * o.vy + 0.001 * gy * gy;
      const mhx = o.mx / (1 - 0.9 ** o.t), mhy = o.my / (1 - 0.9 ** o.t);
      const vhx = o.vx / (1 - 0.999 ** o.t), vhy = o.vy / (1 - 0.999 ** o.t);
      dx = -a * mhx / (Math.sqrt(vhx) + 1e-8); dy = -a * mhy / (Math.sqrt(vhy) + 1e-8);
    }
    const d = S.domain;
    p.x = clamp(p.x + dx, d.xmin, d.xmax);
    p.y = clamp(p.y + dy, d.ymin, d.ymax);
    pathRef.current.push({ x: p.x, y: p.y });
    setSteps(v => v + 1);
    const L = S.f(p.x, p.y);
    setLoss(+L.toFixed(3));
    if (!isFinite(L) || L > 1e7) { setStatus("DIVERGED"); return true; }
    if (gnorm < 1e-3) { setStatus("CONVERGED"); return true; }
    setStatus("DESCENDING");
    return false;
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (bgRef.current) ctx.drawImage(bgRef.current, 0, 0, W, H);
    // path
    const path = pathRef.current;
    if (path.length > 1) {
      ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 2;
      ctx.beginPath();
      path.forEach((q, i) => { const [px, py] = toPx(q.x, q.y); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
      ctx.stroke();
    }
    if (path.length) {
      const [sx, sy] = toPx(path[0].x, path[0].y);
      ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2); ctx.fill();
      const [cx, cy] = toPx(pRef.current.x, pRef.current.y);
      ctx.fillStyle = "#fff"; ctx.strokeStyle = "#c084fc"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  }

  function onDown(e) {
    setRunning(false);
    const rect = canvasRef.current.getBoundingClientRect();
    const [x, y] = toParam((e.clientX - rect.left) / (rect.width / W), (e.clientY - rect.top) / (rect.height / H));
    pRef.current = { x, y }; pathRef.current = [{ x, y }]; resetOpt();
    setSteps(0); setLoss(+SURFACES[surfRef.current].f(x, y).toFixed(3)); setStatus("IDLE"); draw();
  }

  function handleRun() { if (running) { setRunning(false); return; } if (status === "CONVERGED" || status === "DIVERGED") resetRun(); setRunning(true); }
  function handleStep() { if (running) return; stepOnce(); draw(); }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    buildBg(); resetRun();
  }, []);

  // rebuild on surface change
  _useEffect(() => { surfRef.current = surf; buildBg(); resetRun(); }, [surf]);

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
      <SegmentedControl label="// LOSS SURFACE" value={surf} onChange={v => { setRunning(false); setSurf(v); }}
        options={Object.entries(SURFACES).map(([k, v]) => ({ value: k, label: v.label }))}
        help="The error landscape to descend. Each is a classic stress test: a stretched ravine, a saddle, Rosenbrock's banana valley, and a bumpy surface with many local minima." />
      <SegmentedControl label="// OPTIMIZER" tone="violet" value={opt} onChange={v => { setRunning(false); setOpt(v); }}
        options={[{ value: "sgd", label: "SGD" }, { value: "momentum", label: "Momentum" }, { value: "rmsprop", label: "RMSProp" }, { value: "adam", label: "Adam" }]}
        help="The update rule. SGD steps along the raw gradient; Momentum builds velocity; RMSProp rescales each direction by its recent gradient; Adam combines momentum with per-direction scaling." />
      <Slider label="// LEARNING RATE" min={0.001} max={0.3} step={0.001} value={lr} onChange={setLr}
        help="How big each step is. Too small crawls; too large overshoots and can diverge — watch the loss blow up." />
      <Slider label="// SPEED" min={1} max={20} value={speed} onChange={setSpeed} suffix=" /frame"
        help="How many optimizer steps run per animation frame. Purely visual pacing — it does not change the math." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={handleRun} primary>{running ? "PAUSE" : "RUN"}</DemoButton>
        <DemoButton onClick={handleStep} disabled={running}>STEP</DemoButton>
        <DemoButton onClick={resetRun}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="STEP" value={steps} />
        <StatReadout label="LOSS" value={loss} accent="var(--violet-lt)" />
      </div>
      <StatReadout label="STATUS" value={status}
        accent={status === "CONVERGED" ? "#34d399" : status === "DIVERGED" ? "#f87171" : "var(--blue-lt)"} />
      <Legend items={[{ color: "#fbbf24", label: "START" }, { color: "#fff", label: "CURRENT", border: "1px solid #c084fc" }, { color: "#a855f7", label: "HIGH LOSS" }, { color: "#0a1428", label: "LOW LOSS" }]} />
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>Tip: click the surface to drop a new start point.</div>
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Every optimizer here follows the negative gradient downhill, but they
        differ in how they use past gradients. <b>SGD</b> takes a fixed step along
        the current slope — on a stretched "ravine" it bounces across the steep
        walls and crawls along the flat floor. <b>Momentum</b> accumulates velocity,
        so it powers through that ravine. <b>RMSProp</b> scales each dimension by its
        recent gradient magnitude, evening out steep and flat directions. <b>Adam</b>
        combines momentum and per-dimension scaling — usually the most forgiving.
      </DemoP>
      <DemoP>
        Try the same surface and learning rate across all four. Crank the rate on
        SGD until it <span style={{ color: "#f87171" }}>diverges</span>. On
        "Many minima," drop the start point in different basins and watch it settle
        into different local minima. Rosenbrock's banana valley is the classic
        stress test — most optimizers need a small rate to navigate it.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Gradient descent is the engine of essentially all of modern ML: every neural
        network — from a tiny MLP to a frontier LLM — is trained by some variant of what
        you're watching, following the loss gradient over millions or billions of
        parameters. <b>Adam</b> is the de-facto default for training transformers; SGD
        with momentum still wins for many vision models. The pathologies on screen are
        the real ones engineers fight: ravines (ill-conditioned curvature), saddle points
        (which dominate high-dimensional landscapes), and local minima.
      </DemoP>
      <DemoP>
        The <b>learning rate</b> is the single most consequential hyperparameter in deep
        learning — too high and training diverges into NaNs, too low and it never
        finishes. That fragility is exactly why <i>learning-rate schedules</i> (warmup
        then cosine decay) exist, and why adaptive optimizers that auto-scale each
        direction took over. Build the intuition here for "why is my model not training"
        and a huge fraction of practical deep-learning debugging stops being mysterious.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      title="Gradient Descent"
      subtitle="Drop a point on a loss surface and race four optimizers to the bottom."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="blue"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<GradientDescentDemo />);
