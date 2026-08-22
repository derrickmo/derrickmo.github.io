// demos/decision-tree.jsx — CART decision-tree boundary builder.
// Real greedy Gini splits in JS; axis-aligned decision regions + depth control.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 460, H = 460, GRID = 60;
const COLORS = ["#60a5fa", "#c084fc", "#34d399"];
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

function genData(kind, n = 180) {
  const pts = []; const R = () => Math.random() * 2 - 1;
  for (let i = 0; i < n; i++) {
    let x, y, label;
    if (kind === "blobs") {
      const c = i % 3, a = c * 2 * Math.PI / 3;
      x = Math.cos(a) * 0.55 + gauss() * 0.18; y = Math.sin(a) * 0.55 + gauss() * 0.18; label = c;
    } else if (kind === "xor") {
      x = R(); y = R(); label = (x > 0) === (y > 0) ? 0 : 1;
    } else { // circles
      const ang = Math.random() * Math.PI * 2, r = Math.random(); x = Math.cos(ang) * r; y = Math.sin(ang) * r; label = r < 0.5 ? 1 : 0;
    }
    pts.push({ x, y, label });
  }
  return pts;
}

function gini(pts) {
  const m = {}; pts.forEach(p => { m[p.label] = (m[p.label] || 0) + 1; });
  let g = 1; for (const k in m) g -= (m[k] / pts.length) ** 2; return g;
}
function majority(pts) {
  const m = {}; pts.forEach(p => { m[p.label] = (m[p.label] || 0) + 1; });
  let best = 0, bc = -1; for (const k in m) if (m[k] > bc) { bc = m[k]; best = +k; } return best;
}
function build(pts, depth, maxDepth) {
  if (depth >= maxDepth || gini(pts) === 0 || pts.length < 4) return { leaf: true, label: majority(pts) };
  let best = null;
  for (const key of ["x", "y"]) {
    const sorted = [...pts].sort((a, b) => a[key] - b[key]);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i][key] === sorted[i - 1][key]) continue;
      const thr = (sorted[i - 1][key] + sorted[i][key]) / 2;
      const L = pts.filter(p => p[key] <= thr), Rr = pts.filter(p => p[key] > thr);
      if (!L.length || !Rr.length) continue;
      const g = (L.length * gini(L) + Rr.length * gini(Rr)) / pts.length;
      if (!best || g < best.g) best = { g, key, thr, L, Rr };
    }
  }
  if (!best) return { leaf: true, label: majority(pts) };
  return { leaf: false, key: best.key, thr: best.thr, left: build(best.L, depth + 1, maxDepth), right: build(best.Rr, depth + 1, maxDepth) };
}
function predictTree(node, x, y) { while (!node.leaf) node = ((node.key === "x" ? x : y) <= node.thr ? node.left : node.right); return node.label; }
function countLeaves(node) { return node.leaf ? 1 : countLeaves(node.left) + countLeaves(node.right); }

function DecisionTreeDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const dataRef = _useRef(genData("blobs"));
  const [dataset, setDataset] = _useState("blobs");
  const [maxDepth, setMaxDepth] = _useState(3);
  const [stats, setStats] = _useState({ leaves: 0, acc: 0 });

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const tree = build(dataRef.current, 0, maxDepth);
    const cs = W / GRID;
    for (let gx = 0; gx < GRID; gx++) for (let gy = 0; gy < GRID; gy++) {
      const x = (gx / (GRID - 1)) * 2 - 1, y = 1 - (gy / (GRID - 1)) * 2;
      const c = COLORS[predictTree(tree, x, y) % 3];
      ctx.fillStyle = c + "26";
      ctx.fillRect(gx * cs, gy * cs, cs + 1, cs + 1);
    }
    let correct = 0;
    for (const p of dataRef.current) {
      if (predictTree(tree, p.x, p.y) === p.label) correct++;
      const pxc = (p.x + 1) / 2 * W, pyc = (1 - p.y) / 2 * H;
      ctx.fillStyle = COLORS[p.label % 3]; ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(pxc, pyc, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    setStats({ leaves: countLeaves(tree), acc: Math.round(100 * correct / dataRef.current.length) });
  }

  function reseed() { dataRef.current = genData(dataset); draw(); }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  }, []);
  _useEffect(() => { draw(); }, [maxDepth]);
  _useEffect(() => { dataRef.current = genData(dataset); draw(); }, [dataset]);

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <SegmentedControl label="// DATASET" value={dataset} onChange={setDataset}
        options={[{ value: "blobs", label: "Blobs" }, { value: "xor", label: "XOR" }, { value: "circles", label: "Circles" }]}
        help="The class shape. Trees split one axis at a time, so they nail XOR but only staircase-approximate the smooth circular boundary." />
      <Slider label="// MAX DEPTH" min={1} max={8} value={maxDepth} onChange={setMaxDepth} tone="violet"
        help="How many times the tree may keep splitting. Deeper trees fit finer detail and push train accuracy toward 100% — straight into overfitting." />
      <DemoButton onClick={reseed} primary>NEW DATA</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="LEAVES" value={stats.leaves} />
        <StatReadout label="TRAIN ACC" value={stats.acc + "%"} accent="#34d399" />
      </div>
      <Legend items={COLORS.slice(0, dataset === "blobs" ? 3 : 2).map((c, i) => ({ color: c, label: "CLASS " + i }))} />
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>Regions are axis-aligned — that's the whole story of a tree.</div>
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        A decision tree splits the feature space one axis-aligned cut at a time,
        always choosing the split that most reduces <b>Gini impurity</b> — i.e. that
        best separates the classes. This is real CART, built greedily in the
        browser; the shaded rectangles are the regions it carves, and each is
        labeled by the majority class of the training points that land in it.
      </DemoP>
      <DemoP>
        Raise <b>max depth</b> and watch the boundary turn into a staircase of ever
        smaller boxes — train accuracy climbs toward 100% as the tree memorizes
        individual points (overfitting). Notice trees handle <b>XOR</b> cleanly but
        approximate <b>circles</b> with a jagged staircase, because every boundary
        must be horizontal or vertical. That limitation is exactly why we ensemble
        many trees into random forests and gradient boosting.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Decision trees are the building block of the most dependable workhorses in tabular
        ML: <b>random forests</b> and gradient-boosted trees (XGBoost, LightGBM) routinely
        win on structured, business-style data where deep nets struggle. The greedy
        "pick the split that most reduces impurity" rule you're watching is the same idea
        whether the impurity is Gini or entropy / information gain.
      </DemoP>
      <DemoP>
        Trees are also prized for <b>interpretability</b> — every prediction is a readable
        chain of if/else rules, which matters in regulated domains like credit and
        healthcare. The overfitting-with-depth on screen is exactly why we prune, cap depth
        and min-samples, and above all <i>ensemble</i>: averaging many decorrelated trees
        (bagging) or sequentially correcting their residuals (boosting) keeps the accuracy
        while taming the variance.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Decision Tree"
      subtitle="Watch a CART tree carve the plane into axis-aligned regions — and overfit as it deepens."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/supervised-learning/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<DecisionTreeDemo />);
