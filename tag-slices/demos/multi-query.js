// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "multi-query" (3), for its Connections panel.
// Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "multi-query": [
      "rag-fusion",
      "rag-chunking",
      "vector-search"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "rag-fusion": {
    "id": "rag-fusion",
    "name": "Multi-Query & RAG-Fusion",
    "area": "Retrieval",
    "summary": "Query transformation for retrieval: rewrite a question into several variants, retrieve a ranked list for each, and fuse them with Reciprocal Rank Fusion — RRF(d)=Σ 1/(K+rank). Score-agnostic, so it combines dense, sparse, and multi-phrasing rankings; surfaces relevant docs any single phrasing misses, raising recall at the cost of extra LLM calls + a reranker.",
    "tex": "\\mathrm{RRF}(d) = \\sum_{v} \\frac{1}{K + \\mathrm{rank}_v(d)}",
    "prereqs": [
      "rag-chunking",
      "vector-search"
    ],
    "leadsTo": []
  },
  "rag-chunking": {
    "id": "rag-chunking",
    "name": "RAG Chunking",
    "area": "Retrieval",
    "summary": "How a corpus is split into chunks before embedding decides what retrieval can find. Chunk size trades dilution (too large) against splitting a fact across boundaries (too small); overlap and sentence-aware splitting keep answer spans intact. The cheapest lever on retrieval recall.",
    "prereqs": [
      "embeddings",
      "vector-search"
    ],
    "leadsTo": [
      "lost-in-the-middle",
      "react-agent",
      "reranking",
      "rag-fusion"
    ]
  },
  "vector-search": {
    "id": "vector-search",
    "name": "Vector Search / ANN",
    "area": "Retrieval",
    "summary": "Embed items, then fetch the k nearest by cosine or Euclidean — the engine under semantic search and RAG.",
    "prereqs": [
      "embeddings",
      "knn"
    ],
    "leadsTo": [
      "rag-chunking",
      "semantic-caching",
      "hyde",
      "reranking",
      "rag-fusion"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "rag-fusion": [
    {
      "kind": "demo",
      "slug": "multi-query"
    }
  ],
  "rag-chunking": [
    {
      "kind": "demo",
      "slug": "rag-chunking"
    },
    {
      "kind": "demo",
      "slug": "lost-in-the-middle"
    },
    {
      "kind": "demo",
      "slug": "react-agent"
    },
    {
      "kind": "demo",
      "slug": "multi-query"
    },
    {
      "kind": "demo",
      "slug": "rag-reranker"
    }
  ],
  "vector-search": [
    {
      "kind": "demo",
      "slug": "embeddings"
    },
    {
      "kind": "demo",
      "slug": "vector-search"
    },
    {
      "kind": "demo",
      "slug": "rag-chunking"
    },
    {
      "kind": "demo",
      "slug": "semantic-caching"
    },
    {
      "kind": "demo",
      "slug": "hyde"
    },
    {
      "kind": "demo",
      "slug": "multi-query"
    },
    {
      "kind": "demo",
      "slug": "rag-reranker"
    },
    {
      "kind": "module",
      "slug": "rag-agents"
    },
    {
      "kind": "hf",
      "slug": "multimodal"
    },
    {
      "kind": "hf",
      "slug": "agentic"
    }
  ]
};
