// demos/regret-matching.jsx — no-regret learning converges to Nash. Two players
// in a normal-form game both update their mixed strategy by regret matching
// (strategy proportional to positive cumulative regret). The AVERAGE strategy
// provably converges to a Nash equilibrium; exploitability -> 0. Real exact
// regret-matching (the normal-form core of CFR, the algorithm behind superhuman
// poker). Several games incl. zero-sum (RPS, matching pennies, biased RPS) and
// general-sum (prisoner's dilemma).

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 380;

const GAMES = {
  rps: { label: "Rock-Paper-Scissors", acts: ["R", "P", "S"], A: [[0, -1, 1], [1, 0, -1], [-1, 1, 0]], zsum: true, note: "Nash = uniform (1/3 each)" },
  pennies: { label: "Matching Pennies", acts: ["H", "T"], A: [[1, -1], [-1, 1]], zsum: true, note: "Nash = 50/50" },
  biased: { label: "Biased RPS", acts: ["R", "P", "S"], A: [[0, -1, 2], [1, 0, -1], [-2, 1, 0]], zsum: true, note: "Nash is non-uniform" },
  pd: { label: "Prisoner's Dilemma", acts: ["Coop", "Defect"], A: [[3, 0], [5, 1]], B: [[3, 5], [0, 1]], zsum: false, note: "Nash = (Defect, Defect)" },
};
const max0 = x => x > 0 ? x : 0;

function RegretMatchingDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const R1Ref = _useRef([]), R2Ref = _useRef([]);
  const avg1Ref = _useRef([]), avg2Ref = _useRef([]);
  const histRef = _useRef([]);
  const itRef = _useRef(0);
  const rafRef = _useRef(null);

  const [game, setGame] = _useState("rps");
  const [speed, setSpeed] = _useState(8);
  const [running, setRunning] = _useState(false);
  const [, setTick] = _useState(0);

  const gRef = _useRef(game), spRef = _useRef(speed);
  _useEffect(() => { spRef.current = speed; }, [speed]);

  function Amat() { return GAMES[gRef.current].A; }
  function Bmat() { const g = GAMES[gRef.current]; return g.zsum ? g.A.map(r => r.map(v => -v)) : g.B; } // B indexed [a1][a2] = P2 payoff
  function n1() { return GAMES[gRef.current].A.length; }
  function n2() { return GAMES[gRef.current].A[0].length; }

  function reset() {
    R1Ref.current = new Array(n1()).fill(0); R2Ref.current = new Array(n2()).fill(0);
    avg1Ref.current = new Array(n1()).fill(0); avg2Ref.current = new Array(n2()).fill(0);
    histRef.current = []; itRef.current = 0; setTick(v => v + 1); draw();
  }

  function strat(R) { const pos = R.map(max0), s = pos.reduce((a, b) => a + b, 0); return s > 1e-12 ? pos.map(v => v / s) : R.map(() => 1 / R.length); }
  function norm(v) { const s = v.reduce((a, b) => a + b, 0); return s > 0 ? v.map(x => x / s) : v.map(() => 1 / v.length); }

  function step() {
    const A = Amat(), B = Bmat(), R1 = R1Ref.current, R2 = R2Ref.current, a1 = avg1Ref.current, a2 = avg2Ref.current;
    const s1 = strat(R1), s2 = strat(R2);
    for (let i = 0; i < s1.length; i++) a1[i] += s1[i];
    for (let j = 0; j < s2.length; j++) a2[j] += s2[j];
    // P1 action values vs s2
    const v1 = s1.map((_, i) => s2.reduce((acc, sj, j) => acc + A[i][j] * sj, 0));
    const u1 = s1.reduce((acc, si, i) => acc + si * v1[i], 0);
    for (let i = 0; i < R1.length; i++) R1[i] += v1[i] - u1;
    // P2 action values vs s1  (B[a1][a2])
    const v2 = s2.map((_, j) => s1.reduce((acc, si, i) => acc + B[i][j] * si, 0));
    const u2 = s2.reduce((acc, sj, j) => acc + sj * v2[j], 0);
    for (let j = 0; j < R2.length; j++) R2[j] += v2[j] - u2;
    itRef.current++;
    // exploitability vs average strategies
    const A1 = norm(a1), A2 = norm(a2);
    const br1 = Math.max(...A1.map((_, i) => A2.reduce((acc, aj, j) => acc + A[i][j] * aj, 0)));
    const val1 = A1.reduce((acc, ai, i) => acc + ai * A2.reduce((s, aj, j) => s + A[i][j] * aj, 0), 0);
    const br2 = Math.max(...A2.map((_, j) => A1.reduce((acc, ai, i) => acc + B[i][j] * ai, 0)));
    const val2 = A2.reduce((acc, aj, j) => acc + aj * A1.reduce((s, ai, i) => s + B[i][j] * ai, 0), 0);
    histRef.current.push(Math.max(0, (br1 - val1) + (br2 - val2)));
    if (histRef.current.length > 400) histRef.current.shift();
  }

  function bars(ctx, x, y, w, labels, cur, avg, title) {
    ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.font = "10px JetBrains Mono, monospace"; ctx.textAlign = "left";
    ctx.fillText(title, x, y - 8);
    const n = labels.length, bw = w / n, maxH = 92, base = y + maxH;
    for (let i = 0; i < n; i++) {
      const bx = x + i * bw;
      // average (violet, behind)
      ctx.fillStyle = "rgba(168,85,247,0.85)"; ctx.fillRect(bx + bw * 0.12, base - avg[i] * maxH, bw * 0.38, avg[i] * maxH);
      // current (blue)
      ctx.fillStyle = "rgba(96,165,250,0.85)"; ctx.fillRect(bx + bw * 0.5, base - cur[i] * maxH, bw * 0.38, cur[i] * maxH);
      ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.font = "10px JetBrains Mono"; ctx.textAlign = "center";
      ctx.fillText(labels[i], bx + bw / 2, base + 14);
      ctx.fillStyle = "rgba(168,85,247,0.9)"; ctx.font = "9px JetBrains Mono"; ctx.fillText((avg[i] * 100).toFixed(0), bx + bw * 0.31, base - avg[i] * maxH - 4);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.14)"; ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x + w, base); ctx.stroke();
    ctx.textAlign = "left";
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const g = GAMES[gRef.current];
    const s1 = strat(R1Ref.current), s2 = strat(R2Ref.current), A1 = norm(avg1Ref.current), A2 = norm(avg2Ref.current);
    bars(ctx, 30, 50, 220, g.acts, s1, A1, "PLAYER 1 strategy");
    bars(ctx, 290, 50, 220, g.acts, s2, A2, "PLAYER 2 strategy");
    // convergence curve (exploitability)
    const ox = 30, oy = 220, ow = 480, oh = 110, hist = histRef.current;
    ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.font = "10px JetBrains Mono"; ctx.textAlign = "left";
    ctx.fillText("EXPLOITABILITY of the average strategy (-> 0 at Nash)", ox, oy - 6);
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.strokeRect(ox, oy, ow, oh);
    if (hist.length > 1) {
      const hi = Math.max(...hist, 1e-6);
      ctx.strokeStyle = "#34d399"; ctx.lineWidth = 1.8; ctx.beginPath();
      hist.forEach((v, i) => { const px = ox + (i / (hist.length - 1)) * ow, py = oy + oh - (v / hi) * (oh - 8) - 4; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
      ctx.stroke();
      ctx.fillStyle = "rgba(52,211,153,0.85)"; ctx.font = "10px JetBrains Mono"; ctx.textAlign = "right";
      ctx.fillText(hist[hist.length - 1].toFixed(4), ox + ow - 6, oy + 14);
    }
    ctx.textAlign = "left"; ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "9px JetBrains Mono";
    ctx.fillText(g.note, ox, oy + oh + 18);
  }

  function handleRun() { if (running) { setRunning(false); return; } setRunning(true); }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    reset();
  }, []);
  _useEffect(() => { gRef.current = game; setRunning(false); reset(); }, [game]);

  _useEffect(() => {
    if (!running) return;
    let alive = true;
    const loop = () => { if (!alive) return; for (let i = 0; i < spRef.current; i++) step(); setTick(v => v + 1); draw(); rafRef.current = requestAnimationFrame(loop); };
    rafRef.current = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, [running]);

  const A1 = norm(avg1Ref.current);
  const g = GAMES[game];
  const stage = (<canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />);

  const controls = (
    <ControlGroup>
      <SegmentedControl label="// GAME" value={game} onChange={setGame}
        options={Object.entries(GAMES).map(([k, v]) => ({ value: k, label: v.label }))}
        help="The normal-form game both players learn in. Rock-Paper-Scissors, Matching Pennies and Biased RPS are zero-sum (a mixed Nash); Prisoner's Dilemma is general-sum with a pure Nash (both defect)." />
      <Slider label="// SPEED" min={1} max={60} value={speed} onChange={setSpeed} suffix=" iters/frame"
        help="Self-play iterations per animation frame. Visual pacing only." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={handleRun} primary>{running ? "PAUSE" : "RUN"}</DemoButton>
        <DemoButton onClick={() => { for (let i = 0; i < 20; i++) step(); setTick(v => v + 1); draw(); }} disabled={running}>+20</DemoButton>
        <DemoButton onClick={reset}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="ITERATIONS" value={itRef.current} />
        <StatReadout label="EXPLOITABILITY" value={histRef.current.length ? histRef.current[histRef.current.length - 1].toFixed(4) : "-"} accent="#34d399" />
      </div>
      <StatReadout label="P1 AVERAGE STRATEGY" value={g.acts.map((a, i) => `${a} ${(A1[i] * 100).toFixed(0)}%`).join("  ")} accent="var(--violet-lt)" />
      <Legend items={[
        { color: "#a855f7", label: "AVERAGE strategy (-> Nash)" },
        { color: "#60a5fa", label: "current strategy" },
        { color: "#34d399", label: "exploitability" },
      ]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Two players repeatedly play the same game, and after each round each one tallies its
        <b> regret</b> — for every action, how much better it <i>would</i> have done had it always
        played that action instead. <b>Regret matching</b> then sets the next strategy proportional
        to the <i>positive</i> regrets: play the things you wish you'd played more. No knowledge of
        the opponent, no equilibrium solver — just local, online learning.
      </DemoP>
      <DemoP>
        The remarkable result: while the moment-to-moment strategies (blue) keep cycling, the
        <b> average</b> strategy (violet) provably converges to a <b>Nash equilibrium</b>, and the
        <span style={{ color: "#34d399" }}> exploitability</span> of that average drives to zero. In
        Rock-Paper-Scissors it settles to uniform 1/3; in Biased RPS to the skewed Nash; in the
        Prisoner's Dilemma it collapses to the pure equilibrium (both defect). No-regret dynamics find
        the equilibrium that solving the game directly would give you.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        This is the beating heart of <b>Counterfactual Regret Minimization (CFR)</b> — run regret
        matching at every decision point of a large game and the average strategy converges to Nash.
        CFR is how Libratus and Pluribus beat top humans at no-limit poker, and the
        <a href={`${window.__DM_BASE || "../../"}play/poker/`}> poker</a> agent on this site is trained
        the same way. No-regret learning also underlies online learning, boosting, and the training
        dynamics of <a href={`${window.__DM_BASE || "../../"}visualize/gan/`}>GANs</a> (a two-player
        minimax game).
      </DemoP>
      <DemoP>
        The subtlety worth keeping: it's the <i>time-average</i> that converges, not the current
        strategy — the iterates can orbit the equilibrium forever (you can see the blue bars cycling).
        That distinction matters in multi-agent RL and GAN training, where people mistake a non-settling
        policy for a failure when the averaged behavior is actually at equilibrium. Regret minimization
        is also the bridge from single-agent <a href={`${window.__DM_BASE || "../../"}visualize/bandit/`}>bandits</a>
        (minimize regret against a fixed world) to games (minimize regret against an adapting opponent).
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      title="Regret Matching to Nash"
      subtitle="Two no-regret learners play a game and their average strategy converges to a Nash equilibrium."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/reinforcement-learning/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="violet"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<RegretMatchingDemo />);
