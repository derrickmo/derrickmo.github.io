// demos/kmeans.jsx — K-Means clustering visualizer (Lloyd's algorithm).
// Alternates assign / update phases live; random vs k-means++ init.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 380;
const PALETTE = ["#60a5fa", "#c084fc", "#34d399", "#fbbf24", "#f87171", "#22d3ee"];
const rnd = (a, b) => a + Math.random() * (b - a);
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

function genBlobs(n = 150) {
  const k = 3 + Math.floor(Math.random() * 2);
  const centers = Array.from({ length: k }, () => ({ x: rnd(70, W - 70), y: rnd(60, H - 60) }));
  return Array.from({ length: n }, () => {
    const c = centers[Math.floor(Math.random() * k)];
    return { x: c.x + gauss() * 34, y: c.y + gauss() * 34, c: -1 };
  });
}
function genUniform(n = 150) {
  return Array.from({ length: n }, () => ({ x: rnd(30, W - 30), y: rnd(30, H - 30), c: -1 }));
}

function KMeansDemo() {
  const canvasRef = _useRef(null);
  const ptsRef = _useRef(genBlobs());
  const cenRef = _useRef([]);
  const rafRef = _useRef(null);
  const lastRef = _useRef(0);
  const dprRef = _useRef(1);

  const [k, setK] = _useState(3);
  const [initM, setInitM] = _useState("kpp");
  const [speed, setSpeed] = _useState(3);
  const [running, setRunning] = _useState(false);
  const [phase, setPhase] = _useState("assign");
  const [iters, setIters] = _useState(0);
  const [inertia, setInertia] = _useState(0);
  const [status, setStatus] = _useState("IDLE");

  const kRef = _useRef(k), phaseRef = _useRef(phase), speedRef = _useRef(speed);
  _useEffect(() => { kRef.current = k; }, [k]);
  _useEffect(() => { phaseRef.current = phase; }, [phase]);
  _useEffect(() => { speedRef.current = speed; }, [speed]);

  function nearest(p, cs) {
    let bi = 0, bd = Infinity;
    for (let i = 0; i < cs.length; i++) {
      const d = (p.x - cs[i].x) ** 2 + (p.y - cs[i].y) ** 2;
      if (d < bd) { bd = d; bi = i; }
    }
    return [bi, bd];
  }
  function initCentroids() {
    const pts = ptsRef.current, K = kRef.current;
    let cs = [];
    if (initM === "random") {
      const shuffled = [...pts].sort(() => Math.random() - 0.5);
      cs = shuffled.slice(0, K).map(p => ({ x: p.x, y: p.y }));
    } else { // k-means++
      cs = [{ x: pts[Math.floor(Math.random() * pts.length)].x, y: pts[Math.floor(Math.random() * pts.length)].y }];
      while (cs.length < K) {
        const d2 = pts.map(p => nearest(p, cs)[1]);
        const sum = d2.reduce((a, b) => a + b, 0) || 1;
        let r = Math.random() * sum, idx = 0;
        for (let i = 0; i < d2.length; i++) { r -= d2[i]; if (r <= 0) { idx = i; break; } }
        cs.push({ x: pts[idx].x, y: pts[idx].y });
      }
    }
    cenRef.current = cs;
    pts.forEach(p => { p.c = -1; });
  }
  function assignAll() {
    const pts = ptsRef.current, cs = cenRef.current;
    let inert = 0;
    pts.forEach(p => { const [bi, bd] = nearest(p, cs); p.c = bi; inert += bd; });
    setInertia(Math.round(inert / 1000));
  }
  function updateAll() {
    const pts = ptsRef.current, cs = cenRef.current;
    let maxMove = 0;
    cs.forEach((c, i) => {
      const members = pts.filter(p => p.c === i);
      if (!members.length) return;
      const nx = members.reduce((a, p) => a + p.x, 0) / members.length;
      const ny = members.reduce((a, p) => a + p.y, 0) / members.length;
      maxMove = Math.max(maxMove, Math.hypot(nx - c.x, ny - c.y));
      c.x = nx; c.y = ny;
    });
    return maxMove;
  }
  function step() {
    if (phaseRef.current === "assign") {
      assignAll(); phaseRef.current = "update"; setPhase("update"); setStatus("UPDATING"); draw(); return false;
    } else {
      const m = updateAll(); setIters(v => v + 1);
      phaseRef.current = "assign"; setPhase("assign"); draw();
      if (m < 0.5) { setStatus("CONVERGED"); return true; }
      setStatus("ASSIGNING"); return false;
    }
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // points
    ptsRef.current.forEach(p => {
      ctx.fillStyle = p.c < 0 ? "rgba(148,163,184,0.55)" : PALETTE[p.c % PALETTE.length];
      ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
    });
    // centroids
    cenRef.current.forEach((c, i) => {
      const col = PALETTE[i % PALETTE.length];
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(c.x, c.y, 9, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(c.x, c.y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(c.x - 4, c.y); ctx.lineTo(c.x + 4, c.y); ctx.moveTo(c.x, c.y - 4); ctx.lineTo(c.x, c.y + 4); ctx.stroke();
    });
  }

  function reseed(gen) { setRunning(false); ptsRef.current = gen(); initCentroids(); setIters(0); setInertia(0); phaseRef.current = "assign"; setPhase("assign"); setStatus("IDLE"); draw(); }
  function handleReset() { setRunning(false); initCentroids(); setIters(0); setInertia(0); phaseRef.current = "assign"; setPhase("assign"); setStatus("IDLE"); draw(); }
  function handleRun() { if (running) { setRunning(false); return; } if (status === "CONVERGED" || status === "IDLE") { /* keep state, just resume */ } setRunning(true); }
  function handleStep() { if (running) return; step(); }

  function onDown(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / (rect.width / W);
    const y = (e.clientY - rect.top) / (rect.height / H);
    ptsRef.current.push({ x, y, c: -1 });
    if (cenRef.current.length) { const p = ptsRef.current[ptsRef.current.length - 1]; p.c = nearest(p, cenRef.current)[0]; }
    draw();
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    initCentroids(); draw();
  }, []);

  _useEffect(() => {
    if (!running) return;
    let alive = true;
    const loop = (t) => {
      if (!alive) return;
      if (t - lastRef.current > 1000 / speedRef.current) { lastRef.current = t; const done = step(); if (done) { setRunning(false); return; } }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, [running]);

  const stage = (
    <canvas ref={canvasRef} onPointerDown={onDown}
      style={{ touchAction: "none", cursor: "crosshair", maxWidth: "100%", borderRadius: 4 }} />
  );

  const controls = (
    <ControlGroup>
      <Slider label="// CLUSTERS (k)" min={2} max={6} value={k} onChange={v => { setRunning(false); setK(v); }}
        help="How many cluster centers to fit. K-Means makes you choose k up front — too few merges groups, too many splits them; the inertia readout helps you judge." />
      <SegmentedControl label="// INITIALIZATION" tone="violet" value={initM} onChange={v => { setRunning(false); setInitM(v); }}
        options={[{ value: "kpp", label: "K-Means++" }, { value: "random", label: "Random" }]}
        help="How the starting centroids are placed. K-Means++ spreads them apart for faster, better convergence; Random can drop two in one blob and get stuck in a poor solution." />
      <Slider label="// SPEED" min={1} max={10} value={speed} onChange={setSpeed} suffix=" /s"
        help="Assign/update steps per second. Visual pacing only — it does not change where the clusters end up." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={handleRun} primary>{running ? "PAUSE" : "RUN"}</DemoButton>
        <DemoButton onClick={handleStep} disabled={running}>STEP</DemoButton>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={handleReset}>RE-SEED CENTROIDS</DemoButton>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => reseed(genBlobs)} tone="violet">NEW BLOBS</DemoButton>
        <DemoButton onClick={() => reseed(genUniform)}>UNIFORM</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="ITERATION" value={iters} />
        <StatReadout label="INERTIA (k)" value={inertia} accent="var(--violet-lt)" />
      </div>
      <StatReadout label="STATUS" value={status} accent={status === "CONVERGED" ? "#34d399" : "var(--blue-lt)"} />
      <Legend items={[{ color: "rgba(148,163,184,0.6)", label: "UNASSIGNED" }, { color: "#60a5fa", label: "POINT" }, { color: "#fff", label: "CENTROID", border: "1px solid #fff" }]} />
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>Tip: click the canvas to add points.</div>
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        K-Means looks for <i>k</i> cluster centers by repeating two steps until
        nothing moves. <b>Assign:</b> color each point by its nearest centroid.
        <b> Update:</b> move each centroid to the mean of the points assigned to it.
        That's Lloyd's algorithm — each round can only lower the total within-cluster
        distance (the <i>inertia</i> shown here), so it always converges, though not
        always to the globally best clustering.
      </DemoP>
      <DemoP>
        Initialization matters. Plain <b>random</b> seeds can land two centroids in
        one blob and get stuck; <b>k-means++</b> spreads the initial centroids out by
        sampling far-apart points, which usually converges faster and to a better
        solution. Re-seed a few times on the same data to watch it find different
        local optima.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        K-Means is the default first pass for unsupervised grouping: customer and market
        segmentation, image color quantization, grouping documents or embeddings into
        topics, and as a cheap way to compress data or initialize a heavier model. It's
        also the canonical example of the <i>alternate-and-converge</i> (EM-style) loop —
        guess assignments, refit parameters, repeat — that reappears throughout ML.
      </DemoP>
      <DemoP>
        Its limitations teach the field's nuance. K-Means assumes round, similar-size
        clusters and a chosen k, which is exactly what <b>Gaussian mixtures</b> (soft,
        elliptical clusters), <b>DBSCAN</b> (density-based, arbitrary shapes), and the
        elbow/silhouette methods for picking k were built to address. And the "result
        depends on initialization" lesson — with <b>k-means++</b> as the standard fix — is
        the same trap you face in any non-convex optimization.
      </DemoP>
    </>
  );
  return (
    <DemoLayout
      topic="UNSUPERVISED LEARNING"
      title="K-Means Clustering"
      subtitle="Lloyd's algorithm, live. Watch centroids and assignments alternate until the clusters lock in."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials"
      tone="violet"
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<KMeansDemo />);
