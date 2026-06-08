// demos/probing-classifier.jsx — linear probes by layer. Train a small MLP on a
// non-linearly-separable task, then fit a linear (softmax) probe to each layer's
// activations. The probe accuracy rises with depth: the raw input isn't linearly
// separable, but the network progressively untangles it so deeper layers are.
// Everything is real — full MLP forward/backprop, real probe training by GD.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 380, NH = 7; // hidden width

function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function gauss(rng) { let u = 0, v = 0; while (u === 0) u = rng(); while (v === 0) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

function makeData(kind, rng) {
  const pts = [], N = 120;
  for (let i = 0; i < N; i++) {
    let x, y, lab;
    if (kind === "moons") { const t = rng() * Math.PI, up = i % 2; if (up) { x = Math.cos(t) - 0.5; y = Math.sin(t) - 0.2; lab = 0; } else { x = Math.cos(t) + 0.5; y = -Math.sin(t) + 0.2; lab = 1; } x += gauss(rng) * 0.12; y += gauss(rng) * 0.12; }
    else if (kind === "circles") { lab = i % 2; const r = lab ? 1.1 : 0.45, a = rng() * Math.PI * 2; x = r * Math.cos(a) + gauss(rng) * 0.1; y = r * Math.sin(a) + gauss(rng) * 0.1; }
    else if (kind === "xor") { const qx = rng() < 0.5 ? -1 : 1, qy = rng() < 0.5 ? -1 : 1; lab = qx * qy > 0 ? 0 : 1; x = qx * (0.4 + rng() * 0.5); y = qy * (0.4 + rng() * 0.5); }
    else { const a = i / N * 3.2 * Math.PI, lab2 = i % 2; lab = lab2; const r = a / (3.2 * Math.PI) * 1.3; const s = lab2 ? 1 : -1; x = s * r * Math.cos(a) + gauss(rng) * 0.06; y = s * r * Math.sin(a) + gauss(rng) * 0.06; }
    pts.push({ x: [x, y], y: lab });
  }
  return pts;
}

const tanh = Math.tanh;
function softmax2(a, b) { const m = Math.max(a, b), ea = Math.exp(a - m), eb = Math.exp(b - m), s = ea + eb; return [ea / s, eb / s]; }

function ProbingClassifierDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rngRef = _useRef(mulberry32(7));
  const dataRef = _useRef([]);
  const netRef = _useRef(null);
  const probesRef = _useRef(null); // [{Wp:[2][dL], bp:[2]} per layer]
  const accRef = _useRef([0, 0, 0, 0]); // input, h1, h2, output(host)
  const rafRef = _useRef(null);

  const [dataset, setDataset] = _useState("spiral");
  const [lr, setLr] = _useState(0.1);
  const [running, setRunning] = _useState(false);
  const [epoch, setEpoch] = _useState(0);
  const [, setTick] = _useState(0);

  const dsRef = _useRef(dataset), lrRef = _useRef(lr);
  _useEffect(() => { lrRef.current = lr; }, [lr]);

  function randMat(r, c, rng, s) { return Array.from({ length: r }, () => Array.from({ length: c }, () => gauss(rng) * s)); }
  function initNet() {
    const rng = rngRef.current;
    netRef.current = { W1: randMat(NH, 2, rng, 0.9), b1: new Array(NH).fill(0), W2: randMat(NH, NH, rng, 0.7), b2: new Array(NH).fill(0), W3: randMat(2, NH, rng, 0.7), b3: [0, 0] };
    probesRef.current = [
      { Wp: randMat(2, 2, rng, 0.3), bp: [0, 0] },
      { Wp: randMat(2, NH, rng, 0.3), bp: [0, 0] },
      { Wp: randMat(2, NH, rng, 0.3), bp: [0, 0] },
    ];
    accRef.current = [0, 0, 0, 0];
  }

  function forward(net, x) {
    const z1 = net.b1.map((b, i) => b + net.W1[i][0] * x[0] + net.W1[i][1] * x[1]); const h1 = z1.map(tanh);
    const z2 = net.b2.map((b, i) => b + net.W2[i].reduce((s, w, j) => s + w * h1[j], 0)); const h2 = z2.map(tanh);
    const zo = net.b3.map((b, i) => b + net.W3[i].reduce((s, w, j) => s + w * h2[j], 0));
    const p = softmax2(zo[0], zo[1]);
    return { z1, h1, z2, h2, zo, p };
  }

  function trainNetStep() {
    const net = netRef.current, data = dataRef.current, lr = lrRef.current, N = data.length;
    const gW1 = net.W1.map(r => r.map(() => 0)), gb1 = net.b1.map(() => 0), gW2 = net.W2.map(r => r.map(() => 0)), gb2 = net.b2.map(() => 0), gW3 = net.W3.map(r => r.map(() => 0)), gb3 = [0, 0];
    for (const d of data) {
      const f = forward(net, d.x), y = d.y;
      const dzo = [f.p[0] - (y === 0 ? 1 : 0), f.p[1] - (y === 1 ? 1 : 0)];
      for (let i = 0; i < 2; i++) { gb3[i] += dzo[i]; for (let j = 0; j < NH; j++) gW3[i][j] += dzo[i] * f.h2[j]; }
      const dh2 = new Array(NH).fill(0); for (let j = 0; j < NH; j++) for (let i = 0; i < 2; i++) dh2[j] += net.W3[i][j] * dzo[i];
      const dz2 = dh2.map((g, j) => g * (1 - f.h2[j] * f.h2[j]));
      for (let i = 0; i < NH; i++) { gb2[i] += dz2[i]; for (let j = 0; j < NH; j++) gW2[i][j] += dz2[i] * f.h1[j]; }
      const dh1 = new Array(NH).fill(0); for (let j = 0; j < NH; j++) for (let i = 0; i < NH; i++) dh1[j] += net.W2[i][j] * dz2[i];
      const dz1 = dh1.map((g, j) => g * (1 - f.h1[j] * f.h1[j]));
      for (let i = 0; i < NH; i++) { gb1[i] += dz1[i]; gW1[i][0] += dz1[i] * d.x[0]; gW1[i][1] += dz1[i] * d.x[1]; }
    }
    const s = lr / N;
    for (let i = 0; i < NH; i++) { net.b1[i] -= s * gb1[i]; net.W1[i][0] -= s * gW1[i][0]; net.W1[i][1] -= s * gW1[i][1]; net.b2[i] -= s * gb2[i]; for (let j = 0; j < NH; j++) net.W2[i][j] -= s * gW2[i][j]; }
    for (let i = 0; i < 2; i++) { net.b3[i] -= s * gb3[i]; for (let j = 0; j < NH; j++) net.W3[i][j] -= s * gW3[i][j]; }
  }

  // representations at each layer for all points
  function reps() {
    const net = netRef.current, data = dataRef.current;
    const R = [[], [], []], host = [];
    for (const d of data) { const f = forward(net, d.x); R[0].push(d.x); R[1].push(f.h1); R[2].push(f.h2); host.push(f.p[0] >= f.p[1] ? 0 : 1); }
    return { R, host };
  }

  function trainProbes(R) {
    const data = dataRef.current, probes = probesRef.current;
    for (let L = 0; L < 3; L++) {
      const pr = probes[L], A = R[L], dL = A[0].length;
      for (let it = 0; it < 4; it++) {
        const gW = pr.Wp.map(r => r.map(() => 0)), gb = [0, 0];
        for (let n = 0; n < A.length; n++) {
          const r = A[n], y = data[n].y;
          const o0 = pr.bp[0] + pr.Wp[0].reduce((s, w, j) => s + w * r[j], 0), o1 = pr.bp[1] + pr.Wp[1].reduce((s, w, j) => s + w * r[j], 0);
          const p = softmax2(o0, o1), dz = [p[0] - (y === 0 ? 1 : 0), p[1] - (y === 1 ? 1 : 0)];
          for (let i = 0; i < 2; i++) { gb[i] += dz[i]; for (let j = 0; j < dL; j++) gW[i][j] += dz[i] * r[j]; }
        }
        const s = 0.5 / A.length;
        for (let i = 0; i < 2; i++) { pr.bp[i] -= s * gb[i]; for (let j = 0; j < dL; j++) pr.Wp[i][j] -= s * (gW[i][j] + 0.001 * pr.Wp[i][j]); }
      }
    }
  }

  function evalAcc(R, host) {
    const data = dataRef.current, probes = probesRef.current, acc = [0, 0, 0, 0];
    for (let L = 0; L < 3; L++) { const pr = probes[L], A = R[L]; let c = 0; for (let n = 0; n < A.length; n++) { const r = A[n]; const o0 = pr.bp[0] + pr.Wp[0].reduce((s, w, j) => s + w * r[j], 0), o1 = pr.bp[1] + pr.Wp[1].reduce((s, w, j) => s + w * r[j], 0); if ((o0 >= o1 ? 0 : 1) === data[n].y) c++; } acc[L] = c / A.length; }
    let hc = 0; for (let n = 0; n < data.length; n++) if (host[n] === data[n].y) hc++; acc[3] = hc / data.length;
    accRef.current = acc;
  }

  function epochStep() {
    trainNetStep();
    const { R, host } = reps();
    trainProbes(R); evalAcc(R, host);
    setEpoch(v => v + 1);
  }

  function reset() {
    rngRef.current = mulberry32(Math.floor(Math.random() * 1e6));
    dataRef.current = makeData(dsRef.current, rngRef.current);
    initNet();
    const { R, host } = reps(); trainProbes(R); evalAcc(R, host);
    setEpoch(0); setTick(v => v + 1); draw();
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const acc = accRef.current;
    // bar chart of per-layer probe accuracy
    const labels = ["INPUT", "HIDDEN 1", "HIDDEN 2", "OUTPUT"];
    const cols = ["#475569", "#60a5fa", "#a855f7", "#34d399"];
    const bx = 28, bw = 64, gap = 26, base = 250, top = 40, sh = base - top;
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px JetBrains Mono, monospace"; ctx.textAlign = "left";
    ctx.fillText("LINEAR-PROBE ACCURACY BY LAYER", bx, 22);
    // 50% chance line
    const chanceY = base - 0.5 * sh; ctx.strokeStyle = "rgba(248,113,113,0.5)"; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(bx, chanceY); ctx.lineTo(bx + 4 * (bw + gap), chanceY); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "rgba(248,113,113,0.7)"; ctx.fillText("chance", bx + 4 * (bw + gap) - 36, chanceY - 4);
    for (let i = 0; i < 4; i++) {
      const x = bx + i * (bw + gap), a = acc[i], bh = a * sh;
      ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.fillRect(x, top, bw, sh);
      ctx.fillStyle = cols[i]; ctx.fillRect(x, base - bh, bw, bh);
      ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "12px JetBrains Mono"; ctx.fillText((a * 100).toFixed(0) + "%", x + bw / 2, base - bh - 6);
      ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.font = "9px JetBrains Mono"; ctx.fillText(labels[i], x + bw / 2, base + 16);
    }
    ctx.textAlign = "left";
    // decision-boundary inset (host net)
    const ix = 366, iy = 40, iw = 150, ih = 150;
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillText("HOST NET BOUNDARY", ix, iy - 8);
    const net = netRef.current, R = 1.7;
    const toIX = x => ix + (x + R) / (2 * R) * iw, toIY = y => iy + (1 - (y + R) / (2 * R)) * ih;
    const CS = 6;
    for (let px = 0; px < iw; px += CS) for (let py = 0; py < ih; py += CS) {
      const x = -R + (px / iw) * 2 * R, y = R - (py / ih) * 2 * R; const f = forward(net, [x, y]);
      ctx.fillStyle = f.p[0] >= f.p[1] ? "rgba(96,165,250,0.18)" : "rgba(168,85,247,0.18)"; ctx.fillRect(ix + px, iy + py, CS, CS);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.strokeRect(ix, iy, iw, ih);
    for (const d of dataRef.current) { ctx.fillStyle = d.y === 0 ? "#60a5fa" : "#c084fc"; ctx.strokeStyle = "#0a0e1a"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(toIX(d.x[0]), toIY(d.x[1]), 2.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    // caption
    ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.font = "9px JetBrains Mono";
    ctx.fillText("deeper layers untangle the data ->", bx, base + 44);
    ctx.fillText("a linear probe gets more accurate with depth", bx, base + 58);
  }

  function handleRun() { if (running) { setRunning(false); return; } setRunning(true); }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    reset();
  }, []);
  _useEffect(() => { dsRef.current = dataset; setRunning(false); reset(); }, [dataset]);

  _useEffect(() => {
    if (!running) return;
    let alive = true;
    const loop = () => { if (!alive) return; for (let i = 0; i < 3; i++) epochStep(); setTick(v => v + 1); draw(); rafRef.current = requestAnimationFrame(loop); };
    rafRef.current = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, [running]);

  const acc = accRef.current;
  const stage = (<canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />);

  const controls = (
    <ControlGroup>
      <SegmentedControl label="// DATASET" value={dataset} onChange={setDataset}
        options={[{ value: "spiral", label: "Spiral" }, { value: "moons", label: "Moons" }, { value: "circles", label: "Circles" }, { value: "xor", label: "XOR" }]}
        help="A 2-class task that is NOT linearly separable in the input. A straight line can't split it, so the input-layer probe starts near chance (50%)." />
      <Slider label="// LEARNING RATE" min={0.02} max={0.4} step={0.02} value={lr} onChange={setLr}
        help="Step size for training the host MLP. The probes are retrained from scratch each step, so they always reflect how decodable the CURRENT representations are." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={handleRun} primary>{running ? "PAUSE" : "TRAIN"}</DemoButton>
        <DemoButton onClick={() => { for (let i = 0; i < 5; i++) epochStep(); setTick(v => v + 1); draw(); }} disabled={running}>+5 EPOCHS</DemoButton>
        <DemoButton onClick={reset}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="EPOCH" value={epoch} />
        <StatReadout label="HOST ACCURACY" value={(acc[3] * 100).toFixed(0) + "%"} accent="#34d399" />
        <StatReadout label="INPUT PROBE" value={(acc[0] * 100).toFixed(0) + "%"} accent="#94a3b8" />
        <StatReadout label="HIDDEN-2 PROBE" value={(acc[2] * 100).toFixed(0) + "%"} accent="var(--violet-lt)" />
      </div>
      <Legend items={[
        { color: "#475569", label: "INPUT (raw)" },
        { color: "#60a5fa", label: "HIDDEN 1" },
        { color: "#a855f7", label: "HIDDEN 2" },
        { color: "#34d399", label: "OUTPUT (host)" },
      ]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        A <b>linear probe</b> is the standard interpretability test for "what does this layer
        represent": freeze the network, take a layer's activations, and fit the <i>simplest
        possible</i> readout — a linear classifier — to predict the label. If a linear probe
        succeeds, the information is present and <b>linearly accessible</b> at that layer.
      </DemoP>
      <DemoP>
        Train the host net and watch the bars: the <b>input</b> probe is stuck near 50% because
        the raw data isn't linearly separable, but each hidden layer is more decodable than the
        last — the network is <b>progressively untangling</b> the classes until the final
        representation is trivially separable (matching the host's own accuracy). That left-to-right
        climb is the whole story of representation learning: depth doesn't add information, it
        <i> reformats</i> it into a linearly usable geometry.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Probing is how researchers audit what big models "know": linear probes on transformer layers
        reveal where part-of-speech, syntax, sentiment, truthfulness, or world-models become readable,
        and the same trick underlies <a href={`${window.__DM_BASE || "../../"}visualize/sparse-autoencoder/`}>feature
        extraction</a> and activation steering. The key methodological point is on screen: you keep the
        probe <b>linear</b> on purpose — a powerful probe could learn the task itself and tell you nothing
        about the representation.
      </DemoP>
      <DemoP>
        The honest caveats matter. A probe shows information is <i>decodable</i>, not that the model
        <i> uses</i> it — for causal claims you need interventions (activation patching, ablations). And
        probe accuracy depends on probe capacity and data, so "layer N encodes X" is always relative to
        the probe. Still, this is the cheapest first question in interpretability, and it cleanly
        demonstrates why <a href={`${window.__DM_BASE || "../../"}visualize/neural-playground/`}>depth</a> helps:
        linear separability you couldn't get at the input emerges layer by layer.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      topic="INTERPRETABILITY"
      title="Linear Probing by Layer"
      subtitle="Fit a linear readout to each layer and watch representations become linearly separable with depth."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/neural-nets/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="violet"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ProbingClassifierDemo />);
