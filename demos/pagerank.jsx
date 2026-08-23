// demos/pagerank.jsx — PageRank by power iteration (Page & Brin, 1998).
//
// A page is important if important pages link to it — a recursive definition that
// power iteration resolves. Each step redistributes every node's rank along its
// out-links, mixed with a damping/teleport term:
//   PR_i = (1-d)/N + d · ( Σ_{j->i} PR_j / outdeg_j  +  dangling mass / N )
// This is exactly the stationary distribution of a random surfer who follows a
// link with probability d and teleports to a random page otherwise. Node area is
// proportional to rank; watch the ranks flow toward the hubs and converge. Real
// power iteration on a directed graph.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP, Slider, DemoButton, StatReadout, ControlGroup, useIsMobile,
} = window;

const CW = 300, CH = 250;

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function buildGraph(seed) {
  const rand = rng(seed);
  const N = 9;
  const nodes = [];
  const cx = CW / 2, cy = CH / 2 + 4, R = 96;
  for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2 - Math.PI / 2; nodes.push({ x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R }); }
  const out = Array.from({ length: N }, () => new Set());
  for (let i = 0; i < N; i++) { const k = 1 + Math.floor(rand() * 2); for (let t = 0; t < k; t++) { let j = Math.floor(rand() * N); if (j !== i) out[i].add(j); } }
  // make 2 hubs that many nodes link to
  const hubs = [2, 6];
  for (let i = 0; i < N; i++) if (rand() < 0.55) out[i].add(hubs[Math.floor(rand() * hubs.length)]);
  out[hubs[0]].add(hubs[1]); out[hubs[1]].add(hubs[0]);
  const edges = []; for (let i = 0; i < N; i++) for (const j of out[i]) edges.push([i, j]);
  return { N, nodes, out: out.map(s => [...s]), edges };
}

function PageRankDemo() {
  const cvRef = _useRef(null);
  const mobile = useIsMobile ? useIsMobile() : false;
  const [damping, setDamping] = _useState(0.85);
  const [seed, setSeed] = _useState(3);
  const [running, setRunning] = _useState(true);

  const gRef = _useRef(null), prRef = _useRef(null), dRef = _useRef(damping);
  const [iter, setIter] = _useState(0);
  const [delta, setDelta] = _useState(1);
  _useEffect(() => { dRef.current = damping; }, [damping]);

  function init() { const g = buildGraph(seed * 131 + 7); gRef.current = g; prRef.current = new Array(g.N).fill(1 / g.N); setIter(0); setDelta(1); }

  function step() {
    const g = gRef.current, pr = prRef.current, d = dRef.current, N = g.N;
    const np = new Array(N).fill((1 - d) / N);
    let dangling = 0;
    for (let i = 0; i < N; i++) { if (g.out[i].length === 0) dangling += pr[i]; else { const share = pr[i] / g.out[i].length; for (const j of g.out[i]) np[j] += d * share; } }
    for (let i = 0; i < N; i++) np[i] += d * dangling / N;
    let del = 0; for (let i = 0; i < N; i++) del += Math.abs(np[i] - pr[i]);
    prRef.current = np; setIter(v => v + 1); setDelta(del);
    return del;
  }

  function draw() {
    const cv = cvRef.current; if (!cv) return;
    const ctx = window.fitCanvas(cv, CW, CH); ctx.clearRect(0, 0, CW, CH);
    ctx.fillStyle = "#0b1530"; ctx.fillRect(0, 0, CW, CH);
    const g = gRef.current, pr = prRef.current; if (!g) return;
    const maxPr = Math.max(...pr), top = pr.indexOf(maxPr);
    // edges with arrowheads
    for (const [i, j] of g.edges) {
      const a = g.nodes[i], b = g.nodes[j];
      const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1; const ux = dx / L, uy = dy / L;
      const rt = 8 + (pr[j] / maxPr) * 16; const ex = b.x - ux * rt, ey = b.y - uy * rt; const sx = a.x + ux * (8 + (pr[i] / maxPr) * 16), sy = a.y + uy * (8 + (pr[i] / maxPr) * 16);
      ctx.strokeStyle = "rgba(148,163,184,0.35)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
      // arrowhead
      ctx.fillStyle = "rgba(148,163,184,0.5)"; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - ux * 6 - uy * 3, ey - uy * 6 + ux * 3); ctx.lineTo(ex - ux * 6 + uy * 3, ey - uy * 6 - ux * 3); ctx.closePath(); ctx.fill();
    }
    // nodes sized by rank
    for (let i = 0; i < g.N; i++) {
      const r = 8 + (pr[i] / maxPr) * 16; const n = g.nodes[i];
      ctx.fillStyle = i === top ? "#34d399" : "#a855f7"; ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = "#0a1428"; ctx.font = "bold 9px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText((pr[i] * 100).toFixed(0), n.x, n.y);
    }
  }

  _useEffect(() => { init(); draw(); /* eslint-disable-next-line */ }, [seed]);

  _useEffect(() => {
    if (!running) return;
    let alive = true, raf, last = 0;
    const loop = (t) => {
      if (!alive) return;
      if (t - last > 350) { last = t; const del = step(); draw(); if (del < 1e-5) setRunning(false); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(raf); };
    /* eslint-disable-next-line */
  }, [running]);

  const reset = () => { init(); setRunning(true); setTimeout(draw, 0); };
  const pr = prRef.current || [], top = pr.length ? pr.indexOf(Math.max(...pr)) : 0;

  const stage = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
      <canvas ref={cvRef}
        style={{ width: CW * (mobile ? 1.1 : 1.5), maxWidth: "100%", borderRadius: 6, border: "1px solid var(--border)", background: "#0b1530" }} />
      <span className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>node area ∝ PageRank · numbers are rank ×100 · green = highest</span>
    </div>
  );

  const controls = (
    <ControlGroup>
      <Slider label="// DAMPING d" min={0.05} max={0.95} step={0.05} value={damping} onChange={d => { setDamping(d); setRunning(true); }} tone="violet"
        help="Probability the random surfer follows a link rather than teleporting to a random page. Google's classic value is 0.85. Lower d spreads rank more uniformly (more teleport); higher d concentrates it on well-linked hubs but converges slower." />
      <Slider label="// GRAPH" min={1} max={9} step={1} value={seed} onChange={setSeed} tone="blue"
        help="Resample the directed link structure (with a couple of hub nodes that many others point to). Watch where the rank pools." />
      <div style={{ display: "flex", gap: 8 }}>
        <DemoButton onClick={() => setRunning(r => !r)} primary tone="violet">{running ? "PAUSE" : "ITERATE"}</DemoButton>
        <DemoButton onClick={() => { if (!running) { step(); draw(); } }} disabled={running}>STEP</DemoButton>
        <DemoButton onClick={reset}>RESET</DemoButton>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="ITERATION" value={iter} accent="var(--dim)" />
        <StatReadout label="Δ (CONVERGENCE)" value={delta.toExponential(1)} accent={delta < 1e-4 ? "#34d399" : "#fbbf24"} />
        <StatReadout label="TOP NODE" value={"#" + top} accent="#34d399" />
        <StatReadout label="TOP RANK" value={pr.length ? (pr[top] * 100).toFixed(1) + "%" : "—"} accent="var(--violet-lt)" />
      </div>
    </ControlGroup>
  );

  const explainer = (
    <>
      <DemoP>
        PageRank scores a node by the importance of the nodes pointing to it — a
        circular definition that resolves by iteration. Each step every node hands
        its current rank to the nodes it links to, split evenly across its
        out-links, plus a small uniform <b>teleport</b> term. Repeat and the numbers
        settle: that fixed point is the rank. Node area tracks it live, so you can
        watch importance flow toward the hubs and stabilize.
      </DemoP>
      <DemoP>
        It's literally the stationary distribution of a <b>random surfer</b>: with
        probability <b>d</b> they click a random outgoing link, and with probability
        1−d they jump to a random page. The teleport is what guarantees a unique
        answer — it stops rank from getting trapped in dead ends or cycles (the
        dangling-node problem). Drop <b>d</b> and rank flattens toward uniform; push
        it to 0.85+ and it concentrates on the well-connected nodes but takes more
        iterations to converge, as the Δ readout shows.
      </DemoP>
    </>
  );

  const concepts = (
    <>
      <DemoP>
        PageRank launched Google and remains the template for link-based importance:
        citation ranking, recommendation, fraud and spam detection, and graph-based
        keyword/sentence extraction (TextRank). It's an{" "}
        <b>eigenvector</b> computation — the dominant eigenvector of the damped
        transition matrix — solved by power iteration, the same engine behind{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/pca/`} style={{ color: "#a855f7" }}>PCA</a>{" "}
        and spectral methods.
      </DemoP>
      <DemoP>
        At heart it's a <a href={`${window.__DM_BASE || "../../"}visualize/markov/`} style={{ color: "#a855f7" }}>Markov
        chain</a>'s stationary distribution, with the teleport making the chain
        ergodic so a unique limit exists. The "rank flows along edges and pools at
        well-connected nodes" intuition is also the message-passing idea behind a{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/gnn/`} style={{ color: "#a855f7" }}>graph
        neural network</a> and the label-spreading in{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/label-propagation/`} style={{ color: "#a855f7" }}>label
        propagation</a>.
      </DemoP>
    </>
  );

  return (
    <DemoLayout title="PageRank"
      subtitle="Importance flows along links. Power iteration converges to the random surfer's stationary distribution — and the damping factor is what keeps it well-defined."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<PageRankDemo />);
