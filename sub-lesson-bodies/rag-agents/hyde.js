// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/rag-agents/hyde/.
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
  "conceptId": "hyde",
  "lesson": {
    "title": "HyDE",
    "oneLine": "Retrieve with a hypothetical answer instead of the raw question.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "A question and its answer often look different in embedding space, so querying with the question can miss the right passage. HyDE first has the model write a hypothetical answer, embeds that, and retrieves with it - because a guessed answer, even if imperfect, sits much closer to the real supporting documents."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Retrieve against the embedding of a generated answer h, not the query q:"
        ],
        "tex": "\\mathrm{top\\text{-}k}\\;\\arg\\max_{d}\\;\\mathrm{sim}\\big(e(h),\\,e(d)\\big),\\quad h = \\mathrm{LLM}(q)",
        "texNote": "Averaging several hypothetical answers smooths out any single bad guess."
      },
      {
        "h": "In code",
        "code": "h = llm(f'Write a passage answering: {q}')   # hypothetical doc\nhits = vector_search(embed(h), k=5)          # retrieve with it",
        "caption": "Guess an answer, retrieve what supports it."
      },
      {
        "h": "It inherits the error of its own guess",
        "paras": [
          "HyDE works by embedding a hypothetical answer instead of the question, on the theory that an answer looks more like a document than a question does. That is true, and it is also the whole exposure. In a 128-dimensional toy where the raw query sits at cosine 0.639 from the right document, a hypothesis close to the real answer moves it to 0.947 — and a confidently wrong hypothesis moves it to 0.083, well below where the untouched query started.",
          "So the technique does not add information; it spends the model's prior on the topic, and the gain and the failure come from the same step. It pays off on questions the model roughly knows and hurts on exactly the ones you most wanted retrieval for — obscure, recent, or private facts, where the guess is confident and wrong. The usual mitigation is to hedge rather than commit: retrieve with the raw query as well and fuse the two result lists, so a bad hypothesis costs you rank rather than the answer."
        ]
      }
    ],
    "takeaways": [
      "HyDE bridges the query-document embedding gap.",
      "It retrieves with a generated answer, not the question.",
      "Averaging multiple drafts reduces variance."
    ],
    "demo": "hyde"
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
  "index": 1,
  "prev": "rag-chunking",
  "next": "reranking"
};
