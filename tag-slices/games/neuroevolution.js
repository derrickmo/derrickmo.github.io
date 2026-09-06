// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to games "neuroevolution" (2), for its Connections panel.
// Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {},
  "games": {
    "neuroevolution": [
      "neuroevolution",
      "mlp"
    ]
  }
};
window.CONCEPTS_INDEX = {
  "neuroevolution": {
    "id": "neuroevolution",
    "name": "Neuroevolution",
    "area": "Reinforcement Learning",
    "summary": "Improve a neural-net policy by selection + crossover + mutation, no gradients required.",
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
  "neuroevolution": [
    {
      "kind": "game",
      "slug": "neuroevolution"
    },
    {
      "kind": "game",
      "slug": "self-driving"
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
