// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/semantic-caching/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
  "semantic-caching": {
    "id": "semantic-caching",
    "name": "Semantic Caching",
    "area": "Retrieval",
    "summary": "Cache LLM responses by embedding similarity rather than exact string match: embed the query, and if the nearest cached query is within a cosine-similarity threshold, serve its stored answer instead of calling the model. Collapses paraphrases of one intent into a single call. The threshold trades hit rate / cost savings against FALSE HITS — serving a stale or wrong answer for a query that was close in embedding space but semantically different.",
    "prereqs": [
      "embeddings",
      "vector-search"
    ],
    "leadsTo": []
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
  }
};
window.CONCEPT_REVERSE = {
  "semantic-caching": [
    {
      "kind": "demo",
      "slug": "semantic-caching"
    }
  ]
};
