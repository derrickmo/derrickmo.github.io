// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "conjugate-updating" (2), for its Connections
// panel. Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "conjugate-updating": [
      "bayes",
      "bayesian-linear-regression"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
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
  "bayesian-linear-regression": {
    "id": "bayesian-linear-regression",
    "name": "Bayesian Linear Regression",
    "area": "Probability & Bayes",
    "summary": "Place a Gaussian prior on the weights and infer a Gaussian posterior in closed form, yielding a full predictive distribution with calibrated error bars. The MAP estimate is exactly ridge regression; the infinite-basis limit is a Gaussian process.",
    "tex": "S_N^{-1} = \\alpha I + \\beta\\Phi^{\\top}\\Phi,\\quad m_N = \\beta S_N \\Phi^{\\top} t",
    "prereqs": [
      "linear-regression",
      "bayes"
    ],
    "leadsTo": [
      "gaussian-process"
    ]
  }
};
window.CONCEPT_REVERSE = {
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
  "bayesian-linear-regression": [
    {
      "kind": "demo",
      "slug": "bayesian-linear-regression"
    },
    {
      "kind": "demo",
      "slug": "conjugate-updating"
    }
  ]
};
