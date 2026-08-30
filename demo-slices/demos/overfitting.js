// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "overfitting" (3), for its Connections
// panel. Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "overfitting": [
      "overfitting",
      "bias-variance",
      "regularization"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "overfitting": {
    "id": "overfitting",
    "name": "Overfitting & Generalization",
    "area": "Evaluation & Calibration",
    "summary": "A model that memorises its training set stops describing the world. The gap between training error and test error is the quantity every regularizer, held-out split and early-stopping rule exists to manage — and it is why a lower training loss is never on its own evidence of a better model.",
    "tex": "\\mathbb{E}[\\text{test}] = \\underbrace{\\mathbb{E}[\\text{train}]}_{\\text{fit}} + \\underbrace{(\\mathbb{E}[\\text{test}] - \\mathbb{E}[\\text{train}])}_{\\text{generalization gap}}",
    "prereqs": [
      "bias-variance"
    ],
    "leadsTo": [
      "regularization",
      "cross-validation",
      "double-descent",
      "label-noise"
    ]
  },
  "bias-variance": {
    "id": "bias-variance",
    "name": "Bias-Variance Tradeoff",
    "area": "Evaluation & Calibration",
    "summary": "Generalization error decomposes into rigid-model bias plus over-fitting variance — the central tension of ML.",
    "prereqs": [
      "linear-regression"
    ],
    "leadsTo": [
      "regularization",
      "double-descent",
      "cross-validation",
      "overfitting",
      "ensembles"
    ]
  },
  "regularization": {
    "id": "regularization",
    "name": "Regularization (L2 / weight decay)",
    "area": "Evaluation & Calibration",
    "summary": "Penalize large weights to fight overfitting — the same dial whether it's ridge, weight decay, or dropout.",
    "prereqs": [
      "overfitting"
    ],
    "tex": "\\mathcal{L} + \\lambda \\lVert \\theta \\rVert^2",
    "leadsTo": [
      "proximal-gradient",
      "sparse-autoencoder",
      "double-descent",
      "data-augmentation"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "overfitting": [
    {
      "kind": "demo",
      "slug": "overfitting"
    },
    {
      "kind": "demo",
      "slug": "label-noise"
    }
  ],
  "bias-variance": [
    {
      "kind": "demo",
      "slug": "overfitting"
    },
    {
      "kind": "demo",
      "slug": "cross-validation"
    },
    {
      "kind": "demo",
      "slug": "double-descent"
    },
    {
      "kind": "demo",
      "slug": "bias-variance-decomp"
    },
    {
      "kind": "demo",
      "slug": "bagging-boosting"
    },
    {
      "kind": "demo",
      "slug": "knn"
    },
    {
      "kind": "module",
      "slug": "ml-theory"
    },
    {
      "kind": "module",
      "slug": "interview-capstone"
    }
  ],
  "regularization": [
    {
      "kind": "demo",
      "slug": "ista"
    },
    {
      "kind": "demo",
      "slug": "sparse-autoencoder"
    },
    {
      "kind": "demo",
      "slug": "overfitting"
    },
    {
      "kind": "demo",
      "slug": "cross-validation"
    },
    {
      "kind": "demo",
      "slug": "double-descent"
    },
    {
      "kind": "demo",
      "slug": "bias-variance-decomp"
    },
    {
      "kind": "demo",
      "slug": "svm"
    },
    {
      "kind": "demo",
      "slug": "image-augmentation"
    },
    {
      "kind": "module",
      "slug": "ml-theory"
    }
  ]
};
