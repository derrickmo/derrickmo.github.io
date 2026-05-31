// demos/bfs-dfs-astar.jsx — uninformed vs informed graph search on one maze.
//
// Run BFS, DFS, and A* on the same grid (4-connected, unit edges) and compare how
// they explore. BFS expands in uniform rings and finds a shortest path; DFS dives
// deep and finds *a* path that's usually far from optimal; A* uses g + Manhattan-h
// to head straight at the goal, expanding far fewer nodes while staying optimal.
// The selected algorithm's expansion replays cell by cell; a results panel
// compares nodes expanded, path length, and optimality across all three.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  SegmentedControl, Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480, COLS = 15, ROWS = 9;
const idx = (c, r) => r * COLS + c;
const NB = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function BFSDFSAStarDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const lastRef = _useRef(0);
  const [algo, setAlgo] = _useState("astar");
  const [density, setDensity] = _useState(0.28);
  const [speed, setSpeed] = _useState(30);
  const [running, setRunning] = _useState(false);
  const [step, setStep] = _useState(0);
  const stRef = _useRef(null);

  const start = idx(0, ROWS - 1), goal = idx(COLS - 1, 0);

  function search(walls, kind) {
    const parent = new Array(COLS * ROWS).fill(-1);
    const seen = new Array(COLS * ROWS).fill(false);
    const order = [];
    const h = (n) => { const c = n % COLS, r = (n / COLS) | 0; return Math.abs(c - (goal % COLS)) + Math.abs(r - ((goal / COLS) | 0)); };
    let frontier = [{ n: start, g: 0 }]; seen[start] = true;
    let found = false;
    while (frontier.length) {
      let cur;
      if (kind === "bfs") cur = frontier.shift();
      else if (kind === "dfs") cur = frontier.pop();
      else { let bi = 0; for (let i = 1; i < frontier.length; i++) if (frontier[i].g + h(frontier[i].n) < frontier[bi].g + h(frontier[bi].n)) bi = i; cur = frontier.splice(bi, 1)[0]; }
      order.push(cur.n);
      if (cur.n === goal) { found = true; break; }
      const c = cur.n % COLS, r = (cur.n / COLS) | 0;
      for (const [dc, dr] of NB) {
        const nc = c + dc, nr = r + dr; if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
        const nn = idx(nc, nr); if (seen[nn] || walls.has(nn)) continue;
        seen[nn] = true; parent[nn] = cur.n; frontier.push({ n: nn, g: cur.g + 1 });
      }
    }
    const path = [];
    if (found) { let n = goal; while (n !== -1) { path.push(n); n = parent[n]; } path.reverse(); }
    return { order, path, expanded: order.length };
  }

  function build() {
    let walls;
    for (let tries = 0; tries < 50; tries++) {
      walls = new Set();
      for (let i = 0; i < COLS * ROWS; i++) if (i !== start && i !== goal && Math.random() < density) walls.add(i);
      if (search(walls, "bfs").path.length) break;     // ensure reachable
    }
    stRef.current = { walls, bfs: search(walls, "bfs"), dfs: search(walls, "dfs"), astar: search(walls, "astar") };
    setStep(0); setRunning(false);
  }
  _useEffect(() => { build(); /* eslint-disable-next-line */ }, [density]);

  const s = stRef.current;
  const res = s ? s[algo] : null;
  const total = res ? res.order.length : 0;
  const done = step >= total;

  _useEffect(() => {
    if (!running) return;
    const loop = (now) => { if (now - lastRef.current >= 1000 / speed) { lastRef.current = now; setStep(v => { if (v >= total) { setRunning(false); return v; } return v + 1; }); } rafRef.current = requestAnimationFrame(loop); };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line
  }, [running, speed, total]);

  function draw() {
    const cv = canvasRef.current; if (!cv || !s) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#94a3b8"; ctx.fillText(({ bfs: "BFS — uniform-cost frontier", dfs: "DFS — dives deep", astar: "A* — goal-directed (g + Manhattan h)" })[algo], 22, 24);

    const cell = Math.min((W - 44) / COLS, 300 / ROWS), ox = (W - cell * COLS) / 2, oy = 36;
    const visitedRank = new Map(); for (let k = 0; k < Math.min(step, total); k++) visitedRank.set(res.order[k], k);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const n = idx(c, r), x = ox + c * cell, y = oy + r * cell;
      if (s.walls.has(n)) ctx.fillStyle = "#0b1220";
      else if (visitedRank.has(n)) { const t = visitedRank.get(n) / Math.max(1, total); ctx.fillStyle = `rgba(96,165,250,${0.15 + 0.45 * (1 - t)})`; }
      else ctx.fillStyle = "rgba(30,41,59,0.4)";
      ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
    }
    // path (when revealed enough)
    if (done && res.path.length) {
      ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 3; ctx.beginPath();
      res.path.forEach((n, i) => { const x = ox + (n % COLS) * cell + cell / 2, y = oy + ((n / COLS) | 0) * cell + cell / 2; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
      ctx.stroke();
    }
    // start/goal
    const mark = (n, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(ox + (n % COLS) * cell + cell / 2, oy + ((n / COLS) | 0) * cell + cell / 2, cell * 0.28, 0, Math.PI * 2); ctx.fill(); };
    mark(start, "#34d399"); mark(goal, "#a855f7");

    // results panel
    const py = oy + ROWS * cell + 28;
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono"; ctx.fillText("NODES EXPANDED  ·  fewer = more efficient · optimal = shortest path", 22, py - 6);
    const maxExp = Math.max(s.bfs.expanded, s.dfs.expanded, s.astar.expanded, 1);
    const bfsLen = s.bfs.path.length;
    [["bfs", "BFS"], ["dfs", "DFS"], ["astar", "A*"]].forEach(([k, label], i) => {
      const y = py + 6 + i * 26, r = s[k];
      ctx.fillStyle = k === algo ? "#e2e8f0" : "#94a3b8"; ctx.font = "11px JetBrains Mono"; ctx.fillText(label, 22, y + 12);
      ctx.fillStyle = "rgba(148,163,184,0.15)"; ctx.fillRect(70, y, W - 230, 16);
      ctx.fillStyle = k === "dfs" ? "rgba(248,113,113,0.7)" : "rgba(96,165,250,0.75)"; ctx.fillRect(70, y, (W - 230) * (r.expanded / maxExp), 16);
      ctx.fillStyle = "#cbd5e1"; ctx.fillText(r.expanded + " exp", 74 + (W - 230) * (r.expanded / maxExp) + 6, y + 12);
      const opt = r.path.length === bfsLen;
      ctx.fillStyle = opt ? "#34d399" : "#f87171"; ctx.fillText("len " + (r.path.length - 1) + (opt ? " ✓opt" : " ✗"), W - 110, y + 12);
    });
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
      <SegmentedControl label="// ALGORITHM" tone="violet" value={algo} onChange={(v) => { setAlgo(v); setStep(0); }}
        options={[{ value: "bfs", label: "BFS" }, { value: "dfs", label: "DFS" }, { value: "astar", label: "A*" }]}
        help="Which search to animate. BFS and A* return shortest paths here; DFS returns whatever it stumbles into first. Switch between them on the same maze and compare the explored region and the node counts below." />
      <Slider label="// WALL DENSITY" min={0.1} max={0.4} step={0.02} value={density} onChange={setDensity}
        help="Fraction of cells that are walls (mazes are regenerated until start can reach goal). Denser mazes force more exploration and widen the gap between A* and the uninformed searches." />
      <Slider label="// SPEED (cells/sec)" min={5} max={120} step={5} value={speed} onChange={setSpeed}
        help="Replay speed of the expansion. Slow it to watch BFS's ring, DFS's snaking dive, and A*'s beeline toward the goal." />
      <DemoButton onClick={() => { if (done) setStep(0); setRunning(r => !r); }} primary>{running ? "PAUSE" : (done ? "REPLAY" : "SEARCH")}</DemoButton>
      <DemoButton onClick={() => setStep(v => Math.min(total, v + 1))}>STEP</DemoButton>
      <DemoButton onClick={build}>NEW MAZE</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="EXPANDED" value={res ? res.expanded : "—"} accent="#60a5fa" />
        <StatReadout label="PATH LEN" value={res && res.path.length ? res.path.length - 1 : "—"} accent="#fbbf24" />
      </div>
      <Legend items={[
        { color: "#34d399", label: "start" },
        { color: "#a855f7", label: "goal" },
        { color: "#60a5fa", label: "expanded" },
        { color: "#fbbf24", label: "path" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        All three searches solve the same maze, but how they explore tells the
        story. <b>BFS</b> expands outward in even rings, so the first time it
        reaches the goal it has used the fewest steps — a shortest path — but it
        explores almost everything closer than the goal first. <b>DFS</b> commits
        to one direction and dives until it's stuck, backtracking only when forced;
        it's cheap on memory but the path it returns is usually far from shortest.
      </DemoP>
      <DemoP>
        <b>A*</b> is the informed one: it orders the frontier by g + h, the steps
        taken so far plus a Manhattan-distance guess of steps remaining. Because the
        heuristic points at the goal, A* drives a narrow corridor of exploration
        straight toward it — watch the EXPANDED bars, where A* typically explores a
        fraction of what BFS does while still returning an optimal path (h here
        never overestimates, so optimality is guaranteed). Crank up wall density and
        the gap widens.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        This is the uninformed-vs-informed search dichotomy at the heart of classic
        AI. BFS and Dijkstra guarantee shortest paths by exploring uniformly; DFS
        trades optimality for tiny memory; A* (Hart, Nilsson & Raphael, 1968) adds
        a heuristic to focus the search and is optimal whenever that heuristic is
        admissible (never overestimates). The site's{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/pathfinding/`} style={{ color: "#a855f7" }}>pathfinding</a>{" "}
        demo zooms in on A* alone; this one is the comparison.
      </DemoP>
      <DemoP>
        These are the same primitives under route planning (GPS, games), and they
        connect to the rest of this section: backtracking in{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/n-queens/`} style={{ color: "#a855f7" }}>N-Queens</a>{" "}
        is DFS over assignments, and the optimal-substructure logic of{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/knapsack/`} style={{ color: "#a855f7" }}>dynamic
        programming</a> generalizes Dijkstra/BFS. The art is the heuristic:
        better-informed h means a narrower search, all the way down to the
        learned heuristics that guide modern planners.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="SEARCH / CSP" title="BFS vs DFS vs A*"
      subtitle="Three searches, one maze. Watch uninformed rings and dives versus A*'s heuristic beeline — and compare nodes expanded and path optimality."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/foundations/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="blue" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<BFSDFSAStarDemo />);
