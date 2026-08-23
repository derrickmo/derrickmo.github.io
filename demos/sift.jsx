// demos/sift.jsx — the full SIFT pipeline on a synthetic scene whose transform is
// known exactly, so every match can be scored right or wrong. Scale space, DoG
// extrema, edge rejection, orientation assignment, the 128-D descriptor, and Lowe's
// ratio test — with the orientation step switchable, because that is what buys
// rotation invariance and the demo should be able to prove it rather than claim it.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const TAU = Math.PI * 2;
const SZ = 130, W = 470, H = 470;

function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e6) / 1e6; }; }

function gkernel(sigma) {
  const r = Math.max(1, Math.ceil(sigma * 3)), k = new Float64Array(2 * r + 1);
  let s = 0;
  for (let i = -r; i <= r; i++) { const v = Math.exp(-(i * i) / (2 * sigma * sigma)); k[i + r] = v; s += v; }
  for (let i = 0; i < k.length; i++) k[i] /= s;
  return { k, r };
}
function blur(img, w, h, sigma) {
  const { k, r } = gkernel(sigma);
  const t = new Float64Array(w * h), o = new Float64Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let a = 0;
    for (let i = -r; i <= r; i++) a += k[i + r] * img[y * w + Math.min(w - 1, Math.max(0, x + i))];
    t[y * w + x] = a;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let a = 0;
    for (let i = -r; i <= r; i++) a += k[i + r] * t[Math.min(h - 1, Math.max(0, y + i)) * w + x];
    o[y * w + x] = a;
  }
  return o;
}

// DoG is a BLOB detector. A scene of a few large flat rectangles gives it almost
// nothing to fire on, so the scene is a field of blobs at assorted radii and
// polarities, which is what makes different levels of the scale space respond.
const BLOBS = [
  [-38, 6, 4, 0.92], [-24, -18, 6, 0.22], [-10, 14, 3, 0.95], [4, -30, 7, 0.28],
  [16, 10, 5, 0.90], [30, -8, 4, 0.20], [-6, -6, 8, 0.75], [26, 28, 6, 0.35],
  [-34, 30, 5, 0.85], [8, 34, 3, 0.25], [40, 22, 4, 0.93], [-18, 40, 6, 0.30],
  [36, -34, 5, 0.88], [-44, -14, 3, 0.24], [20, -20, 3, 0.96],
];

// Shapes live in a canonical frame and are sampled through the INVERSE transform, so
// the same physical points exist in every rendering and ground truth is exact.
function scene(rotDeg, scl, noise) {
  const img = new Float64Array(SZ * SZ), rand = rng(5);
  for (let i = 0; i < img.length; i++) img[i] = 0.12 + rand() * noise;
  const rot = (rotDeg * Math.PI) / 180, cs = Math.cos(-rot), sn = Math.sin(-rot), c = SZ / 2;
  for (let y = 0; y < SZ; y++) for (let x = 0; x < SZ; x++) {
    const ux = ((x - c) * cs - (y - c) * sn) / scl, uy = ((x - c) * sn + (y - c) * cs) / scl;
    let v = null;
    for (const [bx, by, br, bv] of BLOBS) if (Math.hypot(ux - bx, uy - by) < br) v = bv;
    if (ux > -46 && ux < -30 && uy > -46 && uy < -30) v = 0.88;
    if (v != null) img[y * SZ + x] = v;
  }
  return img;
}

function detect(img, contrast, edgeR) {
  const nScales = 7, s0 = 1.6, kf = Math.SQRT2;
  const scales = [], sigmas = [];
  for (let i = 0; i < nScales; i++) { const sg = s0 * Math.pow(kf, i); sigmas.push(sg); scales.push(blur(img, SZ, SZ, sg)); }
  const dog = [];
  for (let i = 0; i < nScales - 1; i++) {
    const d = new Float64Array(SZ * SZ);
    for (let j = 0; j < d.length; j++) d[j] = scales[i + 1][j] - scales[i][j];
    dog.push(d);
  }
  const kps = [];
  let rejectedEdge = 0, rejectedContrast = 0;
  for (let l = 1; l < dog.length - 1; l++) {
    for (let y = 6; y < SZ - 6; y++) for (let x = 6; x < SZ - 6; x++) {
      const v = dog[l][y * SZ + x];
      let isMax = true, isMin = true;
      for (let dl = -1; dl <= 1 && (isMax || isMin); dl++)
        for (let dy = -1; dy <= 1 && (isMax || isMin); dy++)
          for (let dx = -1; dx <= 1; dx++) {
            if (!dl && !dy && !dx) continue;
            const u = dog[l + dl][(y + dy) * SZ + x + dx];
            if (u >= v) isMax = false;
            if (u <= v) isMin = false;
          }
      if (!isMax && !isMin) continue;
      if (Math.abs(v) < contrast) { rejectedContrast++; continue; }
      // A ridge has one large and one small principal curvature. Those points slide
      // ALONG the edge between frames, so they are rejected however strong they look.
      const D = dog[l];
      const dxx = D[y * SZ + x + 1] + D[y * SZ + x - 1] - 2 * v;
      const dyy = D[(y + 1) * SZ + x] + D[(y - 1) * SZ + x] - 2 * v;
      const dxy = (D[(y + 1) * SZ + x + 1] - D[(y + 1) * SZ + x - 1] - D[(y - 1) * SZ + x + 1] + D[(y - 1) * SZ + x - 1]) / 4;
      const tr = dxx + dyy, det = dxx * dyy - dxy * dxy;
      if (det <= 0 || (tr * tr) / det > ((edgeR + 1) ** 2) / edgeR) { rejectedEdge++; continue; }
      kps.push({ x, y, sigma: sigmas[l] });
    }
  }
  return { kps, dog, rejectedEdge, rejectedContrast };
}

function gradients(img) {
  const mag = new Float64Array(SZ * SZ), ang = new Float64Array(SZ * SZ);
  for (let y = 1; y < SZ - 1; y++) for (let x = 1; x < SZ - 1; x++) {
    const gx = img[y * SZ + x + 1] - img[y * SZ + x - 1];
    const gy = img[(y + 1) * SZ + x] - img[(y - 1) * SZ + x];
    mag[y * SZ + x] = Math.hypot(gx, gy);
    ang[y * SZ + x] = Math.atan2(gy, gx);
  }
  return { mag, ang };
}
function orientation(mag, ang, kp) {
  const r = Math.round(3 * kp.sigma), hist = new Float64Array(36);
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const x = kp.x + dx, y = kp.y + dy;
    if (x < 1 || y < 1 || x >= SZ - 1 || y >= SZ - 1) continue;
    const wgt = Math.exp(-(dx * dx + dy * dy) / (2 * (1.5 * kp.sigma) ** 2));
    let b = Math.floor(((ang[y * SZ + x] + Math.PI) / TAU) * 36) % 36;
    if (b < 0) b += 36;
    hist[b] += wgt * mag[y * SZ + x];
  }
  let best = 0;
  for (let i = 1; i < 36; i++) if (hist[i] > hist[best]) best = i;
  return ((best + 0.5) / 36) * TAU - Math.PI;
}
function descriptor(mag, ang, kp, theta, useOrientation) {
  const rot = useOrientation ? theta : 0;
  const cos = Math.cos(-rot), sin = Math.sin(-rot), scale = kp.sigma * 3;
  const desc = new Float64Array(128), span = Math.round(scale * 2);
  for (let dy = -span; dy <= span; dy++) for (let dx = -span; dx <= span; dx++) {
    const x = kp.x + dx, y = kp.y + dy;
    if (x < 1 || y < 1 || x >= SZ - 1 || y >= SZ - 1) continue;
    const rx = (dx * cos - dy * sin) / scale, ry = (dx * sin + dy * cos) / scale;
    if (Math.abs(rx) >= 2 || Math.abs(ry) >= 2) continue;
    const cx = Math.min(3, Math.max(0, Math.floor(rx + 2))), cy = Math.min(3, Math.max(0, Math.floor(ry + 2)));
    let a = ang[y * SZ + x] - rot;
    while (a < -Math.PI) a += TAU;
    while (a >= Math.PI) a -= TAU;
    const b = Math.min(7, Math.max(0, Math.floor(((a + Math.PI) / TAU) * 8)));
    desc[(cy * 4 + cx) * 8 + b] += Math.exp(-(rx * rx + ry * ry) / 8) * mag[y * SZ + x];
  }
  // normalise, clip at 0.2, renormalise: the clip stops a handful of huge gradients
  // dominating, which is what makes the descriptor tolerant of illumination change.
  let n = Math.hypot(...desc) || 1;
  for (let i = 0; i < 128; i++) desc[i] = Math.min(desc[i] / n, 0.2);
  n = Math.hypot(...desc) || 1;
  for (let i = 0; i < 128; i++) desc[i] /= n;
  return desc;
}
function features(img, useOrientation, contrast, edgeR) {
  const det = detect(img, contrast, edgeR);
  const { mag, ang } = gradients(img);
  return {
    ...det,
    feats: det.kps.map((kp) => {
      const th = orientation(mag, ang, kp);
      return { ...kp, theta: th, desc: descriptor(mag, ang, kp, th, useOrientation) };
    }),
  };
}
function match(a, b, ratio) {
  const out = [];
  for (let i = 0; i < a.length; i++) {
    let b1 = Infinity, b2 = Infinity, bi = -1;
    for (let j = 0; j < b.length; j++) {
      let d = 0;
      for (let k = 0; k < 128; k++) { const t = a[i].desc[k] - b[j].desc[k]; d += t * t; }
      if (d < b1) { b2 = b1; b1 = d; bi = j; } else if (d < b2) b2 = d;
    }
    if (bi >= 0 && (ratio >= 1 || b1 < ratio * ratio * b2)) out.push({ i, j: bi });
  }
  return out;
}

function SiftDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [rot, setRot] = _useState(45);
  const [scl, setScl] = _useState(1);
  const [ratio, setRatio] = _useState(0.8);
  const [useOri, setUseOri] = _useState("yes");
  const [edgeR, setEdgeR] = _useState(10);
  const [stats, setStats] = _useState({ ka: 0, kb: 0, m: 0, prec: 0, rejEdge: 0 });

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const A = scene(0, 1, 0.05), B = scene(rot, scl, 0.05);
    const ori = useOri === "yes";
    const fa = features(A, ori, 0.004, edgeR), fb = features(B, ori, 0.004, edgeR);
    const ms = match(fa.feats, fb.feats, ratio);

    const panel = 210, cell = panel / SZ, gap = 30, oxB = panel + gap;
    const paint = (img, ox) => {
      const im = ctx.createImageData(SZ, SZ);
      for (let i = 0; i < SZ * SZ; i++) {
        const g = Math.round(Math.min(1, Math.max(0, img[i])) * 255);
        im.data[i * 4] = g; im.data[i * 4 + 1] = g; im.data[i * 4 + 2] = g; im.data[i * 4 + 3] = 255;
      }
      const off = document.createElement("canvas");
      off.width = SZ; off.height = SZ; off.getContext("2d").putImageData(im, 0, 0);
      ctx.drawImage(off, ox, 22, panel, panel);
    };
    paint(A, 0); paint(B, oxB);

    const drawKp = (kp, ox, color) => {
      const px = ox + kp.x * cell, py = 22 + kp.y * cell, r = Math.max(3, kp.sigma * cell * 1.6);
      ctx.strokeStyle = color; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.stroke();
      // the tick is the assigned orientation - the frame the descriptor is read in
      ctx.beginPath(); ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(kp.theta) * r, py + Math.sin(kp.theta) * r); ctx.stroke();
    };
    fa.feats.forEach((k) => drawKp(k, 0, "rgba(96,165,250,0.75)"));
    fb.feats.forEach((k) => drawKp(k, oxB, "rgba(96,165,250,0.75)"));

    // ground truth is exact, because we generated the transform
    const rr = (rot * Math.PI) / 180, cs = Math.cos(rr), sn = Math.sin(rr), c = SZ / 2;
    let ok = 0;
    for (const m of ms) {
      const a = fa.feats[m.i], b = fb.feats[m.j];
      const ux = (a.x - c) * scl, uy = (a.y - c) * scl;
      const ex = c + ux * cs - uy * sn, ey = c + ux * sn + uy * cs;
      const good = Math.hypot(b.x - ex, b.y - ey) < 6;
      if (good) ok++;
      ctx.strokeStyle = good ? "rgba(52,211,153,0.85)" : "rgba(248,113,113,0.85)";
      ctx.lineWidth = good ? 1.4 : 1;
      ctx.beginPath();
      ctx.moveTo(a.x * cell, 22 + a.y * cell);
      ctx.lineTo(oxB + b.x * cell, 22 + b.y * cell);
      ctx.stroke();
    }

    ctx.fillStyle = "#e6edfb"; ctx.font = "11px JetBrains Mono, monospace";
    ctx.fillText("REFERENCE", 0, 14);
    ctx.fillText(`ROTATED ${rot}°  SCALED ${scl.toFixed(2)}x`, oxB, 14);
    const ty = 22 + panel + 26;
    ctx.font = "12px JetBrains Mono, monospace";
    ctx.fillStyle = "#8fa3c8";
    ctx.fillText(`${ms.length} matches survived the ratio test`, 0, ty);
    ctx.fillStyle = "#34d399";
    ctx.fillText(`${ok} correct`, 0, ty + 20);
    ctx.fillStyle = "#f87171";
    ctx.fillText(`${ms.length - ok} wrong`, 110, ty + 20);
    ctx.fillStyle = "#8fa3c8"; ctx.font = "10px JetBrains Mono, monospace";
    ctx.fillText("circle radius = the SCALE the keypoint was found at · tick = its orientation", 0, ty + 44);
    ctx.fillText("a match is correct if it lands within 6px of where the known transform sends it", 0, ty + 60);

    setStats({ ka: fa.feats.length, kb: fb.feats.length, m: ms.length,
               prec: ms.length ? ok / ms.length : 0, rejEdge: fa.rejectedEdge });
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
    // eslint-disable-next-line
  }, []);
  _useEffect(() => { draw(); /* eslint-disable-next-line */ }, [rot, scl, ratio, useOri, edgeR]);

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// ROTATION (deg)" min={0} max={180} step={5} value={rot} onChange={setRot}
        help="Rotate the second image. With orientation normalisation on, matching barely notices; turn it off and this slider destroys the descriptor." />
      <Slider label="// SCALE" min={0.7} max={1.6} step={0.05} value={scl} onChange={setScl}
        help="Resize the second image. Scale invariance comes from a different mechanism - searching the scale space and describing each keypoint in units of ITS OWN sigma - so it survives whether or not orientation is on." />
      <SegmentedControl label="// ORIENTATION NORMALISATION" value={useOri} onChange={setUseOri}
        options={[{ value: "yes", label: "On" }, { value: "no", label: "Off" }]}
        help="Whether the descriptor is read in a frame rotated to the keypoint's own dominant gradient direction. This one switch IS rotation invariance - at 45 degrees it is the difference between essentially every match being right and most being wrong." />
      <Slider label="// LOWE RATIO" min={0.5} max={1} step={0.05} value={ratio} onChange={setRatio}
        help="Keep a match only if the best descriptor distance is closer than this fraction of the SECOND best. It is a distinctiveness test rather than a distance threshold, which is why it works when no absolute cutoff does. 1.0 disables it." />
      <Slider label="// EDGE THRESHOLD (r)" min={2} max={30} value={edgeR} onChange={setEdgeR}
        help="Reject keypoints whose curvature ratio exceeds this - points lying along an edge rather than at a blob. They look strong but slide along the edge between frames, so keeping them adds unreliable matches." />
      <StatReadout label="KEYPOINTS" value={`${stats.ka} / ${stats.kb}`} accent="#60a5fa" />
      <StatReadout label="MATCHES KEPT" value={String(stats.m)} accent="#c084fc" />
      <StatReadout label="PRECISION" value={`${(stats.prec * 100).toFixed(0)}%`} accent="#34d399" />
      <StatReadout label="REJECTED AS EDGES" value={String(stats.rejEdge)} accent="#fbbf24" />
      <Legend items={[{ color: "#34d399", label: "CORRECT" }, { color: "#f87171", label: "WRONG" }, { color: "#60a5fa", label: "KEYPOINT" }]} />
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>
        Set rotation to 45 and toggle orientation normalisation.
      </div>
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        SIFT answers a question that sounds impossible: find the same physical point in
        two images taken at different sizes and angles, without knowing the
        transformation. It does it in four steps — search a <b>scale space</b> of
        progressively blurred copies for blob-like extrema, throw away the ones lying
        along edges, give each survivor an <b>orientation</b> from its own dominant
        gradient direction, and describe the patch around it in a frame aligned to that
        orientation and sized by its own scale.
      </DemoP>
      <DemoP>
        The two invariances come from two different places, and the demo separates them.
        <b> Scale</b> invariance comes from the search itself: a keypoint is found at the
        blur level where it looks most blob-like, and the descriptor is measured in units
        of that sigma. <b>Rotation</b> invariance comes entirely from the orientation
        step. Set rotation to 45° and toggle it: with normalisation on, essentially every
        surviving match is correct; with it off, most are wrong. One switch, and the
        method stops working.
      </DemoP>
      <DemoP>
        The last slider is the part people underrate. Lowe's <b>ratio test</b> keeps a
        match only if the nearest descriptor is much closer than the second nearest — a
        test of <i>distinctiveness</i>, not of distance, because a good absolute
        threshold does not exist. Drive it at 45° and the cliff sits in one place: at
        0.7 and 0.8 <b>every</b> kept match is correct, and by 0.9 precision has already
        collapsed to about a third — which is exactly what you get with the test switched
        off entirely, where all 22 keypoints find a partner and roughly a third are
        right. The test is doing all of its work in that narrow band, which is why the
        paper's 0.8 has survived twenty-five years.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        SIFT is the reason a decade of vision worked. Panorama stitching, structure from
        motion, visual SLAM and image retrieval all rest on finding correspondences
        between views, and RANSAC (next door in this catalogue) is what turns those noisy
        correspondences into a geometric model. The two together — a distinctive local
        descriptor plus robust fitting — were the pipeline.
      </DemoP>
      <DemoP>
        Learned features displaced it for recognition, but the ideas did not go away. The
        scale-space search is what feature pyramids do; the local-patch-with-orientation
        idea reappears in learned descriptors like SuperPoint; and the ratio test is
        still the standard way to filter learned matches too. For geometric tasks with
        little training data, classical keypoints remain competitive, which is why they
        are still in production systems rather than only in textbooks.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="SIFT"
      subtitle="Find the same point in two images at different scale and angle — and see exactly which step buys which invariance."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/advanced-cv/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<SiftDemo />);
