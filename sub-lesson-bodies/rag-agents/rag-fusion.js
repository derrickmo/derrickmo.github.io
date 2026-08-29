// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/rag-agents/rag-fusion/.
// concept-lesson-app.jsx reads window.DM_SUBLESSON_CTX and falls back to
// window.DM_SUBLESSON(...) so the page still works if this file is ever missing.

window.DM_SUBLESSON_CTX = {
  "module": {
    "title": "RAG and Agents",
    "lessons": {
      "rag-chunking": {
        "title": "Chunking for Retrieval"
      },
      "hyde": {
        "title": "HyDE"
      },
      "reranking": {
        "title": "Reranking"
      },
      "react-agent": {
        "title": "The ReAct Agent Loop"
      },
      "self-consistency": {
        "title": "Self-Consistency"
      },
      "reflection": {
        "title": "Reflection"
      },
      "prompt-injection": {
        "title": "Prompt Injection"
      },
      "rag-fusion": {
        "title": "Multi-Query & RAG-Fusion"
      }
    }
  },
  "moduleSlug": "rag-agents",
  "conceptId": "rag-fusion",
  "lesson": {
    "title": "Multi-Query & RAG-Fusion",
    "oneLine": "Ask the question several ways and fuse the rankings — where using ranks instead of scores is what makes fusing incompatible retrievers possible at all.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "A single query embedding is one point in space, and the passage that answers it may be phrased quite differently. Multi-query retrieval has the language model rewrite the question into several paraphrases — different vocabulary, different specificity, sometimes a decomposition into sub-questions — retrieves for each, and combines the results.",
          "The combination step is where RAG-Fusion differs from plain multi-query. Rather than concatenating and deduplicating, it fuses the ranked lists with reciprocal rank fusion, which scores each document by the sum over lists of one divided by a constant plus its rank in that list.",
          "The reason to use ranks rather than scores is not aesthetic. Scores from different retrievers are not comparable: BM25 returns unbounded positive numbers, a cosine similarity lives in a narrow band near one, and a cross-encoder returns logits. Summing them means whichever retriever happens to have the larger numeric range decides the outcome."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Reciprocal rank fusion, over the set of ranked lists that contain the document:"
        ],
        "tex": "\\text{RRF}(d) = \\sum_{r \\in R} \\frac{1}{k + \\text{rank}_r(d)}, \\qquad k = 60 \\ \\text{by convention}",
        "texNote": "The constant k damps the influence of the very top ranks, so one list's first place cannot single-handedly decide the fused order. It is the reason RRF is robust to a single retriever being confidently wrong, and 60 is an empirical default rather than anything derived."
      },
      {
        "h": "In code",
        "code": "def rrf(ranked_lists, k=60, top_n=10):\n    scores = {}\n    for lst in ranked_lists:\n        for rank, doc_id in enumerate(lst):        # rank is 0-based here\n            scores[doc_id] = scores.get(doc_id, 0.0) + 1.0 / (k + rank + 1)\n    return sorted(scores, key=scores.get, reverse=True)[:top_n]\n\ndef multi_query(question, llm, retriever, n=4):\n    prompt = (f\"Generate {n} alternative phrasings of this question that would retrieve \"\n              f\"different relevant passages. One per line.\\n\\n{question}\")\n    variants = [question] + llm(prompt).strip().split(\"\\n\")[:n]\n    return rrf([retriever(v) for v in variants])\n\n# Keep the ORIGINAL question in the set. A rewriter occasionally drifts off-topic, and\n# the original is the one variant guaranteed to be on it.",
        "caption": "The rewrites cost a language model call and n retrievals before generation begins, which is the real reason this is not always worth it — see below."
      },
      {
        "h": "What fusion buys, measured honestly",
        "paras": [
          "Two retrievers with complementary strengths, each good on a different half of the relevant documents. Measured at recall@20: retriever A alone 0.40, retriever B alone 0.70. Raw-score fusion 0.90, reciprocal rank fusion 0.80. Fusion beats either retriever, as it should — that is the point of fusing complementary systems.",
          "Note which one won. With comparable score scales, summing the scores beat RRF, because scores carry magnitude information that ranks discard. RRF is not the better fusion method in general, and claiming otherwise would be wrong.",
          "Now multiply retriever B's scores by 90, exactly as a BM25 and a dense retriever would differ. Raw-score fusion collapses to 0.70 — B's scale swamps A entirely, so the fusion degenerates into using B alone. RRF is unchanged at 0.80, because it never looks at a score.",
          "That is the honest summary: use score fusion when your retrievers are calibrated onto a common scale, and RRF when they are not, which in practice is most of the time. And weigh the cost — multi-query adds a language model call plus several retrievals to every request, all before generation starts, so it hurts latency on the critical path. It earns that on queries with vocabulary mismatch or several parts, and wastes it on short, unambiguous lookups. Routing it by query type is worth more than applying it universally."
        ]
      }
    ],
    "takeaways": [
      "Rewrite the query several ways, retrieve for each, and fuse — this recovers passages a single phrasing misses, and fusion beat both individual retrievers (0.90 and 0.80 against 0.40 and 0.70).",
      "RRF is not universally better: with comparable scales, score fusion won. Its value is scale-invariance — when one retriever's scores were 90x larger, score fusion collapsed to 0.70 while RRF held at 0.80.",
      "It costs an LLM call plus n retrievals before generation, so route it to queries with vocabulary mismatch or multiple parts rather than applying it to everything."
    ],
    "demo": "multi-query"
  },
  "order": [
    "rag-chunking",
    "hyde",
    "reranking",
    "react-agent",
    "self-consistency",
    "reflection",
    "prompt-injection",
    "rag-fusion"
  ],
  "index": 7,
  "prev": "prompt-injection",
  "next": null
};
