// demos/actor-critic.jsx — one-step (online) tabular actor-critic in a gridworld.
//
// Two learned objects, one shared signal. The CRITIC keeps a value table V(s);
// the ACTOR keeps policy logits theta(s, a) -> softmax. Each step from state s:
//   - sample a ~ softmax(theta[s]); take it; observe r, s'
//   - TD error:  delta = r + gamma * V[s']  -  V[s]     (V[s']=0 if s' terminal)
//   - critic:    V[s]        += alphaV * delta
//   - actor:     theta[s][k] += alphaA * delta * ( 1{k=a} - pi_k )   (∇ log π)
//
// The SAME delta updates both heads — that's the whole idea. The critic learns
// to predict return, and its TD error becomes the (low-variance, bootstrapped)
// advantage that tells the actor which way to shift probability. It's exactly
// the learned baseline that the Policy Gradient demo toggled on/off, but now the
// baseline is a function of state and updates online instead of episode-by-episode.
//
// Left panel: critic V(s) heatmap. Right panel: actor policy (arrows sized by
// probability, agent token animating). Bottom: smoothed episode return.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const COLS = 5, ROWS = 5, CELL = 40;
const GRID = COLS * CELL;                 // 200
const W = 540, H = 460;
const LEFT_X = 16, RIGHT_X = 324, GRID_Y = 34;
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // up,right,down,left
const START = { x: 0, y: 4 }, GOAL = { x: 4, y: 0 }, TRAP = { x: 4, y: 2 };
// walls: a barrier column at x=2 with a single gap at y=2
const WALLS = new Set(["2,0", "2,1", "2,3", "2,4"]);

const idx = (x, y) => y * COLS + x;
const isWall = (x, y) => WALLS.has(x + "," + y);
const isGoal = (x, y) => x === GOAL.x && y === GOAL.y;
const isTrap = (x, y) => x === TRAP.x && y === TRAP.y;
const isTerminal = (x, y) => isGoal(x, y) || isTrap(x, y);

function softmax(logits) {
  const m = Math.max(...logits);
  const ex = logits.map(l => Math.exp(l - m));
  const s = ex.reduce((a, b) => a + b, 0);
  return ex.map(e => e / s);
}

// blue (low value) -> violet (high value)
function valColor(t) {
  const lo = [30, 58, 138], hi = [168, 85, 247];        // #1e3a8a -> #a855f7
  const c = lo.map((v, i) => Math.round(v + (hi[i] - v) * t));
  return `rgba(${c[0]},${c[1]},${c[2]},0.85)`;
}

function ActorCriticDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const lastRef = _useRef(0);
  const makeState = () => ({
    V: new Float64Array(ROWS * COLS),
    theta: Array.from({ length: ROWS * COLS }, () => [0, 0, 0, 0]),
    agent: { ...START },
    ep: 0, epReturn: 0, steps: 0, delta: 0, lastA: -1,
    returns: [],   // smoothed episode-return history
  });
  const st = _useRef(makeState());

  const [gamma, setGamma] = _useState(0.95);
  const [alphaA, setAlphaA] = _useState(0.30);
  const [alphaV, setAlphaV] = _useState(0.30);
  const [speed, setSpeed] = _useState(30);
  const [running, setRunning] = _useState(false);
  const [, force] = _useState(0);

  function reset() { st.current = makeState(); force(x => x + 1); }

  function rewardAt(x, y) {
    if (isGoal(x, y)) return 1;
    if (isTrap(x, y)) return -1;
    return -0.02; // small step cost
  }

  function step() {
    const s = st.current;
    const { x, y } = s.agent;
    const probs = softmax(s.theta[idx(x, y)]);
    // sample action
    let r = Math.random(), a = 0, acc = 0;
    for (let k = 0; k < 4; k++) { acc += probs[k]; if (r <= acc) { a = k; break; } }
    // move (blocked by walls / bounds => stay in place)
    let nx = x + DIRS[a][0], ny = y + DIRS[a][1];
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS || isWall(nx, ny)) { nx = x; ny = y; }
    const rew = rewardAt(nx, ny);
    const term = isTerminal(nx, ny);

    // TD error (critic bootstraps on V[s'])
    const sCur = idx(x, y), sNext = idx(nx, ny);
    const delta = rew + (term ? 0 : gamma * s.V[sNext]) - s.V[sCur];

    // critic update
    s.V[sCur] += alphaV * delta;
    // actor update: theta[s][k] += alphaA * delta * (1{k=a} - pi_k)
    const th = s.theta[sCur];
    for (let k = 0; k < 4; k++) {
      th[k] += alphaA * delta * ((k === a ? 1 : 0) - probs[k]);
      if (th[k] > 8) th[k] = 8; else if (th[k] < -8) th[k] = -8;
    }

    s.delta = delta; s.lastA = a;
    s.epReturn += rew; s.steps += 1;
    s.agent = { x: nx, y: ny };

    if (term || s.steps > 200) {
      // record smoothed return, start new episode
      const prev = s.returns.length ? s.returns[s.returns.length - 1] : s.epReturn;
      s.returns.push(0.9 * prev + 0.1 * s.epReturn);
      if (s.returns.length > 260) s.returns.shift();
      s.ep += 1; s.epReturn = 0; s.steps = 0;
      s.agent = { ...START };
    }
  }

  function cellRect(panelX, x, y) { return [panelX + x * CELL, GRID_Y + y * CELL, CELL, CELL]; }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const s = st.current;

    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("CRITIC  ·  value V(s)", LEFT_X, 24);
    ctx.fillText("ACTOR  ·  policy π(a|s)", RIGHT_X, 24);

    // value range for heatmap normalization
    let vMin = Infinity, vMax = -Infinity;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (isWall(x, y)) continue;
      const v = s.V[idx(x, y)];
      if (v < vMin) vMin = v; if (v > vMax) vMax = v;
    }
    if (!isFinite(vMin)) { vMin = 0; vMax = 1; }
    if (vMax - vMin < 1e-6) vMax = vMin + 1e-6;

    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      // ── left: critic heatmap ──
      const [lx, ly] = cellRect(LEFT_X, x, y);
      if (isWall(x, y)) ctx.fillStyle = "#0b1220";
      else { const t = (s.V[idx(x, y)] - vMin) / (vMax - vMin); ctx.fillStyle = valColor(t); }
      ctx.fillRect(lx, ly, CELL - 1, CELL - 1);
      if (!isWall(x, y)) {
        ctx.fillStyle = "rgba(226,232,240,0.85)"; ctx.font = "9px JetBrains Mono";
        ctx.fillText(s.V[idx(x, y)].toFixed(2), lx + 3, ly + CELL - 5);
      }
      if (isGoal(x, y)) { ctx.strokeStyle = "#34d399"; ctx.lineWidth = 2; ctx.strokeRect(lx + 1, ly + 1, CELL - 3, CELL - 3); }
      if (isTrap(x, y)) { ctx.strokeStyle = "#f87171"; ctx.lineWidth = 2; ctx.strokeRect(lx + 1, ly + 1, CELL - 3, CELL - 3); }

      // ── right: actor policy ──
      const [rx, ry] = cellRect(RIGHT_X, x, y);
      ctx.fillStyle = isWall(x, y) ? "#0b1220" : "rgba(30,41,59,0.55)";
      ctx.fillRect(rx, ry, CELL - 1, CELL - 1);
      ctx.strokeStyle = "rgba(96,165,250,0.12)"; ctx.lineWidth = 1;
      ctx.strokeRect(rx, ry, CELL - 1, CELL - 1);
      if (isGoal(x, y)) { ctx.fillStyle = "rgba(52,211,153,0.18)"; ctx.fillRect(rx, ry, CELL - 1, CELL - 1); }
      if (isTrap(x, y)) { ctx.fillStyle = "rgba(248,113,113,0.16)"; ctx.fillRect(rx, ry, CELL - 1, CELL - 1); }

      if (!isWall(x, y) && !isTerminal(x, y)) {
        const probs = softmax(s.theta[idx(x, y)]);
        const best = probs.indexOf(Math.max(...probs));
        const cx = rx + CELL / 2, cy = ry + CELL / 2;
        for (let k = 0; k < 4; k++) {
          const len = 5 + 12 * probs[k];
          const ex = cx + DIRS[k][0] * len, ey = cy + DIRS[k][1] * len;
          ctx.strokeStyle = k === best ? `rgba(251,191,36,${0.4 + 0.6 * probs[k]})`
                                       : `rgba(148,163,184,${0.2 + 0.5 * probs[k]})`;
          ctx.lineWidth = k === best ? 2 : 1;
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
        }
      }
    }

    // agent token (both panels)
    const { x: ax, y: ay } = s.agent;
    [[LEFT_X], [RIGHT_X]].forEach(([px]) => {
      const cx = px + ax * CELL + CELL / 2, cy = GRID_Y + ay * CELL + CELL / 2;
      ctx.fillStyle = "rgba(96,165,250,0.95)";
      ctx.shadowColor = "#60a5fa"; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    });

    // ── bottom: smoothed episode return ──
    const botY = 270, botH = 168, botX = LEFT_X, botW = W - 2 * LEFT_X;
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono";
    ctx.fillText("LEARNING CURVE  ·  smoothed episode return (higher = reaches goal faster)", botX, botY - 8);
    ctx.strokeStyle = "rgba(96,165,250,0.18)"; ctx.strokeRect(botX, botY, botW, botH);
    if (s.returns.length > 1) {
      const rMin = Math.min(...s.returns, -1), rMax = Math.max(...s.returns, 1);
      const span = Math.max(rMax - rMin, 1e-6);
      // zero line
      const zy = botY + botH - ((0 - rMin) / span) * (botH - 8) - 4;
      ctx.strokeStyle = "rgba(148,163,184,0.25)"; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(botX, zy); ctx.lineTo(botX + botW, zy); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = "#60a5fa"; ctx.lineWidth = 1.8; ctx.beginPath();
      for (let i = 0; i < s.returns.length; i++) {
        const x = botX + (i / Math.max(1, s.returns.length - 1)) * botW;
        const y = botY + botH - ((s.returns[i] - rMin) / span) * (botH - 8) - 4;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
    // eslint-disable-next-line
  });

  _useEffect(() => {
    if (!running) return;
    const loop = (now) => {
      const interval = 1000 / speed;
      if (now - lastRef.current >= interval) { lastRef.current = now; step(); force(x => x + 1); }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line
  }, [running, gamma, alphaA, alphaV, speed]);

  const s = st.current;
  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// GAMMA (discount)" min={0.5} max={0.99} step={0.01} value={gamma} onChange={setGamma}
        help="How far ahead the critic looks. Near 1, value propagates back across the whole grid so even far cells learn the goal is reachable; lower γ makes the agent myopic and the value field stays flat away from the goal." />
      <Slider label="// ACTOR LR (αθ)" min={0.02} max={0.8} step={0.02} value={alphaA} onChange={setAlphaA} tone="violet"
        help="Step size for the policy logits. Larger = the arrows commit to a direction faster, but a noisy early critic can push them the wrong way and the policy thrashes. This is the policy-gradient learning rate." />
      <Slider label="// CRITIC LR (αV)" min={0.02} max={0.8} step={0.02} value={alphaV} onChange={setAlphaV}
        help="Step size for the value table. The critic should usually learn at least as fast as the actor — a stale critic gives a wrong TD error, and the actor is only as good as the advantage signal it's fed." />
      <Slider label="// SPEED (steps/sec)" min={4} max={120} step={2} value={speed} onChange={setSpeed}
        help="Environment steps simulated per second. Slow it down to watch a single TD update; speed it up to fast-forward to convergence." />
      <DemoButton onClick={() => setRunning(r => !r)} primary>{running ? "PAUSE" : "TRAIN"}</DemoButton>
      <DemoButton onClick={reset}>RESET</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="EPISODE" value={s.ep} />
        <StatReadout label="TD δ" value={s.delta.toFixed(3)} accent={s.delta >= 0 ? "#34d399" : "#f87171"} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="STEP" value={s.steps} />
        <StatReadout label="RETURN" value={(s.returns.length ? s.returns[s.returns.length - 1].toFixed(2) : "—")} accent="#60a5fa" />
      </div>
      <Legend items={[
        { color: "#a855f7", label: "high value" },
        { color: "#1e3a8a", label: "low value" },
        { color: "#fbbf24", label: "preferred action" },
        { color: "#34d399", label: "goal" },
        { color: "#f87171", label: "trap" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Two tables, one error signal. The <b>critic</b> (left) learns a value
        V(s) — how good each cell is — and the <b>actor</b> (right) learns a
        policy π(a|s), drawn as arrows sized by probability. After every move the
        agent computes one number, the <i>TD error</i>{" "}
        <i>δ = r + γ·V(s′) − V(s)</i>: was this step better or worse than the
        critic expected? That single δ updates <i>both</i> heads — the critic
        nudges V(s) toward the truth, and the actor pushes probability toward the
        action it just took, scaled by δ.
      </DemoP>
      <DemoP>
        Watch the value heatmap fill in from the green goal outward as γ carries
        credit backward, and the arrows snap toward the gap in the wall and away
        from the red trap. When δ is positive (green) the last move beat
        expectations and that action gets reinforced; negative δ (red) suppresses
        it. Crank the actor LR up with a slow critic and you'll see the policy
        commit to a bad route before the critic has learned the terrain — the
        classic actor-critic failure mode.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        This is the bridge between the two halves of RL. The{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/policy-gradient/`} style={{ color: "#a855f7" }}>Policy
        Gradient</a> demo had a running-mean baseline you could toggle to cut
        variance. Actor-critic <i>replaces that baseline with a learned value
        function</i> — a critic that's specific to each state and updates online,
        step by step, instead of waiting for the episode to finish. The TD error
        is the advantage; the critic is the baseline that makes it low-variance.
      </DemoP>
      <DemoP>
        Almost every modern policy method is an actor-critic. A2C/A3C run this
        exact update in parallel across workers; PPO adds a clipped trust region
        and a GAE-smoothed advantage on top of the same actor and critic; in RLHF
        the actor is the language model and the critic is a value head predicting
        reward-model score. The "subtract a learned baseline, bootstrap with the
        critic" pattern you're watching is the workhorse of applied deep RL.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="REINFORCEMENT LEARNING" title="Actor-Critic"
      subtitle="A critic learns the value of each state; an actor learns the policy. One shared TD error trains both — the learned baseline behind A2C, PPO, and RLHF."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/reinforcement-learning/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ActorCriticDemo />);
