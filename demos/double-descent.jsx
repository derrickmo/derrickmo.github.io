// demos/double-descent.jsx — the double-descent risk curve, for real.
//
// Classic bias-variance says test error is U-shaped in model capacity. Modern
// over-parameterized models break that: error drops, SPIKES at the interpolation
// threshold (#params ≈ #train points, where the model can just barely fit the
// data), then drops AGAIN as you keep adding parameters. We reproduce it honestly
// with random-Fourier-feature ridge(less) regression: sweep the number of
// features P, fit the minimum-norm least-squares solution at each P, and plot
// train vs test error. The peak at P/N = 1 is the whole phenomenon; turning up
// the ridge λ (optimal regularization) flattens it away.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 500;

function DoubleDescentDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [N, setN] = _useState(25);
  const [noise, setNoise] = _useState(0.25);
  const [lam, setLam] = _useState(0.0);
  const [ratioSel, setRatioSel] = _useState(1.0);
  const [seed, setSeed] = _useState(1);
  const [, setTick] = _useState(0);
  const ref = _useRef(null);

  function rng(s0) { let s = s0 >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function randn(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  const target = (x) => Math.sin(3 * x) + 0.3 * x; // truth on [-1,1]

  // Gaussian-elimination solver for A x = b  (n×n)
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

  function build() {
    const r = rng(seed * 2246822519 + N * 40503);
    const Pmax = Math.max(8, Math.round(N * 2.6));
    // random Fourier feature bank
    const omega = Array.from({ length: Pmax }, () => 2.2 * randn(r));
    const phase = Array.from({ length: Pmax }, () => 2 * Math.PI * r());
    const feat = (x, P) => { const f = new Array(P); for (let k = 0; k < P; k++) f[k] = Math.sqrt(2 / P) * Math.cos(omega[k] * x + phase[k]); return f; };

    // data
    const Xtr = Array.from({ length: N }, () => -1 + 2 * r());
    const ytr = Xtr.map(x => target(x) + noise * randn(r));
    const Nte = 200, Xte = Array.from({ length: Nte }, (_, i) => -1 + 2 * i / (Nte - 1));
    const yte = Xte.map(target);

    // fit min-norm ridge LS at feature count P → weights (length P)
    function fit(P) {
      const Phi = Xtr.map(x => feat(x, P));      // N×P
      const ridge = lam + 1e-8;
      let w;
      if (P <= N) {
        // (ΦᵀΦ + λI) w = Φᵀy
        const A = Array.from({ length: P }, () => new Array(P).fill(0)), bb = new Array(P).fill(0);
        for (let a = 0; a < P; a++) { for (let c = 0; c < P; c++) { let s = 0; for (let i = 0; i < N; i++) s += Phi[i][a] * Phi[i][c]; A[a][c] = s + (a === c ? ridge : 0); } let sb = 0; for (let i = 0; i < N; i++) sb += Phi[i][a] * ytr[i]; bb[a] = sb; }
        w = solve(A, bb);
      } else {
        // min-norm: w = Φᵀ (ΦΦᵀ + λI)^{-1} y
        const G = Array.from({ length: N }, () => new Array(N).fill(0));
        for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { let s = 0; for (let k = 0; k < P; k++) s += Phi[i][k] * Phi[j][k]; G[i][j] = s + (i === j ? ridge : 0); }
        const al = solve(G, ytr.slice());
        w = new Array(P).fill(0);
        for (let k = 0; k < P; k++) { let s = 0; for (let i = 0; i < N; i++) s += Phi[i][k] * al[i]; w[k] = s; }
      }
      return w;
    }
    const pred = (x, w) => { const f = feat(x, w.length); let s = 0; for (let k = 0; k < w.length; k++) s += f[k] * w[k]; return s; };

    // sweep capacity for the curve
    const Ps = []; for (let P = 2; P <= Pmax; P += Math.max(1, Math.round(Pmax / 48))) Ps.push(P);
    if (Ps[Ps.length - 1] !== Pmax) Ps.push(Pmax);
    const curve = Ps.map(P => {
      const w = fit(P);
      let tr = 0; for (let i = 0; i < N; i++) { const e = pred(Xtr[i], w) - ytr[i]; tr += e * e; }
      let te = 0; for (let i = 0; i < Nte; i++) { const e = pred(Xte[i], w) - yte[i]; te += e * e; }
      return { ratio: P / N, P, train: tr / N, test: te / Nte };
    });
    ref.current = { Xtr, ytr, Xte, yte, curve, fit, pred, N, Pmax };
  }
  _useEffect(() => { build(); setTick(t => t + 1); /* eslint-disable-next-line */ }, [N, noise, lam, seed]);

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";
    const st = ref.current; if (!st) return;

    // ---- Panel A: double-descent curve ----
    const aPad = 44, aTop = 36, aH = 230;
    const rMax = st.Pmax / st.N;
    const maxTest = Math.min(3, Math.max(...st.curve.map(c => c.test)) * 1.1) || 1;
    const AX = (ratio) => aPad + (ratio / rMax) * (W - aPad - 20);
    const AY = (e) => aTop + (1 - Math.min(e, maxTest) / maxTest) * aH;

    ctx.fillStyle = "#94a3b8"; ctx.fillText("TEST ERROR vs CAPACITY (P/N)  ·  the bump at P/N=1 is double descent", aPad, 22);
    // interpolation threshold
    ctx.strokeStyle = "#fbbf24"; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(AX(1), aTop); ctx.lineTo(AX(1), aTop + aH); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#fbbf24"; ctx.font = "9px JetBrains Mono"; ctx.fillText("interpolation P/N=1", AX(1) - 24, aTop - 4);

    const plotCurve = (key, color, wdt) => {
      ctx.strokeStyle = color; ctx.lineWidth = wdt; ctx.beginPath();
      st.curve.forEach((c, i) => { const x = AX(c.ratio), y = AY(c[key]); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
      ctx.stroke();
    };
    plotCurve("test", "#a855f7", 2.4);
    plotCurve("train", "#34d399", 1.8);
    // selected-capacity marker
    ctx.strokeStyle = "rgba(226,232,240,0.8)"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(AX(ratioSel), aTop); ctx.lineTo(AX(ratioSel), aTop + aH); ctx.stroke();
    ctx.fillStyle = "#e2e8f0"; ctx.font = "9px JetBrains Mono";
    ctx.font = "11px JetBrains Mono";
    // axis labels
    ctx.fillStyle = "#64748b"; ctx.font = "9px JetBrains Mono";
    [0.5, 1, 1.5, 2, 2.5].forEach(t => { if (t <= rMax) { ctx.fillText(t.toFixed(1), AX(t) - 6, aTop + aH + 12); } });

    // ---- Panel B: the fit at the selected capacity ----
    const bTop = aTop + aH + 40, bH = H - bTop - 24, bPad = 44;
    const P = Math.max(2, Math.min(st.Pmax, Math.round(ratioSel * st.N)));
    const w = st.fit(P);
    const ys = st.Xte.map(x => st.pred(x, w));
    const ylo = -2.2, yhi = 2.2;
    const BX = (x) => bPad + (x + 1) / 2 * (W - bPad - 20);
    const BY = (y) => bTop + (1 - (y - ylo) / (yhi - ylo)) * bH;
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono";
    ctx.fillText("FIT AT P=" + P + "  (P/N=" + ratioSel.toFixed(2) + ")", bPad, bTop - 8);
    // truth
    ctx.strokeStyle = "rgba(52,211,153,0.5)"; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
    ctx.beginPath(); st.Xte.forEach((x, i) => { const xx = BX(x), yy = BY(st.yte[i]); i === 0 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy); }); ctx.stroke(); ctx.setLineDash([]);
    // fitted
    ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 2.2;
    ctx.beginPath(); st.Xte.forEach((x, i) => { const xx = BX(x), yy = BY(Math.max(ylo, Math.min(yhi, ys[i]))); i === 0 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy); }); ctx.stroke();
    // train points
    ctx.fillStyle = "#60a5fa"; st.Xtr.forEach((x, i) => { ctx.beginPath(); ctx.arc(BX(x), BY(Math.max(ylo, Math.min(yhi, st.ytr[i]))), 2.6, 0, 7); ctx.fill(); });
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  });

  const st = ref.current;
  // readouts at selected capacity (nearest curve point)
  let selTest = 0, selTrain = 0, peakTest = 0;
  if (st) {
    const near = st.curve.reduce((a, c) => Math.abs(c.ratio - ratioSel) < Math.abs(a.ratio - ratioSel) ? c : a, st.curve[0]);
    selTest = near.test; selTrain = near.train; peakTest = Math.max(...st.curve.map(c => c.test));
  }

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// CAPACITY P/N" min={0.2} max={2.5} step={0.05} value={ratioSel} onChange={setRatioSel} tone="violet"
        help="Parameters per training point. Drag it to 1.0 and look at the bottom panel: the fit goes wild (interpolation threshold). Push past 2.0 and it smooths out again even though there are MORE parameters — that's the over-parameterized regime." />
      <Slider label="// LABEL NOISE" min={0} max={0.6} step={0.05} value={noise} onChange={setNoise}
        help="Noise added to training labels. Double descent is noise-driven — turn it to 0 and the peak nearly vanishes; turn it up and the spike at P/N=1 grows tall." />
      <Slider label="// RIDGE λ" min={0} max={0.3} step={0.01} value={lam} onChange={setLam}
        help="Explicit regularization. Optimal ridge tames the interpolation peak entirely — crank λ and watch the purple test curve flatten into a single descent. Regularization is the cure for double descent." />
      <Slider label="// TRAIN POINTS N" min={10} max={40} step={1} value={N} onChange={setN}
        help="Number of training samples. The peak always sits at P/N=1, so changing N just moves where 'interpolation' happens along the capacity axis." />
      <DemoButton onClick={() => setSeed(s => s + 1)} primary>RESAMPLE</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="TEST ERR @P/N" value={selTest.toFixed(3)} accent="#a855f7" />
        <StatReadout label="TRAIN ERR @P/N" value={selTrain.toFixed(3)} accent="#34d399" />
      </div>
      <StatReadout label="PEAK TEST ERROR" value={peakTest.toFixed(3)} accent="#fbbf24" />
      <Legend items={[
        { color: "#a855f7", label: "test error / fit" },
        { color: "#34d399", label: "train error / truth" },
        { color: "#fbbf24", label: "interpolation P/N=1" },
        { color: "#60a5fa", label: "train points" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        The top panel sweeps model capacity (random-feature count P, in units of
        training points N) and plots error. Train error (green) falls to zero once the
        model has enough parameters to interpolate the data. Test error (purple)
        does something the classic U-shape forbids: it dips, then <i>spikes</i> right
        at P/N = 1, then dips a second time as capacity grows. At the threshold the
        model can <i>just barely</i> fit every noisy point, so it contorts violently
        to do so — that's the peak.
      </DemoP>
      <DemoP>
        Drag CAPACITY across the peak and watch the bottom panel. Below P/N=1 the fit
        underfits the truth; right at 1.0 it whipsaws through every training point
        (huge test error); past 2.0 the minimum-norm solution among the many perfect
        fits is smooth again. Now turn LABEL NOISE to zero — the peak nearly
        disappears (double descent is a noise effect). Or raise RIDGE λ: optimal
        regularization flattens the whole curve into one clean descent. Capacity isn't
        the enemy; unregularized interpolation of noise is.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Double descent (Belkin et al. 2019; Nakkiran et al.) reconciles classical
        bias-variance with the fact that giant over-parameterized networks generalize
        well. The same shape appears in model size, training time ("epoch-wise"), and
        data size. It's why the modern recipe — make the model big, then regularize —
        works, and it reframes the{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/overfitting/`} style={{ color: "#a855f7" }}>overfitting</a>
        story: the danger zone is the interpolation threshold, not sheer size. The
        implicit bias toward minimum-norm solutions (what gradient descent finds) is
        what makes the over-parameterized regime safe.
      </DemoP>
      <DemoP>
        Caveats: the peak's height is driven by label noise and the conditioning of
        the feature matrix near P=N, and the "second descent" relies on a benign
        inductive bias (here, minimum-norm least squares; in deep nets, the implicit
        bias of SGD). Explicit regularization or early stopping can remove the peak,
        which is why you rarely see it in well-tuned production models. Connects to{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/scaling-laws/`} style={{ color: "#a855f7" }}>scaling laws</a> and{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/regression/`} style={{ color: "#a855f7" }}>regression</a>.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="FOUNDATIONS" title="Double Descent"
      subtitle="Test error dips, spikes at the interpolation threshold, then dips again as capacity grows past it. Sweep capacity and watch the fit go wild at P/N=1 — then turn up noise and ridge to see what drives and what cures the peak."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/ml-theory/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<DoubleDescentDemo />);
