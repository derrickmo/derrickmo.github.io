// demos/naive-bayes.jsx — Gaussian Naive Bayes vs full QDA, live decision regions.
//
// Naive Bayes classifies with Bayes' rule plus one bold simplification: features
// are conditionally independent given the class, so the class-conditional density
// factorizes into per-feature 1-D Gaussians (a DIAGONAL covariance). We fit two
// class-conditional Gaussians in 2-D, classify by argmax_c [log P(c) + Σ_j log
// N(x_j; μ_cj, σ_cj²)], and shade the decision regions. A toggle compares the
// "naive" diagonal fit against the FULL covariance (quadratic discriminant
// analysis). When the classes are axis-aligned they agree; tilt them so the two
// features correlate and the naive model — blind to that correlation — draws the
// wrong boundary and loses accuracy. The point: NB is fast and shockingly good,
// and its independence assumption is wrong yet often harmless.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 470, H = 470, SC = 150;
const cx = W / 2, cy = H / 2;
const PX = (x) => cx + x * SC, PY = (y) => cy - y * SC;
const COL = [[96, 165, 250], [248, 113, 113]]; // class 0 blue, 1 red

function eig2(a, b, c) { // symmetric [[a,b],[b,c]]
  const tr = a + c, det = a * c - b * b;
  const disc = Math.sqrt(Math.max(0, (tr / 2) * (tr / 2) - det));
  const l1 = tr / 2 + disc, l2 = tr / 2 - disc;
  let vx = b, vy = l1 - a; const n = Math.hypot(vx, vy) || 1; vx /= n; vy /= n;
  if (Math.abs(b) < 1e-9) { vx = 1; vy = 0; }
  return { l1, l2, ang: Math.atan2(vy, vx) };
}

function NaiveBayesDemo() {
  const canvasRef = _useRef(null);
  const regRef = _useRef(null);
  const dprRef = _useRef(1);
  const [tilt, setTilt] = _useState(0.0);
  const [model, setModel] = _useState("naive");
  const [N, setN] = _useState(120);
  const [seed, setSeed] = _useState(1);
  const [, setTick] = _useState(0);
  const sim = _useRef(null);

  function rng(s0) { let s = s0 >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function randn(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  // fit per class: full + diagonal covariance, prior
  function fit(pts) {
    const cls = [[], []];
    for (const p of pts) cls[p[2]].push(p);
    const models = cls.map(arr => {
      const n = arr.length;
      let mx = 0, my = 0; for (const p of arr) { mx += p[0]; my += p[1]; } mx /= n; my /= n;
      let sxx = 0, syy = 0, sxy = 0;
      for (const p of arr) { const dx = p[0] - mx, dy = p[1] - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
      sxx /= n; syy /= n; sxy /= n;
      return { mx, my, sxx, syy, sxy, n };
    });
    const tot = models[0].n + models[1].n;
    return { models, priors: [models[0].n / tot, models[1].n / tot] };
  }

  function logpdf(m, x, y, naive) {
    const dx = x - m.mx, dy = y - m.my;
    const a = m.sxx + 1e-4, c = m.syy + 1e-4, b = naive ? 0 : m.sxy;
    const det = a * c - b * b;
    const inv00 = c / det, inv11 = a / det, inv01 = -b / det;
    const q = dx * (inv00 * dx + inv01 * dy) + dy * (inv01 * dx + inv11 * dy);
    return -0.5 * q - 0.5 * Math.log(det);
  }

  function classify(fitObj, x, y, naive) {
    const { models, priors } = fitObj;
    const l0 = Math.log(priors[0]) + logpdf(models[0], x, y, naive);
    const l1 = Math.log(priors[1]) + logpdf(models[1], x, y, naive);
    return { cls: l1 > l0 ? 1 : 0, conf: 1 / (1 + Math.exp(-Math.abs(l1 - l0))) };
  }

  function accuracy(fitObj, pts, naive) {
    let ok = 0; for (const p of pts) if (classify(fitObj, p[0], p[1], naive).cls === p[2]) ok++;
    return ok / pts.length;
  }

  function reset() {
    const r = rng(seed * 2654435 + 9);
    const th = tilt * 1.1;          // shared tilt rotates both class covariances
    const ct = Math.cos(th), stt = Math.sin(th);
    const spec = [
      { mx: -0.55, my: -0.35, sx: 0.5, sy: 0.16 },
      { mx: 0.55, my: 0.35, sx: 0.5, sy: 0.16 },
    ];
    const pts = [];
    spec.forEach((s, ci) => {
      for (let i = 0; i < N / 2; i++) {
        const ex = randn(r) * s.sx, ey = randn(r) * s.sy;
        const x = s.mx + ex * ct - ey * stt, y = s.my + ex * stt + ey * ct;
        pts.push([x, y, ci]);
      }
    });
    const f = fit(pts);
    sim.current = { pts, fit: f, accN: accuracy(f, pts, true), accF: accuracy(f, pts, false) };
    buildRegions();
    setTick(t => t + 1);
  }
  _useEffect(() => { reset(); /* eslint-disable-next-line */ }, [tilt, N, seed, model]);

  function buildRegions() {
    const st = sim.current; if (!st) return;
    const gw = 118, gh = 118;
    let off = regRef.current;
    if (!off) { off = document.createElement("canvas"); off.width = gw; off.height = gh; regRef.current = off; }
    const hc = off.getContext("2d"); const img = hc.createImageData(gw, gh);
    const naive = model === "naive";
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
      const x = (i / (gw - 1) - 0.5) * (W / SC);
      const y = -(j / (gh - 1) - 0.5) * (H / SC);
      const { cls, conf } = classify(st.fit, x, y, naive);
      const col = COL[cls]; const a = 0.10 + 0.30 * Math.min(1, conf - 0.5 < 0 ? 0 : (conf - 0.5) * 2);
      const k = (j * gw + i) * 4;
      img.data[k] = col[0]; img.data[k + 1] = col[1]; img.data[k + 2] = col[2]; img.data[k + 3] = Math.round(a * 255);
    }
    hc.putImageData(img, 0, 0);
  }

  function drawEllipse(ctx, m, naive, color) {
    const a = m.sxx, c = m.syy, b = naive ? 0 : m.sxy;
    const { l1, l2, ang } = eig2(a, b, c);
    ctx.save(); ctx.translate(PX(m.mx), PY(m.my)); ctx.rotate(-ang);
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
    ctx.ellipse(0, 0, 2 * Math.sqrt(Math.max(1e-6, l1)) * SC, 2 * Math.sqrt(Math.max(1e-6, l2)) * SC, 0, 0, 7);
    ctx.stroke(); ctx.restore();
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const st = sim.current; if (!st) return;
    const naive = model === "naive";

    if (regRef.current) { ctx.imageSmoothingEnabled = true; ctx.drawImage(regRef.current, 0, 0, W, H); }
    ctx.fillStyle = "#cbd5e1"; ctx.font = "11px JetBrains Mono";
    ctx.fillText(`DECISION REGIONS  ·  ${naive ? "naive (diagonal covariance)" : "full covariance (QDA)"}`, 14, 20);

    // points
    for (const p of st.pts) {
      ctx.beginPath(); ctx.arc(PX(p[0]), PY(p[1]), 3.2, 0, 7);
      ctx.fillStyle = `rgb(${COL[p[2]][0]},${COL[p[2]][1]},${COL[p[2]][2]})`; ctx.globalAlpha = 0.9; ctx.fill(); ctx.globalAlpha = 1;
    }
    // fitted class ellipses (2-sigma)
    drawEllipse(ctx, st.fit.models[0], naive, "#1e3a8a");
    drawEllipse(ctx, st.fit.models[1], naive, "#7f1d1d");

    ctx.fillStyle = "#94a3b8"; ctx.font = "10px JetBrains Mono";
    ctx.fillText(naive ? "axis-aligned ellipses = independence assumption" : "tilted ellipses capture feature correlation", 14, H - 12);
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  });

  const st = sim.current;
  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// FEATURE CORRELATION (tilt)" min={0} max={1} step={0.05} value={tilt} onChange={setTilt} tone="violet"
        help="Rotates both class blobs so the two features become correlated. At 0 the data is axis-aligned and the naive independence assumption is exactly right; turn it up and naive ignores the tilt while full covariance (QDA) follows it." />
      <SegmentedControl label="// MODEL" value={model} onChange={setModel}
        options={[{ value: "naive", label: "Naive (diagonal)" }, { value: "full", label: "Full (QDA)" }]}
        help="Switch which class-conditional covariance is used for the regions and ellipses. Naive Bayes forces a diagonal (axis-aligned) Gaussian per class; QDA fits the full covariance. Compare the two accuracies as you raise the tilt." />
      <Slider label="// POINTS  N" min={40} max={300} step={20} value={N} onChange={setN}
        help="Number of training points (split evenly between the two classes). More data sharpens the fitted Gaussians and the estimated boundary." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setSeed(s => s + 1)} primary>RESAMPLE</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="NAIVE ACCURACY" value={st ? Math.round(st.accN * 100) + "%" : "—"} accent="#a855f7" />
        <StatReadout label="FULL (QDA) ACCURACY" value={st ? Math.round(st.accF * 100) + "%" : "—"} accent="#34d399" />
      </div>
      <Legend items={[
        { color: "#60a5fa", label: "class 0" },
        { color: "#f87171", label: "class 1" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Naive Bayes turns classification into a counting exercise via Bayes' rule:
        estimate each class's prior and its per-feature distribution, then pick the
        class with the highest posterior. The "naive" part is assuming the features
        are independent given the class — so the 2-D Gaussian becomes a product of
        two 1-D ones, which on the plot means an AXIS-ALIGNED ellipse per class. The
        shaded regions are exactly where each class wins the posterior; the ellipses
        are the fitted class densities.
      </DemoP>
      <DemoP>
        With FEATURE CORRELATION at 0 the blobs really are axis-aligned, so naive and
        full QDA give the same boundary and the same accuracy — the wrong assumption
        costs nothing. Now tilt it: the true blobs lean diagonally, full covariance
        rotates its ellipses to match, but naive is stuck drawing axis-aligned ones
        and bends the boundary the wrong way, dropping NAIVE ACCURACY below FULL. Yet
        notice how small the gap usually stays — even a clearly false independence
        assumption often classifies fine, because you only need the posterior argmax
        to land in the right place, not the density to be exactly right.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Naive Bayes is a generative classifier and a perennial baseline: it's fast,
        needs little data, handles huge feature counts, and famously powers spam
        filters and document classification (there with multinomial/Bernoulli
        features over words, not Gaussians). It applies{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/bayes/`} style={{ color: "#a855f7" }}>Bayes' rule</a>{" "}
        with a factorized likelihood; relaxing the diagonal-covariance constraint to a
        full per-class covariance is quadratic discriminant analysis, and a shared
        covariance gives the linear LDA boundary. The class-conditional Gaussians here
        are the same objects a{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/gmm/`} style={{ color: "#a855f7" }}>Gaussian mixture</a>{" "}
        fits, just with known labels.
      </DemoP>
      <DemoP>
        Caveats: the independence assumption makes the predicted probabilities poorly
        calibrated (often overconfident), even when the argmax is right — so trust the
        ranking, not the raw posterior. Correlated or redundant features can hurt, zero
        counts need smoothing (Laplace), and for a sharp decision boundary a
        discriminative model like{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/svm/`} style={{ color: "#a855f7" }}>logistic regression or an SVM</a>{" "}
        usually edges it out. Its enduring value is as a near-instant, hard-to-beat
        baseline you fit before anything fancier.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="CLASSICAL ML" title="Gaussian Naive Bayes"
      subtitle="Classify by Bayes' rule with one bold shortcut: assume the features are independent within each class. Watch the decision regions, and tilt the data so the features correlate to see exactly what the naive diagonal-covariance assumption costs versus full QDA."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/supervised-learning/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<NaiveBayesDemo />);
