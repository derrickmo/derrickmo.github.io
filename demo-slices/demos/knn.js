// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "knn" (2), for its Connections
// panel. Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "knn": [
      "knn",
      "bias-variance"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "knn": {
    "id": "knn",
    "name": "k-Nearest Neighbors",
    "area": "Classical ML",
    "summary": "Label by majority vote of the k closest training points — no training, the data is the model.",
    "leadsTo": [
      "vector-search",
      "dbscan",
      "label-propagation",
      "kernel-density"
    ],
    "prereqs": []
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
  }
};
window.CONCEPT_REVERSE = {
  "knn": [
    {
      "kind": "demo",
      "slug": "knn"
    },
    {
      "kind": "demo",
      "slug": "vector-search"
    },
    {
      "kind": "demo",
      "slug": "dbscan"
    },
    {
      "kind": "demo",
      "slug": "label-propagation"
    },
    {
      "kind": "demo",
      "slug": "kernel-density"
    },
    {
      "kind": "module",
      "slug": "supervised-learning"
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
  ]
};
