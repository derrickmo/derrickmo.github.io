// demos/variational-inference.jsx — fit a Gaussian q to an intractable
// posterior p by maximizing the ELBO. Real reparameterized black-box VI:
// z = mu + L*eps, Monte-Carlo gradient of E_q[log p(z)] + H[q], gradient
// ascent on the variational parameters. Mean-field (diagonal) vs full-
// covariance q, on correlated / bimodal / banana targets — exposing the two
// classic VI pathologies: variance underestimation and mode-seeking.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, Toggle, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 380;
const LOG2PI = Math.log(2 * Math.PI);

function gaussRand() { let u = 0, v = 0; while (u === 0) u = Math.random(); while (v === 0) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

// Targets: unnormalized log-density logp and its gradient glogp.
const TARGETS = {
  correlated: {
    label: "Correlated", domain: { xmin: -3.2, xmax: 3.2, ymin: -3.2, ymax: 3.2 },
    // N(0, Sigma), Sigma = [[1.5,1.2],[1.2,1.5]] -> Sinv
    sinv: (() => { const a = 1.5, b = 1.2, c = 1.5, det = a * c - b * b; return [c / det, -b / det, a / det]; })(),
    logp(x, y) { const [i11, i12, i22] = this.sinv; return -0.5 * (i11 * x * x + 2 * i12 * x * y + i22 * y * y); },
    glogp(x, y) { const [i11, i12, i22] = this.sinv; return [-(i11 * x + i12 * y), -(i12 * x + i22 * y)]; },
  },
  bimodal: {
    label: "Bimodal", domain: { xmin: -3.2, xmax: 3.2, ymin: -3.2, ymax: 3.2 },
    m1: [-1.4, -1.0], m2: [1.4, 1.0], s2: 0.34,
    comp(x, y, m) { const dx = x - m[0], dy = y - m[1]; return -0.5 * (dx * dx + dy * dy) / this.s2; },
    logp(x, y) { const a = this.comp(x, y, this.m1), b = this.comp(x, y, this.m2); const mx = Math.max(a, b); return mx + Math.log(Math.exp(a - mx) + Math.exp(b - mx)); },
    glogp(x, y) {
      const a = this.comp(x, y, this.m1), b = this.comp(x, y, this.m2), mx = Math.max(a, b);
      const ea = Math.exp(a - mx), eb = Math.exp(b - mx), z = ea + eb, wa = ea / z, wb = eb / z;
      const gx = wa * (-(x - this.m1[0]) / this.s2) + wb * (-(x - this.m2[0]) / this.s2);
      const gy = wa * (-(y - this.m1[1]) / this.s2) + wb * (-(y - this.m2[1]) / this.s2);
      return [gx, gy];
    },
  },
  banana: {
    label: "Banana", domain: { xmin: -3.4, xmax: 3.4, ymin: -3.4, ymax: 1.8 }, b: 0.5,
    logp(x, y) { const u2 = y + this.b * (x * x - 1); return -0.5 * (x * x / 2 + u2 * u2 / 0.45); },
    glogp(x, y) { const u2 = y + this.b * (x * x - 1); const du2 = u2 / 0.45; return [-(x / 2) - du2 * (2 * this.b * x), -du2]; },
  },
};

const RAMP = [
  { t: 0, c: [8, 14, 30] }, { t: 0.4, c: [30, 58, 138] },
  { t: 0.72, c: [59, 130, 246] }, { t: 1, c: [168, 85, 247] },
];
function rampColor(t) {
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < RAMP.length; i++) {
    if (t <= RAMP[i].t) { const a = RAMP[i - 1], b = RAMP[i], f = (t - a.t) / (b.t - a.t); const m = j => Math.round(a.c[j] + (b.c[j] - a.c[j]) * f); return `rgb(${m(0)},${m(1)},${m(2)})`; }
  }
  return "rgb(168,85,247)";
}
function eigSym(a, b, c) {
  const tr = a + c, disc = Math.sqrt(((a - c) / 2) ** 2 + b * b);
  const l1 = tr / 2 + disc, l2 = tr / 2 - disc;
  let v1; if (Math.abs(b) > 1e-9) v1 = [l1 - c, b]; else v1 = a >= c ? [1, 0] : [0, 1];
  const n1 = Math.hypot(v1[0], v1[1]); v1 = [v1[0] / n1, v1[1] / n1];
  return { l1, l2, v1, v2: [-v1[1], v1[0]] };
}
const Q_COL = "#22d3ee";

function VariationalInferenceDemo() {
  const canvasRef = _useRef(null);
  const bgRef = _useRef(null);
  const dprRef = _useRef(1);
  // variational params: mu[2], and L = [[L11,0],[L21,L22]] (lower-triangular factor)
  const qRef = _useRef({ mu: [0.4, 0.3], L11: 0.5, L21: 0, L22: 0.5 });
  const elboHistRef = _useRef([]);
  const rafRef = _useRef(null);

  const [target, setTarget] = _useState("correlated");
  const [fullCov, setFullCov] = _useState(false);
  const [lr, setLr] = _useState(0.04);
  const [samples, setSamples] = _useState(8);
  const [speed, setSpeed] = _useState(2);
  const [running, setRunning] = _useState(false);
  const [iter, setIter] = _useState(0);
  const [elbo, setElbo] = _useState(0);
  const [status, setStatus] = _useState("IDLE");

  const targetRef = _useRef(target), fullRef = _useRef(fullCov), lrRef = _useRef(lr), sampRef = _useRef(samples), speedRef = _useRef(speed);
  _useEffect(() => { lrRef.current = lr; }, [lr]);
  _useEffect(() => { sampRef.current = samples; }, [samples]);
  _useEffect(() => { speedRef.current = speed; }, [speed]);
  _useEffect(() => { fullRef.current = fullCov; if (!fullCov) { qRef.current.L21 = 0; } draw(); }, [fullCov]);

  function toPx(x, y) { const d = TARGETS[targetRef.current].domain; return [(x - d.xmin) / (d.xmax - d.xmin) * W, (1 - (y - d.ymin) / (d.ymax - d.ymin)) * H]; }

  function buildBg() {
    const T = TARGETS[target], d = T.domain;
    let lo = Infinity, hi = -Infinity;
    const grid = [];
    for (let py = 0; py < H; py += 5) { const row = []; for (let px = 0; px < W; px += 5) { const x = d.xmin + (px / W) * (d.xmax - d.xmin), y = d.ymin + (1 - py / H) * (d.ymax - d.ymin); const v = T.logp(x, y); row.push(v); lo = Math.min(lo, v); hi = Math.max(hi, v); } grid.push(row); }
    const dpr = dprRef.current, bg = document.createElement("canvas"); bg.width = W * dpr; bg.height = H * dpr;
    const ctx = bg.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const span = hi - lo || 1; let ri = 0;
    for (let py = 0; py < H; py += 5) { let ci = 0; for (let px = 0; px < W; px += 5) { ctx.fillStyle = rampColor((grid[ri][ci] - lo) / span); ctx.fillRect(px, py, 5, 5); ci++; } ri++; }
    bgRef.current = bg;
  }

  function resetRun() {
    const T = TARGETS[targetRef.current];
    // start slightly off-center (break bimodal symmetry), broad
    qRef.current = { mu: [0.5, 0.4], L11: 0.55, L21: 0, L22: 0.55 };
    elboHistRef.current = []; setIter(0); setStatus("IDLE");
    setElbo(+computeElbo().toFixed(2));
    draw();
  }

  function qCov() { const q = qRef.current; const f = fullRef.current; const L21 = f ? q.L21 : 0; return [q.L11 * q.L11, q.L11 * L21, L21 * L21 + q.L22 * q.L22]; }
  function entropy() { const q = qRef.current; return Math.log(Math.abs(q.L11 * q.L22)) + 1 + LOG2PI; }

  function computeElbo() {
    const T = TARGETS[targetRef.current], q = qRef.current, f = fullRef.current, S = 40;
    let acc = 0;
    for (let s = 0; s < S; s++) { const e0 = gaussRand(), e1 = gaussRand(); const x = q.mu[0] + q.L11 * e0; const y = q.mu[1] + (f ? q.L21 * e0 : 0) + q.L22 * e1; acc += T.logp(x, y); }
    return acc / S + entropy();
  }

  function stepOnce() {
    const T = TARGETS[targetRef.current], q = qRef.current, f = fullRef.current, S = sampRef.current, lr = lrRef.current;
    let gmu = [0, 0], gL11 = 0, gL21 = 0, gL22 = 0;
    for (let s = 0; s < S; s++) {
      const e0 = gaussRand(), e1 = gaussRand();
      const x = q.mu[0] + q.L11 * e0, y = q.mu[1] + (f ? q.L21 * e0 : 0) + q.L22 * e1;
      const g = T.glogp(x, y);
      gmu[0] += g[0]; gmu[1] += g[1];
      gL11 += g[0] * e0; gL22 += g[1] * e1; if (f) gL21 += g[1] * e0;
    }
    gmu = [gmu[0] / S, gmu[1] / S]; gL11 /= S; gL22 /= S; gL21 /= S;
    // entropy gradient wrt L diagonal: d/dL log(L11*L22) = 1/L
    gL11 += 1 / q.L11; gL22 += 1 / q.L22;
    q.mu[0] += lr * gmu[0]; q.mu[1] += lr * gmu[1];
    q.L11 = Math.max(0.03, q.L11 + lr * gL11);
    q.L22 = Math.max(0.03, q.L22 + lr * gL22);
    if (f) q.L21 += lr * gL21; else q.L21 = 0;
    const E = computeElbo();
    elboHistRef.current.push(E);
    setIter(v => v + 1); setElbo(+E.toFixed(2));
    if (elboHistRef.current.length > 12) { const h = elboHistRef.current, recent = h.slice(-8); const d = Math.max(...recent) - Math.min(...recent); if (d < 1e-3) { setStatus("CONVERGED"); return true; } }
    setStatus("OPTIMIZING");
    return false;
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (bgRef.current) ctx.drawImage(bgRef.current, 0, 0, W, H);
    // q ellipses at 1 and 2 sigma
    const [c11, c12, c22] = qCov();
    const { l1, l2, v1, v2 } = eigSym(c11, c12, c22);
    const q = qRef.current;
    for (const k of [2, 1]) {
      const r1 = k * Math.sqrt(Math.max(l1, 1e-6)), r2 = k * Math.sqrt(Math.max(l2, 1e-6));
      ctx.strokeStyle = k === 2 ? "rgba(34,211,238,0.5)" : Q_COL; ctx.lineWidth = k === 2 ? 1.3 : 2;
      ctx.beginPath();
      for (let i = 0; i <= 72; i++) { const th = (i / 72) * Math.PI * 2; const dx = r1 * Math.cos(th) * v1[0] + r2 * Math.sin(th) * v2[0]; const dy = r1 * Math.cos(th) * v1[1] + r2 * Math.sin(th) * v2[1]; const [px, py] = toPx(q.mu[0] + dx, q.mu[1] + dy); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.closePath(); ctx.stroke();
    }
    const [mx, my] = toPx(q.mu[0], q.mu[1]);
    ctx.fillStyle = Q_COL; ctx.beginPath(); ctx.arc(mx, my, 4, 0, Math.PI * 2); ctx.fill();
    // labels
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px JetBrains Mono, monospace"; ctx.textAlign = "left";
    ctx.fillText("TARGET p (density)", 10, 16);
    ctx.fillStyle = Q_COL; ctx.fillText(fullRef.current ? "q = full-covariance Gaussian" : "q = mean-field Gaussian", 10, 30);
    // ELBO sparkline (bottom-right)
    const hist = elboHistRef.current;
    if (hist.length > 1) {
      const ox = 360, oy = 320, ow = 168, oh = 48, lo = Math.min(...hist), hi = Math.max(...hist), span = hi - lo || 1;
      ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.strokeRect(ox, oy, ow, oh);
      ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillText("ELBO", ox, oy - 4);
      ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 1.6; ctx.beginPath();
      hist.forEach((v, i) => { const px = ox + (i / (hist.length - 1)) * ow; const py = oy + oh - ((v - lo) / span) * (oh - 6) - 3; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
      ctx.stroke();
    }
  }

  function handleRun() { if (running) { setRunning(false); return; } if (status === "CONVERGED") resetRun(); setRunning(true); }
  function handleStep() { if (running) return; stepOnce(); draw(); }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    buildBg(); resetRun();
  }, []);
  _useEffect(() => { targetRef.current = target; setRunning(false); buildBg(); resetRun(); }, [target]);

  _useEffect(() => {
    if (!running) return;
    let alive = true;
    const loop = () => { if (!alive) return; let done = false; for (let i = 0; i < speedRef.current && !done; i++) done = stepOnce(); draw(); if (done) { setRunning(false); return; } rafRef.current = requestAnimationFrame(loop); };
    rafRef.current = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, [running]);

  const stage = (<canvas ref={canvasRef} style={{ touchAction: "none", maxWidth: "100%", borderRadius: 4 }} />);

  const controls = (
    <ControlGroup>
      <SegmentedControl label="// TARGET POSTERIOR" value={target} onChange={v => { setRunning(false); setTarget(v); }}
        options={Object.entries(TARGETS).map(([k, v]) => ({ value: k, label: v.label }))}
        help="The intractable distribution to approximate. Correlated = a tilted Gaussian (exposes mean-field's variance underestimation). Bimodal = two modes (exposes mode-seeking). Banana = a curved ridge no Gaussian fits well." />
      <Toggle label="// FULL COVARIANCE q" checked={fullCov} onChange={setFullCov} tone="violet"
        help="OFF = mean-field: q is an axis-aligned Gaussian (independent dimensions), the usual VI assumption. ON = q carries a full covariance, so it CAN tilt to match correlation - compare the two on the Correlated target." />
      <Slider label="// LEARNING RATE" min={0.005} max={0.12} step={0.005} value={lr} onChange={setLr}
        help="Step size for gradient ascent on the ELBO over the variational parameters." />
      <Slider label="// MC SAMPLES" min={1} max={32} step={1} value={samples} onChange={setSamples}
        help="Monte-Carlo samples used to estimate the ELBO gradient each step (reparameterization trick). Few samples = noisy, jittery updates; more = smoother but costlier." />
      <Slider label="// SPEED" min={1} max={12} value={speed} onChange={setSpeed} suffix=" /frame"
        help="ELBO ascent steps per animation frame. Visual pacing only." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={handleRun} primary>{running ? "PAUSE" : "RUN"}</DemoButton>
        <DemoButton onClick={handleStep} disabled={running}>STEP</DemoButton>
        <DemoButton onClick={resetRun}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="ITERATION" value={iter} />
        <StatReadout label="ELBO" value={elbo} accent="#fbbf24" />
      </div>
      <StatReadout label="STATUS" value={status} accent={status === "CONVERGED" ? "#34d399" : "var(--blue-lt)"} />
      <Legend items={[
        { color: Q_COL, label: "q (approximation)" },
        { color: "#a855f7", label: "TARGET HIGH-DENSITY" },
        { color: "#fbbf24", label: "ELBO" },
      ]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Variational inference turns Bayesian inference into <i>optimization</i>: instead of
        sampling the posterior, pick a simple family <b>q</b> and tune it to be as close as
        possible by maximizing the <b>ELBO</b> (evidence lower bound) — equivalently minimizing
        KL(q ‖ p). Each step here is a real reparameterized Monte-Carlo gradient ascent on q's
        mean and covariance.
      </DemoP>
      <DemoP>
        Watch the two famous failure modes. On <b>Correlated</b> with mean-field q (axis-aligned),
        q shrinks <i>inside</i> the target — VI systematically <b>underestimates variance</b>
        because reverse-KL punishes putting mass where p is low; flip on <b>full covariance</b>
        and q tilts to fit. On <b>Bimodal</b>, q collapses onto a <b>single mode</b> and ignores
        the other — reverse-KL is <b>mode-seeking</b>, the opposite of what
        <a href={`${window.__DM_BASE || "../../"}visualize/mcmc/`}> MCMC</a> does (it explores both,
        slowly). That trade-off — fast but biased VI vs slow but asymptotically exact MCMC — is the
        central choice in approximate inference.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        The ELBO is everywhere in modern ML. It <i>is</i> the training objective of the
        <a href={`${window.__DM_BASE || "../../"}visualize/vae/`}> variational autoencoder</a> (the
        encoder is an amortized q), it underlies Bayesian neural nets and probabilistic programming
        (Pyro, Stan's ADVI), and the same reparameterization trick you see here is what lets you
        backprop through a sampling step. Maximizing the ELBO simultaneously fits the data and
        regularizes q toward the prior — reconstruction plus a KL term.
      </DemoP>
      <DemoP>
        The honest caveat is exactly what's on screen: VI gives you a posterior <i>fast</i>, but a
        <b> biased</b> one. Mean-field's variance underestimation makes credible intervals too
        narrow, so VI uncertainty should be read with care — for calibrated error bars compare it
        against the exact <a href={`${window.__DM_BASE || "../../"}visualize/bayesian-linear-regression/`}>Bayesian
        posterior</a> where one is available, or against MCMC. Knowing when "approximately Bayesian"
        is good enough is a real engineering judgment.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      title="Variational Inference (ELBO)"
      subtitle="Approximate a posterior by optimization - and watch mean-field VI underestimate variance and chase a single mode."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/foundations/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="blue"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<VariationalInferenceDemo />);
