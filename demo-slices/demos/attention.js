// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "attention" (3), for its Connections
// panel. Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "attention": [
      "attention",
      "softmax",
      "embeddings"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
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
  "softmax": {
    "id": "softmax",
    "name": "Softmax",
    "area": "Neural Networks",
    "summary": "Turn a vector of logits into a probability distribution; the workhorse output and attention nonlinearity.",
    "tex": "\\mathrm{softmax}(z)_i = \\frac{e^{z_i}}{\\sum_j e^{z_j}}",
    "leadsTo": [
      "contrastive-learning",
      "cross-entropy",
      "word2vec",
      "attention",
      "decoding"
    ],
    "prereqs": []
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
  }
};
window.CONCEPT_REVERSE = {
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
  "softmax": [
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
      "slug": "decoding"
    },
    {
      "kind": "demo",
      "slug": "contrastive-learning"
    },
    {
      "kind": "demo",
      "slug": "cross-entropy"
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
  ]
};
