// demos/superposition.jsx — Anthropic's toy model of superposition. A linear
// model with more features (F) than dimensions (D=2) is trained to reconstruct
// sparse inputs weighted by feature importance. As sparsity rises the model
// packs MORE features than it has dimensions by tolerating interference -
// important features get near-orthogonal directions, others share or are
// dropped. Real tied-weight gradient descent on the toy objective; the emergent
// W geometry (antipodal pairs, polygons) and the W^T W interference matrix are
// exactly the Anthropic result. The phenomenon that sparse autoencoders undo.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 380, D = 2;

function ImportanceColor(t) { // t in [0,1] high=bright
  const r = Math.round(80 + t * 120), g = Math.round(60 + t * 80), b = Math.round(160 + t * 87);
  return `rgb(${r},${g},${b})`;
}

function SuperpositionDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const Wref = _useRef([]);  // D x F
  const bref = _useRef([]);  // F
  const impRef = _useRef([]); // F importance
  const metricRef = _useRef({ represented: 0, off: 0 });
  const rafRef = _useRef(null);

  const [F, setF] = _useState(6);
  const [sparsity, setSparsity] = _useState(0.7);
  const [decay, setDecay] = _useState(0.7);
  const [running, setRunning] = _useState(false);
  const [step, setStep] = _useState(0);
  const [, setTick] = _useState(0);

  const Fref = _useRef(F), spRef = _useRef(sparsity), decRef = _useRef(decay);
  _useEffect(() => { spRef.current = sparsity; }, [sparsity]);
  _useEffect(() => { decRef.current = decay; reinit(); }, [decay]);

  function reinit() {
    const f = Fref.current;
    Wref.current = Array.from({ length: D }, () => Array.from({ length: f }, () => (Math.random() - 0.5) * 0.4));
    bref.current = new Array(f).fill(0);
    impRef.current = Array.from({ length: f }, (_, i) => Math.pow(decRef.current, i));
    setStep(0); setTick(v => v + 1); draw();
  }

  function sampleX() {
    const f = Fref.current, s = spRef.current, x = new Array(f).fill(0);
    for (let i = 0; i < f; i++) if (Math.random() > s) x[i] = Math.random();
    return x;
  }

  function trainStep() {
    const Wm = Wref.current, b = bref.current, imp = impRef.current, f = Fref.current, lr = 0.05, B = 24;
    const gW = Array.from({ length: D }, () => new Array(f).fill(0)), gb = new Array(f).fill(0);
    for (let n = 0; n < B; n++) {
      const x = sampleX();
      // h = W x  (D)
      const h = new Array(D).fill(0); for (let d = 0; d < D; d++) for (let i = 0; i < f; i++) h[d] += Wm[d][i] * x[i];
      // r = W^T h + b ; xhat = ReLU(r)
      const r = new Array(f), xhat = new Array(f);
      for (let i = 0; i < f; i++) { let v = b[i]; for (let d = 0; d < D; d++) v += Wm[d][i] * h[d]; r[i] = v; xhat[i] = v > 0 ? v : 0; }
      // dL/dr
      const e = new Array(f); for (let i = 0; i < f; i++) e[i] = (r[i] > 0 ? 1 : 0) * 2 * imp[i] * (xhat[i] - x[i]);
      // gb
      for (let i = 0; i < f; i++) gb[i] += e[i];
      // dh = W e
      const dh = new Array(D).fill(0); for (let d = 0; d < D; d++) for (let i = 0; i < f; i++) dh[d] += Wm[d][i] * e[i];
      // gW = e_i h_d (decoder path) + dh_d x_i (encoder path)
      for (let d = 0; d < D; d++) for (let i = 0; i < f; i++) gW[d][i] += e[i] * h[d] + dh[d] * x[i];
    }
    const s = lr / B;
    for (let d = 0; d < D; d++) for (let i = 0; i < f; i++) Wm[d][i] -= s * gW[d][i];
    for (let i = 0; i < f; i++) b[i] -= s * gb[i];
    setStep(v => v + 1);
  }

  function colNorm(i) { const Wm = Wref.current; return Math.hypot(Wm[0][i], Wm[1][i]); }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const Wm = Wref.current, imp = impRef.current, f = Fref.current;
    // left: 2D feature-vector plot
    const cx = 150, cy = 200, sc = 110;
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px JetBrains Mono, monospace"; ctx.textAlign = "left";
    ctx.fillText("FEATURE DIRECTIONS (columns of W)", 20, 24);
    ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, sc, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - sc - 12, cy); ctx.lineTo(cx + sc + 12, cy); ctx.moveTo(cx, cy - sc - 12); ctx.lineTo(cx, cy + sc + 12); ctx.stroke();
    let represented = 0;
    for (let i = 0; i < f; i++) {
      const nrm = colNorm(i); if (nrm > 0.3) represented++;
      const ex = cx + Wm[0][i] * sc, ey = cy - Wm[1][i] * sc;
      const t = imp[i] / (imp[0] || 1);
      ctx.strokeStyle = ImportanceColor(t); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.fillStyle = ImportanceColor(t); ctx.beginPath(); ctx.arc(ex, ey, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.font = "9px JetBrains Mono"; ctx.fillText(String(i), ex + 5, ey);
    }
    // right: W^T W interference matrix
    const gx = 330, gy = 60, cell = Math.min(28, 170 / f);
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px JetBrains Mono"; ctx.fillText("INTERFERENCE  W^T W", gx, 44);
    for (let i = 0; i < f; i++) for (let j = 0; j < f; j++) {
      let v = 0; for (let d = 0; d < D; d++) v += Wm[d][i] * Wm[d][j];
      const x = gx + j * cell, y = gy + i * cell;
      if (i === j) { const t = Math.min(1, v); ctx.fillStyle = `rgb(${Math.round(20)},${Math.round(40 + t * 170)},${Math.round(60 + t * 80)})`; }
      else { const a = Math.min(0.85, Math.abs(v) * 2.2); ctx.fillStyle = v >= 0 ? `rgba(251,191,36,${a})` : `rgba(96,165,250,${a})`; }
      ctx.fillRect(x, y, cell - 1, cell - 1);
    }
    ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.font = "9px JetBrains Mono";
    ctx.fillText("diagonal = how strongly a feature is stored", gx, gy + f * cell + 16);
    ctx.fillText("off-diagonal = interference between features", gx, gy + f * cell + 30);
    // metric: avg off-diagonal interference
    let off = 0, cnt = 0; for (let i = 0; i < f; i++) for (let j = 0; j < f; j++) if (i !== j) { let v = 0; for (let d = 0; d < D; d++) v += Wm[d][i] * Wm[d][j]; off += Math.abs(v); cnt++; }
    metricRef.current = { represented, off: cnt ? off / cnt : 0 };
  }

  function handleRun() { if (running) { setRunning(false); return; } setRunning(true); }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    reinit();
  }, []);
  _useEffect(() => { Fref.current = F; reinit(); }, [F]);

  _useEffect(() => {
    if (!running) return;
    let alive = true;
    const loop = () => { if (!alive) return; for (let i = 0; i < 6; i++) trainStep(); setTick(v => v + 1); draw(); rafRef.current = requestAnimationFrame(loop); };
    rafRef.current = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, [running]);

  const metric = metricRef.current;
  const stage = (<canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />);

  const controls = (
    <ControlGroup>
      <Slider label="// FEATURES (F)" min={3} max={9} step={1} value={F} onChange={setF}
        help="How many true features the data has. With F greater than the 2 storage dimensions, the model cannot give every feature its own orthogonal direction - it must choose what to superpose." />
      <Slider label="// SPARSITY" min={0} max={0.95} step={0.05} value={sparsity} onChange={setSparsity}
        help="Probability each feature is OFF in a given input. Sparse data is the key enabler: when features rarely co-occur, the model can pack many into few dimensions because interference rarely bites. Low sparsity forces it to drop features." />
      <Slider label="// IMPORTANCE DECAY" min={0.3} max={0.95} step={0.05} value={decay} onChange={setDecay}
        help="How fast feature importance falls off (feature i has importance decay^i). The model spends its limited dimensions on the most important features first; unimportant ones collide or are dropped." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={handleRun} primary>{running ? "PAUSE" : "TRAIN"}</DemoButton>
        <DemoButton onClick={() => { for (let i = 0; i < 30; i++) trainStep(); setTick(v => v + 1); draw(); }} disabled={running}>+30 STEPS</DemoButton>
        <DemoButton onClick={reinit}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="TRAIN STEPS" value={step} />
        <StatReadout label="FEATURES STORED" value={`${metric.represented} / ${F}`} accent="var(--violet-lt)" />
      </div>
      <StatReadout label="AVG INTERFERENCE" value={metric.off.toFixed(3)} accent={metric.off > 0.15 ? "#fbbf24" : "#34d399"} />
      <Legend items={[
        { color: "#c8a0f0", label: "feature (brighter = important)" },
        { color: "#fbbf24", label: "positive interference" },
        { color: "#60a5fa", label: "negative interference" },
      ]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        How does a network store thousands of concepts in only a few hundred dimensions? This is
        the toy model that answered it. A linear model is asked to reconstruct sparse inputs through
        a 2-D bottleneck, weighted by each feature's importance. With enough features it <i>can't</i>
        give each one its own axis — so it learns a geometry (the arrows) that packs them in.
      </DemoP>
      <DemoP>
        Turn <b>sparsity</b> up and watch the magic: because features rarely fire together, the model
        crams in <b>more features than dimensions</b> — <b>superposition</b> — arranging them as
        antipodal pairs and regular polygons that minimize interference (the W·W heatmap's off-diagonal).
        Drop sparsity and interference becomes unaffordable, so it keeps only the most important
        features orthogonal and discards the rest. This packing is exactly why individual neurons are
        polysemantic — and exactly what a <a href={`${window.__DM_BASE || "../../"}visualize/sparse-autoencoder/`}>sparse
        autoencoder</a> is built to undo.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Superposition reframed interpretability: if features don't align with neurons, you can't read a
        model off its neurons one at a time. Anthropic's toy model (reproduced here) showed the effect is
        real and predictable — driven by sparsity and importance — and it's why the field pivoted to
        <a href={`${window.__DM_BASE || "../../"}visualize/sparse-autoencoder/`}> dictionary learning</a> to
        recover the underlying features, and why <a href={`${window.__DM_BASE || "../../"}visualize/probing-classifier/`}>probes</a>
        and <a href={`${window.__DM_BASE || "../../"}visualize/activation-patching/`}>patching</a> have to reckon
        with distributed representations.
      </DemoP>
      <DemoP>
        The practical upshot reaches past interpretability: superposition is closely tied to why models can
        be compressed (quantized, pruned) without falling apart, and to the geometry of embedding spaces in
        general. The honest scope note is that this is a <i>toy</i> — real models add nonlinearity, attention,
        and far higher dimension — but the core mechanism it isolates (sparse features sharing a cramped space,
        traded off by importance) is one of the most load-bearing ideas in modern mechanistic interpretability.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      topic="INTERPRETABILITY"
      title="Toy Model of Superposition"
      subtitle="Watch a network pack more features than it has dimensions - the reason neurons are polysemantic."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/neural-nets/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="violet"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<SuperpositionDemo />);
