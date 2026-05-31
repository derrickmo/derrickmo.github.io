// demos/mc-dropout.jsx — Monte-Carlo dropout for predictive uncertainty.
//
// Train a small net WITH dropout on 1D data that has a gap and empty edges. Then,
// instead of turning dropout off at test time, keep it ON and run T stochastic
// forward passes: each random mask is a different thinned sub-network, so the
// spread of their predictions is an (approximately Bayesian) uncertainty estimate.
// Where data is dense the sub-networks agree (tight band); in the gap and out at
// the edges they have nothing pinning them down, so they fan out (wide band).
// Real net, real dropout sampling — the band is the model disagreeing with itself.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480, H1 = 16, H2 = 16;
function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const truef = (x) => 0.8 * Math.sin(1.5 * x) + 0.15 * x;

function MCDropoutDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [drop, setDrop] = _useState(0.2);
  const [T, setT] = _useState(30);
  const [, force] = _useState(0);
  const netRef = _useRef(null);
  const dataRef = _useRef(null);

  function genData() {
    const pts = [];
    for (let i = 0; i < 70; i++) {
      // two clusters with a gap around 0 and empty beyond |x|>2.2
      const x = (Math.random() < 0.5 ? -1.5 : 1.5) + 0.6 * randn();
      if (Math.abs(x) > 2.3) continue;
      pts.push({ x, y: truef(x) + 0.06 * randn() });
    }
    dataRef.current = pts;
  }
  function dropout(vec, q, on) { return on ? vec.map(v => (Math.random() < q ? v / q : 0)) : vec; }
  function fwd(net, x, on, q) {
    const h1 = dropout(net.W1.map((w, j) => Math.tanh(w * x + net.b1[j])), q, on);
    const h2 = dropout(net.W2.map((row, j) => { let s = net.b2[j]; for (let k = 0; k < H1; k++) s += row[k] * h1[k]; return Math.tanh(s); }), q, on);
    let o = net.b3; for (let j = 0; j < H2; j++) o += net.W3[j] * h2[j];
    return o;
  }
  function train() {
    if (!dataRef.current) genData();
    const data = dataRef.current, q = 1 - drop;
    let net = {
      W1: Array.from({ length: H1 }, () => randn() * 0.9), b1: new Float64Array(H1),
      W2: Array.from({ length: H2 }, () => Array.from({ length: H1 }, () => randn() * 0.5)), b2: new Float64Array(H2),
      W3: Array.from({ length: H2 }, () => randn() * 0.5), b3: 0,
    };
    const lr = 0.04;
    for (let it = 0; it < 600; it++) {
      data.forEach(d => {
        // forward with dropout masks (store)
        const m1 = net.W1.map(() => Math.random() < q ? 1 / q : 0);
        const z1 = net.W1.map((w, j) => Math.tanh(w * d.x + net.b1[j])), h1 = z1.map((v, j) => v * m1[j]);
        const m2 = net.W2.map(() => Math.random() < q ? 1 / q : 0);
        const z2 = net.W2.map((row, j) => { let s = net.b2[j]; for (let k = 0; k < H1; k++) s += row[k] * h1[k]; return Math.tanh(s); });
        const h2 = z2.map((v, j) => v * m2[j]);
        let o = net.b3; for (let j = 0; j < H2; j++) o += net.W3[j] * h2[j];
        const e = o - d.y;
        // backprop
        for (let j = 0; j < H2; j++) {
          net.W3[j] -= lr * e * h2[j];
          const dh2 = e * net.W3[j] * m2[j] * (1 - z2[j] * z2[j]);
          for (let k = 0; k < H1; k++) net.W2[j][k] -= lr * dh2 * h1[k];
          net.b2[j] -= lr * dh2;
        }
        net.b3 -= lr * e;
        for (let k = 0; k < H1; k++) {
          let dh1 = 0; for (let j = 0; j < H2; j++) dh1 += e * net.W3[j] * m2[j] * (1 - z2[j] * z2[j]) * net.W2[j][k];
          dh1 *= m1[k] * (1 - z1[k] * z1[k]);
          net.W1[k] -= lr * dh1 * d.x; net.b1[k] -= lr * dh1;
        }
      });
    }
    netRef.current = net; force(x => x + 1);
  }
  _useEffect(() => { genData(); train(); /* eslint-disable-next-line */ }, [drop]);

  const net = netRef.current, data = dataRef.current, q = 1 - drop;
  // MC band over grid
  const GRID = 90, band = [];
  if (net) {
    for (let i = 0; i <= GRID; i++) {
      const x = -3.2 + (6.4 * i) / GRID, samples = [];
      for (let t = 0; t < T; t++) samples.push(fwd(net, x, true, q));
      const mean = samples.reduce((a, b) => a + b, 0) / T;
      const sd = Math.sqrt(samples.reduce((a, b) => a + (b - mean) ** 2, 0) / T);
      band.push({ x, mean, sd, samples });
    }
  }
  const inData = (x) => Math.abs(Math.abs(x) - 1.5) < 0.9 && Math.abs(x) <= 2.3;
  let sdData = 0, nData = 0, sdGap = 0, nGap = 0;
  band.forEach(b => { if (inData(b.x)) { sdData += b.sd; nData++; } else { sdGap += b.sd; nGap++; } });
  sdData = nData ? sdData / nData : 0; sdGap = nGap ? sdGap / nGap : 0;

  function draw() {
    const cv = canvasRef.current; if (!cv || !net) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#94a3b8"; ctx.fillText("MC-DROPOUT PREDICTION  ·  band = ±2σ over T stochastic passes", 20, 22);

    const px = 30, py = 40, pw = W - 60, ph = 300, RX = 3.2, RY = 2.2;
    const sx = (x) => px + ((x + RX) / (2 * RX)) * pw, sy = (y) => py + ph / 2 - (y / RY) * (ph / 2);
    // uncertainty band (±2σ)
    ctx.fillStyle = "rgba(168,85,247,0.18)"; ctx.beginPath();
    band.forEach((b, i) => { const x = sx(b.x), y = sy(b.mean + 2 * b.sd); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
    for (let i = band.length - 1; i >= 0; i--) ctx.lineTo(sx(band[i].x), sy(band[i].mean - 2 * band[i].sd));
    ctx.closePath(); ctx.fill();
    // a few sample curves (faint)
    const nShow = Math.min(8, T);
    for (let t = 0; t < nShow; t++) { ctx.strokeStyle = "rgba(96,165,250,0.18)"; ctx.lineWidth = 1; ctx.beginPath(); band.forEach((b, i) => { const x = sx(b.x), y = sy(b.samples[t]); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }); ctx.stroke(); }
    // mean curve
    ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 2; ctx.beginPath(); band.forEach((b, i) => { const x = sx(b.x), y = sy(b.mean); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }); ctx.stroke();
    // true function (faint dashed)
    ctx.strokeStyle = "rgba(52,211,153,0.4)"; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; ctx.beginPath();
    for (let i = 0; i <= GRID; i++) { const x = -3.2 + 6.4 * i / GRID; if (i === 0) ctx.moveTo(sx(x), sy(truef(x))); else ctx.lineTo(sx(x), sy(truef(x))); } ctx.stroke(); ctx.setLineDash([]);
    // data points
    data.forEach(d => { ctx.fillStyle = "#e2e8f0"; ctx.beginPath(); ctx.arc(sx(d.x), sy(d.y), 2.6, 0, Math.PI * 2); ctx.fill(); });
    // axis
    ctx.strokeStyle = "rgba(148,163,184,0.25)"; ctx.beginPath(); ctx.moveTo(px, sy(0)); ctx.lineTo(px + pw, sy(0)); ctx.stroke();

    // readout
    const by = py + ph + 36;
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono";
    ctx.fillText("mean uncertainty (σ)  —  where the data is vs. where it isn't", 20, by - 4);
    const bar = (yy, label, v, col) => { ctx.fillStyle = "#94a3b8"; ctx.fillText(label, 30, yy + 12); ctx.fillStyle = "rgba(148,163,184,0.15)"; ctx.fillRect(180, yy, W - 250, 14); ctx.fillStyle = col; ctx.fillRect(180, yy, Math.min(1, v / 0.5) * (W - 250), 14); ctx.fillStyle = "#e2e8f0"; ctx.fillText(v.toFixed(3), 180 + Math.min(1, v / 0.5) * (W - 250) + 6, yy + 12); };
    bar(by + 6, "over data", sdData, "rgba(52,211,153,0.7)");
    bar(by + 30, "gap / edges", sdGap, "rgba(248,113,113,0.7)");
    ctx.fillStyle = sdGap > sdData * 1.3 ? "#34d399" : "#64748b"; ctx.font = "10px JetBrains Mono";
    ctx.fillText(sdGap > sdData * 1.3 ? "uncertainty correctly grows away from the data ✓" : "increase dropout or samples to sharpen the effect", 30, by + 56);
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  });

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// DROPOUT RATE" min={0.05} max={0.5} step={0.05} value={drop} onChange={setDrop} tone="violet"
        help="Fraction of hidden units randomly zeroed on each pass (the net is retrained at this rate). Higher dropout = more diverse sub-networks = a wider, more conservative uncertainty band — but too much and even the in-data fit gets noisy." />
      <Slider label="// MC SAMPLES (T)" min={5} max={80} step={5} value={T} onChange={setT}
        help="How many stochastic forward passes to average. More samples give a smoother, more reliable mean and variance estimate — at T× the inference cost, which is the practical price of MC dropout." />
      <DemoButton onClick={() => { genData(); train(); }} primary>NEW DATA</DemoButton>
      <DemoButton onClick={train}>RESAMPLE NET</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="σ OVER DATA" value={sdData.toFixed(3)} accent="#34d399" />
        <StatReadout label="σ IN GAP" value={sdGap.toFixed(3)} accent="#f87171" />
      </div>
      <StatReadout label="UNCERTAINTY RATIO" value={(sdData ? sdGap / sdData : 0).toFixed(1) + "×"} accent="#a855f7" />
      <Legend items={[
        { color: "#a855f7", label: "mean prediction" },
        { color: "rgba(168,85,247,0.4)", label: "±2σ uncertainty" },
        { color: "#60a5fa", label: "dropout samples" },
        { color: "#34d399", label: "true function" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        A normal network outputs a single number with no sense of how sure it is.
        MC dropout turns that point estimate into a distribution almost for free:
        leave dropout switched on at test time and run the same input through many
        times. Each random dropout mask is a slightly different thinned network, so
        you get a cloud of predictions (the faint blue curves) whose mean is the
        answer and whose spread is the uncertainty (the violet band).
      </DemoP>
      <DemoP>
        The data here lives in two clusters with a gap and empty edges. Over the
        clusters the sub-networks are tightly constrained and agree, so the band is
        thin; in the gap and out past the data there's nothing to pin them, so they
        fan out and the band balloons — exactly the behavior you want, encoded in
        the σ-over-data vs σ-in-gap readout. Raise the dropout rate to make the
        ensemble more diverse (wider, more cautious bands); add samples for a
        smoother estimate at higher cost.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        MC dropout (Gal & Ghahramani, 2016) reinterprets dropout as approximate
        Bayesian inference: averaging over dropout masks approximates integrating
        over a posterior on the weights, giving epistemic uncertainty with no change
        to the architecture — just keep dropout on and sample. It's the cheap cousin
        of full Bayesian neural nets and of deep ensembles (train several nets;
        usually better-calibrated but N× the training).
      </DemoP>
      <DemoP>
        Uncertainty is the third pillar of trustworthy ML alongside{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/calibration/`} style={{ color: "#a855f7" }}>calibration</a>{" "}
        (are the probabilities honest?) and{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/conformal/`} style={{ color: "#a855f7" }}>conformal
        prediction</a> (coverage-guaranteed sets). It powers selective prediction
        (abstain when unsure), active-learning acquisition, and out-of-distribution
        detection — though MC dropout's uncertainty is only as good as its
        approximation, which is why it's often paired with calibration or ensembles
        in high-stakes settings.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="TRUSTWORTHY ML" title="MC Dropout"
      subtitle="Keep dropout on at inference and sample many times — the spread is the model's uncertainty, and it grows where the data runs out."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/ml-theory/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<MCDropoutDemo />);
