// demos/hog.jsx — Histogram of Oriented Gradients. Compute gradient magnitude +
// orientation, bin orientations per cell (magnitude-weighted, soft-voted), and
// draw the classic HOG "spoke" glyph per cell. A block-normalize toggle shows why
// HOG is robust to lighting. Real gradients + histograms in JS.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect, useMemo: _useMemo } = React;
const {
  DemoLayout, DemoP, Slider, Toggle, StatReadout, ControlGroup, Legend, useIsMobile,
} = window;

const W = 128, H = 160, SCALE = 2;
const at = (x, y) => Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x));

// a simple standing-figure silhouette — the textbook HOG / pedestrian subject
function buildGray() {
  const off = document.createElement("canvas"); off.width = W; off.height = H;
  const c = off.getContext("2d");
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#3a3a3a"); g.addColorStop(1, "#101418");
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.fillStyle = "#e8e8e8";
  c.beginPath(); c.arc(64, 34, 16, 0, Math.PI * 2); c.fill();          // head
  c.beginPath();                                                        // torso
  c.moveTo(44, 52); c.lineTo(84, 52); c.lineTo(90, 104); c.lineTo(38, 104); c.closePath(); c.fill();
  c.fillRect(30, 56, 16, 44); c.fillRect(82, 56, 16, 44);              // arms
  c.fillRect(46, 104, 14, 48); c.fillRect(68, 104, 14, 48);            // legs
  const img = c.getImageData(0, 0, W, H).data;
  const gray = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) gray[i] = (0.299 * img[i * 4] + 0.587 * img[i * 4 + 1] + 0.114 * img[i * 4 + 2]) / 255;
  return gray;
}

function HogDemo() {
  const srcRef = _useRef(null);
  const hogRef = _useRef(null);
  const mobile = useIsMobile ? useIsMobile() : false;

  const [cell, setCell] = _useState(8);
  const [bins, setBins] = _useState(9);
  const [blockNorm, setBlockNorm] = _useState(true);
  const [showMag, setShowMag] = _useState(false);

  const gray = _useMemo(() => buildGray(), []);

  const { mag, ori } = _useMemo(() => {
    const mag = new Float32Array(W * H), ori = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const gx = gray[at(x + 1, y)] - gray[at(x - 1, y)];
      const gy = gray[at(x, y + 1)] - gray[at(x, y - 1)];
      mag[y * W + x] = Math.hypot(gx, gy);
      let a = Math.atan2(gy, gx) * 180 / Math.PI;      // -180..180
      a = ((a % 180) + 180) % 180;                      // unsigned 0..180
      ori[y * W + x] = a;
    }
    return { mag, ori };
  }, [gray]);

  // cell histograms (magnitude-weighted, soft-voted between adjacent bins)
  const { cells, nx, ny } = _useMemo(() => {
    const nx = Math.floor(W / cell), ny = Math.floor(H / cell);
    const binW = 180 / bins;
    const cells = [];
    for (let cy = 0; cy < ny; cy++) for (let cx = 0; cx < nx; cx++) {
      const hist = new Float32Array(bins);
      for (let j = 0; j < cell; j++) for (let i = 0; i < cell; i++) {
        const x = cx * cell + i, y = cy * cell + j;
        const m = mag[y * W + x], a = ori[y * W + x];
        const f = a / binW - 0.5;                       // soft vote between two bins
        const b0 = Math.floor(f), frac = f - b0;
        const lo = ((b0 % bins) + bins) % bins, hi = (lo + 1) % bins;
        hist[lo] += m * (1 - frac); hist[hi] += m * frac;
      }
      cells.push({ cx, cy, hist });
    }
    return { cells, nx, ny };
  }, [mag, ori, cell, bins]);

  // left canvas: image (or gradient magnitude)
  _useEffect(() => {
    const c = srcRef.current.getContext("2d");
    const im = c.createImageData(W, H);
    let mx = 1e-6; for (let i = 0; i < W * H; i++) if (mag[i] > mx) mx = mag[i];
    for (let i = 0; i < W * H; i++) {
      const v = showMag ? Math.min(255, (mag[i] / mx) * 255 * 1.5) : gray[i] * 255;
      im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255;
    }
    c.putImageData(im, 0, 0);
  }, [gray, mag, showMag]);

  // right canvas: HOG spoke glyphs per cell
  _useEffect(() => {
    const c = hogRef.current.getContext("2d");
    c.fillStyle = "#05060f"; c.fillRect(0, 0, W, H);
    const binW = 180 / bins, half = cell * 0.5;
    // global max bin (for the un-normalized view)
    let gmax = 1e-6;
    for (const cl of cells) for (let b = 0; b < bins; b++) if (cl.hist[b] > gmax) gmax = cl.hist[b];
    for (const cl of cells) {
      const ox = cl.cx * cell + half, oy = cl.cy * cell + half;
      let scaleDen = gmax;
      if (blockNorm) { let nrm = 0; for (let b = 0; b < bins; b++) nrm += cl.hist[b] * cl.hist[b]; scaleDen = Math.sqrt(nrm) + 1e-6; }
      for (let b = 0; b < bins; b++) {
        const strength = cl.hist[b] / scaleDen;          // 0..~1
        if (strength < 0.04) continue;
        const ang = (b + 0.5) * binW * Math.PI / 180;
        const len = Math.min(half, strength * half * (blockNorm ? 1.0 : 1.2));
        const dx = Math.cos(ang) * len, dy = Math.sin(ang) * len;
        c.strokeStyle = `rgba(168,85,247,${Math.min(1, 0.25 + strength)})`;
        c.lineWidth = 1;
        c.beginPath(); c.moveTo(ox - dx, oy - dy); c.lineTo(ox + dx, oy + dy); c.stroke();
      }
    }
    // faint cell grid
    c.strokeStyle = "rgba(96,165,250,0.12)"; c.lineWidth = 0.5;
    for (let cx = 0; cx <= nx; cx++) { c.beginPath(); c.moveTo(cx * cell, 0); c.lineTo(cx * cell, ny * cell); c.stroke(); }
    for (let cy = 0; cy <= ny; cy++) { c.beginPath(); c.moveTo(0, cy * cell); c.lineTo(nx * cell, cy * cell); c.stroke(); }
  }, [cells, nx, ny, cell, bins, blockNorm]);

  const featureDim = nx * ny * bins;

  const stage = (
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center", alignItems: "flex-start" }}>
      {[[showMag ? "GRADIENT MAGNITUDE" : "IMAGE", srcRef], ["HOG DESCRIPTOR", hogRef]].map(([label, ref]) => (
        <div key={label} style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
          <span className="t-mono-s" style={{ color: "var(--muted)" }}>{label}</span>
          <canvas ref={ref} width={W} height={H}
            style={{ width: W * (mobile ? 1.6 : SCALE), height: H * (mobile ? 1.6 : SCALE), imageRendering: "pixelated", borderRadius: 4, border: "1px solid var(--border)", background: "#000" }} />
        </div>
      ))}
    </div>
  );

  const controls = (
    <ControlGroup>
      <Slider label="// CELL SIZE" min={6} max={20} step={2} value={cell} onChange={setCell} suffix=" px" tone="violet"
        help="Pixels per cell. Each cell becomes one orientation histogram. Smaller cells capture fine shape but make a longer, noisier descriptor; larger cells are coarser but more robust." />
      <Slider label="// ORIENTATION BINS" min={4} max={12} step={1} value={bins} onChange={setBins} tone="blue"
        help="Number of angle buckets spanning 0-180 degrees (unsigned gradients). 9 bins is the classic Dalal-Triggs choice. More bins resolve angle finer at the cost of descriptor length." />
      <Toggle label="// BLOCK NORMALIZE (L2)" checked={blockNorm} onChange={setBlockNorm} tone="violet"
        help="Normalize each cell's histogram to unit length. This is what makes HOG robust to lighting and contrast — only the SHAPE of the orientation distribution matters, not the absolute gradient strength. Off = raw magnitudes, so bright edges dominate." />
      <Toggle label="// SHOW GRADIENT MAGNITUDE" checked={showMag} onChange={setShowMag} tone="blue"
        help="Swap the left panel between the original image and its gradient magnitude — the raw edge energy HOG summarizes." />
      <StatReadout label="DESCRIPTOR LENGTH" value={featureDim} accent="var(--violet-lt)" />
      <StatReadout label="CELL GRID" value={`${nx} x ${ny}`} accent="var(--blue-lt)" />
      <Legend items={[{ label: "orientation spoke (len = energy)", color: "#a855f7" }]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        HOG throws away exact pixel values and keeps only <b>where edges point</b>.
        It computes the gradient at every pixel, splits the image into small
        <b> cells</b>, and in each cell builds a <b>histogram of gradient
        orientations</b> — each pixel votes for its angle, weighted by how strong its
        gradient is. The right panel draws that histogram as a star of spokes: a long
        spoke means lots of edge energy at that angle. Trace the figure and you can
        see its outline emerge purely from local edge directions.
      </DemoP>
      <DemoP>
        The crucial step is <b>block normalization</b>. Toggle it off and bright,
        high-contrast edges dominate; toggle it on and each cell is rescaled to unit
        length, so only the <i>shape</i> of the orientation distribution survives —
        not the lighting. That single trick is why HOG works across shadows and
        exposure changes. The result is a fixed-length vector (the <b>descriptor
        length</b> here) you can feed to a linear classifier.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        HOG + a linear <a href={`${window.__DM_BASE || "../../"}visualize/svm/`}>SVM</a> was
        the state-of-the-art pedestrian and object detector for years before deep
        learning (Dalal &amp; Triggs, 2005), and the descriptor still shows up where
        compute is tight or data is scarce. It's the hand-designed ancestor of what a
        <a href={`${window.__DM_BASE || "../../"}visualize/convolution/`}> CNN</a> learns:
        the first conv layers discover oriented-edge filters and pool them spatially —
        exactly HOG's cells-of-oriented-gradients, only learned instead of specified.
      </DemoP>
      <DemoP>
        Every piece here reuses ideas from the rest of vision: the gradients are the
        same ones in <a href={`${window.__DM_BASE || "../../"}visualize/edge-detection/`}>edge detection</a>,
        the orientation histogram is a coarser cousin of the orientation assignment in
        SIFT keypoints from <a href={`${window.__DM_BASE || "../../"}visualize/harris-corners/`}>corner detection</a>,
        and the normalize-to-shape move is the recurring lesson that <i>relative</i>
        structure generalizes better than absolute values.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      title="Histogram of Oriented Gradients"
      subtitle="Summarize an image by where its edges point — per-cell orientation histograms, block-normalized into the descriptor behind classic object detection."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="violet"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<HogDemo />);
