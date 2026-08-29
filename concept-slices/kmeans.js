// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/kmeans/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
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
  },
  "gmm-em": {
    "id": "gmm-em",
    "name": "Gaussian Mixtures & EM",
    "area": "Classical ML",
    "summary": "Soft clustering by alternating responsibilities (E-step) and Gaussian re-fits (M-step) — the ancestor of variational inference.",
    "prereqs": [
      "kmeans"
    ],
    "leadsTo": [
      "vae"
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
  },
  "coreset": {
    "id": "coreset",
    "name": "Coresets",
    "area": "Data-Centric",
    "summary": "A small, weighted subset S of the data on which the objective (e.g. k-means cost) for ANY candidate solution approximates the full-data objective within (1±ε). Train on S to get nearly the full answer at a fraction of the cost. Importance/sensitivity sampling picks points proportional to how much they can influence the cost and reweights by 1/(m·q) to stay unbiased — far better than uniform at tiny sizes. Foundational to scalable ML and data selection/pruning.",
    "tex": "q_i = \\tfrac{1}{2N} + \\tfrac{1}{2}\\,\\frac{d(x_i,\\mu)^2}{\\sum_j d(x_j,\\mu)^2}, \\quad w_i = \\tfrac{1}{m\\,q_i}",
    "prereqs": [
      "kmeans",
      "active-learning"
    ],
    "leadsTo": [
      "dataset-distillation"
    ]
  }
};
window.CONCEPT_REVERSE = {
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
