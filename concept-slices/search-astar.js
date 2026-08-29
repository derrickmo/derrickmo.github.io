// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/search-astar/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

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
  "graph-search": {
    "id": "graph-search",
    "name": "Graph Search (BFS / DFS / A*)",
    "area": "Algorithms",
    "summary": "Systematically explore a state graph from a start to a goal. Uninformed methods order the frontier without domain knowledge — BFS (queue, shortest path on unit edges), DFS (stack, low memory, not optimal); informed A* orders by g + h, an admissible heuristic that focuses search toward the goal and stays optimal. The frontier data structure is the whole difference.",
    "prereqs": [
      "search-astar"
    ],
    "leadsTo": [
      "dijkstra",
      "max-flow",
      "branch-and-bound"
    ]
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
