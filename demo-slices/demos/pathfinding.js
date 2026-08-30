// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "pathfinding" (1), for its Connections
// panel. Same global names as concepts-index.js, with 187 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "pathfinding": [
      "search-astar"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
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
