// demos/template-matching.jsx — find a known patch by sliding-window matching.
// A grayscale image hides several copies of a small template under noise and a
// brightness shift; slide the template everywhere and score each location with
// SSD (sum of squared differences) or NCC (normalized cross-correlation). NCC
// subtracts the mean and divides by the norm, so it ignores brightness/contrast
// while SSD does not. Peaks of the score map = detections. Real correlation maps.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 380, IW = 60, IH = 40, TS = 9; // image + template size
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function gauss(rng) { let u = 0, v = 0; while (u === 0) u = rng(); while (v === 0) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

// the template motif: a bright cross on dark
function makeTemplate() {
  const t = Array.from({ length: TS }, () => new Array(TS).fill(0.15)), c = (TS - 1) / 2;
  for (let i = 0; i < TS; i++) { t[c][i] = 0.9; t[i][c] = 0.9; }
  t[c - 1][c] = t[c + 1][c] = t[c][c - 1] = t[c][c + 1] = 1.0;
  return t;
}

function makeImage(seed, noise, bright, nTargets) {
  const rng = mulberry32(seed), img = Array.from({ length: IH }, () => new Array(IW).fill(0));
  for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) img[y][x] = 0.35 + gauss(rng) * 0.08; // textured background
  const T = makeTemplate(), locs = [];
  for (let k = 0; k < nTargets; k++) {
    const px = 4 + Math.floor(rng() * (IW - TS - 8)), py = 4 + Math.floor(rng() * (IH - TS - 8));
    for (let dy = 0; dy < TS; dy++) for (let dx = 0; dx < TS; dx++) img[py + dy][px + dx] = T[dy][dx];
    locs.push([px + (TS - 1) / 2, py + (TS - 1) / 2]);
  }
  // global brightness shift + noise (NCC should survive the brightness shift; SSD won't)
  for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) img[y][x] = Math.max(0, Math.min(1, img[y][x] * (1 + bright) + gauss(rng) * noise));
  return { img, locs };
}

function scoreMap(img, T, method) {
  const map = Array.from({ length: IH }, () => new Array(IW).fill(method === "ncc" ? -1 : Infinity));
  let tMean = 0; for (let i = 0; i < TS; i++) for (let j = 0; j < TS; j++) tMean += T[i][j]; tMean /= TS * TS;
  let tNorm = 0; for (let i = 0; i < TS; i++) for (let j = 0; j < TS; j++) tNorm += (T[i][j] - tMean) ** 2; tNorm = Math.sqrt(tNorm) || 1e-6;
  for (let y = 0; y <= IH - TS; y++) for (let x = 0; x <= IW - TS; x++) {
    if (method === "ssd") {
      let s = 0; for (let i = 0; i < TS; i++) for (let j = 0; j < TS; j++) { const d = img[y + i][x + j] - T[i][j]; s += d * d; }
      map[y + (TS - 1) / 2][x + (TS - 1) / 2] = s;
    } else {
      let iMean = 0; for (let i = 0; i < TS; i++) for (let j = 0; j < TS; j++) iMean += img[y + i][x + j]; iMean /= TS * TS;
      let num = 0, iN = 0; for (let i = 0; i < TS; i++) for (let j = 0; j < TS; j++) { const a = img[y + i][x + j] - iMean, b = T[i][j] - tMean; num += a * b; iN += a * a; }
      map[y + (TS - 1) / 2][x + (TS - 1) / 2] = num / (Math.sqrt(iN) * tNorm + 1e-9);
    }
  }
  return map;
}
function peaks(map, method, k) {
  const cand = []; const better = method === "ncc" ? (a, b) => a > b : (a, b) => a < b;
  for (let y = 2; y < IH - 2; y++) for (let x = 2; x < IW - 2; x++) {
    const v = map[y][x]; if (!isFinite(v)) continue; let isMax = true;
    for (let dy = -2; dy <= 2 && isMax; dy++) for (let dx = -2; dx <= 2; dx++) { if (better(map[y + dy][x + dx], v)) { isMax = false; break; } }
    if (isMax) cand.push([x, y, v]);
  }
  cand.sort((a, b) => method === "ncc" ? b[2] - a[2] : a[2] - b[2]);
  return cand.slice(0, k);
}

function TemplateMatchingDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [method, setMethod] = _useState("ncc");
  const [noise, setNoise] = _useState(0.06);
  const [bright, setBright] = _useState(0.3);
  const [nTargets, setNTargets] = _useState(3);
  const [seed, setSeed] = _useState(2);
  const [, setTick] = _useState(0);
  const metricRef = _useRef({ found: 0, total: 0 });

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const { img, locs } = makeImage(seed, noise, bright, nTargets), T = makeTemplate();
    const map = scoreMap(img, T, method), pk = peaks(map, method, nTargets);
    const px = 4.2, py = 4.2, ix = 30, iy = 50, mx = 290, my = 50;
    // image panel
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px JetBrains Mono, monospace"; ctx.textAlign = "left"; ctx.fillText("IMAGE + detections", ix, 42);
    for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) { const g = Math.round(img[y][x] * 255); ctx.fillStyle = `rgb(${g},${g},${g})`; ctx.fillRect(ix + x * px, iy + y * py, px + 0.5, py + 0.5); }
    // ground-truth (faint green) + detections (boxes)
    for (const [lx, ly] of locs) { ctx.strokeStyle = "rgba(52,211,153,0.4)"; ctx.lineWidth = 1; ctx.strokeRect(ix + (lx - TS / 2) * px, iy + (ly - TS / 2) * py, TS * px, TS * py); }
    let found = 0;
    pk.forEach(([cx, cy], i) => {
      const ok = locs.some(([lx, ly]) => Math.abs(lx - cx) < 3 && Math.abs(ly - cy) < 3); if (ok) found++;
      ctx.strokeStyle = ok ? "#34d399" : "#f87171"; ctx.lineWidth = 1.8; ctx.strokeRect(ix + (cx - TS / 2) * px, iy + (cy - TS / 2) * py, TS * px, TS * py);
    });
    metricRef.current = { found, total: nTargets };
    // score map panel
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillText(method === "ncc" ? "NCC score map" : "SSD score map (inverted)", mx, 42);
    let lo = Infinity, hi = -Infinity; for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) { const v = map[y][x]; if (isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }
    for (let y = 0; y < IH; y++) for (let x = 0; x < IW; x++) { let v = map[y][x]; if (!isFinite(v)) { ctx.fillStyle = "#05070d"; } else { let t = (v - lo) / (hi - lo + 1e-9); if (method === "ssd") t = 1 - t; ctx.fillStyle = `rgb(${Math.round(20 + t * 40)},${Math.round(30 + t * 135)},${Math.round(60 + t * 195)})`; } ctx.fillRect(mx + x * px, my + y * py, px + 0.5, py + 0.5); }
    // template preview
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillText("template", ix, 322); const ts = 8;
    for (let i = 0; i < TS; i++) for (let j = 0; j < TS; j++) { const g = Math.round(T[i][j] * 255); ctx.fillStyle = `rgb(${g},${g},${g})`; ctx.fillRect(ix + j * ts, 328 + i * ts, ts, ts); }
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  }, []);
  _useEffect(() => { setTick(v => v + 1); draw(); }, [method, noise, bright, nTargets, seed]);

  const m = metricRef.current;
  const stage = (<canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />);

  const controls = (
    <ControlGroup>
      <SegmentedControl label="// SCORE" value={method} onChange={setMethod}
        options={[{ value: "ncc", label: "NCC" }, { value: "ssd", label: "SSD" }]}
        help="How each window is scored. SSD = sum of squared pixel differences (sensitive to brightness/contrast). NCC = normalized cross-correlation (subtracts the mean, divides by the norm) so it matches the PATTERN regardless of brightness - turn the brightness shift up and watch SSD fail while NCC holds." />
      <Slider label="// BRIGHTNESS SHIFT" min={-0.4} max={0.6} step={0.05} value={bright} onChange={setBright}
        help="A global brightness/contrast change applied to the whole image. NCC is invariant to it; SSD treats a brighter copy of the template as a poor match." />
      <Slider label="// NOISE" min={0} max={0.2} step={0.01} value={noise} onChange={setNoise}
        help="Pixel noise added to the image. Both scores degrade with noise, but matching survives moderate amounts because it integrates over the whole patch." />
      <Slider label="// TARGETS" min={1} max={5} step={1} value={nTargets} onChange={setNTargets}
        help="How many copies of the template are hidden in the image (faint green = ground truth). The top peaks of the score map are reported as detections." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setSeed(s => s + 1)} primary>RESAMPLE</DemoButton>
        <DemoButton onClick={() => { setMethod("ncc"); setBright(0.3); setNoise(0.06); setNTargets(3); }}>RESET</DemoButton>
      </div>
      <StatReadout label="DETECTED" value={`${m.found} / ${m.total}`} accent={m.found === m.total ? "#34d399" : "#fb923c"} />
      <Legend items={[
        { color: "#34d399", label: "correct detection" },
        { color: "#f87171", label: "false peak" },
        { color: "#3b82f6", label: "high match score" },
      ]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        The simplest way to find a known thing in an image: slide a <b>template</b> over every position
        and score how well it matches. <b>SSD</b> sums squared pixel differences — fast, but it treats a
        brighter or darker copy of the template as a bad match. <b>NCC</b> first subtracts each window's
        mean and divides by its norm, so it compares the <i>shape</i> of the intensities, not their
        absolute level — making it invariant to brightness and contrast.
      </DemoP>
      <DemoP>
        Crank the <b>brightness shift</b> with SSD selected and watch detections collapse; switch to
        <b> NCC</b> and they snap back. The right panel is the score map — bright spots are strong
        matches, and its peaks (after non-max suppression) become the detections (green = correct, red =
        false). The catch you can feel: template matching only finds the pattern at the <i>same scale and
        rotation</i> — tilt or resize the target and it fails, which is exactly the limitation that
        motivated scale- and rotation-invariant features.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Template matching (a.k.a. cross-correlation) is one of the oldest and still most-used tools in
        vision: OCR, manufacturing defect/QA inspection, medical landmark localization, GUI test
        automation, and the "find this icon on screen" of RPA all run NCC under the hood. It's literally a
        <a href={`${window.__DM_BASE || "../../"}visualize/convolution/`}> convolution</a> with the
        template as the kernel — which is why the first layers of a CNN can be read as <i>learned</i>
        template matchers, and why correlation is the workhorse of tracking and stereo matching.
      </DemoP>
      <DemoP>
        Its brittleness to scale and rotation is the whole reason the field moved to invariant local
        features (<a href={`${window.__DM_BASE || "../../"}visualize/harris-corners/`}>corners</a>,
        SIFT/ORB descriptors) and then to deep features that learn invariances from data. But for a rigid,
        fixed-scale target under controlled lighting, NCC is still the fastest, most reliable answer — a
        reminder that the simplest classical tool often wins when its assumptions hold.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      title="Template Matching (NCC)"
      subtitle="Slide a template over an image and score every position - and see why normalized correlation beats raw differences under a brightness change."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/advanced-cv/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="violet"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<TemplateMatchingDemo />);
