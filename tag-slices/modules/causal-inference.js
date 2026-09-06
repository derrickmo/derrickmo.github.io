// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to modules "causal-inference" (5), for its Connections panel.
// Same global names as concepts-index.js, with 183 fewer concepts in them.

window.CONCEPT_TAGS = {
  "modules": {
    "causal-inference": [
      "causal-inference",
      "instrumental-variables",
      "simpsons-paradox",
      "bayes",
      "mcmc"
    ]
  }
};
window.CONCEPTS_INDEX = {
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
  "mcmc": {
    "id": "mcmc",
    "name": "MCMC (Metropolis-Hastings)",
    "area": "Probability & Bayes",
    "summary": "Sample from a distribution known only up to a constant by simulating a Markov chain whose stationary distribution is the target. Random-walk Metropolis proposes x'=x+N(0,σ²I) and accepts with prob min(1, p(x')/p(x)); the visited points (after burn-in) are correlated samples from p. The engine of practical Bayesian inference (Stan, PyMC) when the posterior has no closed form. Proposal scale trades acceptance against mixing; high dimensions and separated modes need gradient-based samplers (HMC/NUTS).",
    "tex": "\\alpha = \\min\\!\\left(1, \\dfrac{p(x')}{p(x)}\\right)",
    "prereqs": [
      "bayes",
      "clt"
    ],
    "leadsTo": [
      "importance-sampling"
    ]
  }
};
window.CONCEPT_REVERSE = {
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
      "kind": "demo",
      "slug": "hypothesis-test"
    },
    {
      "kind": "module",
      "slug": "causal-inference"
    }
  ],
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
      "kind": "demo",
      "slug": "mle"
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
  "mcmc": [
    {
      "kind": "demo",
      "slug": "mcmc"
    },
    {
      "kind": "demo",
      "slug": "importance-sampling"
    },
    {
      "kind": "module",
      "slug": "causal-inference"
    }
  ]
};
