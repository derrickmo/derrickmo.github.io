// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "mst" (3), for its Connections panel.
// Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "mst": [
      "mst",
      "dijkstra",
      "hierarchical-clustering"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "mst": {
    "id": "mst",
    "name": "Minimum Spanning Tree",
    "area": "Graphs",
    "summary": "The cheapest set of edges that connects every node without cycles. Prim's grows one tree, repeatedly adding the lightest edge crossing from the tree to the outside; Kruskal's adds globally-cheapest edges that don't create a cycle (using union-find). Both are greedy and correct by the cut property: the lightest edge across any cut of the nodes belongs to some MST. Used for network/circuit layout, single-link clustering, and TSP approximation.",
    "prereqs": [
      "dijkstra"
    ],
    "leadsTo": []
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
  "hierarchical-clustering": {
    "id": "hierarchical-clustering",
    "name": "Hierarchical Clustering",
    "area": "Classical ML",
    "summary": "Agglomerative clustering builds a tree (dendrogram) by repeatedly merging the two closest clusters; cut the tree at any height to get that many clusters — no k chosen up front, and you get a full multi-resolution hierarchy. The linkage defines cluster distance: single (min pair, chains, ~MST), complete (max pair, compact), average (mean), or Ward (least within-cluster variance increase, k-means-like). Greedy and irreversible, O(n²) memory / O(n³) time, and sensitive to linkage + metric; the cut height is still a judgment call (gap statistic, silhouette).",
    "tex": "d_{\\text{Ward}}(A,B) = \\sqrt{\\tfrac{2|A||B|}{|A|+|B|}}\\,\\lVert \\bar{A}-\\bar{B}\\rVert",
    "prereqs": [
      "kmeans"
    ],
    "leadsTo": []
  }
};
window.CONCEPT_REVERSE = {
  "mst": [
    {
      "kind": "demo",
      "slug": "mst"
    }
  ],
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
  "hierarchical-clustering": [
    {
      "kind": "demo",
      "slug": "hierarchical-clustering"
    },
    {
      "kind": "demo",
      "slug": "mst"
    }
  ]
};
