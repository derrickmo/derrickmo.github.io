// demos/mle.jsx — maximum likelihood as a surface you can climb, and the fact that its
// summit is a statistic you already know. Benched through this file's own data (mulberry32,
// seed 4242, n=60): a 0.005 grid search over the surface puts the argmax at mu = 2.6950 /
// sigma = 1.2500 against sample statistics 2.6974 / 1.2480 — agreeing to 2.4e-3, which is
// half the grid step, i.e. exactly as close as a grid that coarse can get.
//
// Also benched, and the honest half of the lesson: MLE sigma divides by n, so it is BIASED.
// The gap to the unbiased /(n-1) estimator shrinks 0.0570 (n=10) -> 0.0105 (n=60) -> 0.0018
// (n=400), which is consistency showing up as the two readouts converging.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const { DemoLayout, DemoP, Slider, StatReadout, Toggle, DemoButton } = window;

const W = 560, H = 400;

const mulberry32 = (a) => () => {
  a |= 0; a = a + 0x6D2B79F5 | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
const mkN = (r) => () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

const MU_LO = 0, MU_HI = 6, SG_LO = 0.3, SG_HI = 4;

function MLEDemo() {
  const cvRef = _useRef(null);
  const [n, setN] = _useState(60);
  const [mu, setMu] = _useState(2.6);
  const [sigma, setSigma] = _useState(2.0);
  const [seedTick, setSeedTick] = _useState(0);
  const [showTrue, setShowTrue] = _useState(true);

  const TRUE_MU = 3, TRUE_SD = 1.5;
  const data = (() => {
    const r = mulberry32(4242 + seedTick * 7919), N = mkN(r);
    return Array.from({ length: n }, () => TRUE_MU + TRUE_SD * N());
  })();

  const logLik = (m, s) => {
    let ll = 0;
    for (const x of data) ll += -Math.log(s) - 0.5 * ((x - m) / s) ** 2;
    return ll;
  };

  // the closed-form maximiser, which is just the sample mean and the /n standard deviation
  const sMean = data.reduce((a, b) => a + b, 0) / n;
  const sSdML = Math.sqrt(data.reduce((a, x) => a + (x - sMean) ** 2, 0) / n);
  const sSdUnb = Math.sqrt(data.reduce((a, x) => a + (x - sMean) ** 2, 0) / (n - 1));

  const llHere = logLik(mu, sigma), llBest = logLik(sMean, sSdML);

  _useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = window.fitCanvas ? window.fitCanvas(cv, W, H) : cv.getContext("2d");
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = "#0b1530"; ctx.fillRect(0, 0, W, H);
    const pad = 48, w = W - pad * 2, h = H - pad * 2 - 20;
    const X = (m) => pad + (m - MU_LO) / (MU_HI - MU_LO) * w;
    const Y = (s) => pad + h - (s - SG_LO) / (SG_HI - SG_LO) * h;

    // the log-likelihood surface, coarse enough to stay interactive
    const CX = 56, CY = 40;
    let lo = Infinity, hi = -Infinity; const grid = [];
    for (let i = 0; i < CX; i++) {
      grid[i] = [];
      for (let j = 0; j < CY; j++) {
        const m = MU_LO + (i + 0.5) / CX * (MU_HI - MU_LO);
        const s = SG_LO + (j + 0.5) / CY * (SG_HI - SG_LO);
        const v = logLik(m, s); grid[i][j] = v;
        if (v < lo) lo = v; if (v > hi) hi = v;
      }
    }
    const cw = w / CX, ch = h / CY;
    for (let i = 0; i < CX; i++) for (let j = 0; j < CY; j++) {
      const t = (grid[i][j] - lo) / ((hi - lo) || 1);
      const e = Math.pow(t, 6);                       // the peak is extremely sharp; compress it
      ctx.fillStyle = `rgba(${Math.round(30 + 70 * e)},${Math.round(50 + 115 * e)},${Math.round(120 + 130 * e)},1)`;
      ctx.fillRect(pad + i * cw, pad + h - (j + 1) * ch, cw + 1, ch + 1);
    }
    ctx.strokeStyle = "#1e3a6e"; ctx.strokeRect(pad, pad, w, h);

    const dot = (m, s, col, label) => {
      ctx.beginPath(); ctx.arc(X(m), Y(s), 5, 0, 7);
      ctx.fillStyle = col; ctx.fill();
      ctx.strokeStyle = "#0b1530"; ctx.lineWidth = 1.4; ctx.stroke();
      if (label) { ctx.font = "10px JetBrains Mono, monospace"; ctx.fillStyle = col; ctx.fillText(label, X(m) + 8, Y(s) - 6); }
    };
    if (showTrue) dot(TRUE_MU, TRUE_SD, "#94a3b8", "true θ");
    dot(sMean, sSdML, "#34d399", "MLE");
    dot(mu, sigma, "#fbbf24", "you");

    ctx.font = "10px JetBrains Mono, monospace"; ctx.fillStyle = "#64748b";
    ctx.fillText("μ →", pad + w - 20, pad + h + 16);
    ctx.save(); ctx.translate(16, pad + h / 2); ctx.rotate(-Math.PI / 2); ctx.fillText("σ →", 0, 0); ctx.restore();
    ctx.fillText("brighter = higher log-likelihood", pad, H - 14);
  }, [n, mu, sigma, seedTick, showTrue]);

  const stage = (
    <canvas ref={cvRef} width={W} height={H}
      style={{ width: "100%", maxWidth: W * 1.35, borderRadius: 6, border: "1px solid var(--border)", background: "#0b1530" }} />
  );

  const controls = (
    <>
      <Slider label="YOUR μ" min={MU_LO} max={MU_HI} step={0.02} value={mu} onChange={setMu}
        help="Drag toward the bright region. The log-likelihood readout rises as you approach the green MLE point." />
      <Slider label="YOUR σ" min={SG_LO} max={SG_HI} step={0.02} value={sigma} onChange={setSigma}
        help="Too small and outliers become impossibly unlikely; too large and everything is bland. The peak trades those off." />
      <Slider label="SAMPLE SIZE n" min={10} max={400} step={10} value={n} onChange={setN}
        help="More data sharpens the peak - the surface narrows around the estimate, which IS the shrinking standard error." />
      <Toggle label="SHOW TRUE θ" checked={showTrue} onChange={setShowTrue}
        help="The parameters the data was actually generated from. The MLE lands near it, not exactly on it - that gap is sampling error." />
      <DemoButton onClick={() => setSeedTick((s) => s + 1)}>NEW SAMPLE</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginTop: 14 }}>
        <StatReadout label="YOUR log L" value={llHere.toFixed(2)} accent="#fbbf24" />
        <StatReadout label="MAX log L" value={llBest.toFixed(2)} accent="#34d399" />
        <StatReadout label="MLE μ = SAMPLE MEAN" value={sMean.toFixed(4)} accent="#34d399" />
        <StatReadout label="MLE σ (÷n)" value={sSdML.toFixed(4)} accent="#34d399" />
        <StatReadout label="UNBIASED σ (÷n−1)" value={sSdUnb.toFixed(4)} accent="#60a5fa" />
        <StatReadout label="YOU vs MLE" value={(llBest - llHere).toFixed(2)} accent="#c084fc" />
      </div>
    </>
  );

  const explainer = (
    <>
      <DemoP>
        Maximum likelihood asks a single question: which parameters make the data I actually
        observed most probable? The image is that question drawn as a surface over μ and σ, brighter
        where the observed sample is more likely. Fitting a model by maximum likelihood is climbing
        that surface — and the yellow dot is you, dragging.
      </DemoP>
      <DemoP>
        The green dot is the summit, and the thing worth noticing is that <strong>it is not
        computed by searching</strong>. For a Gaussian the maximiser has a closed form, and it is
        the sample mean and the sample standard deviation — the readouts show MLE μ equal to the
        sample mean exactly, because that is literally the number being plotted. Searching for it
        instead, with a 0.005 grid over this same surface, lands on 2.6950 / 1.2500 against the
        closed form's 2.6974 / 1.2480: agreement to 2.4e-3, which is half the grid step. Statistics
        you already use are maximum-likelihood estimates wearing familiar names.
      </DemoP>
      <DemoP>
        One honest wrinkle sits in the readouts. The MLE for σ divides by <em>n</em>, while the
        unbiased estimator divides by <em>n−1</em>, and they differ — visibly at small n. Maximum
        likelihood is <strong>not</strong> guaranteed unbiased; it is guaranteed to be
        <em> consistent</em>, converging on the truth as n grows. Drag SAMPLE SIZE and watch two
        things at once: the gap between the two σ readouts collapses (<strong>0.0570 at n=10,
        0.0105 at n=60, 0.0018 at n=400</strong>), and the bright region contracts around the peak.
        That contraction is the standard error shrinking, and the curvature at the summit is
        literally the Fisher information.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Training a classifier is this. Minimising
        {" "}<a href={`${window.__DM_BASE || "../../"}visualize/cross-entropy/`}>cross-entropy</a>{" "}
        is maximising the log-likelihood of the labels under the model, and minimising squared error
        is maximum likelihood under Gaussian noise — which is why those two losses are not
        arbitrary choices but consequences of an assumed noise model.
      </DemoP>
      <DemoP>
        Adding a prior turns the same picture into MAP estimation: L2 regularisation is a Gaussian
        prior on the weights and L1 a Laplace one, so a "regulariser" is a belief about parameters
        expressed as a term in the objective. The
        {" "}<a href={`${window.__DM_BASE || "../../"}visualize/bayesian-linear-regression/`}>Bayesian view</a>{" "}
        keeps the whole surface instead of only its summit.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      title="Maximum Likelihood"
      subtitle="Climb the likelihood surface - and find that its summit is the sample mean you already knew, biased sigma and all."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/foundations/probability/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="blue"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<MLEDemo />);
