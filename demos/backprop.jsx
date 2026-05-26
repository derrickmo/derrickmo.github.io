// demos/backprop.jsx — step through forward + backward on a tiny network,
// node by node. Real values, real gradients, real chain rule — no hand-wave.
//
// The network is small enough to hold in your head:
//   inputs x1, x2
//   hidden h_i = tanh(w_i1*x1 + w_i2*x2 + b_i)   i = 1, 2
//   output  y  = v1*h1 + v2*h2 + c
//   loss    L  = 0.5 * (y - t)^2
//
// Hit STEP to walk the computation forward, then watch the gradient flow
// back. Drag x1/x2/target to see how the gradients change.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, SegmentedControl, StatReadout, Legend, ControlGroup,
} = window;

// Fixed weights/biases — keeps the demo deterministic and the gradients
// readable. Real weights, just frozen.
const W = { w11: 0.7, w12: -0.4, b1: 0.1, w21: -0.5, w22: 0.6, b2: -0.2,
            v1: 0.9, v2: -0.8, c: 0.05 };

function compute(x1, x2, target) {
  const z1 = W.w11 * x1 + W.w12 * x2 + W.b1;
  const z2 = W.w21 * x1 + W.w22 * x2 + W.b2;
  const h1 = Math.tanh(z1);
  const h2 = Math.tanh(z2);
  const y = W.v1 * h1 + W.v2 * h2 + W.c;
  const L = 0.5 * (y - target) ** 2;
  // Backward (chain rule)
  const dL_dy = (y - target);
  const dy_dh1 = W.v1, dy_dh2 = W.v2;
  const dL_dh1 = dL_dy * dy_dh1;
  const dL_dh2 = dL_dy * dy_dh2;
  const dh1_dz1 = 1 - h1 * h1;
  const dh2_dz2 = 1 - h2 * h2;
  const dL_dz1 = dL_dh1 * dh1_dz1;
  const dL_dz2 = dL_dh2 * dh2_dz2;
  const dL_dw11 = dL_dz1 * x1, dL_dw12 = dL_dz1 * x2, dL_db1 = dL_dz1;
  const dL_dw21 = dL_dz2 * x1, dL_dw22 = dL_dz2 * x2, dL_db2 = dL_dz2;
  const dL_dv1 = dL_dy * h1, dL_dv2 = dL_dy * h2, dL_dc = dL_dy;
  return { z1, z2, h1, h2, y, L,
           dL_dy, dL_dh1, dL_dh2, dL_dz1, dL_dz2,
           dL_dw11, dL_dw12, dL_db1, dL_dw21, dL_dw22, dL_db2,
           dL_dv1, dL_dv2, dL_dc };
}

// Step plan: 12 forward + 12 backward steps. Each highlights one node/edge.
const STEPS = [
  // forward
  { phase: "f", k: "x1",   label: "x1 (input)" },
  { phase: "f", k: "x2",   label: "x2 (input)" },
  { phase: "f", k: "z1",   label: "z1 = w11·x1 + w12·x2 + b1" },
  { phase: "f", k: "z2",   label: "z2 = w21·x1 + w22·x2 + b2" },
  { phase: "f", k: "h1",   label: "h1 = tanh(z1)" },
  { phase: "f", k: "h2",   label: "h2 = tanh(z2)" },
  { phase: "f", k: "y",    label: "y = v1·h1 + v2·h2 + c" },
  { phase: "f", k: "L",    label: "L = ½(y − t)²" },
  // backward
  { phase: "b", k: "dL_dy",  label: "∂L/∂y = (y − t)" },
  { phase: "b", k: "dL_dh1", label: "∂L/∂h1 = (∂L/∂y)·v1" },
  { phase: "b", k: "dL_dh2", label: "∂L/∂h2 = (∂L/∂y)·v2" },
  { phase: "b", k: "dL_dz1", label: "∂L/∂z1 = (∂L/∂h1)·(1 − h1²)" },
  { phase: "b", k: "dL_dz2", label: "∂L/∂z2 = (∂L/∂h2)·(1 − h2²)" },
  { phase: "b", k: "dL_dw11", label: "∂L/∂w11 = (∂L/∂z1)·x1" },
  { phase: "b", k: "dL_dv1",  label: "∂L/∂v1 = (∂L/∂y)·h1" },
];

const SIZE = 460, H = 380;

// Node positions (canvas coordinates).
const NODES = {
  x1: { x: 60,  y: 110, lab: "x1" },
  x2: { x: 60,  y: 270, lab: "x2" },
  z1: { x: 190, y: 110, lab: "z1" },
  z2: { x: 190, y: 270, lab: "z2" },
  h1: { x: 290, y: 110, lab: "h1" },
  h2: { x: 290, y: 270, lab: "h2" },
  y:  { x: 390, y: 190, lab: "y"  },
  L:  { x: 430, y: 60,  lab: "L"  },
};

// Edges: source -> dest, with weight key on the right side.
const EDGES = [
  ["x1", "z1", "w11"],
  ["x2", "z1", "w12"],
  ["x1", "z2", "w21"],
  ["x2", "z2", "w22"],
  ["z1", "h1", "tanh"],
  ["z2", "h2", "tanh"],
  ["h1", "y",  "v1"],
  ["h2", "y",  "v2"],
  ["y",  "L",  "½(y−t)²"],
];

function BackpropDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [x1, setX1] = _useState(0.6);
  const [x2, setX2] = _useState(-0.3);
  const [target, setTarget] = _useState(0.5);
  const [stepIdx, setStepIdx] = _useState(-1); // -1 = nothing shown yet

  const s = compute(x1, x2, target);

  // What's "active" up to and including step n?
  // We track which nodes & edges should be drawn.
  const activeNodes = new Set();
  const activeEdges = new Set();
  const litFwd = new Set();
  const litBwd = new Set();
  for (let i = 0; i <= stepIdx; i++) {
    const st = STEPS[i]; if (!st) continue;
    activeNodes.add(st.k);
    if (st.phase === "f") litFwd.add(st.k); else litBwd.add(st.k);
    if (st.k === "z1") { activeEdges.add("x1-z1"); activeEdges.add("x2-z1"); }
    if (st.k === "z2") { activeEdges.add("x1-z2"); activeEdges.add("x2-z2"); }
    if (st.k === "h1") activeEdges.add("z1-h1");
    if (st.k === "h2") activeEdges.add("z2-h2");
    if (st.k === "y")  { activeEdges.add("h1-y"); activeEdges.add("h2-y"); }
    if (st.k === "L")  activeEdges.add("y-L");
    // backward: light edge in reverse direction (visually)
    if (st.k === "dL_dy")  activeEdges.add("y-L");
    if (st.k === "dL_dh1") activeEdges.add("h1-y");
    if (st.k === "dL_dh2") activeEdges.add("h2-y");
    if (st.k === "dL_dz1") activeEdges.add("z1-h1");
    if (st.k === "dL_dz2") activeEdges.add("z2-h2");
    if (st.k === "dL_dw11") { activeEdges.add("x1-z1"); }
    if (st.k === "dL_dv1")  { activeEdges.add("h1-y"); }
  }

  function valueOf(k) {
    if (k in s) return s[k];
    return null;
  }
  function gradOf(node) {
    // For each forward node, what gradient flows back through it
    if (node === "y")  return s.dL_dy;
    if (node === "h1") return s.dL_dh1;
    if (node === "h2") return s.dL_dh2;
    if (node === "z1") return s.dL_dz1;
    if (node === "z2") return s.dL_dz2;
    if (node === "x1") return W.w11 * s.dL_dz1 + W.w21 * s.dL_dz2;
    if (node === "x2") return W.w12 * s.dL_dz1 + W.w22 * s.dL_dz2;
    if (node === "L") return 1;
    return null;
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, SIZE, H);

    // edges
    for (const [from, to, w] of EDGES) {
      const a = NODES[from], b = NODES[to];
      const id = `${from}-${to}`;
      const isActive = activeEdges.has(id);
      ctx.strokeStyle = isActive ? "rgba(96,165,250,0.7)" : "rgba(148,163,184,0.18)";
      ctx.lineWidth = isActive ? 1.6 : 1;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      // label
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - 4;
      ctx.fillStyle = isActive ? "rgba(224,231,255,0.9)" : "rgba(148,163,184,0.45)";
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.fillText(w, mx - 12, my);
    }

    // nodes
    for (const k of Object.keys(NODES)) {
      const n = NODES[k];
      const isFwd = litFwd.has(k);
      const isBwd = litBwd.has("dL_d" + k) || (k === "y" && litBwd.has("dL_dy")) || (k === "L" && litBwd.has("dL_dy"));
      ctx.beginPath(); ctx.arc(n.x, n.y, 22, 0, Math.PI * 2);
      ctx.fillStyle = isBwd ? "rgba(192,132,252,0.20)" : (isFwd ? "rgba(96,165,250,0.20)" : "rgba(15, 23, 42, 0.65)");
      ctx.strokeStyle = isBwd ? "#c084fc" : (isFwd ? "#60a5fa" : "rgba(148,163,184,0.45)");
      ctx.lineWidth = 1.5; ctx.fill(); ctx.stroke();
      // label
      ctx.fillStyle = "var(--white)";
      ctx.fillStyle = "rgba(224,231,255,0.95)";
      ctx.font = "13px 'Space Grotesk', sans-serif";
      ctx.fillText(n.lab, n.x - 10, n.y - 3);
      // value
      if (isFwd || k === "L") {
        const v = valueOf(k);
        ctx.fillStyle = "#60a5fa"; ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.fillText(typeof v === "number" ? v.toFixed(3) : "—", n.x - 16, n.y + 10);
      }
      // grad
      if (isBwd) {
        const g = gradOf(k);
        ctx.fillStyle = "#c084fc"; ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.fillText(typeof g === "number" ? "∂L/∂" + k + " = " + g.toFixed(3) : "—", n.x - 36, n.y + 24);
      }
    }

    // legend
    ctx.fillStyle = "rgba(148,163,184,0.7)"; ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillText("FORWARD ●", 12, 22); ctx.fillStyle = "#60a5fa"; ctx.fillRect(78, 14, 10, 10);
    ctx.fillStyle = "rgba(148,163,184,0.7)"; ctx.fillText("BACKWARD ●", 12, 40);
    ctx.fillStyle = "#c084fc"; ctx.fillRect(86, 32, 10, 10);
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = SIZE * dpr; cv.height = H * dpr;
    cv.style.width = SIZE + "px"; cv.style.height = H + "px";
    draw();
  }, []);
  _useEffect(() => { draw(); /* eslint-disable-next-line */ }, [stepIdx, x1, x2, target]);

  const cur = stepIdx >= 0 && stepIdx < STEPS.length ? STEPS[stepIdx] : null;
  const phaseLabel = cur ? (cur.phase === "f" ? "FORWARD" : "BACKWARD") : "READY";

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// X1" min={-1.5} max={1.5} step={0.05} value={x1} onChange={setX1}
        help="An input to the network. Changing it shifts the forward values and the gradients that flow back to each weight." />
      <Slider label="// X2" min={-1.5} max={1.5} step={0.05} value={x2} onChange={setX2}
        help="The other input. Tries to teach you that ∂L/∂x_i is the sum of contributions through every path back to L." />
      <Slider label="// TARGET t" min={-1.5} max={1.5} step={0.05} value={target} onChange={setTarget} tone="violet"
        help="The label the network is trying to match. The backward pass starts from (y − t) — the residual." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <DemoButton onClick={() => setStepIdx(i => Math.min(i + 1, STEPS.length - 1))} primary>NEXT STEP →</DemoButton>
        <DemoButton onClick={() => setStepIdx(i => Math.max(i - 1, -1))}>← BACK</DemoButton>
        <DemoButton onClick={() => setStepIdx(STEPS.length - 1)}>RUN ALL</DemoButton>
        <DemoButton onClick={() => setStepIdx(-1)}>RESET</DemoButton>
      </div>
      <div style={{
        padding: "12px 14px", border: "1px solid var(--border)", borderRadius: 6,
        background: cur ? (cur.phase === "f" ? "rgba(96,165,250,0.08)" : "rgba(192,132,252,0.08)") : "rgba(13,24,52,0.4)",
      }}>
        <div className="t-mono-s" style={{ color: cur && cur.phase === "b" ? "var(--violet-lt)" : "var(--blue-lt)", fontSize: 10 }}>
          {phaseLabel} · STEP {Math.max(0, stepIdx + 1)} / {STEPS.length}
        </div>
        <div className="t-mono" style={{ color: "var(--white)", fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
          {cur ? cur.label : "Press NEXT STEP to walk forward through the network, then back."}
        </div>
      </div>
      <StatReadout label="LOSS" value={s.L.toFixed(4)} accent="#fbbf24" />
      <Legend items={[
        { color: "#60a5fa", label: "FORWARD VALUE" },
        { color: "#c084fc", label: "BACKWARD GRADIENT" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Backprop isn't witchcraft, it's the chain rule run on a computational
        graph. The <b style={{ color: "#60a5fa" }}>forward</b> pass walks
        left to right: each node is a small function of the ones to its left,
        and we just plug numbers in. The <b style={{ color: "#c084fc" }}>backward</b>
        pass walks right to left: at each node we ask "if I bump this value a
        little, how much does L change?" — and that's exactly the gradient.
      </DemoP>
      <DemoP>
        Watch the seven backward steps. Each one is a single application of the
        chain rule: ∂L/∂y travels up the v1 edge to give ∂L/∂h1; then
        through the tanh's derivative (1 − h1²) to give ∂L/∂z1; then through
        the multiplication by x1 to give ∂L/∂w11. There is no global formula
        — just one local derivative per edge, multiplied together. Every modern
        framework (PyTorch, JAX, TensorFlow) is automating exactly this picture.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Backpropagation is the engine inside every neural network you've ever
        heard of — every CNN, transformer, diffusion model, RL policy. The
        autograd machinery in PyTorch / JAX builds the same graph dynamically
        at each forward pass, records the local derivative at each operation,
        and replays them in reverse to get the gradients. That's it. Once
        you've watched seven nodes do it by hand, GPT-scale training stops
        looking magical and starts looking like a lot of arithmetic.
      </DemoP>
      <DemoP>
        The chain rule's reach goes well past gradients: it's why we can
        compose differentiable simulators, fluid solvers, renderers, even
        protein folders, into end-to-end trainable systems — anywhere you can
        write a forward function with local derivatives, you get a backward
        function for free. "Differentiable everything" is one of the defining
        moves of modern ML, and it's all this one trick scaled up.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="FOUNDATIONS" title="Backprop Graph"
      subtitle="Step through forward then backward on a tiny network — every value, every gradient, by the chain rule."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/neural-nets/`}
      tone="blue" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<BackpropDemo />);
