// demos/gradient-clipping.jsx — why exploding gradients need clipping.
//
// Some loss surfaces have a "cliff": a near-flat plateau that drops off a steep
// wall (classic in RNNs / deep nets). On the plateau the gradient is tiny, so
// the optimizer crawls — until it hits the wall, where the gradient suddenly
// spikes. One unclipped step then multiplies that huge gradient by the learning
// rate and launches the parameters across the map (the explosion). Gradient
// clipping rescales any gradient whose norm exceeds a threshold τ back down to τ:
//      g ← g · min(1, τ / ||g||)
// Same direction, bounded length. The clipped walker eases over the cliff; the
// unclipped one ricochets. We run both from the same start on the same surface.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480;
const X0 = -1.6, X1 = 1.6, Y0 = -1.25, Y1 = 1.25;
const START = { x: 1.15, y: 0.95 };

function GradientClippingDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const [lr, setLr] = _useState(0.06);
  const [tau, setTau] = _useState(1.0);
  const [k, setK] = _useState(12);
  const [speed, setSpeed] = _useState(6);
  const [running, setRunning] = _useState(true);
  const [, setTick] = _useState(0);
  const sim = _useRef(null);

  const H_WALL = 5;
  const sig = (z) => 1 / (1 + Math.exp(-z));
  function loss(x, y) { return H_WALL * sig(k * x) + 0.15 * y * y + 0.3 * x; }
  function grad(x, y) { const s = sig(k * x); return [H_WALL * k * s * (1 - s) + 0.3, 0.3 * y]; }
  const norm = (g) => Math.hypot(g[0], g[1]);

  function reset() {
    sim.current = {
      unc: { x: START.x, y: START.y, path: [[START.x, START.y]], dead: false, maxStep: 0 },
      clp: { x: START.x, y: START.y, path: [[START.x, START.y]] },
      gRaw: 0, gClip: 0, step: 0, exploded: false,
    };
    setTick(t => t + 1);
  }
  _useEffect(() => { reset(); /* eslint-disable-next-line */ }, [k]);

  function stepOnce() {
    const st = sim.current; if (!st) return;
    // unclipped walker
    if (!st.unc.dead) {
      const g = grad(st.unc.x, st.unc.y);
      const sx = lr * g[0], sy = lr * g[1], slen = Math.hypot(sx, sy);
      st.unc.maxStep = Math.max(st.unc.maxStep, slen);
      st.unc.x -= sx; st.unc.y -= sy;
      st.unc.path.push([st.unc.x, st.unc.y]);
      if (st.unc.path.length > 400) st.unc.path.shift();
      if (st.unc.x < X0 - 1 || st.unc.x > X1 + 1 || st.unc.y < Y0 - 1 || st.unc.y > Y1 + 1) { st.unc.dead = true; st.exploded = true; }
      st.gRaw = norm(g);
    }
    // clipped walker
    {
      const g = grad(st.clp.x, st.clp.y);
      const n = norm(g), scale = Math.min(1, tau / (n || 1e-9));
      const gx = g[0] * scale, gy = g[1] * scale;
      st.clp.x -= lr * gx; st.clp.y -= lr * gy;
      st.clp.path.push([st.clp.x, st.clp.y]);
      if (st.clp.path.length > 400) st.clp.path.shift();
      st.gClip = n * scale;
    }
    st.step++;
  }

  _useEffect(() => {
    let last = performance.now();
    const tick = (now) => {
      if (running && now - last > 230 / speed) { last = now; stepOnce(); setTick(t => t + 1); }
      draw();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    /* eslint-disable-next-line */
  }, [running, speed, lr, tau, k]);

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";
    const st = sim.current; if (!st) return;
    const pad = 24, plotH = H - 60;
    const PX = (x) => pad + (x - X0) / (X1 - X0) * (W - 2 * pad);
    const PY = (y) => pad + (1 - (y - Y0) / (Y1 - Y0)) * (plotH - pad);

    // heatmap of the loss
    const gx = 80, gy = 64, cw = (W - 2 * pad) / gx, ch = (plotH - pad) / gy;
    let lmin = Infinity, lmax = -Infinity; const grid = [];
    for (let i = 0; i < gx; i++) { grid.push([]); for (let j = 0; j < gy; j++) { const x = X0 + (i / (gx - 1)) * (X1 - X0), y = Y0 + (j / (gy - 1)) * (Y1 - Y0); const L = loss(x, y); grid[i].push(L); if (L < lmin) lmin = L; if (L > lmax) lmax = L; } }
    for (let i = 0; i < gx; i++) for (let j = 0; j < gy; j++) {
      const t = (grid[i][j] - lmin) / (lmax - lmin || 1);
      const r = Math.round(40 + 128 * t), b = Math.round(120 + 80 * (1 - t)), g = Math.round(50 + 30 * (1 - t));
      ctx.fillStyle = `rgba(${r},${g},${b},0.5)`;
      ctx.fillRect(pad + i * cw, pad + j * ch, cw + 1, ch + 1);
    }
    ctx.fillStyle = "#e2e8f0"; ctx.fillText("LOSS SURFACE with a cliff  ·  both walkers start at ●", pad, 18);

    const trail = (path, color, wdt) => {
      ctx.strokeStyle = color; ctx.lineWidth = wdt; ctx.beginPath();
      path.forEach((p, i) => { const x = PX(Math.max(X0, Math.min(X1, p[0]))), y = PY(Math.max(Y0, Math.min(Y1, p[1]))); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
      ctx.stroke();
    };
    trail(st.unc.path, "#f87171", 2);
    trail(st.clp.path, "#34d399", 2.2);

    // current dots
    const dot = (p, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(PX(Math.max(X0, Math.min(X1, p[0]))), PY(Math.max(Y0, Math.min(Y1, p[1]))), 4.5, 0, 7); ctx.fill(); };
    dot([st.clp.x, st.clp.y], "#34d399");
    if (!st.unc.dead) dot([st.unc.x, st.unc.y], "#f87171");
    // start marker
    ctx.fillStyle = "#e2e8f0"; ctx.beginPath(); ctx.arc(PX(START.x), PY(START.y), 3, 0, 7); ctx.fill();

    // gradient-norm bars
    const by = plotH + 8, bw = W - 2 * pad;
    ctx.fillStyle = "#94a3b8"; ctx.font = "10px JetBrains Mono";
    ctx.fillText("raw ‖g‖ " + st.gRaw.toFixed(1), pad, by + 10);
    ctx.fillText("clipped ‖g‖ " + st.gClip.toFixed(1) + "  (τ=" + tau.toFixed(1) + ")", pad + 180, by + 10);
    if (st.exploded) { ctx.fillStyle = "#f87171"; ctx.fillText("⚠ unclipped trajectory EXPLODED off the map", pad, by + 26); }
    else { ctx.fillStyle = "#34d399"; ctx.fillText("step " + st.step + "  ·  clipped walker descending smoothly", pad, by + 26); }
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  });

  const st = sim.current;
  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// LEARNING RATE" min={0.01} max={0.12} step={0.005} value={lr} onChange={setLr}
        help="Step size. Bigger learning rate makes the cliff explosion more violent for the unclipped walker — and is exactly why large-LR training needs clipping." />
      <Slider label="// CLIP THRESHOLD τ" min={0.2} max={4} step={0.1} value={tau} onChange={setTau}
        help="Maximum allowed gradient norm. Any gradient longer than τ is rescaled to length τ (same direction). Small τ = very cautious near the cliff; large τ ≈ no clipping. The green walker uses it." />
      <Slider label="// CLIFF STEEPNESS" min={4} max={20} step={1} value={k} onChange={setK}
        help="How abruptly the wall rises. Steeper = a taller, narrower gradient spike at the edge — the regime where unclipped optimization blows up. Resets the run." />
      <Slider label="// SPEED" min={1} max={20} step={1} value={speed} onChange={setSpeed}
        help="Animation speed of the descent. Purely visual." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setRunning(r => !r)} primary>{running ? "PAUSE" : "RESUME"}</DemoButton>
        <DemoButton onClick={reset}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="RAW ‖g‖" value={st ? st.gRaw.toFixed(1) : "—"} accent="#f87171" />
        <StatReadout label="CLIPPED ‖g‖" value={st ? st.gClip.toFixed(1) : "—"} accent="#34d399" />
      </div>
      <StatReadout label="UNCLIPPED MAX STEP" value={st ? st.unc.maxStep.toFixed(2) : "—"} accent={st && st.exploded ? "#f87171" : "#fbbf24"} />
      <Legend items={[
        { color: "#f87171", label: "no clipping (explodes)" },
        { color: "#34d399", label: "norm-clipped (stable)" },
        { color: "#e2e8f0", label: "start" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        The surface is mostly a gentle plateau with one steep wall — a cliff. Both
        walkers start at the white dot and run plain gradient descent on the same
        loss. On the flat part the gradient is small and both crawl together. The
        moment they reach the wall the gradient norm spikes (watch RAW ‖g‖ jump): the
        red, unclipped walker multiplies that by the learning rate and gets flung
        clear across the map — often right off it. The green walker clips the
        gradient to length τ first, so its step stays bounded and it slides down the
        cliff face under control.
      </DemoP>
      <DemoP>
        Push LEARNING RATE or CLIFF STEEPNESS up and the red trajectory detonates
        sooner and harder. Then lower the CLIP THRESHOLD τ and the green walker gets
        even more cautious at the edge. Clipping doesn't change the gradient's
        <i> direction</i> — it only caps its <i>length</i> — so you keep descending
        the right way, you just refuse to take an absurd step because one mini-batch
        landed on a wall.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Gradient clipping (Pascanu et al. 2013) is standard equipment for training
        RNNs/LSTMs and large transformers, where rare sharp regions of the loss
        produce exploding gradients that would otherwise NaN out a run. Clip-by-norm
        (shown here) rescales the whole gradient vector; clip-by-value caps each
        coordinate. It's the explosion-side complement to the vanishing-gradient
        fixes you see in{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/rnn-gates/`} style={{ color: "#a855f7" }}>RNN gates</a>,
        and it interacts with the{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/optimizers/`} style={{ color: "#a855f7" }}>optimizer</a> and{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/lr-schedule/`} style={{ color: "#a855f7" }}>learning-rate schedule</a> —
        warmup plus clipping is a common stability recipe.
      </DemoP>
      <DemoP>
        Caveats: clipping introduces bias — when it's active the step no longer
        follows the true gradient magnitude, which can slow convergence if τ is set
        too low, so it's usually tuned as a safety rail (e.g. global-norm 1.0) rather
        than an always-on regularizer. It treats a symptom (sharp loss geometry);
        normalization, better initialization, and architecture choices attack the
        cause. And it only bounds the step it sees — it won't rescue a run that's
        already diverged.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="TRAINING & SCALING" title="Gradient Clipping"
      subtitle="A loss cliff makes the gradient explode; one unclipped step launches the parameters off the map. Clipping caps the gradient norm so descent stays bounded. Race a clipped and an unclipped walker on the same surface."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/training-systems/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<GradientClippingDemo />);
