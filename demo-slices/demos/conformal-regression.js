// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "conformal-regression" (3), for its Connections
// panel. Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "conformal-regression": [
      "conformal-regression",
      "conformal",
      "linear-regression"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "conformal-regression": {
    "id": "conformal-regression",
    "name": "Conformal Regression",
    "area": "Evaluation & Calibration",
    "summary": "Split conformal applied to regression: calibrate a residual score on held-out data, take its (1−α) quantile q̂, and emit the interval f̂(x) ± q̂. Coverage P(y ∈ [lo,hi]) ≥ 1−α holds for any regressor — underfitting just widens the band. Normalizing the score by a local spread estimate σ̂(x) gives locally-adaptive widths (the idea behind Conformalized Quantile Regression, CQR).",
    "tex": "C(x) = \\hat f(x) \\pm \\hat q\\,\\hat\\sigma(x), \\quad \\hat q = \\mathrm{Quantile}\\bigl(\\{|y_i-\\hat f(x_i)|/\\hat\\sigma(x_i)\\}, \\tfrac{\\lceil (n+1)(1-\\alpha)\\rceil}{n}\\bigr)",
    "prereqs": [
      "conformal",
      "linear-regression"
    ],
    "leadsTo": []
  },
  "conformal": {
    "id": "conformal",
    "name": "Conformal Prediction",
    "area": "Evaluation & Calibration",
    "summary": "Wrap any model to output a prediction SET with a finite-sample, distribution-free coverage guarantee: P(y ∈ set) ≥ 1−α. Calibrate a nonconformity-score quantile q̂ on held-out data; the guarantee holds regardless of model quality (a worse model just yields larger sets). Assumes exchangeability; coverage is marginal, not conditional.",
    "tex": "\\hat q = \\mathrm{Quantile}\\bigl( \\{s_i\\}, \\tfrac{\\lceil (n+1)(1-\\alpha) \\rceil}{n} \\bigr)",
    "prereqs": [
      "calibration",
      "roc"
    ],
    "leadsTo": [
      "certified-robustness",
      "conformal-regression"
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
  "conformal-regression": [
    {
      "kind": "demo",
      "slug": "conformal-regression"
    },
    {
      "kind": "module",
      "slug": "trustworthy-ai"
    }
  ],
  "conformal": [
    {
      "kind": "demo",
      "slug": "certified-robustness"
    },
    {
      "kind": "demo",
      "slug": "conformal"
    },
    {
      "kind": "demo",
      "slug": "conformal-regression"
    },
    {
      "kind": "module",
      "slug": "trustworthy-ai"
    }
  ],
  "linear-regression": [
    {
      "kind": "demo",
      "slug": "ista"
    },
    {
      "kind": "demo",
      "slug": "bayesian-linear-regression"
    },
    {
      "kind": "demo",
      "slug": "perceptron"
    },
    {
      "kind": "demo",
      "slug": "regression"
    },
    {
      "kind": "demo",
      "slug": "conformal-regression"
    },
    {
      "kind": "demo",
      "slug": "simpsons-paradox"
    },
    {
      "kind": "demo",
      "slug": "instrumental-variables"
    },
    {
      "kind": "demo",
      "slug": "ransac"
    }
  ]
};
