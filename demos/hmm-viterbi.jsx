// demos/hmm-viterbi.jsx — Viterbi decoding on a small HMM, animated trellis.
//
// A hidden Markov model has hidden states that transition over time and emit a
// visible symbol each step. Here the hidden states are market *regimes*
// (Bull / Choppy / Bear) and the emissions are daily moves (up / flat / down).
// You only ever see the moves; Viterbi recovers the single most-likely regime
// PATH via dynamic programming in log space:
//   δ_t(k) = max_j [ δ_{t-1}(j) + log A_{j,k} ] + log B_k(o_t),  ψ_t(k)=argmax_j
// then backtrack the ψ pointers from argmax_k δ_T(k). We generate a true regime
// sequence from the model, emit noisy observations, run real Viterbi, animate the
// trellis filling left-to-right, draw the recovered path, and score it against the
// hidden truth. Regime persistence and emission noise control how decodable it is.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 560, H = 430;
const STATES = [
  { name: "BULL", col: "#34d399" },
  { name: "CHOP", col: "#fbbf24" },
  { name: "BEAR", col: "#f87171" },
];
const OBS = ["up", "flat", "down"];
const K = 3, M = 3;

function HMMViterbiDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const [persist, setPersist] = _useState(0.75);   // self-transition prob
  const [emisNoise, setEmisNoise] = _useState(0.25); // emission spread
  const [T, setT] = _useState(14);
  const [seed, setSeed] = _useState(1);
  const [, setTick] = _useState(0);
  const sim = _useRef(null);
  const revealRef = _useRef(0);

  function rng(s0) { let s = s0 >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function pick(r, probs) { let u = r(), c = 0; for (let i = 0; i < probs.length; i++) { c += probs[i]; if (u <= c) return i; } return probs.length - 1; }

  function reset() {
    const r = rng(seed * 7368787 + 31);
    const off = (1 - persist) / (K - 1);
    const A = Array.from({ length: K }, (_, j) => Array.from({ length: K }, (_, k) => (j === k ? persist : off)));
    // emission: state k prefers obs k (diagonal), emisNoise spreads to the others
    const hi = 1 - emisNoise, lo = emisNoise / (M - 1);
    const B = Array.from({ length: K }, (_, k) => Array.from({ length: M }, (_, o) => (o === k ? hi : lo)));
    const pi = [1 / 3, 1 / 3, 1 / 3];

    // generate true hidden path + observations
    const trueS = [], obs = [];
    let s = pick(r, pi);
    for (let t = 0; t < T; t++) {
      if (t > 0) s = pick(r, A[s]);
      trueS.push(s);
      obs.push(pick(r, B[s]));
    }

    // Viterbi in log space
    const L = (x) => Math.log(Math.max(1e-12, x));
    const delta = Array.from({ length: T }, () => new Array(K).fill(-Infinity));
    const psi = Array.from({ length: T }, () => new Array(K).fill(0));
    for (let k = 0; k < K; k++) delta[0][k] = L(pi[k]) + L(B[k][obs[0]]);
    for (let t = 1; t < T; t++) for (let k = 0; k < K; k++) {
      let best = -Infinity, arg = 0;
      for (let j = 0; j < K; j++) { const v = delta[t - 1][j] + L(A[j][k]); if (v > best) { best = v; arg = j; } }
      delta[t][k] = best + L(B[k][obs[t]]); psi[t][k] = arg;
    }
    let last = 0, bv = -Infinity;
    for (let k = 0; k < K; k++) if (delta[T - 1][k] > bv) { bv = delta[T - 1][k]; last = k; }
    const path = new Array(T); path[T - 1] = last;
    for (let t = T - 1; t > 0; t--) path[t - 1] = psi[t][path[t]];

    let correct = 0; for (let t = 0; t < T; t++) if (path[t] === trueS[t]) correct++;
    sim.current = { A, B, pi, trueS, obs, delta, psi, path, acc: correct / T };
    revealRef.current = 1;
    setTick(t => t + 1);
  }
  _useEffect(() => { reset(); /* eslint-disable-next-line */ }, [persist, emisNoise, T, seed]);

  _useEffect(() => {
    let last = performance.now();
    const tick = (now) => {
      if (now - last > 360) {
        last = now;
        const st = sim.current;
        if (st) { revealRef.current = revealRef.current >= T ? 1 : revealRef.current + 1; setTick(t => t + 1); }
      }
      draw();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    /* eslint-disable-next-line */
  }, [T]);

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const st = sim.current; if (!st) return;
    const { delta, psi, path, trueS, obs } = st;
    const rev = Math.min(revealRef.current, T);

    const padL = 64, padR = 18, padT = 58, padB = 30;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const XT = (t) => padL + (T === 1 ? 0 : (t / (T - 1)) * plotW);
    const YK = (k) => padT + (k + 0.5) * (plotH / K);

    // header + observation row
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono";
    ctx.fillText("VITERBI TRELLIS  ·  hidden regime path decoded from the moves you see", padL, 20);
    ctx.fillStyle = "#64748b"; ctx.font = "10px JetBrains Mono"; ctx.fillText("obs", 18, 44);
    for (let t = 0; t < T; t++) {
      ctx.fillStyle = t < rev ? "#cbd5e1" : "#334155";
      ctx.font = "10px JetBrains Mono"; ctx.textAlign = "center";
      ctx.fillText(OBS[obs[t]], XT(t), 44);
      ctx.textAlign = "left";
    }
    // state row labels
    for (let k = 0; k < K; k++) { ctx.fillStyle = STATES[k].col; ctx.font = "600 11px JetBrains Mono"; ctx.fillText(STATES[k].name, 14, YK(k) + 4); }

    // backpointer edges (revealed columns)
    for (let t = 1; t < rev; t++) for (let k = 0; k < K; k++) {
      const j = psi[t][k];
      ctx.strokeStyle = "rgba(148,163,184,0.16)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(XT(t - 1), YK(j)); ctx.lineTo(XT(t), YK(k)); ctx.stroke();
    }

    // nodes — size/brightness by normalized δ within each revealed column
    for (let t = 0; t < rev; t++) {
      let mn = Infinity, mx = -Infinity;
      for (let k = 0; k < K; k++) { mn = Math.min(mn, delta[t][k]); mx = Math.max(mx, delta[t][k]); }
      for (let k = 0; k < K; k++) {
        const nrm = mx > mn ? (delta[t][k] - mn) / (mx - mn) : 1;
        const x = XT(t), y = YK(k), rad = 4 + nrm * 7;
        ctx.beginPath(); ctx.arc(x, y, rad, 0, 7);
        ctx.fillStyle = STATES[k].col; ctx.globalAlpha = 0.25 + 0.65 * nrm; ctx.fill(); ctx.globalAlpha = 1;
        if (trueS[t] === k) { ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x, y, rad + 3, 0, 7); ctx.stroke(); }
      }
    }

    // recovered Viterbi path (bold violet) up to the reveal frontier
    ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 2.6; ctx.beginPath();
    for (let t = 0; t < rev; t++) { const x = XT(t), y = YK(path[t]); t ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
    for (let t = 0; t < rev; t++) { ctx.fillStyle = "#a855f7"; ctx.beginPath(); ctx.arc(XT(t), YK(path[t]), 3, 0, 7); ctx.fill(); }

    // legend note
    ctx.fillStyle = "#64748b"; ctx.font = "10px JetBrains Mono";
    ctx.fillText("white ring = true hidden state   ·   violet = Viterbi best path", padL, H - 10);
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  });

  const st = sim.current;
  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// REGIME PERSISTENCE" min={0.4} max={0.95} step={0.05} value={persist} onChange={setPersist} tone="violet"
        help="Self-transition probability A[k][k]: how long a regime tends to last. Higher makes the hidden sequence smoother and far easier to decode; near 0.4 regimes flip constantly and Viterbi struggles." />
      <Slider label="// EMISSION NOISE" min={0} max={0.6} step={0.05} value={emisNoise} onChange={setEmisNoise}
        help="How often a regime emits an 'off' move (Bull printing a down day, etc.). At 0 each regime is a dead giveaway; raise it and the observations stop identifying the state, so accuracy falls." />
      <Slider label="// SEQUENCE LENGTH  T" min={8} max={20} step={1} value={T} onChange={setT}
        help="Number of time steps (trellis columns). Longer sequences give the transition model more leverage to smooth over noisy emissions." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setSeed(s => s + 1)} primary>NEW SEQUENCE</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="DECODE ACCURACY" value={st ? Math.round(st.acc * 100) + "%" : "—"} accent="#a855f7" />
        <StatReadout label="STATES / OBS" value={`${K} / ${M}`} accent="#34d399" />
      </div>
      <Legend items={STATES.map(s => ({ color: s.col, label: s.name }))} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Each column is a time step; the three dots are the hidden regimes, and a
        dot is bigger and brighter when Viterbi's running score δ for being in that
        regime is higher. The white ring marks the regime that was REALLY active
        (which the decoder never sees), and the bold violet line is the single
        most-likely path Viterbi reconstructs from the moves alone. Watch it fill
        left to right, then a new sequence restarts it. Where violet threads through
        the white rings, the decode is correct.
      </DemoP>
      <DemoP>
        The magic is that Viterbi doesn't decode each step independently — a noisy
        "down" day inside a clear bull run gets overruled because flipping regimes
        costs transition probability. Crank REGIME PERSISTENCE up and the path
        snaps to long clean runs (accuracy soars); turn EMISSION NOISE up and the
        moves stop revealing the regime, so accuracy collapses toward chance. This
        is the same max-product dynamic program behind POS tagging, speech
        recognition, and gene finding.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        The Viterbi algorithm is exact MAP inference over the hidden state sequence
        of a hidden Markov model — a dynamic program that's the discrete-state
        sibling of the continuous{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/kalman-filter/`} style={{ color: "#a855f7" }}>Kalman filter</a>.
        HMMs + Viterbi powered classical speech recognition, part-of-speech tagging,
        gene/protein sequence labeling, and regime detection in finance, and the
        trellis DP is the same shape as{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/beam-search/`} style={{ color: "#a855f7" }}>beam search</a>{" "}
        decoding (Viterbi is the exact, full-beam case). Its forward/backward cousin
        and EM (Baum-Welch) are how the HMM parameters get learned.
      </DemoP>
      <DemoP>
        Caveats: Viterbi gives the single best path, not per-step marginals (the
        posterior-marginal "max-of-margins" path can differ — that's what
        forward-backward computes). It assumes the model (A, B, π) is correct and
        the Markov/output-independence assumptions hold; real sequences have
        long-range dependencies an HMM can't capture, which is exactly why neural
        sequence models and{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/attention/`} style={{ color: "#a855f7" }}>attention</a>{" "}
        replaced HMMs for most language tasks. Working in log space (as here) is
        essential to avoid underflow.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="HMM & the Viterbi Algorithm"
      subtitle="Watch real Viterbi dynamic programming recover the most-likely hidden regime path from a noisy stream of market moves. Tune regime persistence and emission noise to make the hidden sequence easy or near-impossible to decode."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/foundations/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<HMMViterbiDemo />);
