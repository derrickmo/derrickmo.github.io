// demos/gridworld-rl.jsx — tabular Q-learning in a gridworld.
// Real Q-learning; value heatmap + greedy policy arrows update live.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const COLS = 9, ROWS = 6, CELL = 58;
const W = COLS * CELL, H = ROWS * CELL;
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // up,right,down,left
const START = { x: 0, y: ROWS - 1 }, GOAL = { x: COLS - 1, y: 0 };

function defaultMap() {
  // 0 empty, 1 wall, 2 trap
  const m = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  [[3, 1], [3, 2], [3, 3], [6, 2], [6, 3], [6, 4]].forEach(([x, y]) => { if (m[y]) m[y][x] = 1; });
  [[5, 0], [2, 4]].forEach(([x, y]) => { m[y][x] = 2; });
  m[START.y][START.x] = 0; m[GOAL.y][GOAL.x] = 0;
  return m;
}

function GridworldDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const mapRef = _useRef(defaultMap());
  const QRef = _useRef(null);
  const agentRef = _useRef({ ...START });
  const rafRef = _useRef(null);
  const lastRef = _useRef(0);

  const [alpha, setAlpha] = _useState(0.2);
  const [gamma, setGamma] = _useState(0.95);
  const [eps, setEps] = _useState(0.2);
  const [speed, setSpeed] = _useState(20);
  const [running, setRunning] = _useState(false);
  const [ep, setEp] = _useState(0);
  const [steps, setSteps] = _useState(0);
  const [status, setStatus] = _useState("IDLE");

  const aRef = _useRef(alpha), gRef = _useRef(gamma), eRef = _useRef(eps), spRef = _useRef(speed);
  _useEffect(() => { aRef.current = alpha; }, [alpha]);
  _useEffect(() => { gRef.current = gamma; }, [gamma]);
  _useEffect(() => { eRef.current = eps; }, [eps]);
  _useEffect(() => { spRef.current = speed; }, [speed]);

  function freshQ() { QRef.current = Array.from({ length: ROWS * COLS }, () => [0, 0, 0, 0]); }
  const qi = (x, y) => y * COLS + x;
  const isTerminal = (x, y) => (x === GOAL.x && y === GOAL.y) || mapRef.current[y][x] === 2;

  function stepEnv() {
    const m = mapRef.current, Q = QRef.current, a = agentRef.current;
    const s = qi(a.x, a.y);
    // epsilon-greedy
    let act;
    if (Math.random() < eRef.current) act = Math.floor(Math.random() * 4);
    else { const q = Q[s]; act = q.indexOf(Math.max(...q)); }
    let nx = a.x + DIRS[act][0], ny = a.y + DIRS[act][1];
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || m[ny][nx] === 1) { nx = a.x; ny = a.y; }
    let r = -0.02, terminal = false;
    if (nx === GOAL.x && ny === GOAL.y) { r = 1; terminal = true; }
    else if (m[ny][nx] === 2) { r = -1; terminal = true; }
    const ns = qi(nx, ny);
    const target = r + (terminal ? 0 : gRef.current * Math.max(...Q[ns]));
    Q[s][act] += aRef.current * (target - Q[s][act]);
    agentRef.current = { x: nx, y: ny };
    setSteps(v => v + 1);
    if (terminal) { agentRef.current = { ...START }; setEp(v => v + 1); setStatus(r > 0 ? "REACHED GOAL" : "HIT TRAP"); }
    else setStatus("EXPLORING");
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const m = mapRef.current, Q = QRef.current;
    // value range
    let lo = Infinity, hi = -Infinity;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (m[y][x] === 1 || isTerminal(x, y)) continue;
      const v = Math.max(...Q[qi(x, y)]); lo = Math.min(lo, v); hi = Math.max(hi, v);
    }
    if (!isFinite(lo)) { lo = 0; hi = 1; }
    const span = hi - lo || 1;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const px = x * CELL, py = y * CELL;
      let fill = "rgba(96,165,250,0.04)";
      if (m[y][x] === 1) fill = "#334155";
      else if (x === GOAL.x && y === GOAL.y) fill = "rgba(52,211,153,0.5)";
      else if (m[y][x] === 2) fill = "rgba(248,113,113,0.45)";
      else {
        const v = Math.max(...Q[qi(x, y)]); const t = (v - lo) / span;
        const c = t < 0.5
          ? [Math.round(248 + (10 - 248) * (t / 0.5)), Math.round(113 + (20 - 113) * (t / 0.5)), Math.round(113 + (40 - 113) * (t / 0.5))]
          : [Math.round(10 + (52 - 10) * ((t - 0.5) / 0.5)), Math.round(20 + (211 - 20) * ((t - 0.5) / 0.5)), Math.round(40 + (153 - 40) * ((t - 0.5) / 0.5))];
        fill = `rgb(${c[0]},${c[1]},${c[2]})`;
      }
      ctx.fillStyle = fill;
      ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
      // policy arrow
      if (m[y][x] === 0 && !isTerminal(x, y)) {
        const q = Q[qi(x, y)]; const best = q.indexOf(Math.max(...q));
        if (Math.max(...q) !== Math.min(...q)) {
          const cx = px + CELL / 2, cy = py + CELL / 2, d = DIRS[best];
          ctx.strokeStyle = "rgba(224,231,255,0.8)"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(cx - d[0] * 9, cy - d[1] * 9); ctx.lineTo(cx + d[0] * 9, cy + d[1] * 9); ctx.stroke();
          ctx.beginPath(); ctx.arc(cx + d[0] * 9, cy + d[1] * 9, 2.5, 0, Math.PI * 2); ctx.fillStyle = "#e0e7ff"; ctx.fill();
        }
      }
    }
    // labels
    ctx.font = "bold 13px 'JetBrains Mono', monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#0a1428"; ctx.fillText("+1", GOAL.x * CELL + CELL / 2, GOAL.y * CELL + CELL / 2);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (m[y][x] === 2) { ctx.fillStyle = "#1a0a0a"; ctx.fillText("−1", x * CELL + CELL / 2, y * CELL + CELL / 2); }
    // agent
    const a = agentRef.current;
    ctx.fillStyle = "#fbbf24"; ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(a.x * CELL + CELL / 2, a.y * CELL + CELL / 2, 11, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  function reset() { setRunning(false); freshQ(); agentRef.current = { ...START }; setEp(0); setSteps(0); setStatus("IDLE"); draw(); }
  function newGrid() {
    setRunning(false);
    const m = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (Math.random() < 0.16) m[y][x] = 1;
    let traps = 0; while (traps < 3) { const x = 1 + Math.floor(Math.random() * (COLS - 2)), y = Math.floor(Math.random() * ROWS); if (m[y][x] === 0) { m[y][x] = 2; traps++; } }
    m[START.y][START.x] = 0; m[GOAL.y][GOAL.x] = 0;
    // clear a little room around start/goal
    m[START.y][START.x] = 0; m[GOAL.y][GOAL.x] = 0;
    mapRef.current = m; reset();
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    freshQ(); draw();
  }, []);

  _useEffect(() => {
    if (!running) return;
    let alive = true;
    const loop = (t) => {
      if (!alive) return;
      const interval = 1000 / (spRef.current * 4);
      if (t - lastRef.current > interval) { lastRef.current = t; for (let i = 0; i < Math.max(1, Math.round(spRef.current / 6)); i++) stepEnv(); draw(); }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, [running]);

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;

  const controls = (
    <ControlGroup>
      <Slider label="// LEARNING RATE α" min={0.05} max={1} step={0.05} value={alpha} onChange={setAlpha}
        help="How fast new experience overwrites old Q-value estimates. High learns quickly but noisily; low is stable but slow to adapt." />
      <Slider label="// DISCOUNT γ" min={0.5} max={0.99} step={0.01} value={gamma} onChange={setGamma} tone="violet"
        help="How much future reward is worth versus immediate. Near 1 = far-sighted, plans long routes to the goal; low = short-sighted." />
      <Slider label="// EXPLORATION ε" min={0} max={1} step={0.05} value={eps} onChange={setEps}
        help="Fraction of moves taken at random. 0 greedily exploits a half-learned map (can get stuck); high keeps exploring but never commits to the best route." />
      <Slider label="// SPEED" min={1} max={60} value={speed} onChange={setSpeed} suffix=" /s"
        help="Q-learning steps per second. Visual pacing only — it does not change what the agent learns." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setRunning(r => !r)} primary>{running ? "PAUSE" : "TRAIN"}</DemoButton>
        <DemoButton onClick={() => { if (!running) { stepEnv(); draw(); } }} disabled={running}>STEP</DemoButton>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={reset}>RESET Q</DemoButton>
        <DemoButton onClick={newGrid} tone="violet">NEW GRID</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="EPISODE" value={ep} />
        <StatReadout label="STEPS" value={steps} accent="var(--violet-lt)" />
      </div>
      <StatReadout label="STATUS" value={status} accent={status === "REACHED GOAL" ? "#34d399" : status === "HIT TRAP" ? "#f87171" : "var(--blue-lt)"} />
      <Legend items={[{ color: "#fbbf24", label: "AGENT" }, { color: "rgba(52,211,153,0.6)", label: "GOAL +1" }, { color: "rgba(248,113,113,0.5)", label: "TRAP −1" }, { color: "#334155", label: "WALL" }]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        The agent (gold) knows nothing at first — it stumbles around taking random
        actions. Every move it applies the <b>Q-learning update</b>:
        <i> Q(s,a) ← Q(s,a) + α·[r + γ·maxₐ′Q(s′,a′) − Q(s,a)]</i>. That one line
        propagates reward backward through the grid: reaching the goal (+1) nudges
        up the cells next to it, which nudge up <i>their</i> neighbors, until a value
        gradient flows all the way back to the start. The arrows show the current
        greedy policy; the color is each cell's value (red low → green high).
      </DemoP>
      <DemoP>
        Play with the knobs. <b>ε</b> trades off exploration vs exploitation — at 0
        the agent greedily exploits a half-learned map and can get stuck; too high
        and it never commits. <b>γ</b> sets how much it cares about future reward
        (low γ → short-sighted). <b>α</b> is how fast it overwrites old estimates.
        Drop a New Grid and watch a fresh value landscape form.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        This is <b>model-free</b> reinforcement learning — the agent learns purely from
        trial-and-error reward, never told the environment's rules (contrast the
        value-iteration demo, where the dynamics are known and solved exactly). Learning
        straight from experience is what lets RL tackle problems too complex to model:
        game-playing, robotics, recommendation, and the RLHF that aligns LLMs to human
        preferences.
      </DemoP>
      <DemoP>
        The one-line Q-learning update is a cornerstone algorithm, and its limitation here —
        a table with one entry per state — is exactly what <b>Deep Q-Networks</b> fixed by
        replacing the table with a neural network, enabling Atari-from-pixels and beyond.
        The α/γ/ε knobs are real and finicky: this is where you feel why RL is famously
        sample-hungry and sensitive to its hyperparameters and reward design.
      </DemoP>
    </>
  );
  return (
    <DemoLayout
      title="Q-Learning Gridworld"
      subtitle="Watch a tabular Q-learning agent discover a policy — value propagates backward from the goal, one update at a time."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="blue"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<GridworldDemo />);
