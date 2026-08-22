// demos/tsne.jsx — t-SNE, the real gradient descent on KL divergence.
//
// t-SNE embeds high-dimensional points in 2D so that NEIGHBORHOODS are
// preserved. It turns pairwise distances into probabilities:
//   high-D: p_ij from Gaussians whose width is set per-point by PERPLEXITY,
//   low-D : q_ij from a heavy-tailed Student-t (1+||y_i−y_j||²)⁻¹,
// then moves the 2D points to minimize KL(P‖Q) by gradient descent:
//   ∂C/∂y_i = 4 Σ_j (p_ij − q_ij)(y_i − y_j)(1+||y_i−y_j||²)⁻¹.
// The Student-t's fat tail is what lets clusters push apart and spread to fill
// the plane. We run it live on a few genuine high-D Gaussian blobs.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 500, H = 480;
const DIM = 12;

function TSNEDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const [K, setK] = _useState(4);
  const [perp, setPerp] = _useState(20);
  const [lr, setLr] = _useState(140);
  const [sep, setSep] = _useState(2.2);
  const [running, setRunning] = _useState(true);
  const [seed, setSeed] = _useState(1);
  const [, setTick] = _useState(0);
  const sim = _useRef(null);

  function rng(s0) { let s = s0 >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function randn(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  function reset() {
    const r = rng(seed * 7919 + K * 31 + Math.round(sep * 10));
    const perCluster = 26, N = K * perCluster;
    const centers = Array.from({ length: K }, () => Array.from({ length: DIM }, () => sep * randn(r)));
    const X = [], lab = [];
    for (let c = 0; c < K; c++) for (let n = 0; n < perCluster; n++) {
      X.push(centers[c].map(m => m + randn(r))); lab.push(c);
    }
    // high-D pairwise squared distances
    const D2 = X.map((xi) => X.map((xj) => { let s = 0; for (let d = 0; d < DIM; d++) { const t = xi[d] - xj[d]; s += t * t; } return s; }));
    // P with per-point beta tuned to target perplexity
    const P = Array.from({ length: N }, () => new Array(N).fill(0));
    const logU = Math.log(perp);
    for (let i = 0; i < N; i++) {
      let betaMin = -Infinity, betaMax = Infinity, beta = 1;
      let row = null;
      for (let it = 0; it < 50; it++) {
        row = new Array(N); let sum = 0;
        for (let j = 0; j < N; j++) { if (j === i) { row[j] = 0; continue; } const v = Math.exp(-D2[i][j] * beta); row[j] = v; sum += v; }
        sum = sum || 1e-12;
        let H = 0; for (let j = 0; j < N; j++) { const p = row[j] / sum; if (p > 1e-12) H += -p * Math.log(p); }
        const diff = H - logU;
        if (Math.abs(diff) < 1e-3) break;
        if (diff > 0) { betaMin = beta; beta = betaMax === Infinity ? beta * 2 : (beta + betaMax) / 2; }
        else { betaMax = beta; beta = betaMin === -Infinity ? beta / 2 : (beta + betaMin) / 2; }
      }
      let sum = 0; for (let j = 0; j < N; j++) sum += row[j]; sum = sum || 1e-12;
      for (let j = 0; j < N; j++) P[i][j] = row[j] / sum;
    }
    // symmetrize + normalize
    let psum = 0;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { P[i][j] = (P[i][j] + P[j][i]) / (2 * N); psum += P[i][j]; }
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) P[i][j] = Math.max(P[i][j] / (psum || 1), 1e-12);
    // init Y
    const Y = Array.from({ length: N }, () => [1e-2 * randn(r), 1e-2 * randn(r)]);
    const vel = Array.from({ length: N }, () => [0, 0]);
    sim.current = { N, X, lab, P, Y, vel, iter: 0, kl: 0 };
    setTick(t => t + 1);
  }
  _useEffect(() => { reset(); /* eslint-disable-next-line */ }, [K, perp, sep, seed]);

  function step() {
    const st = sim.current; if (!st) return;
    const { N, P, Y, vel } = st;
    const exa = st.iter < 100 ? 4 : 1;        // early exaggeration
    const mom = st.iter < 100 ? 0.5 : 0.8;
    // low-D affinities
    const num = Array.from({ length: N }, () => new Array(N).fill(0));
    let qsum = 0;
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
      const dx = Y[i][0] - Y[j][0], dy = Y[i][1] - Y[j][1];
      const v = 1 / (1 + dx * dx + dy * dy); num[i][j] = v; num[j][i] = v; qsum += 2 * v;
    }
    qsum = qsum || 1e-12;
    let kl = 0;
    for (let i = 0; i < N; i++) {
      let gx = 0, gy = 0;
      for (let j = 0; j < N; j++) {
        if (i === j) continue;
        const q = num[i][j] / qsum;
        const mult = (exa * P[i][j] - q) * num[i][j];
        gx += mult * (Y[i][0] - Y[j][0]); gy += mult * (Y[i][1] - Y[j][1]);
        if (exa === 1 && q > 1e-12) kl += P[i][j] * Math.log(P[i][j] / q);
      }
      vel[i][0] = mom * vel[i][0] - (lr / N) * 4 * gx;
      vel[i][1] = mom * vel[i][1] - (lr / N) * 4 * gy;
    }
    for (let i = 0; i < N; i++) { Y[i][0] += vel[i][0]; Y[i][1] += vel[i][1]; }
    // recenter
    let mx = 0, my = 0; for (let i = 0; i < N; i++) { mx += Y[i][0]; my += Y[i][1]; } mx /= N; my /= N;
    for (let i = 0; i < N; i++) { Y[i][0] -= mx; Y[i][1] -= my; }
    st.iter++; st.kl = kl;
  }

  _useEffect(() => {
    let last = performance.now();
    const tick = (now) => {
      if (running && now - last > 16) { last = now; step(); setTick(t => t + 1); }
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
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";
    const st = sim.current; if (!st) return;
    const { N, Y, lab } = st;
    // auto-fit
    let xmn = Infinity, xmx = -Infinity, ymn = Infinity, ymx = -Infinity;
    for (let i = 0; i < N; i++) { xmn = Math.min(xmn, Y[i][0]); xmx = Math.max(xmx, Y[i][0]); ymn = Math.min(ymn, Y[i][1]); ymx = Math.max(ymx, Y[i][1]); }
    const pad = 40, span = Math.max(xmx - xmn, ymx - ymn, 1e-3) * 1.1;
    const cx = (xmn + xmx) / 2, cy = (ymn + ymx) / 2;
    const PX = (x) => W / 2 + (x - cx) / span * (W - 2 * pad);
    const PY = (y) => H / 2 - 10 + (y - cy) / span * (H - 60 - 2 * pad);
    const hue = (c) => `hsl(${Math.round((c / K) * 320)}, 70%, 62%)`;

    ctx.fillStyle = "#94a3b8"; ctx.fillText(K + " Gaussian blobs in " + DIM + "-D → 2-D, color = true cluster", pad, 20);
    for (let i = 0; i < N; i++) { ctx.fillStyle = hue(lab[i]); ctx.beginPath(); ctx.arc(PX(Y[i][0]), PY(Y[i][1]), 3.4, 0, 7); ctx.fill(); }

    ctx.fillStyle = "#a855f7"; ctx.font = "600 15px Space Grotesk, JetBrains Mono";
    ctx.fillText("iter " + st.iter, pad, H - 16);
    ctx.fillStyle = "#34d399"; ctx.font = "11px JetBrains Mono";
    ctx.fillText("KL(P‖Q) " + st.kl.toFixed(3), pad + 110, H - 16);
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
      <Slider label="// PERPLEXITY" min={3} max={40} step={1} value={perp} onChange={setPerp} tone="violet"
        help="Roughly the number of neighbors each point tries to keep close. Low = many tiny local clusters (can shatter real groups); high = broader structure but blurs fine detail. The single most important t-SNE knob — resets the run." />
      <Slider label="// CLUSTERS" min={2} max={6} step={1} value={K} onChange={setK}
        help="Number of true high-dimensional Gaussian blobs. Each is well separated in 12-D; t-SNE has to discover that separation from neighborhoods alone." />
      <Slider label="// HIGH-D SEPARATION" min={1} max={4} step={0.2} value={sep} onChange={setSep}
        help="How far apart the blobs sit in the original 12-D space. Lower = overlapping clusters that t-SNE struggles to pull apart cleanly." />
      <Slider label="// LEARNING RATE" min={40} max={400} step={10} value={lr} onChange={setLr}
        help="Step size for the KL gradient descent. Too low crawls; too high makes points fly apart into a ball. The classic t-SNE failure mode is a bad learning rate." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setRunning(r => !r)} primary>{running ? "PAUSE" : "RESUME"}</DemoButton>
        <DemoButton onClick={() => setSeed(s => s + 1)}>RESTART</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="ITERATION" value={st ? st.iter : 0} accent="#a855f7" />
        <StatReadout label="KL DIVERGENCE" value={st ? st.kl.toFixed(3) : "—"} accent="#34d399" />
      </div>
      <Legend items={[{ color: "#a855f7", label: "each color = a true cluster" }]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        The points live in 12 dimensions as a few well-separated Gaussian blobs — you
        can't see that directly, so t-SNE has to recover it. It converts high-D
        distances into neighbor probabilities (each point's Gaussian width set by
        PERPLEXITY), does the same in 2D with a heavy-tailed Student-t, and slides the
        2D points to make the two probability tables agree, minimizing KL(P‖Q). Watch
        the first ~100 iterations: an "early exaggeration" phase inflates P so the true
        clusters punch apart, then they settle and spread to fill the plane.
      </DemoP>
      <DemoP>
        Play with PERPLEXITY — it's the knob that matters most. Too low and a single
        blob can shatter into several phantom islands; too high and nearby blobs blur
        together. Drop HIGH-D SEPARATION so the blobs overlap and t-SNE visibly
        struggles. Crank LEARNING RATE and the whole thing detonates into a featureless
        ball — the most common way t-SNE plots go wrong. The Student-t's fat tail is
        the quiet hero: it lets far-apart clusters repel without the "crowding" that
        plain Gaussian-in-2D suffers.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        t-SNE (van der Maaten & Hinton 2008) is the default for visualizing
        high-dimensional structure — word and image{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/embeddings/`} style={{ color: "#a855f7" }}>embeddings</a>,
        single-cell genomics, hidden-layer activations. It's a nonlinear cousin of{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/pca/`} style={{ color: "#a855f7" }}>PCA</a>:
        PCA preserves global variance directions, t-SNE preserves local neighborhoods,
        so it separates clusters PCA smears together. UMAP is the faster modern
        alternative with similar output and better global structure.
      </DemoP>
      <DemoP>
        Read t-SNE plots with care — it's a visualization tool, not a clustering or
        distance-preserving one. Cluster <i>sizes</i> and the <i>gaps between</i>
        clusters are largely meaningless (the algorithm equalizes density), so don't
        infer "these two groups are far apart" from the picture. Results depend on
        perplexity, learning rate, and the random seed; apparent clusters can be
        artifacts, and it doesn't give a reusable mapping for new points the way PCA or
        a parametric encoder does. UMAP and PCA are worth cross-checking against.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="t-SNE"
      subtitle="Watch real KL-divergence gradient descent pull high-dimensional clusters apart in 2D. Tune perplexity, separation, and learning rate to see t-SNE work — and to see the ways it famously misleads."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/ml-theory/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<TSNEDemo />);
