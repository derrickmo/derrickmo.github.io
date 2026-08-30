// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "gaussian-process" (3), for its Connections
// panel. Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "gaussian-process": [
      "gaussian-process",
      "bayes",
      "svm"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
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
  "svm": {
    "id": "svm",
    "name": "SVM (Max-Margin + Kernels)",
    "area": "Classical ML",
    "summary": "Find the widest-margin separating boundary; bend it nonlinearly with the kernel trick.",
    "prereqs": [
      "linear-regression"
    ],
    "tex": "\\min_w \\tfrac{1}{2}\\lVert w \\rVert^2 + C \\sum_i \\xi_i",
    "leadsTo": [
      "attention",
      "gaussian-process"
    ]
  }
};
window.CONCEPT_REVERSE = {
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
  "svm": [
    {
      "kind": "demo",
      "slug": "gaussian-process"
    },
    {
      "kind": "demo",
      "slug": "svm"
    },
    {
      "kind": "demo",
      "slug": "perceptron"
    },
    {
      "kind": "module",
      "slug": "supervised-learning"
    }
  ]
};
