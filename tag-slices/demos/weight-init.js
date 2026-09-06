// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "weight-init" (3), for its Connections panel.
// Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "weight-init": [
      "weight-init",
      "activations",
      "mlp"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "weight-init": {
    "id": "weight-init",
    "name": "Weight Initialization",
    "area": "Neural Networks",
    "summary": "The variance weights are drawn from controls whether the forward signal (and backward gradient) stays at unit scale through depth or diverges exponentially. Xavier/Glorot uses Var(W)=1/fan_in (correct for linear/tanh); He/Kaiming uses 2/fan_in to compensate for ReLU zeroing half the variance. Wrong scale → exploding (saturation/NaN) or vanishing (dead) signal. The matching scheme keeps std≈1 across all layers, which is what makes deep nets trainable from scratch.",
    "tex": "\\mathrm{Var}(W) = \\frac{1}{\\text{fan\\_in}}\\ (\\text{Xavier}), \\quad \\frac{2}{\\text{fan\\_in}}\\ (\\text{He})",
    "prereqs": [
      "activations",
      "mlp"
    ],
    "leadsTo": []
  },
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
  }
};
window.CONCEPT_REVERSE = {
  "weight-init": [
    {
      "kind": "demo",
      "slug": "weight-init"
    }
  ],
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
      "kind": "demo",
      "slug": "broadcasting"
    },
    {
      "kind": "demo",
      "slug": "matmul"
    },
    {
      "kind": "game",
      "slug": "neuroevolution"
    },
    {
      "kind": "module",
      "slug": "neural-nets"
    }
  ]
};
