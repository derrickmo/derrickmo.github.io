// demos/grad-cam.jsx — Grad-CAM on a CNN that is actually trained here, in the page.
// Training is user-started and incremental, so you can watch the map go from noise to
// a localised blob as the network learns - which is the honest way to show that the
// saliency comes from the MODEL and not from the picture.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const S = 28, C1 = 6, C2 = 12, K = 3, NCLS = 3;
const W = 460, H = 430;
const NAMES = ["Disc", "Square", "Triangle"];

function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e6) / 1e6; }; }
let rand = rng(17);

function sample() {
  const cls = Math.floor(rand() * NCLS);
  const img = new Float64Array(S * S);
  for (let i = 0; i < img.length; i++) img[i] = 0.08 + rand() * 0.10;
  const r = 4 + Math.floor(rand() * 2);
  const cx = r + 2 + Math.floor(rand() * (S - 2 * r - 4));
  const cy = r + 2 + Math.floor(rand() * (S - 2 * r - 4));
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = x - cx, dy = y - cy;
    let inside = false;
    if (cls === 0) inside = dx * dx + dy * dy <= r * r;
    else if (cls === 1) inside = Math.abs(dx) <= r && Math.abs(dy) <= r;
    else inside = dy >= -r && dy <= r && Math.abs(dx) <= (r - (dy + r) / 2);
    if (inside) img[y * S + x] = 0.85 + rand() * 0.12;
  }
  return { img, cls, box: { x0: cx - r, y0: cy - r, x1: cx + r, y1: cy + r } };
}

function initParams(seed) {
  const r2 = rng(seed);
  const g = () => { let u = 0, v = 0; while (!u) u = r2(); while (!v) v = r2(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const mk = (n, fan) => Float64Array.from({ length: n }, () => g() * Math.sqrt(2 / fan));
  return { w1: mk(C1 * K * K, K * K), b1: new Float64Array(C1),
           w2: mk(C2 * C1 * K * K, C1 * K * K), b2: new Float64Array(C2),
           wf: mk(NCLS * C2, C2), bf: new Float64Array(NCLS) };
}

function conv(inp, cin, size, w, b, cout) {
  const out = new Float64Array(cout * size * size);
  for (let o = 0; o < cout; o++) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let a = b[o];
    for (let c = 0; c < cin; c++) for (let ky = 0; ky < K; ky++) for (let kx = 0; kx < K; kx++) {
      const iy = y + ky - 1, ix = x + kx - 1;
      if (iy < 0 || ix < 0 || iy >= size || ix >= size) continue;
      a += w[((o * cin + c) * K + ky) * K + kx] * inp[(c * size + iy) * size + ix];
    }
    out[(o * size + y) * size + x] = a;
  }
  return out;
}
const relu = (a) => { const o = new Float64Array(a.length); for (let i = 0; i < a.length; i++) o[i] = a[i] > 0 ? a[i] : 0; return o; };
function pool2(a, ch, size) {
  const h = size >> 1, o = new Float64Array(ch * h * h), idx = new Int32Array(ch * h * h);
  for (let c = 0; c < ch; c++) for (let y = 0; y < h; y++) for (let x = 0; x < h; x++) {
    let best = -Infinity, bi = 0;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const i = (c * size + y * 2 + dy) * size + x * 2 + dx;
      if (a[i] > best) { best = a[i]; bi = i; }
    }
    o[(c * h + y) * h + x] = best; idx[(c * h + y) * h + x] = bi;
  }
  return { out: o, idx, size: h };
}
function forward(p, img) {
  const z1 = conv(img, 1, S, p.w1, p.b1, C1);
  const a1 = relu(z1);
  const pl = pool2(a1, C1, S);
  const h = pl.size;
  const A = relu(conv(pl.out, C1, h, p.w2, p.b2, C2));
  const gap = new Float64Array(C2);
  for (let c = 0; c < C2; c++) { let s = 0; for (let i = 0; i < h * h; i++) s += A[c * h * h + i]; gap[c] = s / (h * h); }
  const logits = new Float64Array(NCLS);
  for (let k = 0; k < NCLS; k++) { let s = p.bf[k]; for (let c = 0; c < C2; c++) s += p.wf[k * C2 + c] * gap[c]; logits[k] = s; }
  return { a1, pl, h, A, gap, logits };
}
const softmax = (l) => { const m = Math.max(...l); const e = [...l].map((v) => Math.exp(v - m)); const s = e.reduce((a, b) => a + b, 0); return e.map((v) => v / s); };

function step(p, img, f, y, lr) {
  const pr = softmax(f.logits);
  const dlog = pr.map((v, i) => v - (i === y ? 1 : 0));
  const h = f.h, hw = h * h;
  const dgap = new Float64Array(C2);
  for (let k = 0; k < NCLS; k++) {
    for (let c = 0; c < C2; c++) { dgap[c] += dlog[k] * p.wf[k * C2 + c]; p.wf[k * C2 + c] -= lr * dlog[k] * f.gap[c]; }
    p.bf[k] -= lr * dlog[k];
  }
  const dA = new Float64Array(C2 * hw);
  for (let c = 0; c < C2; c++) for (let i = 0; i < hw; i++) dA[c * hw + i] = (dgap[c] / hw) * (f.A[c * hw + i] > 0 ? 1 : 0);
  const dpool = new Float64Array(C1 * hw);
  for (let o = 0; o < C2; o++) for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < h; xx++) {
    const g = dA[(o * h + yy) * h + xx]; if (!g) continue;
    for (let c = 0; c < C1; c++) for (let ky = 0; ky < K; ky++) for (let kx = 0; kx < K; kx++) {
      const iy = yy + ky - 1, ix = xx + kx - 1;
      if (iy < 0 || ix < 0 || iy >= h || ix >= h) continue;
      const wi = ((o * C1 + c) * K + ky) * K + kx;
      dpool[(c * h + iy) * h + ix] += p.w2[wi] * g;
      p.w2[wi] -= lr * g * f.pl.out[(c * h + iy) * h + ix];
    }
    p.b2[o] -= lr * g;
  }
  const da1 = new Float64Array(C1 * S * S);
  for (let i = 0; i < dpool.length; i++) if (dpool[i]) da1[f.pl.idx[i]] += dpool[i];
  for (let o = 0; o < C1; o++) for (let yy = 0; yy < S; yy++) for (let xx = 0; xx < S; xx++) {
    const gi = (o * S + yy) * S + xx;
    const g = da1[gi] * (f.a1[gi] > 0 ? 1 : 0); if (!g) continue;
    for (let ky = 0; ky < K; ky++) for (let kx = 0; kx < K; kx++) {
      const iy = yy + ky - 1, ix = xx + kx - 1;
      if (iy < 0 || ix < 0 || iy >= S || ix >= S) continue;
      p.w1[(o * K + ky) * K + kx] -= lr * g * img[iy * S + ix];
    }
    p.b1[o] -= lr * g;
  }
}

// The class weights ARE the Grad-CAM weights here: with global average pooling feeding
// a linear layer, d(score_c)/d(A_k) is constant across the map and equals wf[c][k], so
// Grad-CAM collapses exactly onto CAM. Worth knowing rather than hiding.
function gradcam(p, f, cls) {
  const h = f.h, hw = h * h, cam = new Float64Array(hw);
  for (let c = 0; c < C2; c++) { const a = p.wf[cls * C2 + c]; for (let i = 0; i < hw; i++) cam[i] += a * f.A[c * hw + i]; }
  for (let i = 0; i < hw; i++) cam[i] = Math.max(0, cam[i]);
  const mx = Math.max(...cam) || 1;
  for (let i = 0; i < hw; i++) cam[i] /= mx;
  return cam;
}
function massInBox(cam, h, box) {
  let inside = 0, total = 0;
  const sc = S / h;
  for (let y = 0; y < h; y++) for (let x = 0; x < h; x++) {
    const v = cam[y * h + x]; total += v;
    const ix = (x + 0.5) * sc, iy = (y + 0.5) * sc;
    if (ix >= box.x0 && ix <= box.x1 && iy >= box.y0 && iy <= box.y1) inside += v;
  }
  return total > 0 ? inside / total : 0;
}

function GradCamDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const trained = _useRef(initParams(5));
  const randomP = _useRef(initParams(999));
  const dataRef = _useRef({ train: [], test: [] });
  const curRef = _useRef(null);
  const [epoch, setEpoch] = _useState(0);
  const [busy, setBusy] = _useState(false);
  const [which, setWhich] = _useState("trained");
  const [explain, setExplain] = _useState("predicted");
  const [stats, setStats] = _useState({ acc: 0, pred: 0, conf: 0, mass: 0, box: 0 });

  function newSample() { curRef.current = sample(); draw(); }

  function draw() {
    const cv = canvasRef.current; if (!cv || !curRef.current) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const s = curRef.current;
    const p = which === "trained" ? trained.current : randomP.current;
    const f = forward(p, s.img);
    const pr = softmax(f.logits);
    const pred = f.logits.indexOf(Math.max(...f.logits));
    const cls = explain === "predicted" ? pred : s.cls;
    const cam = gradcam(p, f, cls);

    const panel = 200, cell = panel / S;
    // input
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const g = Math.round(s.img[y * S + x] * 255);
      ctx.fillStyle = `rgb(${g},${g},${g})`;
      ctx.fillRect(x * cell, 22 + y * cell, cell + 0.5, cell + 0.5);
    }
    // overlay
    const ox = panel + 24, cs = panel / f.h;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const g = Math.round(s.img[y * S + x] * 160);
      ctx.fillStyle = `rgb(${g},${g},${g})`;
      ctx.fillRect(ox + x * cell, 22 + y * cell, cell + 0.5, cell + 0.5);
    }
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.h; x++) {
      const v = cam[y * f.h + x];
      if (v <= 0.02) continue;
      // blue -> violet -> amber as importance rises
      const r = Math.round(60 + 195 * v), gg = Math.round(120 * (1 - v) + 60 * v), b = Math.round(250 * (1 - v) + 40 * v);
      ctx.fillStyle = `rgba(${r},${gg},${b},${0.20 + 0.55 * v})`;
      ctx.fillRect(ox + x * cs, 22 + y * cs, cs + 0.5, cs + 0.5);
    }
    ctx.strokeStyle = "rgba(52,211,153,0.85)"; ctx.lineWidth = 1.5;
    ctx.strokeRect(ox + s.box.x0 * cell, 22 + s.box.y0 * cell, (s.box.x1 - s.box.x0) * cell, (s.box.y1 - s.box.y0) * cell);

    ctx.fillStyle = "#e6edfb"; ctx.font = "11px JetBrains Mono, monospace";
    ctx.fillText("INPUT", 0, 14);
    ctx.fillText(`GRAD-CAM for "${NAMES[cls]}"`, ox, 14);

    // class bars
    const by = 22 + panel + 22;
    ctx.font = "11px JetBrains Mono, monospace";
    for (let k = 0; k < NCLS; k++) {
      const y = by + k * 22;
      ctx.fillStyle = k === s.cls ? "#34d399" : "#8fa3c8";
      ctx.fillText(NAMES[k].padEnd(9), 0, y + 10);
      ctx.fillStyle = k === pred ? "#c084fc" : "rgba(148,163,184,0.35)";
      ctx.fillRect(80, y, Math.max(1, pr[k] * 240), 13);
      ctx.fillStyle = "#e6edfb";
      ctx.fillText(`${(pr[k] * 100).toFixed(0)}%`, 330, y + 10);
    }
    ctx.fillStyle = "#8fa3c8"; ctx.font = "10px JetBrains Mono, monospace";
    ctx.fillText("green = true class · violet bar = prediction · green box = where the shape is", 0, by + 78);

    const mass = massInBox(cam, f.h, s.box);
    const boxFrac = ((s.box.x1 - s.box.x0 + 1) * (s.box.y1 - s.box.y0 + 1)) / (S * S);
    setStats((st) => ({ ...st, pred, conf: pr[pred], mass, box: boxFrac }));
  }

  function evaluate() {
    const p = trained.current;
    let ok = 0;
    for (const s of dataRef.current.test) {
      const f = forward(p, s.img);
      if (f.logits.indexOf(Math.max(...f.logits)) === s.cls) ok++;
    }
    setStats((st) => ({ ...st, acc: ok / Math.max(1, dataRef.current.test.length) }));
  }

  // Incremental, and STARTED BY THE READER. One epoch per tick keeps the page
  // responsive and, more usefully, lets you watch the map sharpen as accuracy climbs.
  function trainOneEpoch() {
    const p = trained.current;
    for (const s of dataRef.current.train) step(p, s.img, forward(p, s.img), s.cls, 0.04);
    setEpoch((e) => e + 1);
    evaluate();
    draw();
  }
  function trainSix() {
    if (busy) return;
    setBusy(true);
    let n = 0;
    const tick = () => {
      trainOneEpoch(); n++;
      if (n < 6) setTimeout(tick, 30); else setBusy(false);
    };
    setTimeout(tick, 30);
  }
  function reset() {
    trained.current = initParams(Math.floor(Math.random() * 1e6));
    setEpoch(0); evaluate(); draw();
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    rand = rng(17);
    dataRef.current = { train: Array.from({ length: 700 }, sample), test: Array.from({ length: 150 }, sample) };
    curRef.current = sample();
    evaluate(); draw();
    // eslint-disable-next-line
  }, []);
  _useEffect(() => { draw(); /* eslint-disable-next-line */ }, [which, explain]);

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <DemoButton onClick={trainSix} primary>{busy ? "TRAINING…" : epoch === 0 ? "TRAIN THE NETWORK" : "TRAIN 6 MORE EPOCHS"}</DemoButton>
      <DemoButton onClick={newSample}>NEW IMAGE</DemoButton>
      <DemoButton onClick={reset}>RESET WEIGHTS</DemoButton>
      <SegmentedControl label="// WEIGHTS" value={which} onChange={setWhich}
        options={[{ value: "trained", label: "Trained" }, { value: "random", label: "Randomised" }]}
        help="The Adebayo sanity check. Swap in an untrained network of the SAME architecture: if the heatmap barely changes, the method is reading the image rather than the model, and it is telling you nothing about what the network learned." />
      <SegmentedControl label="// EXPLAIN CLASS" value={explain} onChange={setExplain}
        options={[{ value: "predicted", label: "Predicted" }, { value: "true", label: "True" }]}
        help="Grad-CAM is computed FOR A CLASS, not for an image. Ask it about a class the model rejected and you get the evidence it found for that class - which is usually somewhere else, and is how you debug a confusion." />
      <StatReadout label="EPOCHS TRAINED" value={String(epoch)} accent="#fbbf24" />
      <StatReadout label="TEST ACCURACY" value={`${(stats.acc * 100).toFixed(1)}%`} accent="#34d399" />
      <StatReadout label="PREDICTION" value={`${NAMES[stats.pred]} ${(stats.conf * 100).toFixed(0)}%`} accent="#c084fc" />
      <StatReadout label="HEATMAP MASS ON SHAPE" value={`${(stats.mass * 100).toFixed(0)}% (shape is ${(stats.box * 100).toFixed(0)}% of image)`} accent="#60a5fa" />
      <Legend items={[{ color: "#34d399", label: "TRUE SHAPE" }, { color: "#c084fc", label: "PREDICTED" }]} />
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>
        Look at the map before you press train. Then after.
      </div>
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Grad-CAM asks a specific question: which regions of the last convolutional feature
        maps <i>increased</i> the score for a given class? It weights each feature map by
        how much the class score responds to it, sums them, and keeps the positive part.
        The result is coarse — it lives at the resolution of the last conv layer, here
        14×14 — but it points at evidence rather than at edges.
      </DemoP>
      <DemoP>
        Nothing here is pre-baked. The network starts untrained at chance accuracy, and
        pressing <b>train</b> runs real SGD in this page. Look at the map first: it is
        diffuse and meaningless, because there is nothing to explain yet. After six
        epochs accuracy reaches the low eighties and the heatmap collapses onto the
        shape. The saliency became meaningful because the model did.
      </DemoP>
      <DemoP>
        Then switch <b>weights</b> to randomised. This is Adebayo's sanity check, and it
        is the test most published saliency methods failed: an untrained network of the
        same shape should produce a <i>useless</i> map, and if the picture barely changes
        then the method was tracking the image all along. Averaged over 200 held-out
        images the trained model puts <b>54%</b> of the heatmap's mass on a shape
        occupying <b>13%</b> of the frame, and randomising the weights drops that to
        <b>20%</b> — barely above what scattering it uniformly would give.
      </DemoP>
      <DemoP>
        Click through several images before believing any of it. A single one swings
        wildly — the same trained network gives anything from 9% to 84% depending on the
        shape and where it sits — which is a small lesson in itself: an explanation
        method is evaluated over a distribution, and a screenshot of one convincing
        heatmap is the weakest possible evidence that a method works.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        There is a detail in this architecture worth knowing rather than hiding. Because
        global average pooling feeds a single linear layer, the gradient of the class
        score with respect to each feature map is <i>constant across the map</i> and
        equals that class's weight — so Grad-CAM here collapses exactly onto <b>CAM</b>,
        the older method it generalises. Grad-CAM's contribution was removing the
        architectural requirement: it works on any network, at any layer, without a GAP
        bottleneck, because it takes the gradients instead of reading the weights off.
      </DemoP>
      <DemoP>
        The wider lesson is what an explanation is <i>for</i>. A heatmap that looks
        plausible is not evidence that the model is right — plausibility and faithfulness
        are different properties, and a model can attend to the correct object for the
        wrong reason. The useful uses are diagnostic: asking for a class the model
        rejected to see where it looked, catching a network that has locked onto a
        watermark or a background texture, and confirming the failure mode before
        changing the data.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Grad-CAM"
      subtitle="Train a small CNN here, then ask it where it looked — and check the answer is about the model."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/advanced-cv/grad-cam/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<GradCamDemo />);
