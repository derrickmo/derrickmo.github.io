// demos/edge-detection.jsx — the full Canny edge-detection pipeline on a
// procedural image: Gaussian blur -> Sobel gradient -> non-maximum suppression
// -> double threshold -> hysteresis. A stage selector walks each step.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect, useMemo: _useMemo } = React;
const {
  DemoLayout, DemoP, Slider, SegmentedControl, StatReadout, ControlGroup, Legend, useIsMobile,
} = window;

const SW = 180, SH = 140, SCALE = 2;

// ── build the grayscale source once (recognizable shapes => clear edges) ──
function buildGray() {
  const off = document.createElement("canvas"); off.width = SW; off.height = SH;
  const c = off.getContext("2d");
  const g = c.createLinearGradient(0, 0, SW, SH);
  g.addColorStop(0, "#1a1a1a"); g.addColorStop(1, "#7a7a7a");
  c.fillStyle = g; c.fillRect(0, 0, SW, SH);
  c.fillStyle = "#fff"; c.beginPath(); c.arc(52, 60, 30, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#101010"; c.fillRect(96, 26, 58, 44);
  c.strokeStyle = "#fff"; c.lineWidth = 5; c.beginPath(); c.moveTo(18, 124); c.lineTo(162, 90); c.stroke();
  c.fillStyle = "#fafafa"; c.font = "bold 30px 'Space Grotesk', sans-serif"; c.fillText("ML", 104, 120);
  const img = c.getImageData(0, 0, SW, SH).data;
  const gray = new Float32Array(SW * SH);
  for (let i = 0; i < SW * SH; i++)
    gray[i] = 0.299 * img[i * 4] + 0.587 * img[i * 4 + 1] + 0.114 * img[i * 4 + 2];
  return gray;
}

const at = (x, y) => Math.min(SH - 1, Math.max(0, y)) * SW + Math.min(SW - 1, Math.max(0, x));

// separable Gaussian blur
function gaussBlur(src, sigma) {
  if (sigma < 0.3) return src.slice();
  const r = Math.max(1, Math.ceil(sigma * 2.5));
  const k = []; let ks = 0;
  for (let i = -r; i <= r; i++) { const w = Math.exp(-(i * i) / (2 * sigma * sigma)); k.push(w); ks += w; }
  for (let i = 0; i < k.length; i++) k[i] /= ks;
  const tmp = new Float32Array(SW * SH), out = new Float32Array(SW * SH);
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
    let acc = 0; for (let i = -r; i <= r; i++) acc += src[at(x + i, y)] * k[i + r];
    tmp[y * SW + x] = acc;
  }
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
    let acc = 0; for (let i = -r; i <= r; i++) acc += tmp[at(x, y + i)] * k[i + r];
    out[y * SW + x] = acc;
  }
  return out;
}

// Sobel -> magnitude + direction
function sobel(src) {
  const mag = new Float32Array(SW * SH), dir = new Float32Array(SW * SH);
  let max = 1e-6;
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
    const tl = src[at(x - 1, y - 1)], tc = src[at(x, y - 1)], tr = src[at(x + 1, y - 1)];
    const ml = src[at(x - 1, y)], mr = src[at(x + 1, y)];
    const bl = src[at(x - 1, y + 1)], bc = src[at(x, y + 1)], br = src[at(x + 1, y + 1)];
    const gx = (tr + 2 * mr + br) - (tl + 2 * ml + bl);
    const gy = (bl + 2 * bc + br) - (tl + 2 * tc + tr);
    const m = Math.hypot(gx, gy);
    mag[y * SW + x] = m; if (m > max) max = m;
    dir[y * SW + x] = Math.atan2(gy, gx);
  }
  return { mag, dir, max };
}

// non-maximum suppression: thin to 1px ridges along the gradient direction
function nms(mag, dir) {
  const out = new Float32Array(SW * SH);
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
    const m = mag[y * SW + x]; if (m === 0) continue;
    let a = (dir[y * SW + x] * 180 / Math.PI); a = ((a % 180) + 180) % 180;
    let dx = 1, dy = 0;
    if (a >= 22.5 && a < 67.5) { dx = 1; dy = 1; }
    else if (a >= 67.5 && a < 112.5) { dx = 0; dy = 1; }
    else if (a >= 112.5 && a < 157.5) { dx = -1; dy = 1; }
    const n1 = mag[at(x + dx, y + dy)], n2 = mag[at(x - dx, y - dy)];
    out[y * SW + x] = (m >= n1 && m >= n2) ? m : 0;
  }
  return out;
}

// double threshold + hysteresis (BFS from strong through weak)
function hysteresis(thin, max, lowFrac, highFrac) {
  const lo = lowFrac * max, hi = highFrac * max;
  const cls = new Uint8Array(SW * SH); // 0 none, 1 weak, 2 strong
  const final = new Uint8Array(SW * SH);
  const stack = [];
  for (let i = 0; i < SW * SH; i++) {
    if (thin[i] >= hi) { cls[i] = 2; final[i] = 1; stack.push(i); }
    else if (thin[i] >= lo) cls[i] = 1;
  }
  while (stack.length) {
    const i = stack.pop(), x = i % SW, y = (i / SW) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= SW || yy >= SH) continue;
      const j = yy * SW + xx;
      if (cls[j] === 1 && !final[j]) { final[j] = 1; stack.push(j); }
    }
  }
  let strong = 0, weakKept = 0, edges = 0;
  for (let i = 0; i < SW * SH; i++) { if (cls[i] === 2) strong++; if (final[i]) { edges++; if (cls[i] === 1) weakKept++; } }
  return { cls, final, edges, strong, weakKept };
}

function EdgeDetectionDemo() {
  const srcRef = _useRef(null);
  const outRef = _useRef(null);
  const mobile = useIsMobile ? useIsMobile() : false;

  const [sigma, setSigma] = _useState(1.2);
  const [low, setLow] = _useState(8);     // percent of max
  const [high, setHigh] = _useState(20);  // percent of max
  const [stage, setStage] = _useState("final");

  const gray = _useMemo(() => buildGray(), []);

  // draw the static grayscale source once
  _useEffect(() => {
    const sc = srcRef.current.getContext("2d");
    const im = sc.createImageData(SW, SH);
    for (let i = 0; i < SW * SH; i++) { const v = gray[i]; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
    sc.putImageData(im, 0, 0);
  }, [gray]);

  // full pipeline, recomputed on any knob change
  const result = _useMemo(() => {
    const blurred = gaussBlur(gray, sigma);
    const { mag, dir, max } = sobel(blurred);
    const thin = nms(mag, dir);
    const lf = Math.min(low, high) / 100, hf = Math.max(low, high) / 100;
    const hyst = hysteresis(thin, max, lf, hf);
    return { mag, dir, max, thin, ...hyst };
  }, [gray, sigma, low, high]);

  // render the selected stage to the output canvas
  _useEffect(() => {
    const oc = outRef.current.getContext("2d");
    const im = oc.createImageData(SW, SH);
    const d = im.data;
    const { mag, thin, cls, final, max } = result;
    for (let i = 0; i < SW * SH; i++) {
      let r = 0, g = 0, b = 0;
      if (stage === "gradient") { const v = Math.min(255, (mag[i] / max) * 255 * 1.6); r = g = b = v; }
      else if (stage === "thin") { const v = Math.min(255, (thin[i] / max) * 255 * 1.6); r = g = b = v; }
      else if (stage === "threshold") {
        if (cls[i] === 2) { r = 96; g = 165; b = 250; }          // strong = blue
        else if (cls[i] === 1) { r = 110; g = 90; b = 40; }       // weak = dim amber
      } else { // final
        if (final[i]) { r = g = b = 255; }
      }
      const o = i * 4; d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
    }
    oc.putImageData(im, 0, 0);
  }, [result, stage]);

  const edgePct = ((result.edges / (SW * SH)) * 100).toFixed(1);
  const stageLabel = { gradient: "GRADIENT |∇|", thin: "THINNED (NMS)", threshold: "DOUBLE THRESHOLD", final: "EDGES (FINAL)" }[stage];

  const stage_el = (
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center", alignItems: "flex-start" }}>
      {[["SOURCE", srcRef], [stageLabel, outRef]].map(([label, ref]) => (
        <div key={label} style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
          <span className="t-mono-s" style={{ color: "var(--muted)" }}>{label}</span>
          <canvas ref={ref} width={SW} height={SH}
            style={{ width: SW * (mobile ? 1.5 : SCALE), height: SH * (mobile ? 1.5 : SCALE), imageRendering: "pixelated", borderRadius: 4, border: "1px solid var(--border)", background: "#000" }} />
        </div>
      ))}
    </div>
  );

  const controls = (
    <ControlGroup>
      <SegmentedControl label="// PIPELINE STAGE" tone="violet"
        value={stage} onChange={setStage}
        options={[
          { value: "gradient", label: "Gradient" },
          { value: "thin", label: "Thin" },
          { value: "threshold", label: "Threshold" },
          { value: "final", label: "Edges" },
        ]}
        help="Walk the Canny pipeline: raw Sobel gradient magnitude, then non-max suppression thins ridges to 1px, then the double threshold splits strong/weak, then hysteresis links them into final edges." />
      <Slider label="// BLUR sigma" min={0} max={3} step={0.1} value={sigma} onChange={setSigma} tone="violet"
        help="Gaussian smoothing applied before differentiation. Too little and noise becomes fake edges; too much and real edges blur away. The first Canny step." />
      <Slider label="// LOW THRESHOLD" min={1} max={50} step={1} value={low} onChange={setLow} suffix="%" tone="blue"
        help="Percent of max gradient. Pixels above this but below the high threshold are 'weak' — kept only if connected to a strong edge (hysteresis)." />
      <Slider label="// HIGH THRESHOLD" min={2} max={60} step={1} value={high} onChange={setHigh} suffix="%" tone="blue"
        help="Percent of max gradient. Pixels above this are 'strong' edges, kept unconditionally and used as seeds to rescue connected weak pixels." />
      <StatReadout label="EDGE PIXELS" value={edgePct + "%"} accent="var(--violet-lt)" />
      <Legend items={[
        { label: "strong", color: "#60a5fa" },
        { label: "weak (kept if linked)", color: "#6e5a28" },
        { label: "edge", color: "#fff" },
      ]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Canny edge detection is a five-stage pipeline, and you can step through each
        one with the <b>stage</b> selector. First a <b>Gaussian blur</b> removes
        noise (differentiation amplifies it). Then a <b>Sobel</b> operator estimates
        the image gradient ∇ — its magnitude is large wherever brightness changes
        fast. Raw gradients are fat and fuzzy, so <b>non-maximum suppression</b> keeps
        only pixels that are a local maximum <i>along the gradient direction</i>,
        thinning every edge to a single pixel.
      </DemoP>
      <DemoP>
        The last two stages clean it up. A <b>double threshold</b> labels pixels
        <i> strong</i> (definitely an edge), <i>weak</i> (maybe), or suppressed.
        Then <b>hysteresis</b> walks outward from the strong pixels and keeps any
        weak pixel connected to them — this is what links a broken edge into one
        continuous contour while dropping isolated noise specks. Drop the high
        threshold and watch weak detail flood in; raise the blur and watch fine
        edges dissolve.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Edge detection is one of the oldest and most useful operations in computer
        vision — the Sobel gradient here is the exact same 3×3 kernel you can type
        into the <a href={`${window.__DM_BASE || "../../"}visualize/convolution/`}>Convolution Lab</a>,
        and a CNN's first layer reliably <i>learns</i> filters that look just like it.
        Edges feed classical features (HOG, SIFT), document/lane/medical-image
        segmentation, and the Canny output is still a common preprocessing step before
        a Hough transform finds lines and circles.
      </DemoP>
      <DemoP>
        The two ideas that make Canny work generalize far beyond images.
        <b> Non-maximum suppression</b> — keep only the local peak — is the same trick
        that turns a cloud of detection boxes into one box per object in
        <a href={`${window.__DM_BASE || "../../"}visualize/nms/`}> IoU &amp; NMS</a>.
        And <b>hysteresis</b> — a high bar to start, a low bar to continue — is a
        general recipe for trading precision against recall while staying robust to
        noise.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      topic="COMPUTER VISION"
      title="Canny Edge Detection"
      subtitle="Walk the classic five-stage pipeline — blur, Sobel gradient, non-max suppression, double threshold, hysteresis — and watch edges emerge from pixels."
      stage={stage_el} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="violet"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<EdgeDetectionDemo />);
