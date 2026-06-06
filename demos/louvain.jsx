// demos/louvain.jsx — community detection by greedy modularity maximization
// (Louvain local-moving phase).
//
// Modularity Q measures how much more densely connected a partition's communities
// are than you'd expect by chance:
//   Q = Σ_c [ (internal edges)_c / 2m  −  ( (degree sum)_c / 2m )² ].
// Every node starts in its own community; we repeatedly move each node into the
// neighboring community that most increases Q until nothing improves. On a graph
// with planted clusters the colors merge into the true communities. Real greedy
// modularity optimization (Q computed exactly each move).

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP, Slider, DemoButton, StatReadout, ControlGroup, useIsMobile,
} = window;

const CW = 300, CH = 250;
const PALETTE = ["#60a5fa", "#a855f7", "#34d399", "#fbbf24", "#f472b6", "#22d3ee", "#fb923c", "#a3e635", "#f87171", "#c084fc"];

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function buildGraph(seed, pout) {
  const rand = rng(seed); const groups = 3, per = 7, N = groups * per; const nodes = [];
  const centers = [[CW * 0.3, CH * 0.32], [CW * 0.72, CH * 0.36], [CW * 0.5, CH * 0.76]];
  for (let g = 0; g < groups; g++) for (let k = 0; k < per; k++) {
    const a = rand() * Math.PI * 2, r = 18 + rand() * 30;
    nodes.push({ x: centers[g][0] + Math.cos(a) * r, y: centers[g][1] + Math.sin(a) * r, truth: g });
  }
  const A = Array.from({ length: N }, () => new Set());
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
    const p = nodes[i].truth === nodes[j].truth ? 0.55 : pout;
    if (rand() < p) { A[i].add(j); A[j].add(i); }
  }
  // ensure no isolated node
  for (let i = 0; i < N; i++) if (A[i].size === 0) { let j = (i + 1) % N; A[i].add(j); A[j].add(i); }
  const edges = []; for (let i = 0; i < N; i++) for (const j of A[i]) if (j > i) edges.push([i, j]);
  const deg = A.map(s => s.size); const m = edges.length;
  return { N, nodes, A, edges, deg, m };
}

function modularity(g, comm) {
  const twoM = 2 * g.m || 1; const inw = {}, tot = {};
  for (let i = 0; i < g.N; i++) { tot[comm[i]] = (tot[comm[i]] || 0) + g.deg[i]; }
  for (const [i, j] of g.edges) if (comm[i] === comm[j]) inw[comm[i]] = (inw[comm[i]] || 0) + 2;
  let Q = 0; const seen = new Set([...Object.keys(tot)]);
  for (const c of seen) { const t = tot[c] || 0, w = inw[c] || 0; Q += w / twoM - (t / twoM) * (t / twoM); }
  return Q;
}

function LouvainDemo() {
  const cvRef = _useRef(null);
  const mobile = useIsMobile ? useIsMobile() : false;
  const [seed, setSeed] = _useState(2);
  const [pout, setPout] = _useState(0.06);
  const [speed, setSpeed] = _useState(6);
  const [running, setRunning] = _useState(false);
  const [Q, setQ] = _useState(0);
  const [nc, setNc] = _useState(0);
  const [done, setDone] = _useState(false);

  const gRef = _useRef(null), stRef = _useRef(null), spRef = _useRef(speed);
  _useEffect(() => { spRef.current = speed; }, [speed]);

  function init() {
    const g = buildGraph(seed * 277 + 3, pout); gRef.current = g;
    const comm = Array.from({ length: g.N }, (_, i) => i);
    stRef.current = { comm, cursor: 0, changedInPass: false, finished: false, last: -1 };
    setQ(modularity(g, comm)); setNc(new Set(comm).size); setDone(false);
  }

  function step() {
    const g = gRef.current, st = stRef.current; if (st.finished) return true;
    const i = st.cursor; const comm = st.comm;
    const cands = new Set([comm[i]]); for (const j of g.A[i]) cands.add(comm[j]);
    let bestC = comm[i], bestQ = -Infinity; const orig = comm[i];
    for (const c of cands) { comm[i] = c; const q = modularity(g, comm); if (q > bestQ + 1e-12) { bestQ = q; bestC = c; } }
    comm[i] = bestC; if (bestC !== orig) st.changedInPass = true; st.last = i;
    st.cursor++;
    if (st.cursor >= g.N) { st.cursor = 0; if (!st.changedInPass) { st.finished = true; setDone(true); } st.changedInPass = false; }
    setQ(modularity(g, comm)); setNc(new Set(comm).size);
    return st.finished;
  }

  function draw() {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d"); ctx.clearRect(0, 0, CW, CH); ctx.fillStyle = "#0b1530"; ctx.fillRect(0, 0, CW, CH);
    const g = gRef.current, st = stRef.current; if (!g) return;
    const comm = st.comm; const uniq = [...new Set(comm)].sort((a, b) => a - b); const cmap = {}; uniq.forEach((c, k) => cmap[c] = PALETTE[k % PALETTE.length]);
    for (const [i, j] of g.edges) { const a = g.nodes[i], b = g.nodes[j]; const same = comm[i] === comm[j]; ctx.strokeStyle = same ? cmap[comm[i]] + "99" : "rgba(148,163,184,0.18)"; ctx.lineWidth = same ? 1.6 : 0.8; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    for (let i = 0; i < g.N; i++) { const n = g.nodes[i]; ctx.fillStyle = cmap[comm[i]]; ctx.beginPath(); ctx.arc(n.x, n.y, i === st.last ? 8 : 6, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 1; ctx.stroke(); }
  }

  _useEffect(() => { init(); draw(); /* eslint-disable-next-line */ }, [seed, pout]);
  _useEffect(() => {
    if (!running) return;
    let alive = true, raf, last = 0;
    const loop = (t) => { if (!alive) return; if (t - last > 1000 / Math.max(1, spRef.current)) { last = t; const fin = step(); draw(); if (fin) setRunning(false); } raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop); return () => { alive = false; cancelAnimationFrame(raf); };
    /* eslint-disable-next-line */
  }, [running]);

  const reset = () => { setRunning(false); init(); setTimeout(draw, 0); };

  const stage = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <canvas ref={cvRef} width={CW} height={CH}
        style={{ width: CW * (mobile ? 1.1 : 1.5), maxWidth: "100%", borderRadius: 6, border: "1px solid var(--border)", background: "#0b1530" }} />
      <span className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>node color = community · each starts alone, then merges to maximize modularity</span>
    </div>
  );

  const controls = (
    <ControlGroup>
      <Slider label="// INTER-COMMUNITY EDGES" min={0.0} max={0.35} step={0.01} value={pout} onChange={setPout} tone="violet"
        help="Probability of an edge between nodes in different planted clusters (within-cluster is fixed at 0.55). Low = crisp communities that are easy to recover; raise it and the clusters blur until modularity can no longer tell them apart." />
      <Slider label="// GRAPH" min={1} max={9} step={1} value={seed} onChange={setSeed} tone="blue"
        help="Resample the planted-community graph (3 clusters of 7 nodes)." />
      <Slider label="// SPEED" min={1} max={20} step={1} value={speed} onChange={setSpeed} suffix=" /s"
        help="Node moves per second. Each step puts one node into the neighboring community that most raises modularity. Visual pacing only." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setRunning(r => !r)} primary tone="violet" disabled={done}>{running ? "PAUSE" : "OPTIMIZE"}</DemoButton>
        <DemoButton onClick={() => { if (!running && !done) { step(); draw(); } }} disabled={running || done}>STEP</DemoButton>
        <DemoButton onClick={reset}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="MODULARITY Q" value={Q.toFixed(3)} accent={Q > 0.3 ? "#34d399" : "#fbbf24"} />
        <StatReadout label="COMMUNITIES" value={nc} accent="var(--violet-lt)" />
        <StatReadout label="TRUE COMMUNITIES" value={3} accent="var(--dim)" />
        <StatReadout label="STATUS" value={done ? "CONVERGED" : "MERGING"} accent={done ? "#34d399" : "#fbbf24"} />
      </div>
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Community detection asks: which nodes form tightly-knit groups? The score is
        <b> modularity Q</b> — how many more edges fall inside communities than you'd
        expect if the same nodes wired up at random. Here every node starts in its
        own community (all different colors), and the algorithm repeatedly moves each
        node into whichever neighboring community raises Q the most. Watch the colors
        coalesce into the three planted clusters and Q climb toward its peak.
      </DemoP>
      <DemoP>
        This is the local-moving heart of the <b>Louvain</b> method (the full version
        then collapses each community into a super-node and repeats). The catch is in
        the <b>inter-community edge</b> slider: with few cross-edges the clusters pop
        out cleanly, but as you blur them, modularity flattens and the algorithm
        starts merging real groups or splitting them — there's no ground-truth label,
        only the Q surface, and it has many near-equal optima (the resolution-limit
        problem).
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Modularity-based community detection is the standard tool for unlabeled
        network structure: social circles, protein interaction modules, topic
        clusters, fraud rings. Louvain (and its successor Leiden) scale to millions of
        nodes. It's the graph cousin of unsupervised clustering like{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/kmeans/`} style={{ color: "#a855f7" }}>k-means</a>{" "}
        and <a href={`${window.__DM_BASE || "../../"}visualize/hierarchical-clustering/`} style={{ color: "#a855f7" }}>hierarchical
        clustering</a>, but on a graph instead of points in space.
      </DemoP>
      <DemoP>
        It connects to the spectral view of graphs — communities are roughly the
        pieces you'd get from the eigenvectors of the graph Laplacian, the same math
        as <a href={`${window.__DM_BASE || "../../"}visualize/spectral-clustering/`} style={{ color: "#a855f7" }}>spectral
        clustering</a> and the structure that{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/pagerank/`} style={{ color: "#a855f7" }}>PageRank</a>{" "}
        and <a href={`${window.__DM_BASE || "../../"}visualize/gnn/`} style={{ color: "#a855f7" }}>graph neural
        networks</a> implicitly exploit when information flows along dense edges.
      </DemoP>
    </>
  );

  return (
    <DemoLayout topic="GRAPHS / NETWORKS" title="Community Detection (Louvain)"
      subtitle="Find the groups in a network. Greedily move nodes to maximize modularity and the colors merge into communities — until too many cross-edges blur them away."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<LouvainDemo />);
