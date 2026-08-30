// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "speculative-decoding" (3), for its Connections
// panel. Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "speculative-decoding": [
      "speculative-decoding",
      "decoding",
      "kv-cache"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "speculative-decoding": {
    "id": "speculative-decoding",
    "name": "Speculative Decoding",
    "area": "Training Systems",
    "summary": "Speed up LLM generation losslessly: a small draft model proposes k tokens, the big target verifies them in one parallel pass, accepting the longest prefix it agrees with and resampling the first miss from its own distribution. Emits accepted+1 tokens per expensive pass; speedup ≈ (1−p^{k+1})/(1−p) for acceptance p. Output distribution is identical to the target alone.",
    "tex": "\\mathbb{E}[\\text{tokens/pass}] = \\frac{1 - p^{\\,k+1}}{1 - p}",
    "prereqs": [
      "decoding",
      "kv-cache"
    ],
    "leadsTo": []
  },
  "decoding": {
    "id": "decoding",
    "name": "Decoding Strategies",
    "area": "NLP",
    "summary": "Pick the next token from the model's distribution — greedy, beam, top-k, nucleus, temperature.",
    "prereqs": [
      "softmax"
    ],
    "leadsTo": [
      "beam-search",
      "self-consistency",
      "constrained-decoding",
      "speculative-decoding"
    ]
  },
  "kv-cache": {
    "id": "kv-cache",
    "name": "KV Cache",
    "area": "Transformers",
    "summary": "Cache the keys and values for every prefix token during autoregressive generation so each new step only computes one new K/V — the trick behind tractable LLM inference.",
    "prereqs": [
      "attention"
    ],
    "leadsTo": [
      "kv-cache-eviction",
      "paged-attention",
      "speculative-decoding"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "speculative-decoding": [
    {
      "kind": "demo",
      "slug": "speculative-decoding"
    },
    {
      "kind": "module",
      "slug": "frontier-frameworks"
    }
  ],
  "decoding": [
    {
      "kind": "demo",
      "slug": "markov"
    },
    {
      "kind": "demo",
      "slug": "decoding"
    },
    {
      "kind": "demo",
      "slug": "beam-search"
    },
    {
      "kind": "demo",
      "slug": "self-consistency"
    },
    {
      "kind": "demo",
      "slug": "constrained-decoding"
    },
    {
      "kind": "demo",
      "slug": "speculative-decoding"
    },
    {
      "kind": "module",
      "slug": "advanced-nlp"
    }
  ],
  "kv-cache": [
    {
      "kind": "demo",
      "slug": "kv-cache"
    },
    {
      "kind": "demo",
      "slug": "kv-cache-eviction"
    },
    {
      "kind": "demo",
      "slug": "speculative-decoding"
    },
    {
      "kind": "demo",
      "slug": "paged-attention"
    }
  ]
};
