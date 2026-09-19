// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to games "poker" (3), for its Connections panel.
// Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {},
  "games": {
    "poker": [
      "cfr",
      "regret-matching",
      "minimax"
    ]
  }
};
window.CONCEPTS_INDEX = {
  "cfr": {
    "id": "cfr",
    "name": "Counterfactual Regret Minimization",
    "area": "Game AI",
    "summary": "Self-play with regret matching, which converges to a Nash equilibrium for imperfect-information games like poker.",
    "prereqs": [
      "regret-matching"
    ],
    "leadsTo": []
  },
  "regret-matching": {
    "id": "regret-matching",
    "name": "Regret Matching & Nash Equilibrium",
    "area": "Reinforcement Learning",
    "summary": "A no-regret learning rule: play actions in proportion to positive cumulative regret. In self-play the time-averaged strategy converges to a Nash equilibrium. It is the normal-form core of CFR (Counterfactual Regret Minimization), the algorithm behind superhuman poker.",
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
  "minimax": {
    "id": "minimax",
    "name": "Minimax + Alpha-Beta",
    "area": "Game AI",
    "summary": "Search the game tree assuming the opponent plays optimally; prune branches that can't improve the result.",
    "prereqs": [
      "search-astar"
    ],
    "leadsTo": [
      "mcts"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "cfr": [
    {
      "kind": "game",
      "slug": "poker"
    }
  ],
  "regret-matching": [
    {
      "kind": "demo",
      "slug": "regret-matching"
    },
    {
      "kind": "demo",
      "slug": "replicator-dynamics"
    },
    {
      "kind": "demo",
      "slug": "pd-tournament"
    },
    {
      "kind": "game",
      "slug": "poker"
    },
    {
      "kind": "game",
      "slug": "rps"
    }
  ],
  "minimax": [
    {
      "kind": "demo",
      "slug": "mcts"
    },
    {
      "kind": "game",
      "slug": "tic-tac-toe"
    },
    {
      "kind": "game",
      "slug": "connect-four"
    },
    {
      "kind": "game",
      "slug": "chess"
    },
    {
      "kind": "game",
      "slug": "go"
    },
    {
      "kind": "game",
      "slug": "poker"
    },
    {
      "kind": "game",
      "slug": "twenty48"
    }
  ]
};
