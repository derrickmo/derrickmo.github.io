// demos/active-learning.jsx — active learning vs random labeling.
//
// Labels are expensive; which points should you pay to label? Two learners draw
// from the same unlabeled pool: ACTIVE uses uncertainty sampling (label the point
// closest to its current decision boundary), RANDOM labels a random point. Both
// fit a real logistic-regression boundary (gradient descent) on their growing
// labeled set each round, and we race their accuracy as labels accumulate. Active
// reaches high accuracy with far fewer labels — the core promise of active
// learning — because boundary-straddling points are the most informative.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480;
const NPOOL = 180, CAP = 60;
const sigmoid = (z) => 1 / (1 + Math.exp(-z));
function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

const dx = (x) => 30 + ((x + 3.2) / 6.4) * (W - 60);
const dy = (y) => 44 + ((2.6 - y) / 5.2) * 256;

function fitLR(pts) {                       // logistic regression by GD
  let w0 = 0, w1 = 0, b = 0;
  if (pts.length < 2) return { w0, w1, b };
  const lr = 0.4;
  for (let it = 0; it < 250; it++) {
    let g0 = 0, g1 = 0, gb = 0;
    pts.forEach(p => { const pr = sigmoid(w0 * p.x + w1 * p.y + b) - p.label; g0 += pr * p.x; g1 += pr * p.y; gb += pr; });
    const n = pts.length; w0 -= lr * g0 / n; w1 -= lr * g1 / n; b -= lr * gb / n;
  }
  return { w0, w1, b };
}

function ActiveLearningDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const lastRef = _useRef(0);

  const [overlap, setOverlap] = _useState(0.9);
  const [batch, setBatch] = _useState(1);
  const [running, setRunning] = _useState(false);
  const [, force] = _useState(0);
  const st = _useRef(null);

  function build() {
    const pool = [];
    for (let i = 0; i < NPOOL; i++) {
      const c = i < NPOOL / 2 ? 0 : 1;
      const cx = c === 0 ? -1.1 : 1.1;
      pool.push({ x: cx + overlap * randn(), y: overlap * randn() * 1.1, label: c });
    }
    // shared seed: one labeled point per class
    const seedA = pool.findIndex(p => p.label === 0), seedB = pool.findIndex(p => p.label === 1);
    const A = new Set([seedA, seedB]), R = new Set([seedA, seedB]);
    st.current = { pool, A, R, wA: fitLR([pool[seedA], pool[seedB]]), wR: fitLR([pool[seedA], pool[seedB]]), hist: [] };
    record();
  }
  function acc(w) {
    const s = st.current; let c = 0;
    s.pool.forEach(p => { const pred = (w.w0 * p.x + w.w1 * p.y + w.b) > 0 ? 1 : 0; if (pred === p.label) c++; });
    return c / s.pool.length;
  }
  function record() { const s = st.current; s.hist.push({ n: s.A.size, accA: acc(s.wA), accR: acc(s.wR) }); }

  function step() {
    const s = st.current; if (!s || s.A.size >= CAP) return;
    for (let b = 0; b < batch && s.A.size < CAP; b++) {
      // ACTIVE: most uncertain unlabeled point under current boundary
      let best = -1, bestM = Infinity;
      for (let i = 0; i < s.pool.length; i++) {
        if (s.A.has(i)) continue;
        const m = Math.abs(s.wA.w0 * s.pool[i].x + s.wA.w1 * s.pool[i].y + s.wA.b);
        if (m < bestM) { bestM = m; best = i; }
      }
      if (best >= 0) s.A.add(best);
      // RANDOM: a random unlabeled point
      const unl = []; for (let i = 0; i < s.pool.length; i++) if (!s.R.has(i)) unl.push(i);
      if (unl.length) s.R.add(unl[(Math.random() * unl.length) | 0]);
    }
    s.wA = fitLR([...s.A].map(i => s.pool[i]));
    s.wR = fitLR([...s.R].map(i => s.pool[i]));
    record();
  }

  _useEffect(() => { build(); force(x => x + 1); /* eslint-disable-next-line */ }, [overlap]);

  _useEffect(() => {
    if (!running) return;
    const loop = (now) => {
      if (now - lastRef.current >= 420) { lastRef.current = now; step(); if (st.current.A.size >= CAP) setRunning(false); force(x => x + 1); }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line
  }, [running, batch]);

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const s = st.current; if (!s) return;
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("ACTIVE LEARNER  ·  small = unlabeled (predicted), solid = labeled, ring = next pick", 20, 24);

    // unlabeled points colored by active prediction
    s.pool.forEach((p, i) => {
      if (s.A.has(i)) return;
      const pred = (s.wA.w0 * p.x + s.wA.w1 * p.y + s.wA.b) > 0 ? 1 : 0;
      ctx.fillStyle = pred === 1 ? "rgba(168,85,247,0.28)" : "rgba(96,165,250,0.28)";
      ctx.beginPath(); ctx.arc(dx(p.x), dy(p.y), 3, 0, Math.PI * 2); ctx.fill();
    });
    // decision boundary (active): w0 x + w1 y + b = 0
    if (Math.abs(s.wA.w1) > 1e-3) {
      const yAt = (x) => -(s.wA.w0 * x + s.wA.b) / s.wA.w1;
      ctx.strokeStyle = "rgba(226,232,240,0.6)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(dx(-3.2), dy(yAt(-3.2))); ctx.lineTo(dx(3.2), dy(yAt(3.2))); ctx.stroke();
    }
    // labeled points (active) — true class, solid
    s.A.forEach(i => {
      const p = s.pool[i];
      ctx.fillStyle = p.label === 1 ? "#a855f7" : "#60a5fa";
      ctx.beginPath(); ctx.arc(dx(p.x), dy(p.y), 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(15,23,42,0.8)"; ctx.lineWidth = 1; ctx.stroke();
    });
    // next pick ring
    if (s.A.size < CAP) {
      let best = -1, bestM = Infinity;
      for (let i = 0; i < s.pool.length; i++) { if (s.A.has(i)) continue; const m = Math.abs(s.wA.w0 * s.pool[i].x + s.wA.w1 * s.pool[i].y + s.wA.b); if (m < bestM) { bestM = m; best = i; } }
      if (best >= 0) { const p = s.pool[best]; ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(dx(p.x), dy(p.y), 9, 0, Math.PI * 2); ctx.stroke(); }
    }

    // learning curve
    const cY = 318, cH = H - cY - 16, cX = 30, cW = W - 60;
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono";
    ctx.fillText("ACCURACY vs LABELS  ·  active (blue) vs random (slate)", cX, cY - 6);
    ctx.strokeStyle = "rgba(96,165,250,0.18)"; ctx.strokeRect(cX, cY, cW, cH);
    const xOf = (n) => cX + (n / CAP) * cW;
    const yOf = (a) => cY + cH - ((a - 0.5) / 0.5) * (cH - 8) - 4;  // 0.5..1
    [0.5, 0.75, 1].forEach(v => { ctx.strokeStyle = "rgba(148,163,184,0.12)"; ctx.beginPath(); ctx.moveTo(cX, yOf(v)); ctx.lineTo(cX + cW, yOf(v)); ctx.stroke(); });
    const plot = (key, color) => {
      ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.beginPath();
      s.hist.forEach((h, i) => { const x = xOf(h.n), y = yOf(h[key]); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
      ctx.stroke();
    };
    if (s.hist.length > 1) { plot("accR", "rgba(148,163,184,0.8)"); plot("accA", "#60a5fa"); }
    ctx.fillStyle = "rgba(148,163,184,0.6)"; ctx.font = "9px JetBrains Mono";
    ctx.fillText("50%", cX + 2, yOf(0.5) - 2); ctx.fillText("100%", cX + 2, yOf(1) + 10);
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  });

  const s = st.current;
  const accA = s ? (s.hist.length ? s.hist[s.hist.length - 1].accA : 0) : 0;
  const accR = s ? (s.hist.length ? s.hist[s.hist.length - 1].accR : 0) : 0;
  const nLab = s ? s.A.size : 0;
  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// CLASS OVERLAP" min={0.5} max={1.6} step={0.1} value={overlap} onChange={setOverlap} tone="violet"
        help="How much the two classes bleed into each other. More overlap makes the boundary genuinely fuzzy — that's where active learning's edge over random is largest, because it spends labels exactly on the ambiguous middle." />
      <Slider label="// LABELS / STEP" min={1} max={5} step={1} value={batch} onChange={setBatch}
        help="How many points each learner labels per step. Batch mode is realistic (you annotate in batches), though greedily picking several near the same spot is why real batch active learning adds diversity." />
      <DemoButton onClick={() => { if (s && s.A.size >= CAP) build(); setRunning(r => !r); }} primary>{running ? "PAUSE" : (s && s.A.size >= CAP ? "RESTART" : "RUN")}</DemoButton>
      <DemoButton onClick={() => { step(); force(x => x + 1); }}>STEP</DemoButton>
      <DemoButton onClick={() => { build(); force(x => x + 1); }}>RESET</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="LABELS" value={nLab + "/" + CAP} />
        <StatReadout label="ACTIVE ACC" value={(accA * 100).toFixed(0) + "%"} accent="#60a5fa" />
      </div>
      <StatReadout label="RANDOM ACC" value={(accR * 100).toFixed(0) + "%"} accent="#94a3b8" />
      <Legend items={[
        { color: "#60a5fa", label: "class 0 / active" },
        { color: "#a855f7", label: "class 1" },
        { color: "#fbbf24", label: "next label (most uncertain)" },
        { color: "#94a3b8", label: "random baseline" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        The expensive thing in supervised ML is rarely compute — it's labels. Active
        learning asks the model to choose what to label next. The cheapest useful
        rule is uncertainty sampling: label the point the model is least sure about,
        which here is the unlabeled point sitting closest to the decision boundary
        (the yellow ring). Each round both learners fit the same logistic boundary
        on their labeled sets; the blue one picks by uncertainty, the slate one
        picks at random.
      </DemoP>
      <DemoP>
        Watch the accuracy race at the bottom: the blue active curve climbs to high
        accuracy with a fraction of the labels the random curve needs, because every
        label it spends pins down the ambiguous middle instead of re-confirming
        points deep inside a class. Crank CLASS OVERLAP up and the gap widens —
        fuzzy boundaries are exactly where choosing well pays off. The active picks
        visibly cluster along the boundary, not the easy interiors.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Active learning is the heart of data-centric ML: improve the model by
        improving <i>which</i> data gets labeled, not the architecture. Uncertainty
        sampling shown here is the simplest acquisition function; others score by
        margin, entropy, expected model change, or query-by-committee disagreement.
        It's the engine behind efficient annotation pipelines and human-in-the-loop
        labeling, and it connects to the same boundary-confidence signal you tune in{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/svm/`} style={{ color: "#a855f7" }}>SVM</a>{" "}
        margins and{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/calibration/`} style={{ color: "#a855f7" }}>calibration</a>.
      </DemoP>
      <DemoP>
        The caveats the demo hints at: greedy uncertainty sampling in a batch can
        pick many near-identical points (real systems add diversity/coverage terms);
        it can chase outliers or mislabeled points; and the chosen labels are no
        longer i.i.d., which biases naive evaluation. Done well it slashes labeling
        cost dramatically; done naively it can underperform plain random — which is
        why acquisition-function design is its own small field.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Active Learning"
      subtitle="Labels are expensive — so let the model pick what to label. Uncertainty sampling races random labeling, and reaches high accuracy with far fewer labels."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/ml-theory/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ActiveLearningDemo />);
