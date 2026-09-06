// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to modules "supervised-learning" (4), for its Connections panel.
// Same global names as concepts-index.js, with 184 fewer concepts in them.

window.CONCEPT_TAGS = {
  "modules": {
    "supervised-learning": [
      "svm",
      "knn",
      "decision-tree",
      "roc"
    ]
  }
};
window.CONCEPTS_INDEX = {
  "svm": {
    "id": "svm",
    "name": "SVM (Max-Margin + Kernels)",
    "area": "Classical ML",
    "summary": "Find the widest-margin separating boundary; bend it nonlinearly with the kernel trick.",
    "prereqs": [
      "linear-regression"
    ],
    "tex": "\\min_w \\tfrac{1}{2}\\lVert w \\rVert^2 + C \\sum_i \\xi_i",
    "leadsTo": [
      "attention",
      "gaussian-process"
    ]
  },
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
  "decision-tree": {
    "id": "decision-tree",
    "name": "Decision Tree",
    "area": "Classical ML",
    "summary": "Split feature space greedily by the cut that most reduces impurity; the building block of forests and boosting.",
    "leadsTo": [
      "entropy",
      "ensembles"
    ],
    "prereqs": []
  },
  "roc": {
    "id": "roc",
    "name": "ROC / PR Curves",
    "area": "Classical ML",
    "summary": "Slide a threshold across a score model to read off recall, precision, and the threshold-free AUC.",
    "prereqs": [
      "logistic-regression"
    ],
    "leadsTo": [
      "classification-metrics",
      "calibration",
      "conformal",
      "fairness"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "svm": [
    {
      "kind": "demo",
      "slug": "gaussian-process"
    },
    {
      "kind": "demo",
      "slug": "svm"
    },
    {
      "kind": "demo",
      "slug": "perceptron"
    },
    {
      "kind": "module",
      "slug": "supervised-learning"
    }
  ],
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
  ],
  "decision-tree": [
    {
      "kind": "demo",
      "slug": "bagging-boosting"
    },
    {
      "kind": "demo",
      "slug": "decision-tree"
    },
    {
      "kind": "module",
      "slug": "supervised-learning"
    }
  ],
  "roc": [
    {
      "kind": "demo",
      "slug": "classification-metrics"
    },
    {
      "kind": "demo",
      "slug": "roc"
    },
    {
      "kind": "demo",
      "slug": "calibration"
    },
    {
      "kind": "demo",
      "slug": "conformal"
    },
    {
      "kind": "demo",
      "slug": "fairness"
    },
    {
      "kind": "demo",
      "slug": "imbalanced-data"
    },
    {
      "kind": "module",
      "slug": "supervised-learning"
    }
  ]
};
