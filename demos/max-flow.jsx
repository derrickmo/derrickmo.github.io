// demos/max-flow.jsx — maximum flow / minimum cut (Ford-Fulkerson, Edmonds-Karp).
//
// Push as much flow as possible from a source S to a sink T through a network of
// capacitated edges. Edmonds-Karp repeatedly finds a shortest augmenting path in
// the RESIDUAL graph (BFS), sends the bottleneck capacity along it, and updates
// residuals (including the reverse edges that let later paths "undo" flow). When
// no augmenting path remains, the flow is maximum — and the nodes still reachable
// from S in the residual graph define the MINIMUM CUT, whose capacity equals the
// max flow (the max-flow min-cut theorem). Real Edmonds-Karp, one path per step.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP, Slider, DemoButton, StatReadout, ControlGroup, Legend, useIsMobile,
} = window;

const CW = 310, CH = 240;
const POS = [[28, 120], [112, 64], [112, 176], [206, 64], [206, 176], [284, 120]];
const SRC = 0, SINK = 5;
const EDGES = [[0, 1], [0, 2], [1, 2], [1, 3], [2, 4], [3, 4], [2, 3], [3, 5], [4, 5]];

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function buildNet(seed) {
  const rand = rng(seed); const N = 6;
  const to = [], cap = [], from = [], adj = Array.from({ length: N }, () => []);
  const orig = [];
  const add = (u, v, c) => { const fi = to.length; to.push(v); cap.push(c); from.push(u); adj[u].push(fi); to.push(u); cap.push(0); from.push(v); adj[v].push(fi + 1); return fi; };
  for (const [u, v] of EDGES) { const c = 4 + Math.floor(rand() * 11); orig.push({ fi: add(u, v, c), u, v, c0: c }); }
  return { N, to, cap, from, adj, orig };
}

function MaxFlowDemo() {
  const cvRef = _useRef(null);
  const mobile = useIsMobile ? useIsMobile() : false;
  const [seed, setSeed] = _useState(3);
  const [speed, setSpeed] = _useState(2);
  const [running, setRunning] = _useState(false);
  const [flow, setFlow] = _useState(0);
  const [paths, setPaths] = _useState(0);
  const [done, setDone] = _useState(false);

  const netRef = _useRef(null), stRef = _useRef(null), spRef = _useRef(speed);
  _useEffect(() => { spRef.current = speed; }, [speed]);

  function init() { const net = buildNet(seed * 521 + 9); netRef.current = net; stRef.current = { flow: 0, paths: 0, finished: false, path: [], cut: null, sside: null }; setFlow(0); setPaths(0); setDone(false); }

  function bfsPath() {
    const net = netRef.current; const par = new Array(net.N).fill(-1); par[SRC] = -2;
    const q = [SRC];
    while (q.length) { const u = q.shift(); for (const e of net.adj[u]) { const v = net.to[e]; if (par[v] === -1 && net.cap[e] > 0) { par[v] = e; if (v === SINK) { q.length = 0; break; } q.push(v); } } }
    if (par[SINK] === -1) return null;
    const path = []; let v = SINK; while (v !== SRC) { const e = par[v]; path.push(e); v = net.from[e]; } path.reverse(); return path;
  }

  function step() {
    const net = netRef.current, st = stRef.current; if (st.finished) return true;
    const path = bfsPath();
    if (!path) {
      // compute min cut: reachable from S in residual
      const seen = new Array(net.N).fill(false); const q = [SRC]; seen[SRC] = true;
      while (q.length) { const u = q.shift(); for (const e of net.adj[u]) if (!seen[net.to[e]] && net.cap[e] > 0) { seen[net.to[e]] = true; q.push(net.to[e]); } }
      st.sside = seen; st.cut = net.orig.filter(o => seen[o.u] && !seen[o.v]); st.path = []; st.finished = true; setDone(true); return true;
    }
    let b = Infinity; for (const e of path) b = Math.min(b, net.cap[e]);
    for (const e of path) { net.cap[e] -= b; net.cap[e ^ 1] += b; }
    st.flow += b; st.paths++; st.path = path; setFlow(st.flow); setPaths(st.paths);
    return false;
  }

  function draw() {
    const cv = cvRef.current; if (!cv) return;
    const ctx = window.fitCanvas(cv, CW, CH); ctx.clearRect(0, 0, CW, CH); ctx.fillStyle = "#0b1530"; ctx.fillRect(0, 0, CW, CH);
    const net = netRef.current, st = stRef.current; if (!net) return;
    const pathSet = new Set(st.path); const cutSet = new Set((st.cut || []).map(o => o.fi));
    for (const o of net.orig) {
      const a = POS[o.u], b = POS[o.v]; const flowOnE = o.c0 - net.cap[o.fi]; const util = flowOnE / o.c0;
      const onPath = pathSet.has(o.fi); const onCut = cutSet.has(o.fi);
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
      const sx = a[0] + ux * 14, sy = a[1] + uy * 14, ex = b[0] - ux * 14, ey = b[1] - uy * 14;
      ctx.strokeStyle = onPath ? "#fbbf24" : onCut ? "#f87171" : util > 0 ? `rgba(52,211,153,${0.4 + 0.5 * util})` : "rgba(148,163,184,0.35)";
      ctx.lineWidth = onPath ? 3.5 : onCut ? 3 : 1 + 2 * util; if (onCut) ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
      // arrowhead
      ctx.fillStyle = onPath ? "#fbbf24" : "rgba(148,163,184,0.6)"; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - ux * 7 - uy * 4, ey - uy * 7 + ux * 4); ctx.lineTo(ex - ux * 7 + uy * 4, ey - uy * 7 - ux * 4); ctx.closePath(); ctx.fill();
      // label flow/cap
      ctx.fillStyle = "#cbd5e1"; ctx.font = "8px monospace"; ctx.textAlign = "center";
      ctx.fillText(flowOnE + "/" + o.c0, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 3);
    }
    for (let i = 0; i < net.N; i++) {
      const p = POS[i]; let col = "#475569"; if (i === SRC) col = "#34d399"; if (i === SINK) col = "#f472b6";
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p[0], p[1], 13, 0, Math.PI * 2); ctx.fill();
      if (st.sside) { ctx.strokeStyle = st.sside[i] ? "#34d399" : "#f87171"; ctx.lineWidth = 2.5; ctx.stroke(); }
      else { ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 1; ctx.stroke(); }
      ctx.fillStyle = "#0a1428"; ctx.font = "bold 9px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(i === SRC ? "S" : i === SINK ? "T" : String(i), p[0], p[1]); ctx.textBaseline = "alphabetic";
    }
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
  const cutCap = stRef.current && stRef.current.cut ? stRef.current.cut.reduce((s, o) => s + o.c0, 0) : null;

  const stage = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <canvas ref={cvRef}
        style={{ width: CW * (mobile ? 1.05 : 1.45), maxWidth: "100%", borderRadius: 6, border: "1px solid var(--border)", background: "#0b1530" }} />
      <Legend items={[
        { label: "source / sink", color: "#34d399" },
        { label: "augmenting path", color: "#fbbf24" },
        { label: "flow (thickness)", color: "#34d399" },
        { label: "min cut", color: "#f87171" },
      ]} />
    </div>
  );

  const controls = (
    <ControlGroup>
      <Slider label="// CAPACITIES" min={1} max={9} step={1} value={seed} onChange={setSeed} tone="blue"
        help="Resample the edge capacities of the network. Source is S (left), sink is T (right); edge labels read flow/capacity." />
      <Slider label="// SPEED" min={1} max={6} step={1} value={speed} onChange={setSpeed} suffix=" /s"
        help="Augmenting paths per second. Each step finds one shortest residual path (BFS) and pushes its bottleneck flow. Visual pacing only." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setRunning(r => !r)} primary tone="violet" disabled={done}>{running ? "PAUSE" : "RUN"}</DemoButton>
        <DemoButton onClick={() => { if (!running && !done) { step(); draw(); } }} disabled={running || done}>STEP</DemoButton>
        <DemoButton onClick={reset}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="MAX FLOW" value={flow} accent="#34d399" />
        <StatReadout label="AUGMENTING PATHS" value={paths} accent="var(--violet-lt)" />
        <StatReadout label="MIN CUT" value={done && cutCap != null ? cutCap : "—"} accent="#f87171" />
        <StatReadout label="STATUS" value={done ? "MAX FLOW" : "AUGMENTING"} accent={done ? "#34d399" : "#fbbf24"} />
      </div>
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        How much can flow from <b>S</b> to <b>T</b> if every edge has a capacity?
        Ford–Fulkerson answers it greedily: find any path from S to T with spare
        capacity (the gold <b>augmenting path</b>), push the most it can carry — its
        bottleneck — and repeat. Edmonds–Karp picks the <i>shortest</i> such path
        each time (BFS), which guarantees it finishes quickly. Edge thickness grows
        with the flow it carries; labels show flow/capacity.
      </DemoP>
      <DemoP>
        The subtle part is the <b>residual graph</b>: every unit of flow also opens a
        reverse edge, so a later path can <i>reroute</i> flow it sent earlier — that's
        what makes the greedy procedure provably optimal rather than getting stuck.
        When no augmenting path is left, the flow is maximal, and the nodes still
        reachable from S (green rings) versus the rest (red rings) split the graph
        into the <b>minimum cut</b>. The red dashed edges crossing that cut are the
        true bottleneck, and their capacities sum to exactly the max flow — the
        celebrated max-flow min-cut theorem.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Max-flow/min-cut is one of the most reused results in algorithms: it solves
        bipartite matching and assignment, image segmentation (graph cuts), network
        reliability and scheduling, and baseball elimination. The augmenting-path
        search is the same breadth-first exploration as{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/bfs-dfs-astar/`} style={{ color: "#a855f7" }}>BFS</a>,
        run on a graph whose weights change as flow is pushed.
      </DemoP>
      <DemoP>
        Its duality — flow (a maximization) equals cut (a minimization) — is a
        concrete instance of linear-programming duality, the same primal/dual
        structure behind SVM margins and many optimization methods. And the min-cut
        objective links directly to graph partitioning: normalized cuts are the
        relaxation behind{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/spectral-clustering/`} style={{ color: "#a855f7" }}>spectral
        clustering</a> and the community splits in{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/louvain/`} style={{ color: "#a855f7" }}>community
        detection</a>.
      </DemoP>
    </>
  );

  return (
    <DemoLayout title="Max Flow / Min Cut"
      subtitle="Push as much as the network allows from source to sink. Augmenting paths in the residual graph find the maximum flow — and reveal the bottleneck cut that equals it."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="blue" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<MaxFlowDemo />);
