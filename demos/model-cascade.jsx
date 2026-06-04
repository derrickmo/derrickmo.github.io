// demos/model-cascade.jsx — Model cascade / early-exit routing. A cheap LINEAR
// model classifies every input and reports a confidence; inputs it is unsure about
// (confidence below a threshold) are ESCALATED to an expensive but accurate kNN
// model. Raising the threshold escalates more inputs -> higher accuracy but higher
// average cost. Two-moons data makes the linear model genuinely weak, so the
// cost/accuracy tradeoff is real. Both models are trained/run in JS.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect, useMemo: _useMemo } = React;
const {
  DemoLayout, DemoP, Slider, StatReadout, ControlGroup, Legend, useIsMobile,
} = window;

const CW = 240, CH = 210, EXP_COST = 12; // expensive model costs 12x the cheap one
const K = 9;

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// two interleaving moons
function moons(n, seed) {
  const rand = rng(seed), pts = [];
  for (let i = 0; i < n; i++) {
    const cls = i % 2;
    const t = rand() * Math.PI;
    let x, y;
    if (cls === 0) { x = Math.cos(t); y = Math.sin(t); }
    else { x = 1 - Math.cos(t); y = 0.5 - Math.sin(t); }
    x += (rand() - 0.5) * 0.34; y += (rand() - 0.5) * 0.34;
    pts.push({ x, y, c: cls });
  }
  return pts;
}

function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }

// logistic regression (the cheap, linear model) via gradient descent
function trainLogistic(train) {
  let w0 = 0, w1 = 0, b = 0; const lr = 0.5;
  for (let it = 0; it < 600; it++) {
    let g0 = 0, g1 = 0, gb = 0;
    for (const p of train) { const z = w0 * p.x + w1 * p.y + b, e = sigmoid(z) - p.c; g0 += e * p.x; g1 += e * p.y; gb += e; }
    const n = train.length; w0 -= lr * g0 / n; w1 -= lr * g1 / n; b -= lr * gb / n;
  }
  return { w0, w1, b };
}
function cheapPredict(m, x, y) { const p = sigmoid(m.w0 * x + m.w1 * y + m.b); return { cls: p >= 0.5 ? 1 : 0, conf: Math.abs(2 * p - 1) }; }

// kNN (the expensive, accurate model)
function knnPredict(train, x, y) {
  let best = []; // keep K nearest as [d2, cls]
  for (const p of train) {
    const d2 = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
    if (best.length < K) { best.push([d2, p.c]); if (best.length === K) best.sort((a, b) => a[0] - b[0]); }
    else if (d2 < best[K - 1][0]) { best[K - 1] = [d2, p.c]; best.sort((a, b) => a[0] - b[0]); }
  }
  let votes = 0; for (const b of best) votes += b[1];
  return votes * 2 > K ? 1 : 0;
}

function ModelCascadeDemo() {
  const cvRef = _useRef(null);
  const mobile = useIsMobile ? useIsMobile() : false;
  const [thresh, setThresh] = _useState(0.5);
  const [seed, setSeed] = _useState(5);

  // train both models + precompute per-pixel predictions (independent of threshold)
  const model = _useMemo(() => {
    const train = moons(130, seed * 7919 + 1);
    const test = moons(320, seed * 104729 + 99);
    const m = trainLogistic(train);
    // data bounds -> pixel mapping
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    for (const p of train.concat(test)) { minx = Math.min(minx, p.x); maxx = Math.max(maxx, p.x); miny = Math.min(miny, p.y); maxy = Math.max(maxy, p.y); }
    const padx = (maxx - minx) * 0.08, pady = (maxy - miny) * 0.08;
    minx -= padx; maxx += padx; miny -= pady; maxy += pady;
    const toPx = (x, y) => [((x - minx) / (maxx - minx)) * CW, ((y - miny) / (maxy - miny)) * CH];
    const toData = (px, py) => [minx + (px / CW) * (maxx - minx), miny + (py / CH) * (maxy - miny)];
    // per-pixel cheap pred/conf + expensive pred
    const cheapCls = new Uint8Array(CW * CH), cheapConf = new Float32Array(CW * CH), expCls = new Uint8Array(CW * CH);
    for (let py = 0; py < CH; py++) for (let px = 0; px < CW; px++) {
      const [dx, dy] = toData(px + 0.5, py + 0.5);
      const cp = cheapPredict(m, dx, dy); const i = py * CW + px;
      cheapCls[i] = cp.cls; cheapConf[i] = cp.conf; expCls[i] = knnPredict(train, dx, dy);
    }
    // reference accuracies + per-test cheap conf/preds (for fast threshold sweeps)
    const tc = test.map(p => { const cp = cheapPredict(m, p.x, p.y); return { conf: cp.conf, cheap: cp.cls, exp: knnPredict(train, p.x, p.y), c: p.c }; });
    let cheapAcc = 0, expAcc = 0; for (const t of tc) { if (t.cheap === t.c) cheapAcc++; if (t.exp === t.c) expAcc++; }
    cheapAcc /= tc.length; expAcc /= tc.length;
    return { train, test, m, toPx, cheapCls, cheapConf, expCls, tc, cheapAcc, expAcc };
  }, [seed]);

  // metrics at current threshold
  const metrics = _useMemo(() => {
    const { tc } = model; let correct = 0, esc = 0;
    for (const t of tc) { const escalate = t.conf < thresh; if (escalate) esc++; const pred = escalate ? t.exp : t.cheap; if (pred === t.c) correct++; }
    const escRate = esc / tc.length;
    const cost = 1 + escRate * EXP_COST;        // cheap always runs; escalated also pay expensive
    return { acc: correct / tc.length, escRate, cost };
  }, [model, thresh]);

  _useEffect(() => {
    const ctx = cvRef.current.getContext("2d");
    const { cheapCls, cheapConf, expCls, train, test, toPx } = model;
    const im = ctx.createImageData(CW, CH); const d = im.data;
    for (let i = 0; i < CW * CH; i++) {
      const escalate = cheapConf[i] < thresh;
      const cls = escalate ? expCls[i] : cheapCls[i];
      // base class tint; escalated band rendered cooler/violet to mark "sent to expensive model"
      let r, g, b;
      if (escalate) { r = cls ? 120 : 70; g = 50; b = 150; }       // violet-ish escalation region
      else { r = cls ? 40 : 18; g = cls ? 70 : 40; b = cls ? 120 : 60; } // blue cheap region
      d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255;
    }
    ctx.putImageData(im, 0, 0);
    // test points
    for (const p of test) {
      const [px, py] = toPx(p.x, p.y);
      ctx.beginPath(); ctx.arc(px, py, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = p.c ? "#93c5fd" : "#fbbf24"; ctx.fill();
    }
  }, [model, thresh]);

  const stage = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <span className="t-mono-s" style={{ color: "var(--muted)" }}>CHEAP LINEAR MODEL + ESCALATION BAND (sent to expensive kNN)</span>
      <canvas ref={cvRef} width={CW} height={CH}
        style={{ width: CW * (mobile ? 1.3 : 1.7), height: CH * (mobile ? 1.3 : 1.7), imageRendering: "pixelated", borderRadius: 4, border: "1px solid var(--border)", background: "#05060f" }} />
      <span className="t-mono-s" style={{ color: "var(--dim)", fontSize: 9 }}>violet = uncertain inputs escalated to the expensive model · dots = test points by true class</span>
    </div>
  );

  const controls = (
    <ControlGroup>
      <Slider label="// CONFIDENCE THRESHOLD" min={0} max={0.95} step={0.01} value={thresh} onChange={setThresh} tone="violet"
        help="Escalate any input whose cheap-model confidence falls below this. 0 = trust the cheap model on everything (cheapest, least accurate). Higher = send more of the uncertain middle to the expensive model (more accurate, more costly). This single knob slides you along the cost/accuracy curve." />
      <Slider label="// DATASET" min={1} max={12} step={1} value={seed} onChange={setSeed} tone="blue"
        help="Resample the two-moons data and retrain both models. The moons are nonlinear, so the linear cheap model is genuinely weak in the middle where the classes interleave — exactly the region worth escalating." />
      <StatReadout label="CASCADE ACCURACY" value={(metrics.acc * 100).toFixed(1) + "%"} accent="var(--blue-lt)" />
      <StatReadout label="ESCALATED" value={(metrics.escRate * 100).toFixed(0) + "%"} accent="var(--violet-lt)" />
      <StatReadout label="AVG COST / REQ" value={metrics.cost.toFixed(1) + "x"} accent="var(--violet-lt)" />
      <StatReadout label="CHEAP-ONLY / EXPENSIVE-ONLY" value={(model.cheapAcc * 100).toFixed(0) + "% / " + (model.expAcc * 100).toFixed(0) + "%"} accent="var(--dim)" />
      <Legend items={[{ label: "class A", color: "#fbbf24" }, { label: "class B", color: "#93c5fd" }, { label: "escalated", color: "#a855f7" }]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        A cascade puts a <b>cheap, fast model in front of an expensive, accurate one</b>.
        The cheap model (here a linear classifier) labels every input and reports how
        <b> confident</b> it is. Inputs it's sure about exit immediately; only the
        uncertain ones — the violet band straddling the cheap model's decision boundary —
        are <b>escalated</b> to the expensive kNN model. Most inputs are easy, so you pay
        the big cost on only a slice of traffic.
      </DemoP>
      <DemoP>
        Slide the <b>confidence threshold</b> and watch the tradeoff. At 0 nothing
        escalates: you get the cheap model's mediocre accuracy at <b>1× cost</b>. Raise
        it and the band widens — accuracy climbs toward the expensive model's while the
        <b> average cost</b> creeps up with the escalation rate. The whole point is that
        the curve is steep early: a little escalation buys most of the accuracy, because
        the hard cases cluster exactly where the cheap model is unsure. That only works
        if the cheap model's confidence is trustworthy — a poorly
        <a href={`${window.__DM_BASE || "../../"}visualize/calibration/`}> calibrated</a> model
        escalates the wrong inputs.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Cascades and early-exit are everywhere in real serving: cheap retrieval or a
        small model fielding most queries and escalating only the hard ones to a frontier
        model, early-exit transformers that stop at a shallow layer when confident, and
        the classic Viola-Jones face detector's cascade of ever-costlier stages. It's the
        same spend-compute-only-where-needed instinct as
        <a href={`${window.__DM_BASE || "../../"}visualize/moe/`}> mixture-of-experts</a> routing
        and <a href={`${window.__DM_BASE || "../../"}visualize/speculative-decoding/`}>speculative decoding</a>,
        just at the level of whole models instead of layers or tokens.
      </DemoP>
      <DemoP>
        The catch is that a cascade is only as good as its router. Deferring on
        confidence assumes the confidence means something, which ties it to
        calibration and to <a href={`${window.__DM_BASE || "../../"}visualize/conformal/`}>conformal</a>
        uncertainty; a confidently-wrong cheap model routes hard cases straight to the
        cheap (wrong) answer. In production you also balance this against
        <a href={`${window.__DM_BASE || "../../"}visualize/batching/`}> batching</a> and latency —
        escalation adds a second model hop to the tail.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      topic="MLOPS & SERVING"
      title="Model Cascade (Early-Exit)"
      subtitle="Let a cheap model answer the easy inputs and escalate only the uncertain ones to an expensive model — spend big compute where it actually changes the answer."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="blue"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ModelCascadeDemo />);
