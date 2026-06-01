// demos/isomap.jsx — Isomap nonlinear manifold learning vs linear PCA.
//
// Data can live ON a curved manifold inside a higher-dim space: a spiral is really
// 1-D (position along the arm), but straight-line distance is blind to that — two
// points on different arms can be Euclidean-close yet far ALONG the curve. Isomap
// fixes this by measuring GEODESIC distance: build a k-NN graph, take shortest
// paths through it (Floyd-Warshall), then run classical MDS (double-center the
// squared-distance matrix, take the top eigenvector) to lay the points on a line
// that respects the manifold. We compare its 1-D embedding to PCA's (a straight
// projection) — Isomap recovers the rainbow ordering, PCA scrambles it. The k knob
// shows both failure modes: too small disconnects the graph, too large
// "short-circuits" across folds and Isomap degrades to PCA.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 560, H = 470, N = 88;

function hsl(t) { // t in [0,1] -> blue..red rainbow
  const h = (1 - t) * 235, s = 0.7, l = 0.55;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; } else { r = x; b = c; }
  return `rgb(${Math.round((r + m) * 255)},${Math.round((g + m) * 255)},${Math.round((b + m) * 255)})`;
}

function IsomapDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const [k, setK] = _useState(6);
  const [shape, setShape] = _useState("spiral");
  const [noise, setNoise] = _useState(0.02);
  const [seed, setSeed] = _useState(1);
  const [, setTick] = _useState(0);
  const sim = _useRef(null);
  const markRef = _useRef(0);

  function rng(s0) { let s = s0 >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function randn(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function corr(a, b) { const n = a.length; let ma = 0, mb = 0; for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; } ma /= n; mb /= n; let p = 0, da = 0, db = 0; for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; p += x * y; da += x * x; db += y * y; } return p / (Math.sqrt(da * db) || 1); }

  function reset() {
    const r = rng(seed * 6151 + 19);
    const pts = [], ts = [];
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      let x, y;
      if (shape === "spiral") { const rad = 0.16 + 0.64 * t, a = t * 3.1 * Math.PI; x = rad * Math.cos(a); y = rad * Math.sin(a); }
      else if (shape === "roll") { const rad = 0.1 + 0.7 * t, a = t * 5 * Math.PI; x = rad * Math.cos(a); y = rad * Math.sin(a); }
      else { const a = (0.1 + 0.8 * t) * 1.9 * Math.PI; x = 0.7 * Math.cos(a); y = 0.7 * Math.sin(a); } // arc / horseshoe
      pts.push([x + randn(r) * noise, y + randn(r) * noise]); ts.push(t);
    }
    // k-NN graph (symmetric), Euclidean weights
    const D = Array.from({ length: N }, () => new Float64Array(N).fill(Infinity));
    const nxt = Array.from({ length: N }, () => new Int16Array(N).fill(-1));
    for (let i = 0; i < N; i++) D[i][i] = 0;
    const eucl = (i, j) => Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]);
    for (let i = 0; i < N; i++) {
      const order = Array.from({ length: N }, (_, j) => j).filter(j => j !== i).sort((a, b) => eucl(i, a) - eucl(i, b)).slice(0, k);
      for (const j of order) { const w = eucl(i, j); if (w < D[i][j]) { D[i][j] = w; D[j][i] = w; nxt[i][j] = j; nxt[j][i] = i; } }
    }
    // Floyd-Warshall all-pairs shortest path (geodesic)
    for (let m = 0; m < N; m++) for (let i = 0; i < N; i++) { const dim = D[i][m]; if (dim === Infinity) continue; const Di = D[i], Dm = D[m]; for (let j = 0; j < N; j++) { const nd = dim + Dm[j]; if (nd < Di[j]) { Di[j] = nd; nxt[i][j] = nxt[i][m]; } } }
    // disconnected? replace Inf with a big value so MDS still runs
    let maxFin = 0, disc = 0; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { if (D[i][j] === Infinity) disc++; else if (D[i][j] > maxFin) maxFin = D[i][j]; }
    const big = maxFin * 1.5 || 1; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (D[i][j] === Infinity) D[i][j] = big;

    // classical MDS: B = -1/2 J D^2 J ; top eigenvector via power iteration
    const D2 = Array.from({ length: N }, (_, i) => Array.from({ length: N }, (_, j) => D[i][j] * D[i][j]));
    const rowM = new Float64Array(N); let grand = 0;
    for (let i = 0; i < N; i++) { let s = 0; for (let j = 0; j < N; j++) s += D2[i][j]; rowM[i] = s / N; grand += s; } grand /= N * N;
    const B = Array.from({ length: N }, (_, i) => Array.from({ length: N }, (_, j) => -0.5 * (D2[i][j] - rowM[i] - rowM[j] + grand)));
    let v = new Float64Array(N); for (let i = 0; i < N; i++) v[i] = (r() - 0.5);
    for (let it = 0; it < 80; it++) {
      const w = new Float64Array(N);
      for (let i = 0; i < N; i++) { let s = 0; const Bi = B[i]; for (let j = 0; j < N; j++) s += Bi[j] * v[j]; w[i] = s; }
      let nn = 0; for (let i = 0; i < N; i++) nn += w[i] * w[i]; nn = Math.sqrt(nn) || 1;
      for (let i = 0; i < N; i++) w[i] /= nn; v = w;
    }
    const isoCoord = Array.from(v);

    // PCA 1D on raw coords
    let mx = 0, my = 0; for (const p of pts) { mx += p[0]; my += p[1]; } mx /= N; my /= N;
    let cxx = 0, cyy = 0, cxy = 0; for (const p of pts) { const dx = p[0] - mx, dy = p[1] - my; cxx += dx * dx; cyy += dy * dy; cxy += dx * dy; }
    const tr = cxx + cyy, det = cxx * cyy - cxy * cxy, disc2 = Math.sqrt(Math.max(0, (tr / 2) ** 2 - det)), l1 = tr / 2 + disc2;
    let ex = cxy, ey = l1 - cxx; const en = Math.hypot(ex, ey) || 1; ex /= en; ey /= en; if (Math.abs(cxy) < 1e-9) { ex = 1; ey = 0; }
    const pcaCoord = pts.map(p => (p[0] - mx) * ex + (p[1] - my) * ey);

    const isoC = Math.abs(corr(isoCoord, ts)), pcaC = Math.abs(corr(pcaCoord, ts));
    // two extreme-t endpoints + geodesic path
    const ia = 0, ib = N - 1; const path = [ia]; let u = ia; let guard = 0;
    while (u !== ib && nxt[u][ib] !== -1 && guard++ < N) { u = nxt[u][ib]; path.push(u); }
    sim.current = { pts, ts, D, nxt, isoCoord, pcaCoord, isoC, pcaC, disc, path: (u === ib ? path : null), ia, ib };
    markRef.current = 0;
    setTick(t => t + 1);
  }
  _useEffect(() => { reset(); /* eslint-disable-next-line */ }, [k, shape, noise, seed]);

  _useEffect(() => {
    const tick = () => { markRef.current += 0.02; if (markRef.current > 1) markRef.current = 0; draw(); rafRef.current = requestAnimationFrame(tick); };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    /* eslint-disable-next-line */
  }, []);

  function strip(ctx, coord, ts, x0, y0, w, label) {
    ctx.fillStyle = "#94a3b8"; ctx.font = "10px JetBrains Mono"; ctx.fillText(label, x0, y0 - 6);
    let mn = Infinity, mx = -Infinity; for (const v of coord) { mn = Math.min(mn, v); mx = Math.max(mx, v); }
    const sp = mx - mn || 1;
    ctx.strokeStyle = "rgba(148,163,184,0.18)"; ctx.beginPath(); ctx.moveTo(x0, y0 + 11); ctx.lineTo(x0 + w, y0 + 11); ctx.stroke();
    for (let i = 0; i < coord.length; i++) {
      const px = x0 + ((coord[i] - mn) / sp) * w;
      ctx.beginPath(); ctx.arc(px, y0 + 11, 3.4, 0, 7); ctx.fillStyle = hsl(ts[i]); ctx.fill();
    }
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const st = sim.current; if (!st) return;
    const { pts, ts, nxt } = st;

    // ---- top: ambient manifold + kNN edges ----
    const cxp = W / 2, cyp = 150, S = 150;
    const PX = (x) => cxp + x * S, PY = (y) => cyp - y * S;
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px JetBrains Mono";
    ctx.fillText("THE DATA (k-NN graph) · color = true position along the manifold", 14, 18);
    // edges
    ctx.strokeStyle = "rgba(148,163,184,0.18)"; ctx.lineWidth = 1;
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) if (nxt[i][j] === j || nxt[j][i] === i) { ctx.beginPath(); ctx.moveTo(PX(pts[i][0]), PY(pts[i][1])); ctx.lineTo(PX(pts[j][0]), PY(pts[j][1])); ctx.stroke(); }
    // Euclidean (straight) line between the two extremes
    const a = st.ia, b = st.ib;
    ctx.strokeStyle = "rgba(248,113,113,0.7)"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(PX(pts[a][0]), PY(pts[a][1])); ctx.lineTo(PX(pts[b][0]), PY(pts[b][1])); ctx.stroke(); ctx.setLineDash([]);
    // geodesic path
    if (st.path) {
      ctx.strokeStyle = "#34d399"; ctx.lineWidth = 2.4; ctx.beginPath();
      for (let i = 0; i < st.path.length; i++) { const p = pts[st.path[i]]; i ? ctx.lineTo(PX(p[0]), PY(p[1])) : ctx.moveTo(PX(p[0]), PY(p[1])); } ctx.stroke();
      // traveling marker
      const f = markRef.current * (st.path.length - 1), idx = Math.floor(f), fr = f - idx;
      if (idx < st.path.length - 1) { const p0 = pts[st.path[idx]], p1 = pts[st.path[idx + 1]]; const mx = p0[0] + (p1[0] - p0[0]) * fr, my = p0[1] + (p1[1] - p0[1]) * fr; ctx.fillStyle = "#e2e8f0"; ctx.beginPath(); ctx.arc(PX(mx), PY(my), 4, 0, 7); ctx.fill(); }
    }
    // points
    for (let i = 0; i < N; i++) { ctx.beginPath(); ctx.arc(PX(pts[i][0]), PY(pts[i][1]), 3.6, 0, 7); ctx.fillStyle = hsl(ts[i]); ctx.fill(); }
    ctx.fillStyle = "#f87171"; ctx.font = "10px JetBrains Mono"; ctx.fillText("straight-line", PX(pts[a][0]) + 6, PY(pts[a][1]));
    ctx.fillStyle = "#34d399"; ctx.fillText("geodesic", PX(pts[b][0]) + 6, PY(pts[b][1]));

    // ---- bottom: 1D embeddings ----
    strip(ctx, st.isoCoord, ts, 18, 322, W - 36, "ISOMAP 1-D (geodesic MDS)  —  recovers the order");
    strip(ctx, st.pcaCoord, ts, 18, 378, W - 36, "PCA 1-D (straight projection)  —  folds the manifold");
    if (st.disc > 0) { ctx.fillStyle = "#f87171"; ctx.font = "10px JetBrains Mono"; ctx.fillText("graph DISCONNECTED at this k — raise neighbors", 18, 418); }
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
      <Slider label="// NEIGHBORS  k" min={2} max={16} step={1} value={k} onChange={setK} tone="violet"
        help="Edges per point in the k-NN graph that defines geodesic distance. Too small and the graph splits into pieces (no path between them); too large and edges jump across folds, 'short-circuiting' the geodesic back toward straight-line distance — and Isomap degrades to PCA." />
      <SegmentedControl label="// MANIFOLD" value={shape} onChange={setShape}
        options={[{ value: "spiral", label: "Spiral" }, { value: "roll", label: "Tight Roll" }, { value: "arc", label: "Arc" }]}
        help="The 1-D shape the points lie on. All three curve through 2-D so straight-line distance is misleading; the Tight Roll has arms close together, making short-circuits (and PCA's failure) most dramatic." />
      <Slider label="// NOISE" min={0} max={0.08} step={0.005} value={noise} onChange={setNoise}
        help="Scatter off the ideal curve. A little is fine; too much thickens the manifold until neighbors jump across arms and the geodesic graph short-circuits. Resets the data." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setSeed(s => s + 1)} primary>RESAMPLE</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="ISOMAP corr" value={st ? st.isoC.toFixed(2) : "—"} accent={st && st.isoC > 0.9 ? "#34d399" : "#fbbf24"} />
        <StatReadout label="PCA corr" value={st ? st.pcaC.toFixed(2) : "—"} accent="#60a5fa" />
      </div>
      <Legend items={[
        { color: "#34d399", label: "geodesic (along graph)" },
        { color: "#f87171", label: "straight-line" },
        { color: "#a855f7", label: "Isomap embedding" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        The points trace a curve through 2-D, colored from blue to red by their true
        position along it. Pick the two end points: the red dashed line is their
        straight-line distance — short, because it cuts straight across the gap — while
        the green path is the GEODESIC, the shortest route that stays on the k-NN graph
        and so follows the curve. Isomap measures every pair of points this geodesic
        way, then lays them on a line (classical MDS). The bottom ISOMAP strip comes
        out as a clean blue→red rainbow: the 1-D structure recovered. PCA, which only
        projects onto a straight axis, folds the curve and scrambles the colors.
      </DemoP>
      <DemoP>
        Watch the ISOMAP corr (agreement between recovered order and true order) sit
        near 1 while PCA's lags. Then push the NEIGHBORS slider to its extremes. Too
        few neighbors and the graph fractures into disconnected islands — there's no
        path across the gap, the warning lights up, and Isomap breaks. Too many, and
        edges leap across the folds (especially on the Tight Roll): the geodesic
        "short-circuits" straight across, geodesic distance collapses back toward
        Euclidean, and Isomap's rainbow scrambles just like PCA's. That sweet spot for
        k is the whole craft of manifold learning.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Isomap is the classic nonlinear dimensionality reduction method: it extends{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/pca/`} style={{ color: "#a855f7" }}>PCA</a>/MDS
        from straight-line to geodesic distances so it can unroll manifolds (the
        textbook swiss roll, face-pose and handwriting manifolds, sensor and motion
        data). It shares the neighborhood-graph + eigendecomposition recipe with{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/spectral-clustering/`} style={{ color: "#a855f7" }}>spectral clustering</a>{" "}
        and LLE, and sits alongside{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/tsne/`} style={{ color: "#a855f7" }}>t-SNE</a>{" "}
        and UMAP in the visualization toolbox — the difference being that Isomap
        preserves global geometry (true distances) while t-SNE/UMAP prioritize local
        neighborhoods.
      </DemoP>
      <DemoP>
        Caveats: it hinges entirely on the neighborhood graph. Too-large k or noise
        causes "short-circuit" edges that ruin the geodesics; too-small k disconnects
        the graph. It assumes a single, smooth, well-sampled manifold with no holes,
        struggles with non-convex or multi-component data, and the full all-pairs
        shortest-path + dense eigendecomposition scale poorly (landmark/L-Isomap help).
        Like other spectral embeddings it's transductive — adding new points means
        re-solving. When you only care about cluster structure for a 2-D picture, t-SNE
        or UMAP are usually the more practical choice.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="CLASSICAL ML" title="Isomap (Manifold Learning)"
      subtitle="Unroll a curved manifold by measuring distance ALONG the data instead of straight through it. A k-NN graph plus shortest paths gives geodesic distances; classical MDS lays them on a line — recovering an order that straight-line PCA folds and scrambles."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/unsupervised-learning/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<IsomapDemo />);
