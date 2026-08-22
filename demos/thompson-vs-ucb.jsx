// demos/thompson-vs-ucb.jsx — two principled bandit strategies, head to head.
// Thompson sampling (Bayesian: keep a Beta posterior per arm, sample, pull the
// argmax) vs UCB1 (frequentist optimism: pull argmax of estimate + bonus), run
// in parallel on identical Bernoulli arms. The hero visual is the per-arm Beta
// belief that DRIVES Thompson, with UCB's optimistic upper bound overlaid.
// Real Bernoulli rewards, real Beta sampling (Marsaglia-Tsang gamma), real
// cumulative regret. Distinct from the bandit demo (single-strategy regret) by
// showing both strategies and their posteriors side by side.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 380;
const C_TS = "#22d3ee", C_UCB = "#fbbf24", C_TRUE = "#34d399";

function gaussRand() { let u = 0, v = 0; while (u === 0) u = Math.random(); while (v === 0) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
// Marsaglia-Tsang gamma sampler (shape k>0, scale 1)
function gammaSample(k) {
  if (k < 1) return gammaSample(k + 1) * Math.pow(Math.random(), 1 / k);
  const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x, v;
    do { x = gaussRand(); v = 1 + c * x; } while (v <= 0);
    v = v * v * v; const u = Math.random();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}
const betaSample = (a, b) => { const ga = gammaSample(a), gb = gammaSample(b); return ga / (ga + gb); };

function makeArms(k) { return Array.from({ length: k }, () => 0.12 + Math.random() * 0.74); }

function ThompsonVsUcbDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const armsRef = _useRef(makeArms(6));
  const tsRef = _useRef([]);   // per-arm {a,b}
  const ucbRef = _useRef([]);  // per-arm {n,q}
  const tRef = _useRef(0);
  const regretTsRef = _useRef(0), regretUcbRef = _useRef(0);
  const optTsRef = _useRef(0), optUcbRef = _useRef(0);
  const histRef = _useRef([]); // {ts, ucb} cumulative regret
  const lastRef = _useRef({ ts: -1, ucb: -1 });
  const rafRef = _useRef(null);

  const [k, setK] = _useState(6);
  const [c, setC] = _useState(1.0);
  const [speed, setSpeed] = _useState(6);
  const [running, setRunning] = _useState(false);
  const [, setTick] = _useState(0);

  const cRef = _useRef(c), spRef = _useRef(speed);
  _useEffect(() => { cRef.current = c; }, [c]);
  _useEffect(() => { spRef.current = speed; }, [speed]);

  const bestP = () => Math.max(...armsRef.current);

  function resetAgents() {
    const K = armsRef.current.length;
    tsRef.current = Array.from({ length: K }, () => ({ a: 1, b: 1 }));
    ucbRef.current = Array.from({ length: K }, () => ({ n: 0, q: 0 }));
    tRef.current = 0; regretTsRef.current = 0; regretUcbRef.current = 0;
    optTsRef.current = 0; optUcbRef.current = 0; histRef.current = []; lastRef.current = { ts: -1, ucb: -1 };
    setTick(v => v + 1); draw();
  }
  function newArms() { armsRef.current = makeArms(k); resetAgents(); }

  function stepOnce() {
    const arms = armsRef.current, K = arms.length, pstar = bestP();
    const t = tRef.current + 1; tRef.current = t;
    // Thompson
    const ts = tsRef.current;
    let tiBest = 0, tBestVal = -1;
    for (let i = 0; i < K; i++) { const s = betaSample(ts[i].a, ts[i].b); if (s > tBestVal) { tBestVal = s; tiBest = i; } }
    const rTs = Math.random() < arms[tiBest] ? 1 : 0;
    ts[tiBest].a += rTs; ts[tiBest].b += 1 - rTs;
    regretTsRef.current += pstar - arms[tiBest]; if (arms[tiBest] === pstar) optTsRef.current++;
    // UCB1
    const uc = ucbRef.current;
    let uiBest = -1, uBestVal = -1;
    for (let i = 0; i < K; i++) { if (uc[i].n === 0) { uiBest = i; break; } const val = uc[i].q + cRef.current * Math.sqrt(Math.log(t) / uc[i].n); if (val > uBestVal) { uBestVal = val; uiBest = i; } }
    const rUcb = Math.random() < arms[uiBest] ? 1 : 0;
    uc[uiBest].n++; uc[uiBest].q += (rUcb - uc[uiBest].q) / uc[uiBest].n;
    regretUcbRef.current += pstar - arms[uiBest]; if (arms[uiBest] === pstar) optUcbRef.current++;

    lastRef.current = { ts: tiBest, ucb: uiBest };
    if (t % 2 === 0 || t < 40) histRef.current.push({ ts: regretTsRef.current, ucb: regretUcbRef.current });
  }

  function betaShape(a, b, v) { if (v <= 0 || v >= 1) return 0; return Math.exp((a - 1) * Math.log(v) + (b - 1) * Math.log(1 - v)); }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const arms = armsRef.current, K = arms.length;
    const x0 = 40, x1 = 504, topY = 28, botY = 244;
    const mapY = v => botY - v * (botY - topY);
    const colW = (x1 - x0) / K;
    // value axis gridlines
    ctx.strokeStyle = "rgba(255,255,255,0.07)"; ctx.lineWidth = 1; ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "9px JetBrains Mono, monospace"; ctx.textAlign = "right";
    for (let g = 0; g <= 1; g += 0.25) { const y = mapY(g); ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); ctx.fillText(g.toFixed(2), x0 - 4, y + 3); }
    ctx.textAlign = "left"; ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillText("ARM REWARD PROBABILITY -> belief per arm", x0, 16);

    const ts = tsRef.current, uc = ucbRef.current, t = Math.max(tRef.current, 1), last = lastRef.current;
    for (let i = 0; i < K; i++) {
      const xc = x0 + i * colW + colW / 2;
      // Thompson Beta violin
      const G = 60; let mx = 0; const dens = [];
      for (let j = 0; j <= G; j++) { const v = j / G; const d = betaShape(ts[i].a, ts[i].b, v); dens.push(d); if (d > mx) mx = d; }
      const halfW = Math.min(colW * 0.34, 22);
      ctx.fillStyle = "rgba(34,211,238,0.22)"; ctx.strokeStyle = "rgba(34,211,238,0.85)"; ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (let j = 0; j <= G; j++) { const v = j / G, w = (mx > 0 ? dens[j] / mx : 0) * halfW; const x = xc - w, y = mapY(v); j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      for (let j = G; j >= 0; j--) { const v = j / G, w = (mx > 0 ? dens[j] / mx : 0) * halfW; ctx.lineTo(xc + w, mapY(v)); }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // UCB estimate + optimistic bound (gold), offset right
      const ux = xc + halfW + 6;
      if (uc[i].n === 0) {
        ctx.strokeStyle = "rgba(251,191,36,0.4)"; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(ux, mapY(0)); ctx.lineTo(ux, mapY(1)); ctx.stroke(); ctx.setLineDash([]);
      } else {
        const bonus = cRef.current * Math.sqrt(Math.log(t) / uc[i].n), hi = Math.min(uc[i].q + bonus, 1);
        ctx.strokeStyle = C_UCB; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(ux, mapY(uc[i].q)); ctx.lineTo(ux, mapY(hi)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ux - 4, mapY(hi)); ctx.lineTo(ux + 4, mapY(hi)); ctx.stroke();
        ctx.fillStyle = C_UCB; ctx.beginPath(); ctx.arc(ux, mapY(uc[i].q), 2.6, 0, Math.PI * 2); ctx.fill();
      }
      // true p tick
      ctx.strokeStyle = C_TRUE; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(xc - halfW - 3, mapY(arms[i])); ctx.lineTo(ux + 4, mapY(arms[i])); ctx.stroke();
      // chosen-this-step markers
      if (last.ts === i) { ctx.fillStyle = C_TS; ctx.beginPath(); ctx.arc(xc - halfW / 2, botY + 12, 3.5, 0, Math.PI * 2); ctx.fill(); }
      if (last.ucb === i) { ctx.fillStyle = C_UCB; ctx.beginPath(); ctx.arc(ux, botY + 12, 3.5, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "9px JetBrains Mono, monospace"; ctx.textAlign = "center";
      ctx.fillText("a" + (i + 1), xc, botY + 26);
    }
    ctx.textAlign = "left";
    // regret comparison sparkline
    const hist = histRef.current;
    const ox = x0, oy = 296, ow = x1 - x0, oh = 70;
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillText("CUMULATIVE REGRET (lower is better)", ox, oy - 6);
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.strokeRect(ox, oy, ow, oh);
    if (hist.length > 1) {
      const hi = Math.max(1e-6, ...hist.map(p => Math.max(p.ts, p.ucb)));
      const line = (key, col) => { ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.beginPath(); hist.forEach((p, i) => { const px = ox + (i / (hist.length - 1)) * ow, py = oy + oh - (p[key] / hi) * (oh - 6) - 3; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke(); };
      line("ucb", C_UCB); line("ts", C_TS);
    }
  }

  function handleRun() { if (running) { setRunning(false); return; } setRunning(true); }
  function handleStep() { if (running) return; stepOnce(); setTick(v => v + 1); draw(); }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    resetAgents();
  }, []);
  _useEffect(() => { newArms(); }, [k]);

  _useEffect(() => {
    if (!running) return;
    let alive = true;
    const loop = () => { if (!alive) return; for (let i = 0; i < spRef.current; i++) stepOnce(); setTick(v => v + 1); draw(); rafRef.current = requestAnimationFrame(loop); };
    rafRef.current = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, [running]);

  const t = tRef.current;
  const pct = (opt) => t > 0 ? Math.round((opt / t) * 100) : 0;
  const stage = (<canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />);

  const controls = (
    <ControlGroup>
      <Slider label="// ARMS" min={3} max={8} step={1} value={k} onChange={setK}
        help="Number of slot-machine arms, each with a hidden Bernoulli reward probability. More arms = harder exploration problem." />
      <Slider label="// UCB EXPLORATION c" min={0.2} max={2.5} step={0.1} value={c} onChange={setC}
        help="Width of UCB's optimism bonus c*sqrt(ln t / n). Higher c explores more (taller gold bars); too low and UCB can lock onto a wrong arm early. Thompson has no such knob - its exploration comes from the posterior." />
      <Slider label="// SPEED" min={1} max={40} value={speed} onChange={setSpeed} suffix=" pulls/frame"
        help="Pulls per animation frame for each agent. Visual pacing only." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={handleRun} primary>{running ? "PAUSE" : "RUN"}</DemoButton>
        <DemoButton onClick={handleStep} disabled={running}>STEP</DemoButton>
        <DemoButton onClick={resetAgents}>RESET</DemoButton>
        <DemoButton onClick={newArms}>NEW ARMS</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="PULLS (each)" value={t} />
        <StatReadout label="BEST ARM p" value={armsRef.current.length ? bestP().toFixed(2) : "-"} accent={C_TRUE} />
        <StatReadout label="THOMPSON REGRET" value={regretTsRef.current.toFixed(1)} accent={C_TS} />
        <StatReadout label="UCB REGRET" value={regretUcbRef.current.toFixed(1)} accent={C_UCB} />
        <StatReadout label="THOMPSON % OPT" value={pct(optTsRef.current) + "%"} accent={C_TS} />
        <StatReadout label="UCB % OPT" value={pct(optUcbRef.current) + "%"} accent={C_UCB} />
      </div>
      <Legend items={[
        { color: C_TS, label: "THOMPSON (Beta posterior)" },
        { color: C_UCB, label: "UCB (estimate + bonus)" },
        { color: C_TRUE, label: "TRUE p" },
      ]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Both agents face the same arms and must trade <b>exploration</b> (try uncertain arms)
        against <b>exploitation</b> (pump the best-looking one) — but they reason differently.
        <b style={{ color: C_TS }}> Thompson sampling</b> is Bayesian: it keeps a <b>Beta posterior</b>
        over each arm's win rate (the cyan violins), draws one sample from each, and pulls the
        winner — so an arm is explored exactly in proportion to the probability it's best.
        <b style={{ color: C_UCB }}> UCB</b> is frequentist optimism: it pulls whichever arm has the
        highest <i>estimate + uncertainty bonus</i> (the gold bar's top).
      </DemoP>
      <DemoP>
        Watch the violins: a rarely-pulled arm stays wide (uncertain), and Thompson keeps sampling
        it until its posterior sharpens. As evidence accumulates, both strategies concentrate on the
        green best arm and the <b>cumulative regret</b> curves flatten. Thompson usually edges out UCB
        and needs no tuning knob, while UCB's behavior swings with the exploration constant <b>c</b> —
        crank it up and it wastes pulls; drop it and it can commit to a loser. Hit NEW ARMS to see how
        the race changes with the gap between arms.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        This is the cleanest place to see a posterior <i>doing</i> something. Thompson sampling is
        just <a href={`${window.__DM_BASE || "../../"}visualize/bayesian-linear-regression/`}>Bayesian
        belief</a> plus "act by sampling from it," and it's everywhere real decisions get made online:
        A/B testing, ad and content recommendation, hyperparameter search (Bayesian optimization), and
        clinical-trial design all run bandit algorithms to avoid wasting traffic on bad options. The
        Beta-Bernoulli conjugacy here is the same <a href={`${window.__DM_BASE || "../../"}visualize/bandit/`}>explore/exploit</a> machinery
        scaled up to contextual and deep bandits in production.
      </DemoP>
      <DemoP>
        The deeper point is that <b>good exploration is driven by calibrated uncertainty</b>, not random
        noise: both winners here explore <i>where they're unsure</i>, which is why ε-greedy (explore
        uniformly at random) is strictly worse. That principle — optimism or posterior sampling over
        uncertainty — reappears in RL exploration bonuses and in why
        <a href={`${window.__DM_BASE || "../../"}visualize/variational-inference/`}> uncertainty-aware</a> models
        make better sequential decisions than point estimates.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      title="Thompson Sampling vs UCB"
      subtitle="Two principled ways to explore - a Bayesian posterior vs frequentist optimism - racing on the same bandit."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/reinforcement-learning/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="blue"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ThompsonVsUcbDemo />);
