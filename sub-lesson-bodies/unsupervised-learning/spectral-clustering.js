// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/unsupervised-learning/spectral-clustering/.
// concept-lesson-app.jsx reads window.DM_SUBLESSON_CTX and falls back to
// window.DM_SUBLESSON(...) so the page still works if this file is ever missing.

window.DM_SUBLESSON_CTX = {
  "module": {
    "title": "Unsupervised Learning",
    "lessons": {
      "dbscan": {
        "title": "DBSCAN"
      },
      "hierarchical-clustering": {
        "title": "Hierarchical Clustering"
      },
      "tsne": {
        "title": "t-SNE"
      },
      "spectral-clustering": {
        "title": "Spectral Clustering"
      },
      "kernel-density": {
        "title": "Kernel Density Estimation"
      }
    }
  },
  "moduleSlug": "unsupervised-learning",
  "conceptId": "spectral-clustering",
  "lesson": {
    "title": "Spectral Clustering",
    "oneLine": "Cut the similarity graph, not the feature space — which is why it finds the two interleaved rings that k-means cannot.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "k-means assumes clusters are blobs around a centre, so it fails on any shape where two points in the same cluster are far apart — two concentric rings, two interleaved crescents. Spectral clustering changes the question from 'which centre is this near?' to 'which points are connected to each other?'.",
          "Build a graph where edges join similar points, then look for a cut that severs few edges while keeping both sides substantial. The eigenvectors of the graph Laplacian give you coordinates in which that cut is a straight line — so you run k-means there instead of in the original space."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "The Laplacian encodes the graph; its smallest eigenvectors are the smooth functions on it, and they are what you cluster:"
        ],
        "tex": "L = D - W, \\qquad L_{\\text{sym}} = I - D^{-1/2} W D^{-1/2}",
        "texNote": "W is the affinity matrix, D the diagonal of row sums. The number of zero eigenvalues equals the number of connected components — so the eigenvalue gap tells you how many clusters the graph actually supports, which is more information than k-means gives you."
      },
      {
        "h": "In code",
        "code": "import numpy as np\nfrom scipy.linalg import eigh\n\ndef spectral(X, k, sigma=1.0):\n    d2 = ((X[:, None, :] - X[None, :, :]) ** 2).sum(-1)\n    W = np.exp(-d2 / (2 * sigma ** 2))      # Gaussian affinity\n    np.fill_diagonal(W, 0)\n    d = W.sum(1)\n    L = np.eye(len(X)) - (W / np.sqrt(np.outer(d, d)))\n    _, V = eigh(L, subset_by_index=[0, k - 1])\n    V = V / np.linalg.norm(V, axis=1, keepdims=True)\n    return V                                 # now run k-means on these rows",
        "caption": "The whole method is: build affinities, take the bottom k eigenvectors, cluster those. The hard part is sigma."
      },
      {
        "h": "What it costs you",
        "paras": [
          "The affinity kernel width is the whole model. Too small and the graph fragments into isolated points; too large and everything connects and the structure disappears. There is no way to set it from the objective — it is a modelling choice you have to check.",
          "It is O(n^2) to build the affinity matrix and worse to decompose it, so it does not scale the way k-means does. Nystrom approximation and k-nearest-neighbour graphs are the standard escapes.",
          "And it gives you no way to assign a NEW point without recomputing — there is no centroid to compare against. If you need to cluster a stream, this is the wrong tool."
        ]
      }
    ],
    "takeaways": [
      "Spectral clustering replaces 'near a centre' with 'connected in a graph', which is why it handles non-convex shapes.",
      "The eigenvalue gap of the Laplacian is a genuine signal about how many clusters the data supports.",
      "It costs O(n^2) memory, has no out-of-sample rule, and its kernel width is an unavoidable modelling choice."
    ],
    "demo": "spectral-clustering"
  },
  "order": [
    "dbscan",
    "hierarchical-clustering",
    "tsne",
    "spectral-clustering",
    "kernel-density"
  ],
  "index": 3,
  "prev": "tsne",
  "next": "kernel-density"
};
