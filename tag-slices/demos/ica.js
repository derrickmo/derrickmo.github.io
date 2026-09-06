// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "ica" (3), for its Connections panel.
// Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "ica": [
      "ica",
      "pca",
      "clt"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
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
  "clt": {
    "id": "clt",
    "name": "Central Limit Theorem",
    "area": "Probability & Bayes",
    "summary": "Averages of many independent samples converge to a Gaussian — why the bell curve is everywhere.",
    "leadsTo": [
      "ica",
      "mcmc",
      "importance-sampling",
      "reservoir-sampling",
      "kalman-filter",
      "kernel-density",
      "self-consistency",
      "drift-detection"
    ],
    "prereqs": []
  }
};
window.CONCEPT_REVERSE = {
  "ica": [
    {
      "kind": "demo",
      "slug": "ica"
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
      "kind": "demo",
      "slug": "matmul"
    },
    {
      "kind": "demo",
      "slug": "eigenvectors"
    },
    {
      "kind": "module",
      "slug": "unsupervised-learning"
    }
  ],
  "clt": [
    {
      "kind": "demo",
      "slug": "ica"
    },
    {
      "kind": "demo",
      "slug": "clt"
    },
    {
      "kind": "demo",
      "slug": "mcmc"
    },
    {
      "kind": "demo",
      "slug": "importance-sampling"
    },
    {
      "kind": "demo",
      "slug": "reservoir-sampling"
    },
    {
      "kind": "demo",
      "slug": "kalman-filter"
    },
    {
      "kind": "demo",
      "slug": "kernel-density"
    },
    {
      "kind": "demo",
      "slug": "drift-detection"
    },
    {
      "kind": "module",
      "slug": "foundations"
    }
  ]
};
