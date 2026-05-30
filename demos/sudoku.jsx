// demos/sudoku.jsx — Sudoku as a CSP: backtracking + constraint propagation.
//
// 81 cells, each constrained by its row, column, and 3x3 box. The solver runs
// recursive backtracking with MRV (branch on the cell with the fewest candidates)
// and optional constraint propagation via "naked singles": any cell with exactly
// one candidate is filled for free, cascading. With propagation on, a typical
// puzzle is solved in a handful of guesses; turn it off and the backtrack counter
// explodes — the same algorithm, vastly more search. The whole run is recorded as
// a replayable trace of fill / unfill events.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Toggle, Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480;
const PUZZLE = "530070000600195000098000060800060003400803001700020006060000280000419005000080079";
const MAX_EVENTS = 40000;

function candidates(b, idx) {
  const r = Math.floor(idx / 9), c = idx % 9, br = r - r % 3, bc = c - c % 3;
  const used = new Set();
  for (let k = 0; k < 9; k++) { used.add(b[r * 9 + k]); used.add(b[k * 9 + c]); }
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) used.add(b[(br + i) * 9 + (bc + j)]);
  const out = []; for (let d = 1; d <= 9; d++) if (!used.has(d)) out.push(d);
  return out;
}

function SudokuDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const lastRef = _useRef(0);

  const [propagate, setPropagate] = _useState(true);
  const [speed, setSpeed] = _useState(20);
  const [running, setRunning] = _useState(false);
  const [step, setStep] = _useState(0);
  const planRef = _useRef({ events: [], solved: false, guesses: 0, backtracks: 0 });

  const given = PUZZLE.split("").map(Number);

  function plan(prop) {
    const b = given.slice();
    const events = []; let guesses = 0, backtracks = 0, solved = false, capped = false;
    function fill(idx, val, kind) { b[idx] = val; events.push({ t: "f", idx, val, kind }); if (kind === "guess") guesses++; if (events.length > MAX_EVENTS) capped = true; }
    function unfill(idx) { b[idx] = 0; events.push({ t: "u", idx }); }
    function solve() {
      if (capped) return false;
      const filledHere = [];
      if (prop) {
        let progress = true;
        while (progress && !capped) {
          progress = false;
          for (let i = 0; i < 81; i++) {
            if (b[i] !== 0) continue;
            const cand = candidates(b, i);
            if (cand.length === 0) { for (let k = filledHere.length - 1; k >= 0; k--) unfill(filledHere[k]); return false; }
            if (cand.length === 1) { fill(i, cand[0], "single"); filledHere.push(i); progress = true; }
          }
        }
      }
      // pick MRV empty cell
      let node = -1, best = 10, nodeCand = null;
      for (let i = 0; i < 81; i++) {
        if (b[i] !== 0) continue;
        const cand = candidates(b, i);
        if (cand.length < best) { best = cand.length; node = i; nodeCand = cand; }
      }
      if (node < 0) { solved = true; return true; }
      if (best === 0) { for (let k = filledHere.length - 1; k >= 0; k--) unfill(filledHere[k]); return false; }
      for (const v of nodeCand) {
        if (capped) break;
        fill(node, v, "guess");
        if (solve()) return true;
        unfill(node); backtracks++;
      }
      for (let k = filledHere.length - 1; k >= 0; k--) unfill(filledHere[k]);
      return false;
    }
    solve();
    return { events, solved, guesses, backtracks, capped };
  }

  function rebuild() { planRef.current = plan(propagate); setStep(0); setRunning(false); }
  _useEffect(() => { rebuild(); /* eslint-disable-next-line */ }, [propagate]);

  const p = planRef.current;
  const board = given.slice();
  let curIdx = -1, guesses = 0, backtracks = 0;
  for (let i = 0; i < step && i < p.events.length; i++) {
    const e = p.events[i];
    if (e.t === "f") { board[e.idx] = e.val; curIdx = e.idx; if (e.kind === "guess") guesses++; }
    else { board[e.idx] = 0; curIdx = e.idx; backtracks++; }
  }
  const finished = step >= p.events.length;

  _useEffect(() => {
    if (!running) return;
    const loop = (now) => {
      if (now - lastRef.current >= 1000 / speed) {
        lastRef.current = now;
        setStep(s => { if (s >= p.events.length) { setRunning(false); return s; } return Math.min(p.events.length, s + Math.max(1, Math.round(speed / 20))); });
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line
  }, [running, speed, p.events.length]);

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.textBaseline = "middle"; ctx.textAlign = "center";
    const G = 360, cell = G / 9, ox = (W - G) / 2, oy = 40;

    for (let i = 0; i < 81; i++) {
      const r = Math.floor(i / 9), c = i % 9, x = ox + c * cell, y = oy + r * cell;
      ctx.fillStyle = i === curIdx && !finished ? "rgba(251,191,36,0.18)" : "rgba(15,23,42,0.5)";
      ctx.fillRect(x, y, cell, cell);
      if (board[i] !== 0) {
        const isGiven = given[i] !== 0;
        ctx.fillStyle = isGiven ? "#e2e8f0" : (finished && p.solved ? "#34d399" : "#60a5fa");
        ctx.font = (isGiven ? "600 " : "") + "18px JetBrains Mono";
        ctx.fillText(String(board[i]), x + cell / 2, y + cell / 2 + 1);
      }
    }
    // grid lines
    for (let k = 0; k <= 9; k++) {
      ctx.strokeStyle = k % 3 === 0 ? "rgba(96,165,250,0.6)" : "rgba(96,165,250,0.18)";
      ctx.lineWidth = k % 3 === 0 ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(ox + k * cell, oy); ctx.lineTo(ox + k * cell, oy + G); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox, oy + k * cell); ctx.lineTo(ox + G, oy + k * cell); ctx.stroke();
    }
    // status
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono";
    ctx.fillText("guesses: " + guesses + "    backtracks: " + backtracks + "    events: " + step + "/" + p.events.length, ox, oy + G + 22);
    if (finished) {
      ctx.fillStyle = p.solved ? "#34d399" : "#f87171";
      ctx.fillText(p.solved ? "✓ solved" : (p.capped ? "search capped (too many steps without propagation)" : "no solution"), ox, oy + G + 42);
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
      <Toggle label="// CONSTRAINT PROPAGATION" checked={propagate} onChange={setPropagate} tone="violet"
        help="On: fill every 'naked single' (a cell with exactly one possible digit) for free, cascading, before guessing — and detect dead ends immediately. Off: pure backtracking that only guesses. Watch the guess and backtrack counters explode when you turn it off." />
      <Slider label="// SPEED (events/sec)" min={2} max={200} step={2} value={speed} onChange={setSpeed}
        help="Replay speed. Propagation-on solves in a few dozen events; propagation-off can be thousands, so crank this up to watch the latter finish." />
      <DemoButton onClick={() => { if (finished) setStep(0); setRunning(r => !r); }} primary>{running ? "PAUSE" : (finished ? "REPLAY" : "SOLVE")}</DemoButton>
      <DemoButton onClick={() => setStep(s => Math.min(p.events.length, s + 1))}>STEP</DemoButton>
      <DemoButton onClick={() => setStep(0)}>RESET</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="GUESSES" value={guesses} accent="#60a5fa" />
        <StatReadout label="BACKTRACKS" value={backtracks} accent="#fbbf24" />
      </div>
      <StatReadout label="TOTAL EVENTS" value={p.events.length + (p.capped ? "+" : "")} accent="#c084fc" />
      <Legend items={[
        { color: "#e2e8f0", label: "given clue" },
        { color: "#60a5fa", label: "solver fill" },
        { color: "#fbbf24", label: "current cell" },
        { color: "#34d399", label: "solved" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Sudoku is a constraint-satisfaction problem in disguise: 81 variables, each
        a digit 1–9, constrained so no row, column, or 3×3 box repeats. The solver
        guesses on the cell with the fewest remaining candidates (the MRV
        heuristic), recursing and backtracking whenever a guess leads to a dead
        end. Given clues are white; cells the solver fills are blue; the yellow
        cell is where it's working.
      </DemoP>
      <DemoP>
        The real lever is CONSTRAINT PROPAGATION. With it on, any cell pinned to a
        single possible digit gets filled immediately and the consequences cascade,
        so most of the grid falls out with only a handful of actual guesses. Turn
        it off and the same backtracking search has to grope through the tree by
        guessing alone — watch GUESSES and BACKTRACKS jump by orders of magnitude
        for the identical puzzle. Propagation is what turns an exponential search
        into something that finishes in the blink of an eye.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Sudoku is the friendly face of CSP solving, and the techniques scale far
        beyond the puzzle: backtracking, constraint propagation, and variable
        ordering are exactly the machinery behind scheduling, planning, and
        verification. "Naked singles" here is the simplest propagation rule;
        production solvers add hidden singles, locked candidates, and full
        arc-consistency — the same{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/graph-coloring/`} style={{ color: "#a855f7" }}>AC-3</a>{" "}
        idea generalized.
      </DemoP>
      <DemoP>
        It rounds out the search trio with{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/n-queens/`} style={{ color: "#a855f7" }}>N-Queens</a>{" "}
        and graph coloring: all three are complete backtracking searches whose
        practicality lives or dies on pruning. The propagation toggle is the whole
        lesson of the field in one switch — choosing <i>what to deduce before you
        search</i> matters far more than how fast you search. Modern SAT/SMT solvers
        push this to its limit with conflict-driven clause learning.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="SEARCH / CSP" title="Sudoku Solver"
      subtitle="Backtracking + constraint propagation on a 9×9 grid. Toggle propagation off and watch the guess and backtrack counts explode for the same puzzle."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/foundations/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<SudokuDemo />);
