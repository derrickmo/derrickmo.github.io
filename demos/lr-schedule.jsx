// demos/lr-schedule.jsx — learning-rate schedules and why they matter.
// Top panel: the schedule curve (selected bold, others ghosted). Bottom panel:
// the loss from actually running noisy SGD on a quadratic with that exact schedule.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  SegmentedControl, Slider, StatReadout, ControlGroup,
} = window;

const W = 520, H = 440, T = 600;

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const SCHEDULES = {
  "constant": (t, wu, pk, mn) => pk,
  "step": (t, wu, pk, mn) => Math.max(mn, pk * Math.pow(0.3, Math.floor(t / (T / 4)))),
  "exponential": (t, wu, pk, mn) => Math.max(mn, pk * Math.exp(-4 * t / T)),
  "cosine": (t, wu, pk, mn) => t < wu ? pk * t / Math.max(1, wu) : mn + 0.5 * (pk - mn) * (1 + Math.cos(Math.PI * (t - wu) / Math.max(1, T - wu))),
  "warmup-linear": (t, wu, pk, mn) => t < wu ? pk * t / Math.max(1, wu) : Math.max(mn, pk * (1 - (t - wu) / Math.max(1, T - wu))),
};
const LABELS = { "constant": "Constant", "step": "Step", "exponential": "Exp", "cosine": "Cosine+warmup", "warmup-linear": "Warmup+linear" };

function simulate(fn, wu, pk, mn) {
  const rng = mulberry32(12345); let x = 5; const loss = [];
  for (let t = 0; t < T; t++) {
    const lr = fn(t, wu, pk, mn);
    const g = x + 0.6 * (rng() * 2 - 1); // noisy gradient of 0.5 x^2
    x = x - lr * g;
    loss.push(Math.min(1e3, Math.max(1e-4, 0.5 * x * x)));
  }
  return loss;
}

function LRScheduleDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [sched, setSched] = _useState("cosine");
  const [warmup, setWarmup] = _useState(60);
  const [peak, setPeak] = _useState(0.6);
  const [stats, setStats] = _useState({ peak: 0, final: 0, loss: 0 });

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const mn = 0.0;
    const fn = SCHEDULES[sched];

    // ── top panel: LR vs step ──────────────────────────────────
    const px0 = 44, px1 = 500, ty0 = 24, ty1 = 196;
    const sx = (t) => px0 + t / T * (px1 - px0);
    const lyMax = 1.05;
    const ly = (v) => ty1 - Math.min(v, lyMax) / lyMax * (ty1 - ty0);
    ctx.strokeStyle = "rgba(96,165,250,0.18)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px0, ty1); ctx.lineTo(px1, ty1); ctx.moveTo(px0, ty0); ctx.lineTo(px0, ty1); ctx.stroke();
    ctx.fillStyle = "#64748b"; ctx.font = "10px JetBrains Mono, monospace"; ctx.textAlign = "left";
    ctx.fillText("learning rate", px0, ty0 - 8);
    // ghosts
    for (const key of Object.keys(SCHEDULES)) {
      if (key === sched) continue;
      ctx.beginPath();
      for (let t = 0; t <= T; t += 4) { const X = sx(t), Y = ly(SCHEDULES[key](t, warmup, peak, mn)); t === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); }
      ctx.strokeStyle = "rgba(148,163,184,0.18)"; ctx.lineWidth = 1; ctx.stroke();
    }
    // warmup marker
    if (sched === "cosine" || sched === "warmup-linear") {
      ctx.strokeStyle = "rgba(251,191,36,0.4)"; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(sx(warmup), ty0); ctx.lineTo(sx(warmup), ty1); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "#fbbf24"; ctx.fillText("warmup", sx(warmup) + 4, ty0 + 4);
    }
    // selected
    ctx.beginPath();
    for (let t = 0; t <= T; t += 2) { const X = sx(t), Y = ly(fn(t, warmup, peak, mn)); t === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); }
    ctx.strokeStyle = "#60a5fa"; ctx.lineWidth = 2.4; ctx.stroke();

    // ── bottom panel: loss vs step (log) ───────────────────────
    const by0 = 248, by1 = 416;
    const loss = simulate(fn, warmup, peak, mn);
    const lgy = (v) => { const lg = Math.log10(v); return by1 - (lg + 3) / 6 * (by1 - by0); }; // 1e-3..1e3
    ctx.strokeStyle = "rgba(96,165,250,0.18)"; ctx.beginPath(); ctx.moveTo(px0, by1); ctx.lineTo(px1, by1); ctx.moveTo(px0, by0); ctx.lineTo(px0, by1); ctx.stroke();
    ctx.fillStyle = "#64748b"; ctx.fillText("loss (log scale)", px0, by0 - 8);
    for (let p = -3; p <= 3; p += 1) { const Y = lgy(Math.pow(10, p)); ctx.strokeStyle = "rgba(96,165,250,0.07)"; ctx.beginPath(); ctx.moveTo(px0, Y); ctx.lineTo(px1, Y); ctx.stroke(); }
    ctx.beginPath();
    for (let t = 0; t < T; t++) { const X = sx(t), Y = lgy(loss[t]); t === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); }
    ctx.strokeStyle = "#c084fc"; ctx.lineWidth = 2; ctx.stroke();

    setStats({ peak: peak, final: fn(T - 1, warmup, peak, mn), loss: loss[T - 1] });
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  }, []);
  _useEffect(() => { draw(); /* eslint-disable-next-line */ }, [sched, warmup, peak]);

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <SegmentedControl label="// SCHEDULE" value={sched} onChange={setSched}
        options={Object.keys(SCHEDULES).map(k => ({ value: k, label: LABELS[k] }))}
        help="The shape of the learning-rate curve over training — constant, step decay, exponential, cosine-with-warmup, or warmup-then-linear. The loss panel shows how each fares." />
      <Slider label="// WARMUP STEPS" min={0} max={200} value={warmup} onChange={setWarmup} tone="violet"
        help="How long the rate ramps up from zero at the start. Warmup keeps the first noisy gradients from blowing up a fresh model and lets you use a higher peak safely." />
      <Slider label="// PEAK LR" min={0.05} max={2.2} step={0.05} value={peak} onChange={setPeak}
        help="The maximum learning rate the schedule reaches. Push it too high and the loss diverges (this quadratic is stable only below 2) — the classic 'loss went to NaN'." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <StatReadout label="PEAK LR" value={stats.peak.toFixed(2)} />
        <StatReadout label="FINAL LR" value={stats.final.toFixed(3)} accent="var(--violet-lt)" />
        <StatReadout label="FINAL LOSS" value={stats.loss < 0.01 ? stats.loss.toExponential(1) : stats.loss.toFixed(2)} accent="#fbbf24" />
      </div>
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>Ghost lines show the other schedules; the loss curve is real noisy SGD on a quadratic.</div>
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        The learning rate is the single most important hyperparameter, and it almost
        never stays constant. <b>Warmup</b> ramps it up gently so the first noisy
        gradients don't blow up a freshly-initialized model; then a <b>decay</b>
        (cosine, step, exponential, or linear) shrinks it so training can settle into a
        minimum instead of bouncing around it. The top panel is the schedule; the
        bottom panel is the loss from actually running SGD with it — watch how the same
        optimizer converges fast and clean under a good schedule.
      </DemoP>
      <DemoP>
        Push the <b>peak LR</b> too high and the loss diverges (the quadratic is stable
        only for LR &lt; 2) — exactly the "loss went to NaN" failure everyone hits once.
        Add <b>warmup</b> and you can safely use a higher peak. The cosine schedule
        with warmup shown here is the default behind most modern transformer training
        runs; getting this curve right is often the difference between a model that
        trains and one that doesn't.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Learning-rate scheduling is standard practice in every serious training run, not an
        optional polish. The <b>cosine-with-warmup</b> curve shown here is the de-facto
        default for training transformers and LLMs; step decay long ruled computer vision.
        Getting the schedule right is frequently the difference between a model that
        converges cleanly and one that diverges or stalls.
      </DemoP>
      <DemoP>
        The two failure modes you can trigger — divergence from too-high a peak, and the
        unstable start that warmup fixes — explain a lot of real training lore: why warmup
        pairs with large-batch training, why even adaptive optimizers like Adam still want a
        schedule, and why practitioners sweep the learning rate before any other
        hyperparameter. It's the same "the learning rate is everything" lesson as the
        gradient-descent demo, now over a whole training run.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="TRAINING · OPTIMIZATION" title="Learning-Rate Schedules"
      subtitle="Warmup, decay, and why the same optimizer converges or diverges depending on the curve you feed it."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/training-systems/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="blue" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<LRScheduleDemo />);
