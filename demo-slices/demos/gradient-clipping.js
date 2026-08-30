// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "gradient-clipping" (3), for its Connections
// panel. Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "gradient-clipping": [
      "gradient-clipping",
      "gradient-descent",
      "rnn"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "gradient-clipping": {
    "id": "gradient-clipping",
    "name": "Gradient Clipping",
    "area": "Training Systems",
    "summary": "Bounds the update when a sharp region of the loss (a 'cliff', common in RNNs and deep transformers) produces an exploding gradient. Clip-by-norm rescales the whole gradient to a maximum length τ, preserving direction; clip-by-value caps each coordinate. A standard stability rail (often global-norm 1.0) paired with warmup. Biases the step when active, so it's tuned as a safety mechanism, not a primary regularizer.",
    "tex": "g \\leftarrow g\\cdot\\min\\!\\Bigl(1,\\ \\tfrac{\\tau}{\\lVert g\\rVert}\\Bigr)",
    "prereqs": [
      "gradient-descent",
      "rnn"
    ],
    "leadsTo": []
  },
  "gradient-descent": {
    "id": "gradient-descent",
    "name": "Gradient Descent",
    "area": "Optimization",
    "summary": "Follow the negative loss gradient downhill — the engine of essentially all neural-network training.",
    "tex": "\\theta_{t+1} = \\theta_t - \\eta\\, \\nabla_\\theta \\mathcal{L}(\\theta_t)",
    "prereqs": [
      "chain-rule"
    ],
    "leadsTo": [
      "backprop",
      "lr-schedule",
      "adam",
      "newtons-method",
      "coordinate-descent",
      "proximal-gradient",
      "quasi-newton",
      "variational-inference",
      "adversarial-examples",
      "optimizers",
      "gradient-clipping",
      "policy-gradient"
    ],
    "animation": "viz/gradient.html"
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
  "gradient-clipping": [
    {
      "kind": "demo",
      "slug": "gradient-clipping"
    }
  ],
  "gradient-descent": [
    {
      "kind": "demo",
      "slug": "gradient-descent"
    },
    {
      "kind": "demo",
      "slug": "newton-vs-gradient"
    },
    {
      "kind": "demo",
      "slug": "coordinate-descent"
    },
    {
      "kind": "demo",
      "slug": "l-bfgs"
    },
    {
      "kind": "demo",
      "slug": "adversarial-examples"
    },
    {
      "kind": "demo",
      "slug": "optimizers"
    },
    {
      "kind": "demo",
      "slug": "lr-schedule"
    },
    {
      "kind": "demo",
      "slug": "gradient-clipping"
    },
    {
      "kind": "demo",
      "slug": "regression"
    },
    {
      "kind": "demo",
      "slug": "policy-gradient"
    },
    {
      "kind": "module",
      "slug": "foundations"
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
