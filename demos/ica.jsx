// demos/ica.jsx — Independent Component Analysis (FastICA), the cocktail party.
//
// Two independent source signals are linearly mixed into two "microphone" signals
// (x = A s). ICA recovers the sources knowing only the mixes, by finding an
// unmixing matrix W that makes the outputs as statistically independent — i.e. as
// NON-Gaussian — as possible (by the Central Limit Theorem, mixtures look more
// Gaussian than their parts, so un-mixing = maximizing non-Gaussianity). We run
// real FastICA: whiten the data, then a fixed-point iteration with the tanh
// contrast finds the independent directions. Sources are recovered up to sign and
// order. The catch ICA teaches: if a source is itself Gaussian, it's unrecoverable
// — pick "Two Gaussians" and watch separation fail.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 560, H = 460;
const T = 1024, WIN = 240;

function ICADemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const rafRef = _useRef(0);
  const offRef = _useRef(0);
  const [mix, setMix] = _useState(0.7);
  const [kind, setKind] = _useState("tones");
  const [running, setRunning] = _useState(true);
  const [seed, setSeed] = _useState(1);
  const [, setTick] = _useState(0);
  const sim = _useRef(null);

  function rng(s0) { let s = s0 >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function randn(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function standardize(a) { const n = a.length; let m = 0; for (const v of a) m += v; m /= n; let s = 0; for (const v of a) s += (v - m) ** 2; s = Math.sqrt(s / n) || 1; return a.map(v => (v - m) / s); }
  function corr(a, b) { const n = a.length; let ma = 0, mb = 0; for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; } ma /= n; mb /= n; let num = 0, da = 0, db = 0; for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; num += x * y; da += x * x; db += y * y; } return num / (Math.sqrt(da * db) || 1); }

  function reset() {
    const r = rng(seed * 1000003 + 3);
    let s1 = new Array(T), s2 = new Array(T);
    for (let t = 0; t < T; t++) {
      const ph = t / T;
      if (kind === "tones") { s1[t] = Math.sin(2 * Math.PI * 11 * ph); s2[t] = Math.sign(Math.sin(2 * Math.PI * 6 * ph)); }
      else if (kind === "saw") { s1[t] = Math.sin(2 * Math.PI * 9 * ph); s2[t] = 2 * ((5 * ph) % 1) - 1; }
      else { s1[t] = randn(r); s2[t] = randn(r); } // two gaussians (ICA should fail)
    }
    s1 = standardize(s1); s2 = standardize(s2);
    // mixing matrix A = [[1, mix],[mix, 1]]
    const a = 1, b = mix;
    const x1 = new Array(T), x2 = new Array(T);
    for (let t = 0; t < T; t++) { x1[t] = a * s1[t] + b * s2[t]; x2[t] = b * s1[t] + a * s2[t]; }
    const X1 = standardize(x1), X2 = standardize(x2);

    // --- FastICA ---
    // whiten: cov of [X1;X2]
    let c11 = 0, c22 = 0, c12 = 0;
    for (let t = 0; t < T; t++) { c11 += X1[t] * X1[t]; c22 += X2[t] * X2[t]; c12 += X1[t] * X2[t]; }
    c11 /= T; c22 /= T; c12 /= T;
    // eigendecomp of [[c11,c12],[c12,c22]]
    const tr = c11 + c22, det = c11 * c22 - c12 * c12, disc = Math.sqrt(Math.max(0, (tr / 2) ** 2 - det));
    const l1 = tr / 2 + disc, l2 = tr / 2 - disc;
    let e1x = c12, e1y = l1 - c11; let n1 = Math.hypot(e1x, e1y) || 1; e1x /= n1; e1y /= n1;
    if (Math.abs(c12) < 1e-9) { e1x = 1; e1y = 0; }
    const e2x = -e1y, e2y = e1x;
    // whitening V = D^-1/2 E^T : rows
    const i1 = 1 / Math.sqrt(Math.max(1e-9, l1)), i2 = 1 / Math.sqrt(Math.max(1e-9, l2));
    const Z1 = new Array(T), Z2 = new Array(T);
    for (let t = 0; t < T; t++) {
      Z1[t] = i1 * (e1x * X1[t] + e1y * X2[t]);
      Z2[t] = i2 * (e2x * X1[t] + e2y * X2[t]);
    }
    // one-unit fixed point with tanh
    let w0 = Math.cos(0.7), w1 = Math.sin(0.7);
    for (let it = 0; it < 60; it++) {
      let m0 = 0, m1 = 0, mgp = 0;
      for (let t = 0; t < T; t++) {
        const u = w0 * Z1[t] + w1 * Z2[t]; const g = Math.tanh(u), gp = 1 - g * g;
        m0 += Z1[t] * g; m1 += Z2[t] * g; mgp += gp;
      }
      m0 /= T; m1 /= T; mgp /= T;
      let n0 = m0 - mgp * w0, n1b = m1 - mgp * w1; const nn = Math.hypot(n0, n1b) || 1; n0 /= nn; n1b /= nn;
      if (Math.abs(n0 * w0 + n1b * w1) > 0.9999) { w0 = n0; w1 = n1b; break; }
      w0 = n0; w1 = n1b;
    }
    const wa = [w0, w1], wb = [-w1, w0];
    let y1 = new Array(T), y2 = new Array(T);
    for (let t = 0; t < T; t++) { y1[t] = wa[0] * Z1[t] + wa[1] * Z2[t]; y2[t] = wb[0] * Z1[t] + wb[1] * Z2[t]; }
    y1 = standardize(y1); y2 = standardize(y2);

    // match recovered to sources (permutation + sign) for display + score
    const c = [[corr(y1, s1), corr(y1, s2)], [corr(y2, s1), corr(y2, s2)]];
    const permA = (Math.abs(c[0][0]) + Math.abs(c[1][1])) / 2;
    const permB = (Math.abs(c[0][1]) + Math.abs(c[1][0])) / 2;
    let rec1, rec2, score;
    if (permA >= permB) { rec1 = c[0][0] < 0 ? y1.map(v => -v) : y1; rec2 = c[1][1] < 0 ? y2.map(v => -v) : y2; score = permA; }
    else { rec1 = c[1][0] < 0 ? y2.map(v => -v) : y2; rec2 = c[0][1] < 0 ? y1.map(v => -v) : y1; score = permB; }

    sim.current = { s1, s2, X1, X2, rec1, rec2, score };
    offRef.current = 0;
    setTick(t => t + 1);
  }
  _useEffect(() => { reset(); /* eslint-disable-next-line */ }, [mix, kind, seed]);

  _useEffect(() => {
    const tick = () => {
      if (running) offRef.current = (offRef.current + 2) % T;
      draw();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    /* eslint-disable-next-line */
  }, [running, mix, kind]);

  function drawPair(ctx, A, B, x0, y0, w, h, cA, cB, label) {
    ctx.fillStyle = "rgba(148,163,184,0.06)"; ctx.fillRect(x0, y0, w, h);
    ctx.fillStyle = "#94a3b8"; ctx.font = "10px JetBrains Mono"; ctx.fillText(label, x0 + 6, y0 + 13);
    const off = offRef.current, mid = y0 + h / 2, amp = h / 2 - 8;
    const line = (arr, col) => {
      ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = 0; i < WIN; i++) { const v = arr[(off + i) % T]; const x = x0 + (i / (WIN - 1)) * w; const y = mid - Math.max(-2.6, Math.min(2.6, v)) / 2.6 * amp; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    };
    line(A, cA); line(B, cB);
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const st = sim.current; if (!st) return;
    const padX = 16, w = W - 2 * padX, gap = 14;
    const ph = (H - 28 - 2 * gap) / 3, top = 24;
    drawPair(ctx, st.s1, st.s2, padX, top, w, ph, "#34d399", "#22d3ee", "SOURCES  (hidden, what we want back)");
    drawPair(ctx, st.X1, st.X2, padX, top + ph + gap, w, ph, "#f59e0b", "#f87171", "MIXED  (the two microphones)");
    drawPair(ctx, st.rec1, st.rec2, padX, top + 2 * (ph + gap), w, ph, "#34d399", "#22d3ee", "RECOVERED by ICA");
    ctx.fillStyle = "#64748b"; ctx.font = "10px JetBrains Mono";
    ctx.fillText("ICA unmixes the microphones into independent sources (sign/order arbitrary)", padX, H - 6);
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  });

  const st = sim.current;
  const good = st && st.score > 0.9;
  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <Slider label="// MIXING STRENGTH" min={0} max={0.95} step={0.05} value={mix} onChange={setMix} tone="violet"
        help="Off-diagonal of the mixing matrix A=[[1,m],[m,1]]. At 0 the microphones already hold separate sources; raise it to blend them harder. ICA still recovers the sources for any m below 1 (where A becomes singular) — separation quality barely depends on it." />
      <SegmentedControl label="// SOURCES" value={kind} onChange={setKind}
        options={[{ value: "tones", label: "Sine+Square" }, { value: "saw", label: "Sine+Saw" }, { value: "gauss", label: "Two Gaussians" }]}
        help="The two hidden signals. Sine/square/saw are strongly non-Gaussian and separate cleanly. Two Gaussians is the textbook failure case: a mix of Gaussians is Gaussian, so there's no non-Gaussianity for ICA to latch onto and recovery collapses." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setRunning(r => !r)} primary>{running ? "PAUSE" : "RESUME"}</DemoButton>
        <DemoButton onClick={() => setSeed(s => s + 1)}>RESTART</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="RECOVERY (|corr|)" value={st ? st.score.toFixed(2) : "—"} accent={good ? "#34d399" : "#f87171"} />
        <StatReadout label="STATUS" value={st ? (good ? "SEPARATED" : "FAILED") : "—"} accent={good ? "#34d399" : "#f87171"} />
      </div>
      <Legend items={[
        { color: "#34d399", label: "source / recovered 1" },
        { color: "#22d3ee", label: "source / recovered 2" },
        { color: "#f59e0b", label: "microphones" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Top row: two independent signals we pretend not to see. Middle row: each
        microphone hears a different BLEND of both — garbled, and neither one is
        either original. ICA gets only the middle row and must invert the mixing. Its
        trick is statistical: by the Central Limit Theorem a sum of independent things
        looks more bell-shaped (Gaussian) than its parts, so the unmixing directions
        that make the outputs the LEAST Gaussian are the ones that pull the original
        independent signals back apart. The bottom row is what it recovers — flip a
        sign or swap the two and they're the sources again.
      </DemoP>
      <DemoP>
        Mixing strength barely matters: ICA nails it for any invertible mix. What
        matters is non-Gaussianity. Switch SOURCES to "Two Gaussians" and recovery
        collapses to noise (RECOVERY drops, STATUS reads FAILED) — because a mixture
        of Gaussians is itself Gaussian, leaving no non-Gaussian structure to exploit
        and no way to tell the rotation apart. That's ICA's defining rule: it can
        separate at most one Gaussian source. It's also why ICA succeeds where PCA
        can't — PCA only finds uncorrelated, orthogonal directions, while ICA finds
        independent ones, which is a strictly stronger (and non-orthogonal) condition.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Independent Component Analysis is the classic blind source separation method:
        recover hidden signals from observed mixtures with no knowledge of the mixing.
        Its banner uses are the cocktail-party problem (separating voices), and
        removing eye-blink/heartbeat artifacts from EEG and MEG, plus separating
        sources in fMRI and finance. It's a cousin of{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/pca/`} style={{ color: "#a855f7" }}>PCA</a>{" "}
        — both are linear, and ICA literally whitens with PCA first — but PCA
        decorrelates (second-order) while ICA makes components statistically
        independent (all orders), which is why it can unmix what PCA only rotates.
        The frequency-domain view of these same signals is the{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/fourier/`} style={{ color: "#a855f7" }}>Fourier transform</a>.
      </DemoP>
      <DemoP>
        Caveats: ICA recovers sources only up to scale/sign and an arbitrary
        permutation (you can't know which recovered channel is "source 1," or its
        loudness). It assumes the sources are independent, non-Gaussian, and linearly
        mixed; at most one may be Gaussian. The basic model ignores time structure and
        noise, and FastICA can land in different local optima depending on
        initialization. Nonlinear mixing or more sources than sensors need richer
        methods, but for fast linear unmixing FastICA is the workhorse.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="ICA (Cocktail Party)"
      subtitle="Two independent signals get blended into two microphones; ICA unmixes them knowing only the blend, by hunting the directions that make the outputs least Gaussian. Crank the mixing — it still separates. Switch to two Gaussian sources and watch it fail by design."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/unsupervised-learning/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ICADemo />);
