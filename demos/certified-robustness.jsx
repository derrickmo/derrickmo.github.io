// demos/certified-robustness.jsx — randomized smoothing (Cohen et al. 2019).
// Wrap a base classifier in Gaussian noise: the SMOOTHED classifier returns the
// class the base net predicts most often under N(0, sigma^2). For a point with
// top-class vote fraction pA > 1/2, the prediction is PROVABLY unchanged within a
// certified radius R = sigma * Phi^-1(pA). This is the provable-guarantee
// counterpart to the empirical FGSM/PGD attack. Real trained MLP + real Monte-
// Carlo smoothing + exact certified radius.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 380, NH = 10, R = 2.2;
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function gauss(rng) { let u = 0, v = 0; while (u === 0) u = rng(); while (v === 0) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const tanh = Math.tanh;
// inverse standard-normal CDF (Acklam's rational approximation)
function probit(p) {
  if (p <= 0) return -6; if (p >= 1) return 6;
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  const pl = 0.02425;
  let q, r;
  if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - pl) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  q = p - 0.5; r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

function makeData(rng) {
  const pts = [];
  for (let i = 0; i < 140; i++) { const t = rng() * Math.PI, up = i % 2; let x, y, lab; if (up) { x = Math.cos(t) - 0.5; y = Math.sin(t) - 0.25; lab = 0; } else { x = Math.cos(t) + 0.5; y = -Math.sin(t) + 0.25; lab = 1; } x += gauss(rng) * 0.12; y += gauss(rng) * 0.12; pts.push({ x: [x, y], y: lab }); }
  return pts;
}

function CertifiedRobustnessDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rngRef = _useRef(mulberry32(4));
  const dataRef = _useRef([]);
  const netRef = _useRef(null);
  const srcRef = _useRef([0.0, 0.4]);
  const resRef = _useRef(null);
  const sampleRef = _useRef([]);

  const [sigma, setSigma] = _useState(0.35);
  const [nSamp, setNSamp] = _useState(300);
  const [seed, setSeed] = _useState(4);
  const [, setTick] = _useState(0);

  const sigRef = _useRef(sigma), nRef = _useRef(nSamp);
  _useEffect(() => { sigRef.current = sigma; recompute(); }, [sigma]);
  _useEffect(() => { nRef.current = nSamp; recompute(); }, [nSamp]);

  function rm(r, c, rng, s) { return Array.from({ length: r }, () => Array.from({ length: c }, () => gauss(rng) * s)); }
  function fwd(net, x) {
    const z1 = net.b1.map((b, i) => b + net.W1[i][0] * x[0] + net.W1[i][1] * x[1]); const h1 = z1.map(tanh);
    const zo = net.b3.map((b, i) => b + net.W3[i].reduce((s, w, j) => s + w * h1[j], 0));
    return zo[0] >= zo[1] ? 0 : 1;
  }
  function train() {
    const rng = rngRef.current, data = dataRef.current, N = data.length, lr = 0.25;
    const net = { W1: rm(NH, 2, rng, 1.0), b1: new Array(NH).fill(0), W3: rm(2, NH, rng, 0.8), b3: [0, 0] };
    for (let ep = 0; ep < 340; ep++) {
      const gW1 = net.W1.map(r => r.map(() => 0)), gb1 = net.b1.map(() => 0), gW3 = net.W3.map(r => r.map(() => 0)), gb3 = [0, 0];
      for (const d of data) {
        const z1 = net.b1.map((b, i) => b + net.W1[i][0] * d.x[0] + net.W1[i][1] * d.x[1]); const h1 = z1.map(tanh);
        const zo = net.b3.map((b, i) => b + net.W3[i].reduce((s, w, j) => s + w * h1[j], 0));
        const mx = Math.max(zo[0], zo[1]), e0 = Math.exp(zo[0] - mx), e1 = Math.exp(zo[1] - mx), s = e0 + e1, p = [e0 / s, e1 / s];
        const dzo = [p[0] - (d.y === 0 ? 1 : 0), p[1] - (d.y === 1 ? 1 : 0)];
        for (let i = 0; i < 2; i++) { gb3[i] += dzo[i]; for (let j = 0; j < NH; j++) gW3[i][j] += dzo[i] * h1[j]; }
        const dh1 = new Array(NH).fill(0); for (let j = 0; j < NH; j++) for (let i = 0; i < 2; i++) dh1[j] += net.W3[i][j] * dzo[i];
        const dz1 = dh1.map((g, j) => g * (1 - h1[j] * h1[j]));
        for (let i = 0; i < NH; i++) { gb1[i] += dz1[i]; gW1[i][0] += dz1[i] * d.x[0]; gW1[i][1] += dz1[i] * d.x[1]; }
      }
      const s = lr / N;
      for (let i = 0; i < NH; i++) { net.b1[i] -= s * gb1[i]; net.W1[i][0] -= s * gW1[i][0]; net.W1[i][1] -= s * gW1[i][1]; }
      for (let i = 0; i < 2; i++) { net.b3[i] -= s * gb3[i]; for (let j = 0; j < NH; j++) net.W3[i][j] -= s * gW3[i][j]; }
    }
    netRef.current = net;
  }

  function certify() {
    const net = netRef.current, x0 = srcRef.current, sigma = sigRef.current, n = nRef.current, rng = rngRef.current;
    const samples = []; let c0 = 0, c1 = 0;
    for (let i = 0; i < n; i++) { const nx = [x0[0] + gauss(rng) * sigma, x0[1] + gauss(rng) * sigma]; const c = fwd(net, nx); if (c === 0) c0++; else c1++; samples.push([nx[0], nx[1], c]); }
    const top = c0 >= c1 ? 0 : 1, pA = Math.max(c0, c1) / n;
    const radius = pA > 0.5 ? sigma * probit(pA) : 0;
    resRef.current = { top, pA, radius, abstain: pA <= 0.5 };
    sampleRef.current = samples;
  }

  function recompute() { if (!netRef.current) return; certify(); setTick(v => v + 1); draw(); }
  function rebuild() { rngRef.current = mulberry32(seed); dataRef.current = makeData(rngRef.current); train(); certify(); setTick(v => v + 1); draw(); }

  function toPx(x, y) { return [W * 0.42 + x * 70, H * 0.5 - y * 70]; }
  function toParam(px, py) { return [(px - W * 0.42) / 70, -(py - H * 0.5) / 70]; }

  function draw() {
    const cv = canvasRef.current; if (!cv || !netRef.current) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const net = netRef.current, CS = 8;
    for (let px = 0; px < W; px += CS) for (let py = 0; py < H; py += CS) {
      const [x, y] = toParam(px, py); if (Math.abs(x) > R || Math.abs(y) > R) continue;
      ctx.fillStyle = fwd(net, [x, y]) === 0 ? "rgba(96,165,250,0.12)" : "rgba(168,85,247,0.12)"; ctx.fillRect(px, py, CS, CS);
    }
    for (const d of dataRef.current) { const [px, py] = toPx(d.x[0], d.x[1]); ctx.fillStyle = d.y === 0 ? "rgba(96,165,250,0.55)" : "rgba(168,85,247,0.55)"; ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill(); }
    // noise samples
    for (const s of sampleRef.current) { const [px, py] = toPx(s[0], s[1]); ctx.fillStyle = s[2] === 0 ? "rgba(96,165,250,0.5)" : "rgba(168,85,247,0.5)"; ctx.fillRect(px, py, 1.6, 1.6); }
    const x0 = srcRef.current, res = resRef.current;
    if (res && res.radius > 0) {
      const [cx, cy] = toPx(x0[0], x0[1]);
      ctx.strokeStyle = "#34d399"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, res.radius * 70, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "rgba(52,211,153,0.08)"; ctx.fill();
    }
    const [sx, sy] = toPx(x0[0], x0[1]); ctx.fillStyle = "#fff"; ctx.strokeStyle = "#0a0e1a"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px JetBrains Mono, monospace"; ctx.textAlign = "left";
    ctx.fillText("click to pick a point; green = certified radius (provably safe)", 12, 18);
    if (res) {
      ctx.fillStyle = res.abstain ? "#fb923c" : "#34d399"; ctx.font = "11px JetBrains Mono";
      ctx.fillText(res.abstain ? "ABSTAIN (pA <= 1/2 near the boundary)" : `certified class ${res.top} within R = ${res.radius.toFixed(2)}`, 12, H - 14);
    }
  }

  function onDown(ev) {
    const rect = canvasRef.current.getBoundingClientRect();
    const [x, y] = toParam((ev.clientX - rect.left) / (rect.width / W), (ev.clientY - rect.top) / (rect.height / H));
    if (Math.abs(x) > R || Math.abs(y) > R) return;
    srcRef.current = [x, y]; recompute();
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    rebuild();
  }, []);
  _useEffect(() => { rebuild(); }, [seed]);

  const res = resRef.current;
  const stage = (<canvas ref={canvasRef} onPointerDown={onDown} style={{ touchAction: "none", cursor: "crosshair", maxWidth: "100%", borderRadius: 4 }} />);

  const controls = (
    <ControlGroup>
      <Slider label="// NOISE sigma" min={0.1} max={0.8} step={0.05} value={sigma} onChange={setSigma}
        help="The smoothing noise level. The certified radius is sigma * Phi^-1(pA): bigger sigma can certify a larger radius, but it also pushes the noise cloud across the boundary, lowering the vote fraction pA. The tradeoff that sets the best sigma." />
      <Slider label="// MC SAMPLES" min={50} max={1000} step={50} value={nSamp} onChange={setNSamp}
        help="Monte-Carlo noise samples used to estimate the top-class vote fraction pA. More samples = a tighter, more reliable estimate (the real method also adds a statistical confidence correction)." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setSeed(s => s + 1)} primary>NEW MODEL</DemoButton>
        <DemoButton onClick={() => { srcRef.current = [0.0, 0.4]; setSigma(0.35); }}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="TOP CLASS pA" value={res ? res.pA.toFixed(3) : "-"} accent="#60a5fa" />
        <StatReadout label="CERTIFIED RADIUS R" value={res ? res.radius.toFixed(3) : "-"} accent={res && !res.abstain ? "#34d399" : "#fb923c"} />
      </div>
      <StatReadout label="GUARANTEE" value={res ? (res.abstain ? "ABSTAIN" : `class ${res.top} provably safe`) : "-"} accent={res && !res.abstain ? "#34d399" : "#fb923c"} />
      <Legend items={[
        { color: "#34d399", label: "certified radius (safe)" },
        { color: "#fff", label: "query point", border: "1px solid #0a0e1a" },
        { color: "#60a5fa", label: "noise vote: class 0" },
        { color: "#a855f7", label: "noise vote: class 1" },
      ]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Empirical defenses say "we couldn't find an attack"; <b>certified</b> defenses come with a
        mathematical <i>guarantee</i>. <b>Randomized smoothing</b> builds a new classifier g that, at any
        input, returns the class the base network predicts most often under Gaussian noise. The magic:
        if the top class wins a fraction <b>pA &gt; ½</b> of the noisy votes, then g's prediction is
        <b> provably constant</b> for <i>every</i> perturbation within radius
        <b> R = σ·Φ⁻¹(pA)</b> — no attack inside the green circle can change it, ever.
      </DemoP>
      <DemoP>
        Click around and watch the certified circle grow where the model is confident and shrink to
        nothing near the boundary (where the noise votes split and g must <b>abstain</b>). Raise <b>σ</b>
        and you can certify a bigger radius — but only up to the point where the noise cloud starts
        crossing the boundary and pA falls. That σ tradeoff is the whole game: more noise buys a larger
        potential guarantee at the cost of clean accuracy. It's the provable mirror of the empirical
        <a href={`${window.__DM_BASE || "../../"}visualize/adversarial-examples/`}> FGSM/PGD attack</a>.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Certified robustness is the rigorous end of the <b>robustness</b> field: instead of an endless
        attack/defense arms race, you get a number you can put in a safety case — "this prediction cannot
        be flipped by any perturbation smaller than R." Randomized smoothing (Cohen, Rosenfeld & Kolter
        2019) scaled this idea to ImageNet because it treats the network as a black box, and the same
        machinery now certifies properties of larger models. It pairs naturally with
        <a href={`${window.__DM_BASE || "../../"}visualize/conformal/`}> conformal prediction</a> (distribution-
        free coverage guarantees) as the two main "provable" tools in trustworthy ML.
      </DemoP>
      <DemoP>
        The honest limits are visible on screen: the guarantee is probabilistic (estimated from finite
        samples, so the real method adds a confidence correction and may abstain), it only covers an
        L2 ball of radius R, and bigger σ trades away accuracy. Certification is expensive and
        conservative — which is exactly why most deployed systems still rely on empirical
        <a href={`${window.__DM_BASE || "../../"}visualize/adversarial-examples/`}> adversarial training</a>.
        Knowing when "we tested hard" is enough vs when you need a proof is the real engineering call.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      title="Certified Robustness (Randomized Smoothing)"
      subtitle="Turn a classifier into one with a provable safety radius - no perturbation inside the circle can change its answer."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/ml-theory/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="blue"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<CertifiedRobustnessDemo />);
