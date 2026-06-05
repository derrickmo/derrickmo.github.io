// demos/td-lambda.jsx — TD(λ) with eligibility traces on the random-walk task
// (Sutton & Barto, Example 7.1 / 6.2).
//
// A symmetric random walk on a chain: start in the middle, step left/right with
// equal probability, terminate at either end (left = 0, right = +1). The true
// state values are linear (i/(N-1)). We learn them with the backward-view TD(λ)
// update and an accumulating eligibility trace:
//   δ = r + γ V(s') - V(s)
//   e(s) += 1 ;   for all s:  V(s) += α δ e(s) ;   e(s) *= γλ
// λ interpolates between one-step TD(0) (λ=0, slow but low variance) and
// Monte-Carlo (λ=1, full-return credit, high variance). Intermediate λ usually
// learns fastest — the whole point of eligibility traces. Everything is a real
// online TD(λ) run; the RMS-error curve is measured against the known true values.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP, Slider, DemoButton, StatReadout, ControlGroup, Legend,
} = window;

const CW = 320, CH = 230;

function TDLambdaDemo() {
  const cvRef = _useRef(null);
  const [lambda, setLambda] = _useState(0.6);
  const [alpha, setAlpha] = _useState(0.1);
  const [nNon, setNNon] = _useState(7);     // non-terminal states
  const [speed, setSpeed] = _useState(20);  // episodes/sec target
  const [running, setRunning] = _useState(false);
  const [ep, setEp] = _useState(0);
  const [rms, setRms] = _useState(0);

  const lRef = _useRef(lambda), aRef = _useRef(alpha), spRef = _useRef(speed);
  _useEffect(() => { lRef.current = lambda; }, [lambda]);
  _useEffect(() => { aRef.current = alpha; }, [alpha]);
  _useEffect(() => { spRef.current = speed; }, [speed]);

  const stRef = _useRef(null);
  function init() {
    const ST = nNon + 2;
    const V = new Array(ST).fill(0.5); V[0] = 0; V[ST - 1] = 0;
    const tru = new Array(ST); for (let i = 0; i < ST; i++) tru[i] = i / (ST - 1);
    stRef.current = { ST, V, tru, e: new Array(ST).fill(0), pos: Math.floor(ST / 2), hist: [], episodes: 0 };
    setEp(0); setRms(0);
  }

  function rmsErr() {
    const { ST, V, tru } = stRef.current; let s = 0;
    for (let i = 1; i < ST - 1; i++) s += (V[i] - tru[i]) * (V[i] - tru[i]);
    return Math.sqrt(s / (ST - 2));
  }

  // run one full episode of TD(lambda)
  function runEpisode() {
    const st = stRef.current, V = st.V, e = st.e, ST = st.ST;
    for (let i = 0; i < ST; i++) e[i] = 0;
    let s = Math.floor(ST / 2);
    const lam = lRef.current, alp = aRef.current;
    let guard = 0;
    while (s > 0 && s < ST - 1 && guard++ < 5000) {
      const sp = Math.random() < 0.5 ? s - 1 : s + 1;
      const r = sp === ST - 1 ? 1 : 0;
      const term = (sp === 0 || sp === ST - 1);
      const delta = r + (term ? 0 : V[sp]) - V[s];
      e[s] += 1;
      for (let i = 0; i < ST; i++) { V[i] += alp * delta * e[i]; e[i] *= lam; } // gamma=1
      s = sp;
    }
    st.pos = s;
    st.episodes++;
    const err = rmsErr();
    st.hist.push(err); if (st.hist.length > 120) st.hist.shift();
    return err;
  }

  function draw() {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = "#0b1530"; ctx.fillRect(0, 0, CW, CH);
    const st = stRef.current; if (!st) return;
    const { ST, V, tru } = st;
    // value panel
    const padL = 28, padR = 10, vy0 = 18, vy1 = 120;
    const X = i => padL + (i / (ST - 1)) * (CW - padL - padR);
    const Y = v => vy1 - v * (vy1 - vy0);
    ctx.strokeStyle = "rgba(148,163,184,0.2)";
    for (const g of [0, 0.5, 1]) { ctx.beginPath(); ctx.moveTo(padL, Y(g)); ctx.lineTo(CW - padR, Y(g)); ctx.stroke(); }
    ctx.fillStyle = "#94a3b8"; ctx.font = "8px monospace"; ctx.textAlign = "right";
    ctx.fillText("1", padL - 3, Y(1) + 3); ctx.fillText("0", padL - 3, Y(0) + 3);
    ctx.textAlign = "left"; ctx.fillText("value: estimate vs true", padL, vy0 - 6);
    // true line
    ctx.strokeStyle = "rgba(148,163,184,0.7)"; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5; ctx.beginPath();
    for (let i = 0; i < ST; i++) { const x = X(i), y = Y(tru[i]); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke(); ctx.setLineDash([]);
    // eligibility trace shading on states
    for (let i = 1; i < ST - 1; i++) { const tr = Math.min(1, st.e[i]); if (tr > 0.01) { ctx.fillStyle = `rgba(251,191,36,${0.12 + 0.5 * tr})`; ctx.beginPath(); ctx.arc(X(i), Y(V[i]), 9, 0, Math.PI * 2); ctx.fill(); } }
    // estimate line + dots
    ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i < ST; i++) { const x = X(i), y = Y(V[i]); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    for (let i = 0; i < ST; i++) { ctx.fillStyle = (i === 0 || i === ST - 1) ? "#64748b" : "#c084fc"; ctx.beginPath(); ctx.arc(X(i), Y(V[i]), 3, 0, Math.PI * 2); ctx.fill(); }
    // agent
    ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(X(st.pos), Y(V[st.pos]), 4.5, 0, Math.PI * 2); ctx.fill();

    // RMS curve
    const ey0 = 150, ey1 = CH - 16, ex0 = 28, ex1 = CW - 10;
    ctx.strokeStyle = "rgba(148,163,184,0.25)"; ctx.beginPath(); ctx.moveTo(ex0, ey0); ctx.lineTo(ex0, ey1); ctx.lineTo(ex1, ey1); ctx.stroke();
    ctx.fillStyle = "#94a3b8"; ctx.font = "8px monospace"; ctx.textAlign = "left"; ctx.fillText("RMS error vs episode", ex0 + 2, ey0 - 4);
    ctx.textAlign = "right"; ctx.fillText("0.5", ex0 - 3, ey0 + 4); ctx.fillText("0", ex0 - 3, ey1);
    if (st.hist.length > 1) {
      ctx.strokeStyle = "#34d399"; ctx.lineWidth = 1.8; ctx.beginPath();
      st.hist.forEach((v, i) => { const x = ex0 + (i / 119) * (ex1 - ex0); const y = ey1 - Math.min(1, v / 0.5) * (ey1 - ey0); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
      ctx.stroke();
    }
  }

  _useEffect(() => { init(); draw(); /* eslint-disable-next-line */ }, [nNon]);

  _useEffect(() => {
    if (!running) return;
    let alive = true, raf, last = 0;
    const loop = (t) => {
      if (!alive) return;
      const interval = 1000 / Math.max(1, spRef.current);
      if (t - last > interval) { last = t; const err = runEpisode(); setEp(stRef.current.episodes); setRms(err); draw(); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(raf); };
    /* eslint-disable-next-line */
  }, [running]);

  const reset = () => { setRunning(false); init(); setTimeout(draw, 0); };
  const mode = lambda <= 0.001 ? "TD(0) — one-step" : lambda >= 0.999 ? "Monte Carlo" : "TD(λ)";

  const stage = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <canvas ref={cvRef} width={CW} height={CH}
        style={{ width: CW * 1.5, maxWidth: "100%", borderRadius: 6, border: "1px solid var(--border)", background: "#0b1530" }} />
      <Legend items={[
        { label: "estimate", color: "#a855f7" },
        { label: "true value", color: "#94a3b8" },
        { label: "eligibility trace", color: "#fbbf24" },
        { label: "RMS error", color: "#34d399" },
      ]} />
    </div>
  );

  const controls = (
    <ControlGroup>
      <Slider label="// TRACE DECAY λ" min={0} max={1} step={0.05} value={lambda} onChange={setLambda} tone="violet"
        help="How far credit flows back along the trajectory. λ=0 is one-step TD (only the last state updates); λ=1 is Monte Carlo (the whole episode's return credits every visited state); in between, recent states get exponentially more credit." />
      <Slider label="// LEARNING RATE α" min={0.01} max={0.4} step={0.01} value={alpha} onChange={setAlpha}
        help="Step size for each value update. Larger learns faster but oscillates more — and the best α depends on λ (higher λ carries more variance, so it usually wants a smaller α)." />
      <Slider label="// STATES" min={3} max={15} step={2} value={nNon} onChange={setNNon} tone="blue"
        help="Number of non-terminal states in the chain. A longer walk makes reward sparser and slower to propagate, where eligibility traces help most. Rebuilds the walk." />
      <Slider label="// SPEED" min={2} max={80} value={speed} onChange={setSpeed} suffix=" ep/s"
        help="Episodes per second. Visual pacing only; it does not change the learning." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setRunning(r => !r)} primary tone="violet">{running ? "PAUSE" : "TRAIN"}</DemoButton>
        <DemoButton onClick={() => { if (!running) { runEpisode(); setEp(stRef.current.episodes); setRms(rmsErr()); draw(); } }} disabled={running}>EPISODE</DemoButton>
        <DemoButton onClick={reset}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="EPISODE" value={ep} accent="var(--dim)" />
        <StatReadout label="RMS ERROR" value={rms.toFixed(3)} accent={rms < 0.05 ? "#34d399" : rms < 0.15 ? "#fbbf24" : "#f87171"} />
      </div>
      <StatReadout label="MODE" value={mode} accent="var(--violet-lt)" />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        On this random walk the true state values rise linearly from 0 to 1 (the
        gray dashed line) — the probability of exiting on the right. TD(λ) learns
        them online with an <b>eligibility trace</b>: each visited state leaves a
        decaying mark (the gold halos), and when a TD error δ appears, <i>every</i>{" "}
        marked state is updated in proportion to its trace. That spreads the news of
        a reward backward along the path you actually took, all in one pass.
      </DemoP>
      <DemoP>
        <b>λ is the dial between two classic algorithms.</b> At λ=0 only the
        immediately preceding state updates — that's one-step TD(0): stable but slow,
        reward seeps back one state per episode. At λ=1 the full episode return
        credits every state — that's Monte Carlo: unbiased but high variance. Sweep λ
        and watch the green RMS curve: an intermediate value typically drops fastest,
        which is exactly why eligibility traces exist. Lengthen the walk to make the
        reward sparser and the advantage of carrying credit grows.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Eligibility traces unify the two poles of value learning —{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/gridworld-rl/`} style={{ color: "#a855f7" }}>one-step
        TD</a> and Monte-Carlo returns — into a single mechanism with a smooth knob.
        The backward view here (traces) is mathematically equivalent to the forward
        view (the λ-return, a geometric average of all n-step returns), and it's the
        engine behind TD(λ), SARSA(λ), and Q(λ).
      </DemoP>
      <DemoP>
        The same credit-assignment problem — which past decisions deserve credit for
        a delayed reward — reappears everywhere in RL: it's why{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/sarsa-vs-qlearning/`} style={{ color: "#a855f7" }}>TD
        control</a> bootstraps, and the modern descendant GAE (generalized advantage
        estimation) is literally eligibility traces applied to the advantages that
        drive{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/actor-critic/`} style={{ color: "#a855f7" }}>actor-critic</a>{" "}
        and PPO. The bias/variance tradeoff you feel in the λ slider is the same one
        those methods tune.
      </DemoP>
    </>
  );

  return (
    <DemoLayout topic="REINFORCEMENT LEARNING" title="TD(λ) & Eligibility Traces"
      subtitle="One knob from one-step TD to Monte Carlo. Eligibility traces carry a reward's credit backward along the path you took — and an intermediate λ usually learns fastest."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/reinforcement-learning/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<TDLambdaDemo />);
