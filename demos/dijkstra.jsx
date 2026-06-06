// demos/dijkstra.jsx — Dijkstra's shortest-path algorithm on a weighted graph.
//
// Grow a "settled" set outward from the source, always finalizing the unsettled
// node with the smallest tentative distance, then RELAXING its neighbors:
//   if dist[u] + w(u,v) < dist[v]:  dist[v] = dist[u] + w(u,v);  prev[v] = u
// Because edge weights are non-negative, the first time a node is settled its
// distance is final — the greedy choice is provably optimal. Unlike the grid
// BFS/DFS/A* demo, this is a general weighted node-link graph. Real Dijkstra,
// stepped one settle at a time.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP, Slider, DemoButton, StatReadout, ControlGroup, Legend, useIsMobile,
} = window;

const CW = 300, CH = 250, INF = 1e9;

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function buildGraph(seed) {
  const rand = rng(seed); const N = 12; const nodes = [];
  for (let i = 0; i < N; i++) {
    let x, y, ok = false, tries = 0;
    while (!ok && tries++ < 200) { x = 24 + rand() * (CW - 48); y = 24 + rand() * (CH - 48); ok = nodes.every(n => Math.hypot(n.x - x, n.y - y) > 52); }
    nodes.push({ x, y });
  }
  // k-nearest edges (undirected), weight = rounded distance
  const adj = Array.from({ length: N }, () => []);
  const has = new Set();
  const addEdge = (i, j) => { const k = i < j ? i + "," + j : j + "," + i; if (has.has(k) || i === j) return; has.add(k); const w = Math.round(Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y) / 8); adj[i].push({ to: j, w }); adj[j].push({ to: i, w }); };
  for (let i = 0; i < N; i++) {
    const d = nodes.map((n, j) => [Math.hypot(n.x - nodes[i].x, n.y - nodes[i].y), j]).filter(([, j]) => j !== i).sort((a, b) => a[0] - b[0]);
    for (let t = 0; t < 3 && t < d.length; t++) addEdge(i, d[t][1]);
  }
  // source = leftmost, target = rightmost
  let src = 0, tgt = 0; for (let i = 1; i < N; i++) { if (nodes[i].x < nodes[src].x) src = i; if (nodes[i].x > nodes[tgt].x) tgt = i; }
  return { N, nodes, adj, has, src, tgt };
}

function DijkstraDemo() {
  const cvRef = _useRef(null);
  const mobile = useIsMobile ? useIsMobile() : false;
  const [seed, setSeed] = _useState(3);
  const [speed, setSpeed] = _useState(3);
  const [running, setRunning] = _useState(false);
  const [done, setDone] = _useState(false);
  const [settled, setSettled] = _useState(0);
  const [cost, setCost] = _useState(0);

  const gRef = _useRef(null), stRef = _useRef(null), spRef = _useRef(speed);
  _useEffect(() => { spRef.current = speed; }, [speed]);

  function init() {
    const g = buildGraph(seed * 911 + 5); gRef.current = g;
    const dist = new Array(g.N).fill(INF), prev = new Array(g.N).fill(-1), vis = new Array(g.N).fill(false);
    dist[g.src] = 0;
    stRef.current = { dist, prev, vis, cur: -1, finished: false };
    setDone(false); setSettled(0); setCost(0);
  }

  function step() {
    const g = gRef.current, st = stRef.current; if (st.finished) return true;
    let u = -1, best = INF;
    for (let i = 0; i < g.N; i++) if (!st.vis[i] && st.dist[i] < best) { best = st.dist[i]; u = i; }
    if (u === -1) { st.finished = true; setDone(true); return true; }
    st.vis[u] = true; st.cur = u;
    for (const e of g.adj[u]) { const alt = st.dist[u] + e.w; if (alt < st.dist[e.to]) { st.dist[e.to] = alt; st.prev[e.to] = u; } }
    setSettled(st.vis.filter(Boolean).length);
    if (u === g.tgt) { st.finished = true; setDone(true); setCost(st.dist[g.tgt]); return true; }
    return false;
  }

  function pathEdges() {
    const g = gRef.current, st = stRef.current; const set = new Set();
    if (!st || st.dist[g.tgt] >= INF) return set;
    let v = g.tgt; while (st.prev[v] !== -1) { const u = st.prev[v]; set.add(u < v ? u + "," + v : v + "," + u); v = u; }
    return set;
  }

  function draw() {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d"); ctx.clearRect(0, 0, CW, CH); ctx.fillStyle = "#0b1530"; ctx.fillRect(0, 0, CW, CH);
    const g = gRef.current, st = stRef.current; if (!g) return;
    const pe = (st && st.finished) ? pathEdges() : new Set();
    // edges
    for (let i = 0; i < g.N; i++) for (const e of g.adj[i]) { if (e.to < i) continue; const k = i + "," + e.to; const onPath = pe.has(k); const a = g.nodes[i], b = g.nodes[e.to]; ctx.strokeStyle = onPath ? "#fbbf24" : "rgba(148,163,184,0.3)"; ctx.lineWidth = onPath ? 3 : 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.fillStyle = "rgba(148,163,184,0.7)"; ctx.font = "8px monospace"; ctx.textAlign = "center"; ctx.fillText(e.w, (a.x + b.x) / 2, (a.y + b.y) / 2 - 2); }
    // nodes
    for (let i = 0; i < g.N; i++) {
      const n = g.nodes[i]; let col = "#475569";
      if (st) { if (st.vis[i]) col = "#60a5fa"; else if (st.dist[i] < INF) col = "#fbbf24"; }
      if (i === g.src) col = "#34d399"; if (i === g.tgt) col = "#f472b6";
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(n.x, n.y, i === (st ? st.cur : -1) ? 12 : 10, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = "#0a1428"; ctx.font = "bold 8px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(st && st.dist[i] < INF ? String(st.dist[i]) : "∞", n.x, n.y);
    }
    ctx.fillStyle = "#34d399"; ctx.font = "8px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.fillText("source", g.nodes[g.src].x, g.nodes[g.src].y - 14);
    ctx.fillStyle = "#f472b6"; ctx.fillText("target", g.nodes[g.tgt].x, g.nodes[g.tgt].y - 14);
  }

  _useEffect(() => { init(); draw(); /* eslint-disable-next-line */ }, [seed]);

  _useEffect(() => {
    if (!running) return;
    let alive = true, raf, last = 0;
    const loop = (t) => {
      if (!alive) return;
      if (t - last > 1000 / Math.max(1, spRef.current)) { last = t; const fin = step(); draw(); if (fin) setRunning(false); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(raf); };
    /* eslint-disable-next-line */
  }, [running]);

  const reset = () => { setRunning(false); init(); setTimeout(draw, 0); };

  const stage = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <canvas ref={cvRef} width={CW} height={CH}
        style={{ width: CW * (mobile ? 1.1 : 1.5), maxWidth: "100%", borderRadius: 6, border: "1px solid var(--border)", background: "#0b1530" }} />
      <Legend items={[
        { label: "source", color: "#34d399" },
        { label: "target", color: "#f472b6" },
        { label: "settled", color: "#60a5fa" },
        { label: "frontier", color: "#fbbf24" },
      ]} />
    </div>
  );

  const controls = (
    <ControlGroup>
      <Slider label="// GRAPH" min={1} max={9} step={1} value={seed} onChange={setSeed} tone="blue"
        help="Resample the weighted graph (nodes placed in the plane, edges to nearest neighbors, weights = distance). Source is the leftmost node, target the rightmost." />
      <Slider label="// SPEED" min={1} max={12} step={1} value={speed} onChange={setSpeed} suffix=" /s"
        help="Settles per second. Each step finalizes the closest unsettled node and relaxes its neighbors. Visual pacing only." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setRunning(r => !r)} primary tone="violet" disabled={done}>{running ? "PAUSE" : "RUN"}</DemoButton>
        <DemoButton onClick={() => { if (!running && !done) { step(); draw(); } }} disabled={running || done}>STEP</DemoButton>
        <DemoButton onClick={reset}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="SETTLED" value={settled + " / " + (gRef.current ? gRef.current.N : 0)} accent="#60a5fa" />
        <StatReadout label="STATUS" value={done ? "DONE" : "SEARCHING"} accent={done ? "#34d399" : "#fbbf24"} />
        <StatReadout label="PATH COST" value={done && cost ? cost : "—"} accent="#fbbf24" />
        <StatReadout label="NODE LABELS" value="dist" accent="var(--dim)" />
      </div>
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Dijkstra grows a circle of certainty outward from the <b>source</b>. At each
        step it picks the <b>frontier</b> node with the smallest tentative distance,
        declares it <b>settled</b> (blue — its distance is now final), and
        <b> relaxes</b> its neighbors: if reaching them through this node is cheaper
        than their current best, update it. The numbers on the nodes are those
        running distances, starting at ∞.
      </DemoP>
      <DemoP>
        The key fact: because every edge weight is non-negative, the closest
        unsettled node can never be improved later, so settling it greedily is safe —
        that's why one pass gives every shortest distance. Following the
        predecessor pointers back from the <b>target</b> traces the gold shortest
        path. (Add negative edges and this breaks — you'd need Bellman–Ford instead;
        add a goal-directed heuristic and you get A*.)
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Dijkstra is the canonical weighted shortest-path algorithm — routing and
        maps, network packets, and any least-cost planning. With a binary heap it
        runs in O(E log V). It's the weighted generalization of breadth-first search
        and the parent of <a href={`${window.__DM_BASE || "../../"}visualize/bfs-dfs-astar/`} style={{ color: "#a855f7" }}>A*</a>,
        which is just Dijkstra plus an admissible heuristic that aims the search at
        the goal.
      </DemoP>
      <DemoP>
        The relaxation step — "is a cheaper path available through this node?" — is
        the same{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/knapsack/`} style={{ color: "#a855f7" }}>dynamic-programming</a>{" "}
        optimal-substructure idea behind shortest paths everywhere, and shortest-path
        distances on a graph are exactly what nonlinear dimensionality reduction like{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/isomap/`} style={{ color: "#a855f7" }}>Isomap</a>{" "}
        uses to approximate geodesics. It also underpins the next graph step here:{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/mst/`} style={{ color: "#a855f7" }}>minimum
        spanning trees</a>.
      </DemoP>
    </>
  );

  return (
    <DemoLayout topic="GRAPHS / NETWORKS" title="Dijkstra's Shortest Path"
      subtitle="Grow certainty outward from the source: always settle the closest frontier node and relax its neighbors. Non-negative weights make the greedy choice optimal."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="blue" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<DijkstraDemo />);
