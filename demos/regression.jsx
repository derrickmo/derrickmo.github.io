// demos/regression.jsx — linear & logistic regression you can drag.
// Linear: click to scatter points; least-squares closed-form fit + GD path.
// Logistic: two classes; sigmoid + binary cross-entropy via gradient descent.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 440, H = 440;
const PAD = 28;
const X0 = PAD, X1 = W - PAD, Y0 = H - PAD, Y1 = PAD;
const sx = (x) => X0 + x * (X1 - X0);
const sy = (y) => Y0 + y * (Y1 - Y0); // y already inverted: 0 at bottom
const dx = (px) => (px - X0) / (X1 - X0);
const dy = (py) => (Y0 - py) / (Y0 - Y1); // 0..1 with 0 at bottom

function genLinear(n = 22, slope = 1.4, intercept = -0.4, noise = 0.09) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1);
    const y = slope * x + intercept + (Math.random() - 0.5) * 2 * noise;
    pts.push({ x, y });
  }
  return pts;
}
function genLogistic(n = 60) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const cls = i % 2;
    const cx = cls ? 0.7 : 0.3, cy = cls ? 0.7 : 0.3;
    pts.push({ x: cx + (Math.random() - 0.5) * 0.4, y: cy + (Math.random() - 0.5) * 0.4, label: cls });
  }
  return pts;
}

// Closed-form OLS for linear regression on (x, y) pairs in [0,1].
function fitOLS(pts) {
  if (pts.length < 2) return { m: 0, b: 0 };
  let sX = 0, sY = 0, sXY = 0, sXX = 0;
  for (const p of pts) { sX += p.x; sY += p.y; sXY += p.x * p.y; sXX += p.x * p.x; }
  const n = pts.length;
  const m = (n * sXY - sX * sY) / Math.max(1e-9, n * sXX - sX * sX);
  const b = (sY - m * sX) / n;
  return { m, b };
}
function mse(pts, m, b) {
  let s = 0;
  for (const p of pts) { const e = p.y - (m * p.x + b); s += e * e; }
  return s / Math.max(1, pts.length);
}

// Logistic regression — sigmoid on w·x + b; BCE loss; full-batch GD.
const sigmoid = (z) => 1 / (1 + Math.exp(-z));
function bce(pts, w1, w2, b) {
  let s = 0;
  for (const p of pts) {
    const z = w1 * p.x + w2 * p.y + b;
    const yhat = Math.min(1 - 1e-7, Math.max(1e-7, sigmoid(z)));
    s += -(p.label * Math.log(yhat) + (1 - p.label) * Math.log(1 - yhat));
  }
  return s / Math.max(1, pts.length);
}
function gdStepLogistic(pts, w1, w2, b, lr) {
  let gw1 = 0, gw2 = 0, gb = 0;
  for (const p of pts) {
    const z = w1 * p.x + w2 * p.y + b;
    const yhat = sigmoid(z);
    const d = yhat - p.label;
    gw1 += d * p.x; gw2 += d * p.y; gb += d;
  }
  const n = pts.length;
  return { w1: w1 - lr * gw1 / n, w2: w2 - lr * gw2 / n, b: b - lr * gb / n };
}

function RegressionDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const ptsRef = _useRef(genLinear());
  const wRef = _useRef({ w1: 0.1, w2: 0.1, b: 0 });
  const rafRef = _useRef(0);
  const [mode, setMode] = _useState("linear");
  const [noise, setNoise] = _useState(0.09);
  const [lr, setLr] = _useState(2);
  const [tick, setTick] = _useState(0);
  const [running, setRunning] = _useState(false);
  const [stats, setStats] = _useState({ loss: 0, m: 0, b: 0, acc: 0 });

  function reseed(m) {
    if (m === "linear") {
      ptsRef.current = genLinear(22, 1.4, -0.4, noise);
      wRef.current = { w1: 0.1, w2: 0, b: 0 };
    } else {
      ptsRef.current = genLogistic();
      wRef.current = { w1: 0.1, w2: 0.1, b: 0 };
    }
    setTick(t => t + 1);
  }

  function drawAxes(ctx) {
    ctx.strokeStyle = "rgba(96,165,250,0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y0);
    ctx.moveTo(X0, Y0); ctx.lineTo(X0, Y1);
    ctx.stroke();
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    drawAxes(ctx);

    const pts = ptsRef.current;
    if (mode === "linear") {
      const { m, b } = fitOLS(pts);
      // residual segments
      ctx.strokeStyle = "rgba(192,132,252,0.45)"; ctx.lineWidth = 1;
      for (const p of pts) {
        ctx.beginPath();
        ctx.moveTo(sx(p.x), sy(p.y));
        ctx.lineTo(sx(p.x), sy(m * p.x + b));
        ctx.stroke();
      }
      // best-fit line
      ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(sx(0), sy(b));
      ctx.lineTo(sx(1), sy(m + b));
      ctx.stroke();
      // points
      for (const p of pts) {
        ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), 4, 0, Math.PI * 2);
        ctx.fillStyle = "#60a5fa"; ctx.fill();
      }
    } else {
      const { w1, w2, b } = wRef.current;
      // decision field
      const step = 7;
      for (let i = X0; i < X1; i += step) for (let j = Y1; j < Y0; j += step) {
        const x = dx(i + step / 2), y = dy(j + step / 2);
        const p = sigmoid(w1 * x + w2 * y + b);
        const mag = Math.abs(p - 0.5) * 2;
        ctx.fillStyle = p > 0.5
          ? `rgba(192,132,252,${0.06 + 0.22 * mag})`
          : `rgba(96,165,250,${0.06 + 0.22 * mag})`;
        ctx.fillRect(i, j, step, step);
      }
      // boundary: w1*x + w2*y + b = 0 → y = -(w1 x + b)/w2
      if (Math.abs(w2) > 1e-3) {
        const yA = -(w1 * 0 + b) / w2, yB = -(w1 * 1 + b) / w2;
        ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx(0), sy(yA)); ctx.lineTo(sx(1), sy(yB));
        ctx.stroke();
      }
      // points
      for (const p of pts) {
        ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), 4, 0, Math.PI * 2);
        ctx.fillStyle = p.label ? "#c084fc" : "#60a5fa"; ctx.fill();
      }
    }
  }

  function recomputeStats() {
    const pts = ptsRef.current;
    if (mode === "linear") {
      const { m, b } = fitOLS(pts);
      setStats({ loss: +mse(pts, m, b).toFixed(4), m: +m.toFixed(2), b: +b.toFixed(2), acc: 0 });
    } else {
      const { w1, w2, b } = wRef.current;
      let correct = 0;
      for (const p of pts) {
        const z = w1 * p.x + w2 * p.y + b;
        if ((z > 0 ? 1 : 0) === p.label) correct++;
      }
      setStats({ loss: +bce(pts, w1, w2, b).toFixed(4), m: 0, b: 0, acc: Math.round(100 * correct / pts.length) });
    }
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw(); recomputeStats();
    // click-to-add
    const onClick = (e) => {
      const r = cv.getBoundingClientRect();
      const px = (e.clientX - r.left) * (W / r.width);
      const py = (e.clientY - r.top) * (H / r.height);
      const x = dx(px), y = dy(py);
      if (x < 0 || x > 1 || y < 0 || y > 1) return;
      if (mode === "linear") ptsRef.current.push({ x, y });
      else ptsRef.current.push({ x, y, label: e.shiftKey ? 0 : 1 });
      setTick(t => t + 1);
    };
    cv.addEventListener("click", onClick);
    return () => cv.removeEventListener("click", onClick);
    // eslint-disable-next-line
  }, [mode]);

  _useEffect(() => { draw(); recomputeStats(); /* eslint-disable-next-line */ }, [tick, mode]);

  _useEffect(() => {
    if (!running || mode !== "logistic") return;
    const loop = () => {
      const pts = ptsRef.current;
      let w = wRef.current;
      for (let k = 0; k < 4; k++) w = gdStepLogistic(pts, w.w1, w.w2, w.b, lr);
      wRef.current = w;
      setTick(t => t + 1);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, mode, lr]);

  // A11Y-0003: the click handler is bound with addEventListener below rather than
  // as a prop, so DemoLayout has nothing to detect -- this says so explicitly.
  const stage = <canvas ref={canvasRef} data-dm-canvas-input="click" style={{ maxWidth: "100%", borderRadius: 4, cursor: "crosshair" }} />;
  const controls = (
    <ControlGroup>
      <SegmentedControl label="// MODE" value={mode} onChange={(v) => { setMode(v); setRunning(false); setTimeout(() => reseed(v), 0); }}
        options={[{ value: "linear", label: "Linear" }, { value: "logistic", label: "Logistic" }]}
        help="Linear regression predicts a real number with a line + MSE loss. Logistic regression predicts class probability with a sigmoid + cross-entropy." />
      {mode === "linear" && (
        <Slider label="// NOISE" min={0} max={0.25} step={0.01} value={noise} onChange={setNoise}
          help="Standard deviation of the y-noise on the regenerated dataset. More noise → flatter slope estimate and higher MSE." />
      )}
      {mode === "logistic" && (
        <Slider label="// LR" min={0.1} max={10} step={0.1} value={lr} onChange={setLr} tone="violet"
          help="Gradient-descent step size on the BCE loss. Too small and convergence stalls; too large and the boundary oscillates." />
      )}
      <DemoButton onClick={() => reseed(mode)} primary>NEW DATA</DemoButton>
      {mode === "logistic" && (
        <DemoButton onClick={() => setRunning(r => !r)} tone="violet">{running ? "PAUSE" : "TRAIN"}</DemoButton>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label={mode === "linear" ? "MSE" : "BCE"} value={stats.loss} />
        {mode === "linear"
          ? <StatReadout label="SLOPE" value={stats.m} accent="#fbbf24" />
          : <StatReadout label="ACC" value={stats.acc + "%"} accent="#fbbf24" />}
      </div>
      <Legend items={mode === "linear"
        ? [{ color: "#60a5fa", label: "DATA" }, { color: "#fbbf24", label: "FIT" }, { color: "#c084fc", label: "RESIDUAL" }]
        : [{ color: "#60a5fa", label: "CLASS 0" }, { color: "#c084fc", label: "CLASS 1" }, { color: "#fbbf24", label: "BOUNDARY" }]} />
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10, marginTop: -4 }}>
        Click to add points{mode === "logistic" ? " (shift-click for class 0)" : ""}.
      </div>
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        <b>Linear regression</b> finds the line that minimizes squared error to the
        data — the violet sticks show each residual, the orange line is the unique
        least-squares solution. There's no iteration: the optimum has a closed form,
        because MSE is convex in (slope, intercept). Add a point and the line moves
        immediately; crank noise up and the slope estimate gets dragged around.
      </DemoP>
      <DemoP>
        <b>Logistic regression</b> swaps the line for a probability — the sigmoid of
        <i> w·x + b</i> — and the loss for binary cross-entropy. No closed form, so we
        run real gradient descent: hit TRAIN and watch the boundary rotate toward the
        violet/blue gap as the loss falls. Shift-click to add class-0 points and see
        the model adapt.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        These two models are the floor of supervised learning, and almost every model
        you'll meet later is a generalization. Linear regression's least-squares fit is
        the same math as PCA and the linear case of LoRA — it's projecting onto a
        subspace. Logistic regression is literally the last layer of a classifier
        neural net: <i>softmax</i> over logits is multi-class logistic regression
        stitched onto learned features.
      </DemoP>
      <DemoP>
        The <b>loss</b> choice — MSE vs binary cross-entropy — is your first feel for
        why we pick losses: MSE assumes Gaussian noise, BCE assumes Bernoulli outcomes;
        match the noise model to the data or training fights you. And the <b>gradient
        descent</b> you're watching on the logistic side is the same algorithm scaled
        up to a billion parameters in modern training; the only thing that changed is
        what's between the input and the loss.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Linear & Logistic Regression"
      subtitle="The line of best fit, the residual sticks that define it, and the sigmoid boundary you train with gradient descent."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/supervised-learning/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="blue" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<RegressionDemo />);
