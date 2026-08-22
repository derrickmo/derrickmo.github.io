// demos/distributional-rl.jsx — C51 distributional RL (Bellemare et al., 2017).
//
// Instead of learning the EXPECTED return V(s), learn the whole DISTRIBUTION of
// returns Z(s) as a categorical distribution over a fixed set of atoms. On a
// chain whose only reward is a stochastic (bimodal) payoff at the end, the
// distributional Bellman backup propagates that bimodal return distribution back
// through the states, contracting it toward 0 by a factor of γ each step. The
// scalar value (its mean) collapses all that shape into one number.
//
// Real categorical TD: each step we sample the terminal reward, project the target
// onto the atom support (the C51 projection), and move each state's distribution
// toward its bootstrapped target. The converged distributions match the exact
// backup overlaid in gray.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect, useMemo: _useMemo } = React;
const {
  DemoLayout, DemoP, Slider, DemoButton, StatReadout, ControlGroup, Legend,
} = window;

const CW = 330, CH = 250;
const NA = 41;                 // atoms
const VMIN = -1.25, VMAX = 1.25;
const DZ = (VMAX - VMIN) / (NA - 1);
const ATOMS = Array.from({ length: NA }, (_, j) => VMIN + j * DZ);

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function zeros() { return new Float64Array(NA); }
// project a point value v onto the atom support -> categorical mass
function projDelta(v) {
  const m = zeros(); const cv = Math.max(VMIN, Math.min(VMAX, v));
  const b = (cv - VMIN) / DZ, l = Math.floor(b), u = Math.ceil(b);
  if (l === u) m[l] += 1; else { m[l] += (u - b); m[u] += (b - l); }
  return m;
}
// project (scale * src) onto support
function projScaled(src, scale) {
  const m = zeros();
  for (let j = 0; j < NA; j++) {
    const p = src[j]; if (p < 1e-12) continue;
    const cv = Math.max(VMIN, Math.min(VMAX, scale * ATOMS[j]));
    const b = (cv - VMIN) / DZ, l = Math.floor(b), u = Math.ceil(b);
    if (l === u) m[l] += p; else { m[l] += p * (u - b); m[u] += p * (b - l); }
  }
  return m;
}
const meanOf = d => { let s = 0; for (let j = 0; j < NA; j++) s += ATOMS[j] * d[j]; return s; };
const stdOf = d => { const mu = meanOf(d); let s = 0; for (let j = 0; j < NA; j++) s += d[j] * (ATOMS[j] - mu) * (ATOMS[j] - mu); return Math.sqrt(Math.max(0, s)); };

function DistributionalRLDemo() {
  const cvRef = _useRef(null);
  const [K, setK] = _useState(5);
  const [gamma, setGamma] = _useState(0.85);
  const [pWin, setPWin] = _useState(0.5);
  const [mag, setMag] = _useState(1.0);
  const [lr, setLr] = _useState(0.05);
  const [sel, setSel] = _useState(0);
  const [speed, setSpeed] = _useState(40);
  const [running, setRunning] = _useState(true);
  const [eps, setEps] = _useState(0);

  const gRef = _useRef(gamma), pRef = _useRef(pWin), mRef = _useRef(mag), lRef = _useRef(lr), spRef = _useRef(speed);
  _useEffect(() => { gRef.current = gamma; }, [gamma]);
  _useEffect(() => { pRef.current = pWin; }, [pWin]);
  _useEffect(() => { mRef.current = mag; }, [mag]);
  _useEffect(() => { lRef.current = lr; }, [lr]);
  _useEffect(() => { spRef.current = speed; }, [speed]);

  // exact (true) distributions per state, for the gray overlay
  const trueZ = _useMemo(() => {
    const arr = new Array(K);
    const rewardDist = zeros();
    const a = projDelta(mag), b = projDelta(-mag);
    for (let j = 0; j < NA; j++) rewardDist[j] = pWin * a[j] + (1 - pWin) * b[j];
    arr[K - 1] = rewardDist;
    for (let k = K - 2; k >= 0; k--) arr[k] = projScaled(arr[k + 1], gamma);
    return arr;
  }, [K, gamma, pWin, mag]);

  const stRef = _useRef(null);
  function init() {
    const Z = new Array(K); for (let k = 0; k < K; k++) { Z[k] = zeros(); Z[k][Math.floor(NA / 2)] = 1; } // start as δ_0
    stRef.current = { Z, rand: rng(7), episodes: 0 };
    setEps(0);
  }

  function trainStep() {
    const st = stRef.current, Z = st.Z, al = lRef.current, g = gRef.current;
    // sample terminal reward, update last state toward proj(delta_r)
    const r = (st.rand() < pRef.current) ? mRef.current : -mRef.current;
    const tgt = projDelta(r);
    const last = K - 1;
    for (let j = 0; j < NA; j++) Z[last][j] += al * (tgt[j] - Z[last][j]);
    // bootstrap earlier states from their successor
    for (let k = K - 2; k >= 0; k--) {
      const t = projScaled(Z[k + 1], g);
      for (let j = 0; j < NA; j++) Z[k][j] += al * (t[j] - Z[k][j]);
    }
    st.episodes++;
  }

  function drawHist(ctx, d, x0, y0, w, h, col, overlay) {
    let mx = 1e-6; for (let j = 0; j < NA; j++) mx = Math.max(mx, d[j], overlay ? overlay[j] : 0);
    const bw = w / NA;
    for (let j = 0; j < NA; j++) { const bh = (d[j] / mx) * h; ctx.fillStyle = col; ctx.fillRect(x0 + j * bw, y0 + h - bh, Math.max(1, bw - 0.5), bh); }
    if (overlay) { ctx.strokeStyle = "rgba(203,213,225,0.8)"; ctx.lineWidth = 1; ctx.beginPath(); for (let j = 0; j < NA; j++) { const yy = y0 + h - (overlay[j] / mx) * h; const xx = x0 + j * bw + bw / 2; if (j === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy); } ctx.stroke(); }
    // zero line
    const zx = x0 + ((0 - VMIN) / (VMAX - VMIN)) * w; ctx.strokeStyle = "rgba(148,163,184,0.35)"; ctx.beginPath(); ctx.moveTo(zx, y0); ctx.lineTo(zx, y0 + h); ctx.stroke();
  }

  function draw() {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d"); ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = "#0b1530"; ctx.fillRect(0, 0, CW, CH);
    const st = stRef.current; if (!st) return;
    const Z = st.Z;
    // small multiples row
    const sy0 = 18, sh = 46, pad = 6; const sw = (CW - 12 - (K - 1) * pad) / K;
    ctx.fillStyle = "#94a3b8"; ctx.font = "8px monospace"; ctx.textAlign = "left"; ctx.fillText("return distribution Z(s) per state — contracts toward 0 by γ each step back", 6, sy0 - 5);
    for (let k = 0; k < K; k++) {
      const x0 = 6 + k * (sw + pad);
      ctx.fillStyle = k === sel ? "rgba(168,85,247,0.12)" : "transparent"; ctx.fillRect(x0 - 2, sy0 - 2, sw + 4, sh + 14);
      drawHist(ctx, Z[k], x0, sy0, sw, sh, k === K - 1 ? "#34d399" : "#a855f7", null);
      ctx.fillStyle = k === sel ? "#fff" : "#64748b"; ctx.textAlign = "center"; ctx.font = "8px monospace";
      ctx.fillText(k === K - 1 ? "goal" : "s" + k, x0 + sw / 2, sy0 + sh + 10);
      if (k === sel) { ctx.strokeStyle = "#a855f7"; ctx.strokeRect(x0 - 2, sy0 - 2, sw + 4, sh + 14); }
    }
    // big selected histogram
    const by0 = 96, bh = 110, bx0 = 30, bw = CW - 40;
    ctx.fillStyle = "#94a3b8"; ctx.textAlign = "left"; ctx.fillText("Z(s" + (sel === K - 1 ? "_goal" : sel) + ")  — learned (violet) vs exact (line)", bx0, by0 - 6);
    drawHist(ctx, Z[sel], bx0, by0, bw, bh, "rgba(168,85,247,0.8)", trueZ[sel]);
    // mean marker
    const mu = meanOf(Z[sel]); const mx = bx0 + ((mu - VMIN) / (VMAX - VMIN)) * bw;
    ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(mx, by0); ctx.lineTo(mx, by0 + bh); ctx.stroke();
    ctx.fillStyle = "#fbbf24"; ctx.textAlign = "center"; ctx.font = "8px monospace"; ctx.fillText("mean=V=" + mu.toFixed(2), mx, by0 - 0 + bh + 11);
    // axis ticks
    ctx.fillStyle = "#64748b"; ctx.textAlign = "left"; ctx.fillText(VMIN.toFixed(1), bx0, by0 + bh + 11); ctx.textAlign = "right"; ctx.fillText(VMAX.toFixed(1), bx0 + bw, by0 + bh + 11);
    ctx.textAlign = "center"; ctx.fillText("0", bx0 + ((0 - VMIN) / (VMAX - VMIN)) * bw, by0 + bh + 11);
  }

  _useEffect(() => { init(); draw(); /* eslint-disable-next-line */ }, [K]);
  _useEffect(() => { if (sel > K - 1) setSel(K - 1); }, [K, sel]);

  _useEffect(() => {
    if (!running) return;
    let alive = true, raf, last = 0;
    const loop = (t) => {
      if (!alive) return;
      const interval = 1000 / Math.max(1, spRef.current);
      if (t - last > interval) { last = t; const burst = Math.max(1, Math.round(spRef.current / 10)); for (let i = 0; i < burst; i++) trainStep(); setEps(stRef.current.episodes); draw(); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(raf); };
    /* eslint-disable-next-line */
  }, [running]);

  // redraw when overlay/selection changes while paused
  _useEffect(() => { if (!running) draw(); /* eslint-disable-next-line */ }, [sel, trueZ, running]);

  const reset = () => { init(); setTimeout(draw, 0); };
  const Zsel = stRef.current ? stRef.current.Z[Math.min(sel, K - 1)] : zeros();

  const stage = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <canvas ref={cvRef} width={CW} height={CH}
        style={{ width: CW * 1.5, maxWidth: "100%", borderRadius: 6, border: "1px solid var(--border)", background: "#0b1530" }} />
      <Legend items={[
        { label: "learned Z", color: "#a855f7" },
        { label: "goal (reward dist)", color: "#34d399" },
        { label: "exact", color: "#cbd5e1" },
        { label: "mean = V", color: "#fbbf24" },
      ]} />
    </div>
  );

  const controls = (
    <ControlGroup>
      <Slider label="// VIEW STATE" min={0} max={K - 1} step={1} value={Math.min(sel, K - 1)} onChange={setSel} tone="violet"
        help="Which state's return distribution to show enlarged. The goal-adjacent state mirrors the reward distribution; earlier states show it contracted toward 0 by γ for each step of distance." />
      <Slider label="// WIN PROBABILITY" min={0} max={1} step={0.05} value={pWin} onChange={setPWin}
        help="Probability the terminal payoff is +magnitude (vs -magnitude). Around 0.5 the return distribution is strongly bimodal — two outcomes with the same mean a scalar value would blur into one." />
      <Slider label="// PAYOFF MAGNITUDE" min={0.3} max={1.1} step={0.05} value={mag} onChange={setMag}
        help="Size of the two outcomes (±magnitude). Wider payoffs spread the two modes apart, making the distribution's shape — and the risk it encodes — more pronounced." />
      <Slider label="// DISCOUNT γ" min={0.6} max={0.97} step={0.01} value={gamma} onChange={setGamma} tone="blue"
        help="Each step back from the goal, the distributional Bellman backup scales the return distribution by γ, pulling both modes toward 0 and shrinking the spread." />
      <Slider label="// CHAIN LENGTH" min={2} max={7} step={1} value={K} onChange={setK} tone="blue"
        help="States from start to goal. More steps means more γ-contractions, so the start state's distribution is squeezed tighter around 0. Rebuilds." />
      <Slider label="// LEARNING RATE" min={0.01} max={0.2} step={0.01} value={lr} onChange={setLr} tone="blue"
        help="How fast each categorical distribution moves toward its projected Bellman target. Lower is smoother; the learned bars converge to the gray exact curve either way." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setRunning(r => !r)} primary tone="violet">{running ? "PAUSE" : "TRAIN"}</DemoButton>
        <DemoButton onClick={reset}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="EPISODES" value={eps} accent="var(--dim)" />
        <StatReadout label="MEAN (V)" value={meanOf(Zsel).toFixed(2)} accent="#fbbf24" />
        <StatReadout label="STD (RISK)" value={stdOf(Zsel).toFixed(2)} accent="#a855f7" />
        <StatReadout label="ATOMS" value={NA} accent="var(--dim)" />
      </div>
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Ordinary value learning tracks a single number — the <i>expected</i> return.
        Distributional RL learns the entire <b>distribution of returns</b> as
        probabilities over a fixed grid of <b>atoms</b>. Here the only reward is a
        coin-flip payoff at the goal, so the goal state's return distribution is
        genuinely <b>bimodal</b> (green). The <b>distributional Bellman backup</b>
        carries that shape back through the chain, scaling it by γ each step so both
        modes drift toward 0 and the spread tightens.
      </DemoP>
      <DemoP>
        The gold line is the <b>mean</b> — the scalar value a normal agent would
        learn. Set the win probability near 0.5 and watch it sit at ~0, halfway
        between two outcomes it never actually produces: the average hides the risk
        entirely. That extra shape is what distributional agents exploit — for more
        stable learning and for genuinely <b>risk-aware</b> decisions. The learned
        violet bars converge to the exact gray curve as it trains.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        C51 and its successors (QR-DQN, IQN) were a real jump in deep-RL performance,
        and "predict a distribution, not just a mean" is the same idea behind
        learning return <i>quantiles</i> or full densities elsewhere. The categorical
        projection step — splitting each target's probability onto the two nearest
        atoms — is the crux, and it's what keeps the support fixed while still
        representing arbitrary shapes. It extends ordinary{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/gridworld-rl/`} style={{ color: "#a855f7" }}>Q-learning</a>{" "}
        and the Bellman backups of{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/value-iteration/`} style={{ color: "#a855f7" }}>value
        iteration</a> from scalars to distributions.
      </DemoP>
      <DemoP>
        Modeling the whole return distribution connects RL to{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/conformal/`} style={{ color: "#a855f7" }}>uncertainty
        quantification</a> and risk: an agent that knows its returns are bimodal can
        prefer a safer action with the same mean, which a risk-neutral value can't
        express. It pairs naturally with the value-distribution view in{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/conformal-regression/`} style={{ color: "#a855f7" }}>conformal
        regression</a> and the Bayesian posteriors of{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/bayes/`} style={{ color: "#a855f7" }}>Bayes' rule</a>.
      </DemoP>
    </>
  );

  return (
    <DemoLayout title="Distributional RL (C51)"
      subtitle="Learn the whole distribution of returns, not just its mean. The distributional Bellman backup carries a bimodal payoff back through the chain — and the scalar value hides it."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/reinforcement-learning/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<DistributionalRLDemo />);
