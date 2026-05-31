// demos/multi-query.jsx — multi-query retrieval + Reciprocal Rank Fusion.
//
// One phrasing of a question retrieves one slice of the relevant docs; a
// different phrasing catches others. Multi-query generates several variants of
// the query, retrieves a ranked list for each (real TF-IDF cosine over a small
// corpus), and fuses them with Reciprocal Rank Fusion:
//     RRF(d) = Σ_variants 1 / (K + rank_v(d)).
// Docs ranked high across many phrasings float to the top, so fused recall beats
// the best single query — the workhorse behind RAG-Fusion and query expansion.

const { useRef: _useRef, useState: _useState, useEffect: _useEffect } = React;
const {
  DemoLayout, DemoP,
  Slider, DemoButton, StatReadout, ControlGroup, Legend,
} = window;

const DOCS = [
  "Add L2 weight decay to penalize large weights and regularize the model",
  "Dropout randomly disables neurons during training to prevent co-adaptation",
  "Early stopping halts training when the validation loss stops improving",
  "Collecting more training data improves generalization to unseen examples",
  "Data augmentation expands the dataset with transformed copies of inputs",
  "Batch normalization stabilizes and speeds up deep network training",
  "Gradient descent updates parameters along the steepest descent direction",
  "Transformers use self-attention to model long-range dependencies in text",
  "A confusion matrix summarizes a classifier's errors broken down by class",
];
const GOLD = new Set([0, 1, 2, 3, 4]);
const VARIANTS = [
  "how to prevent overfitting in a model",
  "regularization techniques like weight decay",
  "improve generalization to unseen validation data",
  "stop the network memorizing training data with dropout",
  "expand the dataset with augmentation and more data",
];
const STOP = new Set("a an and the to of in on with for is are how like".split(" "));
const norm = (w) => w.toLowerCase().replace(/[^a-z]/g, "");
function tf(text) { const m = new Map(); text.split(/\s+/).forEach(w => { const t = norm(w); if (t.length < 2 || STOP.has(t)) return; m.set(t, (m.get(t) || 0) + 1); }); return m; }
const DOC_TF = DOCS.map(tf);
const DF = (() => { const df = new Map(); DOC_TF.forEach(m => m.forEach((_, t) => df.set(t, (df.get(t) || 0) + 1))); return df; })();
const idf = (t) => Math.log(1 + DOCS.length / (DF.get(t) || DOCS.length));
const DOC_NORM = DOC_TF.map(m => { let s = 0; m.forEach((c, t) => { const w = c * idf(t); s += w * w; }); return Math.sqrt(s) || 1; });
function rank(query) {
  const q = tf(query); let qn = 0; q.forEach((c, t) => { const w = c * idf(t); qn += w * w; }); qn = Math.sqrt(qn) || 1;
  const sims = DOC_TF.map((m, i) => { let dot = 0; q.forEach((c, t) => { if (m.has(t)) dot += (c * idf(t)) * (m.get(t) * idf(t)); }); return { i, s: dot / (DOC_NORM[i] * qn) }; });
  return sims.sort((a, b) => b.s - a.s).map(o => o.i);
}

function MultiQueryDemo() {
  const [nv, setNv] = _useState(3);
  const [topk, setTopk] = _useState(4);
  const [rrfK, setRrfK] = _useState(30);
  const [, force] = _useState(0);

  const variants = VARIANTS.slice(0, nv);
  const rankings = variants.map(rank);
  // RRF fuse
  const rrf = new Array(DOCS.length).fill(0);
  rankings.forEach(r => r.forEach((doc, idx) => { rrf[doc] += 1 / (rrfK + idx + 1); }));
  const fused = rrf.map((s, i) => ({ i, s })).sort((a, b) => b.s - a.s).map(o => o.i);
  const recallAt = (order) => [...order.slice(0, topk)].filter(i => GOLD.has(i)).length / GOLD.size;
  const bestSingle = Math.max(...rankings.map(recallAt));
  const fusedRecall = recallAt(fused);

  const chip = (i, key) => (
    <span key={key} style={{ display: "inline-block", margin: "2px 3px", padding: "2px 7px", borderRadius: 4, fontSize: 11, fontFamily: "var(--f-mono)", background: GOLD.has(i) ? "rgba(52,211,153,0.18)" : "rgba(148,163,184,0.1)", color: GOLD.has(i) ? "#34d399" : "#94a3b8", border: `1px solid ${GOLD.has(i) ? "#34d39955" : "var(--border)"}` }}>D{i}</span>
  );

  const stage = (
    <div style={{ width: "100%" }}>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
        Question: <span style={{ color: "var(--white)" }}>"how do I reduce overfitting?"</span> · 9 docs, {GOLD.size} relevant (green) · top-{topk} per list
      </div>
      {variants.map((v, vi) => (
        <div key={vi} style={{ borderLeft: "2px solid var(--violet-lt)", paddingLeft: 8, marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: "var(--violet-lt)", fontFamily: "var(--f-mono)" }}>Q{vi + 1}: <span style={{ color: "var(--muted)" }}>{v}</span></div>
          <div>{rankings[vi].slice(0, topk).map((d, j) => chip(d, j))}<span style={{ fontSize: 10, color: "#64748b", marginLeft: 4 }}>recall {(recallAt(rankings[vi]) * 100).toFixed(0)}%</span></div>
        </div>
      ))}
      <div style={{ marginTop: 10, padding: "8px 10px", border: "1px solid #34d399", borderRadius: 8, background: "rgba(52,211,153,0.07)" }}>
        <div style={{ fontSize: 11, color: "#34d399", fontFamily: "var(--f-mono)" }}>RRF FUSED  ·  RRF(d) = Σ 1/(K + rank)</div>
        <div>{fused.slice(0, topk).map((d, j) => chip(d, j))}</div>
      </div>
      <div style={{ display: "flex", gap: 24, marginTop: 12, alignItems: "center" }}>
        <div><div style={{ fontSize: 11, color: "var(--muted)" }}>best single query</div><div style={{ fontSize: 22, fontWeight: 600, fontFamily: "var(--f-display)", color: "#94a3b8" }}>{(bestSingle * 100).toFixed(0)}%</div></div>
        <div style={{ fontSize: 20, color: "#64748b" }}>→</div>
        <div><div style={{ fontSize: 11, color: "var(--muted)" }}>fused recall@{topk}</div><div style={{ fontSize: 22, fontWeight: 600, fontFamily: "var(--f-display)", color: fusedRecall >= bestSingle ? "#34d399" : "#fbbf24" }}>{(fusedRecall * 100).toFixed(0)}%</div></div>
      </div>
    </div>
  );

  const controls = (
    <ControlGroup>
      <Slider label="// QUERY VARIANTS" min={1} max={5} step={1} value={nv} onChange={setNv} tone="violet"
        help="How many rephrasings of the question to generate and retrieve with. Each phrasing emphasizes different terms, so it catches a different slice of the relevant docs — more variants generally means higher fused recall (up to a point)." />
      <Slider label="// TOP-K" min={2} max={6} step={1} value={topk} onChange={setTopk}
        help="How many docs each list contributes / the cutoff at which recall is measured. Smaller k is stricter — that's where fusion's advantage over a single query shows most." />
      <Slider label="// RRF CONSTANT (K)" min={5} max={80} step={5} value={rrfK} onChange={setRrfK}
        help="Smoothing in Reciprocal Rank Fusion: 1/(K + rank). Larger K flattens the contribution of top ranks (more democratic across variants); smaller K lets a #1 hit dominate. 60 is the classic default." />
      <DemoButton onClick={() => force(x => x + 1)} primary>REFRESH</DemoButton>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="BEST SINGLE" value={(bestSingle * 100).toFixed(0) + "%"} accent="#94a3b8" />
        <StatReadout label="FUSED" value={(fusedRecall * 100).toFixed(0) + "%"} accent={fusedRecall >= bestSingle ? "#34d399" : "#fbbf24"} />
      </div>
      <Legend items={[
        { color: "#34d399", label: "relevant doc" },
        { color: "#94a3b8", label: "irrelevant doc" },
      ]} />
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        Retrieval is brittle to wording. "Reduce overfitting", "regularization
        techniques", and "improve generalization" are the same question, but each
        phrasing shares different keywords with different documents, so each
        retrieves a different — and incomplete — set of the relevant ones. Look at
        the per-variant recall: no single query finds everything. Multi-query turns
        that bug into a feature by asking several ways at once.
      </DemoP>
      <DemoP>
        Reciprocal Rank Fusion then merges the lists without needing comparable
        scores: each doc earns 1/(K + its rank) from every variant and the sums are
        re-sorted. A document that lands near the top for several phrasings
        accumulates a high RRF score even if no single query ranked it first, so the
        fused list (green box) pulls in relevant docs the individual queries missed
        — fused recall meets or beats the best single query. Add variants and watch
        the gap.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        Multi-query retrieval and RAG-Fusion are query-transformation techniques:
        spend a cheap LLM call to rewrite the query into several variants, retrieve
        for each, and fuse. Reciprocal Rank Fusion (Cormack et al., 2009) is the
        standard combiner precisely because it's score-agnostic — it works across
        retrievers with incomparable scores (dense, sparse/BM25, different
        embedders), which makes it the glue of hybrid search too. It sits beside{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/hyde/`} style={{ color: "#a855f7" }}>HyDE</a>{" "}
        and <a href={`${window.__DM_BASE || "../../"}visualize/rag-chunking/`} style={{ color: "#a855f7" }}>chunking</a>{" "}
        in the RAG toolbox.
      </DemoP>
      <DemoP>
        The win is recall — surfacing relevant context a single query would miss —
        at the cost of extra LLM calls (the rewrites) and more retrieval, plus a
        longer candidate list that usually feeds a reranker before the model. The
        same fuse-many-rankings idea (step-back prompting, sub-question
        decomposition, ensembling retrievers) recurs throughout retrieval and search;
        RRF is just the simplest, most robust way to combine them.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="AGENTS / LLM OPS" title="Multi-Query & RAG-Fusion"
      subtitle="One phrasing misses docs another catches. Retrieve with several query variants and fuse the ranked lists by reciprocal rank — recall beats any single query."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/rag-agents/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<MultiQueryDemo />);
