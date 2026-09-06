// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/beam-search/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

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
  }
};
window.CONCEPT_REVERSE = {
  "beam-search": [
    {
      "kind": "demo",
      "slug": "beam-search"
    },
    {
      "kind": "demo",
      "slug": "ctc-alignment"
    }
  ]
};
