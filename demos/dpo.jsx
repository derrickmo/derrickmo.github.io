// demos/dpo.jsx — DPO vs RLHF, side by side, on the same preference stream.
//
// Both panels start from the same reference policy pi_ref (a softmax over N
// candidate responses) and are fed the SAME human preference pairs each step.
// A hidden true reward r* decides preferences via Bradley-Terry; we never see it.
//
//   RLHF (two stage): first fit a reward model r_hat from the pairs (Bradley-
//     Terry), then take a KL-regularized policy-gradient step that maximizes
//         J(pi) = E_pi[r_hat] - beta * KL(pi || pi_ref).
//     Gradient (softmax logits):  d/dθ_k = pi_k ( g_k - E[g] ),
//         g_i = r_hat_i - beta*( log pi_i - log pi_ref_i ).
//
//   DPO (one stage): no reward model. The policy IS the implicit reward via
//     r(y) = beta*log( pi(y)/pi_ref(y) ), so the Bradley-Terry loss becomes
//         L = -log sigmoid( beta*[ (logπ_w - logπref_w) - (logπ_l - logπref_l) ] )
//     and updates the policy logits directly:
//         d/dθ_k = (sigmoid(h)-1)*beta*( 1{k=w} - 1{k=l} ).
//
// The bottom curves track expected TRUE reward under each policy — they rise
// together, the whole point: DPO matches RLHF with no separate reward network
// and no RL loop. Bars are policy probabilities; green ticks under the axis are
// the (hidden) true reward; amber dots are RLHF's learned reward model.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480, N = 8;
const MARGIN = 16, PANEL_W = (W - 3 * MARGIN) / 2;
const LEFT_X = MARGIN, RIGHT_X = MARGIN * 2 + PANEL_W;
const TOP = 48, BARS_H = 150, BASE_Y = TOP + BARS_H;
const HUMAN_BETA = 6;

const sigmoid = (z) => 1 / (1 + Math.exp(-z));
function softmax(logits) {
  const m = Math.max(...logits);
  const ex = logits.map(l => Math.exp(l - m));
  const s = ex.reduce((a, b) => a + b, 0);
  return ex.map(e => e / s);
}
function greenTick(t) { return `rgba(52,211,153,${0.2 + 0.7 * Math.max(0, Math.min(1, t))})`; }

function DPODemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const lastRef = _useRef(0);

  const makeState = () => {
    const refLogits = Array.from({ length: N }, () => (Math.random() - 0.5) * 0.8);
    const piRef = softmax(refLogits);
    const rStar = Array.from({ length: N }, () => Math.random() * 2 - 1); // hidden true reward
    return {
      piRef, rStar,
      thRlhf: refLogits.slice(), thDpo: refLogits.slice(), // both start at the reference
      rHat: new Float64Array(N),                            // RLHF reward model
      step: 0, recent: null,
      rlhfHist: [], dpoHist: [],
    };
  };
  const st = _useRef(makeState());

  const [beta, setBeta] = _useState(3);
  const [lr, setLr] = _useState(0.4);
  const [batch, setBatch] = _useState(8);
  const [speed, setSpeed] = _useState(30);
  const [running, setRunning] = _useState(false);
  const [, force] = _useState(0);

  function reset() { st.current = makeState(); force(x => x + 1); }

  const expReward = (pi, r) => pi.reduce((a, p, i) => a + p * r[i], 0);
  const kl = (pi, ref) => pi.reduce((a, p, i) => a + p * Math.log(Math.max(p, 1e-9) / Math.max(ref[i], 1e-9)), 0);

  function trainStep() {
    const s = st.current;
    const piRlhf = softmax(s.thRlhf), piDpo = softmax(s.thDpo);
    const lpRef = s.piRef.map(p => Math.log(Math.max(p, 1e-9)));
    const lpRlhf = piRlhf.map(p => Math.log(Math.max(p, 1e-9)));
    const lpDpo = piDpo.map(p => Math.log(Math.max(p, 1e-9)));

    // sample a shared batch of preference pairs
    const gDpo = new Float64Array(N);
    for (let b = 0; b < batch; b++) {
      let i = (Math.random() * N) | 0, j = (Math.random() * N) | 0;
      while (j === i) j = (Math.random() * N) | 0;
      const pIwins = sigmoid(HUMAN_BETA * (s.rStar[i] - s.rStar[j]));
      let w = i, l = j;
      if (Math.random() >= pIwins) { w = j; l = i; }
      s.recent = { w, l };

      // RLHF: Bradley-Terry update of the reward model
      const sg = sigmoid(s.rHat[w] - s.rHat[l]);
      s.rHat[w] += lr * (1 - sg);
      s.rHat[l] -= lr * (1 - sg);

      // DPO: accumulate policy-logit gradient
      const h = beta * ((lpDpo[w] - lpRef[w]) - (lpDpo[l] - lpRef[l]));
      const coeff = (sigmoid(h) - 1) * beta;   // < 0
      gDpo[w] += coeff; gDpo[l] -= coeff;
    }
    // center reward model (Bradley-Terry is shift-invariant) to keep it bounded
    const mean = s.rHat.reduce((a, b) => a + b, 0) / N;
    for (let i = 0; i < N; i++) s.rHat[i] -= mean;

    // RLHF: one KL-regularized policy-gradient step toward the reward model
    const g = new Array(N);
    for (let i = 0; i < N; i++) g[i] = s.rHat[i] - beta * (lpRlhf[i] - lpRef[i]);
    const gbar = piRlhf.reduce((a, p, i) => a + p * g[i], 0);
    for (let i = 0; i < N; i++) s.thRlhf[i] += lr * piRlhf[i] * (g[i] - gbar);

    // DPO: apply the accumulated gradient (descent on the loss)
    for (let i = 0; i < N; i++) s.thDpo[i] -= (lr / batch) * gDpo[i];

    s.step += 1;
    s.rlhfHist.push(expReward(softmax(s.thRlhf), s.rStar));
    s.dpoHist.push(expReward(softmax(s.thDpo), s.rStar));
    if (s.rlhfHist.length > 260) { s.rlhfHist.shift(); s.dpoHist.shift(); }
  }

  function drawPanel(ctx, panelX, title, sub, pi, showRewardModel) {
    const s = st.current;
    ctx.fillStyle = "#e2e8f0"; ctx.font = "12px JetBrains Mono";
    ctx.fillText(title, panelX, 28);
    ctx.fillStyle = "#94a3b8"; ctx.font = "9px JetBrains Mono";
    ctx.fillText(sub, panelX, 40);

    const slot = PANEL_W / N, barW = slot * 0.62;
    // true-reward normalization for the green ticks
    const rMin = Math.min(...s.rStar), rMax = Math.max(...s.rStar), rSpan = Math.max(rMax - rMin, 1e-6);
    // reward-model normalization
    const hMin = Math.min(...s.rHat), hMax = Math.max(...s.rHat), hSpan = Math.max(hMax - hMin, 1e-6);

    // baseline
    ctx.strokeStyle = "rgba(148,163,184,0.3)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(panelX, BASE_Y); ctx.lineTo(panelX + PANEL_W, BASE_Y); ctx.stroke();

    const accent = showRewardModel ? "#60a5fa" : "#c084fc";
    for (let i = 0; i < N; i++) {
      const bx = panelX + i * slot + (slot - barW) / 2;
      // policy bar
      const bh = pi[i] * BARS_H;
      ctx.fillStyle = accent;
      ctx.fillRect(bx, BASE_Y - bh, barW, bh);
      // reference outline (dashed tick at pi_ref height)
      const refY = BASE_Y - s.piRef[i] * BARS_H;
      ctx.strokeStyle = "rgba(226,232,240,0.55)"; ctx.setLineDash([3, 2]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(bx - 1, refY); ctx.lineTo(bx + barW + 1, refY); ctx.stroke(); ctx.setLineDash([]);
      // true-reward tick under the axis
      ctx.fillStyle = greenTick((s.rStar[i] - rMin) / rSpan);
      ctx.fillRect(bx, BASE_Y + 3, barW, 6);
      // reward-model dot (RLHF only)
      if (showRewardModel) {
        const dy = BASE_Y - ((s.rHat[i] - hMin) / hSpan) * (BARS_H * 0.85) - 4;
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath(); ctx.arc(bx + barW / 2, dy, 2.6, 0, Math.PI * 2); ctx.fill();
      }
      // highlight latest winner/loser
      if (s.recent && s.recent.w === i) { ctx.strokeStyle = "#34d399"; ctx.lineWidth = 1.5; ctx.strokeRect(bx, BASE_Y - bh, barW, bh); }
      if (s.recent && s.recent.l === i) { ctx.strokeStyle = "#f87171"; ctx.lineWidth = 1.5; ctx.strokeRect(bx, BASE_Y - bh, barW, bh); }
    }
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const s = st.current;
    const piRlhf = softmax(s.thRlhf), piDpo = softmax(s.thDpo);

    drawPanel(ctx, LEFT_X, "RLHF", "reward model (amber) → KL-regularized policy", piRlhf, true);
    drawPanel(ctx, RIGHT_X, "DPO", "no reward model — preferences update policy directly", piDpo, false);

    // bottom: expected true reward under each policy
    const BY = 256, BH = H - BY - 16, BX = MARGIN, BW = W - 2 * MARGIN;
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono";
    ctx.fillText("EXPECTED TRUE REWARD under each policy  ·  they converge — DPO matches RLHF", BX, BY - 8);
    ctx.strokeStyle = "rgba(96,165,250,0.18)"; ctx.strokeRect(BX, BY, BW, BH);
    const rMax = Math.max(...s.rStar), refER = s.piRef.reduce((a, p, i) => a + p * s.rStar[i], 0);
    const lo = Math.min(refER, ...s.rStar) - 0.05, hi = rMax + 0.05, span = Math.max(hi - lo, 1e-6);
    // reference lines: optimum (greedy) and starting reference policy
    const yOf = (v) => BY + BH - ((v - lo) / span) * (BH - 10) - 5;
    ctx.strokeStyle = "rgba(52,211,153,0.35)"; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(BX, yOf(rMax)); ctx.lineTo(BX + BW, yOf(rMax)); ctx.stroke();
    ctx.fillStyle = "rgba(52,211,153,0.7)"; ctx.fillText("greedy optimum", BX + BW - 110, yOf(rMax) - 4);
    ctx.strokeStyle = "rgba(148,163,184,0.3)";
    ctx.beginPath(); ctx.moveTo(BX, yOf(refER)); ctx.lineTo(BX + BW, yOf(refER)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(148,163,184,0.6)"; ctx.fillText("reference", BX + 4, yOf(refER) - 4);

    const plot = (arr, color) => {
      if (arr.length < 2) return;
      ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.beginPath();
      for (let i = 0; i < arr.length; i++) {
        const x = BX + (i / Math.max(1, arr.length - 1)) * BW, y = yOf(arr[i]);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };
    plot(s.rlhfHist, "#60a5fa");
    plot(s.dpoHist, "#c084fc");
    ctx.fillStyle = "#60a5fa"; ctx.fillText("RLHF", BX + 8, BY + 14);
    ctx.fillStyle = "#c084fc"; ctx.fillText("DPO", BX + 52, BY + 14);
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
    // eslint-disable-next-line
  });

  _useEffect(() => {
    if (!running) return;
    const loop = (now) => {
      const interval = 1000 / speed;
      if (now - lastRef.current >= interval) { lastRef.current = now; trainStep(); force(x => x + 1); }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line
  }, [running, beta, lr, batch, speed]);

  const s = st.current;
  const piRlhf = softmax(s.thRlhf), piDpo = softmax(s.thDpo);
  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// BETA (KL strength)" min={0.5} max={10} step={0.5} value={beta} onChange={setBeta} tone="violet"
        help="The KL temperature shared by both methods: how hard the policy is pulled back toward the reference. High β → conservative, stays near π_ref (the dashed ticks); low β → the policy is free to pile all its mass on the single best response. Same knob, same effect in RLHF and DPO." />
      <Slider label="// LR" min={0.05} max={1} step={0.05} value={lr} onChange={setLr}
        help="Step size shared by the reward-model fit, the RLHF policy step, and the DPO update. Larger converges faster but makes both policies jitter." />
      <Slider label="// PAIRS / STEP" min={1} max={16} step={1} value={batch} onChange={setBatch}
        help="Preference comparisons sampled per step — fed identically to both pipelines so the comparison is fair. More pairs = a lower-variance update." />
      <Slider label="// SPEED (steps/sec)" min={4} max={120} step={2} value={speed} onChange={setSpeed}
        help="Training steps per second." />
      <DemoButton onClick={() => setRunning(r => !r)} primary>{running ? "PAUSE" : "TRAIN"}</DemoButton>
      <DemoButton onClick={reset}>RESET</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="STEP" value={s.step} />
        <StatReadout label="β" value={beta} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="E·r* RLHF" value={expReward(piRlhf, s.rStar).toFixed(2)} accent="#60a5fa" />
        <StatReadout label="E·r* DPO" value={expReward(piDpo, s.rStar).toFixed(2)} accent="#c084fc" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="KL RLHF" value={kl(piRlhf, s.piRef).toFixed(2)} />
        <StatReadout label="KL DPO" value={kl(piDpo, s.piRef).toFixed(2)} />
      </div>
      <Legend items={[
        { color: "#60a5fa", label: "RLHF policy" },
        { color: "#c084fc", label: "DPO policy" },
        { color: "#34d399", label: "true reward (axis)" },
        { color: "#fbbf24", label: "reward model r̂" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Both panels are learning to align the same reference policy from the same
        stream of "A beat B" preferences, but by different routes. <b>RLHF</b>{" "}
        (left) does it in two stages: fit a reward model (the amber dots, a scalar
        per response), then nudge the policy up the reward while a KL penalty keeps
        it near the reference. <b>DPO</b> (right) skips the reward model entirely —
        a bit of algebra shows the policy itself <i>is</i> an implicit reward,
        r(y) = β·log(π/π_ref), so the same Bradley-Terry objective updates the
        policy directly.
      </DemoP>
      <DemoP>
        Watch both policies pile probability onto the responses with the tallest
        green true-reward ticks, and watch the two curves at the bottom climb
        toward the greedy optimum together. That's the headline result: DPO reaches
        the same aligned policy as RLHF with no separate reward network and no RL
        loop. Turn β down and both rush to the single best response (high reward,
        high KL); turn it up and both stay timid and close to the reference.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        This is the sequel to the{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/reward-model/`} style={{ color: "#a855f7" }}>reward
        model</a> demo. Classic RLHF chains that reward model into a{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/policy-gradient/`} style={{ color: "#a855f7" }}>policy-gradient</a>{" "}
        / PPO loop — powerful but fiddly: a second network to train, an RL
        optimization that can reward-hack the imperfect reward model, and a KL
        term to hold it together. DPO (Rafailov et al., 2023) collapses the two
        stages into one supervised-style loss on preference pairs, which is why so
        many open models are now aligned with DPO and its relatives (IPO, KTO,
        ORPO) instead of full RLHF.
      </DemoP>
      <DemoP>
        The β you're turning is the same KL coefficient in both — it sets how far
        alignment is allowed to drag the model from its pretrained behavior, the
        central safety/usefulness dial of preference tuning. The catch the demo
        hides: with finite, noisy preferences neither method recovers the true
        reward exactly, so very low β (aggressive optimization) is exactly when
        reward hacking and mode collapse bite in practice.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="DPO vs RLHF"
      subtitle="Two ways to align a policy from the same human preferences — RLHF's reward model + RL loop, or DPO's direct update. Watch them converge to the same policy."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/fine-tuning/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<DPODemo />);
