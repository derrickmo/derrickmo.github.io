// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "simulated-annealing" (2), for its Connections
// panel. Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "simulated-annealing": [
      "simulated-annealing",
      "search-astar"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "simulated-annealing": {
    "id": "simulated-annealing",
    "name": "Simulated Annealing",
    "area": "Optimization",
    "summary": "Local search with a Metropolis acceptance rule — accept worse moves with probability e^{-ΔE/T}, then cool. The general-purpose escape from local minima.",
    "tex": "P(\\text{accept}) = \\exp\\!\\left(-\\frac{\\Delta E}{T}\\right)",
    "prereqs": [
      "search-astar"
    ],
    "leadsTo": [
      "neuroevolution"
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
  "simulated-annealing": [
    {
      "kind": "demo",
      "slug": "simulated-annealing"
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
