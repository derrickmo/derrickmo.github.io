// demos/conjugate-updating.jsx — watch a prior turn into a posterior as data
// streams in, for three conjugate pairs (Beta-Bernoulli, Normal-Normal with
// known variance, Gamma-Poisson). Real closed-form conjugate updates: the
// posterior stays in the same family, so each observation is just an arithmetic
// bump to the hyperparameters. Densities are exact (lgamma-normalized).

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 380;

function gaussRand() { let u = 0, v = 0; while (u === 0) u = Math.random(); while (v === 0) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function poissonSample(lam) { const Lp = Math.exp(-lam); let k = 0, p = 1; do { k++; p *= Math.random(); } while (p > Lp); return k - 1; }
// Lanczos lgamma
const LG = [676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
function lgamma(z) {
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
  z -= 1; let x = 0.99999999999980993; for (let i = 0; i < LG.length; i++) x += LG[i] / (z + i + 1);
  const t = z + LG.length - 0.5; return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
const betaPdf = (x, a, b) => (x <= 0 || x >= 1) ? 0 : Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - (lgamma(a) + lgamma(b) - lgamma(a + b)));
const gammaPdf = (x, k, r) => x <= 0 ? 0 : Math.exp(k * Math.log(r) - lgamma(k) + (k - 1) * Math.log(x) - r * x);
const normalPdf = (x, m, s) => Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));

const FAMILIES = {
  beta: {
    label: "Beta-Bernoulli", paramName: "theta = coin bias", domain: [0, 1], trueDomain: [0.05, 0.95], trueDefault: 0.7,
    prior: (str) => ({ a: str, b: str }),
    gen(theta) { return Math.random() < theta ? 1 : 0; },
    update(p, x) { p.a += x; p.b += 1 - x; },
    pdf(v, p) { return betaPdf(v, p.a, p.b); },
    mean: (p) => p.a / (p.a + p.b),
    std(p) { const s = p.a + p.b; return Math.sqrt((p.a * p.b) / (s * s * (s + 1))); },
    obsLabel: (x) => x ? "H" : "T",
  },
  normal: {
    label: "Normal-Normal", paramName: "mu = unknown mean", domain: [-4, 4], trueDomain: [-2.5, 2.5], trueDefault: 1.2, dataStd: 1,
    prior(str) { return { m: 0, prec: str }; },
    gen(mu) { return mu + gaussRand() * this.dataStd; },
    update(p, x) { const dp = 1 / (this.dataStd * this.dataStd); const np = p.prec + dp; p.m = (p.m * p.prec + dp * x) / np; p.prec = np; },
    pdf(v, p) { return normalPdf(v, p.m, Math.sqrt(1 / p.prec)); },
    mean: (p) => p.m,
    std: (p) => Math.sqrt(1 / p.prec),
    obsLabel: (x) => x.toFixed(1),
  },
  gamma: {
    label: "Gamma-Poisson", paramName: "lambda = event rate", domain: [0, 8], trueDomain: [0.3, 6], trueDefault: 3,
    prior(str) { return { k: str, r: str }; },
    gen(lam) { return poissonSample(lam); },
    update(p, x) { p.k += x; p.r += 1; },
    pdf(v, p) { return gammaPdf(v, p.k, p.r); },
    mean: (p) => p.k / p.r,
    std(p) { return Math.sqrt(p.k) / p.r; },
    obsLabel: (x) => String(x),
  },
};

function ConjugateUpdatingDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const postRef = _useRef(null);
  const priorRef = _useRef(null);
  const recentRef = _useRef([]);
  const rafRef = _useRef(null);

  const [fam, setFam] = _useState("beta");
  const [strength, setStrength] = _useState(2);
  const [trueVal, setTrueVal] = _useState(FAMILIES.beta.trueDefault);
  const [speed, setSpeed] = _useState(2);
  const [running, setRunning] = _useState(false);
  const [n, setN] = _useState(0);
  const [, setTick] = _useState(0);

  const famRef = _useRef(fam), trueRef = _useRef(trueVal), speedRef = _useRef(speed);
  _useEffect(() => { trueRef.current = trueVal; }, [trueVal]);
  _useEffect(() => { speedRef.current = speed; }, [speed]);

  function resetRun() {
    const F = FAMILIES[famRef.current];
    priorRef.current = F.prior(strength); postRef.current = F.prior(strength);
    recentRef.current = []; setN(0); setTick(v => v + 1); draw();
  }

  function observe(count) {
    const F = FAMILIES[famRef.current];
    for (let i = 0; i < count; i++) { const x = F.gen(trueRef.current); F.update(postRef.current, x); recentRef.current.push(x); if (recentRef.current.length > 28) recentRef.current.shift(); }
    setN(v => v + count);
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const F = FAMILIES[famRef.current], [d0, d1] = F.domain;
    const x0 = 36, x1 = 510, topY = 28, botY = 286;
    const mapX = v => x0 + ((v - d0) / (d1 - d0)) * (x1 - x0);
    const G = 240;
    // compute densities + shared max
    const prior = [], post = []; let mx = 0;
    for (let i = 0; i <= G; i++) { const v = d0 + (i / G) * (d1 - d0); const pp = F.pdf(v, priorRef.current), qp = F.pdf(v, postRef.current); prior.push(pp); post.push(qp); if (pp > mx) mx = pp; if (qp > mx) mx = qp; }
    mx = mx || 1; const mapY = den => botY - Math.min(den / mx, 1) * (botY - topY);
    // axis
    ctx.strokeStyle = "rgba(255,255,255,0.14)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, botY); ctx.lineTo(x1, botY); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.font = "10px JetBrains Mono, monospace"; ctx.textAlign = "center";
    for (let g = 0; g <= 4; g++) { const v = d0 + (g / 4) * (d1 - d0); const px = mapX(v); ctx.fillText(v.toFixed(F.label === "Beta-Bernoulli" ? 2 : 1), px, botY + 16); }
    ctx.textAlign = "left"; ctx.fillText(F.paramName, x0, 16);
    // prior (dashed) + posterior (filled)
    ctx.strokeStyle = "rgba(148,163,184,0.7)"; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.beginPath();
    for (let i = 0; i <= G; i++) { const v = d0 + (i / G) * (d1 - d0); const px = mapX(v), py = mapY(prior[i]); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "rgba(168,85,247,0.18)"; ctx.strokeStyle = "#c084fc"; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(mapX(d0), botY);
    for (let i = 0; i <= G; i++) { const v = d0 + (i / G) * (d1 - d0); ctx.lineTo(mapX(v), mapY(post[i])); }
    ctx.lineTo(mapX(d1), botY); ctx.closePath(); ctx.fill();
    ctx.beginPath(); for (let i = 0; i <= G; i++) { const v = d0 + (i / G) * (d1 - d0); const px = mapX(v), py = mapY(post[i]); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke();
    // posterior mean +/- 2 std band
    const pm = F.mean(postRef.current), ps = F.std(postRef.current);
    ctx.strokeStyle = "rgba(192,132,252,0.6)"; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
    for (const b of [pm - 2 * ps, pm + 2 * ps]) { if (b > d0 && b < d1) { ctx.beginPath(); ctx.moveTo(mapX(b), topY); ctx.lineTo(mapX(b), botY); ctx.stroke(); } }
    ctx.setLineDash([]);
    // true value
    const tv = trueRef.current; ctx.strokeStyle = "#34d399"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mapX(tv), topY - 6); ctx.lineTo(mapX(tv), botY); ctx.stroke();
    ctx.fillStyle = "#34d399"; ctx.textAlign = "center"; ctx.fillText("true", mapX(tv), topY - 10); ctx.textAlign = "left";
    // recent observations stream
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillText("recent observations", x0, botY + 34);
    const rec = recentRef.current;
    rec.forEach((x, i) => {
      const px = x0 + i * 16, py = botY + 50;
      if (famRef.current === "beta") { ctx.fillStyle = x ? "#60a5fa" : "#475569"; ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#0a0e1a"; ctx.font = "8px JetBrains Mono"; ctx.textAlign = "center"; ctx.fillText(x ? "H" : "T", px, py + 3); ctx.textAlign = "left"; }
      else { ctx.fillStyle = "rgba(96,165,250,0.85)"; ctx.font = "9px JetBrains Mono"; ctx.textAlign = "center"; ctx.fillText(F.obsLabel(x), px + 4, py + 3); ctx.textAlign = "left"; }
    });
  }

  function handleRun() { if (running) { setRunning(false); return; } setRunning(true); }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    resetRun();
  }, []);
  _useEffect(() => { famRef.current = fam; setRunning(false); const F = FAMILIES[fam]; setTrueVal(F.trueDefault); trueRef.current = F.trueDefault; resetRun(); }, [fam]);
  _useEffect(() => { setRunning(false); resetRun(); }, [strength]);
  _useEffect(() => { draw(); }, [trueVal]);

  _useEffect(() => {
    if (!running) return;
    let alive = true;
    const loop = () => { if (!alive) return; observe(speedRef.current); draw(); rafRef.current = requestAnimationFrame(loop); };
    rafRef.current = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, [running]);

  const F = FAMILIES[fam], post = postRef.current;
  const pmean = post ? F.mean(post) : 0, pstd = post ? F.std(post) : 0;
  const stage = (<canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />);

  const controls = (
    <ControlGroup>
      <SegmentedControl label="// CONJUGATE FAMILY" tone="violet" value={fam} onChange={setFam}
        options={Object.entries(FAMILIES).map(([k, v]) => ({ value: k, label: v.label }))}
        help="The prior-likelihood pair. Beta-Bernoulli infers a coin's bias from H/T; Normal-Normal infers an unknown mean from real-valued samples; Gamma-Poisson infers an event rate from counts. In each, the posterior stays in the prior's family." />
      <Slider label="// PRIOR STRENGTH" min={0.5} max={30} step={0.5} value={strength} onChange={setStrength} tone="violet"
        help="How informative (stubborn) the prior is, in pseudo-observations. A weak prior is quickly overwhelmed by data; a strong one needs much more evidence to move." />
      <Slider label="// TRUE PARAMETER" min={F.trueDomain[0]} max={F.trueDomain[1]} step={0.05} value={trueVal} onChange={setTrueVal}
        help="The hidden value that generates the observations (green line). The posterior should concentrate around it as data accumulates." />
      <Slider label="// SPEED" min={1} max={20} value={speed} onChange={setSpeed} suffix=" obs/frame"
        help="Observations drawn per animation frame. Visual pacing only." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={handleRun} primary>{running ? "PAUSE" : "STREAM"}</DemoButton>
        <DemoButton onClick={() => { observe(1); draw(); }} disabled={running}>OBSERVE 1</DemoButton>
        <DemoButton onClick={() => { observe(10); draw(); }} disabled={running}>+10</DemoButton>
        <DemoButton onClick={resetRun}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="OBSERVATIONS" value={n} />
        <StatReadout label="TRUE VALUE" value={trueVal.toFixed(2)} accent="#34d399" />
        <StatReadout label="POSTERIOR MEAN" value={pmean.toFixed(3)} accent="var(--violet-lt)" />
        <StatReadout label="POSTERIOR SD" value={pstd.toFixed(3)} accent="var(--violet-lt)" />
      </div>
      <Legend items={[
        { color: "#94a3b8", label: "PRIOR" },
        { color: "#c084fc", label: "POSTERIOR" },
        { color: "#34d399", label: "TRUE VALUE" },
      ]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Bayes' rule says posterior ∝ prior × likelihood. For special <b>conjugate</b> pairs the
        posterior lands in the <i>same family</i> as the prior, so updating is just arithmetic on
        the hyperparameters — no integrals. A Beta prior plus a coin flip gives a Beta posterior
        (just add 1 to α for heads, β for tails); a Gaussian prior on a mean plus Gaussian data
        gives a Gaussian posterior; a Gamma prior plus a Poisson count gives a Gamma posterior.
      </DemoP>
      <DemoP>
        Stream observations and watch the violet posterior peel away from the gray prior, march
        toward the <span style={{ color: "#34d399" }}>true value</span>, and <b>sharpen</b> as
        evidence piles up (posterior SD shrinks like 1/√n). Crank <b>prior strength</b> up and the
        prior fights back — it takes far more data to move a confident prior, the formal version of
        "extraordinary claims require extraordinary evidence." With little data the prior dominates;
        with lots, the likelihood wins and the starting prior barely matters.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Conjugacy is why Bayesian methods were tractable before modern compute, and it is still
        everywhere: Beta-Bernoulli is the engine of <a href={`${window.__DM_BASE || "../../"}visualize/thompson-vs-ucb/`}>Thompson
        sampling</a> and Bayesian A/B testing, Gamma-Poisson models click and arrival rates, and the
        Normal-Normal update is exactly one step of a <a href={`${window.__DM_BASE || "../../"}visualize/kalman-filter/`}>Kalman
        filter</a>. The same precision-weighted average you see here — posterior mean is a blend of
        prior mean and data mean, weighted by their precisions — is the recurring motif of Bayesian inference.
      </DemoP>
      <DemoP>
        The honest limit: most real models are <i>not</i> conjugate, which is the whole reason
        <a href={`${window.__DM_BASE || "../../"}visualize/mcmc/`}> MCMC</a> and
        <a href={`${window.__DM_BASE || "../../"}visualize/variational-inference/`}> variational inference</a> exist —
        they approximate the posterior when you can't write it down. But the intuition transfers
        directly: data shrinks uncertainty, priors regularize, and the two combine in proportion to
        how much each is trusted. That mental model is worth more than any single formula.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      title="Conjugate Prior Updating"
      subtitle="Watch a prior become a posterior, one observation at a time - the closed-form heart of Bayesian inference."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/foundations/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="violet"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ConjugateUpdatingDemo />);
