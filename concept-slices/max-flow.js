// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/max-flow/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
  "max-flow": {
    "id": "max-flow",
    "name": "Max Flow / Min Cut",
    "area": "Graphs",
    "summary": "The most flow that can be pushed from a source to a sink through capacitated edges. Ford-Fulkerson repeatedly sends the bottleneck capacity along an augmenting path in the residual graph (whose reverse edges allow rerouting earlier flow); Edmonds-Karp uses BFS shortest augmenting paths for a polynomial bound. At termination the nodes reachable from the source define the minimum cut, whose capacity equals the max flow (max-flow min-cut theorem) — a concrete case of LP duality. Solves bipartite matching, image graph-cuts, scheduling, and more.",
    "prereqs": [
      "graph-search"
    ],
    "leadsTo": []
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
  "max-flow": [
    {
      "kind": "demo",
      "slug": "max-flow"
    }
  ]
};
