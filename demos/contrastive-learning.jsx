// demos/contrastive-learning.jsx — SimCLR / NT-Xent (InfoNCE) on a circle.
//
// Self-supervised contrastive learning makes two augmented "views" of the same
// item land close in embedding space (a positive pair) while pushing every other
// item away (negatives). We optimize the NT-Xent loss directly on embeddings
// living on the unit circle (so cosine similarity = cos of the angle gap):
//   ℓ_i = −log( exp(sim(i,i⁺)/τ) / Σ_{k≠i} exp(sim(i,k)/τ) )
// Minimizing it produces exactly the two properties Wang & Isola identified:
//   alignment  — positive pairs collapse onto each other,
//   uniformity — items spread out to fill the space evenly.
// Temperature τ controls how hard negatives are pushed.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 480, H = 480;

function ContrastiveLearningDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const [nItems, setNItems] = _useState(8);
  const [tau, setTau] = _useState(0.2);
  const [lr, setLr] = _useState(0.3);
  const [speed, setSpeed] = _useState(6);
  const [running, setRunning] = _useState(true);
  const [seed, setSeed] = _useState(1);
  const [, setTick] = _useState(0);
  const sim = _useRef(null);

  function rng(s0) { let s = s0 >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  function reset() {
    const r = rng(seed * 99991 + nItems);
    const M = 2 * nItems;
    const th = Array.from({ length: M }, () => 2 * Math.PI * r());
    sim.current = { th, M, step: 0, loss: 0, align: 0, unif: 0 };
    setTick(t => t + 1);
  }
  _useEffect(() => { reset(); /* eslint-disable-next-line */ }, [nItems, seed]);

  const pos = (i) => i ^ 1; // sibling view of the same item
  const cossim = (th, i, k) => Math.cos(th[i] - th[k]);

  function totalLoss(th) {
    const M = th.length; let L = 0;
    for (let i = 0; i < M; i++) {
      // log-sum-exp over all k != i
      let mx = -Infinity;
      for (let k = 0; k < M; k++) if (k !== i) { const v = cossim(th, i, k) / tau; if (v > mx) mx = v; }
      let s = 0; for (let k = 0; k < M; k++) if (k !== i) s += Math.exp(cossim(th, i, k) / tau - mx);
      const logden = mx + Math.log(s);
      L += -(cossim(th, i, pos(i)) / tau - logden);
    }
    return L / M;
  }

  function stepOnce() {
    const st = sim.current; if (!st) return;
    const th = st.th, M = st.M, eps = 1e-3;
    const base = totalLoss(th);
    const grad = new Array(M).fill(0);
    for (let m = 0; m < M; m++) {
      const o = th[m];
      th[m] = o + eps; const lp = totalLoss(th);
      th[m] = o; grad[m] = (lp - base) / eps;
    }
    for (let m = 0; m < M; m++) th[m] -= lr * grad[m];
    // metrics
    let align = 0; for (let it = 0; it < M / 2; it++) align += cossim(th, 2 * it, 2 * it + 1); align /= (M / 2);
    // uniformity: avg pairwise gaussian potential on one view per item (higher spread → lower potential)
    let pot = 0, cnt = 0; for (let a = 0; a < M; a += 2) for (let b = a + 2; b < M; b += 2) { pot += Math.exp(2 * (cossim(th, a, b) - 1)); cnt++; }
    st.loss = base; st.align = align; st.unif = cnt ? -Math.log(pot / cnt) : 0; st.step++;
  }

  _useEffect(() => {
    let last = performance.now();
    const tick = (now) => {
      if (running && now - last > 200 / speed) { last = now; stepOnce(); setTick(t => t + 1); }
      draw();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    /* eslint-disable-next-line */
  }, [running, speed, tau, lr]);

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";
    const st = sim.current; if (!st) return;
    const cx = W / 2, cy = H / 2 - 6, R = 170;

    // circle
    ctx.strokeStyle = "rgba(148,163,184,0.3)"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.stroke();
    ctx.fillStyle = "#94a3b8"; ctx.fillText("EMBEDDINGS ON THE UNIT CIRCLE  ·  lines link positive pairs", 18, 20);

    const P = (th) => [cx + R * Math.cos(th), cy - R * Math.sin(th)];
    const hue = (it) => `hsl(${Math.round((it / (st.M / 2)) * 330)}, 70%, 62%)`;

    // positive-pair links
    for (let it = 0; it < st.M / 2; it++) {
      const a = P(st.th[2 * it]), b = P(st.th[2 * it + 1]);
      ctx.strokeStyle = "rgba(226,232,240,0.25)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    // view dots
    for (let i = 0; i < st.M; i++) {
      const it = i >> 1, p = P(st.th[i]);
      ctx.fillStyle = hue(it);
      ctx.beginPath(); ctx.arc(p[0], p[1], 6, 0, 7); ctx.fill();
      ctx.strokeStyle = "rgba(15,23,42,0.6)"; ctx.lineWidth = 1.2; ctx.stroke();
    }

    ctx.fillStyle = "#a855f7"; ctx.font = "600 16px Space Grotesk, JetBrains Mono";
    ctx.fillText("NT-Xent loss " + st.loss.toFixed(3), 18, H - 16);
    ctx.fillStyle = "#34d399"; ctx.font = "11px JetBrains Mono";
    ctx.fillText("step " + st.step, W - 90, H - 16);
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
      <Slider label="// TEMPERATURE τ" min={0.05} max={1} step={0.05} value={tau} onChange={setTau} tone="violet"
        help="Scales similarities before the softmax. Low τ punishes the hardest negatives hardest (sharper, more uniform spread but touchier); high τ treats all negatives more equally. A key SimCLR hyperparameter." />
      <Slider label="// ITEMS" min={4} max={14} step={1} value={nItems} onChange={setNItems}
        help="Number of distinct items; each contributes two augmented views (a positive pair). More items = more negatives per anchor, which is exactly why large batches help contrastive learning." />
      <Slider label="// LEARNING RATE" min={0.05} max={0.8} step={0.05} value={lr} onChange={setLr}
        help="Step size for the gradient descent on embeddings. Purely controls convergence speed of the demo." />
      <Slider label="// SPEED" min={1} max={20} step={1} value={speed} onChange={setSpeed}
        help="Animation speed. Visual only." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setRunning(r => !r)} primary>{running ? "PAUSE" : "RESUME"}</DemoButton>
        <DemoButton onClick={() => setSeed(s => s + 1)}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="NT-XENT LOSS" value={st ? st.loss.toFixed(3) : "—"} accent="#a855f7" />
        <StatReadout label="ALIGNMENT" value={st ? st.align.toFixed(3) : "—"} accent={st && st.align > 0.9 ? "#34d399" : "#fbbf24"} />
      </div>
      <StatReadout label="UNIFORMITY" value={st ? st.unif.toFixed(3) : "—"} accent="#60a5fa" />
      <Legend items={[
        { color: "#a855f7", label: "each color = one item (2 views)" },
        { color: "#e2e8f0", label: "positive-pair link" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Each color is one item with two augmented views; a faint line links the
        positive pair. The NT-Xent loss does two things at once for every view: pull
        its partner close (numerator) and push all the other views away (denominator).
        Run it and watch the two effects emerge — partners slide together until each
        link shrinks to a dot (ALIGNMENT → 1), while different items fan out to share
        the circle as evenly as possible (UNIFORMITY climbs). No labels were used;
        the only supervision is "these two are the same thing."
      </DemoP>
      <DemoP>
        Drop ITEMS to the minimum and the spread is easy; crank it up and every
        anchor faces many more negatives, which is why real contrastive methods crave
        large batches (or memory banks/queues). Lower the TEMPERATURE τ and the loss
        focuses on the nearest negatives, producing a crisper, more uniform layout but
        a touchier optimization; raise it and the pressure softens. These are the same
        knobs that matter in SimCLR and MoCo.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Contrastive learning (SimCLR, MoCo, CLIP) is how much of modern
        self-supervised and multimodal representation learning works: learn an
        embedding where augmentations of the same thing agree and everything else is
        separated, then fine-tune a tiny head for downstream tasks. The
        alignment-plus-uniformity view (Wang & Isola 2020) shown here explains <i>why</i>
        the InfoNCE loss produces useful{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/embeddings/`} style={{ color: "#a855f7" }}>embeddings</a>.
        CLIP applies the exact same loss across image-text pairs, powering{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/vector-search/`} style={{ color: "#a855f7" }}>vector search</a> and retrieval.
      </DemoP>
      <DemoP>
        Caveats: the quality of the learned space lives or dies by the augmentations
        (the definition of "positive") — bad augmentations teach shortcuts. Without
        enough negatives the embedding can collapse (everything maps to one point),
        which motivated non-contrastive methods like BYOL/SimSiam (stop-gradient,
        predictors) and dimension-decorrelation methods (Barlow Twins, VICReg). And
        the circle here is a 1-D toy; real embeddings live on high-dimensional spheres
        where uniformity is far easier to satisfy.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Contrastive Learning"
      subtitle="Optimize the SimCLR / NT-Xent loss live: two views of each item pull together (alignment) while every other item is pushed away (uniformity) — all without labels. Tune temperature and batch size to feel the tradeoffs."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/training-systems/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ContrastiveLearningDemo />);
