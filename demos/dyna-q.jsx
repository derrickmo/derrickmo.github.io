// demos/dyna-q.jsx — Dyna-Q: model-based planning on top of Q-learning
// (Sutton & Barto, Example 8.1, the Dyna maze).
//
// Two agents learn the same maze in parallel. Both do ordinary Q-learning from
// real steps. The Dyna-Q agent ALSO learns a one-step model — it simply remembers
// (s,a) -> (r, s') for every transition it has seen — and after each real step it
// performs n PLANNING updates: sample a remembered (s,a), look up the model, and
// apply the same Q-learning update to that imagined transition. Planning replays
// experience to propagate the goal's value across the whole maze without taking
// more real steps, so Dyna-Q reaches the optimal path in far fewer episodes than
// the model-free (n=0) agent. Everything is a real tabular Dyna-Q run.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP, Slider, DemoButton, StatReadout, ControlGroup, Legend,
} = window;

const COLS = 9, ROWS = 6, CELL = 26;
const GW = COLS * CELL, GH = ROWS * CELL;
const CW = GW + 4, CH = GH + 96;
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const START = { x: 0, y: 2 }, GOAL = { x: 8, y: 0 };
const WALLS = new Set(["2,1", "2,2", "2,3", "5,4", "7,0", "7,1", "7,2"].map(s => s));
const isWall = (x, y) => WALLS.has(x + "," + y);
const qi = (x, y) => y * COLS + x;
const MAXSTEPS = 600;

function envStep(x, y, a) {
  let nx = x + DIRS[a][0], ny = y + DIRS[a][1];
  if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || isWall(nx, ny)) { nx = x; ny = y; }
  const done = nx === GOAL.x && ny === GOAL.y;
  return { nx, ny, r: done ? 1 : 0, done };
}

function makeAgent() {
  return {
    Q: Array.from({ length: ROWS * COLS }, () => [0, 0, 0, 0]),
    model: {}, observed: [], seen: new Set(),
    x: START.x, y: START.y, steps: 0, hist: [],
  };
}

function DynaQDemo() {
  const cvRef = _useRef(null);
  const [n, setN] = _useState(10);
  const [alpha, setAlpha] = _useState(0.5);
  const [eps, setEps] = _useState(0.1);
  const [speed, setSpeed] = _useState(40);
  const [running, setRunning] = _useState(false);
  const [ep, setEp] = _useState(0);
  const [sDyna, setSDyna] = _useState(0);
  const [sFree, setSFree] = _useState(0);

  const nRef = _useRef(n), aRef = _useRef(alpha), eRef = _useRef(eps), spRef = _useRef(speed);
  _useEffect(() => { nRef.current = n; }, [n]);
  _useEffect(() => { aRef.current = alpha; }, [alpha]);
  _useEffect(() => { eRef.current = eps; }, [eps]);
  _useEffect(() => { spRef.current = speed; }, [speed]);

  const stRef = _useRef(null);
  function init() { stRef.current = { dyna: makeAgent(), free: makeAgent(), episodes: 0 }; setEp(0); setSDyna(0); setSFree(0); }

  const GAMMA = 0.95;
  function pick(Q, s) { if (Math.random() < eRef.current) return Math.floor(Math.random() * 4); const q = Q[s]; let b = 0; for (let a = 1; a < 4; a++) if (q[a] > q[b]) b = a; return b; }

  // one real step (+ planning if nplan>0); returns true on episode end
  function step(A, nplan) {
    const Q = A.Q, s = qi(A.x, A.y), a = pick(Q, s);
    const { nx, ny, r, done } = envStep(A.x, A.y, a);
    const ns = qi(nx, ny);
    Q[s][a] += aRef.current * (r + (done ? 0 : GAMMA * Math.max(...Q[ns])) - Q[s][a]);
    // learn model
    const key = s * 4 + a;
    if (!A.seen.has(key)) { A.seen.add(key); A.observed.push([s, a]); }
    A.model[key] = { r, ns, done };
    // planning
    for (let p = 0; p < nplan; p++) {
      const [ps, pa] = A.observed[Math.floor(Math.random() * A.observed.length)];
      const m = A.model[ps * 4 + pa];
      Q[ps][pa] += aRef.current * (m.r + (m.done ? 0 : GAMMA * Math.max(...Q[m.ns])) - Q[ps][pa]);
    }
    A.x = nx; A.y = ny; A.steps++;
    if (done || A.steps >= MAXSTEPS) { A.hist.push(A.steps); if (A.hist.length > 80) A.hist.shift(); A.steps = 0; A.x = START.x; A.y = START.y; return true; }
    return false;
  }

  function drawArrows(ctx, Q) {
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (isWall(x, y) || (x === GOAL.x && y === GOAL.y)) continue;
      const q = Q[qi(x, y)]; if (Math.max(...q) === Math.min(...q)) continue;
      let b = 0; for (let a = 1; a < 4; a++) if (q[a] > q[b]) b = a;
      const cx = x * CELL + CELL / 2, cy = y * CELL + CELL / 2, d = DIRS[b];
      ctx.strokeStyle = "rgba(224,231,255,0.7)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx - d[0] * 6, cy - d[1] * 6); ctx.lineTo(cx + d[0] * 6, cy + d[1] * 6); ctx.stroke();
      ctx.fillStyle = "#e0e7ff"; ctx.beginPath(); ctx.arc(cx + d[0] * 6, cy + d[1] * 6, 1.8, 0, Math.PI * 2); ctx.fill();
    }
  }

  function draw() {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d"); ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = "#0b1530"; ctx.fillRect(0, 0, CW, CH);
    const st = stRef.current; if (!st) return;
    const A = st.dyna;
    // value range
    let hi = 1e-6; for (let i = 0; i < ROWS * COLS; i++) hi = Math.max(hi, Math.max(...A.Q[i]));
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const px = x * CELL, py = y * CELL;
      let fill = "rgba(96,165,250,0.05)";
      if (isWall(x, y)) fill = "#334155";
      else if (x === GOAL.x && y === GOAL.y) fill = "rgba(52,211,153,0.6)";
      else { const v = Math.max(...A.Q[qi(x, y)]) / hi; fill = `rgba(168,85,247,${0.08 + 0.7 * Math.max(0, v)})`; }
      ctx.fillStyle = fill; ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
    }
    drawArrows(ctx, A.Q);
    // start/goal labels
    ctx.fillStyle = "#0a1428"; ctx.font = "bold 11px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("G", GOAL.x * CELL + CELL / 2, GOAL.y * CELL + CELL / 2);
    ctx.fillStyle = "#fbbf24"; ctx.fillText("S", START.x * CELL + CELL / 2, START.y * CELL + CELL / 2);
    // agent
    ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(A.x * CELL + CELL / 2, A.y * CELL + CELL / 2, 7, 0, Math.PI * 2); ctx.fill();

    // steps-per-episode curve
    const cy0 = GH + 18, cy1 = CH - 14, cx0 = 30, cx1 = CW - 6;
    ctx.strokeStyle = "rgba(148,163,184,0.25)"; ctx.beginPath(); ctx.moveTo(cx0, cy0); ctx.lineTo(cx0, cy1); ctx.lineTo(cx1, cy1); ctx.stroke();
    ctx.fillStyle = "#94a3b8"; ctx.font = "8px monospace"; ctx.textAlign = "left"; ctx.fillText("steps per episode (lower = learned)", cx0 + 2, cy0 - 4);
    ctx.textAlign = "right"; ctx.fillText(String(MAXSTEPS), cx0 - 3, cy0 + 4); ctx.fillText("0", cx0 - 3, cy1);
    const plot = (hist, col) => { if (hist.length < 2) return; ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.beginPath(); hist.forEach((v, i) => { const x = cx0 + (i / 79) * (cx1 - cx0); const y = cy1 - Math.min(1, v / MAXSTEPS) * (cy1 - cy0); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }); ctx.stroke(); };
    plot(st.free.hist, "#94a3b8");
    plot(st.dyna.hist, "#a855f7");
  }

  _useEffect(() => { init(); draw(); /* eslint-disable-next-line */ }, []);

  _useEffect(() => {
    if (!running) return;
    let alive = true, raf, last = 0;
    const loop = (t) => {
      if (!alive) return;
      const interval = 1000 / Math.max(1, spRef.current);
      if (t - last > interval) {
        last = t;
        const burst = Math.max(1, Math.round(spRef.current / 8));
        for (let i = 0; i < burst; i++) {
          const d1 = step(stRef.current.dyna, nRef.current);
          const d2 = step(stRef.current.free, 0);
          if (d1 || d2) { const st = stRef.current; st.episodes++; setEp(st.episodes); const last1 = st.dyna.hist[st.dyna.hist.length - 1] || 0, last2 = st.free.hist[st.free.hist.length - 1] || 0; setSDyna(last1); setSFree(last2); }
        }
        draw();
      }
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
        style={{ width: CW * 1.6, maxWidth: "100%", borderRadius: 6, border: "1px solid var(--border)", background: "#0b1530" }} />
      <Legend items={[
        { label: "Dyna-Q (planning)", color: "#a855f7" },
        { label: "model-free (n=0)", color: "#94a3b8" },
        { label: "agent", color: "#fbbf24" },
        { label: "wall", color: "#334155" },
      ]} />
    </div>
  );

  const controls = (
    <ControlGroup>
      <Slider label="// PLANNING STEPS n" min={0} max={50} step={1} value={n} onChange={setN} tone="violet"
        help="Imagined updates from the learned model after each real step. 0 = plain Q-learning. Raise it and the value (violet shading) floods back from the goal across the whole maze in a fraction of the real experience." />
      <Slider label="// LEARNING RATE α" min={0.05} max={1} step={0.05} value={alpha} onChange={setAlpha}
        help="Step size for every Q update — real and planned alike. Shared by both agents so planning is the only difference." />
      <Slider label="// EXPLORATION ε" min={0} max={0.4} step={0.02} value={eps} onChange={setEps}
        help="Fraction of random moves. Some exploration is needed to discover the goal the first time; after that, planning does the heavy lifting of spreading its value." />
      <Slider label="// SPEED" min={4} max={160} value={speed} onChange={setSpeed} suffix=" /s"
        help="Real steps per second. Visual pacing only; it does not change learning." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setRunning(r => !r)} primary tone="violet">{running ? "PAUSE" : "TRAIN"}</DemoButton>
        <DemoButton onClick={reset}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="EPISODE" value={ep} accent="var(--dim)" />
        <StatReadout label="PLANNING n" value={n} accent="var(--violet-lt)" />
        <StatReadout label="DYNA-Q LAST STEPS" value={sDyna || "—"} accent="#a855f7" />
        <StatReadout label="MODEL-FREE LAST STEPS" value={sFree || "—"} accent="#94a3b8" />
      </div>
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Both agents run the exact same Q-learning. The only difference: after every
        real step, the <b>Dyna-Q</b> agent does <b>n planning steps</b> — it samples a
        transition it already remembers, replays it through its learned model, and
        applies the same update. It's "thinking" between actions, squeezing far more
        learning out of each real experience. Watch the violet value shading flood
        back from the goal across the maze; with n=0 it would creep one cell per
        episode.
      </DemoP>
      <DemoP>
        The bottom plot is the payoff: <b>steps per episode</b>, which starts huge
        (random wandering) and drops to the optimal path length once the policy is
        learned. The Dyna-Q curve (violet) plummets in a handful of episodes; the
        model-free agent (gray) takes many more. Slide n up and the gap widens; drop
        it to 0 and the two curves coincide. This is the core argument for
        model-based RL — sample efficiency.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Dyna is the bridge between the two halves of RL: learning from real
        experience like{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/gridworld-rl/`} style={{ color: "#a855f7" }}>Q-learning</a>{" "}
        and planning with a known model like{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/value-iteration/`} style={{ color: "#a855f7" }}>value
        iteration</a>. By learning the model from data and then planning inside it, it
        gets the sample efficiency of planning without needing the rules handed to it.
        Experience replay in{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/dqn/`} style={{ color: "#a855f7" }}>DQN</a>{" "}
        is the same idea in disguise — replaying stored transitions is planning with a
        non-parametric model.
      </DemoP>
      <DemoP>
        Model-based RL is what powers the most sample-efficient modern agents
        (Dyna-style replay, World Models, MuZero, Dreamer). The catch is model error:
        plan inside a wrong model and you confidently learn the wrong thing — so real
        systems weight planning by model confidence and keep correcting it with fresh
        experience. It's the planning counterpart to the search in{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/mcts/`} style={{ color: "#a855f7" }}>MCTS</a>.
      </DemoP>
    </>
  );

  return (
    <DemoLayout topic="REINFORCEMENT LEARNING" title="Dyna-Q (Model-Based Planning)"
      subtitle="Learn a model from experience, then plan inside it. n imagined updates per real step let Dyna-Q solve the maze in a fraction of the experience model-free Q-learning needs."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/reinforcement-learning/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<DynaQDemo />);
