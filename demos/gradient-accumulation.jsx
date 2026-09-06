// demos/gradient-accumulation.jsx — the trick that buys a large batch on a small GPU, and
// the two conditions it quietly depends on.
//
// Benched headlessly first against the full-batch gradient as ground truth (B=64, D=6):
//   · per-example MEAN loss, equal microbatches, accumulate and divide by M:
//       rel err 1.6e-16 / 1.4e-16 / 5.8e-17 at M = 2 / 4 / 8 — exact to float
//   · same loss, UNEVEN microbatches [40,16,8], still divided by M: rel err 1.3e-1.
//       Weighting each microbatch by its own size instead: 2.2e-16. The bug is the
//       averaging, not the accumulation.
//   · InfoNCE, whose negatives come from inside the batch: rel err 3.1e-1 / 5.8e-1 / 7.4e-1
//       at M = 2 / 4 / 8 with cosine 0.996 / 0.983 / 0.981 and NORM RATIO 0.70 / 0.43 / 0.27 —
//       the DIRECTION mostly survives, the magnitude does not, and both degrade as the
//       microbatch shrinks. (The uneven-split error is 15% at M=4 with this demo's split,
//       against 13% on the bench's [40,16,8]; the split shape sets the size of the bug.)
// Gradients for the contrastive loss are central finite differences (h=1e-5), which is the
// impartial grader here: no hand-derived backward pass to get wrong.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const { DemoLayout, DemoP, Slider, StatReadout, SegmentedControl } = window;

const W = 580, H = 400;
const B = 64, D = 6;

const mulberry32 = (a) => () => {
  a |= 0; a = a + 0x6D2B79F5 | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
const mkN = (r) => () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

// one fixed dataset and one fixed parameter vector, so every comparison is like for like
const RNG = mulberry32(99), NRM = mkN(RNG);
const W0 = Array.from({ length: D }, () => NRM() * 0.5);
const XS = Array.from({ length: B }, () => Array.from({ length: D }, () => NRM()));
const YS = XS.map((x) => x.reduce((s, v, i) => s + v * (i + 1) * 0.3, 0) + 0.2 * NRM());

const splitSizes = (M, even) => {
  if (even) return Array.from({ length: M }, () => B / M);
  if (M === 1) return [B];
  // deliberately lopsided but still summing to B, the shape a real remainder batch has
  const wts = Array.from({ length: M }, (_, i) => M - i);
  const tot = wts.reduce((a, b) => a + b, 0);
  const out = wts.map((w) => Math.max(1, Math.round(B * w / tot)));
  out[M - 1] += B - out.reduce((a, b) => a + b, 0);
  return out;
};

function mseGrad(rows, w) {
  const g = new Array(D).fill(0);
  for (const i of rows) {
    const p = XS[i].reduce((s, v, k) => s + v * w[k], 0);
    const e = p - YS[i];
    for (let k = 0; k < D; k++) g[k] += 2 * e * XS[i][k];
  }
  return g.map((v) => v / rows.length);
}

function infoNCE(rows, w, tau = 0.1) {
  const n = rows.length; let L = 0;
  const z = rows.map((i) => { const v = XS[i].map((x, k) => x * w[k]); const nn = Math.hypot(...v) || 1; return v.map((x) => x / nn); });
  for (let a = 0; a < n; a++) {
    const sims = z.map((zb) => z[a].reduce((s, v, k) => s + v * zb[k], 0) / tau);
    const mx = Math.max(...sims), den = sims.reduce((s, v) => s + Math.exp(v - mx), 0);
    L += -(sims[a] - mx - Math.log(den));
  }
  return L / n;
}
const numGrad = (rows, w) => {
  const g = [], h = 1e-5, ww = [...w];
  for (let k = 0; k < D; k++) {
    const o = ww[k];
    ww[k] = o + h; const a = infoNCE(rows, ww);
    ww[k] = o - h; const b = infoNCE(rows, ww);
    ww[k] = o; g.push((a - b) / (2 * h));
  }
  return g;
};

function AccumDemo() {
  const cvRef = _useRef(null);
  const [mIdx, setMIdx] = _useState(2);            // M = 2^mIdx
  const [loss, setLoss] = _useState("mean");
  const [split, setSplit] = _useState("equal");
  const [howMode, setHow] = _useState("divM");

  const M = Math.pow(2, mIdx);
  const sizes = splitSizes(M, split === "equal");
  const all = Array.from({ length: B }, (_, i) => i);
  const grad = loss === "mean" ? (rows) => mseGrad(rows, W0) : (rows) => numGrad(rows, W0);

  const full = grad(all);
  const acc = new Array(D).fill(0);
  let off = 0;
  for (const s of sizes) {
    const g = grad(all.slice(off, off + s)); off += s;
    const wgt = howMode === "divM" ? 1 / M : s / B;
    for (let k = 0; k < D; k++) acc[k] += g[k] * wgt;
  }

  let n2 = 0, d2 = 0, dot = 0, na = 0;
  for (let k = 0; k < D; k++) { n2 += (acc[k] - full[k]) ** 2; d2 += full[k] ** 2; dot += acc[k] * full[k]; na += acc[k] ** 2; }
  const relErr = Math.sqrt(n2 / (d2 || 1));
  const cos = dot / (Math.sqrt(na * d2) || 1);
  const normRatio = Math.sqrt(na / (d2 || 1));
  const exact = relErr < 1e-10;

  _useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = window.fitCanvas ? window.fitCanvas(cv, W, H) : cv.getContext("2d");
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = "#0b1530"; ctx.fillRect(0, 0, W, H);
    const pad = 52;

    // ── panel 1: the gradient, component by component ──
    const y0 = 30, h1 = 170, w = W - pad - 24;
    const mx = Math.max(...full.map(Math.abs), ...acc.map(Math.abs), 1e-9);
    const mid = y0 + h1 / 2;
    ctx.strokeStyle = "#1e3a6e"; ctx.strokeRect(pad, y0, w, h1);
    ctx.beginPath(); ctx.moveTo(pad, mid); ctx.lineTo(pad + w, mid); ctx.stroke();
    const bw = w / D;
    for (let k = 0; k < D; k++) {
      const x = pad + k * bw + bw * 0.16, bwi = bw * 0.32;
      const hf = (full[k] / mx) * (h1 / 2 - 8), ha = (acc[k] / mx) * (h1 / 2 - 8);
      ctx.fillStyle = "rgba(96,165,250,0.55)"; ctx.fillRect(x, hf > 0 ? mid - hf : mid, bwi, Math.abs(hf));
      ctx.strokeStyle = "#60a5fa"; ctx.lineWidth = 1.2; ctx.strokeRect(x, hf > 0 ? mid - hf : mid, bwi, Math.abs(hf));
      const x2 = x + bwi + bw * 0.06;
      const col = exact ? "#34d399" : "#f87171";
      ctx.fillStyle = col + "88"; ctx.fillRect(x2, ha > 0 ? mid - ha : mid, bwi, Math.abs(ha));
      ctx.strokeStyle = col; ctx.strokeRect(x2, ha > 0 ? mid - ha : mid, bwi, Math.abs(ha));
      ctx.fillStyle = "#64748b"; ctx.font = "9px JetBrains Mono, monospace";
      ctx.fillText("w" + k, pad + k * bw + bw / 2 - 6, y0 + h1 + 13);
    }
    ctx.font = "10px JetBrains Mono, monospace";
    ctx.fillStyle = "#60a5fa"; ctx.fillText("full batch (truth)", pad + 8, y0 + 14);
    ctx.fillStyle = exact ? "#34d399" : "#f87171"; ctx.fillText("accumulated over " + M + " microbatch" + (M > 1 ? "es" : ""), pad + 8, y0 + 27);
    ctx.fillStyle = "#64748b"; ctx.fillText("gradient", 6, mid);

    // ── panel 2: what accumulation actually buys ──
    const y1 = y0 + h1 + 40, h2 = 30;
    ctx.font = "10px JetBrains Mono, monospace"; ctx.fillStyle = "#64748b";
    ctx.fillText("microbatch split (activation memory is set by the LARGEST one):", 14, y1 - 8);
    let cx = pad;
    sizes.forEach((s, i) => {
      const ww2 = (s / B) * w;
      ctx.fillStyle = i % 2 ? "rgba(192,132,252,0.30)" : "rgba(192,132,252,0.50)";
      ctx.fillRect(cx, y1, ww2 - 1, h2);
      ctx.fillStyle = "#e0e7ff"; ctx.font = "10px JetBrains Mono, monospace";
      if (ww2 > 22) ctx.fillText(String(s), cx + ww2 / 2 - 6, y1 + 19);
      cx += ww2;
    });
    ctx.strokeStyle = "#1e3a6e"; ctx.strokeRect(pad, y1, w, h2);
    ctx.fillStyle = "#64748b";
    ctx.fillText("effective batch " + B + "  ·  peak activations " + (Math.max(...sizes) / B).toFixed(3) +
      "x of full batch  ·  " + M + " forward+backward per optimizer step", 14, y1 + h2 + 20);
    ctx.fillStyle = exact ? "#34d399" : "#f87171";
    ctx.font = "600 12px JetBrains Mono, monospace";
    ctx.fillText(exact ? "IDENTICAL to the full-batch gradient" : "DIFFERENT gradient - rel error " + relErr.toExponential(1), 14, H - 12);
  }, [mIdx, loss, split, howMode]);

  const stage = (
    <canvas ref={cvRef} width={W} height={H}
      style={{ width: "100%", maxWidth: W * 1.3, borderRadius: 6, border: "1px solid var(--border)", background: "#0b1530" }} />
  );

  const controls = (
    <>
      <Slider label="MICROBATCHES (M = 2^k)" min={0} max={4} step={1} value={mIdx} onChange={setMIdx}
        help="Splits a batch of 64 into M pieces. Peak activation memory falls like 1/M while the effective batch stays 64 - that is the entire point of the technique." />
      <SegmentedControl label="// LOSS" value={loss} onChange={setLoss}
        options={[{ value: "mean", label: "PER-EXAMPLE MEAN" }, { value: "nce", label: "IN-BATCH CONTRASTIVE" }]}
        help="A per-example mean decomposes over any partition of the batch. A contrastive loss draws its negatives from inside the batch, so it does not - and no accumulation recipe fixes that." />
      <SegmentedControl label="// SPLIT" value={split} onChange={setSplit}
        options={[{ value: "equal", label: "EQUAL" }, { value: "uneven", label: "UNEVEN" }]}
        help="UNEVEN is the shape a real dataset gives you at the end of an epoch, when the last microbatch is a remainder." />
      <SegmentedControl label="// ACCUMULATE BY" value={howMode} onChange={setHow}
        options={[{ value: "divM", label: "÷ M" }, { value: "size", label: "WEIGHT BY SIZE" }]}
        help="Dividing each microbatch mean by M is the standard recipe and it is exact - but only when the microbatches are the same size. Weighting by size is exact either way." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginTop: 14 }}>
        <StatReadout label="REL ERROR vs FULL BATCH" value={relErr.toExponential(2)} accent={exact ? "#34d399" : "#f87171"} />
        <StatReadout label="EXACT?" value={exact ? "yes" : "NO"} accent={exact ? "#34d399" : "#f87171"} />
        <StatReadout label="COSINE WITH TRUTH" value={cos.toFixed(4)} accent="#60a5fa" />
        <StatReadout label="NORM RATIO" value={normRatio.toFixed(4)} accent="#c084fc" />
        <StatReadout label="PEAK ACTIVATIONS" value={(Math.max(...sizes) / B).toFixed(3) + "x"} accent="#c084fc" />
        <StatReadout label="PASSES PER STEP" value={String(M)} accent="#94a3b8" />
      </div>
    </>
  );

  const explainer = (
    <>
      <DemoP>
        Gradient accumulation is the answer to "this batch size does not fit". Run M smaller
        forward-backward passes, add their gradients, and step once. Peak activation memory is set by
        the largest microbatch, so it falls like 1/M, while the optimizer sees the batch you actually
        wanted. The bars are the test: blue is the true full-batch gradient, and the second bar is
        what accumulation produced.
      </DemoP>
      <DemoP>
        With a per-example mean loss and equal microbatches it is <strong>exact</strong> — not close,
        exact, at a relative error around 10<sup>-16</sup>, which is floating point and nothing else.
        That is because a mean over the batch is a mean of the microbatch means when the pieces are
        the same size. Switch SPLIT to <strong>UNEVEN</strong> and the bars come apart: dividing by M
        makes a small microbatch count as much as a large one, and the measured error jumps to
        <strong>15%</strong>. Nothing errors, nothing warns; the run just optimises a slightly
        different objective. Switching ACCUMULATE BY to <strong>WEIGHT BY SIZE</strong> takes it back
        to 10<sup>-16</sup>. The averaging was the bug, not the accumulation.
      </DemoP>
      <DemoP>
        The second failure has no fix. Switch LOSS to <strong>IN-BATCH CONTRASTIVE</strong>. InfoNCE
        scores each example against <em>the other examples in its batch</em>, so the loss is not a
        sum of per-example terms and cannot be decomposed over a partition at all. Splitting into 2
        microbatches gives a relative error of <strong>0.31</strong>; into 8, <strong>0.74</strong> —
        worse as the microbatch shrinks, because the number of negatives each example sees shrinks
        with it. The two other readouts say precisely what kind of wrong it is: the cosine stays at
        <strong>0.996 / 0.983 / 0.981</strong> while the norm ratio collapses
        <strong>0.70 → 0.43 → 0.27</strong>. The direction survives almost intact and the magnitude
        does not, so at 8 microbatches you are taking a step roughly a quarter the length the
        objective asks for. The run trains; it just trains on a weaker objective than the config
        file claims, and nothing in the logs says so.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        The same decomposability question decides several other things at once. BatchNorm computes
        statistics over whatever is in front of it, so accumulation silently changes them the way it
        changes InfoNCE's negatives — which is part of why
        {" "}<a href={`${window.__DM_BASE || "../../"}visualize/batch-norm/`}>normalisation choice</a>{" "}
        and distributed training are entangled, and why LayerNorm is the default in transformers.
        Losses with a per-example reduction — cross-entropy, MSE, most of what a language model
        trains on — are safe.
      </DemoP>
      <DemoP>
        Accumulation trades wall-clock for memory: M passes per update means M times the compute per
        step, with no reduction in FLOPs. It sits beside
        {" "}<a href={`${window.__DM_BASE || "../../"}learn/training-systems/gradient-checkpointing/`}>activation checkpointing</a>{" "}
        and {" "}<a href={`${window.__DM_BASE || "../../"}visualize/mixed-precision/`}>mixed precision</a>{" "}
        as one of three ways to buy memory, and the three compose — which also means their
        interactions are where the surprises live.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      title="Gradient Accumulation"
      subtitle="Buy a big batch on a small GPU - exactly, for a per-example mean, and only approximately for anything that looks across the batch."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/training-systems/gradient-accumulation/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="blue"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<AccumDemo />);
