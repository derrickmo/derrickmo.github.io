// demos/pruning.jsx — magnitude weight pruning and the accuracy-vs-sparsity curve.
//
// Train a tiny 2->8->1 MLP on a 2D two-class problem (real gradient descent),
// then prune: zero the smallest-magnitude weights. Accuracy holds nearly flat as
// you remove a surprising fraction of weights, then falls off a cliff once the
// few that carry the function are gone — the empirical backbone of network
// pruning and the lottery-ticket hypothesis. The sweep curve and a live weight
// grid (kept vs pruned) make the tradeoff concrete.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480, HID = 8;
const sigmoid = (z) => 1 / (1 + Math.exp(-z));
function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

function PruningDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [sparsity, setSparsity] = _useState(0.5);
  const [, force] = _useState(0);
  const netRef = _useRef(null);
  const dataRef = _useRef([]);

  function train() {
    // dataset: two gaussian blobs (XOR-ish offset to need hidden units)
    const data = [];
    for (let i = 0; i < 160; i++) {
      const cls = i % 2;
      const cx = cls === 0 ? -0.9 : 0.9, cy = (i % 4 < 2 ? -0.7 : 0.7) * (cls === 0 ? 1 : -1);
      data.push({ x: cx + 0.45 * randn(), y: cy + 0.45 * randn(), t: cls });
    }
    dataRef.current = data;
    let W1 = Array.from({ length: HID }, () => [randn() * 0.8, randn() * 0.8]);
    let b1 = new Float64Array(HID);
    let W2 = Array.from({ length: HID }, () => randn() * 0.8);
    let b2 = 0;
    const lr = 0.25;
    for (let it = 0; it < 700; it++) {
      const gW1 = Array.from({ length: HID }, () => [0, 0]), gb1 = new Float64Array(HID), gW2 = new Float64Array(HID);
      let gb2 = 0;
      data.forEach(d => {
        const h = new Float64Array(HID);
        for (let j = 0; j < HID; j++) h[j] = Math.tanh(W1[j][0] * d.x + W1[j][1] * d.y + b1[j]);
        let o = b2; for (let j = 0; j < HID; j++) o += W2[j] * h[j];
        const p = sigmoid(o), e = p - d.t;
        for (let j = 0; j < HID; j++) { gW2[j] += e * h[j]; const dh = e * W2[j] * (1 - h[j] * h[j]); gW1[j][0] += dh * d.x; gW1[j][1] += dh * d.y; gb1[j] += dh; }
        gb2 += e;
      });
      const n = data.length, s = lr / n;
      for (let j = 0; j < HID; j++) { W1[j][0] -= s * gW1[j][0]; W1[j][1] -= s * gW1[j][1]; b1[j] -= s * gb1[j]; W2[j] -= s * gW2[j]; }
      b2 -= s * gb2;
    }
    netRef.current = { W1, b1, W2, b2 };
    force(x => x + 1);
  }
  _useEffect(() => { train(); /* eslint-disable-next-line */ }, []);

  function threshFor(s) {
    const net = netRef.current; const mags = [];
    net.W1.forEach(r => r.forEach(w => mags.push(Math.abs(w))));
    net.W2.forEach(w => mags.push(Math.abs(w)));
    mags.sort((a, b) => a - b);
    return mags[Math.min(mags.length - 1, Math.floor(s * mags.length))] || 0;
  }
  function accAt(s) {
    const net = netRef.current, thr = threshFor(s), data = dataRef.current;
    const keep = (w) => Math.abs(w) >= thr ? w : 0;
    let c = 0;
    data.forEach(d => {
      const h = new Float64Array(HID);
      for (let j = 0; j < HID; j++) h[j] = Math.tanh(keep(net.W1[j][0]) * d.x + keep(net.W1[j][1]) * d.y + net.b1[j]);
      let o = net.b2; for (let j = 0; j < HID; j++) o += keep(net.W2[j]) * h[j];
      if ((sigmoid(o) > 0.5 ? 1 : 0) === d.t) c++;
    });
    return c / data.length;
  }

  const net = netRef.current;
  const thr = net ? threshFor(sparsity) : 0;
  const acc = net ? accAt(sparsity) : 0;
  const curve = net ? Array.from({ length: 20 }, (_, i) => ({ s: i / 19, a: accAt(i / 19) })) : [];
  const totalW = HID * 2 + HID; // prunable weights
  const kept = Math.round(totalW * (1 - sparsity));

  function draw() {
    const cv = canvasRef.current; if (!cv || !net) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";

    // accuracy vs sparsity curve
    const pX = 40, pY = 50, pW = W - 80, pH = 200;
    ctx.fillStyle = "#94a3b8"; ctx.fillText("ACCURACY vs SPARSITY  ·  graceful, then a cliff", pX, pY - 8);
    ctx.strokeStyle = "rgba(96,165,250,0.18)"; ctx.strokeRect(pX, pY, pW, pH);
    const xOf = (s) => pX + s * pW, yOf = (a) => pY + pH - ((a - 0.4) / 0.6) * (pH - 10) - 5;
    // baseline (dense acc)
    ctx.strokeStyle = "rgba(52,211,153,0.3)"; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(pX, yOf(curve[0].a)); ctx.lineTo(pX + pW, yOf(curve[0].a)); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 2; ctx.beginPath();
    curve.forEach((pt, i) => { const x = xOf(pt.s), y = yOf(pt.a); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
    ctx.stroke();
    // current marker
    ctx.strokeStyle = "rgba(251,191,36,0.6)"; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(xOf(sparsity), pY); ctx.lineTo(xOf(sparsity), pY + pH); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(xOf(sparsity), yOf(acc), 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(148,163,184,0.6)"; ctx.font = "9px JetBrains Mono";
    ctx.fillText("0%", pX, pY + pH + 12); ctx.fillText("100% pruned", pX + pW - 56, pY + pH + 12);
    ctx.fillText("40%", pX - 22, yOf(0.4) + 3); ctx.fillText("100%", pX - 26, yOf(1) + 3);

    // weight grid: which weights survive
    const gy = 286;
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono";
    ctx.fillText("WEIGHTS  ·  kept (colored by magnitude) vs pruned (gray)", pX, gy - 6);
    const cs = 18, gap = 4;
    let bx = pX;
    const cellAt = (w, x, y) => {
      const pruned = Math.abs(w) < thr;
      if (pruned) { ctx.fillStyle = "rgba(148,163,184,0.15)"; ctx.fillRect(x, y, cs, cs); ctx.strokeStyle = "rgba(148,163,184,0.3)"; ctx.beginPath(); ctx.moveTo(x + 3, y + 3); ctx.lineTo(x + cs - 3, y + cs - 3); ctx.moveTo(x + cs - 3, y + 3); ctx.lineTo(x + 3, y + cs - 3); ctx.stroke(); }
      else { const t = Math.min(1, Math.abs(w) / 1.6); const c = [60 + 108 * t, 130 - 45 * t, 246 - 99 * t]; ctx.fillStyle = `rgb(${c[0]|0},${c[1]|0},${c[2]|0})`; ctx.fillRect(x, y, cs, cs); }
    };
    ctx.fillStyle = "#64748b"; ctx.font = "9px JetBrains Mono"; ctx.fillText("W1 (8×2)", bx, gy + 4);
    for (let j = 0; j < HID; j++) for (let k = 0; k < 2; k++) cellAt(net.W1[j][k], bx + k * (cs + gap), gy + 10 + j * (cs + gap) * 0.62 + 6);
    bx = pX + 180;
    ctx.fillStyle = "#64748b"; ctx.fillText("W2 (8×1)", bx, gy + 4);
    for (let j = 0; j < HID; j++) cellAt(net.W2[j], bx, gy + 10 + j * (cs + gap) * 0.62 + 6);

    // big readouts
    ctx.fillStyle = "#c084fc"; ctx.font = "600 26px Space Grotesk, JetBrains Mono";
    ctx.fillText((sparsity * 100).toFixed(0) + "%", pX + 320, gy + 40);
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono"; ctx.fillText("pruned", pX + 320, gy + 56);
    ctx.fillStyle = acc > curve[0].a - 0.03 ? "#34d399" : "#f87171"; ctx.font = "600 26px Space Grotesk, JetBrains Mono";
    ctx.fillText((acc * 100).toFixed(0) + "%", pX + 410, gy + 40);
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono"; ctx.fillText("accuracy", pX + 410, gy + 56);
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
      <Slider label="// SPARSITY" min={0} max={0.95} step={0.05} value={sparsity} onChange={setSparsity} tone="violet"
        help="Fraction of weights zeroed (smallest magnitude first). Slide it up and follow the curve: accuracy barely moves through the early range — most weights are near-redundant — then drops sharply once you start cutting the few that actually encode the function." />
      <DemoButton onClick={train} primary>RETRAIN</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="SPARSITY" value={(sparsity * 100).toFixed(0) + "%"} accent="#c084fc" />
        <StatReadout label="ACCURACY" value={(acc * 100).toFixed(0) + "%"} accent={net && acc > curve[0].a - 0.03 ? "#34d399" : "#f87171"} />
      </div>
      <StatReadout label="WEIGHTS KEPT" value={kept + " / " + totalW} accent="#60a5fa" />
      <Legend items={[
        { color: "#a855f7", label: "accuracy curve" },
        { color: "#60a5fa", label: "kept weight" },
        { color: "#94a3b8", label: "pruned weight" },
        { color: "#34d399", label: "dense baseline" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Trained networks are wildly over-parameterized — most weights carry almost
        no signal. Magnitude pruning exploits that: rank the weights by absolute
        value and zero the smallest ones. The purple curve sweeps accuracy as you
        prune more and more; the dashed green line is the dense model's accuracy.
        Notice how flat the curve stays at first — you can delete half the weights,
        sometimes far more, with essentially no accuracy loss.
      </DemoP>
      <DemoP>
        Keep dragging SPARSITY and you eventually hit the cliff: once pruning
        reaches the handful of large weights that actually shape the decision
        boundary, accuracy collapses. The weight grid shows it directly — kept
        weights stay colored, pruned ones turn to gray crosses, and the survivors
        at high sparsity are exactly the high-magnitude ones. RETRAIN to see the
        cliff land in a different place each time.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Pruning is a core model-compression technique alongside{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/quantization/`} style={{ color: "#a855f7" }}>quantization</a>:
        one removes weights, the other shrinks the bits per weight, and they stack.
        Magnitude pruning shown here is the simplest criterion; structured pruning
        removes whole neurons/channels/heads (so you get real speedups, not just
        sparse matrices), and the lottery-ticket hypothesis showed these surviving
        sub-networks can even be retrained from scratch to full accuracy.
      </DemoP>
      <DemoP>
        In practice pruning is iterative — prune a bit, fine-tune to recover, repeat
        — which pushes the cliff much further right than one-shot pruning does. The
        payoff is smaller, faster, cheaper-to-serve models; the catch is that
        unstructured sparsity needs hardware/kernels that exploit it to actually run
        faster, which is why structured pruning and 2:4 sparsity (supported on
        modern GPUs) matter for real deployments.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="EFFICIENCY" title="Pruning & Sparsity"
      subtitle="Zero the smallest weights and accuracy barely budges — until it falls off a cliff. The over-parameterization that makes networks compressible."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/training-systems/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<PruningDemo />);
