// demos/mutual-information.jsx — mutual information vs correlation. Sample two
// variables with a chosen dependence (linear, nonlinear, circular, independent),
// bin the joint distribution, and compute MI = H(X)+H(Y)-H(X,Y) directly. The
// teaching point: correlation only sees LINEAR dependence (it's ~0 for the
// parabola and the ring), but mutual information detects ANY statistical
// dependence. Real plug-in estimator from samples; honest about its finite-
// sample bias on the independent case.

const { useRef: _ur, useState: _us, useEffect: _ue } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 380, B = 18, N = 600;

function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function gauss(rng) { let u = 0, v = 0; while (u === 0) u = rng(); while (v === 0) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

function sampleData(kind, noise, seed) {
  const rng = mulberry32(seed), pts = [];
  for (let i = 0; i < N; i++) {
    let x, y;
    if (kind === "linear") { x = gauss(rng); y = (1 - noise) * x + noise * 2 * gauss(rng); }
    else if (kind === "quadratic") { x = gauss(rng) * 1.3; y = (1 - noise) * (x * x - 1.4) * 0.9 + noise * 2 * gauss(rng); }
    else if (kind === "circle") { const t = rng() * Math.PI * 2, r = 1.4 + gauss(rng) * (0.06 + noise * 0.5); x = r * Math.cos(t); y = r * Math.sin(t); }
    else { x = gauss(rng); y = gauss(rng); }
    pts.push([x, y]);
  }
  return pts;
}

function analyze(pts) {
  let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
  for (const [x, y] of pts) { xmin = Math.min(xmin, x); xmax = Math.max(xmax, x); ymin = Math.min(ymin, y); ymax = Math.max(ymax, y); }
  const ex = (xmax - xmin) * 0.02 + 1e-6, ey = (ymax - ymin) * 0.02 + 1e-6; xmin -= ex; xmax += ex; ymin -= ey; ymax += ey;
  const joint = Array.from({ length: B }, () => new Array(B).fill(0));
  const bx = x => Math.min(B - 1, Math.max(0, Math.floor((x - xmin) / (xmax - xmin) * B)));
  const by = y => Math.min(B - 1, Math.max(0, Math.floor((y - ymin) / (ymax - ymin) * B)));
  for (const [x, y] of pts) joint[by(y)][bx(x)]++;
  const n = pts.length;
  const px = new Array(B).fill(0), py = new Array(B).fill(0);
  for (let i = 0; i < B; i++) for (let j = 0; j < B; j++) { joint[i][j] /= n; px[j] += joint[i][j]; py[i] += joint[i][j]; }
  const log2 = z => Math.log(z) / Math.LN2;
  let Hx = 0, Hy = 0, Hxy = 0;
  for (let j = 0; j < B; j++) if (px[j] > 0) Hx -= px[j] * log2(px[j]);
  for (let i = 0; i < B; i++) if (py[i] > 0) Hy -= py[i] * log2(py[i]);
  for (let i = 0; i < B; i++) for (let j = 0; j < B; j++) if (joint[i][j] > 0) Hxy -= joint[i][j] * log2(joint[i][j]);
  const MI = Math.max(0, Hx + Hy - Hxy);
  // Pearson
  let mx = 0, my = 0; for (const [x, y] of pts) { mx += x; my += y; } mx /= n; my /= n;
  let sxy = 0, sxx = 0, syy = 0; for (const [x, y] of pts) { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; }
  const r = sxy / (Math.sqrt(sxx * syy) || 1);
  return { joint, px, py, Hx, Hy, MI, r, dom: { xmin, xmax, ymin, ymax } };
}

function MutualInformationDemo() {
  const canvasRef = _ur(null);
  const dprRef = _ur(1);
  const ptsRef = _ur([]);
  const resRef = _ur(null);
  const [kind, setKind] = _us("quadratic");
  const [noise, setNoise] = _us(0.15);
  const [seed, setSeed] = _us(3);
  const [, setTick] = _us(0);

  function recompute() { ptsRef.current = sampleData(kind, noise, seed); resRef.current = analyze(ptsRef.current); setTick(v => v + 1); draw(); }

  function draw() {
    const cv = canvasRef.current; if (!cv || !resRef.current) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const { joint, px, py, dom } = resRef.current;
    // joint heatmap area
    const gx = 70, gy = 30, gw = 230, gh = 230, cw = gw / B, ch = gh / B;
    let mx = 0; for (let i = 0; i < B; i++) for (let j = 0; j < B; j++) mx = Math.max(mx, joint[i][j]);
    for (let i = 0; i < B; i++) for (let j = 0; j < B; j++) {
      const t = mx > 0 ? joint[i][j] / mx : 0;
      ctx.fillStyle = `rgb(${Math.round(10 + t * 40)},${Math.round(20 + t * 110)},${Math.round(40 + t * 207)})`;
      ctx.fillRect(gx + j * cw, gy + (B - 1 - i) * ch, cw + 0.5, ch + 0.5);
    }
    // scatter overlay
    const sx = x => gx + (x - dom.xmin) / (dom.xmax - dom.xmin) * gw, sy = y => gy + (1 - (y - dom.ymin) / (dom.ymax - dom.ymin)) * gh;
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    for (const [x, y] of ptsRef.current) { ctx.beginPath(); ctx.arc(sx(x), sy(y), 1, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.strokeRect(gx, gy, gw, gh);
    // marginal X (top) and Y (right)
    const pmx = Math.max(...px), pmy = Math.max(...py);
    ctx.fillStyle = "rgba(96,165,250,0.7)";
    for (let j = 0; j < B; j++) { const hh = (px[j] / pmx) * 22; ctx.fillRect(gx + j * cw, gy - 4 - hh, cw - 0.5, hh); }
    ctx.fillStyle = "rgba(168,85,247,0.7)";
    for (let i = 0; i < B; i++) { const ww = (py[i] / pmy) * 22; ctx.fillRect(gx + gw + 4, gy + (B - 1 - i) * ch, ww, ch - 0.5); }
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px JetBrains Mono, monospace"; ctx.textAlign = "left";
    ctx.fillText("JOINT p(x,y)  +  marginals", gx, gy + gh + 22);
    ctx.fillText("X", gx + gw / 2, gy + gh + 38); ctx.save(); ctx.translate(gx - 16, gy + gh / 2); ctx.rotate(-Math.PI / 2); ctx.fillText("Y", 0, 0); ctx.restore();
    // big readouts on the right
    const { MI, r, Hx, Hy } = resRef.current, rx = 340;
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.font = "11px JetBrains Mono"; ctx.fillText("MUTUAL INFORMATION", rx, 60);
    ctx.fillStyle = "#34d399"; ctx.font = "30px Space Grotesk, sans-serif"; ctx.fillText(MI.toFixed(3), rx, 92); ctx.font = "11px JetBrains Mono"; ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.fillText("bits", rx + 78, 90);
    ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.font = "11px JetBrains Mono"; ctx.fillText("|CORRELATION| (linear only)", rx, 140);
    ctx.fillStyle = Math.abs(r) < 0.15 && MI > 0.15 ? "#fb923c" : "#60a5fa"; ctx.font = "30px Space Grotesk, sans-serif"; ctx.fillText(Math.abs(r).toFixed(3), rx, 172);
    ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.font = "10px JetBrains Mono";
    ctx.fillText(`H(X)=${Hx.toFixed(2)}  H(Y)=${Hy.toFixed(2)} bits`, rx, 200);
    if (Math.abs(r) < 0.15 && MI > 0.2) { ctx.fillStyle = "#fb923c"; ctx.font = "11px JetBrains Mono"; ctx.fillText("correlation blind here,", rx, 230); ctx.fillText("but MI sees the dependence", rx, 246); }
  }

  _ue(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    recompute();
  }, []);
  _ue(() => { recompute(); }, [kind, noise, seed]);

  const res = resRef.current;
  const stage = (<canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />);

  const controls = (
    <ControlGroup>
      <SegmentedControl label="// RELATIONSHIP" value={kind} onChange={setKind}
        options={[{ value: "linear", label: "Linear" }, { value: "quadratic", label: "Parabola" }, { value: "circle", label: "Ring" }, { value: "independent", label: "None" }]}
        help="How Y depends on X. Linear is what correlation detects; Parabola and Ring are strong dependences with near-ZERO correlation; None is truly independent (MI should be ~0, up to estimator bias)." />
      <Slider label="// NOISE" min={0} max={0.9} step={0.05} value={noise} onChange={setNoise}
        help="How much randomness blurs the relationship. More noise weakens the dependence and lowers mutual information toward zero." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setSeed(s => s + 1)} primary>RESAMPLE</DemoButton>
        <DemoButton onClick={() => { setKind("quadratic"); setNoise(0.15); }}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="MUTUAL INFO" value={res ? res.MI.toFixed(3) + " bits" : "-"} accent="#34d399" />
        <StatReadout label="|CORRELATION|" value={res ? Math.abs(res.r).toFixed(3) : "-"} accent="#60a5fa" />
      </div>
      <Legend items={[
        { color: "#3b82f6", label: "high joint density" },
        { color: "#60a5fa", label: "marginal p(x)" },
        { color: "#a855f7", label: "marginal p(y)" },
        { color: "#fb923c", label: "corr blind, MI sees it" },
      ]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Correlation measures one thing: do X and Y move up and down <i>together, linearly</i>? Mutual
        information asks the deeper question — does knowing X tell you <b>anything</b> about Y, by any
        pattern at all? It's the gap between the entropy of Y and its entropy once X is known:
        MI = H(X) + H(Y) − H(X,Y), estimated here straight from the binned joint distribution (the heatmap).
      </DemoP>
      <DemoP>
        Switch to the <b>Parabola</b> or the <b>Ring</b>: the points are tightly coupled, yet
        <b> correlation collapses to ~0</b> because the relationship isn't a straight line — while
        <span style={{ color: "#34d399" }}> mutual information stays clearly positive</span>. That's the
        whole point: MI catches nonlinear and nonmonotonic dependence that correlation is blind to. Add
        <b> noise</b> and both fall toward zero; pick <b>None</b> and MI drops to roughly zero (the small
        leftover is finite-sample binning bias — MI estimation is notoriously biased upward).
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Mutual information is the currency of information theory in ML: it's the objective behind
        InfoGAN and self-supervised methods like InfoNCE (the loss in
        <a href={`${window.__DM_BASE || "../../"}visualize/contrastive-learning/`}> contrastive learning</a>),
        the lens of the <b>information bottleneck</b> theory of deep learning, and a standard tool for
        feature selection and measuring representation quality. Because it needs no linearity or Gaussianity
        assumption, it captures dependence that Pearson correlation and linear probes miss.
      </DemoP>
      <DemoP>
        The honest catch you can see on screen is why MI is hard in practice: estimating it from samples in
        more than a couple of dimensions is <i>statistically brutal</i> — plug-in binning is biased and
        explodes with dimension, which is exactly why modern methods (MINE, InfoNCE) estimate <i>bounds</i>
        on MI with neural networks instead of computing it directly. It's built from
        <a href={`${window.__DM_BASE || "../../"}visualize/decoding/`}> entropy</a>, the same quantity behind
        compression and cross-entropy loss — information theory quietly underlies most of what training a
        model actually optimizes.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      topic="INFORMATION THEORY"
      title="Mutual Information vs Correlation"
      subtitle="Correlation only sees straight lines - mutual information detects any dependence, including the parabola and the ring."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/foundations/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="blue"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<MutualInformationDemo />);
