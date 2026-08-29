// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/tsne/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
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
  "tokenization": {
    "id": "tokenization",
    "name": "Tokenization (BPE)",
    "area": "NLP",
    "summary": "Subword units learned by merging frequent character pairs — every LLM's first step.",
    "leadsTo": [
      "embeddings",
      "constrained-decoding"
    ],
    "prereqs": []
  }
};
window.CONCEPT_REVERSE = {
  "tsne": [
    {
      "kind": "demo",
      "slug": "tsne"
    }
  ]
};
