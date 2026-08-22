// playground-app.jsx — the capstone "Build a Classifier" playground.
// A guided 5-stage pipeline (Data -> Features -> Model -> Train -> Evaluate) that
// chains the ideas behind several Visualize demos into one end-to-end flow. Every
// algorithm is a real implementation in JS; the decision boundary is rendered live.

const {
  HudBrackets, GridOverlay, GlowBlob,
  Section, Container, TopNav, Footer, MonoLabel, useIsMobile,
  Slider, SegmentedControl, Toggle, DemoButton, StatReadout,
} = window;
const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;

const CLASS_COLORS = ["#3b82f6", "#f59e0b", "#34d399"];
const BASE = () => window.__DM_BASE || "../";

// ── seeded RNG ──────────────────────────────────────────────────────
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function gauss(rng) { let u = 0, v = 0; while (u === 0) u = rng(); while (v === 0) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

// ── datasets (2D) ───────────────────────────────────────────────────
function makeData(kind, n, noise, seed) {
  const rng = mulberry32(seed), pts = []; let C = 2;
  if (kind === "moons") {
    for (let i = 0; i < n; i++) {
      const c = i % 2, t = rng() * Math.PI;
      let x = Math.cos(t) * 2, y = Math.sin(t) * 1.4;
      if (c === 1) { x = 2 - x; y = -y + 0.4; }
      x += gauss(rng) * noise; y += gauss(rng) * noise;
      pts.push({ x: x - 1, y: y - 0.2, label: c });
    }
  } else if (kind === "circles") {
    for (let i = 0; i < n; i++) {
      const c = i % 2, t = rng() * 2 * Math.PI, r = (c === 0 ? 1 : 2.4) + gauss(rng) * noise;
      pts.push({ x: Math.cos(t) * r, y: Math.sin(t) * r, label: c });
    }
  } else if (kind === "blobs") {
    C = 3; const ctr = [[-1.8, -1.2], [1.8, -1.2], [0, 1.9]];
    for (let i = 0; i < n; i++) { const c = i % 3; pts.push({ x: ctr[c][0] + gauss(rng) * (0.5 + noise), y: ctr[c][1] + gauss(rng) * (0.5 + noise), label: c }); }
  } else { // spiral, 3 arms
    C = 3; const per = Math.floor(n / 3);
    for (let c = 0; c < 3; c++) for (let i = 0; i < per; i++) {
      const t = i / per * 3.2, r = t * 0.9 + 0.3, a = t * 2.4 + c * 2 * Math.PI / 3;
      pts.push({ x: Math.cos(a) * r + gauss(rng) * noise, y: Math.sin(a) * r + gauss(rng) * noise, label: c });
    }
  }
  return { pts, C };
}

// ── feature map + standardization ───────────────────────────────────
function featurize(p, mode) { return mode === "poly2" ? [p.x, p.y, p.x * p.x, p.y * p.y, p.x * p.y] : [p.x, p.y]; }
function standardizer(feats) {
  const D = feats[0].length, mean = Array(D).fill(0), std = Array(D).fill(0);
  for (const f of feats) for (let d = 0; d < D; d++) mean[d] += f[d] / feats.length;
  for (const f of feats) for (let d = 0; d < D; d++) std[d] += (f[d] - mean[d]) ** 2 / feats.length;
  for (let d = 0; d < D; d++) std[d] = Math.sqrt(std[d]) || 1;
  return v => v.map((x, d) => (x - mean[d]) / std[d]);
}

// ── models — each returns predict(vec) -> class index ───────────────
function trainKNN(X, y, C, k) {
  k = Math.min(k, X.length);
  return v => {
    const ds = X.map((x, i) => { let s = 0; for (let d = 0; d < x.length; d++) s += (x[d] - v[d]) ** 2; return [s, y[i]]; });
    ds.sort((a, b) => a[0] - b[0]);
    const cnt = Array(C).fill(0); for (let i = 0; i < k; i++) cnt[ds[i][1]]++;
    let best = 0; for (let c = 1; c < C; c++) if (cnt[c] > cnt[best]) best = c; return best;
  };
}
function softmax(z) { const m = Math.max(...z), e = z.map(v => Math.exp(v - m)), s = e.reduce((a, b) => a + b, 0); return e.map(v => v / s); }
function trainLogistic(X, y, C, epochs) {
  const D = X[0].length, W = Array.from({ length: C }, () => Array(D).fill(0)), b = Array(C).fill(0), lr = 0.3;
  for (let ep = 0; ep < epochs; ep++) {
    const gW = Array.from({ length: C }, () => Array(D).fill(0)), gB = Array(C).fill(0);
    for (let i = 0; i < X.length; i++) {
      const z = W.map((w, c) => b[c] + w.reduce((a, wd, d) => a + wd * X[i][d], 0)), p = softmax(z);
      for (let c = 0; c < C; c++) { const err = p[c] - (y[i] === c ? 1 : 0); gB[c] += err; for (let d = 0; d < D; d++) gW[c][d] += err * X[i][d]; }
    }
    for (let c = 0; c < C; c++) { b[c] -= lr * gB[c] / X.length; for (let d = 0; d < D; d++) W[c][d] -= lr * gW[c][d] / X.length; }
  }
  return v => { const z = W.map((w, c) => b[c] + w.reduce((a, wd, d) => a + wd * v[d], 0)); return z.indexOf(Math.max(...z)); };
}
function gini(counts, n) { let g = 1; for (const c of counts) g -= (c / n) ** 2; return g; }
function trainTree(X, y, C, maxDepth) {
  const build = (idx, depth) => {
    const counts = Array(C).fill(0); idx.forEach(i => counts[y[i]]++);
    let maj = 0; for (let c = 1; c < C; c++) if (counts[c] > counts[maj]) maj = c;
    if (depth >= maxDepth || idx.length < 6 || counts[maj] === idx.length) return { leaf: maj };
    const D = X[0].length; let best = null;
    for (let d = 0; d < D; d++) {
      const vals = idx.map(i => X[i][d]).sort((a, b) => a - b);
      for (let t = 1; t < vals.length; t++) {
        if (vals[t] === vals[t - 1]) continue;
        const thr = (vals[t] + vals[t - 1]) / 2, L = [], Rr = [];
        idx.forEach(i => (X[i][d] <= thr ? L : Rr).push(i));
        if (!L.length || !Rr.length) continue;
        const cl = Array(C).fill(0), cr = Array(C).fill(0); L.forEach(i => cl[y[i]]++); Rr.forEach(i => cr[y[i]]++);
        const score = (L.length * gini(cl, L.length) + Rr.length * gini(cr, Rr.length)) / idx.length;
        if (!best || score < best.score) best = { score, d, thr, L, Rr };
      }
    }
    if (!best) return { leaf: maj };
    return { d: best.d, thr: best.thr, l: build(best.L, depth + 1), r: build(best.Rr, depth + 1) };
  };
  const root = build(X.map((_, i) => i), 0);
  const pred = (node, v) => node.leaf !== undefined ? node.leaf : pred(v[node.d] <= node.thr ? node.l : node.r, v);
  return v => pred(root, v);
}
function trainMLP(X, y, C, H, epochs) {
  const D = X[0].length, rng = mulberry32(99), lr = 0.15;
  const W1 = Array.from({ length: H }, () => Array.from({ length: D }, () => gauss(rng) * 0.5)), b1 = Array(H).fill(0);
  const W2 = Array.from({ length: C }, () => Array.from({ length: H }, () => gauss(rng) * 0.5)), b2 = Array(C).fill(0);
  const fwd = v => {
    const h = W1.map((w, j) => Math.tanh(b1[j] + w.reduce((a, wd, d) => a + wd * v[d], 0)));
    const z = W2.map((w, c) => b2[c] + w.reduce((a, wc, j) => a + wc * h[j], 0));
    return { h, p: softmax(z) };
  };
  for (let ep = 0; ep < epochs; ep++) for (let i = 0; i < X.length; i++) {
    const { h, p } = fwd(X[i]), dz = p.map((pc, c) => pc - (y[i] === c ? 1 : 0)), dh = Array(H).fill(0);
    for (let c = 0; c < C; c++) { for (let j = 0; j < H; j++) { dh[j] += dz[c] * W2[c][j]; W2[c][j] -= lr * dz[c] * h[j]; } b2[c] -= lr * dz[c]; }
    for (let j = 0; j < H; j++) { const g = dh[j] * (1 - h[j] * h[j]); for (let d = 0; d < D; d++) W1[j][d] -= lr * g * X[i][d]; b1[j] -= lr * g; }
  }
  return v => { const z = fwd(v).p; return z.indexOf(Math.max(...z)); };
}

const MODEL_DEMO = { knn: "knn", logistic: "regression", tree: "decision-tree", mlp: "neural-playground" };
const MODEL_LABEL = { knn: "k-Nearest Neighbors", logistic: "Logistic Regression", tree: "Decision Tree", mlp: "Neural Network (MLP)" };

function Stage({ n, title, sub, children }) {
  return (
    <div style={{ marginBottom: 22, padding: "18px 20px", border: "1px solid var(--border)", borderRadius: 8, background: "rgba(13,24,52,0.3)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <span style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 13, border: "1px solid var(--border-violet)", color: "var(--violet-lt)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--f-mono)", fontSize: 12 }}>{n}</span>
        <div>
          <div style={{ fontFamily: "var(--f-display)", fontWeight: 600, fontSize: 17, color: "var(--white)" }}>{title}</div>
          {sub && <div className="t-mono-s" style={{ color: "var(--muted)", fontSize: 10, marginTop: 2 }}>{sub}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Playground() {
  const mobile = useIsMobile();
  const cvRef = _useRef(null);
  const [dataset, setDataset] = _useState("moons");
  const [nPoints, setNPoints] = _useState(240);
  const [noise, setNoise] = _useState(0.18);
  const [seed, setSeed] = _useState(7);
  const [features, setFeatures] = _useState("raw");
  const [standardize, setStandardize] = _useState(true);
  const [model, setModel] = _useState("knn");
  const [k, setK] = _useState(11);
  const [depth, setDepth] = _useState(4);
  const [hidden, setHidden] = _useState(8);
  const [epochs, setEpochs] = _useState(250);
  const [metrics, setMetrics] = _useState(null);
  const stash = _useRef({});

  function run() {
    const { pts, C } = makeData(dataset, nPoints, noise, seed);
    // split
    const rng = mulberry32(seed + 1), idx = pts.map((_, i) => i).sort(() => rng() - 0.5);
    const cut = Math.floor(pts.length * 0.7), tr = idx.slice(0, cut).map(i => pts[i]), te = idx.slice(cut).map(i => pts[i]);
    // featurize + standardize on train
    const rawTr = tr.map(p => featurize(p, features));
    const norm = standardize ? standardizer(rawTr) : (v => v);
    const Xtr = rawTr.map(norm), ytr = tr.map(p => p.label);
    const Xte = te.map(p => norm(featurize(p, features))), yte = te.map(p => p.label);
    // train
    let predict;
    if (model === "knn") predict = trainKNN(Xtr, ytr, C, k);
    else if (model === "logistic") predict = trainLogistic(Xtr, ytr, C, 300);
    else if (model === "tree") predict = trainTree(Xtr, ytr, C, depth);
    else predict = trainMLP(Xtr, ytr, C, hidden, epochs);
    const acc = (Xs, ys) => { let ok = 0; for (let i = 0; i < Xs.length; i++) if (predict(Xs[i]) === ys[i]) ok++; return Xs.length ? ok / Xs.length : 0; };
    const trAcc = acc(Xtr, ytr), teAcc = acc(Xte, yte);
    // bounds
    let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
    for (const p of pts) { xmin = Math.min(xmin, p.x); xmax = Math.max(xmax, p.x); ymin = Math.min(ymin, p.y); ymax = Math.max(ymax, p.y); }
    const pad = 0.6; xmin -= pad; xmax += pad; ymin -= pad; ymax += pad;
    stash.current = { tr, te, predict, norm, xmin, xmax, ymin, ymax, C };
    setMetrics({ trAcc, teAcc, C });
    draw();
  }

  function draw() {
    const cv = cvRef.current; if (!cv) return;
    const s = stash.current; if (!s.predict) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2), W = cv.clientWidth, Hh = cv.clientHeight;
    cv.width = W * dpr; cv.height = Hh * dpr;
    const ctx = cv.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, Hh);
    const { xmin, xmax, ymin, ymax, predict, norm } = s;
    const toPx = (x, y) => [(x - xmin) / (xmax - xmin) * W, Hh - (y - ymin) / (ymax - ymin) * Hh];
    // boundary regions
    const G = 90, cw = W / G, ch = Hh / G;
    for (let gx = 0; gx < G; gx++) for (let gy = 0; gy < G; gy++) {
      const x = xmin + (gx + 0.5) / G * (xmax - xmin), y = ymin + (gy + 0.5) / G * (ymax - ymin);
      const c = predict(norm(featurize({ x, y }, features)));
      ctx.fillStyle = CLASS_COLORS[c] + "2b";
      ctx.fillRect(gx * cw, Hh - (gy + 1) * ch, cw + 1, ch + 1);
    }
    // points
    const dot = (p, test) => {
      const [px, py] = toPx(p.x, p.y);
      ctx.beginPath(); ctx.arc(px, py, test ? 4.5 : 3.2, 0, 6.2832);
      ctx.fillStyle = CLASS_COLORS[p.label]; ctx.fill();
      if (test) { ctx.lineWidth = 1.6; ctx.strokeStyle = "#fff"; ctx.stroke(); }
    };
    s.tr.forEach(p => dot(p, false));
    s.te.forEach(p => dot(p, true));
  }

  _useEffect(() => { run(); /* eslint-disable-next-line */ }, []);

  const accentBtn = { marginTop: 4 };
  return (
    <div style={{ display: "flex", flexDirection: mobile ? "column" : "row", gap: 22, alignItems: "flex-start" }}>
      {/* pipeline controls */}
      <div style={{ flex: "1 1 0", minWidth: 0, width: mobile ? "100%" : "auto" }}>
        <Stage n="1" title="Data" sub="THE PROBLEM YOU'RE LEARNING">
          <SegmentedControl label="Dataset" value={dataset} onChange={setDataset} help="Each shape needs a different decision boundary — linear models fail on circles and spirals."
            options={[{ value: "moons", label: "Moons" }, { value: "circles", label: "Circles" }, { value: "blobs", label: "Blobs (3)" }, { value: "spiral", label: "Spiral (3)" }]} />
          <Slider label="Points" min={60} max={400} step={20} value={nPoints} onChange={setNPoints} help="More data makes the boundary steadier and overfitting harder." />
          <Slider label="Noise" min={0} max={0.5} step={0.02} value={noise} onChange={setNoise} help="Class overlap. High noise makes perfect accuracy impossible — and tempting to overfit." />
          <Slider label="Seed" min={1} max={40} step={1} value={seed} onChange={setSeed} help="Resample a fresh draw of the same distribution." />
        </Stage>

        <Stage n="2" title="Features" sub="HOW THE MODEL SEES EACH POINT">
          <SegmentedControl label="Feature map" value={features} onChange={setFeatures} help="raw = (x, y). poly2 adds x^2, y^2, xy so a linear model can bend its boundary."
            options={[{ value: "raw", label: "Raw (x, y)" }, { value: "poly2", label: "Polynomial deg 2" }]} />
          <Toggle label="Standardize" checked={standardize} onChange={setStandardize} help="Zero-mean, unit-variance each feature — important for distance- and gradient-based models." />
        </Stage>

        <Stage n="3" title="Model" sub="THE HYPOTHESIS FAMILY">
          <SegmentedControl label="Classifier" value={model} onChange={setModel} help="Pick a model family. Each draws boundaries in a fundamentally different way."
            options={[{ value: "knn", label: "kNN" }, { value: "logistic", label: "Logistic" }, { value: "tree", label: "Tree" }, { value: "mlp", label: "MLP" }]} />
          {model === "knn" && <Slider label="Neighbors k" min={1} max={41} step={2} value={k} onChange={setK} help="Small k = jagged, high-variance boundary; large k = smooth, high-bias." />}
          {model === "tree" && <Slider label="Max depth" min={1} max={9} step={1} value={depth} onChange={setDepth} help="Deeper trees carve finer axis-aligned regions — and overfit sooner." />}
          {model === "mlp" && <Slider label="Hidden units" min={2} max={24} step={1} value={hidden} onChange={setHidden} help="Width of the one hidden layer — capacity to bend the boundary." />}
          {model === "mlp" && <Slider label="Epochs" min={50} max={600} step={50} value={epochs} onChange={setEpochs} help="Full passes of gradient descent over the training set." />}
          <div className="t-mono-s" style={{ marginTop: 10, fontSize: 10 }}>
            <a href={BASE() + "visualize/" + MODEL_DEMO[model] + "/"} style={{ color: "var(--blue-lt)", textDecoration: "none" }}>→ open the {MODEL_LABEL[model]} demo</a>
          </div>
        </Stage>

        <Stage n="4" title="Train and evaluate" sub="FIT, THEN MEASURE ON HELD-OUT DATA">
          <DemoButton onClick={run} tone="violet" primary>TRAIN AND EVALUATE</DemoButton>
          <p className="t-body" style={{ color: "var(--muted)", fontSize: 12.5, lineHeight: 1.6, marginTop: 12, marginBottom: 0 }}>
            70% of the points train the model; the hollow 30% are held out. A big gap between training and test accuracy is overfitting — try more noise, a deeper tree, or tiny k to provoke it.
          </p>
        </Stage>
      </div>

      {/* sticky results */}
      <div style={{ flex: mobile ? "1 1 auto" : "0 0 460px", width: mobile ? "100%" : 460, position: mobile ? "static" : "sticky", top: 90 }}>
        <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 16, background: "rgba(8,15,35,0.6)" }}>
          <MonoLabel color="var(--violet-lt)">// 5. DECISION BOUNDARY</MonoLabel>
          <div style={{ position: "relative", marginTop: 12 }}>
            <canvas ref={cvRef} style={{ width: "100%", height: mobile ? 320 : 420, display: "block", borderRadius: 8, border: "1px solid var(--border)" }} />
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
            <StatReadout label="TRAIN ACCURACY" value={metrics ? (metrics.trAcc * 100).toFixed(1) + "%" : "—"} accent="var(--blue-lt)" />
            <StatReadout label="TEST ACCURACY" value={metrics ? (metrics.teAcc * 100).toFixed(1) + "%" : "—"} accent="var(--violet-lt)" />
            <StatReadout label="GAP (OVERFIT)" value={metrics ? ((metrics.trAcc - metrics.teAcc) * 100).toFixed(1) + " pts" : "—"} accent={metrics && metrics.trAcc - metrics.teAcc > 0.12 ? "#f87171" : "#34d399"} />
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
            {Array.from({ length: metrics ? metrics.C : 2 }).map((_, c) => (
              <span key={c} className="t-mono-s" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--muted)", fontSize: 10 }}>
                <span style={{ width: 9, height: 9, borderRadius: 9, background: CLASS_COLORS[c], display: "inline-block" }} />CLASS {c}
              </span>
            ))}
            <span className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>○ = held-out test point</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <Section id="top" padded={false} style={{ paddingTop: 150, paddingBottom: 30, position: "relative", overflow: "hidden" }}>
      <GridOverlay mode="dark" spacing={80} opacity={0.4} />
      <GlowBlob color="violet" size={520} x={"-10%"} y={"-20%"} opacity={0.22} />
      <GlowBlob color="blue" size={460} x={"75%"} y={"30%"} opacity={0.2} />
      <HudBrackets mode="dark" inset={32} size={32} />
      <Container>
        <div style={{ maxWidth: 760, position: "relative" }}>
          <div style={{ position: "absolute", left: -18, top: 6, bottom: 6, width: 3, background: "linear-gradient(to bottom, #a855f7, #3b82f6)", boxShadow: "0 0 16px rgba(168,85,247,0.5)" }} />
          <MonoLabel>// CAPSTONE</MonoLabel>
          <h1 style={{
            fontFamily: "var(--f-display)", fontWeight: 700, fontSize: "clamp(38px, 5vw, 64px)", letterSpacing: "-0.025em",
            lineHeight: 1.0, margin: "14px 0 0",
            background: "linear-gradient(110deg, #a855f7 0%, #e0e7ff 50%, #3b82f6 100%)",
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          }}>Build a classifier.</h1>
          <p className="t-body" style={{ color: "var(--muted)", maxWidth: 660, fontSize: 17, lineHeight: 1.6, marginTop: 16 }}>
            The whole pipeline in one place: choose data, shape the features, pick a model, train it, and watch the decision boundary and the train/test gap respond. Everything runs in your browser — real algorithms, no server.
          </p>
        </div>
      </Container>
    </Section>
  );
}

function App() {
  return (
    <>
      <TopNav />
      <main id="main" tabIndex={-1}>
      <Hero />
      <Section style={{ paddingTop: 8, paddingBottom: 90 }}>
        <Container><Playground /></Container>
      </Section>
      </main>
      <Footer />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
