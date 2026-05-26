// games/neuroevolution.jsx — neural-network birds that evolve to fly (real genetic
// algorithm + per-bird 4-6-1 MLP) AND a playable game. Watch the AI learn, take the
// controls yourself, or race the champion the AI trained head-to-head.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  SegmentedControl, Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const Wc = 520, Hc = 380;
const R = 8, PW = 58, GAP = 140, GAPH = GAP / 2;
const GRAV = 0.42, FLAP = -7.0, SPACING = 210, SPEED = 2.0;
const I = 4, NH = 6, POP = 60;

const rand = Math.random;
const randn = () => { let u = 0, v = 0; while (!u) u = rand(); while (!v) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
function newBrain() { return { w1: Array.from({ length: NH * I }, randn), b1: Array.from({ length: NH }, randn), w2: Array.from({ length: NH }, randn), b2: randn() }; }
function think(b, x) { let o = b.b2; for (let j = 0; j < NH; j++) { let s = b.b1[j]; for (let i = 0; i < I; i++) s += b.w1[j * I + i] * x[i]; o += b.w2[j] * Math.tanh(s); } return 1 / (1 + Math.exp(-o)); }
function crossover(a, b) { const c = { w1: [], b1: [], w2: [], b2: rand() < 0.5 ? a.b2 : b.b2 }; for (const k of ["w1", "b1", "w2"]) for (let i = 0; i < a[k].length; i++) c[k][i] = rand() < 0.5 ? a[k][i] : b[k][i]; return c; }
function mutate(b, rate) { for (const k of ["w1", "b1", "w2"]) for (let i = 0; i < b[k].length; i++) if (rand() < rate) b[k][i] += randn() * 0.5; if (rand() < rate) b.b2 += randn() * 0.5; return b; }
const cloneBrain = (b) => ({ w1: b.w1.slice(), b1: b.b1.slice(), w2: b.w2.slice(), b2: b.b2 });

function NeuroEvolutionGame() {
  const canvasRef = _useRef(null), dprRef = _useRef(1);
  const worldRef = _useRef({ pipes: [], birds: [] });
  const championRef = _useRef(null), champGenRef = _useRef(0);
  const genRef = _useRef(1), histRef = _useRef([]), bestEverRef = _useRef(0), bestHumanRef = _useRef(0);
  const rafRef = _useRef(0), runningRef = _useRef(false), roundOverRef = _useRef(false), roundResRef = _useRef(null);
  const modeRef = _useRef("ai"), stepsRef = _useRef(2), rateRef = _useRef(0.1), frameRef = _useRef(0);
  const [mode, setMode] = _useState("ai");
  const [speed, setSpeed] = _useState(2);
  const [rate, setRate] = _useState(0.1);
  const [running, setRunning] = _useState(false);
  const [stats, setStats] = _useState({ gen: 1, alive: POP, score: 0, best: 0, you: 0, ai: 0 });

  const makePipe = (x) => ({ x, gapY: GAPH + 30 + rand() * (Hc - GAP - 60), scoredBy: new Set() });
  const makeBird = (x, brain, human) => ({ x, y: Hc / 2, vy: 0, alive: true, fit: 0, score: 0, brain, human });
  const freshPipes = () => [makePipe(Wc + 60), makePipe(Wc + 60 + SPACING)];
  const cloneChampion = () => championRef.current ? cloneBrain(championRef.current) : newBrain();

  function startAI() {
    worldRef.current = { pipes: freshPipes(), birds: Array.from({ length: POP }, () => makeBird(130, newBrain(), false)) };
    genRef.current = 1; histRef.current = []; bestEverRef.current = 0; roundOverRef.current = false;
  }
  function startRound() {
    const m = modeRef.current;
    const birds = m === "versus"
      ? [makeBird(108, null, true), makeBird(162, cloneChampion(), false)]
      : [makeBird(130, null, true)];
    worldRef.current = { pipes: freshPipes(), birds };
    roundOverRef.current = false; roundResRef.current = null;
  }

  function nextGen() {
    const w = worldRef.current;
    const birds = w.birds.slice().sort((a, b) => b.fit - a.fit);
    bestEverRef.current = Math.max(bestEverRef.current, birds[0].fit);
    championRef.current = cloneBrain(birds[0].brain); champGenRef.current = genRef.current;
    histRef.current.push(birds[0].fit); if (histRef.current.length > 40) histRef.current.shift();
    const total = birds.reduce((s, b) => s + b.fit, 0) || 1;
    const pick = () => { let r = rand() * total; for (const b of birds) { r -= b.fit; if (r <= 0) return b; } return birds[0]; };
    const next = [cloneBrain(birds[0].brain)]; if (birds[1]) next.push(cloneBrain(birds[1].brain));
    while (next.length < POP) next.push(mutate(crossover(pick().brain, pick().brain), rateRef.current));
    w.pipes = freshPipes(); w.birds = next.map(br => makeBird(130, br, false)); genRef.current += 1;
  }

  function step() {
    const w = worldRef.current, m = modeRef.current;
    for (const p of w.pipes) p.x -= SPEED;
    if (w.pipes[w.pipes.length - 1].x < Wc - SPACING) w.pipes.push(makePipe(Wc + 60));
    w.pipes = w.pipes.filter(p => p.x + PW > -10);
    let aliveAI = 0, aliveHuman = 0;
    for (const bird of w.birds) {
      if (!bird.alive) continue;
      const next = w.pipes.find(p => p.x + PW > bird.x) || w.pipes[0];
      if (bird.brain) { const x = [bird.y / Hc, bird.vy / 10, (next.x - bird.x) / Wc, next.gapY / Hc]; if (think(bird.brain, x) > 0.5) bird.vy = FLAP; }
      bird.vy += GRAV; bird.y += bird.vy; bird.fit += 1;
      let dead = false;
      if (bird.y < R || bird.y > Hc - R) dead = true;
      else if (bird.x + R > next.x && bird.x - R < next.x + PW && (bird.y - R < next.gapY - GAPH || bird.y + R > next.gapY + GAPH)) dead = true;
      if (dead) { bird.alive = false; continue; }
      for (const p of w.pipes) { if (p.x + PW < bird.x && !p.scoredBy.has(bird)) { p.scoredBy.add(bird); bird.score += 1; bird.fit += 25; } }
      if (bird.human) aliveHuman++; else aliveAI++;
    }
    if (m === "ai") { if (aliveAI === 0) nextGen(); }
    else { if (aliveHuman + aliveAI === 0) endRound(); }
  }

  function endRound() {
    roundOverRef.current = true;
    const w = worldRef.current;
    const you = w.birds.find(b => b.human), ai = w.birds.find(b => !b.human);
    if (you) bestHumanRef.current = Math.max(bestHumanRef.current, you.score);
    let winner = "—";
    if (modeRef.current === "versus") winner = (you.score > ai.score) ? "You win!" : (ai.score > you.score) ? "AI wins" : "Tie";
    roundResRef.current = { you: you ? you.score : 0, ai: ai ? ai.score : 0, winner };
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, Wc, Hc);
    const w = worldRef.current, m = modeRef.current;
    for (const p of w.pipes) {
      ctx.fillStyle = "rgba(96,165,250,0.16)"; ctx.strokeStyle = "rgba(96,165,250,0.5)"; ctx.lineWidth = 1.5;
      ctx.fillRect(p.x, 0, PW, p.gapY - GAPH); ctx.strokeRect(p.x, 0, PW, p.gapY - GAPH);
      ctx.fillRect(p.x, p.gapY + GAPH, PW, Hc - (p.gapY + GAPH)); ctx.strokeRect(p.x, p.gapY + GAPH, PW, Hc - (p.gapY + GAPH));
    }
    // ceiling + floor (touching either = death)
    ctx.fillStyle = "rgba(13,24,52,0.92)";
    ctx.fillRect(0, 0, Wc, R); ctx.fillRect(0, Hc - R, Wc, R);
    ctx.fillStyle = "rgba(248,113,113,0.55)";
    ctx.fillRect(0, R - 2, Wc, 2); ctx.fillRect(0, Hc - R, Wc, 2);
    for (const bird of w.birds) {
      if (!bird.alive) continue;
      ctx.fillStyle = bird.human ? "#fbbf24" : (m === "ai" ? "rgba(192,132,252,0.5)" : "#c084fc");
      ctx.beginPath(); ctx.arc(bird.x, bird.y, R, 0, Math.PI * 2); ctx.fill();
    }
    if (m === "ai") {
      const lead = w.birds.filter(b => b.alive).sort((a, b) => b.fit - a.fit)[0];
      if (lead) { ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(lead.x, lead.y, R - 3, 0, Math.PI * 2); ctx.fill(); }
      if (histRef.current.length > 1) {
        const mx = Math.max(...histRef.current) || 1;
        ctx.strokeStyle = "rgba(52,211,153,0.8)"; ctx.lineWidth = 1.5; ctx.beginPath();
        histRef.current.forEach((v, i) => { const X = Wc - 110 + i * (100 / 40), Y = 40 - v / mx * 28; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
        ctx.stroke(); ctx.fillStyle = "#475569"; ctx.font = "8px JetBrains Mono, monospace"; ctx.fillText("BEST FITNESS / GEN", Wc - 110, 50);
      }
    } else {
      ctx.fillStyle = "rgba(224,231,255,0.6)"; ctx.font = "10px JetBrains Mono, monospace"; ctx.textAlign = "center";
      ctx.fillText("SPACE / tap to flap", Wc / 2, 16);
      if (roundOverRef.current && roundResRef.current) {
        ctx.fillStyle = "rgba(5,8,22,0.75)"; ctx.fillRect(0, 0, Wc, Hc);
        ctx.fillStyle = "#e0e7ff"; ctx.font = "700 26px Space Grotesk, sans-serif"; ctx.textAlign = "center";
        ctx.fillText(roundResRef.current.winner, Wc / 2, Hc / 2 - 18);
        ctx.font = "13px JetBrains Mono, monospace"; ctx.fillStyle = "var(--muted)";
        const rr = roundResRef.current;
        ctx.fillStyle = "#94a3b8";
        ctx.fillText(m === "versus" ? `you ${rr.you}  ·  ai ${rr.ai}` : `score ${rr.you}`, Wc / 2, Hc / 2 + 10);
        ctx.fillText("SPACE / tap to play again", Wc / 2, Hc / 2 + 38);
      }
      ctx.textAlign = "left";
    }
  }

  function pushStats() {
    const w = worldRef.current, m = modeRef.current;
    if (m === "ai") {
      const alive = w.birds.filter(b => b.alive).length;
      const bestScore = w.birds.reduce((s, b) => Math.max(s, b.score), 0);
      setStats(s => ({ ...s, gen: genRef.current, alive, score: bestScore, best: Math.round(bestEverRef.current) }));
    } else {
      const you = w.birds.find(b => b.human), ai = w.birds.find(b => !b.human);
      setStats(s => ({ ...s, you: you ? you.score : 0, ai: ai ? ai.score : 0, best: bestHumanRef.current }));
    }
  }

  function loop() {
    if (!runningRef.current) return;
    const steps = modeRef.current === "ai" ? stepsRef.current : 1;
    if (!roundOverRef.current) for (let i = 0; i < steps; i++) step();
    draw();
    if (++frameRef.current % 5 === 0) pushStats();
    rafRef.current = requestAnimationFrame(loop);
  }
  function startLoop() { if (runningRef.current) return; runningRef.current = true; setRunning(true); loop(); }
  function stopLoop() { runningRef.current = false; setRunning(false); cancelAnimationFrame(rafRef.current); }

  function flap() {
    if (roundOverRef.current && modeRef.current !== "ai") { startRound(); pushStats(); return; }
    for (const b of worldRef.current.birds) if (b.human && b.alive) b.vy = FLAP;
  }

  function switchMode(m) {
    stopLoop(); modeRef.current = m; setMode(m);
    if (m === "ai") startAI(); else startRound();
    draw(); pushStats(); startLoop();
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = Wc * dpr; cv.height = Hc * dpr;
    cv.style.width = Wc + "px"; cv.style.height = Hc + "px";
    startAI(); draw(); startLoop();
    const onKey = (e) => { if (e.code === "Space" || e.code === "ArrowUp") { if (modeRef.current !== "ai") { e.preventDefault(); flap(); } } };
    const onPtr = () => { if (modeRef.current !== "ai") flap(); };
    window.addEventListener("keydown", onKey);
    cv.addEventListener("pointerdown", onPtr);
    return () => { stopLoop(); window.removeEventListener("keydown", onKey); cv.removeEventListener("pointerdown", onPtr); };
  }, []);

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4, cursor: mode === "ai" ? "default" : "pointer" }} />;
  const isAI = mode === "ai";
  const controls = (
    <ControlGroup>
      <SegmentedControl label="// MODE" value={mode} onChange={switchMode}
        options={[{ value: "ai", label: "Watch AI" }, { value: "versus", label: "You vs AI" }, { value: "human", label: "You Only" }]}
        help="Watch the AI evolve, race the trained champion head-to-head (You vs AI), or just play it yourself (You Only)." />
      {isAI ? (
        <>
          <SegmentedControl label="// SPEED" value={String(speed)} onChange={v => { const n = parseInt(v); setSpeed(n); stepsRef.current = n; }}
            options={[{ value: "1", label: "1x" }, { value: "2", label: "2x" }, { value: "4", label: "4x" }]}
            help="Simulation speed multiplier. Higher fast-forwards the generations so evolution converges sooner — it doesn't change what's learned." />
          <Slider label="// MUTATION RATE" min={0.01} max={0.4} step={0.01} value={rate} onChange={v => { setRate(v); rateRef.current = v; }} tone="violet"
            help="Chance each weight is randomly perturbed when breeding the next generation. Too low stalls progress; too high is noisy and forgets good solutions." />
          <div style={{ display: "flex", gap: 8 }}>
            <DemoButton onClick={() => (running ? stopLoop() : startLoop())} primary tone="violet">{running ? "PAUSE" : "RUN"}</DemoButton>
            <DemoButton onClick={() => switchMode("ai")}>RESET</DemoButton>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <StatReadout label="GENERATION" value={stats.gen} accent="var(--violet-lt)" />
            <StatReadout label="ALIVE" value={stats.alive} />
            <StatReadout label="BEST SCORE" value={stats.score} accent="#fbbf24" />
            <StatReadout label="BEST FITNESS" value={stats.best} accent="#34d399" />
          </div>
          <Legend items={[{ color: "#c084fc", label: "BIRDS (NN)" }, { color: "#fbbf24", label: "LEADER" }, { color: "#34d399", label: "FITNESS" }]} />
        </>
      ) : (
        <>
          <DemoButton onClick={() => { startRound(); pushStats(); }} primary>RESTART ROUND</DemoButton>
          <div style={{ display: "grid", gridTemplateColumns: mode === "versus" ? "1fr 1fr" : "1fr 1fr", gap: 8 }}>
            <StatReadout label="YOUR SCORE" value={stats.you} accent="#fbbf24" />
            {mode === "versus"
              ? <StatReadout label="AI SCORE" value={stats.ai} accent="#c084fc" />
              : <StatReadout label="YOUR BEST" value={stats.best} accent="#34d399" />}
          </div>
          {mode === "versus" && (
            <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>
              AI bird uses the champion brain {champGenRef.current ? `from generation ${champGenRef.current}` : "(untrained — go watch it learn first!)"}. Train longer in "Watch AI" and it gets harder to beat.
            </div>
          )}
          <Legend items={[{ color: "#fbbf24", label: "YOU" }, ...(mode === "versus" ? [{ color: "#c084fc", label: "AI CHAMPION" }] : [])]} />
          <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>Press SPACE / ↑ or tap the canvas to flap.</div>
        </>
      )}
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        In <b>Watch AI</b>, nobody programmed these birds to fly and there's no
        backpropagation — each is steered by its own tiny neural network (height,
        velocity, and the next gap go in; flap-or-not comes out). The first generation
        is random and dies instantly, but a <b>genetic algorithm</b> keeps the
        longest-surviving birds and breeds the next generation by <b>crossover</b> and
        <b> mutation</b>. Watch the <span style={{ color: "#34d399" }}>best-fitness
        sparkline</span> climb as the population cracks the game.
      </DemoP>
      <DemoP>
        Then switch to <b>You vs AI</b> and take the controls (<b>SPACE</b> / tap):
        you fly head-to-head against the <span style={{ color: "#c084fc" }}>champion</span>
        the evolution just produced, on the same pipes. Early on it's easy to out-fly a
        few-generations-old brain — but train it longer and the bird that started as
        random noise will calmly out-survive you. That's the whole arc of learning from
        nothing, made playable.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        This is gradient-free learning. There's no backprop and no labels — a population of
        neural-net controllers is improved purely by <b>evolution</b>: keep the fittest,
        recombine and mutate, repeat. That puts it in the evolutionary-strategies / genetic-
        algorithm family, still competitive for reinforcement-learning control, neural
        architecture search, and any objective that's non-differentiable or has sparse,
        delayed reward.
      </DemoP>
      <DemoP>
        It chases the same "improve a policy from reward alone" goal as the RL demos, but by
        a different route — selection pressure instead of policy gradients. The knobs you can
        feel here (population size, mutation rate, which survivors to breed) are the core
        dials of evolutionary computation, and the approach scales: OpenAI showed evolution
        strategies can train sizable networks on hard control tasks competitively with
        gradient methods.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="NEUROEVOLUTION · GAME" title="Neuroevolution: Flappy"
      subtitle="Watch neural-network birds evolve to fly — then take the controls and race the champion the AI trained."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      backHref={`${window.__DM_BASE || "../../"}play/`} backLabel="PLAY" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<NeuroEvolutionGame />);
