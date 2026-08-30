// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "double-descent" (3), for its Connections panel.
// Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "double-descent": [
      "double-descent",
      "bias-variance",
      "regularization"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "double-descent": {
    "id": "double-descent",
    "name": "Double Descent",
    "area": "Evaluation & Calibration",
    "summary": "Test error is NOT a simple U in model capacity. As you add parameters it falls, then spikes at the interpolation threshold (#params ≈ #train points, where the model can just barely fit the data), then falls AGAIN in the over-parameterized regime. The peak is noise-driven and tied to ill-conditioning at P≈N; the second descent relies on a benign implicit bias (minimum-norm / SGD). Optimal regularization or early stopping removes the peak. Reconciles classical bias-variance with why huge networks generalize.",
    "tex": "\\text{risk}(P) \\text{ peaks at } P/N = 1, \\text{ then decreases for } P \\gg N",
    "prereqs": [
      "bias-variance",
      "regularization"
    ],
    "leadsTo": []
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
  "double-descent": [
    {
      "kind": "demo",
      "slug": "double-descent"
    },
    {
      "kind": "demo",
      "slug": "bias-variance-decomp"
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
