// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "gnn" (2), for its Connections
// panel. Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "gnn": [
      "gnn",
      "mlp"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "gnn": {
    "id": "gnn",
    "name": "Graph Neural Network",
    "area": "Graphs",
    "summary": "Update each node's feature by aggregating from its neighbors. Stack a few layers and the network smooths cluster structure; stack too many and features over-smooth.",
    "tex": "h_v^{(\\ell+1)} = \\sigma\\!\\left(W \\cdot \\mathrm{mean}_{u \\in N(v) \\cup \\{v\\}} h_u^{(\\ell)}\\right)",
    "prereqs": [
      "mlp"
    ],
    "leadsTo": []
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
  "gnn": [
    {
      "kind": "demo",
      "slug": "gnn"
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
  ]
};
