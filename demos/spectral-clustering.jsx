// demos/spectral-clustering.jsx — clustering by the graph Laplacian's eigenvectors.
//
// k-means can only carve convex blobs; it fails on rings and crescents. Spectral
// clustering instead builds a similarity GRAPH (RBF weights W_ij), forms the
// normalized Laplacian, and clusters in the space of its smallest eigenvectors:
//   W_ij = exp(−‖x_i−x_j‖²/2σ²),  M = D^{−1/2} W D^{−1/2}
// the top-k eigenvectors of M (smallest eigenvalues of L = I−M) give each point a
// few coordinates where connected components pull apart; row-normalize and run
// k-means THERE (Ng–Jordan–Weiss). Connectivity, not distance, defines a cluster —
// so two interlocking shapes separate cleanly. Flip to plain k-means to watch it fail.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 500, H = 470;
const PAL = ["#60a5fa", "#a855f7", "#34d399", "#fbbf24", "#f87171"];

function SpectralClusteringDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [dataset, setDataset] = _useState("circles");
  const [method, setMethod] = _useState("spectral");
  const [sigma, setSigma] = _useState(0.12);
  const [K, setK] = _useState(2);
  const [seed, setSeed] = _useState(1);
  const [showEdges, setShowEdges] = _useState(true);
  const [, setTick] = _useState(0);
  const ref = _useRef(null);

  function rng(s0) { let s = s0 >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function randn(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  const d2 = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) { const t = a[i] - b[i]; s += t * t; } return s; };

  function gen(r) {
    const pts = [];
    if (dataset === "circles") {
      const n = 50;
      for (let i = 0; i < n; i++) { const a = 2 * Math.PI * r(); pts.push([0.5 + 0.16 * Math.cos(a) + 0.03 * randn(r), 0.5 + 0.16 * Math.sin(a) + 0.03 * randn(r)]); }
      for (let i = 0; i < n; i++) { const a = 2 * Math.PI * r(); pts.push([0.5 + 0.4 * Math.cos(a) + 0.03 * randn(r), 0.5 + 0.4 * Math.sin(a) + 0.03 * randn(r)]); }
    } else if (dataset === "moons") {
      const n = 50;
      for (let i = 0; i < n; i++) { const t = Math.PI * r(); pts.push([0.32 + 0.28 * Math.cos(t) + 0.03 * randn(r), 0.42 + 0.28 * Math.sin(t) + 0.03 * randn(r)]); }
      for (let i = 0; i < n; i++) { const t = Math.PI * r(); pts.push([0.68 - 0.28 * Math.cos(t) + 0.03 * randn(r), 0.58 - 0.28 * Math.sin(t) + 0.03 * randn(r)]); }
    } else { // blobs
      const ctr = [[0.3, 0.35], [0.7, 0.4], [0.5, 0.72]];
      for (let c = 0; c < 3; c++) for (let i = 0; i < 34; i++) pts.push([ctr[c][0] + 0.07 * randn(r), ctr[c][1] + 0.07 * randn(r)]);
    }
    return pts;
  }

  // top-k eigenvectors of symmetric M via power iteration + deflation
  function topEig(M, k, iters) {
    const N = M.length, vecs = [];
    for (let e = 0; e < k; e++) {
      let v = Array.from({ length: N }, () => Math.random() - 0.5);
      for (let it = 0; it < iters; it++) {
        // Mv
        let mv = new Array(N).fill(0);
        for (let i = 0; i < N; i++) { let s = 0; const Mi = M[i]; for (let j = 0; j < N; j++) s += Mi[j] * v[j]; mv[i] = s; }
        // deflate against previous eigvecs
        for (const u of vecs) { let dot = 0; for (let i = 0; i < N; i++) dot += mv[i] * u[i]; for (let i = 0; i < N; i++) mv[i] -= dot * u[i]; }
        let nrm = Math.sqrt(mv.reduce((a, x) => a + x * x, 0)) || 1e-9;
        v = mv.map(x => x / nrm);
      }
      vecs.push(v);
    }
    return vecs; // each length N
  }

  function kmeans(P, k, r, iters) {
    const N = P.length, dim = P[0].length;
    const cs = [P[Math.floor(r() * N)].slice()];
    while (cs.length < k) {
      const dd = P.map(p => Math.min(...cs.map(c => d2(p, c))));
      let tot = dd.reduce((a, b) => a + b, 0) || 1, t = r() * tot, idx = 0;
      for (let i = 0; i < N; i++) { t -= dd[i]; if (t <= 0) { idx = i; break; } }
      cs.push(P[idx].slice());
    }
    let asn = new Array(N).fill(0);
    for (let it = 0; it < iters; it++) {
      for (let i = 0; i < N; i++) { let best = 0, bd = Infinity; for (let c = 0; c < k; c++) { const dist = d2(P[i], cs[c]); if (dist < bd) { bd = dist; best = c; } } asn[i] = best; }
      const sx = Array.from({ length: k }, () => new Array(dim).fill(0)), cnt = new Array(k).fill(0);
      for (let i = 0; i < N; i++) { cnt[asn[i]]++; for (let d = 0; d < dim; d++) sx[asn[i]][d] += P[i][d]; }
      for (let c = 0; c < k; c++) if (cnt[c]) for (let d = 0; d < dim; d++) cs[c][d] = sx[c][d] / cnt[c];
    }
    return asn;
  }

  function build() {
    const r = rng(seed * 92821 + (dataset === "circles" ? 1 : dataset === "moons" ? 2 : 3));
    const pts = gen(r);
    const N = pts.length;
    // similarity graph
    const Wm = Array.from({ length: N }, () => new Array(N).fill(0));
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { const w = Math.exp(-d2(pts[i], pts[j]) / (2 * sigma * sigma)); Wm[i][j] = w; Wm[j][i] = w; }
    const deg = Wm.map(row => row.reduce((a, b) => a + b, 0));
    let asn;
    if (method === "kmeans") {
      asn = kmeans(pts, K, rng(777), 25);
    } else {
      // M = D^-1/2 W D^-1/2
      const M = Array.from({ length: N }, () => new Array(N).fill(0));
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) M[i][j] = Wm[i][j] / Math.sqrt((deg[i] || 1e-9) * (deg[j] || 1e-9));
      const vecs = topEig(M, K, 120);            // K top eigenvectors (length N each)
      // embedding rows, normalized
      const emb = [];
      for (let i = 0; i < N; i++) { const row = vecs.map(v => v[i]); const nrm = Math.sqrt(row.reduce((a, x) => a + x * x, 0)) || 1e-9; emb.push(row.map(x => x / nrm)); }
      asn = kmeans(emb, K, rng(777), 25);
    }
    ref.current = { pts, Wm, deg, asn };
  }
  _useEffect(() => { build(); setTick(t => t + 1); /* eslint-disable-next-line */ }, [dataset, method, sigma, K, seed]);

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";
    const st = ref.current; if (!st) return;
    const pad = 36, plot = H - 40;
    const PX = (x) => pad + x * (W - 2 * pad);
    const PY = (y) => pad + y * (plot - pad);

    ctx.fillStyle = "#94a3b8"; ctx.fillText((method === "spectral" ? "SPECTRAL" : "K-MEANS") + " clustering  ·  K=" + K + (showEdges && method === "spectral" ? "  ·  similarity graph shown" : ""), pad, 20);

    // edges (strongest few per node)
    if (showEdges && method === "spectral") {
      ctx.lineWidth = 1;
      for (let i = 0; i < st.pts.length; i++) {
        const order = st.Wm[i].map((w, j) => [w, j]).sort((a, b) => b[0] - a[0]).slice(0, 3);
        for (const [w, j] of order) {
          if (w < 0.05) continue;
          ctx.strokeStyle = `rgba(148,163,184,${Math.min(0.35, w * 0.4)})`;
          ctx.beginPath(); ctx.moveTo(PX(st.pts[i][0]), PY(st.pts[i][1])); ctx.lineTo(PX(st.pts[j][0]), PY(st.pts[j][1])); ctx.stroke();
        }
      }
    }
    // points
    st.pts.forEach((p, i) => { ctx.fillStyle = PAL[st.asn[i] % PAL.length]; ctx.beginPath(); ctx.arc(PX(p[0]), PY(p[1]), 4, 0, 7); ctx.fill(); });

    if (method === "kmeans" && (dataset === "circles" || dataset === "moons")) {
      ctx.fillStyle = "#f87171"; ctx.font = "11px JetBrains Mono";
      ctx.fillText("k-means slices the shapes — it only sees distance, not connectivity", pad, H - 14);
    } else if (method === "spectral") {
      ctx.fillStyle = "#34d399"; ctx.font = "11px JetBrains Mono";
      ctx.fillText("clusters = connected pieces of the graph", pad, H - 14);
    }
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
      <SegmentedControl label="// METHOD" value={method} onChange={setMethod}
        options={[{ value: "spectral", label: "Spectral" }, { value: "kmeans", label: "k-means" }]}
        help="Spectral clusters in the Laplacian eigenvector space (connectivity-based). k-means clusters the raw coordinates (distance-based). On rings and moons, watch k-means cut straight through a shape while spectral keeps each shape whole." />
      <SegmentedControl label="// DATASET" value={dataset} onChange={setDataset}
        options={[{ value: "circles", label: "Rings" }, { value: "moons", label: "Moons" }, { value: "blobs", label: "Blobs" }]}
        help="Rings and Moons are non-convex — the classic cases k-means can't separate. Blobs are convex, where both methods agree." />
      <Slider label="// RBF WIDTH σ" min={0.04} max={0.3} step={0.01} value={sigma} onChange={setSigma}
        help="Bandwidth of the similarity kernel — how close two points must be to be 'connected'. Too small fragments the graph into many pieces; too large links everything into one. The key spectral knob." />
      <Slider label="// CLUSTERS K" min={2} max={4} step={1} value={K} onChange={setK}
        help="Number of clusters, and the number of bottom Laplacian eigenvectors used as the embedding. Set it to the number of shapes you see." />
      <DemoButton onClick={() => setSeed(s => s + 1)} primary>RESAMPLE</DemoButton>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94a3b8", fontFamily: "JetBrains Mono, monospace", cursor: "pointer" }}>
        <input type="checkbox" checked={showEdges} onChange={e => setShowEdges(e.target.checked)} /> show similarity graph
      </label>
      <Legend items={[
        { color: "#60a5fa", label: "cluster 1" },
        { color: "#a855f7", label: "cluster 2" },
        { color: "#34d399", label: "cluster 3" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Start on RINGS with METHOD = k-means: it draws a straight split right through
        the two circles, because k-means only knows Euclidean distance and the inner
        ring's far side is "closer" to the outer ring than to itself. Switch to
        SPECTRAL and the two rings come apart cleanly. The trick: build a graph where
        each point links to its near neighbors (the faint edges), then cluster using
        the smallest eigenvectors of that graph's Laplacian — coordinates in which
        connected regions collapse to the same spot. Connectivity, not raw distance,
        now defines a cluster.
      </DemoP>
      <DemoP>
        The RBF WIDTH σ is the whole game. Too small and the graph shatters into
        disconnected fragments (spurious clusters); too large and every point links to
        every other, blurring the shapes into one. There's a sweet band where the
        graph has exactly K well-connected pieces and the eigenvectors snap them apart.
        Switch to BLOBS and both methods agree — spectral clustering's advantage is
        precisely the non-convex shapes that defeat centroid methods.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Spectral clustering connects linear algebra to geometry: the eigenvectors of
        the graph Laplacian are a relaxation of the normalized-cut graph-partitioning
        objective, and the same Laplacian spectrum underlies Laplacian eigenmaps,
        manifold learning, and image segmentation. It's the connectivity-based
        complement to centroid methods like{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/kmeans/`} style={{ color: "#a855f7" }}>k-means</a> and
        density methods like{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/dbscan/`} style={{ color: "#a855f7" }}>DBSCAN</a>,
        and the eigenvector embedding is a cousin of the dimensionality reduction in{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/pca/`} style={{ color: "#a855f7" }}>PCA</a> and{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/tsne/`} style={{ color: "#a855f7" }}>t-SNE</a>.
      </DemoP>
      <DemoP>
        Caveats: it needs the number of clusters K up front (though the eigenvalue
        gap hints at it), and it's sensitive to the similarity graph — the σ here, or
        the choice of k-NN graph. Exact eigendecomposition is O(n³), so large datasets
        need sparse graphs and iterative eigensolvers (this demo uses a small power-
        iteration). And the final step is still k-means in eigenvector space, so it
        inherits k-means' initialization sensitivity there.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Spectral Clustering"
      subtitle="Cluster by graph connectivity, not distance. Build a similarity graph, embed with the Laplacian's eigenvectors, and separate interlocking rings and moons that k-means cuts straight through."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/ml-theory/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<SpectralClusteringDemo />);
