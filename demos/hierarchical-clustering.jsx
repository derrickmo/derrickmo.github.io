// demos/hierarchical-clustering.jsx — agglomerative clustering + dendrogram.
//
// Hierarchical clustering needs no k up front: start with every point its own
// cluster and repeatedly merge the two CLOSEST clusters until one remains,
// recording the merge heights as a tree (dendrogram). "Closest" depends on the
// LINKAGE — single (min pairwise, prone to chaining), complete (max, compact
// clusters), average (mean), or Ward (smallest variance increase). Slide a cut
// across the dendrogram to read off any number of clusters from the SAME tree.
// We build the full tree, color the scatter by the clusters at the chosen cut,
// and let you switch linkages to watch the structure — and the failure modes —
// change.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 560, H = 460, NPTS = 44;
const PAL = ["#60a5fa", "#f87171", "#34d399", "#fbbf24", "#a855f7", "#22d3ee", "#fb923c", "#f472b6"];

function HierClustDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [kClusters, setK] = _useState(3);
  const [linkage, setLinkage] = _useState("ward");
  const [dataset, setDataset] = _useState("blobs");
  const [seed, setSeed] = _useState(1);
  const [, setTick] = _useState(0);
  const sim = _useRef(null);

  function rng(s0) { let s = s0 >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function randn(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  function genData(r) {
    const pts = [];
    if (dataset === "blobs") {
      const ctr = [[-0.55, 0.45], [0.55, 0.4], [0, -0.55], [0.6, -0.4]];
      for (let i = 0; i < NPTS; i++) { const c = ctr[i % 4]; pts.push([c[0] + randn(r) * 0.13, c[1] + randn(r) * 0.13]); }
    } else if (dataset === "chain") {
      for (let i = 0; i < NPTS; i++) { const t = i / (NPTS - 1); pts.push([(t * 2 - 1) * 0.9 + randn(r) * 0.04, Math.sin(t * 3) * 0.4 + randn(r) * 0.04]); }
    } else {
      for (let i = 0; i < NPTS; i++) pts.push([(r() * 2 - 1) * 0.85, (r() * 2 - 1) * 0.85]);
    }
    return pts;
  }

  function reset() {
    const r = rng(seed * 49157 + 11);
    const pts = genData(r);
    const N = pts.length;
    // nodes: leaves 0..N-1
    const nodes = [];
    for (let i = 0; i < N; i++) nodes.push({ id: i, leaf: true, members: [i], height: 0, size: 1, cx: pts[i][0], cy: pts[i][1] });
    const active = new Set(Array.from({ length: N }, (_, i) => i));
    const merges = [];

    function clusterDist(A, B) {
      if (linkage === "ward") {
        const dx = A.cx - B.cx, dy = A.cy - B.cy; const d2 = dx * dx + dy * dy;
        return Math.sqrt((2 * A.size * B.size) / (A.size + B.size) * d2);
      }
      let acc = linkage === "single" ? Infinity : (linkage === "complete" ? -Infinity : 0), cnt = 0;
      for (const i of A.members) for (const j of B.members) {
        const dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1]; const d = Math.sqrt(dx * dx + dy * dy);
        if (linkage === "single") acc = Math.min(acc, d);
        else if (linkage === "complete") acc = Math.max(acc, d);
        else { acc += d; cnt++; }
      }
      return linkage === "average" ? acc / cnt : acc;
    }

    while (active.size > 1) {
      let bi = -1, bj = -1, bd = Infinity; const arr = [...active];
      for (let a = 0; a < arr.length; a++) for (let b = a + 1; b < arr.length; b++) {
        const d = clusterDist(nodes[arr[a]], nodes[arr[b]]);
        if (d < bd) { bd = d; bi = arr[a]; bj = arr[b]; }
      }
      const A = nodes[bi], B = nodes[bj];
      const members = A.members.concat(B.members), size = A.size + B.size;
      const cx = (A.cx * A.size + B.cx * B.size) / size, cy = (A.cy * A.size + B.cy * B.size) / size;
      const id = nodes.length;
      nodes.push({ id, leaf: false, children: [bi, bj], members, height: bd, size, cx, cy });
      merges.push({ a: bi, b: bj, id, height: bd });
      active.delete(bi); active.delete(bj); active.add(id);
    }
    const root = nodes.length - 1;
    // assign leaf x by in-order traversal (non-crossing)
    let pos = 0;
    (function order(id) { const nd = nodes[id]; if (nd.leaf) { nd.x = pos++; return; } order(nd.children[0]); order(nd.children[1]); nd.x = (nodes[nd.children[0]].x + nodes[nd.children[1]].x) / 2; })(root);
    const hmax = nodes[root].height || 1;
    sim.current = { pts, N, nodes, merges, root, hmax };
    setTick(t => t + 1);
  }
  _useEffect(() => { reset(); /* eslint-disable-next-line */ }, [linkage, dataset, seed]);

  // cluster assignment at k clusters: union the first N-k merges
  function clustersAtK(st, k) {
    const { N, merges, nodes } = st; const parent = Array.from({ length: nodes.length }, (_, i) => i);
    const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
    const nUnion = Math.max(0, N - k);
    for (let m = 0; m < nUnion; m++) { const mg = merges[m]; parent[find(mg.a)] = find(mg.b); }
    const roots = {}; const lab = new Array(N); let next = 0;
    for (let i = 0; i < N; i++) { const r = find(i); if (!(r in roots)) roots[r] = next++; lab[i] = roots[r]; }
    return { lab, count: next };
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const st = sim.current; if (!st) return;
    const { pts, N, nodes, root, hmax } = st;
    const { lab } = clustersAtK(st, kClusters);

    // ---- left: scatter colored by cluster ----
    const lx = 14, ly = 40, lw = 248, lh = 380;
    const SX = (x) => lx + ((x + 1) / 2) * lw, SY = (y) => ly + (1 - (y + 1) / 2) * lh;
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono"; ctx.fillText("CLUSTERS at the cut", lx, 28);
    ctx.strokeStyle = "rgba(148,163,184,0.12)"; ctx.strokeRect(lx, ly, lw, lh);
    for (let i = 0; i < N; i++) { ctx.beginPath(); ctx.arc(SX(pts[i][0]), SY(pts[i][1]), 4, 0, 7); ctx.fillStyle = PAL[lab[i] % PAL.length]; ctx.fill(); }

    // ---- right: dendrogram ----
    const dx0 = 286, dy0 = 40, dw = W - dx0 - 14, dh = 360;
    const X = (x) => dx0 + (x / (N - 1)) * dw;
    const Y = (h) => dy0 + dh - (h / (hmax * 1.05)) * dh;
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono"; ctx.fillText("DENDROGRAM (merge tree)", dx0, 28);
    // determine cut height for k clusters: between merge[N-k-1] and merge[N-k]
    const mg = st.merges; const cutH = kClusters <= 1 ? hmax * 1.05 : (kClusters > N ? 0 : (mg[N - kClusters] ? (mg[N - kClusters].height + (mg[N - kClusters - 1] ? mg[N - kClusters - 1].height : 0)) / 2 : hmax * 1.05));
    // branches
    ctx.lineWidth = 1.5;
    for (let id = N; id < nodes.length; id++) {
      const nd = nodes[id], c0 = nodes[nd.children[0]], c1 = nodes[nd.children[1]];
      const below = nd.height <= cutH;
      ctx.strokeStyle = below ? PAL[(lab[c0.members[0]]) % PAL.length] : "rgba(148,163,184,0.5)";
      const yx = Y(nd.height);
      ctx.beginPath(); ctx.moveTo(X(c0.x), Y(c0.height)); ctx.lineTo(X(c0.x), yx); ctx.lineTo(X(c1.x), yx); ctx.lineTo(X(c1.x), Y(c1.height)); ctx.stroke();
    }
    // cut line
    ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(dx0, Y(cutH)); ctx.lineTo(dx0 + dw, Y(cutH)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#fbbf24"; ctx.font = "10px JetBrains Mono"; ctx.fillText("cut -> " + kClusters + " clusters", dx0 + dw - 130, Y(cutH) - 5);
    ctx.fillStyle = "#64748b"; ctx.fillText("height = merge distance", dx0, dy0 + dh + 18);
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  });
  _useEffect(() => { draw(); });

  const st = sim.current;
  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// CUT -> CLUSTERS  k" min={1} max={8} step={1} value={kClusters} onChange={setK} tone="violet"
        help="Where to slice the dendrogram. The SAME tree gives any number of clusters — slide the cut down for more, finer clusters, up for fewer, coarser ones. No re-fitting needed, unlike k-means." />
      <SegmentedControl label="// LINKAGE" value={linkage} onChange={setLinkage}
        options={[{ value: "single", label: "Single" }, { value: "complete", label: "Complete" }, { value: "average", label: "Average" }, { value: "ward", label: "Ward" }]}
        help="How distance between two clusters is defined. Single = nearest pair (follows chains, can straggle); Complete = farthest pair (compact, equal-size clusters); Average = mean pair; Ward = the merge that least increases within-cluster variance (k-means-like, usually the best default)." />
      <SegmentedControl label="// DATA" value={dataset} onChange={setDataset}
        options={[{ value: "blobs", label: "Blobs" }, { value: "chain", label: "Chain" }, { value: "uniform", label: "Uniform" }]}
        help="Point layout. Blobs have clear clusters; Chain is an elongated curve where single-linkage chains nicely but Ward/complete cut it into chunks; Uniform has no real structure (any clustering is arbitrary)." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setSeed(s => s + 1)} primary>RESAMPLE</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="CLUSTERS" value={kClusters} accent="#a855f7" />
        <StatReadout label="POINTS / MERGES" value={st ? `${st.N} / ${st.N - 1}` : "—"} accent="#34d399" />
      </div>
      <Legend items={[
        { color: "#60a5fa", label: "cluster 1" },
        { color: "#f87171", label: "cluster 2" },
        { color: "#fbbf24", label: "cut height" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        On the right is the whole history of the clustering as a tree: every leaf is a
        point, and each upside-down U is a merge drawn at the height (distance) where
        the two clusters joined. Tall joins mean two very different groups fused late;
        short ones mean near-identical points merged early. The beauty is that you
        don't pick the number of clusters first — you build the tree once and then
        SLIDE the amber cut line. Where it crosses the branches is how many clusters
        you get, and the left scatter recolors instantly to match. No re-fitting, and
        you can read off 2, 5, or 8 clusters from the same structure.
      </DemoP>
      <DemoP>
        The LINKAGE rule changes everything. On the Chain data, switch to Single
        linkage and it happily follows the curve as one snaking cluster (it merges via
        the nearest pair) — but that same chaining makes it straggle and chain through
        noise on blobs. Complete and Ward instead prefer compact, balanced clusters,
        so they chop the chain into pieces but nail the blobs. Ward — merge whichever
        pair least inflates within-cluster variance — behaves the most like k-means and
        is the usual default. There's no universally "right" linkage; it encodes what
        shape of cluster you believe in.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Agglomerative hierarchical clustering is a staple of exploratory data analysis
        — the dendrogram + heatmap you see in genomics (gene/sample clustering),
        phylogenetics, customer segmentation, and document organization. Unlike{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/kmeans/`} style={{ color: "#a855f7" }}>k-means</a>{" "}
        it needs no k in advance and yields a full multi-resolution hierarchy, and
        unlike{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/dbscan/`} style={{ color: "#a855f7" }}>DBSCAN</a>{" "}
        it always returns a complete tree (no points left as noise). Ward linkage
        optimizes the same within-cluster variance objective as k-means; single
        linkage is essentially a minimum spanning tree.
      </DemoP>
      <DemoP>
        Caveats: the naive algorithm is O(n²) memory and O(n³) time (n² log n with
        heaps), so it doesn't scale to huge datasets without approximations. Merges are
        greedy and irreversible — an early mistake can't be undone — and the result is
        very sensitive to the linkage and distance metric (single-linkage chaining is
        the classic failure). The dendrogram tempts you to read meaning into every
        split; cutting it into clusters is still a judgment call (gap statistic,
        silhouette, or domain knowledge), and for non-Euclidean structure a
        density- or graph-based method may fit better.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Hierarchical Clustering"
      subtitle="Merge the two closest clusters over and over into a tree, then slide a cut across the dendrogram to read off any number of clusters from the same structure — no k chosen up front. Switch the linkage to see compact, chained, or variance-minimizing clusters."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/unsupervised-learning/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<HierClustDemo />);
