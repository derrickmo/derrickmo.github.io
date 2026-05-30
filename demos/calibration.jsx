// demos/calibration.jsx — model calibration, reliability diagrams, ECE, and
// temperature scaling.
//
// A calibrated classifier that says "90% confident" is right 90% of the time.
// Modern nets are overconfident: stated confidence runs ahead of real accuracy.
// We model each prediction by a latent z = logit(true accuracy q) with the
// outcome ~ Bernoulli(q); OVERCONFIDENCE β sharpens the stated confidence to
// sigmoid(β·z), pushing points below the diagonal. Temperature scaling (Guo et
// al., 2017) divides the logit by T: sigmoid(β·z / T). At T = β the distortion
// exactly cancels and calibration is restored — a one-parameter post-hoc fix
// that never changes which class is predicted, only the probability.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480;
const D = { x0: 60, y0: 44, s: 320 };   // diagram box
const sigmoid = (z) => 1 / (1 + Math.exp(-z));

function CalibrationDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);

  const [beta, setBeta] = _useState(2.0);   // overconfidence
  const [T, setT] = _useState(1.0);          // temperature
  const [bins, setBins] = _useState(10);
  const [N, setN] = _useState(600);
  const [, force] = _useState(0);

  const sampRef = _useRef([]);
  function resample() {
    const s = [];
    for (let i = 0; i < N; i++) {
      const q = 0.5 + 0.49 * Math.random();         // true accuracy on this item
      const z = Math.log(q / (1 - q));               // latent logit (>= 0)
      s.push({ z, correct: Math.random() < q });
    }
    sampRef.current = s; force(x => x + 1);
  }
  _useEffect(() => { resample(); /* eslint-disable-next-line */ }, [N]);

  const conf = (z) => sigmoid(beta * z / T);          // recalibrated stated confidence

  function computeBins(useT) {
    const s = sampRef.current, B = bins;
    const acc = new Array(B).fill(0), sum = new Array(B).fill(0), cnt = new Array(B).fill(0);
    s.forEach(d => {
      const c = useT ? conf(d.z) : sigmoid(beta * d.z);
      let b = Math.min(B - 1, Math.floor(c * B));
      cnt[b]++; sum[b] += c; if (d.correct) acc[b]++;
    });
    const out = [];
    for (let b = 0; b < B; b++) if (cnt[b]) out.push({ conf: sum[b] / cnt[b], acc: acc[b] / cnt[b], n: cnt[b] });
    return out;
  }
  function ece(useT) {
    const s = sampRef.current, B = bins;
    const acc = new Array(B).fill(0), sum = new Array(B).fill(0), cnt = new Array(B).fill(0);
    s.forEach(d => { const c = useT ? conf(d.z) : sigmoid(beta * d.z); let b = Math.min(B - 1, Math.floor(c * B)); cnt[b]++; sum[b] += c; if (d.correct) acc[b]++; });
    let e = 0; const n = s.length || 1;
    for (let b = 0; b < B; b++) if (cnt[b]) e += (cnt[b] / n) * Math.abs(acc[b] / cnt[b] - sum[b] / cnt[b]);
    return e;
  }

  const binsT = computeBins(true);
  const eceT = ece(true), eceRaw = ece(false);
  const accuracy = sampRef.current.length ? sampRef.current.filter(d => d.correct).length / sampRef.current.length : 0;

  function autoCalibrate() {
    let best = T, bestE = Infinity;
    for (let t = 0.5; t <= 3.01; t += 0.05) {
      // ece with this t
      const s = sampRef.current, B = bins;
      const acc = new Array(B).fill(0), sum = new Array(B).fill(0), cnt = new Array(B).fill(0);
      s.forEach(d => { const c = sigmoid(beta * d.z / t); let b = Math.min(B - 1, Math.floor(c * B)); cnt[b]++; sum[b] += c; if (d.correct) acc[b]++; });
      let e = 0; const n = s.length || 1;
      for (let b = 0; b < B; b++) if (cnt[b]) e += (cnt[b] / n) * Math.abs(acc[b] / cnt[b] - sum[b] / cnt[b]);
      if (e < bestE) { bestE = e; best = t; }
    }
    setT(Math.round(best * 10) / 10);
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("RELIABILITY DIAGRAM  ·  confidence (x) vs actual accuracy (y)", D.x0, D.y0 - 10);

    const xc = (c) => D.x0 + c * D.s, yc = (a) => D.y0 + D.s - a * D.s;
    // grid box
    ctx.strokeStyle = "rgba(96,165,250,0.18)"; ctx.strokeRect(D.x0, D.y0, D.s, D.s);
    // perfect-calibration diagonal
    ctx.strokeStyle = "rgba(148,163,184,0.5)"; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(xc(0), yc(0)); ctx.lineTo(xc(1), yc(1)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "rgba(148,163,184,0.6)"; ctx.fillText("perfect", xc(0.78), yc(0.84));

    // gap lines + points (recalibrated)
    binsT.forEach(b => {
      const over = b.conf > b.acc;
      ctx.strokeStyle = over ? "rgba(248,113,113,0.6)" : "rgba(52,211,153,0.6)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(xc(b.conf), yc(b.conf)); ctx.lineTo(xc(b.conf), yc(b.acc)); ctx.stroke();
      const r = 2 + 7 * Math.sqrt(b.n / (sampRef.current.length || 1));
      ctx.fillStyle = over ? "#f87171" : "#34d399";
      ctx.beginPath(); ctx.arc(xc(b.conf), yc(b.acc), r, 0, Math.PI * 2); ctx.fill();
    });
    // axes labels
    ctx.fillStyle = "rgba(148,163,184,0.6)"; ctx.font = "9px JetBrains Mono";
    ctx.fillText("0", D.x0 - 4, D.y0 + D.s + 12); ctx.fillText("1", D.x0 + D.s - 4, D.y0 + D.s + 12);
    ctx.fillText("acc", D.x0 - 28, D.y0 + 10);

    // ── big ECE readout (right) ──
    const rx = D.x0 + D.s + 28;
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono"; ctx.fillText("ECE", rx, 60);
    ctx.fillStyle = eceT < 0.03 ? "#34d399" : eceT < 0.08 ? "#fbbf24" : "#f87171";
    ctx.font = "600 30px Space Grotesk, JetBrains Mono"; ctx.fillText(eceT.toFixed(3), rx, 92);
    ctx.fillStyle = "#64748b"; ctx.font = "10px JetBrains Mono";
    ctx.fillText("raw: " + eceRaw.toFixed(3), rx, 112);
    ctx.fillText("T = " + T.toFixed(1), rx, 140);
    ctx.fillText("β = " + beta.toFixed(1), rx, 156);
    ctx.fillStyle = "#94a3b8"; ctx.fillText("acc " + (accuracy * 100).toFixed(0) + "%", rx, 180);
    if (Math.abs(T - beta) < 0.12) { ctx.fillStyle = "#34d399"; ctx.fillText("T ≈ β →", rx, 206); ctx.fillText("calibrated", rx, 220); }

    // ── confidence histogram under the diagram ──
    const hY = D.y0 + D.s + 24, hH = H - hY - 16;
    ctx.fillStyle = "#94a3b8"; ctx.font = "10px JetBrains Mono";
    ctx.fillText("confidence histogram", D.x0, hY - 4);
    const maxN = Math.max(...binsT.map(b => b.n), 1);
    binsT.forEach(b => {
      const bw = D.s / bins * 0.8, bx = xc(b.conf) - bw / 2;
      const bh = (b.n / maxN) * hH;
      ctx.fillStyle = "rgba(96,165,250,0.5)"; ctx.fillRect(bx, hY + hH - bh, bw, bh);
    });
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
      <Slider label="// OVERCONFIDENCE (β)" min={1} max={3} step={0.1} value={beta} onChange={setBeta} tone="violet"
        help="How much the model's stated confidence outruns its real accuracy. At 1 it's perfectly calibrated; above 1 the points drop below the diagonal — when it says 90% it's right far less often. Modern deep nets sit well above 1." />
      <Slider label="// TEMPERATURE (T)" min={0.5} max={3} step={0.1} value={T} onChange={setT}
        help="The post-hoc fix: divide the logits by T before softmax. T > 1 softens overconfident probabilities toward the diagonal; T < 1 sharpens. It never changes the argmax (the predicted class), only the confidence. Slide it to β to recalibrate." />
      <Slider label="// BINS" min={5} max={15} step={1} value={bins} onChange={setBins}
        help="How many confidence buckets the reliability diagram and ECE use. More bins = finer resolution but noisier per-bin estimates." />
      <Slider label="// SAMPLES" min={200} max={2000} step={200} value={N} onChange={setN}
        help="Validation-set size used to measure calibration. More samples = a smoother, more trustworthy diagram (calibration is estimated, so small sets are noisy)." />
      <DemoButton onClick={autoCalibrate} primary>AUTO-CALIBRATE T</DemoButton>
      <DemoButton onClick={resample}>RESAMPLE</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="ECE" value={eceT.toFixed(3)} accent={eceT < 0.03 ? "#34d399" : eceT < 0.08 ? "#fbbf24" : "#f87171"} />
        <StatReadout label="ACCURACY" value={(accuracy * 100).toFixed(0) + "%"} />
      </div>
      <Legend items={[
        { color: "#f87171", label: "overconfident (below)" },
        { color: "#34d399", label: "calibrated / under" },
        { color: "#60a5fa", label: "confidence count" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Accuracy tells you how often a model is right; calibration tells you
        whether you can trust the number it prints next to the answer. A calibrated
        model that says "0.9" is correct 90% of the time — its points sit on the
        dashed diagonal. Raise OVERCONFIDENCE and the points sink below it: the
        model keeps saying 0.9 while only being right 75% of the time. <b>ECE</b>{" "}
        (expected calibration error) is the average gap, weighted by how many
        predictions fall in each confidence bin.
      </DemoP>
      <DemoP>
        Now slide TEMPERATURE up toward β, or hit AUTO-CALIBRATE. The points rise
        onto the diagonal and ECE collapses — yet not a single prediction changed,
        because dividing the logits by a constant can't alter which class scores
        highest. That's temperature scaling: one number, fit on a validation set,
        that makes the probabilities honest without touching accuracy. Overshoot
        past β and the model flips to <i>under</i>confident (points above the line).
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Calibration is the trust layer over a classifier. It matters anywhere a
        probability feeds a decision: a 0.7 cancer-risk score, a confidence
        threshold for human handoff, abstaining when unsure, or fusing model
        outputs. Guo et al. (2017) showed modern deep nets are systematically
        overconfident and that <b>temperature scaling</b> — the single parameter
        you're tuning — fixes most of it cheaply. The same softmax temperature
        knob appears in the{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/decoding/`} style={{ color: "#a855f7" }}>decoding</a>{" "}
        demo, there used to control diversity rather than calibration.
      </DemoP>
      <DemoP>
        It's complementary to{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/roc/`} style={{ color: "#a855f7" }}>ROC/threshold</a>{" "}
        analysis: ROC asks how to <i>rank and threshold</i> scores, calibration
        asks whether the scores mean what they say as probabilities — a model can
        have great AUC and terrible calibration. Beyond temperature scaling there's
        Platt scaling, isotonic regression, and proper scoring rules (Brier, NLL);
        ECE itself is binning-sensitive, which is why the bin count is a knob here.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="TRUSTWORTHY ML" title="Model Calibration"
      subtitle="A '90% confident' model should be right 90% of the time. See overconfidence on a reliability diagram, measure it with ECE, and fix it with one temperature knob."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/ml-theory/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<CalibrationDemo />);
