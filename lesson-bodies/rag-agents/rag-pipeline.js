// GENERATED from content/lessons/rag-agents/rag-pipeline.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/rag-agents/rag-pipeline/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "rag-pipeline": {
    "interview": {
      "quickGrind": [
        {
          "q": "What are the two phases of RAG?",
          "a": "Indexing, done offline — chunk, embed, store. And querying, done online — embed the question, retrieve, optionally rerank, then generate conditioned on what was retrieved."
        },
        {
          "q": "State the ceiling that governs the whole system.",
          "a": "P(correct) = recall@k * P(correct | evidence present) <= recall@k. A perfect generator cannot exceed the retriever's recall, so retrieval bounds everything downstream."
        },
        {
          "q": "Why is chunking the highest ceiling in the stack?",
          "a": "Because it decides what a retrievable unit even is. An answer split across two chunks may be unreachable no matter how good the retriever, and no downstream stage can recover it."
        },
        {
          "q": "What is small-to-big retrieval?",
          "a": "Retrieve on small precise chunks but return their larger parent for generation. It dissolves the chunking trade-off by separating the retrieval unit from the context unit."
        },
        {
          "q": "Why does hybrid retrieval beat either method alone?",
          "a": "Lexical matching nails exact terms — names, codes, rare tokens — and dense retrieval handles paraphrase. Their failures are largely disjoint, so the union recovers more than either."
        },
        {
          "q": "What does a reranker add that the retriever cannot?",
          "a": "Cross-attention between query and document. The bi-encoder must embed them independently for the index to work, so it cannot model their interaction; the reranker can because it only sees k candidates."
        },
        {
          "q": "Can a reranker fix bad recall?",
          "a": "No — it only reorders what it was given. Reranking means retrieving DEEPER, so the fix for recall is a larger k, not a better reranker."
        },
        {
          "q": "What is ANN recall and why does it matter?",
          "a": "The fraction of true nearest neighbours the index actually returns. It is a tunable operating point, not a fixed property, and it multiplies with retrieval recall to bound the system."
        },
        {
          "q": "What silently breaks recall in production?",
          "a": "Post-filtering. Retrieve top-k then apply a metadata filter and you may be left with almost nothing, with no error anywhere. Filter inside the search instead."
        },
        {
          "q": "Faithful versus correct?",
          "a": "Faithful means supported by the retrieved context; correct means true. The dangerous cell is correct-but-unfaithful — right answer from parametric knowledge, so the pipeline gets credit it did not earn."
        },
        {
          "q": "What is the most-skipped evaluation tier?",
          "a": "Unanswerable questions. Retrieval always returns k chunks, so the model is always shown something plausible, and whether it abstains is untested unless you deliberately test it."
        },
        {
          "q": "How do you find which stage is failing?",
          "a": "Measure them separately. Retrieval recall against known gold chunks, then generation accuracy GIVEN the gold chunks. If the second is high and end-to-end is low, the retriever is the problem."
        }
      ],
      "standard": [
        {
          "q": "Explain the ceiling structure of a RAG pipeline and what follows for where you spend effort.",
          "a": "The system is a chain, and each stage bounds every stage after it, exactly rather than approximately. Chunking decides what units exist to be retrieved; retrieval bounds what the generator can see; and generation quality applies only to what it was given. Writing it out: P(correct) = P(evidence retrieved) * P(correct | evidence), and since the second factor is at most one, recall@k is a hard ceiling. If recall is 0.70, then a flawless generator produces at most 0.70, and every dollar spent on a better model buys a fraction of the remaining 0.30 while the missing 0.30 is untouchable. The practical consequence is that people systematically misallocate here, and the reason is legible: the generator is the visible, expensive, interesting component, so a team debugging poor answers reaches for a better model or better prompts, while the binding constraint sits upstream at the cheapest and least glamorous stage. Chunking in particular is usually chosen once, early, by whoever set up the pipeline, and then never revisited even though it sets the highest ceiling in the stack. So the correct first move on any underperforming RAG system is to MEASURE the stages separately — retrieval recall against gold chunks, and generation accuracy conditioned on gold chunks being supplied — because those two numbers tell you immediately which half of the system to work on, and the answer is very often not the half people are working on.",
          "deepDive": {
            "q": "Does small-to-big really dissolve the chunking trade-off?",
            "a": "It genuinely relaxes it, which is the more accurate claim. The trade-off exists because small chunks embed precisely but carry too little context to answer from, while large chunks carry context but embed diffusely and retrieve poorly. Small-to-big separates the two roles — index the small unit, return the parent — so you get precise retrieval and sufficient context. What remains is that the parent boundary is still a boundary, so an answer spanning two parents is still unreachable, and you have moved the problem up a level rather than removed it. Hierarchical or graph-structured indexes push further, at real complexity cost."
          }
        },
        {
          "q": "Walk through how you would actually evaluate a RAG system.",
          "a": "Component-wise first, end-to-end second, because an end-to-end number cannot tell you what to fix. For retrieval you need gold chunk labels — which questions should be answered by which chunks — and then recall@k is the headline, reported across a sweep of k because it shows you where the ceiling stops moving. Precision matters less than people assume, since a strong generator tolerates some irrelevant context, though there is a limit and it interacts with position. For the ANN index specifically, measure recall against exact search separately, because that is a different recall and a tuned index can quietly be returning 85% of true neighbours. For generation, condition on gold chunks and measure answer accuracy — that isolates the generator from retrieval entirely. Then faithfulness, which is the RAG-specific axis: is every claim in the answer supported by the retrieved context? An LLM judge doing claim-level entailment is the practical approach, with the caveat that it inherits the judge's biases and needs position and length controls. Then the tier that is skipped almost universally: unanswerable questions, where the correct behaviour is abstention. Retrieval always returns k chunks regardless of whether the answer exists, so the model is always shown something plausible-looking, and a pipeline that has never been tested on questions its corpus cannot answer will confidently fabricate — and that failure mode is invisible in every metric above. Finally, end-to-end on a held-out set that reflects real query distribution, reported with the component numbers alongside so a regression can be attributed.",
          "deepDive": {
            "q": "How much can you trust an LLM judge for faithfulness?",
            "a": "Enough to use it as the primary signal, not enough to use it unchecked. It inherits the biases measured elsewhere in the curriculum - position and verbosity in particular - so swap-average over presentation order, which cancels position bias exactly, and control for length. Calibrate it once against a few hundred human-labelled examples so you know its agreement rate, and report that agreement alongside the score, because a faithfulness number from a judge that agrees with humans 70% of the time means something quite different from one that agrees 90% of the time. Claim-level entailment is more reliable than a holistic judgement for the same reason a rubric beats a holistic score in agent evaluation: decomposition removes most of the room for the judge to be swayed by style."
          }
        },
        {
          "q": "How do you choose the retrieval configuration — chunk size, k, hybrid, reranking?",
          "a": "Empirically, and in an order that respects the ceilings. Start with chunking, since it sets the highest ceiling: try a few sizes with overlap, and evaluate by retrieval recall on your own gold set rather than by intuition, because the right size is a property of your documents and your questions — dense reference material chunks differently from narrative. Use small-to-big if the retrieval-versus-context tension is the binding one. Then hybrid: run BM25 and dense side by side and fuse, typically with reciprocal rank fusion since it needs no score calibration between two incomparable scales. The gain is real and comes specifically from disjoint failure modes — exact identifiers and rare terms for lexical, paraphrase and synonymy for dense — so measure the union's recall rather than assuming. Then k, which is the cheapest lever on the ceiling: raising k monotonically raises recall and costs context tokens and latency, so push it as far as the generator's usable window allows. Then reranking, which is what makes a large k affordable — retrieve 50 or 100 broadly, rerank with a cross-encoder, pass the top 5 to the generator. That ordering is the point: the reranker's value is that it lets you retrieve DEEPER without drowning the generator, not that it improves what a shallow retrieval found. And check the position effect at the end, since models attend better to the start and end of the context, so putting the highest-ranked chunks at the edges rather than the middle is a free improvement."
        },
        {
          "q": "Your RAG system gives a fluent, confident, wrong answer. Diagnose it.",
          "a": "Work the chain in order, because each stage has a distinct signature. First, was the evidence retrieved at all? Look at the actual retrieved chunks for that query. If the gold chunk is absent, this is a retrieval failure and nothing downstream matters — check whether it is a chunking problem, where the answer spans a boundary and no single chunk contains it, or an embedding problem, where the query and document use different vocabulary and dense retrieval missed it while BM25 would not have. Second, if the evidence WAS retrieved, the generator ignored it, which points at position — check where in the context the gold chunk sat, since the middle is where models lose things — or at a conflict, where the model's parametric knowledge disagrees with the context and it went with its prior, which is common for facts the model saw often in pretraining and which have since changed. Third, check whether the answer is unfaithful in the specific sense of being fabricated from nothing, which is the abstention failure: if the corpus does not contain the answer and the system has never been trained or prompted to say so, this is the expected behaviour and the fix is an explicit abstention path plus a retrieval-confidence threshold. Fourth, the boring one that is worth checking early: is the index stale, or is the filter excluding the right document? A post-filter that silently emptied the candidate set produces exactly this symptom with no error anywhere. The general habit is that fluent-and-wrong means the generator is working and its grounding is not, so every check should target the grounding rather than the model."
        },
        {
          "q": "When is RAG the wrong architecture?",
          "a": "Several cases, and being able to name them is what distinguishes a considered answer. When the knowledge is small and stable, put it in the prompt — a system prompt containing the entire policy document is simpler, has no retrieval failure mode, and benefits from prefix caching. When the task needs the whole corpus rather than a few passages — summarize everything, count occurrences across documents, find the trend — retrieval is structurally wrong because there is no small set of chunks that answers it, and you want aggregation, a database query, or a long-context pass. When the requirement is a behaviour or a format rather than a fact, fine-tuning is the right tool: RAG supplies knowledge, not style, and teams routinely reach for RAG when their actual problem is that the model does not answer in the shape they want. When queries are highly structured and the data is tabular, text-to-SQL over a real database beats embedding rows, because the operation needed is a join or an aggregate rather than a similarity search. And when latency is very tight, since retrieval plus reranking plus a longer prompt adds up and a distilled model with the knowledge baked in may be the only thing that fits. The honest general statement is that RAG is the right answer when the knowledge is large, changing, and needs provenance — those three together are what it is uniquely good at, and if only one of them holds it is worth checking whether something simpler applies."
        },
        {
          "q": "What does RAG give you that a long-context model does not, and vice versa?",
          "a": "RAG's advantages are cost, scale and provenance. Cost, because attending over 4k relevant tokens is far cheaper per query than 100k, and that difference is the entire economics at volume. Scale, because a corpus can be arbitrarily large — no context window holds a company's document store, and the index grows without changing the per-query cost. Provenance, because you know which documents were used and can cite them, which is frequently a hard requirement in regulated settings rather than a nice-to-have. And updatability: re-index a changed document and the system knows about it immediately, with no retraining and no prompt changes. Long context's advantages are the mirror image: no chunking, so no boundary can split an answer and no retriever can fail to find it; the ability to handle material that genuinely resists decomposition, such as a contract whose later clauses modify earlier ones or a codebase where the relevant definition is several files away; and one fewer component to build, tune and monitor. The synthesis, which is what production actually does, is that they compose rather than compete. Retrieval reduces what enters the window; a long window then lets retrieval be generous — top-50 rather than top-5 — which directly raises the recall ceiling that bounds the whole system. So long context does not replace RAG; it makes RAG's hardest constraint cheaper to satisfy."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "The RAG ceiling",
        "back": "P(correct) = recall@k * P(correct | evidence) <= recall@k. A perfect generator cannot exceed the retriever's recall."
      },
      {
        "type": "intuition",
        "front": "Where the ceilings stack",
        "back": "Chunking bounds retrieval bounds generation. The highest ceiling is the cheapest, least glamorous stage — which is why effort is systematically misallocated downstream."
      },
      {
        "type": "definition",
        "front": "Small-to-big retrieval",
        "back": "Index small precise chunks, return their larger parent for generation. Separates the retrieval unit from the context unit."
      },
      {
        "type": "intuition",
        "front": "Why hybrid retrieval wins",
        "back": "Lexical handles exact identifiers and rare terms; dense handles paraphrase. Their failures are largely disjoint, so the union recovers more."
      },
      {
        "type": "intuition",
        "front": "What a reranker can and cannot do",
        "back": "It adds query-document cross-attention, but only reorders what it was given. It makes a LARGER k affordable; it cannot fix recall."
      },
      {
        "type": "definition",
        "front": "Faithful vs correct",
        "back": "Faithful = supported by the context; correct = true. Correct-but-unfaithful is the dangerous cell — the pipeline gets credit for parametric knowledge."
      },
      {
        "type": "intuition",
        "front": "Isolating the failing stage",
        "back": "Retrieval recall against gold chunks, then generation accuracy GIVEN gold chunks. Two numbers that immediately name which half to fix."
      },
      {
        "type": "definition",
        "front": "Reciprocal rank fusion",
        "back": "Combines rankings without needing score calibration between incomparable scales — which is why it is the default for hybrid retrieval."
      },
      {
        "type": "pitfall",
        "front": "Post-filtering",
        "back": "Retrieve top-k then filter by metadata and you may be left with nearly nothing, with no error raised. Filter inside the search."
      },
      {
        "type": "pitfall",
        "front": "Never testing unanswerable questions",
        "back": "Retrieval always returns k chunks, so the model is always shown something plausible. Untested abstention means confident fabrication in production."
      },
      {
        "type": "pitfall",
        "front": "Ignoring position in the context",
        "back": "Models attend better to the start and end. Placing top-ranked chunks at the edges rather than the middle is a free improvement."
      },
      {
        "type": "pitfall",
        "front": "Using RAG for behaviour",
        "back": "RAG supplies knowledge, not style or format. Teams reach for it when their real problem is that the model does not answer in the shape they want."
      }
    ],
    "refs": [
      {
        "title": "Lewis et al. (2020) — Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
        "url": "https://arxiv.org/abs/2005.11401"
      },
      {
        "title": "Karpukhin et al. (2020) — Dense Passage Retrieval for Open-Domain Question Answering",
        "url": "https://arxiv.org/abs/2004.04906"
      },
      {
        "title": "Liu et al. (2023) — Lost in the Middle: How Language Models Use Long Contexts",
        "url": "https://arxiv.org/abs/2307.03172"
      },
      {
        "title": "Es et al. (2023) — RAGAS: Automated Evaluation of Retrieval Augmented Generation",
        "url": "https://arxiv.org/abs/2309.15217"
      },
      {
        "title": "Cormack, Clarke & Buettcher (2009) — Reciprocal Rank Fusion",
        "url": "https://dl.acm.org/doi/10.1145/1571941.1572114"
      }
    ],
    "demos": []
  }
};
