// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "calibration" (3), for its Connections panel.
// Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "calibration": [
      "calibration",
      "logistic-regression",
      "roc"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
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
  "logistic-regression": {
    "id": "logistic-regression",
    "name": "Logistic Regression",
    "area": "Classical ML",
    "summary": "Sigmoid over a linear score, trained with binary cross-entropy. The last layer of every neural classifier — and the multi-class generalization is softmax.",
    "tex": "P(y{=}1 \\mid x) = \\sigma(w^\\top x + b)",
    "prereqs": [
      "linear-regression",
      "cross-entropy"
    ],
    "leadsTo": [
      "mlp",
      "probing-classifier",
      "roc",
      "reward-model",
      "calibration",
      "shap",
      "active-learning"
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
  "logistic-regression": [
    {
      "kind": "demo",
      "slug": "probing-classifier"
    },
    {
      "kind": "demo",
      "slug": "regression"
    },
    {
      "kind": "demo",
      "slug": "reward-model"
    },
    {
      "kind": "demo",
      "slug": "calibration"
    },
    {
      "kind": "demo",
      "slug": "shap"
    },
    {
      "kind": "demo",
      "slug": "active-learning"
    },
    {
      "kind": "demo",
      "slug": "mle"
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
