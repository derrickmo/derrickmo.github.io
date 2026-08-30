// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "n-queens" (2), for its Connections
// panel. Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "n-queens": [
      "backtracking",
      "search-astar"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "backtracking": {
    "id": "backtracking",
    "name": "Backtracking & CSP",
    "area": "Algorithms",
    "summary": "Solve constraint-satisfaction problems by depth-first search: assign variables one at a time, and the moment a constraint is violated with no legal value left, undo (backtrack) and try the previous variable differently. Constraint propagation (forward checking, AC-3) and ordering heuristics prune the exponential tree to make it practical. A complete method — finds a solution if one exists.",
    "prereqs": [
      "search-astar"
    ],
    "leadsTo": [
      "arc-consistency"
    ]
  },
  "search-astar": {
    "id": "search-astar",
    "name": "A* / Informed Search",
    "area": "Algorithms",
    "summary": "Rank candidate states by cost-so-far plus an admissible estimate of cost-to-go (f = g + h).",
    "tex": "f(n) = g(n) + h(n)",
    "leadsTo": [
      "minimax",
      "mcts",
      "simulated-annealing",
      "backtracking",
      "graph-search"
    ],
    "prereqs": []
  }
};
window.CONCEPT_REVERSE = {
  "backtracking": [
    {
      "kind": "demo",
      "slug": "n-queens"
    },
    {
      "kind": "demo",
      "slug": "graph-coloring"
    },
    {
      "kind": "demo",
      "slug": "sudoku"
    }
  ],
  "search-astar": [
    {
      "kind": "demo",
      "slug": "pathfinding"
    },
    {
      "kind": "demo",
      "slug": "simulated-annealing"
    },
    {
      "kind": "demo",
      "slug": "n-queens"
    },
    {
      "kind": "demo",
      "slug": "bfs-dfs-astar"
    },
    {
      "kind": "game",
      "slug": "connect-four"
    },
    {
      "kind": "game",
      "slug": "chess"
    }
  ]
};
