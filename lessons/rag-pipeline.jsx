// lessons/rag-pipeline.jsx — Module 18-04 - RAG Pipeline End-to-End.
// Full on-site flagship lesson. Loaded by /learn/rag-agents/rag-pipeline/index.html AFTER
// lesson-app.jsx. Sets __DM_LESSON_CONTENT. Assemble retrieval-augmented generation end to end:
// chunk -> embed -> index -> retrieve -> rerank -> grounded generation with citations, then eval.

const {
  LessonSection, P, H3, MathBlock, MathInline, CodeBlock,
  KeyInsight, TryThis, Aside, Warn,
} = window;

function LessonContent() {
  return (
    <>
      <section style={{ padding: "40px 0" }}>
        <div style={{ maxWidth: 920, margin: "0 auto", padding: "0 48px" }}>
          <P>
            A language model only knows what was in its training data, frozen at a point in time, and
            it will confidently make things up. Retrieval-augmented generation fixes both: fetch
            relevant passages from your own corpus at query time and put them in front of the model, so
            its answer is grounded in real, current, citable text. RAG is the most common way LLMs are
            actually deployed in products.
          </P>
          <P>
            This lesson assembles the whole pipeline end to end - indexing a corpus, retrieving for a
            query, optionally reranking, generating a grounded answer with citations, and evaluating
            whether the answer is actually supported. Each stage is one of the demos and sub-lessons in
            this module, wired together.
          </P>
        </div>
      </section>

      {/* ── Part 0 — The architecture ── */}
      <LessonSection n="0" title="The Two Phases" tag="// INDEX, THEN SERVE">
        <P>
          RAG has an offline phase and an online phase. Offline, you turn documents into a searchable
          index once. Online, every query runs retrieve-then-generate. Keeping these separate is what
          makes RAG fast at query time - the expensive embedding of the whole corpus happens ahead of
          time.
        </P>
        <CodeBlock lang="python">{`# offline (once):   docs -> chunks -> embeddings -> vector index
# online (per query): query -> retrieve -> (rerank) -> prompt -> generate -> cite`}</CodeBlock>
      </LessonSection>

      {/* ── Part 1 — Index ── */}
      <LessonSection n="1" title="Build the Index" tag="// CHUNK + EMBED + STORE">
        <P>
          Split each document into chunks small enough to be specific but large enough to stay
          coherent, with a little overlap so answers are not cut at the seams. Embed each chunk into a
          vector and store it in a vector index for fast nearest-neighbor search.
        </P>
        <CodeBlock lang="python">{`def build_index(docs, embed, size=400, overlap=80):
    chunks = []
    for d in docs:
        for i in range(0, len(d.text), size - overlap):
            chunks.append(d.text[i:i + size])
    vectors = embed(chunks)            # (n_chunks, dim)
    return VectorIndex(vectors, chunks)  # HNSW / IVF for sublinear search`}</CodeBlock>
        <Aside title="Chunking is a real knob">
          Too large and a chunk dilutes the relevant sentence with noise; too small and it loses the
          context needed to be retrievable. Chunk size and overlap quietly determine the ceiling on
          retrieval quality - see the chunking sub-lesson for the tradeoff.
        </Aside>
      </LessonSection>

      {/* ── Part 2 — Retrieve ── */}
      <LessonSection n="2" title="Retrieve and Rerank" tag="// FIND WHAT MATTERS">
        <P>
          For a query, embed it the same way and pull the top-k nearest chunks by cosine similarity.
          Fast bi-encoder retrieval is high-recall but coarse, so a common second stage reranks those
          candidates with a slower, more accurate cross-encoder that reads the query and chunk together.
        </P>
        <MathBlock>{`\\text{top-}k\\;\\arg\\max_{c}\\;\\frac{e(q)\\cdot e(c)}{\\|e(q)\\|\\,\\|e(c)\\|} \\;\\longrightarrow\\; \\text{rerank}(q, c)`}</MathBlock>
        <CodeBlock lang="python">{`def retrieve(index, embed, rerank, q, k=20, top=5):
    cands = index.search(embed([q])[0], k)        # cheap recall
    scored = [(rerank(q, c), c) for c in cands]   # accurate reranking
    return [c for _, c in sorted(scored, reverse=True)[:top]]`}</CodeBlock>
        <KeyInsight title="Retrieve broadly, then narrow">
          Recall first, precision second. Pull a generous candidate set cheaply so the right chunk is
          in there at all, then spend the expensive reranker only on that shortlist. Get the recall
          stage wrong and no amount of clever generation can recover - the model never sees the answer.
        </KeyInsight>
      </LessonSection>

      {/* ── Part 3 — Generate ── */}
      <LessonSection n="3" title="Grounded Generation" tag="// CONTEXT + CITE">
        <P>
          Put the retrieved chunks into the prompt and instruct the model to answer using only that
          context and to cite which chunk each claim came from. Grounding plus a citation requirement
          is what turns a fluent guesser into a verifiable assistant.
        </P>
        <CodeBlock lang="python">{`def generate(llm, q, chunks):
    context = "\\n\\n".join(f"[{i}] {c}" for i, c in enumerate(chunks))
    prompt = (f"Answer using ONLY the context. Cite sources as [i].\\n"
              f"Context:\\n{context}\\n\\nQuestion: {q}")
    return llm(prompt)        # answer with [i] citations into the chunks`}</CodeBlock>
        <Warn title="Position matters">
          Models attend unevenly across a long context - facts buried in the middle get overlooked
          (the lost-in-the-middle effect). Put the most relevant chunks first, and do not stuff the
          context with marginal hits; more retrieved text is not always better.
        </Warn>
      </LessonSection>

      {/* ── Part 4 — Evaluate ── */}
      <LessonSection n="4" title="Evaluate" tag="// IS IT ACTUALLY GROUNDED">
        <P>
          RAG fails in two distinct places, and you must measure both. Retrieval quality: was the
          answer-bearing chunk actually retrieved (recall, hit-rate)? Generation faithfulness: does the
          answer only assert things the retrieved context supports, or did the model add unsupported
          claims? An answer can be fluent and well-cited and still be wrong if either stage slipped.
        </P>
        <CodeBlock lang="python">{`# two separate metrics, two separate failure modes
recall    = mean(answer_chunk in retrieved for q in eval_set)   # retrieval
faithful  = mean(every_claim_supported(answer, context))        # generation`}</CodeBlock>
        <TryThis title="Find which stage is failing">
          When an answer is wrong, check the retrieved chunks first. If the right passage was not
          retrieved, fix chunking or retrieval; if it was there but the model ignored or contradicted
          it, fix the prompt, reranking, or context ordering. Most RAG debugging is deciding which of
          the two stages broke.
        </TryThis>
      </LessonSection>

      {/* ── Part 5 — Summary ── */}
      <LessonSection n="5" title="Summary" tag="// TAKEAWAYS">
        <P>
          You assembled a full RAG system: an offline index of embedded chunks, online retrieval with
          optional reranking, grounded generation with citations, and a two-pronged evaluation of
          retrieval recall and generation faithfulness.
        </P>
        <P>
          RAG grounds a model in your own corpus by retrieving relevant chunks at query time and
          generating from them. The pipeline is index once, then retrieve-rerank-generate per query,
          and its quality is gated first by retrieval recall and then by generation faithfulness.
          Get a chunk into the context and cite it, and the model goes from confident guesser to
          verifiable assistant - and adding tools and a loop on top of this is exactly how you get an
          agent.
        </P>
        <Warn title="The one thing to remember">
          A RAG answer is only as good as the chunk you retrieved - debug retrieval before you blame
          the model.
        </Warn>
      </LessonSection>
    </>
  );
}

window.__DM_LESSON_CONTENT = LessonContent;
