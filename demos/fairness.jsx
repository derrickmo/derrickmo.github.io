// demos/fairness.jsx — group fairness metrics and the threshold tradeoff.
//
// Two groups have the SAME true qualification rate, but group B's scores are
// pushed down by measurement bias. A decision threshold selects everyone scoring
// above it. A single (linked) threshold then under-selects qualified people in
// group B — unequal selection rate AND unequal true-positive rate. You can lower
// group B's threshold to equalize one fairness metric, but equalizing selection
// rate (demographic parity) and TPR (equal opportunity) at once is impossible
// here unless the score distributions match — the core fairness impossibility.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, Toggle, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480;
const NG = 400, BASE_RATE = 0.5, SKILL = 1.3;
const sigmoid = (z) => 1 / (1 + Math.exp(-z));
function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

function FairnessDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [bias, setBias] = _useState(1.2);
  const [tauA, setTauA] = _useState(0.5);
  const [tauB, setTauB] = _useState(0.5);
  const [linked, setLinked] = _useState(true);
  const [tick, setTick] = _useState(0);
  const dataRef = _useRef({ A: [], B: [] });

  function gen() {
    const mk = (shift) => Array.from({ length: NG }, () => {
      const q = Math.random() < BASE_RATE;
      const score = sigmoid(SKILL * (q ? 1 : -1) - shift + 0.7 * randn());
      return { q, score };
    });
    dataRef.current = { A: mk(0), B: mk(bias) };
  }
  _useEffect(() => { gen(); setTick(t => t + 1); /* eslint-disable-next-line */ }, [bias]);

  const tB = linked ? tauA : tauB;
  const metrics = (arr, tau) => {
    let sel = 0, tp = 0, qpos = 0, fp = 0, qneg = 0, correct = 0;
    arr.forEach(p => {
      const s = p.score >= tau;
      if (s) sel++;
      if (p.q) { qpos++; if (s) tp++; } else { qneg++; if (s) fp++; }
      if (s === p.q) correct++;
    });
    return { sel: sel / arr.length, tpr: qpos ? tp / qpos : 0, fpr: qneg ? fp / qneg : 0, acc: correct / arr.length };
  };
  const mA = dataRef.current.A.length ? metrics(dataRef.current.A, tauA) : { sel: 0, tpr: 0, fpr: 0, acc: 0 };
  const mB = dataRef.current.B.length ? metrics(dataRef.current.B, tB) : { sel: 0, tpr: 0, fpr: 0, acc: 0 };
  const accAll = dataRef.current.A.length ? (mA.acc + mB.acc) / 2 : 0;

  function matchTPR() {     // lower group-B threshold to equalize TPR (equal opportunity)
    const B = dataRef.current.B; if (!B.length) return;
    let best = tB, bestD = Infinity;
    for (let t = 0.02; t <= 0.98; t += 0.02) { const m = metrics(B, t); const d = Math.abs(m.tpr - mA.tpr); if (d < bestD) { bestD = d; best = t; } }
    setLinked(false); setTauB(Math.round(best * 100) / 100);
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";

    const BINS = 24;
    const panel = (arr, tau, y0, label, color) => {
      const px = 20, pw = W - 40, ph = 96;
      ctx.fillStyle = "#94a3b8"; ctx.fillText(label, px, y0 - 4);
      // stacked hist: qualified (green) + unqualified (slate)
      const qb = new Array(BINS).fill(0), nb = new Array(BINS).fill(0);
      arr.forEach(p => { const b = Math.min(BINS - 1, Math.floor(p.score * BINS)); if (p.q) qb[b]++; else nb[b]++; });
      const mx = Math.max(...qb.map((v, i) => v + nb[i]), 1), bw = pw / BINS;
      for (let b = 0; b < BINS; b++) {
        const x = px + b * bw;
        const hq = (qb[b] / mx) * ph, hn = (nb[b] / mx) * ph;
        ctx.fillStyle = "rgba(148,163,184,0.45)"; ctx.fillRect(x + 1, y0 + ph - hn, bw - 2, hn);
        ctx.fillStyle = "rgba(52,211,153,0.7)"; ctx.fillRect(x + 1, y0 + ph - hn - hq, bw - 2, hq);
      }
      // selected region shading (right of threshold)
      const tx = px + tau * pw;
      ctx.fillStyle = "rgba(96,165,250,0.10)"; ctx.fillRect(tx, y0, px + pw - tx, ph);
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(tx, y0 - 2); ctx.lineTo(tx, y0 + ph + 2); ctx.stroke();
      ctx.fillStyle = color; ctx.font = "9px JetBrains Mono"; ctx.fillText("τ=" + tau.toFixed(2), tx + 3, y0 + 10);
    };
    panel(dataRef.current.A, tauA, 40, "GROUP A  ·  score distribution (green = truly qualified)", "#60a5fa");
    panel(dataRef.current.B, tB, 168, "GROUP B  ·  same qualification rate, scores biased down", "#a855f7");

    // metrics table
    const my = 300;
    ctx.font = "11px JetBrains Mono"; ctx.fillStyle = "#94a3b8";
    ctx.fillText("FAIRNESS METRICS", 20, my - 2);
    const row = (yy, name, a, b, fairAt0) => {
      ctx.fillStyle = "#cbd5e1"; ctx.font = "11px JetBrains Mono"; ctx.fillText(name, 20, yy);
      ctx.fillStyle = "#60a5fa"; ctx.fillText("A " + (a * 100).toFixed(0) + "%", 200, yy);
      ctx.fillStyle = "#a855f7"; ctx.fillText("B " + (b * 100).toFixed(0) + "%", 290, yy);
      const gap = Math.abs(a - b);
      ctx.fillStyle = gap < 0.05 ? "#34d399" : gap < 0.15 ? "#fbbf24" : "#f87171";
      ctx.fillText("gap " + (gap * 100).toFixed(0) + "pt", 380, yy);
    };
    row(my + 22, "Selection rate (demographic parity)", mA.sel, mB.sel);
    row(my + 46, "True-positive rate (equal opportunity)", mA.tpr, mB.tpr);
    row(my + 70, "False-positive rate (→ equalized odds)", mA.fpr, mB.fpr);
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono";
    ctx.fillText("Overall accuracy: " + (accAll * 100).toFixed(0) + "%", 20, my + 100);
    const dp = Math.abs(mA.sel - mB.sel), eo = Math.abs(mA.tpr - mB.tpr);
    ctx.fillStyle = (dp < 0.05 && eo < 0.05) ? "#34d399" : "#fbbf24";
    ctx.fillText((dp < 0.05 && eo < 0.05) ? "both parity & opportunity ~satisfied" : "can't zero both gaps at once →", 220, my + 100);
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  });

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// MEASUREMENT BIAS (group B)" min={0} max={2.5} step={0.1} value={bias} onChange={setBias} tone="violet"
        help="How far group B's scores are pushed down despite identical true qualification — historical/measurement bias baked into the features. At 0 the groups are identical and fairness is easy; raise it and a shared threshold starts treating the groups very differently." />
      <Slider label="// THRESHOLD A" min={0.05} max={0.95} step={0.05} value={tauA} onChange={setTauA}
        help="Select group-A applicants scoring above this. With LINK on it also drives group B." />
      <Slider label="// THRESHOLD B" min={0.05} max={0.95} step={0.05} value={tauB} onChange={setTauB}
        help="Group B's own threshold (used only when LINK is off). Lowering it raises B's selection and true-positive rates — the per-group fix — but pushes B's false-positive rate up, breaking equalized odds." />
      <Toggle label="// LINK (single threshold)" checked={linked} onChange={setLinked}
        help="On: one global threshold for everyone (group-blind). Off: separate per-group thresholds, which can equalize a chosen metric but is itself ethically and legally fraught (disparate treatment)." />
      <DemoButton onClick={matchTPR} primary>MATCH TPR (equal opportunity)</DemoButton>
      <DemoButton onClick={() => { gen(); setTick(t => t + 1); }}>RESAMPLE</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="SEL GAP" value={(Math.abs(mA.sel - mB.sel) * 100).toFixed(0) + "pt"} accent={Math.abs(mA.sel - mB.sel) < 0.05 ? "#34d399" : "#f87171"} />
        <StatReadout label="TPR GAP" value={(Math.abs(mA.tpr - mB.tpr) * 100).toFixed(0) + "pt"} accent={Math.abs(mA.tpr - mB.tpr) < 0.05 ? "#34d399" : "#f87171"} />
      </div>
      <StatReadout label="ACCURACY" value={(accAll * 100).toFixed(0) + "%"} />
      <Legend items={[
        { color: "#34d399", label: "truly qualified" },
        { color: "#94a3b8", label: "not qualified" },
        { color: "#60a5fa", label: "group A threshold" },
        { color: "#a855f7", label: "group B threshold" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Both groups are equally qualified on average, but group B's scores are
        shoved left by bias in how the features were measured. Leave LINK on (one
        group-blind threshold) and the damage is visible in the metrics: group B's
        selection rate and true-positive rate fall well below group A's, because
        the same bar catches fewer of B's qualified people. A single "fair-looking"
        threshold launders biased inputs into biased outcomes.
      </DemoP>
      <DemoP>
        Now turn LINK off and hit MATCH TPR: lowering group B's threshold equalizes
        the true-positive rate (equal opportunity) — but watch the selection-rate
        and false-positive gaps that opens up. You can satisfy demographic parity,
        equal opportunity, or equalized odds, but with unequal score distributions
        you generally <i>cannot</i> satisfy more than one at once. That's a proven
        impossibility, not a tuning failure.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Algorithmic fairness formalizes "treat groups equitably" into competing
        statistical criteria: demographic parity (equal selection rate), equal
        opportunity (equal TPR), and equalized odds (equal TPR and FPR). Chouldechova
        and Kleinberg–Mullainathan–Raghavan showed these are mutually incompatible
        whenever base rates or score distributions differ — so fairness is a
        value-laden choice of <i>which</i> metric matters here, not a box to check.
      </DemoP>
      <DemoP>
        It's the equity pillar of trustworthy ML, alongside{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/calibration/`} style={{ color: "#a855f7" }}>calibration</a>{" "}
        and <a href={`${window.__DM_BASE || "../../"}visualize/shap/`} style={{ color: "#a855f7" }}>explainability</a>.
        The bias here is upstream (in the data), which no threshold fully fixes —
        mitigations span pre-processing (reweighting, repairing features),
        in-processing (fairness constraints during training), and post-processing
        (the per-group thresholds shown here). Per-group thresholds also raise the
        legal tension between disparate <i>impact</i> and disparate <i>treatment</i>.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="TRUSTWORTHY ML" title="Fairness & Group Metrics"
      subtitle="Equal qualification, biased scores. See how one threshold creates unequal outcomes — and why you can't satisfy every fairness metric at once."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/ml-theory/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<FairnessDemo />);
