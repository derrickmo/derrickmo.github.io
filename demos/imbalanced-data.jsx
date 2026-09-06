// demos/imbalanced-data.jsx — why accuracy is useless on a rare event, and where the
// threshold actually comes from.
//
// ⚠ BENCHED TWICE, AND THE FIRST RUN WAS WRONG IN A WAY THAT LOOKED LIKE A FINDING.
// It scored with sigmoid(x + 2.2*y), which RANKS well but is not a posterior, so the
// analytic t* = C_FP/(C_FP+C_FN) came out WORSE than 0.5 ($39,518 vs $20,030) and the swept
// argmin sat at 0.758. Read naively that says "the formula is wrong". It says the opposite:
// t* is optimal only for a CALIBRATED probability. Redone with a score that IS the posterior
// by construction (y ~ Bernoulli(p), p = sigmoid(a*x + b)), the analytic t* lands within a
// few thousandths of the swept argmin at every cost ratio tested, and saves 2.70x - 6.87x
// against the 0.5 default. Numbers verified in the browser at the demo's own defaults:
// 295 positives in 20,000, flag-nothing accuracy 0.9852, ROC-AUC 0.9272, PR-AUC 0.2944,
// t* 0.0196 vs swept 0.0247, $26,826 -> $9,928.
//
// The MISCALIBRATE toggle keeps the first version's lesson: halving the logit leaves ROC-AUC
// and PR-AUC unchanged to four decimals AND leaves the best reachable cost unchanged (both
// are properties of the ORDERING), but the swept argmin moves 0.0247 -> 0.1373 and the
// analytic t* now costs 3.15x the best - worse than leaving the threshold at 0.5.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const { DemoLayout, DemoP, Slider, StatReadout, Toggle } = window;

const W = 580, H = 420;
const N_SAMPLES = 20000;

const mulberry32 = (a) => () => {
  a |= 0; a = a + 0x6D2B79F5 | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
const mkN = (r) => () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const sig = (z) => 1 / (1 + Math.exp(-z));

// Find the intercept that makes E[sigmoid(a*x + b)] equal the requested base rate, so the
// slider can be labelled in the units a reader thinks in. Bisection over a fixed quadrature.
function solveIntercept(rate, a) {
  const STEPS = 400, LO = -5, HI = 5, dz = (HI - LO) / STEPS;
  const zs = [], ws = [];
  for (let i = 0; i < STEPS; i++) { const z = LO + (i + 0.5) * dz; zs.push(z); ws.push(Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI) * dz); }
  const mean = (b) => zs.reduce((s, z, i) => s + ws[i] * sig(a * z + b), 0);
  let lo = -14, hi = 6;
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (mean(mid) < rate) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

function ImbalancedDemo() {
  const cvRef = _useRef(null);
  const [rate, setRate] = _useState(0.015);
  const [sep, setSep] = _useState(2.2);
  const [cFN, setCFN] = _useState(100);
  const [cFP, setCFP] = _useState(2);
  const [thr, setThr] = _useState(0.5);
  const [miscal, setMiscal] = _useState(false);

  const b0 = solveIntercept(rate, sep);
  const r = mulberry32(4242), Nr = mkN(r);
  const y = new Uint8Array(N_SAMPLES), sc = new Float64Array(N_SAMPLES);
  for (let i = 0; i < N_SAMPLES; i++) {
    const p = sig(sep * Nr() + b0);
    y[i] = r() < p ? 1 : 0;
    // MISCALIBRATE halves the logit: a strictly increasing map, so every ranking metric is
    // untouched and only the LEVEL of the number changes.
    sc[i] = miscal ? sig(Math.log(p / (1 - p)) / 2) : p;
  }
  let P = 0; for (let i = 0; i < N_SAMPLES; i++) P += y[i];

  // sort once; every threshold question is then a binary search plus two prefix reads
  const order = Array.from({ length: N_SAMPLES }, (_, i) => i).sort((a, b) => sc[b] - sc[a]);
  const sorted = new Float64Array(N_SAMPLES), cumPos = new Int32Array(N_SAMPLES + 1);
  for (let k = 0; k < N_SAMPLES; k++) { sorted[k] = sc[order[k]]; cumPos[k + 1] = cumPos[k] + y[order[k]]; }
  const flaggedAt = (t) => { let lo = 0, hi = N_SAMPLES; while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] >= t) lo = m + 1; else hi = m; } return lo; };
  const metrics = (t) => {
    const k = flaggedAt(t), tp = cumPos[k], fp = k - tp, fn = P - tp, tn = N_SAMPLES - k - fn;
    return { k, tp, fp, fn, tn, acc: (tp + tn) / N_SAMPLES, rec: P ? tp / P : 0, prec: k ? tp / k : 0, cost: fp * cFP + fn * cFN };
  };

  // ROC-AUC and average precision straight off the sorted order
  let rank = 0, sumRank = 0;
  for (let k = N_SAMPLES - 1; k >= 0; k--) { rank++; if (y[order[k]]) sumRank += rank; }
  const auc = P && P < N_SAMPLES ? (sumRank - P * (P + 1) / 2) / (P * (N_SAMPLES - P)) : 0.5;
  let tpA = 0, ap = 0;
  for (let k = 0; k < N_SAMPLES; k++) { if (y[order[k]]) { tpA++; ap += tpA / (k + 1); } }
  ap = P ? ap / P : 0;

  const tStar = cFP / (cFP + cFN);
  let bestT = 0, bestC = Infinity;
  for (let k = 0; k <= N_SAMPLES; k += 5) {           // every candidate threshold IS a data point
    const t = k === 0 ? 1.000001 : sorted[Math.min(k, N_SAMPLES) - 1];
    const c = metrics(t).cost;
    if (c < bestC) { bestC = c; bestT = t; }
  }
  const mHere = metrics(thr), mStar = metrics(tStar), mHalf = metrics(0.5);
  // bestC is the cost the MODEL can reach; miscalibration does not change it, only the
  // threshold at which it is reached - which is what makes the t* comparison meaningful.
  const tStarPenalty = mStar.cost / Math.max(1, bestC);

  _useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = window.fitCanvas ? window.fitCanvas(cv, W, H) : cv.getContext("2d");
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = "#0b1530"; ctx.fillRect(0, 0, W, H);
    const pad = 50, w = W - pad - 22;

    // ── panel 1: the two score distributions, on a log count axis ──
    const h1 = 130, y0 = 26, BINS = 60;
    const neg = new Array(BINS).fill(0), pos = new Array(BINS).fill(0);
    for (let i = 0; i < N_SAMPLES; i++) { const b = Math.min(BINS - 1, Math.floor(sc[i] * BINS)); (y[i] ? pos : neg)[b]++; }
    const mx = Math.max(...neg, ...pos, 1);
    const Ylog = (c) => y0 + h1 - (c > 0 ? Math.log10(1 + c) / Math.log10(1 + mx) : 0) * h1;
    const X = (t) => pad + t * w;
    for (let b = 0; b < BINS; b++) {
      const x = pad + (b / BINS) * w, bw = w / BINS;
      ctx.fillStyle = "rgba(96,165,250,0.45)"; ctx.fillRect(x, Ylog(neg[b]), bw - 1, y0 + h1 - Ylog(neg[b]));
      ctx.fillStyle = "rgba(248,113,113,0.75)"; ctx.fillRect(x, Ylog(pos[b]), bw - 1, y0 + h1 - Ylog(pos[b]));
    }
    ctx.strokeStyle = "#1e3a6e"; ctx.strokeRect(pad, y0, w, h1);
    ctx.font = "10px JetBrains Mono, monospace";
    ctx.fillStyle = "#60a5fa"; ctx.fillText("negatives", pad + 6, y0 + 13);
    ctx.fillStyle = "#f87171"; ctx.fillText("positives", pad + 6, y0 + 26);
    ctx.fillStyle = "#64748b"; ctx.fillText("count (log)", 6, y0 + h1 / 2);
    const mark = (t, col, lab, top) => {
      ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.setLineDash(top ? [] : [4, 3]);
      ctx.beginPath(); ctx.moveTo(X(t), y0); ctx.lineTo(X(t), y0 + h1); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = col; ctx.font = "9px JetBrains Mono, monospace";
      ctx.fillText(lab, Math.min(W - 60, X(t) + 4), top ? y0 - 4 : y0 + h1 - 6);
    };
    mark(thr, "#fbbf24", "you " + thr.toFixed(3), true);
    mark(tStar, "#34d399", "t* " + tStar.toFixed(3), false);

    // ── panel 2: total cost as a function of the threshold ──
    const y1 = y0 + h1 + 46, h2 = H - y1 - 34;
    const pts = [];
    for (let i = 0; i <= 240; i++) { const t = i / 240; pts.push([t, metrics(t).cost]); }
    const cmax = Math.max(...pts.map((p) => p[1]), 1);
    const Yc = (c) => y1 + h2 - (c / cmax) * h2;
    ctx.strokeStyle = "#1e3a6e"; ctx.strokeRect(pad, y1, w, h2);
    ctx.strokeStyle = "#c084fc"; ctx.lineWidth = 2; ctx.beginPath();
    pts.forEach(([t, c], i) => { const x = X(t), yy = Yc(c); i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); });
    ctx.stroke();
    for (const [t, col, lab] of [[bestT, "#e0e7ff", "swept min"], [tStar, "#34d399", "t* = cFP/(cFP+cFN)"], [thr, "#fbbf24", "you"]]) {
      ctx.strokeStyle = col; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(X(t), y1); ctx.lineTo(X(t), y1 + h2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = col; ctx.font = "9px JetBrains Mono, monospace";
      ctx.fillText(lab, Math.min(W - 110, X(t) + 4), y1 + 12 + (lab === "you" ? 24 : lab === "swept min" ? 12 : 0));
    }
    ctx.fillStyle = "#64748b"; ctx.font = "10px JetBrains Mono, monospace";
    ctx.fillText("total cost", 6, y1 + h2 / 2);
    ctx.fillText("threshold ->", pad + w - 66, y1 + h2 + 15);
    ctx.fillText("model score ->", pad + w - 78, y0 + h1 + 15);
  }, [rate, sep, cFN, cFP, thr, miscal]);

  const stage = (
    <canvas ref={cvRef} width={W} height={H}
      style={{ width: "100%", maxWidth: W * 1.3, borderRadius: 6, border: "1px solid var(--border)", background: "#0b1530" }} />
  );

  const controls = (
    <>
      <Slider label="POSITIVE RATE" min={0.002} max={0.1} step={0.001} value={rate} onChange={setRate}
        help="How rare the event is. The 'flag nothing' accuracy is exactly one minus this, and it is the accuracy-optimal rule at any rate below 50%." />
      <Slider label="MODEL SEPARATION" min={0.8} max={3.5} step={0.1} value={sep} onChange={setSep}
        help="How informative the feature is. Raising it lifts both ROC-AUC and PR-AUC, but PR-AUC stays far lower because it is measured against the rare class." />
      <Slider label="COST OF A MISS ($)" min={10} max={1000} step={10} value={cFN} onChange={setCFN}
        help="What one undetected positive costs. It only ever appears as a ratio against the false-alarm cost, which is why the optimal threshold has such a simple form." />
      <Slider label="COST OF A FALSE ALARM ($)" min={1} max={50} step={1} value={cFP} onChange={setCFP}
        help="What one wasted investigation costs. Push it up and the optimal threshold rises with it, shrinking the review queue." />
      <Slider label="YOUR THRESHOLD" min={0.005} max={0.995} step={0.005} value={thr} onChange={setThr}
        help="Drag it onto the green t* line and watch the cost curve bottom out. The 0.5 default is a convention from balanced problems, not a decision rule." />
      <Toggle label="MISCALIBRATE THE SCORE" checked={miscal} onChange={setMiscal}
        help="Halves the logit. This is strictly increasing, so ROC-AUC and PR-AUC do not move at all - and the analytic t* stops being optimal, because it is a statement about probabilities, not ranks." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginTop: 14 }}>
        <StatReadout label="POSITIVES" value={P + " / " + N_SAMPLES} accent="#f87171" />
        <StatReadout label={'ACCURACY OF "FLAG NOTHING"'} value={((N_SAMPLES - P) / N_SAMPLES).toFixed(4)} accent="#f87171" />
        <StatReadout label="ROC-AUC" value={auc.toFixed(4)} accent="#60a5fa" />
        <StatReadout label="PR-AUC" value={ap.toFixed(4)} accent="#c084fc" />
        <StatReadout label="ANALYTIC t*" value={tStar.toFixed(4)} accent="#34d399" />
        <StatReadout label="SWEPT ARGMIN" value={bestT.toFixed(4)} accent="#e0e7ff" />
        <StatReadout label="COST AT 0.5" value={"$" + mHalf.cost.toLocaleString()} accent="#f87171" />
        <StatReadout label="COST AT t*" value={"$" + mStar.cost.toLocaleString()} accent="#34d399" />
        <StatReadout label="BEST POSSIBLE COST" value={"$" + bestC.toLocaleString()} accent="#e0e7ff" />
        <StatReadout label="t* PENALTY vs BEST" value={tStarPenalty.toFixed(2) + "x"} accent={tStarPenalty < 1.05 ? "#34d399" : "#f87171"} />
        <StatReadout label="SAVING vs 0.5" value={(mHalf.cost / Math.max(1, mStar.cost)).toFixed(2) + "x"} accent="#fbbf24" />
        <StatReadout label="YOUR COST" value={"$" + mHere.cost.toLocaleString()} accent="#fbbf24" />
        <StatReadout label="YOUR RECALL" value={mHere.rec.toFixed(3)} accent="#fbbf24" />
        <StatReadout label="YOUR PRECISION" value={mHere.prec.toFixed(3)} accent="#fbbf24" />
      </div>
    </>
  );

  const explainer = (
    <>
      <DemoP>
        At a 1.5% positive rate, a model that flags nothing at all is <strong>98.52% accurate</strong>
        {" "}— and that is not a quirk, it is the accuracy-optimal rule for any event rarer than a
        coin flip. Accuracy answers "how often am I right", which on a rare event is a question about
        the majority class you did not care about. The readouts put the honest pair beside it:
        ROC-AUC looks strong because it is an average over the many negatives, while PR-AUC is
        computed entirely against the rare class and sits far lower on exactly the same model.
      </DemoP>
      <DemoP>
        The threshold is where the money is. Cost = FP × (false-alarm cost) + FN × (miss cost), and
        minimising it has a closed form: <strong>t* = c<sub>FP</sub> / (c<sub>FP</sub> +
        c<sub>FN</sub>)</strong>. Only the RATIO of the two costs matters, which is why you never
        need to price a fraud loss exactly — you need to know it is fifty times a wasted review. At
        $100 a miss and $2 a false alarm, t* = 0.0196, and the demo's swept minimum over every
        candidate threshold in the data lands at 0.0247 — five thousandths away, on 295 positives.
        Against the 0.5 default that is measured at <strong>2.70× cheaper</strong> here, and
        <strong>6.87×</strong> when a miss costs $500. The default threshold is a convention
        inherited from balanced problems; it is not a decision.
      </DemoP>
      <DemoP>
        Now switch on <strong>MISCALIBRATE</strong>. It halves the logit, which is strictly
        increasing, so <em>ROC-AUC and PR-AUC do not move a digit</em> — every ranking metric says
        the model is unchanged, and the best cost it can reach is unchanged too, because that is a
        property of the ordering. What moves is where you have to stand to reach it: the swept
        argmin jumps <strong>0.0247 → 0.1373</strong>, and the analytic t* now costs
        <strong>3.15×</strong> the achievable best — <em>worse than simply leaving the threshold at
        0.5</em>. That is the whole reason calibration is a separate property from accuracy or
        ranking: the moment a score is compared against a <em>price</em> rather than against other
        scores its level has to be right, and no AUC will ever tell you that it isn't.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        This is the shape of fraud, click prediction, medical screening, defect detection and abuse
        classification — anything where the interesting class is 1% of traffic. It is also why
        resampling and class weights are a subtler tool than they look:
        {" "}<a href={`${window.__DM_BASE || "../../"}visualize/calibration/`}>they shift the prior</a>{" "}
        the model has learned, so the output stops being a posterior for the real population and
        t* stops applying until the scores are recalibrated.
      </DemoP>
      <DemoP>
        In practice the threshold is often set by capacity rather than by cost: a review team can
        look at 500 cases a day, so the operating point is "top 500" and the number to report is
        precision@500. That is the same curve read from the other axis, and it makes the metric
        argument concrete — {" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/classification-metrics/`}>precision, recall and the confusion matrix</a>{" "}
        are not four competing scores but one 2×2 table read four ways.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      title="Imbalanced Data & the Threshold"
      subtitle="98.5% accurate by flagging nothing - and the threshold that actually minimises cost, which is never 0.5."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/ml-theory/imbalanced-data/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="blue"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ImbalancedDemo />);
