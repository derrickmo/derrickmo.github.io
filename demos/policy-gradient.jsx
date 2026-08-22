// demos/policy-gradient.jsx — REINFORCE on a continuous-action bandit.
//
// State: none. Action: a scalar a in R. Reward: r = -(a - target)^2  (a smooth
// concave bowl peaking at the hidden target). Policy: a Gaussian with learned
// mean mu and learned (log-)sigma. Per step:
//   - sample N actions ~ N(mu, sigma^2)
//   - compute rewards
//   - REINFORCE update: theta <- theta + lr * mean( (r - baseline) * dlogpi/dtheta )
//     for mu: dlogpi/dmu = (a - mu)/sigma^2
//     for log_sigma: dlogpi/dlog_sigma = ((a - mu)^2 / sigma^2) - 1
//   - baseline = running mean reward (variance reduction)
//
// The visual is a number line with the target, the current Gaussian policy,
// sampled actions for the latest step, and a reward curve over time. Watch
// mu converge to the target and sigma collapse — the textbook REINFORCE arc.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup, Toggle,
} = window;

const W = 540, H = 460;
const X_MIN = -3, X_MAX = 3;
const PAD = 24;
function xOf(a) { return PAD + ((a - X_MIN) / (X_MAX - X_MIN)) * (W - 2 * PAD); }

function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

function PolicyGradientDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const stateRef = _useRef({ mu: 0, logSigma: Math.log(1.0), baseline: 0, hist: [], samples: [], rewards: [], step: 0 });
  const rafRef = _useRef(0);
  const [target, setTarget] = _useState(1.2);
  const [lr, setLr] = _useState(0.06);
  const [batch, setBatch] = _useState(16);
  const [useBaseline, setUseBaseline] = _useState(true);
  const [running, setRunning] = _useState(false);
  const [, force] = _useState(0);

  function reset() {
    stateRef.current = { mu: 0, logSigma: Math.log(1.0), baseline: 0, hist: [], samples: [], rewards: [], step: 0 };
    force(x => x + 1);
  }

  function reward(a) { return -(a - target) * (a - target); }

  function trainStep() {
    const s = stateRef.current;
    const sigma = Math.exp(s.logSigma);
    const sigma2 = sigma * sigma;
    const actions = [];
    const rs = [];
    for (let i = 0; i < batch; i++) {
      const a = s.mu + sigma * gauss();
      actions.push(a);
      rs.push(reward(a));
    }
    // baseline = running mean (EMA)
    const meanR = rs.reduce((q, x) => q + x, 0) / batch;
    if (useBaseline) s.baseline = 0.9 * s.baseline + 0.1 * meanR;
    const b = useBaseline ? s.baseline : 0;

    // grads
    let gMu = 0, gLog = 0;
    for (let i = 0; i < batch; i++) {
      const adv = rs[i] - b;
      gMu += adv * (actions[i] - s.mu) / sigma2;
      gLog += adv * (((actions[i] - s.mu) ** 2) / sigma2 - 1);
    }
    gMu /= batch; gLog /= batch;

    // gradient ascent
    s.mu += lr * gMu;
    s.logSigma += lr * gLog;
    // clamp logSigma so sigma stays in [0.05, 3]
    s.logSigma = Math.max(Math.log(0.05), Math.min(Math.log(3), s.logSigma));

    s.samples = actions;
    s.rewards = rs;
    s.hist.push({ mu: s.mu, sigma: Math.exp(s.logSigma), meanR });
    if (s.hist.length > 240) s.hist.shift();
    s.step += 1;
  }

  function pdf(a) {
    const s = stateRef.current;
    const sigma = Math.exp(s.logSigma);
    const z = (a - s.mu) / sigma;
    return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const s = stateRef.current;

    // ── Top panel: policy + reward curve over actions ──
    const topY = 30, topH = 200;
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono";
    ctx.fillText("ACTION SPACE  ·  policy pdf (yellow) and reward landscape (violet)", PAD, topY - 8);
    ctx.strokeStyle = "rgba(96,165,250,0.18)";
    ctx.strokeRect(PAD, topY, W - 2 * PAD, topH);

    // Reward landscape (filled curve)
    ctx.fillStyle = "rgba(192,132,252,0.20)";
    ctx.beginPath();
    ctx.moveTo(PAD, topY + topH);
    for (let i = 0; i <= 120; i++) {
      const a = X_MIN + (i / 120) * (X_MAX - X_MIN);
      const r = reward(a); // r in [-(X_MAX-target)^2, 0]
      const norm = Math.max(0, 1 + r / 10); // 0..1
      const y = topY + topH - norm * (topH - 6);
      ctx.lineTo(xOf(a), y);
    }
    ctx.lineTo(W - PAD, topY + topH); ctx.closePath(); ctx.fill();

    // Policy pdf (line)
    ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2;
    ctx.beginPath();
    const sigma = Math.exp(s.logSigma);
    const peak = pdf(s.mu);
    for (let i = 0; i <= 120; i++) {
      const a = X_MIN + (i / 120) * (X_MAX - X_MIN);
      const p = pdf(a);
      const y = topY + topH - (p / Math.max(peak, 0.05)) * (topH - 6);
      if (i === 0) ctx.moveTo(xOf(a), y); else ctx.lineTo(xOf(a), y);
    }
    ctx.stroke();

    // Target marker
    ctx.strokeStyle = "#34d399"; ctx.lineWidth = 1.4; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(xOf(target), topY); ctx.lineTo(xOf(target), topY + topH); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#34d399"; ctx.font = "10px JetBrains Mono";
    ctx.fillText("target=" + target.toFixed(2), xOf(target) + 4, topY + 12);

    // mu marker
    ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(xOf(s.mu), topY); ctx.lineTo(xOf(s.mu), topY + topH); ctx.stroke();
    ctx.fillStyle = "#fbbf24";
    ctx.fillText("mu=" + s.mu.toFixed(2), xOf(s.mu) + 4, topY + topH - 4);

    // Sampled actions
    for (let i = 0; i < s.samples.length; i++) {
      const a = s.samples[i];
      ctx.fillStyle = "rgba(96,165,250,0.85)";
      ctx.beginPath();
      ctx.arc(xOf(a), topY + topH - 8, 2.5, 0, Math.PI * 2); ctx.fill();
    }

    // ── Bottom panel: reward over time ──
    const botY = 270, botH = 160;
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("LEARNING CURVE  ·  mean batch reward (closer to 0 = better)", PAD, botY - 8);
    ctx.strokeStyle = "rgba(96,165,250,0.18)";
    ctx.strokeRect(PAD, botY, W - 2 * PAD, botH);

    if (s.hist.length > 1) {
      const minR = Math.min(...s.hist.map(h => h.meanR), -0.5);
      const maxR = 0.1;
      ctx.strokeStyle = "#60a5fa"; ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let i = 0; i < s.hist.length; i++) {
        const x = PAD + (i / Math.max(1, s.hist.length - 1)) * (W - 2 * PAD);
        const y = botY + botH - ((s.hist[i].meanR - minR) / (maxR - minR)) * (botH - 6);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // sigma over time (faint violet)
      ctx.strokeStyle = "rgba(192,132,252,0.6)"; ctx.lineWidth = 1.4;
      const sMax = Math.max(...s.hist.map(h => h.sigma), 1.2);
      ctx.beginPath();
      for (let i = 0; i < s.hist.length; i++) {
        const x = PAD + (i / Math.max(1, s.hist.length - 1)) * (W - 2 * PAD);
        const y = botY + botH - (s.hist[i].sigma / sMax) * (botH - 6);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Legend
      ctx.fillStyle = "#60a5fa"; ctx.fillText("mean reward", PAD + 8, botY + 14);
      ctx.fillStyle = "rgba(192,132,252,0.8)"; ctx.fillText("sigma", PAD + 120, botY + 14);
    }
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
    // eslint-disable-next-line
  });

  _useEffect(() => {
    if (!running) return;
    const loop = () => {
      trainStep();
      force(x => x + 1);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line
  }, [running, target, lr, batch, useBaseline]);

  const s = stateRef.current;
  const sigma = Math.exp(s.logSigma);
  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// TARGET" min={-2.5} max={2.5} step={0.05} value={target} onChange={setTarget} tone="violet"
        help="The hidden action that maximizes reward (reward = -(a - target)^2). Move it mid-training and watch the policy chase the new optimum — that's RL adapting to a changing reward landscape." />
      <Slider label="// LR" min={0.005} max={0.15} step={0.005} value={lr} onChange={setLr}
        help="Policy-gradient step size. Too small → painfully slow convergence; too large → mu overshoots and oscillates, sigma can collapse before mu lands." />
      <Slider label="// BATCH" min={4} max={64} step={4} value={batch} onChange={setBatch}
        help="Number of action samples per gradient step. Larger batch = lower-variance gradient = more reliable but slower update. The variance-vs-throughput tradeoff at the heart of REINFORCE." />
      <Toggle label="// BASELINE (variance reduction)" checked={useBaseline} onChange={setUseBaseline}
        help="Subtract a running-mean baseline from each return before computing the policy gradient. Doesn't change the gradient in expectation, but slashes variance — turn it OFF and watch mu wobble much more wildly." />
      <DemoButton onClick={() => setRunning(r => !r)} primary>{running ? "PAUSE" : "TRAIN"}</DemoButton>
      <DemoButton onClick={reset}>RESET</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="STEP" value={s.step} />
        <StatReadout label="mu" value={s.mu.toFixed(2)} accent="#fbbf24" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="sigma" value={sigma.toFixed(2)} accent="#c084fc" />
        <StatReadout label="mean R" value={(s.hist.length ? s.hist[s.hist.length - 1].meanR.toFixed(2) : "—")} />
      </div>
      <Legend items={[
        { color: "#fbbf24", label: "policy" },
        { color: "#c084fc", label: "reward" },
        { color: "#60a5fa", label: "samples" },
        { color: "#34d399", label: "target" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        The agent doesn't know the target. It samples actions from a Gaussian
        policy <i>π(a) = N(μ, σ²)</i>, observes the reward <i>r = -(a - target)²</i>,
        and nudges <i>μ</i> and <i>σ</i> to make high-reward actions more likely.
        That's REINFORCE in its purest form: <i>θ ← θ + α · ∇ log π(a) · r</i>.
        Mathematically, the mu gradient is the centered sample <i>(a - μ)/σ²</i>
        scaled by the reward — actions <i>better than baseline</i> pull mu toward
        them; worse-than-baseline actions push mu away.
      </DemoP>
      <DemoP>
        Watch sigma. Early on it stays wide (the policy explores). As mu locks
        onto the target, the high-reward zone narrows, and the variance-update
        term <i>((a - μ)²/σ² - 1)</i> drives sigma down — the policy commits.
        Turn the BASELINE toggle off to see the same training run with ~3-4x
        more noise: every batch's gradient gets dragged around by the absolute
        scale of reward, not just its variance from the running mean.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Policy gradient is the engine behind every continuous-control RL system
        from OpenAI Five to AlphaStar to modern RLHF. The version you're touching
        here — REINFORCE — is from 1992; everything since (TRPO, PPO, A2C, SAC, GRPO)
        is a variance-reduction trick on top of the same expectation. PPO clips
        the policy update to a trust region; SAC adds an entropy bonus to keep
        sigma from collapsing; GRPO (used in DeepSeek-R1) replaces the value
        baseline with a group-relative one.
      </DemoP>
      <DemoP>
        For LLMs, the action is the token, the policy is the model's softmax, and
        the reward comes from a reward model trained on human preferences. That's
        RLHF. The same gradient you're seeing here — push up trajectories that beat
        the baseline, push down trajectories that don't — is what aligns ChatGPT,
        Claude, and Llama-Instruct. The baseline matters even more there:
        token-level rewards are tiny and noisy, so without it training never moves.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Policy Gradient — REINFORCE"
      subtitle="A Gaussian policy finds the hidden target by sampling, scoring, and updating. The simplest possible RL — and a parent to PPO and RLHF."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/reinforcement-learning/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<PolicyGradientDemo />);
