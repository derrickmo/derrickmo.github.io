// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "rag-chunking" (3), for its Connections
// panel. Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "rag-chunking": [
      "rag-chunking",
      "embeddings",
      "vector-search"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
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
  "embeddings": {
    "id": "embeddings",
    "name": "Embeddings",
    "area": "NLP",
    "summary": "Map tokens (or items) to vectors so that distance and direction encode meaning.",
    "prereqs": [
      "tokenization"
    ],
    "leadsTo": [
      "vector-search",
      "attention",
      "word2vec",
      "contrastive-learning",
      "tsne",
      "rag-chunking",
      "semantic-caching",
      "hyde"
    ],
    "animation": "viz/embeddings.html"
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
  "embeddings": [
    {
      "kind": "demo",
      "slug": "pca"
    },
    {
      "kind": "demo",
      "slug": "tsne"
    },
    {
      "kind": "demo",
      "slug": "word2vec"
    },
    {
      "kind": "demo",
      "slug": "attention"
    },
    {
      "kind": "demo",
      "slug": "embeddings"
    },
    {
      "kind": "demo",
      "slug": "contrastive-learning"
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
      "kind": "module",
      "slug": "rnn-nlp"
    },
    {
      "kind": "module",
      "slug": "rag-agents"
    },
    {
      "kind": "module",
      "slug": "multimodal"
    },
    {
      "kind": "hf",
      "slug": "multimodal"
    },
    {
      "kind": "hf",
      "slug": "agentic"
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
