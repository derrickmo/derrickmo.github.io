// demos/attention-rollout.jsx — attention rollout (Abnar & Zuidema, 2020).
//
// A single layer's attention only tells you where a token looked one hop back.
// To see what an output token ultimately draws from the *input*, you compose
// attention across layers, accounting for residual connections:
//     Â_l = 0.5·A_l + 0.5·I  (residual mixes in the token's own value),
//     R   = Â_L · … · Â_2 · Â_1.
// Row i of R is token i's rolled-up attribution back to every input token. We run
// real toy attention (softmax of QKᵀ on small random embeddings, a couple of
// tokens made salient) and compare a query token's last-layer attention to its
// rollout — the rollout spreads credit to the true upstream sources.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480, D = 8;
const TOKENS = ["[CLS]", "the", "cat", "sat", "on", "mat", "."];
const N = TOKENS.length;
function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function softmax(a) { const m = Math.max(...a); const e = a.map(x => Math.exp(x - m)); const s = e.reduce((p, q) => p + q, 0); return e.map(x => x / s); }
function matmul(A, B) { const r = A.length, c = B[0].length, k = B.length, out = Array.from({ length: r }, () => new Array(c).fill(0)); for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) { let s = 0; for (let t = 0; t < k; t++) s += A[i][t] * B[t][j]; out[i][j] = s; } return out; }

function AttentionRolloutDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [layers, setLayers] = _useState(4);
  const [sel, setSel] = _useState(0);
  const [res, setRes] = _useState(0.5);
  const [, force] = _useState(0);
  const dataRef = _useRef(null);

  function gen() {
    // token embeddings; make "cat" and "mat" salient (larger norm)
    const X = TOKENS.map((t, i) => { const v = Array.from({ length: D }, () => randn()); const sc = (i === 2 || i === 5) ? 1.7 : 1; return v.map(x => x * sc); });
    const Wq = [], Wk = [];
    for (let l = 0; l < 6; l++) {
      Wq.push(Array.from({ length: D }, () => Array.from({ length: D }, () => randn() * 0.5)));
      Wk.push(Array.from({ length: D }, () => Array.from({ length: D }, () => randn() * 0.5)));
    }
    dataRef.current = { X, Wq, Wk };
  }
  if (!dataRef.current) gen();
  function resample() { gen(); force(v => v + 1); }

  const { X, Wq, Wk } = dataRef.current;
  function attnLayer(l) {
    const Q = matmul(X, Wq[l]), K = matmul(X, Wk[l]);
    const A = [];
    for (let i = 0; i < N; i++) { const sc = []; for (let j = 0; j < N; j++) { let d = 0; for (let t = 0; t < D; t++) d += Q[i][t] * K[j][t]; sc.push(d / Math.sqrt(D)); } A.push(softmax(sc)); }
    return A;
  }
  const Alayers = Array.from({ length: layers }, (_, l) => attnLayer(l));
  // rollout
  let R = Array.from({ length: N }, (_, i) => Array.from({ length: N }, (_, j) => i === j ? 1 : 0));
  Alayers.forEach(A => {
    const hat = A.map(row => { const m = row.map((v, j) => res * v + (1 - res) * (0 /*I added below*/)); return m; });
    for (let i = 0; i < N; i++) hat[i][i] += (1 - res);
    // row-normalize
    for (let i = 0; i < N; i++) { const s = hat[i].reduce((p, q) => p + q, 0) || 1; for (let j = 0; j < N; j++) hat[i][j] /= s; }
    R = matmul(hat, R);
  });
  const lastA = Alayers[layers - 1][sel];
  const rollRow = R[sel];

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
    ctx.fillStyle = "#94a3b8"; ctx.fillText("ROLLOUT MATRIX R  ·  row = token's attribution back to input tokens", 20, 22);

    // matrix heatmap
    const ox = 90, oy = 40, cell = 30;
    ctx.font = "10px JetBrains Mono"; ctx.textAlign = "center";
    for (let j = 0; j < N; j++) { ctx.fillStyle = "#64748b"; ctx.save(); ctx.translate(ox + j * cell + cell / 2, oy - 6); ctx.rotate(-0.5); ctx.fillText(TOKENS[j], 0, 0); ctx.restore(); }
    for (let i = 0; i < N; i++) { ctx.fillStyle = i === sel ? "#a855f7" : "#64748b"; ctx.textAlign = "right"; ctx.fillText(TOKENS[i], ox - 6, oy + i * cell + cell / 2 + 3); ctx.textAlign = "center"; }
    let mx = 0; R.forEach(r => r.forEach(v => mx = Math.max(mx, v)));
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const t = R[i][j] / (mx || 1);
      ctx.fillStyle = `rgba(168,85,247,${0.08 + 0.85 * t})`;
      ctx.fillRect(ox + j * cell + 1, oy + i * cell + 1, cell - 2, cell - 2);
      if (i === sel) { ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 1.5; ctx.strokeRect(ox + j * cell + 1, oy + i * cell + 1, cell - 2, cell - 2); }
    }

    // compare bars for selected token
    const by = oy + N * cell + 30;
    ctx.textAlign = "left"; ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono";
    ctx.fillText("token \"" + TOKENS[sel] + "\":  last-layer attention (slate) vs rollout (violet)", 20, by - 4);
    const bx = 30, bw = (W - 60) / N;
    for (let j = 0; j < N; j++) {
      const x = bx + j * bw;
      const hL = lastA[j] * 70, hR = rollRow[j] * 70;
      ctx.fillStyle = "rgba(148,163,184,0.6)"; ctx.fillRect(x + 4, by + 80 - hL, bw / 2 - 5, hL);
      ctx.fillStyle = "rgba(168,85,247,0.85)"; ctx.fillRect(x + bw / 2 + 1, by + 80 - hR, bw / 2 - 5, hR);
      ctx.fillStyle = "#64748b"; ctx.font = "8px JetBrains Mono"; ctx.textAlign = "center"; ctx.fillText(TOKENS[j], x + bw / 2, by + 92); ctx.textAlign = "left";
    }
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
      <Slider label="// LAYERS" min={1} max={6} step={1} value={layers} onChange={setLayers} tone="violet"
        help="How many attention layers to roll up. At 1 the rollout is just that layer's attention; add layers and attribution flows multiple hops, so a token's credit reaches input tokens it never attended to directly." />
      <Slider label="// QUERY TOKEN" min={0} max={N - 1} step={1} value={sel} onChange={setSel}
        help="Which token's attribution to inspect (the highlighted row). [CLS] is the usual choice — its rollout row is the classic 'what did the pooled representation read from the input' explanation." />
      <Slider label="// RESIDUAL WEIGHT" min={0.1} max={0.9} step={0.1} value={res} onChange={setRes}
        help="The mix in Â = w·A + (1−w)·I. Residual connections carry a token's own value forward, so rollout adds identity before composing. More identity (lower w) keeps attribution near the diagonal; more attention (higher w) lets it travel." />
      <DemoButton onClick={resample} primary>RESAMPLE</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="QUERY" value={TOKENS[sel]} accent="#a855f7" />
        <StatReadout label="LAYERS" value={layers} />
      </div>
      <Legend items={[
        { color: "#a855f7", label: "rollout attribution" },
        { color: "#94a3b8", label: "last-layer attention" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Reading a single attention layer is misleading: it shows where a token
        looked one step back, not what it ultimately depends on in the input. By
        layer 4, a token's representation is a blend of blends of blends. Attention
        rollout composes the layers — multiplying their attention matrices — to
        trace that flow all the way back to the input tokens. The heatmap is the
        rolled-up matrix R; the highlighted row is your query token's attribution.
      </DemoP>
      <DemoP>
        The bars compare that token's raw last-layer attention (slate) with its
        rollout (violet): rollout redistributes credit toward the genuinely
        influential tokens (here the salient "cat"/"mat"), often ones the last layer
        barely attended to directly. The residual-weight knob matters because
        skip connections carry each token's own value forward — rollout models that
        by mixing in the identity before composing, which is why attribution stays
        partly on the diagonal. Add layers and watch the credit spread further from
        it.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Attention rollout (Abnar & Zuidema, 2020) is a standard transformer
        interpretability tool — a quick, training-free way to turn a stack of{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/attention/`} style={{ color: "#a855f7" }}>attention</a>{" "}
        maps into a single input-token attribution, widely used to visualize what a
        ViT or BERT "looked at." It's the attention-flow cousin of gradient-based{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/saliency/`} style={{ color: "#a855f7" }}>saliency</a>{" "}
        and the SHAP attributions for tabular models.
      </DemoP>
      <DemoP>
        The caveats are real and well-documented: attention weights are not
        faithful explanations on their own (attention ≠ explanation), rollout
        averages over heads and ignores the value/MLP transformations, and it can
        wash out signal in deep models. Attention-flow (a max-flow variant) and
        gradient-weighted rollout sharpen it. Like every attribution here, it's a
        hypothesis about the model to be checked — useful for intuition, not a
        guarantee of why the model decided.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="TRANSFORMERS / NLP" title="Attention Rollout"
      subtitle="One attention layer shows one hop; compose them to trace a token's attribution back to the input. Watch rollout spread credit beyond the last layer."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/transformers/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<AttentionRolloutDemo />);
