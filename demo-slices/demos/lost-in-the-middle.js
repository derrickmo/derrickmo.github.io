// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "lost-in-the-middle" (3), for its Connections
// panel. Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "lost-in-the-middle": [
      "lost-in-the-middle",
      "attention",
      "rag-chunking"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "lost-in-the-middle": {
    "id": "lost-in-the-middle",
    "name": "Lost in the Middle",
    "area": "NLP",
    "summary": "Transformers use information at the start and end of a long context far more reliably than the middle, so accuracy vs the position of the relevant passage is U-shaped — and the dip deepens with context length. Motivates reranking the most relevant chunks to the prompt's edges and keeping contexts tight.",
    "prereqs": [
      "attention",
      "rag-chunking"
    ],
    "leadsTo": []
  },
  "attention": {
    "id": "attention",
    "name": "Self-Attention",
    "area": "Transformers",
    "summary": "Score every pair of tokens by a softmax over scaled dot products; the core op of every transformer.",
    "tex": "\\mathrm{Attn}(Q,K,V) = \\mathrm{softmax}\\!\\left(\\tfrac{QK^\\top}{\\sqrt{d_k}}\\right) V",
    "prereqs": [
      "softmax",
      "embeddings"
    ],
    "leadsTo": [
      "multi-head",
      "positional-encoding",
      "transformer-block",
      "lora",
      "kv-cache",
      "rope",
      "kv-cache-eviction",
      "lost-in-the-middle",
      "moe",
      "attention-rollout"
    ]
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
  "lost-in-the-middle": [
    {
      "kind": "demo",
      "slug": "lost-in-the-middle"
    }
  ],
  "attention": [
    {
      "kind": "demo",
      "slug": "svm"
    },
    {
      "kind": "demo",
      "slug": "attention"
    },
    {
      "kind": "demo",
      "slug": "positional-encoding"
    },
    {
      "kind": "demo",
      "slug": "multi-head-attention"
    },
    {
      "kind": "demo",
      "slug": "kv-cache"
    },
    {
      "kind": "demo",
      "slug": "rope"
    },
    {
      "kind": "demo",
      "slug": "lost-in-the-middle"
    },
    {
      "kind": "demo",
      "slug": "attention-rollout"
    },
    {
      "kind": "demo",
      "slug": "moe"
    },
    {
      "kind": "module",
      "slug": "transformers"
    },
    {
      "kind": "hf",
      "slug": "nlp"
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
  ]
};
