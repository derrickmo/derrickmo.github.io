// demos/bagging-boosting.jsx — two ways to ensemble trees, and why they differ.
//
// Both combine many regression trees, but they attack opposite errors:
//   BAGGING   — fit each tree on a bootstrap resample of the data, then AVERAGE.
//               Trees are deep (high variance, low bias); averaging cancels the
//               variance. Parallel, order-independent. (Random forests add this.)
//   BOOSTING  — fit trees SEQUENTIALLY, each to the residual the ensemble still
//               gets wrong, adding a shrunken step ν·tree. Trees are shallow
//               (high bias, low variance); stacking them drives the bias down.
// Same base learner (a CART regression tree), opposite philosophy: bagging wants
// strong learners and reduces variance; boosting wants weak learners and reduces
// bias. We fit both honestly on a noisy 1-D curve.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 470;

function BaggingBoostingDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [method, setMethod] = _useState("boosting");
  const [M, setM] = _useState(25);
  const [depth, setDepth] = _useState(2);
  const [nu, setNu] = _useState(0.3);
  const [noise, setNoise] = _useState(0.15);
  const [seed, setSeed] = _useState(1);
  const [, setTick] = _useState(0);
  const ref = _useRef(null);

  function rng(s0) { let s = s0 >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function randn(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  const truef = (x) => 0.5 + 0.4 * Math.sin(2 * Math.PI * x) - 0.18 * x;

  // CART regression tree on 1-D x
  function buildTree(xs, ys, d) {
    const n = ys.length, mean = ys.reduce((a, b) => a + b, 0) / n;
    if (d === 0 || n < 4) return { leaf: true, val: mean };
    // SSE of current node
    let bestThr = null, bestSSE = Infinity, bestL = null, bestR = null;
    const idx = xs.map((x, i) => i).sort((a, b) => xs[a] - xs[b]);
    for (let s = 1; s < n; s++) {
      const thr = (xs[idx[s - 1]] + xs[idx[s]]) / 2;
      if (xs[idx[s]] === xs[idx[s - 1]]) continue;
      const L = [], R = [];
      for (let i = 0; i < n; i++) (xs[i] <= thr ? L : R).push(ys[i]);
      if (!L.length || !R.length) continue;
      const ml = L.reduce((a, b) => a + b, 0) / L.length, mr = R.reduce((a, b) => a + b, 0) / R.length;
      let sse = 0; L.forEach(v => sse += (v - ml) ** 2); R.forEach(v => sse += (v - mr) ** 2);
      if (sse < bestSSE) { bestSSE = sse; bestThr = thr; bestL = L; bestR = R; }
    }
    if (bestThr === null) return { leaf: true, val: mean };
    const lx = [], ly = [], rx = [], ry = [];
    for (let i = 0; i < n; i++) { if (xs[i] <= bestThr) { lx.push(xs[i]); ly.push(ys[i]); } else { rx.push(xs[i]); ry.push(ys[i]); } }
    return { leaf: false, thr: bestThr, left: buildTree(lx, ly, d - 1), right: buildTree(rx, ry, d - 1) };
  }
  function predTree(t, x) { while (!t.leaf) t = x <= t.thr ? t.left : t.right; return t.val; }

  function build() {
    const r = rng(seed * 2246822519);
    const N = 40;
    const xs = Array.from({ length: N }, () => r());
    const ys = xs.map(x => truef(x) + noise * randn(r));
    const G = 120, grid = Array.from({ length: G }, (_, i) => i / (G - 1));
    let predGrid;
    if (method === "bagging") {
      const acc = new Array(G).fill(0);
      for (let m = 0; m < M; m++) {
        const bx = [], by = []; for (let i = 0; i < N; i++) { const j = Math.floor(r() * N); bx.push(xs[j]); by.push(ys[j]); }
        const t = buildTree(bx, by, depth);
        for (let g = 0; g < G; g++) acc[g] += predTree(t, grid[g]);
      }
      predGrid = acc.map(v => v / M);
    } else { // gradient boosting
      const F0 = ys.reduce((a, b) => a + b, 0) / N;
      let Ftrain = new Array(N).fill(F0);
      const acc = new Array(G).fill(F0);
      for (let m = 0; m < M; m++) {
        const resid = ys.map((y, i) => y - Ftrain[i]);
        const t = buildTree(xs, resid, depth);
        for (let i = 0; i < N; i++) Ftrain[i] += nu * predTree(t, xs[i]);
        for (let g = 0; g < G; g++) acc[g] += nu * predTree(t, grid[g]);
      }
      predGrid = acc;
    }
    // metrics
    let trainMSE = 0; for (let i = 0; i < N; i++) { const p = interp(grid, predGrid, xs[i]); trainMSE += (p - ys[i]) ** 2; } trainMSE /= N;
    let testMSE = 0; for (let g = 0; g < G; g++) testMSE += (predGrid[g] - truef(grid[g])) ** 2; testMSE /= G;
    ref.current = { xs, ys, grid, predGrid, trainMSE, testMSE };
  }
  function interp(grid, vals, x) { const G = grid.length; let i = Math.min(G - 1, Math.max(0, Math.round(x * (G - 1)))); return vals[i]; }
  _useEffect(() => { build(); setTick(t => t + 1); /* eslint-disable-next-line */ }, [method, M, depth, nu, noise, seed]);

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";
    const st = ref.current; if (!st) return;
    const pad = 40, plot = H - 60, ylo = -0.3, yhi = 1.3;
    const PX = (x) => pad + x * (W - 2 * pad);
    const PY = (y) => pad + (1 - (y - ylo) / (yhi - ylo)) * (plot - pad);

    ctx.fillStyle = "#94a3b8"; ctx.fillText((method === "bagging" ? "BAGGING (average of " : "BOOSTING (sum of ") + M + (method === "bagging" ? " bootstrap trees)" : " residual trees)"), pad, 20);
    // truth
    ctx.strokeStyle = "rgba(52,211,153,0.6)"; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.8;
    ctx.beginPath(); st.grid.forEach((x, g) => { const xx = PX(x), yy = PY(truef(x)); g === 0 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy); }); ctx.stroke(); ctx.setLineDash([]);
    // train points
    ctx.fillStyle = "rgba(96,165,250,0.6)"; st.xs.forEach((x, i) => { ctx.beginPath(); ctx.arc(PX(x), PY(Math.max(ylo, Math.min(yhi, st.ys[i]))), 2.8, 0, 7); ctx.fill(); });
    // ensemble prediction
    ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 2.4;
    ctx.beginPath(); st.grid.forEach((x, g) => { const xx = PX(x), yy = PY(Math.max(ylo, Math.min(yhi, st.predGrid[g]))); g === 0 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy); }); ctx.stroke();

    ctx.fillStyle = "#60a5fa"; ctx.font = "11px JetBrains Mono"; ctx.fillText("train MSE " + st.trainMSE.toFixed(4), pad, H - 28);
    ctx.fillStyle = "#34d399"; ctx.fillText("test MSE (vs truth) " + st.testMSE.toFixed(4), pad + 200, H - 28);
    ctx.fillStyle = "#64748b"; ctx.fillText(method === "bagging" ? "deep trees → averaging cuts variance" : "shallow trees → stacking cuts bias", pad, H - 12);
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  });

  const st = ref.current;
  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <SegmentedControl label="// METHOD" value={method} onChange={setMethod}
        options={[{ value: "bagging", label: "Bagging" }, { value: "boosting", label: "Boosting" }]}
        help="Bagging averages trees fit on bootstrap resamples (variance reduction — wants DEEP trees). Boosting adds trees sequentially to the residual (bias reduction — wants SHALLOW trees). Flip and re-tune depth to feel the difference." />
      <Slider label="// N ESTIMATORS" min={1} max={60} step={1} value={M} onChange={setM}
        help="Number of trees. Drag it up and watch the ensemble form — bagging smooths toward a stable average; boosting refines the fit round by round." />
      <Slider label="// TREE DEPTH" min={1} max={5} step={1} value={depth} onChange={setDepth}
        help="Depth of each base tree. Set it deep (4-5) for bagging so each tree is a high-variance learner to average away; set it shallow (1-2) for boosting so each is a weak learner that only nudges the residual." />
      <Slider label="// LEARNING RATE ν" min={0.05} max={1} step={0.05} value={nu} onChange={setNu}
        help="Boosting only: shrinkage on each added tree. Smaller ν needs more trees but generalizes better (less overfitting). Has no effect in bagging." />
      <Slider label="// NOISE" min={0.05} max={0.4} step={0.01} value={noise} onChange={setNoise}
        help="Label noise. Boosting with too many deep trees will start chasing this noise (test MSE rises) — the classic boosting overfitting failure mode." />
      <DemoButton onClick={() => setSeed(s => s + 1)} primary>RESAMPLE</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="TRAIN MSE" value={st ? st.trainMSE.toFixed(4) : "—"} accent="#60a5fa" />
        <StatReadout label="TEST MSE" value={st ? st.testMSE.toFixed(4) : "—"} accent="#34d399" />
      </div>
      <Legend items={[
        { color: "#a855f7", label: "ensemble prediction" },
        { color: "#34d399", label: "true function" },
        { color: "#60a5fa", label: "noisy training data" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Both methods stack the same kind of tree but in opposite ways. Pick BAGGING
        with a deep tree (depth 4-5): a single deep tree would overfit wildly, but
        each is trained on a different bootstrap sample, so averaging {M} of them
        cancels the per-tree noise and lands near the truth — variance reduction, and
        the trees never needed to talk to each other. Now pick BOOSTING with a shallow
        tree (depth 1-2): one stump is hopeless, but each new tree is fit to whatever
        the running sum still gets wrong, so the ensemble climbs toward the curve one
        correction at a time — bias reduction.
      </DemoP>
      <DemoP>
        Drag N ESTIMATORS to watch each build up, and the LEARNING RATE ν to see
        boosting's speed-vs-overfitting trade (small ν, many trees generalizes best).
        Then crank NOISE and push boosting's depth and count up: train MSE keeps
        falling but test MSE turns back up — boosting will happily memorize noise,
        while bagging's averaging makes it far more robust. That contrast is the whole
        story: bagging is a variance machine, boosting is a bias machine.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        This is the engine behind the most reliable models in tabular ML.
        <strong> Random forests</strong> are bagging with extra per-split feature
        randomness; <strong>gradient boosting</strong> (XGBoost, LightGBM, CatBoost)
        is the boosting shown here and still wins a large share of Kaggle tabular
        competitions. The bias/variance framing connects directly to the{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/bias-variance-decomp/`} style={{ color: "#a855f7" }}>bias-variance decomposition</a>
        and the base learner is the{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/decision-tree/`} style={{ color: "#a855f7" }}>decision tree</a>.
      </DemoP>
      <DemoP>
        Caveats: bagging barely helps stable, high-bias learners (averaging a stump
        with a stump is still a stump) — it needs high-variance base models.
        Boosting is sequential (harder to parallelize) and sensitive to noise and
        learning rate; without shrinkage and early stopping it overfits. Gradient
        boosting also generalizes the residual-fitting idea to any differentiable loss
        via functional gradient descent, which is why it handles classification,
        ranking, and survival models, not just the squared-error regression here.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Bagging vs Boosting"
      subtitle="Two ways to ensemble trees: bagging averages bootstrap-trained deep trees to cut variance; boosting stacks shallow trees on the residual to cut bias. Tune depth, count, and noise to see each shine and fail."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/ml-theory/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<BaggingBoostingDemo />);
