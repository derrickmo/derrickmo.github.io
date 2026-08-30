// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "activations" (2), for its Connections
// panel. Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "activations": [
      "activations",
      "backprop"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "activations": {
    "id": "activations",
    "name": "Activation Functions",
    "area": "Neural Networks",
    "summary": "The per-neuron nonlinearity that lets a stack of linear maps approximate any function.",
    "prereqs": [
      "perceptron"
    ],
    "tex": "\\mathrm{ReLU}(x) = \\max(0, x)",
    "leadsTo": [
      "sparse-autoencoder",
      "superposition",
      "batch-norm",
      "weight-init",
      "mlp"
    ]
  },
  "backprop": {
    "id": "backprop",
    "name": "Backpropagation",
    "area": "Neural Networks",
    "summary": "Apply the chain rule through a computational graph to get gradients for every parameter at once.",
    "prereqs": [
      "chain-rule",
      "gradient-descent"
    ],
    "leadsTo": [
      "activations",
      "mlp",
      "dqn",
      "pruning",
      "saliency",
      "mixed-precision"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "activations": [
    {
      "kind": "demo",
      "slug": "sparse-autoencoder"
    },
    {
      "kind": "demo",
      "slug": "superposition"
    },
    {
      "kind": "demo",
      "slug": "activations"
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
      "kind": "module",
      "slug": "neural-nets"
    }
  ],
  "backprop": [
    {
      "kind": "demo",
      "slug": "backprop"
    },
    {
      "kind": "demo",
      "slug": "activations"
    },
    {
      "kind": "demo",
      "slug": "neural-playground"
    },
    {
      "kind": "demo",
      "slug": "pruning"
    },
    {
      "kind": "demo",
      "slug": "saliency"
    },
    {
      "kind": "module",
      "slug": "neural-nets"
    },
    {
      "kind": "module",
      "slug": "pytorch-internals"
    }
  ]
};
