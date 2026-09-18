// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to games "tic-tac-toe" (3), for its Connections panel.
// Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {},
  "games": {
    "tic-tac-toe": [
      "minimax",
      "mcts",
      "branch-and-bound"
    ]
  }
};
window.CONCEPTS_INDEX = {
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
  "branch-and-bound": {
    "id": "branch-and-bound",
    "name": "Branch & Bound",
    "area": "Algorithms",
    "summary": "Exact search over a combinatorial decision tree that prunes provably-hopeless subtrees. At each node compute an optimistic bound (e.g. the LP / fractional relaxation for knapsack); if it can't beat the best complete solution found so far (the incumbent), discard the subtree unopened. Still worst-case exponential, but bound tightness and branching order decide how much it prunes in practice. The engine inside integer-programming solvers (branch-and-cut) and game-tree alpha-beta.",
    "tex": "\\text{prune if } \\mathrm{bound}(node) \\le \\text{incumbent}",
    "prereqs": [
      "dynamic-programming",
      "graph-search"
    ],
    "leadsTo": []
  }
};
window.CONCEPT_REVERSE = {
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
  ],
  "mcts": [
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
      "slug": "go"
    }
  ],
  "branch-and-bound": [
    {
      "kind": "demo",
      "slug": "branch-and-bound"
    },
    {
      "kind": "game",
      "slug": "tic-tac-toe"
    }
  ]
};
