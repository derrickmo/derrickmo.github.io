// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "bayesian-linear-regression" (4), for its Connections
// panel. Same global names as concepts-index.js, with 184 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "bayesian-linear-regression": [
      "bayesian-linear-regression",
      "bayes",
      "linear-regression",
      "gaussian-process"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
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
  "gaussian-process": {
    "id": "gaussian-process",
    "name": "Gaussian Processes",
    "area": "Classical ML",
    "summary": "A distribution over functions defined by a kernel: any finite set of points is jointly Gaussian. Conditioning on observations gives a closed-form posterior — mean k*ᵀ(K+σ²I)⁻¹y and variance that shrinks at data and grows away from it, so predictions come with honest, calibrated uncertainty. The kernel (lengthscale, amplitude) is the entire inductive bias. Exact inference is O(n³) (matrix inverse), the basis of Bayesian optimization and kriging; sparse/inducing-point methods scale it up.",
    "tex": "\\mu(x_*)=k_*^\\top(K+\\sigma_n^2 I)^{-1}y,\\quad \\sigma^2(x_*)=k_{**}-k_*^\\top(K+\\sigma_n^2 I)^{-1}k_*",
    "prereqs": [
      "bayes",
      "svm"
    ],
    "leadsTo": [
      "bayesian-optimization"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "bayesian-linear-regression": [
    {
      "kind": "demo",
      "slug": "bayesian-linear-regression"
    },
    {
      "kind": "demo",
      "slug": "conjugate-updating"
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
  ],
  "gaussian-process": [
    {
      "kind": "demo",
      "slug": "bayesian-linear-regression"
    },
    {
      "kind": "demo",
      "slug": "bayesian-optimization"
    },
    {
      "kind": "demo",
      "slug": "gaussian-process"
    }
  ]
};
