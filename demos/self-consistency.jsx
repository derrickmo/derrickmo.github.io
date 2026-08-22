// demos/self-consistency.jsx — self-consistency (sample-and-vote) for LLMs.
//
// Instead of trusting one chain-of-thought, sample N of them and take the
// majority answer. We model each chain as a draw that is correct with
// probability p (the single-sample accuracy); when it errs it lands on a wrong
// option, either scattered uniformly over the distractors or — with correlation
// c — funnelled onto one systematic wrong answer (the failure mode voting can't
// fix). This is an honest simulation of the voting statistics, not a real model.
//
// The live chips show one set of N samples (re-sampled a couple of times a
// second so you feel the variance). The bottom curve is the real payoff:
// P(majority vote is correct) vs the number of samples, estimated by Monte
// Carlo, against the dashed single-sample baseline p.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480;
const CORRECT = 0;            // option A is the correct answer
const LABELS = ["A", "B", "C", "D", "E", "F"];

function drawSample(p, K, c) {
  if (Math.random() < p) return CORRECT;
  // error: with prob c go to the systematic-error magnet (option B), else uniform distractor
  const magnet = 1 % K;
  if (Math.random() < c) return magnet;
  let d = 1 + ((Math.random() * (K - 1)) | 0);   // 1..K-1
  return d;
}
function voteWinner(counts) {
  const mx = Math.max(...counts);
  const tied = [];
  for (let i = 0; i < counts.length; i++) if (counts[i] === mx) tied.push(i);
  return tied[(Math.random() * tied.length) | 0];
}
// Monte-Carlo P(majority correct) for each n = 1..N
function accuracyCurve(N, p, K, c) {
  const trials = 1000, out = [];
  for (let n = 1; n <= N; n += 2) {
    let wins = 0;
    for (let t = 0; t < trials; t++) {
      const counts = new Array(K).fill(0);
      for (let i = 0; i < n; i++) counts[drawSample(p, K, c)]++;
      if (voteWinner(counts) === CORRECT) wins++;
    }
    out.push({ n, acc: wins / trials });
  }
  return out;
}

function SelfConsistencyDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const lastRef = _useRef(0);

  const [p, setP] = _useState(0.55);
  const [N, setN] = _useState(25);
  const [K, setK] = _useState(4);
  const [c, setC] = _useState(0.1);
  const [running, setRunning] = _useState(false);
  const [, force] = _useState(0);

  const liveRef = _useRef([]);
  const resample = () => { liveRef.current = Array.from({ length: N }, () => drawSample(p, K, c)); force(x => x + 1); };

  // regenerate the live sample whenever the knobs change
  _useEffect(() => { liveRef.current = Array.from({ length: N }, () => drawSample(p, K, c)); force(x => x + 1); /* eslint-disable-next-line */ }, [N, p, K, c]);

  // accuracy curve (Monte Carlo) — recompute only on param change
  const curve = React.useMemo(() => accuracyCurve(N, p, K, c), [N, p, K, c]);

  const samples = liveRef.current;
  const counts = new Array(K).fill(0); samples.forEach(s => counts[s]++);
  const winner = samples.length ? voteWinner(counts) : 0;
  const voteCorrect = winner === CORRECT;
  const finalAcc = curve.length ? curve[curve.length - 1].acc : 0;

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";

    // ── chips: N sampled chains ──
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(`${N} SAMPLED CHAINS  ·  green = correct answer (A), red = a wrong answer`, 20, 24);
    const cols = 17, chip = 18, gap = 4, x0 = 20, y0 = 36;
    samples.forEach((s, i) => {
      const cx = x0 + (i % cols) * (chip + gap), cy = y0 + Math.floor(i / cols) * (chip + gap);
      ctx.fillStyle = s === CORRECT ? "#34d399" : (s === 1 ? "#fb923c" : "#f87171");
      ctx.fillRect(cx, cy, chip, chip);
      ctx.fillStyle = "rgba(11,18,32,0.85)"; ctx.font = "9px JetBrains Mono";
      ctx.fillText(LABELS[s], cx + 5, cy + 13);
    });

    // ── vote tally ──
    const tY = 178, tH = 92, tX = 20, tW = W - 40, slot = tW / K;
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono";
    ctx.fillText("VOTE TALLY  ·  majority wins", tX, tY - 6);
    const maxC = Math.max(...counts, 1);
    for (let i = 0; i < K; i++) {
      const bx = tX + i * slot + slot * 0.18, bw = slot * 0.64;
      const bh = (counts[i] / maxC) * (tH - 20);
      ctx.fillStyle = i === CORRECT ? "rgba(52,211,153,0.85)" : (i === winner ? "rgba(96,165,250,0.85)" : "rgba(148,163,184,0.5)");
      ctx.fillRect(bx, tY + tH - bh, bw, bh);
      if (i === winner) { ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 1.5; ctx.strokeRect(bx, tY + tH - bh, bw, bh); }
      ctx.fillStyle = i === CORRECT ? "#34d399" : "#94a3b8"; ctx.font = "10px JetBrains Mono";
      ctx.fillText(LABELS[i] + (i === CORRECT ? " ✓" : ""), bx + bw / 2 - 6, tY + tH + 12);
      ctx.fillText(String(counts[i]), bx + bw / 2 - 3, tY + tH - bh - 4);
    }

    // ── accuracy curve ──
    const aY = 312, aH = H - aY - 16, aX = 20, aW = W - 40;
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("P(majority correct) vs number of samples  ·  dashed = single sample (p)", aX, aY - 8);
    ctx.strokeStyle = "rgba(96,165,250,0.18)"; ctx.strokeRect(aX, aY, aW, aH);
    const yOf = (v) => aY + aH - v * (aH - 10) - 5;
    // baselines at p and 1.0
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = "rgba(148,163,184,0.5)";
    ctx.beginPath(); ctx.moveTo(aX, yOf(p)); ctx.lineTo(aX + aW, yOf(p)); ctx.stroke();
    ctx.fillStyle = "rgba(148,163,184,0.7)"; ctx.fillText("p = " + p.toFixed(2), aX + 4, yOf(p) - 4);
    ctx.strokeStyle = "rgba(52,211,153,0.3)";
    ctx.beginPath(); ctx.moveTo(aX, yOf(1)); ctx.lineTo(aX + aW, yOf(1)); ctx.stroke();
    ctx.setLineDash([]);
    // curve
    ctx.strokeStyle = "#60a5fa"; ctx.lineWidth = 2; ctx.beginPath();
    curve.forEach((pt, i) => {
      const x = aX + (curve.length === 1 ? 0.5 : i / (curve.length - 1)) * aW, y = yOf(pt.acc);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    // marker at current N
    const lastPt = curve[curve.length - 1];
    if (lastPt) {
      ctx.fillStyle = "#60a5fa";
      ctx.beginPath(); ctx.arc(aX + aW, yOf(lastPt.acc), 3.5, 0, Math.PI * 2); ctx.fill();
    }
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
    // eslint-disable-next-line
  });

  _useEffect(() => {
    if (!running) return;
    const loop = (now) => {
      if (now - lastRef.current >= 500) { lastRef.current = now; resample(); }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line
  }, [running, N, p, K, c]);

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// SINGLE-SAMPLE ACC (p)" min={0.2} max={0.95} step={0.05} value={p} onChange={setP} tone="violet"
        help="How often ONE chain-of-thought gets the answer right. Above ~1/K (better than guessing) majority voting amplifies it; the closer p is to just over 0.5 the more dramatic the lift from many samples." />
      <Slider label="// SAMPLES (N)" min={1} max={49} step={2} value={N} onChange={setN}
        help="How many independent chains you sample before voting. The curve shows accuracy climbing and then plateauing — there are sharply diminishing returns, and every extra sample costs another full generation." />
      <Slider label="// ANSWER OPTIONS (K)" min={2} max={6} step={1} value={K} onChange={setK}
        help="How many distinct answers are possible. More options spread the wrong votes thinner, so a correct plurality is easier to reach — voting helps more on open-ended answers than on a coin-flip binary." />
      <Slider label="// ERROR CORRELATION (c)" min={0} max={1} step={0.05} value={c} onChange={setC}
        help="How much the wrong answers agree. At 0 errors scatter over all distractors and cancel out; near 1 every wrong chain makes the SAME mistake (orange), forming a fake consensus that voting locks in. The reason self-consistency can't fix a systematic bias." />
      <DemoButton onClick={() => setRunning(r => !r)} primary>{running ? "PAUSE" : "AUTO-SAMPLE"}</DemoButton>
      <DemoButton onClick={resample}>RESAMPLE</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="VOTE" value={voteCorrect ? "CORRECT" : "WRONG"} accent={voteCorrect ? "#34d399" : "#f87171"} />
        <StatReadout label="WINNER" value={LABELS[winner]} />
      </div>
      <StatReadout label={"P(correct) @ N=" + N} value={(finalAcc * 100).toFixed(1) + "%"} accent="#60a5fa" />
      <Legend items={[
        { color: "#34d399", label: "correct (A)" },
        { color: "#fb923c", label: "systematic error" },
        { color: "#f87171", label: "scattered error" },
        { color: "#60a5fa", label: "vote winner" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        One sampled chain-of-thought is right only a fraction p of the time. But
        if its mistakes are scattered — different wrong answers on different
        samples — then the single correct answer is the one thing the samples
        agree on, so a majority vote concentrates on it. Each chip is one sampled
        chain (green = right, red/orange = wrong); the bars tally their votes; the
        blue curve is the probability the majority is correct as you add samples.
      </DemoP>
      <DemoP>
        With p just above chance and low correlation, watch the curve rocket past
        the dashed single-sample line toward 100% — that's the Condorcet jury
        effect, the statistical engine behind self-consistency. Now drag ERROR
        CORRELATION up: the wrong answers pile onto one option (orange), a
        confident false consensus forms, and the curve sags back down. Voting
        averages away <i>random</i> error; it is powerless against a <i>shared</i>
        bias — exactly why self-consistency boosts arithmetic but not a
        misconception every chain holds.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Self-consistency (Wang et al., 2022) is the simplest reliability pattern
        for LLMs: sample several chains at nonzero temperature, then majority-vote
        the final answer. It reliably lifts accuracy on reasoning benchmarks for
        the price of N forward passes, and it's the seed of richer schemes —
        best-of-N against a verifier, tree-of-thought search, and the test-time
        compute scaling behind reasoning models. The{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/decoding/`} style={{ color: "#a855f7" }}>decoding</a>{" "}
        temperature is what creates the diversity it depends on.
      </DemoP>
      <DemoP>
        The correlation knob is the practical caveat. Sampling diversity (and so
        the independence voting needs) comes from temperature: too low and every
        chain is a near-copy (high correlation, no benefit), too high and p itself
        collapses. Real deployments tune that sweet spot, cap N for cost, and pair
        voting with a verifier precisely because a model's errors are rarely fully
        independent — the assumption this demo lets you break on purpose.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Self-Consistency"
      subtitle="Sample many chains of thought and majority-vote the answer. See why it lifts accuracy — and why correlated errors defeat it."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/rag-agents/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<SelfConsistencyDemo />);
