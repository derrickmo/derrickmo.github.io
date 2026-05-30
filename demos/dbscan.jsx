// demos/dbscan.jsx — Density-Based Spatial Clustering of Applications with
// Noise. A real, faithful DBSCAN implementation:
//   - A point with >= MIN_PTS neighbors within EPS is a core point.
//   - Core points within EPS of each other share a cluster.
//   - A non-core point reachable from a core point joins that cluster (border).
//   - Anything else is noise.
//
// The two sliders (EPS, MIN_PTS) are THE story of DBSCAN — feel how density
// thresholds split or merge clusters, and how easy it is to label half the
// dataset "noise" by setting them wrong.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 460, H = 460, SC = 120;
const cx = W / 2, cy = H / 2;
const px = (x) => cx + x * SC, py = (y) => cy - y * SC;

function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

function genData(kind, n = 220) {
  const pts = [];
  if (kind === "blobs") {
    const centers = [[-0.7, 0.5], [0.6, 0.4], [0.0, -0.7]];
    for (let i = 0; i < n; i++) {
      const c = centers[i % 3];
      pts.push({ x: c[0] + gauss() * 0.16, y: c[1] + gauss() * 0.16 });
    }
    // sprinkle some noise
    for (let i = 0; i < 18; i++) pts.push({ x: (Math.random() * 2 - 1) * 1.2, y: (Math.random() * 2 - 1) * 1.2 });
  } else if (kind === "moons") {
    const half = (n / 2) | 0;
    for (let i = 0; i < half; i++) {
      const t = (i / half) * Math.PI;
      pts.push({ x: Math.cos(t) - 0.5 + gauss() * 0.06, y: Math.sin(t) - 0.15 + gauss() * 0.06 });
    }
    for (let i = 0; i < half; i++) {
      const t = (i / half) * Math.PI;
      pts.push({ x: 1 - Math.cos(t) - 0.5 + gauss() * 0.06, y: -Math.sin(t) + 0.45 + gauss() * 0.06 });
    }
  } else { // rings
    for (let i = 0; i < n / 3; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.95 + gauss() * 0.06;
      pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
    }
    for (let i = 0; i < n / 3; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.5 + gauss() * 0.05;
      pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
    }
    for (let i = 0; i < 25; i++) pts.push({ x: (Math.random() * 2 - 1) * 1.2, y: (Math.random() * 2 - 1) * 1.2 });
  }
  return pts;
}

// Faithful DBSCAN.
function dbscan(pts, eps, minPts) {
  const n = pts.length;
  const label = new Array(n).fill(0);        // 0 = unvisited, -1 = noise, >0 = cluster id
  const isCore = new Array(n).fill(false);
  const eps2 = eps * eps;

  function neighbors(i) {
    const out = [];
    const pi = pts[i];
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const dx = pts[j].x - pi.x, dy = pts[j].y - pi.y;
      if (dx * dx + dy * dy <= eps2) out.push(j);
    }
    return out;
  }

  let cid = 0;
  for (let i = 0; i < n; i++) {
    if (label[i] !== 0) continue;
    const N = neighbors(i);
    if (N.length + 1 < minPts) { label[i] = -1; continue; }
    cid += 1;
    label[i] = cid;
    isCore[i] = true;
    // BFS over density-reachable points
    const stack = N.slice();
    while (stack.length) {
      const j = stack.pop();
      if (label[j] === -1) label[j] = cid; // border point reclaimed from noise
      if (label[j] !== 0) continue;
      label[j] = cid;
      const Nj = neighbors(j);
      if (Nj.length + 1 >= minPts) {
        isCore[j] = true;
        for (const k of Nj) if (label[k] === 0 || label[k] === -1) stack.push(k);
      }
    }
  }
  return { label, isCore, clusters: cid };
}

const PALETTE = ["#60a5fa", "#c084fc", "#fbbf24", "#34d399", "#f472b6", "#22d3ee", "#facc15"];

function DBSCANDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const dataRef = _useRef(genData("blobs"));
  const [dataset, setDataset] = _useState("blobs");
  const [eps, setEps] = _useState(0.18);
  const [minPts, setMinPts] = _useState(5);
  const [showCore, setShowCore] = _useState(true);

  const result = dbscan(dataRef.current, eps, minPts);
  const noiseCount = result.label.filter(l => l === -1).length;

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const pts = dataRef.current;
    // EPS rings around core points (faint), to make density visible
    if (showCore) {
      for (let i = 0; i < pts.length; i++) {
        if (!result.isCore[i]) continue;
        const c = result.label[i] > 0 ? PALETTE[(result.label[i] - 1) % PALETTE.length] : "#94a3b8";
        ctx.strokeStyle = c + "33";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(px(pts[i].x), py(pts[i].y), eps * SC, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    for (let i = 0; i < pts.length; i++) {
      const l = result.label[i];
      const core = result.isCore[i];
      let color, r;
      if (l === -1) { color = "#475569"; r = 2.5; }
      else { color = PALETTE[(l - 1) % PALETTE.length]; r = core ? 4 : 3; }
      ctx.beginPath();
      ctx.arc(px(pts[i].x), py(pts[i].y), r, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      if (core) { ctx.strokeStyle = "#e0e7ff"; ctx.lineWidth = 1; ctx.stroke(); }
    }
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
    // eslint-disable-next-line
  });

  _useEffect(() => { dataRef.current = genData(dataset); /* eslint-disable-next-line */ }, [dataset]);

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const coreCount = result.isCore.filter(Boolean).length;
  const controls = (
    <ControlGroup>
      <SegmentedControl label="// DATASET" value={dataset} onChange={setDataset}
        options={[{ value: "blobs", label: "Blobs" }, { value: "moons", label: "Moons" }, { value: "rings", label: "Rings" }]}
        help="Three flavors of structure: Gaussian blobs (favorable for any clustering algo), interleaved moons (where K-Means fails but DBSCAN doesn't), and nested rings (impossible for centroid methods)." />
      <Slider label="// EPS" min={0.04} max={0.5} step={0.01} value={eps} onChange={setEps}
        help="Neighborhood radius. Smaller = stricter density requirement, more clusters fragment and more points become noise. Larger = clusters merge into a single blob. The single most consequential DBSCAN knob." />
      <Slider label="// MIN_PTS" min={2} max={15} step={1} value={minPts} onChange={setMinPts} tone="violet"
        help="Minimum neighbors (including self) needed for a point to be a core point. Heuristic: ~2*dim. Larger = stricter, more noise; smaller = more permissive, easier to cluster the long tail." />
      <DemoButton onClick={() => { dataRef.current = genData(dataset); setEps(eps + 1e-9); }} primary>NEW DATA</DemoButton>
      <Slider label="// SHOW EPS RINGS" min={0} max={1} step={1} value={showCore ? 1 : 0} onChange={(v) => setShowCore(!!v)}
        help="Toggle the faint EPS-radius circles around every core point. Turning them on makes the density threshold visible at a glance." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="CLUSTERS" value={result.clusters} accent="#fbbf24" />
        <StatReadout label="NOISE" value={noiseCount} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="CORE" value={coreCount} />
        <StatReadout label="POINTS" value={dataRef.current.length} />
      </div>
      <Legend items={[
        { color: "#60a5fa", label: "cluster" },
        { color: "#e0e7ff", border: "1px solid #60a5fa", label: "core" },
        { color: "#475569", label: "noise" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        DBSCAN starts from each unvisited point, asks "how many neighbors are
        within distance <b>EPS</b>?", and if that count is at least <b>MIN_PTS</b>,
        crowns the point as a <b>core</b>. Cores within EPS of each other share a
        cluster, and any reachable non-core within EPS of a core gets adopted as a
        <b> border</b> point. Everything else is labeled <b>noise</b>. No k to pick,
        no parametric assumption about shape — that's why moons and rings work where
        K-Means just produces wedges.
      </DemoP>
      <DemoP>
        Push EPS too small and clusters splinter — entire moons get labeled noise.
        Push it too large and the moons merge into a single blob. Push MIN_PTS up
        and the algorithm gets stricter about what counts as dense; useful when your
        background noise has its own clumps you don't want as clusters. Together the
        two knobs answer one question: <i>at what density does a region become a
        cluster?</i>
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        DBSCAN is the default unsupervised clustering algorithm when you don't know
        K and don't trust your data to be Gaussian. It's still production today in
        anomaly detection (point declared noise = potential anomaly), spatial
        analytics (geographic clustering of events), and bioinformatics (cell-type
        discovery from single-cell expression — though UMAP+Leiden has eaten part of
        that pie since 2018). The pattern survives even where DBSCAN itself doesn't:
        the idea that "density, not distance to a centroid, defines a cluster" runs
        through HDBSCAN, OPTICS, and the graph-clustering methods that replaced it.
      </DemoP>
      <DemoP>
        Two practical lessons that don't show up in textbooks: (1) EPS is sensitive
        to feature scaling — normalize first or pick EPS in units of your domain.
        (2) DBSCAN doesn't scale well past ~10⁵ points without a spatial index
        (k-d tree or ball tree); in practice that's why HDBSCAN exists. Use the eps
        slider here at the limit and you can feel the O(n²) neighbor query when n
        gets large — that's why this demo caps at ~240 points.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="UNSUPERVISED" title="DBSCAN — Density-Based Clustering"
      subtitle="No k to pick. The density threshold defines the cluster — and labels the rest as noise."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/unsupervised-learning/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="blue" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<DBSCANDemo />);
