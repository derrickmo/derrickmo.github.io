// demos/ppo.jsx — PPO's clipped surrogate objective and why it gives a trust region.
//
// Two linked views, both exact:
//   (top) The clipped surrogate L^CLIP(r) = min(r·A, clip(r,1-ε,1+ε)·A) as a
//         function of the probability ratio r = π_θ(a|s)/π_old(a|s), for the
//         chosen advantage A and clip ε. Where the clip bites, the objective is
//         flat, so its gradient is zero — there's no incentive to move the policy
//         any further in that direction.
//   (bottom) The payoff of that flatness: PPO reuses one batch for K epochs of
//         gradient ascent. We run exactly that on a 1-state, 2-action policy
//         (π_old fixed) and plot the ratio r over epochs for the clipped objective
//         vs the unclipped importance-weighted gradient r·A. Without the clip,
//         re-optimizing the same batch marches the policy far past π_old (a
//         destructive update); the clip parks it at 1±ε — a trust region.
// Real gradient ascent throughout; nothing is scripted.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect, useMemo: _useMemo } = React;
const {
  DemoLayout, DemoP, Slider, StatReadout, ControlGroup, Legend,
} = window;

const CW = 330, CH = 250;
const P0 = 0.3; // fixed old probability of the action being updated

const sigmoid = z => 1 / (1 + Math.exp(-z));
const logit = p => Math.log(p / (1 - p));

function surrogate(r, A, eps) {
  const clipped = Math.max(1 - eps, Math.min(1 + eps, r)) * A;
  return Math.min(r * A, clipped);
}

// K epochs of gradient ascent on the SAME batch; returns ratio per epoch
function optimize(A, eps, lr, K, clip) {
  let theta = logit(P0);
  const rs = [1];
  for (let k = 0; k < K; k++) {
    const p = sigmoid(theta), r = p / P0;
    const clippedOut = (A > 0 && r > 1 + eps) || (A < 0 && r < 1 - eps);
    const grad = (clip && clippedOut) ? 0 : A * (p * (1 - p)) / P0; // d(r·A)/dθ
    theta += lr * grad;
    rs.push(sigmoid(theta) / P0);
  }
  return rs;
}

function PPODemo() {
  const cvRef = _useRef(null);
  const [eps, setEps] = _useState(0.2);
  const [A, setA] = _useState(1.0);
  const [lr, setLr] = _useState(0.4);
  const [K, setK] = _useState(20);

  const ppo = _useMemo(() => optimize(A, eps, lr, K, true), [A, eps, lr, K]);
  const raw = _useMemo(() => optimize(A, eps, lr, K, false), [A, eps, lr, K]);

  _useEffect(() => {
    const ctx = cvRef.current.getContext("2d");
    ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = "#0b1530"; ctx.fillRect(0, 0, CW, CH);

    // ── top: L^CLIP(r) ──
    const padL = 34, padR = 12, ty0 = 16, ty1 = 116;
    const rMax = 2.6;
    const X = r => padL + (r / rMax) * (CW - padL - padR);
    // y-range from unclipped extent
    let ylo = Math.min(0, rMax * A), yhi = Math.max(0, rMax * A); const pad = (yhi - ylo) * 0.08 || 1; ylo -= pad; yhi += pad;
    const Y = v => ty1 - ((v - ylo) / (yhi - ylo)) * (ty1 - ty0);
    ctx.fillStyle = "#94a3b8"; ctx.font = "8px monospace"; ctx.textAlign = "left";
    ctx.fillText("clipped surrogate L vs ratio r", padL, ty0 - 4);
    // zero line + clip band
    ctx.strokeStyle = "rgba(148,163,184,0.25)"; ctx.beginPath(); ctx.moveTo(padL, Y(0)); ctx.lineTo(CW - padR, Y(0)); ctx.stroke();
    ctx.fillStyle = "rgba(52,211,153,0.07)"; ctx.fillRect(X(1 - eps), ty0, X(1 + eps) - X(1 - eps), ty1 - ty0);
    ctx.strokeStyle = "rgba(52,211,153,0.5)"; ctx.setLineDash([3, 3]);
    [1 - eps, 1 + eps].forEach(b => { ctx.beginPath(); ctx.moveTo(X(b), ty0); ctx.lineTo(X(b), ty1); ctx.stroke(); });
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.beginPath(); ctx.moveTo(X(1), ty0); ctx.lineTo(X(1), ty1); ctx.stroke();
    ctx.fillStyle = "#64748b"; ctx.textAlign = "center"; ctx.fillText("1-ε", X(1 - eps), ty1 + 9); ctx.fillText("1", X(1), ty1 + 9); ctx.fillText("1+ε", X(1 + eps), ty1 + 9);
    // unclipped r·A
    ctx.strokeStyle = "rgba(148,163,184,0.6)"; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.4; ctx.beginPath();
    for (let i = 0; i <= 120; i++) { const r = (i / 120) * rMax; const x = X(r), y = Y(r * A); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke(); ctx.setLineDash([]);
    // L^CLIP
    ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 2.4; ctx.beginPath();
    for (let i = 0; i <= 120; i++) { const r = (i / 120) * rMax; const x = X(r), y = Y(surrogate(r, A, eps)); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    // marker at PPO's final ratio
    const rf = Math.min(rMax, ppo[ppo.length - 1]);
    ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(X(rf), Y(surrogate(rf, A, eps)), 4, 0, Math.PI * 2); ctx.fill();

    // ── bottom: ratio over epochs ──
    const by0 = 150, by1 = CH - 18, bx0 = 34, bx1 = CW - 12;
    const rHi = Math.max(1 + eps + 0.3, Math.max(...raw), Math.max(...ppo)) ;
    const rLo = Math.min(1 - eps - 0.3, Math.min(...raw), Math.min(...ppo));
    const BX = i => bx0 + (i / K) * (bx1 - bx0);
    const BY = r => by1 - ((r - rLo) / (rHi - rLo)) * (by1 - by0);
    ctx.fillStyle = "#94a3b8"; ctx.textAlign = "left"; ctx.fillText("ratio r over K epochs on one batch", bx0, by0 - 4);
    // trust band
    ctx.fillStyle = "rgba(52,211,153,0.07)"; ctx.fillRect(bx0, BY(1 + eps), bx1 - bx0, BY(1 - eps) - BY(1 + eps));
    ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.beginPath(); ctx.moveTo(bx0, BY(1)); ctx.lineTo(bx1, BY(1)); ctx.stroke();
    ctx.fillStyle = "#64748b"; ctx.textAlign = "right"; ctx.fillText("1", bx0 - 3, BY(1) + 3);
    const line = (arr, col) => { ctx.strokeStyle = col; ctx.lineWidth = 1.9; ctx.beginPath(); arr.forEach((r, i) => { const x = BX(i), y = BY(r); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }); ctx.stroke(); };
    line(raw, "#f87171");
    line(ppo, "#a855f7");
  }, [A, eps, lr, K, ppo, raw]);

  const fppo = ppo[ppo.length - 1], fraw = raw[raw.length - 1];

  const stage = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <canvas ref={cvRef} width={CW} height={CH}
        style={{ width: CW * 1.45, maxWidth: "100%", borderRadius: 6, border: "1px solid var(--border)", background: "#0b1530" }} />
      <Legend items={[
        { label: "clipped (PPO)", color: "#a855f7" },
        { label: "unclipped r·A", color: "#94a3b8" },
        { label: "no-clip update", color: "#f87171" },
        { label: "trust region 1±ε", color: "rgba(52,211,153,0.6)" },
      ]} />
    </div>
  );

  const controls = (
    <ControlGroup>
      <Slider label="// CLIP ε" min={0.05} max={0.5} step={0.01} value={eps} onChange={setEps} tone="violet"
        help="Half-width of the trust region. The objective is only allowed to reward moving the ratio within [1-ε, 1+ε]; beyond that it flattens (zero gradient). PPO's default is 0.2." />
      <Slider label="// ADVANTAGE A" min={-2} max={2} step={0.1} value={A} onChange={setA}
        help="How much better (A>0) or worse (A<0) the action was than expected. A>0 pushes its probability up and clips at 1+ε; A<0 pushes it down and clips at 1-ε. At A=0 there's nothing to learn." />
      <Slider label="// LEARNING RATE" min={0.05} max={1.5} step={0.05} value={lr} onChange={setLr}
        help="Step size for gradient ascent on the surrogate. Large steps are exactly what destabilizes vanilla policy gradients — watch the red (no-clip) line overshoot while PPO holds." />
      <Slider label="// EPOCHS ON BATCH (K)" min={1} max={40} step={1} value={K} onChange={setK} tone="blue"
        help="PPO reuses one batch of experience for several gradient epochs (sample efficiency). More epochs push an unclipped update further off-policy; the clip is what makes reuse safe." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="PPO FINAL RATIO" value={fppo.toFixed(2)} accent="#a855f7" />
        <StatReadout label="NO-CLIP FINAL RATIO" value={fraw.toFixed(2)} accent={Math.abs(fraw - 1) > eps + 0.05 ? "#f87171" : "#34d399"} />
        <StatReadout label="TRUST REGION" value={(1 - eps).toFixed(2) + "–" + (1 + eps).toFixed(2)} accent="#34d399" />
        <StatReadout label="CLIP ACTIVE?" value={((A > 0 && fppo >= 1 + eps - 1e-3) || (A < 0 && fppo <= 1 - eps + 1e-3)) ? "YES" : "no"} accent="var(--violet-lt)" />
      </div>
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        Policy gradients are unstable because one big step can collapse the policy,
        and you can't safely reuse a batch of experience. PPO fixes both with a
        <b> clipped surrogate</b>. The top plot is its objective vs the probability
        ratio <i>r = π_new/π_old</i>: it tracks the honest importance-weighted return
        <i> r·A</i> (gray) only inside the trust region <b>[1-ε, 1+ε]</b>. Outside it,
        the curve goes flat — so the gradient is zero and the optimizer has no reason
        to move <i>r</i> any further. The gold dot is where PPO's update lands.
      </DemoP>
      <DemoP>
        The bottom plot shows why that matters. PPO runs several gradient
        <b> epochs on the same batch</b> for sample efficiency. Without the clip
        (red), each epoch keeps pushing — the ratio marches far from 1.0 and the new
        policy is wildly off from the data it was trained on: a destructive update.
        With the clip (violet), the ratio climbs to the edge of the trust region and
        <b> stops</b>. Crank the learning rate or the epoch count and watch the red
        line blow out while PPO stays parked at 1±ε.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        PPO is the workhorse of modern policy optimization — game-playing agents,
        robotics, and the RL step of <b>RLHF</b> that aligns LLMs. It's a cheap,
        first-order stand-in for TRPO's hard KL-constrained trust region: instead of
        solving a constrained optimization, just clip the objective so updates can't
        stray too far off-policy. It builds straight on{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/policy-gradient/`} style={{ color: "#a855f7" }}>policy
        gradients</a> and the advantages of{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/actor-critic/`} style={{ color: "#a855f7" }}>actor-critic</a>.
      </DemoP>
      <DemoP>
        The advantage <i>A</i> here would come from a critic, usually via GAE — the
        same eligibility-trace bias/variance trade as{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/td-lambda/`} style={{ color: "#a855f7" }}>TD(λ)</a>.
        And the KL-regularized "stay near a reference policy" idea is exactly what
        reappears in <a href={`${window.__DM_BASE || "../../"}visualize/dpo/`} style={{ color: "#a855f7" }}>DPO
        vs RLHF</a>: there the reference is the pretrained model, here it's the policy
        that collected the batch.
      </DemoP>
    </>
  );

  return (
    <DemoLayout title="PPO Clipped Objective"
      subtitle="The clip that made policy gradients stable: reward moving the policy only within a trust region, so you can safely reuse a batch without a destructive update."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/reinforcement-learning/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<PPODemo />);
