// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "rope" (3), for its Connections
// panel. Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "rope": [
      "rope",
      "positional-encoding",
      "attention"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "rope": {
    "id": "rope",
    "name": "Rotary Position Embedding (RoPE)",
    "area": "Transformers",
    "summary": "Encode position by rotating Q and K in 2-D pair-blocks by an angle that grows linearly with position; the attention score then depends only on the relative offset (m-n).",
    "tex": "\\theta_i(m) = m \\cdot 10000^{-2i/d}",
    "prereqs": [
      "positional-encoding",
      "attention"
    ],
    "leadsTo": [
      "context-extension"
    ]
  },
  "positional-encoding": {
    "id": "positional-encoding",
    "name": "Positional Encoding (sinusoidal / RoPE)",
    "area": "Transformers",
    "summary": "Inject order into attention — sinusoidal vectors or RoPE rotations that encode relative position.",
    "prereqs": [
      "attention",
      "fourier"
    ],
    "leadsTo": [
      "rope",
      "context-extension"
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
  }
};
window.CONCEPT_REVERSE = {
  "rope": [
    {
      "kind": "demo",
      "slug": "rope"
    },
    {
      "kind": "demo",
      "slug": "context-extension"
    }
  ],
  "positional-encoding": [
    {
      "kind": "demo",
      "slug": "positional-encoding"
    },
    {
      "kind": "demo",
      "slug": "fourier"
    },
    {
      "kind": "demo",
      "slug": "rope"
    },
    {
      "kind": "demo",
      "slug": "context-extension"
    },
    {
      "kind": "module",
      "slug": "transformers"
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
  ]
};
