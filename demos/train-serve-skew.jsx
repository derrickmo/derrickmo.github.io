// demos/train-serve-skew.jsx — one line of preprocessing in the wrong place, and why the
// offline check does not catch it.
//
// Benched headlessly first (4 features, 8,000 serving rows, logistic scorer, the bug being a
// scaler REFIT on each incoming batch instead of loaded from training), then RE-MEASURED in
// the browser, which is where these numbers come from:
//   batch 8000  AUC 0.8727 -> 0.8726   accuracy 0.7926 -> 0.7924   flipped 0.25%  (20 reqs)
//   batch 2000  AUC 0.8725             accuracy 0.7923             flipped 0.64%  (51)
//   batch  500  AUC 0.8723             accuracy 0.7914             flipped 1.55%  (124)
//   batch   50  AUC 0.8672             accuracy 0.7876             flipped 4.55%  (364)
//   batch    8  AUC 0.8368             accuracy 0.7624             flipped 13.03% (1,042)
//   scaler loaded from training: every number identical, 0.00% flipped (the control)
// The headline is the top rows: every aggregate a dashboard shows is unchanged to three
// decimals while dozens of decisions land the other way. The damage scales INVERSELY with
// batch size, so a load test at batch 8,000 sees nothing and real single-request traffic is
// the worst case.
//
// ⚠ The bench had accuracy coming out HIGHER at batch 500 (0.7937 vs 0.7935) and I had
// written that up as the sharpest form of the point. On the demo's own data it does not
// happen - accuracy falls monotonically. Prose rewritten to what the page shows.
//
// ★ And the drift slider found something better than the paragraph I had planned. At drift
// 1.5 the served ROC-AUC is 0.8797 against an offline 0.8798 - UNCHANGED to four decimals -
// while accuracy collapses 0.8376 -> 0.6164 and 41.35% of decisions flip. AUC is
// threshold-free, so it is structurally blind to a systematic shift in the score LEVEL.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const { DemoLayout, DemoP, Slider, StatReadout, SegmentedControl } = window;

const W = 580, H = 430;
const NTR = 8000, NTE = 8000, D = 4;
const WCOEF = [1.4, -0.9, 0.7, 1.1], BIAS = -0.6;
const BATCHES = [8, 25, 50, 200, 500, 2000, 8000];

const mulberry32 = (a) => () => {
  a |= 0; a = a + 0x6D2B79F5 | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
const mkN = (r) => () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

// the training set and its scaler, fitted ONCE - this is the object that should have been
// serialised alongside the weights
const TR_RNG = mulberry32(31337), TN = mkN(TR_RNG);
const XTR = Array.from({ length: NTR }, () => Array.from({ length: D }, (_, k) => TN() * (1 + 0.4 * k) + 0.5 * k));
const MU = Array.from({ length: D }, (_, k) => XTR.reduce((s, x) => s + x[k], 0) / NTR);
const SD = Array.from({ length: D }, (_, k) => Math.sqrt(XTR.reduce((s, x) => s + (x[k] - MU[k]) ** 2, 0) / NTR));

const score = (x, mu, sd) => 1 / (1 + Math.exp(-(x.reduce((a, v, k) => a + WCOEF[k] * (v - mu[k]) / sd[k], 0) + BIAS)));

function rocAuc(y, s) {
  const idx = y.map((_, i) => i).sort((a, b) => s[a] - s[b]);
  const rank = new Array(y.length);
  for (let i = 0; i < idx.length;) {
    let j = i; while (j + 1 < idx.length && s[idx[j + 1]] === s[idx[i]]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) rank[idx[k]] = avg;
    i = j + 1;
  }
  const P = y.reduce((a, b) => a + b, 0), N = y.length - P;
  let sr = 0; for (let i = 0; i < y.length; i++) if (y[i]) sr += rank[i];
  return P && N ? (sr - P * (P + 1) / 2) / (P * N) : 0.5;
}

function SkewDemo() {
  const cvRef = _useRef(null);
  const [bIdx, setBIdx] = _useState(6);              // index into BATCHES
  const [drift, setDrift] = _useState(0);
  const [mode, setMode] = _useState("bug");

  const batch = BATCHES[bIdx];

  // serving traffic, optionally shifted away from the training distribution
  const r = mulberry32(20260906), N = mkN(r);
  const XTE = Array.from({ length: NTE }, () => Array.from({ length: D }, (_, k) => N() * (1 + 0.4 * k) + 0.5 * k + drift));
  const correct = XTE.map((x) => score(x, MU, SD));
  const y = correct.map((p) => (r() < p ? 1 : 0));

  const servedFor = (bs) => {
    if (mode === "fixed") return correct.slice();
    const out = new Array(NTE);
    for (let i = 0; i < NTE; i += bs) {
      const b = XTE.slice(i, i + bs), n = b.length;
      const bm = Array.from({ length: D }, (_, k) => b.reduce((s, x) => s + x[k], 0) / n);
      const bsd = Array.from({ length: D }, (_, k) => Math.sqrt(b.reduce((s, x) => s + (x[k] - bm[k]) ** 2, 0) / n) || 1);
      for (let j = 0; j < n; j++) out[i + j] = score(b[j], bm, bsd);
    }
    return out;
  };

  const served = servedFor(batch);
  const flips = correct.reduce((a, c, i) => a + ((c >= 0.5) !== (served[i] >= 0.5) ? 1 : 0), 0);
  const aucC = rocAuc(y, correct), aucS = rocAuc(y, served);
  const accC = y.reduce((a, v, i) => a + ((correct[i] >= 0.5 ? 1 : 0) === v ? 1 : 0), 0) / NTE;
  const accS = y.reduce((a, v, i) => a + ((served[i] >= 0.5 ? 1 : 0) === v ? 1 : 0), 0) / NTE;

  const sweep = BATCHES.map((bs) => {
    const s = servedFor(bs);
    const f = correct.reduce((a, c, i) => a + ((c >= 0.5) !== (s[i] >= 0.5) ? 1 : 0), 0);
    return { bs, flip: f / NTE, auc: rocAuc(y, s) };
  });

  _useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = window.fitCanvas ? window.fitCanvas(cv, W, H) : cv.getContext("2d");
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = "#0b1530"; ctx.fillRect(0, 0, W, H);
    const pad = 52;

    // ── panel 1: offline score vs served score, one dot per request ──
    const y0 = 26, h1 = 200, w1 = 200;
    const X = (v) => pad + v * w1, Y = (v) => y0 + h1 - v * h1;
    ctx.strokeStyle = "#1e3a6e"; ctx.lineWidth = 1; ctx.strokeRect(pad, y0, w1, h1);
    ctx.strokeStyle = "#334155"; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(X(0.5), y0); ctx.lineTo(X(0.5), y0 + h1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad, Y(0.5)); ctx.lineTo(pad + w1, Y(0.5)); ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < NTE; i += 4) {
      const flipped = (correct[i] >= 0.5) !== (served[i] >= 0.5);
      ctx.fillStyle = flipped ? "rgba(248,113,113,0.85)" : "rgba(96,165,250,0.16)";
      ctx.fillRect(X(correct[i]) - 1, Y(served[i]) - 1, flipped ? 2.6 : 1.6, flipped ? 2.6 : 1.6);
    }
    ctx.font = "9px JetBrains Mono, monospace"; ctx.fillStyle = "#64748b";
    ctx.fillText("offline score ->", pad, y0 + h1 + 14);
    ctx.save(); ctx.translate(14, y0 + h1 / 2 + 30); ctx.rotate(-Math.PI / 2);
    ctx.fillText("served score ->", 0, 0); ctx.restore();
    ctx.fillStyle = "#f87171";
    ctx.fillText("red = the decision flipped", pad + 4, y0 + 12);

    // ── panel 2: what the dashboard sees ──
    const px = pad + w1 + 46, pw = W - px - 20;
    ctx.font = "10px JetBrains Mono, monospace"; ctx.fillStyle = "#64748b";
    ctx.fillText("what the offline check reports:", px, y0 + 12);
    const rows = [
      ["ROC-AUC", aucC.toFixed(4), aucS.toFixed(4)],
      ["accuracy", accC.toFixed(4), accS.toFixed(4)],
      ["positive rate", (correct.filter((c) => c >= 0.5).length / NTE).toFixed(4), (served.filter((c) => c >= 0.5).length / NTE).toFixed(4)],
    ];
    ctx.fillText("offline", px + 88, y0 + 30); ctx.fillText("served", px + 148, y0 + 30);
    rows.forEach(([k, a, b], i) => {
      const yy = y0 + 48 + i * 18;
      ctx.fillStyle = "#94a3b8"; ctx.fillText(k, px, yy);
      ctx.fillStyle = "#60a5fa"; ctx.fillText(a, px + 88, yy);
      ctx.fillStyle = Math.abs(+a - +b) < 0.005 ? "#34d399" : "#f87171";
      ctx.fillText(b, px + 148, yy);
    });
    ctx.fillStyle = "#f87171"; ctx.font = "600 13px JetBrains Mono, monospace";
    ctx.fillText((flips / NTE * 100).toFixed(2) + "% of decisions", px, y0 + 126);
    ctx.fillText("landed the other way", px, y0 + 143);
    ctx.font = "10px JetBrains Mono, monospace"; ctx.fillStyle = "#64748b";
    ctx.fillText(flips.toLocaleString() + " of " + NTE.toLocaleString() + " requests", px, y0 + 161);

    // ── panel 3: flip rate against serving batch size ──
    const y1 = y0 + h1 + 46, h2 = H - y1 - 30, w2 = W - pad - 24;
    ctx.strokeStyle = "#1e3a6e"; ctx.strokeRect(pad, y1, w2, h2);
    const fmax = Math.max(...sweep.map((s) => s.flip), 0.02);
    const bw = w2 / sweep.length;
    sweep.forEach((s, i) => {
      const hgt = (s.flip / fmax) * (h2 - 16);
      const x = pad + i * bw + bw * 0.22;
      const on = s.bs === batch;
      ctx.fillStyle = on ? "rgba(248,113,113,0.6)" : "rgba(192,132,252,0.35)";
      ctx.fillRect(x, y1 + h2 - hgt, bw * 0.56, hgt);
      ctx.strokeStyle = on ? "#f87171" : "#c084fc"; ctx.lineWidth = 1.2;
      ctx.strokeRect(x, y1 + h2 - hgt, bw * 0.56, hgt);
      ctx.fillStyle = on ? "#f87171" : "#64748b"; ctx.font = "9px JetBrains Mono, monospace";
      ctx.fillText((s.flip * 100).toFixed(1) + "%", x - 2, y1 + h2 - hgt - 4);
      ctx.fillStyle = "#64748b";
      ctx.fillText(String(s.bs), x + 2, y1 + h2 + 13);
    });
    ctx.fillStyle = "#64748b"; ctx.font = "10px JetBrains Mono, monospace";
    ctx.fillText("flip rate vs serving batch size  ->  smaller batches are WORSE", pad, y1 - 6);
  }, [bIdx, drift, mode]);

  const stage = (
    <canvas ref={cvRef} width={W} height={H}
      style={{ width: "100%", maxWidth: W * 1.3, borderRadius: 6, border: "1px solid var(--border)", background: "#0b1530" }} />
  );

  const controls = (
    <>
      <SegmentedControl label="// SERVING CODE" value={mode} onChange={setMode}
        options={[{ value: "bug", label: "REFIT THE SCALER" }, { value: "fixed", label: "LOAD IT FROM TRAINING" }]}
        help="The bug is one line: calling fit_transform at serving time instead of transform. It is the single most common train/serve skew and it never raises an exception." />
      <Slider label="SERVING BATCH SIZE" min={0} max={BATCHES.length - 1} step={1} value={bIdx} onChange={setBIdx}
        suffix={" -> " + BATCHES[bIdx]}
        help="How many requests the scaler is refitted over. A load test batches thousands and sees almost nothing; production traffic arrives a few rows at a time, which is the worst case." />
      <Slider label="DISTRIBUTION DRIFT" min={0} max={1.5} step={0.05} value={drift} onChange={setDrift}
        help="Shifts serving traffic away from the training distribution. The refit scaler ABSORBS the shift instead of exposing it, so a genuine drift becomes invisible as well as harmful." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginTop: 14 }}>
        <StatReadout label="OFFLINE ROC-AUC" value={aucC.toFixed(4)} accent="#60a5fa" />
        <StatReadout label="SERVED ROC-AUC" value={aucS.toFixed(4)} accent={Math.abs(aucC - aucS) < 0.005 ? "#34d399" : "#f87171"} />
        <StatReadout label="OFFLINE ACCURACY" value={accC.toFixed(4)} accent="#60a5fa" />
        <StatReadout label="SERVED ACCURACY" value={accS.toFixed(4)} accent={Math.abs(accC - accS) < 0.005 ? "#34d399" : "#f87171"} />
        <StatReadout label="DECISIONS FLIPPED" value={(flips / NTE * 100).toFixed(2) + "%"} accent={flips ? "#f87171" : "#34d399"} />
        <StatReadout label="REQUESTS AFFECTED" value={flips.toLocaleString()} accent="#f87171" />
      </div>
    </>
  );

  const explainer = (
    <>
      <DemoP>
        The model is correct. The weights are correct. The bug is one line in the serving path:
        the scaler is <em>refitted</em> on each incoming batch instead of being loaded from
        training. Every feature is still standardised, every value still looks reasonable, and
        nothing throws — the model is simply being asked about a different set of numbers than the
        one it was fitted on.
      </DemoP>
      <DemoP>
        Leave SERVING BATCH SIZE at 8000 and read the table. <strong>ROC-AUC 0.8727 offline against
        0.8726 served. Accuracy 0.7926 against 0.7924.</strong> Every aggregate a dashboard shows is
        unchanged to three decimals, so the offline check passes. Meanwhile the scatter is dotted
        with red: <strong>0.25% of decisions landed the other way</strong> — 20 requests approved or
        declined on the wrong side of the threshold. An average over 8,000 rows cannot see 20 of
        them move, which is the general point: a metric that averages is the wrong instrument for a
        defect that is concentrated. Flip SERVING CODE to <strong>LOAD IT FROM TRAINING</strong> and
        the flip rate goes to exactly 0.00% — the control that says the difference really is this
        one line.
      </DemoP>
      <DemoP>
        Now drag the batch size down. The damage scales <strong>inversely</strong> with it — 0.64%
        at 2,000, 1.55% at 500, 4.55% at 50, <strong>13.03% at 8</strong> — because a scaler fitted
        on eight rows is mostly noise. That direction is the trap: a load test hammers the service
        in large batches and sees nothing, while real traffic arrives a handful of rows at a time
        and is the worst case.
      </DemoP>
      <DemoP>
        Then push <strong>DISTRIBUTION DRIFT</strong> to 1.5, which is where this stops being subtle
        and starts being instructive. Served ROC-AUC reads <strong>0.8797</strong> against an offline
        <strong>0.8798</strong> — unchanged to four decimals — while accuracy collapses from
        <strong>0.8376 to 0.6164</strong> and <strong>41.35%</strong> of decisions flip. AUC is
        threshold-free: it asks only whether the scores are in the right ORDER, and refitting a
        scaler preserves the order almost perfectly while moving every score's level. So the one
        metric most teams lead with is <em>structurally incapable</em> of seeing this failure, and
        the refit scaler additionally <em>absorbs</em> the shift, so a drift monitor watching
        standardised features reports nothing either.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        The structural fix is not a better monitor, it is removing the seam: one feature
        transformation, defined once, used by both training and serving — a feature store, or a
        serialised pipeline object that travels with the weights. A check that compares offline and
        online scores <em>for the same request</em> catches this; an aggregate metric does not, and
        neither does a unit test that only asserts the code runs.
      </DemoP>
      <DemoP>
        The measurement to take is the one on screen: agreement, not error. Export a model to a
        different runtime and the same pair of numbers is the right check — a tiny numeric drift
        with high decision agreement is fine, and the disagreements
        {" "}<a href={`${window.__DM_BASE || "../../"}visualize/calibration/`}>concentrate near the threshold</a>,
        which is precisely the population a decision rule cares about. This is also why
        {" "}<a href={`${window.__DM_BASE || "../../"}visualize/drift-detection/`}>drift detection</a>{" "}
        must watch raw inputs rather than transformed ones.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      title="Train/Serve Skew"
      subtitle="Refit the scaler at serving time: AUC and accuracy do not move, and hundreds of decisions land the other way."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/mlops/model-serving/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="violet"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<SkewDemo />);
