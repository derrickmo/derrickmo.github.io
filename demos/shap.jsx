// demos/shap.jsx — feature attribution with exact Shapley values (SHAP).
//
// A transparent scoring model for a loan decision over 5 features, WITH an
// interaction term (high debt AND many late payments compound), so attribution
// is not just w·(x−μ). For one applicant we compute the EXACT Shapley value of
// each feature by enumerating all 2^5 coalitions:
//   φ_i = Σ_{S ⊆ F\{i}} [ |S|! (k−|S|−1)! / k! ] · ( f(S∪{i}) − f(S) ),
// where f(S) evaluates the model with features in S at their real value and the
// rest at the baseline (dataset mean). The φ_i sum exactly to f(x) − base, shown
// as a waterfall from the base score to this applicant's score.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480;
const sigmoid = (z) => 1 / (1 + Math.exp(-z));
const FEATURES = [
  { name: "Income", w: 2.2, good: "high" },
  { name: "Debt ratio", w: -2.5, good: "low" },
  { name: "Credit history", w: 1.3, good: "high" },
  { name: "Late payments", w: -2.0, good: "low" },
  { name: "Employment", w: 1.1, good: "high" },
];
const K = FEATURES.length;
const MU = 0.5;                 // baseline (dataset mean) for every feature
const W_INT = -1.8;             // debt(1) × late(3) interaction

// model logit given a full feature vector
function model(x) {
  let z = 0;
  for (let i = 0; i < K; i++) z += FEATURES[i].w * x[i];
  z += W_INT * x[1] * x[3];
  return z;
}
const FACT = [1, 1, 2, 6, 24, 120];

function ShapDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [x, setX] = _useState([0.7, 0.6, 0.4, 0.5, 0.6]);
  const [, force] = _useState(0);
  const setFeat = (i, v) => setX(prev => prev.map((p, j) => (j === i ? v : p)));

  // exact Shapley values
  const { phi, base, full } = (() => {
    const v = new Array(1 << K);
    for (let m = 0; m < (1 << K); m++) {
      const xx = FEATURES.map((_, i) => ((m >> i) & 1) ? x[i] : MU);
      v[m] = model(xx);
    }
    const phi = new Array(K).fill(0);
    for (let i = 0; i < K; i++) {
      for (let m = 0; m < (1 << K); m++) {
        if ((m >> i) & 1) continue;                  // S without i
        let s = 0; for (let j = 0; j < K; j++) if ((m >> j) & 1) s++;
        const wgt = (FACT[s] * FACT[K - s - 1]) / FACT[K];
        phi[i] += wgt * (v[m | (1 << i)] - v[m]);
      }
    }
    return { phi, base: v[0], full: v[(1 << K) - 1] };
  })();

  const prob = sigmoid(full), baseProb = sigmoid(base);
  const approved = prob >= 0.5;

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";

    ctx.fillStyle = "#94a3b8";
    ctx.fillText("SHAP WATERFALL  ·  how each feature pushes this applicant's score", 20, 24);

    // order features by |phi| descending (SHAP convention)
    const order = phi.map((p, i) => ({ i, p })).sort((a, b) => Math.abs(b.p) - Math.abs(a.p));
    // x-range over all cumulative points
    let cum = base, lo = Math.min(base, full), hi = Math.max(base, full);
    order.forEach(o => { cum += o.p; lo = Math.min(lo, cum); hi = Math.max(hi, cum); });
    lo -= 0.4; hi += 0.4;
    const lx = 170, rx = 514;
    const xOf = (z) => lx + ((z - lo) / (hi - lo)) * (rx - lx);

    const y0 = 56, rh = 34;
    // base tick
    ctx.strokeStyle = "rgba(148,163,184,0.6)"; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(xOf(base), y0 - 4); ctx.lineTo(xOf(base), y0 + (K + 1) * rh); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#94a3b8"; ctx.textAlign = "right";
    ctx.fillText("base  σ=" + baseProb.toFixed(2), 158, y0 + 4);
    ctx.textAlign = "left";

    // feature bars
    cum = base;
    order.forEach((o, row) => {
      const y = y0 + (row + 1) * rh - rh / 2;
      const x1 = xOf(cum), x2 = xOf(cum + o.p);
      const col = o.p >= 0 ? "#34d399" : "#f87171";
      ctx.fillStyle = col;
      ctx.fillRect(Math.min(x1, x2), y - 9, Math.abs(x2 - x1), 18);
      // arrowhead direction marker
      ctx.fillStyle = col; ctx.beginPath();
      const ax = x2, dir = o.p >= 0 ? 1 : -1;
      ctx.moveTo(ax, y - 9); ctx.lineTo(ax + dir * 6, y); ctx.lineTo(ax, y + 9); ctx.fill();
      // label
      const f = FEATURES[o.i];
      ctx.fillStyle = "#cbd5e1"; ctx.textAlign = "right"; ctx.font = "11px JetBrains Mono";
      ctx.fillText(f.name + " (" + x[o.i].toFixed(2) + ")", 158, y + 4);
      ctx.textAlign = "left"; ctx.fillStyle = col; ctx.font = "10px JetBrains Mono";
      ctx.fillText((o.p >= 0 ? "+" : "") + o.p.toFixed(2), Math.max(x1, x2) + 6, y + 4);
      cum += o.p;
    });

    // final tick + prob
    const yf = y0 + (K + 1) * rh;
    ctx.strokeStyle = approved ? "rgba(52,211,153,0.7)" : "rgba(248,113,113,0.7)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(xOf(full), y0 - 4); ctx.lineTo(xOf(full), yf); ctx.stroke();
    ctx.fillStyle = "#94a3b8"; ctx.textAlign = "right"; ctx.font = "11px JetBrains Mono";
    ctx.fillText("score", 158, yf + 4); ctx.textAlign = "left";

    // big outcome
    ctx.fillStyle = approved ? "#34d399" : "#f87171"; ctx.font = "600 30px Space Grotesk, JetBrains Mono";
    ctx.fillText((prob * 100).toFixed(0) + "%", 170, yf + 46);
    ctx.font = "12px JetBrains Mono"; ctx.fillStyle = approved ? "#34d399" : "#f87171";
    ctx.fillText(approved ? "APPROVE" : "DECLINE", 250, yf + 46);
    ctx.fillStyle = "#64748b"; ctx.font = "10px JetBrains Mono";
    ctx.fillText("base " + (baseProb * 100).toFixed(0) + "% → applicant " + (prob * 100).toFixed(0) + "%   (Σφ = " + (full - base).toFixed(2) + " logit)", 170, yf + 64);
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
      {FEATURES.map((f, i) => (
        <Slider key={i} label={"// " + f.name.toUpperCase()} min={0} max={1} step={0.05} value={x[i]} onChange={(v) => setFeat(i, v)}
          tone={f.w >= 0 ? "blue" : "violet"}
          help={`${f.name}, normalized 0–1 (${f.good} is favorable). Baseline is 0.50; the Shapley value measures how moving THIS applicant away from that baseline pushed the score, fairly crediting the debt×late-payments interaction between the two features that share it.`} />
      ))}
      <DemoButton onClick={() => setX(FEATURES.map(() => Math.round(Math.random() * 20) / 20))} primary>RANDOM APPLICANT</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="APPROVAL" value={(prob * 100).toFixed(0) + "%"} accent={approved ? "#34d399" : "#f87171"} />
        <StatReadout label="DECISION" value={approved ? "APPROVE" : "DECLINE"} accent={approved ? "#34d399" : "#f87171"} />
      </div>
      <Legend items={[
        { color: "#34d399", label: "pushes score up" },
        { color: "#f87171", label: "pushes score down" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        The model approves or declines, but the question that matters is <i>why
        this applicant</i>. SHAP answers it by treating the features as players in
        a cooperative game and asking: how much did each one contribute to moving
        the score away from the average applicant's? The waterfall starts at the
        base score (everyone at the 0.50 baseline) and each green/red bar is one
        feature's exact Shapley value, ending at this applicant's score.
      </DemoP>
      <DemoP>
        A Shapley value is the feature's average marginal contribution across every
        possible order of adding features in — which is why it splits the
        debt×late-payments interaction fairly between the two instead of
        double-counting or dumping it on one. Slide a feature and watch its bar
        grow; push both debt ratio and late payments high together and their bars
        swell beyond their individual effects as the interaction kicks in. The bars
        always sum exactly to the gap between the base score and the prediction.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        SHAP (Lundberg & Lee, 2017) is the dominant feature-attribution method for
        tabular ML, built on Shapley values from cooperative game theory — the
        unique attribution that satisfies efficiency, symmetry, and the dummy
        axioms. This demo computes them <i>exactly</i> by enumerating all 2⁵
        coalitions; real SHAP approximates the same quantity (KernelSHAP sampling,
        or fast exact TreeSHAP for tree ensembles) because enumeration explodes
        with feature count.
      </DemoP>
      <DemoP>
        It's the explainability half of trustworthy ML, paired with{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/calibration/`} style={{ color: "#a855f7" }}>calibration</a>:
        one asks whether the confidence is honest, the other why the decision was
        made — both prerequisites for deploying a model where a person is owed an
        explanation (credit, hiring, healthcare). Caveats worth knowing: attributions
        depend on the chosen baseline, correlated features can smear credit, and an
        explanation of the model is not a causal claim about the world — SHAP tells
        you what the model used, not what's true.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Feature Attribution (SHAP)"
      subtitle="Why did the model decide that? Exact Shapley values credit each feature's contribution — including the interaction — as a waterfall from base to prediction."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/ml-theory/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ShapDemo />);
