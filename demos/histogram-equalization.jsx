// demos/histogram-equalization.jsx — spread a washed-out image's tones.
// Build the intensity histogram, integrate it into a CDF, and use that CDF as a
// transfer curve that remaps each pixel so the output histogram is roughly flat.
// A CLIP LIMIT clips tall histogram bins before equalizing (the CLAHE idea) to
// avoid over-amplifying noise. Real histogram -> CDF -> remap; the before/after
// images, histograms, and the transfer curve are all computed from the pixels.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 380, IW = 64, IH = 44, BINS = 64;
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function gauss(rng) { let u = 0, v = 0; while (u === 0) u = rng(); while (v === 0) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

function makeImage(seed, contrast) {
  const rng = mulberry32(seed), img = Array.from({ length: IH }, () => new Array(IW).fill(0));
  const blobs = Array.from({ length: 4 }, () => ({ cx: rng() * IW, cy: rng() * IH, r: 8 + rng() * 14, a: 0.3 + rng() * 0.7 }));
  for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) {
    let v = 0.35 + 0.3 * (x / IW); // gentle gradient
    for (const b of blobs) v += b.a * Math.exp(-((x - b.cx) ** 2 + (y - b.cy) ** 2) / (2 * b.r * b.r));
    v += gauss(rng) * 0.03;
    img[y][x] = v;
  }
  // normalize to [0,1] then compress to a narrow band = low contrast
  let lo = Infinity, hi = -Infinity; for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) { lo = Math.min(lo, img[y][x]); hi = Math.max(hi, img[y][x]); }
  const mid = 0.5, span = contrast; // contrast in (0,1]; smaller = more washed out
  for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) { const n = (img[y][x] - lo) / (hi - lo + 1e-9); img[y][x] = mid + (n - 0.5) * span; }
  return img;
}

function equalize(img, clipFrac) {
  const hist = new Array(BINS).fill(0), N = IW * IH;
  for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) { let b = Math.floor(Math.max(0, Math.min(1, img[y][x])) * (BINS - 1)); hist[b]++; }
  // CLAHE-style clip + redistribute
  let clipped = hist.slice();
  if (clipFrac < 1) {
    const limit = Math.max(1, clipFrac * N / BINS * 8); let excess = 0;
    for (let i = 0; i < BINS; i++) { if (clipped[i] > limit) { excess += clipped[i] - limit; clipped[i] = limit; } }
    const add = excess / BINS; for (let i = 0; i < BINS; i++) clipped[i] += add;
  }
  // CDF transfer
  const cdf = new Array(BINS).fill(0); let acc = 0; const tot = clipped.reduce((a, b) => a + b, 0);
  for (let i = 0; i < BINS; i++) { acc += clipped[i]; cdf[i] = acc / tot; }
  const out = img.map(row => row.map(v => { const b = Math.floor(Math.max(0, Math.min(1, v)) * (BINS - 1)); return cdf[b]; }));
  // output histogram
  const oHist = new Array(BINS).fill(0); for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) oHist[Math.floor(Math.max(0, Math.min(1, out[y][x])) * (BINS - 1))]++;
  return { out, hist, oHist, cdf };
}
function stdev(img) { let m = 0, n = IW * IH; for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) m += img[y][x]; m /= n; let s = 0; for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) s += (img[y][x] - m) ** 2; return Math.sqrt(s / n); }

function HistogramEqualizationDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [contrast, setContrast] = _useState(0.35);
  const [clip, setClip] = _useState(1);
  const [seed, setSeed] = _useState(3);
  const [, setTick] = _useState(0);
  const metricRef = _useRef({ before: 0, after: 0 });

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const img = makeImage(seed, contrast), { out, hist, oHist, cdf } = equalize(img, clip);
    metricRef.current = { before: stdev(img), after: stdev(out) };
    const px = 3.4, py = 3.4, ax = 30, ay = 46, bx = 290, by = 46;
    const panel = (ox, oy, grid, title) => {
      ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px JetBrains Mono, monospace"; ctx.textAlign = "left"; ctx.fillText(title, ox, oy - 8);
      for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) { const g = Math.round(Math.max(0, Math.min(1, grid[y][x])) * 255); ctx.fillStyle = `rgb(${g},${g},${g})`; ctx.fillRect(ox + x * px, oy + y * py, px + 0.5, py + 0.5); }
      ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.strokeRect(ox, oy, IW * px, IH * py);
    };
    panel(ax, ay, img, "BEFORE (low contrast)");
    panel(bx, by, out, "AFTER (equalized)");
    // histograms + transfer curve
    const hx = 30, hy = 230, hw = 230, hh = 110;
    const drawHist = (h, col, ox, label) => {
      const mx = Math.max(...h);
      ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px JetBrains Mono"; ctx.fillText(label, ox, hy - 6);
      ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.strokeRect(ox, hy, hw, hh);
      ctx.fillStyle = col; for (let i = 0; i < BINS; i++) { const bh = (h[i] / mx) * (hh - 4); ctx.fillRect(ox + i * (hw / BINS), hy + hh - bh, hw / BINS - 0.5, bh); }
    };
    drawHist(hist, "rgba(96,165,250,0.7)", hx, "histogram BEFORE");
    drawHist(oHist, "rgba(168,85,247,0.7)", 290, "histogram AFTER (flatter)");
    // CDF transfer curve overlaid on the AFTER histogram box
    ctx.strokeStyle = "#34d399"; ctx.lineWidth = 1.8; ctx.beginPath();
    for (let i = 0; i < BINS; i++) { const cx = 290 + i * (hw / BINS), cy = hy + hh - cdf[i] * (hh - 4); i ? ctx.lineTo(cx, cy) : ctx.moveTo(cx, cy); }
    ctx.stroke();
    ctx.fillStyle = "rgba(52,211,153,0.7)"; ctx.font = "9px JetBrains Mono"; ctx.fillText("CDF = transfer curve", 290 + hw - 96, hy + 12);
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  }, []);
  _useEffect(() => { setTick(v => v + 1); draw(); }, [contrast, clip, seed]);

  const m = metricRef.current;
  const stage = (<canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />);

  const controls = (
    <ControlGroup>
      <Slider label="// SOURCE CONTRAST" min={0.12} max={0.9} step={0.02} value={contrast} onChange={setContrast}
        help="How washed-out the input is - the width of the band the source intensities are squeezed into. Lower = flatter, grayer image and a more dramatic equalization." />
      <Slider label="// CLIP LIMIT" min={0.2} max={1} step={0.05} value={clip} onChange={setClip}
        help="Contrast-limited equalization (CLAHE): clip tall histogram bins before building the CDF and spread the excess evenly. 1 = plain global equalization; lower clips harder, which avoids over-amplifying noise in flat regions." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setSeed(s => s + 1)} primary>RESAMPLE</DemoButton>
        <DemoButton onClick={() => { setContrast(0.35); setClip(1); }}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="CONTRAST BEFORE" value={m.before.toFixed(3)} accent="#60a5fa" />
        <StatReadout label="CONTRAST AFTER" value={m.after.toFixed(3)} accent="#a855f7" />
      </div>
      <Legend items={[
        { color: "#60a5fa", label: "histogram before" },
        { color: "#a855f7", label: "histogram after" },
        { color: "#34d399", label: "CDF transfer curve" },
      ]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        A washed-out image has all its pixels crammed into a narrow band of grays — its histogram is a
        tall, skinny spike. <b>Histogram equalization</b> fixes this by using the image's own
        <b> cumulative distribution</b> (the green CDF curve) as a <b>transfer function</b>: each input
        intensity is mapped to its percentile. Tones that are common get stretched apart (more contrast
        where it matters); tones that are rare get squeezed together. The output histogram comes out
        roughly <b>flat</b>, using the full range.
      </DemoP>
      <DemoP>
        Drop <b>source contrast</b> to see a grayer input get dramatically revived, and watch the after-
        histogram spread to fill the axis while the contrast readout jumps. Plain global equalization can
        over-amplify noise in flat areas, so lower the <b>clip limit</b> to apply <b>CLAHE</b> — it caps
        how tall any histogram bin can get before equalizing, trading a bit of contrast for a cleaner,
        less noisy result.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Histogram equalization is a staple of image preprocessing: it standardizes lighting before
        feature extraction and is routine in medical imaging (X-ray/CT), satellite and microscopy
        imagery, low-light photography, and thermal cameras. CLAHE specifically is the default contrast
        enhancer in OpenCV and shows up as a normalization step before
        <a href={`${window.__DM_BASE || "../../"}visualize/edge-detection/`}> edge detection</a> or feeding
        images to a CNN, so the model sees consistent contrast regardless of the capture conditions.
      </DemoP>
      <DemoP>
        The underlying trick — pushing a distribution through its own CDF to make it uniform — is the
        <b> probability integral transform</b>, the exact same identity behind inverse-transform sampling
        and quantile normalization in statistics and ML pipelines. It's a clean example of an
        information-preserving, monotonic remap: it never reorders pixel brightness, it just re-spaces it.
        The caveat is that it's global and can exaggerate noise, which is precisely why local, clip-limited
        variants exist.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      title="Histogram Equalization"
      subtitle="Push a washed-out image's tones through its own CDF to spread the contrast - plus CLAHE clipping to tame noise."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/advanced-cv/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="violet"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<HistogramEqualizationDemo />);
