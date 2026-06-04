// demos/harris-corners.jsx — the Harris corner detector. Gradients -> structure
// tensor (Gaussian-windowed products) -> corner response R = det(M) - k*tr(M)^2
// -> threshold + non-max suppression. A corner is where BOTH eigenvalues of the
// local gradient covariance are large (intensity changes in two directions).

const { useRef: _useRef, useState: _useState, useEffect: _useEffect, useMemo: _useMemo } = React;
const {
  DemoLayout, DemoP, Slider, SegmentedControl, StatReadout, ControlGroup, Legend, useIsMobile,
} = window;

const W = 180, H = 150, SCALE = 2;
const at = (x, y) => Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x));

// build a grayscale scene rich in corners: a checkerboard patch + a rotated
// square + a triangle (lots of clean L-junctions to detect)
function buildGray() {
  const off = document.createElement("canvas"); off.width = W; off.height = H;
  const c = off.getContext("2d");
  const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#202020"); g.addColorStop(1, "#5a5a5a");
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // checkerboard block
  const cs = 15;
  for (let r = 0; r < 4; r++) for (let cc = 0; cc < 4; cc++) {
    c.fillStyle = (r + cc) % 2 ? "#f2f2f2" : "#0d0d0d";
    c.fillRect(16 + cc * cs, 22 + r * cs, cs, cs);
  }
  // rotated square
  c.save(); c.translate(132, 50); c.rotate(0.5); c.fillStyle = "#efefef"; c.fillRect(-22, -22, 44, 44); c.restore();
  // triangle
  c.fillStyle = "#101010"; c.beginPath(); c.moveTo(60, 138); c.lineTo(120, 138); c.lineTo(90, 92); c.closePath(); c.fill();
  const img = c.getImageData(0, 0, W, H).data;
  const gray = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) gray[i] = (0.299 * img[i * 4] + 0.587 * img[i * 4 + 1] + 0.114 * img[i * 4 + 2]) / 255;
  return gray;
}

function gaussBlur(src, sigma) {
  const r = Math.max(1, Math.ceil(sigma * 2.5));
  const k = []; let ks = 0;
  for (let i = -r; i <= r; i++) { const w = Math.exp(-(i * i) / (2 * sigma * sigma)); k.push(w); ks += w; }
  for (let i = 0; i < k.length; i++) k[i] /= ks;
  const tmp = new Float32Array(W * H), out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let a = 0; for (let i = -r; i <= r; i++) a += src[at(x + i, y)] * k[i + r]; tmp[y * W + x] = a; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let a = 0; for (let i = -r; i <= r; i++) a += tmp[at(x, y + i)] * k[i + r]; out[y * W + x] = a; }
  return out;
}

function HarrisDemo() {
  const srcRef = _useRef(null);
  const respRef = _useRef(null);
  const mobile = useIsMobile ? useIsMobile() : false;

  const [k, setK] = _useState(0.05);
  const [thr, setThr] = _useState(12);     // percent of max response
  const [sigma, setSigma] = _useState(1.4); // structure-tensor window
  const [view, setView] = _useState("response");

  const gray = _useMemo(() => buildGray(), []);

  const { response, corners, maxR } = _useMemo(() => {
    // Sobel gradients
    const Ix = new Float32Array(W * H), Iy = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const tl = gray[at(x - 1, y - 1)], tc = gray[at(x, y - 1)], tr = gray[at(x + 1, y - 1)];
      const ml = gray[at(x - 1, y)], mr = gray[at(x + 1, y)];
      const bl = gray[at(x - 1, y + 1)], bc = gray[at(x, y + 1)], br = gray[at(x + 1, y + 1)];
      Ix[y * W + x] = (tr + 2 * mr + br) - (tl + 2 * ml + bl);
      Iy[y * W + x] = (bl + 2 * bc + br) - (tl + 2 * tc + tr);
    }
    // products, then Gaussian-window them -> structure tensor entries
    const Ixx = new Float32Array(W * H), Iyy = new Float32Array(W * H), Ixy = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) { Ixx[i] = Ix[i] * Ix[i]; Iyy[i] = Iy[i] * Iy[i]; Ixy[i] = Ix[i] * Iy[i]; }
    const Sxx = gaussBlur(Ixx, sigma), Syy = gaussBlur(Iyy, sigma), Sxy = gaussBlur(Ixy, sigma);
    // Harris response R = det(M) - k*trace(M)^2
    const response = new Float32Array(W * H); let maxR = 1e-9;
    for (let i = 0; i < W * H; i++) {
      const det = Sxx[i] * Syy[i] - Sxy[i] * Sxy[i];
      const trace = Sxx[i] + Syy[i];
      const R = det - k * trace * trace;
      response[i] = R; if (R > maxR) maxR = R;
    }
    // threshold + 3x3 non-max suppression -> corner list
    const t = (thr / 100) * maxR;
    const corners = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const v = response[y * W + x];
      if (v < t) continue;
      let isMax = true;
      for (let dy = -1; dy <= 1 && isMax; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (response[(y + dy) * W + (x + dx)] > v) { isMax = false; break; }
      }
      if (isMax) corners.push([x, y]);
    }
    return { response, corners, maxR };
  }, [gray, k, thr, sigma]);

  // left canvas: grayscale image + corner markers
  _useEffect(() => {
    const c = srcRef.current.getContext("2d");
    const im = c.createImageData(W, H);
    for (let i = 0; i < W * H; i++) { const v = gray[i] * 255; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
    c.putImageData(im, 0, 0);
    c.strokeStyle = "rgba(168,85,247,0.95)"; c.lineWidth = 1;
    for (const [x, y] of corners) { c.beginPath(); c.arc(x, y, 3.2, 0, Math.PI * 2); c.stroke(); }
  }, [gray, corners]);

  // right canvas: response heatmap (signed: corners hot, edges cold)
  _useEffect(() => {
    const c = respRef.current.getContext("2d");
    const im = c.createImageData(W, H); const d = im.data;
    for (let i = 0; i < W * H; i++) {
      const R = response[i] / maxR;          // ~ -something .. 1
      let r = 0, g = 0, b = 0;
      if (view === "response") {
        if (R > 0) { const v = Math.pow(R, 0.5); r = 60 + v * 195; g = v * 90; b = 40 + v * 120; } // corner = violet/white hot
        else { const v = Math.min(1, -R * 4); b = 40 + v * 120; r = v * 20; }                       // edge = blue cold
      } else { // gradient magnitude-ish (trace) view not needed; keep response
        const v = Math.max(0, Math.pow(Math.max(0, R), 0.5)); r = g = b = v * 255;
      }
      d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255;
    }
    c.putImageData(im, 0, 0);
    if (view === "response") {
      c.strokeStyle = "rgba(255,255,255,0.9)"; c.lineWidth = 0.8;
      for (const [x, y] of corners) c.strokeRect(x - 2, y - 2, 5, 5);
    }
  }, [response, maxR, corners, view]);

  const stage = (
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center", alignItems: "flex-start" }}>
      {[["IMAGE + CORNERS", srcRef], ["HARRIS RESPONSE R", respRef]].map(([label, ref]) => (
        <div key={label} style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
          <span className="t-mono-s" style={{ color: "var(--muted)" }}>{label}</span>
          <canvas ref={ref} width={W} height={H}
            style={{ width: W * (mobile ? 1.5 : SCALE), height: H * (mobile ? 1.5 : SCALE), imageRendering: "pixelated", borderRadius: 4, border: "1px solid var(--border)", background: "#000" }} />
        </div>
      ))}
    </div>
  );

  const controls = (
    <ControlGroup>
      <Slider label="// SENSITIVITY k" min={0.02} max={0.12} step={0.005} value={k} onChange={setK} tone="violet"
        help="The Harris constant in R = det(M) - k*trace(M)^2. Smaller k makes the detector fire more easily (more corners, including weak ones); larger k is stricter. Classic range is 0.04-0.06." />
      <Slider label="// RESPONSE THRESHOLD" min={1} max={40} step={1} value={thr} onChange={setThr} suffix="%" tone="blue"
        help="Keep only corners whose response R exceeds this percent of the maximum. Lower it to detect fainter corners; raise it to keep only the sharpest." />
      <Slider label="// WINDOW sigma" min={0.8} max={3} step={0.1} value={sigma} onChange={setSigma} tone="violet"
        help="Size of the Gaussian window that sums gradient products into the structure tensor. Larger windows are more robust to noise but blur nearby corners together." />
      <SegmentedControl label="// RIGHT VIEW" value={view} onChange={setView} tone="blue"
        options={[{ value: "response", label: "Signed R" }, { value: "mag", label: "Corner heat" }]}
        help="Signed R colors corners hot (violet/white) and edges cold (blue) — showing why Harris separates the two; Corner heat shows only the positive corner response." />
      <StatReadout label="CORNERS FOUND" value={corners.length} accent="var(--violet-lt)" />
      <Legend items={[
        { label: "corner", color: "#a855f7" },
        { label: "edge (R<0)", color: "#3b82f6" },
      ]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        A good feature point to track is a <b>corner</b> — a spot where the image
        looks different no matter which way you nudge the window. Harris measures
        this with the <b>structure tensor</b> M: at each pixel it sums the gradient
        products (I<sub>x</sub>², I<sub>y</sub>², I<sub>x</sub>I<sub>y</sub>) over a
        small Gaussian window. The two eigenvalues of M say how much the intensity
        changes in the two principal directions.
      </DemoP>
      <DemoP>
        <b>Flat</b> regions → both eigenvalues tiny. An <b>edge</b> → one large, one
        small (you can slide along the edge without change). A <b>corner</b> → both
        large. The response R = det(M) − k·trace(M)² is a cheap eigenvalue-free way
        to find that "both large" case: it's positive at corners, negative at edges,
        near zero on flat areas. The right panel paints corners hot and edges cold so
        you can see the separation directly. Tune <b>k</b> and the <b>threshold</b>
        and watch the checkerboard's L-junctions light up.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Corners are the workhorse <i>keypoints</i> of classical vision: they're what
        you track across video frames (optical flow), match between two photos to
        stitch a panorama or estimate camera motion (structure-from-motion, SLAM),
        and calibrate cameras with a checkerboard.
        Harris reads straight out of the same Sobel gradients used in
        <a href={`${window.__DM_BASE || "../../"}visualize/edge-detection/`}> edge detection</a> —
        corners are just where edges of two orientations meet.
      </DemoP>
      <DemoP>
        The structure tensor's eigen-analysis is the same "how much does it vary, and
        in which directions" question that
        <a href={`${window.__DM_BASE || "../../"}visualize/pca/`}> PCA</a> asks of a data
        cloud — here applied to a tiny window of gradients. Modern detectors (SIFT,
        ORB, FAST) refine the idea with scale and rotation invariance, and deep
        networks now learn keypoints end-to-end, but they all chase the same target
        Harris defined: distinctive, repeatable, well-localized points.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      topic="COMPUTER VISION"
      title="Harris Corner Detector"
      subtitle="A corner is where intensity changes in two directions at once — find them from the eigenvalues of the local gradient structure tensor."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="violet"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<HarrisDemo />);
