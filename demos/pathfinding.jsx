// demos/pathfinding.jsx — A* / Dijkstra / Greedy / BFS pathfinding visualizer.
// Real search computed live in JS; canvas render; draggable walls + start/goal.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, Toggle, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const COLS = 27, ROWS = 18, CELL = 22;
const key = (x, y) => x + "," + y;
const DIRS4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIRS8 = [...DIRS4, [1, 1], [1, -1], [-1, 1], [-1, -1]];

function emptyGrid() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function PathfindingDemo() {
  const canvasRef = _useRef(null);
  const gridRef = _useRef(emptyGrid());
  const startRef = _useRef({ x: 3, y: 9 });
  const goalRef = _useRef({ x: 23, y: 9 });
  const searchRef = _useRef(null);
  const rafRef = _useRef(null);
  const dragRef = _useRef(null);
  const dprRef = _useRef(1);

  const [algo, setAlgo] = _useState("astar");
  const [heur, setHeur] = _useState("manhattan");
  const [diag, setDiag] = _useState(false);
  const [speed, setSpeed] = _useState(8);
  const [running, setRunning] = _useState(false);
  const [stats, setStats] = _useState({ visited: 0, path: 0, status: "IDLE" });

  // mirror state into refs so the RAF loop reads the latest without restarting
  const algoRef = _useRef(algo), heurRef = _useRef(heur), diagRef = _useRef(diag), speedRef = _useRef(speed);
  _useEffect(() => { algoRef.current = algo; }, [algo]);
  _useEffect(() => { heurRef.current = heur; }, [heur]);
  _useEffect(() => { diagRef.current = diag; }, [diag]);
  _useEffect(() => { speedRef.current = speed; }, [speed]);

  // ── geometry / algorithm ───────────────────────────────────
  function h(n) {
    const g = goalRef.current;
    const dx = Math.abs(n.x - g.x), dy = Math.abs(n.y - g.y);
    if (heurRef.current === "euclidean") return Math.hypot(dx, dy);
    if (heurRef.current === "chebyshev") return Math.max(dx, dy);
    return dx + dy;
  }
  function neighbors(n) {
    const dirs = diagRef.current ? DIRS8 : DIRS4;
    const out = [];
    for (const [dx, dy] of dirs) {
      const nx = n.x + dx, ny = n.y + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      if (gridRef.current[ny][nx] === 1) continue;
      out.push({ x: nx, y: ny });
    }
    return out;
  }
  function initSearch() {
    const sx = startRef.current;
    const sk = key(sx.x, sx.y);
    searchRef.current = {
      open: [{ ...sx }], openSet: new Set([sk]), closed: new Set(),
      g: new Map([[sk, 0]]), cameFrom: new Map(),
      done: false, found: false, path: [], pathSet: new Set(),
    };
  }
  function stepOnce() {
    const s = searchRef.current;
    if (!s || s.done) return;
    if (s.open.length === 0) { s.done = true; s.found = false; return; }
    // pick next node
    let idx = 0;
    if (algoRef.current !== "bfs") {
      let best = Infinity;
      for (let i = 0; i < s.open.length; i++) {
        const n = s.open[i], k = key(n.x, n.y), g = s.g.get(k) || 0;
        const f = algoRef.current === "dijkstra" ? g
          : algoRef.current === "greedy" ? h(n)
          : g + h(n);
        if (f < best) { best = f; idx = i; }
      }
    }
    const cur = s.open.splice(idx, 1)[0];
    const ck = key(cur.x, cur.y);
    s.openSet.delete(ck);
    if (s.closed.has(ck)) return;
    s.closed.add(ck);
    if (cur.x === goalRef.current.x && cur.y === goalRef.current.y) {
      s.done = true; s.found = true;
      let c = ck; const path = [];
      while (c !== undefined) {
        const [px, py] = c.split(",").map(Number);
        path.push({ x: px, y: py });
        c = s.cameFrom.get(c);
      }
      s.path = path; s.pathSet = new Set(path.map(p => key(p.x, p.y)));
      return;
    }
    for (const nb of neighbors(cur)) {
      const nk = key(nb.x, nb.y);
      if (s.closed.has(nk)) continue;
      const stepCost = (nb.x !== cur.x && nb.y !== cur.y) ? Math.SQRT2 : 1;
      const tentative = (s.g.get(ck) || 0) + (algoRef.current === "bfs" ? 1 : stepCost);
      if (!s.openSet.has(nk) || tentative < (s.g.has(nk) ? s.g.get(nk) : Infinity)) {
        s.cameFrom.set(nk, ck);
        s.g.set(nk, tentative);
        if (!s.openSet.has(nk)) { s.open.push(nb); s.openSet.add(nk); }
      }
    }
  }
  function stepN(n) { for (let i = 0; i < n; i++) { const s = searchRef.current; if (!s || s.done) break; stepOnce(); } }

  function updateStats() {
    const s = searchRef.current;
    setStats({
      visited: s ? s.closed.size : 0,
      path: s && s.found ? s.path.length : 0,
      status: !s ? "IDLE" : s.done ? (s.found ? "FOUND" : "NO PATH") : "RUNNING",
    });
  }

  // ── rendering ──────────────────────────────────────────────
  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, COLS * CELL, ROWS * CELL);
    const s = searchRef.current;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const k = key(x, y);
      let fill = "rgba(96,165,250,0.035)";
      if (gridRef.current[y][x] === 1) fill = "#334155";
      else if (s) {
        if (s.pathSet.has(k)) fill = "#c084fc";
        else if (s.closed.has(k)) fill = "rgba(59,130,246,0.32)";
        else if (s.openSet.has(k)) fill = "rgba(96,165,250,0.55)";
      }
      ctx.fillStyle = fill;
      ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 1, CELL - 1);
    }
    drawMarker(ctx, startRef.current, "#3b82f6", "S");
    drawMarker(ctx, goalRef.current, "#a855f7", "G");
  }
  function drawMarker(ctx, p, color, label) {
    ctx.fillStyle = color;
    ctx.fillRect(p.x * CELL + 1, p.y * CELL + 1, CELL - 1, CELL - 1);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px 'JetBrains Mono', monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(label, p.x * CELL + CELL / 2, p.y * CELL + CELL / 2);
  }

  // ── interaction ────────────────────────────────────────────
  function cellFromEvent(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / (rect.width / COLS));
    const y = Math.floor((e.clientY - rect.top) / (rect.height / ROWS));
    return { x: Math.max(0, Math.min(COLS - 1, x)), y: Math.max(0, Math.min(ROWS - 1, y)) };
  }
  const isStart = c => c.x === startRef.current.x && c.y === startRef.current.y;
  const isGoal = c => c.x === goalRef.current.x && c.y === goalRef.current.y;

  function clearSearch() { searchRef.current = null; }

  function onDown(e) {
    if (running) return;
    const c = cellFromEvent(e);
    if (isStart(c)) dragRef.current = "start";
    else if (isGoal(c)) dragRef.current = "goal";
    else if (gridRef.current[c.y][c.x] === 1) { dragRef.current = "erase"; gridRef.current[c.y][c.x] = 0; }
    else { dragRef.current = "wall"; gridRef.current[c.y][c.x] = 1; }
    clearSearch(); updateStats(); draw();
    canvasRef.current.setPointerCapture(e.pointerId);
  }
  function onMove(e) {
    if (!dragRef.current) return;
    const c = cellFromEvent(e);
    const m = dragRef.current;
    if (m === "start") { if (!isGoal(c) && gridRef.current[c.y][c.x] === 0) startRef.current = c; }
    else if (m === "goal") { if (!isStart(c) && gridRef.current[c.y][c.x] === 0) goalRef.current = c; }
    else if (m === "wall") { if (!isStart(c) && !isGoal(c)) gridRef.current[c.y][c.x] = 1; }
    else if (m === "erase") { if (!isStart(c) && !isGoal(c)) gridRef.current[c.y][c.x] = 0; }
    clearSearch(); draw();
  }
  function onUp(e) {
    dragRef.current = null;
    try { canvasRef.current.releasePointerCapture(e.pointerId); } catch (_) {}
    updateStats();
  }

  // ── controls ───────────────────────────────────────────────
  function handleRun() {
    if (running) { setRunning(false); return; }
    const s = searchRef.current;
    if (!s || s.done) initSearch();
    setRunning(true);
  }
  function handleStep() {
    if (running) return;
    const s = searchRef.current;
    if (!s || s.done) initSearch();
    stepOnce(); draw(); updateStats();
  }
  function handleResetSearch() { setRunning(false); clearSearch(); draw(); updateStats(); }
  function handleClearWalls() { setRunning(false); gridRef.current = emptyGrid(); clearSearch(); draw(); updateStats(); }
  function handleMaze() {
    setRunning(false);
    const g = emptyGrid();
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (Math.random() < 0.28) g[y][x] = 1;
    }
    g[startRef.current.y][startRef.current.x] = 0;
    g[goalRef.current.y][goalRef.current.x] = 0;
    gridRef.current = g; clearSearch(); draw(); updateStats();
  }
  function resetOnSetting(setter, v) { setRunning(false); clearSearch(); setter(v); requestAnimationFrame(draw); }

  // ── mount ──────────────────────────────────────────────────
  _useEffect(() => {
    const cv = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr;
    cv.width = COLS * CELL * dpr;
    cv.height = ROWS * CELL * dpr;
    cv.style.width = COLS * CELL + "px";
    cv.style.height = ROWS * CELL + "px";
    draw();
  }, []);

  _useEffect(() => {
    if (!running) return;
    let alive = true;
    const loop = () => {
      if (!alive) return;
      stepN(speedRef.current);
      draw();
      const s = searchRef.current;
      updateStats();
      if (!s || s.done) { setRunning(false); return; }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, [running]);

  const showHeuristic = algo === "astar" || algo === "greedy";

  const stage = (
    <canvas ref={canvasRef}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
      style={{ touchAction: "none", cursor: "pointer", maxWidth: "100%", borderRadius: 4 }} />
  );

  const controls = (
    <ControlGroup>
      <SegmentedControl label="// ALGORITHM" value={algo} onChange={v => resetOnSetting(setAlgo, v)}
        options={[
          { value: "astar", label: "A*" }, { value: "dijkstra", label: "Dijkstra" },
          { value: "greedy", label: "Greedy" }, { value: "bfs", label: "BFS" },
        ]}
        help="Which search strategy ranks cells. Dijkstra and BFS guarantee the shortest path; Greedy is fast but can miss it; A* heads toward the goal while staying optimal." />
      {showHeuristic && (
        <SegmentedControl label="// HEURISTIC" tone="violet" value={heur} onChange={v => resetOnSetting(setHeur, v)}
          options={[
            { value: "manhattan", label: "Manhattan" }, { value: "euclidean", label: "Euclid" },
            { value: "chebyshev", label: "Chebyshev" },
          ]}
          help="A*/Greedy's estimate of distance left to the goal. Manhattan suits 4-way grids, Euclid/Chebyshev suit diagonal moves; an admissible (never-overestimating) heuristic keeps A* optimal." />
      )}
      <Toggle label="// DIAGONAL MOVES" checked={diag} onChange={v => resetOnSetting(setDiag, v)}
        help="Allow 8-way movement instead of 4-way. Diagonals cost √2 and let paths cut corners — pair with the Euclid or Chebyshev heuristic." />
      <Slider label="// SPEED" min={1} max={30} value={speed} onChange={setSpeed} suffix=" /frame"
        help="How many search steps run per frame. Visual pacing only — it does not change which path is found." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={handleRun} primary>{running ? "PAUSE" : "RUN"}</DemoButton>
        <DemoButton onClick={handleStep} disabled={running}>STEP</DemoButton>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={handleResetSearch}>RESET</DemoButton>
        <DemoButton onClick={handleClearWalls}>CLEAR</DemoButton>
        <DemoButton onClick={handleMaze} tone="violet">MAZE</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="VISITED" value={stats.visited} />
        <StatReadout label="PATH" value={stats.path} accent="var(--violet-lt)" />
      </div>
      <StatReadout label="STATUS" value={stats.status}
        accent={stats.status === "FOUND" ? "var(--violet-lt)" : stats.status === "NO PATH" ? "#f87171" : "var(--blue-lt)"} />
      <Legend items={[
        { color: "#3b82f6", label: "START" }, { color: "#a855f7", label: "GOAL" },
        { color: "#334155", label: "WALL" }, { color: "rgba(59,130,246,0.32)", label: "VISITED" },
        { color: "rgba(96,165,250,0.55)", label: "FRONTIER" }, { color: "#c084fc", label: "PATH" },
      ]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Every algorithm here explores the grid by repeatedly expanding the most
        promising cell, but they disagree on what "promising" means. <b>Dijkstra</b>
        and <b>BFS</b> expand by distance from the start (guaranteed shortest path,
        but they fan out in every direction). <b>Greedy</b> best-first expands by the
        heuristic estimate of distance to the goal (fast, but can miss the shortest
        route). <b>A*</b> combines both — it ranks cells by <i>f = g + h</i>, the
        cost so far plus the estimated cost remaining — so it heads toward the goal
        while staying optimal when the heuristic never overestimates.
      </DemoP>
      <DemoP>
        Watch the <span style={{ color: "#60a5fa" }}>frontier</span> (cells queued to
        explore) and the <span style={{ color: "#3b82f6" }}>visited</span> set grow,
        then the <span style={{ color: "#c084fc" }}>path</span> light up. Notice how
        A* with the Manhattan heuristic visits far fewer cells than Dijkstra to find
        the same path. Drag the start and goal, paint walls, or drop a random maze.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Informed search is foundational classical AI used far beyond game grids: GPS
        routing, robot motion planning, network packet routing, and puzzle solvers all run
        A* or a close relative. The <i>f = g + h</i> split — cost already paid plus an
        admissible estimate of cost remaining — is the template for cost-guided search
        across computer science.
      </DemoP>
      <DemoP>
        The same "expand the most promising frontier node first" idea generalizes straight
        into modern AI: <b>beam search</b> in language-model decoding, <b>branch-and-bound</b>
        in optimization, and <b>Monte-Carlo Tree Search</b> in game-playing agents (the
        engine behind AlphaGo) all trade completeness for speed using a heuristic. The
        through-line is <i>admissibility</i> — knowing when a heuristic is optimistic enough
        to still guarantee the best answer.
      </DemoP>
    </>
  );
  return (
    <DemoLayout
      topic="SEARCH · CLASSIC AI"
      title="A* Pathfinding"
      subtitle="Informed search, live. Drop walls, drag the endpoints, and watch four classic algorithms race to the goal."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      repoHref="https://github.com/derrickmo"
      tone="blue"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<PathfindingDemo />);
