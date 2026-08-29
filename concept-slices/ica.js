// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/ica/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

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
  ]
};
