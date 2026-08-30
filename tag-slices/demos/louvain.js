// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "louvain" (3), for its Connections panel.
// Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "louvain": [
      "community-detection",
      "pagerank",
      "spectral-clustering"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "community-detection": {
    "id": "community-detection",
    "name": "Community Detection (Louvain)",
    "area": "Graphs",
    "summary": "Partition a network into densely-connected groups by maximizing modularity Q = Σ_c [ in_c/2m − (tot_c/2m)² ] — how many more edges fall inside communities than chance predicts. Louvain's local-moving phase greedily relocates each node to the neighbor community that most raises Q, then collapses communities into super-nodes and repeats. Fast and widely used (Leiden is the improved successor), but Q has many near-equal optima and a resolution limit that can merge small real communities. The graph analogue of clustering.",
    "prereqs": [
      "pagerank"
    ],
    "leadsTo": []
  },
  "pagerank": {
    "id": "pagerank",
    "name": "PageRank",
    "area": "Graphs",
    "summary": "Rank nodes by the importance of the nodes linking to them, resolved by power iteration: PR_i = (1-d)/N + d·Σ_{j→i} PR_j/outdeg_j (plus dangling mass). It is the stationary distribution of a random surfer who follows a link with probability d and teleports otherwise — the teleport makes the chain ergodic so a unique answer exists. Mathematically the dominant eigenvector of the damped transition matrix. Launched Google; reused for citation ranking, recommendation, spam detection, and TextRank.",
    "tex": "PR_i = \\frac{1-d}{N} + d \\sum_{j \\to i} \\frac{PR_j}{\\mathrm{outdeg}(j)}",
    "prereqs": [
      "markov"
    ],
    "leadsTo": [
      "community-detection"
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
  "community-detection": [
    {
      "kind": "demo",
      "slug": "louvain"
    }
  ],
  "pagerank": [
    {
      "kind": "demo",
      "slug": "pagerank"
    },
    {
      "kind": "demo",
      "slug": "louvain"
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
