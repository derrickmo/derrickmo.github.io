// demos/gae.jsx — Generalized Advantage Estimation: the bias/variance dial that
// powers modern policy-gradient methods (Schulman et al., 2016).
//
// GAE estimates the advantage as an exponentially-weighted sum of TD residuals:
//   Â_t = Σ_l (γλ)^l δ_{t+l},   δ_l = r_l + γ V(s_{l+1}) - V(s_l).
// λ=0 is the one-step TD advantage δ_t (low variance, but biased through the
// imperfect critic it bootstraps on); λ=1 is the Monte-Carlo advantage
// G_t - V(s_t) (unbiased, but high variance from summing all the noisy rewards).
//
// For a fixed on-policy trajectory the *true* advantage is zero (the value
// function already accounts for expected return), so we can get both quantities
// in CLOSED FORM — nothing is sampled:
//   bias(λ)     = | Σ_l (γλ)^l (γ e_{l+1} - e_l) |   (e = critic error per state)
//   variance(λ) = σ² Σ_l (γλ)^{2l}                    (σ = reward noise)
//   MSE(λ)      = bias(λ)² + variance(λ)              (U-shaped — an interior optimum)
// Lower λ bootstraps more through the wrong critic (more bias); higher λ sums more
// noisy rewards (more variance). A worse critic pushes the best λ toward 1.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect, useMemo: _useMemo } = React;
const {
  DemoLayout, DemoP, Slider, StatReadout, ControlGroup, Legend,
} = window;

const CW = 320, CH = 230;

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
// fixed per-state critic-error pattern in [-1,1], terminal error 0
function errorPattern(L, seed) {
  const rand = rng(seed), e = new Array(L + 1);
  for (let i = 0; i < L; i++) e[i] = rand() * 2 - 1;
  e[L] = 0;
  return e;
}

function GAEDemo() {
  const cvRef = _useRef(null);
  const [lambda, setLambda] = _useState(0.95);
  const [critErr, setCritErr] = _useState(0.6);
  const [sigma, setSigma] = _useState(1.0);
  const [gamma, setGamma] = _useState(0.97);
  const [L, setL] = _useState(20);

  const pat = _useMemo(() => errorPattern(L, 4242), [L]);

  function stats(lam) {
    let bias = 0, variance = 0;
    for (let l = 0; l < L; l++) {
      const gl = Math.pow(gamma * lam, l);
      bias += gl * (gamma * critErr * pat[l + 1] - critErr * pat[l]);
      variance += Math.pow(gamma * lam, 2 * l) * sigma * sigma;
    }
    return { bias: Math.abs(bias), variance };
  }

  const cur = _useMemo(() => stats(lambda), [lambda, critErr, sigma, gamma, L, pat]);
  const curMSE = cur.bias * cur.bias + cur.variance;

  // optimal lambda over a grid
  const optLam = _useMemo(() => {
    let best = 0, bestMSE = Infinity;
    for (let i = 0; i <= 100; i++) { const lam = i / 100; const s = stats(lam); const m = s.bias * s.bias + s.variance; if (m < bestMSE) { bestMSE = m; best = lam; } }
    return best;
    /* eslint-disable-next-line */
  }, [critErr, sigma, gamma, L, pat]);

  _useEffect(() => {
    const ctx = cvRef.current.getContext("2d");
    ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = "#0b1530"; ctx.fillRect(0, 0, CW, CH);

    // ── top: bias^2, variance, MSE vs lambda ──
    const padL = 34, padR = 10, ty0 = 16, ty1 = 140;
    // y-scale: max MSE over the grid
    let ymax = 1e-6; const grid = [];
    for (let i = 0; i <= 120; i++) { const lam = i / 120; const s = stats(lam); const b2 = s.bias * s.bias, mse = b2 + s.variance; grid.push({ lam, b2, v: s.variance, mse }); ymax = Math.max(ymax, mse); }
    ymax *= 1.08;
    const X = lam => padL + lam * (CW - padL - padR);
    const Y = v => ty1 - (v / ymax) * (ty1 - ty0);
    ctx.strokeStyle = "rgba(148,163,184,0.18)";
    for (let g = 0; g <= 4; g++) { const yy = ty0 + (g / 4) * (ty1 - ty0); ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(CW - padR, yy); ctx.stroke(); }
    ctx.fillStyle = "#94a3b8"; ctx.font = "8px monospace"; ctx.textAlign = "left"; ctx.fillText("error vs λ  (bias², variance, MSE)", padL, ty0 - 5);
    ctx.textAlign = "center"; ctx.fillText("λ=0 (TD)", X(0.06), ty1 + 10); ctx.fillText("λ=1 (MC)", X(0.94), ty1 + 10);
    const curve = (key, col, w) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); grid.forEach((p, i) => { const x = X(p.lam), y = Y(p[key]); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }); ctx.stroke(); };
    curve("b2", "#f87171", 1.6);
    curve("v", "#60a5fa", 1.6);
    curve("mse", "#a855f7", 2.4);
    // optimal lambda marker
    ctx.strokeStyle = "rgba(52,211,153,0.6)"; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(X(optLam), ty0); ctx.lineTo(X(optLam), ty1); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#34d399"; ctx.textAlign = "center"; ctx.fillText("λ*=" + optLam.toFixed(2), X(optLam), ty0 + 8);
    // current lambda marker
    ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X(lambda), ty0); ctx.lineTo(X(lambda), ty1); ctx.stroke();
    ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(X(lambda), Y(curMSE), 4, 0, Math.PI * 2); ctx.fill();

    // ── bottom: weighting kernel (γλ)^l ──
    const ky0 = 168, ky1 = CH - 14, kx0 = 34, kx1 = CW - 10;
    ctx.fillStyle = "#94a3b8"; ctx.textAlign = "left"; ctx.fillText("credit weight on TD residual δ at step l:  (γλ)^l", kx0, ky0 - 5);
    const bw = (kx1 - kx0) / L;
    for (let l = 0; l < L; l++) {
      const w = Math.pow(gamma * lambda, l);
      const h = w * (ky1 - ky0);
      ctx.fillStyle = "#a855f7"; ctx.fillRect(kx0 + l * bw + 0.5, ky1 - h, bw - 1, h);
    }
    ctx.strokeStyle = "rgba(148,163,184,0.3)"; ctx.beginPath(); ctx.moveTo(kx0, ky1); ctx.lineTo(kx1, ky1); ctx.stroke();
    ctx.fillStyle = "#64748b"; ctx.textAlign = "left"; ctx.fillText("l=0", kx0, CH - 3); ctx.textAlign = "right"; ctx.fillText("l=" + (L - 1), kx1, CH - 3);
  }, [lambda, critErr, sigma, gamma, L, pat, curMSE, optLam]);

  const stage = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <canvas ref={cvRef} width={CW} height={CH}
        style={{ width: CW * 1.5, maxWidth: "100%", borderRadius: 6, border: "1px solid var(--border)", background: "#0b1530" }} />
      <Legend items={[
        { label: "bias²", color: "#f87171" },
        { label: "variance", color: "#60a5fa" },
        { label: "MSE", color: "#a855f7" },
        { label: "optimal λ*", color: "#34d399" },
      ]} />
    </div>
  );

  const controls = (
    <ControlGroup>
      <Slider label="// GAE λ" min={0} max={1} step={0.01} value={lambda} onChange={setLambda} tone="violet"
        help="The bias/variance dial. λ=0 uses only the one-step TD residual (low variance, but trusts the imperfect critic — biased). λ=1 sums the whole trajectory (unbiased, but high variance). The gold dot is your current MSE on the curve." />
      <Slider label="// CRITIC ERROR" min={0} max={1.5} step={0.05} value={critErr} onChange={setCritErr}
        help="How wrong the value function is. Bias comes entirely from bootstrapping through this error, so a worse critic inflates the bias² curve and pushes the optimal λ* toward 1 (Monte Carlo, which doesn't trust the critic)." />
      <Slider label="// REWARD NOISE σ" min={0.1} max={2.5} step={0.1} value={sigma} onChange={setSigma}
        help="Standard deviation of the stochastic rewards. Variance grows with σ and with λ (more rewards summed), so more reward noise pushes the optimal λ* toward 0." />
      <Slider label="// DISCOUNT γ" min={0.8} max={0.995} step={0.005} value={gamma} onChange={setGamma} tone="blue"
        help="Discount factor. It shrinks the (γλ)^l weighting and the effective horizon GAE looks over." />
      <Slider label="// HORIZON" min={5} max={40} step={1} value={L} onChange={setL} tone="blue"
        help="Trajectory length. A longer horizon gives high-λ estimates more noisy rewards to accumulate." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="BIAS" value={cur.bias.toFixed(2)} accent="#f87171" />
        <StatReadout label="STD DEV" value={Math.sqrt(cur.variance).toFixed(2)} accent="#60a5fa" />
        <StatReadout label="MSE @ λ" value={curMSE.toFixed(2)} accent="#a855f7" />
        <StatReadout label="OPTIMAL λ*" value={optLam.toFixed(2)} accent="#34d399" />
      </div>
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Policy-gradient methods need an estimate of the <b>advantage</b> — how much
        better an action was than the critic expected. GAE forms it as a
        discounted sum of TD residuals, with <b>λ</b> controlling how far down the
        trajectory the credit reaches (the violet bars). The whole method is one
        bias/variance dial: the curves above are exact, not sampled.
      </DemoP>
      <DemoP>
        At <b>λ=0</b> you trust the critic completely — only the one-step residual —
        so variance is tiny but every bit of the critic's error leaks straight into
        the estimate (high bias²). At <b>λ=1</b> you ignore the critic and sum the
        real rewards — unbiased, but the noise piles up (high variance). The
        <b> MSE</b> is U-shaped and the best λ sits in between. Now turn up the
        <b> critic error</b>: bias² balloons and λ* slides toward 1. Turn up the
        <b> reward noise</b> instead and λ* slides toward 0. That trade is exactly
        what you're tuning when you set λ≈0.95 in a PPO run.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        GAE is eligibility traces aimed at advantages: the (γλ)^l weighting is the
        same geometric credit assignment as{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/td-lambda/`} style={{ color: "#a855f7" }}>TD(λ)</a>,
        but applied to the residuals that drive a policy update rather than to value
        prediction. It's the advantage estimator inside virtually every modern
        actor-critic method, which is why it lives right next to{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/actor-critic/`} style={{ color: "#a855f7" }}>actor-critic</a>{" "}
        and <a href={`${window.__DM_BASE || "../../"}visualize/ppo/`} style={{ color: "#a855f7" }}>PPO</a>.
      </DemoP>
      <DemoP>
        The takeaway generalizes far beyond RL: <b>bootstrapping trades variance for
        bias</b>. Leaning on a learned estimate (low λ) is cheap and stable but
        inherits that estimate's mistakes; using raw long-horizon samples (high λ)
        is honest but noisy. Good defaults like λ=0.95 keep most of the
        variance reduction while letting the real returns correct a flawed critic —
        the same instinct behind n-step returns and the bias/variance decomposition
        elsewhere in ML.
      </DemoP>
    </>
  );

  return (
    <DemoLayout title="Generalized Advantage Estimation"
      subtitle="The one knob, λ, that trades bias against variance in the advantage estimate driving every modern policy gradient — with a critic error that shifts the sweet spot."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/reinforcement-learning/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<GAEDemo />);
