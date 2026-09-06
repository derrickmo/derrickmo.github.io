// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "kalman-filter" (3), for its Connections panel.
// Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "kalman-filter": [
      "kalman-filter",
      "bayes",
      "clt"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "kalman-filter": {
    "id": "kalman-filter",
    "name": "Kalman Filter",
    "area": "Time Series",
    "summary": "Optimal recursive state estimation for a linear-Gaussian system: keep a Gaussian belief (mean + covariance) over hidden state and alternately predict it forward through a motion model and update it toward each noisy measurement. The Kalman gain optimally blends model trust (process noise Q) against sensor trust (measurement noise R). It's exact recursive Bayesian filtering, the workhorse behind GPS/IMU sensor fusion, robotics/SLAM, and object tracking; nonlinear systems use the Extended/Unscented variants or particle filters.",
    "tex": "K = P^- H^\\top (H P^- H^\\top + R)^{-1}",
    "prereqs": [
      "bayes",
      "clt"
    ],
    "leadsTo": []
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
  "clt": {
    "id": "clt",
    "name": "Central Limit Theorem",
    "area": "Probability & Bayes",
    "summary": "Averages of many independent samples converge to a Gaussian — why the bell curve is everywhere.",
    "leadsTo": [
      "ica",
      "mcmc",
      "importance-sampling",
      "reservoir-sampling",
      "kalman-filter",
      "kernel-density",
      "self-consistency",
      "drift-detection"
    ],
    "prereqs": []
  }
};
window.CONCEPT_REVERSE = {
  "kalman-filter": [
    {
      "kind": "demo",
      "slug": "kalman-filter"
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
  "clt": [
    {
      "kind": "demo",
      "slug": "ica"
    },
    {
      "kind": "demo",
      "slug": "clt"
    },
    {
      "kind": "demo",
      "slug": "mcmc"
    },
    {
      "kind": "demo",
      "slug": "importance-sampling"
    },
    {
      "kind": "demo",
      "slug": "reservoir-sampling"
    },
    {
      "kind": "demo",
      "slug": "kalman-filter"
    },
    {
      "kind": "demo",
      "slug": "kernel-density"
    },
    {
      "kind": "demo",
      "slug": "drift-detection"
    },
    {
      "kind": "demo",
      "slug": "bootstrap"
    },
    {
      "kind": "demo",
      "slug": "hypothesis-test"
    },
    {
      "kind": "module",
      "slug": "foundations"
    }
  ]
};
