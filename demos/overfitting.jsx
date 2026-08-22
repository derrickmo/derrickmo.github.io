// demos/overfitting.jsx — polynomial regression / bias-variance playground.
// Real least-squares fit (normal equations + ridge) solved in JS. Crank the
// degree and watch train error fall while test error explodes.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 400, YMIN = -1.7, YMAX = 1.7;
const gaussStd = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const px = x => (x + 1) / 2 * W;
const py = y => H - (y - YMIN) / (YMAX - YMIN) * H;

const TRUE = {
  sine: x => Math.sin(Math.PI * x),
  cubic: x => 2 * x * x * x - x,
  step: x => (x < 0 ? -0.5 : 0.5),
};

function solveLinear(A, b) {
  const n = b.length;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    const piv = M[c][c];
    if (Math.abs(piv) < 1e-12) continue;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / piv;
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((r, i) => (Math.abs(M[i][i]) < 1e-12 ? 0 : r[n] / M[i][i]));
}
function fitPoly(xs, ys, deg, lambda) {
  const m = deg + 1;
  const XtX = Array.from({ length: m }, () => Array(m).fill(0));
  const Xty = Array(m).fill(0);
  for (let i = 0; i < xs.length; i++) {
    const pw = []; let p = 1;
    for (let j = 0; j < m; j++) { pw.push(p); p *= xs[i]; }
    for (let a = 0; a < m; a++) { Xty[a] += pw[a] * ys[i]; for (let b = 0; b < m; b++) XtX[a][b] += pw[a] * pw[b]; }
  }
  for (let a = 0; a < m; a++) XtX[a][a] += lambda;
  return solveLinear(XtX, Xty);
}
const predict = (w, x) => { let s = 0, p = 1; for (let j = 0; j < w.length; j++) { s += w[j] * p; p *= x; } return s; };
const rmse = (w, xs, ys) => Math.sqrt(xs.reduce((a, x, i) => a + (predict(w, x) - ys[i]) ** 2, 0) / xs.length);

function OverfittingDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const dataRef = _useRef({ trX: [], trY: [], teX: [], teY: [] });

  const [fn, setFn] = _useState("sine");
  const [degree, setDegree] = _useState(3);
  const [n, setN] = _useState(20);
  const [noise, setNoise] = _useState(0.18);
  const [lambda, setLambda] = _useState(0);
  const [stats, setStats] = _useState({ tr: 0, te: 0, status: "—" });

  function gen() {
    const f = TRUE[fn];
    const xs = Array.from({ length: n }, () => Math.random() * 2 - 1).sort((a, b) => a - b);
    const ys = xs.map(x => f(x) + gaussStd() * noise);
    const trX = [], trY = [], teX = [], teY = [];
    xs.forEach((x, i) => { if (i % 3 === 1) { teX.push(x); teY.push(ys[i]); } else { trX.push(x); trY.push(ys[i]); } });
    dataRef.current = { trX, trY, teX, teY };
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // axes
    ctx.strokeStyle = "rgba(96,165,250,0.15)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, py(0)); ctx.lineTo(W, py(0)); ctx.moveTo(px(0), 0); ctx.lineTo(px(0), H); ctx.stroke();

    const { trX, trY, teX, teY } = dataRef.current;
    const f = TRUE[fn];
    // true function
    ctx.strokeStyle = "rgba(148,163,184,0.7)"; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) { const x = -1 + i / 100; const Y = py(f(x)); i ? ctx.lineTo(px(x), Y) : ctx.moveTo(px(x), Y); }
    ctx.stroke(); ctx.setLineDash([]);
    // fit
    const w = fitPoly(trX, trY, degree, lambda);
    ctx.strokeStyle = "#c084fc"; ctx.lineWidth = 2.5; ctx.beginPath();
    let started = false;
    for (let i = 0; i <= 300; i++) {
      const x = -1 + i / 150; let Y = predict(w, x);
      Y = Math.max(YMIN - 1, Math.min(YMAX + 1, Y));
      const cy = py(Y);
      if (!started) { ctx.moveTo(px(x), cy); started = true; } else ctx.lineTo(px(x), cy);
    }
    ctx.stroke();
    // points
    const dot = (x, y, col) => { ctx.fillStyle = col; ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(px(x), py(y), 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); };
    trX.forEach((x, i) => dot(x, trY[i], "#60a5fa"));
    teX.forEach((x, i) => dot(x, teY[i], "#fbbf24"));

    const tr = rmse(w, trX, trY), te = rmse(w, teX, teY);
    const status = te > tr * 2.2 && degree >= 5 ? "OVERFITTING" : (tr > 0.35 ? "UNDERFITTING" : "GOOD FIT");
    setStats({ tr: tr.toFixed(3), te: te.toFixed(3), status });
  }

  function reseed() { gen(); draw(); }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    gen(); draw();
  }, []);
  _useEffect(() => { draw(); }, [degree, lambda]);
  _useEffect(() => { gen(); draw(); }, [fn, n, noise]);

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;

  const controls = (
    <ControlGroup>
      <SegmentedControl label="// TRUE FUNCTION" value={fn} onChange={setFn}
        options={[{ value: "sine", label: "Sine" }, { value: "cubic", label: "Cubic" }, { value: "step", label: "Step" }]}
        help="The hidden function the model tries to recover from noisy samples. Sine and cubic are smooth; the step is discontinuous and hard for a polynomial to fit cleanly." />
      <Slider label="// POLYNOMIAL DEGREE" min={0} max={15} value={degree} onChange={setDegree} tone="violet"
        help="Model capacity. Low degree is too rigid (underfit); very high degree can bend through every training point and memorize the noise (overfit)." />
      <Slider label="// DATA POINTS" min={8} max={80} value={n} onChange={setN}
        help="How many samples are drawn. More data makes overfitting harder to trigger at the same degree — the curve has more constraints to satisfy." />
      <Slider label="// NOISE" min={0} max={0.5} step={0.02} value={noise} onChange={setNoise}
        help="Random scatter added to each sample. More noise gives a high-capacity model more spurious wiggle to chase and memorize." />
      <Slider label="// RIDGE λ" min={0} max={0.1} step={0.002} value={lambda} onChange={setLambda} tone="violet"
        help="L2 regularization strength. It penalizes large coefficients, shrinking the wild high-degree wiggles toward a smoother, more general fit." />
      <DemoButton onClick={reseed} primary>NEW DATA</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="TRAIN RMSE" value={stats.tr} />
        <StatReadout label="TEST RMSE" value={stats.te} accent="#fbbf24" />
      </div>
      <StatReadout label="STATUS" value={stats.status}
        accent={stats.status === "OVERFITTING" ? "#f87171" : stats.status === "GOOD FIT" ? "#34d399" : "var(--blue-lt)"} />
      <Legend items={[{ color: "#60a5fa", label: "TRAIN" }, { color: "#fbbf24", label: "TEST" }, { color: "#c084fc", label: "FIT" }, { color: "rgba(148,163,184,0.8)", label: "TRUTH" }]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        This fits a polynomial of the degree you choose to noisy samples of a true
        function — a real least-squares solve (normal equations, with optional
        ridge regularization) done in the browser. The dashed grey line is the
        truth; the violet curve is what the model learned from the blue
        <b> training</b> points; the amber <b>test</b> points are held out.
      </DemoP>
      <DemoP>
        Start at degree 1 (underfit — too rigid to follow the curve). Raise the
        degree and the fit improves… until it doesn't: past a point the curve
        contorts to pass through every training point and the <b>test RMSE</b>
        shoots up while train RMSE keeps falling. That gap <i>is</i> overfitting —
        the bias-variance tradeoff made visible. Now add a little <b>ridge λ</b> and
        watch it tame the wild high-degree wiggles, or add more <b>data points</b>
        and watch overfitting get harder to trigger.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        The bias-variance tradeoff you're watching is the central tension of all
        supervised learning, not a polynomial quirk. The gap between <b>train</b> and
        <b> test</b> error — the <i>generalization gap</i> — is the number every
        practitioner actually monitors, and it's why real projects hold out validation
        and test sets, use <i>early stopping</i>, and never trust training accuracy alone.
        A model that aces training and fails on new data is the most common way ML quietly
        ships broken.
      </DemoP>
      <DemoP>
        Every lever here has a deep-learning counterpart. <b>Ridge λ</b> is L2
        regularization — the same <i>weight decay</i> you set on every neural network;
        its cousins are dropout and data augmentation. <b>Degree</b> is model capacity —
        the same reason giant models demand giant datasets to avoid memorizing. And more
        <b> data points</b> is the oldest fix of all. Once you can read this plot, "my
        model overfits" becomes a problem with a menu of known answers.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      title="Overfitting Lab"
      subtitle="Fit a polynomial to noisy data and watch the bias-variance tradeoff play out in real time."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/ml-theory/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="violet"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<OverfittingDemo />);
