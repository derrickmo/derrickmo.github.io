// demos/rag-reranker.jsx — two-stage retrieval: bi-encoder recall + cross-encoder rerank.
//
// First-stage retrieval is cheap and lexical (a bi-encoder / TF-IDF here): fast
// over a whole corpus, but it ranks by surface overlap and underrates docs that
// are relevant in meaning, not words. A reranker (a cross-encoder that reads the
// query and doc *together*) re-scores the small candidate pool much closer to
// true relevance and reorders it. We grade each doc's true relevance (0/1/2),
// retrieve by TF-IDF, then rerank by a noisy estimate of the true grade, and show
// nDCG jump as the high-relevance docs the lexical stage buried float to the top.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, Legend, ControlGroup,
} = window;

const QUERY = "how do transformers process very long sequences";
const CORPUS = [
  { t: "Self-attention lets every token attend to all others in the sequence", rel: 2 },
  { t: "Rotary embeddings encode relative position so models extrapolate to long inputs", rel: 2 },
  { t: "The context window caps how many tokens a model can read at once", rel: 2 },
  { t: "Sparse and sliding-window attention cut the quadratic cost on long inputs", rel: 1 },
  { t: "FlashAttention tiles the computation to fit long sequences in memory", rel: 1 },
  { t: "Tokenizers split raw text into subword units before the model", rel: 0 },
  { t: "Gradient descent updates parameters to minimize a loss function", rel: 0 },
  { t: "Batch normalization stabilizes the training of deep networks", rel: 0 },
  { t: "A confusion matrix breaks a classifier's errors down by class", rel: 0 },
];
const STOP = new Set("how do a an the to of in on with for is are very and at".split(" "));
const norm = (w) => w.toLowerCase().replace(/[^a-z]/g, "");
function tf(s) { const m = new Map(); s.split(/\s+/).forEach(w => { const t = norm(w); if (t.length < 2 || STOP.has(t)) return; m.set(t, (m.get(t) || 0) + 1); }); return m; }
const DTF = CORPUS.map(d => tf(d.t));
const DF = (() => { const df = new Map(); DTF.forEach(m => m.forEach((_, t) => df.set(t, (df.get(t) || 0) + 1))); return df; })();
const idf = (t) => Math.log(1 + CORPUS.length / (DF.get(t) || CORPUS.length));
const DNORM = DTF.map(m => { let s = 0; m.forEach((c, t) => { const w = c * idf(t); s += w * w; }); return Math.sqrt(s) || 1; });
function biScore() { const q = tf(QUERY); let qn = 0; q.forEach((c, t) => { const w = c * idf(t); qn += w * w; }); qn = Math.sqrt(qn) || 1; return DTF.map((m, i) => { let dot = 0; q.forEach((c, t) => { if (m.has(t)) dot += (c * idf(t)) * (m.get(t) * idf(t)); }); return dot / (DNORM[i] * qn); }); }
const BI = biScore();
function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function ndcg(order, k) {
  let dcg = 0; for (let i = 0; i < Math.min(k, order.length); i++) dcg += CORPUS[order[i]].rel / Math.log2(i + 2);
  const ideal = CORPUS.map(d => d.rel).sort((a, b) => b - a);
  let idcg = 0; for (let i = 0; i < k; i++) idcg += (ideal[i] || 0) / Math.log2(i + 2);
  return idcg ? dcg / idcg : 0;
}

function RagRerankerDemo() {
  const [poolK, setPoolK] = _useState(6);
  const [finalN, setFinalN] = _useState(4);
  const [quality, setQuality] = _useState(0.85);
  const ceRef = _useRef(null);
  const [, force] = _useState(0);
  function genCE() { ceRef.current = CORPUS.map(d => d.rel + (1 - quality) * 1.6 * randn()); force(v => v + 1); }
  _useEffect(() => { genCE(); /* eslint-disable-next-line */ }, [quality]);

  const retrieved = BI.map((s, i) => ({ i, s })).sort((a, b) => b.s - a.s).map(o => o.i);
  const pool = retrieved.slice(0, poolK);
  const ce = ceRef.current || CORPUS.map(d => d.rel);
  const reranked = [...pool].sort((a, b) => ce[b] - ce[a]);
  const ndcgBi = ndcg(retrieved, finalN);
  const ndcgRe = ndcg(reranked.concat(retrieved.filter(i => !pool.includes(i))), finalN);

  const relCol = (r) => r === 2 ? "#34d399" : r === 1 ? "#60a5fa" : "#94a3b8";
  const chip = (i, n) => (
    <div key={n} style={{ display: "flex", alignItems: "center", gap: 6, margin: "3px 0" }}>
      <span style={{ width: 16, color: "#64748b", fontSize: 10, fontFamily: "var(--f-mono)" }}>{n + 1}</span>
      <span style={{ flex: 1, fontSize: 11, padding: "3px 7px", borderRadius: 4, background: `${relCol(CORPUS[i].rel)}1e`, border: `1px solid ${relCol(CORPUS[i].rel)}55`, color: "var(--white)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{CORPUS[i].t}</span>
    </div>
  );

  const stage = (
    <div style={{ width: "100%" }}>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>Query: <span style={{ color: "var(--white)" }}>"{QUERY}"</span> · relevance: <span style={{ color: "#34d399" }}>high</span> / <span style={{ color: "#60a5fa" }}>some</span> / <span style={{ color: "#94a3b8" }}>none</span></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--violet-lt)", fontFamily: "var(--f-mono)", marginBottom: 4 }}>1 · BI-ENCODER (lexical, top {poolK})</div>
          {pool.map((i, n) => chip(i, n))}
        </div>
        <div>
          <div style={{ fontSize: 11, color: "#34d399", fontFamily: "var(--f-mono)", marginBottom: 4 }}>2 · CROSS-ENCODER RERANK (top {finalN})</div>
          {reranked.slice(0, finalN).map((i, n) => chip(i, n))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 28, marginTop: 14, alignItems: "center" }}>
        <div><div style={{ fontSize: 11, color: "var(--muted)" }}>nDCG@{finalN} retrieval</div><div style={{ fontSize: 22, fontWeight: 600, fontFamily: "var(--f-display)", color: "#94a3b8" }}>{ndcgBi.toFixed(2)}</div></div>
        <div style={{ fontSize: 20, color: "#64748b" }}>→</div>
        <div><div style={{ fontSize: 11, color: "var(--muted)" }}>nDCG@{finalN} reranked</div><div style={{ fontSize: 22, fontWeight: 600, fontFamily: "var(--f-display)", color: ndcgRe >= ndcgBi ? "#34d399" : "#fbbf24" }}>{ndcgRe.toFixed(2)}</div></div>
      </div>
    </div>
  );

  const controls = (
    <ControlGroup>
      <Slider label="// CANDIDATE POOL (top-k)" min={3} max={9} step={1} value={poolK} onChange={setPoolK} tone="violet"
        help="How many docs the cheap first stage hands to the reranker. Larger pool = better recall (the reranker can rescue more buried relevant docs) but more expensive cross-encoder calls. The classic recall-then-precision split." />
      <Slider label="// FINAL N" min={2} max={6} step={1} value={finalN} onChange={setFinalN}
        help="How many reranked docs you actually pass to the model. nDCG is measured at this cutoff — reranking's win shows most at small N, where ordering matters." />
      <Slider label="// RERANKER QUALITY" min={0.3} max={1} step={0.05} value={quality} onChange={setQuality}
        help="How close the cross-encoder's scores are to true relevance. At 1 it sorts the pool perfectly; lower quality adds noise. A reranker only helps if it's genuinely better than the first-stage ranker — and it's bounded by what the pool contains." />
      <DemoButton onClick={genCE} primary>RESAMPLE RERANKER</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="nDCG RETRIEVE" value={ndcgBi.toFixed(2)} accent="#94a3b8" />
        <StatReadout label="nDCG RERANK" value={ndcgRe.toFixed(2)} accent={ndcgRe >= ndcgBi ? "#34d399" : "#fbbf24"} />
      </div>
      <Legend items={[
        { color: "#34d399", label: "highly relevant" },
        { color: "#60a5fa", label: "somewhat" },
        { color: "#94a3b8", label: "irrelevant" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Production retrieval is two stages for a reason. The first stage (a
        bi-encoder, or the lexical TF-IDF here) embeds queries and documents
        separately, so it's cheap enough to scan the whole corpus — but it ranks by
        surface similarity and tends to bury documents that are relevant in meaning
        rather than wording. Look at the left column: a couple of highly-relevant
        docs (green) sit low because they share few exact query terms.
      </DemoP>
      <DemoP>
        The reranker is a cross-encoder: it feeds the query and a candidate document
        through the model <i>together</i>, so it can judge true relevance far more
        precisely — but at the cost of one model call per candidate, which is why it
        only ever runs on the small top-k pool. Reorder by its scores and the green
        docs jump to the top; nDCG climbs from the retrieval value to the reranked
        one. Shrink RERANKER QUALITY and the gain fades — a reranker only helps if
        it's actually smarter than the stage feeding it.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Retrieve-then-rerank is the backbone of modern RAG and search. Stage one
        maximizes recall cheaply (dense bi-encoders, BM25, or the{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/multi-query/`} style={{ color: "#a855f7" }}>multi-query
        fusion</a> from the last demo); stage two maximizes precision with a slow,
        accurate cross-encoder (or an LLM grader) over the shortlist. Splitting
        recall from precision is what makes high-quality retrieval affordable at
        corpus scale, and it pairs with{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/rag-chunking/`} style={{ color: "#a855f7" }}>chunking</a>{" "}
        and HyDE in the pipeline.
      </DemoP>
      <DemoP>
        The ceiling is the catch: the reranker can only reorder what the first stage
        retrieved, so a relevant doc missing from the pool is lost no matter how good
        the reranker — which is exactly why pool size (recall) and reranker quality
        (precision) are the two knobs here. In practice rerankers are distilled
        cross-encoders or LLM listwise rankers, and the same idea — cheap candidate
        generation then expensive scoring — recurs in recommenders and even
        speculative decoding.
      </DemoP>
    </>
  );
  return (
    <DemoLayout title="RAG Reranker"
      subtitle="Cheap lexical retrieval buries semantically-relevant docs; a cross-encoder reranker re-scores the shortlist and floats them back to the top. Watch nDCG jump."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/rag-agents/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<RagRerankerDemo />);
