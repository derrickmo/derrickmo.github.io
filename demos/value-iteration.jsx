// demos/value-iteration.jsx — solving a gridworld MDP with value iteration.
// Real Bellman optimality backups under stochastic ("noisy") transitions; shows
// the value heatmap converging and the greedy policy arrows it induces.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const LAYOUT = [
  ".....G",
  ".###.P",
  ".#..#.",
  ".#.#..",
  "...#.#",
  "......",
];
const R = LAYOUT.length, C = LAYOUT[0].length;
const W = 440, H = 440;
const CW = W / C, CH = H / R;
const isWall = (r, c) => LAYOUT[r][c] === "#";
const isGoal = (r, c) => LAYOUT[r][c] === "G";
const isPit = (r, c) => LAYOUT[r][c] === "P";
const isTerm = (r, c) => isGoal(r, c) || isPit(r, c);
const ACTIONS = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // up down left right
const PERP = { "-1,0": [[0, -1], [0, 1]], "1,0": [[0, -1], [0, 1]], "0,-1": [[-1, 0], [1, 0]], "0,1": [[-1, 0], [1, 0]] };

function ValueIterationDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const vRef = _useRef(null);
  const polRef = _useRef(null);
  const timerRef = _useRef(null);
  const iterRef = _useRef(0);
  const [gamma, setGamma] = _useState(0.9);
  const [noise, setNoise] = _useState(0.2);
  const [living, setLiving] = _useState(-0.04);
  const [running, setRunning] = _useState(false);
  const [stats, setStats] = _useState({ iter: 0, delta: 0 });

  function blankV() { return Array.from({ length: R }, (_, r) => Array.from({ length: C }, (_, c) => isGoal(r, c) ? 1 : isPit(r, c) ? -1 : 0)); }

  function move(r, c, dir) {
    const nr = r + dir[0], nc = c + dir[1];
    if (nr < 0 || nr >= R || nc < 0 || nc >= C || isWall(nr, nc)) return [r, c];
    return [nr, nc];
  }
  function qValue(r, c, a, V) {
    const p = 1 - noise, perp = PERP[a.join(",")];
    let q = 0;
    const [r0, c0] = move(r, c, a); q += p * V[r0][c0];
    for (const d of perp) { const [r1, c1] = move(r, c, d); q += (noise / 2) * V[r1][c1]; }
    return q;
  }
  function sweep() {
    const V = vRef.current, nV = blankV(), pol = Array.from({ length: R }, () => new Array(C).fill(null));
    let delta = 0;
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      if (isWall(r, c) || isTerm(r, c)) { if (isTerm(r, c)) pol[r][c] = null; continue; }
      let best = -Infinity, bestA = null;
      for (const a of ACTIONS) { const q = qValue(r, c, a, V); if (q > best) { best = q; bestA = a; } }
      nV[r][c] = living + gamma * best;
      pol[r][c] = bestA;
      delta = Math.max(delta, Math.abs(nV[r][c] - V[r][c]));
    }
    vRef.current = nV; polRef.current = pol;
    iterRef.current += 1;
    setStats({ iter: iterRef.current, delta });
    draw();
  }
  function reset() { stopRun(); vRef.current = blankV(); polRef.current = Array.from({ length: R }, () => new Array(C).fill(null)); iterRef.current = 0; setStats({ iter: 0, delta: 0 }); draw(); }
  function stopRun() { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } setRunning(false); }
  function toggleRun() {
    if (timerRef.current) { stopRun(); return; }
    setRunning(true);
    timerRef.current = setInterval(() => { sweep(); if (stats.delta < 1e-4 && iterRef.current > 3) { /* keep going; cheap */ } }, 360);
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const V = vRef.current, pol = polRef.current;
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const x = c * CW, y = r * CH;
      if (isWall(r, c)) { ctx.fillStyle = "#0b1430"; ctx.fillRect(x, y, CW, CH); ctx.strokeStyle = "rgba(96,165,250,0.08)"; ctx.strokeRect(x, y, CW, CH); continue; }
      const v = V[r][c], mag = Math.min(1, Math.abs(v));
      if (v >= 0) ctx.fillStyle = `rgba(52,211,153,${0.08 + 0.5 * mag})`;
      else ctx.fillStyle = `rgba(248,113,113,${0.08 + 0.5 * mag})`;
      ctx.fillRect(x, y, CW, CH);
      ctx.strokeStyle = "rgba(96,165,250,0.12)"; ctx.strokeRect(x, y, CW, CH);
      // terminal markers
      if (isGoal(r, c) || isPit(r, c)) { ctx.strokeStyle = isGoal(r, c) ? "#34d399" : "#f87171"; ctx.lineWidth = 2.5; ctx.strokeRect(x + 2, y + 2, CW - 4, CH - 4); ctx.lineWidth = 1; }
      // value text
      ctx.fillStyle = "#e0e7ff"; ctx.font = "12px JetBrains Mono, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(v.toFixed(2), x + CW / 2, y + CH * 0.34);
      // policy arrow
      const a = pol && pol[r][c];
      if (a && !isTerm(r, c)) {
        const ax = x + CW / 2, ay = y + CH * 0.66, len = Math.min(CW, CH) * 0.2;
        const ex = ax + a[1] * len, ey = ay + a[0] * len;
        ctx.strokeStyle = "#fbbf24"; ctx.fillStyle = "#fbbf24"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ex, ey); ctx.stroke();
        const ang = Math.atan2(a[0], a[1]);
        ctx.beginPath(); ctx.moveTo(ex, ey);
        ctx.lineTo(ex - 7 * Math.cos(ang - 0.45), ey - 7 * Math.sin(ang - 0.45));
        ctx.lineTo(ex - 7 * Math.cos(ang + 0.45), ey - 7 * Math.sin(ang + 0.45));
        ctx.closePath(); ctx.fill();
      }
    }
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    reset();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);
  _useEffect(() => { if (polRef.current && iterRef.current > 0) draw(); /* eslint-disable-next-line */ }, [gamma, noise, living]);

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// DISCOUNT γ" min={0.1} max={0.99} step={0.01} value={gamma} onChange={setGamma}
        help="How much future reward is worth versus immediate. Near 1 = far-sighted, plans long routes; low = short-sighted, chases only nearby reward." />
      <Slider label="// TRANSITION NOISE" min={0} max={0.5} step={0.02} value={noise} onChange={setNoise} tone="violet"
        help="Chance the agent slips sideways instead of moving as intended. Higher noise makes the optimal policy steer wide of the pit to stay safe." />
      <Slider label="// LIVING REWARD" min={-1} max={0.05} step={0.01} value={living} onChange={setLiving}
        help="Reward (usually a cost) for each non-terminal step. Strongly negative makes the agent rush to exit, even risking the pit; near zero lets it take the safe long way." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => { stopRun(); sweep(); }} primary>SWEEP</DemoButton>
        <DemoButton onClick={toggleRun} tone="violet">{running ? "PAUSE" : "RUN"}</DemoButton>
        <DemoButton onClick={reset}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="ITERATION" value={stats.iter} />
        <StatReadout label="MAX Δ" value={stats.delta.toFixed(4)} accent="#fbbf24" />
      </div>
      <Legend items={[{ color: "#34d399", label: "HIGH VALUE / GOAL" }, { color: "#f87171", label: "LOW VALUE / PIT" }, { color: "#fbbf24", label: "GREEDY POLICY" }]} />
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>Sliders change the MDP — re-sweep to see the new solution. RUN backs up until Δ → 0.</div>
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        A Markov Decision Process is the math behind every planning agent: states,
        actions, a reward, and <i>stochastic</i> transitions — here the robot only
        moves where it intends with probability <b>1 − noise</b>, and slips sideways
        otherwise. <b>Value iteration</b> repeatedly applies the Bellman optimality
        backup — each cell's value becomes the living reward plus the discounted value
        of the <i>best</i> action's expected next state. Hit <b>Sweep</b> and watch
        value flow outward from the goal one ring per iteration; the
        <span style={{ color: "#fbbf24" }}> arrows</span> show the greedy policy it
        implies.
      </DemoP>
      <DemoP>
        The knobs change the agent's personality. Drop the <b>discount γ</b> and it
        turns short-sighted, caring only about nearby reward. Make the <b>living
        reward</b> very negative and it sprints for the exit, even risking the pit;
        near zero and it plays it safe, taking the long way around. Crank
        <b> noise</b> and the policy steers wide of the pit because slips are likely.
        This is the model-<i>based</i> cousin of the Q-learning demo — same gridworld,
        but here the dynamics are known and solved exactly, not learned from
        experience.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Markov Decision Processes are the formal backbone of sequential decision-making,
        and the <b>Bellman optimality</b> backup you're iterating is the equation underneath
        nearly all of reinforcement learning. Value iteration itself solves real planning
        problems — robot navigation, inventory and resource control, game AI — whenever the
        environment's dynamics are known.
      </DemoP>
      <DemoP>
        When the dynamics aren't known, the same backup becomes <i>learning</i>: Q-learning
        and SARSA sample the Bellman update from experience, and Deep Q-Networks swap the
        value table for a neural net to scale to huge state spaces (Atari, robotics). The
        knobs here — discount, stochastic transitions, reward shaping — are exactly the
        design choices that make or break a real RL system, including the reward-hacking
        risk of getting the living reward wrong.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="REINFORCEMENT LEARNING" title="MDP Value Iteration"
      subtitle="Solve a gridworld exactly: Bellman backups propagate value out from the goal, inducing the optimal policy."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/reinforcement-learning/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="blue" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ValueIterationDemo />);
