// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/reranking/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
  "reranking": {
    "id": "reranking",
    "name": "Reranking (cross-encoder)",
    "area": "Retrieval",
    "summary": "The second stage of retrieval. A cheap bi-encoder/BM25 first stage maximizes recall over the whole corpus by scoring queries and docs independently; a slow cross-encoder then reads each (query, doc) pair jointly to score true relevance precisely and reorders the shortlist. Splits recall (stage 1) from precision (stage 2); the reranker is bounded by what the pool retrieved.",
    "prereqs": [
      "vector-search",
      "rag-chunking"
    ],
    "leadsTo": []
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
  "tokenization": {
    "id": "tokenization",
    "name": "Tokenization (BPE)",
    "area": "NLP",
    "summary": "Subword units learned by merging frequent character pairs — every LLM's first step.",
    "leadsTo": [
      "embeddings",
      "constrained-decoding"
    ],
    "prereqs": []
  },
  "knn": {
    "id": "knn",
    "name": "k-Nearest Neighbors",
    "area": "Classical ML",
    "summary": "Label by majority vote of the k closest training points — no training, the data is the model.",
    "leadsTo": [
      "vector-search",
      "dbscan",
      "label-propagation",
      "kernel-density"
    ],
    "prereqs": []
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
  }
};
window.CONCEPT_REVERSE = {
  "reranking": [
    {
      "kind": "demo",
      "slug": "rag-reranker"
    },
    {
      "kind": "module",
      "slug": "interview-capstone"
    }
  ]
};
