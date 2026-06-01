// demos/importance-sampling.jsx — importance sampling for a rare-event estimate.
//
// We want P_p(X > t) under the target p = N(0,1). For a big t this is a rare event:
// plain Monte Carlo (sampling from p and counting hits) almost never lands in the
// tail, so its estimate is 0 or wildly noisy. Importance sampling fixes this by
// sampling from a PROPOSAL q we steer into the tail, then correcting the bias with
// weights w(x) = p(x)/q(x):  E_p[f] = E_q[w·f], so  P_p(X>t) ≈ (1/N) Σ w_i·1[x_i>t].
// A well-placed q makes the estimate converge fast; a bad q makes a few enormous
// weights dominate and the Effective Sample Size ESS = (Σw)²/Σw² collapses. We
// stream samples, accumulate both estimators, and trace them against the truth.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 560, H = 470, XMIN = -4, XMAX = 7;
const SQ2PI = Math.sqrt(2 * Math.PI);
const phi = (x) => Math.exp(-0.5 * x * x) / SQ2PI;
function erf(x) { const s = x < 0 ? -1 : 1; x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return s * y; }
const tailTrue = (t) => 0.5 * (1 - erf(t / Math.SQRT2));

function ImportanceSamplingDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const [t, setT] = _useState(3.0);
  const [muq, setMuq] = _useState(3.0);
  const [sigq, setSigq] = _useState(1.0);
  const [running, setRunning] = _useState(true);
  const [seed, setSeed] = _useState(1);
  const [, setTick] = _useState(0);
  const sim = _useRef(null);
  const rngRef = _useRef(null);

  function rng(s0) { let s = s0 >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function randn(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  const q = (x) => Math.exp(-0.5 * ((x - muq) / sigq) ** 2) / (sigq * SQ2PI);

  function reset() {
    rngRef.current = rng(seed * 22699 + 7);
    sim.current = {
      isW1: 0, isN: 0, wSum: 0, w2Sum: 0, tailSamp: 0,
      naiveHit: 0, naiveN: 0, last: [], trace: [],
    };
    setTick(t => t + 1);
  }
  _useEffect(() => { reset(); /* eslint-disable-next-line */ }, [t, muq, sigq, seed]);

  function batch(n) {
    const st = sim.current, r = rngRef.current; if (!st || !r) return;
    const last = [];
    for (let i = 0; i < n; i++) {
      // importance sample from q
      const x = muq + randn(r) * sigq;
      const w = phi(x) / q(x);
      st.wSum += w; st.w2Sum += w * w; st.isN++;
      if (x > t) { st.isW1 += w; st.tailSamp++; }
      last.push([x, w, x > t]);
      // naive MC sample from p
      const y = randn(r);
      st.naiveN++; if (y > t) st.naiveHit++;
    }
    st.last = last.slice(-90);
    if (st.isN % 40 === 0) {
      const isEst = st.isW1 / st.isN, nvEst = st.naiveHit / st.naiveN;
      st.trace.push([isEst, nvEst]); if (st.trace.length > 300) st.trace.shift();
    }
  }

  _useEffect(() => {
    let lastT = performance.now();
    const tick = (now) => {
      if (running && now - lastT > 40) { lastT = now; const st = sim.current; if (st && st.isN < 8000) batch(24); setTick(v => v + 1); }
      draw();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    /* eslint-disable-next-line */
  }, [running, t, muq, sigq]);

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const st = sim.current; if (!st) return;
    const tr = tailTrue(t);

    // ---- top: densities + samples ----
    const tx0 = 16, ty0 = 26, tw = W - 32, th = 210;
    const PX = (x) => tx0 + ((x - XMIN) / (XMAX - XMIN)) * tw;
    let pmax = phi(0) / (sigq < 1 ? sigq : 1); pmax = Math.max(phi(0), 1 / (sigq * SQ2PI)) * 1.1;
    const PY = (d) => ty0 + th - (d / pmax) * (th - 16);
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono";
    ctx.fillText("TARGET p (violet) · PROPOSAL q (cyan) · tail x > t is the rare event", tx0, 18);
    // shaded true tail of p
    ctx.fillStyle = "rgba(168,85,247,0.18)"; ctx.beginPath(); ctx.moveTo(PX(t), ty0 + th);
    for (let x = t; x <= XMAX; x += 0.05) ctx.lineTo(PX(x), PY(phi(x))); ctx.lineTo(PX(XMAX), ty0 + th); ctx.closePath(); ctx.fill();
    // p curve
    ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 2; ctx.beginPath();
    for (let x = XMIN; x <= XMAX; x += 0.05) { const px = PX(x), py = PY(phi(x)); x === XMIN ? ctx.moveTo(px, py) : ctx.lineTo(px, py); } ctx.stroke();
    // q curve
    ctx.strokeStyle = "#22d3ee"; ctx.lineWidth = 2; ctx.setLineDash([5, 3]); ctx.beginPath();
    for (let x = XMIN; x <= XMAX; x += 0.05) { const px = PX(x), py = PY(q(x)); x === XMIN ? ctx.moveTo(px, py) : ctx.lineTo(px, py); } ctx.stroke(); ctx.setLineDash([]);
    // threshold
    ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(PX(t), ty0); ctx.lineTo(PX(t), ty0 + th); ctx.stroke();
    ctx.fillStyle = "#fbbf24"; ctx.font = "10px JetBrains Mono"; ctx.fillText("t = " + t.toFixed(1), PX(t) + 4, ty0 + 12);
    // recent samples as dots sized by weight, on a row near the baseline
    const rowY = ty0 + th - 6;
    for (const [x, w, inTail] of st.last) {
      const rad = Math.max(1.2, Math.min(7, 1.2 + Math.sqrt(w) * 2.2));
      ctx.beginPath(); ctx.arc(PX(x), rowY, rad, 0, 7);
      ctx.fillStyle = inTail ? "rgba(251,191,36,0.85)" : "rgba(34,211,238,0.5)"; ctx.fill();
    }

    // ---- bottom: running estimate trace ----
    const bx0 = 16, by0 = ty0 + th + 32, bw = W - 32, bh = H - by0 - 18;
    const ymax = Math.max(tr * 3.2, 1e-6);
    const QX = (i, n) => bx0 + (n <= 1 ? 0 : (i / (n - 1)) * bw);
    const QY = (v) => by0 + bh - Math.min(1, v / ymax) * bh;
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono"; ctx.fillText("RUNNING ESTIMATE of P(X > t)  vs  truth", bx0, by0 - 8);
    ctx.strokeStyle = "rgba(148,163,184,0.12)"; ctx.strokeRect(bx0, by0, bw, bh);
    // true line
    ctx.strokeStyle = "#34d399"; ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(bx0, QY(tr)); ctx.lineTo(bx0 + bw, QY(tr)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#34d399"; ctx.font = "10px JetBrains Mono"; ctx.fillText("true " + tr.toExponential(2), bx0 + bw - 120, QY(tr) - 5);
    const n = st.trace.length;
    if (n > 1) {
      // naive
      ctx.strokeStyle = "rgba(148,163,184,0.7)"; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = 0; i < n; i++) { const x = QX(i, n), y = QY(st.trace[i][1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
      // IS
      ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 2.4; ctx.beginPath();
      for (let i = 0; i < n; i++) { const x = QX(i, n), y = QY(st.trace[i][0]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    }
    ctx.fillStyle = "#64748b"; ctx.font = "10px JetBrains Mono";
    ctx.fillText("violet = importance sampling   ·   gray = naive Monte Carlo", bx0, by0 + bh + 14);
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  });

  const st = sim.current;
  const tr = tailTrue(t);
  const isEst = st && st.isN ? st.isW1 / st.isN : 0;
  const ess = st && st.w2Sum > 0 ? (st.wSum * st.wSum) / st.w2Sum : 0;
  const essPct = st && st.isN ? ess / st.isN : 0;
  const relErr = tr > 0 ? Math.abs(isEst - tr) / tr : 0;
  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// THRESHOLD  t" min={1} max={4.5} step={0.1} value={t} onChange={setT} tone="violet"
        help="The rare-event cutoff: we estimate P(X > t) under the standard normal. Larger t = rarer event (t=3 is ~0.13%, t=4 is ~0.003%), where naive Monte Carlo basically never gets a hit and importance sampling shines." />
      <Slider label="// PROPOSAL MEAN  mu_q" min={0} max={5} step={0.1} value={muq} onChange={setMuq}
        help="Where the proposal q is centered. At 0 it equals the target and you're back to naive sampling (terrible for big t). Shift it toward t to pour samples into the tail; push it far past t and the weights blow up and ESS collapses again." />
      <Slider label="// PROPOSAL WIDTH  sigma_q" min={0.5} max={2.5} step={0.1} value={sigq} onChange={setSigq}
        help="Spread of the proposal. Too narrow and q misses regions p covers, making a few weights explode (high variance, low ESS); a bit wider than the target is the safe choice for importance weights." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setRunning(r => !r)} primary>{running ? "PAUSE" : "RESUME"}</DemoButton>
        <DemoButton onClick={() => setSeed(s => s + 1)}>RESTART</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="IS ESTIMATE" value={st ? isEst.toExponential(2) : "—"} accent="#a855f7" />
        <StatReadout label="TRUE P(X>t)" value={tr.toExponential(2)} accent="#34d399" />
        <StatReadout label="REL. ERROR" value={st ? Math.round(relErr * 100) + "%" : "—"} accent="#fbbf24" />
        <StatReadout label="ESS / N" value={st ? Math.round(essPct * 100) + "%" : "—"} accent={essPct > 0.3 ? "#34d399" : "#f87171"} />
      </div>
      <Legend items={[
        { color: "#a855f7", label: "target p / IS estimate" },
        { color: "#22d3ee", label: "proposal q" },
        { color: "#fbbf24", label: "tail samples" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        We want the probability that a standard normal exceeds t — the shaded violet
        tail. Sampling straight from p (gray line below) almost never lands there, so
        naive Monte Carlo sits stuck near zero and jumps every time it gets a lucky
        hit. Importance sampling instead draws from the cyan proposal q, which we aim
        into the tail so samples actually arrive, then corrects for the cheat by
        weighting each sample by w = p(x)/q(x). Oversampled regions get down-weighted,
        and the weighted tail fraction is an unbiased estimate of the true probability
        — watch the violet trace lock onto the green truth line fast.
      </DemoP>
      <DemoP>
        The catch is the proposal. Slide PROPOSAL MEAN to 0 and you're back to naive
        sampling — the estimate crawls. Aim it near t and ESS/N stays high and
        convergence is quick. But push mu_q far past t, or make sigma_q too narrow,
        and a handful of samples land where p is much larger than q, so their weights
        explode: the estimate is then carried by two or three points, the variance
        skyrockets, and the Effective Sample Size — (Σw)²/Σw², the count of
        "equivalent independent samples" — collapses toward 1 (it turns red). That ESS
        crash is the universal diagnostic for a bad proposal, and the reason
        importance weights are notoriously fragile in high dimensions.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Importance sampling estimates an expectation under a distribution that's hard
        to sample (or to hit the region you care about) by sampling an easier proposal
        and reweighting. It's the engine behind rare-event and tail-risk estimation
        (reliability, finance, particle physics), off-policy evaluation in
        reinforcement learning (reweighting trajectories from a behavior policy), and
        the resampling step of particle filters. It's the alternative to building a
        Markov chain like{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/mcmc/`} style={{ color: "#a855f7" }}>MCMC</a>{" "}
        when you have a decent proposal, and the self-normalized variant only needs the
        target up to a constant — exactly the setting of{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/bayes/`} style={{ color: "#a855f7" }}>Bayesian</a>{" "}
        posteriors.
      </DemoP>
      <DemoP>
        Caveats: the estimator is only as good as the proposal. If q has thinner tails
        than p, the weights have infinite variance and the estimate is silently
        unreliable — always monitor ESS, not just the point estimate. The method
        degrades badly in high dimensions (weights become astronomically skewed), which
        motivates adaptive IS, annealed IS, and sequential Monte Carlo. The
        self-normalized form trades a small bias for not needing the normalizing
        constant. Rule of thumb: make the proposal a bit heavier-tailed than the
        target, and never trust an importance estimate whose ESS has collapsed.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="FOUNDATIONS" title="Importance Sampling"
      subtitle="Estimate a rare-event probability that naive Monte Carlo never reaches by sampling a steered proposal and reweighting by p/q. Aim the proposal into the tail to watch the estimate converge — or misplace it and watch a few exploding weights crater the effective sample size."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/foundations/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ImportanceSamplingDemo />);
