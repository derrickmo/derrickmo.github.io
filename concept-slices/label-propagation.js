// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/label-propagation/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
  "label-propagation": {
    "id": "label-propagation",
    "name": "Label Propagation",
    "area": "Classical ML",
    "summary": "Graph-based semi-supervised learning: build a similarity graph over labeled + unlabeled points, seed the labeled nodes, and iterate F←D⁻¹W·F while re-clamping seeds so label mass diffuses along dense regions. A handful of labels can classify a whole manifold via the cluster assumption — points linked through high-density regions share a label. Same random-walk/graph-Laplacian machinery as spectral clustering and PageRank. Transductive (labels this set, not a reusable model) and very sensitive to graph construction; a bad graph confidently spreads errors.",
    "tex": "F \\leftarrow D^{-1} W\\, F, \\quad \\text{clamp labeled rows}",
    "prereqs": [
      "knn",
      "spectral-clustering"
    ],
    "leadsTo": []
  },
  "knn": {
    "id": "knn",
    "name": "k-Nearest Neighbors",
    "area": "Classical ML",
    "summary": "Label by majority vote of the k closest training points — no training, the data is the model.",
    "leadsTo": [
      "vector-search",
      "dbscan",
      "label-propagation",
      "kernel-density"
    ],
    "prereqs": []
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
  "pca": {
    "id": "pca",
    "name": "PCA / SVD",
    "area": "Classical ML",
    "summary": "Project data onto the eigenvectors of its covariance — the basic linear dimensionality reduction.",
    "leadsTo": [
      "embeddings",
      "lora",
      "tsne",
      "ica",
      "manifold-learning",
      "harris-corners",
      "spectral-clustering"
    ],
    "prereqs": []
  }
};
window.CONCEPT_REVERSE = {
  "label-propagation": [
    {
      "kind": "demo",
      "slug": "label-propagation"
    }
  ]
};
