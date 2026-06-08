// demos/sparse-autoencoder.jsx — recover monosemantic features from superposition.
// Synthetic activations are sparse combinations of G hidden "true" feature
// directions packed into a low-dim space (superposition: more features than
// dimensions, so the raw neurons are polysemantic). A real sparse autoencoder
// (ReLU encoder + L1 sparsity + unit-norm decoder dictionary, manual backprop
// SGD) learns a dictionary whose atoms snap onto the true feature directions.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 380, D = 2; // 2-D activation space so we can see it

function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const FEAT_COL = ["#60a5fa", "#a855f7", "#34d399", "#fbbf24", "#f472b6", "#22d3ee", "#fb923c"];

function SparseAutoencoderDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rngRef = _useRef(mulberry32(5));
  const trueDirsRef = _useRef([]);     // G unit directions in 2D
  const WeRef = _useRef([]);           // H x D
  const beRef = _useRef([]);           // H
  const WdRef = _useRef([]);           // D x H (unit-norm columns)
  const batchRef = _useRef([]);        // recent samples for display {x:[2], feat}
  const metricsRef = _useRef({ recovery: 0, mse: 0, l0: 0 });
  const rafRef = _useRef(null);

  const [seed, setSeed] = _useState(5);
  const [G, setG] = _useState(5);
  const [Hdict, setHdict] = _useState(8);
  const [lam, setLam] = _useState(0.1);
  const [lr, setLr] = _useState(0.05);
  const [running, setRunning] = _useState(false);
  const [step, setStep] = _useState(0);
  const [, setTick] = _useState(0);

  const GRef = _useRef(G), HRef = _useRef(Hdict), lamRef = _useRef(lam), lrRef = _useRef(lr);
  _useEffect(() => { lamRef.current = lam; }, [lam]);
  _useEffect(() => { lrRef.current = lr; }, [lr]);

  function init() {
    const rng = rngRef.current;
    const g = GRef.current, h = HRef.current;
    // true feature directions: spread around the circle with slight jitter
    trueDirsRef.current = Array.from({ length: g }, (_, i) => { const a = (i / g) * Math.PI * 2 + (rng() - 0.5) * 0.25; return [Math.cos(a), Math.sin(a)]; });
    WeRef.current = Array.from({ length: h }, () => Array.from({ length: D }, () => (rng() - 0.5) * 0.6));
    beRef.current = Array.from({ length: h }, () => 0);
    WdRef.current = Array.from({ length: D }, () => Array.from({ length: h }, () => (rng() - 0.5) * 0.6));
    normalizeDecoder();
    batchRef.current = []; metricsRef.current = { recovery: 0, mse: 0, l0: 0 };
    setStep(0); setTick(v => v + 1); draw();
  }
  function normalizeDecoder() {
    const Wd = WdRef.current, h = HRef.current;
    for (let j = 0; j < h; j++) { let n = 0; for (let i = 0; i < D; i++) n += Wd[i][j] * Wd[i][j]; n = Math.sqrt(n) || 1e-9; for (let i = 0; i < D; i++) Wd[i][j] /= n; }
  }

  function sample() {
    const rng = rngRef.current, dirs = trueDirsRef.current, g = GRef.current;
    // sparse: 1 dominant feature (+ occasionally a second), positive magnitudes
    const f0 = Math.floor(rng() * g); const x = [0, 0];
    const m0 = 0.7 + rng() * 1.5; x[0] += m0 * dirs[f0][0]; x[1] += m0 * dirs[f0][1];
    if (rng() < 0.3) { const f1 = Math.floor(rng() * g); const m1 = 0.4 + rng() * 0.8; x[0] += m1 * dirs[f1][0]; x[1] += m1 * dirs[f1][1]; }
    x[0] += (rng() - 0.5) * 0.12; x[1] += (rng() - 0.5) * 0.12;
    return { x, feat: f0 };
  }

  function trainStep() {
    const We = WeRef.current, be = beRef.current, Wd = WdRef.current, h = HRef.current, lam = lamRef.current, lr = lrRef.current;
    const B = 16; let mseAcc = 0, l0Acc = 0;
    // accumulate grads
    const gWe = Array.from({ length: h }, () => [0, 0]), gbe = new Array(h).fill(0), gWd = Array.from({ length: D }, () => new Array(h).fill(0));
    const batch = [];
    for (let b = 0; b < B; b++) {
      const s = sample(); batch.push(s); const x = s.x;
      // encode
      const pre = new Array(h), hid = new Array(h);
      for (let j = 0; j < h; j++) { let p = be[j]; for (let i = 0; i < D; i++) p += We[j][i] * x[i]; pre[j] = p; hid[j] = p > 0 ? p : 0; if (hid[j] > 1e-4) l0Acc++; }
      // decode
      const rec = [0, 0]; for (let i = 0; i < D; i++) { let r = 0; for (let j = 0; j < h; j++) r += Wd[i][j] * hid[j]; rec[i] = r; }
      const e = [rec[0] - x[0], rec[1] - x[1]]; mseAcc += e[0] * e[0] + e[1] * e[1];
      // grads
      for (let i = 0; i < D; i++) for (let j = 0; j < h; j++) gWd[i][j] += e[i] * hid[j];
      for (let j = 0; j < h; j++) {
        let dh = 0; for (let i = 0; i < D; i++) dh += Wd[i][j] * e[i];
        dh += (hid[j] > 1e-9 ? lam : 0); // L1 subgradient on active units
        const dpre = pre[j] > 0 ? dh : 0;
        gbe[j] += dpre; for (let i = 0; i < D; i++) gWe[j][i] += dpre * x[i];
      }
    }
    const inv = 1 / B;
    for (let j = 0; j < h; j++) { be[j] -= lr * gbe[j] * inv; for (let i = 0; i < D; i++) { We[j][i] -= lr * gWe[j][i] * inv; Wd[i][j] -= lr * gWd[i][j] * inv; } }
    normalizeDecoder();
    batchRef.current = batch;
    // metrics: recovery = mean over true features of max |cos| with any atom
    const dirs = trueDirsRef.current, g = GRef.current; let rec = 0;
    for (let f = 0; f < g; f++) { let mx = 0; for (let j = 0; j < h; j++) { const c = Math.abs(dirs[f][0] * Wd[0][j] + dirs[f][1] * Wd[1][j]); if (c > mx) mx = c; } rec += mx; }
    metricsRef.current = { recovery: rec / g, mse: mseAcc * inv, l0: l0Acc / B };
    setStep(v => v + 1);
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2 - 6, sc = 64;
    const mapX = x => cx + x * sc, mapY = y => cy - y * sc;
    // axes
    ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();
    // true feature directions (faint spokes)
    const dirs = trueDirsRef.current;
    dirs.forEach((d, i) => { ctx.strokeStyle = FEAT_COL[i % FEAT_COL.length] + "55"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(mapX(d[0] * 2.6), mapY(d[1] * 2.6)); ctx.stroke(); ctx.setLineDash([]); });
    // sample points colored by dominant true feature
    batchRef.current.forEach(s => { ctx.fillStyle = FEAT_COL[s.feat % FEAT_COL.length] + "cc"; ctx.beginPath(); ctx.arc(mapX(s.x[0]), mapY(s.x[1]), 2.6, 0, Math.PI * 2); ctx.fill(); });
    // learned dictionary atoms (decoder columns) as arrows
    const Wd = WdRef.current, h = HRef.current;
    for (let j = 0; j < h; j++) {
      const ax = Wd[0][j], ay = Wd[1][j]; const ex = mapX(ax * 2.6), ey = mapY(ay * 2.6);
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
      const ang = Math.atan2(ey - cy, ex - cx);
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - 7 * Math.cos(ang - 0.4), ey - 7 * Math.sin(ang - 0.4)); ctx.lineTo(ex - 7 * Math.cos(ang + 0.4), ey - 7 * Math.sin(ang + 0.4)); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px JetBrains Mono, monospace"; ctx.textAlign = "left";
    ctx.fillText("ACTIVATION SPACE - colored dashes = true features, white arrows = learned dictionary", 10, 16);
  }

  function handleRun() { if (running) { setRunning(false); return; } setRunning(true); }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    init();
  }, []);
  _useEffect(() => { GRef.current = G; HRef.current = Hdict; rngRef.current = mulberry32(seed); setRunning(false); init(); }, [G, Hdict, seed]);

  _useEffect(() => {
    if (!running) return;
    let alive = true;
    const loop = () => { if (!alive) return; for (let i = 0; i < 4; i++) trainStep(); setTick(v => v + 1); draw(); rafRef.current = requestAnimationFrame(loop); };
    rafRef.current = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, [running]);

  const m = metricsRef.current;
  const stage = (<canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />);

  const controls = (
    <ControlGroup>
      <Slider label="// TRUE FEATURES" min={3} max={7} step={1} value={G} onChange={setG}
        help="How many hidden 'concepts' the data really contains. With more features than the 2 activation dimensions, the raw neurons must pack multiple features each - superposition - so no single neuron is one concept." />
      <Slider label="// DICTIONARY SIZE" min={4} max={12} step={1} value={Hdict} onChange={setHdict}
        help="Number of features the autoencoder is allowed to learn (hidden units). Overcomplete (more than the activation dimension) is the point: extra capacity lets each atom specialize to one true feature. Surplus atoms go dead." />
      <Slider label="// L1 SPARSITY lambda" min={0} max={0.4} step={0.01} value={lam} onChange={setLam}
        help="Penalty on how many dictionary features fire per input. Higher = sparser codes, which pushes each atom toward a single monosemantic feature; too high and reconstruction suffers (atoms collapse)." />
      <Slider label="// LEARNING RATE" min={0.01} max={0.15} step={0.01} value={lr} onChange={setLr}
        help="SGD step size for the autoencoder's weights." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={handleRun} primary>{running ? "PAUSE" : "TRAIN"}</DemoButton>
        <DemoButton onClick={() => { for (let i = 0; i < 10; i++) trainStep(); setTick(v => v + 1); draw(); }} disabled={running}>+10 STEPS</DemoButton>
        <DemoButton onClick={init}>RESET</DemoButton>
        <DemoButton onClick={() => { const s = seed + 1; setSeed(s); }}>NEW DATA</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="TRAIN STEPS" value={step} />
        <StatReadout label="FEATURE RECOVERY" value={(m.recovery * 100).toFixed(0) + "%"} accent={m.recovery > 0.95 ? "#34d399" : "#fbbf24"} />
        <StatReadout label="RECON MSE" value={m.mse.toFixed(3)} accent="var(--blue-lt)" />
        <StatReadout label="ACTIVE / INPUT (L0)" value={m.l0.toFixed(2)} accent="var(--violet-lt)" />
      </div>
      <Legend items={[
        { color: "#fff", label: "LEARNED DICTIONARY ATOM" },
        { color: "#60a5fa", label: "TRUE FEATURE DIRECTION" },
        { color: "#a855f7", label: "ACTIVATION SAMPLE" },
      ]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Real networks pack far more concepts into their activations than they have neurons —
        <b> superposition</b> — so a single neuron lights up for several unrelated things
        (it's <i>polysemantic</i>). Here the data is built from {G} hidden feature directions
        crammed into a 2-D activation space, so the two raw axes are hopelessly mixed. A
        <b> sparse autoencoder</b> is trained to reconstruct each activation while keeping its
        hidden code <b>sparse</b> (an L1 penalty), and an overcomplete dictionary plus that
        sparsity pressure forces each learned atom (white arrow) to specialize onto <i>one</i>
        true feature (colored spoke).
      </DemoP>
      <DemoP>
        Hit TRAIN and watch the white arrows rotate until they lock onto the colored spokes —
        <b> feature recovery</b> climbs toward 100%. Turn the <b>L1 λ</b> down and atoms stay
        smeared between features (polysemantic, low sparsity, high L0); turn it up and the code
        gets sparser but reconstruction degrades. Make the dictionary <b>overcomplete</b> and the
        extra atoms simply go dead. This is the core finding that made SAEs the leading tool for
        prying open what's actually inside a model's activations.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Sparse autoencoders are the workhorse of modern <b>mechanistic interpretability</b>:
        Anthropic, DeepMind, and OpenAI train them on the residual streams of real LLMs to extract
        millions of human-interpretable features from otherwise-opaque activations, then use those
        features to steer and audit behavior. The toy you're watching is exactly that pipeline at
        D = 2 — superposition, an overcomplete dictionary, an L1 code, and recovery of the true
        directions. It's <a href={`${window.__DM_BASE || "../../"}visualize/ista/`}>sparse coding</a> /
        dictionary learning applied to a network's own internals.
      </DemoP>
      <DemoP>
        The same tension you tune here is the open research problem at scale: the L1 sparsity that
        buys monosemanticity also distorts reconstruction (driving newer variants — gated, TopK, and
        JumpReLU SAEs), and "feature recovery" is only measurable here because we planted the ground
        truth — in a real model there is none, so evaluating an SAE is itself hard. It sits alongside
        the other <a href={`${window.__DM_BASE || "../../"}visualize/saliency/`}>explainability</a>
        tools as the one that targets <i>features</i> rather than inputs or outputs.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      topic="INTERPRETABILITY"
      title="Sparse Autoencoders (Superposition)"
      subtitle="Pull monosemantic features out of polysemantic neurons - the core tool of mechanistic interpretability."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/neural-nets/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="violet"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<SparseAutoencoderDemo />);
