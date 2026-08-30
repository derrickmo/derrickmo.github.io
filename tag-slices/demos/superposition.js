// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "superposition" (3), for its Connections panel.
// Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "superposition": [
      "superposition",
      "sparse-autoencoder",
      "activations"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "superposition": {
    "id": "superposition",
    "name": "Superposition",
    "area": "Trustworthy ML",
    "summary": "Networks represent more features than they have neurons by packing them into overlapping directions, tolerating interference because features are sparse. Driven by sparsity and feature importance; the reason neurons are polysemantic and the problem sparse autoencoders solve.",
    "tex": "x \\approx \\mathrm{ReLU}(W^{\\top} W x + b),\\quad W \\in \\mathbb{R}^{d\\times f},\\ d < f",
    "prereqs": [
      "activations"
    ],
    "leadsTo": [
      "sparse-autoencoder"
    ]
  },
  "sparse-autoencoder": {
    "id": "sparse-autoencoder",
    "name": "Sparse Autoencoders (Superposition)",
    "area": "Trustworthy ML",
    "summary": "Disentangle polysemantic neurons into monosemantic features. Networks store more concepts than dimensions (superposition); an overcomplete autoencoder with an L1-sparse code recovers an interpretable feature dictionary. The leading tool of mechanistic interpretability.",
    "tex": "\\min_{W}\\ \\lVert x - W_d\\,\\mathrm{ReLU}(W_e x)\\rVert^2 + \\lambda\\lVert \\mathrm{ReLU}(W_e x)\\rVert_1",
    "prereqs": [
      "activations",
      "regularization"
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
  }
};
window.CONCEPT_REVERSE = {
  "superposition": [
    {
      "kind": "demo",
      "slug": "superposition"
    },
    {
      "kind": "module",
      "slug": "trustworthy-ai"
    }
  ],
  "sparse-autoencoder": [
    {
      "kind": "demo",
      "slug": "sparse-autoencoder"
    },
    {
      "kind": "demo",
      "slug": "superposition"
    },
    {
      "kind": "module",
      "slug": "trustworthy-ai"
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
  ]
};
