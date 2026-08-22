// demos/optimizers.jsx — four optimizers (SGD, Momentum, RMSProp, Adam)
// racing down the same non-convex 2-D loss surface from the same start.
// Real gradients, real updates, step-by-step — no smoke and mirrors.
//
// f(x, y) = 0.15*(x^2 + y^2) + 0.55*sin(2.2*x)*cos(2.2*y)
// A wiggly bowl: convex pull toward the origin + a sinusoid that creates
// shallow local minima around (0, 0). The point of the demo is to feel how
// each optimizer's mechanics shape its path through that landscape.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, SegmentedControl, StatReadout, Legend, ControlGroup, Toggle,
} = window;

const W = 460, H = 460, SC = 110;
const cx = W / 2, cy = H / 2;
const px = (x) => cx + x * SC, py = (y) => cy - y * SC;
const ix = (sx) => (sx - cx) / SC, iy = (sy) => (cy - sy) / SC;

function fval(x, y) {
  return 0.15 * (x * x + y * y) + 0.55 * Math.sin(2.2 * x) * Math.cos(2.2 * y);
}
function grad(x, y) {
  return [
    0.30 * x + 0.55 * 2.2 * Math.cos(2.2 * x) * Math.cos(2.2 * y),
    0.30 * y - 0.55 * 2.2 * Math.sin(2.2 * x) * Math.sin(2.2 * y),
  ];
}

const OPTS = [
  { id: "sgd",      label: "SGD",      color: "#60a5fa" },
  { id: "momentum", label: "Momentum", color: "#c084fc" },
  { id: "rmsprop",  label: "RMSProp",  color: "#fbbf24" },
  { id: "adam",     label: "Adam",     color: "#34d399" },
];

function newState(start) {
  return OPTS.map(o => ({
    id: o.id, color: o.color,
    x: start[0], y: start[1],
    v: [0, 0],         // momentum
    s: [0, 0],         // 2nd-moment for RMSProp / Adam
    m: [0, 0],         // 1st-moment for Adam
    t: 0,              // step count
    trail: [[start[0], start[1]]],
    loss: fval(start[0], start[1]),
  }));
}

function step(s, lr) {
  const [gx, gy] = grad(s.x, s.y);
  s.t += 1;
  if (s.id === "sgd") {
    s.x -= lr * gx;
    s.y -= lr * gy;
  } else if (s.id === "momentum") {
    const beta = 0.9;
    s.v[0] = beta * s.v[0] - lr * gx;
    s.v[1] = beta * s.v[1] - lr * gy;
    s.x += s.v[0]; s.y += s.v[1];
  } else if (s.id === "rmsprop") {
    const rho = 0.9, eps = 1e-6;
    s.s[0] = rho * s.s[0] + (1 - rho) * gx * gx;
    s.s[1] = rho * s.s[1] + (1 - rho) * gy * gy;
    s.x -= lr * gx / Math.sqrt(s.s[0] + eps);
    s.y -= lr * gy / Math.sqrt(s.s[1] + eps);
  } else if (s.id === "adam") {
    const b1 = 0.9, b2 = 0.999, eps = 1e-8;
    s.m[0] = b1 * s.m[0] + (1 - b1) * gx;
    s.m[1] = b1 * s.m[1] + (1 - b1) * gy;
    s.s[0] = b2 * s.s[0] + (1 - b2) * gx * gx;
    s.s[1] = b2 * s.s[1] + (1 - b2) * gy * gy;
    const mhx = s.m[0] / (1 - Math.pow(b1, s.t));
    const mhy = s.m[1] / (1 - Math.pow(b1, s.t));
    const shx = s.s[0] / (1 - Math.pow(b2, s.t));
    const shy = s.s[1] / (1 - Math.pow(b2, s.t));
    s.x -= lr * mhx / (Math.sqrt(shx) + eps);
    s.y -= lr * mhy / (Math.sqrt(shy) + eps);
  }
  // clamp to viewable region
  s.x = Math.max(-1.95, Math.min(1.95, s.x));
  s.y = Math.max(-1.95, Math.min(1.95, s.y));
  s.trail.push([s.x, s.y]);
  if (s.trail.length > 240) s.trail.shift();
  s.loss = fval(s.x, s.y);
}

function OptimizersDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const stateRef = _useRef(newState([-1.6, 1.5]));
  const [lr, setLr] = _useState(0.05);
  const [start, setStart] = _useState("ridge");  // ridge | corner | center
  const [running, setRunning] = _useState(false);
  const [tick, setTick] = _useState(0);

  const startPoints = {
    "ridge":  [-1.6, 1.5],
    "corner": [1.7, -1.6],
    "center": [0.05, 0.05],   // a near-saddle, optimizers diverge most visibly
  };

  function reset(s = start) {
    stateRef.current = newState(startPoints[s]);
    setTick(t => t + 1);
  }

  function doStep(n = 1) {
    for (let k = 0; k < n; k++) {
      for (const s of stateRef.current) step(s, lr);
    }
    setTick(t => t + 1);
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // loss surface — colored cells
    const step2 = 6;
    let lo = Infinity, hi = -Infinity;
    const grid = [];
    for (let sx = 0; sx < W; sx += step2) {
      for (let sy = 0; sy < H; sy += step2) {
        const v = fval(ix(sx + step2 / 2), iy(sy + step2 / 2));
        grid.push([sx, sy, v]); if (v < lo) lo = v; if (v > hi) hi = v;
      }
    }
    for (const [sx, sy, v] of grid) {
      const n = (v - lo) / (hi - lo + 1e-9); // 0..1
      const a = 0.06 + 0.42 * n;
      ctx.fillStyle = `rgba(168,85,247,${a})`;
      ctx.fillRect(sx, sy, step2, step2);
    }

    // contour lines (light)
    ctx.strokeStyle = "rgba(224,231,255,0.18)"; ctx.lineWidth = 1;
    const levels = 8;
    for (let lv = 0; lv < levels; lv++) {
      const target = lo + ((lv + 1) / (levels + 1)) * (hi - lo);
      ctx.beginPath();
      for (let sx = 0; sx < W; sx += step2) {
        for (let sy = 0; sy < H; sy += step2) {
          const a = fval(ix(sx), iy(sy));
          const b = fval(ix(sx + step2), iy(sy));
          if ((a - target) * (b - target) < 0) { ctx.moveTo(sx, sy); ctx.lineTo(sx + 1, sy); }
        }
      }
      ctx.stroke();
    }

    // grid frame
    ctx.strokeStyle = "rgba(148,163,184,0.25)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H);
    ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();

    // optimizer trails
    for (const s of stateRef.current) {
      ctx.beginPath();
      s.trail.forEach(([x, y], i) => {
        const X = px(x), Y = py(y);
        if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
      });
      ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.stroke();
      const last = s.trail[s.trail.length - 1];
      ctx.beginPath(); ctx.arc(px(last[0]), py(last[1]), 5, 0, Math.PI * 2);
      ctx.fillStyle = s.color; ctx.fill();
    }
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  }, []);
  _useEffect(() => { draw(); /* eslint-disable-next-line */ }, [tick]);
  _useEffect(() => { reset(start); /* eslint-disable-next-line */ }, [start]);
  _useEffect(() => {
    if (!running) { cancelAnimationFrame(rafRef.current); return; }
    const loop = () => { doStep(1); rafRef.current = requestAnimationFrame(loop); };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line
  }, [running, lr]);

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <SegmentedControl label="// START" value={start} onChange={setStart}
        options={[
          { value: "ridge",  label: "Ridge"  },
          { value: "corner", label: "Corner" },
          { value: "center", label: "Saddle" },
        ]}
        help="Where all four optimizers begin. The saddle near the origin is the meanest start — momentum-style methods escape quickly while plain SGD can dither." />
      <Slider label="// LEARNING RATE" min={0.005} max={0.30} step={0.005} value={lr} onChange={setLr}
        help="The step size η. Too small = crawl. Too large = SGD overshoots and oscillates; adaptive methods (RMSProp, Adam) tolerate it better." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <DemoButton onClick={() => doStep(1)}>STEP 1</DemoButton>
        <DemoButton onClick={() => doStep(20)}>STEP 20</DemoButton>
        <DemoButton onClick={() => setRunning(r => !r)} primary>{running ? "PAUSE" : "RUN"}</DemoButton>
        <DemoButton onClick={() => { setRunning(false); reset(); }}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {stateRef.current.map(s => (
          <StatReadout key={s.id} label={s.id.toUpperCase()} value={s.loss.toFixed(3)} accent={s.color} />
        ))}
      </div>
      <Legend items={OPTS.map(o => ({ color: o.color, label: o.label.toUpperCase() }))} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        All four optimizers see the same gradients on the same wiggly bowl —
        the differences in their paths come entirely from how they use those
        gradients. <b style={{ color: "#60a5fa" }}>SGD</b> takes the raw
        gradient as its step, period — it crawls and stalls in shallow dips.
        <b style={{ color: "#c084fc" }}> Momentum</b> rolls a velocity, so
        consistent gradients accelerate (it bursts down ridges) and noise
        cancels out — but it can overshoot. <b style={{ color: "#fbbf24" }}>
        RMSProp</b> divides each step by a running RMS of past gradients, so
        steep directions get small steps and flat ones get big steps. <b style={{ color: "#34d399" }}>Adam</b> is RMSProp's per-direction scaling
        plus Momentum's velocity, with bias correction — it's why it dominates
        in practice.
      </DemoP>
      <DemoP>
        Push the learning rate up: SGD oscillates first, Momentum overshoots
        but recovers, RMSProp and Adam keep their composure. Drop it: SGD
        gets stuck in the first local dip while the adaptive methods keep
        finding the lower basin. Try the <b>Saddle</b> start — the near-zero
        gradient at the origin pins SGD in place while Momentum's velocity
        kicks it off. That's the picture in a real loss landscape.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Every modern neural network is trained by one of these four ideas (or
        a small variant). <b>Adam / AdamW</b> is the default for transformers
        and most large models — its per-parameter step sizes handle the wildly
        different gradient scales across attention vs. embedding vs. layernorm.
        <b>SGD with momentum</b> still beats Adam on ConvNets and dense vision
        models with strong regularization (the classic ResNet recipe).
        <b>RMSProp</b> shows up in RL (where rewards make gradients noisy) and
        in many hand-tuned RNN setups.
      </DemoP>
      <DemoP>
        The lesson that outlasts the algorithms: training is a search through
        a hostile landscape full of cliffs, ravines, plateaus, and shallow
        local minima. Pick an optimizer whose mechanics match what your loss
        surface throws at you. And tune the learning rate — by far the highest-
        leverage hyperparameter — using exactly the kind of intuition this
        demo builds.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Optimizer Shootout"
      subtitle="SGD, Momentum, RMSProp, and Adam racing on the same non-convex loss surface."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/neural-nets/`}
      tone="blue" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<OptimizersDemo />);
