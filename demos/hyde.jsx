// demos/hyde.jsx — Hypothetical Document Embeddings (HyDE) for retrieval.
//
// Questions and documents don't embed to the same place: a query like "what
// causes X?" lands in a different region than the passages that answer it
// (query/document asymmetry). HyDE (Gao et al., 2022) fixes this by having the
// model first draft a HYPOTHETICAL answer — even a factually wrong one — which,
// being shaped like a document, embeds near the real answer passages. You then
// retrieve by the hypothetical's embedding instead of the bare query.
//
// 2D embedding space: four topic clusters of documents, one relevant to the
// query. The violet query sits offset from the relevant (green) cluster; the
// amber HyDE point is the centroid of M drafted answers, which lands inside it.
// Toggle the retrieval source and compare how many of the top-k are relevant.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const W = 540, H = 480;
const CL_COLORS = ["#34d399", "#60a5fa", "#c084fc", "#fb923c"];
const CENTERS = [[-0.62, 0.55], [0.66, 0.58], [-0.6, -0.55], [0.64, -0.5]];
const REL = 0, PER_CLUSTER = 6;

const cx = (x) => 40 + ((x + 1.3) / 2.6) * (W - 80);
const cy = (y) => 44 + ((1.1 - y) / 2.2) * (H - 150);
function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;

function HydeDemo() {
  const canvasRef = _useRef(null);
  const dprRef = _useRef(1);
  const docsRef = _useRef([]);
  const hypsRef = _useRef([]);

  const [asym, setAsym] = _useState(0.6);
  const [M, setM] = _useState(3);
  const [noise, setNoise] = _useState(0.3);
  const [k, setK] = _useState(5);
  const [method, setMethod] = _useState("hyde");
  const [, force] = _useState(0);

  function genDocs() {
    const docs = [];
    CENTERS.forEach((c, ci) => {
      for (let i = 0; i < PER_CLUSTER; i++) docs.push({ p: [c[0] + 0.13 * randn(), c[1] + 0.13 * randn()], cl: ci });
    });
    docsRef.current = docs;
  }
  function genHyps() {
    const rc = CENTERS[REL], hyps = [];
    for (let i = 0; i < M; i++) {
      if (Math.random() < 0.15) {            // occasional hallucination toward a wrong cluster
        const wc = CENTERS[1 + ((Math.random() * 3) | 0)];
        hyps.push([wc[0] + noise * 0.3 * randn(), wc[1] + noise * 0.3 * randn()]);
      } else {
        hyps.push([rc[0] + noise * 0.38 * randn(), rc[1] + noise * 0.38 * randn()]);
      }
    }
    hypsRef.current = hyps;
  }
  function resample() { genDocs(); genHyps(); force(x => x + 1); }

  _useEffect(() => { if (!docsRef.current.length) genDocs(); genHyps(); force(x => x + 1); /* eslint-disable-next-line */ }, [M, noise]);

  // query point: offset from the relevant cluster toward the origin (the "question region")
  const rc = CENTERS[REL];
  const dlen = Math.hypot(rc[0], rc[1]) || 1;
  const qDir = [-rc[0] / dlen, -rc[1] / dlen];
  const query = [rc[0] + asym * 0.95 * qDir[0], rc[1] + asym * 0.95 * qDir[1]];
  const hyps = hypsRef.current;
  const hydeCentroid = hyps.length
    ? [hyps.reduce((a, h) => a + h[0], 0) / hyps.length, hyps.reduce((a, h) => a + h[1], 0) / hyps.length]
    : query;

  const docs = docsRef.current;
  const topKFor = (src) => docs.map((d, i) => ({ i, dd: dist2(d.p, src) })).sort((a, b) => a.dd - b.dd).slice(0, k).map(o => o.i);
  const topQuery = topKFor(query), topHyde = topKFor(hydeCentroid);
  const relIn = (idxs) => idxs.filter(i => docs[i].cl === REL).length;
  const activeTop = method === "hyde" ? topHyde : topQuery;
  const activeSrc = method === "hyde" ? hydeCentroid : query;

  function draw() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "11px JetBrains Mono"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("EMBEDDING SPACE  ·  4 topic clusters · green = relevant to the query", 20, 24);

    const topSet = new Set(activeTop);
    // connectors from retrieval source to its top-k
    activeTop.forEach(i => {
      ctx.strokeStyle = "rgba(226,232,240,0.18)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx(activeSrc[0]), cy(activeSrc[1])); ctx.lineTo(cx(docs[i].p[0]), cy(docs[i].p[1])); ctx.stroke();
    });
    // docs
    docs.forEach((d, i) => {
      const r = topSet.has(i) ? 6 : 4;
      ctx.fillStyle = CL_COLORS[d.cl];
      ctx.globalAlpha = d.cl === REL ? 0.95 : 0.5;
      ctx.beginPath(); ctx.arc(cx(d.p[0]), cy(d.p[1]), r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      if (topSet.has(i)) { ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx(d.p[0]), cy(d.p[1]), 8, 0, Math.PI * 2); ctx.stroke(); }
    });
    // hypothetical drafts + centroid
    hyps.forEach(h => { ctx.fillStyle = "rgba(251,191,36,0.5)"; ctx.beginPath(); ctx.arc(cx(h[0]), cy(h[1]), 3, 0, Math.PI * 2); ctx.fill(); });
    ctx.fillStyle = "#fbbf24"; ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx(hydeCentroid[0]), cy(hydeCentroid[1]), 7, 0, Math.PI * 2); ctx.stroke();
    ctx.fillText("HyDE", cx(hydeCentroid[0]) + 10, cy(hydeCentroid[1]) + 4);
    // query (diamond)
    const qx = cx(query[0]), qy = cy(query[1]);
    ctx.fillStyle = "#a855f7";
    ctx.beginPath(); ctx.moveTo(qx, qy - 7); ctx.lineTo(qx + 7, qy); ctx.lineTo(qx, qy + 7); ctx.lineTo(qx - 7, qy); ctx.closePath(); ctx.fill();
    ctx.fillText("query", qx + 10, qy + 4);

    // ── bottom: precision@k comparison ──
    const bY = H - 84;
    ctx.fillStyle = "#94a3b8"; ctx.fillText("RELEVANT IN TOP-" + k + "  (higher = better retrieval)", 20, bY - 6);
    const bar = (yy, label, hits, color) => {
      const full = (W - 40 - 150);
      ctx.fillStyle = "rgba(148,163,184,0.15)"; ctx.fillRect(150, yy, full, 18);
      ctx.fillStyle = color; ctx.fillRect(150, yy, full * (hits / k), 18);
      ctx.fillStyle = "#94a3b8"; ctx.font = "10px JetBrains Mono"; ctx.fillText(label, 20, yy + 13);
      ctx.fillStyle = "#e2e8f0"; ctx.fillText(hits + "/" + k, 150 + full * (hits / k) + 6, yy + 13);
    };
    bar(bY + 4, "query-only", relIn(topQuery), "rgba(168,85,247,0.8)");
    bar(bY + 30, "HyDE (" + M + " drafts)", relIn(topHyde), "rgba(251,191,36,0.85)");
  }

  _useEffect(() => {
    const cv = canvasRef.current, dpr = window.devicePixelRatio || 1;
    dprRef.current = dpr; cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    draw();
  });

  const stage = <canvas ref={canvasRef} style={{ maxWidth: "100%", borderRadius: 4 }} />;
  const controls = (
    <ControlGroup>
      <SegmentedControl label="// RETRIEVE BY" tone="violet" value={method} onChange={setMethod}
        options={[{ value: "query", label: "Query only" }, { value: "hyde", label: "HyDE" }]}
        help="Which embedding to search with: the raw query, or the centroid of the drafted hypothetical answers. The white rings + lines show the top-k for the active choice; the bottom bars always compare both." />
      <Slider label="// QUERY-DOC ASYMMETRY" min={0} max={1} step={0.05} value={asym} onChange={setAsym} tone="violet"
        help="How far the question embeds from the passages that answer it. At 0 the query sits right on the relevant cluster and you barely need HyDE; crank it up and the bare query drifts toward other clusters and query-only retrieval starts grabbing the wrong documents." />
      <Slider label="// HYPOTHETICAL DRAFTS (M)" min={1} max={6} step={1} value={M} onChange={setM}
        help="How many hypothetical answers the model drafts and embeds. Averaging several drafts cancels the noise (and the occasional hallucinated draft that lands in the wrong cluster), so the HyDE point sits more reliably inside the relevant region." />
      <Slider label="// DRAFT NOISE" min={0.05} max={1} step={0.05} value={noise} onChange={setNoise}
        help="How scattered each drafted answer is around the true topic — a stand-in for model quality and sampling temperature. High noise spreads the drafts out, so you need more of them to pin down the relevant cluster." />
      <Slider label="// TOP-K" min={1} max={8} step={1} value={k} onChange={setK}
        help="How many nearest documents are retrieved. Larger k is more forgiving but pulls in more distractors and spends more context downstream." />
      <DemoButton onClick={resample} primary>RESAMPLE</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="QUERY-ONLY" value={relIn(topQuery) + "/" + k} accent="#a855f7" />
        <StatReadout label="HyDE" value={relIn(topHyde) + "/" + k} accent="#fbbf24" />
      </div>
      <Legend items={[
        { color: "#34d399", label: "relevant docs" },
        { color: "#a855f7", label: "query embedding" },
        { color: "#fbbf24", label: "HyDE drafts + centroid" },
        { color: "#60a5fa", label: "other-topic docs" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        The trap in dense retrieval: a <i>question</i> and its <i>answer</i> don't
        embed to the same spot. The violet query lands in a "question" region
        offset from the green passages that actually answer it, so searching by the
        bare query (the purple bar) drags in neighbors from the wrong clusters as
        you raise the asymmetry. HyDE sidesteps this: the model writes a
        hypothetical answer, which — being phrased like a document — embeds right
        into the green cluster (the amber point), and you retrieve by <i>that</i>.
      </DemoP>
      <DemoP>
        It works even when the hypothetical is factually wrong, because retrieval
        only needs it to be in the right neighborhood, not correct. Watch the
        amber drafts: one occasionally hallucinates into a wrong cluster, but
        averaging several (raise M) cancels the strays and locks the HyDE point
        onto the relevant docs — so the HyDE bar stays high exactly where the
        query-only bar falls apart.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        HyDE (Gao et al., 2022) is a query-transformation step that sits in front
        of normal dense retrieval. It pairs with the rest of the RAG stack:{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/embeddings/`} style={{ color: "#a855f7" }}>embeddings</a>{" "}
        and{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/vector-search/`} style={{ color: "#a855f7" }}>vector
        search</a> do the lookup, <a href={`${window.__DM_BASE || "../../"}visualize/rag-chunking/`} style={{ color: "#a855f7" }}>chunking</a>{" "}
        decides what's in the index, and HyDE reshapes the <i>query side</i> so it
        lands where the answers live. It's one of a family — multi-query expansion,
        RAG-Fusion, step-back prompting — all spending a cheap extra LLM call to
        make retrieval hit.
      </DemoP>
      <DemoP>
        The tradeoffs the demo makes tangible: HyDE costs a generation per query
        (latency) and can backfire when the model has no idea what a plausible
        answer looks like (its drafts scatter, the centroid drifts). It shines on
        the asymmetric, jargon-light queries where the bare question is a poor
        search key — and degrades gracefully toward plain retrieval as the
        asymmetry shrinks, which is why you tune it per workload rather than
        switching it on blindly.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="AGENTS / LLM OPS" title="HyDE — Hypothetical Document Embeddings"
      subtitle="Questions embed away from their answers. Draft a hypothetical answer, embed that instead, and retrieval lands on the right documents."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/rag-agents/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<HydeDemo />);
