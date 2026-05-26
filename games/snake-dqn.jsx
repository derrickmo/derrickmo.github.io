// games/snake-dqn.jsx — a snake that teaches itself to eat by reinforcement
// learning. Real Q-learning: an 11-feature state (dangers + food direction +
// heading), 3 relative actions, ε-greedy exploration, and a TD update. Watch the
// policy sharpen episode by episode.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const N = 14, CELL = 22, W = N * CELL;
const ALPHA = 0.1, GAMMA = 0.9;
const cw = (d) => [d[1], -d[0]];   // turn right (screen coords: r down, c right)
const ccw = (d) => [-d[1], d[0]];  // turn left
const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);

function SnakeDemo() {
  const canvasRef = _useRef(null), dprRef = _useRef(1);
  const Q = _useRef({});
  const snakeRef = _useRef([]), dirRef = _useRef([0, 1]), foodRef = _useRef([0, 0]);
  const epsRef = _useRef(1), epiRef = _useRef(0), scoreRef = _useRef(0), bestRef = _useRef(0), hungerRef = _useRef(0);
  const histRef = _useRef([]);
  const rafRef = _useRef(0), runningRef = _useRef(false), speedRef = _useRef(10), accRef = _useRef(0), frameRef = _useRef(0);
  const [running, setRunning] = _useState(false);
  const [speed, setSpeed] = _useState(10);
  const [stats, setStats] = _useState({ epi: 0, score: 0, best: 0, avg: 0, eps: 1 });

  function collision(cell) {
    if (cell[0] < 0 || cell[0] >= N || cell[1] < 0 || cell[1] >= N) return true;
    const s = snakeRef.current;
    for (let i = 0; i < s.length - 1; i++) if (s[i][0] === cell[0] && s[i][1] === cell[1]) return true;
    return false;
  }
  function spawnFood() {
    const s = snakeRef.current; let f;
    do { f = [(Math.random() * N) | 0, (Math.random() * N) | 0]; } while (s.some(p => p[0] === f[0] && p[1] === f[1]));
    foodRef.current = f;
  }
  function resetSnake() {
    const c = (N / 2) | 0; snakeRef.current = [[c, c], [c, c - 1], [c, c - 2]]; dirRef.current = [0, 1];
    hungerRef.current = 0; scoreRef.current = 0; spawnFood();
  }
  function stateKey() {
    const h = snakeRef.current[0], d = dirRef.current, f = foodRef.current;
    const ds = collision([h[0] + d[0], h[1] + d[1]]) ? 1 : 0;
    const rd = cw(d), ld = ccw(d);
    const dr = collision([h[0] + rd[0], h[1] + rd[1]]) ? 1 : 0;
    const dl = collision([h[0] + ld[0], h[1] + ld[1]]) ? 1 : 0;
    return `${ds}${dr}${dl}${f[0] < h[0] ? 1 : 0}${f[0] > h[0] ? 1 : 0}${f[1] < h[1] ? 1 : 0}${f[1] > h[1] ? 1 : 0}${d[0] === -1 ? 1 : 0}${d[0] === 1 ? 1 : 0}${d[1] === -1 ? 1 : 0}${d[1] === 1 ? 1 : 0}`;
  }
  const getQ = (k) => Q.current[k] || (Q.current[k] = [0, 0, 0]);
  const argmax = (a) => a[0] >= a[1] ? (a[0] >= a[2] ? 0 : 2) : (a[1] >= a[2] ? 1 : 2);

  function endEpisode() {
    bestRef.current = Math.max(bestRef.current, scoreRef.current);
    histRef.current.push(scoreRef.current); if (histRef.current.length > 30) histRef.current.shift();
    epiRef.current += 1; epsRef.current = Math.max(0.01, epsRef.current * 0.99);
    resetSnake();
  }
  function step() {
    const k = stateKey(), q = getQ(k);
    const a = Math.random() < epsRef.current ? (Math.random() * 3) | 0 : argmax(q);
    const d = dirRef.current;
    const nd = a === 0 ? d : a === 1 ? cw(d) : ccw(d);
    const h = snakeRef.current[0], nh = [h[0] + nd[0], h[1] + nd[1]];
    const prev = dist(h, foodRef.current);
    let reward = 0, done = false;
    if (collision(nh)) { reward = -10; done = true; }
    else {
      dirRef.current = nd; snakeRef.current.unshift(nh);
      if (nh[0] === foodRef.current[0] && nh[1] === foodRef.current[1]) { reward = 10; scoreRef.current++; spawnFood(); hungerRef.current = 0; }
      else { snakeRef.current.pop(); reward = dist(nh, foodRef.current) < prev ? 1 : -1; hungerRef.current++; if (hungerRef.current > N * N * 2) { reward = -10; done = true; } }
    }
    const target = done ? reward : reward + GAMMA * Math.max(...getQ(stateKey()));
    q[a] += ALPHA * (target - q[a]);
    if (done) endEpisode();
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, W);
    ctx.strokeStyle = "rgba(96,165,250,0.07)"; ctx.lineWidth = 1;
    for (let i = 1; i < N; i++) { ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, W); ctx.moveTo(0, i * CELL); ctx.lineTo(W, i * CELL); ctx.stroke(); }
    const f = foodRef.current;
    ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(f[1] * CELL + CELL / 2, f[0] * CELL + CELL / 2, CELL * 0.32, 0, Math.PI * 2); ctx.fill();
    const s = snakeRef.current;
    for (let i = 0; i < s.length; i++) { ctx.fillStyle = i === 0 ? "#e0e7ff" : "#c084fc"; ctx.fillRect(s[i][1] * CELL + 2, s[i][0] * CELL + 2, CELL - 4, CELL - 4); }
    if (histRef.current.length > 1) {
      const mx = Math.max(2, ...histRef.current);
      ctx.strokeStyle = "rgba(52,211,153,0.8)"; ctx.lineWidth = 1.5; ctx.beginPath();
      histRef.current.forEach((v, i) => { const X = W - 100 + i * (90 / 30), Y = 30 - v / mx * 22; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
      ctx.stroke(); ctx.fillStyle = "#475569"; ctx.font = "8px JetBrains Mono, monospace"; ctx.fillText("SCORE / EPISODE", W - 100, 40);
    }
  }
  function pushStats() {
    const h = histRef.current, avg = h.length ? (h.reduce((a, b) => a + b, 0) / h.length) : 0;
    setStats({ epi: epiRef.current, score: scoreRef.current, best: bestRef.current, avg: avg.toFixed(1), eps: epsRef.current.toFixed(2) });
  }
  function loop() {
    if (!runningRef.current) return;
    accRef.current += 0.18 * speedRef.current; let n = Math.floor(accRef.current); accRef.current -= n;
    for (let i = 0; i < n; i++) step();
    draw();
    if (++frameRef.current % 4 === 0) pushStats();
    rafRef.current = requestAnimationFrame(loop);
  }
  function start() { if (runningRef.current) return; runningRef.current = true; setRunning(true); loop(); }
  function stop() { runningRef.current = false; setRunning(false); cancelAnimationFrame(rafRef.current); }
  function resetAll() { stop(); Q.current = {}; epsRef.current = 1; epiRef.current = 0; bestRef.current = 0; histRef.current = []; resetSnake(); pushStats(); draw(); start(); }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = W * dpr; cv.style.width = W + "px"; cv.style.height = W + "px";
    resetSnake(); draw(); start();
    return () => stop();
  }, []);

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <SegmentedControl label="// SPEED" value={String(speed)} onChange={v => { const n = parseInt(v); setSpeed(n); speedRef.current = n; }}
        options={[{ value: "1", label: "1x" }, { value: "10", label: "10x" }, { value: "100", label: "100x" }]}
        help="Training speed multiplier (1x/10x/100x). Higher fast-forwards through episodes so the policy converges faster — it doesn't change what's learned." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => (running ? stop() : start())} primary tone="violet">{running ? "PAUSE" : "TRAIN"}</DemoButton>
        <DemoButton onClick={resetAll}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="EPISODE" value={stats.epi} accent="var(--violet-lt)" />
        <StatReadout label="EXPLORE ε" value={stats.eps} />
        <StatReadout label="BEST SCORE" value={stats.best} accent="#fbbf24" />
        <StatReadout label="AVG (last 30)" value={stats.avg} accent="#34d399" />
      </div>
      <Legend items={[{ color: "#e0e7ff", label: "HEAD" }, { color: "#c084fc", label: "BODY" }, { color: "#fbbf24", label: "FOOD" }]} />
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>Early on it flails (ε high = exploring); as ε decays it exploits what it learned and the average score climbs.</div>
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Nobody told this snake the rules — it learns them from <b>reward</b>. This is
        <b> Q-learning</b>: the agent keeps a table estimating the value of each action
        in each situation, where a "situation" is a compact 11-feature state (is there
        danger straight / left / right, which way is the food, which way am I heading?).
        It gets <b>+10</b> for eating, <b>−10</b> for dying, and small nudges for moving
        toward or away from food. After each move it updates its estimate toward
        <i> reward + the best it expects next</i> — the temporal-difference update at the
        heart of RL.
      </DemoP>
      <DemoP>
        Watch <b>ε</b> (exploration) decay: at first it acts randomly to discover what
        works, then increasingly <i>exploits</i> the policy it has learned — and the
        <span style={{ color: "#34d399" }}> average score</span> climbs from near-zero
        to consistently feeding itself. That explore-vs-exploit balance, and learning
        purely from delayed reward, is the same machinery (scaled up to deep networks)
        behind game-playing agents and the RLHF step that aligns modern LLMs. Crank the
        speed to fast-forward thousands of episodes.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Snake is a compact, complete reinforcement-learning loop: state → action → reward →
        temporal-difference update — the same Q-learning at the core of the gridworld and
        value-iteration demos, but driving a game you can watch improve. The crucial design
        move is the <b>state representation</b>: collapsing the whole board into 11 relevant
        features (nearby dangers, food direction, heading) so a small table can generalize
        instead of memorizing every configuration.
      </DemoP>
      <DemoP>
        That representation choice is exactly the wall tabular RL hits — and exactly what
        <b> Deep Q-Networks</b> solved by replacing the table with a neural network that
        learns its own features from raw input (Atari straight from pixels). The
        explore-then-exploit arc you watch as ε decays, and learning from delayed reward, is
        the same machinery that scales up to game-playing agents and the RLHF step used to
        align modern LLMs.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="REINFORCEMENT LEARNING" title="Snake: Self-Taught"
      subtitle="A snake that learns to feed itself from reward alone — real Q-learning, sharpening episode by episode."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      backHref={`${window.__DM_BASE || "../../"}play/`} backLabel="PLAY" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<SnakeDemo />);
