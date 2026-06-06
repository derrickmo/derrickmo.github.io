// demos/prioritized-replay.jsx — Prioritized Experience Replay (Schaul et al., 2016).
//
// A replay buffer holds transitions; instead of sampling them uniformly, sample
// each with probability ∝ |TD error|^α, so "surprising" transitions are revisited
// more. Because that biases the expected update, correct it with importance-
// sampling weights w_i = (N·P(i))^(-β). On a sparse-reward chain this produces a
// near-perfect BACKWARD SWEEP of value from the goal — the only transition with
// error at first is the goal one, fixing it makes its neighbour the next surprise,
// and so on — while uniform replay wastes most updates on already-correct
// transitions. Two learners share the same buffer and differ only in sampling.
// Real TD value learning; priorities and IS weights computed exactly.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP, Slider, DemoButton, StatReadout, ControlGroup, Legend,
} = window;

const CW = 320, CH = 250;
const MAXU = 400;       // updates plotted
const PEPS = 0.01;      // priority floor

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function PrioritizedReplayDemo() {
  const cvRef = _useRef(null);
  const [N, setN] = _useState(15);
  const [alpha, setAlpha] = _useState(0.8);
  const [beta, setBeta] = _useState(0.5);
  const [lr, setLr] = _useState(0.6);
  const [speed, setSpeed] = _useState(40);
  const [running, setRunning] = _useState(false);
  const [updates, setUpdates] = _useState(0);
  const [eP, setEP] = _useState(0);
  const [eU, setEU] = _useState(0);

  const aRef = _useRef(alpha), bRef = _useRef(beta), lRef = _useRef(lr), spRef = _useRef(speed);
  _useEffect(() => { aRef.current = alpha; }, [alpha]);
  _useEffect(() => { bRef.current = beta; }, [beta]);
  _useEffect(() => { lRef.current = lr; }, [lr]);
  _useEffect(() => { spRef.current = speed; }, [speed]);

  const GAMMA = 0.95;
  const stRef = _useRef(null);
  function vtrue(i) { return Math.pow(GAMMA, (N - 1) - i); }
  function init() {
    const mk = () => ({ V: new Array(N).fill(0), pr: new Array(N).fill(1), last: -1 });
    stRef.current = { pri: mk(), uni: mk(), rand: rng(2024), updates: 0, histP: [], histU: [] };
    setUpdates(0); setEP(0); setEU(0);
  }
  function rms(V) { let s = 0; for (let i = 0; i < N; i++) { const d = V[i] - vtrue(i); s += d * d; } return Math.sqrt(s / N); }

  // transition i: from state i. i<N-1: r=0,next=i+1; i=N-1: r=1, terminal.
  function tdError(V, i) { const r = i === N - 1 ? 1 : 0; const vn = i === N - 1 ? 0 : V[i + 1]; return r + GAMMA * vn - V[i]; }

  function updateAgent(ag, prioritized) {
    const rand = stRef.current.rand;
    let i, isw = 1;
    if (prioritized) {
      const a = aRef.current; let tot = 0; const w = new Array(N);
      for (let k = 0; k < N; k++) { w[k] = Math.pow(ag.pr[k], a); tot += w[k]; }
      let x = rand() * tot, acc = 0; i = N - 1;
      for (let k = 0; k < N; k++) { acc += w[k]; if (x <= acc) { i = k; break; } }
      const P = w[i] / tot; isw = Math.pow(N * P, -bRef.current);
      // normalize by max possible weight (min P) for stability
      let minP = 1; for (let k = 0; k < N; k++) minP = Math.min(minP, w[k] / tot);
      const wmax = Math.pow(N * minP, -bRef.current); isw /= wmax;
    } else { i = Math.floor(rand() * N); }
    const d = tdError(ag.V, i);
    ag.V[i] += lRef.current * isw * d;
    ag.pr[i] = Math.abs(tdError(ag.V, i)) + PEPS; // refresh this transition's priority
    ag.last = i;
  }

  function tick() {
    const st = stRef.current;
    updateAgent(st.pri, true);
    updateAgent(st.uni, false);
    st.updates++;
    if (st.histP.length < MAXU) { st.histP.push(rms(st.pri.V)); st.histU.push(rms(st.uni.V)); }
  }

  function draw() {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d"); ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = "#0b1530"; ctx.fillRect(0, 0, CW, CH);
    const st = stRef.current; if (!st) return;
    const padL = 8, padR = 8, w = CW - padL - padR;
    const cw = w / N;
    // chain values (prioritized agent)
    const vy0 = 18, vy1 = 70;
    ctx.fillStyle = "#94a3b8"; ctx.font = "8px monospace"; ctx.textAlign = "left"; ctx.fillText("value V along chain (violet) vs true (line) — prioritized learner", padL, vy0 - 5);
    for (let i = 0; i < N; i++) {
      const x = padL + i * cw, h = Math.max(0, Math.min(1, st.pri.V[i])) * (vy1 - vy0);
      ctx.fillStyle = i === N - 1 ? "rgba(52,211,153,0.5)" : "rgba(168,85,247,0.7)";
      ctx.fillRect(x + 0.5, vy1 - h, cw - 1, h);
    }
    ctx.strokeStyle = "rgba(203,213,225,0.7)"; ctx.lineWidth = 1.2; ctx.beginPath();
    for (let i = 0; i < N; i++) { const x = padL + i * cw + cw / 2, y = vy1 - vtrue(i) * (vy1 - vy0); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.fillStyle = "#34d399"; ctx.textAlign = "center"; ctx.fillText("goal", padL + (N - 0.5) * cw - cw / 2, vy1 + 9);

    // priority bars
    const py0 = 96, py1 = 138;
    ctx.fillStyle = "#94a3b8"; ctx.textAlign = "left"; ctx.fillText("buffer priority |TD error|^α  (last sampled = gold)", padL, py0 - 5);
    let pmax = 1e-6; for (let i = 0; i < N; i++) pmax = Math.max(pmax, st.pri.pr[i]);
    for (let i = 0; i < N; i++) {
      const x = padL + i * cw, h = (st.pri.pr[i] / pmax) * (py1 - py0);
      ctx.fillStyle = i === st.pri.last ? "#fbbf24" : "#60a5fa"; ctx.fillRect(x + 0.5, py1 - h, cw - 1, h);
    }

    // RMS curve
    const ry0 = 162, ry1 = CH - 16, rx0 = 30, rx1 = CW - 8;
    ctx.strokeStyle = "rgba(148,163,184,0.25)"; ctx.beginPath(); ctx.moveTo(rx0, ry0); ctx.lineTo(rx0, ry1); ctx.lineTo(rx1, ry1); ctx.stroke();
    let emax = 0.001; for (const v of st.histU) emax = Math.max(emax, v); for (const v of st.histP) emax = Math.max(emax, v); emax *= 1.05;
    ctx.fillStyle = "#94a3b8"; ctx.font = "8px monospace"; ctx.textAlign = "left"; ctx.fillText("RMS value error vs replay updates", rx0 + 2, ry0 - 4);
    ctx.textAlign = "right"; ctx.fillText(emax.toFixed(2), rx0 - 3, ry0 + 4); ctx.fillText("0", rx0 - 3, ry1);
    const plot = (h, col) => { if (h.length < 2) return; ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.beginPath(); h.forEach((v, i) => { const x = rx0 + (i / (MAXU - 1)) * (rx1 - rx0); const y = ry1 - (v / emax) * (ry1 - ry0); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }); ctx.stroke(); };
    plot(st.histU, "#94a3b8");
    plot(st.histP, "#a855f7");
  }

  _useEffect(() => { init(); draw(); /* eslint-disable-next-line */ }, [N]);

  _useEffect(() => {
    if (!running) return;
    let alive = true, raf, last = 0;
    const loop = (t) => {
      if (!alive) return;
      const interval = 1000 / Math.max(1, spRef.current);
      if (t - last > interval) {
        last = t; const burst = Math.max(1, Math.round(spRef.current / 8));
        for (let i = 0; i < burst; i++) if (stRef.current.histP.length < MAXU) tick();
        const st = stRef.current; setUpdates(st.updates); setEP(st.histP[st.histP.length - 1] || 0); setEU(st.histU[st.histU.length - 1] || 0);
        draw();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(raf); };
    /* eslint-disable-next-line */
  }, [running]);

  const reset = () => { setRunning(false); init(); setTimeout(draw, 0); };

  const stage = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <canvas ref={cvRef} width={CW} height={CH}
        style={{ width: CW * 1.5, maxWidth: "100%", borderRadius: 6, border: "1px solid var(--border)", background: "#0b1530" }} />
      <Legend items={[
        { label: "prioritized", color: "#a855f7" },
        { label: "uniform", color: "#94a3b8" },
        { label: "priority", color: "#60a5fa" },
        { label: "last sampled", color: "#fbbf24" },
      ]} />
    </div>
  );

  const controls = (
    <ControlGroup>
      <Slider label="// PRIORITIZATION α" min={0} max={1} step={0.05} value={alpha} onChange={setAlpha} tone="violet"
        help="How sharply sampling favors high-TD-error transitions. α=0 is uniform replay; α=1 samples strictly in proportion to error. The higher it is, the more the prioritized learner focuses on the moving 'frontier' of surprise." />
      <Slider label="// IS CORRECTION β" min={0} max={1} step={0.05} value={beta} onChange={setBeta}
        help="Importance-sampling exponent that undoes the bias from non-uniform sampling: w=(N·P)^(-β). β=0 leaves the bias in (fastest, slightly off); β=1 fully corrects it. Real PER anneals β toward 1 over training." />
      <Slider label="// CHAIN LENGTH" min={6} max={30} step={1} value={N} onChange={setN} tone="blue"
        help="States between start and the single rewarding goal transition. Longer chains make reward sparser — exactly where prioritized replay's backward sweep crushes uniform sampling. Rebuilds." />
      <Slider label="// LEARNING RATE" min={0.1} max={1} step={0.05} value={lr} onChange={setLr} tone="blue"
        help="TD step size, shared by both learners so sampling is the only difference." />
      <Slider label="// SPEED" min={4} max={160} value={speed} onChange={setSpeed} suffix=" /s"
        help="Replay updates per second. Visual pacing only." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setRunning(r => !r)} primary tone="violet">{running ? "PAUSE" : "REPLAY"}</DemoButton>
        <DemoButton onClick={reset}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="UPDATES" value={updates} accent="var(--dim)" />
        <StatReadout label="CHAIN" value={N} accent="var(--blue-lt)" />
        <StatReadout label="PRIORITIZED ERROR" value={eP.toFixed(3)} accent="#a855f7" />
        <StatReadout label="UNIFORM ERROR" value={eU.toFixed(3)} accent="#94a3b8" />
      </div>
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Both learners replay the <i>same</i> buffer of transitions and run the same
        TD update; they differ only in <b>which transition they pick</b>. Uniform
        replay (gray) draws at random, so on a sparse-reward chain it spends almost
        every update re-confirming transitions it already has right. <b>Prioritized</b>{" "}
        replay (violet) samples in proportion to <b>|TD error|</b> — surprise — and
        the priority bars show where that surprise currently lives.
      </DemoP>
      <DemoP>
        The result is a clean <b>backward sweep</b>. At first only the goal
        transition has any error; fixing it makes its neighbour the new surprise,
        whose priority spikes, so it's sampled next — value marches back from the
        goal in roughly one pass. The RMS-error curve shows prioritized collapsing
        in a fraction of the updates uniform needs, and the gap widens as you
        lengthen the chain. <b>β</b> trades a little of that speed for an unbiased
        update; <b>α=0</b> turns prioritized back into uniform and the curves merge.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Prioritized experience replay is a standard upgrade to off-policy deep RL:
        it made a large difference on Atari and is a near-default companion to{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/dqn/`} style={{ color: "#a855f7" }}>DQN</a>.
        It's the data-side counterpart to{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/dyna-q/`} style={{ color: "#a855f7" }}>Dyna-Q</a>'s
        planning — both squeeze more learning out of stored transitions; PER just
        spends the replay budget where the model is most wrong.
      </DemoP>
      <DemoP>
        The α/β pair is the general recipe for any biased-but-useful sampling
        scheme: tilt the distribution toward informative examples (α), then correct
        the resulting bias with importance weights (β) — the same{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/importance-sampling/`} style={{ color: "#a855f7" }}>importance-sampling</a>{" "}
        idea used to reweight off-policy data and rare events. Hard-example mining
        in supervised learning is the same instinct without the correction.
      </DemoP>
    </>
  );

  return (
    <DemoLayout topic="REINFORCEMENT LEARNING" title="Prioritized Experience Replay"
      subtitle="Replay surprising transitions first. Sampling by TD error sweeps value back from a sparse reward in a fraction of the updates uniform replay needs."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/reinforcement-learning/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<PrioritizedReplayDemo />);
