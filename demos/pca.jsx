// demos/pca.jsx — Principal Component Analysis on 2D data.
// Real covariance eigen-decomposition (analytic 2x2); shows principal axes and
// the projection onto PC1.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  SegmentedControl, Toggle, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 460, H = 460, SC = 150;
const cx = W / 2, cy = H / 2;
const px = (x) => cx + x * SC, py = (y) => cy - y * SC;
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

function genData(kind, n = 160) {
  const pts = [];
  if (kind === "correlated") {
    const ang = Math.PI / 5;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    for (let i = 0; i < n; i++) { const a = gauss() * 0.75, b = gauss() * 0.2; pts.push({ x: a * ca - b * sa, y: a * sa + b * ca }); }
  } else if (kind === "clusters") {
    for (let i = 0; i < n; i++) { const c = i % 2 ? 0.5 : -0.5; pts.push({ x: c + gauss() * 0.18, y: c * 0.8 + gauss() * 0.18 }); }
  } else { // ring
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, r = 0.8 + gauss() * 0.06; pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * 0.6 }); }
  }
  return pts;
}

function eig2(a, b, c) {
  const m = (a + c) / 2, disc = Math.sqrt(Math.max(0, (a - c) * (a - c) / 4 + b * b));
  const l1 = m + disc, l2 = m - disc;
  let v1 = Math.abs(b) > 1e-9 ? [l1 - c, b] : (a >= c ? [1, 0] : [0, 1]);
  const nrm = Math.hypot(v1[0], v1[1]) || 1; v1 = [v1[0] / nrm, v1[1] / nrm];
  return { l1, l2, v1, v2: [-v1[1], v1[0]] };
}

function PCADemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const dataRef = _useRef(genData("correlated"));
  const [dataset, setDataset] = _useState("correlated");
  const [project, setProject] = _useState(false);
  const [stats, setStats] = _useState({ pc1: 0, pc2: 0 });

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const pts = dataRef.current, n = pts.length;
    const mx = pts.reduce((s, p) => s + p.x, 0) / n, my = pts.reduce((s, p) => s + p.y, 0) / n;
    let a = 0, b = 0, c = 0;
    for (const p of pts) { const dx = p.x - mx, dy = p.y - my; a += dx * dx; b += dx * dy; c += dy * dy; }
    a /= n; b /= n; c /= n;
    const { l1, l2, v1, v2 } = eig2(a, b, c);
    const tot = l1 + l2 || 1;

    // axes
    ctx.strokeStyle = "rgba(96,165,250,0.12)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();

    // PC1 line (through centroid)
    if (project) {
      const t = 2.4;
      ctx.strokeStyle = "rgba(192,132,252,0.5)"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(px(mx - v1[0] * t), py(my - v1[1] * t)); ctx.lineTo(px(mx + v1[0] * t), py(my + v1[1] * t));
      ctx.stroke(); ctx.setLineDash([]);
    }
    // points (+ projection)
    for (const p of pts) {
      const dx = p.x - mx, dy = p.y - my;
      ctx.fillStyle = "#60a5fa";
      ctx.beginPath(); ctx.arc(px(p.x), py(p.y), 3, 0, Math.PI * 2); ctx.fill();
      if (project) {
        const proj = dx * v1[0] + dy * v1[1];
        const qx = mx + proj * v1[0], qy = my + proj * v1[1];
        ctx.strokeStyle = "rgba(148,163,184,0.25)"; ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(px(p.x), py(p.y)); ctx.lineTo(px(qx), py(qy)); ctx.stroke();
        ctx.fillStyle = "#c084fc"; ctx.beginPath(); ctx.arc(px(qx), py(qy), 2.6, 0, Math.PI * 2); ctx.fill();
      }
    }
    // eigenvectors (length ~ sqrt eigenvalue)
    const arrow = (v, lam, col) => {
      const s = Math.sqrt(Math.max(0, lam)) * 2.2;
      const ex = mx + v[0] * s, ey = my + v[1] * s;
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(px(mx), py(my)); ctx.lineTo(px(ex), py(ey)); ctx.stroke();
      const ang = Math.atan2(-(ey - my), ex - mx);
      const hx = px(ex), hy = py(ey);
      ctx.beginPath(); ctx.moveTo(hx, hy);
      ctx.lineTo(hx - 9 * Math.cos(ang - 0.4), hy + 9 * Math.sin(ang - 0.4));
      ctx.lineTo(hx - 9 * Math.cos(ang + 0.4), hy + 9 * Math.sin(ang + 0.4));
      ctx.closePath(); ctx.fill();
    };
    arrow(v1, l1, "#fbbf24");
    arrow(v2, l2, "#34d399");
    ctx.fillStyle = "#e0e7ff"; ctx.beginPath(); ctx.arc(px(mx), py(my), 4, 0, Math.PI * 2); ctx.fill();

    setStats({ pc1: Math.round(100 * l1 / tot), pc2: Math.round(100 * l2 / tot) });
  }

  function reseed() { dataRef.current = genData(dataset); draw(); }
  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  }, []);
  _useEffect(() => { draw(); }, [project]);
  _useEffect(() => { dataRef.current = genData(dataset); draw(); }, [dataset]);

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <SegmentedControl label="// DATASET" value={dataset} onChange={setDataset}
        options={[{ value: "correlated", label: "Correlated" }, { value: "clusters", label: "Clusters" }, { value: "ring", label: "Ring" }]}
        help="The data shape. 'Correlated' has one dominant direction so PCA compresses it well; 'Ring' spreads variance every way, which PCA can't reduce cleanly." />
      <Toggle label="// PROJECT ONTO PC1" checked={project} onChange={setProject} tone="violet"
        help="Collapse every point onto the top principal axis — the dimensionality reduction itself. Notice how little is lost when PC2 carries little variance." />
      <DemoButton onClick={reseed} primary>NEW DATA</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="PC1 VARIANCE" value={stats.pc1 + "%"} accent="#fbbf24" />
        <StatReadout label="PC2 VARIANCE" value={stats.pc2 + "%"} accent="#34d399" />
      </div>
      <Legend items={[{ color: "#60a5fa", label: "DATA" }, { color: "#fbbf24", label: "PC1" }, { color: "#34d399", label: "PC2" }, { color: "#c084fc", label: "PROJECTED" }]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        PCA finds the directions along which the data varies most. We center the
        cloud, build its 2×2 covariance matrix, and take its eigenvectors — the
        <span style={{ color: "#fbbf24" }}> PC1</span> arrow points along the
        direction of greatest variance, <span style={{ color: "#34d399" }}>PC2</span>
        is orthogonal to it, and each arrow's length is the spread (√eigenvalue)
        along it. The readouts show how much of the total variance each component
        explains.
      </DemoP>
      <DemoP>
        Turn on <b>Project onto PC1</b> to collapse every point onto that first axis
        — that's dimensionality reduction: trading the small-variance direction for a
        compact 1-D representation that keeps most of the information (look at how
        little PC2 carries on the "correlated" set). The same eigen-decomposition
        powers compression, denoising, and the embeddings you visualize elsewhere in
        the lab.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        PCA is the default tool for dimensionality reduction, visualization, and
        decorrelation — compressing high-dimensional features, denoising, speeding up
        downstream models, and giving a quick 2-D look at data you otherwise can't plot.
        Under the hood it's an eigen-decomposition of the covariance matrix, the same
        linear-algebra machinery behind whitening, spectral methods, and the matrix
        factorization in recommender systems.
      </DemoP>
      <DemoP>
        The "variance explained" idea is the intuition behind much of modern
        representation learning: embeddings, autoencoders, and latent spaces all chase a
        compact code that keeps the meaningful directions and discards noise. PCA's
        <i> linearity</i> is also its limit — which is precisely why nonlinear methods like
        t-SNE, UMAP, and autoencoders exist for data that doesn't lie near a flat subspace.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Principal Component Analysis"
      subtitle="Find the axes of greatest variance — then project onto them. Dimensionality reduction, made visible."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/unsupervised-learning/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="blue" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<PCADemo />);
