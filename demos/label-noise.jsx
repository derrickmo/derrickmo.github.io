// demos/label-noise.jsx — training under label noise + memorization.
//
// Flip a fraction of the TRAINING labels, then fit a real 2->10->1 MLP (gradient
// descent) and evaluate on a clean held-out test set. Two accuracies tell the
// story: accuracy on the (noisy) training labels vs accuracy on the true test
// labels. Early on the model fits the real cluster structure; with enough epochs
// it starts memorizing the flipped points — the boundary warps around them, train
// accuracy on noisy labels climbs, and TRUE test accuracy falls. The gap between
// them is memorization, and the dip motivates early stopping / robust training.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480, HID = 10;
const sigmoid = (z) => 1 / (1 + Math.exp(-z));
function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

function LabelNoiseDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [noise, setNoise] = _useState(0.2);
  const [epochs, setEpochs] = _useState(250);
  const [, force] = _useState(0);
  const dataRef = _useRef(null);
  const netRef = _useRef(null);

  function genData() {
    const mk = (n, flip) => Array.from({ length: n }, (_, i) => {
      const cls = i % 2, cx = cls === 0 ? -0.95 : 0.95, cy = (i % 4 < 2 ? -0.6 : 0.6) * (cls === 0 ? 1 : -1);
      const x = cx + 0.5 * randn(), y = cy + 0.5 * randn();
      const flipped = flip && Math.random() < noise;
      return { x, y, t: cls, label: flipped ? 1 - cls : cls, flipped };
    });
    dataRef.current = { train: mk(150, true), test: mk(150, false) };
  }
  function train() {
    if (!dataRef.current) genData();
    const tr = dataRef.current.train;
    let W1 = Array.from({ length: HID }, () => [randn() * 0.8, randn() * 0.8]), b1 = new Float64Array(HID);
    let W2 = Array.from({ length: HID }, () => randn() * 0.8), b2 = 0;
    const lr = 0.3;
    for (let it = 0; it < epochs; it++) {
      const gW1 = Array.from({ length: HID }, () => [0, 0]), gb1 = new Float64Array(HID), gW2 = new Float64Array(HID); let gb2 = 0;
      tr.forEach(d => {
        const h = new Float64Array(HID); for (let j = 0; j < HID; j++) h[j] = Math.tanh(W1[j][0] * d.x + W1[j][1] * d.y + b1[j]);
        let o = b2; for (let j = 0; j < HID; j++) o += W2[j] * h[j];
        const e = sigmoid(o) - d.label;
        for (let j = 0; j < HID; j++) { gW2[j] += e * h[j]; const dh = e * W2[j] * (1 - h[j] * h[j]); gW1[j][0] += dh * d.x; gW1[j][1] += dh * d.y; gb1[j] += dh; }
        gb2 += e;
      });
      const n = tr.length, s = lr / n;
      for (let j = 0; j < HID; j++) { W1[j][0] -= s * gW1[j][0]; W1[j][1] -= s * gW1[j][1]; b1[j] -= s * gb1[j]; W2[j] -= s * gW2[j]; }
      b2 -= s * gb2;
    }
    netRef.current = { W1, b1, W2, b2 };
    force(x => x + 1);
  }
  function fresh() { genData(); train(); }
  _useEffect(() => { fresh(); /* eslint-disable-next-line */ }, [noise]);
  _useEffect(() => { if (dataRef.current) train(); /* eslint-disable-next-line */ }, [epochs]);

  const net = netRef.current, data = dataRef.current;
  const pred = (x, y) => { if (!net) return 0; const h = net.W1.map((w, j) => Math.tanh(w[0] * x + w[1] * y + net.b1[j])); let o = net.b2; for (let j = 0; j < HID; j++) o += net.W2[j] * h[j]; return sigmoid(o) > 0.5 ? 1 : 0; };
  let trainAcc = 0, testAcc = 0;
  if (net && data) {
    data.train.forEach(d => { if (pred(d.x, d.y) === d.label) trainAcc++; }); trainAcc /= data.train.length;
    data.test.forEach(d => { if (pred(d.x, d.y) === d.t) testAcc++; }); testAcc /= data.test.length;
  }

  function draw() {
    const cv = canvasRef.current; if (!cv || !net || !data) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#94a3b8"; ctx.fillText("TRAINING DATA  ·  ringed = label flipped (noise) · shading = learned regions", 20, 22);

    const R = 2.4, px = 30, py = 36, pw = W - 60, ph = 290;
    const sx = (x) => px + ((x + R) / (2 * R)) * pw, sy = (y) => py + ph - ((y + R) / (2 * R)) * ph;
    const step = 14;
    for (let gx = px; gx < px + pw; gx += step) for (let gy = py; gy < py + ph; gy += step) {
      const x = ((gx - px) / pw) * 2 * R - R, y = ((py + ph - gy) / ph) * 2 * R - R;
      ctx.fillStyle = pred(x, y) === 1 ? "rgba(168,85,247,0.13)" : "rgba(96,165,250,0.13)";
      ctx.fillRect(gx, gy, step, step);
    }
    data.train.forEach(d => {
      ctx.fillStyle = d.label === 1 ? "#a855f7" : "#60a5fa";
      ctx.beginPath(); ctx.arc(sx(d.x), sy(d.y), 3.5, 0, Math.PI * 2); ctx.fill();
      if (d.flipped) { ctx.strokeStyle = "#f87171"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx(d.x), sy(d.y), 6, 0, Math.PI * 2); ctx.stroke(); }
    });

    // accuracy bars
    const by = py + ph + 36;
    ctx.font = "11px JetBrains Mono";
    const bar = (yy, label, v, col) => {
      ctx.fillStyle = "#94a3b8"; ctx.fillText(label, 30, yy + 12);
      ctx.fillStyle = "rgba(148,163,184,0.15)"; ctx.fillRect(190, yy, W - 270, 16);
      ctx.fillStyle = col; ctx.fillRect(190, yy, (W - 270) * v, 16);
      ctx.fillStyle = "#e2e8f0"; ctx.fillText((v * 100).toFixed(0) + "%", 190 + (W - 270) * v + 6, yy + 12);
    };
    bar(by, "train acc (noisy labels)", trainAcc, "rgba(251,191,36,0.8)");
    bar(by + 28, "TRUE test acc (clean)", testAcc, "rgba(52,211,153,0.85)");
    const gap = trainAcc - testAcc;
    ctx.fillStyle = gap > 0.12 ? "#f87171" : "#64748b"; ctx.font = "10px JetBrains Mono";
    ctx.fillText("memorization gap: " + (gap * 100).toFixed(0) + "pt" + (gap > 0.12 ? "  (model is fitting the noise)" : ""), 30, by + 56);
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  });

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// LABEL NOISE" min={0} max={0.4} step={0.05} value={noise} onChange={setNoise} tone="violet"
        help="Fraction of training labels randomly flipped to the wrong class (ringed red). The test set stays clean. As noise rises, true test accuracy falls — and a flexible model starts contorting its boundary to fit the mislabeled points." />
      <Slider label="// EPOCHS" min={20} max={600} step={20} value={epochs} onChange={setEpochs}
        help="How long to train. Early on the net fits the real cluster structure and ignores the noise (good test accuracy); train too long and it memorizes the flipped points — train-on-noisy accuracy climbs while TRUE test accuracy dips. That's the early-stopping argument." />
      <DemoButton onClick={fresh} primary>NEW DATA</DemoButton>
      <DemoButton onClick={train}>RETRAIN</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="TRUE TEST" value={(testAcc * 100).toFixed(0) + "%"} accent={testAcc > 0.85 ? "#34d399" : "#fbbf24"} />
        <StatReadout label="NOISY TRAIN" value={(trainAcc * 100).toFixed(0) + "%"} accent="#fbbf24" />
      </div>
      <StatReadout label="MEMORIZATION GAP" value={((trainAcc - testAcc) * 100).toFixed(0) + "pt"} accent={(trainAcc - testAcc) > 0.12 ? "#f87171" : "#34d399"} />
      <Legend items={[
        { color: "#60a5fa", label: "class 0" },
        { color: "#a855f7", label: "class 1" },
        { color: "#f87171", label: "flipped label" },
        { color: "#34d399", label: "true test acc" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Real datasets are mislabeled — crowdsourced tags, weak supervision, plain
        human error. Here a slice of the training labels (ringed red) is flipped to
        the wrong class, while the test set stays clean. A flexible network has
        enough capacity to fit those wrong points, so its decision boundary buckles
        and pokes out toward each mislabeled example, carving little islands of the
        wrong color around them.
      </DemoP>
      <DemoP>
        Watch the two accuracy bars. With moderate training the net latches onto the
        genuine cluster structure and shrugs off the noise — true test accuracy
        stays high even though it's "wrong" on the flipped training labels. Push
        EPOCHS up and it memorizes: accuracy on the noisy labels climbs while TRUE
        test accuracy sags, opening a memorization gap. That gap is exactly why
        practitioners use early stopping, robust losses, label smoothing, and data
        cleaning — and it's the dark side of the same capacity that lets nets
        generalize.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Learning with noisy labels is a core data-centric ML problem: label quality
        often matters more than model architecture. The memorization you can trigger
        here is a real phenomenon — deep nets can fit randomly labeled data given
        enough capacity and epochs (Zhang et al., 2017), yet they tend to learn the
        clean, generalizable patterns first. That ordering is what early stopping
        exploits, and it connects straight to{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/overfitting/`} style={{ color: "#a855f7" }}>overfitting</a>{" "}
        and the bias-variance tradeoff.
      </DemoP>
      <DemoP>
        Mitigations span the pipeline: robust losses (MAE, generalized cross-entropy,
        bootstrapping), label smoothing, co-teaching and small-loss sample selection,
        confident-learning to find and drop likely-bad labels, and simply auditing
        the data. It also pairs with{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/active-learning/`} style={{ color: "#a855f7" }}>active
        learning</a> (spend the labeling budget well) and{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/calibration/`} style={{ color: "#a855f7" }}>calibration</a>{" "}
        (noise inflates overconfidence) — three faces of the trustworthy-ML question
        of whether you can believe your data and your model.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Label Noise"
      subtitle="Flip some training labels and watch the boundary warp around them. Train longer and the model memorizes the noise — true accuracy falls while train accuracy climbs."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/ml-theory/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<LabelNoiseDemo />);
