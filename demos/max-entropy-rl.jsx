// demos/max-entropy-rl.jsx — maximum-entropy RL / soft value iteration (the idea
// behind Soft Actor-Critic).
//
// Standard RL maximizes reward; max-entropy RL maximizes reward PLUS policy
// entropy, scaled by a temperature α. That replaces the hard max in the Bellman
// equation with a soft (log-sum-exp) one and makes the optimal policy a Boltzmann
// distribution over Q:
//   V(s) = α · log Σ_a exp(Q(s,a)/α),   π(a|s) = softmax(Q(s,a)/α),   Q = r + γV(s').
// High α keeps the policy stochastic — it spreads probability across all
// reasonably-good actions and both goals — which explores better and is more
// robust; α→0 recovers ordinary value iteration and a single greedy path.
//
// Soft value iteration is run to convergence exactly (no learning); a sampled
// agent then walks the soft policy so you can watch the path distribution widen
// with α.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect, useMemo: _useMemo } = React;
const {
  DemoLayout, DemoP, Slider, DemoButton, StatReadout, ControlGroup, Legend,
} = window;

const COLS = 8, ROWS = 6, CELL = 30;
const GW = COLS * CELL, GH = ROWS * CELL;
const CW = GW + 2, CH = GH + 2;
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const START = { x: 0, y: 3 };
const GOALS = { [8 - 1 + ",0"]: 1.0, [(8 - 1) + ",5"]: 0.85 };
const goalReward = (x, y) => GOALS[x + "," + y];
const WALLS = new Set(["4,1", "4,2", "4,3", "4,4"]);
const isWall = (x, y) => WALLS.has(x + "," + y);
const isGoal = (x, y) => (x + "," + y) in GOALS;
const idx = (x, y) => y * COLS + x;

function MaxEntropyRLDemo() {
  const cvRef = _useRef(null);
  const [alpha, setAlpha] = _useState(0.3);
  const [gamma, setGamma] = _useState(0.95);
  const [speed, setSpeed] = _useState(30);
  const [running, setRunning] = _useState(true);

  // soft value iteration -> { V, P } (exact, recomputed on alpha/gamma)
  const sol = _useMemo(() => {
    const V = new Float64Array(COLS * ROWS);
    const step = (x, y, a) => { let nx = x + DIRS[a][0], ny = y + DIRS[a][1]; if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || isWall(nx, ny)) { nx = x; ny = y; } return [nx, ny]; };
    for (let it = 0; it < 400; it++) {
      let delta = 0;
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        if (isWall(x, y) || isGoal(x, y)) continue;
        const q = new Array(4);
        for (let a = 0; a < 4; a++) { const [nx, ny] = step(x, y, a); const r = isGoal(nx, ny) ? goalReward(nx, ny) : 0; const vn = isGoal(nx, ny) ? 0 : V[idx(nx, ny)]; q[a] = r + gamma * vn; }
        const qa = q.map(v => v / alpha); const m = Math.max(...qa);
        let s = 0; for (const z of qa) s += Math.exp(z - m);
        const nv = alpha * (m + Math.log(s));
        delta = Math.max(delta, Math.abs(nv - V[idx(x, y)])); V[idx(x, y)] = nv;
      }
      if (delta < 1e-7) break;
    }
    // policies + entropy
    const P = {}; let Hsum = 0, Hn = 0;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (isWall(x, y) || isGoal(x, y)) continue;
      const q = new Array(4);
      for (let a = 0; a < 4; a++) { const [nx, ny] = step(x, y, a); const r = isGoal(nx, ny) ? goalReward(nx, ny) : 0; const vn = isGoal(nx, ny) ? 0 : V[idx(nx, ny)]; q[a] = (r + gamma * vn) / alpha; }
      const m = Math.max(...q); const e = q.map(z => Math.exp(z - m)); const Z = e.reduce((a, b) => a + b, 0);
      const p = e.map(v => v / Z); P[idx(x, y)] = p;
      let H = 0; for (const pi of p) if (pi > 1e-9) H -= pi * Math.log(pi);
      Hsum += H / Math.log(4); Hn++;
    }
    return { V, P, step, avgH: Hn ? Hsum / Hn : 0 };
  }, [alpha, gamma]);

  const solRef = _useRef(sol); _useEffect(() => { solRef.current = sol; }, [sol]);
  const agRef = _useRef({ x: START.x, y: START.y, trail: [] });

  function draw() {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d"); ctx.clearRect(0, 0, CW, CH);
    const { V, P } = solRef.current;
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < COLS * ROWS; i++) { const [x, y] = [i % COLS, Math.floor(i / COLS)]; if (isWall(x, y) || isGoal(x, y)) continue; lo = Math.min(lo, V[i]); hi = Math.max(hi, V[i]); }
    const span = (hi - lo) || 1;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const px = x * CELL, py = y * CELL;
      let fill;
      if (isWall(x, y)) fill = "#334155";
      else if (isGoal(x, y)) fill = goalReward(x, y) >= 1 ? "rgba(52,211,153,0.7)" : "rgba(52,211,153,0.4)";
      else { const t = (V[idx(x, y)] - lo) / span; fill = `rgba(168,85,247,${0.06 + 0.7 * t})`; }
      ctx.fillStyle = fill; ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
      if (isGoal(x, y)) { ctx.fillStyle = "#06281c"; ctx.font = "bold 9px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("+" + goalReward(x, y), px + CELL / 2, py + CELL / 2); }
      // policy arrows weighted by probability
      const p = P[idx(x, y)];
      if (p) { const cx = px + CELL / 2, cy = py + CELL / 2; for (let a = 0; a < 4; a++) { if (p[a] < 0.04) continue; const d = DIRS[a], len = 5 + p[a] * 8; ctx.strokeStyle = `rgba(224,231,255,${0.15 + 0.8 * p[a]})`; ctx.lineWidth = 1 + p[a] * 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + d[0] * len, cy + d[1] * len); ctx.stroke(); } }
    }
    // start label
    ctx.fillStyle = "#fbbf24"; ctx.font = "bold 9px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("S", START.x * CELL + CELL / 2, START.y * CELL + CELL / 2);
    // trail
    const ag = agRef.current;
    for (let i = 0; i < ag.trail.length; i++) { const t = ag.trail[i]; const a = 0.06 + 0.4 * (i / ag.trail.length); ctx.fillStyle = `rgba(251,191,36,${a})`; ctx.beginPath(); ctx.arc(t.x * CELL + CELL / 2, t.y * CELL + CELL / 2, 3, 0, Math.PI * 2); ctx.fill(); }
    // agent
    ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(ag.x * CELL + CELL / 2, ag.y * CELL + CELL / 2, 6, 0, Math.PI * 2); ctx.fill();
  }

  function agentStep() {
    const { P, step } = solRef.current, ag = agRef.current;
    const p = P[idx(ag.x, ag.y)];
    if (!p) { ag.x = START.x; ag.y = START.y; return; }
    let r = Math.random(), a = 0, acc = 0; for (let k = 0; k < 4; k++) { acc += p[k]; if (r <= acc) { a = k; break; } }
    const [nx, ny] = step(ag.x, ag.y, a);
    ag.trail.push({ x: ag.x, y: ag.y }); if (ag.trail.length > 40) ag.trail.shift();
    ag.x = nx; ag.y = ny;
    if (isGoal(nx, ny)) { ag.trail.push({ x: nx, y: ny }); ag.x = START.x; ag.y = START.y; }
  }

  _useEffect(() => { draw(); /* eslint-disable-next-line */ }, [sol]);
  _useEffect(() => {
    if (!running) return;
    let alive = true, raf, last = 0;
    const loop = (t) => {
      if (!alive) return;
      const interval = 1000 / Math.max(1, speed);
      if (t - last > interval) { last = t; agentStep(); draw(); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(raf); };
    /* eslint-disable-next-line */
  }, [running, speed]);

  const reset = () => { agRef.current = { x: START.x, y: START.y, trail: [] }; draw(); };

  const stage = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <canvas ref={cvRef} width={CW} height={CH}
        style={{ width: CW * 1.5, maxWidth: "100%", borderRadius: 6, border: "1px solid var(--border)", background: "#0b1530" }} />
      <Legend items={[
        { label: "soft value", color: "#a855f7" },
        { label: "goal (+reward)", color: "#34d399" },
        { label: "policy arrows", color: "#e0e7ff" },
        { label: "agent / trail", color: "#fbbf24" },
      ]} />
    </div>
  );

  const controls = (
    <ControlGroup>
      <Slider label="// TEMPERATURE α" min={0.02} max={1.2} step={0.02} value={alpha} onChange={setAlpha} tone="violet"
        help="The weight on policy entropy. High α makes the policy stochastic — it keeps probability on every decent action and visits both goals, exploring widely. As α→0 it sharpens to a single greedy path and the soft value becomes the ordinary (hard-max) value." />
      <Slider label="// DISCOUNT γ" min={0.8} max={0.99} step={0.01} value={gamma} onChange={setGamma} tone="blue"
        help="How far-sighted the agent is. Higher γ lets the value of the distant goals reach back across the grid." />
      <Slider label="// SPEED" min={2} max={80} value={speed} onChange={setSpeed} suffix=" /s"
        help="How fast the sampled agent moves under the soft policy. Visual only — the policy and values are solved exactly regardless." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setRunning(r => !r)} primary tone="violet">{running ? "PAUSE" : "RUN"}</DemoButton>
        <DemoButton onClick={reset}>CLEAR TRAIL</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="TEMPERATURE α" value={alpha.toFixed(2)} accent="var(--violet-lt)" />
        <StatReadout label="POLICY ENTROPY" value={(sol.avgH * 100).toFixed(0) + "%"} accent={sol.avgH > 0.5 ? "#34d399" : "#fbbf24"} />
        <StatReadout label="V(start)" value={sol.V[idx(START.x, START.y)].toFixed(2)} accent="#a855f7" />
        <StatReadout label="REGIME" value={alpha < 0.08 ? "GREEDY" : alpha > 0.6 ? "EXPLORATORY" : "SOFT"} accent="var(--blue-lt)" />
      </div>
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Two goals sit on the right — a better one (+1.0) and a slightly worse one
        (+0.85) — reachable only through the top or bottom gap. Standard RL would
        always sprint to the +1.0 goal by the single best route. <b>Max-entropy</b>{" "}
        RL instead maximizes reward <i>plus</i> policy entropy, weighted by the
        temperature <b>α</b>. That turns the Bellman max into a soft log-sum-exp and
        makes the policy a softmax over Q — the arrows show its full probability, not
        just the best move.
      </DemoP>
      <DemoP>
        Crank <b>α</b> up and the policy fans out: the agent keeps real probability
        on both gaps and both goals, wanders varied routes, and the entropy readout
        climbs — broad, robust behavior that explores instead of committing.
        Turn α toward 0 and it collapses onto the one greedy path to the +1.0 goal,
        and the soft values become ordinary value iteration. The temperature is the
        single dial between <b>exploration and exploitation</b>, set automatically in
        practice rather than by hand.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Maximum-entropy RL is the framework behind <b>Soft Actor-Critic</b>, one of
        the strongest continuous-control algorithms, and soft Q-learning. The
        entropy bonus does three useful things: it keeps exploration alive, it makes
        policies robust to perturbations, and it yields the Boltzmann policy
        π ∝ exp(Q/α) — the same temperature-controlled softmax used in{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/decoding/`} style={{ color: "#a855f7" }}>LLM
        decoding</a> and the soft routing of a{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/bandit/`} style={{ color: "#a855f7" }}>bandit</a>.
      </DemoP>
      <DemoP>
        It generalizes ordinary{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/value-iteration/`} style={{ color: "#a855f7" }}>value
        iteration</a> (recovered as α→0) and connects to the KL-regularized
        objective behind{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/ppo/`} style={{ color: "#a855f7" }}>PPO</a>{" "}
        and <a href={`${window.__DM_BASE || "../../"}visualize/dpo/`} style={{ color: "#a855f7" }}>RLHF</a>,
        where "stay high-entropy / stay near a reference" is exactly what keeps a
        policy from collapsing. Modern SAC even tunes α automatically to hit a
        target entropy.
      </DemoP>
    </>
  );

  return (
    <DemoLayout topic="REINFORCEMENT LEARNING" title="Maximum-Entropy RL (Soft Value Iteration)"
      subtitle="Maximize reward plus entropy. The temperature α slides from a single greedy path to a stochastic policy that keeps its options open — the idea behind Soft Actor-Critic."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/reinforcement-learning/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<MaxEntropyRLDemo />);
