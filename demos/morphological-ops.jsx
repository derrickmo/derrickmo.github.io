// demos/morphological-ops.jsx — binary morphology. A noisy binary image is
// transformed by erosion / dilation / opening / closing / gradient with a chosen
// structuring element. Real set operations on the pixel grid: erode keeps a
// pixel only if the whole SE fits inside the foreground; dilate keeps it if the
// SE touches any foreground; opening (erode then dilate) removes specks; closing
// (dilate then erode) fills holes; gradient = dilate minus erode = the boundary.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 380, GW = 48, GH = 34;
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function makeImage(seed, noise) {
  const rng = mulberry32(seed), img = Array.from({ length: GH }, () => new Array(GW).fill(0));
  // a couple of filled blobs + a thin bridge
  const blobs = [{ cx: 16, cy: 17, r: 8 }, { cx: 33, cy: 15, r: 6 }];
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    for (const b of blobs) if ((x - b.cx) ** 2 + (y - b.cy) ** 2 < b.r * b.r) img[y][x] = 1;
    if (y > 14 && y < 18 && x > 16 && x < 33) img[y][x] = 1; // bridge
  }
  // salt-and-pepper noise
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { if (rng() < noise) img[y][x] = img[y][x] ? 0 : 1; }
  return img;
}
function seOffsets(size, cross) {
  const off = []; const r = size;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (cross && Math.abs(dx) + Math.abs(dy) > r) continue; off.push([dx, dy]); }
  return off;
}
function erode(img, off) {
  const out = Array.from({ length: GH }, () => new Array(GW).fill(0));
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { let all = 1; for (const [dx, dy] of off) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH || !img[ny][nx]) { all = 0; break; } } out[y][x] = all; }
  return out;
}
function dilate(img, off) {
  const out = Array.from({ length: GH }, () => new Array(GW).fill(0));
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { let any = 0; for (const [dx, dy] of off) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < GW && ny < GH && img[ny][nx]) { any = 1; break; } } out[y][x] = any; }
  return out;
}

function MorphologicalOpsDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [op, setOp] = _useState("open");
  const [seSize, setSeSize] = _useState(1);
  const [cross, setCross] = _useState(false);
  const [noise, setNoise] = _useState(0.05);
  const [seed, setSeed] = _useState(3);
  const [, setTick] = _useState(0);
  const metricRef = _useRef({ before: 0, after: 0 });

  function compute() {
    const img = makeImage(seed, noise), off = seOffsets(seSize, cross);
    let out;
    if (op === "erode") out = erode(img, off);
    else if (op === "dilate") out = dilate(img, off);
    else if (op === "open") out = dilate(erode(img, off), off);
    else if (op === "close") out = erode(dilate(img, off), off);
    else { const d = dilate(img, off), e = erode(img, off); out = d.map((row, y) => row.map((v, x) => v - e[y][x])); }
    let before = 0, after = 0; for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { before += img[y][x]; after += out[y][x] > 0 ? 1 : 0; }
    metricRef.current = { before, after };
    return { img, out };
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const { img, out } = compute();
    const cw = 230, px = cw / GW, py = 230 / GH;
    const panel = (ox, oy, grid, title, isResult) => {
      ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px JetBrains Mono, monospace"; ctx.textAlign = "left"; ctx.fillText(title, ox, oy - 8);
      ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.strokeRect(ox, oy, cw, 230);
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
        const v = grid[y][x];
        if (!v) continue;
        ctx.fillStyle = isResult ? (v > 0 ? "#60a5fa" : "#0a0e1a") : "rgba(168,85,247,0.7)";
        ctx.fillRect(ox + x * px, oy + y * py, px + 0.5, py + 0.5);
      }
    };
    panel(30, 50, img, "INPUT (noisy binary)", false);
    panel(290, 50, out, "RESULT: " + op.toUpperCase(), true);
    // SE preview
    const off = seOffsets(seSize, cross), sw = (2 * seSize + 1);
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px JetBrains Mono"; ctx.fillText("structuring element", 30, 312);
    const sx = 30, sy = 320, sc = 8;
    for (let dy = -seSize; dy <= seSize; dy++) for (let dx = -seSize; dx <= seSize; dx++) {
      const on = off.some(o => o[0] === dx && o[1] === dy);
      ctx.fillStyle = on ? "#a855f7" : "rgba(255,255,255,0.08)"; ctx.fillRect(sx + (dx + seSize) * sc, sy + (dy + seSize) * sc, sc - 1, sc - 1);
    }
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  }, []);
  _useEffect(() => { setTick(v => v + 1); draw(); }, [op, seSize, cross, noise, seed]);

  const m = metricRef.current;
  const stage = (<canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />);

  const controls = (
    <ControlGroup>
      <SegmentedControl label="// OPERATION" value={op} onChange={setOp}
        options={[{ value: "erode", label: "Erode" }, { value: "dilate", label: "Dilate" }, { value: "open", label: "Open" }, { value: "close", label: "Close" }, { value: "gradient", label: "Gradient" }]}
        help="Erode shrinks foreground (keep a pixel only if the whole element fits inside it); Dilate grows it. Open = erode then dilate (removes small specks); Close = dilate then erode (fills small holes); Gradient = dilate minus erode = the object outline." />
      <SegmentedControl label="// ELEMENT SHAPE" value={cross ? "cross" : "square"} onChange={v => setCross(v === "cross")}
        options={[{ value: "square", label: "Square" }, { value: "cross", label: "Cross" }]}
        help="The structuring element (shown bottom-left): the neighborhood the operation probes with. A cross (4-connected) is gentler on diagonals than a full square (8-connected)." />
      <Slider label="// ELEMENT SIZE" min={1} max={3} step={1} value={seSize} onChange={setSeSize}
        help="Radius of the structuring element (1 = 3x3, 2 = 5x5, 3 = 7x7). Bigger elements remove or fill larger features." />
      <Slider label="// NOISE" min={0} max={0.2} step={0.01} value={noise} onChange={setNoise}
        help="Salt-and-pepper noise added to the binary image. Opening cleans the white specks; closing fills the black holes - the classic denoising use of morphology." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setSeed(s => s + 1)} primary>RESAMPLE</DemoButton>
        <DemoButton onClick={() => { setOp("open"); setSeSize(1); setNoise(0.05); }}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="FOREGROUND BEFORE" value={m.before} accent="var(--violet-lt)" />
        <StatReadout label="FOREGROUND AFTER" value={m.after} accent="#60a5fa" />
      </div>
      <Legend items={[
        { color: "#a855f7", label: "input foreground" },
        { color: "#60a5fa", label: "result foreground" },
      ]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Morphology treats a binary image as a <b>set</b> of foreground pixels and reshapes it by probing
        with a small <b>structuring element</b>. <b>Erosion</b> keeps a pixel only if the element fits
        entirely inside the foreground there — it shrinks shapes and deletes thin protrusions and specks.
        <b> Dilation</b> keeps a pixel if the element touches any foreground — it grows shapes and bridges
        gaps. Everything else is built from these two.
      </DemoP>
      <DemoP>
        The combinations are where it gets useful. <b>Opening</b> (erode then dilate) wipes out small
        white noise while keeping big shapes their original size; <b>Closing</b> (dilate then erode) fills
        small black holes and joins nearby pieces; <b>Gradient</b> (dilation minus erosion) leaves just the
        one-pixel <b>outline</b>. Add noise and toggle Open vs Close to watch each clean a different kind of
        speck — then grow the element to see it erase larger features.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Morphological operations are the cleanup crew of classical computer vision: after a
        <a href={`${window.__DM_BASE || "../../"}visualize/edge-detection/`}> threshold or segmentation</a> you
        almost always open/close the mask to remove noise and fill holes before measuring objects. They power
        OCR preprocessing, medical-image masks, document binarization, defect detection, and the connected-
        component analysis behind blob counting. They're also the discrete cousin of the
        <a href={`${window.__DM_BASE || "../../"}visualize/watershed/`}> distance transform</a> used in watershed segmentation.
      </DemoP>
      <DemoP>
        The deeper idea generalizes: erosion and dilation are <b>min</b> and <b>max</b> filters over a
        neighborhood — the non-linear, order-statistic counterparts to the linear
        <a href={`${window.__DM_BASE || "../../"}visualize/convolution/`}> convolution</a> that dominates deep vision.
        That min/max-pooling intuition carries straight into CNNs, and grayscale morphology extends the same
        operations to continuous images. Simple set logic, but it remains a first-reach tool whenever a mask
        needs tidying.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      topic="COMPUTER VISION"
      title="Morphological Operations"
      subtitle="Reshape a binary image with erosion, dilation, opening, closing, and gradient - the cleanup crew of classical vision."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/advanced-cv/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="violet"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<MorphologicalOpsDemo />);
