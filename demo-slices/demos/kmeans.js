// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "kmeans" (2), for its Connections
// panel. Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "kmeans": [
      "kmeans",
      "gmm-em"
    ]
  },
  "games": {}
};
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
  ],
  "gmm-em": [
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
      "slug": "vae"
    },
    {
      "kind": "demo",
      "slug": "naive-bayes"
    },
    {
      "kind": "module",
      "slug": "unsupervised-learning"
    }
  ]
};
