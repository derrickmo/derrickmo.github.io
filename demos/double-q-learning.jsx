// demos/double-q-learning.jsx — maximization bias and the double-estimator fix
// (Sutton & Barto, Example 6.7, the A/B MDP; van Hasselt 2010).
//
// The toy MDP: from A you can go RIGHT (terminate, reward 0) or LEFT to B; from B
// every action terminates with reward ~ N(-0.1, σ²). Going right is optimal
// (0 > -0.1). But Q-learning bootstraps off max_a Q(B,a), and the max of noisy
// estimates is biased HIGH — so Q(A,left) is overestimated and the agent wrongly
// prefers LEFT. Double Q-learning keeps two value tables and uses one to pick the
// action and the OTHER to evaluate it, decoupling selection from evaluation and
// removing the bias. We run many independent copies of each method in parallel and
// plot the fraction choosing LEFT vs episode — the canonical Figure 6.5. Real
// tabular runs.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP, Slider, DemoButton, StatReadout, ControlGroup, Legend,
} = window;

const CW = 330, CH = 240;
const RUNS = 50;       // parallel independent runs per method (for a smooth curve)
const HISTMAX = 150;
const ALPHA_FIXED = 0.1;
const GAMMA = 1;
const TRUE_B = -0.1;   // mean reward at B

function gauss(rand) { const u = Math.max(1e-9, rand()), v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const argmax = a => { let b = 0; for (let i = 1; i < a.length; i++) if (a[i] > a[b]) b = i; return b; };
const amax = a => { let m = a[0]; for (let i = 1; i < a.length; i++) if (a[i] > m) m = a[i]; return m; };

function DoubleQDemo() {
  const cvRef = _useRef(null);
  const [nB, setNB] = _useState(10);
  const [sigma, setSigma] = _useState(1.0);
  const [eps, setEps] = _useState(0.1);
  const [speed, setSpeed] = _useState(30);
  const [running, setRunning] = _useState(false);
  const [ep, setEp] = _useState(0);
  const [lq, setLq] = _useState(0);
  const [ld, setLd] = _useState(0);

  const eRef = _useRef(eps), spRef = _useRef(speed), sgRef = _useRef(sigma);
  _useEffect(() => { eRef.current = eps; }, [eps]);
  _useEffect(() => { spRef.current = speed; }, [speed]);
  _useEffect(() => { sgRef.current = sigma; }, [sigma]);

  const stRef = _useRef(null);
  function init() {
    const rand = rng(777);
    const q = Array.from({ length: RUNS }, () => ({ A: [0, 0], B: new Array(nB).fill(0) }));
    const d = Array.from({ length: RUNS }, () => ({ A1: [0, 0], A2: [0, 0], B1: new Array(nB).fill(0), B2: new Array(nB).fill(0) }));
    stRef.current = { rand, q, d, histQ: [], histD: [], episodes: 0 };
    setEp(0); setLq(0); setLd(0);
  }

  // one episode for a Q-learning run; returns 1 if first action was LEFT
  function epQ(run, rand) {
    const eg = eRef.current, sg = sgRef.current;
    const left = (rand() < eg) ? (rand() < 0.5 ? 1 : 0) : (run.A[0] >= run.A[1] ? 0 : 1);
    if (left === 1) { // RIGHT -> terminal r=0
      run.A[1] += ALPHA_FIXED * (0 - run.A[1]); return 0;
    }
    // LEFT -> B
    const b = (rand() < eg) ? Math.floor(rand() * nB) : argmax(run.B);
    const r = TRUE_B + sg * gauss(rand);
    run.B[b] += ALPHA_FIXED * (r - run.B[b]);
    run.A[0] += ALPHA_FIXED * (0 + GAMMA * amax(run.B) - run.A[0]);
    return 1;
  }
  // one episode for a Double-Q run
  function epD(run, rand) {
    const eg = eRef.current, sg = sgRef.current;
    const sumA = [run.A1[0] + run.A2[0], run.A1[1] + run.A2[1]];
    const left = (rand() < eg) ? (rand() < 0.5 ? 1 : 0) : (sumA[0] >= sumA[1] ? 0 : 1);
    if (left === 1) {
      if (rand() < 0.5) run.A2[1] += ALPHA_FIXED * (0 - run.A2[1]); else run.A1[1] += ALPHA_FIXED * (0 - run.A1[1]);
      return 0;
    }
    const sumB = run.B1.map((v, i) => v + run.B2[i]);
    const b = (rand() < eg) ? Math.floor(rand() * nB) : argmax(sumB);
    const r = TRUE_B + sg * gauss(rand);
    if (rand() < 0.5) run.B1[b] += ALPHA_FIXED * (r - run.B1[b]); else run.B2[b] += ALPHA_FIXED * (r - run.B2[b]);
    // update A,left with double estimator
    if (rand() < 0.5) { const a = argmax(run.B1); run.A1[0] += ALPHA_FIXED * (0 + GAMMA * run.B2[a] - run.A1[0]); }
    else { const a = argmax(run.B2); run.A2[0] += ALPHA_FIXED * (0 + GAMMA * run.B1[a] - run.A2[0]); }
    return 1;
  }

  function stepEpisode() {
    const st = stRef.current, rand = st.rand;
    let lq = 0, ld = 0;
    for (let i = 0; i < RUNS; i++) { lq += epQ(st.q[i], rand); ld += epD(st.d[i], rand); }
    st.histQ.push(lq / RUNS); st.histD.push(ld / RUNS);
    if (st.histQ.length > HISTMAX) { st.histQ.shift(); st.histD.shift(); }
    st.episodes++;
  }

  function draw() {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d"); ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = "#0b1530"; ctx.fillRect(0, 0, CW, CH);
    const st = stRef.current; if (!st) return;

    // value bars: mean Q(A,left) across runs
    let qa = 0, da = 0; for (let i = 0; i < RUNS; i++) { qa += st.q[i].A[0]; da += (st.d[i].A1[0] + st.d[i].A2[0]) / 2; }
    qa /= RUNS; da /= RUNS;
    const vy0 = 16, vy1 = 96, vx0 = 120, vw = 150;
    const lo = -0.6, hi = 0.6; const VY = v => vy1 - ((v - lo) / (hi - lo)) * (vy1 - vy0);
    ctx.fillStyle = "#94a3b8"; ctx.font = "8px monospace"; ctx.textAlign = "left";
    ctx.fillText("estimated value of going LEFT", 8, vy0 - 4);
    // zero (right's value) + true B
    ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.beginPath(); ctx.moveTo(vx0 - 4, VY(0)); ctx.lineTo(vx0 + vw, VY(0)); ctx.stroke();
    ctx.fillStyle = "#cbd5e1"; ctx.textAlign = "right"; ctx.fillText("0 (RIGHT, optimal)", vx0 - 8, VY(0) + 3);
    ctx.strokeStyle = "rgba(52,211,153,0.5)"; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(vx0 - 4, VY(TRUE_B)); ctx.lineTo(vx0 + vw, VY(TRUE_B)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#34d399"; ctx.fillText("true B = -0.1", vx0 - 8, VY(TRUE_B) + 12);
    const bar = (v, x, col, lbl) => {
      const y = VY(v), y0 = VY(0); ctx.fillStyle = col; ctx.fillRect(x, Math.min(y, y0), 34, Math.abs(y - y0));
      ctx.fillStyle = col; ctx.font = "8px monospace"; ctx.textAlign = "center"; ctx.fillText(lbl, x + 17, vy1 + 10); ctx.fillText(v.toFixed(2), x + 17, (v >= 0 ? y - 3 : y + 9));
    };
    bar(qa, vx0 + 20, "#f87171", "Q-learn");
    bar(da, vx0 + 80, "#34d399", "Double-Q");

    // %left curve
    const cy0 = 122, cy1 = CH - 16, cx0 = 30, cx1 = CW - 8;
    ctx.strokeStyle = "rgba(148,163,184,0.25)"; ctx.beginPath(); ctx.moveTo(cx0, cy0); ctx.lineTo(cx0, cy1); ctx.lineTo(cx1, cy1); ctx.stroke();
    ctx.fillStyle = "#94a3b8"; ctx.font = "8px monospace"; ctx.textAlign = "left"; ctx.fillText("% choosing LEFT (the wrong action) vs episode", cx0 + 2, cy0 - 4);
    ctx.textAlign = "right"; ctx.fillText("100%", cx0 - 3, cy0 + 4); ctx.fillText("0", cx0 - 3, cy1);
    // optimal floor eps/2
    const floor = eRef.current / 2; const FY = f => cy1 - f * (cy1 - cy0);
    ctx.strokeStyle = "rgba(203,213,225,0.4)"; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(cx0, FY(floor)); ctx.lineTo(cx1, FY(floor)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#94a3b8"; ctx.textAlign = "left"; ctx.fillText("optimal " + Math.round(floor * 100) + "%", cx0 + 3, FY(floor) - 2);
    const plot = (h, col) => { if (h.length < 2) return; ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.beginPath(); h.forEach((v, i) => { const x = cx0 + (i / (HISTMAX - 1)) * (cx1 - cx0); const y = FY(v); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }); ctx.stroke(); };
    plot(st.histQ, "#f87171"); plot(st.histD, "#34d399");
  }

  _useEffect(() => { init(); draw(); /* eslint-disable-next-line */ }, [nB]);

  _useEffect(() => {
    if (!running) return;
    let alive = true, raf, last = 0;
    const loop = (t) => {
      if (!alive) return;
      const interval = 1000 / Math.max(1, spRef.current);
      if (t - last > interval) {
        last = t;
        const burst = Math.max(1, Math.round(spRef.current / 10));
        for (let i = 0; i < burst; i++) stepEpisode();
        const st = stRef.current; setEp(st.episodes);
        setLq(Math.round((st.histQ[st.histQ.length - 1] || 0) * 100));
        setLd(Math.round((st.histD[st.histD.length - 1] || 0) * 100));
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
        style={{ width: CW * 1.45, maxWidth: "100%", borderRadius: 6, border: "1px solid var(--border)", background: "#0b1530" }} />
      <Legend items={[
        { label: "Q-learning", color: "#f87171" },
        { label: "Double Q-learning", color: "#34d399" },
        { label: "optimal floor (ε/2)", color: "#cbd5e1" },
      ]} />
    </div>
  );

  const controls = (
    <ControlGroup>
      <Slider label="// ACTIONS AT B" min={2} max={30} step={1} value={nB} onChange={setNB} tone="violet"
        help="How many actions the B state offers, all with the same N(-0.1, σ²) reward. The more there are, the higher the max of their noisy estimates climbs — so maximization bias grows with the number of actions. Rebuilds the run." />
      <Slider label="// REWARD NOISE σ" min={0.1} max={2} step={0.1} value={sigma} onChange={setSigma}
        help="Standard deviation of B's rewards. Bias comes from noise in the estimates, so more noise = more overestimation of max_a Q(B,a) = stronger pull toward the wrong LEFT action." />
      <Slider label="// EXPLORATION ε" min={0.02} max={0.4} step={0.02} value={eps} onChange={setEps}
        help="Random-action rate. Even an optimal agent picks LEFT ε/2 of the time by chance — that dashed line is the floor both methods should approach." />
      <Slider label="// SPEED" min={4} max={120} value={speed} onChange={setSpeed} suffix=" ep/s"
        help="Episodes per second across all parallel runs. Visual pacing only." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setRunning(r => !r)} primary tone="violet">{running ? "PAUSE" : "TRAIN"}</DemoButton>
        <DemoButton onClick={reset}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="EPISODE" value={ep} accent="var(--dim)" />
        <StatReadout label="OPTIMAL" value={Math.round(eps / 2 * 100) + "%"} accent="#cbd5e1" />
        <StatReadout label="Q-LEARN % LEFT" value={lq + "%"} accent="#f87171" />
        <StatReadout label="DOUBLE-Q % LEFT" value={ld + "%"} accent="#34d399" />
      </div>
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Going RIGHT from A is optimal — it returns 0, while every action at B averages
        −0.1. Yet plain <b>Q-learning</b> (red) chooses the wrong LEFT action far more
        than the {Math.round(eps / 2 * 100)}% an optimal explorer would, especially
        early. The culprit is <b>maximization bias</b>: Q-learning bootstraps off{" "}
        <i>maxₐ Q(B,a)</i>, and because those estimates are noisy, their max is
        systematically too high. The bars show it directly — Q-learning's estimated
        value of LEFT sits well <i>above</i> zero even though the truth is −0.1.
      </DemoP>
      <DemoP>
        <b>Double Q-learning</b> (green) keeps two value tables and uses one to <i>pick</i>{" "}
        the best action and the other to <i>evaluate</i> it. Since the noise in the two
        tables is independent, the action that looks best in one isn't systematically
        overvalued by the other, and the bias cancels — its LEFT estimate hugs −0.1 and
        it quickly settles to near the optimal floor. Add more actions at B or crank the
        reward noise and watch the red curve balloon while green holds.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Maximization bias is a quiet but pervasive flaw: any time you both select and
        evaluate with the same noisy max — Q-learning, value estimates, even "pick the
        best of N validation runs" — you overestimate. The double-estimator trick is the
        general fix. In deep RL it became <b>Double DQN</b>, which uses the online
        network to choose the action and the target network to value it, a one-line
        change to{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/dqn/`} style={{ color: "#a855f7" }}>DQN</a>{" "}
        that markedly improves Atari scores.
      </DemoP>
      <DemoP>
        This is the cautionary footnote to ordinary{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/gridworld-rl/`} style={{ color: "#a855f7" }}>Q-learning</a>{" "}
        and the off-policy max in{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/sarsa-vs-qlearning/`} style={{ color: "#a855f7" }}>SARSA
        vs Q-learning</a>: the very maximization that makes Q-learning learn the optimal
        policy off-policy is also what biases it. The same "optimizer's curse" shows up
        in model selection and in bandits — it's why honest evaluation needs held-out
        data the selection step never touched.
      </DemoP>
    </>
  );

  return (
    <DemoLayout topic="REINFORCEMENT LEARNING" title="Double Q-Learning"
      subtitle="Selecting and evaluating with the same noisy max overestimates — so Q-learning prefers a losing action. Two decoupled estimators cancel the bias."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/reinforcement-learning/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<DoubleQDemo />);
