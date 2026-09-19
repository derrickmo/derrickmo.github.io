// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "forecasting" (2), for its Connections panel.
// Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "forecasting": [
      "forecasting",
      "cross-validation"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "forecasting": {
    "id": "forecasting",
    "name": "Exponential Smoothing & ARIMA",
    "area": "Time Series",
    "summary": "Track a series' level, trend and seasonality with classical smoothers, which stay strong baselines for any deep forecaster.",
    "prereqs": [
      "linear-regression"
    ],
    "leadsTo": []
  },
  "cross-validation": {
    "id": "cross-validation",
    "name": "Cross-Validation",
    "area": "Evaluation & Calibration",
    "summary": "Estimate out-of-sample error and select hyperparameters by rotating a held-out fold through the data: split into k folds, train on k-1 and score on the held-out one, then average over all k. Train error falls monotonically with capacity and cannot pick a model, while the CV error is U-shaped and its minimum is the bias/variance sweet spot. k=5 and k=10 are typical, and k=N is leave-one-out. Watch for leakage: use grouped, stratified or time-series splits, and nested CV when selecting AND scoring.",
    "tex": "\\mathrm{CV} = \\tfrac{1}{k}\\sum_{f=1}^{k} \\mathrm{err}\\big(\\text{model}_{-f},\\, \\text{fold}_f\\big)",
    "prereqs": [
      "bias-variance"
    ],
    "leadsTo": []
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
  ],
  "cross-validation": [
    {
      "kind": "demo",
      "slug": "cross-validation"
    },
    {
      "kind": "demo",
      "slug": "forecasting"
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
