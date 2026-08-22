// demos/adversarial-examples.jsx — fool a real classifier with a tiny nudge.
// Train a 2-layer MLP on a 2-D task, then attack a chosen point with FGSM (one
// signed input-gradient step inside an L-infinity epsilon ball) or PGD (iterate).
// The adversarial point crosses the decision boundary while staying inside the
// box. An ADVERSARIAL TRAINING toggle retrains on attacked examples and widens
// the margin so the same epsilon no longer fools it. Real MLP + real input-
// gradient attacks (backprop to the input).

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, Toggle, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 380, NH = 10, R = 2.2;
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function gauss(rng) { let u = 0, v = 0; while (u === 0) u = rng(); while (v === 0) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const tanh = Math.tanh;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function makeData(rng) {
  const pts = [];
  for (let i = 0; i < 140; i++) { const t = rng() * Math.PI, up = i % 2; let x, y, lab; if (up) { x = Math.cos(t) - 0.5; y = Math.sin(t) - 0.25; lab = 0; } else { x = Math.cos(t) + 0.5; y = -Math.sin(t) + 0.25; lab = 1; } x += gauss(rng) * 0.12; y += gauss(rng) * 0.12; pts.push({ x: [x, y], y: lab }); }
  return pts;
}

function AdversarialExamplesDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rngRef = _useRef(mulberry32(9));
  const dataRef = _useRef([]);
  const netRef = _useRef(null);
  const srcRef = _useRef([-0.2, 0.3]);
  const advRef = _useRef(null);
  const rafRef = _useRef(null);

  const [attack, setAttack] = _useState("fgsm");
  const [eps, setEps] = _useState(0.4);
  const [pgdSteps, setPgdSteps] = _useState(10);
  const [advTrain, setAdvTrain] = _useState(false);
  const [seed, setSeed] = _useState(9);
  const [, setTick] = _useState(0);

  const attackRef = _useRef(attack), epsRef = _useRef(eps), pgdRef = _useRef(pgdSteps);
  _useEffect(() => { attackRef.current = attack; recompute(); }, [attack]);
  _useEffect(() => { epsRef.current = eps; recompute(); }, [eps]);
  _useEffect(() => { pgdRef.current = pgdSteps; recompute(); }, [pgdSteps]);

  function rm(r, c, rng, s) { return Array.from({ length: r }, () => Array.from({ length: c }, () => gauss(rng) * s)); }
  function fwd(net, x) {
    const z1 = net.b1.map((b, i) => b + net.W1[i][0] * x[0] + net.W1[i][1] * x[1]); const h1 = z1.map(tanh);
    const zo = net.b3.map((b, i) => b + net.W3[i].reduce((s, w, j) => s + w * h1[j], 0));
    const mx = Math.max(zo[0], zo[1]), e0 = Math.exp(zo[0] - mx), e1 = Math.exp(zo[1] - mx), s = e0 + e1;
    return { h1, z1, zo, p: [e0 / s, e1 / s] };
  }
  function inputGrad(net, x, y) { // dL/dx for CE
    const f = fwd(net, x), dzo = [f.p[0] - (y === 0 ? 1 : 0), f.p[1] - (y === 1 ? 1 : 0)];
    const dh1 = new Array(NH).fill(0); for (let j = 0; j < NH; j++) for (let i = 0; i < 2; i++) dh1[j] += net.W3[i][j] * dzo[i];
    const dz1 = dh1.map((g, j) => g * (1 - f.h1[j] * f.h1[j]));
    let gx = 0, gy = 0; for (let j = 0; j < NH; j++) { gx += net.W1[j][0] * dz1[j]; gy += net.W1[j][1] * dz1[j]; }
    return [gx, gy];
  }

  function train(adv) {
    const rng = rngRef.current, data = dataRef.current, N = data.length, lr = 0.25, trainEps = 0.4;
    const net = { W1: rm(NH, 2, rng, 1.0), b1: new Array(NH).fill(0), W3: rm(2, NH, rng, 0.8), b3: [0, 0] };
    for (let ep = 0; ep < 360; ep++) {
      const gW1 = net.W1.map(r => r.map(() => 0)), gb1 = net.b1.map(() => 0), gW3 = net.W3.map(r => r.map(() => 0)), gb3 = [0, 0];
      for (const d of data) {
        let xin = d.x;
        if (adv && ep > 120) { const g = inputGrad(net, d.x, d.y); xin = [clamp(d.x[0] + trainEps * Math.sign(g[0]), -R, R), clamp(d.x[1] + trainEps * Math.sign(g[1]), -R, R)]; }
        const f = fwd(net, xin), y = d.y, dzo = [f.p[0] - (y === 0 ? 1 : 0), f.p[1] - (y === 1 ? 1 : 0)];
        for (let i = 0; i < 2; i++) { gb3[i] += dzo[i]; for (let j = 0; j < NH; j++) gW3[i][j] += dzo[i] * f.h1[j]; }
        const dh1 = new Array(NH).fill(0); for (let j = 0; j < NH; j++) for (let i = 0; i < 2; i++) dh1[j] += net.W3[i][j] * dzo[i];
        const dz1 = dh1.map((g, j) => g * (1 - f.h1[j] * f.h1[j]));
        for (let i = 0; i < NH; i++) { gb1[i] += dz1[i]; gW1[i][0] += dz1[i] * xin[0]; gW1[i][1] += dz1[i] * xin[1]; }
      }
      const s = lr / N;
      for (let i = 0; i < NH; i++) { net.b1[i] -= s * gb1[i]; net.W1[i][0] -= s * gW1[i][0]; net.W1[i][1] -= s * gW1[i][1]; }
      for (let i = 0; i < 2; i++) { net.b3[i] -= s * gb3[i]; for (let j = 0; j < NH; j++) net.W3[i][j] -= s * gW3[i][j]; }
    }
    netRef.current = net;
  }

  function attackPoint() {
    const net = netRef.current, x0 = srcRef.current, e = epsRef.current;
    const f0 = fwd(net, x0), y = f0.p[0] >= f0.p[1] ? 0 : 1; // true-ish label = current prediction (attack to flip it)
    let x = [x0[0], x0[1]];
    const steps = attackRef.current === "fgsm" ? 1 : pgdRef.current;
    const alpha = attackRef.current === "fgsm" ? e : e / Math.max(1, pgdRef.current) * 2.5;
    const path = [[x[0], x[1]]];
    for (let k = 0; k < steps; k++) {
      const g = inputGrad(net, x, y); // ascend loss => move away from class y
      x = [clamp(x[0] + alpha * Math.sign(g[0]), x0[0] - e, x0[0] + e), clamp(x[1] + alpha * Math.sign(g[1]), x0[1] - e, x0[1] + e)];
      x = [clamp(x[0], -R, R), clamp(x[1], -R, R)];
      path.push([x[0], x[1]]);
    }
    const fa = fwd(net, x), advClass = fa.p[0] >= fa.p[1] ? 0 : 1;
    advRef.current = { x, path, origClass: y, origConf: Math.max(f0.p[0], f0.p[1]), advClass, advConf: Math.max(fa.p[0], fa.p[1]), success: advClass !== y };
  }

  function recompute() { if (!netRef.current) return; attackPoint(); setTick(v => v + 1); draw(); }
  function rebuild() { rngRef.current = mulberry32(seed); dataRef.current = makeData(rngRef.current); train(advTrain); attackPoint(); setTick(v => v + 1); draw(); }

  function toPx(x, y) { return [W * 0.5 + x * (W * 0.5 / R) * 0.82 - 60, H * 0.5 - y * (H * 0.5 / R) * 0.82]; }
  function toParam(px, py) { return [((px + 60) - W * 0.5) / ((W * 0.5 / R) * 0.82), -(py - H * 0.5) / ((H * 0.5 / R) * 0.82)]; }

  function draw() {
    const cv = canvasRef.current; if (!cv || !netRef.current) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const net = netRef.current, CS = 7;
    for (let px = 0; px < W; px += CS) for (let py = 0; py < H; py += CS) {
      const [x, y] = toParam(px, py); if (Math.abs(x) > R || Math.abs(y) > R) continue;
      const f = fwd(net, [x, y]); const conf = Math.abs(f.p[0] - f.p[1]);
      ctx.fillStyle = f.p[0] >= f.p[1] ? `rgba(96,165,250,${0.08 + conf * 0.18})` : `rgba(168,85,247,${0.08 + conf * 0.18})`;
      ctx.fillRect(px, py, CS, CS);
    }
    for (const d of dataRef.current) { const [px, py] = toPx(d.x[0], d.x[1]); ctx.fillStyle = d.y === 0 ? "rgba(96,165,250,0.7)" : "rgba(168,85,247,0.7)"; ctx.beginPath(); ctx.arc(px, py, 2.4, 0, Math.PI * 2); ctx.fill(); }
    const a = advRef.current, x0 = srcRef.current, e = epsRef.current;
    // epsilon box
    const [bx0, by0] = toPx(x0[0] - e, x0[1] + e), [bx1, by1] = toPx(x0[0] + e, x0[1] - e);
    ctx.strokeStyle = "rgba(251,191,36,0.6)"; ctx.lineWidth = 1.2; ctx.setLineDash([4, 3]); ctx.strokeRect(bx0, by0, bx1 - bx0, by1 - by0); ctx.setLineDash([]);
    if (a) {
      // PGD path
      if (a.path.length > 1) { ctx.strokeStyle = "rgba(248,113,113,0.7)"; ctx.lineWidth = 1.5; ctx.beginPath(); a.path.forEach((p, i) => { const [px, py] = toPx(p[0], p[1]); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke(); }
      const [sx, sy] = toPx(x0[0], x0[1]); ctx.fillStyle = "#fff"; ctx.strokeStyle = "#0a0e1a"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      const [ax, ay] = toPx(a.x[0], a.x[1]); ctx.fillStyle = a.success ? "#f87171" : "#34d399"; ctx.strokeStyle = "#0a0e1a"; ctx.beginPath(); ctx.arc(ax, ay, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px JetBrains Mono, monospace"; ctx.textAlign = "left";
    ctx.fillText("click to pick the input; yellow box = epsilon ball", 12, 18);
    if (a) { ctx.fillStyle = a.success ? "#f87171" : "#34d399"; ctx.font = "11px JetBrains Mono"; ctx.fillText(a.success ? `FOOLED: class ${a.origClass} -> ${a.advClass}` : `robust: still class ${a.origClass}`, 12, H - 14); }
  }

  function onDown(ev) {
    const rect = canvasRef.current.getBoundingClientRect();
    const [x, y] = toParam((ev.clientX - rect.left) / (rect.width / W), (ev.clientY - rect.top) / (rect.height / H));
    if (Math.abs(x) > R || Math.abs(y) > R) return;
    srcRef.current = [x, y]; recompute();
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    rebuild();
  }, []);
  _useEffect(() => { rebuild(); }, [seed, advTrain]);

  const a = advRef.current;
  const stage = (<canvas ref={canvasRef} onPointerDown={onDown} style={{ touchAction: "none", cursor: "crosshair", maxWidth: "100%", borderRadius: 4 }} />);

  const controls = (
    <ControlGroup>
      <SegmentedControl label="// ATTACK" value={attack} onChange={setAttack}
        options={[{ value: "fgsm", label: "FGSM" }, { value: "pgd", label: "PGD" }]}
        help="FGSM = one signed input-gradient step to the edge of the epsilon ball (fast, weak). PGD = iterate small signed steps, projecting back into the ball each time (slower, much stronger - the standard benchmark attack)." />
      <Slider label="// EPSILON (budget)" min={0.05} max={0.9} step={0.05} value={eps} onChange={setEps}
        help="The L-infinity perturbation budget - how far the attacker may move the input (the yellow box). Larger epsilon = more powerful attack. In image space this same budget is a change too small for a human to see." />
      <Slider label="// PGD STEPS" min={2} max={30} step={1} value={pgdSteps} onChange={setPgdSteps}
        help="Iterations for PGD. More steps find a stronger adversarial point within the same epsilon ball. (Ignored for FGSM.)" />
      <Toggle label="// ADVERSARIAL TRAINING" checked={advTrain} onChange={setAdvTrain} tone="violet"
        help="Retrain the model on attacked examples (Madry-style robust training). It widens the margin around the data, so the same epsilon attack stops working - at some cost to clean accuracy and a smoother boundary." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setSeed(s => s + 1)} primary>NEW MODEL</DemoButton>
        <DemoButton onClick={() => { srcRef.current = [-0.2, 0.3]; setAttack("fgsm"); setEps(0.4); }}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="ORIGINAL" value={a ? `class ${a.origClass} (${(a.origConf * 100).toFixed(0)}%)` : "-"} accent="#60a5fa" />
        <StatReadout label="ADVERSARIAL" value={a ? `class ${a.advClass} (${(a.advConf * 100).toFixed(0)}%)` : "-"} accent={a && a.success ? "#f87171" : "#34d399"} />
      </div>
      <StatReadout label="ATTACK RESULT" value={a ? (a.success ? "FOOLED" : "ROBUST") : "-"} accent={a && a.success ? "#f87171" : "#34d399"} />
      <Legend items={[
        { color: "#fff", label: "original input", border: "1px solid #0a0e1a" },
        { color: "#f87171", label: "adversarial (fooled)" },
        { color: "#34d399", label: "adversarial (robust)" },
        { color: "#fbbf24", label: "epsilon ball" },
      ]} />
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        A trained classifier can be confidently right on a point and confidently <b>wrong</b> on a
        nearly identical one. To build the adversarial example you ask the model itself: which way do I
        nudge the input to <i>increase</i> its loss? That direction is the <b>gradient of the loss with
        respect to the input</b> (not the weights). <b>FGSM</b> takes one signed step to the edge of an
        <b> epsilon ball</b> (the yellow box); <b>PGD</b> iterates small steps inside it to find a
        stronger attack.
      </DemoP>
      <DemoP>
        Click to pick a point and watch the red dot get pushed across the decision boundary while
        staying inside the box. In this 2-D view the move is visible; in a 224×224 image the very same
        epsilon-bounded perturbation is <i>imperceptible</i> to a human yet flips the label. Turn on
        <b> adversarial training</b> and the model retrains on its own attacks — the margin widens and
        the same epsilon no longer fools it (notice the boundary gets smoother and clean confidence
        drops a little: the robustness/accuracy tradeoff).
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        Adversarial examples are the headline result in <b>ML robustness</b>: tiny, worst-case
        perturbations break image classifiers, speech models, malware detectors, and even LLMs
        (jailbreak suffixes are gradient-found adversarial tokens — see
        <a href={`${window.__DM_BASE || "../../"}visualize/prompt-injection/`}> prompt injection</a>).
        The same input-gradient that powers <a href={`${window.__DM_BASE || "../../"}visualize/saliency/`}>saliency
        maps</a> is what the attacker climbs. It matters anywhere a model faces an adversary: fraud,
        content moderation, autonomous perception, security.
      </DemoP>
      <DemoP>
        The defense you toggled — <b>adversarial training</b> (Madry et al.) — is still the strongest
        general defense, but it isn't free: it costs clean accuracy, compute, and only guarantees
        robustness inside the epsilon ball you trained for. That tradeoff, plus certified defenses
        (randomized smoothing) and the endless attack/defense arms race, is why robustness is a field
        of its own. The honest scope note: this is a 2-D illustration of the mechanism — real attacks
        live in high dimensions where the geometry is far less forgiving.
      </DemoP>
    </>
  );

  return (
    <DemoLayout
      title="Adversarial Examples (FGSM / PGD)"
      subtitle="Nudge an input along the loss gradient and fool a real classifier - then defend it with adversarial training."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/ml-theory/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="blue"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<AdversarialExamplesDemo />);
