// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/dijkstra/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
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
  "mst": {
    "id": "mst",
    "name": "Minimum Spanning Tree",
    "area": "Graphs",
    "summary": "The cheapest set of edges that connects every node without cycles. Prim's grows one tree, repeatedly adding the lightest edge crossing from the tree to the outside; Kruskal's adds globally-cheapest edges that don't create a cycle (using union-find). Both are greedy and correct by the cut property: the lightest edge across any cut of the nodes belongs to some MST. Used for network/circuit layout, single-link clustering, and TSP approximation.",
    "prereqs": [
      "dijkstra"
    ],
    "leadsTo": []
  }
};
window.CONCEPT_REVERSE = {
  "dijkstra": [
    {
      "kind": "demo",
      "slug": "dijkstra"
    },
    {
      "kind": "demo",
      "slug": "mst"
    }
  ]
};
