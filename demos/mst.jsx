// demos/mst.jsx — minimum spanning tree via Prim's algorithm.
//
// Connect every node with the least total edge weight. Prim's grows one tree from
// a start node, and at each step adds the single cheapest edge that crosses from
// the tree to a node not yet in it (the "cut property" guarantees that edge is
// safe). Each node carries key[v] = the cheapest known edge connecting it to the
// current tree; settle the minimum, then relax. Real Prim's, stepped node by node.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP, Slider, DemoButton, StatReadout, ControlGroup, Legend, useIsMobile,
} = window;

const CW = 300, CH = 250, INF = 1e9;

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function buildGraph(seed) {
  const rand = rng(seed); const N = 13; const nodes = [];
  for (let i = 0; i < N; i++) {
    let x, y, ok = false, tries = 0;
    while (!ok && tries++ < 200) { x = 22 + rand() * (CW - 44); y = 22 + rand() * (CH - 44); ok = nodes.every(n => Math.hypot(n.x - x, n.y - y) > 48); }
    nodes.push({ x, y });
  }
  const adj = Array.from({ length: N }, () => []); const has = new Set();
  const addEdge = (i, j) => { const k = i < j ? i + "," + j : j + "," + i; if (has.has(k) || i === j) return; has.add(k); const w = Math.round(Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y) / 7); adj[i].push({ to: j, w }); adj[j].push({ to: i, w }); };
  for (let i = 0; i < N; i++) { const d = nodes.map((n, j) => [Math.hypot(n.x - nodes[i].x, n.y - nodes[i].y), j]).filter(([, j]) => j !== i).sort((a, b) => a[0] - b[0]); for (let t = 0; t < 4 && t < d.length; t++) addEdge(i, d[t][1]); }
  return { N, nodes, adj };
}

function MSTDemo() {
  const cvRef = _useRef(null);
  const mobile = useIsMobile ? useIsMobile() : false;
  const [seed, setSeed] = _useState(2);
  const [speed, setSpeed] = _useState(3);
  const [running, setRunning] = _useState(false);
  const [inCount, setInCount] = _useState(1);
  const [total, setTotal] = _useState(0);
  const [done, setDone] = _useState(false);

  const gRef = _useRef(null), stRef = _useRef(null), spRef = _useRef(speed);
  _useEffect(() => { spRef.current = speed; }, [speed]);

  function init() {
    const g = buildGraph(seed * 733 + 11); gRef.current = g;
    const inTree = new Array(g.N).fill(false), key = new Array(g.N).fill(INF), parent = new Array(g.N).fill(-1);
    key[0] = 0;
    stRef.current = { inTree, key, parent, total: 0, last: -1, finished: false };
    setInCount(0); setTotal(0); setDone(false);
  }

  function step() {
    const g = gRef.current, st = stRef.current; if (st.finished) return true;
    let u = -1, best = INF;
    for (let i = 0; i < g.N; i++) if (!st.inTree[i] && st.key[i] < best) { best = st.key[i]; u = i; }
    if (u === -1) { st.finished = true; setDone(true); return true; }
    st.inTree[u] = true; st.last = u; if (st.parent[u] !== -1) st.total += st.key[u];
    for (const e of g.adj[u]) if (!st.inTree[e.to] && e.w < st.key[e.to]) { st.key[e.to] = e.w; st.parent[e.to] = u; }
    setInCount(st.inTree.filter(Boolean).length); setTotal(st.total);
    if (st.inTree.every(Boolean)) { st.finished = true; setDone(true); return true; }
    return false;
  }

  function draw() {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d"); ctx.clearRect(0, 0, CW, CH); ctx.fillStyle = "#0b1530"; ctx.fillRect(0, 0, CW, CH);
    const g = gRef.current, st = stRef.current; if (!g) return;
    const treeEdges = new Set();
    if (st) for (let i = 0; i < g.N; i++) if (st.inTree[i] && st.parent[i] !== -1) { const j = st.parent[i]; treeEdges.add(i < j ? i + "," + j : j + "," + i); }
    // all edges
    for (let i = 0; i < g.N; i++) for (const e of g.adj[i]) { if (e.to < i) continue; const k = i + "," + e.to; const inMST = treeEdges.has(k); const a = g.nodes[i], b = g.nodes[e.to]; ctx.strokeStyle = inMST ? "#34d399" : "rgba(148,163,184,0.22)"; ctx.lineWidth = inMST ? 3 : 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); if (!inMST) { ctx.fillStyle = "rgba(148,163,184,0.55)"; ctx.font = "8px monospace"; ctx.textAlign = "center"; ctx.fillText(e.w, (a.x + b.x) / 2, (a.y + b.y) / 2 - 2); } }
    // frontier candidate edges (cheapest connection of each non-tree node)
    if (st && !st.finished) for (let i = 0; i < g.N; i++) if (!st.inTree[i] && st.parent[i] !== -1 && st.key[i] < INF) { const j = st.parent[i]; const a = g.nodes[i], b = g.nodes[j]; ctx.strokeStyle = "rgba(251,191,36,0.55)"; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]); }
    // nodes
    for (let i = 0; i < g.N; i++) { const n = g.nodes[i]; let col = "#475569"; if (st && st.inTree[i]) col = "#34d399"; else if (st && st.key[i] < INF) col = "#fbbf24"; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(n.x, n.y, i === (st ? st.last : -1) ? 9 : 7, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1; ctx.stroke(); }
  }

  _useEffect(() => { init(); draw(); /* eslint-disable-next-line */ }, [seed]);
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
      <Legend items={[
        { label: "in tree", color: "#34d399" },
        { label: "frontier", color: "#fbbf24" },
        { label: "candidate edge", color: "rgba(251,191,36,0.7)" },
        { label: "unused edge", color: "rgba(148,163,184,0.4)" },
      ]} />
    </div>
  );

  const controls = (
    <ControlGroup>
      <Slider label="// GRAPH" min={1} max={9} step={1} value={seed} onChange={setSeed} tone="blue"
        help="Resample the weighted graph (nearest-neighbor edges, weights = distance). Prim's always starts from node 0 and grows outward." />
      <Slider label="// SPEED" min={1} max={12} step={1} value={speed} onChange={setSpeed} suffix=" /s"
        help="Nodes added per second. Each step adds the cheapest edge crossing from the tree to a new node. Visual pacing only." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setRunning(r => !r)} primary tone="violet" disabled={done}>{running ? "PAUSE" : "GROW"}</DemoButton>
        <DemoButton onClick={() => { if (!running && !done) { step(); draw(); } }} disabled={running || done}>STEP</DemoButton>
        <DemoButton onClick={reset}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="IN TREE" value={inCount + " / " + (gRef.current ? gRef.current.N : 0)} accent="#34d399" />
        <StatReadout label="EDGES" value={Math.max(0, inCount - 1)} accent="var(--violet-lt)" />
        <StatReadout label="TOTAL WEIGHT" value={total} accent="#fbbf24" />
        <StatReadout label="STATUS" value={done ? "SPANNING" : "GROWING"} accent={done ? "#34d399" : "#fbbf24"} />
      </div>
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        A spanning tree connects every node with no cycles; the <b>minimum</b>{" "}
        spanning tree does it for the least total edge weight. Prim's grows one tree
        outward: at every step it looks at all the <b>candidate edges</b> crossing
        from the green tree to the outside (dashed amber) and adds the single
        cheapest one, pulling that node in. Repeat until everything is connected.
      </DemoP>
      <DemoP>
        Why is greedily grabbing the cheapest crossing edge safe? The <b>cut
        property</b>: for any split of the nodes, the lightest edge across that cut
        must be in some MST — so it can never be a mistake. That one fact is what
        makes both Prim's (grow a tree) and Kruskal's (add globally-cheapest edges
        that don't form a cycle) correct. The total weight climbs as nodes join and
        freezes once the tree spans every node.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        MSTs are everywhere you want a cheap connecting backbone: network and circuit
        layout, clustering (cut the heaviest MST edges to split groups — single-link{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/hierarchical-clustering/`} style={{ color: "#a855f7" }}>hierarchical
        clustering</a> is exactly this), and approximation algorithms for the
        traveling-salesman problem. Prim's shares its settle-the-minimum, relax-the-
        rest structure with{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/dijkstra/`} style={{ color: "#a855f7" }}>Dijkstra</a>{" "}
        — it just compares edge weights instead of path distances.
      </DemoP>
      <DemoP>
        It's a textbook <b>greedy</b> algorithm whose correctness rests on a matroid /
        exchange argument (the cut property), the same flavor of proof behind other
        greedy methods. Kruskal's variant leans on a{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/graph-coloring/`} style={{ color: "#a855f7" }}>union-find</a>-style
        disjoint-set structure to detect cycles, a nice contrast in how the same
        optimum can be reached two different ways.
      </DemoP>
    </>
  );

  return (
    <DemoLayout topic="GRAPHS / NETWORKS" title="Minimum Spanning Tree (Prim's)"
      subtitle="Connect everything for the least total weight. Greedily add the cheapest edge crossing out of the growing tree — the cut property says that's always safe."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="blue" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<MSTDemo />);
