// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "max-flow" (3), for its Connections
// panel. Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "max-flow": [
      "max-flow",
      "graph-search",
      "spectral-clustering"
    ]
  },
  "games": {}
};
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
  "spectral-clustering": {
    "id": "spectral-clustering",
    "name": "Spectral Clustering",
    "area": "Classical ML",
    "summary": "Cluster by graph connectivity rather than Euclidean distance. Build a similarity graph (RBF or k-NN weights W), form the normalized Laplacian L = I − D^{−1/2}WD^{−1/2}, take its K smallest eigenvectors as an embedding, and run k-means there. A relaxation of the normalized-cut objective; the eigenvectors separate connected components, so it clusters non-convex shapes (rings, moons) that centroid methods cut through. Needs K and a good similarity graph; exact eigendecomposition is O(n³).",
    "tex": "L = I - D^{-1/2} W D^{-1/2}, \\quad \\text{cluster on bottom-}K\\text{ eigenvectors}",
    "prereqs": [
      "kmeans",
      "pca"
    ],
    "leadsTo": [
      "manifold-learning",
      "label-propagation"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "max-flow": [
    {
      "kind": "demo",
      "slug": "max-flow"
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
  ],
  "spectral-clustering": [
    {
      "kind": "demo",
      "slug": "isomap"
    },
    {
      "kind": "demo",
      "slug": "label-propagation"
    },
    {
      "kind": "demo",
      "slug": "spectral-clustering"
    },
    {
      "kind": "demo",
      "slug": "louvain"
    },
    {
      "kind": "demo",
      "slug": "max-flow"
    }
  ]
};
