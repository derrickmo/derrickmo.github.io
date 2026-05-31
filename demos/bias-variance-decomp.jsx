// demos/bias-variance-decomp.jsx — the bias-variance decomposition, measured.
//
// Expected test error of a model splits into three pieces:
//   E[(y − f̂(x))²] = bias(x)² + Var(f̂(x)) + σ²
// bias² = how far the AVERAGE model is from the truth (rigidity),
// variance = how much models WIGGLE across different training sets (sensitivity),
// σ² = irreducible label noise. We estimate them empirically: draw many
// independent noisy training sets, fit a polynomial of a given degree to each,
// and measure the spread of predictions. Sweeping the degree traces the classic
// U-shaped error curve — bias falls, variance rises, total is minimized in the
// middle.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 500;

function BiasVarianceDecompDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [degSel, setDegSel] = _useState(3);
  const [noise, setNoise] = _useState(0.18);
  const [N, setN] = _useState(14);
  const [T, setT] = _useState(40);
  const [seed, setSeed] = _useState(1);
  const [, setTick] = _useState(0);
  const ref = _useRef(null);

  const MAXD = 12;
  function rng(s0) { let s = s0 >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function randn(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  const truef = (x) => 0.5 + 0.4 * Math.sin(2 * Math.PI * x) - 0.2 * x;

  function polyfit(xs, ys, deg) {
    const n = xs.length, m = deg + 1;
    const A = Array.from({ length: m }, () => new Array(m).fill(0)), b = new Array(m).fill(0);
    for (let i = 0; i < n; i++) {
      const pw = [1]; for (let kk = 1; kk < 2 * m; kk++) pw[kk] = pw[kk - 1] * xs[i];
      for (let r = 0; r < m; r++) { b[r] += pw[r] * ys[i]; for (let c = 0; c < m; c++) A[r][c] += pw[r + c]; }
    }
    for (let c = 0; c < m; c++) {
      let piv = c; for (let r = c + 1; r < m; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
      [A[c], A[piv]] = [A[piv], A[c]]; [b[c], b[piv]] = [b[piv], b[c]];
      const d = A[c][c] || 1e-9; for (let cc = c; cc < m; cc++) A[c][cc] /= d; b[c] /= d;
      for (let r = 0; r < m; r++) if (r !== c) { const f = A[r][c]; for (let cc = c; cc < m; cc++) A[r][cc] -= f * A[c][cc]; b[r] -= f * b[c]; }
    }
    return b;
  }
  const polyval = (c, x) => { let p = 1, s = 0; for (let kk = 0; kk < c.length; kk++) { s += c[kk] * p; p *= x; } return s; };

  function build() {
    const r = rng(seed * 2654435761);
    const G = 60, grid = Array.from({ length: G }, (_, i) => i / (G - 1));
    const ftrue = grid.map(truef);
    // per-degree: ensemble of grid predictions
    const byDeg = []; // [{preds: T×G, bias2, varc, total}]
    for (let d = 1; d <= MAXD; d++) {
      const preds = [];
      for (let t = 0; t < T; t++) {
        const xs = Array.from({ length: N }, () => r());
        const ys = xs.map(x => truef(x) + noise * randn(r));
        const c = polyfit(xs, ys, d);
        preds.push(grid.map(x => polyval(c, x)));
      }
      // mean prediction per grid point
      const mean = grid.map((_, g) => { let s = 0; for (let t = 0; t < T; t++) s += preds[t][g]; return s / T; });
      let bias2 = 0, varc = 0;
      for (let g = 0; g < G; g++) {
        bias2 += (mean[g] - ftrue[g]) ** 2;
        let v = 0; for (let t = 0; t < T; t++) v += (preds[t][g] - mean[g]) ** 2; varc += v / T;
      }
      bias2 /= G; varc /= G;
      byDeg.push({ preds, mean, bias2, varc, total: bias2 + varc + noise * noise });
    }
    ref.current = { grid, ftrue, byDeg, sigma2: noise * noise };
  }
  _useEffect(() => { build(); setTick(t => t + 1); /* eslint-disable-next-line */ }, [noise, N, T, seed]);

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";
    const st = ref.current; if (!st) return;

    // ---- Panel A: decomposition vs degree ----
    const pad = 44, aTop = 34, aH = 220;
    const emax = Math.min(0.35, Math.max(...st.byDeg.map(d => d.total)) * 1.05) || 0.3;
    const AX = (d) => pad + (d - 1) / (MAXD - 1) * (W - pad - 20);
    const AY = (e) => aTop + (1 - Math.min(e, emax) / emax) * aH;
    ctx.fillStyle = "#e2e8f0"; ctx.fillText("ERROR DECOMPOSITION vs model complexity (degree)", pad, 20);
    // irreducible noise line
    ctx.strokeStyle = "rgba(148,163,184,0.5)"; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(pad, AY(st.sigma2)); ctx.lineTo(W - 20, AY(st.sigma2)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#64748b"; ctx.font = "9px JetBrains Mono"; ctx.fillText("σ² (irreducible)", W - 110, AY(st.sigma2) - 3);

    const curve = (key, color, wd) => { ctx.strokeStyle = color; ctx.lineWidth = wd; ctx.beginPath(); st.byDeg.forEach((d, i) => { const x = AX(i + 1), y = AY(d[key]); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }); ctx.stroke(); };
    curve("bias2", "#60a5fa", 2);
    curve("varc", "#f87171", 2);
    curve("total", "#a855f7", 2.6);
    // selected-degree marker
    ctx.strokeStyle = "rgba(226,232,240,0.7)"; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(AX(degSel), aTop); ctx.lineTo(AX(degSel), aTop + aH); ctx.stroke();
    // degree ticks
    ctx.fillStyle = "#64748b"; ctx.font = "9px JetBrains Mono";
    for (let d = 1; d <= MAXD; d += (MAXD > 8 ? 2 : 1)) ctx.fillText(String(d), AX(d) - 3, aTop + aH + 12);

    // ---- Panel B: ensemble of fits at selected degree ----
    const bTop = aTop + aH + 40, bH = H - bTop - 22, bPad = 44;
    const dd = st.byDeg[degSel - 1];
    const ylo = -0.3, yhi = 1.3;
    const BX = (x) => bPad + x * (W - bPad - 20);
    const BY = (y) => bTop + (1 - (y - ylo) / (yhi - ylo)) * bH;
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono"; ctx.fillText("THE " + T + " FITTED MODELS at degree " + degSel + "  (spread = variance)", bPad, bTop - 8);
    // spaghetti
    ctx.lineWidth = 1; const showT = Math.min(T, 40);
    for (let t = 0; t < showT; t++) {
      ctx.strokeStyle = "rgba(248,113,113,0.18)"; ctx.beginPath();
      st.grid.forEach((x, g) => { const xx = BX(x), yy = BY(Math.max(ylo, Math.min(yhi, dd.preds[t][g]))); g === 0 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy); }); ctx.stroke();
    }
    // mean fit
    ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 2.4; ctx.beginPath();
    st.grid.forEach((x, g) => { const xx = BX(x), yy = BY(Math.max(ylo, Math.min(yhi, dd.mean[g]))); g === 0 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy); }); ctx.stroke();
    // truth
    ctx.strokeStyle = "#34d399"; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.8; ctx.beginPath();
    st.grid.forEach((x, g) => { const xx = BX(x), yy = BY(st.ftrue[g]); g === 0 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy); }); ctx.stroke(); ctx.setLineDash([]);
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  });

  const st = ref.current;
  const dd = st ? st.byDeg[degSel - 1] : null;
  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// COMPLEXITY (degree)" min={1} max={MAXD} step={1} value={degSel} onChange={setDegSel} tone="violet"
        help="Polynomial degree of each model, and the marker on the top curve. Low degree = the spaghetti is tight but misses the curve (bias). High degree = every model wiggles differently (variance)." />
      <Slider label="// LABEL NOISE σ" min={0.05} max={0.4} step={0.01} value={noise} onChange={setNoise}
        help="Std of the noise added to training labels. Sets the irreducible σ² floor AND inflates variance, since noisier data makes flexible models chase the noise." />
      <Slider label="// TRAIN POINTS N" min={6} max={40} step={1} value={N} onChange={setN}
        help="Points per training set. More data suppresses variance — the high-degree models stop overfitting — so the U-curve flattens and its minimum shifts right." />
      <Slider label="// ENSEMBLE SIZE" min={10} max={80} step={5} value={T} onChange={setT}
        help="How many independent training sets we draw to estimate the averages. Larger = smoother, more accurate bias/variance estimates." />
      <DemoButton onClick={() => setSeed(s => s + 1)} primary>RESAMPLE</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="BIAS²" value={dd ? dd.bias2.toFixed(4) : "—"} accent="#60a5fa" />
        <StatReadout label="VARIANCE" value={dd ? dd.varc.toFixed(4) : "—"} accent="#f87171" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="TOTAL ERROR" value={dd ? dd.total.toFixed(4) : "—"} accent="#a855f7" />
        <StatReadout label="σ² FLOOR" value={st ? st.sigma2.toFixed(4) : "—"} />
      </div>
      <Legend items={[
        { color: "#60a5fa", label: "bias²" },
        { color: "#f87171", label: "variance" },
        { color: "#a855f7", label: "total error / mean fit" },
        { color: "#34d399", label: "true function" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        We draw {T} independent noisy training sets and fit a degree-{degSel}
        polynomial to each — the red spaghetti in the bottom panel is those fits, the
        purple line is their average, the green dashed line is the truth. Two things
        are visible at once: how far the purple average sits from the green truth
        (that gap is <i>bias</i>), and how widely the red curves fan out (that spread
        is <i>variance</i>). The top panel plots both against model complexity as you
        sweep the degree.
      </DemoP>
      <DemoP>
        Drag COMPLEXITY from left to right. At low degree the spaghetti is tight but
        the average misses the wiggle — high bias, low variance. At high degree the
        average nails the truth but the individual fits thrash wildly — low bias, high
        variance. Total error (purple, top) is their sum plus the σ² noise floor, and
        it bottoms out in the middle: the sweet spot. Now raise TRAIN POINTS N and
        watch variance collapse, pushing that sweet spot toward higher complexity —
        more data buys you the right to use a bigger model.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        The bias-variance decomposition is the conceptual backbone of generalization:
        it's why <a href={`${window.__DM_BASE || "../../"}visualize/regularization`} style={{ color: "#a855f7" }}>regularization</a>,
        early stopping, and ensembling help (they trade a little bias for a lot less
        variance), and why model selection is a balancing act. It underlies the
        classic U-curve in the{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/overfitting/`} style={{ color: "#a855f7" }}>overfitting</a> demo,
        and bagging/random forests are essentially variance-reduction machines built
        on this identity.
      </DemoP>
      <DemoP>
        Caveats: the clean three-way split assumes squared-error loss; for other
        losses the decomposition is messier. And the tidy U-curve is the <i>classical</i>
        story — in heavily over-parameterized models it breaks down and you get the
        second descent shown in{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/double-descent/`} style={{ color: "#a855f7" }}>double descent</a>,
        where adding capacity past the interpolation threshold reduces error again.
        Bias and variance are also properties of the model <i>class plus the training
        distribution</i>, not the model alone.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="FOUNDATIONS" title="Bias-Variance Decomposition"
      subtitle="Fit many models to resampled noisy data and watch error split into bias², variance, and irreducible noise. Sweep complexity to trace the U-curve, and add data to see variance collapse."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/ml-theory/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<BiasVarianceDecompDemo />);
