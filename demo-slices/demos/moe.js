// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "moe" (3), for its Connections
// panel. Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "moe": [
      "moe",
      "attention",
      "scaling-laws"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "moe": {
    "id": "moe",
    "name": "Mixture of Experts (MoE)",
    "area": "Training Systems",
    "summary": "Conditional computation: a router sends each token to only the top-k of N expert sub-networks, so total parameters scale while active compute per token stays at k/N. Enables sparse trillion-parameter models (Switch Transformer, Mixtral), at the cost of routing complexity and a constant fight against load imbalance — handled with an auxiliary balancing loss and per-expert capacity limits.",
    "tex": "y = \\sum_{i \\in \\mathrm{top\\text{-}k}(g(x))} g_i(x)\\, E_i(x)",
    "prereqs": [
      "attention",
      "scaling-laws"
    ],
    "leadsTo": [
      "mixture-of-depths"
    ]
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
  "scaling-laws": {
    "id": "scaling-laws",
    "name": "Neural Scaling Laws",
    "area": "Training Systems",
    "summary": "Test loss falls as a power law in parameters, data, and compute — letting you plan large training runs.",
    "prereqs": [
      "cross-entropy"
    ],
    "leadsTo": [
      "moe"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "moe": [
    {
      "kind": "demo",
      "slug": "model-cascade"
    },
    {
      "kind": "demo",
      "slug": "mixture-of-depths"
    },
    {
      "kind": "demo",
      "slug": "moe"
    },
    {
      "kind": "module",
      "slug": "frontier-frameworks"
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
  "scaling-laws": [
    {
      "kind": "demo",
      "slug": "scaling-laws"
    },
    {
      "kind": "demo",
      "slug": "moe"
    },
    {
      "kind": "module",
      "slug": "training-systems"
    },
    {
      "kind": "module",
      "slug": "llm-systems"
    },
    {
      "kind": "hf",
      "slug": "production"
    }
  ]
};
