// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "simpsons-paradox" (2), for its Connections
// panel. Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "simpsons-paradox": [
      "simpsons-paradox",
      "linear-regression"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "simpsons-paradox": {
    "id": "simpsons-paradox",
    "name": "Simpson's Paradox & Confounding",
    "area": "Causal Inference",
    "summary": "A trend present in every subgroup can reverse when the groups are pooled, because a confounder correlates with both X and Y. The most vivid demonstration that correlation is not causation: the correct estimate depends on which variables you condition on, which is decided by the causal structure, not the data alone. Motivates stratification, regression controls, and randomization.",
    "prereqs": [
      "linear-regression",
      "bayes"
    ],
    "leadsTo": [
      "causal-inference"
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
  "simpsons-paradox": [
    {
      "kind": "demo",
      "slug": "simpsons-paradox"
    },
    {
      "kind": "demo",
      "slug": "do-intervention"
    },
    {
      "kind": "module",
      "slug": "causal-inference"
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
