// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "isomap" (3), for its Connections
// panel. Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "isomap": [
      "manifold-learning",
      "pca",
      "spectral-clustering"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "manifold-learning": {
    "id": "manifold-learning",
    "name": "Manifold Learning (Isomap)",
    "area": "Classical ML",
    "summary": "Nonlinear dimensionality reduction that assumes data lies on a low-dimensional manifold curved through a high-D space. Isomap measures GEODESIC distance (shortest path through a k-NN graph) instead of straight-line distance, then runs classical MDS (double-center the squared-distance matrix, take top eigenvectors) to embed while preserving global geometry. Unrolls swiss-roll-like structure that PCA folds. Hinges on the neighborhood graph: too-large k or noise creates short-circuit edges, too-small k disconnects it. Cousin of LLE, Laplacian eigenmaps, and spectral methods; t-SNE/UMAP instead preserve local neighborhoods.",
    "tex": "B = -\\tfrac{1}{2} J D_{geo}^2 J,\\quad Y = \\text{top eigenvectors}(B)",
    "prereqs": [
      "pca",
      "spectral-clustering"
    ],
    "leadsTo": []
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
  "manifold-learning": [
    {
      "kind": "demo",
      "slug": "isomap"
    }
  ],
  "pca": [
    {
      "kind": "demo",
      "slug": "pca"
    },
    {
      "kind": "demo",
      "slug": "ica"
    },
    {
      "kind": "demo",
      "slug": "tsne"
    },
    {
      "kind": "demo",
      "slug": "isomap"
    },
    {
      "kind": "demo",
      "slug": "lora"
    },
    {
      "kind": "demo",
      "slug": "spectral-clustering"
    },
    {
      "kind": "demo",
      "slug": "pagerank"
    },
    {
      "kind": "module",
      "slug": "unsupervised-learning"
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
