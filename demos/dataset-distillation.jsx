// demos/dataset-distillation.jsx — distill a dataset into a few synthetic points.
//
// Dataset distillation learns a tiny SYNTHETIC training set on which a model
// trained from scratch generalizes almost as well as one trained on all the
// data. This demo implements KIP (Kernel Inducing Points, Nguyen et al.): the
// model is closed-form kernel ridge regression, so we can backprop the
// downstream loss straight into the coordinates of the synthetic support points.
//   predict(x) = k(x, S) · (K_SS + λI)^{-1} y_S
//   loss       = mean_t (predict(x_t) − y_t)²   over the FULL data
// We move the m synthetic points (squares) by gradient descent on that loss.
// They migrate to the spots that best summarize the real decision boundary —
// often nothing like real samples, but maximally informative for the model.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480;

function DatasetDistillationDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const [m, setM] = _useState(6);
  const [sigma, setSigma] = _useState(0.16);
  const [lam, setLam] = _useState(0.05);
  const [dataset, setDataset] = _useState("moons");
  const [running, setRunning] = _useState(true);
  const [, setTick] = _useState(0);
  const S = _useRef({ Xt: [], yt: [], Xs: [], ys: [], step: 0, acc: 0, loss: 0 });

  function rng(s0) { let s = s0 >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function randn(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  function genData() {
    const r = rng(20259), N = 160, raw = [], lab = [];
    if (dataset === "moons") {
      for (let i = 0; i < N; i++) {
        const cls = i < N / 2 ? 0 : 1, t = Math.PI * r();
        let x, y;
        if (cls === 0) { x = Math.cos(t); y = Math.sin(t); }
        else { x = 1 - Math.cos(t); y = 0.5 - Math.sin(t); }
        raw.push([x + 0.12 * randn(r), y + 0.12 * randn(r)]); lab.push(cls ? 1 : -1);
      }
    } else { // blobs
      const ctr = [[0.3, 0.35], [0.7, 0.68]];
      for (let i = 0; i < N; i++) {
        const cls = i < N / 2 ? 0 : 1, c = ctr[cls];
        raw.push([c[0] + 0.11 * randn(r), c[1] + 0.11 * randn(r)]); lab.push(cls ? 1 : -1);
      }
    }
    // normalize to [0.08,0.92]
    const xs = raw.map(p => p[0]), ys = raw.map(p => p[1]);
    const mnx = Math.min(...xs), mxx = Math.max(...xs), mny = Math.min(...ys), mxy = Math.max(...ys);
    const Xt = raw.map(p => [0.08 + 0.84 * (p[0] - mnx) / (mxx - mnx || 1), 0.08 + 0.84 * (p[1] - mny) / (mxy - mny || 1)]);
    return { Xt, yt: lab };
  }

  function initSynth(Xt) {
    const r = rng(7 + m);
    const Xs = [], ys = [];
    for (let i = 0; i < m; i++) {
      Xs.push([0.2 + 0.6 * r(), 0.2 + 0.6 * r()]);
      ys.push(i % 2 === 0 ? 1 : -1);
    }
    return { Xs, ys };
  }

  function reset() {
    const { Xt, yt } = genData();
    const { Xs, ys } = initSynth(Xt);
    S.current = { Xt, yt, Xs, ys, step: 0, acc: 0, loss: 0 };
    setTick(t => t + 1);
  }
  _useEffect(() => { reset(); /* eslint-disable-next-line */ }, [m, dataset]);

  // --- kernel ridge machinery ---
  function kern(a, b) { const dx = a[0] - b[0], dy = a[1] - b[1]; return Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma)); }
  // solve (A) x = b  (n×n), Gaussian elimination
  function solve(A, b) {
    const n = b.length, M = A.map((row, i) => row.concat([b[i]]));
    for (let c = 0; c < n; c++) {
      let piv = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
      [M[c], M[piv]] = [M[piv], M[c]];
      const d = M[c][c] || 1e-9;
      for (let k = c; k <= n; k++) M[c][k] /= d;
      for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
    }
    return M.map(row => row[n]);
  }
  // alpha = (K_SS + λI)^{-1} y_S
  function alphaOf(Xs, ys) {
    const mm = Xs.length, K = [];
    for (let i = 0; i < mm; i++) { K.push([]); for (let j = 0; j < mm; j++) K[i].push(kern(Xs[i], Xs[j]) + (i === j ? lam : 0)); }
    return solve(K, ys);
  }
  function predict(x, Xs, alpha) { let s = 0; for (let j = 0; j < Xs.length; j++) s += kern(x, Xs[j]) * alpha[j]; return s; }
  function lossOf(Xs, ys) {
    const alpha = alphaOf(Xs, ys); const { Xt, yt } = S.current; let L = 0;
    for (let i = 0; i < Xt.length; i++) { const e = predict(Xt[i], Xs, alpha) - yt[i]; L += e * e; }
    return L / Xt.length;
  }
  function metrics(Xs, ys) {
    const alpha = alphaOf(Xs, ys); const { Xt, yt } = S.current; let L = 0, ok = 0;
    for (let i = 0; i < Xt.length; i++) { const f = predict(Xt[i], Xs, alpha); const e = f - yt[i]; L += e * e; if (Math.sign(f) === yt[i]) ok++; }
    return { loss: L / Xt.length, acc: ok / Xt.length };
  }

  // one GD step on synthetic point coordinates via central finite differences
  function gdStep() {
    const st = S.current, Xs = st.Xs.map(p => p.slice()), ys = st.ys;
    const eps = 1e-3, lr = 0.6;
    const grad = Xs.map(() => [0, 0]);
    for (let i = 0; i < Xs.length; i++) {
      for (let d = 0; d < 2; d++) {
        const o = Xs[i][d];
        Xs[i][d] = o + eps; const lp = lossOf(Xs, ys);
        Xs[i][d] = o - eps; const lm = lossOf(Xs, ys);
        Xs[i][d] = o;
        grad[i][d] = (lp - lm) / (2 * eps);
      }
    }
    for (let i = 0; i < Xs.length; i++) for (let d = 0; d < 2; d++) {
      Xs[i][d] = Math.max(0.02, Math.min(0.98, Xs[i][d] - lr * grad[i][d]));
    }
    const mtr = metrics(Xs, ys);
    st.Xs = Xs; st.step++; st.acc = mtr.acc; st.loss = mtr.loss;
  }

  _useEffect(() => {
    let last = performance.now();
    const tick = (now) => {
      if (running && now - last > 60) { last = now; for (let i = 0; i < 2; i++) gdStep(); setTick(t => t + 1); }
      draw();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    /* eslint-disable-next-line */
  }, [running, sigma, lam]);

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";
    const st = S.current; if (!st.Xt.length) return;
    const pad = 24, plot = H - 56;
    const PX = (x) => pad + x * (W - 2 * pad);
    const PY = (y) => pad + y * (plot - pad);

    // decision field from the distilled model
    const alpha = alphaOf(st.Xs, st.ys);
    const gx = 46, gy = 40, cw = (W - 2 * pad) / gx, ch = (plot - pad) / gy;
    for (let i = 0; i < gx; i++) for (let j = 0; j < gy; j++) {
      const x = i / (gx - 1), y = j / (gy - 1);
      const f = predict([x, y], st.Xs, alpha), t = Math.max(-1, Math.min(1, f));
      const a = 0.10 + 0.16 * Math.abs(t);
      ctx.fillStyle = t >= 0 ? `rgba(168,85,247,${a})` : `rgba(96,165,250,${a})`;
      ctx.fillRect(PX(x) - cw / 2, PY(y) - ch / 2, cw + 1, ch + 1);
    }

    // target points
    st.Xt.forEach((p, i) => {
      ctx.fillStyle = st.yt[i] > 0 ? "rgba(168,85,247,0.45)" : "rgba(96,165,250,0.45)";
      ctx.beginPath(); ctx.arc(PX(p[0]), PY(p[1]), 2.4, 0, 7); ctx.fill();
    });

    // synthetic support points (squares)
    st.Xs.forEach((p, i) => {
      const x = PX(p[0]), y = PY(p[1]);
      ctx.fillStyle = st.ys[i] > 0 ? "#a855f7" : "#60a5fa";
      ctx.fillRect(x - 6, y - 6, 12, 12);
      ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 1.6; ctx.strokeRect(x - 6, y - 6, 12, 12);
    });

    ctx.fillStyle = "#94a3b8";
    ctx.fillText(st.Xs.length + " synthetic points learned from " + st.Xt.length + " real (" + (st.Xs.length / st.Xt.length * 100).toFixed(1) + "%)", pad, H - 30);
    ctx.fillStyle = "#34d399"; ctx.fillText("step " + st.step + "  ·  distilled accuracy on full data " + (st.acc * 100).toFixed(1) + "%", pad, H - 14);
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  });

  const st = S.current;
  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <SegmentedControl label="// DATASET" value={dataset} onChange={setDataset}
        options={[{ value: "moons", label: "Two moons" }, { value: "blobs", label: "Two blobs" }]}
        help="Shape of the real data being distilled. Moons need a curved boundary, so the synthetic points have to spread out cleverly; blobs are linearly separable and need fewer." />
      <Slider label="// SYNTHETIC POINTS (m)" min={2} max={12} step={1} value={m} onChange={setM}
        help="How many synthetic training points to learn. Watch how few it takes to recover the full boundary — that's the whole pitch of distillation. Too few and accuracy caps out." />
      <Slider label="// KERNEL WIDTH σ" min={0.06} max={0.4} step={0.02} value={sigma} onChange={setSigma}
        help="RBF kernel bandwidth of the ridge model. Wide = smooth, blobby boundary; narrow = wiggly and local. The distilled points adapt to whatever width you pick." />
      <Slider label="// REGULARIZATION λ" min={0.005} max={0.3} step={0.005} value={lam} onChange={setLam}
        help="Ridge penalty in (K+λI). More regularization smooths predictions and stabilizes the matrix solve at the cost of some sharpness." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setRunning(r => !r)} primary>{running ? "PAUSE" : "RESUME"}</DemoButton>
        <DemoButton onClick={reset}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="DISTILLED ACC" value={st ? (st.acc * 100).toFixed(1) + "%" : "—"} accent="#34d399" />
        <StatReadout label="DISTILL LOSS" value={st ? st.loss.toFixed(3) : "—"} accent="#a855f7" />
      </div>
      <Legend items={[
        { color: "#a855f7", label: "class +1 (point & region)" },
        { color: "#60a5fa", label: "class −1" },
        { color: "#e2e8f0", label: "synthetic point (square)" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        The faint dots are 160 real points; the bold squares are a handful of
        <i> synthetic</i> training points we're learning. The model is closed-form
        kernel ridge regression, so given the synthetic set we can solve for its
        predictions exactly and measure how well it classifies the full data — then
        push that error back into the squares' coordinates by gradient descent. Watch
        them drift to the positions that best reconstruct the real decision boundary
        (the colored field), with accuracy climbing as they settle.
      </DemoP>
      <DemoP>
        Two things to play with. Drop SYNTHETIC POINTS to the minimum and see how few
        it takes — distillation routinely matches full-data accuracy with a tiny
        fraction of the examples, because the learned points sit exactly where the
        model needs information (often along the boundary, not at class centers).
        Switch to two moons: now the squares can't just mark cluster centers, they
        have to arrange themselves to carve a curve. The synthetic points usually
        don't look like real samples at all — they're optimized to teach, not to be
        realistic.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Dataset distillation (Wang et al. 2018; KIP, gradient/trajectory matching)
        compresses a training set into a few synthetic examples that train a model
        almost as well as the original. It powers fast neural-architecture search,
        continual learning (tiny replay buffers), and privacy-preserving data release,
        and it's the synthetic-data cousin of{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/coreset/`} style={{ color: "#a855f7" }}>coresets</a> —
        coresets <i>select</i> real points, distillation <i>synthesizes</i> new ones,
        which can be far more compact. It also connects to{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/distillation/`} style={{ color: "#a855f7" }}>model distillation</a>
        (compress the model) and{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/active-learning/`} style={{ color: "#a855f7" }}>active learning</a>
        (which real points matter).
      </DemoP>
      <DemoP>
        Caveats: the synthetic set is optimized for a specific model class and
        objective — distill for kernel ridge here and it won't transfer cleanly to a
        deep net, and KIP-style methods need the inner learner to be differentiable
        (closed-form or unrolled). It can also overfit the distillation target,
        capturing quirks of this dataset rather than the underlying distribution. Real
        deep-net distillation is expensive (backprop through training) and is an
        active research area; this kernel version is the tractable, honest core of the
        idea.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Dataset Distillation"
      subtitle="Learn a handful of synthetic training points whose model reproduces the full dataset's decision boundary. Watch them migrate into the most informative positions as the distillation loss falls."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/ml-theory/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<DatasetDistillationDemo />);
