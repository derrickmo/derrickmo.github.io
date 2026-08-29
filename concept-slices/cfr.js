// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/cfr/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
  "cfr": {
    "id": "cfr",
    "name": "Counterfactual Regret Minimization",
    "area": "Game AI",
    "summary": "Self-play with regret matching — converges to a Nash equilibrium for imperfect-information games like poker.",
    "prereqs": [
      "regret-matching"
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
  "cfr": [
    {
      "kind": "game",
      "slug": "poker"
    }
  ]
};
