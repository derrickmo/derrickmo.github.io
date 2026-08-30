// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "hierarchical-clustering" (2), for its Connections
// panel. Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "hierarchical-clustering": [
      "hierarchical-clustering",
      "kmeans"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
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
  },
  "kmeans": {
    "id": "kmeans",
    "name": "K-Means Clustering",
    "area": "Classical ML",
    "summary": "Alternate-assign-then-update centroids until clusters stabilize (Lloyd's algorithm).",
    "leadsTo": [
      "gmm-em",
      "hierarchical-clustering",
      "spectral-clustering",
      "coreset"
    ],
    "prereqs": []
  }
};
window.CONCEPT_REVERSE = {
  "hierarchical-clustering": [
    {
      "kind": "demo",
      "slug": "hierarchical-clustering"
    },
    {
      "kind": "demo",
      "slug": "mst"
    }
  ],
  "kmeans": [
    {
      "kind": "demo",
      "slug": "kmeans"
    },
    {
      "kind": "demo",
      "slug": "gmm"
    },
    {
      "kind": "demo",
      "slug": "hierarchical-clustering"
    },
    {
      "kind": "demo",
      "slug": "spectral-clustering"
    },
    {
      "kind": "demo",
      "slug": "coreset"
    },
    {
      "kind": "module",
      "slug": "unsupervised-learning"
    }
  ]
};
