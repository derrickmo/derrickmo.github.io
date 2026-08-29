// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/pca/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
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
  "embeddings": {
    "id": "embeddings",
    "name": "Embeddings",
    "area": "NLP",
    "summary": "Map tokens (or items) to vectors so that distance and direction encode meaning.",
    "prereqs": [
      "tokenization"
    ],
    "leadsTo": [
      "vector-search",
      "attention",
      "word2vec",
      "contrastive-learning",
      "tsne",
      "rag-chunking",
      "semantic-caching",
      "hyde"
    ],
    "animation": "viz/embeddings.html"
  },
  "lora": {
    "id": "lora",
    "name": "LoRA (Low-Rank Adaptation)",
    "area": "Fine-Tuning",
    "summary": "Freeze the base model and learn a thin rank-r product B·A per layer — adapt big models on a budget.",
    "prereqs": [
      "pca",
      "mlp",
      "attention"
    ],
    "leadsTo": [
      "quantization"
    ]
  },
  "tsne": {
    "id": "tsne",
    "name": "t-SNE / UMAP",
    "area": "Classical ML",
    "summary": "Nonlinear dimensionality reduction for visualization that preserves local NEIGHBORHOODS, not distances. Converts high-D distances to neighbor probabilities (Gaussian, width set by perplexity), matches them in 2D with a heavy-tailed Student-t, and minimizes KL(P‖Q) by gradient descent — the fat tail lets clusters separate without crowding. Unlike PCA it separates nonlinearly-tangled clusters, but cluster sizes and inter-cluster gaps are NOT meaningful and results depend on perplexity/seed. UMAP is the faster modern alternative.",
    "tex": "q_{ij} = \\frac{(1+\\lVert y_i-y_j\\rVert^2)^{-1}}{\\sum_{k\\neq l}(1+\\lVert y_k-y_l\\rVert^2)^{-1}}",
    "prereqs": [
      "pca",
      "embeddings"
    ],
    "leadsTo": []
  },
  "ica": {
    "id": "ica",
    "name": "Independent Component Analysis",
    "area": "Classical ML",
    "summary": "Blind source separation: recover independent source signals from linear mixtures using only the mixtures. Where PCA decorrelates (second-order, orthogonal directions), ICA seeks statistical independence (all orders), found by maximizing non-Gaussianity — justified by the CLT, since mixtures look more Gaussian than their parts. FastICA whitens with PCA then runs a fixed-point iteration with a contrast like tanh. Recovers sources up to scale, sign, and permutation; at most one source may be Gaussian. Used for the cocktail-party problem and EEG/MEG/fMRI artifact removal.",
    "tex": "s = W x,\\quad W = \\arg\\max\\ \\text{nonGaussianity}(Wx)",
    "prereqs": [
      "pca",
      "clt"
    ],
    "leadsTo": []
  },
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
  "harris-corners": {
    "id": "harris-corners",
    "name": "Harris Corner Detector",
    "area": "Computer Vision",
    "summary": "Find corner keypoints — points where image intensity changes in two directions at once. Build the structure tensor M by summing gradient products (Ix^2, Iy^2, IxIy) over a Gaussian window; its two eigenvalues describe how intensity varies in the two principal directions. Flat = both small, edge = one large, corner = both large. The response R = det(M) - k*trace(M)^2 detects the both-large case cheaply (positive at corners, negative at edges), then threshold + non-max suppression localize them. Foundation of feature tracking, image matching, panorama stitching, camera calibration, and SLAM.",
    "prereqs": [
      "edge-detection",
      "pca"
    ],
    "leadsTo": [
      "optical-flow"
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
  ]
};
