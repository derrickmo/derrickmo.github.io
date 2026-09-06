// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "imbalanced-data" (3), for its Connections panel.
// Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "imbalanced-data": [
      "classification-metrics",
      "calibration",
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
  "calibration": {
    "id": "calibration",
    "name": "Model Calibration",
    "area": "Evaluation & Calibration",
    "summary": "Whether a model's confidence scores are honest: a calibrated classifier that says 90% is right 90% of the time. Measured by the reliability diagram and Expected Calibration Error (ECE); modern nets are overconfident, and temperature scaling (divide logits by T) is the standard one-parameter post-hoc fix that leaves predictions unchanged.",
    "tex": "\\mathrm{ECE} = \\sum_{b} \\frac{n_b}{N} \\,\\bigl| \\mathrm{acc}(b) - \\mathrm{conf}(b) \\bigr|",
    "prereqs": [
      "logistic-regression",
      "roc"
    ],
    "leadsTo": [
      "conformal",
      "active-learning",
      "fairness",
      "distillation",
      "drift-detection",
      "mc-dropout",
      "model-cascade"
    ]
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
      "kind": "demo",
      "slug": "imbalanced-data"
    },
    {
      "kind": "module",
      "slug": "interview-capstone"
    }
  ],
  "calibration": [
    {
      "kind": "demo",
      "slug": "model-cascade"
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
      "slug": "distillation"
    },
    {
      "kind": "demo",
      "slug": "mc-dropout"
    },
    {
      "kind": "demo",
      "slug": "imbalanced-data"
    },
    {
      "kind": "demo",
      "slug": "train-serve-skew"
    },
    {
      "kind": "module",
      "slug": "trustworthy-ai"
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
