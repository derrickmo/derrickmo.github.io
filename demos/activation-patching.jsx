// demos/activation-patching.jsx — causal tracing in a small net. Run a CLEAN
// input and a CORRUPTED input (one feature changed so the prediction flips),
// then copy a single hidden activation from the clean run into the corrupted
// run and measure how much the clean answer is RESTORED. The neurons whose
// patch restores the most are the ones the network causally uses. Real trained
// MLP, real per-neuron patching — the causal counterpart to linear probing.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 380, NH = 8;

function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function gauss(rng) { let u = 0, v = 0; while (u === 0) u = rng(); while (v === 0) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const tanh = Math.tanh;

// XOR-style data: class depends on BOTH features (sign of x1*x2), so each
// feature is causally essential — good for patching.
function makeData(rng) {
  const pts = [];
  for (let i = 0; i < 160; i++) { const sx = rng() < 0.5 ? -1 : 1, sy = rng() < 0.5 ? -1 : 1; const x = sx * (0.5 + rng() * 0.6) + gauss(rng) * 0.08, y = sy * (0.5 + rng() * 0.6) + gauss(rng) * 0.08; pts.push({ x: [x, y], y: sx * sy > 0 ? 0 : 1 }); }
  return pts;
}

function ActivationPatchingDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rngRef = _useRef(mulberry32(11));
  const dataRef = _useRef([]);
  const netRef = _useRef(null);
  const exRef = _useRef(null); // {clean:[2], corrupt:[2], cleanClass, effects:[[..],[..]], pClean, pCorrupt}
  const trainedRef = _useRef(false);

  const [corruptFeat, setCorruptFeat] = _useState("x1");
  const [, setTick] = _useState(0);

  const cfRef = _useRef(corruptFeat);
  _useEffect(() => { cfRef.current = corruptFeat; if (trainedRef.current) { pickExample(); } }, [corruptFeat]);

  function randMat(r, c, rng, s) { return Array.from({ length: r }, () => Array.from({ length: c }, () => gauss(rng) * s)); }
  function forward(net, x, ov) { // ov = {L, idx, val} optional override
    const z1 = net.b1.map((b, i) => b + net.W1[i][0] * x[0] + net.W1[i][1] * x[1]); const h1 = z1.map(tanh); if (ov && ov.L === 1) h1[ov.idx] = ov.val;
    const z2 = net.b2.map((b, i) => b + net.W2[i].reduce((s, w, j) => s + w * h1[j], 0)); const h2 = z2.map(tanh); if (ov && ov.L === 2) h2[ov.idx] = ov.val;
    const zo = net.b3.map((b, i) => b + net.W3[i].reduce((s, w, j) => s + w * h2[j], 0));
    const m = Math.max(zo[0], zo[1]); const e0 = Math.exp(zo[0] - m), e1 = Math.exp(zo[1] - m), s = e0 + e1;
    return { h1, h2, zo, p: [e0 / s, e1 / s] };
  }

  function train() {
    const rng = rngRef.current;
    netRef.current = { W1: randMat(NH, 2, rng, 1.0), b1: new Array(NH).fill(0), W2: randMat(NH, NH, rng, 0.8), b2: new Array(NH).fill(0), W3: randMat(2, NH, rng, 0.8), b3: [0, 0] };
    const net = netRef.current, data = dataRef.current, N = data.length, lr = 0.3;
    for (let ep = 0; ep < 320; ep++) {
      const gW1 = net.W1.map(r => r.map(() => 0)), gb1 = net.b1.map(() => 0), gW2 = net.W2.map(r => r.map(() => 0)), gb2 = net.b2.map(() => 0), gW3 = net.W3.map(r => r.map(() => 0)), gb3 = [0, 0];
      for (const d of data) {
        const f = forward(net, d.x), y = d.y, dzo = [f.p[0] - (y === 0 ? 1 : 0), f.p[1] - (y === 1 ? 1 : 0)];
        for (let i = 0; i < 2; i++) { gb3[i] += dzo[i]; for (let j = 0; j < NH; j++) gW3[i][j] += dzo[i] * f.h2[j]; }
        const dh2 = new Array(NH).fill(0); for (let j = 0; j < NH; j++) for (let i = 0; i < 2; i++) dh2[j] += net.W3[i][j] * dzo[i];
        const dz2 = dh2.map((g, j) => g * (1 - f.h2[j] * f.h2[j]));
        for (let i = 0; i < NH; i++) { gb2[i] += dz2[i]; for (let j = 0; j < NH; j++) gW2[i][j] += dz2[i] * f.h1[j]; }
        const dh1 = new Array(NH).fill(0); for (let j = 0; j < NH; j++) for (let i = 0; i < NH; i++) dh1[j] += net.W2[i][j] * dz2[i];
        const dz1 = dh1.map((g, j) => g * (1 - f.h1[j] * f.h1[j]));
        for (let i = 0; i < NH; i++) { gb1[i] += dz1[i]; gW1[i][0] += dz1[i] * d.x[0]; gW1[i][1] += dz1[i] * d.x[1]; }
      }
      const s = lr / N;
      for (let i = 0; i < NH; i++) { net.b1[i] -= s * gb1[i]; net.W1[i][0] -= s * gW1[i][0]; net.W1[i][1] -= s * gW1[i][1]; net.b2[i] -= s * gb2[i]; for (let j = 0; j < NH; j++) net.W2[i][j] -= s * gW2[i][j]; }
      for (let i = 0; i < 2; i++) { net.b3[i] -= s * gb3[i]; for (let j = 0; j < NH; j++) net.W3[i][j] -= s * gW3[i][j]; }
    }
    trainedRef.current = true;
  }

  function pickExample() {
    const net = netRef.current, data = dataRef.current, rng = rngRef.current;
    // find a confidently, correctly classified clean point
    let clean = null;
    for (let tries = 0; tries < 200; tries++) { const d = data[Math.floor(rng() * data.length)]; const f = forward(net, d.x); const cls = f.p[0] >= f.p[1] ? 0 : 1; if (cls === d.y && Math.max(f.p[0], f.p[1]) > 0.85) { clean = d; break; } }
    if (!clean) clean = data[0];
    const cleanF = forward(net, clean.x), cleanClass = cleanF.p[0] >= cleanF.p[1] ? 0 : 1;
    // corrupt: flip the chosen feature(s) sign so the XOR label flips
    const cx = clean.x.slice();
    if (cfRef.current === "x1" || cfRef.current === "both") cx[0] = -cx[0];
    if (cfRef.current === "x2" || cfRef.current === "both") cx[1] = -cx[1];
    const corrF = forward(net, cx, null);
    const margin = f => f.zo[cleanClass] - f.zo[1 - cleanClass];
    const mClean = margin(cleanF), mCorr = margin(corrF), denom = (mClean - mCorr) || 1e-6;
    // patch each neuron: clean activation into corrupted run
    const effects = [[], []];
    for (const L of [1, 2]) {
      const cleanAct = L === 1 ? cleanF.h1 : cleanF.h2;
      for (let j = 0; j < NH; j++) { const fp = forward(net, cx, { L, idx: j, val: cleanAct[j] }); effects[L - 1].push((margin(fp) - mCorr) / denom); }
    }
    exRef.current = { clean: clean.x, corrupt: cx, cleanClass, effects, pClean: cleanF.p, pCorrupt: corrF.p };
    setTick(v => v + 1); draw();
  }

  function reset() {
    rngRef.current = mulberry32(Math.floor(Math.random() * 1e6));
    dataRef.current = makeData(rngRef.current); trainedRef.current = false;
    train(); pickExample();
  }

  function draw() {
    const cv = canvasRef.current; if (!cv || !exRef.current) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const ex = exRef.current;
    // patching heatmap (2 layers x NH neurons)
    const gx = 30, gy = 56, cell = 44, gapY = 16;
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px JetBrains Mono, monospace"; ctx.textAlign = "left";
    ctx.fillText("CAUSAL EFFECT OF PATCHING EACH NEURON (clean -> corrupted)", gx, 30);
    const col = e => { if (e < 0) return "rgba(248,113,113," + Math.min(0.6, -e) + ")"; const t = Math.max(0, Math.min(1, e)); return `rgb(20,${Math.round(40 + t * 170)},${Math.round(60 + t * 80)})`; };
    let topL = 0, topJ = 0, topV = -Infinity;
    for (let L = 0; L < 2; L++) for (let j = 0; j < NH; j++) {
      const x = gx + j * (cell + 4), y = gy + L * (cell + gapY), e = ex.effects[L][j];
      if (e > topV) { topV = e; topL = L; topJ = j; }
      ctx.fillStyle = col(e); ctx.fillRect(x, y, cell, cell);
      ctx.strokeStyle = "rgba(255,255,255,0.1)"; ctx.strokeRect(x, y, cell, cell);
      ctx.fillStyle = e > 0.45 ? "#0a0e1a" : "rgba(255,255,255,0.75)"; ctx.font = "10px JetBrains Mono"; ctx.textAlign = "center";
      ctx.fillText((e * 100).toFixed(0), x + cell / 2, y + cell / 2 + 4);
    }
    ctx.textAlign = "left"; ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.font = "10px JetBrains Mono";
    ctx.fillText("LAYER 1", gx + NH * (cell + 4) + 6, gy + cell / 2 + 4);
    ctx.fillText("LAYER 2", gx + NH * (cell + 4) + 6, gy + cell + gapY + cell / 2 + 4);
    // highlight top neuron
    const hx = gx + topJ * (cell + 4), hy = gy + topL * (cell + gapY);
    ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2.5; ctx.strokeRect(hx - 1, hy - 1, cell + 2, cell + 2);
    // clean vs corrupt summary
    const by = gy + 2 * cell + gapY + 34;
    ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.font = "11px JetBrains Mono"; ctx.textAlign = "left";
    ctx.fillText(`CLEAN input -> class ${ex.cleanClass}  (p=${Math.max(...ex.pClean).toFixed(2)})`, gx, by);
    ctx.fillStyle = "#f87171";
    ctx.fillText(`CORRUPTED -> class ${ex.pCorrupt[0] >= ex.pCorrupt[1] ? 0 : 1}  (clean-class p=${ex.pCorrupt[ex.cleanClass].toFixed(2)})`, gx, by + 18);
    ctx.fillStyle = "#fbbf24";
    ctx.fillText(`Most causal: Layer ${topL + 1}, neuron ${topJ}  (restores ${(topV * 100).toFixed(0)}%)`, gx, by + 36);
    ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "9px JetBrains Mono";
    ctx.fillText("100 = patching this one neuron fully restores the clean answer; 0 = no effect", gx, by + 56);
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    reset();
  }, []);

  const ex = exRef.current;
  const stage = (<canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />);

  const controls = (
    <ControlGroup>
      <SegmentedControl label="// CORRUPT FEATURE" value={corruptFeat} onChange={setCorruptFeat}
        options={[{ value: "x1", label: "x1" }, { value: "x2", label: "x2" }, { value: "both", label: "Both" }]}
        help="Which input feature to flip to build the corrupted run. The task is XOR-like, so flipping either feature flips the correct class - and patching reveals which neurons carry that feature's signal." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={pickExample} primary>NEW EXAMPLE</DemoButton>
        <DemoButton onClick={reset}>RETRAIN NET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="CLEAN CLASS" value={ex ? ex.cleanClass : "-"} accent="#34d399" />
        <StatReadout label="CORRUPT p(clean)" value={ex ? ex.pCorrupt[ex.cleanClass].toFixed(2) : "-"} accent="#f87171" />
      </div>
      <Legend items={[
        { color: "#34d399", label: "high causal effect" },
        { color: "#1e3a5f", label: "low effect" },
        { color: "#f87171", label: "negative (hurts)" },
        { color: "#fbbf24", label: "most causal neuron" },
      ]} />
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>Each cell = % of the clean answer restored by patching that one neuron.</div>
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Probing tells you information is <i>present</i> in a layer; <b>activation patching</b> tells
        you the network actually <b>uses</b> it. The recipe: run a <b>clean</b> input and a
        <b> corrupted</b> one (here we flip a feature so the answer flips), then copy a single
        hidden neuron's activation from the clean run into the corrupted run and see how much the
        clean answer comes back. A neuron that <b>restores the answer</b> when patched is causally
        on the path; one that does nothing isn't.
      </DemoP>
      <DemoP>
        The heatmap scores every neuron this way — bright green cells are the components the model
        relies on to carry the flipped feature, the dim cells are bystanders, and the gold box marks
        the single most causal neuron. Switch which feature you corrupt and a <i>different</i> set of
        neurons lights up: you've localized where each piece of information lives. This is exactly the
        method (scaled to layers and token positions) behind causal tracing of facts in real LLMs.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Activation patching (a.k.a. causal tracing or interchange intervention) is the backbone of
        circuit-level <b>mechanistic interpretability</b>: it's how researchers found where GPT-style
        models store facts (ROME/causal tracing), identified induction heads and the indirect-object-
        identification circuit, and now localize and edit behaviors in production models. Unlike a
        <a href={`${window.__DM_BASE || "../../"}visualize/probing-classifier/`}> probe</a> or a
        <a href={`${window.__DM_BASE || "../../"}visualize/saliency/`}> saliency</a> map, it makes a
        <b> causal</b> claim because it intervenes rather than just correlates.
      </DemoP>
      <DemoP>
        The honest subtleties are an active research area: results depend on your corruption (a bad
        baseline gives misleading effects), patching one component at a time can miss distributed or
        redundant circuits, and self-repair means ablating a component sometimes does less than
        expected because others compensate. Still, "change one thing and measure the effect" is the
        cleanest available evidence that a specific part of a network does a specific job — the same
        interventional logic as <a href={`${window.__DM_BASE || "../../"}visualize/do-intervention/`}>causal
        inference</a>, applied to a model's own internals.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      topic="INTERPRETABILITY"
      title="Activation Patching (Causal Tracing)"
      subtitle="Copy one neuron from a clean run into a corrupted run and watch which components actually carry the answer."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/neural-nets/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="violet"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ActivationPatchingDemo />);
