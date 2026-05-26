// demos/bandit.jsx — multi-armed bandit: ε-greedy vs UCB vs Thompson sampling.
// Real Bernoulli rewards; tracks estimates, cumulative regret, % optimal.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 380;

function makeArms(k) {
  return Array.from({ length: k }, () => ({ p: Math.random() * 0.7 + 0.1, n: 0, q: 0, a: 1, b: 1 }));
}

function BanditDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const armsRef = _useRef(makeArms(6));
  const tRef = _useRef(0);
  const regretRef = _useRef(0);
  const optRef = _useRef(0);
  const histRef = _useRef([]); // regret history
  const lastPullRef = _useRef(-1);
  const rafRef = _useRef(null);
  const lastTimeRef = _useRef(0);

  const [k, setK] = _useState(6);
  const [strategy, setStrategy] = _useState("egreedy");
  const [eps, setEps] = _useState(0.1);
  const [speed, setSpeed] = _useState(10);
  const [running, setRunning] = _useState(false);
  const [, setTick] = _useState(0);

  const stratRef = _useRef(strategy), epsRef = _useRef(eps), spRef = _useRef(speed);
  _useEffect(() => { stratRef.current = strategy; }, [strategy]);
  _useEffect(() => { epsRef.current = eps; }, [eps]);
  _useEffect(() => { spRef.current = speed; }, [speed]);

  const bestArm = () => { const arms = armsRef.current; let bi = 0; for (let i = 1; i < arms.length; i++) if (arms[i].p > arms[bi].p) bi = i; return bi; };
  function gaussBeta(a, b) { // crude Beta sample via two gammas approx — use simple method
    // sample via ratio of gammas using Marsaglia for shape; fallback: use mean+noise. Use simple: sum of uniforms approx not great.
    // Use Cheng's or simple: sample x~Gamma(a),y~Gamma(b); Beta=x/(x+y)
    const gx = gamma(a), gy = gamma(b); return gx / (gx + gy);
  }
  function gamma(shape) { // Marsaglia & Tsang for shape>=1; handle <1 by boost
    if (shape < 1) { return gamma(shape + 1) * Math.pow(Math.random(), 1 / shape); }
    const d = shape - 1 / 3, c = 1 / Math.sqrt(9 * d);
    while (true) {
      let x, v;
      do { x = gaussStd(); v = 1 + c * x; } while (v <= 0);
      v = v * v * v; const u = Math.random();
      if (u < 1 - 0.0331 * x * x * x * x) return d * v;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  }
  function gaussStd() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  function choose() {
    const arms = armsRef.current, t = tRef.current + 1, s = stratRef.current;
    if (s === "egreedy") {
      if (Math.random() < epsRef.current) return Math.floor(Math.random() * arms.length);
      let bi = 0; for (let i = 1; i < arms.length; i++) if (arms[i].q > arms[bi].q) bi = i; return bi;
    } else if (s === "ucb") {
      let bi = 0, bv = -Infinity;
      for (let i = 0; i < arms.length; i++) {
        const v = arms[i].n === 0 ? Infinity : arms[i].q + Math.sqrt(2 * Math.log(t) / arms[i].n);
        if (v > bv) { bv = v; bi = i; }
      }
      return bi;
    } else { // thompson
      let bi = 0, bv = -Infinity;
      for (let i = 0; i < arms.length; i++) { const sample = gaussBeta(arms[i].a, arms[i].b); if (sample > bv) { bv = sample; bi = i; } }
      return bi;
    }
  }
  function pull() {
    const arms = armsRef.current;
    const i = choose();
    const reward = Math.random() < arms[i].p ? 1 : 0;
    const arm = arms[i];
    arm.n += 1; arm.q += (reward - arm.q) / arm.n;
    if (reward) arm.a += 1; else arm.b += 1;
    tRef.current += 1;
    regretRef.current += arms[bestArm()].p - arm.p;
    if (i === bestArm()) optRef.current += 1;
    lastPullRef.current = i;
    if (tRef.current % 3 === 0) histRef.current.push(regretRef.current);
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const arms = armsRef.current, n = arms.length;
    const barAreaH = 250, baseY = barAreaH, leftM = 20;
    const bw = (W - leftM * 2) / n * 0.6, gap = (W - leftM * 2) / n;
    for (let i = 0; i < n; i++) {
      const x = leftM + i * gap + gap / 2 - bw / 2;
      // true mean tick
      const ty = baseY - arms[i].p * (barAreaH - 30);
      // estimate bar
      const eh = arms[i].q * (barAreaH - 30);
      const col = i === bestArm() ? "#34d399" : (i === lastPullRef.current ? "#fbbf24" : "#60a5fa");
      ctx.fillStyle = i === lastPullRef.current ? "rgba(251,191,36,0.85)" : "rgba(96,165,250,0.55)";
      ctx.fillRect(x, baseY - eh, bw, eh);
      // true mean line
      ctx.strokeStyle = "#c084fc"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 3, ty); ctx.lineTo(x + bw + 3, ty); ctx.stroke();
      // count
      ctx.fillStyle = "#94a3b8"; ctx.font = "10px 'JetBrains Mono', monospace"; ctx.textAlign = "center";
      ctx.fillText("n=" + arms[i].n, x + bw / 2, baseY + 16);
      ctx.fillStyle = i === bestArm() ? "#34d399" : "#64748b";
      ctx.fillText("arm " + (i + 1), x + bw / 2, baseY + 30);
    }
    ctx.strokeStyle = "rgba(148,163,184,0.3)"; ctx.beginPath(); ctx.moveTo(leftM, baseY); ctx.lineTo(W - leftM, baseY); ctx.stroke();
    // regret sparkline
    const hist = histRef.current;
    if (hist.length > 1) {
      const y0 = 300, y1 = H - 14, mx = hist[hist.length - 1] || 1;
      ctx.strokeStyle = "#f87171"; ctx.lineWidth = 2; ctx.beginPath();
      hist.forEach((r, i) => { const px = leftM + (i / (hist.length - 1)) * (W - leftM * 2); const py = y1 - (r / mx) * (y1 - y0); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
      ctx.stroke();
      ctx.fillStyle = "#64748b"; ctx.font = "10px 'JetBrains Mono', monospace"; ctx.textAlign = "left";
      ctx.fillText("cumulative regret", leftM, y0 - 4);
    }
  }

  function reset(newProblem) {
    setRunning(false);
    if (newProblem) armsRef.current = makeArms(k); else armsRef.current.forEach(a => { a.n = 0; a.q = 0; a.a = 1; a.b = 1; });
    tRef.current = 0; regretRef.current = 0; optRef.current = 0; histRef.current = []; lastPullRef.current = -1;
    setTick(t => t + 1); draw();
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  }, []);
  _useEffect(() => { armsRef.current = makeArms(k); reset(false); }, [k]);

  _useEffect(() => {
    if (!running) return;
    let alive = true;
    const loop = (t) => {
      if (!alive) return;
      if (t - lastTimeRef.current > 1000 / (spRef.current * 6)) { lastTimeRef.current = t; for (let i = 0; i < Math.max(1, Math.round(spRef.current / 3)); i++) pull(); draw(); setTick(v => v + 1); }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, [running]);

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const pct = tRef.current ? Math.round(100 * optRef.current / tRef.current) : 0;

  const controls = (
    <ControlGroup>
      <SegmentedControl label="// STRATEGY" value={strategy} onChange={v => { setRunning(false); setStrategy(v); }}
        options={[{ value: "egreedy", label: "ε-Greedy" }, { value: "ucb", label: "UCB" }, { value: "thompson", label: "Thompson" }]}
        help="The explore/exploit rule. ε-Greedy exploits the best estimate but explores at random; UCB adds an optimism bonus for under-tried arms; Thompson samples from a Beta belief (usually strongest)." />
      {strategy === "egreedy" && <Slider label="// EXPLORATION ε" min={0} max={1} step={0.02} value={eps} onChange={setEps}
        help="Fraction of pulls spent on a random arm. 0 = pure greedy (can lock onto a wrong arm forever); higher explores more but wastes pulls once the best arm is clear." />}
      <Slider label="// ARMS" min={3} max={10} value={k} onChange={setK} tone="violet"
        help="How many slot machines to choose among. More arms means more to explore, so regret grows and the choice of strategy matters more." />
      <Slider label="// SPEED" min={1} max={40} value={speed} onChange={setSpeed} suffix=" /s"
        help="Pulls per second. Visual pacing only — it does not change the strategy or the outcome." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setRunning(r => !r)} primary>{running ? "PAUSE" : "RUN"}</DemoButton>
        <DemoButton onClick={() => { if (!running) { pull(); draw(); setTick(v => v + 1); } }} disabled={running}>PULL</DemoButton>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => reset(false)}>RESET</DemoButton>
        <DemoButton onClick={() => reset(true)} tone="violet">NEW PROBLEM</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="PULLS" value={tRef.current} />
        <StatReadout label="REGRET" value={regretRef.current.toFixed(1)} accent="#f87171" />
      </div>
      <StatReadout label="% OPTIMAL ACTION" value={pct + "%"} accent="#34d399" />
      <Legend items={[{ color: "rgba(96,165,250,0.6)", label: "ESTIMATE" }, { color: "#c084fc", label: "TRUE MEAN" }, { color: "#34d399", label: "BEST ARM" }, { color: "#fbbf24", label: "LAST PULL" }]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Each arm pays out 1 with some hidden probability (violet line). You only
        learn an arm's value by pulling it — so every pull is a tradeoff between
        <b> exploiting</b> the arm that looks best so far and <b>exploring</b> others
        that might be better. <b>ε-greedy</b> exploits the current best but picks
        random with probability ε. <b>UCB</b> adds an "optimism" bonus that shrinks
        as an arm is pulled more, so under-tried arms get a look. <b>Thompson
        sampling</b> keeps a Beta belief per arm and samples from it — elegant and
        usually the strongest.
      </DemoP>
      <DemoP>
        The metric that matters is <b>cumulative regret</b> (red): the reward lost by
        not always pulling the true best arm. Good strategies make that curve bend
        flat — they stop paying to explore once they're confident. Run each strategy
        on the same New Problem and compare the regret curves and % optimal.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        The multi-armed bandit is the cleanest statement of the explore/exploit dilemma,
        and it's deployed wherever decisions must be made online with feedback: A/B testing
        (bandits beat fixed splits by shifting traffic to winners sooner), ad and content
        selection, recommendation, clinical-trial design, and hyperparameter search.
        Thompson sampling and UCB in particular are production-grade methods, not toys.
      </DemoP>
      <DemoP>
        It's also the simplest reinforcement-learning problem — one state, immediate reward
        — so the machinery here scales up directly. ε-greedy is the standard exploration
        rule in Q-learning and DQN, UCB-style bonuses power the tree search in AlphaZero
        (PUCT), and "minimize cumulative <b>regret</b>" is the yardstick for online learning
        broadly. Learn to read the regret curve and you have the core metric of the whole
        field.
      </DemoP>
    </>
  );
  return (
    <DemoLayout
      topic="REINFORCEMENT LEARNING"
      title="Multi-Armed Bandit"
      subtitle="Explore vs exploit: pit ε-greedy, UCB, and Thompson sampling against the same slot machines."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="violet"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<BanditDemo />);
