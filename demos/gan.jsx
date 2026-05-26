// demos/gan.jsx — a real generative adversarial network in the browser.
// Tiny generator (z ∈ R^2 -> 2-layer MLP -> point in R^2) duels a tiny
// discriminator (2 -> 16 -> 1 sigmoid). Non-saturating GAN loss, manual
// backprop with SGD+momentum. Real, watchable, ~6k flops per step.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, SegmentedControl, StatReadout, Legend, ControlGroup,
} = window;

const W = 460, H = 380, SC = 80;
const cx = W / 2, cy = H / 2 - 30;
const px = (x) => cx + x * SC, py = (y) => cy - y * SC;
const ix = (sx) => (sx - cx) / SC, iy = (sy) => (cy - sy) / SC;

function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function randMat(r, c, scale) { const m = new Array(r); for (let i = 0; i < r; i++) { m[i] = new Float64Array(c); for (let j = 0; j < c; j++) m[i][j] = randn() * scale; } return m; }
function zeros(r, c) { const m = new Array(r); for (let i = 0; i < r; i++) m[i] = new Float64Array(c); return m; }
function copyShape(m) { return zeros(m.length, m[0].length); }

// ── data distribution: a ring (donut) of radius ~1.4 with noise ──
function sampleReal() {
  const a = Math.random() * 2 * Math.PI;
  const r = 1.4 + randn() * 0.12;
  return [Math.cos(a) * r, Math.sin(a) * r];
}
// ── alt: two moons ──
function sampleMoons() {
  if (Math.random() < 0.5) {
    const a = Math.random() * Math.PI;
    return [Math.cos(a) * 1.0 - 0.5, Math.sin(a) * 1.0 - 0.25 + randn() * 0.08];
  } else {
    const a = Math.PI + Math.random() * Math.PI;
    return [Math.cos(a) * 1.0 + 0.5, Math.sin(a) * 1.0 + 0.25 + randn() * 0.08];
  }
}
function sampler(kind) { return kind === "moons" ? sampleMoons : sampleReal; }

// ── tiny MLP, by hand. Vectors are length-N typed arrays. ──
function makeNet(layers, scale = 0.6) {
  const W = [], b = [];
  for (let l = 0; l < layers.length - 1; l++) {
    W.push(randMat(layers[l + 1], layers[l], scale * Math.sqrt(1 / layers[l])));
    b.push(new Float64Array(layers[l + 1]));
  }
  return { W, b, mW: W.map(copyShape), mB: b.map(b => new Float64Array(b.length)), lr: 0.012 };
}
function fwd(net, x, activate = "tanh", lastLinear = true) {
  const acts = [x.slice()];
  const pre  = [];
  for (let l = 0; l < net.W.length; l++) {
    const Wm = net.W[l], bv = net.b[l];
    const prev = acts[acts.length - 1];
    const z = new Float64Array(Wm.length);
    for (let i = 0; i < Wm.length; i++) {
      let s = bv[i];
      const row = Wm[i];
      for (let j = 0; j < row.length; j++) s += row[j] * prev[j];
      z[i] = s;
    }
    pre.push(z);
    const isLast = l === net.W.length - 1;
    let a;
    if (isLast && lastLinear) a = z.slice();
    else if (activate === "tanh") { a = new Float64Array(z.length); for (let i = 0; i < z.length; i++) a[i] = Math.tanh(z[i]); }
    else if (activate === "sigmoid_last" && isLast) { a = new Float64Array(z.length); for (let i = 0; i < z.length; i++) a[i] = 1 / (1 + Math.exp(-z[i])); }
    else { a = new Float64Array(z.length); for (let i = 0; i < z.length; i++) a[i] = Math.tanh(z[i]); }
    acts.push(a);
  }
  return { acts, pre };
}
function step(net, gW, gB, momentum = 0.5) {
  for (let l = 0; l < net.W.length; l++) {
    const Wm = net.W[l], mWl = net.mW[l], gWl = gW[l];
    for (let i = 0; i < Wm.length; i++)
      for (let j = 0; j < Wm[i].length; j++) {
        mWl[i][j] = momentum * mWl[i][j] - net.lr * gWl[i][j];
        Wm[i][j] += mWl[i][j];
      }
    const bv = net.b[l], mBl = net.mB[l], gBl = gB[l];
    for (let i = 0; i < bv.length; i++) {
      mBl[i] = momentum * mBl[i] - net.lr * gBl[i];
      bv[i] += mBl[i];
    }
  }
}
// Backprop for a 2-hidden-layer MLP with tanh hidden + (linear or sigmoid) head.
// Returns (gW[], gB[], dInput). `dHead` is dL/dz at the output layer.
function bwd(net, fwdOut, dHead, hiddenAct = "tanh") {
  const { acts, pre } = fwdOut;
  const L = net.W.length;
  const gW = net.W.map(m => copyShape(m));
  const gB = net.b.map(b => new Float64Array(b.length));
  let dZ = dHead.slice();
  for (let l = L - 1; l >= 0; l--) {
    const aPrev = acts[l];
    for (let i = 0; i < gW[l].length; i++) {
      gB[l][i] += dZ[i];
      for (let j = 0; j < gW[l][i].length; j++) gW[l][i][j] += dZ[i] * aPrev[j];
    }
    if (l > 0) {
      const Wm = net.W[l];
      const dA = new Float64Array(Wm[0].length);
      for (let j = 0; j < dA.length; j++) {
        let s = 0;
        for (let i = 0; i < Wm.length; i++) s += Wm[i][j] * dZ[i];
        dA[j] = s;
      }
      const zPrev = pre[l - 1];
      const dPrev = new Float64Array(zPrev.length);
      for (let j = 0; j < dPrev.length; j++) {
        const th = Math.tanh(zPrev[j]);
        dPrev[j] = dA[j] * (1 - th * th);
      }
      dZ = dPrev;
    }
  }
  return { gW, gB };
}

function GANDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const Gref = _useRef(makeNet([2, 16, 16, 2]));
  const Dref = _useRef(makeNet([2, 16, 16, 1]));
  const lossesRef = _useRef({ g: [], d: [] });
  const [running, setRunning] = _useState(false);
  const [tick, setTick] = _useState(0);
  const [batch, setBatch] = _useState(48);
  const [steps, setSteps] = _useState(0);
  const [dataset, setDataset] = _useState("ring");
  const realPtsRef = _useRef([]);
  const fakePtsRef = _useRef([]);

  function reset() {
    Gref.current = makeNet([2, 16, 16, 2]);
    Dref.current = makeNet([2, 16, 16, 1]);
    lossesRef.current = { g: [], d: [] };
    setSteps(0); realPtsRef.current = []; fakePtsRef.current = [];
    setTick(t => t + 1);
  }

  function trainStep() {
    const G = Gref.current, D = Dref.current, sample = sampler(dataset);
    let dLoss = 0, gLoss = 0;

    // ── 1) Discriminator step on real + fake ──
    const fakeXs = [], zs = [];
    for (let i = 0; i < batch; i++) {
      const z = new Float64Array([randn(), randn()]);
      const gOut = fwd(G, z, "tanh", true);
      const fake = gOut.acts[gOut.acts.length - 1];
      fakeXs.push(fake); zs.push({ z, gOut });
    }
    const realXs = new Array(batch);
    for (let i = 0; i < batch; i++) realXs[i] = new Float64Array(sample());

    const gW_D = D.W.map(copyShape), gB_D = D.b.map(b => new Float64Array(b.length));
    for (let i = 0; i < batch; i++) {
      // real → target 1
      const oR = fwd(D, realXs[i], "tanh", false);
      const a = oR.acts[oR.acts.length - 1];
      const pR = 1 / (1 + Math.exp(-oR.pre[oR.pre.length - 1][0]));
      a[0] = pR;
      const dHead = new Float64Array([pR - 1]);
      const g = bwd(D, oR, dHead);
      for (let l = 0; l < gW_D.length; l++) {
        for (let r = 0; r < gW_D[l].length; r++) for (let c = 0; c < gW_D[l][r].length; c++) gW_D[l][r][c] += g.gW[l][r][c] / (2 * batch);
        for (let r = 0; r < gB_D[l].length; r++) gB_D[l][r] += g.gB[l][r] / (2 * batch);
      }
      dLoss += -Math.log(Math.max(pR, 1e-7));

      // fake → target 0
      const oF = fwd(D, fakeXs[i], "tanh", false);
      const pF = 1 / (1 + Math.exp(-oF.pre[oF.pre.length - 1][0]));
      const dHead2 = new Float64Array([pF - 0]);
      const g2 = bwd(D, oF, dHead2);
      for (let l = 0; l < gW_D.length; l++) {
        for (let r = 0; r < gW_D[l].length; r++) for (let c = 0; c < gW_D[l][r].length; c++) gW_D[l][r][c] += g2.gW[l][r][c] / (2 * batch);
        for (let r = 0; r < gB_D[l].length; r++) gB_D[l][r] += g2.gB[l][r] / (2 * batch);
      }
      dLoss += -Math.log(Math.max(1 - pF, 1e-7));
    }
    dLoss /= batch;
    step(D, gW_D, gB_D);

    // ── 2) Generator step: maximise log D(G(z)) — pull fakes toward "real" ──
    const gW_G = G.W.map(copyShape), gB_G = G.b.map(b => new Float64Array(b.length));
    for (let i = 0; i < batch; i++) {
      const z = zs[i].z, gOut = zs[i].gOut;
      const fake = gOut.acts[gOut.acts.length - 1];
      const oD = fwd(D, fake, "tanh", false);
      const pF = 1 / (1 + Math.exp(-oD.pre[oD.pre.length - 1][0]));
      // dL/dpreD = pF - 1 (non-saturating); push through D to get d/dfake
      const dHead = new Float64Array([pF - 1]);
      // Need d(loss) wrt the input of D — compute it here (bwd into G).
      const L = D.W.length;
      let dZ = dHead.slice();
      let dInput = null;
      for (let l = L - 1; l >= 0; l--) {
        if (l === 0) {
          const Wm = D.W[0];
          const dA = new Float64Array(Wm[0].length);
          for (let j = 0; j < dA.length; j++) {
            let s = 0;
            for (let r = 0; r < Wm.length; r++) s += Wm[r][j] * dZ[r];
            dA[j] = s;
          }
          dInput = dA;
        } else {
          const Wm = D.W[l];
          const dA = new Float64Array(Wm[0].length);
          for (let j = 0; j < dA.length; j++) {
            let s = 0;
            for (let r = 0; r < Wm.length; r++) s += Wm[r][j] * dZ[r];
            dA[j] = s;
          }
          const zPrev = oD.pre[l - 1];
          const dPrev = new Float64Array(zPrev.length);
          for (let j = 0; j < dPrev.length; j++) {
            const th = Math.tanh(zPrev[j]); dPrev[j] = dA[j] * (1 - th * th);
          }
          dZ = dPrev;
        }
      }
      // dInput is dL/dfake; push through G (last layer is linear).
      const gGrad = bwd(G, gOut, dInput);
      for (let l = 0; l < gW_G.length; l++) {
        for (let r = 0; r < gW_G[l].length; r++) for (let c = 0; c < gW_G[l][r].length; c++) gW_G[l][r][c] += gGrad.gW[l][r][c] / batch;
        for (let r = 0; r < gB_G[l].length; r++) gB_G[l][r] += gGrad.gB[l][r] / batch;
      }
      gLoss += -Math.log(Math.max(pF, 1e-7));
    }
    gLoss /= batch;
    step(G, gW_G, gB_G);

    lossesRef.current.d.push(dLoss);
    lossesRef.current.g.push(gLoss);
    if (lossesRef.current.d.length > 200) { lossesRef.current.d.shift(); lossesRef.current.g.shift(); }

    realPtsRef.current = realXs;
    fakePtsRef.current = fakeXs;
    setSteps(s => s + 1);
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // discriminator field
    const D = Dref.current;
    const step2 = 8;
    for (let sx = 0; sx < W; sx += step2) {
      for (let sy = 0; sy < H - 90; sy += step2) {
        const p = fwd(D, new Float64Array([ix(sx), iy(sy)]), "tanh", false);
        const z = p.pre[p.pre.length - 1][0];
        const pr = 1 / (1 + Math.exp(-z));
        if (pr > 0.5) ctx.fillStyle = `rgba(96,165,250,${0.05 + 0.18 * (pr - 0.5) * 2})`;
        else ctx.fillStyle = `rgba(168,85,247,${0.05 + 0.18 * (0.5 - pr) * 2})`;
        ctx.fillRect(sx, sy, step2, step2);
      }
    }

    // axes
    ctx.strokeStyle = "rgba(148,163,184,0.18)";
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H - 90);
    ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();

    // points
    for (const p of realPtsRef.current) {
      ctx.beginPath(); ctx.arc(px(p[0]), py(p[1]), 2.4, 0, Math.PI * 2);
      ctx.fillStyle = "#60a5fa"; ctx.fill();
    }
    for (const p of fakePtsRef.current) {
      ctx.beginPath(); ctx.arc(px(p[0]), py(p[1]), 2.4, 0, Math.PI * 2);
      ctx.fillStyle = "#c084fc"; ctx.fill();
    }

    // loss curves
    const baseY = H - 70;
    ctx.strokeStyle = "rgba(148,163,184,0.25)";
    ctx.beginPath(); ctx.moveTo(20, baseY); ctx.lineTo(W - 20, baseY); ctx.stroke();
    ctx.fillStyle = "rgba(148,163,184,0.7)";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillText("loss", 24, baseY - 4);
    function plot(arr, color) {
      if (arr.length < 2) return;
      const max = 2.0; // typical BCE max
      const N = arr.length;
      ctx.beginPath();
      arr.forEach((v, i) => {
        const x = 20 + ((W - 40) * i) / (N - 1);
        const y = baseY + 50 - (Math.min(v, max) / max) * 50;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.stroke();
    }
    plot(lossesRef.current.d, "#fbbf24");
    plot(lossesRef.current.g, "#34d399");
    ctx.fillStyle = "#fbbf24"; ctx.fillText("D", W - 36, baseY + 12);
    ctx.fillStyle = "#34d399"; ctx.fillText("G", W - 26, baseY + 12);
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  }, []);
  _useEffect(() => { draw(); /* eslint-disable-next-line */ }, [tick, steps]);
  _useEffect(() => { reset(); /* eslint-disable-next-line */ }, [dataset]);
  _useEffect(() => {
    if (!running) { cancelAnimationFrame(rafRef.current); return; }
    const loop = () => { trainStep(); rafRef.current = requestAnimationFrame(loop); };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line
  }, [running, batch, dataset]);

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <SegmentedControl label="// REAL DISTRIBUTION" value={dataset} onChange={setDataset}
        options={[{ value: "ring", label: "Ring" }, { value: "moons", label: "Two moons" }]}
        help="What the discriminator thinks 'real' looks like. The generator's job is to land its samples on top of this shape." />
      <Slider label="// BATCH SIZE" min={16} max={96} step={8} value={batch} onChange={setBatch}
        help="Samples per training step. Bigger = lower-variance gradient = smoother training; smaller = noisier but cheaper." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <DemoButton onClick={() => { for (let i = 0; i < 5; i++) trainStep(); }}>+5 STEPS</DemoButton>
        <DemoButton onClick={() => { for (let i = 0; i < 50; i++) trainStep(); }}>+50 STEPS</DemoButton>
        <DemoButton onClick={() => setRunning(r => !r)} primary>{running ? "PAUSE" : "RUN"}</DemoButton>
        <DemoButton onClick={() => { setRunning(false); reset(); }}>RESET</DemoButton>
      </div>
      <StatReadout label="STEPS" value={steps} />
      <Legend items={[
        { color: "#60a5fa", label: "REAL · target distribution" },
        { color: "#c084fc", label: "FAKE · generator samples" },
        { color: "#fbbf24", label: "D LOSS" },
        { color: "#34d399", label: "G LOSS" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Two tiny networks, learning by fighting. The
        <b style={{ color: "#c084fc" }}> generator</b> reads Gaussian noise and
        tries to spit out points that look like the
        <b style={{ color: "#60a5fa" }}> real</b> distribution. The
        <b> discriminator</b> looks at a point and outputs the probability
        that it's real. The background shading is the D's current decision
        field — blue means "I think this is real," violet means "fake."
      </DemoP>
      <DemoP>
        Run it. At first the fakes are scattered noise and D pins them down
        easily — the violet region is huge. As G learns to game D, fakes drift
        toward the ring; the violet patch shrinks. D fights back by sharpening
        the boundary. The losses (G in green, D in yellow) bob: both should hover
        around log 2 ≈ 0.69 at the equilibrium where D can't tell them apart.
        Hit RESET and try the moons — same dynamics, different shape.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Every modern image / video generator descends from this two-player game.
        StyleGAN, BigGAN, CycleGAN, pix2pix, super-resolution, image-to-image
        translation — all built on the GAN objective you're looking at here,
        with bigger nets and tricks (spectral norm, gradient penalty, progressive
        growth) to stabilize training. Even text-to-image diffusion borrowed
        the adversarial idea via classifier-guided sampling.
      </DemoP>
      <DemoP>
        The deep insight is the framing: don't define a loss on individual
        samples — define one model that learns to recognize the whole
        distribution, and use its gradient as the loss. That move lets you
        learn implicit densities you'd never write down in closed form, which
        is also exactly what discriminator-as-critic does in score-based
        diffusion, RLHF reward models, and self-play training.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="GENERATIVE" title="GAN 2-D"
      subtitle="Two tiny networks duel in your browser — generator chases the real distribution, discriminator polices the boundary."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/generative/`}
      tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<GANDemo />);
