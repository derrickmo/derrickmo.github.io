// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "bayesian-optimization" (3), for its Connections
// panel. Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "bayesian-optimization": [
      "bayesian-optimization",
      "gaussian-process",
      "bandit"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "bayesian-optimization": {
    "id": "bayesian-optimization",
    "name": "Bayesian Optimization",
    "area": "Probability & Bayes",
    "summary": "Optimize an expensive black-box function with few evaluations: fit a GP surrogate, then sample where an acquisition function (Expected Improvement / UCB / PI) maximizes expected payoff — the explore/exploit trade in continuous space. The engine of modern hyperparameter tuning.",
    "tex": "x_{t+1} = \\arg\\max_x\\ \\alpha\\big(x \\mid \\mathcal{D}_t\\big)",
    "prereqs": [
      "gaussian-process",
      "bandit"
    ],
    "leadsTo": []
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
  },
  "bandit": {
    "id": "bandit",
    "name": "Multi-Armed Bandit (Explore/Exploit)",
    "area": "Reinforcement Learning",
    "summary": "Choose between uncertain options to minimize cumulative regret — RL's simplest, omnipresent problem.",
    "leadsTo": [
      "mcts",
      "bayesian-optimization",
      "regret-matching"
    ],
    "prereqs": []
  }
};
window.CONCEPT_REVERSE = {
  "bayesian-optimization": [
    {
      "kind": "demo",
      "slug": "bayesian-optimization"
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
  ],
  "bandit": [
    {
      "kind": "demo",
      "slug": "thompson-vs-ucb"
    },
    {
      "kind": "demo",
      "slug": "bayesian-optimization"
    },
    {
      "kind": "demo",
      "slug": "regret-matching"
    },
    {
      "kind": "demo",
      "slug": "mcts"
    },
    {
      "kind": "demo",
      "slug": "bandit"
    },
    {
      "kind": "game",
      "slug": "go"
    },
    {
      "kind": "module",
      "slug": "reinforcement-learning"
    }
  ]
};
