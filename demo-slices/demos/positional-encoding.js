// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "positional-encoding" (3), for its Connections
// panel. Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "positional-encoding": [
      "positional-encoding",
      "fourier",
      "attention"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
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
  "fourier": {
    "id": "fourier",
    "name": "Fourier Series",
    "area": "Signal",
    "summary": "Any periodic signal decomposes into a sum of sines and cosines — the backbone of signal processing and positional encodings.",
    "leadsTo": [
      "positional-encoding",
      "spectrogram",
      "mfcc",
      "pitch-detection",
      "aliasing"
    ],
    "prereqs": []
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
  "fourier": [
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
      "slug": "spectrogram"
    },
    {
      "kind": "demo",
      "slug": "mfcc"
    },
    {
      "kind": "demo",
      "slug": "pitch-detection"
    },
    {
      "kind": "demo",
      "slug": "aliasing"
    },
    {
      "kind": "hf",
      "slug": "audio"
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
