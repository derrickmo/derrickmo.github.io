// demos/coreset.jsx — coresets for k-means: a tiny weighted subset that
// reproduces the full-data clustering.
//
// A coreset is a small, weighted set of points S such that the clustering cost
// of ANY candidate centroids on S approximates the cost on the full data. Train
// on S (cheap) and you get nearly the same answer as training on everything.
// Two ways to pick S of size m:
//   uniform     : sample uniformly, weight w_i = N/m.
//   importance  : "lightweight coreset" (Bachem et al.) — sample with prob
//                 q_i = 1/2N + 1/2 · d(x_i,μ)² / Σ d(·,μ)², weight w_i = 1/(m·q_i).
// Importance sampling spends its budget on the informative outskirts (high
// squared distance from the mean), so the weighted k-means it produces tracks
// the full solution far better than uniform at the same tiny size.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480;
const PAL = ["#60a5fa", "#a855f7", "#34d399", "#fbbf24", "#f87171", "#22d3ee"];

function CoresetDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const [k, setK] = _useState(4);
  const [m, setM] = _useState(24);
  const [method, setMethod] = _useState("importance");
  const [seed, setSeed] = _useState(1);
  const [, setTick] = _useState(0);
  const stateRef = _useRef(null);

  function rng(s0) { let s = s0 >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function randnFrom(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function d2(a, b) { const dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; }

  // weighted Lloyd's k-means, kmeans++-ish seeding
  function kmeans(pts, ws, kk, iters, r) {
    const cs = [];
    cs.push({ ...pts[Math.floor(r() * pts.length)] });
    while (cs.length < kk) {
      const dd = pts.map(p => Math.min(...cs.map(c => d2(p, c))) * ws[pts.indexOf(p)]);
      let tot = dd.reduce((a, b) => a + b, 0) || 1, t = r() * tot, idx = 0;
      for (let i = 0; i < pts.length; i++) { t -= dd[i]; if (t <= 0) { idx = i; break; } }
      cs.push({ ...pts[idx] });
    }
    for (let it = 0; it < iters; it++) {
      const sx = new Array(kk).fill(0), sy = new Array(kk).fill(0), sw = new Array(kk).fill(0);
      pts.forEach((p, i) => {
        let best = 0, bd = Infinity;
        for (let c = 0; c < kk; c++) { const dist = d2(p, cs[c]); if (dist < bd) { bd = dist; best = c; } }
        sx[best] += p.x * ws[i]; sy[best] += p.y * ws[i]; sw[best] += ws[i];
      });
      for (let c = 0; c < kk; c++) if (sw[c] > 0) { cs[c] = { x: sx[c] / sw[c], y: sy[c] / sw[c] }; }
    }
    return cs;
  }
  // unweighted cost of candidate centroids on the full set
  function cost(pts, cs) { let s = 0; for (const p of pts) s += Math.min(...cs.map(c => d2(p, c))); return s; }

  function build() {
    const r = rng(seed * 9301 + 49297);
    const N = 600;
    const centers = Array.from({ length: k }, () => ({ x: 0.12 + 0.76 * r(), y: 0.12 + 0.76 * r() }));
    const pts = Array.from({ length: N }, () => {
      const c = centers[Math.floor(r() * centers.length)];
      return { x: c.x + 0.06 * randnFrom(r), y: c.y + 0.06 * randnFrom(r) };
    });
    // full-data reference clustering + cost
    const fullCs = kmeans(pts, pts.map(() => 1), k, 18, rng(777));
    const fullCost = cost(pts, fullCs);

    // sampling probabilities
    const mean = pts.reduce((a, p) => ({ x: a.x + p.x / N, y: a.y + p.y / N }), { x: 0, y: 0 });
    const dist = pts.map(p => d2(p, mean));
    const sumD = dist.reduce((a, b) => a + b, 0) || 1;
    const q = pts.map((p, i) => method === "importance" ? (1 / (2 * N) + 0.5 * dist[i] / sumD) : 1 / N);

    // sample m indices with replacement-free-ish (roulette, dedup)
    const chosen = []; const picked = new Set();
    let guard = 0;
    while (chosen.length < m && guard < m * 40) {
      guard++;
      let t = r() * q.reduce((a, b) => a + b, 0), idx = 0;
      for (let i = 0; i < N; i++) { t -= q[i]; if (t <= 0) { idx = i; break; } }
      if (!picked.has(idx)) { picked.add(idx); chosen.push(idx); }
    }
    const cpts = chosen.map(i => pts[i]);
    const cws = chosen.map(i => 1 / (m * q[i]));
    // normalize weights to sum N (keeps scale comparable)
    const wsum = cws.reduce((a, b) => a + b, 0) || 1;
    const cwsN = cws.map(w => w * N / wsum);

    const coreCs = kmeans(cpts, cwsN, k, 18, rng(777));
    const coreCost = cost(pts, coreCs);
    const ratio = coreCost / (fullCost || 1);

    stateRef.current = { pts, fullCs, coreCs, cpts, cws: cwsN, ratio, used: (m / N * 100), N };
  }
  _useEffect(() => { build(); setTick(t => t + 1); /* eslint-disable-next-line */ }, [k, m, method, seed]);

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";
    const st = stateRef.current; if (!st) return;
    const pad = 30, plot = H - 70;
    const PX = (x) => pad + x * (W - 2 * pad);
    const PY = (y) => pad + y * (plot - pad);

    ctx.fillStyle = "#94a3b8";
    ctx.fillText("full data (faint)  ·  coreset points sized by weight  ·  centroids compared", pad, 20);

    // all points, colored by nearest full centroid
    st.pts.forEach(p => {
      let best = 0, bd = Infinity;
      st.fullCs.forEach((c, ci) => { const dd = (p.x - c.x) ** 2 + (p.y - c.y) ** 2; if (dd < bd) { bd = dd; best = ci; } });
      ctx.fillStyle = hexA(PAL[best % PAL.length], 0.14);
      ctx.beginPath(); ctx.arc(PX(p.x), PY(p.y), 2, 0, 7); ctx.fill();
    });

    // coreset points sized by weight
    const maxW = Math.max(...st.cws, 1e-6);
    st.cpts.forEach((p, i) => {
      const rr = 2.5 + 5 * (st.cws[i] / maxW);
      ctx.fillStyle = hexA("#e2e8f0", 0.85);
      ctx.beginPath(); ctx.arc(PX(p.x), PY(p.y), rr, 0, 7); ctx.fill();
      ctx.strokeStyle = "rgba(15,23,42,0.7)"; ctx.lineWidth = 1; ctx.stroke();
    });

    // centroids: full (green ring) vs coreset (purple X)
    st.fullCs.forEach(c => {
      ctx.strokeStyle = "#34d399"; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(PX(c.x), PY(c.y), 8, 0, 7); ctx.stroke();
    });
    st.coreCs.forEach(c => {
      ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 2.6;
      const x = PX(c.x), y = PY(c.y);
      ctx.beginPath(); ctx.moveTo(x - 6, y - 6); ctx.lineTo(x + 6, y + 6); ctx.moveTo(x + 6, y - 6); ctx.lineTo(x - 6, y + 6); ctx.stroke();
    });

    // banner
    ctx.font = "11px JetBrains Mono";
    ctx.fillStyle = "#a855f7"; ctx.fillText("coreset cost / full cost = " + st.ratio.toFixed(3) + "×", pad, H - 30);
    ctx.fillStyle = "#94a3b8"; ctx.fillText("using " + st.cpts.length + " of " + st.N + " points (" + st.used.toFixed(1) + "%)", pad, H - 14);
    ctx.fillStyle = st.ratio < 1.05 ? "#34d399" : "#fbbf24";
    ctx.fillText(st.ratio < 1.05 ? "≈ matches full clustering" : "drifting from full clustering", pad + 300, H - 30);
  }
  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16); const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return `rgba(${r},${g},${b},${a})`;
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  });

  const st = stateRef.current;
  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <SegmentedControl label="// SAMPLING" value={method} onChange={setMethod}
        options={[{ value: "uniform", label: "Uniform" }, { value: "importance", label: "Importance" }]}
        help="Uniform picks points at random with equal weight N/m. Importance (lightweight coreset) samples proportional to squared distance from the data mean and reweights by 1/(m·q) — it spends the budget on informative points and tracks the full clustering much better." />
      <Slider label="// CORESET SIZE (m)" min={6} max={120} step={2} value={m} onChange={setM}
        help="How many points the coreset keeps (out of 600). Shrink it and watch the cost ratio: importance sampling degrades gracefully where uniform falls apart." />
      <Slider label="// CLUSTERS (k)" min={2} max={6} step={1} value={k} onChange={setK}
        help="Number of k-means clusters in the data and the model. More clusters need a slightly larger coreset to pin every centroid." />
      <DemoButton onClick={() => setSeed(s => s + 1)} primary>NEW DATA</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="COST RATIO" value={st ? st.ratio.toFixed(3) + "×" : "—"} accent={st && st.ratio < 1.05 ? "#34d399" : "#fbbf24"} />
        <StatReadout label="POINTS USED" value={st ? st.used.toFixed(1) + "%" : "—"} accent="#a855f7" />
      </div>
      <Legend items={[
        { color: "#34d399", label: "full-data centroid" },
        { color: "#a855f7", label: "coreset centroid" },
        { color: "#e2e8f0", label: "coreset point (size ∝ weight)" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Every faint dot is one of 600 data points; the green rings are the k-means
        centroids fit on all of them. A coreset throws almost all the data away and
        keeps a tiny weighted subset (the bright dots, sized by weight). Fit weighted
        k-means on just those, and you get the purple ✕ centroids. When they sit on
        top of the green rings, the coreset has preserved the answer — the cost
        ratio near 1.0× says the clustering cost on the full data is essentially
        unchanged.
      </DemoP>
      <DemoP>
        Now shrink CORESET SIZE and flip SAMPLING. Uniform sampling wastes its budget
        on dense cluster centers and misses the sparse, informative edges, so its
        centroids wander and the ratio climbs. Importance sampling weights each point
        by its squared distance from the mean — the "hard" points get picked more
        often and then down-weighted by 1/(m·q) to stay unbiased — so it keeps the
        clustering tight with a fraction of the points.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Coresets are a pillar of data-centric and scalable ML: provably small
        summaries that let you run clustering, regression, or SVM training on
        millions of points by working on a weighted thousand. The same importance /
        sensitivity-sampling idea underlies modern <i>data selection</i> and dataset
        pruning for training large models, and it's a cousin of{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/active-learning/`} style={{ color: "#a855f7" }}>active learning</a> —
        both ask "which few examples actually matter?" It also connects to{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/kmeans/`} style={{ color: "#a855f7" }}>k-means</a>,
        the model being summarized here.
      </DemoP>
      <DemoP>
        Caveats: coreset guarantees are problem-specific — a coreset for k-means
        isn't automatically one for a different objective, and the weights are
        essential (drop them and the estimate is biased). Sampling with replacement
        can pick duplicates; real constructions add structure (D²-sampling, sensitivity
        bounds) for worst-case (1±ε) guarantees. And like all subsampling, a coreset
        can't recover signal carried by the points it never saw — it preserves the
        objective you targeted, not arbitrary downstream questions.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="Coresets"
      subtitle="Keep a tiny weighted subset of the data that reproduces the full k-means clustering. Compare uniform vs importance sampling and watch the cost ratio as you shrink the subset."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/ml-theory/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<CoresetDemo />);
