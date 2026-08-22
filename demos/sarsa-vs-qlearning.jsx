// demos/sarsa-vs-qlearning.jsx — on-policy SARSA vs off-policy Q-learning on the
// classic Cliff Walking gridworld (Sutton & Barto, Example 6.6).
//
// Two agents train in parallel on identical 12x4 grids: a -1 step cost, a cliff
// along the bottom edge that costs -100 and snaps you back to start, and a goal
// at the bottom-right. Both are ε-greedy and tabular; the ONLY difference is the
// TD target:
//   SARSA      Q(s,a) += α[r + γ Q(s',a') - Q(s,a)]   (uses the action it WILL take)
//   Q-learning Q(s,a) += α[r + γ max_a' Q(s',a') - Q(s,a)] (uses the greedy action)
//
// That one change is the whole lesson: SARSA accounts for its own exploration and
// learns a SAFE path one row above the cliff; Q-learning learns the OPTIMAL path
// hugging the cliff edge — and so falls off more often while exploring, giving it
// worse online reward even though its greedy policy is shorter. Everything is a
// real tabular RL run; nothing is scripted.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP, Slider, DemoButton, StatReadout, ControlGroup, Legend,
} = window;

const COLS = 12, ROWS = 4, CELL = 22;
const GW = COLS * CELL, GH = ROWS * CELL;
const CW = GW + 8, CH = GH * 2 + 150;
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // up,right,down,left
const START = { x: 0, y: ROWS - 1 }, GOAL = { x: COLS - 1, y: ROWS - 1 };
const isCliff = (x, y) => y === ROWS - 1 && x > 0 && x < COLS - 1;

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function freshQ() { return Array.from({ length: ROWS * COLS }, () => [0, 0, 0, 0]); }
const qi = (x, y) => y * COLS + x;

function move(x, y, a) {
  let nx = x + DIRS[a][0], ny = y + DIRS[a][1];
  if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) { nx = x; ny = y; }
  if (isCliff(nx, ny)) return { x: START.x, y: START.y, r: -100, done: false };
  if (nx === GOAL.x && ny === GOAL.y) return { x: nx, y: ny, r: -1, done: true };
  return { x: nx, y: ny, r: -1, done: false };
}
function epsGreedy(Q, s, eps, rand) {
  if (rand() < eps) return Math.floor(rand() * 4);
  const q = Q[s]; let best = 0; for (let a = 1; a < 4; a++) if (q[a] > q[best]) best = a; return best;
}
// greedy path from start (for drawing), capped to avoid loops
function greedyPath(Q) {
  const path = [{ x: START.x, y: START.y }]; let x = START.x, y = START.y; const seen = new Set();
  for (let i = 0; i < 60; i++) {
    const s = qi(x, y); if (seen.has(s)) break; seen.add(s);
    const q = Q[s]; let a = 0; for (let k = 1; k < 4; k++) if (q[k] > q[a]) a = k;
    let nx = x + DIRS[a][0], ny = y + DIRS[a][1];
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) { nx = x; ny = y; }
    if (isCliff(nx, ny)) { path.push({ x: nx, y: ny, fell: true }); break; }
    path.push({ x: nx, y: ny }); x = nx; y = ny;
    if (x === GOAL.x && y === GOAL.y) break;
  }
  return path;
}

function SarsaVsQDemo() {
  const cvRef = _useRef(null);
  const [alpha, setAlpha] = _useState(0.5);
  const [gamma, setGamma] = _useState(0.95);
  const [eps, setEps] = _useState(0.1);
  const [speed, setSpeed] = _useState(30);
  const [running, setRunning] = _useState(false);
  const [ep, setEp] = _useState(0);
  const [rS, setRS] = _useState(0);   // SARSA recent avg episode reward
  const [rQ, setRQ] = _useState(0);   // Q recent avg episode reward

  const aRef = _useRef(alpha), gRef = _useRef(gamma), eRef = _useRef(eps), spRef = _useRef(speed);
  _useEffect(() => { aRef.current = alpha; }, [alpha]);
  _useEffect(() => { gRef.current = gamma; }, [gamma]);
  _useEffect(() => { eRef.current = eps; }, [eps]);
  _useEffect(() => { spRef.current = speed; }, [speed]);

  // training state
  const stRef = _useRef(null);
  function init() {
    const rand = rng(12345);
    const sa = { Q: freshQ(), x: START.x, y: START.y, a: 0, ret: 0, hist: [] };
    sa.a = epsGreedy(sa.Q, qi(sa.x, sa.y), eRef.current, rand);
    const ql = { Q: freshQ(), x: START.x, y: START.y, ret: 0, hist: [] };
    stRef.current = { rand, sa, ql, episodes: 0 };
    setEp(0); setRS(0); setRQ(0);
  }

  // one SARSA env step (on-policy)
  function stepSarsa() {
    const st = stRef.current, A = st.sa, rand = st.rand;
    const s = qi(A.x, A.y), a = A.a;
    const { x: nx, y: ny, r, done } = move(A.x, A.y, a);
    A.ret += r;
    const ns = qi(nx, ny);
    const a2 = epsGreedy(A.Q, ns, eRef.current, rand);
    const target = r + (done ? 0 : gRef.current * A.Q[ns][a2]);
    A.Q[s][a] += aRef.current * (target - A.Q[s][a]);
    A.x = nx; A.y = ny; A.a = a2;
    if (done) { A.hist.push(A.ret); if (A.hist.length > 30) A.hist.shift(); A.ret = 0; A.x = START.x; A.y = START.y; A.a = epsGreedy(A.Q, qi(A.x, A.y), eRef.current, rand); return true; }
    return false;
  }
  // one Q-learning env step (off-policy)
  function stepQ() {
    const st = stRef.current, A = st.ql, rand = st.rand;
    const a = epsGreedy(A.Q, qi(A.x, A.y), eRef.current, rand);
    const s = qi(A.x, A.y);
    const { x: nx, y: ny, r, done } = move(A.x, A.y, a);
    A.ret += r;
    const ns = qi(nx, ny);
    const maxn = Math.max(...A.Q[ns]);
    const target = r + (done ? 0 : gRef.current * maxn);
    A.Q[s][a] += aRef.current * (target - A.Q[s][a]);
    A.x = nx; A.y = ny;
    if (done) { A.hist.push(A.ret); if (A.hist.length > 30) A.hist.shift(); A.ret = 0; A.x = START.x; A.y = START.y; return true; }
    return false;
  }
  const avg = h => h.length ? h.reduce((a, b) => a + b, 0) / h.length : 0;

  function drawGrid(ctx, Q, oy, agent, pathColor) {
    // cells
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const px = x * CELL, py = oy + y * CELL;
      let fill = "rgba(96,165,250,0.05)";
      if (isCliff(x, y)) fill = "rgba(248,113,113,0.4)";
      else if (x === GOAL.x && y === GOAL.y) fill = "rgba(52,211,153,0.5)";
      else if (x === START.x && y === START.y) fill = "rgba(251,191,36,0.25)";
      ctx.fillStyle = fill; ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
    }
    // greedy path
    const path = greedyPath(Q);
    ctx.strokeStyle = pathColor; ctx.lineWidth = 2.5; ctx.beginPath();
    path.forEach((p, i) => { const cx = p.x * CELL + CELL / 2, cy = oy + p.y * CELL + CELL / 2; if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy); });
    ctx.stroke();
    // agent
    ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(agent.x * CELL + CELL / 2, oy + agent.y * CELL + CELL / 2, 6, 0, Math.PI * 2); ctx.fill();
    // labels
    ctx.fillStyle = "#cbd5e1"; ctx.font = "9px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("S", START.x * CELL + CELL / 2, oy + START.y * CELL + CELL / 2);
    ctx.fillText("G", GOAL.x * CELL + CELL / 2, oy + GOAL.y * CELL + CELL / 2);
  }

  function draw() {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, CW, CH);
    const st = stRef.current; if (!st) return;
    ctx.fillStyle = "#94a3b8"; ctx.font = "10px monospace"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillText("SARSA (on-policy) - safe path", 2, 12);
    drawGrid(ctx, st.sa.Q, 18, st.sa, "#34d399");
    const oy2 = 18 + GH + 26;
    ctx.fillStyle = "#94a3b8"; ctx.fillText("Q-LEARNING (off-policy) - optimal path", 2, oy2 - 6);
    drawGrid(ctx, st.ql.Q, oy2, st.ql, "#a855f7");
    // reward curves
    const cyTop = oy2 + GH + 22, ch = 70, cx0 = 26, cx1 = CW - 6;
    ctx.strokeStyle = "rgba(148,163,184,0.25)"; ctx.beginPath(); ctx.moveTo(cx0, cyTop); ctx.lineTo(cx0, cyTop + ch); ctx.lineTo(cx1, cyTop + ch); ctx.stroke();
    ctx.fillStyle = "#94a3b8"; ctx.font = "8px monospace"; ctx.textAlign = "right";
    ctx.fillText("0", cx0 - 3, cyTop + 4); ctx.fillText("-100", cx0 - 3, cyTop + ch);
    ctx.textAlign = "left"; ctx.fillText("episode reward (recent)", cx0 + 2, cyTop - 4);
    const plot = (hist, col) => {
      if (hist.length < 2) return;
      ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.beginPath();
      hist.forEach((v, i) => { const x = cx0 + (i / 29) * (cx1 - cx0); const y = cyTop + ch - Math.max(0, Math.min(1, (v + 100) / 100)) * ch; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
      ctx.stroke();
    };
    plot(st.sa.hist, "#34d399"); plot(st.ql.hist, "#a855f7");
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
        const burst = Math.max(1, Math.round(spRef.current / 6));
        for (let i = 0; i < burst; i++) {
          const dS = stepSarsa(), dQ = stepQ();
          if (dS || dQ) { const st = stRef.current; st.episodes++; setEp(st.episodes); setRS(Math.round(avg(st.sa.hist))); setRQ(Math.round(avg(st.ql.hist))); }
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
        style={{ width: CW * 1.7, maxWidth: "100%", borderRadius: 6, border: "1px solid var(--border)", background: "#0b1530" }} />
      <Legend items={[
        { label: "SARSA greedy path", color: "#34d399" },
        { label: "Q-learning greedy path", color: "#a855f7" },
        { label: "agent", color: "#fbbf24" },
        { label: "cliff -100", color: "rgba(248,113,113,0.6)" },
      ]} />
    </div>
  );

  const controls = (
    <ControlGroup>
      <Slider label="// LEARNING RATE α" min={0.05} max={1} step={0.05} value={alpha} onChange={setAlpha}
        help="How fast each Q-value moves toward its TD target. Shared by both agents so the only difference stays the on-policy vs off-policy target." />
      <Slider label="// DISCOUNT γ" min={0.8} max={0.99} step={0.01} value={gamma} onChange={setGamma} tone="violet"
        help="Weight on future reward. Near 1 makes both agents far-sighted enough to plan the full route to the goal." />
      <Slider label="// EXPLORATION ε" min={0} max={0.5} step={0.02} value={eps} onChange={setEps}
        help="Fraction of random moves. This is the crux: with ε>0, SARSA learns a path that stays clear of the cliff because it knows it sometimes acts randomly; Q-learning ignores that and walks the edge. Set ε=0 and both converge to the same optimal edge path." />
      <Slider label="// SPEED" min={2} max={120} value={speed} onChange={setSpeed} suffix=" /s"
        help="Training steps per second. Visual pacing only; it does not change what either agent learns." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setRunning(r => !r)} primary tone="violet">{running ? "PAUSE" : "TRAIN"}</DemoButton>
        <DemoButton onClick={reset}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="EPISODES" value={ep} accent="var(--dim)" />
        <StatReadout label="ε" value={eps.toFixed(2)} accent="var(--blue-lt)" />
        <StatReadout label="SARSA AVG REWARD" value={rS} accent="#34d399" />
        <StatReadout label="Q-LEARN AVG REWARD" value={rQ} accent="#a855f7" />
      </div>
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Same gridworld, same ε-greedy exploration, same learning rate — the only
        difference between the two agents is one term in the update. <b>SARSA</b>{" "}
        bootstraps off <i>Q(s', a')</i>, the value of the action it will actually
        take next (including the occasional random one). <b>Q-learning</b> bootstraps
        off <i>maxₐ' Q(s', a')</i>, the best action regardless of what it does.
      </DemoP>
      <DemoP>
        Watch where the green and violet paths settle. SARSA, aware that it sometimes
        explores, keeps a one-row buffer from the cliff — a <b>safe</b> route. Q-learning
        learns the <b>optimal</b> shortest path hugging the very edge. But with ε &gt; 0
        that edge path means Q-learning's agent regularly slips off the cliff during
        training, so its <b>average episode reward is worse</b> even though its greedy
        policy is shorter — the on-policy/off-policy reward gap in the bottom plot. Now
        set ε to 0: with no exploration to account for, both collapse onto the same
        optimal edge path.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        On-policy vs off-policy is one of the great dividing lines in RL. <b>SARSA</b>{" "}
        evaluates and improves the policy it actually follows, so it bakes in the cost
        of its own exploration — valuable when mistakes are expensive (robots, real
        systems). <b>Q-learning</b> learns the optimal greedy policy from any behavior,
        which is what makes experience replay and{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/dqn/`} style={{ color: "#a855f7" }}>Deep
        Q-Networks</a> possible — you can learn the best policy from old, off-policy data.
      </DemoP>
      <DemoP>
        This builds directly on tabular{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/gridworld-rl/`} style={{ color: "#a855f7" }}>Q-learning</a>{" "}
        and the Bellman backups of{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/value-iteration/`} style={{ color: "#a855f7" }}>value
        iteration</a>. The same off-policy maximization that makes Q-learning powerful
        also makes it prone to overestimation bias, and on-policy methods are the
        lineage that leads to{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/policy-gradient/`} style={{ color: "#a855f7" }}>policy
        gradients</a> and PPO.
      </DemoP>
    </>
  );

  return (
    <DemoLayout title="SARSA vs Q-Learning"
      subtitle="One term in the TD update separates them: on-policy SARSA learns the safe path, off-policy Q-learning the optimal cliff-edge path — and pays for it while exploring."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/reinforcement-learning/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<SarsaVsQDemo />);
