// demos/graph-coloring.jsx — map/graph coloring as a CSP, solved by backtracking
// with optional AC-3 arc-consistency propagation.
//
// The textbook Australia-map instance: color each region so no two neighbors
// share a color, using k colors. Variables = regions, domains = available colors,
// constraints = "adjacent regions differ". Backtracking with MRV variable
// ordering assigns one region at a time; AC-3 propagates each assignment by
// deleting now-impossible colors from neighbors' domains (and cascading), pruning
// dead branches before they're explored. k=3 is solvable; k=2 is not, so the
// search exhausts and reports it — a vivid backtracking run.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, Toggle, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480;
const COLORS = ["#f87171", "#34d399", "#60a5fa", "#fbbf24"];
const CNAME = ["R", "G", "B", "Y"];
const NODES = [
  { id: "WA", x: 0.16, y: 0.46 }, { id: "NT", x: 0.40, y: 0.24 }, { id: "SA", x: 0.44, y: 0.56 },
  { id: "Q", x: 0.66, y: 0.28 }, { id: "NSW", x: 0.72, y: 0.56 }, { id: "V", x: 0.64, y: 0.76 },
  { id: "T", x: 0.70, y: 0.94 },
];
const EDGES = [[0, 1], [0, 2], [1, 2], [1, 3], [2, 3], [2, 4], [2, 5], [3, 4], [4, 5]];
const V = NODES.length;
const ADJ = NODES.map((_, i) => EDGES.filter(e => e.includes(i)).map(e => e[0] === i ? e[1] : e[0]));

function GraphColoringDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const lastRef = _useRef(0);

  const [K, setK] = _useState(3);
  const [useAC3, setUseAC3] = _useState(true);
  const [speed, setSpeed] = _useState(4);
  const [running, setRunning] = _useState(false);
  const [step, setStep] = _useState(0);
  const planRef = _useRef({ events: [], solved: false, assigns: 0, backtracks: 0 });

  // domains given a partial assignment; AC-3 propagation if enabled. null => dead.
  function reduce(assign, ac3) {
    const dom = NODES.map((_, i) => assign[i] >= 0 ? [assign[i]] : Array.from({ length: K }, (_, c) => c));
    // forward consistency: drop colors used by assigned neighbors
    for (let i = 0; i < V; i++) {
      if (assign[i] >= 0) continue;
      let d = dom[i].filter(c => !ADJ[i].some(n => assign[n] === c));
      dom[i] = d; if (d.length === 0) return null;
    }
    if (!ac3) return dom;
    // AC-3 over inequality constraints
    const queue = [];
    EDGES.forEach(([a, b]) => { queue.push([a, b]); queue.push([b, a]); });
    while (queue.length) {
      const [x, y] = queue.shift();
      let removed = false;
      dom[x] = dom[x].filter(c => {
        const ok = dom[y].some(cy => cy !== c);   // c has a support in y
        if (!ok) removed = true; return ok;
      });
      if (dom[x].length === 0) return null;
      if (removed) ADJ[x].forEach(z => { if (z !== y) queue.push([z, x]); });
    }
    return dom;
  }

  function plan(k, ac3) {
    const assign = new Array(V).fill(-1);
    const events = []; let assigns = 0, backtracks = 0, solved = false;
    function bt() {
      const dom = reduce(assign, ac3);
      if (!dom) return false;
      // MRV: unassigned var with smallest domain
      let node = -1, best = Infinity;
      for (let i = 0; i < V; i++) if (assign[i] < 0 && dom[i].length < best) { best = dom[i].length; node = i; }
      if (node < 0) { solved = true; return true; }
      for (const c of dom[node]) {
        assign[node] = c; events.push({ t: "a", node, c }); assigns++;
        if (reduce(assign, ac3) && bt()) return true;
        assign[node] = -1; events.push({ t: "u", node }); backtracks++;
      }
      return false;
    }
    bt();
    return { events, solved, assigns, backtracks };
  }

  function rebuild() { planRef.current = plan(K, useAC3); setStep(0); setRunning(false); }
  _useEffect(() => { rebuild(); /* eslint-disable-next-line */ }, [K, useAC3]);

  // current assignment by replaying events up to `step`
  const p = planRef.current;
  const assign = new Array(V).fill(-1);
  let aCount = 0, bCount = 0, curNode = -1;
  for (let i = 0; i < step && i < p.events.length; i++) {
    const e = p.events[i];
    if (e.t === "a") { assign[e.node] = e.c; aCount++; curNode = e.node; }
    else { assign[e.node] = -1; bCount++; curNode = e.node; }
  }
  const finished = step >= p.events.length;
  const dom = reduce(assign, useAC3) || NODES.map(() => []);

  _useEffect(() => {
    if (!running) return;
    const loop = (now) => {
      if (now - lastRef.current >= 1000 / speed) {
        lastRef.current = now;
        setStep(s => { if (s >= p.events.length) { setRunning(false); return s; } return s + 1; });
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
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("MAP COLORING (CSP)  ·  neighbors must differ · small dots = remaining colors", 20, 24);

    const gx = (x) => 40 + x * (W - 80), gy = (y) => 44 + y * 286;
    // edges
    ctx.strokeStyle = "rgba(148,163,184,0.4)"; ctx.lineWidth = 1.5;
    EDGES.forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(gx(NODES[a].x), gy(NODES[a].y)); ctx.lineTo(gx(NODES[b].x), gy(NODES[b].y)); ctx.stroke(); });
    // nodes
    NODES.forEach((nd, i) => {
      const x = gx(nd.x), y = gy(nd.y), R = 22;
      if (assign[i] >= 0) {
        ctx.fillStyle = COLORS[assign[i]];
        ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = "rgba(30,41,59,0.85)";
        ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
        // domain dots
        const d = dom[i] || [];
        d.forEach((c, j) => {
          const a = -Math.PI / 2 + (j - (d.length - 1) / 2) * 0.5;
          ctx.fillStyle = COLORS[c];
          ctx.beginPath(); ctx.arc(x + Math.cos(a) * 9, y + Math.sin(a) * 9, 3.5, 0, Math.PI * 2); ctx.fill();
        });
      }
      ctx.strokeStyle = i === curNode && !finished ? "#fbbf24" : "rgba(226,232,240,0.4)";
      ctx.lineWidth = i === curNode && !finished ? 3 : 1;
      ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#e2e8f0"; ctx.font = "10px JetBrains Mono"; ctx.textAlign = "center";
      ctx.fillText(nd.id, x, y + 3); ctx.textAlign = "left";
    });

    // status
    const sy = 360;
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono";
    ctx.fillText("assignments: " + aCount + "    backtracks: " + bCount, 40, sy);
    if (finished) {
      ctx.fillStyle = p.solved ? "#34d399" : "#f87171";
      ctx.fillText(p.solved ? "✓ solved with " + K + " colors" : "✗ no " + K + "-coloring exists (search exhausted)", 40, sy + 20);
    } else { ctx.fillStyle = "#64748b"; ctx.fillText("searching…  step " + step + "/" + p.events.length, 40, sy + 20); }
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
      <Slider label="// COLORS (k)" min={2} max={4} step={1} value={K} onChange={setK} tone="violet"
        help="Palette size. This map needs 3 colors: k=2 is impossible (watch the search exhaust and report no solution), k=3 solves cleanly, k=4 solves with room to spare." />
      <Toggle label="// AC-3 PROPAGATION" checked={useAC3} onChange={setUseAC3}
        help="On: after each assignment, arc-consistency deletes now-impossible colors from neighbors' domains and cascades, catching dead ends early. Off: plain backtracking, which only notices a conflict when it reaches the stuck region. Compare the backtrack counts." />
      <Slider label="// SPEED (steps/sec)" min={1} max={20} step={1} value={speed} onChange={setSpeed}
        help="Replay speed of the search. Slow it to watch domains shrink as constraints propagate." />
      <DemoButton onClick={() => { if (finished) setStep(0); setRunning(r => !r); }} primary>{running ? "PAUSE" : (finished ? "REPLAY" : "SOLVE")}</DemoButton>
      <DemoButton onClick={() => setStep(s => Math.min(p.events.length, s + 1))}>STEP</DemoButton>
      <DemoButton onClick={() => setStep(0)}>RESET</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="ASSIGNS" value={aCount} accent="#60a5fa" />
        <StatReadout label="BACKTRACKS" value={bCount} accent="#fbbf24" />
      </div>
      <StatReadout label="STATUS" value={finished ? (p.solved ? "SOLVED" : "INFEASIBLE") : "SEARCHING"} accent={finished && p.solved ? "#34d399" : finished ? "#f87171" : "#94a3b8"} />
      <Legend items={[
        { color: "#f87171", label: "color R" },
        { color: "#34d399", label: "color G" },
        { color: "#60a5fa", label: "color B" },
        { color: "#fbbf24", label: "current region" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Coloring a map so neighboring regions differ is a constraint-satisfaction
        problem: each region is a variable, its domain is the available colors, and
        every shared border is a "must differ" constraint. The solver assigns one
        region at a time, choosing the most-constrained region first (MRV — fewest
        colors left), and the small dots inside each uncolored region show its
        live domain shrinking as neighbors get colored.
      </DemoP>
      <DemoP>
        Toggle AC-3 and re-solve. With propagation on, the instant a region is
        colored, arc-consistency strips that color from neighbors and cascades the
        consequences — so a doomed branch is caught before the solver wanders into
        it. Turn it off and watch backtracks climb as plain search only discovers
        conflicts at the dead end. Set k=2 to see the dramatic case: no 2-coloring
        exists, so the search must exhaust every option and prove it.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Map coloring is the canonical CSP, and graph coloring underlies real
        problems: register allocation in compilers, exam/timetable scheduling,
        frequency assignment in wireless networks, and Sudoku (a 9-coloring with
        extra constraints). AC-3 is the standard arc-consistency algorithm; combined
        with MRV and least-constraining-value ordering it's the textbook recipe that
        makes backtracking practical on large instances.
      </DemoP>
      <DemoP>
        It's the propagation-heavy sibling of the{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/n-queens/`} style={{ color: "#a855f7" }}>N-Queens</a>{" "}
        demo (which used the lighter forward checking), and a complete method like{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/pathfinding/`} style={{ color: "#a855f7" }}>A* search</a>:
        it will find a coloring if one exists or prove none does. For the hardest
        instances, constraint solvers escalate to conflict-driven clause learning
        (the engine inside modern SAT/SMT solvers) — but the assign-propagate-
        backtrack loop you're watching is the foundation under all of it.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="SEARCH / CSP" title="Graph Coloring (AC-3)"
      subtitle="Color the map so neighbors differ. Backtracking with arc-consistency propagation — watch domains shrink, and compare backtracks with AC-3 on vs off."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/foundations/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<GraphColoringDemo />);
