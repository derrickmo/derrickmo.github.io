// demos/roc.jsx — classifier evaluation: slide a threshold across two score
// distributions and watch the confusion matrix, ROC curve, and PR curve move.
// Analytic two-Gaussian model (equal variance) so the curves are exact + smooth.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, StatReadout, Legend, ControlGroup,
} = window;

const W = 520, H = 480;

function erf(x) {
  const s = x < 0 ? -1 : 1; x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}
const Phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
const npdf = (z) => Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
const tpr = (t, d) => Phi(d / 2 - t);
const fpr = (t, d) => Phi(-d / 2 - t);

function ROCDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [sep, setSep] = _useState(2);
  const [thr, setThr] = _useState(0);
  const [prior, setPrior] = _useState(0.5);
  const [stats, setStats] = _useState({ tpr: 0, fpr: 0, prec: 0, auc: 0 });

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const d = sep;

    // ── top: score distributions ───────────────────────────────
    const x0 = 36, x1 = 496, yb = 196, ph = 150;
    const sx = (s) => x0 + (s + 4) / 8 * (x1 - x0);
    const pys = (pd) => yb - pd / 0.42 * ph;
    ctx.strokeStyle = "rgba(96,165,250,0.18)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, yb); ctx.lineTo(x1, yb); ctx.stroke();
    const drawCurve = (mean, col, fillTo) => {
      // fillTo: "right" (score > thr) or "left"
      ctx.beginPath();
      let started = false;
      for (let s = -4; s <= 4.001; s += 0.05) {
        const within = fillTo === "right" ? s >= thr : s <= thr;
        if (!within) continue;
        const X = sx(s), Y = pys(npdf(s - mean));
        if (!started) { ctx.moveTo(X, yb); ctx.lineTo(X, Y); started = true; } else ctx.lineTo(X, Y);
      }
      const endS = fillTo === "right" ? 4 : thr;
      ctx.lineTo(sx(endS), yb); ctx.closePath();
      ctx.fillStyle = col; ctx.fill();
    };
    // shaded decision regions (TP under positive-right, FP under negative-right)
    drawCurve(-d / 2, "rgba(192,132,252,0.30)", "right");  // FP
    drawCurve(d / 2, "rgba(96,165,250,0.32)", "right");    // TP
    // full outlines
    const outline = (mean, col) => {
      ctx.beginPath();
      for (let s = -4, first = true; s <= 4.001; s += 0.04, first = false) { const X = sx(s), Y = pys(npdf(s - mean)); first ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); }
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
    };
    outline(-d / 2, "#c084fc"); outline(d / 2, "#60a5fa");
    // threshold line
    ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(sx(thr), 26); ctx.lineTo(sx(thr), yb); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#fbbf24"; ctx.font = "10px JetBrains Mono, monospace"; ctx.textAlign = "center";
    ctx.fillText("threshold", sx(thr), 20);
    ctx.fillStyle = "#c084fc"; ctx.textAlign = "left"; ctx.fillText("negatives", x0 + 4, 40);
    ctx.fillStyle = "#60a5fa"; ctx.textAlign = "right"; ctx.fillText("positives", x1 - 4, 40);

    // ── helper for the two square plots ────────────────────────
    function plot(ox, oy, sz, title, xlab, ylab, curveFn, pt) {
      ctx.strokeStyle = "rgba(96,165,250,0.25)"; ctx.lineWidth = 1;
      ctx.strokeRect(ox, oy, sz, sz);
      ctx.fillStyle = "#94a3b8"; ctx.font = "10px JetBrains Mono, monospace";
      ctx.textAlign = "left"; ctx.fillText(title, ox, oy - 8);
      ctx.textAlign = "center"; ctx.fillText(xlab, ox + sz / 2, oy + sz + 18);
      ctx.save(); ctx.translate(ox - 16, oy + sz / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(ylab, 0, 0); ctx.restore();
      // diagonal ref for ROC
      if (title.indexOf("ROC") === 0) { ctx.strokeStyle = "rgba(148,163,184,0.3)"; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(ox, oy + sz); ctx.lineTo(ox + sz, oy); ctx.stroke(); ctx.setLineDash([]); }
      // curve
      ctx.beginPath();
      for (let i = 0; i <= 100; i++) {
        const [u, v] = curveFn(i / 100); // u=x in [0,1], v=y in [0,1]
        const X = ox + u * sz, Y = oy + sz - v * sz;
        i === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y);
      }
      ctx.strokeStyle = "#60a5fa"; ctx.lineWidth = 2; ctx.stroke();
      // current point
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath(); ctx.arc(ox + pt[0] * sz, oy + sz - pt[1] * sz, 4.5, 0, Math.PI * 2); ctx.fill();
    }

    const sz = 190, oy = 250;
    // ROC: x=FPR, y=TPR, swept by threshold from +5..-5
    plot(40, oy, sz, "ROC curve", "FPR", "TPR",
      (u) => { const t = 5 - u * 10; return [fpr(t, d), tpr(t, d)]; },
      [fpr(thr, d), tpr(thr, d)]);
    // PR: x=recall(=TPR), y=precision
    const precAt = (t) => { const TP = tpr(t, d) * prior, FP = fpr(t, d) * (1 - prior); return (TP + FP) > 1e-9 ? TP / (TP + FP) : 1; };
    plot(290, oy, sz, "PR curve", "Recall", "Precision",
      (u) => { const t = 5 - u * 10; return [tpr(t, d), precAt(t)]; },
      [tpr(thr, d), precAt(thr)]);

    // AUC via trapezoid over ROC
    let auc = 0, prevF = fpr(5, d), prevT = tpr(5, d);
    for (let i = 1; i <= 400; i++) { const t = 5 - i / 400 * 10; const f = fpr(t, d), tp = tpr(t, d); auc += (f - prevF) * (tp + prevT) / 2; prevF = f; prevT = tp; }
    setStats({ tpr: tpr(thr, d), fpr: fpr(thr, d), prec: precAt(thr), auc });
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  }, []);
  _useEffect(() => { draw(); /* eslint-disable-next-line */ }, [sep, thr, prior]);

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// CLASS SEPARATION" min={0.3} max={4} step={0.1} value={sep} onChange={setSep} />
      <Slider label="// THRESHOLD" min={-4} max={4} step={0.1} value={thr} onChange={setThr} tone="violet" />
      <Slider label="// POSITIVE PRIOR" min={0.05} max={0.95} step={0.05} value={prior} onChange={setPrior} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="TPR / RECALL" value={(stats.tpr * 100).toFixed(0) + "%"} accent="#60a5fa" />
        <StatReadout label="FPR" value={(stats.fpr * 100).toFixed(0) + "%"} accent="#c084fc" />
        <StatReadout label="PRECISION" value={(stats.prec * 100).toFixed(0) + "%"} accent="#fbbf24" />
        <StatReadout label="ROC AUC" value={stats.auc.toFixed(3)} />
      </div>
      <Legend items={[{ color: "#60a5fa", label: "POSITIVES / TP" }, { color: "#c084fc", label: "NEGATIVES / FP" }, { color: "#fbbf24", label: "OPERATING POINT" }]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        A classifier outputs a <i>score</i>, not a decision — you turn it into one by
        picking a <b>threshold</b>. Slide it: move left and you catch more true
        positives (higher recall) but also more false positives; move right and you're
        precise but miss cases. Every threshold is one point on the
        <b> ROC curve</b> (true-positive rate vs false-positive rate); the
        <b> AUC</b> summarizes the whole curve in a single number and is exactly the
        probability the model ranks a random positive above a random negative. Push
        <b> class separation</b> up and the curve bows toward the perfect corner.
      </DemoP>
      <DemoP>
        ROC has a famous blind spot: it ignores how rare the positive class is. Drag
        the <b>positive prior</b> down to simulate an imbalanced problem — the ROC
        curve doesn't move, but the <b>precision-recall curve</b> collapses, because
        now most things above threshold are false alarms. That's why fraud, disease,
        and anomaly detection are judged on PR, not ROC. Reading these two curves —
        and choosing the operating point for the cost you actually care about — is core
        to shipping any real model.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="ML THEORY · EVALUATION" title="ROC, PR & Thresholds"
      subtitle="One score, many decisions: move the threshold and watch precision, recall, ROC, and PR trade off."
      stage={stage} controls={controls} explainer={explainer}
      lessonHref={`${window.__DM_BASE || "../../"}learn/supervised-learning/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="blue" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ROCDemo />);
