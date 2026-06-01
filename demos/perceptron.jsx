// demos/perceptron.jsx — Rosenblatt's perceptron learning algorithm, live.
//
// The perceptron is a single linear threshold unit: predict ŷ = sign(w·x + b).
// It learns online, one point at a time, doing nothing when it's right and a
// single corrective nudge when it's wrong:
//   if y·(w·x + b) ≤ 0:  w ← w + η·y·x,   b ← b + η·y.
// The Perceptron Convergence Theorem guarantees it finds a separating hyperplane
// in finitely many updates IF the data is linearly separable. We sweep epochs
// through the data, animate the boundary swinging into place and the weight
// vector, count mistakes per epoch, and flag CONVERGED at the first clean pass.
// Crank CLASS OVERLAP to make the data non-separable and watch it never settle —
// the algorithm's defining limitation, and the reason the margin/SVM idea exists.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 470, H = 470, SC = 180;
const cx = W / 2, cy = H / 2;
const PX = (x) => cx + x * SC, PY = (y) => cy - y * SC;

function PerceptronDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const [lr, setLr] = _useState(0.3);
  const [overlap, setOverlap] = _useState(0.0);
  const [N, setN] = _useState(40);
  const [running, setRunning] = _useState(true);
  const [seed, setSeed] = _useState(1);
  const [, setTick] = _useState(0);
  const sim = _useRef(null);

  function rng(s0) { let s = s0 >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function randn(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  function reset() {
    const r = rng(seed * 6700417 + 11);
    // true separator
    const th = (r() * 2 - 1) * 0.9;
    const nx = Math.cos(th + 1.2), ny = Math.sin(th + 1.2), off = (r() * 2 - 1) * 0.25;
    const pts = [];
    for (let i = 0; i < N; i++) {
      const x = (r() * 2 - 1) * 1.05, y = (r() * 2 - 1) * 1.05;
      const d = nx * x + ny * y - off;
      let label = d >= 0 ? 1 : -1;
      // overlap flips labels near the boundary -> non-separable
      if (overlap > 0 && r() < overlap * 0.45 * Math.exp(-Math.abs(d) * 2.2)) label = -label;
      pts.push([x, y, label]);
    }
    sim.current = {
      pts, w: [0, 0], b: 0, idx: 0,
      mistEpoch: 0, lastMist: null, epochs: 0, updates: 0, converged: false, curr: -1,
    };
    setTick(t => t + 1);
  }
  _useEffect(() => { reset(); /* eslint-disable-next-line */ }, [overlap, N, seed]);

  function step() {
    const st = sim.current; if (!st || st.converged) return;
    const { pts } = st;
    const i = st.idx;
    const [x, y, lab] = pts[i];
    st.curr = i;
    const act = st.w[0] * x + st.w[1] * y + st.b;
    if (lab * act <= 0) { // mistake -> update
      st.w[0] += lr * lab * x; st.w[1] += lr * lab * y; st.b += lr * lab;
      st.mistEpoch++; st.updates++;
    }
    st.idx++;
    if (st.idx >= pts.length) {
      st.idx = 0; st.epochs++;
      st.lastMist = st.mistEpoch;
      if (st.mistEpoch === 0) st.converged = true;
      st.mistEpoch = 0;
    }
  }

  _useEffect(() => {
    let last = performance.now();
    const tick = (now) => {
      if (running && now - last > 40) { last = now; step(); setTick(t => t + 1); }
      draw();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    /* eslint-disable-next-line */
  }, [running, lr]);

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const st = sim.current; if (!st) return;
    const { pts, w, b } = st;

    // axes
    ctx.strokeStyle = "rgba(148,163,184,0.14)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PX(-1.25), PY(0)); ctx.lineTo(PX(1.25), PY(0)); ctx.moveTo(PX(0), PY(-1.25)); ctx.lineTo(PX(0), PY(1.25)); ctx.stroke();
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono";
    ctx.fillText("PERCEPTRON  ·  one corrective nudge per misclassified point", 16, 20);

    // decision boundary  w·x + b = 0
    const wn = Math.hypot(w[0], w[1]);
    if (wn > 1e-6) {
      const ux = -w[1] / wn, uy = w[0] / wn;        // along-line direction
      const p0x = -b * w[0] / (wn * wn), p0y = -b * w[1] / (wn * wn);
      ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(PX(p0x - ux * 2.2), PY(p0y - uy * 2.2));
      ctx.lineTo(PX(p0x + ux * 2.2), PY(p0y + uy * 2.2));
      ctx.stroke();
      // weight vector (normal), from origin
      ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(PX(0), PY(0)); ctx.lineTo(PX(w[0] / wn * 0.5), PY(w[1] / wn * 0.5)); ctx.stroke();
      ctx.fillStyle = "#fbbf24"; ctx.font = "10px JetBrains Mono"; ctx.fillText("w", PX(w[0] / wn * 0.5) + 4, PY(w[1] / wn * 0.5));
    }

    // points
    for (let i = 0; i < pts.length; i++) {
      const [x, y, lab] = pts[i];
      const act = w[0] * x + w[1] * y + b;
      const wrong = wn > 1e-6 && lab * act <= 0;
      ctx.beginPath(); ctx.arc(PX(x), PY(y), i === st.curr ? 6 : 4, 0, 7);
      ctx.fillStyle = lab > 0 ? "#60a5fa" : "#f87171"; ctx.globalAlpha = wrong ? 1 : 0.85; ctx.fill(); ctx.globalAlpha = 1;
      if (wrong) { ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(PX(x), PY(y), 7, 0, 7); ctx.stroke(); }
      if (i === st.curr) { ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(PX(x), PY(y), 9, 0, 7); ctx.stroke(); }
    }

    ctx.fillStyle = st.converged ? "#34d399" : "#a855f7"; ctx.font = "600 13px Space Grotesk, JetBrains Mono";
    ctx.fillText(st.converged ? "CONVERGED — separating line found" : "SEARCHING…", 16, H - 14);
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
      <Slider label="// LEARNING RATE  η" min={0.05} max={1} step={0.05} value={lr} onChange={setLr} tone="violet"
        help="Size of each corrective nudge. With zero-initialized weights it only rescales w, so it doesn't change WHETHER the perceptron converges (the boundary is the same) — just the magnitude of the steps. A real quirk of this algorithm." />
      <Slider label="// CLASS OVERLAP" min={0} max={1} step={0.05} value={overlap} onChange={setOverlap}
        help="Flips labels near the true boundary, making the classes overlap. At 0 the data is linearly separable and the perceptron is guaranteed to converge; above 0 it's non-separable and the boundary will swing forever, never settling. Resets the data." />
      <Slider label="// POINTS  N" min={20} max={120} step={10} value={N} onChange={setN}
        help="Number of training points. More points (still separable) usually means a smaller margin and more updates before convergence." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setRunning(r => !r)} primary>{running ? "PAUSE" : "RESUME"}</DemoButton>
        <DemoButton onClick={() => setSeed(s => s + 1)}>RESTART</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="MISTAKES / LAST EPOCH" value={st && st.lastMist != null ? st.lastMist : "—"} accent="#fbbf24" />
        <StatReadout label="EPOCHS" value={st ? st.epochs : 0} accent="#a855f7" />
        <StatReadout label="TOTAL UPDATES" value={st ? st.updates : 0} accent="#60a5fa" />
        <StatReadout label="STATUS" value={st ? (st.converged ? "CONVERGED" : "SEARCHING") : "—"} accent={st && st.converged ? "#34d399" : "#a855f7"} />
      </div>
      <Legend items={[
        { color: "#60a5fa", label: "class +1" },
        { color: "#f87171", label: "class −1" },
        { color: "#fbbf24", label: "misclassified / w" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Each dot is a labeled point; the white line is the perceptron's current
        decision boundary and the yellow arrow is its weight vector w (the boundary
        is always perpendicular to it). The rule is almost absurdly simple: walk
        through the points, and every time one is on the wrong side (circled
        yellow), add that point's coordinates — times its label — onto w. That single
        nudge rotates the boundary toward fixing it. Points it already gets right
        cause no change at all.
      </DemoP>
      <DemoP>
        When the classes are separable (CLASS OVERLAP = 0), mistakes per epoch fall
        to zero and it locks onto a separating line — the Perceptron Convergence
        Theorem in action. Now raise CLASS OVERLAP so a few labels flip across the
        boundary: there's no line that fits, so the perceptron keeps over-correcting
        forever, the boundary wobbling endlessly. It never says "good enough." That
        failure is exactly why the field moved to margins (the SVM picks the BEST
        separator, not just any) and to smooth, differentiable losses you can
        minimize even when no perfect boundary exists.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Rosenblatt's perceptron (1958) is the historical seed of neural networks: a
        single artificial neuron with a step activation, trained by the first
        mistake-driven learning rule. It's literally one unit of the{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/neural-playground/`} style={{ color: "#a855f7" }}>neural playground</a>,
        and stacking and smoothing it (swap the step for a differentiable{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/activations/`} style={{ color: "#a855f7" }}>activation</a>,
        train by gradient descent) is how you get modern deep nets. The max-margin
        refinement of this exact problem is the{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/svm/`} style={{ color: "#a855f7" }}>support vector machine</a>.
      </DemoP>
      <DemoP>
        Caveats: the perceptron only finds SOME separating line, not the best one,
        and it diverges (never halts) on non-separable data — Minsky and Papert's
        famous critique that it can't even learn XOR helped trigger the first AI
        winter. The fixes that followed are the backbone of ML today: kernels and
        margins for separability and robustness, the logistic/cross-entropy loss for
        a probabilistic, always-defined objective, and multilayer networks with
        backprop for nonlinear boundaries. Variants like the averaged perceptron and
        passive-aggressive updates remain useful for fast linear text classification.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="NEURAL NETWORKS" title="The Perceptron"
      subtitle="Watch the original learning algorithm swing a decision boundary into place, one corrective nudge per misclassified point. Separable data converges by theorem; raise the class overlap to see it never settle — the limitation that launched margins, kernels, and backprop."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/neural-nets/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<PerceptronDemo />);
