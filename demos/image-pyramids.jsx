// demos/image-pyramids.jsx — Gaussian and Laplacian pyramids, and what happens when
// you skip the blur. Real Burt-Adelson construction; the reconstruction error and the
// storage ratio are computed live rather than asserted.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const N = 128, W = 460, H = 460;

// 5-tap binomial kernel, applied separably. A Gaussian IS separable, which is why a
// pyramid is cheap and why the bilateral filter next door is not.
const K = [1 / 16, 4 / 16, 6 / 16, 4 / 16, 1 / 16];

function blur(img, w, h) {
  const tmp = new Float64Array(w * h), out = new Float64Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let a = 0;
    for (let k = -2; k <= 2; k++) a += K[k + 2] * img[y * w + Math.min(w - 1, Math.max(0, x + k))];
    tmp[y * w + x] = a;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let a = 0;
    for (let k = -2; k <= 2; k++) a += K[k + 2] * tmp[Math.min(h - 1, Math.max(0, y + k)) * w + x];
    out[y * w + x] = a;
  }
  return out;
}

function subsample(img, w, h) {
  const w2 = w >> 1, h2 = h >> 1, out = new Float64Array(w2 * h2);
  for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) out[y * w2 + x] = img[(y * 2) * w + x * 2];
  return { img: out, w: w2, h: h2 };
}
const reduce = (p, preblur) => subsample(preblur ? blur(p.img, p.w, p.h) : p.img, p.w, p.h);

// Zero-insert then blur, times 4 — three of every four new samples are zero, so
// without the factor the image loses three quarters of its brightness each level.
function expand(p, tw, th) {
  const up = new Float64Array(tw * th);
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    const ty = y * 2, tx = x * 2;
    if (ty < th && tx < tw) up[ty * tw + tx] = p.img[y * p.w + x] * 4;
  }
  return blur(up, tw, th);
}

// A smooth blob (low frequency) plus a fine stripe field (right at the Nyquist
// danger zone). The stripes are the bait: they are what aliases.
function makeScene(stripePeriod) {
  const img = new Float64Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = x - 40, dy = y - 42;
    img[y * N + x] = 0.5 + 0.32 * Math.exp(-(dx * dx + dy * dy) / 700);
  }
  for (let y = 68; y < N; y++) for (let x = 68; x < N; x++)
    img[y * N + x] = (x % stripePeriod < stripePeriod / 2) ? 0.88 : 0.14;
  return { img, w: N, h: N };
}

function PyramidDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [levels, setLevels] = _useState(4);
  const [period, setPeriod] = _useState(4);
  const [preblur, setPreblur] = _useState("yes");
  const [view, setView] = _useState("gaussian");
  const [stats, setStats] = _useState({ err: 0, ratio: 0, aliasNaive: 0, aliasBlur: 0 });

  function paint(ctx, p, ox, oy, w, h, label, amplify) {
    const im = ctx.createImageData(p.w, p.h);
    for (let i = 0; i < p.w * p.h; i++) {
      const v = amplify ? 0.5 + p.img[i] * 4 : p.img[i];
      const g = Math.round(Math.min(1, Math.max(0, v)) * 255);
      im.data[i * 4] = g; im.data[i * 4 + 1] = g; im.data[i * 4 + 2] = g; im.data[i * 4 + 3] = 255;
    }
    const off = document.createElement("canvas");
    off.width = p.w; off.height = p.h;
    off.getContext("2d").putImageData(im, 0, 0);
    ctx.imageSmoothingEnabled = false;      // show the pixels honestly, not a resample
    ctx.drawImage(off, ox, oy, w, h);
    if (label) {
      ctx.fillStyle = "rgba(5,8,22,0.8)"; ctx.fillRect(ox, oy, Math.min(w, 96), 17);
      ctx.fillStyle = "#e6edfb"; ctx.font = "10px JetBrains Mono, monospace";
      ctx.fillText(label, ox + 5, oy + 12);
    }
    ctx.strokeStyle = "rgba(148,163,184,0.35)"; ctx.lineWidth = 1;
    ctx.strokeRect(ox + 0.5, oy + 0.5, w, h);
  }

  const regionStd = (p) => {
    const v = [];
    const x0 = Math.floor(p.w * 0.55), y0 = Math.floor(p.h * 0.55);
    for (let y = y0; y < p.h; y++) for (let x = x0; x < p.w; x++) v.push(p.img[y * p.w + x]);
    if (!v.length) return 0;
    const m = v.reduce((s, t) => s + t, 0) / v.length;
    return Math.sqrt(v.reduce((s, t) => s + (t - m) ** 2, 0) / v.length);
  };

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const base = makeScene(period);
    const usePreblur = preblur === "yes";

    const gauss = [base];
    for (let i = 0; i < levels; i++) gauss.push(reduce(gauss[gauss.length - 1], usePreblur));

    const lap = [];
    for (let i = 0; i < gauss.length - 1; i++) {
      const cur = gauss[i], up = expand(gauss[i + 1], cur.w, cur.h);
      const d = new Float64Array(cur.w * cur.h);
      for (let j = 0; j < d.length; j++) d[j] = cur.img[j] - up[j];
      lap.push({ img: d, w: cur.w, h: cur.h });
    }

    // Reconstruct from the coarsest level plus the stored differences.
    let cur = gauss[gauss.length - 1];
    for (let i = lap.length - 1; i >= 0; i--) {
      const L = lap[i], up = expand(cur, L.w, L.h);
      const o = new Float64Array(L.w * L.h);
      for (let j = 0; j < o.length; j++) o[j] = up[j] + L.img[j];
      cur = { img: o, w: L.w, h: L.h };
    }
    let err = 0;
    for (let i = 0; i < base.img.length; i++) err = Math.max(err, Math.abs(cur.img[i] - base.img[i]));

    if (view === "compare") {
      // Same level, built both ways, side by side.
      let a = base, b = base;
      for (let i = 0; i < levels; i++) { a = reduce(a, true); b = reduce(b, false); }
      const s = Math.min(200, W / 2 - 10);
      paint(ctx, a, 8, 40, s, s, `BLUR + DROP  ${a.w}px`);
      paint(ctx, b, W / 2 + 2, 40, s, s, `DROP ONLY  ${b.w}px`);
      paint(ctx, base, 8, 40 + s + 22, s, s, `ORIGINAL  ${N}px`);
      ctx.fillStyle = "#e6edfb"; ctx.font = "12px JetBrains Mono, monospace";
      ctx.fillText("The right panel keeps a stripe pattern that is not really there.", 8, 26);
    } else {
      const stack = view === "gaussian" ? gauss : lap;
      let x = 8, y = 34;
      ctx.fillStyle = "#e6edfb"; ctx.font = "12px JetBrains Mono, monospace";
      ctx.fillText(view === "gaussian" ? "GAUSSIAN PYRAMID — each level half the size" : "LAPLACIAN PYRAMID — what each level ADDS (x4)", 8, 22);
      for (let i = 0; i < stack.length; i++) {
        const size = Math.max(24, 232 / Math.pow(1.55, i));
        paint(ctx, stack[i], x, y, size, size, `L${i} ${stack[i].w}px`, view === "laplacian");
        x += size + 10;
        if (x > W - 40) { x = 8; y += 250; }
      }
    }

    const naive = (() => { let p = base; for (let i = 0; i < levels; i++) p = reduce(p, false); return p; })();
    const blurred = (() => { let p = base; for (let i = 0; i < levels; i++) p = reduce(p, true); return p; })();
    const total = gauss.reduce((s, g) => s + g.w * g.h, 0);
    setStats({
      err, ratio: total / (N * N),
      aliasNaive: regionStd(naive), aliasBlur: regionStd(blurred),
    });
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
    // eslint-disable-next-line
  }, []);
  _useEffect(() => { draw(); /* eslint-disable-next-line */ }, [levels, period, preblur, view]);

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <SegmentedControl label="// VIEW" value={view} onChange={setView}
        options={[{ value: "gaussian", label: "Gaussian" }, { value: "laplacian", label: "Laplacian" }, { value: "compare", label: "Aliasing" }]}
        help="Gaussian shows each level at half the size. Laplacian shows what each level ADDS back, amplified 4x - mostly zero, which is why it compresses. Aliasing puts blur-then-drop beside drop-only at the same level." />
      <Slider label="// LEVELS" min={1} max={5} value={levels} onChange={setLevels}
        help="How many times to halve. Each level costs a quarter of the one before, so the whole pyramid converges to 4/3 of the original however deep you go - the readout computes it rather than assuming it." />
      <Slider label="// STRIPE PERIOD (px)" min={2} max={16} step={2} value={period} onChange={setPeriod} tone="violet"
        help="Width of the fine pattern in the lower-right. Below about 4px it is near the sampling limit, which is where dropping pixels without blurring turns it into a coarser pattern that was never in the scene." />
      <SegmentedControl label="// PRE-BLUR BEFORE DROPPING" value={preblur} onChange={setPreblur}
        options={[{ value: "yes", label: "Blur first" }, { value: "no", label: "Just drop" }]}
        help="The entire difference between a pyramid and a mistake. Blurring removes the frequencies the smaller grid cannot represent; without it they fold down and masquerade as low frequencies." />
      <StatReadout label="RECONSTRUCTION ERROR" value={stats.err < 1e-12 ? "0 (exact)" : stats.err.toExponential(2)} accent="#34d399" />
      <StatReadout label="PYRAMID STORAGE" value={`${stats.ratio.toFixed(3)}x original`} accent="#60a5fa" />
      <StatReadout label="FINE-DETAIL CONTRAST" value={`blur ${stats.aliasBlur.toFixed(3)} · drop ${stats.aliasNaive.toFixed(3)}`} accent="#c084fc" />
      <Legend items={[{ color: "#34d399", label: "LOSSLESS" }, { color: "#c084fc", label: "ALIASED" }]} />
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>
        Higher "drop" contrast is not more detail — it is a pattern that is not in the scene.
      </div>
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        A Gaussian pyramid is the same image at halving resolutions, and the construction
        has exactly two steps: blur, then drop every other pixel. The blur is not
        cosmetic. A grid half the size cannot represent the finest frequencies in the
        original, and if you leave them in they do not vanish — they <i>fold down</i> and
        reappear as a coarser pattern that was never in the scene. Switch <b>pre-blur</b>
        off and watch the stripes turn into something wider and, misleadingly, more
        contrasty.
      </DemoP>
      <DemoP>
        That last part is the trap worth remembering. Naive downsampling can raise the
        measured contrast of a region — the readout shows it — so "sharper" is not
        evidence of "better". A period-4 stripe sampled every second pixel becomes a
        period-2 stripe at full amplitude: a confident, high-contrast lie.
      </DemoP>
      <DemoP>
        The Laplacian pyramid stores what each level <i>adds back</i> — the difference
        between a level and its upsampled coarser neighbour. Those differences are almost
        all zero (that is why the view is amplified 4x to be visible at all), which is
        what makes it compressible, and stacking them back up reconstructs the original
        to machine precision. The whole pyramid costs about 4/3 of the original, not
        double, because a quarter plus a sixteenth plus… converges.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Multi-scale representation is how classical vision handled the fact that objects
        appear at unknown size: SIFT searches for keypoints across pyramid levels so a
        feature found on a small object matches the same feature on a large one, and
        sliding-window detectors ran the same fixed-size window over every level rather
        than resizing the window. Laplacian pyramids also give the classic seamless image
        blend — blend each frequency band with a differently-sized mask and the join
        disappears.
      </DemoP>
      <DemoP>
        The idea survived into deep learning almost unchanged. A CNN's stride and pooling
        build a pyramid implicitly, <b>feature pyramid networks</b> add the top-down path
        and lateral connections that make the coarse, semantic levels usable at fine
        resolution, and U-Net's skip connections are the same move for segmentation. The
        aliasing lesson survived too: strided downsampling in CNNs aliases for exactly the
        reason shown here, which is why anti-aliased downsampling measurably improves
        shift-consistency.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Image Pyramids"
      subtitle="Blur, then halve — and see what goes wrong when you skip the blur."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/advanced-cv/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<PyramidDemo />);
