// demos/watershed.jsx — Marker-controlled watershed segmentation. A handful of
// overlapping blobs ("touching coins") are separated by flooding the inverted
// distance transform from automatically-placed markers (regional maxima of the
// distance map). Meyer's priority-queue flooding grows each basin; where two
// basins meet, a watershed line is drawn — the cut that splits touching objects.
// A SMOOTH knob controls marker count -> the classic over/under-segmentation lesson.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect, useMemo: _useMemo } = React;
const {
  DemoLayout, DemoP, Slider, SegmentedControl, DemoButton, StatReadout, ControlGroup, Legend, useIsMobile,
} = window;

const W = 176, H = 136, SCALE = 2.1, BGV = 0; // background marker label = 0

// deterministic RNG
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// build a foreground mask = union of several overlapping disks
function buildScene(seed) {
  const rand = rng(seed * 2654435761 + 11);
  const n = 4 + Math.floor(rand() * 3);   // 4..6 blobs
  const disks = [];
  for (let i = 0; i < n; i++) {
    disks.push({ cx: 34 + rand() * (W - 68), cy: 30 + rand() * (H - 60), r: 17 + rand() * 12 });
  }
  const mask = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    for (const d of disks) { const dx = x - d.cx, dy = y - d.cy; if (dx * dx + dy * dy <= d.r * d.r) { mask[y * W + x] = 1; break; } }
  }
  return { mask, disks };
}

// two-pass chamfer (3,4) distance transform, scaled to ~pixels (inside foreground)
function distanceTransform(mask) {
  const INF = 1e9, D = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) D[i] = mask[i] ? INF : 0;
  const rd = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 0 : D[y * W + x];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!mask[y * W + x]) continue;
    let v = D[y * W + x];
    v = Math.min(v, rd(x - 1, y) + 3, rd(x, y - 1) + 3, rd(x - 1, y - 1) + 4, rd(x + 1, y - 1) + 4);
    D[y * W + x] = v;
  }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
    if (!mask[y * W + x]) continue;
    let v = D[y * W + x];
    v = Math.min(v, rd(x + 1, y) + 3, rd(x, y + 1) + 3, rd(x + 1, y + 1) + 4, rd(x - 1, y + 1) + 4);
    D[y * W + x] = v;
  }
  for (let i = 0; i < W * H; i++) D[i] /= 3;   // back to ~pixel units
  return D;
}

function boxBlur(src, passes) {
  let a = Float32Array.from(src), b = new Float32Array(W * H);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let s = 0, c = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        s += a[yy * W + xx]; c++;
      }
      b[y * W + x] = s / c;
    }
    [a, b] = [b, a];
  }
  return a;
}

// minimal binary min-heap keyed by float priority
function makeHeap() {
  const idx = [], pri = [];
  const up = (i) => { while (i > 0) { const p = (i - 1) >> 1; if (pri[p] <= pri[i]) break; [pri[p], pri[i]] = [pri[i], pri[p]];[idx[p], idx[i]] = [idx[i], idx[p]]; i = p; } };
  const down = (i) => { const n = pri.length; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < n && pri[l] < pri[m]) m = l; if (r < n && pri[r] < pri[m]) m = r; if (m === i) break;[pri[m], pri[i]] = [pri[i], pri[m]];[idx[m], idx[i]] = [idx[i], idx[m]]; i = m; } };
  return {
    push(id, pr) { idx.push(id); pri.push(pr); up(pri.length - 1); },
    pop() { const id = idx[0], n = pri.length - 1;[idx[0], idx[n]] = [idx[n], idx[0]];[pri[0], pri[n]] = [pri[n], pri[0]]; idx.pop(); pri.pop(); if (pri.length) down(0); return id; },
    get size() { return pri.length; },
  };
}

// full marker-controlled watershed; returns final labels + the flood order for replay
function watershed(mask, blurPasses) {
  const D = distanceTransform(mask);
  const Ds = boxBlur(D, blurPasses);
  // markers = regional maxima of the smoothed distance (one+ per blob)
  const peakR = 2 + blurPasses;
  const isSeed = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x; if (!mask[p] || Ds[p] < 2) continue;
    let max = true;
    for (let dy = -peakR; dy <= peakR && max; dy++) for (let dx = -peakR; dx <= peakR; dx++) {
      const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      if (Ds[yy * W + xx] > Ds[p] + 1e-4) { max = false; break; }
    }
    if (max) isSeed[p] = 1;
  }
  // label connected seed components (8-conn) -> basin ids 1..k ; background = 0
  const labels = new Int16Array(W * H).fill(-1);   // -1 unlabeled, -2 watershed, >=0 basin
  for (let i = 0; i < W * H; i++) if (!mask[i]) labels[i] = 0; // background basin
  let next = 1;
  const stack = [];
  for (let p = 0; p < W * H; p++) {
    if (!isSeed[p] || labels[p] >= 1) continue;
    const id = next++; labels[p] = id; stack.length = 0; stack.push(p);
    while (stack.length) {
      const q = stack.pop(), qx = q % W, qy = (q / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = qx + dx, yy = qy + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const r = yy * W + xx; if (isSeed[r] && labels[r] === -1) { labels[r] = id; stack.push(r); }
      }
    }
  }
  const basins = next - 1;
  // flood the surface Hs = -Ds (deep basins at blob centers). Meyer priority queue.
  const Hs = new Float32Array(W * H); for (let i = 0; i < W * H; i++) Hs[i] = -Ds[i];
  const heap = makeHeap(), inq = new Uint8Array(W * H);
  const order = [];                 // pixels in the sequence they get assigned (for replay)
  const pushNbrs = (p) => {
    const px = p % W, py = (p / W) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const xx = px + dx, yy = py + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const r = yy * W + xx; if (labels[r] === -1 && !inq[r]) { inq[r] = 1; heap.push(r, Hs[r]); }
    }
  };
  for (let p = 0; p < W * H; p++) if (labels[p] >= 0) pushNbrs(p);
  while (heap.size) {
    const p = heap.pop(); if (labels[p] !== -1) continue;
    const px = p % W, py = (p / W) | 0;
    let found = -1, water = false;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const xx = px + dx, yy = py + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const lab = labels[yy * W + xx];
      if (lab >= 0) { if (found === -1) found = lab; else if (lab !== found) water = true; }
    }
    labels[p] = water ? -2 : (found === -1 ? -1 : found);
    if (labels[p] !== -1) { order.push(p); if (!water) pushNbrs(p); }
  }
  // distinct hue per basin (background stays neutral)
  const hues = []; for (let i = 0; i <= basins; i++) hues.push((i * 67) % 360);
  return { D, Ds, labels, order, basins, hues };
}

function hsl(h, s, l) { return `hsl(${h},${s}%,${l}%)`; }

function WatershedDemo() {
  const cvRef = _useRef(null);
  const mobile = useIsMobile ? useIsMobile() : false;

  const [seed, setSeed] = _useState(3);
  const [blur, setBlur] = _useState(2);
  const [view, setView] = _useState("regions");
  const [playing, setPlaying] = _useState(true);

  const scene = _useMemo(() => buildScene(seed), [seed]);
  const ws = _useMemo(() => watershed(scene.mask, blur), [scene, blur]);

  // animation pointer through the flood order
  const progRef = _useRef(0);
  const [done, setDone] = _useState(false);
  _useEffect(() => { progRef.current = 0; setDone(false); }, [ws, view]);

  _useEffect(() => {
    const ctx = cvRef.current.getContext("2d");
    let raf;
    const { mask, D, Ds, labels, order, hues } = ws;
    let dmax = 1e-6; for (let i = 0; i < W * H; i++) if (D[i] > dmax) dmax = D[i];

    function paint() {
      const im = ctx.createImageData(W, H); const d = im.data;
      const prog = progRef.current;
      for (let p = 0; p < W * H; p++) {
        let r = 5, g = 6, b = 14;
        if (view === "blobs") {
          const v = mask[p] ? 200 : 18; r = g = b = v;
        } else if (view === "distance") {
          if (mask[p]) { const t = Ds[p] / (dmax + 1e-6); const c = `hsl(${260 - t * 200},80%,${20 + t * 45}%)`; [r, g, b] = parseHsl(c); }
          else { r = 5; g = 6; b = 14; }
        } else { // regions: dim blob backdrop, reveal assigned pixels up to prog
          if (mask[p]) { r = 26; g = 28; b = 38; }
          const lab = labels[p];
          // seeds (>=1) always visible; flood pixels appear once revealed
          // (we reveal by replaying `order`, so check a revealed flag below)
        }
        d[p * 4] = r; d[p * 4 + 1] = g; d[p * 4 + 2] = b; d[p * 4 + 3] = 255;
      }
      if (view === "regions") {
        // seeds first (so basins are visible before flooding fills)
        for (let p = 0; p < W * H; p++) {
          const lab = labels[p];
          if (lab >= 1) paintLab(d, p, hues[lab], 55);
          else if (lab === 0 && !mask[p]) { /* background stays dark */ }
        }
        const lim = Math.min(prog, order.length);
        for (let k = 0; k < lim; k++) {
          const p = order[k]; const lab = labels[p];
          if (lab === -2) { d[p * 4] = 235; d[p * 4 + 1] = 240; d[p * 4 + 2] = 255; }
          else if (lab >= 1) paintLab(d, p, hues[lab], 45);
          else if (lab === 0) { d[p * 4] = 14; d[p * 4 + 1] = 16; d[p * 4 + 2] = 24; }
        }
        // always draw the final watershed lines once done for crispness
        if (prog >= order.length) {
          for (let p = 0; p < W * H; p++) if (labels[p] === -2) { d[p * 4] = 235; d[p * 4 + 1] = 240; d[p * 4 + 2] = 255; }
        }
      }
      ctx.putImageData(im, 0, 0);
    }

    function frame() {
      if (view === "regions" && playing && progRef.current < ws.order.length) {
        progRef.current = Math.min(ws.order.length, progRef.current + Math.max(120, Math.floor(ws.order.length / 90)));
        if (progRef.current >= ws.order.length && !done) setDone(true);
      }
      paint();
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [ws, view, playing, done]);

  const regionCount = ws.basins;

  const stage = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <span className="t-mono-s" style={{ color: "var(--muted)" }}>
        {view === "blobs" ? "TOUCHING OBJECTS (binary mask)" : view === "distance" ? "DISTANCE TRANSFORM (flood surface)" : "WATERSHED BASINS + RIDGE LINES"}
      </span>
      <canvas ref={cvRef} width={W} height={H}
        style={{ width: W * (mobile ? 1.5 : SCALE), height: H * (mobile ? 1.5 : SCALE), imageRendering: "pixelated", borderRadius: 4, border: "1px solid var(--border)", background: "#05060f" }} />
      <span className="t-mono-s" style={{ color: "var(--dim)", fontSize: 9 }}>
        {view === "regions" ? "white = watershed line (the cut between touching objects)" : "markers = regional maxima of the distance map"}
      </span>
    </div>
  );

  const controls = (
    <ControlGroup>
      <SegmentedControl label="// VIEW" value={view} onChange={setView} tone="violet"
        options={[{ label: "Regions", value: "regions" }, { label: "Distance", value: "distance" }, { label: "Blobs", value: "blobs" }]}
        help="Blobs = the binary objects (some overlapping). Distance = the smoothed distance-to-background that becomes the flood surface. Regions = the animated watershed result." />
      <DemoButton onClick={() => setPlaying(p => !p)} tone="violet" primary>{playing ? "PAUSE" : "PLAY"}</DemoButton>
      <DemoButton onClick={() => setSeed(s => s + 1)} tone="blue">RESEED SCENE</DemoButton>
      <Slider label="// SMOOTH (markers)" min={0} max={5} step={1} value={blur} onChange={setBlur} tone="blue"
        help="Blur applied to the distance map before finding marker peaks. Low = many spurious maxima -> OVER-segmentation (one object split into pieces). High = peaks merge -> UNDER-segmentation (touching objects fused). The sweet spot gives one marker per object." />
      <StatReadout label="REGIONS FOUND" value={regionCount} accent="var(--violet-lt)" />
      <StatReadout label="FLOOD" value={done ? "complete" : "rising..."} accent={done ? "var(--blue-lt)" : "var(--violet-lt)"} />
      <Legend items={[{ label: "basin (one object)", color: "#a855f7" }, { label: "watershed line", color: "#eef2ff" }]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Watershed treats an image as a <b>topographic surface</b> and floods it.
        Here the objects overlap, so a simple threshold would glue them into one
        blob. The trick is to flood the <b>distance transform</b> instead: every
        foreground pixel is colored by how far it sits from the background, so each
        object's center becomes a deep basin and the thin necks where objects touch
        become high ridges. Switch to the <b>Distance</b> view to see that surface.
      </DemoP>
      <DemoP>
        We drop a <b>marker</b> in each basin (the regional maxima of the distance
        map) and let water rise from them simultaneously — Meyer's priority flooding
        always fills the lowest unflooded pixel next. When two rising basins are
        about to merge, a <b>dam</b> is built: that's the white <b>watershed line</b>,
        exactly the cut that separates touching objects. Now tune <b>SMOOTH</b>:
        too little and noise spawns extra markers (<b>over-segmentation</b>, objects
        shatter); too much and markers merge (<b>under-segmentation</b>, objects fuse).
        Choosing good markers is the whole game.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Marker-controlled watershed is a classic <b>segmentation</b> workhorse —
        separating touching cells under a microscope, counting coins or grains,
        splitting overlapping objects before measurement. Its famous weakness,
        over-segmentation from noisy gradients, is exactly why the marker-controlled
        variant shown here exists: you constrain the flood with seeds instead of
        flooding every local minimum. The flood surface is built from the same image
        gradients as <a href={`${window.__DM_BASE || "../../"}visualize/edge-detection/`}>edge detection</a>,
        and the distance-map version generalizes that to "distance to a boundary."
      </DemoP>
      <DemoP>
        The deeper idea — grow regions from seeds and cut where they collide — recurs
        across graph cuts, region growing, and superpixels (SLIC), and modern instance
        segmentation networks (Mask R-CNN and friends) learn the same object-vs-object
        boundaries that watershed draws by hand. It also rhymes with
        <a href={`${window.__DM_BASE || "../../"}visualize/dbscan/`}> density clustering</a>:
        both expand connected regions and leave the thin low-density seams between
        clusters as the natural boundary.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      title="Watershed Segmentation"
      subtitle="Separate touching objects by flooding the distance transform from markers and damming where basins meet — the classic marker-controlled watershed."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="violet"
    />
  );
}

// helpers used inside paint
function parseHsl(str) {
  // "hsl(h,s%,l%)" -> [r,g,b]
  const m = /hsl\(([-\d.]+),([\d.]+)%,([\d.]+)%\)/.exec(str);
  let h = +m[1], s = +m[2] / 100, l = +m[3] / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), mm = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x]; else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
  return [Math.round((r + mm) * 255), Math.round((g + mm) * 255), Math.round((b + mm) * 255)];
}
function paintLab(d, p, hue, light) {
  const [r, g, b] = parseHsl(`hsl(${hue},70%,${light}%)`);
  d[p * 4] = r; d[p * 4 + 1] = g; d[p * 4 + 2] = b;
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<WatershedDemo />);
