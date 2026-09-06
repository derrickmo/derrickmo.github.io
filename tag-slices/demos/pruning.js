// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "pruning" (2), for its Connections panel.
// Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "pruning": [
      "pruning",
      "backprop"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "pruning": {
    "id": "pruning",
    "name": "Pruning & Sparsity",
    "area": "Training Systems",
    "summary": "Compress a network by removing weights. Magnitude pruning zeros the smallest weights; accuracy is nearly flat until a sparsity cliff because trained nets are heavily over-parameterized. Unstructured pruning needs sparse kernels to speed up; structured pruning (whole neurons/channels/heads) gives real speedups. Iterative prune-then-finetune pushes the cliff far right; lottery-ticket sub-networks can retrain from scratch.",
    "prereqs": [
      "backprop",
      "quantization"
    ],
    "leadsTo": []
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
  "pruning": [
    {
      "kind": "demo",
      "slug": "pruning"
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
      "kind": "demo",
      "slug": "autodiff"
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
