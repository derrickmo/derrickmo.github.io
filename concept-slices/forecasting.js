// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/forecasting/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
  "forecasting": {
    "id": "forecasting",
    "name": "Exponential Smoothing & ARIMA",
    "area": "Time Series",
    "summary": "Track a series' level, trend, and seasonality with classical smoothers — strong baselines for any deep forecaster.",
    "prereqs": [
      "linear-regression"
    ],
    "leadsTo": []
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
  "forecasting": [
    {
      "kind": "demo",
      "slug": "forecasting"
    },
    {
      "kind": "demo",
      "slug": "pitch-detection"
    },
    {
      "kind": "module",
      "slug": "ml-applications"
    }
  ]
};
