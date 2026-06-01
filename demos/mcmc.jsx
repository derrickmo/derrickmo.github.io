// demos/mcmc.jsx — Metropolis-Hastings MCMC sampling, live, in 2D.
//
// MCMC draws samples from a target density p(x) you can only evaluate up to a
// constant. Random-walk Metropolis: from the current point x, propose
//   x' = x + N(0, σ²I), accept with probability min(1, p(x')/p(x)),
// otherwise stay put. The chain's stationary distribution IS p, so the visited
// points (after burn-in) are samples from it — no normalization needed. The
// proposal step σ is the whole tradeoff: too small and the chain crawls (high
// acceptance, but glacial mixing and huge autocorrelation); too large and almost
// every move is rejected (the chain freezes). We draw the target as a heatmap,
// the live chain trail, the accumulating sample cloud, and the acceptance rate.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, Toggle, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 460;
const XMIN = -3.2, XMAX = 3.2, YMIN = -2.6, YMAX = 2.6;
const GW = 110, GH = 92;          // heatmap resolution

// unnormalized log-target densities
function logTarget(target, x, y) {
  if (target === "banana") {
    const v = y + 0.7 * (x * x - 1.3);
    return -0.5 * ((x * x) / 1.0 + (v * v) / 0.22);
  }
  // bimodal mixture of two Gaussians
  const m = [[-1.3, -0.75], [1.3, 0.75]], s2 = 0.30;
  let pp = 0;
  for (const c of m) { const dx = x - c[0], dy = y - c[1]; pp += Math.exp(-(dx * dx + dy * dy) / (2 * s2)); }
  return Math.log(pp + 1e-300);
}

function MCMCDemo() {
  const canvasRef = _useRef(null);
  const heatRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const [sigma, setSigma] = _useState(0.45);
  const [target, setTarget] = _useState("bimodal");
  const [showBurn, setShowBurn] = _useState(false);
  const [running, setRunning] = _useState(true);
  const [seed, setSeed] = _useState(1);
  const [, setTick] = _useState(0);
  const sim = _useRef(null);
  const BURN = 200;

  function rng(s0) { let s = s0 >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function randn(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  function buildHeat() {
    let off = heatRef.current;
    if (!off) { off = document.createElement("canvas"); off.width = GW; off.height = GH; heatRef.current = off; }
    const hc = off.getContext("2d");
    const img = hc.createImageData(GW, GH);
    let mx = -Infinity;
    const vals = new Float64Array(GW * GH);
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
      const x = XMIN + (i / (GW - 1)) * (XMAX - XMIN);
      const y = YMAX - (j / (GH - 1)) * (YMAX - YMIN);
      const lp = logTarget(target, x, y); vals[j * GW + i] = lp; if (lp > mx) mx = lp;
    }
    for (let k = 0; k < GW * GH; k++) {
      const p = Math.exp(vals[k] - mx);   // 0..1
      const t = Math.pow(p, 0.5);
      // near-black -> violet
      img.data[k * 4] = Math.round(20 + 148 * t);
      img.data[k * 4 + 1] = Math.round(12 + 60 * t);
      img.data[k * 4 + 2] = Math.round(28 + 219 * t);
      img.data[k * 4 + 3] = 255;
    }
    hc.putImageData(img, 0, 0);
  }

  function reset() {
    const r = rng(seed * 1900937 + 17);
    // start at a random-ish point
    const x = (r() * 2 - 1) * 1.5, y = (r() * 2 - 1) * 1.2;
    sim.current = { r, x, y, lp: logTarget(target, x, y), samples: [], trail: [], accepts: 0, total: 0 };
    buildHeat();
    setTick(t => t + 1);
  }
  _useEffect(() => { reset(); /* eslint-disable-next-line */ }, [target, seed]);

  function steps(n) {
    const st = sim.current; if (!st) return;
    const { r } = st;
    for (let k = 0; k < n; k++) {
      const xp = st.x + randn(r) * sigma, yp = st.y + randn(r) * sigma;
      const lp = logTarget(target, xp, yp);
      st.total++;
      if (lp - st.lp >= Math.log(r() + 1e-300)) { st.x = xp; st.y = yp; st.lp = lp; st.accepts++; }
      st.samples.push([st.x, st.y, st.total]);
      if (st.samples.length > 4000) st.samples.shift();
      st.trail.push([st.x, st.y]);
      if (st.trail.length > 36) st.trail.shift();
    }
  }

  _useEffect(() => {
    let last = performance.now();
    const tick = (now) => {
      if (running && now - last > 32) { last = now; steps(4); setTick(t => t + 1); }
      draw();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    /* eslint-disable-next-line */
  }, [running, sigma, target, showBurn]);

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const st = sim.current; if (!st) return;

    const padL = 14, padR = 14, padT = 30, padB = 16;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const PX = (x) => padL + ((x - XMIN) / (XMAX - XMIN)) * plotW;
    const PY = (y) => padT + ((YMAX - y) / (YMAX - YMIN)) * plotH;

    // target heatmap
    if (heatRef.current) {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(heatRef.current, padL, padT, plotW, plotH);
    }
    ctx.fillStyle = "#cbd5e1"; ctx.font = "11px JetBrains Mono";
    ctx.fillText("TARGET DENSITY (heatmap)  +  Metropolis chain samples", padL, 20);

    // accumulated samples (cloud)
    for (let i = 0; i < st.samples.length; i++) {
      const s = st.samples[i];
      const burned = s[2] <= BURN;
      if (burned && !showBurn) continue;
      ctx.fillStyle = burned ? "rgba(148,163,184,0.5)" : "rgba(226,232,240,0.5)";
      ctx.beginPath(); ctx.arc(PX(s[0]), PY(s[1]), 1.3, 0, 7); ctx.fill();
    }
    // recent trail
    ctx.strokeStyle = "rgba(52,211,153,0.8)"; ctx.lineWidth = 1.4; ctx.beginPath();
    for (let i = 0; i < st.trail.length; i++) { const x = PX(st.trail[i][0]), y = PY(st.trail[i][1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
    // current point
    ctx.fillStyle = "#34d399"; ctx.beginPath(); ctx.arc(PX(st.x), PY(st.y), 4.5, 0, 7); ctx.fill();
    ctx.strokeStyle = "#0b0f1a"; ctx.lineWidth = 1.2; ctx.stroke();
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  });

  const st = sim.current;
  const accRate = st && st.total ? st.accepts / st.total : 0;
  const kept = st ? Math.max(0, st.total - BURN) : 0;
  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// PROPOSAL STEP  sigma" min={0.05} max={1.6} step={0.05} value={sigma} onChange={setSigma} tone="violet"
        help="Std-dev of the Gaussian proposal. Small sigma = tiny tip-toe steps: most are accepted but the chain mixes painfully slowly. Large sigma = big jumps that usually land in low-density regions and get rejected, so the chain stalls. The sweet spot (often ~23% acceptance) is in between." />
      <SegmentedControl label="// TARGET" value={target} onChange={setTarget}
        options={[{ value: "bimodal", label: "Bimodal" }, { value: "banana", label: "Banana" }]}
        help="The distribution to sample. Bimodal has two separated modes (watch the chain struggle to hop between them with small steps); Banana is a curved ridge where a single step size is too big in one direction and too small in another." />
      <Toggle label="SHOW BURN-IN SAMPLES" checked={showBurn} onChange={setShowBurn}
        help={`Show (gray) or hide the first ${BURN} samples. Early samples are biased by the arbitrary starting point and are discarded as 'burn-in' before estimating anything.`} />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setRunning(r => !r)} primary>{running ? "PAUSE" : "RESUME"}</DemoButton>
        <DemoButton onClick={() => setSeed(s => s + 1)}>RESTART</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="ACCEPTANCE RATE" value={st ? Math.round(accRate * 100) + "%" : "—"} accent="#a855f7" />
        <StatReadout label="KEPT SAMPLES" value={kept} accent="#34d399" />
      </div>
      <Legend items={[
        { color: "#a855f7", label: "target density" },
        { color: "#34d399", label: "current state + trail" },
        { color: "#e2e8f0", label: "kept samples" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        The violet heatmap is the distribution we want to sample — but we can only
        evaluate it up to a constant, so we can't sample it directly. Metropolis
        builds a random walk whose long-run visiting frequency equals that density:
        from the green point it proposes a Gaussian step, then accepts if the target
        is higher there, or accepts "downhill" moves with probability p(new)/p(old).
        Reject and it just stays and re-records the same point. The white dots are
        the kept samples piling up — and they fill in exactly the bright regions of
        the heatmap, with no normalization ever computed.
      </DemoP>
      <DemoP>
        PROPOSAL STEP is everything. Shrink σ and acceptance climbs toward 100%, but
        the green trail barely moves — the samples are so correlated you'd need
        millions for a few independent ones. Grow σ and the chain leaps into the
        dark and gets rejected over and over, freezing in place. On the Bimodal
        target, small steps can trap the chain in one mode for ages (poor mixing);
        on the Banana, no single σ fits the curved ridge — which is exactly why
        practitioners reach for adaptive, Hamiltonian, or NUTS samplers.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Markov chain Monte Carlo is how Bayesian inference is actually done when the
        posterior has no closed form: you sample it instead of solving it. It turns{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/bayes/`} style={{ color: "#a855f7" }}>Bayes' rule</a>{" "}
        from "needs a conjugate prior" into "works for any model you can write down,"
        and powers Stan, PyMC, and the inference behind hierarchical models, topic
        models, and Bayesian neural nets. The accept-worse-with-probability rule is
        the same Metropolis criterion behind{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/simulated-annealing/`} style={{ color: "#a855f7" }}>simulated annealing</a>,
        and the resulting sample cloud is a Monte-Carlo stand-in for the density a{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/kernel-density/`} style={{ color: "#a855f7" }}>kernel density estimate</a>{" "}
        would smooth.
      </DemoP>
      <DemoP>
        Caveats: MCMC samples are correlated, not independent — effective sample size
        is far below the raw count, and you must discard burn-in and check
        convergence (trace plots, R-hat across multiple chains). Random-walk
        Metropolis mixes badly in high dimensions and across separated modes, so
        modern practice uses gradient-informed samplers (Hamiltonian Monte Carlo,
        NUTS) or, for speed over exactness, variational inference. Diagnosing "has it
        converged?" is genuinely hard — a chain can look healthy while having never
        visited a whole mode.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="FOUNDATIONS" title="MCMC (Metropolis-Hastings)"
      subtitle="Sample a distribution you can only evaluate up to a constant by building a random walk that visits it in proportion to its density. Tune the proposal step to feel the mixing-vs-acceptance tradeoff, and switch targets to see where random-walk MCMC struggles."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/foundations/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<MCMCDemo />);
