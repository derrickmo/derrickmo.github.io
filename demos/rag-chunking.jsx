// demos/rag-chunking.jsx — how chunking decides whether RAG retrieval works.
//
// A fixed document is split into chunks (fixed-window or sentence-aware, with a
// size and overlap you control). A preset query is matched against every chunk
// with REAL TF-IDF cosine similarity (df computed across the chunks), and the
// top-k chunks are "retrieved". Each preset query has a known answer span; the
// demo checks whether that span survives intact inside a retrieved chunk.
//
// The lesson: too-small chunks split a fact across a boundary (no single chunk
// holds the whole answer), too-large chunks dilute the match (the answer's chunk
// is buried under unrelated text and drops in rank), and overlap / sentence-aware
// splitting are the fixes. No canvas — this one is all text.

const { useState: _useState } = React;
const {
  DemoLayout, DemoP,
  Slider, SegmentedControl, Toggle, StatReadout, ControlGroup, useIsMobile,
} = window;

const SENTENCES = [
  "Retrieval-augmented generation connects a language model to an external corpus so it can answer from sources it was never trained on.",
  "The corpus is first split into chunks, and each chunk is embedded into a vector that captures its meaning.",
  "At query time the question is embedded with the same encoder, and the nearest chunks by cosine similarity are retrieved.",
  "The retrieved chunks are concatenated into the prompt as context, and the model generates an answer grounded in them.",
  "Chunk size is the central tradeoff: large chunks dilute the embedding with unrelated text, while tiny chunks split a single fact across boundaries.",
  "Overlap between consecutive chunks lets a fact that straddles a boundary survive in at least one chunk.",
  "A reranker can reorder the retrieved chunks with a slower cross-encoder before they reach the model.",
  "Because attention degrades in the middle of long contexts, the most relevant chunk is often placed first or last in the prompt.",
  "Hybrid search blends dense vector similarity with sparse keyword matching like BM25 to catch exact terms.",
  "Evaluating retrieval uses recall at k, while answer quality is judged against ground-truth responses.",
];

// preset queries -> the sentence index whose span answers them
const QUERIES = [
  { value: "overlap", label: "What does overlap do?", text: "what does chunk overlap do for a fact at a boundary", ans: 5 },
  { value: "retrieve", label: "How are chunks retrieved?", text: "how are the nearest chunks retrieved at query time by similarity", ans: 2 },
  { value: "placement", label: "Why place a chunk first/last?", text: "why is the most relevant chunk placed first or last in the prompt", ans: 7 },
  { value: "reranker", label: "What does a reranker do?", text: "what does a reranker cross encoder do to retrieved chunks", ans: 6 },
];

const STOP = new Set("a an and are as at be by for from in into is it its of on or so that the their them they to was while with can".split(" "));

// flatten sentences into words, tracking each sentence's word range
const WORDS = [];
const SENT_RANGE = [];
SENTENCES.forEach(s => {
  const start = WORDS.length;
  s.split(/\s+/).forEach(w => WORDS.push(w));
  SENT_RANGE.push([start, WORDS.length]);
});
const NW = WORDS.length;
const norm = (w) => w.toLowerCase().replace(/[^a-z]/g, "");

function buildChunks(size, overlap, sentenceAware) {
  const chunks = [];
  if (sentenceAware) {
    let i = 0;
    while (i < SENT_RANGE.length) {
      const start = SENT_RANGE[i][0];
      let j = i, end = SENT_RANGE[i][1];
      while (j + 1 < SENT_RANGE.length && SENT_RANGE[j + 1][1] - start <= size) { j++; end = SENT_RANGE[j][1]; }
      chunks.push([start, end]);
      i = overlap > 0 ? Math.max(i + 1, j) : j + 1;   // overlap => repeat the last sentence
    }
  } else {
    const step = Math.max(1, size - overlap);
    for (let s = 0; s < NW; s += step) {
      const e = Math.min(s + size, NW);
      chunks.push([s, e]);
      if (e >= NW) break;
    }
  }
  return chunks;
}

function termFreq(start, end) {
  const tf = new Map();
  for (let i = start; i < end; i++) { const t = norm(WORDS[i]); if (t.length < 2 || STOP.has(t)) continue; tf.set(t, (tf.get(t) || 0) + 1); }
  return tf;
}

function retrieve(chunks, queryText) {
  const tfs = chunks.map(([s, e]) => termFreq(s, e));
  // document frequency across chunks
  const df = new Map();
  tfs.forEach(tf => tf.forEach((_, t) => df.set(t, (df.get(t) || 0) + 1)));
  const idf = (t) => Math.log(1 + chunks.length / (df.get(t) || chunks.length));
  // query vector
  const qtf = new Map();
  queryText.split(/\s+/).forEach(w => { const t = norm(w); if (t.length < 2 || STOP.has(t)) return; qtf.set(t, (qtf.get(t) || 0) + 1); });
  const qVec = new Map(); let qNorm = 0;
  qtf.forEach((c, t) => { const w = c * idf(t); qVec.set(t, w); qNorm += w * w; });
  qNorm = Math.sqrt(qNorm) || 1;
  // cosine per chunk
  return tfs.map((tf) => {
    let dot = 0, n = 0;
    tf.forEach((c, t) => { const w = c * idf(t); n += w * w; if (qVec.has(t)) dot += w * qVec.get(t); });
    n = Math.sqrt(n) || 1;
    return dot / (n * qNorm);
  });
}

function RagChunkingDemo() {
  const isMobile = useIsMobile ? useIsMobile() : false;
  const [queryId, setQueryId] = _useState("overlap");
  const [size, setSize] = _useState(18);
  const [overlap, setOverlap] = _useState(0);
  const [topK, setTopK] = _useState(2);
  const [sentenceAware, setSentenceAware] = _useState(false);

  const query = QUERIES.find(q => q.value === queryId);
  const [aStart, aEnd] = SENT_RANGE[query.ans];
  const chunks = buildChunks(size, overlap, sentenceAware);
  const sims = retrieve(chunks, query.text);
  const ranked = sims.map((sim, i) => ({ i, sim })).sort((a, b) => b.sim - a.sim);
  const topSet = new Set(ranked.slice(0, topK).map(r => r.i));
  const maxSim = Math.max(...sims, 1e-6);

  const fullyContains = (c) => c[0] <= aStart && c[1] >= aEnd;
  const answerInChunk = (c) => c[1] > aStart && c[0] < aEnd; // any overlap with the answer span
  const retrievedHasFull = [...topSet].some(i => fullyContains(chunks[i]));
  const anyChunkHasFull = chunks.some(fullyContains);

  let verdict, vColor, vMsg;
  if (retrievedHasFull) { verdict = "✓ answer fully contained in a retrieved chunk"; vColor = "#34d399";
    vMsg = "Retrieval succeeds: a top-k chunk holds the entire answer span, so the model gets the full fact as context."; }
  else if (!anyChunkHasFull) { verdict = "✗ answer split across chunk boundaries"; vColor = "#f87171";
    vMsg = "No single chunk contains the whole answer — the fact was cut in half. Add overlap, or turn on sentence-aware chunking, so the span survives intact."; }
  else { verdict = "✗ the right chunk exists but wasn't retrieved"; vColor = "#fbbf24";
    vMsg = "A chunk does hold the full answer, but it ranked below the top-k. Often a too-large chunk diluted its score, or a keyword-heavy distractor outranked it — try a smaller chunk, more overlap, or a larger k."; }

  const chunkCards = chunks.map(([cs, ce], idx) => {
    const retrieved = topSet.has(idx);
    const rank = ranked.findIndex(r => r.i === idx) + 1;
    const simPct = (sims[idx] / maxSim) * 100;
    const words = [];
    for (let i = cs; i < ce; i++) {
      const inAns = i >= aStart && i < aEnd;
      words.push(
        <span key={i} style={inAns ? { background: "rgba(52,211,153,0.22)", borderBottom: "2px solid #34d399", borderRadius: 2 } : null}>
          {WORDS[i]}{i < ce - 1 ? " " : ""}
        </span>
      );
    }
    return (
      <div key={idx} style={{
        border: `1px solid ${retrieved ? "var(--blue-lt)" : "var(--border)"}`,
        background: retrieved ? "rgba(59,130,246,0.08)" : "rgba(148,163,184,0.04)",
        borderRadius: 8, padding: "10px 12px", marginBottom: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
          <span className="t-mono-s" style={{ color: "var(--muted)" }}>CHUNK {idx + 1}</span>
          <span className="t-mono-s" style={{ color: retrieved ? "var(--blue-lt)" : "var(--muted)" }}>· rank #{rank}</span>
          {retrieved && <span className="t-mono-s" style={{ color: "var(--blue-lt)", border: "1px solid var(--blue-lt)", borderRadius: 4, padding: "1px 6px" }}>RETRIEVED</span>}
          {fullyContains([cs, ce]) && <span className="t-mono-s" style={{ color: "#34d399" }}>✓ holds answer</span>}
          {!fullyContains([cs, ce]) && answerInChunk([cs, ce]) && <span className="t-mono-s" style={{ color: "#f87171" }}>partial answer</span>}
          <span style={{ flex: 1 }} />
          <span className="t-mono-s" style={{ color: "var(--muted)" }}>{sims[idx].toFixed(3)}</span>
        </div>
        <div style={{ height: 4, background: "rgba(148,163,184,0.15)", borderRadius: 2, marginBottom: 8 }}>
          <div style={{ height: "100%", width: `${simPct}%`, background: retrieved ? "var(--blue-lt)" : "var(--muted)", borderRadius: 2 }} />
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--white)" }}>{words}</div>
      </div>
    );
  });

  const stage = (
    <div style={{ width: "100%" }}>
      <div style={{ marginBottom: 12, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, background: "rgba(168,85,247,0.06)" }}>
        <span className="t-mono-s" style={{ color: "var(--violet-lt)" }}>QUERY</span>
        <div style={{ fontSize: 14, marginTop: 4 }}>{query.label}</div>
      </div>
      <div style={{ marginBottom: 14, padding: "8px 12px", borderRadius: 8, border: `1px solid ${vColor}`, background: `${vColor}14` }}>
        <div className="t-mono-s" style={{ color: vColor }}>{verdict}</div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, lineHeight: 1.45 }}>{vMsg}</div>
      </div>
      <div className="t-mono-s" style={{ color: "var(--muted)", marginBottom: 8 }}>
        {chunks.length} CHUNKS · top {topK} retrieved by TF-IDF cosine · green = answer span
      </div>
      {chunkCards}
    </div>
  );

  const controls = (
    <ControlGroup>
      <SegmentedControl label="// QUERY" tone="violet" value={queryId} onChange={setQueryId}
        options={QUERIES.map(q => ({ value: q.value, label: q.label }))}
        help="Pick a question. Each one is answered by a specific sentence in the document (the green span); the demo checks whether your chunking keeps that sentence intact and retrievable." />
      <Slider label="// CHUNK SIZE (words)" min={6} max={70} step={2} value={size} onChange={setSize}
        help="Max words per chunk. Small chunks slice facts across boundaries; large chunks bury the answer among unrelated sentences and dilute its similarity score. Watch the verdict flip as you sweep it." />
      <Slider label="// OVERLAP (words)" min={0} max={30} step={2} value={overlap} onChange={setOverlap}
        help="How many words consecutive chunks share. Overlap lets a fact that straddles a boundary appear whole in at least one chunk — the cheapest fix for split answers. (In sentence-aware mode, any overlap > 0 repeats the previous sentence.)" />
      <Toggle label="// SENTENCE-AWARE" checked={sentenceAware} onChange={setSentenceAware}
        help="On: chunk on sentence boundaries so a sentence is never cut mid-fact (packing whole sentences up to the size limit). Off: a blind fixed word window that will happily split a sentence — and an answer — in two." />
      <Slider label="// TOP-K" min={1} max={4} step={1} value={topK} onChange={setTopK}
        help="How many of the highest-scoring chunks are sent to the model. Larger k is more forgiving of imperfect chunking but spends more of the context window (and invites lost-in-the-middle)." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatReadout label="CHUNKS" value={chunks.length} />
        <StatReadout label="RETRIEVED OK" value={retrievedHasFull ? "YES" : "NO"} accent={retrievedHasFull ? "#34d399" : "#f87171"} />
      </div>
    </ControlGroup>
  );
  const explainer = (
    <>
      <DemoP>
        RAG only answers as well as it retrieves, and retrieval only works if the
        answer survives chunking. Each card is one chunk; the bar is its TF-IDF
        cosine similarity to the query, and the top-k by score are marked
        RETRIEVED. The green span is the sentence that actually answers the
        question. The whole game is getting that green span to sit, intact, inside
        a retrieved chunk.
      </DemoP>
      <DemoP>
        Shrink the chunk size until a fact gets cut across two chunks — now
        "✓ holds answer" disappears from every card and retrieval brings back only
        a fragment. Add overlap and the span reappears whole in a boundary chunk.
        Grow the chunk size instead and the answer's chunk fills with unrelated
        sentences, its score drops, and a snappier but wrong chunk can outrank it.
        Sentence-aware chunking sidesteps the mid-sentence cuts entirely.
      </DemoP>
    </>
  );
  const concepts = (
    <>
      <DemoP>
        This is the retrieval stage of a RAG pipeline, the piece sitting between{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/embeddings/`} style={{ color: "#a855f7" }}>embeddings</a>{" "}
        and{" "}
        <a href={`${window.__DM_BASE || "../../"}visualize/vector-search/`} style={{ color: "#a855f7" }}>vector
        search</a>: those demos cover how text becomes a vector and how nearest
        neighbors are found, while chunking decides what each vector represents in
        the first place. Real systems use recursive/semantic splitters, 10–20%
        overlap, and a reranker — but the size-vs-dilution tension you're feeling
        here never goes away.
      </DemoP>
      <DemoP>
        It connects straight to context engineering. Retrieved chunks compete for
        a finite context window, and because attention degrades in the middle of
        long inputs ("lost in the middle"), placement and k matter as much as the
        match score. Production RAG is evaluated in two halves — retrieval recall
        at k (did the right chunk come back?) and answer faithfulness (did the
        model use it?) — and chunking is the single cheapest lever on the first.
      </DemoP>
    </>
  );
  return (
    <DemoLayout topic="RAG / RETRIEVAL" title="RAG Chunking"
      subtitle="Chunk size, overlap, and strategy decide whether the answer survives retrieval. Real TF-IDF cosine over the chunks — watch the verdict flip."
      stage={stage} controls={controls} explainer={explainer} concepts={concepts}
      lessonHref={`${window.__DM_BASE || "../../"}learn/rag-agents/`}
      repoHref="https://github.com/derrickmo/machine_learning_tutorials" tone="violet" />
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<RagChunkingDemo />);
