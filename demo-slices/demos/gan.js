// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "gan" (3), for its Connections
// panel. Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "gan": [
      "gan",
      "mlp",
      "cross-entropy"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "gan": {
    "id": "gan",
    "name": "Generative Adversarial Network",
    "area": "Generative",
    "summary": "Two networks duel — a generator fabricates samples, a discriminator scores them as real or fake. The game's equilibrium is a generator that matches the real distribution.",
    "tex": "\\min_G \\max_D \\; \\mathbb{E}_x[\\log D(x)] + \\mathbb{E}_z[\\log(1 - D(G(z)))]",
    "prereqs": [
      "mlp",
      "cross-entropy"
    ],
    "leadsTo": [
      "diffusion"
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
  "cross-entropy": {
    "id": "cross-entropy",
    "name": "Cross-Entropy",
    "area": "Information Theory",
    "summary": "The loss that measures how much a predicted distribution disagrees with the true labels.",
    "tex": "H(p, q) = -\\sum_i p_i \\log q_i",
    "prereqs": [
      "softmax"
    ],
    "leadsTo": [
      "scaling-laws",
      "bayes",
      "gan",
      "logistic-regression"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "gan": [
    {
      "kind": "demo",
      "slug": "gan"
    },
    {
      "kind": "module",
      "slug": "generative"
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
  "cross-entropy": [
    {
      "kind": "demo",
      "slug": "huffman-coding"
    },
    {
      "kind": "demo",
      "slug": "roc"
    },
    {
      "kind": "demo",
      "slug": "bayes"
    },
    {
      "kind": "demo",
      "slug": "gan"
    },
    {
      "kind": "demo",
      "slug": "regression"
    },
    {
      "kind": "demo",
      "slug": "cross-entropy"
    }
  ]
};
