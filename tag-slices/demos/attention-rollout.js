// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "attention-rollout" (3), for its Connections panel.
// Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "attention-rollout": [
      "attention-rollout",
      "attention",
      "multi-head"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "attention-rollout": {
    "id": "attention-rollout",
    "name": "Attention Rollout",
    "area": "NLP",
    "summary": "Turn a stack of attention maps into one input-token attribution by composing them across layers, accounting for residual connections: Â=0.5A+0.5I, R=Â_L···Â_1. Row i is token i's rolled-up attention back to the input. A training-free transformer-interpretability tool (Abnar & Zuidema, 2020) — but attention isn't a faithful explanation by itself; it ignores values/MLPs and averages heads.",
    "tex": "R = \\prod_{l=L}^{1} \\bigl( 0.5\\,A_l + 0.5\\,I \\bigr)",
    "prereqs": [
      "attention",
      "multi-head"
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
  "multi-head": {
    "id": "multi-head",
    "name": "Multi-Head Attention",
    "area": "Transformers",
    "summary": "Run several attention heads in parallel so one layer can track multiple relationships at once.",
    "prereqs": [
      "attention"
    ],
    "leadsTo": [
      "transformer-block",
      "attention-rollout"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "attention-rollout": [
    {
      "kind": "demo",
      "slug": "attention-rollout"
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
      "slug": "fundamentals"
    },
    {
      "kind": "hf",
      "slug": "nlp"
    }
  ],
  "multi-head": [
    {
      "kind": "demo",
      "slug": "multi-head-attention"
    },
    {
      "kind": "demo",
      "slug": "attention-rollout"
    },
    {
      "kind": "module",
      "slug": "transformers"
    }
  ]
};
