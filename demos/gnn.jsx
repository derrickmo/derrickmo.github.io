// demos/gnn.jsx — graph neural network message passing. We render a small
// random graph (~24 nodes), give each node a scalar feature, and run real
// mean-aggregation GCN-style updates: h_v ← σ(W · mean(h_u for u in N(v) ∪ {v})).
// Watch features smooth across the graph as the layer count increases — and
// over-smooth into one cluster value when you keep going.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

// Build a graph with k clusters connected sparsely. Returns {nodes, edges, init feats, cluster ids}
function makeGraph(seed = 1, nClusters = 3, perCluster = 8) {
  let s = seed * 9301 + 49297;
  const rng = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const N = nClusters * perCluster;
  const nodes = [];
  for (let c = 0; c < nClusters; c++) {
    const cx = 0.5 + 0.35 * Math.cos((c / nClusters) * Math.PI * 2);
    const cy = 0.5 + 0.35 * Math.sin((c / nClusters) * Math.PI * 2);
    for (let i = 0; i < perCluster; i++) {
      nodes.push({
        id: c * perCluster + i,
        cluster: c,
        x: cx + (rng() - 0.5) * 0.18,
        y: cy + (rng() - 0.5) * 0.18,
      });
    }
  }
  // edges: dense intra-cluster, sparse inter-cluster
  const edges = new Set();
  const add = (a, b) => { if (a === b) return; const k = a < b ? `${a}-${b}` : `${b}-${a}`; edges.add(k); };
  for (let c = 0; c < nClusters; c++) {
    for (let i = 0; i < perCluster; i++) {
      const a = c * perCluster + i;
      // each node connects to ~3 others in cluster
      for (let k = 0; k < 3; k++) {
        const b = c * perCluster + (Math.floor(rng() * perCluster));
        add(a, b);
      }
    }
  }
  // inter-cluster: a couple bridge edges
  for (let c = 0; c < nClusters; c++) {
    const a = c * perCluster + Math.floor(rng() * perCluster);
    const b = ((c + 1) % nClusters) * perCluster + Math.floor(rng() * perCluster);
    add(a, b);
  }
  // initial features: one-hot-ish per cluster (with noise)
  const feat = nodes.map(n => -1 + 2 * (n.cluster / (nClusters - 1)) + (rng() - 0.5) * 0.2);
  // adjacency
  const adj = nodes.map(() => []);
  for (const e of edges) {
    const [a, b] = e.split("-").map(Number);
    adj[a].push(b); adj[b].push(a);
  }
  return { nodes, edges: Array.from(edges).map(e => e.split("-").map(Number)), feat, adj, N };
}

// GCN-ish step with learned-ish weight W (we just fix W = 0.9 here so updates
// move features but don't blow up). Activation: tanh.
function gcnStep(feat, adj, W = 0.9) {
  const out = new Array(feat.length).fill(0);
  for (let v = 0; v < feat.length; v++) {
    let sum = feat[v];
    for (const u of adj[v]) sum += feat[u];
    const mean = sum / (1 + adj[v].length);
    out[v] = Math.tanh(W * mean);
  }
  return out;
}

function GNNDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [seed, setSeed] = _useState(2);
  const [layers, setLayers] = _useState(1);
  const [w, setW] = _useState(0.9);
  const [view, setView] = _useState("feat");

  const graph = makeGraph(seed);
  // run `layers` GCN steps
  let f = graph.feat.slice();
  for (let l = 0; l < layers; l++) f = gcnStep(f, graph.adj, w);

  const W = 480, H = 460;
  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // edges
    for (const [a, b] of graph.edges) {
      const na = graph.nodes[a], nb = graph.nodes[b];
      ctx.strokeStyle = "rgba(96,165,250,0.25)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(na.x * W, na.y * H);
      ctx.lineTo(nb.x * W, nb.y * H);
      ctx.stroke();
    }

    // nodes
    for (const n of graph.nodes) {
      const v = f[n.id];
      let color;
      if (view === "cluster") {
        color = ["#60a5fa", "#c084fc", "#34d399"][n.cluster] || "#94a3b8";
      } else {
        const mag = Math.min(1, Math.abs(v));
        color = v >= 0 ? `rgba(96,165,250,${0.18 + 0.7 * mag})` : `rgba(192,132,252,${0.18 + 0.7 * mag})`;
      }
      ctx.fillStyle = color;
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(n.x * W, n.y * H, 8, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
    // eslint-disable-next-line
  }, [seed, layers, w, view]);

  // "Cluster purity" metric: stddev of feature across each cluster — small =
  // smoothed within cluster (good for node classification); cross-cluster
  // stddev should stay large (so we can still distinguish clusters).
  function variance(arr) {
    const m = arr.reduce((s, x) => s + x, 0) / arr.length;
    return arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length;
  }
  const within = [0, 1, 2].map(c => variance(f.filter((_, i) => graph.nodes[i].cluster === c))).reduce((s, x) => s + x, 0) / 3;
  const between = variance([0, 1, 2].map(c => {
    const arr = f.filter((_, i) => graph.nodes[i].cluster === c);
    return arr.reduce((s, x) => s + x, 0) / arr.length;
  }));

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// LAYERS" min={0} max={10} step={1} value={layers} onChange={setLayers}
        help="How many rounds of message passing. 0 = raw features. 1-3 = useful smoothing. Past ~5 you'll start to see over-smoothing — all nodes converge to similar features." />
      <Slider label="// WEIGHT W" min={0.3} max={1.2} step={0.05} value={w} onChange={setW} tone="violet"
        help="Scalar weight applied before the tanh nonlinearity. Lower W = features shrink each layer; higher W = updates push harder. Real GCNs learn this per layer." />
      <Slider label="// GRAPH SEED" min={1} max={20} step={1} value={seed} onChange={setSeed}
        help="Re-roll the random graph (preserving the 3-cluster structure). Different seeds give different connectivities; the qualitative smoothing behavior is the same." />
      <SegmentedControl label="// COLOR" value={view} onChange={setView}
        options={[{ value: "feat", label: "Feature" }, { value: "cluster", label: "True cluster" }]}
        help="Color nodes by their current feature value (the GCN output) or by their ground-truth cluster id. Compare the two — the GCN is recovering cluster structure." />
      <DemoButton onClick={() => setSeed(Math.floor(Math.random() * 20) + 1)} primary>NEW GRAPH</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="WITHIN VAR" value={within.toFixed(3)} />
        <StatReadout label="BETWEEN VAR" value={between.toFixed(3)} accent="#fbbf24" />
      </div>
      <Legend items={[
        { color: "#60a5fa", label: "feat > 0" },
        { color: "#c084fc", label: "feat < 0" },
        { color: "#0f172a", border: "1px solid #94a3b8", label: "node" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        A <b>graph neural network</b> updates each node's feature by averaging over its
        neighbors and itself, then applying a nonlinearity — exactly the rule
        <i> h_v ← tanh(W · mean(h_u for u in N(v) ∪ &#123;v&#125;))</i>. With <b>0
        layers</b> the colors just reflect cluster id (with noise). Crank up the
        layers slider and watch features <b>smooth</b> within each cluster — that's
        message passing pushing the GNN toward a representation where same-cluster
        nodes look alike.
      </DemoP>
      <DemoP>
        Push the layers past ~5 and the "within variance" stat collapses, but so does
        the <b>between</b>-variance — every node ends up looking the same. That's
        <b> over-smoothing</b>, the fundamental limitation of plain GCNs and why most
        production graph models cap at 2-4 layers, use residuals, or switch to graph
        transformers that attend to a fixed local window.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        GNNs power a surprising fraction of high-stakes ML: <b>recommendations</b>
        (Pinterest's PinSAGE, the embedding behind your Pinterest feed),
        <b> fraud detection</b> (transaction graphs at every major fintech),
        <b> drug discovery</b> (DeepMind's GNoME found 2.2M new crystals), and
        <b> Google Maps ETAs</b> (a GNN over the road network). The structure is the
        signal — when relationships matter more than raw features, GNNs win.
      </DemoP>
      <DemoP>
        Three big variants are worth knowing: <b>GCN</b> (what we're running — mean
        over neighbors), <b>GraphSAGE</b> (sample a fixed number of neighbors so it
        scales to billion-node graphs), and <b>GAT</b> (attention-weighted aggregation
        — yes, the same softmax-over-keys that's everywhere else). Modern <b>graph
        transformers</b> drop the locality entirely and run full self-attention with
        positional encodings derived from graph structure — but they all start from
        the message-passing primitive you're watching here.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="GRAPH NEURAL NETS" title="GNN Message Passing"
      subtitle="Each layer averages a node's feature with its neighbors. Watch features smooth across the graph — and over-smooth when you go too deep."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/ml-applications/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<GNNDemo />);
