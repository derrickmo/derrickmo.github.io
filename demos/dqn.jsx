// demos/dqn.jsx — a real (tiny) Deep Q-Network with the two tricks that made
// DQN work: an experience replay buffer and a separate target network.
//
// Environment: a 1D line, state s in [-1, 1]. Three actions {left, stay, right}
// move s by -0.12 / 0 / +0.12. Reward +1 for landing in the goal band |s|<0.1
// (terminal); otherwise a -0.02 step cost. Episodes cap at 60 steps.
//
// Q-function: a 1 -> H -> 3 MLP (tanh hidden), trained by hand (forward +
// backprop, plain SGD) to minimize the TD loss
//     L = ( Q(s,a) - [ r + gamma * max_a' Q_target(s',a') ] )^2
// over a random minibatch drawn from the replay buffer. The target network is a
// frozen copy of Q, re-synced every C steps.
//
// Two toggles expose WHY those tricks matter:
//   - REPLAY off  -> train on the single most-recent transition (correlated,
//     non-stationary) and watch the Q-curves thrash.
//   - TARGET NET off -> bootstrap off the online net itself (a moving target)
//     and watch the values chase themselves / diverge.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup, Toggle,
} = window;

const W = 540, H = 480;
const PAD = 24;
const H_HID = 12;                       // hidden units
const MOVES = [-0.12, 0, 0.12];         // left, stay, right
const ACT_COLOR = ["#60a5fa", "#94a3b8", "#fbbf24"];
const GOAL = 0.1, STEP_COST = -0.02, MAX_STEPS = 60;
const CAP = 400, VIS = 48;              // buffer capacity / cells visualized

const sx = (s) => PAD + ((s + 1) / 2) * (W - 2 * PAD);

function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

// ── tiny MLP: 1 -> H_HID (tanh) -> 3 (linear) ──
function makeNet() {
  return {
    W1: Array.from({ length: H_HID }, () => randn() * 0.8),  // [H]   (input dim 1)
    b1: new Float64Array(H_HID),
    W2: Array.from({ length: 3 }, () => Array.from({ length: H_HID }, () => randn() * 0.5)), // [3][H]
    b2: new Float64Array(3),
  };
}
function copyNet(n) {
  return {
    W1: n.W1.slice(), b1: n.b1.slice(),
    W2: n.W2.map(r => r.slice()), b2: n.b2.slice(),
  };
}
function forward(net, s) {
  const h = new Float64Array(H_HID);
  for (let j = 0; j < H_HID; j++) h[j] = Math.tanh(net.W1[j] * s + net.b1[j]);
  const q = new Float64Array(3);
  for (let k = 0; k < 3; k++) { let acc = net.b2[k]; for (let j = 0; j < H_HID; j++) acc += net.W2[k][j] * h[j]; q[k] = acc; }
  return { h, q };
}
function maxQ(net, s) { const { q } = forward(net, s); return Math.max(q[0], q[1], q[2]); }

function DQNDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const lastRef = _useRef(0);

  const makeState = () => ({
    net: makeNet(), target: null,
    buf: [], head: 0,            // ring buffer of transitions
    s: Math.random() * 1.6 - 0.8,
    ep: 0, epReturn: 0, steps: 0, total: 0, syncIn: 0,
    loss: 0, returns: [], losses: [], lastSample: [],
  });
  const st = _useRef(makeState());
  // init target
  if (!st.current.target) st.current.target = copyNet(st.current.net);

  const [gamma, setGamma] = _useState(0.95);
  const [lr, setLr] = _useState(0.05);
  const [eps, setEps] = _useState(0.2);
  const [syncC, setSyncC] = _useState(50);
  const [useReplay, setUseReplay] = _useState(true);
  const [useTarget, setUseTarget] = _useState(true);
  const [speed, setSpeed] = _useState(40);
  const [running, setRunning] = _useState(false);
  const [, force] = _useState(0);

  function reset() {
    st.current = makeState();
    st.current.target = copyNet(st.current.net);
    force(x => x + 1);
  }

  function push(tr) {
    const s = st.current;
    if (s.buf.length < CAP) s.buf.push(tr);
    else { s.buf[s.head] = tr; }
    s.head = (s.head + 1) % CAP;
  }

  // one SGD step on a minibatch of transitions
  function learn(batch) {
    const s = st.current;
    const net = s.net, tnet = useTarget ? s.target : s.net;
    // accumulate grads
    const gW1 = new Float64Array(H_HID), gb1 = new Float64Array(H_HID);
    const gW2 = Array.from({ length: 3 }, () => new Float64Array(H_HID)), gb2 = new Float64Array(3);
    let lossSum = 0;
    for (const tr of batch) {
      const { h, q } = forward(net, tr.s);
      const y = tr.done ? tr.r : tr.r + gamma * maxQ(tnet, tr.s2);
      const a = tr.a;
      const err = q[a] - y;
      lossSum += err * err;
      const dq = 2 * err;                 // dL/dq[a]
      // output layer (only action a contributes)
      for (let j = 0; j < H_HID; j++) gW2[a][j] += dq * h[j];
      gb2[a] += dq;
      // hidden
      for (let j = 0; j < H_HID; j++) {
        const dh = dq * net.W2[a][j] * (1 - h[j] * h[j]); // tanh'
        gW1[j] += dh * tr.s;
        gb1[j] += dh;
      }
    }
    const n = batch.length, step = lr / n;
    for (let j = 0; j < H_HID; j++) { net.W1[j] -= step * gW1[j]; net.b1[j] -= step * gb1[j]; }
    for (let k = 0; k < 3; k++) { net.b2[k] -= step * gb2[k]; for (let j = 0; j < H_HID; j++) net.W2[k][j] -= step * gW2[k][j]; }
    s.loss = 0.95 * s.loss + 0.05 * (lossSum / n);
  }

  function step() {
    const s = st.current;
    // epsilon-greedy on the ONLINE net
    let a;
    if (Math.random() < eps) a = (Math.random() * 3) | 0;
    else { const { q } = forward(s.net, s.s); a = q[0] >= q[1] ? (q[0] >= q[2] ? 0 : 2) : (q[1] >= q[2] ? 1 : 2); }
    let s2 = Math.max(-1, Math.min(1, s.s + MOVES[a]));
    const reachedGoal = Math.abs(s2) < GOAL;
    const r = reachedGoal ? 1 : STEP_COST;
    const done = reachedGoal || s.steps + 1 >= MAX_STEPS;
    push({ s: s.s, a, r, s2, done });
    s.epReturn += r; s.steps += 1; s.total += 1; s.s = s2;

    // learn
    if (s.buf.length >= 8) {
      let batch, sampledIdx = [];
      if (useReplay) {
        const bs = 16;
        for (let i = 0; i < bs; i++) { const idx = (Math.random() * s.buf.length) | 0; sampledIdx.push(idx); }
        batch = sampledIdx.map(i => s.buf[i]);
      } else {
        // most-recent transition only (correlated, non-stationary)
        const lastIdx = (s.head - 1 + CAP) % CAP;
        batch = [s.buf[lastIdx % s.buf.length]];
        sampledIdx = [lastIdx % s.buf.length];
      }
      s.lastSample = sampledIdx;
      learn(batch);
      s.losses.push(s.loss); if (s.losses.length > 260) s.losses.shift();
    }

    // target sync
    s.syncIn -= 1;
    if (useTarget && s.syncIn <= 0) { s.target = copyNet(s.net); s.syncIn = syncC; }

    if (done) {
      const prev = s.returns.length ? s.returns[s.returns.length - 1] : s.epReturn;
      s.returns.push(0.9 * prev + 0.1 * s.epReturn);
      if (s.returns.length > 260) s.returns.shift();
      s.ep += 1; s.epReturn = 0; s.steps = 0;
      s.s = Math.random() * 1.6 - 0.8;
    }
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const s = st.current;
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";

    // ── top: Q(s,a) curves over the state line ──
    const topY = 34, topH = 158;
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("Q(s, a)  ·  predicted value of each action across the state line", PAD, topY - 8);
    ctx.strokeStyle = "rgba(96,165,250,0.18)"; ctx.strokeRect(PAD, topY, W - 2 * PAD, topH);
    // goal band
    ctx.fillStyle = "rgba(52,211,153,0.12)";
    ctx.fillRect(sx(-GOAL), topY, sx(GOAL) - sx(-GOAL), topH);
    ctx.fillStyle = "#34d399"; ctx.fillText("goal", sx(0) - 10, topY + 12);

    // sample Q over grid
    const N = 80, grid = [];
    let qMin = Infinity, qMax = -Infinity;
    for (let i = 0; i <= N; i++) {
      const sv = -1 + (2 * i) / N;
      const { q } = forward(s.net, sv);
      grid.push(q);
      for (let k = 0; k < 3; k++) { if (q[k] < qMin) qMin = q[k]; if (q[k] > qMax) qMax = q[k]; }
    }
    if (qMax - qMin < 1e-6) qMax = qMin + 1e-6;
    const qy = (v) => topY + topH - ((v - qMin) / (qMax - qMin)) * (topH - 10) - 5;
    for (let k = 0; k < 3; k++) {
      ctx.strokeStyle = ACT_COLOR[k]; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const x = PAD + (i / N) * (W - 2 * PAD), y = qy(grid[i][k]);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // agent marker
    ctx.strokeStyle = "rgba(226,232,240,0.7)"; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(sx(s.s), topY); ctx.lineTo(sx(s.s), topY + topH); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "rgba(226,232,240,0.95)"; ctx.beginPath(); ctx.arc(sx(s.s), topY + topH - 6, 4, 0, Math.PI * 2); ctx.fill();

    // ── middle: replay buffer strip ──
    const bufY = 210, cellW = (W - 2 * PAD) / VIS;
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(`REPLAY BUFFER  ·  ${s.buf.length}/${CAP} stored` + (useReplay ? "  ·  random minibatch sampled each step" : "  ·  REPLAY OFF (last transition only)"), PAD, bufY - 6);
    const start = Math.max(0, s.buf.length - VIS);
    for (let i = 0; i < VIS; i++) {
      const bi = start + i; if (bi >= s.buf.length) break;
      const tr = s.buf[bi];
      const x = PAD + i * cellW;
      ctx.fillStyle = tr.r > 0 ? "rgba(52,211,153,0.85)" : "rgba(96,165,250,0.4)";
      ctx.fillRect(x, bufY, cellW - 1.5, 14);
      if (s.lastSample.includes(bi)) { ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 1.5; ctx.strokeRect(x, bufY, cellW - 1.5, 14); }
    }

    // ── bottom: loss + smoothed return ──
    const botY = 262, botH = 196;
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("TRAINING  ·  TD loss (violet) and smoothed episode return (blue)", PAD, botY - 8);
    ctx.strokeStyle = "rgba(96,165,250,0.18)"; ctx.strokeRect(PAD, botY, W - 2 * PAD, botH);
    const plot = (arr, color, lo, hi) => {
      if (arr.length < 2) return;
      const span = Math.max(hi - lo, 1e-6);
      ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.beginPath();
      for (let i = 0; i < arr.length; i++) {
        const x = PAD + (i / Math.max(1, arr.length - 1)) * (W - 2 * PAD);
        const y = botY + botH - ((Math.min(hi, Math.max(lo, arr[i])) - lo) / span) * (botH - 8) - 4;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };
    if (s.losses.length > 1) { const lMax = Math.max(...s.losses, 0.01); plot(s.losses, "#c084fc", 0, lMax); }
    plot(s.returns, "#60a5fa", -1, 1);
    ctx.fillStyle = "#c084fc"; ctx.fillText("loss", PAD + 8, botY + 14);
    ctx.fillStyle = "#60a5fa"; ctx.fillText("return", PAD + 60, botY + 14);
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
  }, [running, gamma, lr, eps, syncC, useReplay, useTarget, speed]);

  const s = st.current;
  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// GAMMA (discount)" min={0.5} max={0.99} step={0.01} value={gamma} onChange={setGamma}
        help="Weight on the bootstrapped future value in the TD target r + γ·maxₐ Q(s′,a). Higher γ makes the network value the goal from farther away, but also amplifies any error in the target network." />
      <Slider label="// LR" min={0.005} max={0.2} step={0.005} value={lr} onChange={setLr} tone="violet"
        help="SGD step size for the Q-network. Deep RL is famously brittle here: too high and the bootstrapped target makes the loss explode (especially with the target net off)." />
      <Slider label="// EPSILON (explore)" min={0} max={0.6} step={0.02} value={eps} onChange={setEps}
        help="Probability of a random action instead of the greedy argmax. Some exploration is needed to ever fill the buffer with goal-reaching transitions; too much and the policy never commits." />
      <Slider label="// TARGET SYNC (C)" min={5} max={150} step={5} value={syncC} onChange={setSyncC}
        help="How often (in steps) the target network is overwritten with the online weights. Small C → target chases the online net (less stable); large C → stable but stale targets that lag real progress." />
      <Toggle label="// EXPERIENCE REPLAY" checked={useReplay} onChange={setUseReplay}
        help="On: train on a random minibatch from the buffer (decorrelates samples, reuses data). Off: train only on the most recent transition — watch the Q-curves thrash from correlated, non-stationary updates." />
      <Toggle label="// TARGET NETWORK" checked={useTarget} onChange={setUseTarget}
        help="On: bootstrap the TD target from a frozen copy of Q, synced every C steps. Off: bootstrap from the online net itself — a moving target that chases its own tail and often diverges." />
      <Slider label="// SPEED (steps/sec)" min={4} max={120} step={2} value={speed} onChange={setSpeed}
        help="Environment + learning steps per second." />
      <DemoButton onClick={() => setRunning(r => !r)} primary>{running ? "PAUSE" : "TRAIN"}</DemoButton>
      <DemoButton onClick={reset}>RESET</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="EPISODE" value={s.ep} />
        <StatReadout label="STEPS" value={s.total} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="TD LOSS" value={s.loss.toFixed(3)} accent="#c084fc" />
        <StatReadout label="RETURN" value={(s.returns.length ? s.returns[s.returns.length - 1].toFixed(2) : "—")} accent="#60a5fa" />
      </div>
      <Legend items={[
        { color: "#60a5fa", label: "Q(left)" },
        { color: "#94a3b8", label: "Q(stay)" },
        { color: "#fbbf24", label: "Q(right)" },
        { color: "#34d399", label: "goal band" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Tabular Q-learning needs one cell per state — hopeless once the state is
        continuous. DQN replaces the table with a small neural network that{" "}
        <i>approximates</i> Q(s, a), so it can generalize across nearby states.
        The three curves are the network's value estimate for moving left,
        staying, and moving right at every point on the line; the agent acts
        greedily (argmax) with a little ε-exploration. Watch the curves bend into
        a tent that peaks at the green goal — the network is learning that getting
        near zero is worth +1.
      </DemoP>
      <DemoP>
        Naively training a network on its own bootstrapped targets diverges, and
        that's what the two toggles let you feel. <b>Experience replay</b> stores
        every transition and trains on random minibatches, so consecutive
        gradient steps aren't correlated and rare goal-reaching steps get reused
        many times. The <b>target network</b> freezes the weights used to compute
        r + γ·maxₐ Q(s′,a) for C steps, so the network isn't chasing a target that
        moves every update. Turn either off and the loss curve gets violent — that
        instability is exactly the problem the 2015 DQN paper solved.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        DQN (Mnih et al., 2015) is what put deep RL on the map — one architecture
        learning to play 49 Atari games from raw pixels and a score. The version
        here is the same algorithm with a 1-input network instead of a
        convolutional one: ε-greedy behavior, a replay buffer, a periodically
        synced target net, and a squared TD loss. Everything that made it famous
        is a mechanism for <i>stabilizing function approximation under
        bootstrapping</i>.
      </DemoP>
      <DemoP>
        It's also the value-based counterpart to the{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/policy-gradient/`} style={{ color: "#a855f7" }}>policy-gradient</a>{" "}
        and{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/actor-critic/`} style={{ color: "#a855f7" }}>actor-critic</a>{" "}
        demos: instead of directly parameterizing a policy, DQN learns values and
        acts greedily on them. Double-DQN (decouples action selection from
        evaluation), dueling heads (split value and advantage), and prioritized
        replay (sample high-error transitions more) are all refinements of the
        exact loop you're watching.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="REINFORCEMENT LEARNING" title="Deep Q-Network (DQN)"
      subtitle="A neural net learns Q(s, a) on a continuous state. Toggle experience replay and the target network to see why deep RL needs both to stay stable."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/reinforcement-learning/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<DQNDemo />);
