// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "instrumental-variables" (3), for its Connections
// panel. Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "instrumental-variables": [
      "instrumental-variables",
      "causal-inference",
      "linear-regression"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "instrumental-variables": {
    "id": "instrumental-variables",
    "name": "Instrumental Variables",
    "area": "Causal Inference",
    "summary": "When a confounder is unobserved so back-door adjustment fails, an instrument Z recovers the causal effect of X on Y. Z must satisfy relevance (it moves X) and exclusion (it affects Y only through X). Two-stage least squares regresses X on Z, then Y on the fitted X̂; equivalently β̂ = Cov(Z,Y)/Cov(Z,X). Weak instruments (low first-stage F) inflate variance; exclusion violations reintroduce bias. Under heterogeneity it estimates a local effect (LATE).",
    "tex": "\\hat\\beta_{IV} = \\frac{\\mathrm{Cov}(Z,Y)}{\\mathrm{Cov}(Z,X)}",
    "prereqs": [
      "causal-inference",
      "linear-regression"
    ],
    "leadsTo": []
  },
  "causal-inference": {
    "id": "causal-inference",
    "name": "Causal Inference (do-operator)",
    "area": "Causal Inference",
    "summary": "P(Y|X) — what you observe — is not P(Y|do(X)) — what happens if you intervene. The do-operator models intervention as cutting the incoming arrows to the variable you set, removing confounding bias. When you can't experiment, the back-door criterion says which variables to condition on to recover the causal effect from observational data; condition on the wrong one (collider/mediator) and you add bias.",
    "tex": "P(Y \\mid do(X)) = \\sum_{z} P(Y \\mid X, z)\\, P(z)",
    "prereqs": [
      "simpsons-paradox"
    ],
    "leadsTo": [
      "instrumental-variables"
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
  "instrumental-variables": [
    {
      "kind": "demo",
      "slug": "instrumental-variables"
    },
    {
      "kind": "module",
      "slug": "causal-inference"
    }
  ],
  "causal-inference": [
    {
      "kind": "demo",
      "slug": "activation-patching"
    },
    {
      "kind": "demo",
      "slug": "do-intervention"
    },
    {
      "kind": "demo",
      "slug": "instrumental-variables"
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
