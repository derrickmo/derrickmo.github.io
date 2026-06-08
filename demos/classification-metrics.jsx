// demos/classification-metrics.jsx — the confusion matrix and everything it implies.
// Simulate a multi-class classifier with adjustable class imbalance and skill,
// build the confusion matrix, and compute per-class precision / recall / F1 plus
// the three averagings (macro / micro / weighted) and a tunable F-beta. The
// teaching point: on imbalanced data accuracy and micro-F1 flatter the model
// while macro-F1 exposes weak minority classes. All exact from counts.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 380, N = 800;
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const CLS_COL = ["#60a5fa", "#a855f7", "#34d399", "#fbbf24"];

function simulate(K, imbalance, skill, majorityBias, seed) {
  const rng = mulberry32(seed);
  // class prior: geometric skew so class 0 dominates as imbalance rises
  const prior = []; let s = 0;
  for (let i = 0; i < K; i++) { const v = Math.pow(1 - imbalance * 0.9, i); prior.push(v); s += v; }
  for (let i = 0; i < K; i++) prior[i] /= s;
  const C = Array.from({ length: K }, () => new Array(K).fill(0));
  for (let n = 0; n < N; n++) {
    // sample true class from prior
    let r = rng(), y = 0; for (let i = 0; i < K; i++) { if (r < prior[i]) { y = i; break; } r -= prior[i]; }
    // predict: correct with prob skill; else an error, biased toward the majority class (0)
    let pred;
    if (rng() < skill) pred = y;
    else { if (rng() < majorityBias) pred = 0; else { do { pred = Math.floor(rng() * K); } while (pred === y && K > 1); } }
    C[y][pred]++;
  }
  return { C, prior };
}

function metrics(C, K) {
  const per = [];
  let totalTP = 0, total = 0;
  for (let i = 0; i < K; i++) {
    const TP = C[i][i];
    let FP = 0, FN = 0, support = 0;
    for (let j = 0; j < K; j++) { if (j !== i) { FP += C[j][i]; FN += C[i][j]; } support += C[i][j]; }
    const P = TP + FP > 0 ? TP / (TP + FP) : 0;
    const R = TP + FN > 0 ? TP / (TP + FN) : 0;
    const F1 = P + R > 0 ? 2 * P * R / (P + R) : 0;
    per.push({ P, R, F1, support, TP, FP, FN });
    totalTP += TP;
    for (let j = 0; j < K; j++) total += C[i][j];
  }
  const acc = total > 0 ? totalTP / total : 0;
  const macroF1 = per.reduce((a, p) => a + p.F1, 0) / K;
  const microF1 = acc; // single-label multiclass: micro-P = micro-R = accuracy
  const totSupport = per.reduce((a, p) => a + p.support, 0) || 1;
  const weightedF1 = per.reduce((a, p) => a + (p.support / totSupport) * p.F1, 0);
  return { per, acc, macroF1, microF1, weightedF1, total };
}

function ClassificationMetricsDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [K, setK] = _useState(3);
  const [imbalance, setImbalance] = _useState(0.5);
  const [skill, setSkill] = _useState(0.7);
  const [beta, setBeta] = _useState(1);
  const [seed, setSeed] = _useState(2);
  const [, setTick] = _useState(0);
  const dataRef = _useRef(null);

  function recompute() { dataRef.current = simulate(K, imbalance, skill, 0.6, seed); setTick(v => v + 1); draw(); }

  function draw() {
    const cv = canvasRef.current; if (!cv || !dataRef.current) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const { C } = dataRef.current, m = metrics(C, K);
    // confusion matrix (left)
    const gx = 70, gy = 56, cell = Math.min(46, 180 / K);
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px JetBrains Mono, monospace"; ctx.textAlign = "left";
    ctx.fillText("CONFUSION MATRIX", 20, 28);
    ctx.fillText("pred -->", gx, gy - 8); ctx.save(); ctx.translate(gx - 30, gy + K * cell / 2); ctx.rotate(-Math.PI / 2); ctx.fillText("true -->", 0, 0); ctx.restore();
    let mx = 0; for (let i = 0; i < K; i++) for (let j = 0; j < K; j++) mx = Math.max(mx, C[i][j]);
    for (let i = 0; i < K; i++) for (let j = 0; j < K; j++) {
      const t = mx > 0 ? C[i][j] / mx : 0, diag = i === j;
      ctx.fillStyle = diag ? `rgba(52,211,153,${0.15 + t * 0.8})` : `rgba(248,113,113,${0.1 + t * 0.7})`;
      ctx.fillRect(gx + j * cell, gy + i * cell, cell - 1, cell - 1);
      ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.font = "10px JetBrains Mono"; ctx.textAlign = "center";
      ctx.fillText(C[i][j], gx + j * cell + cell / 2, gy + i * cell + cell / 2 + 3);
    }
    // class labels
    for (let i = 0; i < K; i++) { ctx.fillStyle = CLS_COL[i]; ctx.font = "10px JetBrains Mono"; ctx.textAlign = "center"; ctx.fillText("C" + i, gx + i * cell + cell / 2, gy - 18); ctx.textAlign = "right"; ctx.fillText("C" + i, gx - 6, gy + i * cell + cell / 2 + 3); }
    // per-class P/R/F1 (left bottom)
    const by = gy + K * cell + 30; ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px JetBrains Mono"; ctx.fillText("PER CLASS   prec  rec   F1   (n)", 20, by - 6);
    m.per.forEach((p, i) => {
      const y = by + i * 18;
      ctx.fillStyle = CLS_COL[i]; ctx.fillText("C" + i, 20, y);
      ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.font = "10px JetBrains Mono";
      ctx.fillText(p.P.toFixed(2), 60, y); ctx.fillText(p.R.toFixed(2), 100, y);
      ctx.fillStyle = p.F1 < 0.5 ? "#fb923c" : "#34d399"; ctx.fillText(p.F1.toFixed(2), 140, y);
      ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.fillText("(" + p.support + ")", 178, y);
    });
    // aggregate metrics (right)
    const rx = 300, c1 = "#34d399";
    const bigNum = (label, val, y, col) => { ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px JetBrains Mono"; ctx.textAlign = "left"; ctx.fillText(label, rx, y); ctx.fillStyle = col; ctx.font = "26px Space Grotesk, sans-serif"; ctx.fillText(val, rx, y + 28); };
    bigNum("ACCURACY  (= micro-F1)", (m.acc * 100).toFixed(1) + "%", 50, "#60a5fa");
    bigNum("MACRO-F1  (per-class mean)", m.macroF1.toFixed(3), 116, m.macroF1 < m.acc - 0.08 ? "#fb923c" : c1);
    bigNum("WEIGHTED-F1  (support-weighted)", m.weightedF1.toFixed(3), 182, "#a855f7");
    // F-beta (macro)
    const macroFb = m.per.reduce((a, p) => { const b2 = beta * beta; const fb = (b2 * p.P + p.R) > 0 ? (1 + b2) * p.P * p.R / (b2 * p.P + p.R) : 0; return a + fb; }, 0) / K;
    bigNum(`MACRO-F${beta.toFixed(1)}  ${beta < 1 ? "(favors precision)" : beta > 1 ? "(favors recall)" : "(= F1)"}`, macroFb.toFixed(3), 248, "#fbbf24");
    if (m.macroF1 < m.acc - 0.1) { ctx.fillStyle = "#fb923c"; ctx.font = "10px JetBrains Mono"; ctx.textAlign = "left"; ctx.fillText("accuracy hides weak minority classes ->", rx, 300); ctx.fillText("trust macro-F1 on imbalanced data", rx, 314); }
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    recompute();
  }, []);
  _useEffect(() => { recompute(); }, [K, imbalance, skill, seed]);
  _useEffect(() => { draw(); }, [beta]);

  const stage = (<canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />);

  const controls = (
    <ControlGroup>
      <Slider label="// CLASSES" min={2} max={4} step={1} value={K} onChange={setK}
        help="Number of classes. Macro / micro / weighted F-scores only differ for more than 2 classes (or imbalanced binary), so this is where the averaging choice starts to matter." />
      <Slider label="// CLASS IMBALANCE" min={0} max={0.9} step={0.05} value={imbalance} onChange={setImbalance}
        help="How skewed the class distribution is. At 0 classes are balanced; high values make class C0 dominate - the regime where accuracy becomes misleading and macro-F1 earns its keep." />
      <Slider label="// CLASSIFIER SKILL" min={0.3} max={0.98} step={0.02} value={skill} onChange={setSkill}
        help="Base probability the model predicts the correct class; its errors leak toward the majority class (as real models do). Lower skill widens the gap between accuracy and macro-F1." />
      <Slider label="// F-BETA" min={0.5} max={2} step={0.1} value={beta} onChange={setBeta}
        help="The precision/recall tradeoff knob in F-beta. beta<1 weights precision more (cost of false positives); beta>1 weights recall more (cost of misses); beta=1 is the ordinary F1." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setSeed(s => s + 1)} primary>RESAMPLE</DemoButton>
        <DemoButton onClick={() => { setK(3); setImbalance(0.5); setSkill(0.7); setBeta(1); }}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="ACCURACY" value={dataRef.current ? (metrics(dataRef.current.C, K).acc * 100).toFixed(1) + "%" : "-"} accent="#60a5fa" />
        <StatReadout label="MACRO-F1" value={dataRef.current ? metrics(dataRef.current.C, K).macroF1.toFixed(3) : "-"} accent="#34d399" />
      </div>
      <Legend items={[
        { color: "#34d399", label: "correct (diagonal)" },
        { color: "#f87171", label: "errors (off-diagonal)" },
        { color: "#fb923c", label: "weak class / warning" },
      ]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Every classification metric is just a way of reading the <b>confusion matrix</b> — the table
        of true class (rows) vs predicted class (columns). The green diagonal is correct predictions;
        red off-diagonals are the mistakes. From it, each class gets a <b>precision</b> (of what I
        called class C, how much was right), a <b>recall</b> (of the true class C, how much I caught),
        and their harmonic mean, <b>F1</b>.
      </DemoP>
      <DemoP>
        The headline is what happens when you combine per-class F1 across classes. <b>Micro-F1 equals
        accuracy</b> and is dominated by the majority class; <b>macro-F1</b> averages classes equally,
        so it <i>punishes</i> a model that ignores rare classes; <b>weighted-F1</b> sits in between,
        weighting by support. Crank <b>imbalance</b> up and watch accuracy stay high while macro-F1
        collapses — the single most common way ML results are oversold. The <b>F-β</b> knob then trades
        precision against recall for when false positives and false negatives cost different amounts.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Choosing the right metric is half of doing ML responsibly. Accuracy is fine on balanced data
        and dangerously misleading on imbalanced data (fraud, disease, defects) — where macro-F1, the
        <a href={`${window.__DM_BASE || "../../"}visualize/roc/`}> ROC/PR curves</a>, and per-class recall
        are what actually matter. F-β encodes the real-world asymmetry: a spam filter wants precision
        (don't drop good mail), a cancer screen wants recall (don't miss a case). These are the numbers
        every model card, leaderboard, and A/B test reports — and the ones interviewers probe.
      </DemoP>
      <DemoP>
        The same confusion-matrix view scales up: macro vs micro averaging is exactly the choice
        behind multi-label and retrieval metrics (mAP, micro/macro-averaged F1 in NER and segmentation),
        and pairing it with <a href={`${window.__DM_BASE || "../../"}visualize/calibration/`}>calibration</a>
        tells you not just <i>whether</i> predictions are right but whether their <i>confidences</i> are
        honest. Metric literacy is what separates "97% accurate!" hype from a model you'd actually deploy.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      topic="EVALUATION"
      title="Classification Metrics"
      subtitle="Read the confusion matrix - accuracy, precision, recall, F1, and the macro / micro / weighted / F-beta averagings that disagree on imbalanced data."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/ml-theory/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="blue"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ClassificationMetricsDemo />);
