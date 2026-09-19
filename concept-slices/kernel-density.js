// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/kernel-density/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
  "kernel-density": {
    "id": "kernel-density",
    "name": "Kernel Density Estimation",
    "area": "Classical ML",
    "summary": "Nonparametric density estimation: place a kernel K (Gaussian, Epanechnikov, box) on every sample and average them, f-hat(x)=1/(Nh)*sum K((x-x_i)/h). The bandwidth h is a pure bias/variance knob, since too small overfits into spikes and too large oversmooths and merges modes. It is the smooth upgrade to a histogram, and it underlies kernel regression (Nadaraya-Watson), mean-shift clustering, anomaly detection and violin plots. It suffers the curse of dimensionality and leaks mass past hard boundaries, and bandwidth choice by CV or Silverman's rule is the whole game.",
    "tex": "\\hat f(x) = \\frac{1}{Nh}\\sum_{i=1}^{N} K\\!\\left(\\frac{x - x_i}{h}\\right)",
    "prereqs": [
      "clt",
      "knn"
    ],
    "leadsTo": []
  },
  "clt": {
    "id": "clt",
    "name": "Central Limit Theorem",
    "area": "Probability & Bayes",
    "summary": "Averages of many independent samples converge to a Gaussian, which is why the bell curve is everywhere.",
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
  },
  "knn": {
    "id": "knn",
    "name": "k-Nearest Neighbors",
    "area": "Classical ML",
    "summary": "Label by majority vote of the k closest training points. There is no training step, because the data is the model.",
    "leadsTo": [
      "vector-search",
      "dbscan",
      "label-propagation",
      "kernel-density"
    ],
    "prereqs": []
  }
};
window.CONCEPT_REVERSE = {
  "kernel-density": [
    {
      "kind": "demo",
      "slug": "kernel-density"
    }
  ]
};
