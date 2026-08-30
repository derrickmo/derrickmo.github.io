// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "rnn-gates" (2), for its Connections panel.
// Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "rnn-gates": [
      "lstm-gates",
      "rnn"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "lstm-gates": {
    "id": "lstm-gates",
    "name": "LSTM Gates",
    "area": "NLP",
    "summary": "Gated recurrent cell with input/forget/output gates over a cell state — the additive memory channel that beat plain RNNs and inspired ResNet skip connections.",
    "tex": "c_t = f_t \\odot c_{t-1} + i_t \\odot g_t",
    "prereqs": [
      "rnn"
    ],
    "leadsTo": [
      "attention"
    ]
  },
  "rnn": {
    "id": "rnn",
    "name": "Recurrent Neural Network",
    "area": "NLP",
    "summary": "A neural net with a hidden state that carries information across a sequence — the pre-transformer way to model order.",
    "prereqs": [
      "mlp"
    ],
    "leadsTo": [
      "attention",
      "gradient-clipping",
      "lstm-gates"
    ],
    "animation": "viz/recurrence.html"
  }
};
window.CONCEPT_REVERSE = {
  "lstm-gates": [
    {
      "kind": "demo",
      "slug": "rnn-gates"
    }
  ],
  "rnn": [
    {
      "kind": "demo",
      "slug": "gradient-clipping"
    },
    {
      "kind": "demo",
      "slug": "rnn-gates"
    },
    {
      "kind": "module",
      "slug": "rnn-nlp"
    }
  ]
};
