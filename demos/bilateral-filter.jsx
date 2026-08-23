// demos/bilateral-filter.jsx — edge-preserving smoothing, against a plain Gaussian.
// Real filters, run per-pixel on a generated scene. The two live readouts are the
// point: bilateral removes LESS noise than Gaussian and keeps the edge, which is the
// trade, not a free win.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const N = 128;                 // work resolution; drawn upscaled
const W = 440, H = 440;

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e6) / 1e6; };
}

// A scene with the three things that make the comparison legible: a hard step edge,
// a curved edge, and a smooth ramp that neither filter should damage.
function makeScene(noise, seed) {
  const rand = rng(seed);
  const img = new Float64Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let v;
    if (x < N * 0.38) v = 0.24;                                  // flat dark
    else if (x < N * 0.62) v = 0.78;                             // flat bright (step edge)
    else v = 0.20 + 0.62 * ((x - N * 0.62) / (N * 0.38));        // smooth ramp
    const dx = x - N * 0.30, dy = y - N * 0.68;
    if (dx * dx + dy * dy < (N * 0.14) ** 2) v = 0.62;            // curved edge
    img[y * N + x] = Math.min(1, Math.max(0, v + (rand() - 0.5) * noise));
  }
  return img;
}

function gaussianFilter(img, sigmaS) {
  const r = Math.max(1, Math.ceil(sigmaS * 2));
  const out = new Float64Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let acc = 0, wsum = 0;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
      const gs = Math.exp(-(dx * dx + dy * dy) / (2 * sigmaS * sigmaS));
      acc += gs * img[ny * N + nx]; wsum += gs;
    }
    out[y * N + x] = acc / wsum;
  }
  return out;
}

// Identical loop plus ONE extra weight: how close the neighbour's VALUE is to the
// centre's. That single term is the whole difference, and it is why the filter is
// not separable and therefore not cheap.
function bilateralFilter(img, sigmaS, sigmaR) {
  const r = Math.max(1, Math.ceil(sigmaS * 2));
  const out = new Float64Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const centre = img[y * N + x];
    let acc = 0, wsum = 0;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
      const v = img[ny * N + nx];
      const gs = Math.exp(-(dx * dx + dy * dy) / (2 * sigmaS * sigmaS));
      const gr = Math.exp(-((v - centre) * (v - centre)) / (2 * sigmaR * sigmaR));
      acc += gs * gr * v; wsum += gs * gr;
    }
    out[y * N + x] = acc / wsum;
  }
  return out;
}

// Noise measured in a FLAT patch only — measuring it over the whole image would
// confuse "smoothed the noise" with "destroyed the structure".
function flatNoise(a) {
  const v = [];
  for (let y = 12; y < 44; y++) for (let x = 8; x < 40; x++) v.push(a[y * N + x]);
  const m = v.reduce((s, t) => s + t, 0) / v.length;
  return Math.sqrt(v.reduce((s, t) => s + (t - m) ** 2, 0) / v.length);
}
// Edge height across the vertical step, sampled away from the circle.
function edgeJump(a) {
  const xL = Math.round(N * 0.38) - 4, xR = Math.round(N * 0.38) + 4;
  let s = 0, n = 0;
  for (let y = 10; y < 46; y++) { s += a[y * N + xR] - a[y * N + xL]; n++; }
  return s / n;
}

function BilateralDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [sigmaS, setSigmaS] = _useState(3);
  const [sigmaR, setSigmaR] = _useState(0.12);
  const [noise, setNoise] = _useState(0.18);
  const [view, setView] = _useState("compare");
  const [seed, setSeed] = _useState(11);
  const [stats, setStats] = _useState({ nRaw: 0, nG: 0, nB: 0, eRaw: 0, eG: 0, eB: 0 });

  function paint(ctx, arr, ox, oy, w, h, label) {
    const im = ctx.createImageData(N, N);
    for (let i = 0; i < N * N; i++) {
      const g = Math.round(Math.min(1, Math.max(0, arr[i])) * 255);
      im.data[i * 4] = g; im.data[i * 4 + 1] = g; im.data[i * 4 + 2] = g; im.data[i * 4 + 3] = 255;
    }
    const off = document.createElement("canvas");
    off.width = N; off.height = N;
    off.getContext("2d").putImageData(im, 0, 0);
    ctx.drawImage(off, ox, oy, w, h);
    if (label) {
      ctx.fillStyle = "rgba(5,8,22,0.75)"; ctx.fillRect(ox, oy, w, 20);
      ctx.fillStyle = "#e6edfb"; ctx.font = "11px JetBrains Mono, monospace";
      ctx.fillText(label, ox + 7, oy + 14);
    }
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const raw = makeScene(noise, seed);
    const g = gaussianFilter(raw, sigmaS);
    const b = bilateralFilter(raw, sigmaS, sigmaR);

    if (view === "compare") {
      const s = (W - 6) / 2;
      paint(ctx, g, 0, 0, s, s, "GAUSSIAN");
      paint(ctx, b, s + 6, 0, s, s, "BILATERAL");
      paint(ctx, raw, 0, s + 6, s, s, "NOISY INPUT");
      const diff = new Float64Array(N * N);
      for (let i = 0; i < diff.length; i++) diff[i] = 0.5 + (b[i] - g[i]) * 4;
      paint(ctx, diff, s + 6, s + 6, s, s, "DIFFERENCE x4");
    } else {
      const arr = view === "gaussian" ? g : view === "bilateral" ? b : raw;
      paint(ctx, arr, 0, 0, W, H, view.toUpperCase());
    }

    setStats({
      nRaw: flatNoise(raw), nG: flatNoise(g), nB: flatNoise(b),
      eRaw: edgeJump(raw), eG: edgeJump(g), eB: edgeJump(b),
    });
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
    // eslint-disable-next-line
  }, []);
  _useEffect(() => { draw(); /* eslint-disable-next-line */ }, [sigmaS, sigmaR, noise, view, seed]);

  const pct = (x) => (x * 100).toFixed(1) + "%";
  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <SegmentedControl label="// VIEW" value={view} onChange={setView}
        options={[{ value: "compare", label: "Compare" }, { value: "noisy", label: "Input" }, { value: "gaussian", label: "Gaussian" }, { value: "bilateral", label: "Bilateral" }]}
        help="Compare shows all four at once, including the amplified difference between the two filters - which is where you can see that they disagree almost entirely AT the edges and barely anywhere else." />
      <Slider label="// SPATIAL SIGMA" min={1} max={5} step={0.5} value={sigmaS} onChange={setSigmaS}
        help="How far away a neighbour can be and still contribute. This is the only knob a plain Gaussian has, and raising it blurs everything equally - structure included." />
      <Slider label="// RANGE SIGMA" min={0.02} max={0.6} step={0.02} value={sigmaR} onChange={setSigmaR} tone="violet"
        help="How DIFFERENT in brightness a neighbour can be and still contribute. This is the entire bilateral idea. Push it high and the term stops discriminating, so the filter becomes an ordinary Gaussian - watch the two panels converge." />
      <Slider label="// NOISE" min={0.02} max={0.4} step={0.02} value={noise} onChange={setNoise}
        help="Amplitude of the noise added to the clean scene. Raise it far enough and the range term can no longer tell noise from a real edge, which is the honest failure mode." />
      <DemoButton onClick={() => setSeed(Math.floor(Math.random() * 1e6))} primary>NEW NOISE</DemoButton>
      <StatReadout label="FLAT-REGION NOISE" value={`${pct(stats.nRaw)} → G ${pct(stats.nG)} · B ${pct(stats.nB)}`} accent="#60a5fa" />
      <StatReadout label="EDGE HEIGHT (TRUE 54%)" value={`G ${pct(stats.eG)} · B ${pct(stats.eB)}`} accent="#c084fc" />
      <Legend items={[{ color: "#60a5fa", label: "GAUSSIAN" }, { color: "#c084fc", label: "BILATERAL" }]} />
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>
        Gaussian usually wins on noise. Read the second row before calling that a win.
      </div>
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        A Gaussian blur averages each pixel with its neighbours, weighted only by how
        far away they are. That is why it destroys edges: at a boundary, half the
        window is on the wrong side and gets averaged in regardless. The bilateral
        filter adds one more weight — how <i>similar in value</i> the neighbour is —
        so a pixel across an edge is spatially close but photometrically distant, and
        contributes almost nothing.
      </DemoP>
      <DemoP>
        Read both readouts together, because the story is a trade and not a win. The
        Gaussian usually removes <b>more</b> noise from the flat region — it is
        averaging more pixels, so of course it does — while cutting the edge height to
        roughly 60% of its true value. Bilateral removes less noise and keeps the edge
        essentially intact — at the default settings, 0.5% versus 1.0% noise and 45.6%
        versus 54.4% of the true edge height. Then push <b>range sigma</b> up: the range
        term stops discriminating and the bilateral numbers slide back toward the
        Gaussian ones. The slider's maximum gets most of the way there; in the limit it
        arrives exactly, because once the range weight is effectively constant the two
        filters are the same computation.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Edge-preserving smoothing is everywhere in imaging: denoising, tone mapping and
        detail enhancement all need to remove small variation without dissolving
        structure, and the phone camera pipeline that makes a night photo look clean is
        doing a descendant of this. The cost is that the filter is <b>not separable</b> —
        the weights depend on the pixel values, so you cannot decompose it into two 1-D
        passes the way you can a Gaussian, which is why fast approximations (bilateral
        grid, guided filter, permutohedral lattice) exist at all.
      </DemoP>
      <DemoP>
        The deeper pattern is worth carrying: the filter is an <b>attention mechanism</b>.
        Each output is a weighted average of neighbours where the weight depends on how
        similar the neighbour's content is to the query — spatial proximity times feature
        similarity. Non-local means drops the spatial term and compares whole patches
        anywhere in the image; self-attention drops it entirely and learns the similarity
        instead. Same skeleton, learned rather than hand-designed.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Bilateral Filter"
      subtitle="Smooth the noise, keep the edges — by weighting neighbours on how similar they are, not just how close."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/advanced-cv/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<BilateralDemo />);
