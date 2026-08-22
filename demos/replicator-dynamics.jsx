// demos/replicator-dynamics.jsx — evolutionary game theory on the simplex.
// A population of three strategies evolves by the replicator equation
// x_i' = x_i ( f_i(x) - phi(x) ), f_i = (A x)_i, phi = x . A x. Strategies that
// beat the average grow. On the 2-simplex (triangle) you see the iconic
// behavior: Rock-Paper-Scissors cycles in closed orbits around the center,
// coordination games flow to a corner, a dominated game collapses to one vertex.
// Real replicator ODE (Euler), real payoff matrices, drag the start point.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 380;
const V = [[270, 44], [78, 332], [462, 332]]; // simplex vertices (top, BL, BR)
const VLAB = ["R", "P", "S"];

const GAMES = {
  rps: { label: "Rock-Paper-Scissors", A: [[0, -1, 1], [1, 0, -1], [-1, 1, 0]], note: "closed cycles around the center (mixed Nash)" },
  biased: { label: "Biased RPS", A: [[0, -1, 2], [1, 0, -1], [-2, 1, 0]], note: "orbits around the skewed Nash" },
  coord: { label: "Coordination", A: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], note: "flows to whichever corner you start nearest" },
  dom: { label: "Dominant strategy", A: [[1, 1, 1], [0, 0, 0], [0, 0, 0]], note: "strategy R dominates - collapses to that vertex" },
};

function bary2px(x) { return [x[0] * V[0][0] + x[1] * V[1][0] + x[2] * V[2][0], x[0] * V[0][1] + x[1] * V[1][1] + x[2] * V[2][1]]; }
function px2bary(px, py) {
  // solve P - V0 = l1 (V1-V0) + l2 (V2-V0)
  const ax = V[1][0] - V[0][0], ay = V[1][1] - V[0][1], bx = V[2][0] - V[0][0], by = V[2][1] - V[0][1];
  const det = ax * by - bx * ay, dx = px - V[0][0], dy = py - V[0][1];
  let l1 = (dx * by - bx * dy) / det, l2 = (ax * dy - dx * ay) / det, l0 = 1 - l1 - l2;
  l0 = Math.max(0, l0); l1 = Math.max(0, l1); l2 = Math.max(0, l2); const s = l0 + l1 + l2 || 1;
  return [l0 / s, l1 / s, l2 / s];
}

function ReplicatorDynamicsDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const xRef = _useRef([0.5, 0.3, 0.2]);
  const trailRef = _useRef([]);
  const fieldRef = _useRef([]);
  const rafRef = _useRef(null);

  const [game, setGame] = _useState("rps");
  const [rate, setRate] = _useState(0.06);
  const [running, setRunning] = _useState(false);
  const [, setTick] = _useState(0);

  const gRef = _useRef(game), rRef = _useRef(rate);
  _useEffect(() => { rRef.current = rate; }, [rate]);

  function deriv(x) {
    const A = GAMES[gRef.current].A;
    const f = x.map((_, i) => A[i][0] * x[0] + A[i][1] * x[1] + A[i][2] * x[2]);
    const phi = x[0] * f[0] + x[1] * f[1] + x[2] * f[2];
    return x.map((xi, i) => xi * (f[i] - phi));
  }
  function buildField() {
    const pts = [];
    for (let i = 1; i < 10; i++) for (let j = 1; j < 10 - i; j++) {
      const x0 = i / 10, x1 = j / 10, x2 = 1 - x0 - x1; if (x2 < 0.05) continue;
      const x = [x0, x1, x2], d = deriv(x);
      pts.push({ x, d });
    }
    fieldRef.current = pts;
  }

  function reset(startX) {
    xRef.current = startX ? startX.slice() : [0.5, 0.3, 0.2];
    trailRef.current = [xRef.current.slice()]; buildField(); setTick(v => v + 1); draw();
  }

  function step() {
    const x = xRef.current, d = deriv(x), r = rRef.current;
    let nx = x.map((xi, i) => Math.max(0, xi + r * d[i]));
    const s = nx[0] + nx[1] + nx[2] || 1; nx = nx.map(v => v / s);
    xRef.current = nx; trailRef.current.push(nx.slice()); if (trailRef.current.length > 1400) trailRef.current.shift();
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // triangle
    ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth = 1.5; ctx.beginPath();
    ctx.moveTo(V[0][0], V[0][1]); ctx.lineTo(V[1][0], V[1][1]); ctx.lineTo(V[2][0], V[2][1]); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.font = "12px JetBrains Mono, monospace"; ctx.textAlign = "center";
    ctx.fillText(VLAB[0], V[0][0], V[0][1] - 8); ctx.fillText(VLAB[1], V[1][0] - 12, V[1][1] + 14); ctx.fillText(VLAB[2], V[2][0] + 12, V[2][1] + 14);
    // center (uniform)
    const [ccx, ccy] = bary2px([1 / 3, 1 / 3, 1 / 3]);
    ctx.strokeStyle = "rgba(52,211,153,0.4)"; ctx.beginPath(); ctx.arc(ccx, ccy, 3, 0, Math.PI * 2); ctx.stroke();
    // vector field
    fieldRef.current.forEach(({ x, d }) => {
      const [px, py] = bary2px(x);
      // project bary velocity to pixel
      let vx = d[0] * V[0][0] + d[1] * V[1][0] + d[2] * V[2][0];
      let vy = d[0] * V[0][1] + d[1] * V[1][1] + d[2] * V[2][1];
      const m = Math.hypot(vx, vy) || 1; const L = 11; vx = vx / m * L; vy = vy / m * L;
      ctx.strokeStyle = "rgba(96,165,250,0.35)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + vx, py + vy); ctx.stroke();
      const a = Math.atan2(vy, vx); ctx.beginPath(); ctx.moveTo(px + vx, py + vy); ctx.lineTo(px + vx - 4 * Math.cos(a - 0.5), py + vy - 4 * Math.sin(a - 0.5)); ctx.lineTo(px + vx - 4 * Math.cos(a + 0.5), py + vy - 4 * Math.sin(a + 0.5)); ctx.closePath(); ctx.fillStyle = "rgba(96,165,250,0.35)"; ctx.fill();
    });
    // trail
    const tr = trailRef.current;
    if (tr.length > 1) { ctx.strokeStyle = "#c084fc"; ctx.lineWidth = 2; ctx.beginPath(); tr.forEach((x, i) => { const [px, py] = bary2px(x); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke(); }
    // current point
    const [cx, cy] = bary2px(xRef.current);
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "10px JetBrains Mono"; ctx.textAlign = "left";
    ctx.fillText("each point = a population mix of the 3 strategies; click to reseed", 16, H - 14);
  }

  function onDown(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / (rect.width / W), py = (e.clientY - rect.top) / (rect.height / H);
    reset(px2bary(px, py));
  }

  function handleRun() { if (running) { setRunning(false); return; } setRunning(true); }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    reset([0.5, 0.3, 0.2]);
  }, []);
  _useEffect(() => { gRef.current = game; setRunning(false); reset(xRef.current); }, [game]);

  _useEffect(() => {
    if (!running) return;
    let alive = true;
    const loop = () => { if (!alive) return; for (let i = 0; i < 3; i++) step(); setTick(v => v + 1); draw(); rafRef.current = requestAnimationFrame(loop); };
    rafRef.current = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, [running]);

  const x = xRef.current, g = GAMES[game];
  const stage = (<canvas ref={canvasRef} onPointerDown={onDown} style={{ touchAction: "none", cursor: "crosshair", maxWidth: "100%", borderRadius: 4 }} />);

  const controls = (
    <ControlGroup>
      <SegmentedControl label="// GAME" value={game} onChange={setGame}
        options={Object.entries(GAMES).map(([k, v]) => ({ value: k, label: v.label }))}
        help="The payoff structure driving fitness. RPS and Biased RPS produce closed orbits (the population cycles forever); Coordination has three stable corners; Dominant collapses to a single vertex." />
      <Slider label="// RATE" min={0.01} max={0.2} step={0.01} value={rate} onChange={setRate}
        help="Replicator step size (selection speed). Larger = faster evolution; purely the integration rate, it does not change the orbits' shape." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={handleRun} primary>{running ? "PAUSE" : "RUN"}</DemoButton>
        <DemoButton onClick={() => { for (let i = 0; i < 30; i++) step(); setTick(v => v + 1); draw(); }} disabled={running}>+30</DemoButton>
        <DemoButton onClick={() => reset([0.5, 0.3, 0.2])}>RESET</DemoButton>
      </div>
      <StatReadout label="POPULATION MIX" value={`R ${(x[0] * 100).toFixed(0)}%  P ${(x[1] * 100).toFixed(0)}%  S ${(x[2] * 100).toFixed(0)}%`} accent="var(--violet-lt)" />
      <Legend items={[
        { color: "#c084fc", label: "trajectory" },
        { color: "#60a5fa", label: "flow field" },
        { color: "#34d399", label: "center (uniform)" },
      ]} />
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>{g.note}</div>
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        The replicator equation is evolution written as math: each strategy's share grows in
        proportion to how much its payoff beats the population <b>average</b>. Successful strategies
        spread, unsuccessful ones die out. The triangle is the space of all population mixes of three
        strategies — corners are "everyone plays the same move," the center is an even split — and the
        blue arrows are the flow the dynamics push you along.
      </DemoP>
      <DemoP>
        The behavior is strikingly different per game. <b>Rock-Paper-Scissors</b> never settles:
        rock beats scissors so rock grows, which feeds paper, which feeds scissors — a perpetual
        <b> cycle</b> orbiting the Nash center. <b>Coordination</b> games flow to whichever corner you
        start nearest (multiple stable equilibria), and a <b>dominant</b> strategy sweeps the whole
        population to one vertex. Click anywhere to drop a new starting population and watch where the
        flow carries it.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Replicator dynamics is the foundation of <b>evolutionary game theory</b> — modeling animal
        behavior, the spread of conventions and languages, and the rise and fall of strategies in
        markets and ecosystems. The fixed points are exactly the Nash equilibria, but it adds the
        crucial idea of an <b>evolutionarily stable strategy</b> (one that resists invasion), and it's
        the continuous-time cousin of the discrete <a href={`${window.__DM_BASE || "../../"}visualize/regret-matching/`}>regret-matching</a>
        learning on the same games.
      </DemoP>
      <DemoP>
        The cycling you see is not a bug — it's the central cautionary tale of <b>multi-agent
        learning</b>. Gradient-style dynamics on games (including <a href={`${window.__DM_BASE || "../../"}visualize/gan/`}>GAN</a>
        training and competitive multi-agent RL) can orbit an equilibrium forever instead of converging,
        which is why people use time-averaging, optimism, or regularization to damp the rotation. The
        same simplex picture explains why "the agents keep changing strategies" can be perfectly healthy:
        the <i>average</i> behavior is sitting right at the Nash point in the middle.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      title="Replicator Dynamics"
      subtitle="Evolve a population of strategies on the simplex - and watch Rock-Paper-Scissors cycle forever around Nash."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/reinforcement-learning/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="violet"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ReplicatorDynamicsDemo />);
