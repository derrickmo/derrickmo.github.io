// demos/vae.jsx — a tiny variational autoencoder trained live in the browser.
// Real analytic backprop through encoder -> reparameterization -> decoder, with
// reconstruction + KL loss. Shows the data space (reconstructions + generated
// samples) and the 2-D latent space organizing toward the unit Gaussian prior.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  SegmentedControl, Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const PW = 250, PH = 250, SC = 70;
const IN = 2, H = 12, L = 2;
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

function genData(kind, n = 140) {
  const pts = [];
  if (kind === "ring") { for (let i = 0; i < n; i++) { const a = Math.random() * 2 * Math.PI, r = 1.1 + gauss() * 0.07; pts.push([Math.cos(a) * r, Math.sin(a) * r]); } }
  else if (kind === "clusters") { const c = [[-0.9, 0.7], [0.9, 0.7], [0, -0.9]]; for (let i = 0; i < n; i++) { const k = c[i % 3]; pts.push([k[0] + gauss() * 0.22, k[1] + gauss() * 0.22]); } }
  else { for (let i = 0; i < n; i++) { const t = Math.random() * 3 * Math.PI; const r = 0.18 * t; pts.push([Math.cos(t) * r * 0.5, Math.sin(t) * r * 0.5]); } } // spiral
  return pts;
}

const zeros = (r, c) => Array.from({ length: r }, () => new Array(c).fill(0));
const randM = (r, c, s) => Array.from({ length: r }, () => Array.from({ length: c }, () => gauss() * s));

function newModel() {
  return {
    W1: randM(H, IN, 0.6), b1: new Array(H).fill(0),
    Wmu: randM(L, H, 0.5), bmu: new Array(L).fill(0),
    Wlv: randM(L, H, 0.5), blv: new Array(L).fill(0),
    W2: randM(H, L, 0.6), b2: new Array(H).fill(0),
    W3: randM(IN, H, 0.5), b3: new Array(IN).fill(0),
  };
}
const mv = (W, x) => W.map(row => row.reduce((s, w, k) => s + w * x[k], 0)); // W[r][c]·x[c] -> r
const tanh = (a) => a.map(Math.tanh);

function encode(m, x) {
  const pre1 = mv(m.W1, x).map((v, i) => v + m.b1[i]);
  const h1 = tanh(pre1);
  const mu = mv(m.Wmu, h1).map((v, i) => v + m.bmu[i]);
  const lv = mv(m.Wlv, h1).map((v, i) => v + m.blv[i]);
  return { h1, mu, lv };
}
function decode(m, z) {
  const pre2 = mv(m.W2, z).map((v, i) => v + m.b2[i]);
  const h2 = tanh(pre2);
  const xh = mv(m.W3, h2).map((v, i) => v + m.b3[i]);
  return { h2, xh };
}

function trainStep(m, data, beta, lr) {
  const g = { W1: zeros(H, IN), b1: new Array(H).fill(0), Wmu: zeros(L, H), bmu: new Array(L).fill(0), Wlv: zeros(L, H), blv: new Array(L).fill(0), W2: zeros(H, L), b2: new Array(H).fill(0), W3: zeros(IN, H), b3: new Array(IN).fill(0) };
  let recon = 0, kl = 0; const n = data.length;
  for (const x of data) {
    const { h1, mu, lv } = encode(m, x);
    const eps = [gauss(), gauss()];
    const std = lv.map(v => Math.exp(0.5 * v));
    const z = mu.map((u, i) => u + std[i] * eps[i]);
    const { h2, xh } = decode(m, z);
    // losses
    let rc = 0; for (let i = 0; i < IN; i++) rc += 0.5 * (xh[i] - x[i]) ** 2; recon += rc;
    let kc = 0; for (let i = 0; i < L; i++) kc += -0.5 * (1 + lv[i] - mu[i] * mu[i] - Math.exp(lv[i])); kl += kc;
    // --- backward ---
    const dxh = xh.map((v, i) => v - x[i]);                 // [IN]
    for (let i = 0; i < IN; i++) { for (let k = 0; k < H; k++) g.W3[i][k] += dxh[i] * h2[k]; g.b3[i] += dxh[i]; }
    const dh2 = new Array(H).fill(0); for (let k = 0; k < H; k++) for (let i = 0; i < IN; i++) dh2[k] += m.W3[i][k] * dxh[i];
    const dpre2 = dh2.map((d, k) => d * (1 - h2[k] * h2[k]));
    for (let k = 0; k < H; k++) { for (let i = 0; i < L; i++) g.W2[k][i] += dpre2[k] * z[i]; g.b2[k] += dpre2[k]; }
    const dz = new Array(L).fill(0); for (let i = 0; i < L; i++) for (let k = 0; k < H; k++) dz[i] += m.W2[k][i] * dpre2[k];
    // through reparameterization
    const dmu = new Array(L), dlv = new Array(L);
    for (let i = 0; i < L; i++) {
      dmu[i] = dz[i] + beta * mu[i];
      const dstd = dz[i] * eps[i];
      dlv[i] = dstd * 0.5 * std[i] + beta * 0.5 * (Math.exp(lv[i]) - 1);
    }
    for (let i = 0; i < L; i++) { for (let k = 0; k < H; k++) { g.Wmu[i][k] += dmu[i] * h1[k]; g.Wlv[i][k] += dlv[i] * h1[k]; } g.bmu[i] += dmu[i]; g.blv[i] += dlv[i]; }
    const dh1 = new Array(H).fill(0);
    for (let k = 0; k < H; k++) for (let i = 0; i < L; i++) dh1[k] += m.Wmu[i][k] * dmu[i] + m.Wlv[i][k] * dlv[i];
    const dpre1 = dh1.map((d, k) => d * (1 - h1[k] * h1[k]));
    for (let k = 0; k < H; k++) { for (let i = 0; i < IN; i++) g.W1[k][i] += dpre1[k] * x[i]; g.b1[k] += dpre1[k]; }
  }
  // SGD update (mean grad)
  const upd = (W, gW) => { for (let i = 0; i < W.length; i++) for (let j = 0; j < W[i].length; j++) W[i][j] -= lr * gW[i][j] / n; };
  const updb = (b, gb) => { for (let i = 0; i < b.length; i++) b[i] -= lr * gb[i] / n; };
  upd(m.W1, g.W1); updb(m.b1, g.b1); upd(m.Wmu, g.Wmu); updb(m.bmu, g.bmu); upd(m.Wlv, g.Wlv); updb(m.blv, g.blv);
  upd(m.W2, g.W2); updb(m.b2, g.b2); upd(m.W3, g.W3); updb(m.b3, g.b3);
  return { recon: recon / n, kl: kl / n };
}

function VAEDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const dataRef = _useRef(genData("ring"));
  const modelRef = _useRef(newModel());
  const timerRef = _useRef(null);
  const betaRef = _useRef(0.5);
  const epochRef = _useRef(0);
  const [dataset, setDataset] = _useState("ring");
  const [beta, setBeta] = _useState(0.5);
  const [running, setRunning] = _useState(false);
  const [stats, setStats] = _useState({ epoch: 0, recon: 0, kl: 0 });

  const px = (x, ox) => ox + PW / 2 + x * SC, py = (y) => PH / 2 - y * SC;

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, PW * 2 + 20, PH);
    const m = modelRef.current, data = dataRef.current;

    const panel = (ox, label) => {
      ctx.strokeStyle = "rgba(96,165,250,0.12)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ox, PH / 2); ctx.lineTo(ox + PW, PH / 2); ctx.moveTo(ox + PW / 2, 0); ctx.lineTo(ox + PW / 2, PH); ctx.stroke();
      ctx.fillStyle = "#64748b"; ctx.font = "10px JetBrains Mono, monospace"; ctx.textAlign = "left"; ctx.fillText(label, ox + 4, 14);
    };

    // LEFT: data space
    panel(0, "DATA SPACE");
    for (const x of data) { ctx.fillStyle = "rgba(148,163,184,0.35)"; ctx.beginPath(); ctx.arc(px(x[0], 0), py(x[1]), 2.4, 0, Math.PI * 2); ctx.fill(); }
    // reconstructions
    for (const x of data) { const { mu } = encode(m, x); const { xh } = decode(m, mu); ctx.fillStyle = "#60a5fa"; ctx.beginPath(); ctx.arc(px(xh[0], 0), py(xh[1]), 2.2, 0, Math.PI * 2); ctx.fill(); }
    // generated samples from prior
    for (let i = 0; i < 80; i++) { const { xh } = decode(m, [gauss(), gauss()]); ctx.fillStyle = "rgba(251,191,36,0.7)"; ctx.beginPath(); ctx.arc(px(xh[0], 0), py(xh[1]), 1.8, 0, Math.PI * 2); ctx.fill(); }

    // RIGHT: latent space
    const ox = PW + 20;
    panel(ox, "LATENT SPACE  z");
    for (const r of [1, 2]) { ctx.strokeStyle = "rgba(192,132,252,0.3)"; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(ox + PW / 2, PH / 2, r * SC, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
    data.forEach((x, idx) => { const { mu } = encode(m, x); const hue = (idx / data.length) * 300; ctx.fillStyle = `hsl(${hue},70%,65%)`; ctx.beginPath(); ctx.arc(px(mu[0], ox), py(mu[1]), 2.6, 0, Math.PI * 2); ctx.fill(); });
  }

  function step() {
    const r = trainStep(modelRef.current, dataRef.current, betaRef.current, 0.03);
    epochRef.current += 1;
    setStats({ epoch: epochRef.current, recon: r.recon, kl: r.kl });
    draw();
  }
  function stop() { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } setRunning(false); }
  function run() { if (timerRef.current) { stop(); return; } setRunning(true); timerRef.current = setInterval(() => { for (let i = 0; i < 3; i++) step(); }, 60); }
  function reset() { stop(); modelRef.current = newModel(); epochRef.current = 0; setStats({ epoch: 0, recon: 0, kl: 0 }); draw(); }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = (PW * 2 + 20) * dpr; cv.height = PH * dpr;
    cv.style.width = (PW * 2 + 20) + "px"; cv.style.height = PH + "px";
    draw();
    return () => stop();
  }, []);
  _useEffect(() => { stop(); dataRef.current = genData(dataset); reset(); /* eslint-disable-next-line */ }, [dataset]);

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <SegmentedControl label="// DATASET" value={dataset} onChange={setDataset}
        options={[{ value: "ring", label: "Ring" }, { value: "clusters", label: "Clusters" }, { value: "spiral", label: "Spiral" }]} />
      <Slider label="// β (KL weight)" min={0} max={3} step={0.1} value={beta} onChange={v => { setBeta(v); betaRef.current = v; }} tone="violet" />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => { stop(); step(); }} primary>STEP</DemoButton>
        <DemoButton onClick={run} tone="violet">{running ? "PAUSE" : "TRAIN"}</DemoButton>
        <DemoButton onClick={reset}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <StatReadout label="EPOCH" value={stats.epoch} />
        <StatReadout label="RECON" value={stats.recon.toFixed(3)} accent="#60a5fa" />
        <StatReadout label="KL" value={stats.kl.toFixed(3)} accent="var(--violet-lt)" />
      </div>
      <Legend items={[{ color: "#94a3b8", label: "DATA" }, { color: "#60a5fa", label: "RECONSTRUCTION" }, { color: "#fbbf24", label: "GENERATED" }]} />
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>Right: each point's latent mean μ; dashed rings = the unit-Gaussian prior.</div>
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        An autoencoder squeezes data through a bottleneck and rebuilds it. A
        <b> variational</b> autoencoder adds two twists that make it
        <i> generative</i>. First, the encoder doesn't output a point — it outputs a
        <b> distribution</b> (a mean μ and variance) per input, and we sample the latent
        <b> z</b> from it via the <b>reparameterization trick</b> (z = μ + σ·ε), which
        keeps the randomness differentiable so we can still backprop. Hit <b>Train</b>
        and watch the <span style={{ color: "#60a5fa" }}>reconstructions</span> snap
        onto the data while the <span style={{ color: "#fbbf24" }}>generated samples</span>
        (decoded from pure noise) start to look like real data — that's generation.
      </DemoP>
      <DemoP>
        Second, a <b>KL</b> term pulls every encoding toward a unit Gaussian (the dashed
        rings in the latent panel), so the latent space stays packed and continuous
        instead of scattering — which is exactly what lets you sample from it. The
        <b> β</b> slider sets that pressure: too low and the latent space fragments
        (great reconstructions, poor samples); too high and everything collapses toward
        the origin (clean prior, blurry reconstructions). Finding that balance is the
        whole art of training a VAE — and this is real backprop, running as you watch.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="GENERATIVE · VAE" title="Variational Autoencoder"
      subtitle="Encode to a distribution, sample with the reparameterization trick, and let KL shape a latent space you can generate from."
      stage={stage} controls={controls} explainer={explainer}
      lessonHref={`${window.__DM_BASE || "../../"}learn/generative/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<VAEDemo />);
