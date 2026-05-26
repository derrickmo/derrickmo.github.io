// demos/bayes.jsx — Bayesian updating, live. A Beta prior over the bias of a
// coin meets a Bernoulli likelihood (the heads / tails you flip in the
// browser) and produces a Beta posterior — that's it, conjugate updating with
// real numbers. Drag the prior with the sliders, flip coins, watch the
// posterior tighten around the true rate.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 460, H = 320;
const PAD_L = 44, PAD_R = 14, PAD_T = 18, PAD_B = 30;
const PW = W - PAD_L - PAD_R, PH = H - PAD_T - PAD_B;

// log Gamma — Lanczos, good enough for a, b in [0.5, ~200].
function lgamma(x) {
  const g = 7;
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}
function logBetaPdf(p, a, b) {
  if (p <= 0 || p >= 1) return -Infinity;
  const logB = lgamma(a) + lgamma(b) - lgamma(a + b);
  return (a - 1) * Math.log(p) + (b - 1) * Math.log(1 - p) - logB;
}
function betaCurve(a, b, n = 200) {
  const ys = new Array(n);
  let max = 0;
  for (let i = 0; i < n; i++) {
    const p = (i + 0.5) / n;
    const y = Math.exp(logBetaPdf(p, a, b));
    ys[i] = Number.isFinite(y) ? y : 0;
    if (ys[i] > max) max = ys[i];
  }
  return { ys, max };
}

function BayesDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [alpha0, setAlpha0] = _useState(2);   // prior alpha
  const [beta0, setBeta0]   = _useState(2);   // prior beta
  const [trueP, setTrueP]   = _useState(0.65); // hidden true bias
  const [heads, setHeads]   = _useState(0);
  const [tails, setTails]   = _useState(0);

  const aN = alpha0 + heads;
  const bN = beta0 + tails;
  const meanPrior = alpha0 / (alpha0 + beta0);
  const meanPost  = aN / (aN + bN);

  function flip(n = 1) {
    let h = 0, t = 0;
    for (let i = 0; i < n; i++) (Math.random() < trueP ? h++ : t++);
    setHeads(heads + h); setTails(tails + t);
  }
  function reset() { setHeads(0); setTails(0); }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const prior = betaCurve(alpha0, beta0);
    const post  = betaCurve(aN, bN);
    const yMax = Math.max(prior.max, post.max, 1) * 1.08;

    // axes
    ctx.strokeStyle = "rgba(148,163,184,0.25)"; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD_L, PAD_T); ctx.lineTo(PAD_L, PAD_T + PH);
    ctx.lineTo(PAD_L + PW, PAD_T + PH); ctx.stroke();
    ctx.fillStyle = "rgba(148,163,184,0.7)";
    ctx.font = "10px 'JetBrains Mono', monospace";
    for (const p of [0, 0.25, 0.5, 0.75, 1]) {
      const x = PAD_L + p * PW;
      ctx.fillText(p.toFixed(2), x - 10, PAD_T + PH + 16);
      ctx.strokeStyle = "rgba(148,163,184,0.10)"; ctx.beginPath();
      ctx.moveTo(x, PAD_T); ctx.lineTo(x, PAD_T + PH); ctx.stroke();
    }
    ctx.fillText("p (bias)", PAD_L + PW - 50, PAD_T + PH + 16);

    // true rate marker
    const tx = PAD_L + trueP * PW;
    ctx.strokeStyle = "#fbbf24"; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(tx, PAD_T); ctx.lineTo(tx, PAD_T + PH); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#fbbf24"; ctx.fillText("true p", tx + 4, PAD_T + 10);

    // helper to plot a curve
    function plot(curve, color, fill) {
      const n = curve.ys.length;
      const pts = [];
      for (let i = 0; i < n; i++) {
        const x = PAD_L + ((i + 0.5) / n) * PW;
        const y = PAD_T + PH - (curve.ys[i] / yMax) * PH;
        pts.push([x, y]);
      }
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
      if (fill) {
        ctx.lineTo(PAD_L + PW, PAD_T + PH); ctx.lineTo(PAD_L, PAD_T + PH); ctx.closePath();
        ctx.fillStyle = fill; ctx.fill();
      }
    }
    plot(prior, "rgba(168,85,247,0.9)", "rgba(168,85,247,0.10)");
    plot(post,  "rgba(96,165,250,1.0)", "rgba(96,165,250,0.16)");
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  }, []);
  _useEffect(() => { draw(); /* eslint-disable-next-line */ }, [alpha0, beta0, trueP, heads, tails]);

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// PRIOR ALPHA" min={0.5} max={20} step={0.1} value={alpha0} onChange={setAlpha0} tone="violet"
        help="Prior pseudo-count of heads. Higher = the prior already 'believes' the coin tends heads. Conjugate to a Bernoulli — the posterior is also a Beta." />
      <Slider label="// PRIOR BETA" min={0.5} max={20} step={0.1} value={beta0} onChange={setBeta0} tone="violet"
        help="Prior pseudo-count of tails. (Alpha-1, Beta-1) are the effective prior 'observations' baked in before any flip." />
      <Slider label="// TRUE BIAS" min={0.05} max={0.95} step={0.01} value={trueP} onChange={setTrueP}
        help="The hidden true probability of heads — the world. The posterior should home in on this as you flip more coins." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <DemoButton onClick={() => flip(1)}>FLIP 1</DemoButton>
        <DemoButton onClick={() => flip(10)}>FLIP 10</DemoButton>
        <DemoButton onClick={() => flip(100)} primary>FLIP 100</DemoButton>
        <DemoButton onClick={reset}>RESET FLIPS</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="HEADS / TAILS" value={`${heads} / ${tails}`} />
        <StatReadout label="POST. MEAN" value={meanPost.toFixed(3)} accent="#60a5fa" />
      </div>
      <Legend items={[
        { color: "#a855f7", label: "PRIOR · Beta(α, β)" },
        { color: "#60a5fa", label: "POSTERIOR · Beta(α+h, β+t)" },
        { color: "#fbbf24", label: "TRUE p" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        A coin has some hidden bias <i>p</i> = P(heads). You don't know it. So
        you write down your belief about it as a probability distribution over
        all the values <i>p</i> could take — that's the <b style={{ color: "#c084fc" }}>prior</b>,
        a Beta(α, β). Each flip updates that belief by Bayes' rule:
        posterior ∝ prior × likelihood. Beta is <b>conjugate</b> to the
        Bernoulli, so the math is almost embarrassingly clean — the posterior
        is just Beta(α + heads, β + tails). The two-parameter prior is a kind
        of "pseudo-counts": Beta(2, 2) is as if you'd already seen one heads
        and one tails before this experiment.
      </DemoP>
      <DemoP>
        Move the sliders, flip a few coins, then flip 100. The
        <b style={{ color: "#60a5fa" }}> posterior</b> (blue) tightens around
        the <b style={{ color: "#fbbf24" }}>true p</b> (yellow) regardless of
        how off your prior was — given enough data, the likelihood drowns out
        the prior. Push the prior to Beta(15, 1) and try a few flips: a strong
        prior is hard to dislodge with a small sample. That's Bayesian updating
        in one picture.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Conjugate Beta-Bernoulli is the toy version of every Bayesian update in
        production. A/B test conversion rates? You're updating Beta posteriors
        over each variant's true rate and asking "is one's posterior cleanly
        above the other?" Thompson sampling for multi-armed bandits and
        contextual bandits? Sample one draw from each arm's Beta posterior and
        pull the arg-max — that one trick gives you regret-optimal exploration.
        Spam filters, recommender CTR estimates, click-through models — all
        Beta posteriors under the hood.
      </DemoP>
      <DemoP>
        The deeper idea is bigger than coins: <i>belief is a distribution, not
        a point</i>. That's the move that separates Bayesian inference from
        maximum-likelihood, and it's what powers MCMC, variational inference,
        Bayesian neural networks, and the modern uncertainty / calibration
        toolkit. Every time a model says "0.71 with 95% CI [0.63, 0.79]"
        instead of "0.71," there's a posterior somewhere doing the work.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="FOUNDATIONS" title="Bayes Updater"
      subtitle="A Beta prior meets Bernoulli flips — watch the posterior settle on the truth, live."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/foundations/`}
      tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<BayesDemo />);
