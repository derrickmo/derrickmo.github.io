// demos/label-propagation.jsx — semi-supervised label propagation on a graph.
//
// Semi-supervised learning uses a FEW labels plus the geometry of MANY unlabeled
// points. Build a similarity graph (here RBF weights w_ij = exp(-||xi-xj||²/2σ²)),
// row-normalize to a transition matrix P = D⁻¹W, seed the labeled nodes with a
// one-hot, and iterate F ← P F while re-clamping the seeds. Label mass flows along
// dense regions of the graph, so on a two-moons shape a single labeled point per
// class can color an entire crescent — the cluster/manifold assumption doing the
// work a supervised classifier would need hundreds of labels for. We animate the
// spread, score accuracy on the unlabeled points, and let you break it by shrinking
// σ (graph disconnects) or growing it (mass bleeds across classes).

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 470, H = 470, SC = 200;
const cx = W / 2, cy = H / 2 + 10;
const PX = (x) => cx + x * SC, PY = (y) => cy - y * SC;

function LabelPropDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const [seeds, setSeeds] = _useState(1);
  const [sigma, setSigma] = _useState(0.16);
  const [dataset, setDataset] = _useState("moons");
  const [seed, setSeed] = _useState(1);
  const [, setTick] = _useState(0);
  const sim = _useRef(null);
  const stepRef = _useRef(0);

  function rng(s0) { let s = s0 >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function randn(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  function genData(r) {
    const pts = [], lab = [], N = 120;
    for (let i = 0; i < N; i++) {
      const c = i % 2;
      if (dataset === "moons") {
        const tt = r() * Math.PI;
        if (c === 0) { pts.push([Math.cos(tt) * 0.8 - 0.35 + randn(r) * 0.05, Math.sin(tt) * 0.8 - 0.18 + randn(r) * 0.05]); }
        else { pts.push([Math.cos(tt) * 0.8 + 0.35 + randn(r) * 0.05, -Math.sin(tt) * 0.8 + 0.18 + randn(r) * 0.05]); }
      } else if (dataset === "circles") {
        const a = r() * 2 * Math.PI, rad = c === 0 ? 0.35 : 0.78;
        pts.push([Math.cos(a) * rad + randn(r) * 0.04, Math.sin(a) * rad + randn(r) * 0.04]);
      } else {
        const mx = c === 0 ? -0.5 : 0.5, my = c === 0 ? -0.35 : 0.35;
        pts.push([mx + randn(r) * 0.22, my + randn(r) * 0.22]);
      }
      lab.push(c);
    }
    return { pts, lab, N };
  }

  function reset() {
    const r = rng(seed * 40499 + 13);
    const { pts, lab, N } = genData(r);
    // choose labeled seeds: first `seeds` of each class (by index order, shuffled)
    const order = Array.from({ length: N }, (_, i) => i);
    for (let i = N - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [order[i], order[j]] = [order[j], order[i]]; }
    const isSeed = new Array(N).fill(false); const cnt = [0, 0];
    for (const idx of order) { if (cnt[lab[idx]] < seeds) { isSeed[idx] = true; cnt[lab[idx]]++; } }
    // transition matrix P = D^-1 W (RBF)
    const Wm = Array.from({ length: N }, () => new Float64Array(N));
    const inv2s2 = 1 / (2 * sigma * sigma);
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      if (i === j) continue;
      const dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1];
      Wm[i][j] = Math.exp(-(dx * dx + dy * dy) * inv2s2);
    }
    const P = Array.from({ length: N }, (_, i) => { let s = 0; for (let j = 0; j < N; j++) s += Wm[i][j]; s = s || 1; const row = new Float64Array(N); for (let j = 0; j < N; j++) row[j] = Wm[i][j] / s; return row; });
    const F = Array.from({ length: N }, (_, i) => isSeed[i] ? [lab[i] === 0 ? 1 : 0, lab[i] === 1 ? 1 : 0] : [0, 0]);
    sim.current = { pts, lab, N, isSeed, P, F, conv: false, acc: 0 };
    stepRef.current = 0;
    setTick(t => t + 1);
  }
  _useEffect(() => { reset(); /* eslint-disable-next-line */ }, [seeds, sigma, dataset, seed]);

  function propagate() {
    const st = sim.current; if (!st || st.conv) return;
    const { N, P, F, isSeed, lab } = st;
    const G = Array.from({ length: N }, () => [0, 0]);
    let delta = 0;
    for (let i = 0; i < N; i++) {
      if (isSeed[i]) { G[i][0] = lab[i] === 0 ? 1 : 0; G[i][1] = lab[i] === 1 ? 1 : 0; continue; }
      let a = 0, b = 0; const Pi = P[i];
      for (let j = 0; j < N; j++) { a += Pi[j] * F[j][0]; b += Pi[j] * F[j][1]; }
      G[i][0] = a; G[i][1] = b;
      delta += Math.abs(a - F[i][0]) + Math.abs(b - F[i][1]);
    }
    for (let i = 0; i < N; i++) { F[i][0] = G[i][0]; F[i][1] = G[i][1]; }
    stepRef.current++;
    if (delta < 1e-3 || stepRef.current > 200) st.conv = true;
    // accuracy on unlabeled
    let ok = 0, tot = 0;
    for (let i = 0; i < N; i++) { if (isSeed[i]) continue; tot++; const pred = F[i][1] > F[i][0] ? 1 : 0; if ((F[i][0] || F[i][1]) && pred === lab[i]) ok++; }
    st.acc = tot ? ok / tot : 0;
  }

  _useEffect(() => {
    let last = performance.now();
    const tick = (now) => {
      if (now - last > 55) { last = now; propagate(); setTick(t => t + 1); }
      draw();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    /* eslint-disable-next-line */
  }, []);

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const st = sim.current; if (!st) return;
    const { pts, N, F, isSeed, P } = st;

    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono";
    ctx.fillText("LABEL PROPAGATION  ·  a few seeds color the rest through the graph", 14, 18);

    // nearest-neighbor edges (faint) to suggest the graph
    ctx.strokeStyle = "rgba(148,163,184,0.10)"; ctx.lineWidth = 1;
    for (let i = 0; i < N; i++) {
      let best = -1, bv = -1; const Pi = P[i];
      for (let j = 0; j < N; j++) if (j !== i && Pi[j] > bv) { bv = Pi[j]; best = j; }
      if (best >= 0) { ctx.beginPath(); ctx.moveTo(PX(pts[i][0]), PY(pts[i][1])); ctx.lineTo(PX(pts[best][0]), PY(pts[best][1])); ctx.stroke(); }
    }
    // nodes colored by class probability
    for (let i = 0; i < N; i++) {
      const a = F[i][0], b = F[i][1], tot = a + b;
      const x = PX(pts[i][0]), y = PY(pts[i][1]);
      let col;
      if (tot < 1e-6) col = "rgba(100,116,139,0.55)"; // unlabeled & untouched = gray
      else { const tcol = b / tot; const R = Math.round(96 + tcol * (248 - 96)), Gc = Math.round(165 + tcol * (113 - 165)), B = Math.round(250 + tcol * (113 - 250)); const conf = Math.min(1, Math.abs(a - b) / tot); col = `rgba(${R},${Gc},${B},${0.4 + 0.55 * conf})`; }
      ctx.beginPath(); ctx.arc(x, y, isSeed[i] ? 6 : 3.6, 0, 7); ctx.fillStyle = col; ctx.fill();
      if (isSeed[i]) { ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.stroke(); }
    }
    ctx.fillStyle = st.conv ? "#34d399" : "#a855f7"; ctx.font = "600 12px Space Grotesk, JetBrains Mono";
    ctx.fillText(st.conv ? "converged" : "spreading… step " + stepRef.current, 14, H - 12);
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
      <Slider label="// SEEDS PER CLASS" min={1} max={6} step={1} value={seeds} onChange={setSeeds} tone="violet"
        help="How many labeled points each class gets (ringed white). The whole point of semi-supervised learning: even ONE per class can be enough when the graph follows the data's shape. Resets propagation." />
      <Slider label="// GRAPH WIDTH  sigma" min={0.05} max={0.5} step={0.01} value={sigma} onChange={setSigma}
        help="RBF kernel width = how far a node 'sees' neighbors. Too small disconnects the graph (labels can't spread, points stay gray); too large links the two classes so labels bleed across the gap and accuracy falls. Tune it to the manifold." />
      <SegmentedControl label="// DATA" value={dataset} onChange={setDataset}
        options={[{ value: "moons", label: "Moons" }, { value: "circles", label: "Circles" }, { value: "blobs", label: "Blobs" }]}
        help="Shape of the two classes. Moons and concentric circles are non-convex — propagation follows the curve where a linear model can't; blobs are the easy convex case." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setSeed(s => s + 1)} primary>RESAMPLE</DemoButton>
        <DemoButton onClick={() => { stepRef.current = 0; if (sim.current) { const st2 = sim.current; for (let i = 0; i < st2.N; i++) if (!st2.isSeed[i]) { st2.F[i][0] = 0; st2.F[i][1] = 0; } st2.conv = false; } }}>REPLAY</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="UNLABELED ACCURACY" value={st ? Math.round(st.acc * 100) + "%" : "—"} accent={st && st.acc > 0.85 ? "#34d399" : "#fbbf24"} />
        <StatReadout label="LABELS USED" value={st ? seeds * 2 : 0} accent="#a855f7" />
      </div>
      <Legend items={[
        { color: "#60a5fa", label: "class 0" },
        { color: "#f87171", label: "class 1" },
        { color: "#64748b", label: "unlabeled" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Only the ringed points start with a label; everything else begins gray. Each
        step, every unlabeled node pulls in a weighted average of its neighbors' label
        scores (weights = graph similarity), and the seeds are re-pinned to their true
        labels so they keep injecting signal. Label mass flows outward along the dense
        parts of the graph, so color creeps along each crescent and fills it — watch
        the gray vanish. With just one or two labels per class, UNLABELED ACCURACY
        climbs near 100% on the moons, because the GRAPH carried the labels where a
        straight-line classifier never could.
      </DemoP>
      <DemoP>
        This only works if the graph matches the data's geometry, and GRAPH WIDTH σ is
        that dial. Shrink it and nodes stop seeing neighbors — islands stay gray and
        accuracy stalls. Grow it and the two moons start linking across the empty gap,
        so a class's labels leak into the other and accuracy drops. It rests on the
        cluster/manifold assumption: points connected through high-density regions
        share a label. Break that — switch to overlapping Blobs, or place a seed in the
        wrong spot — and propagation confidently spreads the wrong answer.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Label propagation (and its sibling label spreading) is the classic graph-based
        semi-supervised learner: exploit a few labels plus lots of unlabeled data,
        which is the common real-world setting where labeling is expensive but raw data
        is cheap. It's used for fraud and community detection, image and document
        tagging, and pseudo-labeling pipelines. Mechanically it's the same random-walk
        / graph-Laplacian machinery as{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/spectral-clustering/`} style={{ color: "#a855f7" }}>spectral clustering</a>{" "}
        and PageRank, and the similarity graph is built from{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/knn/`} style={{ color: "#a855f7" }}>nearest-neighbor</a>{" "}
        or RBF affinities. The modern deep-learning analog is consistency-regularized
        and pseudo-label methods.
      </DemoP>
      <DemoP>
        Caveats: it's transductive — it labels THIS unlabeled set, not a model you can
        apply to new points without rebuilding the graph. It's exquisitely sensitive to
        graph construction (σ, k, the metric); a bad graph spreads confident errors,
        and unlabeled data can HURT when the cluster assumption is violated. It assumes
        the labeled classes cover what's there and roughly match the cluster
        proportions; novel or imbalanced classes mislead it. And exact solutions need a
        sparse graph and an iterative or linear-system solve that scales with the number
        of points.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="CLASSICAL ML" title="Label Propagation"
      subtitle="Semi-supervised learning: give one or two labels per class and watch them spread through a similarity graph to color hundreds of unlabeled points along the data's shape. Tune the graph width to see why the geometry — not the labels — does the work."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/unsupervised-learning/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<LabelPropDemo />);
