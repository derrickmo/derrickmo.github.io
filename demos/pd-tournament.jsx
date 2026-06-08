// demos/pd-tournament.jsx — Axelrod's iterated prisoner's dilemma tournament.
// A round-robin where classic strategies (TitForTat, AllD, Grim, Pavlov, ...)
// play repeated PD against each other; total score ranks them. The famous
// result: nice, reciprocal strategies (TitForTat) win, and cooperation emerges
// among reciprocators even though defection dominates any single round. Real
// deterministic strategies, real PD payoffs, optional execution noise.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 380;
// payoff to me given (my move, opp move): CC=3, CD=0, DC=5, DD=1
function payoff(me, opp) { return me === "C" ? (opp === "C" ? 3 : 0) : (opp === "C" ? 5 : 1); }

const STRATS = [
  { name: "TitForTat", col: "#34d399", f: (h, o) => o.length ? o[o.length - 1] : "C" },
  { name: "Grim", col: "#f472b6", f: (h, o) => o.includes("D") ? "D" : "C" },
  { name: "Pavlov", col: "#22d3ee", f: (h, o) => h.length ? (h[h.length - 1] === o[o.length - 1] ? "C" : "D") : "C" },
  { name: "TF2T", col: "#a855f7", f: (h, o) => (o.length >= 2 && o[o.length - 1] === "D" && o[o.length - 2] === "D") ? "D" : "C" },
  { name: "AllC", col: "#60a5fa", f: () => "C" },
  { name: "Random", col: "#94a3b8", f: (h, o, rng) => rng() < 0.5 ? "C" : "D" },
  { name: "AllD", col: "#fb923c", f: () => "D" },
];

function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function PdTournamentDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const resRef = _useRef(null); // {M:[][], totals:[], order:[]}
  const [seed, setSeed] = _useState(1);
  const [rounds, setRounds] = _useState(60);
  const [noise, setNoise] = _useState(0);
  const [, setTick] = _useState(0);

  function match(a, b, rng) {
    const ha = [], hb = []; let sa = 0, sb = 0;
    for (let r = 0; r < rounds; r++) {
      let ma = a.f(ha, hb, rng), mb = b.f(hb, ha, rng);
      if (noise > 0) { if (rng() < noise) ma = ma === "C" ? "D" : "C"; if (rng() < noise) mb = mb === "C" ? "D" : "C"; }
      sa += payoff(ma, mb); sb += payoff(mb, ma); ha.push(ma); hb.push(mb);
    }
    return [sa / rounds, sb / rounds];
  }

  function run() {
    const rng = mulberry32(seed * 2654435761);
    const n = STRATS.length, M = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) for (let j = i; j < n; j++) {
      const [si, sj] = match(STRATS[i], STRATS[j], rng);
      M[i][j] = si; M[j][i] = sj;
    }
    const totals = M.map(row => row.reduce((a, b) => a + b, 0) / n);
    const order = totals.map((_, i) => i).sort((a, b) => totals[b] - totals[a]);
    resRef.current = { M, totals, order };
    setTick(v => v + 1); draw();
  }

  function draw() {
    const cv = canvasRef.current; if (!cv || !resRef.current) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const { M, totals, order } = resRef.current, n = STRATS.length;
    // ranked scoreboard (left)
    ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.font = "10px JetBrains Mono, monospace"; ctx.textAlign = "left";
    ctx.fillText("AVERAGE SCORE PER ROUND (ranked)", 20, 22);
    const maxT = Math.max(...totals, 3), bx = 96, bw = 150, rowH = 30, top = 40;
    order.forEach((idx, rank) => {
      const y = top + rank * rowH, s = STRATS[idx];
      ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.font = "11px JetBrains Mono"; ctx.textAlign = "right";
      ctx.fillText(s.name, bx - 8, y + 13);
      ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fillRect(bx, y, bw, 16);
      ctx.fillStyle = s.col; ctx.fillRect(bx, y, bw * (totals[idx] / maxT), 16);
      ctx.fillStyle = "#fff"; ctx.font = "10px JetBrains Mono"; ctx.textAlign = "left";
      ctx.fillText(totals[idx].toFixed(2), bx + bw + 6, y + 13);
    });
    // matchup matrix (right)
    const gx = 320, gy = 60, cell = 24;
    ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.textAlign = "left"; ctx.font = "10px JetBrains Mono";
    ctx.fillText("SCORE vs OPPONENT", gx, 22);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const v = M[i][j], t = Math.max(0, Math.min(1, (v - 0) / 5));
      ctx.fillStyle = `rgb(${Math.round(20 + (1 - t) * 60)},${Math.round(40 + t * 150)},${Math.round(70 + t * 60)})`;
      ctx.fillRect(gx + j * cell, gy + i * cell, cell - 1, cell - 1);
    }
    // labels (row strategy initials)
    ctx.font = "8px JetBrains Mono"; ctx.textAlign = "right";
    for (let i = 0; i < n; i++) { ctx.fillStyle = STRATS[i].col; ctx.fillText(STRATS[i].name.slice(0, 4), gx - 3, gy + i * cell + 15); }
    ctx.save(); ctx.textAlign = "left";
    for (let j = 0; j < n; j++) { ctx.fillStyle = STRATS[j].col; ctx.translate(gx + j * cell + 16, gy - 4); ctx.rotate(-Math.PI / 4); ctx.fillText(STRATS[j].name.slice(0, 4), 0, 0); ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0); }
    ctx.restore();
    ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "9px JetBrains Mono"; ctx.textAlign = "left";
    ctx.fillText("row = my strategy, col = opponent; greener = I score more", gx, gy + n * cell + 16);
    ctx.fillText("nice + reciprocal strategies rise to the top", 20, top + n * rowH + 18);
  }

  function handleRerun() { setSeed(s => s + 1); }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    run();
  }, []);
  _useEffect(() => { run(); }, [seed, rounds, noise]);

  const res = resRef.current;
  const winner = res ? STRATS[res.order[0]].name : "-";
  const stage = (<canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />);

  const controls = (
    <ControlGroup>
      <Slider label="// ROUNDS PER MATCH" min={1} max={200} step={1} value={rounds} onChange={setRounds}
        help="Length of each iterated game. With 1 round it's one-shot PD and defection (AllD) wins; as rounds grow, reciprocity pays and TitForTat-style strategies overtake it. The 'shadow of the future' is what makes cooperation rational." />
      <Slider label="// EXECUTION NOISE" min={0} max={0.2} step={0.01} value={noise} onChange={setNoise}
        help="Probability each intended move is flipped by mistake. Noise punishes unforgiving strategies: Grim never recovers from an accidental defection, while forgiving strategies (TF2T) regain cooperation." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={handleRerun} primary>RE-RUN</DemoButton>
        <DemoButton onClick={() => { setRounds(1); }}>ONE-SHOT</DemoButton>
        <DemoButton onClick={() => { setRounds(60); setNoise(0); }}>RESET</DemoButton>
      </div>
      <StatReadout label="TOURNAMENT WINNER" value={winner} accent="#34d399" />
      <Legend items={STRATS.map(s => ({ color: s.col, label: s.name }))} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        In a single prisoner's dilemma, defecting is the dominant move — yet when the same players
        meet <i>repeatedly</i>, cooperation can win. This is Robert Axelrod's famous tournament: every
        strategy plays a long iterated game against every other, and total score decides the champion.
        The payoffs reward mutual defection least and mutual cooperation handsomely, but tempt each
        side to defect on a cooperator.
      </DemoP>
      <DemoP>
        The repeated result is one of the most cited findings in social science: <b>TitForTat</b>
        — cooperate first, then mirror your opponent — tends to win. It is <b>nice</b> (never defects
        first), <b>retaliatory</b> (punishes defection), and <b>forgiving</b> (returns to cooperation).
        Drop ROUNDS to <b>1</b> and the order inverts — AllD wins the one-shot game. Add <b>noise</b>
        and unforgiving <b>Grim</b> collapses (one accidental defection and it defects forever), while
        forgiving strategies recover. The matrix on the right shows who exploits whom.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        The iterated prisoner's dilemma is the canonical model for the <b>evolution of cooperation</b>
        — in biology (reciprocal altruism), economics (repeated trade and contracts), and the design of
        multi-agent and LLM-agent systems where self-interested agents must coordinate. It's the
        repeated-game complement to the one-shot Nash analysis you see in
        <a href={`${window.__DM_BASE || "../../"}visualize/regret-matching/`}> regret matching</a>, and the
        strategy ecology connects directly to <a href={`${window.__DM_BASE || "../../"}visualize/replicator-dynamics/`}>replicator
        dynamics</a>: run an evolutionary version and reciprocal cooperators take over the population.
      </DemoP>
      <DemoP>
        The deeper lessons generalize: cooperation needs a long enough <b>shadow of the future</b> (the
        ROUNDS knob), and robustness to <b>noise</b> favors <i>forgiveness</i> over pure retaliation — a
        direct design principle for any system of interacting agents, including AI ones negotiating,
        trading, or moderating each other. It's also a clean reminder that "rational in one shot" and
        "rational over time" can point in opposite directions.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      topic="GAME THEORY"
      title="Iterated Prisoner's Dilemma Tournament"
      subtitle="Run Axelrod's round-robin and watch nice, reciprocal strategies beat pure defection."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/reinforcement-learning/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="violet"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<PdTournamentDemo />);
