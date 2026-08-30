// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "classification-metrics" (2), for its Connections panel.
// Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "classification-metrics": [
      "classification-metrics",
      "roc"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "classification-metrics": {
    "id": "classification-metrics",
    "name": "Classification Metrics",
    "area": "Evaluation & Calibration",
    "summary": "Everything read off the confusion matrix: precision, recall, F1, and the macro/micro/weighted averagings plus F-beta. Accuracy and micro-F1 are dominated by the majority class; macro-F1 exposes weak minority classes. Choosing the metric that matches each error's cost is half of responsible ML.",
    "tex": "F_\\beta = (1+\\beta^2)\\,\\frac{P\\cdot R}{\\beta^2 P + R}",
    "prereqs": [
      "roc"
    ],
    "leadsTo": []
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
  "classification-metrics": [
    {
      "kind": "demo",
      "slug": "classification-metrics"
    },
    {
      "kind": "module",
      "slug": "interview-capstone"
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
      "kind": "module",
      "slug": "supervised-learning"
    }
  ]
};
