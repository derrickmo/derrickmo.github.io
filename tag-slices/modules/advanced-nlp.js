// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to modules "advanced-nlp" (2), for its Connections panel.
// Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "modules": {
    "advanced-nlp": [
      "decoding",
      "transformer-block"
    ]
  }
};
window.CONCEPTS_INDEX = {
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
  "transformer-block": {
    "id": "transformer-block",
    "name": "Transformer Block",
    "area": "Transformers",
    "summary": "Attention + feed-forward + residual + layer-norm — the basic stacked unit of GPT/BERT/Llama.",
    "prereqs": [
      "attention",
      "multi-head"
    ],
    "animation": "viz/transformer.html",
    "leadsTo": [
      "mixture-of-depths"
    ]
  }
};
window.CONCEPT_REVERSE = {
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
  "transformer-block": [
    {
      "kind": "demo",
      "slug": "multi-head-attention"
    },
    {
      "kind": "demo",
      "slug": "mixture-of-depths"
    },
    {
      "kind": "module",
      "slug": "transformers"
    },
    {
      "kind": "module",
      "slug": "advanced-nlp"
    },
    {
      "kind": "hf",
      "slug": "fundamentals"
    },
    {
      "kind": "hf",
      "slug": "audio"
    }
  ]
};
