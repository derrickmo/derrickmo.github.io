// demos/saliency.jsx — saliency maps via input gradients.
//
// Train a small pixel classifier (8x8 -> 16 -> 1) to tell a VERTICAL bar from a
// HORIZONTAL bar. For any input image, the saliency map is the gradient of the
// predicted logit with respect to each input pixel: |∂z/∂x_k|, computed by
// backpropagating all the way to the input. Bright pixels are the ones that, if
// nudged, would change the decision most — so the map lights up the bar that
// drives the class. Paint the left grid and watch the explanation update live.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480, G = 8, NPX = G * G, HID = 16;
const sigmoid = (z) => 1 / (1 + Math.exp(-z));
function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

function SaliencyDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [, force] = _useState(0);
  const netRef = _useRef(null);
  const imgRef = _useRef(new Float64Array(NPX));

  function sampleImg(cls) {
    const x = new Float64Array(NPX);
    if (cls === 0) { const c = (Math.random() * G) | 0; for (let r = 0; r < G; r++) x[r * G + c] = 1; }
    else { const r = (Math.random() * G) | 0; for (let c = 0; c < G; c++) x[r * G + c] = 1; }
    for (let i = 0; i < NPX; i++) if (Math.random() < 0.05) x[i] = x[i] ? 0 : 1; // light noise
    return x;
  }
  function train() {
    let W1 = Array.from({ length: HID }, () => Array.from({ length: NPX }, () => randn() * 0.3)), b1 = new Float64Array(HID);
    let W2 = Array.from({ length: HID }, () => randn() * 0.4), b2 = 0;
    const lr = 0.15;
    for (let it = 0; it < 240; it++) {
      const cls = it % 2, x = sampleImg(cls);
      const z1 = W1.map((w, j) => { let s = b1[j]; for (let k = 0; k < NPX; k++) s += w[k] * x[k]; return s; });
      const h = z1.map(Math.tanh);
      let z = b2; for (let j = 0; j < HID; j++) z += W2[j] * h[j];
      const e = sigmoid(z) - cls;
      for (let j = 0; j < HID; j++) { const dh = e * W2[j] * (1 - h[j] * h[j]); W2[j] -= lr * e * h[j]; for (let k = 0; k < NPX; k++) W1[j][k] -= lr * dh * x[k]; b1[j] -= lr * dh; }
      b2 -= lr * e;
    }
    netRef.current = { W1, b1, W2, b2 };
  }
  function setPreset(p) {
    const x = new Float64Array(NPX);
    if (p === "vertical") { const c = 3; for (let r = 0; r < G; r++) x[r * G + c] = 1; }
    else if (p === "horizontal") { const r = 4; for (let c = 0; c < G; c++) x[r * G + c] = 1; }
    imgRef.current = x; force(v => v + 1);
  }
  _useEffect(() => { train(); setPreset("vertical"); /* eslint-disable-next-line */ }, []);

  const net = netRef.current, img = imgRef.current;
  function forwardGrad() {
    if (!net) return { prob: 0.5, sal: new Float64Array(NPX) };
    const z1 = net.W1.map((w, j) => { let s = net.b1[j]; for (let k = 0; k < NPX; k++) s += w[k] * img[k]; return s; });
    const h = z1.map(Math.tanh);
    let z = net.b2; for (let j = 0; j < HID; j++) z += net.W2[j] * h[j];
    // dz/dx_k = sum_j W2_j (1-h_j^2) W1_jk
    const sal = new Float64Array(NPX);
    for (let k = 0; k < NPX; k++) { let g = 0; for (let j = 0; j < HID; j++) g += net.W2[j] * (1 - h[j] * h[j]) * net.W1[j][k]; sal[k] = Math.abs(g); }
    return { prob: sigmoid(z), sal };
  }
  const { prob, sal } = forwardGrad();
  const salMax = Math.max(...sal, 1e-6);
  const cls = prob > 0.5 ? "horizontal" : "vertical";

  function cellFromEvent(e) {
    const cv = canvasRef.current, rect = cv.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (W / rect.width), y = (e.clientY - rect.top) * (H / rect.height);
    const cell = 26, ox = 30, oy = 60;
    if (x < ox || x > ox + G * cell || y < oy || y > oy + G * cell) return -1;
    const c = Math.floor((x - ox) / cell), r = Math.floor((y - oy) / cell);
    return r * G + c;
  }
  function paint(e) { const i = cellFromEvent(e); if (i >= 0) { img[i] = img[i] ? 0 : 1; force(v => v + 1); } }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";
    const cell = 26, oyG = 60;
    // input grid (left, paintable)
    const oxIn = 30;
    ctx.fillStyle = "#94a3b8"; ctx.fillText("INPUT  (click to paint)", oxIn, oyG - 10);
    for (let r = 0; r < G; r++) for (let c = 0; c < G; c++) {
      const v = img[r * G + c];
      ctx.fillStyle = v ? "#e2e8f0" : "rgba(30,41,59,0.6)";
      ctx.fillRect(oxIn + c * cell + 1, oyG + r * cell + 1, cell - 2, cell - 2);
    }
    // saliency grid (right)
    const oxS = 296;
    ctx.fillStyle = "#94a3b8"; ctx.fillText("SALIENCY  |∂logit/∂pixel|", oxS, oyG - 10);
    for (let r = 0; r < G; r++) for (let c = 0; c < G; c++) {
      const t = sal[r * G + c] / salMax;
      const col = [Math.round(30 + 225 * t), Math.round(58 + 130 * t * (1 - t) * 2), Math.round(138 - 100 * t)];
      ctx.fillStyle = `rgb(${col[0]},${Math.max(0, col[1])},${Math.max(0, col[2])})`;
      ctx.fillRect(oxS + c * cell + 1, oyG + r * cell + 1, cell - 2, cell - 2);
    }

    // prediction
    const py = oyG + G * cell + 40;
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono"; ctx.fillText("PREDICTION", 30, py - 8);
    const conf = cls === "horizontal" ? prob : 1 - prob;
    ctx.fillStyle = cls === "horizontal" ? "#a855f7" : "#60a5fa"; ctx.font = "600 24px Space Grotesk, JetBrains Mono";
    ctx.fillText(cls.toUpperCase() + " bar", 30, py + 20);
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono"; ctx.fillText((conf * 100).toFixed(0) + "% confident", 220, py + 16);
    ctx.fillStyle = "#64748b"; ctx.font = "10px JetBrains Mono"; ctx.fillText("the bright saliency pixels are the ones the model relies on", 30, py + 44);
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  });

  const stage = <canvas ref={canvasRef} onClick={paint} style={{ maxWidth: "100%", borderRadius: 4, cursor: "pointer" }} />;
  const controls = (
    <ControlGroup>
      <SegmentedControl label="// PRESET" tone="violet" value={cls === "horizontal" ? "horizontal" : "vertical"} onChange={setPreset}
        options={[{ value: "vertical", label: "Vertical" }, { value: "horizontal", label: "Horizontal" }]}
        help="Load a clean vertical or horizontal bar, then paint over it on the canvas. The saliency map updates instantly to show which pixels the classifier is keying on for its decision." />
      <DemoButton onClick={() => { img.fill(0); force(v => v + 1); }} primary>CLEAR</DemoButton>
      <DemoButton onClick={() => { train(); force(v => v + 1); }}>RETRAIN</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="PREDICTION" value={cls === "horizontal" ? "HORIZ" : "VERT"} accent={cls === "horizontal" ? "#a855f7" : "#60a5fa"} />
        <StatReadout label="CONFIDENCE" value={((cls === "horizontal" ? prob : 1 - prob) * 100).toFixed(0) + "%"} />
      </div>
      <Legend items={[
        { color: "#e2e8f0", label: "painted pixel" },
        { color: "#f87171", label: "high saliency" },
        { color: "#1e3a8a", label: "low saliency" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        How do you explain an image model's decision? Saliency takes the gradient of
        the output with respect to every input pixel: ∂(score)/∂(pixel). A pixel
        with a large gradient is one the model is sensitive to — nudge it and the
        prediction moves — so the magnitude of that gradient, drawn as a heatmap, is
        a first-order "what is the model looking at?" map. Here the classifier
        separates vertical from horizontal bars, and the bright saliency pixels land
        right on the bar that decides the class.
      </DemoP>
      <DemoP>
        Paint on the left grid (click cells) and the map recomputes live: add a
        competing bar and you'll see saliency split between the features fighting
        over the decision; erase the discriminative line and confidence collapses.
        Because the network is nonlinear, the explanation is input-specific — the
        same model highlights different pixels for different images, which is
        exactly what makes a per-example attribution useful (and what a single set
        of weights can't tell you).
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Saliency maps (Simonyan et al., 2013) are the gradient-based branch of
        explainability for vision and any differentiable model — the image-space
        sibling of the game-theoretic{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/shap/`} style={{ color: "#a855f7" }}>SHAP</a>{" "}
        attributions for tabular features. They're cheap (one backward pass) and
        intuitive, and they underpie a family: Grad-CAM (gradients at a conv layer),
        Integrated Gradients (average along a path from a baseline), SmoothGrad
        (average over noised inputs), and guided backprop.
      </DemoP>
      <DemoP>
        The caveats matter for trust: raw gradients are noisy and can fail sanity
        checks (some "explanations" barely change when the model is randomized), and
        a saliency map shows what the model is sensitive to, not whether its reasoning
        is correct or causal. That's why it sits alongside{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/calibration/`} style={{ color: "#a855f7" }}>calibration</a>{" "}
        and SHAP in the trustworthy-ML toolkit rather than standing alone — an
        attribution is a hypothesis about the model, to be checked, not a guarantee.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="TRUSTWORTHY ML" title="Saliency Maps"
      subtitle="Gradient of the output w.r.t. each input pixel — a per-example map of what the model is looking at. Paint the grid and watch the explanation move."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/ml-theory/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<SaliencyDemo />);
