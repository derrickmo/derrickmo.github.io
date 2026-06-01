// demos/cross-validation.jsx — k-fold cross-validation for model selection.
//
// Train error always falls as you add capacity, so it can't tell you when you've
// started overfitting. k-fold CV can: split the data into k folds, and for each
// fold train on the other k−1 and score on the held-out one, then average. We fit
// real polynomial regression (normal equations with a touch of ridge) at every
// degree 0..9, run honest k-fold CV at each, and plot the monotonically-falling
// TRAIN error against the U-shaped CV error. The CV minimum is the model-selection
// sweet spot — complex enough to fit, simple enough to generalize — exactly the
// bias/variance tradeoff, measured instead of guessed.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 470, DMAX = 9;

function CrossValDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const [degree, setDegree] = _useState(3);
  const [k, setK] = _useState(5);
  const [noise, setNoise] = _useState(0.18);
  const [seed, setSeed] = _useState(1);
  const [, setTick] = _useState(0);
  const sim = _useRef(null);
  const foldRef = _useRef(0);
  const frameRef = _useRef(0);

  function rng(s0) { let s = s0 >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function randn(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  const truef = (x) => Math.sin(2.9 * x) * 0.7;

  // solve A w = b (n x n) by Gaussian elimination with partial pivoting
  function solve(A, b) {
    const n = b.length;
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
      const piv = A[c][c] || 1e-12;
      for (let r = 0; r < n; r++) { if (r === c) continue; const f = A[r][c] / piv; for (let cc = c; cc < n; cc++) A[r][cc] -= f * A[c][cc]; b[r] -= f * b[c]; }
    }
    return b.map((bi, i) => bi / (A[i][i] || 1e-12));
  }
  function fitPoly(idx, pts, deg) {
    const m = deg + 1; const A = Array.from({ length: m }, () => new Array(m).fill(0)); const b = new Array(m).fill(0);
    for (const i of idx) {
      const x = pts[i][0], y = pts[i][1]; const pw = new Array(2 * m - 1); pw[0] = 1; for (let p = 1; p < 2 * m - 1; p++) pw[p] = pw[p - 1] * x;
      for (let r = 0; r < m; r++) { for (let c = 0; c < m; c++) A[r][c] += pw[r + c]; b[r] += y * pw[r]; }
    }
    for (let r = 0; r < m; r++) A[r][r] += 1e-6; // ridge for stability
    return solve(A, b);
  }
  const predict = (c, x) => { let y = 0, p = 1; for (let i = 0; i < c.length; i++) { y += c[i] * p; p *= x; } return y; };
  function mse(coef, idx, pts) { let e = 0; for (const i of idx) e += (predict(coef, pts[i][0]) - pts[i][1]) ** 2; return e / Math.max(1, idx.length); }

  function reset() {
    const r = rng(seed * 7919 + 5);
    const N = 48; const pts = [];
    for (let i = 0; i < N; i++) { const x = (i / (N - 1)) * 2 - 1 + (r() - 0.5) * 0.04; pts.push([x, truef(x) + randn(r) * noise]); }
    // shuffled fold assignment
    const order = Array.from({ length: N }, (_, i) => i);
    for (let i = N - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [order[i], order[j]] = [order[j], order[i]]; }
    const fold = new Array(N); order.forEach((idx, rank) => { fold[idx] = rank % k; });
    const all = Array.from({ length: N }, (_, i) => i);

    // sweep degree: train error (fit all) + k-fold CV error
    const trainE = [], cvMean = [], cvStd = [];
    for (let d = 0; d <= DMAX; d++) {
      const full = fitPoly(all, pts, d);
      trainE.push(mse(full, all, pts));
      const fe = [];
      for (let f = 0; f < k; f++) {
        const tr = all.filter(i => fold[i] !== f), va = all.filter(i => fold[i] === f);
        if (!va.length) continue;
        const c = fitPoly(tr, pts, d); fe.push(mse(c, va, pts));
      }
      const mu = fe.reduce((a, b) => a + b, 0) / fe.length;
      const sd = Math.sqrt(fe.reduce((a, b) => a + (b - mu) ** 2, 0) / fe.length);
      cvMean.push(mu); cvStd.push(sd);
    }
    let best = 0; for (let d = 1; d <= DMAX; d++) if (cvMean[d] < cvMean[best]) best = d;
    sim.current = { pts, fold, N, all, trainE, cvMean, cvStd, best };
    foldRef.current = 0; frameRef.current = 0;
    setTick(t => t + 1);
  }
  _useEffect(() => { reset(); /* eslint-disable-next-line */ }, [k, noise, seed]);

  _useEffect(() => {
    const tick = () => {
      frameRef.current++;
      if (frameRef.current % 45 === 0) { foldRef.current = (foldRef.current + 1) % k; setTick(t => t + 1); }
      draw();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    /* eslint-disable-next-line */
  }, [degree, k, noise]);

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const st = sim.current; if (!st) return;
    const { pts, fold, all } = st;
    const f = foldRef.current % k;

    // ---- top panel: data + current fit ----
    const tx0 = 16, ty0 = 26, tw = W - 32, th = 220;
    const PX = (x) => tx0 + ((x + 1) / 2) * tw;
    const PY = (y) => ty0 + th / 2 - y * (th / 2 / 1.3);
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono";
    ctx.fillText(`DATA + DEGREE-${degree} FIT   ·   held-out fold ${f + 1}/${k} circled`, tx0, 18);
    ctx.strokeStyle = "rgba(148,163,184,0.12)"; ctx.strokeRect(tx0, ty0, tw, th);
    // true function
    ctx.strokeStyle = "rgba(52,211,153,0.5)"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath();
    for (let i = 0; i <= 120; i++) { const x = -1 + (i / 120) * 2; const yy = PY(truef(x)); i ? ctx.lineTo(PX(x), yy) : ctx.moveTo(PX(x), yy); }
    ctx.stroke(); ctx.setLineDash([]);
    // fit on train (all but current fold)
    const tr = all.filter(i => fold[i] !== f);
    const coef = fitPoly(tr, pts, degree);
    ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 2.2; ctx.beginPath();
    for (let i = 0; i <= 160; i++) { const x = -1 + (i / 160) * 2; const yy = Math.max(ty0 - 30, Math.min(ty0 + th + 30, PY(predict(coef, x)))); i ? ctx.lineTo(PX(x), yy) : ctx.moveTo(PX(x), yy); }
    ctx.stroke();
    // points
    for (let i = 0; i < pts.length; i++) {
      const held = fold[i] === f;
      ctx.beginPath(); ctx.arc(PX(pts[i][0]), PY(pts[i][1]), 3, 0, 7);
      ctx.fillStyle = held ? "#fbbf24" : "#60a5fa"; ctx.fill();
      if (held) { ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(PX(pts[i][0]), PY(pts[i][1]), 6, 0, 7); ctx.stroke(); }
    }

    // ---- bottom panel: error vs degree ----
    const bx0 = 16, by0 = ty0 + th + 34, bw = W - 32, bh = H - by0 - 22;
    let emax = 0; for (let d = 0; d <= DMAX; d++) emax = Math.max(emax, st.cvMean[d] + st.cvStd[d], st.trainE[d]);
    emax = emax * 1.1 || 1;
    const QX = (d) => bx0 + (d / DMAX) * bw;
    const QY = (e) => by0 + bh - Math.min(1, e / emax) * bh;
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono"; ctx.fillText("ERROR vs MODEL COMPLEXITY (polynomial degree)", bx0, by0 - 8);
    ctx.strokeStyle = "rgba(148,163,184,0.12)"; ctx.strokeRect(bx0, by0, bw, bh);
    // CV ±std band
    ctx.fillStyle = "rgba(168,85,247,0.14)"; ctx.beginPath();
    for (let d = 0; d <= DMAX; d++) { const x = QX(d), y = QY(st.cvMean[d] + st.cvStd[d]); d ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    for (let d = DMAX; d >= 0; d--) ctx.lineTo(QX(d), QY(Math.max(0, st.cvMean[d] - st.cvStd[d])));
    ctx.closePath(); ctx.fill();
    // train error
    ctx.strokeStyle = "#34d399"; ctx.lineWidth = 2; ctx.beginPath();
    for (let d = 0; d <= DMAX; d++) { const x = QX(d), y = QY(st.trainE[d]); d ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    // CV error
    ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 2.4; ctx.beginPath();
    for (let d = 0; d <= DMAX; d++) { const x = QX(d), y = QY(st.cvMean[d]); d ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    for (let d = 0; d <= DMAX; d++) { ctx.fillStyle = "#a855f7"; ctx.beginPath(); ctx.arc(QX(d), QY(st.cvMean[d]), 2.5, 0, 7); ctx.fill(); }
    // CV-best star
    ctx.fillStyle = "#34d399"; ctx.font = "10px JetBrains Mono"; ctx.fillText("★ best = " + st.best, QX(st.best) - 10, QY(st.cvMean[st.best]) - 8);
    ctx.strokeStyle = "#34d399"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(QX(st.best), QY(st.cvMean[st.best]), 5, 0, 7); ctx.stroke();
    // current-degree marker
    ctx.strokeStyle = "rgba(226,232,240,0.5)"; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(QX(degree), by0); ctx.lineTo(QX(degree), by0 + bh); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#64748b"; ctx.font = "9px JetBrains Mono";
    for (let d = 0; d <= DMAX; d++) ctx.fillText(d, QX(d) - 2, by0 + bh + 12);
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
      <Slider label="// MODEL COMPLEXITY (degree)" min={0} max={DMAX} step={1} value={degree} onChange={setDegree} tone="violet"
        help="Polynomial degree of the fitted model. Low underfits (high bias); high wiggles through the noise (high variance). The dashed marker on the bottom chart shows where you are vs the CV-optimal degree." />
      <Slider label="// FOLDS  k" min={2} max={10} step={1} value={k} onChange={setK}
        help="Number of cross-validation folds. More folds = more training data per fit (less pessimistic bias) but higher variance and cost; k=5 or 10 is the usual compromise. k=N is leave-one-out." />
      <Slider label="// NOISE" min={0.02} max={0.4} step={0.02} value={noise} onChange={setNoise}
        help="Standard deviation of the noise added to the true curve. More noise pushes the CV-optimal degree LOWER — there's less real signal to justify a complex model. Resets the data." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => st && setDegree(st.best)} primary>SELECT BEST (CV)</DemoButton>
        <DemoButton onClick={() => setSeed(s => s + 1)}>RESAMPLE</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="CV ERROR (deg)" value={st ? st.cvMean[degree].toFixed(3) : "—"} accent="#a855f7" />
        <StatReadout label="TRAIN ERROR (deg)" value={st ? st.trainE[degree].toFixed(3) : "—"} accent="#34d399" />
        <StatReadout label="CV ± STD" value={st ? "±" + st.cvStd[degree].toFixed(3) : "—"} accent="#a855f7" />
        <StatReadout label="BEST DEGREE" value={st ? st.best : "—"} accent="#34d399" />
      </div>
      <Legend items={[
        { color: "#a855f7", label: "CV error ±std" },
        { color: "#34d399", label: "train error" },
        { color: "#fbbf24", label: "held-out fold" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Top: the points, the true curve (dashed green), and your degree-{degree}
        polynomial. Each moment, one fold (yellow) is held out, the model is trained
        on the rest, and its error on that yellow fold is what CV records — then the
        held-out fold rotates so every point gets scored exactly once as unseen data.
        Bottom: do that across all complexities. The green TRAIN error only ever
        falls — a degree-9 polynomial threads every point and looks perfect, which is
        why train error can't be trusted to pick a model.
      </DemoP>
      <DemoP>
        The purple CV error tells the truth: it drops as the model gains the capacity
        to capture the real signal, bottoms out at the ★ best degree, then climbs as
        higher degrees start fitting the noise and fail on held-out folds. That U is
        the bias/variance tradeoff made measurable. Hit SELECT BEST to jump to the CV
        minimum. Turn NOISE up and watch the sweet spot slide to a SIMPLER model —
        noisier data supports less complexity — and turn it down to justify more.
        This is how degree, regularization strength, tree depth, and k in k-NN are
        actually chosen in practice.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Cross-validation is the standard tool for honest performance estimation and
        hyperparameter selection when data is limited. It's how you pick a
        regularization strength, a tree depth, or the k in{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/knn/`} style={{ color: "#a855f7" }}>k-NN</a>{" "}
        without peeking at the test set, and it directly measures the{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/overfitting/`} style={{ color: "#a855f7" }}>overfitting</a>{" "}
        you'd otherwise only theorize about via the{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/bias-variance-decomp/`} style={{ color: "#a855f7" }}>bias/variance decomposition</a>.
        k=5 or 10 are typical; leave-one-out (k=N) is nearly unbiased but high-variance
        and expensive.
      </DemoP>
      <DemoP>
        Caveats: folds must respect structure — shuffle and stratify for class
        balance, but use grouped or time-series splits when points are correlated
        (otherwise leakage makes CV wildly optimistic). Selecting a model AND
        reporting its CV score on the same folds is itself a form of overfitting to
        the validation set; nested CV or a held-out test set fixes that. CV estimates
        the error of the procedure at a given training size, and its folds are
        correlated, so the naive standard error understates the true uncertainty. For
        big data, a single large validation split is often enough.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="FOUNDATIONS" title="Cross-Validation"
      subtitle="Train error always falls with complexity, so it can't pick a model. Watch honest k-fold CV rotate a held-out fold through the data and trace a U-shaped error curve whose minimum is the right amount of complexity — the bias/variance tradeoff, measured."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/ml-theory/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<CrossValDemo />);
