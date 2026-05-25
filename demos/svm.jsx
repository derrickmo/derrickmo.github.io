// demos/svm.jsx — support vector machines: the max-margin boundary and the
// kernel trick. Real kernelized Pegasos (sub-gradient SVM) trained in-browser.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  SegmentedControl, Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 440, H = 440, SC = 130;
const cx = W / 2, cy = H / 2;
const px = (x) => cx + x * SC, py = (y) => cy - y * SC;
const ix = (sx) => (sx - cx) / SC, iy = (sy) => (cy - sy) / SC;
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

function genData(kind, n = 70) {
  const pts = [];
  if (kind === "linear") {
    for (let i = 0; i < n; i++) { const s = i % 2 ? 1 : -1; pts.push({ x: s * 0.55 + gauss() * 0.28, y: s * 0.35 + gauss() * 0.32, label: s }); }
  } else if (kind === "circular") {
    for (let i = 0; i < n; i++) {
      if (i % 2) { const a = Math.random() * 2 * Math.PI, r = 0.35 * Math.abs(gauss()) * 0.6 + 0.15; pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, label: 1 }); }
      else { const a = Math.random() * 2 * Math.PI, r = 1.0 + gauss() * 0.09; pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, label: -1 }); }
    }
  } else { // xor
    for (let i = 0; i < n; i++) { const qx = i % 2 ? 0.6 : -0.6, qy = (i >> 1) % 2 ? 0.6 : -0.6; pts.push({ x: qx + gauss() * 0.22, y: qy + gauss() * 0.22, label: qx * qy > 0 ? 1 : -1 }); }
  }
  return pts;
}

function kernel(a, b, type, gamma) {
  if (type === "linear") return a.x * b.x + a.y * b.y + 1;
  const dx = a.x - b.x, dy = a.y - b.y; return Math.exp(-gamma * (dx * dx + dy * dy));
}

// kernelized Pegasos — returns per-point coefficients beta_i = alpha_i*y_i/(lambda*T)
function train(pts, type, gamma, C, iters = 4000) {
  const n = pts.length, lambda = 1 / (n * C), alpha = new Array(n).fill(0);
  for (let t = 1; t <= iters; t++) {
    const i = (Math.random() * n) | 0;
    let s = 0;
    for (let j = 0; j < n; j++) if (alpha[j]) s += alpha[j] * pts[j].label * kernel(pts[j], pts[i], type, gamma);
    s /= (lambda * t);
    if (pts[i].label * s < 1) alpha[i] += 1;
  }
  const beta = pts.map((p, j) => alpha[j] * p.label / (lambda * iters));
  return { beta, sv: alpha.map(a => a > 0) };
}

function SVMDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const dataRef = _useRef(genData("linear"));
  const modelRef = _useRef(null);
  const [dataset, setDataset] = _useState("linear");
  const [type, setType] = _useState("linear");
  const [gamma, setGamma] = _useState(2.5);
  const [C, setC] = _useState(5);
  const [stats, setStats] = _useState({ sv: 0, acc: 0 });

  function decide(p) {
    const m = modelRef.current; if (!m) return 0;
    const pts = dataRef.current; let s = 0;
    for (let j = 0; j < pts.length; j++) if (m.beta[j]) s += m.beta[j] * kernel(pts[j], p, type, gamma);
    return s;
  }

  function fit() {
    modelRef.current = train(dataRef.current, type, gamma, C);
    const pts = dataRef.current; let correct = 0;
    for (const p of pts) if (Math.sign(decide(p)) === p.label) correct++;
    setStats({ sv: modelRef.current.sv.filter(Boolean).length, acc: Math.round(100 * correct / pts.length) });
    draw();
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const pts = dataRef.current, m = modelRef.current;

    // decision field
    if (m) {
      const step = 7;
      for (let sx = 0; sx < W; sx += step) for (let sy = 0; sy < H; sy += step) {
        const f = decide({ x: ix(sx + step / 2), y: iy(sy + step / 2) });
        const mag = Math.min(1, Math.abs(f));
        if (f >= 0) ctx.fillStyle = `rgba(59,130,246,${0.06 + 0.16 * mag})`;
        else ctx.fillStyle = `rgba(168,85,247,${0.06 + 0.16 * mag})`;
        ctx.fillRect(sx, sy, step, step);
      }
      // margin band |f| < 1 + boundary f = 0, via marching the field at cell corners
      const gs = 4;
      for (let sx = 0; sx < W; sx += gs) for (let sy = 0; sy < H; sy += gs) {
        const f = decide({ x: ix(sx), y: iy(sy) });
        const af = Math.abs(f);
        if (af < 0.04) { ctx.fillStyle = "#e0e7ff"; ctx.fillRect(sx - 1, sy - 1, 2.4, 2.4); }
        else if (Math.abs(af - 1) < 0.04) { ctx.fillStyle = "rgba(224,231,255,0.4)"; ctx.fillRect(sx - 1, sy - 1, 2, 2); }
      }
    }

    // points
    for (let j = 0; j < pts.length; j++) {
      const p = pts[j], isSV = m && m.sv[j];
      ctx.beginPath(); ctx.arc(px(p.x), py(p.y), isSV ? 5.5 : 3.6, 0, Math.PI * 2);
      ctx.fillStyle = p.label > 0 ? "#60a5fa" : "#c084fc"; ctx.fill();
      if (isSV) { ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2; ctx.stroke(); }
    }
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    fit();
  }, []);
  _useEffect(() => { modelRef.current = null; dataRef.current = genData(dataset); fit(); /* eslint-disable-next-line */ }, [dataset]);
  _useEffect(() => { fit(); /* eslint-disable-next-line */ }, [type, gamma, C]);

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <SegmentedControl label="// DATASET" value={dataset} onChange={setDataset}
        options={[{ value: "linear", label: "Linear" }, { value: "circular", label: "Circular" }, { value: "xor", label: "XOR" }]}
        help="The shape of the two classes. 'Linear' is separable by a straight line; 'Circular' and 'XOR' are not — they need a kernel." />
      <SegmentedControl label="// KERNEL" value={type} onChange={setType}
        options={[{ value: "linear", label: "Linear" }, { value: "rbf", label: "RBF" }]}
        help="How similarity is measured. Linear = straight boundary; RBF measures closeness in a higher-dimensional space, letting the boundary curve around each class." />
      {type === "rbf" && <Slider label="// GAMMA (RBF width)" min={0.3} max={8} step={0.1} value={gamma} onChange={setGamma} tone="violet"
        help="How local the RBF similarity is. Low = smooth, broad influence per point; high = tight, wiggly boundary that can memorize (overfit)." />}
      <Slider label="// C (soft-margin)" min={0.2} max={20} step={0.2} value={C} onChange={setC}
        help="Regularization strength. Small C = wide, forgiving margin that tolerates misclassifications; large C = narrow margin that fits the training points hard." />
      <DemoButton onClick={() => { dataRef.current = genData(dataset); fit(); }} primary>NEW DATA</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="SUPPORT VECS" value={stats.sv} accent="#fbbf24" />
        <StatReadout label="TRAIN ACC" value={stats.acc + "%"} />
      </div>
      <Legend items={[{ color: "#60a5fa", label: "CLASS +1" }, { color: "#c084fc", label: "CLASS -1" }, { color: "#fbbf24", label: "SUPPORT VECTOR" }]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        An SVM doesn't just find <i>a</i> separating line — it finds the one with the
        widest <b>margin</b>, the empty corridor between the classes (the faint inner
        lines). Only the points touching that corridor — the
        <span style={{ color: "#fbbf24" }}> support vectors</span> (ringed) — define
        the boundary; everything else could move freely without changing it. The
        <b> C</b> slider trades margin width against misclassification: small C = wide,
        forgiving margin; large C = narrow, strict fit.
      </DemoP>
      <DemoP>
        Switch the dataset to <b>Circular</b> or <b>XOR</b> and a straight line can't
        win — flip the <b>kernel</b> to <b>RBF</b> and the boundary curves to wrap each
        class. That's the <b>kernel trick</b>: measuring similarity in a higher-
        dimensional space without ever computing the coordinates. <b>Gamma</b> sets how
        local that similarity is — crank it up and watch the model start to memorize.
        This is real kernelized Pegasos training as you drag.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        SVMs were the dominant classifier before deep learning and remain a go-to for
        small or medium tabular datasets, text categorization, and bioinformatics, where
        they're fast, robust, and need little tuning. The two ideas you're touching here
        outlast the algorithm itself: <b>max-margin</b> thinking (prefer the solution with
        the most breathing room) underpins modern generalization theory, and the
        <b> kernel trick</b> — computing similarity in a high-dimensional space without
        ever visiting it — reappears all over ML.
      </DemoP>
      <DemoP>
        The <b>C</b> knob is your first hands-on encounter with the bias-variance
        tradeoff via regularization, the same dial (weight decay, dropout strength) you
        turn on every neural network. And the kernel's similarity function is a direct
        ancestor of the dot-product <i>attention</i> that powers transformers: both score
        how related two points are and weight by it. Learn to read a margin and a kernel
        boundary and a lot of "modern" AI stops looking unfamiliar.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="SUPERVISED LEARNING" title="SVM — Margins & Kernels"
      subtitle="The widest-margin boundary, the support vectors that define it, and the kernel trick that bends it."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/supervised-learning/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="blue" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<SVMDemo />);
