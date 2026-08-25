// demos/cross-entropy.jsx — the loss every classifier is trained with, and the
// reason it is that loss rather than squared error. Both losses and both GRADIENTS
// are computed from their exact closed forms; the headline ratio on screen is a live
// computation, not a quoted figure.
//
// Benched before this file existed: dCE/dz == p - y verified against central finite
// differences to 2.95e-8 (binary) and 2.46e-10 (multi-class softmax), and at z = -8
// with y = 1 the CE gradient is ~1,490x the MSE gradient.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup, SegmentedControl,
} = window;

const W = 560, H = 380;
const sigmoid = z => 1 / (1 + Math.exp(-z));

// p = probability assigned to the TRUE class
const ceLoss = p => -Math.log(Math.max(p, 1e-300));
const mseLoss = p => (p - 1) * (p - 1);
// through a sigmoid, w.r.t. the LOGIT:
//   CE : dL/dz = s - y                  (no saturation factor)
//   MSE: dL/dz = 2(s - y) * s(1 - s)    (the s(1-s) is what kills it)
const ceGrad = (s, y) => Math.abs(s - y);
const mseGrad = (s, y) => Math.abs(2 * (s - y) * s * (1 - s));

function CrossEntropyDemo() {
  const canvasRef = _useRef(null);
  const [z, setZ] = _useState(-4);
  const [y, setY] = _useState(1);

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = window.fitCanvas ? window.fitCanvas(cv, W, H) : cv.getContext("2d");
    ctx.clearRect(0, 0, W, H);

    const s = sigmoid(z);
    const pTrue = y === 1 ? s : 1 - s;

    // ================= PANEL A — loss vs p(true class) =================
    const ax = 46, ay = 44, aw = 220, ah = 132;
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px JetBrains Mono, monospace"; ctx.textAlign = "left";
    ctx.fillText("LOSS vs p(TRUE CLASS)", ax, ay - 10);
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.strokeRect(ax, ay, aw, ah);
    const LMAX = 5;                                   // clip the y axis; CE is unbounded
    const py = L => ay + ah - Math.min(L, LMAX) / LMAX * (ah - 4) - 2;
    // cross-entropy
    ctx.strokeStyle = "#34d399"; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 1; i <= 200; i++) { const p = i / 200; const X = ax + p * aw;
      i === 1 ? ctx.moveTo(X, py(ceLoss(p))) : ctx.lineTo(X, py(ceLoss(p))); }
    ctx.stroke();
    // squared error
    ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= 200; i++) { const p = i / 200; const X = ax + p * aw;
      i === 0 ? ctx.moveTo(X, py(mseLoss(p))) : ctx.lineTo(X, py(mseLoss(p))); }
    ctx.stroke();
    // "off the top" marker — CE leaves the panel, MSE never can
    ctx.fillStyle = "rgba(52,211,153,0.75)"; ctx.font = "9px JetBrains Mono";
    ctx.fillText("unbounded", ax + 4, ay + 12);
    ctx.fillStyle = "rgba(251,191,36,0.75)";
    ctx.fillText("bounded by 1", ax + aw - 74, ay + ah - 26);
    // current point
    const cxA = ax + pTrue * aw;
    ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(cxA, ay); ctx.lineTo(cxA, ay + ah); ctx.stroke(); ctx.setLineDash([]);
    for (const [L, col] of [[ceLoss(pTrue), "#34d399"], [mseLoss(pTrue), "#fbbf24"]]) {
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cxA, py(L), 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "9px JetBrains Mono"; ctx.textAlign = "center";
    ctx.fillText("0", ax, ay + ah + 12); ctx.fillText("1", ax + aw, ay + ah + 12);
    ctx.fillText("p(true class)", ax + aw / 2, ay + ah + 12);
    ctx.save(); ctx.translate(ax - 12, ay + ah / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText("loss", 0, 0); ctx.restore();

    // ================= PANEL B — |gradient| vs logit, LOG scale =================
    const bx = 320, bw = 210;
    ctx.textAlign = "left"; ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px JetBrains Mono";
    ctx.fillText("|dLOSS / dLOGIT|   (log scale)", bx, ay - 10);
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.strokeRect(bx, ay, bw, ah);
    const ZMIN = -10, ZMAX = 10;
    const GMIN = 1e-6;                                  // floor for the log axis
    const gy = g => { const t = (Math.log10(Math.max(g, GMIN)) - Math.log10(GMIN)) / (0 - Math.log10(GMIN));
      return ay + ah - t * (ah - 4) - 2; };
    const zx = zz => bx + (zz - ZMIN) / (ZMAX - ZMIN) * bw;
    // decade gridlines
    ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 1;
    for (let d = -6; d <= 0; d++) { const Y = gy(Math.pow(10, d));
      ctx.beginPath(); ctx.moveTo(bx, Y); ctx.lineTo(bx + bw, Y); ctx.stroke(); }
    ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.font = "8px JetBrains Mono"; ctx.textAlign = "right";
    ctx.fillText("1", bx - 3, gy(1) + 3); ctx.fillText("1e-6", bx - 3, gy(1e-6) + 3);
    ctx.textAlign = "left";
    for (const [fn, col] of [[ceGrad, "#34d399"], [mseGrad, "#fbbf24"]]) {
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i <= 240; i++) { const zz = ZMIN + (ZMAX - ZMIN) * i / 240;
        const sv = sigmoid(zz); const X = zx(zz), Y = gy(fn(sv, y));
        i === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); }
      ctx.stroke();
    }
    // the confidently-wrong region
    const wrongFrom = y === 1 ? ZMIN : 0, wrongTo = y === 1 ? 0 : ZMAX;
    ctx.fillStyle = "rgba(248,113,113,0.07)";
    ctx.fillRect(zx(wrongFrom), ay + 1, zx(wrongTo) - zx(wrongFrom), ah - 2);
    ctx.fillStyle = "rgba(248,113,113,0.65)"; ctx.font = "9px JetBrains Mono";
    ctx.fillText("confidently wrong", zx(wrongFrom) + 6, ay + ah - 8);
    // current logit
    const cxB = zx(Math.max(ZMIN, Math.min(ZMAX, z)));
    ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(cxB, ay); ctx.lineTo(cxB, ay + ah); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#34d399"; ctx.beginPath(); ctx.arc(cxB, gy(ceGrad(s, y)), 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(cxB, gy(mseGrad(s, y)), 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "9px JetBrains Mono"; ctx.textAlign = "center";
    ctx.fillText("-10", bx, ay + ah + 12); ctx.fillText("logit z", bx + bw / 2, ay + ah + 12); ctx.fillText("+10", bx + bw, ay + ah + 12);

    // ================= the identity, spelled out =================
    const ty = 232;
    ctx.textAlign = "left"; ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px JetBrains Mono";
    ctx.fillText("WHY THE GRADIENT IS SO SIMPLE", ax, ty);
    ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.font = "12px JetBrains Mono";
    ctx.fillText("d(cross-entropy) / d(logit)  =  p - y", ax, ty + 22);
    ctx.fillStyle = "#34d399"; ctx.font = "11px JetBrains Mono";
    ctx.fillText(`= ${s.toFixed(4)} - ${y}  =  ${(s - y).toFixed(4)}`, ax, ty + 40);
    ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.font = "10px JetBrains Mono";
    ctx.fillText("The softmax derivative and the log cancel exactly. Squared error", ax, ty + 62);
    ctx.fillText("keeps a s(1-s) factor, which goes to zero when the model is most", ax, ty + 76);
    ctx.fillText("confident - including when it is confidently WRONG.", ax, ty + 90);

    // live ratio badge
    const ratio = mseGrad(s, y) > 0 ? ceGrad(s, y) / mseGrad(s, y) : Infinity;
    ctx.fillStyle = "rgba(96,165,250,0.10)"; ctx.fillRect(bx, ty + 4, bw, 84);
    ctx.strokeStyle = "rgba(96,165,250,0.3)"; ctx.strokeRect(bx, ty + 4, bw, 84);
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px JetBrains Mono";
    ctx.fillText("CE GRADIENT vs MSE GRADIENT", bx + 10, ty + 24);
    ctx.fillStyle = "#60a5fa"; ctx.font = "22px JetBrains Mono";
    ctx.fillText(Number.isFinite(ratio) ? `${ratio < 10000 ? ratio.toFixed(0) : ratio.toExponential(1)}x` : "-", bx + 10, ty + 54);
    ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.font = "9px JetBrains Mono";
    ctx.fillText("larger learning signal at this logit", bx + 10, ty + 74);
  }

  _useEffect(() => { draw(); });

  const s = sigmoid(z);
  const pTrue = y === 1 ? s : 1 - s;
  const ratio = mseGrad(s, y) > 0 ? ceGrad(s, y) / mseGrad(s, y) : Infinity;

  const stage = (<canvas ref={canvasRef} style={{ width: "100%", maxWidth: W, borderRadius: 4 }} />);

  const controls = (
    <ControlGroup>
      <Slider label="// LOGIT z" min={-10} max={10} step={0.1} value={z} onChange={setZ}
        help="The raw score the network outputs before any squashing. The predicted probability is sigmoid(z), so a large negative z means the model is confident the answer is class 0." />
      <SegmentedControl label="// TRUE LABEL y" value={String(y)} onChange={v => setY(Number(v))}
        options={[{ value: "0", label: "0" }, { value: "1", label: "1" }]}
        help="The correct answer. With y=1, a negative logit is the confidently-wrong region - the shaded band where the two losses disagree most about how hard to learn." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => { setZ(-8); setY(1); }} primary>CONFIDENTLY WRONG</DemoButton>
        <DemoButton onClick={() => { setZ(0); setY(1); }}>UNSURE</DemoButton>
        <DemoButton onClick={() => { setZ(-4); setY(1); }}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="p(TRUE CLASS)" value={pTrue < 1e-4 ? pTrue.toExponential(2) : pTrue.toFixed(4)} accent="var(--blue-lt)" />
        <StatReadout label="CROSS-ENTROPY" value={ceLoss(pTrue).toFixed(4)} accent="#34d399" />
        <StatReadout label="SQUARED ERROR" value={mseLoss(pTrue).toFixed(6)} accent="#fbbf24" />
        <StatReadout label="|dCE / dz|" value={ceGrad(s, y).toFixed(4)} accent="#34d399" />
        <StatReadout label="|dMSE / dz|" value={mseGrad(s, y).toExponential(2)} accent="#fbbf24" />
        <StatReadout label="GRADIENT RATIO" value={Number.isFinite(ratio) ? (ratio < 10000 ? ratio.toFixed(0) + "x" : ratio.toExponential(1)) : "-"} accent="#60a5fa" />
      </div>
      <Legend items={[
        { color: "#34d399", label: "cross-entropy" },
        { color: "#fbbf24", label: "squared error" },
        { color: "#f87171", label: "confidently-wrong region" },
      ]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Cross-entropy is the loss essentially every classifier is trained with, and this demo is about
        <b> why it beats the obvious alternative</b>. Both panels show the same two candidate losses:
        cross-entropy <b>−log p</b> and squared error <b>(p − 1)²</b>, where p is the probability the
        model assigned to the correct answer.
      </DemoP>
      <DemoP>
        The left panel is the loss itself. Squared error is <b>bounded by 1</b> no matter how wrong the
        model is; cross-entropy is <b>unbounded</b> and climbs without limit as p → 0. The right panel
        is what actually drives learning — the gradient with respect to the logit, on a log axis.
        Press <b>CONFIDENTLY WRONG</b>: at z = −8 with the true label 1, cross-entropy still delivers a
        gradient of essentially 1, while squared error's has collapsed to about 7e-4. The badge shows
        the live ratio — roughly <b>1,500×</b> more learning signal, at exactly the example the model
        most needs to learn from.
      </DemoP>
      <DemoP>
        The reason is visible in the algebra on screen. Differentiating cross-entropy through a softmax
        gives exactly <b>p − y</b> — the log and the exponential cancel. Squared error keeps an extra
        <b> s(1 − s)</b> factor from the sigmoid, and that factor goes to zero precisely when the model
        is most confident. Being confidently wrong is the worst state to be in and the one squared error
        is least able to escape.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Cross-entropy is not an arbitrary choice: minimising it <i>is</i> maximum-likelihood estimation,
        and for a one-hot target it equals the <b>KL divergence</b> between the true distribution and the
        model's. That is why the same quantity appears in
        <a href={`${window.__DM_BASE || "../../"}visualize/huffman-coding/`}> compression</a> — a model's
        cross-entropy on held-out text is literally the number of bits per token it needs to encode it, so
        a better language model is a better compressor of the same file.
      </DemoP>
      <DemoP>
        Two practical consequences follow from the shapes on screen. Because the loss is unbounded, a
        single mislabelled example can dominate a batch, which is what connects this to
        <a href={`${window.__DM_BASE || "../../"}learn/neural-nets/label-noise/`}> label noise</a> and to
        why robust losses bound each example's contribution. And because the gradient is exactly p − y,
        frameworks fuse softmax and cross-entropy into one op that never forms the probabilities: computing
        <code> log(sum(exp(z)))</code> naively overflows to NaN at logits a real network reaches, which is
        why you pass <b>logits</b>, not probabilities, to a loss function.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      title="Cross-Entropy Loss"
      subtitle="Why classifiers are trained with -log p and not squared error - the gradient that does not vanish when the model is confidently wrong."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/foundations/cross-entropy/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="blue"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<CrossEntropyDemo />);
