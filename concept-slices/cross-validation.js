// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/cross-validation/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
  "cross-validation": {
    "id": "cross-validation",
    "name": "Cross-Validation",
    "area": "Evaluation & Calibration",
    "summary": "Estimate out-of-sample error and select hyperparameters by rotating a held-out fold through the data: split into k folds, train on k−1 and score on the held-out one, average over all k. Train error falls monotonically with capacity and can't pick a model; the CV error is U-shaped and its minimum is the bias/variance sweet spot. k=5/10 are typical (k=N is leave-one-out). Watch for leakage — use grouped/stratified/time-series splits, and nested CV when selecting AND scoring.",
    "tex": "\\mathrm{CV} = \\tfrac{1}{k}\\sum_{f=1}^{k} \\mathrm{err}\\big(\\text{model}_{-f},\\, \\text{fold}_f\\big)",
    "prereqs": [
      "bias-variance"
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
  "cross-validation": [
    {
      "kind": "demo",
      "slug": "cross-validation"
    },
    {
      "kind": "demo",
      "slug": "bootstrap"
    },
    {
      "kind": "module",
      "slug": "interview-capstone"
    }
  ]
};
