// demos/vector-search.jsx — nearest-neighbor retrieval over a 2D embedding space,
// the engine under semantic search and RAG. Real k-NN with a switchable metric
// (Euclidean vs cosine) so you can feel how the metric changes what's "similar".

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 460, H = 460, SC = 200;
const cx = W / 2, cy = H / 2;
const px = (x) => cx + x * SC, py = (y) => cy - y * SC;
const ix = (sx) => (sx - cx) / SC, iy = (sy) => (cy - sy) / SC;
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const COLORS = ["#60a5fa", "#c084fc", "#34d399", "#f59e0b"];

function genData(n = 140) {
  const centers = [[-0.45, 0.4], [0.5, 0.45], [-0.4, -0.45], [0.5, -0.4]];
  const pts = [];
  for (let i = 0; i < n; i++) { const c = i % centers.length; pts.push({ x: centers[c][0] + gauss() * 0.18, y: centers[c][1] + gauss() * 0.18, cat: c }); }
  return pts;
}

function VectorSearchDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const dataRef = _useRef(genData());
  const [query, setQuery] = _useState({ x: 0.12, y: 0.1 });
  const [k, setK] = _useState(8);
  const [metric, setMetric] = _useState("cosine");
  const [stats, setStats] = _useState({ k: 8, avg: 0 });

  function neighbors() {
    const pts = dataRef.current, q = query;
    const qn = Math.hypot(q.x, q.y) || 1e-9;
    const scored = pts.map((p, i) => {
      let d;
      if (metric === "euclidean") d = Math.hypot(p.x - q.x, p.y - q.y);
      else { const sim = (p.x * q.x + p.y * q.y) / ((Math.hypot(p.x, p.y) || 1e-9) * qn); d = 1 - sim; }
      return { i, d };
    }).sort((a, b) => a.d - b.d);
    return scored.slice(0, k);
  }

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const pts = dataRef.current, q = query;

    ctx.strokeStyle = "rgba(96,165,250,0.1)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();

    const nn = neighbors();
    const nnSet = new Set(nn.map(o => o.i));

    // cosine: ray from origin through query
    if (metric === "cosine") {
      const n = Math.hypot(q.x, q.y) || 1e-9; const ex = q.x / n * 1.4, ey = q.y / n * 1.4;
      ctx.strokeStyle = "rgba(251,191,36,0.25)"; ctx.lineWidth = 1; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(px(0), py(0)); ctx.lineTo(px(ex), py(ey)); ctx.stroke(); ctx.setLineDash([]);
    }

    // links to neighbors
    for (const o of nn) { const p = pts[o.i]; ctx.strokeStyle = "rgba(251,191,36,0.35)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px(q.x), py(q.y)); ctx.lineTo(px(p.x), py(p.y)); ctx.stroke(); }

    // points
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], hit = nnSet.has(i);
      ctx.fillStyle = COLORS[p.cat];
      ctx.globalAlpha = hit ? 1 : 0.5;
      ctx.beginPath(); ctx.arc(px(p.x), py(p.y), hit ? 5 : 3, 0, Math.PI * 2); ctx.fill();
      if (hit) { ctx.globalAlpha = 1; ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 1.5; ctx.stroke(); }
    }
    ctx.globalAlpha = 1;

    // query marker
    ctx.fillStyle = "#fbbf24"; ctx.strokeStyle = "#050816"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(px(q.x), py(q.y), 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    if (metric === "cosine") { ctx.fillStyle = "#e0e7ff"; ctx.beginPath(); ctx.arc(px(0), py(0), 3, 0, Math.PI * 2); ctx.fill(); }

    const avg = nn.reduce((s, o) => s + o.d, 0) / (nn.length || 1);
    setStats({ k: nn.length, avg });
  }

  function onClick(e) {
    const cv = canvasRef.current, r = cv.getBoundingClientRect();
    const sx = (e.clientX - r.left) * (W / r.width), sy = (e.clientY - r.top) * (H / r.height);
    setQuery({ x: ix(sx), y: iy(sy) });
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  }, []);
  _useEffect(() => { draw(); /* eslint-disable-next-line */ }, [query, k, metric]);

  const stage = <canvas ref={canvasRef} onClick={onClick} style={{ maxWidth: "100%", borderRadius: 4, cursor: "crosshair" }} />;
  const controls = (
    <ControlGroup>
      <SegmentedControl label="// METRIC" value={metric} onChange={setMetric}
        options={[{ value: "cosine", label: "Cosine" }, { value: "euclidean", label: "Euclidean" }]}
        help="How 'near' is measured. Cosine ranks by the angle between vectors (ignores magnitude — usual for text embeddings); Euclidean ranks by straight-line distance." />
      <Slider label="// k (NEIGHBORS)" min={1} max={25} value={k} onChange={setK}
        help="How many nearest neighbors to retrieve. Small k is precise but may miss context; large k casts a wider net (more recall, more noise) — the top-k of a RAG retriever." />
      <DemoButton onClick={() => { dataRef.current = genData(); draw(); }} primary>NEW DATA</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="RETRIEVED" value={stats.k} accent="#fbbf24" />
        <StatReadout label={metric === "cosine" ? "AVG 1−SIM" : "AVG DISTANCE"} value={stats.avg.toFixed(3)} />
      </div>
      <Legend items={[{ color: "#fbbf24", label: "QUERY / NEIGHBORS" }, { color: "#60a5fa", label: "CLUSTER A" }, { color: "#c084fc", label: "CLUSTER B" }]} />
      <div className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>Click anywhere to move the query. Cosine ranks by angle from the origin; Euclidean by straight-line distance.</div>
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Semantic search, recommendations, and the retrieval step in <b>RAG</b> all come
        down to the same operation: embed everything as a vector, then find the
        <b> k nearest</b> to your query. Click to drop the query anywhere and watch the
        top-k light up. The <b>metric</b> defines "near": <b>Euclidean</b> distance
        measures straight-line closeness, while <b>cosine</b> similarity measures the
        <i> angle</i> between vectors — ignoring magnitude, which is usually what you
        want for text embeddings.
      </DemoP>
      <DemoP>
        Switch between them with the query near the origin and the retrieved set can
        change completely: cosine pulls in everything along the query's direction (the
        dashed ray), even if it's far away, while Euclidean stays local. Real systems
        run this over millions of vectors using approximate-nearest-neighbor indexes
        (HNSW, IVF) that trade a sliver of accuracy for massive speed — but the idea you
        feel here, ranking by a distance in embedding space, is exactly what they
        accelerate.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        This is the literal engine of modern retrieval: semantic search, recommendation,
        deduplication, and the retrieval step of <b>RAG</b> all embed items as vectors and
        fetch the k nearest to a query. It's why vector databases (Pinecone, Weaviate,
        pgvector, FAISS) exist, and why "embed then retrieve" is the default way to give an
        LLM access to private or up-to-date knowledge.
      </DemoP>
      <DemoP>
        Two practical realities live here. The <b>metric</b> matters — cosine and Euclidean
        can return different neighbors, and most text embeddings are tuned for cosine. And
        exact kNN doesn't scale to millions of vectors, so production uses
        approximate-nearest-neighbor indexes (HNSW graphs, IVF, product quantization) that
        trade a little recall for orders-of-magnitude speed. Retrieval quality — the right
        k, good embeddings, optional reranking — is usually what makes or breaks a RAG
        system, more than the LLM itself.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="RETRIEVAL · RAG" title="Vector Search"
      subtitle="The engine under semantic search and RAG: k-nearest-neighbor retrieval, and how the metric reshapes what counts as similar."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/rag-agents/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<VectorSearchDemo />);
