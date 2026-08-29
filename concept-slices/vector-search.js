// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/vector-search/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
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
  },
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
  "hyde": {
    "id": "hyde",
    "name": "HyDE (Hypothetical Document Embeddings)",
    "area": "Retrieval",
    "summary": "A query-transformation trick for dense retrieval: questions and answers embed to different regions, so first have the model draft a hypothetical answer and retrieve by ITS embedding — even a factually wrong draft lands near the real answer passages. Averaging several drafts cancels noise.",
    "prereqs": [
      "embeddings",
      "vector-search"
    ],
    "leadsTo": []
  },
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
  }
};
window.CONCEPT_REVERSE = {
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
