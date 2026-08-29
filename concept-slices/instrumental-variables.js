// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/instrumental-variables/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

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
  },
  "bayes": {
    "id": "bayes",
    "name": "Bayes' Rule (Conjugate Updating)",
    "area": "Probability & Bayes",
    "summary": "Update a prior belief into a posterior with new evidence — Beta-Bernoulli is the closed-form case behind A/B tests, Thompson sampling, and uncertainty estimation.",
    "tex": "P(\\theta \\mid D) = \\frac{P(D \\mid \\theta)\\, P(\\theta)}{P(D)}",
    "prereqs": [
      "cross-entropy"
    ],
    "leadsTo": [
      "bandit",
      "vae",
      "kalman-filter",
      "mcmc",
      "bayesian-linear-regression",
      "variational-inference",
      "naive-bayes",
      "gaussian-process",
      "hmm-viterbi",
      "simpsons-paradox"
    ]
  },
  "cross-entropy": {
    "id": "cross-entropy",
    "name": "Cross-Entropy",
    "area": "Information Theory",
    "summary": "The loss that measures how much a predicted distribution disagrees with the true labels.",
    "tex": "H(p, q) = -\\sum_i p_i \\log q_i",
    "prereqs": [
      "softmax"
    ],
    "leadsTo": [
      "scaling-laws",
      "bayes",
      "gan",
      "logistic-regression"
    ]
  },
  "softmax": {
    "id": "softmax",
    "name": "Softmax",
    "area": "Neural Networks",
    "summary": "Turn a vector of logits into a probability distribution; the workhorse output and attention nonlinearity.",
    "tex": "\\mathrm{softmax}(z)_i = \\frac{e^{z_i}}{\\sum_j e^{z_j}}",
    "leadsTo": [
      "contrastive-learning",
      "cross-entropy",
      "word2vec",
      "attention",
      "decoding"
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
  ]
};
