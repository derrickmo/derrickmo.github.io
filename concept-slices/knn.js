// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/knn/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
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
  "vector-search": {
    "id": "vector-search",
    "name": "Vector Search / ANN",
    "area": "Retrieval",
    "summary": "Embed items, then fetch the k nearest by cosine or Euclidean — the engine under semantic search and RAG.",
    "prereqs": [
      "embeddings",
      "knn"
    ],
    "leadsTo": [
      "rag-chunking",
      "semantic-caching",
      "hyde",
      "reranking",
      "rag-fusion"
    ]
  },
  "dbscan": {
    "id": "dbscan",
    "name": "DBSCAN",
    "area": "Classical ML",
    "summary": "Density-based clustering: declare any point with at least MIN_PTS neighbors within EPS a core point, link cores into clusters, sweep up reachable borders, label the rest as noise.",
    "prereqs": [
      "knn"
    ],
    "leadsTo": []
  },
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
  "kernel-density": {
    "id": "kernel-density",
    "name": "Kernel Density Estimation",
    "area": "Classical ML",
    "summary": "Nonparametric density estimation: place a kernel K (Gaussian, Epanechnikov, box) on every sample and average them, f̂(x)=1/(Nh)·ΣK((x−x_i)/h). The bandwidth h is a pure bias/variance knob — too small overfits into spikes, too large oversmooths and merges modes. The smooth upgrade to a histogram; underlies kernel regression (Nadaraya-Watson), mean-shift clustering, anomaly detection, and violin plots. Suffers the curse of dimensionality and leaks mass past hard boundaries; bandwidth choice (CV / Silverman's rule) is the whole game.",
    "tex": "\\hat f(x) = \\frac{1}{Nh}\\sum_{i=1}^{N} K\\!\\left(\\frac{x - x_i}{h}\\right)",
    "prereqs": [
      "clt",
      "knn"
    ],
    "leadsTo": []
  }
};
window.CONCEPT_REVERSE = {
  "knn": [
    {
      "kind": "demo",
      "slug": "knn"
    },
    {
      "kind": "demo",
      "slug": "vector-search"
    },
    {
      "kind": "demo",
      "slug": "dbscan"
    },
    {
      "kind": "demo",
      "slug": "label-propagation"
    },
    {
      "kind": "demo",
      "slug": "kernel-density"
    },
    {
      "kind": "module",
      "slug": "supervised-learning"
    }
  ]
};
