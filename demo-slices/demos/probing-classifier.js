// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "probing-classifier" (3), for its Connections
// panel. Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "probing-classifier": [
      "probing-classifier",
      "mlp",
      "logistic-regression"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "probing-classifier": {
    "id": "probing-classifier",
    "name": "Linear Probing",
    "area": "Trustworthy ML",
    "summary": "Test what a layer represents by fitting the simplest possible readout — a linear classifier — to its frozen activations. Accuracy rises with depth as the network reformats data into a linearly separable geometry. Shows decodability, not causal use.",
    "tex": "\\hat y = \\mathrm{softmax}(W\\,h^{(\\ell)} + b),\\ \\ h^{(\\ell)}\\ \\text{frozen}",
    "prereqs": [
      "mlp",
      "logistic-regression"
    ],
    "leadsTo": [
      "activation-patching"
    ]
  },
  "mlp": {
    "id": "mlp",
    "name": "Multilayer Perceptron",
    "area": "Neural Networks",
    "summary": "Stack linear layers and nonlinearities — the universal approximator that backprop trains.",
    "prereqs": [
      "perceptron",
      "activations",
      "backprop"
    ],
    "leadsTo": [
      "cnn",
      "rnn",
      "transformer-block",
      "probing-classifier",
      "activation-patching",
      "batch-norm",
      "weight-init",
      "convolution",
      "diffusion",
      "lora",
      "neuroevolution",
      "gan",
      "gnn"
    ],
    "animation": "viz/feedforward.html"
  },
  "logistic-regression": {
    "id": "logistic-regression",
    "name": "Logistic Regression",
    "area": "Classical ML",
    "summary": "Sigmoid over a linear score, trained with binary cross-entropy. The last layer of every neural classifier — and the multi-class generalization is softmax.",
    "tex": "P(y{=}1 \\mid x) = \\sigma(w^\\top x + b)",
    "prereqs": [
      "linear-regression",
      "cross-entropy"
    ],
    "leadsTo": [
      "mlp",
      "probing-classifier",
      "roc",
      "reward-model",
      "calibration",
      "shap",
      "active-learning"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "probing-classifier": [
    {
      "kind": "demo",
      "slug": "probing-classifier"
    },
    {
      "kind": "demo",
      "slug": "activation-patching"
    },
    {
      "kind": "module",
      "slug": "trustworthy-ai"
    }
  ],
  "mlp": [
    {
      "kind": "demo",
      "slug": "probing-classifier"
    },
    {
      "kind": "demo",
      "slug": "gan"
    },
    {
      "kind": "demo",
      "slug": "batch-norm"
    },
    {
      "kind": "demo",
      "slug": "weight-init"
    },
    {
      "kind": "demo",
      "slug": "neural-playground"
    },
    {
      "kind": "demo",
      "slug": "gnn"
    },
    {
      "kind": "demo",
      "slug": "dqn"
    },
    {
      "kind": "game",
      "slug": "neuroevolution"
    },
    {
      "kind": "module",
      "slug": "neural-nets"
    }
  ],
  "logistic-regression": [
    {
      "kind": "demo",
      "slug": "probing-classifier"
    },
    {
      "kind": "demo",
      "slug": "regression"
    },
    {
      "kind": "demo",
      "slug": "reward-model"
    },
    {
      "kind": "demo",
      "slug": "calibration"
    },
    {
      "kind": "demo",
      "slug": "shap"
    },
    {
      "kind": "demo",
      "slug": "active-learning"
    }
  ]
};
