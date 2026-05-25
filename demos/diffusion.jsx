// demos/diffusion.jsx — 2D diffusion. Forward noising + reverse DDIM sampling.
// The reverse uses the EXACT score of the empirical data distribution
// (kernel-weighted denoiser) — no training, but real diffusion math.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 460, H = 420, T = 40, M = 260, SCALE = 95;
const cx = W / 2, cy = H / 2;
const px = p => [cx + p.x * SCALE, cy - p.y * SCALE];
const gaussStd = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

function genData(kind, n = 160) {
  const out = [];
  for (let i = 0; i < n; i++) {
    let x, y;
    if (kind === "moons") {
      const arm = i % 2, t = Math.PI * (i / n) * 2 % Math.PI;
      if (arm) { x = 1 - Math.cos(t) - 0.5; y = -Math.sin(t) + 0.25; } else { x = Math.cos(t) - 0.5 + 1; y = Math.sin(t) - 0.25; }
      x = (arm ? (1 - Math.cos(t)) : Math.cos(t)) - 0.5; y = (arm ? -Math.sin(t) + 0.3 : Math.sin(t) - 0.3);
      x += gaussStd() * 0.04; y += gaussStd() * 0.04;
    } else if (kind === "ring") { const a = Math.random() * Math.PI * 2; const r = 1 + gaussStd() * 0.05; x = Math.cos(a) * r; y = Math.sin(a) * r; }
    else if (kind === "spiral") { const t = (i / n) * 3.5 * Math.PI; const r = (i / n) * 1.3 + 0.1; x = Math.cos(t) * r; y = Math.sin(t) * r; x += gaussStd() * 0.03; y += gaussStd() * 0.03; }
    else { const c = (i % 2 ? 0.7 : -0.7); x = c + gaussStd() * 0.18; y = (i % 2 ? 0.6 : -0.6) + gaussStd() * 0.18; }
    out.push({ x, y });
  }
  return out;
}

function schedule(kind) {
  const abar = [1];
  if (kind === "cosine") {
    const s = 0.008, f = t => Math.cos(((t / T + s) / (1 + s)) * Math.PI / 2) ** 2;
    for (let t = 1; t <= T; t++) abar.push(f(t) / f(0));
  } else {
    let prod = 1;
    for (let t = 1; t <= T; t++) { const beta = 1e-4 + (0.02 - 1e-4) * (t - 1) / (T - 1); prod *= (1 - beta); abar.push(prod); }
  }
  return abar;
}

function DiffusionDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const dataRef = _useRef(genData("moons"));
  const epsRef = _useRef([]);          // fixed noise for forward morph
  const partRef = _useRef([]);          // particles for sampling
  const abarRef = _useRef(schedule("linear"));
  const rafRef = _useRef(null);
  const lastRef = _useRef(0);

  const [dataset, setDataset] = _useState("moons");
  const [sched, setSched] = _useState("linear");
  const [speed, setSpeed] = _useState(6);
  const [tcur, setTcur] = _useState(0);
  const [phase, setPhase] = _useState("idle"); // idle|diffuse|sample
  const phaseRef = _useRef("idle"), tRef = _useRef(0), spRef = _useRef(speed);
  _useEffect(() => { spRef.current = speed; }, [speed]);

  function resetForward() {
    epsRef.current = dataRef.current.map(() => ({ x: gaussStd(), y: gaussStd() }));
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // faint data manifold reference
    ctx.fillStyle = "rgba(148,163,184,0.18)";
    for (const d of dataRef.current) { const [a, b] = px(d); ctx.beginPath(); ctx.arc(a, b, 2, 0, Math.PI * 2); ctx.fill(); }
    // active cloud
    const ph = phaseRef.current, abar = abarRef.current, t = tRef.current;
    let cloud = [];
    if (ph === "diffuse") {
      const sa = Math.sqrt(abar[t]), sv = Math.sqrt(1 - abar[t]);
      cloud = dataRef.current.map((d, i) => ({ x: sa * d.x + sv * epsRef.current[i].x, y: sa * d.y + sv * epsRef.current[i].y }));
    } else if (ph === "sample") {
      cloud = partRef.current;
    } else {
      cloud = dataRef.current;
    }
    const col = ph === "idle" ? "#34d399" : ph === "sample" ? "#c084fc" : "#60a5fa";
    ctx.fillStyle = col;
    for (const p of cloud) { const [a, b] = px(p); ctx.beginPath(); ctx.arc(a, b, 2.6, 0, Math.PI * 2); ctx.fill(); }
  }

  // analytic empirical-score DDIM reverse step from t -> t-1 (in place on partRef)
  function ddimStep(t) {
    const abar = abarRef.current, data = dataRef.current;
    const at = abar[t], sat = Math.sqrt(at), vt = 1 - at, atm = abar[t - 1];
    for (const p of partRef.current) {
      // responsibilities r_i ∝ exp(-||x - sqrt(at) x0_i||² / (2 vt))
      let mx = -Infinity; const logs = new Array(data.length);
      for (let i = 0; i < data.length; i++) {
        const dx = p.x - sat * data[i].x, dy = p.y - sat * data[i].y;
        const l = -(dx * dx + dy * dy) / (2 * vt);
        logs[i] = l; if (l > mx) mx = l;
      }
      let sum = 0; for (let i = 0; i < data.length; i++) { logs[i] = Math.exp(logs[i] - mx); sum += logs[i]; }
      let x0x = 0, x0y = 0; for (let i = 0; i < data.length; i++) { const r = logs[i] / sum; x0x += r * data[i].x; x0y += r * data[i].y; }
      // eps_hat then DDIM (eta=0)
      const ex = (p.x - sat * x0x) / Math.sqrt(vt), ey = (p.y - sat * x0y) / Math.sqrt(vt);
      p.x = Math.sqrt(atm) * x0x + Math.sqrt(1 - atm) * ex;
      p.y = Math.sqrt(atm) * x0y + Math.sqrt(1 - atm) * ey;
    }
  }

  function startDiffuse() { stop(); resetForward(); phaseRef.current = "diffuse"; setPhase("diffuse"); tRef.current = 0; setTcur(0); run(); }
  function startSample() { stop(); partRef.current = Array.from({ length: M }, () => ({ x: gaussStd(), y: gaussStd() })); phaseRef.current = "sample"; setPhase("sample"); tRef.current = T; setTcur(T); run(); }
  function reset() { stop(); phaseRef.current = "idle"; setPhase("idle"); tRef.current = 0; setTcur(0); draw(); }
  function stop() { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null; }

  function run() {
    const loop = (now) => {
      if (now - lastRef.current > 1000 / (spRef.current * 3)) {
        lastRef.current = now;
        if (phaseRef.current === "diffuse") {
          tRef.current += 1; if (tRef.current >= T) { tRef.current = T; setTcur(T); draw(); phaseRef.current = "idle"; setPhase("idle"); return; }
          setTcur(tRef.current);
        } else if (phaseRef.current === "sample") {
          if (tRef.current <= 0) { phaseRef.current = "idle"; setPhase("idle"); draw(); return; }
          ddimStep(tRef.current); tRef.current -= 1; setTcur(tRef.current);
        }
        draw();
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    resetForward(); draw();
    return () => stop();
  }, []);
  _useEffect(() => { stop(); dataRef.current = genData(dataset); resetForward(); phaseRef.current = "idle"; setPhase("idle"); tRef.current = 0; setTcur(0); draw(); }, [dataset]);
  _useEffect(() => { abarRef.current = schedule(sched); }, [sched]);

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;

  const controls = (
    <ControlGroup>
      <SegmentedControl label="// TARGET DISTRIBUTION" value={dataset} onChange={setDataset}
        options={[{ value: "moons", label: "Moons" }, { value: "ring", label: "Ring" }, { value: "spiral", label: "Spiral" }, { value: "gauss", label: "Blobs" }]} />
      <SegmentedControl label="// NOISE SCHEDULE" tone="violet" value={sched} onChange={setSched}
        options={[{ value: "linear", label: "Linear" }, { value: "cosine", label: "Cosine" }]} />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={startDiffuse}>▶ DIFFUSE</DemoButton>
        <DemoButton onClick={startSample} primary tone="violet">▶ SAMPLE</DemoButton>
      </div>
      <DemoButton onClick={reset}>RESET</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="TIMESTEP t" value={tcur + " / " + T} />
        <StatReadout label="PHASE" value={phase.toUpperCase()} accent={phase === "sample" ? "var(--violet-lt)" : phase === "diffuse" ? "var(--blue-lt)" : "#34d399"} />
      </div>
      <Legend items={[{ color: "rgba(148,163,184,0.5)", label: "DATA" }, { color: "#60a5fa", label: "FORWARD" }, { color: "#c084fc", label: "SAMPLING" }]} />
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>DIFFUSE: data → noise. SAMPLE: noise → data (DDIM).</div>
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Diffusion models work in two directions. <b>Forward</b> ("Diffuse") is fixed
        and easy: repeatedly add a little Gaussian noise until the data
        distribution becomes pure noise — at timestep <i>t</i> every point is
        <i> √ᾱₜ·x₀ + √(1−ᾱₜ)·ε</i>. Watch the structured cloud dissolve. The
        <b> noise schedule</b> (linear vs cosine) controls how fast that happens.
      </DemoP>
      <DemoP>
        <b>Sampling</b> ("Sample") runs it backward: start from pure noise and
        repeatedly denoise with DDIM. The trick a real model has to <i>learn</i> —
        predicting the noise at each step — is computed here exactly, because for a
        finite dataset the optimal denoiser is just a distance-weighted average of
        the data points (the analytic score). So this is the real reverse diffusion
        math; the cloud of noise condenses straight onto the target shape. Try the
        spiral or moons and watch structure reappear from chaos.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      topic="GENERATIVE MODELS"
      title="Diffusion Sampler"
      subtitle="Noise a distribution into static, then watch DDIM denoise pure noise back into the shape."
      stage={stage} controls={controls} explainer={explainer}
      lessonHref={`${window.__DM_BASE || "../../"}learn/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="violet"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<DiffusionDemo />);
