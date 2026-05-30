// demos/n-queens.jsx — N-Queens by backtracking search, with forward checking.
//
// Place one queen per column so none attack. Classic depth-first backtracking:
// try rows in the current column; if a row is safe (no same row / diagonal as an
// earlier queen) descend to the next column; if a column has no safe row, back up
// and try the previous column's next row. FORWARD CHECKING adds constraint
// propagation: before descending, verify every remaining column still has at
// least one safe row — pruning placements that are already doomed and slashing
// the nodes explored. The node/backtrack counters make the speedup concrete.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, Toggle, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480;

function NQueensDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const lastRef = _useRef(0);

  const [N, setN] = _useState(8);
  const [forward, setForward] = _useState(true);
  const [speed, setSpeed] = _useState(12);
  const [running, setRunning] = _useState(false);
  const [, force] = _useState(0);
  const st = _useRef(null);

  function reset() {
    st.current = { N, cols: new Array(N).fill(-1), c: 0, tryRow: 0, nodes: 0, backtracks: 0, solutions: 0, done: false, lastEvent: "" };
    force(x => x + 1);
  }
  _useEffect(() => { reset(); /* eslint-disable-next-line */ }, [N]);

  function safe(s, col, row) {
    for (let k = 0; k < col; k++) {
      if (s.cols[k] < 0) continue;
      if (s.cols[k] === row || Math.abs(s.cols[k] - row) === Math.abs(k - col)) return false;
    }
    return true;
  }
  function fcOk(s, col, row) {
    s.cols[col] = row;
    let ok = true;
    for (let f = col + 1; f < s.N && ok; f++) {
      let any = false;
      for (let rr = 0; rr < s.N; rr++) if (safe(s, f, rr)) { any = true; break; }
      if (!any) ok = false;
    }
    s.cols[col] = -1;
    return ok;
  }

  function step() {
    const s = st.current; if (!s || s.done) return;
    if (s.c === s.N) {                       // full solution
      s.solutions++; s.lastEvent = "solution found"; s.done = true; return;
    }
    let placed = false;
    for (let r = s.tryRow; r < s.N; r++) {
      s.nodes++;
      if (safe(s, s.c, r) && (!forward || fcOk(s, s.c, r))) { s.cols[s.c] = r; s.c++; s.tryRow = 0; placed = true; s.lastEvent = "place col " + (s.c - 1); break; }
    }
    if (!placed) {
      s.c--;
      if (s.c < 0) { s.done = true; s.lastEvent = "no solution"; return; }
      s.tryRow = s.cols[s.c] + 1; s.cols[s.c] = -1; s.backtracks++; s.lastEvent = "backtrack to col " + s.c;
    }
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const s = st.current; if (!s) return;
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";

    const boardPx = 360, cell = boardPx / s.N, bx = (W - boardPx) / 2, by = 46;
    // attacked cells from placed queens
    const attacked = Array.from({ length: s.N }, () => new Array(s.N).fill(false));
    for (let c = 0; c < s.N; c++) {
      const r = s.cols[c]; if (r < 0) continue;
      for (let cc = 0; cc < s.N; cc++) for (let rr = 0; rr < s.N; rr++) {
        if (cc === c && rr === r) continue;
        if (rr === r || cc === c || Math.abs(rr - r) === Math.abs(cc - c)) attacked[cc][rr] = true;
      }
    }
    for (let c = 0; c < s.N; c++) for (let r = 0; r < s.N; r++) {
      const x = bx + c * cell, y = by + r * cell;
      const light = (c + r) % 2 === 0;
      ctx.fillStyle = light ? "rgba(96,165,250,0.10)" : "rgba(15,23,42,0.6)";
      ctx.fillRect(x, y, cell - 1, cell - 1);
      if (attacked[c][r]) { ctx.fillStyle = "rgba(248,113,113,0.10)"; ctx.fillRect(x, y, cell - 1, cell - 1); }
    }
    // current column highlight
    if (!s.done && s.c >= 0 && s.c < s.N) {
      ctx.strokeStyle = "rgba(251,191,36,0.7)"; ctx.lineWidth = 2;
      ctx.strokeRect(bx + s.c * cell, by, cell - 1, boardPx);
    }
    // queens
    for (let c = 0; c < s.N; c++) {
      const r = s.cols[c]; if (r < 0) continue;
      const cx = bx + c * cell + cell / 2, cy = by + r * cell + cell / 2, rad = cell * 0.3;
      ctx.fillStyle = s.done && s.solutions > 0 ? "#34d399" : "#a855f7";
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(11,18,32,0.85)";
      // little crown notches
      ctx.fillRect(cx - rad * 0.6, cy - rad * 0.1, rad * 1.2, rad * 0.25);
    }

    // status
    const sy = by + boardPx + 24;
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono";
    ctx.fillText("nodes tried: " + s.nodes + "    backtracks: " + s.backtracks, bx, sy);
    ctx.fillStyle = s.solutions > 0 ? "#34d399" : s.done ? "#f87171" : "#64748b";
    ctx.fillText(s.done ? (s.solutions > 0 ? "✓ solved" : "no solution") : (s.lastEvent || "searching…"), bx, sy + 18);
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  });

  _useEffect(() => {
    if (!running) return;
    const loop = (now) => {
      const iv = 1000 / speed;
      if (now - lastRef.current >= iv) { lastRef.current = now; step(); if (st.current.done) setRunning(false); force(x => x + 1); }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line
  }, [running, speed, forward]);

  const s = st.current || { nodes: 0, backtracks: 0, solutions: 0, done: false };
  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// BOARD SIZE (N)" min={4} max={12} step={1} value={N} onChange={setN}
        help="Queens to place on an N×N board. The raw search space is N^N; backtracking + pruning is what makes even N=12 tractable. (N=2,3 have no solution; the search will exhaust and report it.)" />
      <Toggle label="// FORWARD CHECKING" checked={forward} onChange={setForward} tone="violet"
        help="Constraint propagation: before committing a queen, check that every remaining column still has a safe square. Off = plain chronological backtracking. Solve the same board both ways and compare the node counts — propagation prunes enormous dead branches early." />
      <Slider label="// SPEED (steps/sec)" min={1} max={60} step={1} value={speed} onChange={setSpeed}
        help="Search steps per second. Slow it down to watch a single place/backtrack; speed up to race to the solution." />
      <DemoButton onClick={() => { if (s.done) reset(); setRunning(r => !r); }} primary>{running ? "PAUSE" : (s.done ? "SOLVE AGAIN" : "SOLVE")}</DemoButton>
      <DemoButton onClick={() => { step(); force(x => x + 1); }}>STEP</DemoButton>
      <DemoButton onClick={reset}>RESET</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="NODES" value={s.nodes} accent="#60a5fa" />
        <StatReadout label="BACKTRACKS" value={s.backtracks} accent="#fbbf24" />
      </div>
      <StatReadout label="STATUS" value={s.done ? (s.solutions > 0 ? "SOLVED" : "NONE") : "SEARCHING"} accent={s.solutions > 0 ? "#34d399" : "#94a3b8"} />
      <Legend items={[
        { color: "#a855f7", label: "placed queen" },
        { color: "#fbbf24", label: "current column" },
        { color: "#f87171", label: "attacked square" },
        { color: "#34d399", label: "solution" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        N-Queens is the classic constraint-satisfaction problem: variables are the
        columns, each variable's value is a row, and the constraints are "no two
        queens share a row or diagonal". Backtracking solves it depth-first — place
        a queen in the leftmost open column, move right, and the instant a column
        has no legal square, back up and try the previous queen somewhere else. The
        yellow outline is the column currently being filled; red squares are
        already under attack.
      </DemoP>
      <DemoP>
        Watch the NODES and BACKTRACKS counters, then toggle FORWARD CHECKING and
        re-solve the same board. Plain backtracking only discovers a dead end when
        it reaches the doomed column; forward checking looks ahead after every
        placement and refuses any move that empties a future column, pruning whole
        subtrees before entering them. The node count typically drops several-fold —
        the same problem, far less wasted search.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Backtracking is the backbone of constraint satisfaction — Sudoku, graph
        coloring, scheduling, SAT, and theorem proving all reduce to "assign
        variables subject to constraints, undo when stuck". Forward checking is the
        lightest form of constraint propagation; arc consistency (AC-3) and
        conflict-directed backjumping prune even harder, and variable/value ordering
        heuristics (most-constrained-variable, least-constraining-value) decide
        where to search first. They turn exponential blow-ups into something
        practical.
      </DemoP>
      <DemoP>
        It sits beside the site's other search demos as the systematic, complete
        alternative:{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/pathfinding/`} style={{ color: "#a855f7" }}>A* search</a>{" "}
        is informed best-first search for shortest paths, and{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/simulated-annealing/`} style={{ color: "#a855f7" }}>simulated
        annealing</a> is the stochastic, incomplete metaheuristic you reach for when
        the space is too big to enumerate. Backtracking guarantees it will find a
        solution if one exists — the tradeoff is that, without good pruning, "if one
        exists" can take a very long time.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="SEARCH / CSP" title="N-Queens (Backtracking)"
      subtitle="Place N non-attacking queens by depth-first backtracking. Toggle forward checking and watch constraint propagation prune the search."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/foundations/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<NQueensDemo />);
