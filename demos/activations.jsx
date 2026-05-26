// demos/activations.jsx — activation functions + their derivatives, plotted live.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  SegmentedControl, Toggle, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 420, XR = 5, YMIN = -1.4, YMAX = 2.2;
const px = x => (x + XR) / (2 * XR) * W;
const py = y => H - (y - YMIN) / (YMAX - YMIN) * H;

const FNS = {
  Sigmoid: { color: "#60a5fa", f: x => 1 / (1 + Math.exp(-x)), d: x => { const s = 1 / (1 + Math.exp(-x)); return s * (1 - s); } },
  Tanh: { color: "#c084fc", f: x => Math.tanh(x), d: x => 1 - Math.tanh(x) ** 2 },
  ReLU: { color: "#34d399", f: x => Math.max(0, x), d: x => (x > 0 ? 1 : 0) },
  LeakyReLU: { color: "#fbbf24", f: x => (x > 0 ? x : 0.1 * x), d: x => (x > 0 ? 1 : 0.1) },
  GELU: { color: "#f87171", f: x => 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3))), d: x => { const h = 1e-4; const g = z => 0.5 * z * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (z + 0.044715 * z ** 3))); return (g(x + h) - g(x - h)) / (2 * h); } },
  SiLU: { color: "#22d3ee", f: x => x / (1 + Math.exp(-x)), d: x => { const s = 1 / (1 + Math.exp(-x)); return s + x * s * (1 - s); } },
};
const NAMES = Object.keys(FNS);

function ActivationsDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const hoverRef = _useRef(null);
  const [focus, setFocus] = _useState("All");
  const [showD, setShowD] = _useState(false);

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // grid + axes
    ctx.strokeStyle = "rgba(96,165,250,0.10)"; ctx.lineWidth = 1;
    for (let gx = -XR; gx <= XR; gx++) { ctx.beginPath(); ctx.moveTo(px(gx), 0); ctx.lineTo(px(gx), H); ctx.stroke(); }
    for (let gy = Math.ceil(YMIN); gy <= YMAX; gy++) { ctx.beginPath(); ctx.moveTo(0, py(gy)); ctx.lineTo(W, py(gy)); ctx.stroke(); }
    ctx.strokeStyle = "rgba(148,163,184,0.4)"; ctx.beginPath(); ctx.moveTo(0, py(0)); ctx.lineTo(W, py(0)); ctx.moveTo(px(0), 0); ctx.lineTo(px(0), H); ctx.stroke();

    const plot = (fn, color, dashed, dim) => {
      ctx.strokeStyle = color; ctx.lineWidth = dashed ? 1.5 : 2.5; ctx.globalAlpha = dim ? 0.18 : 1;
      ctx.setLineDash(dashed ? [5, 4] : []);
      ctx.beginPath();
      for (let i = 0; i <= 400; i++) { const x = -XR + (i / 400) * 2 * XR; const yv = py(fn(x)); i ? ctx.lineTo(px(x), yv) : ctx.moveTo(px(x), yv); }
      ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    };
    NAMES.forEach(n => {
      const dim = focus !== "All" && focus !== n;
      plot(FNS[n].f, FNS[n].color, false, dim);
      if (showD) plot(FNS[n].d, FNS[n].color, true, dim);
    });

    // hover readout
    if (hoverRef.current != null) {
      const hx = hoverRef.current;
      ctx.strokeStyle = "rgba(224,231,255,0.4)"; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(px(hx), 0); ctx.lineTo(px(hx), H); ctx.stroke(); ctx.setLineDash([]);
      const list = focus === "All" ? NAMES : [focus];
      ctx.font = "11px 'JetBrains Mono', monospace"; ctx.textAlign = "left";
      list.forEach((n, i) => {
        ctx.fillStyle = FNS[n].color;
        ctx.fillText(`${n}: ${FNS[n].f(hx).toFixed(2)}  f'=${FNS[n].d(hx).toFixed(2)}`, 14, 20 + i * 16);
      });
      ctx.fillStyle = "var(--muted)"; ctx.fillStyle = "#94a3b8";
      ctx.fillText(`x = ${hx.toFixed(2)}`, px(hx) + 6, H - 10);
    }
  }

  function onMove(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    hoverRef.current = (e.clientX - rect.left) / (rect.width / W) / W * 2 * XR - XR;
    draw();
  }
  function onLeave() { hoverRef.current = null; draw(); }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  }, []);
  _useEffect(() => { draw(); }, [focus, showD]);

  const stage = <canvas ref={canvasRef} onPointerMove={onMove} onPointerLeave={onLeave} style={{ touchAction: "none", maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <SegmentedControl label="// HIGHLIGHT" value={focus} onChange={setFocus}
        options={[{ value: "All", label: "All" }].concat(NAMES.map(n => ({ value: n, label: n })))}
        help="Spotlight one activation (dimming the rest) or show all at once. Use it to compare a single function's shape and gradient against the family." />
      <Toggle label="// SHOW DERIVATIVES (dashed)" checked={showD} onChange={setShowD} tone="violet"
        help="Overlay each function's gradient as a dashed curve. The gradient is what flows backward in training — flat regions mean vanishing gradients that stall learning." />
      <Legend items={NAMES.map(n => ({ color: FNS[n].color, label: n.toUpperCase() }))} />
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>Hover the plot to read values + gradients at any x.</div>
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        An activation function is the nonlinearity that lets a neural network bend —
        without one, stacking layers just collapses to a single linear map. Each
        choice has a personality. <b>Sigmoid</b> and <b>Tanh</b> squash to a bounded
        range but <i>saturate</i>: turn on derivatives and see how their gradient
        flatlines for large |x| — the vanishing-gradient problem that stalls deep
        nets.
      </DemoP>
      <DemoP>
        <b>ReLU</b> fixed that with a dead-simple <i>max(0, x)</i> and a constant
        gradient on the positive side (but a flat dead zone for x &lt; 0, which
        <b> Leaky ReLU</b> patches). <b>GELU</b> and <b>SiLU/Swish</b> are smooth,
        non-monotonic curves that modern transformers favor. Toggle the derivatives
        and hover across x — the gradient is what actually flows backward during
        training, so its shape matters more than the function's.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Activation choice is a real architecture decision with measurable consequences.
        Sigmoid/tanh saturation caused the vanishing-gradient problem that kept networks
        shallow for decades; <b>ReLU</b>'s constant positive-side gradient is much of why
        deep learning took off. Modern transformers and LLMs default to smooth variants —
        <b> GELU</b> in BERT/GPT, <b>SiLU</b>/SwiGLU in Llama-style models — for slightly
        better gradients and accuracy.
      </DemoP>
      <DemoP>
        The deeper lesson is that <i>gradients</i>, not outputs, govern training. The same
        "is the gradient alive here?" question drives weight initialization, normalization
        layers (BatchNorm, LayerNorm), and residual connections — all of which exist to
        keep gradients flowing through deep stacks. Read an activation by its derivative and
        you're reading it the way the optimizer does.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="NEURAL NETWORKS" title="Activation Functions"
      subtitle="The nonlinearities that make deep learning deep — and the gradients that decide whether it trains."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/neural-nets/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="blue" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ActivationsDemo />);
