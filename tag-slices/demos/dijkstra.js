// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "dijkstra" (2), for its Connections panel.
// Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "dijkstra": [
      "dijkstra",
      "graph-search"
    ]
  },
  "games": {}
};
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
  ],
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
      "kind": "module",
      "slug": "interview-capstone"
    }
  ]
};
