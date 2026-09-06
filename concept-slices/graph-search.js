// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/graph-search/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
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
  },
  "dijkstra": {
    "id": "dijkstra",
    "name": "Dijkstra's Shortest Path",
    "area": "Graphs",
    "summary": "Single-source shortest paths on a graph with non-negative edge weights. Repeatedly settle the unsettled node with the smallest tentative distance and relax its edges (dist[v] = min(dist[v], dist[u]+w)); because weights are non-negative, a settled node's distance is final, so the greedy order is optimal. O(E log V) with a binary heap. The weighted generalization of BFS and the parent of A* (Dijkstra plus an admissible heuristic). Negative edges require Bellman-Ford instead.",
    "prereqs": [
      "graph-search"
    ],
    "leadsTo": [
      "mst"
    ]
  },
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
  "graph-search": [
    {
      "kind": "demo",
      "slug": "dijkstra"
    },
    {
      "kind": "demo",
      "slug": "max-flow"
    },
    {
      "kind": "demo",
      "slug": "branch-and-bound"
    },
    {
      "kind": "demo",
      "slug": "bfs-dfs-astar"
    },
    {
      "kind": "demo",
      "slug": "complexity-growth"
    },
    {
      "kind": "module",
      "slug": "interview-capstone"
    }
  ]
};
