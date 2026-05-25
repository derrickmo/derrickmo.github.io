// demos/knn.jsx — k-Nearest Neighbors decision-boundary explorer.
// Real kNN vote over a grid; click to add points; watch k trade jagged vs smooth.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 460, H = 460, GRID = 56;
const COLORS = ["#60a5fa", "#c084fc", "#34d399"];
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

function genData(kind, n = 90) {
  const pts = []; const R = () => Math.random() * 2 - 1;
  for (let i = 0; i < n; i++) {
    let x, y, label;
    if (kind === "blobs") { const c = i % 3, a = c * 2 * Math.PI / 3; x = Math.cos(a) * 0.55 + gauss() * 0.2; y = Math.sin(a) * 0.55 + gauss() * 0.2; label = c; }
    else if (kind === "moons") { const arm = i % 2, t = Math.random() * Math.PI; x = (arm ? 1 - Math.cos(t) : Math.cos(t)) - 0.5; y = (arm ? -Math.sin(t) + 0.25 : Math.sin(t) - 0.25); x += gauss() * 0.06; y += gauss() * 0.06; label = arm; }
    else { x = R(); y = R(); label = (x > 0) === (y > 0) ? 0 : 1; } // xor
    pts.push({ x, y, label });
  }
  return pts;
}

function classify(pts, x, y, k, metric) {
  const d = pts.map(p => ({ l: p.label, dist: metric === "manhattan" ? Math.abs(p.x - x) + Math.abs(p.y - y) : (p.x - x) ** 2 + (p.y - y) ** 2 }));
  d.sort((a, b) => a.dist - b.dist);
  const m = {}; for (let i = 0; i < Math.min(k, d.length); i++) m[d[i].l] = (m[d[i].l] || 0) + 1;
  let best = 0, bc = -1; for (const key in m) if (m[key] > bc) { bc = m[key]; best = +key; } return best;
}

function KnnDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const dataRef = _useRef(genData("blobs"));
  const [dataset, setDataset] = _useState("blobs");
  const [k, setK] = _useState(5);
  const [metric, setMetric] = _useState("euclidean");
  const [cls, setCls] = _useState(0);
  const [acc, setAcc] = _useState(0);

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const pts = dataRef.current, cs = W / GRID;
    for (let gx = 0; gx < GRID; gx++) for (let gy = 0; gy < GRID; gy++) {
      const x = (gx / (GRID - 1)) * 2 - 1, y = 1 - (gy / (GRID - 1)) * 2;
      ctx.fillStyle = COLORS[classify(pts, x, y, k, metric) % 3] + "22";
      ctx.fillRect(gx * cs, gy * cs, cs + 1, cs + 1);
    }
    // leave-one-out accuracy
    let correct = 0;
    for (let i = 0; i < pts.length; i++) {
      const rest = pts.filter((_, j) => j !== i);
      if (classify(rest, pts[i].x, pts[i].y, k, metric) === pts[i].label) correct++;
      const pxc = (pts[i].x + 1) / 2 * W, pyc = (1 - pts[i].y) / 2 * H;
      ctx.fillStyle = COLORS[pts[i].label % 3]; ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(pxc, pyc, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    setAcc(Math.round(100 * correct / pts.length));
  }

  function onDown(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / (rect.width / W) / W * 2 - 1;
    const y = 1 - (e.clientY - rect.top) / (rect.height / H) / H * 2;
    dataRef.current.push({ x, y, label: cls }); draw();
  }
  function reseed() { dataRef.current = genData(dataset); draw(); }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  }, []);
  _useEffect(() => { draw(); }, [k, metric]);
  _useEffect(() => { dataRef.current = genData(dataset); draw(); }, [dataset]);

  const classCount = dataset === "blobs" ? 3 : 2;
  const stage = <canvas ref={canvasRef} onPointerDown={onDown} style={{ touchAction: "none", cursor: "crosshair", maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <SegmentedControl label="// DATASET" value={dataset} onChange={setDataset}
        options={[{ value: "blobs", label: "Blobs" }, { value: "moons", label: "Moons" }, { value: "xor", label: "XOR" }]} />
      <Slider label="// NEIGHBORS (k)" min={1} max={25} value={k} onChange={setK} tone="violet" />
      <SegmentedControl label="// DISTANCE" value={metric} onChange={setMetric}
        options={[{ value: "euclidean", label: "Euclidean" }, { value: "manhattan", label: "Manhattan" }]} />
      <SegmentedControl label="// ADD-POINT CLASS" value={cls} onChange={setCls}
        options={COLORS.slice(0, classCount).map((c, i) => ({ value: i, label: "Class " + i }))} />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={reseed} primary>NEW DATA</DemoButton>
      </div>
      <StatReadout label="LEAVE-ONE-OUT ACCURACY" value={acc + "%"} accent="#34d399" />
      <Legend items={COLORS.slice(0, classCount).map((c, i) => ({ color: c, label: "CLASS " + i }))} />
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>Click the canvas to drop a point of the selected class.</div>
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        k-Nearest Neighbors is the simplest classifier there is: to label a point,
        find its <i>k</i> closest training examples and take a majority vote. There's
        no training — the data <i>is</i> the model. The shaded regions show how every
        point in the plane would be classified for the current <b>k</b>.
      </DemoP>
      <DemoP>
        At <b>k = 1</b> the boundary is jagged and wraps tightly around every point
        (low bias, high variance — it overfits, and noisy points create little
        islands). Crank <b>k</b> up and the boundary smooths out and the islands
        dissolve (higher bias, lower variance) — until very large k washes the
        classes together. The leave-one-out accuracy readout is a quick honest
        score; click to add points and watch the regions redraw instantly.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="CLASSICAL ML" title="k-Nearest Neighbors"
      subtitle="The simplest classifier — vote among the k closest points. Watch k trade a jagged boundary for a smooth one."
      stage={stage} controls={controls} explainer={explainer}
      lessonHref={`${window.__DM_BASE || "../../"}learn/supervised-learning/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="blue" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<KnnDemo />);
