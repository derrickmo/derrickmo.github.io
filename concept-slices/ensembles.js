// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/ensembles/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

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
  },
  "linear-regression": {
    "id": "linear-regression",
    "name": "Linear Regression",
    "area": "Classical ML",
    "summary": "Fit a line by minimizing squared error — convex, with a closed-form OLS solution. The simplest supervised model and the algebraic backbone of half of statistics.",
    "tex": "\\hat{w} = (X^\\top X)^{-1} X^\\top y",
    "leadsTo": [
      "logistic-regression",
      "pca",
      "bayesian-linear-regression",
      "bias-variance",
      "svm",
      "perceptron",
      "forecasting",
      "conformal-regression",
      "simpsons-paradox",
      "instrumental-variables"
    ],
    "prereqs": []
  }
};
window.CONCEPT_REVERSE = {
  "ensembles": [
    {
      "kind": "demo",
      "slug": "bagging-boosting"
    }
  ]
};
