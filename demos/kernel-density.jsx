// demos/kernel-density.jsx — kernel density estimation (KDE) in 1D, live.
//
// KDE estimates a probability density without assuming a parametric form: drop a
// little kernel bump K on each data point and sum them,
//   f̂(x) = 1/(N h) · Σ_i K((x − x_i)/h).
// The bandwidth h is the whole story — it's a bias/variance knob: too small and
// the estimate is a spiky, high-variance mess that memorizes the sample; too
// large and neighboring modes blur into one oversmoothed, biased lump. We sample
// from a known bimodal mixture, draw the true density, the per-point kernels, and
// the summed estimate, and score the integrated squared error so you can hunt the
// sweet spot (and compare it to Silverman's rule-of-thumb bandwidth).

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, Toggle, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 560, H = 420;
const XMIN = -3.4, XMAX = 3.4;
const GRID = 280;

// true density: bimodal Gaussian mixture
const MIX = [
  { w: 0.6, mu: -1.15, sd: 0.5 },
  { w: 0.4, mu: 1.05, sd: 0.38 },
];
function trueDensity(x) {
  let p = 0;
  for (const c of MIX) { const z = (x - c.mu) / c.sd; p += c.w * Math.exp(-0.5 * z * z) / (c.sd * Math.sqrt(2 * Math.PI)); }
  return p;
}

function KDEDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [bw, setBw] = _useState(0.35);
  const [N, setN] = _useState(40);
  const [kernel, setKernel] = _useState("gaussian");
  const [showKernels, setShowKernels] = _useState(true);
  const [seed, setSeed] = _useState(1);
  const [, setTick] = _useState(0);
  const data = _useRef([]);

  function rng(s0) { let s = s0 >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function randn(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  function sample() {
    const r = rng(seed * 99277 + 5);
    const xs = [];
    for (let i = 0; i < N; i++) {
      let u = r(), c = u < MIX[0].w ? MIX[0] : MIX[1];
      xs.push(c.mu + randn(r) * c.sd);
    }
    data.current = xs;
    setTick(t => t + 1);
  }
  _useEffect(() => { sample(); /* eslint-disable-next-line */ }, [N, seed]);

  // kernel function K(u), unit-ish, integrates to 1
  function K(u) {
    if (kernel === "gaussian") return Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);
    if (kernel === "epanechnikov") return Math.abs(u) < 1 ? 0.75 * (1 - u * u) : 0;
    return Math.abs(u) < 1 ? 0.5 : 0; // box
  }

  function stdev(xs) {
    const m = xs.reduce((a, b) => a + b, 0) / xs.length;
    return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, xs.length - 1));
  }
  const silverman = () => {
    const xs = data.current; if (!xs.length) return 0.3;
    return 1.06 * stdev(xs) * Math.pow(xs.length, -1 / 5);
  };

  function kdeAt(x, h) {
    const xs = data.current; let s = 0;
    for (let i = 0; i < xs.length; i++) s += K((x - xs[i]) / h);
    return s / (xs.length * h);
  }

  // integrated squared error vs true density, on the grid
  function ise(h) {
    const dx = (XMAX - XMIN) / GRID; let e = 0;
    for (let g = 0; g <= GRID; g++) { const x = XMIN + g * dx; const d = kdeAt(x, h) - trueDensity(x); e += d * d * dx; }
    return e;
  }

  _useEffect(() => { draw(); });

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const xs = data.current; if (!xs.length) return;

    const padL = 16, padR = 16, padT = 30, padB = 40;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const PX = (x) => padL + ((x - XMIN) / (XMAX - XMIN)) * plotW;
    const baseY = padT + plotH;

    // y-scale: fit the taller of true peak and KDE peak
    let ymax = 0;
    const dx = (XMAX - XMIN) / GRID;
    const kde = new Array(GRID + 1), tru = new Array(GRID + 1);
    for (let g = 0; g <= GRID; g++) { const x = XMIN + g * dx; kde[g] = kdeAt(x, bw); tru[g] = trueDensity(x); ymax = Math.max(ymax, kde[g], tru[g]); }
    ymax = ymax * 1.12 || 1;
    const PY = (d) => baseY - (d / ymax) * plotH;

    // axis
    ctx.strokeStyle = "rgba(148,163,184,0.18)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, baseY); ctx.lineTo(W - padR, baseY); ctx.stroke();
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono";
    ctx.fillText("DENSITY ESTIMATE  ·  sum of per-point kernels vs the true distribution", padL, 20);

    // individual kernels (each contributes 1/(N h) K((x-xi)/h))
    if (showKernels) {
      ctx.strokeStyle = "rgba(96,165,250,0.30)"; ctx.lineWidth = 1;
      for (let i = 0; i < xs.length; i++) {
        ctx.beginPath();
        for (let g = 0; g <= 60; g++) {
          const x = xs[i] - 3.2 * bw + (6.4 * bw) * (g / 60);
          const y = PY(K((x - xs[i]) / bw) / (xs.length * bw));
          g ? ctx.lineTo(PX(x), y) : ctx.moveTo(PX(x), y);
        }
        ctx.stroke();
      }
    }

    // true density (green dashed)
    ctx.strokeStyle = "#34d399"; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath();
    for (let g = 0; g <= GRID; g++) { const x = XMIN + g * dx; g ? ctx.lineTo(PX(x), PY(tru[g])) : ctx.moveTo(PX(x), PY(tru[g])); }
    ctx.stroke(); ctx.setLineDash([]);

    // KDE estimate (violet, filled)
    ctx.beginPath();
    for (let g = 0; g <= GRID; g++) { const x = XMIN + g * dx; g ? ctx.lineTo(PX(x), PY(kde[g])) : ctx.moveTo(PX(x), PY(kde[g])); }
    ctx.lineTo(PX(XMAX), baseY); ctx.lineTo(PX(XMIN), baseY); ctx.closePath();
    ctx.fillStyle = "rgba(168,85,247,0.16)"; ctx.fill();
    ctx.beginPath();
    for (let g = 0; g <= GRID; g++) { const x = XMIN + g * dx; g ? ctx.lineTo(PX(x), PY(kde[g])) : ctx.moveTo(PX(x), PY(kde[g])); }
    ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 2.4; ctx.stroke();

    // data rug
    ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 1;
    for (let i = 0; i < xs.length; i++) { ctx.beginPath(); ctx.moveTo(PX(xs[i]), baseY); ctx.lineTo(PX(xs[i]), baseY + 8); ctx.stroke(); }
    ctx.fillStyle = "#64748b"; ctx.font = "10px JetBrains Mono"; ctx.fillText("data (rug)", padL, baseY + 26);
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  });

  const curISE = data.current.length ? ise(bw) : 0;
  const hSilver = silverman();
  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// BANDWIDTH  h" min={0.05} max={1.2} step={0.01} value={bw} onChange={setBw} tone="violet"
        help="Width of each kernel — the bias/variance dial. Small h = spiky, high-variance estimate that chases individual points; large h = smooth but biased, merging the two true modes into one. The whole art of KDE is choosing it." />
      <SegmentedControl label="// KERNEL" value={kernel} onChange={setKernel}
        options={[{ value: "gaussian", label: "Gaussian" }, { value: "epanechnikov", label: "Epanech." }, { value: "box", label: "Box" }]}
        help="Shape of the bump placed on each point. Gaussian is smooth and infinite-support; Epanechnikov is the theoretically efficiency-optimal compact kernel; Box is a moving histogram. The kernel matters far less than the bandwidth." />
      <Slider label="// SAMPLE SIZE  N" min={10} max={200} step={5} value={N} onChange={setN}
        help="Number of samples drawn from the true density. More data lets you safely shrink the bandwidth (lower variance), recovering finer structure." />
      <Toggle label="SHOW PER-POINT KERNELS" checked={showKernels} onChange={setShowKernels}
        help="Draw the individual kernel bump sitting on each data point. The violet curve is just their normalized sum." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setBw(+silverman().toFixed(2))} primary>AUTO (SILVERMAN)</DemoButton>
        <DemoButton onClick={() => setSeed(s => s + 1)}>RESAMPLE</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="ISE vs TRUTH" value={curISE.toFixed(4)} accent="#a855f7" />
        <StatReadout label="SILVERMAN h" value={hSilver.toFixed(2)} accent="#34d399" />
      </div>
      <Legend items={[
        { color: "#34d399", label: "true density" },
        { color: "#a855f7", label: "KDE estimate" },
        { color: "#60a5fa", label: "per-point kernel" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Every data point on the rug at the bottom gets a little blue kernel bump.
        Stack and normalize them and you get the purple curve — a smooth density
        estimate with no formula assumed about the shape. The green dashed line is
        the true bimodal distribution the points came from; the closer purple hugs
        it, the better (ISE is the integrated squared error between them). No means,
        no variances fit — just "put mass where the data is, and smear it by h."
      </DemoP>
      <DemoP>
        Now drag BANDWIDTH. Tiny h and the estimate fractures into a separate spike
        per point — pure variance, memorizing the sample. Large h and the two modes
        melt into one broad hump — pure bias, hiding real structure. The bias/variance
        tradeoff in its cleanest visual form. AUTO uses Silverman's rule (h ≈
        1.06·σ̂·N^−1/5), a decent default that assumes roughly Gaussian data — watch
        how it lands near, but not exactly at, the ISE-minimizing width. Add more
        samples and you can safely shrink h to recover finer detail.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Kernel density estimation is the nonparametric workhorse for "what does this
        distribution look like?" — the smooth, principled upgrade to a histogram
        (no arbitrary bin edges). It's the density-estimation cousin of nonparametric
        prediction like{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/knn/`} style={{ color: "#a855f7" }}>k-NN</a>,
        underlies kernel regression (Nadaraya-Watson), mean-shift clustering, and
        novelty/anomaly detection, and is the violin plot in every stats package.
        Where a{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/gmm/`} style={{ color: "#a855f7" }}>Gaussian mixture</a>{" "}
        assumes K blobs, KDE assumes nothing about the number of modes — it reads
        them off the data.
      </DemoP>
      <DemoP>
        Caveats: bandwidth selection is the entire game and the kernel choice barely
        matters; cross-validation or plug-in rules beat eyeballing. KDE struggles in
        high dimensions (the curse of dimensionality — you need exponentially more
        points), and it leaks probability mass past hard boundaries (e.g. a density
        that must be ≥ 0 gets nonzero estimate below zero). For bounded or heavy-tailed
        data you transform first or use boundary-corrected kernels. The bias/variance
        knob here is the same one behind{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/overfitting/`} style={{ color: "#a855f7" }}>overfitting</a>{" "}
        everywhere in ML.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Kernel Density Estimation"
      subtitle="Drop a kernel on every data point and sum them into a smooth, assumption-free density estimate. Drag the bandwidth to watch the bias/variance tradeoff play out: spiky overfitting at small h, oversmoothed bias at large h."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/unsupervised-learning/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<KDEDemo />);
