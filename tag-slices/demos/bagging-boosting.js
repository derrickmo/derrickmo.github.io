// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "bagging-boosting" (3), for its Connections panel.
// Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "bagging-boosting": [
      "ensembles",
      "decision-tree",
      "bias-variance"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "ensembles": {
    "id": "ensembles",
    "name": "Ensembles (Bagging & Boosting)",
    "area": "Classical ML",
    "summary": "Combine many trees to beat any single one. Bagging trains each tree on a bootstrap resample and averages them, cutting VARIANCE (random forests add per-split feature randomness) — wants deep, high-variance learners and is order-independent. Boosting fits trees sequentially to the residual error, adding a shrunken step ν·tree, cutting BIAS — wants shallow weak learners and generalizes residual-fitting to any differentiable loss (gradient boosting: XGBoost/LightGBM). The dominant approach for tabular data.",
    "tex": "\\text{bagging: } \\bar f = \\tfrac1M\\sum_m f_m, \\quad \\text{boosting: } F_M = F_0 + \\nu\\sum_m h_m",
    "prereqs": [
      "decision-tree",
      "bias-variance"
    ],
    "leadsTo": []
  },
  "decision-tree": {
    "id": "decision-tree",
    "name": "Decision Tree",
    "area": "Classical ML",
    "summary": "Split feature space greedily by the cut that most reduces impurity; the building block of forests and boosting.",
    "leadsTo": [
      "entropy",
      "ensembles"
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
  "ensembles": [
    {
      "kind": "demo",
      "slug": "bagging-boosting"
    }
  ],
  "decision-tree": [
    {
      "kind": "demo",
      "slug": "bagging-boosting"
    },
    {
      "kind": "demo",
      "slug": "decision-tree"
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
