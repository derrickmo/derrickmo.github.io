// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/rag-agents/rag-chunking/.
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
  "conceptId": "rag-chunking",
  "lesson": {
    "title": "Chunking for Retrieval",
    "oneLine": "Split documents so the answer survives retrieval intact.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Retrieval-augmented generation grounds a model in your documents - but only if the right passage is retrievable. Chunking decides how documents are split into embeddable units. Too large and a chunk dilutes the relevant sentence; too small and it loses context. Overlap and sentence-aware boundaries keep answers from being cut in half."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Retrieve the top chunks by similarity to the query embedding:"
        ],
        "tex": "\\mathrm{top\\text{-}k}\\;\\arg\\max_{c}\\;\\mathrm{sim}\\big(e(q),\\,e(c)\\big)",
        "texNote": "Chunk size and overlap control whether the answer span lands inside one retrieved chunk."
      },
      {
        "h": "In code",
        "code": "def chunk(text, size=400, overlap=80):\n    out, i = [], 0\n    while i < len(text):\n        out.append(text[i:i+size])\n        i += size - overlap        # slide with overlap\n    return out",
        "caption": "Sliding windows with overlap keep answer spans whole."
      },
      {
        "h": "The chunk has to be bigger than the answer",
        "paras": [
          "Chunking is usually discussed as an embedding-quality trade — small chunks give precise vectors, large ones give context — but it has a hard failure underneath that trade. Take a 180-character answer sitting at offset 1000 in a document: at a 128-character chunk size it is never intact in any single chunk, with or without overlap, because it does not fit in one. At 256 with no overlap it lands across a boundary and is still split; 256 with 64 of overlap recovers it, as do 512 and 1024 with overlap.",
          "So the chunk size sets a floor on what is retrievable at all, and overlap only buys back the boundary cases within that floor. The practical consequence is that chunking should be chosen against the shape of the answers you expect rather than against a default: a corpus of one-line definitions and a corpus of multi-paragraph procedures do not want the same number. It is also why splitting on structure — headings, list items, function definitions — usually beats a fixed character count, since the structure is already a statement about where an answer begins and ends."
        ]
      }
    ],
    "takeaways": [
      "Chunking sets what retrieval can actually find.",
      "Size and overlap trade context against precision.",
      "Sentence-aware splits avoid cutting answers in half."
    ],
    "demo": "rag-chunking"
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
  "index": 0,
  "prev": null,
  "next": "hyde"
};
