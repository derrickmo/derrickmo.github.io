// demos/reward-model.jsx — learning a reward function from pairwise preferences
// with the Bradley-Terry model. This is the reward model at the heart of RLHF.
//
// Setup: each "response" is a point in a 2D feature space. A hidden TRUE reward
// r*(p) (a Gaussian bump around an ideal response) decides which of two responses
// a human prefers, with Bradley-Terry noise:
//     P(a ≻ b) = sigmoid( beta * ( r*(a) - r*(b) ) ).
// We never see r*. We only see preference labels. The reward MODEL r_theta(p) is
// a small MLP (2 -> H -> 1, manual backprop) trained to make the preferred
// response score higher, by minimizing the Bradley-Terry loss
//     L = -log sigmoid( r_theta(chosen) - r_theta(rejected) ).
//
// The heatmap is the model's learned reward field; the dots are responses colored
// by their TRUE reward (the ground truth). As training proceeds, the bright region
// of the heatmap should migrate to sit over the high-true-reward dots, and the
// model's best pick (violet ring) should converge to the true ideal (green ring).
// Flip "SHOW TRUE FIELD" to compare the model against ground truth directly.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup, Toggle,
} = window;

const W = 540, H = 480;
const HM_X = 20, HM_Y = 36, HM = 300, G = 30;     // heatmap box + grid resolution
const H_HID = 12;
const IDEAL = [0.42, 0.36];                         // ideal response (true reward peak)
const N_CAND = 22;

const px = (x) => HM_X + ((x + 1) / 2) * HM;
const py = (y) => HM_Y + ((1 - y) / 2) * HM;        // +y up
const sigmoid = (z) => 1 / (1 + Math.exp(-z));
function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

function trueReward(x, y) {
  const dx = x - IDEAL[0], dy = y - IDEAL[1];
  return Math.exp(-(dx * dx + dy * dy) / 0.6);       // 0..1 bump
}
function valColor(t, a = 0.9) {
  const lo = [30, 58, 138], hi = [168, 85, 247];     // blue -> violet
  const c = lo.map((v, i) => Math.round(v + (hi[i] - v) * Math.max(0, Math.min(1, t))));
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

function makeNet() {
  return {
    W1: Array.from({ length: H_HID }, () => [randn() * 0.7, randn() * 0.7]),
    b1: new Float64Array(H_HID),
    W2: Array.from({ length: H_HID }, () => randn() * 0.5),
    b2: 0,
  };
}
function forward(net, x, y) {
  const h = new Float64Array(H_HID);
  for (let j = 0; j < H_HID; j++) h[j] = Math.tanh(net.W1[j][0] * x + net.W1[j][1] * y + net.b1[j]);
  let o = net.b2; for (let j = 0; j < H_HID; j++) o += net.W2[j] * h[j];
  return { h, o };
}

function RewardModelDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const lastRef = _useRef(0);

  const makeState = () => {
    const cand = Array.from({ length: N_CAND }, () => {
      const x = (Math.random() * 1.7 - 0.85), y = (Math.random() * 1.7 - 0.85);
      return { x, y, r: trueReward(x, y) };
    });
    return {
      net: makeNet(), cand,
      pairs: 0, loss: 0, acc: 0, recent: [],
      lossHist: [], accHist: [],
    };
  };
  const st = _useRef(makeState());

  const [beta, setBeta] = _useState(6);
  const [lr, setLr] = _useState(0.08);
  const [batch, setBatch] = _useState(8);
  const [showTrue, setShowTrue] = _useState(false);
  const [speed, setSpeed] = _useState(40);
  const [running, setRunning] = _useState(false);
  const [, force] = _useState(0);

  function reset() { st.current = makeState(); force(x => x + 1); }

  function trainStep() {
    const s = st.current, net = s.net, cand = s.cand;
    const gW1 = Array.from({ length: H_HID }, () => [0, 0]);
    const gb1 = new Float64Array(H_HID);
    const gW2 = new Float64Array(H_HID);
    let gb2 = 0, lossSum = 0;

    const accumulate = (x, y, go) => {
      const { h } = forward(net, x, y);
      for (let j = 0; j < H_HID; j++) {
        gW2[j] += go * h[j];
        const dh = go * net.W2[j] * (1 - h[j] * h[j]);
        gW1[j][0] += dh * x; gW1[j][1] += dh * y; gb1[j] += dh;
      }
      gb2 += go;
    };

    for (let b = 0; b < batch; b++) {
      let i = (Math.random() * N_CAND) | 0, j = (Math.random() * N_CAND) | 0;
      while (j === i) j = (Math.random() * N_CAND) | 0;
      // human label via Bradley-Terry on TRUE reward
      const pIwins = sigmoid(beta * (cand[i].r - cand[j].r));
      let w = i, l = j;
      if (Math.random() >= pIwins) { w = j; l = i; }
      // model scores + BT loss
      const ow = forward(net, cand[w].x, cand[w].y).o;
      const ol = forward(net, cand[l].x, cand[l].y).o;
      const sg = sigmoid(ow - ol);
      lossSum += -Math.log(Math.max(sg, 1e-9));
      const dLdd = sg - 1;                  // dL/d(ow-ol)
      accumulate(cand[w].x, cand[w].y, dLdd);     // d(ow-ol)/dow = +1
      accumulate(cand[l].x, cand[l].y, -dLdd);    // d(ow-ol)/dol = -1
      s.recent.unshift({ w, l }); if (s.recent.length > 6) s.recent.pop();
      s.pairs += 1;
    }

    const stepSize = lr / batch;
    for (let j = 0; j < H_HID; j++) {
      net.W1[j][0] -= stepSize * gW1[j][0]; net.W1[j][1] -= stepSize * gW1[j][1];
      net.b1[j] -= stepSize * gb1[j]; net.W2[j] -= stepSize * gW2[j];
    }
    net.b2 -= stepSize * gb2;
    s.loss = s.loss === 0 ? lossSum / batch : 0.95 * s.loss + 0.05 * (lossSum / batch);

    // ranking accuracy over all candidate pairs (model agrees with true order)
    let correct = 0, tot = 0;
    const scores = cand.map(c => forward(net, c.x, c.y).o);
    for (let a = 0; a < N_CAND; a++) for (let b = a + 1; b < N_CAND; b++) {
      const dm = scores[a] - scores[b], dt = cand[a].r - cand[b].r;
      if (Math.sign(dm) === Math.sign(dt)) correct++; tot++;
    }
    s.acc = correct / tot;
    s.lossHist.push(s.loss); if (s.lossHist.length > 260) s.lossHist.shift();
    s.accHist.push(s.acc); if (s.accHist.length > 260) s.accHist.shift();
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const s = st.current, net = s.net, cand = s.cand;
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(showTrue ? "TRUE REWARD r*(p)  ·  the hidden field humans judge by"
                          : "LEARNED REWARD r(p)  ·  the model's estimate from preferences", HM_X, HM_Y - 8);

    // heatmap
    const cell = HM / G;
    let oMin = Infinity, oMax = -Infinity;
    const field = [];
    for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) {
      const x = -1 + (2 * (gx + 0.5)) / G, y = 1 - (2 * (gy + 0.5)) / G;
      const v = showTrue ? trueReward(x, y) : forward(net, x, y).o;
      field.push(v); if (v < oMin) oMin = v; if (v > oMax) oMax = v;
    }
    if (oMax - oMin < 1e-6) oMax = oMin + 1e-6;
    for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) {
      const v = field[gy * G + gx];
      ctx.fillStyle = valColor((v - oMin) / (oMax - oMin), 0.92);
      ctx.fillRect(HM_X + gx * cell, HM_Y + gy * cell, cell + 0.5, cell + 0.5);
    }
    ctx.strokeStyle = "rgba(96,165,250,0.25)"; ctx.lineWidth = 1; ctx.strokeRect(HM_X, HM_Y, HM, HM);

    // recent preference pairs (drawn in feature space)
    s.recent.forEach((pr, i) => {
      const a = cand[pr.w], b = cand[pr.l], op = 0.7 - i * 0.1;
      ctx.strokeStyle = `rgba(226,232,240,${Math.max(0.12, op)})`; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(px(b.x), py(b.y)); ctx.lineTo(px(a.x), py(a.y)); ctx.stroke();
    });

    // candidate dots colored by TRUE reward; rings for winner/loser of latest pair
    const last = s.recent[0];
    cand.forEach((c, idx) => {
      ctx.fillStyle = valColor(c.r, 0.95);
      ctx.beginPath(); ctx.arc(px(c.x), py(c.y), 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(15,23,42,0.8)"; ctx.lineWidth = 1; ctx.stroke();
      if (last && idx === last.w) { ctx.strokeStyle = "#34d399"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px(c.x), py(c.y), 8, 0, Math.PI * 2); ctx.stroke(); }
      if (last && idx === last.l) { ctx.strokeStyle = "#f87171"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px(c.x), py(c.y), 8, 0, Math.PI * 2); ctx.stroke(); }
    });

    // true ideal (green) vs model's best pick (violet ring)
    ctx.strokeStyle = "#34d399"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(px(IDEAL[0]), py(IDEAL[1]), 11, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#34d399"; ctx.fillText("ideal", px(IDEAL[0]) + 12, py(IDEAL[1]) + 3);
    const scores = cand.map(c => forward(net, c.x, c.y).o);
    const bestIdx = scores.indexOf(Math.max(...scores));
    const bp = cand[bestIdx];
    ctx.strokeStyle = "#c084fc"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(px(bp.x), py(bp.y), 9, 0, Math.PI * 2); ctx.stroke();

    // bottom: accuracy + loss curves
    const BY = 356, BH = H - BY - 14, BX = 20, BW = W - 40;
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("TRAINING  ·  ranking accuracy (blue, 0–100%) and Bradley-Terry loss (violet)", BX, BY - 8);
    ctx.strokeStyle = "rgba(96,165,250,0.18)"; ctx.strokeRect(BX, BY, BW, BH);
    const plot = (arr, color, lo, hi) => {
      if (arr.length < 2) return;
      const span = Math.max(hi - lo, 1e-6);
      ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.beginPath();
      for (let i = 0; i < arr.length; i++) {
        const x = BX + (i / Math.max(1, arr.length - 1)) * BW;
        const y = BY + BH - ((Math.min(hi, Math.max(lo, arr[i])) - lo) / span) * (BH - 8) - 4;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };
    plot(s.accHist, "#60a5fa", 0, 1);
    if (s.lossHist.length > 1) plot(s.lossHist, "#c084fc", 0, Math.max(...s.lossHist, 0.7));
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
  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// BETA (human decisiveness)" min={1} max={20} step={1} value={beta} onChange={setBeta} tone="violet"
        help="Bradley-Terry temperature on the TRUE reward. High β → humans almost always pick the genuinely better response (clean labels); low β → near-coin-flip preferences, so the model learns from noisy supervision and accuracy plateaus lower." />
      <Slider label="// LR" min={0.01} max={0.3} step={0.01} value={lr} onChange={setLr}
        help="SGD step size for the reward network. Larger learns the field faster but can overshoot and make the heatmap ripple." />
      <Slider label="// PAIRS / STEP" min={1} max={16} step={1} value={batch} onChange={setBatch}
        help="Preference comparisons per gradient step. More labels per step = a smoother, lower-variance gradient — the same data-vs-noise tradeoff as any minibatch, but here each sample is one human comparison." />
      <Toggle label="// SHOW TRUE FIELD" checked={showTrue} onChange={setShowTrue}
        help="Swap the heatmap between the model's learned reward and the hidden true reward humans judge by. Flip back and forth to see how close the model's field is to ground truth." />
      <Slider label="// SPEED (steps/sec)" min={4} max={120} step={2} value={speed} onChange={setSpeed}
        help="Gradient steps per second." />
      <DemoButton onClick={() => setRunning(r => !r)} primary>{running ? "PAUSE" : "TRAIN"}</DemoButton>
      <DemoButton onClick={reset}>RESET</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="PAIRS SEEN" value={s.pairs} />
        <StatReadout label="RANK ACC" value={(s.acc * 100).toFixed(0) + "%"} accent="#60a5fa" />
      </div>
      <StatReadout label="BT LOSS" value={s.loss.toFixed(3)} accent="#c084fc" />
      <Legend items={[
        { color: "#a855f7", label: "high reward" },
        { color: "#1e3a8a", label: "low reward" },
        { color: "#34d399", label: "true ideal / winner" },
        { color: "#c084fc", label: "model's best pick" },
        { color: "#f87171", label: "rejected" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        You can't ask a human "rate this response 7.3 / 10" and get anything
        consistent — but ask "which of these two is better?" and the answers are
        reliable. The reward model turns those pairwise choices into a number. Each
        dot is a response; its color is the <i>true</i> reward a human is implicitly
        judging by (brightest near the green "ideal"). The model never sees those
        colors — only a stream of "A beat B" labels — and has to reconstruct the
        whole reward field, shown as the heatmap.
      </DemoP>
      <DemoP>
        Training minimizes the <b>Bradley-Terry loss</b> −log σ(r(chosen) −
        r(rejected)): every comparison pushes the winner's score up and the
        loser's down. Watch the bright patch of the heatmap drift onto the
        high-true-reward dots and the violet "best pick" ring snap toward the green
        ideal. Drop β to make humans noisy and the ranking accuracy stalls below
        100% — garbage preferences in, a fuzzy reward out.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        This is step two of RLHF. Step one is pretraining; step two trains a reward
        model on human preference pairs exactly like this; step three optimizes the
        language model against that reward with{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/policy-gradient/`} style={{ color: "#a855f7" }}>policy
        gradient</a> /{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/actor-critic/`} style={{ color: "#a855f7" }}>PPO</a>.
        The reward model you're training here is the scalar signal those policy
        methods maximize — for an LLM the "responses" are token sequences and the
        2D plane is a stand-in for the model's representation space.
      </DemoP>
      <DemoP>
        Two real-world wrinkles live in this picture. <b>Reward hacking
        (Goodhart):</b> the policy optimizes r_theta, not r*, so it races toward any
        spot where the learned field is wrongly bright — which is why RLHF needs a
        KL penalty keeping the policy near the base model. And <b>DPO</b> skips the
        explicit reward model entirely: it shows the same Bradley-Terry objective
        can be rearranged to update the policy directly from preference pairs, no
        separate reward network or RL loop required.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="REINFORCEMENT LEARNING" title="Reward Model (RLHF)"
      subtitle="Learn a scalar reward from pairwise human preferences with Bradley-Terry — the signal PPO maximizes in RLHF. Watch the learned field reconstruct the hidden one."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/fine-tuning/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<RewardModelDemo />);
