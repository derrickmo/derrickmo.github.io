// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/bandit/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
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
  },
  "mcts": {
    "id": "mcts",
    "name": "Monte-Carlo Tree Search",
    "area": "Game AI",
    "summary": "Build a search tree biased by UCB and random rollouts — the engine behind AlphaGo and AlphaZero.",
    "prereqs": [
      "bandit",
      "minimax"
    ],
    "leadsTo": []
  },
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
  "regret-matching": {
    "id": "regret-matching",
    "name": "Regret Matching & Nash Equilibrium",
    "area": "Reinforcement Learning",
    "summary": "A no-regret learning rule: play actions in proportion to positive cumulative regret. In self-play the time-averaged strategy converges to a Nash equilibrium — the normal-form core of CFR (Counterfactual Regret Minimization), the algorithm behind superhuman poker.",
    "tex": "\\sigma^{t+1}(a) = \\frac{R^t_+(a)}{\\sum_{a'} R^t_+(a')}",
    "prereqs": [
      "bandit"
    ],
    "leadsTo": [
      "replicator-dynamics",
      "iterated-prisoners-dilemma",
      "cfr"
    ]
  }
};
window.CONCEPT_REVERSE = {
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
      "kind": "demo",
      "slug": "hypothesis-test"
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
