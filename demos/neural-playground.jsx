// demos/neural-playground.jsx — train a small MLP live on 2D data and watch the
// decision boundary form. Real forward/backprop in JS (no libraries).

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 420, H = 420, GRID = 44;

function genData(kind, n = 220) {
  const pts = [];
  const R = () => Math.random() * 2 - 1;
  for (let i = 0; i < n; i++) {
    let x, y, label;
    if (kind === "xor") { x = R(); y = R(); label = (x > 0) === (y > 0) ? 1 : 0; }
    else if (kind === "circle") { const a = Math.random() * Math.PI * 2; const r = Math.random(); x = Math.cos(a) * r; y = Math.sin(a) * r; label = r < 0.5 ? 1 : 0; x += R() * 0.04; y += R() * 0.04; }
    else if (kind === "spiral") {
      const arm = i % 2; const t = (i / n) * 4 * Math.PI + arm * Math.PI; const r = (i / n) * 0.95 + 0.05;
      x = Math.cos(t) * r + R() * 0.05; y = Math.sin(t) * r + R() * 0.05; label = arm;
    } else { const c = i % 2 ? 0.45 : -0.45; x = c + R() * 0.35; y = c + R() * 0.35; label = i % 2; }
    pts.push({ x, y, label });
  }
  return pts;
}

const act = (z, kind) => kind === "relu" ? Math.max(0, z) : Math.tanh(z);
const dact = (z, a, kind) => kind === "relu" ? (z > 0 ? 1 : 0) : (1 - a * a);
const sig = z => 1 / (1 + Math.exp(-z));

function buildNet(hidden, units) {
  const sizes = [2]; for (let i = 0; i < hidden; i++) sizes.push(units); sizes.push(1);
  const Wt = [], b = [];
  for (let l = 0; l < sizes.length - 1; l++) {
    const fin = sizes[l], fout = sizes[l + 1];
    const w = []; for (let o = 0; o < fout; o++) { const row = []; for (let i = 0; i < fin; i++) row.push((Math.random() * 2 - 1) * Math.sqrt(1 / fin)); w.push(row); }
    Wt.push(w); b.push(new Array(fout).fill(0));
  }
  return { sizes, W: Wt, b };
}

function NeuralPlaygroundDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const dataRef = _useRef(genData("xor"));
  const netRef = _useRef(buildNet(1, 6));
  const rafRef = _useRef(null);

  const [dataset, setDataset] = _useState("xor");
  const [hidden, setHidden] = _useState(1);
  const [units, setUnits] = _useState(6);
  const [actKind, setActKind] = _useState("tanh");
  const [lr, setLr] = _useState(0.1);
  const [speed, setSpeed] = _useState(5);
  const [running, setRunning] = _useState(false);
  const [epoch, setEpoch] = _useState(0);
  const [loss, setLoss] = _useState(0);
  const [acc, setAcc] = _useState(0);

  const lrRef = _useRef(lr), spRef = _useRef(speed), actRef = _useRef(actKind);
  _useEffect(() => { lrRef.current = lr; }, [lr]);
  _useEffect(() => { spRef.current = speed; }, [speed]);
  _useEffect(() => { actRef.current = actKind; }, [actKind]);

  function forward(net, x0, y0, cache) {
    let a = [x0, y0]; if (cache) { cache.a = [a]; cache.z = []; }
    for (let l = 0; l < net.W.length; l++) {
      const w = net.W[l], b = net.b[l], out = [];
      for (let o = 0; o < w.length; o++) { let s = b[o]; for (let i = 0; i < a.length; i++) s += w[o][i] * a[i]; out.push(s); }
      if (cache) cache.z.push(out.slice());
      const last = l === net.W.length - 1;
      a = out.map(z => last ? sig(z) : act(z, actRef.current));
      if (cache) cache.a.push(a);
    }
    return a[0];
  }

  function trainEpoch() {
    const net = netRef.current, data = dataRef.current, N = data.length, lr = lrRef.current;
    const gW = net.W.map(w => w.map(r => r.map(() => 0)));
    const gB = net.b.map(b => b.map(() => 0));
    let L = 0, correct = 0;
    for (const p of data) {
      const cache = {};
      const o = forward(net, p.x, p.y, cache);
      const eps = 1e-7; L += -(p.label * Math.log(o + eps) + (1 - p.label) * Math.log(1 - o + eps));
      if ((o > 0.5 ? 1 : 0) === p.label) correct++;
      // backprop
      let delta = [o - p.label]; // dL/dz at output
      for (let l = net.W.length - 1; l >= 0; l--) {
        const aIn = cache.a[l];
        for (let oi = 0; oi < net.W[l].length; oi++) { for (let ii = 0; ii < aIn.length; ii++) gW[l][oi][ii] += delta[oi] * aIn[ii]; gB[l][oi] += delta[oi]; }
        if (l > 0) {
          const prevZ = cache.z[l - 1], prevA = cache.a[l];
          const newDelta = new Array(aIn.length).fill(0);
          for (let ii = 0; ii < aIn.length; ii++) { let s = 0; for (let oi = 0; oi < net.W[l].length; oi++) s += net.W[l][oi][ii] * delta[oi]; newDelta[ii] = s * dact(prevZ[ii], aIn[ii], actRef.current); }
          delta = newDelta;
        }
      }
    }
    for (let l = 0; l < net.W.length; l++) { for (let o = 0; o < net.W[l].length; o++) { for (let i = 0; i < net.W[l][o].length; i++) net.W[l][o][i] -= lr * gW[l][o][i] / N; net.b[l][o] -= lr * gB[l][o] / N; } }
    setLoss(+(L / N).toFixed(4)); setAcc(Math.round(100 * correct / N));
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    const net = netRef.current, cs = W / GRID;
    for (let gx = 0; gx < GRID; gx++) for (let gy = 0; gy < GRID; gy++) {
      const x = (gx / (GRID - 1)) * 2 - 1, y = 1 - (gy / (GRID - 1)) * 2;
      const o = forward(net, x, y);
      // blue(0) -> dark -> violet(1)
      const t = o; const lo = [59, 130, 246], mid = [10, 20, 40], hi = [192, 132, 252];
      const c = t < 0.5 ? lo.map((v, i) => Math.round(v + (mid[i] - v) * (t / 0.5))) : mid.map((v, i) => Math.round(v + (hi[i] - v) * ((t - 0.5) / 0.5)));
      ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
      ctx.fillRect(gx * cs, gy * cs, cs + 1, cs + 1);
    }
    for (const p of dataRef.current) {
      const px = (p.x + 1) / 2 * W, py = (1 - p.y) / 2 * H;
      ctx.fillStyle = p.label ? "#c084fc" : "#60a5fa";
      ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  }

  function rebuild() { netRef.current = buildNet(hidden, units); setEpoch(0); draw(); }
  function reseed() { setRunning(false); dataRef.current = genData(dataset); rebuild(); }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  }, []);
  _useEffect(() => { setRunning(false); netRef.current = buildNet(hidden, units); setEpoch(0); draw(); }, [hidden, units]);
  _useEffect(() => { setRunning(false); dataRef.current = genData(dataset); netRef.current = buildNet(hidden, units); setEpoch(0); draw(); }, [dataset]);

  _useEffect(() => {
    if (!running) return;
    let alive = true;
    const loop = () => {
      if (!alive) return;
      for (let i = 0; i < spRef.current; i++) trainEpoch();
      setEpoch(e => e + spRef.current); draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, [running]);

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;

  const controls = (
    <ControlGroup>
      <SegmentedControl label="// DATASET" value={dataset} onChange={setDataset}
        options={[{ value: "xor", label: "XOR" }, { value: "circle", label: "Circle" }, { value: "spiral", label: "Spiral" }, { value: "gauss", label: "Blobs" }]}
        help="The pattern to separate. Blobs are linearly separable; XOR, Circle, and Spiral are not, so they need hidden layers to solve." />
      <Slider label="// HIDDEN LAYERS" min={0} max={3} value={hidden} onChange={setHidden} tone="violet"
        help="Network depth. 0 = plain logistic regression (straight boundary only); adding layers lets the net compose curved, nonlinear boundaries." />
      <Slider label="// UNITS / LAYER" min={2} max={9} value={units} onChange={setUnits}
        help="Width — neurons per hidden layer. More units give more capacity to carve fine detail (and more ways to overfit)." />
      <SegmentedControl label="// ACTIVATION" value={actKind} onChange={v => { setRunning(false); setActKind(v); }}
        options={[{ value: "tanh", label: "tanh" }, { value: "relu", label: "ReLU" }]}
        help="The per-neuron nonlinearity. tanh is smooth and bounded; ReLU is piecewise-linear — they give the boundary a different texture and train differently." />
      <Slider label="// LEARNING RATE" min={0.01} max={1} step={0.01} value={lr} onChange={setLr}
        help="Step size for gradient descent. Too low learns slowly; too high makes the loss thrash and the boundary flicker instead of settling." />
      <Slider label="// EPOCHS / FRAME" min={1} max={20} value={speed} onChange={setSpeed}
        help="How many full training passes run per animation frame. Visual pacing — higher just fast-forwards the same training." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setRunning(r => !r)} primary>{running ? "PAUSE" : "TRAIN"}</DemoButton>
        <DemoButton onClick={rebuild}>RE-INIT</DemoButton>
        <DemoButton onClick={reseed} tone="violet">NEW DATA</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="EPOCH" value={epoch} />
        <StatReadout label="LOSS" value={loss} accent="var(--violet-lt)" />
      </div>
      <StatReadout label="ACCURACY" value={acc + "%"} accent="#34d399" />
      <Legend items={[{ color: "#60a5fa", label: "CLASS 0" }, { color: "#c084fc", label: "CLASS 1" }]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        This is a real multilayer perceptron — forward pass and backpropagation
        written from scratch, training on the 2D points by gradient descent on
        binary cross-entropy. The background shows the network's current decision
        surface: how confidently it predicts class 0 (blue) vs class 1 (violet) at
        every point in the plane. Watch it bend and fold as the weights update.
      </DemoP>
      <DemoP>
        Set <b>hidden layers to 0</b> and try XOR or Spiral — a linear model
        (logistic regression) can only draw a straight boundary, so it fails. Add a
        hidden layer and enough units and the same network suddenly carves curves
        and islands. That jump is the whole point of depth: composing simple units
        into nonlinear features. <b>ReLU vs tanh</b> changes the texture of the
        boundary; too high a <b>learning rate</b> makes loss thrash instead of
        settle.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        This is the entire deep-learning loop in miniature — forward pass, cross-entropy
        loss, backpropagation, gradient descent — the exact machinery (just far bigger)
        behind every modern network. The jump from "0 hidden layers fails on XOR" to "one
        hidden layer solves it" is the <b>universal approximation theorem</b> made visible:
        depth and nonlinearity let a net <i>build features</i> instead of merely weighting
        the raw inputs.
      </DemoP>
      <DemoP>
        Every knob maps to a real training decision — depth versus width, activation
        choice, and the learning rate that makes or breaks convergence. A too-high rate
        thrashing the loss, or a too-small net underfitting the spiral, is the same
        diagnostic loop practitioners run on production models. The one thing this toy
        hides is the validation curve you'd watch there to catch overfitting before it
        ships.
      </DemoP>
    </>
  );
  return (
    <DemoLayout
      topic="NEURAL NETWORKS"
      title="Neural Playground"
      subtitle="Train a small neural net live on 2D data and watch its decision boundary take shape."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="blue"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<NeuralPlaygroundDemo />);
