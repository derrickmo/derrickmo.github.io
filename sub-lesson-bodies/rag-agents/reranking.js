// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/rag-agents/reranking/.
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
  "conceptId": "reranking",
  "lesson": {
    "title": "Reranking",
    "oneLine": "Re-score the top retrieved hits with a more careful model.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Fast vector search uses a bi-encoder that embeds query and document separately - cheap but coarse. A reranker is a cross-encoder that reads the query and a candidate together, scoring relevance far more accurately. You retrieve many cheaply, then rerank the top few expensively: the best of both."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "A cross-encoder scores the query-document pair jointly:"
        ],
        "tex": "s(q,d) = f_\\theta\\big(\\,[\\,q\\,;\\,d\\,]\\,\\big)",
        "texNote": "Joint encoding captures interactions a separate-embedding bi-encoder misses."
      },
      {
        "h": "In code",
        "code": "cands = vector_search(q, k=50)          # cheap recall\nscores = [cross_encoder(q, d) for d in cands]\ntop = [cands[i] for i in argsort(scores)[::-1][:5]]",
        "caption": "Retrieve broadly, rerank the shortlist precisely."
      },
      {
        "h": "A ceiling set entirely by stage one",
        "paras": [
          "A cross-encoder reorders the candidate list; it cannot add to it. So whatever the first-stage retriever missed is missed for good, and final recall is capped by first-stage recall at the depth you chose. On a 5,000-document corpus with 20 relevant documents and 400 hard negatives, first-stage recall runs 0.15 at k=10, 0.40 at k=50, 0.75 at k=100 and 0.95 at k=500. Rerank the top 10 and the best possible outcome is 0.15, no matter how good the reranker is.",
          "The other half is that the reranker's value grows with that depth. Taking precision@10 on the same corpus, a perfect reranker moves it from 0.30 to 0.80 when given the top 50, and to 1.00 when given the top 100 — it is doing more work precisely because there is more for it to find. That is the real tuning knob, and it is a straight cost trade: the bi-encoder scores the corpus once and cheaply, the cross-encoder scores every candidate pair, so depth is quadratic in effort and linear in ceiling."
        ]
      }
    ],
    "takeaways": [
      "Bi-encoders retrieve fast; cross-encoders rerank accurately.",
      "Retrieve many, rerank a few - the standard two-stage pipeline.",
      "Reranking sharply improves the final context quality."
    ],
    "demo": "rag-reranker"
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
  "index": 2,
  "prev": "hyde",
  "next": "react-agent"
};
