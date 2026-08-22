// demos/distillation.jsx — knowledge distillation (teacher -> student).
//
// A fixed teacher (a prototype-softmax classifier over 3 classes) produces SOFT
// probabilities for each point. A small linear-softmax STUDENT is trained by
// gradient descent on the KD loss:
//   L = (1-α)·CE(student, hard label) + α·T²·KL(teacher_T ‖ student_T),
// where _T means logits divided by temperature T. Soft labels carry "dark
// knowledge" — the relative probabilities of the runner-up classes — that a
// one-hot hard label discards. Raise α and T and the student stops just copying
// the top class and starts matching the teacher's whole confidence structure.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480, K = 3;
const COL = ["#60a5fa", "#a855f7", "#fbbf24"];
const PROTO = [[-1.2, 0.8], [1.2, 0.7], [0.0, -1.1]];
function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function softmax(z) { const m = Math.max(...z); const e = z.map(v => Math.exp(v - m)); const s = e.reduce((a, b) => a + b, 0); return e.map(v => v / s); }
function teacherLogits(x, y) { return PROTO.map(p => -((x - p[0]) ** 2 + (y - p[1]) ** 2) * 0.9); }

function DistillationDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [T, setT] = _useState(3);
  const [alpha, setAlpha] = _useState(0.7);
  const [, force] = _useState(0);
  const ptsRef = _useRef([]);
  const stuRef = _useRef(null);

  function trainOn(pts, a, t) {
    let Wt = [[randn() * .3, randn() * .3], [randn() * .3, randn() * .3], [randn() * .3, randn() * .3]];
    let b = [0, 0, 0];
    const lr = 0.2;
    for (let it = 0; it < 500; it++) {
      const gW = [[0, 0], [0, 0], [0, 0]], gb = [0, 0, 0];
      pts.forEach(d => {
        const z = [Wt[0][0] * d.x + Wt[0][1] * d.y + b[0], Wt[1][0] * d.x + Wt[1][1] * d.y + b[1], Wt[2][0] * d.x + Wt[2][1] * d.y + b[2]];
        const p1 = softmax(z), pT = softmax(z.map(v => v / t));
        const hard = [0, 0, 0]; hard[d.hard] = 1;
        const g = [0, 0, 0];
        for (let i = 0; i < K; i++) g[i] = (1 - a) * (p1[i] - hard[i]) + a * t * (pT[i] - d.soft[i]);
        for (let i = 0; i < K; i++) { gW[i][0] += g[i] * d.x; gW[i][1] += g[i] * d.y; gb[i] += g[i]; }
      });
      const n = pts.length, s = lr / n;
      for (let i = 0; i < K; i++) { Wt[i][0] -= s * gW[i][0]; Wt[i][1] -= s * gW[i][1]; b[i] -= s * gb[i]; }
    }
    return { Wt, b };
  }
  function build() {
    const pts = [];
    for (let i = 0; i < 120; i++) {
      const x = randn() * 1.1, y = randn() * 1.0;
      const lg = teacherLogits(x, y), soft = softmax(lg.map(v => v / T));
      pts.push({ x, y, soft, hard: lg.indexOf(Math.max(...lg)) });
    }
    ptsRef.current = pts;
    stuRef.current = trainOn(pts, alpha, T);
    force(x => x + 1);
  }
  _useEffect(() => { build(); /* eslint-disable-next-line */ }, [T, alpha]);

  const pts = ptsRef.current, stu = stuRef.current;
  const studentProb = (x, y, t = 1) => { if (!stu) return [1 / 3, 1 / 3, 1 / 3]; const z = stu.Wt.map((w, i) => w[0] * x + w[1] * y + stu.b[i]); return softmax(z.map(v => v / t)); };
  // metrics: accuracy (argmax match) + distribution agreement (1 - 0.5*L1)
  let acc = 0, agree = 0;
  pts.forEach(d => { const sp = studentProb(d.x, d.y, T); if (sp.indexOf(Math.max(...sp)) === d.hard) acc++; agree += 1 - 0.5 * sp.reduce((a, v, i) => a + Math.abs(v - d.soft[i]), 0); });
  acc = pts.length ? acc / pts.length : 0; agree = pts.length ? agree / pts.length : 0;
  // probe point near the blue/violet boundary
  const probe = { x: 0.0, y: 1.0 };
  const probeT = softmax(teacherLogits(probe.x, probe.y).map(v => v / T));
  const probeS = studentProb(probe.x, probe.y, T);

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#94a3b8"; ctx.fillText("STUDENT regions + teacher-labeled points", 20, 22);

    const R = 2.4, sx = (x) => 30 + ((x + R) / (2 * R)) * 300, sy = (y) => 36 + ((R - y) / (2 * R)) * 256;
    // student decision regions (faint)
    const step = 12;
    for (let px = 30; px < 330; px += step) for (let py = 36; py < 292; py += step) {
      const x = ((px - 30) / 300) * 2 * R - R, y = R - ((py - 36) / 256) * 2 * R;
      const sp = studentProb(x, y, 1), c = sp.indexOf(Math.max(...sp));
      ctx.fillStyle = COL[c] + "22"; ctx.fillRect(px, py, step, step);
    }
    // points colored by teacher label
    pts.forEach(d => { ctx.fillStyle = COL[d.hard]; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(sx(d.x), sy(d.y), 3, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; });
    // prototypes + probe
    PROTO.forEach((p, i) => { ctx.strokeStyle = COL[i]; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx(p[0]), sy(p[1]), 8, 0, Math.PI * 2); ctx.stroke(); });
    ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx(probe.x), sy(probe.y), 6, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#e2e8f0"; ctx.font = "9px JetBrains Mono"; ctx.fillText("probe", sx(probe.x) + 9, sy(probe.y));

    // probe soft-label bars: teacher vs student
    const bx = 360, bw = 150;
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono";
    ctx.fillText("PROBE softmax @ T=" + T.toFixed(1), bx, 30);
    const barGroup = (label, dist, y0) => {
      ctx.fillStyle = "#64748b"; ctx.font = "9px JetBrains Mono"; ctx.fillText(label, bx, y0 - 4);
      dist.forEach((v, i) => {
        const y = y0 + i * 18;
        ctx.fillStyle = "rgba(148,163,184,0.15)"; ctx.fillRect(bx + 18, y, bw - 18, 12);
        ctx.fillStyle = COL[i]; ctx.fillRect(bx + 18, y, (bw - 18) * v, 12);
        ctx.fillStyle = "#94a3b8"; ctx.fillText(["A", "B", "C"][i], bx, y + 10);
        ctx.fillStyle = "#cbd5e1"; ctx.fillText((v * 100).toFixed(0) + "%", bx + 22 + (bw - 18) * v + 2, y + 10);
      });
    };
    barGroup("teacher (soft target)", probeT, 52);
    barGroup("student", probeS, 130);

    // metrics
    const my = 330;
    ctx.fillStyle = "#60a5fa"; ctx.font = "600 26px Space Grotesk, JetBrains Mono";
    ctx.fillText((acc * 100).toFixed(0) + "%", 30, my + 30);
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono"; ctx.fillText("top-class match", 30, my + 46);
    ctx.fillStyle = agree > 0.85 ? "#34d399" : "#fbbf24"; ctx.font = "600 26px Space Grotesk, JetBrains Mono";
    ctx.fillText((agree * 100).toFixed(0) + "%", 180, my + 30);
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono"; ctx.fillText("distribution match (dark knowledge)", 180, my + 46);
    ctx.fillStyle = "#64748b"; ctx.font = "10px JetBrains Mono";
    ctx.fillText("α=" + alpha.toFixed(2) + " soft / " + (1 - alpha).toFixed(2) + " hard", 30, my + 70);
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
      <Slider label="// TEMPERATURE (T)" min={1} max={6} step={0.5} value={T} onChange={setT} tone="violet"
        help="Softens the teacher's targets: at T=1 they're nearly one-hot (little extra info), and as T rises the runner-up classes lift off the floor, exposing the teacher's 'this is mostly A but a bit B' structure — the dark knowledge the student learns from." />
      <Slider label="// SOFT WEIGHT (α)" min={0} max={1} step={0.05} value={alpha} onChange={setAlpha}
        help="Mixes the loss: α=0 trains the student on hard one-hot labels only (it copies the top class), α=1 trains purely on the teacher's soft distribution. Watch the distribution-match metric climb with α even though top-class accuracy barely changes." />
      <DemoButton onClick={build} primary>RETRAIN</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="TOP-CLASS" value={(acc * 100).toFixed(0) + "%"} accent="#60a5fa" />
        <StatReadout label="DIST MATCH" value={(agree * 100).toFixed(0) + "%"} accent={agree > 0.85 ? "#34d399" : "#fbbf24"} />
      </div>
      <Legend items={[
        { color: "#60a5fa", label: "class A" },
        { color: "#a855f7", label: "class B" },
        { color: "#fbbf24", label: "class C" },
        { color: "#e2e8f0", label: "probe point" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        A hard label says "this is class A" — one bit. A trained teacher says
        "85% A, 12% B, 3% C", and that extra structure (the teacher's <i>dark
        knowledge</i>) tells the student which classes are similar and how
        confident to be. Knowledge distillation trains a small student to match the
        teacher's full softened distribution instead of just the answer. The probe
        bars show it directly: the teacher's soft target on top, the student's
        learned distribution below.
      </DemoP>
      <DemoP>
        Push SOFT WEIGHT α up and the two bar charts converge — the student inherits
        the teacher's confidence structure, and the distribution-match metric
        climbs, even though top-class accuracy was already near-perfect. TEMPERATURE
        controls how much of that structure is visible: at T=1 the targets are
        nearly one-hot and there's little to transfer; raise T and the runner-up
        probabilities lift into view for the student to learn from. (The loss scales
        by T² to keep the gradients balanced.)
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Distillation (Hinton et al., 2015) compresses a big, accurate teacher into
        a small, deployable student that punches above its size — the third pillar
        of model efficiency alongside{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/quantization/`} style={{ color: "#a855f7" }}>quantization</a>{" "}
        and <a href={`${window.__DM_BASE || "../../"}visualize/pruning/`} style={{ color: "#a855f7" }}>pruning</a>,
        and the technique behind DistilBERT, TinyLlama-style models, and most
        on-device LLMs. The soft-label / temperature mechanism is exactly the{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/calibration/`} style={{ color: "#a855f7" }}>temperature
        scaling</a> idea reused as a training signal.
      </DemoP>
      <DemoP>
        Beyond classification logits, students can be distilled to match
        intermediate features or attention maps; sequence-level distillation copies
        a teacher LM's next-token distribution; and "distillation" now also names
        training small models on a large model's <i>generated</i> data. The
        recurring insight is the one this demo isolates: a teacher's full
        probability distribution is a far richer supervisory signal than the bare
        label, so matching the distribution transfers more than matching the answer.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Knowledge Distillation"
      subtitle="Train a small student to match a teacher's soft labels, not just its answers. Turn up temperature and soft-weight to transfer the teacher's dark knowledge."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/training-systems/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<DistillationDemo />);
