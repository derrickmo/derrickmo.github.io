// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "beam-search" (2), for its Connections panel.
// Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "beam-search": [
      "beam-search",
      "decoding"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "beam-search": {
    "id": "beam-search",
    "name": "Beam Search",
    "area": "NLP",
    "summary": "Keep the top-K partial sequences by total log-probability at every decoding step. Greedy is K=1; bigger K finds higher-probability sentences at multiplied cost.",
    "prereqs": [
      "decoding"
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
  }
};
window.CONCEPT_REVERSE = {
  "beam-search": [
    {
      "kind": "demo",
      "slug": "beam-search"
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
  ]
};
