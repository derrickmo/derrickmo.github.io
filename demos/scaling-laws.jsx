// demos/scaling-laws.jsx — neural scaling laws (Chinchilla parametric form).
// Left: for a fixed compute budget, loss vs model size with the compute-optimal
// point. Right: the loss-vs-compute frontier as the iconic log-log straight line.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 440;
// Chinchilla (Hoffmann et al. 2022) parametric fit: L(N,D) = E + A/N^a + B/D^b
const E = 1.69, A = 406.4, B = 410.7, a = 0.34, b = 0.28;
const lossND = (N, Dt) => E + A / Math.pow(N, a) + B / Math.pow(Dt, b);

function optimalFor(C) {
  // C = 6 N D ; sweep N, take min loss
  let best = { L: Infinity, N: 0, D: 0 };
  for (let ln = 6; ln <= 12; ln += 0.02) {
    const N = Math.pow(10, ln), Dt = C / (6 * N);
    if (Dt < 1e6) continue;
    const L = lossND(N, Dt);
    if (L < best.L) best = { L, N, D: Dt };
  }
  return best;
}
const fmt = (n) => { const e = Math.floor(Math.log10(n)); const m = n / Math.pow(10, e); return `${m.toFixed(1)}e${e}`; };

function ScalingLawsDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [logC, setLogC] = _useState(21);
  const [stats, setStats] = _useState({ N: 0, D: 0, L: 0, ratio: 0 });

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const C = Math.pow(10, logC);
    const opt = optimalFor(C);

    const box = (ox, oy, w, h, title) => {
      ctx.strokeStyle = "rgba(96,165,250,0.25)"; ctx.lineWidth = 1; ctx.strokeRect(ox, oy, w, h);
      ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono, monospace"; ctx.textAlign = "left"; ctx.fillText(title, ox, oy - 8);
    };
    ctx.font = "10px JetBrains Mono, monospace";

    // ── left: L vs N for fixed C ───────────────────────────────
    const lx = 48, ly = 46, lw = 196, lh = 320;
    box(lx, ly, lw, lh, "loss vs model size");
    const nLo = 6, nHi = 12;
    // y-range from data
    let lmin = Infinity, lmax = -Infinity; const pts = [];
    for (let ln = nLo; ln <= nHi; ln += 0.04) { const N = Math.pow(10, ln), Dt = C / (6 * N); if (Dt < 1e6) continue; const L = lossND(N, Dt); pts.push([ln, L]); lmin = Math.min(lmin, L); lmax = Math.max(lmax, L); }
    const yL = (L) => ly + lh - (L - lmin) / (lmax - lmin || 1) * lh;
    const xN = (ln) => lx + (ln - nLo) / (nHi - nLo) * lw;
    ctx.beginPath(); pts.forEach(([ln, L], i) => { const X = xN(ln), Y = yL(L); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
    ctx.strokeStyle = "#60a5fa"; ctx.lineWidth = 2.2; ctx.stroke();
    // optimum marker
    const oX = xN(Math.log10(opt.N)), oY = yL(opt.L);
    ctx.strokeStyle = "rgba(251,191,36,0.5)"; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(oX, ly); ctx.lineTo(oX, ly + lh); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(oX, oY, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#64748b"; ctx.textAlign = "center"; ctx.fillText("model params N (log) →", lx + lw / 2, ly + lh + 22);
    ctx.fillStyle = "#fbbf24"; ctx.fillText("compute-optimal", oX, oY - 12);

    // ── right: frontier L*(C), log-log ─────────────────────────
    const rx = 312, ry = 46, rw = 196, rh = 320;
    box(rx, ry, rw, rh, "loss frontier (log-log)");
    const cLo = 16, cHi = 25;
    const fr = [];
    for (let lc = cLo; lc <= cHi; lc += 0.1) { const o = optimalFor(Math.pow(10, lc)); fr.push([lc, Math.log10(o.L - E)]); }
    let fmin = Infinity, fmax = -Infinity; fr.forEach(([, y]) => { fmin = Math.min(fmin, y); fmax = Math.max(fmax, y); });
    const xC = (lc) => rx + (lc - cLo) / (cHi - cLo) * rw;
    const yF = (y) => ry + rh - (y - fmin) / (fmax - fmin || 1) * rh;
    ctx.beginPath(); fr.forEach(([lc, y], i) => { const X = xC(lc), Y = yF(y); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
    ctx.strokeStyle = "#c084fc"; ctx.lineWidth = 2.2; ctx.stroke();
    const cX = xC(logC), cY = yF(Math.log10(opt.L - E));
    ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(cX, cY, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#64748b"; ctx.textAlign = "center"; ctx.fillText("compute C (log FLOPs) →", rx + rw / 2, ry + rh + 22);
    ctx.fillStyle = "#94a3b8"; ctx.textAlign = "left"; ctx.fillText("log(L − E)", rx + 4, ry + 14);

    setStats({ N: opt.N, D: opt.D, L: opt.L, ratio: opt.D / opt.N });
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  }, []);
  _useEffect(() => { draw(); /* eslint-disable-next-line */ }, [logC]);

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label={`// COMPUTE BUDGET · 1e${logC.toFixed(1)} FLOPs`} min={17} max={24} step={0.25} value={logC} onChange={setLogC} tone="violet"
        help="Total training FLOPs to spend (compute ≈ 6 · params · tokens). Slide it and the compute-optimal split between model size and data shifts along the frontier." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="OPTIMAL PARAMS" value={fmt(stats.N)} accent="#60a5fa" />
        <StatReadout label="OPTIMAL TOKENS" value={fmt(stats.D)} accent="#c084fc" />
        <StatReadout label="PREDICTED LOSS" value={stats.L.toFixed(2)} accent="#fbbf24" />
        <StatReadout label="TOKENS / PARAM" value={Math.round(stats.ratio)} accent="#34d399" />
      </div>
      <Legend items={[{ color: "#60a5fa", label: "LOSS vs N" }, { color: "#c084fc", label: "FRONTIER" }, { color: "#fbbf24", label: "OPTIMUM" }]} />
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>Chinchilla parametric fit L = E + A/N^a + B/D^b, with C = 6ND.</div>
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Scaling laws are why modern AI is an engineering plan, not a guess. Test loss
        falls as a clean <b>power law</b> in model size, data, and compute — straight
        lines on a log-log plot (right panel). Given a fixed <b>compute budget</b>
        (compute ≈ 6 · params · tokens), there's a single best way to spend it: too few
        parameters and the model underfits; too many and you've starved it of tokens.
        The left panel shows that U-shaped tradeoff, and the
        <span style={{ color: "#fbbf24" }}> optimum</span> is the compute-optimal model
        for that budget.
      </DemoP>
      <DemoP>
        Slide the budget and watch the optimum march up the frontier. The headline
        result from the Chinchilla paper falls right out: the compute-optimal
        <b> tokens-per-parameter</b> ratio stays around <b>20</b> across budgets —
        meaning many earlier models were far too large for how little data they saw.
        Being able to read this curve is what lets you answer "how big a model, on how
        much data, for this much GPU time?" before spending the money.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Scaling laws turned model training from guesswork into budgeting. Because loss falls
        as a predictable power law in parameters, data, and compute, labs can forecast a
        large model's performance from small-scale runs and decide how to spend a GPU budget
        <i> before</i> committing it. This is the planning tool behind essentially every
        frontier model.
      </DemoP>
      <DemoP>
        The Chinchilla result you can rediscover here — roughly <b>20 tokens per
        parameter</b> is compute-optimal — reshaped the field: it showed earlier giants like
        GPT-3 were oversized for their data, and it's why recent models train on far more
        tokens relative to their size. The same curves frame today's live debates: running
        out of high-quality data, the training-vs-inference compute tradeoff, and where
        emergent capabilities show up.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Neural Scaling Laws"
      subtitle="Spend compute wisely: the power-law frontier and the compute-optimal balance of parameters and data."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/llm-systems/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="blue" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ScalingLawsDemo />);
