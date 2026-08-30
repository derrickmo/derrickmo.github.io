// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "coreset" (3), for its Connections panel.
// Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "coreset": [
      "coreset",
      "kmeans",
      "active-learning"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "coreset": {
    "id": "coreset",
    "name": "Coresets",
    "area": "Data-Centric",
    "summary": "A small, weighted subset S of the data on which the objective (e.g. k-means cost) for ANY candidate solution approximates the full-data objective within (1±ε). Train on S to get nearly the full answer at a fraction of the cost. Importance/sensitivity sampling picks points proportional to how much they can influence the cost and reweights by 1/(m·q) to stay unbiased — far better than uniform at tiny sizes. Foundational to scalable ML and data selection/pruning.",
    "tex": "q_i = \\tfrac{1}{2N} + \\tfrac{1}{2}\\,\\frac{d(x_i,\\mu)^2}{\\sum_j d(x_j,\\mu)^2}, \\quad w_i = \\tfrac{1}{m\\,q_i}",
    "prereqs": [
      "kmeans",
      "active-learning"
    ],
    "leadsTo": [
      "dataset-distillation"
    ]
  },
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
  "active-learning": {
    "id": "active-learning",
    "name": "Active Learning",
    "area": "Data-Centric",
    "summary": "Cut labeling cost by letting the model choose what to label next. Uncertainty sampling queries the unlabeled point nearest the decision boundary (most uncertain); refitting on those informative points reaches high accuracy with far fewer labels than random. The core loop of data-centric ML and human-in-the-loop annotation.",
    "prereqs": [
      "logistic-regression",
      "calibration"
    ],
    "leadsTo": [
      "coreset"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "coreset": [
    {
      "kind": "demo",
      "slug": "coreset"
    },
    {
      "kind": "demo",
      "slug": "dataset-distillation"
    }
  ],
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
  "active-learning": [
    {
      "kind": "demo",
      "slug": "active-learning"
    },
    {
      "kind": "demo",
      "slug": "coreset"
    }
  ]
};
