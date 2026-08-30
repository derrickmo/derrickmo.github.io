// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "naive-bayes" (3), for its Connections
// panel. Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "naive-bayes": [
      "naive-bayes",
      "bayes",
      "gmm-em"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "naive-bayes": {
    "id": "naive-bayes",
    "name": "Naive Bayes",
    "area": "Classical ML",
    "summary": "A generative classifier applying Bayes' rule with a deliberately naive twist: features are assumed conditionally independent given the class, so the class-conditional likelihood factorizes into per-feature terms (a diagonal-covariance Gaussian, or word counts for text). Fast, low-data, high-dimensional-friendly — the classic spam filter and a perennial baseline. Relaxing the diagonal constraint gives QDA (full per-class covariance) or LDA (shared); the independence assumption is usually wrong yet the argmax is often still right, though predicted probabilities end up overconfident/poorly calibrated.",
    "tex": "\\hat y = \\arg\\max_c\\; P(c)\\prod_{j} P(x_j \\mid c)",
    "prereqs": [
      "bayes"
    ],
    "leadsTo": [
      "svm"
    ]
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
  "gmm-em": {
    "id": "gmm-em",
    "name": "Gaussian Mixtures & EM",
    "area": "Classical ML",
    "summary": "Soft clustering by alternating responsibilities (E-step) and Gaussian re-fits (M-step) — the ancestor of variational inference.",
    "prereqs": [
      "kmeans"
    ],
    "leadsTo": [
      "vae"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "naive-bayes": [
    {
      "kind": "demo",
      "slug": "naive-bayes"
    }
  ],
  "bayes": [
    {
      "kind": "demo",
      "slug": "bayesian-linear-regression"
    },
    {
      "kind": "demo",
      "slug": "variational-inference"
    },
    {
      "kind": "demo",
      "slug": "thompson-vs-ucb"
    },
    {
      "kind": "demo",
      "slug": "conjugate-updating"
    },
    {
      "kind": "demo",
      "slug": "gaussian-process"
    },
    {
      "kind": "demo",
      "slug": "bayes"
    },
    {
      "kind": "demo",
      "slug": "mcmc"
    },
    {
      "kind": "demo",
      "slug": "kalman-filter"
    },
    {
      "kind": "demo",
      "slug": "hmm-viterbi"
    },
    {
      "kind": "demo",
      "slug": "naive-bayes"
    },
    {
      "kind": "module",
      "slug": "foundations"
    },
    {
      "kind": "module",
      "slug": "causal-inference"
    }
  ],
  "gmm-em": [
    {
      "kind": "demo",
      "slug": "kmeans"
    },
    {
      "kind": "demo",
      "slug": "gmm"
    },
    {
      "kind": "demo",
      "slug": "vae"
    },
    {
      "kind": "demo",
      "slug": "naive-bayes"
    },
    {
      "kind": "module",
      "slug": "unsupervised-learning"
    }
  ]
};
