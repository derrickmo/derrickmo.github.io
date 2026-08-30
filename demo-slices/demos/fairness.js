// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "fairness" (3), for its Connections
// panel. Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "fairness": [
      "fairness",
      "roc",
      "calibration"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "fairness": {
    "id": "fairness",
    "name": "Fairness & Group Metrics",
    "area": "Trustworthy ML",
    "summary": "Equitable treatment formalized into competing statistical criteria — demographic parity (equal selection rate), equal opportunity (equal TPR), equalized odds (equal TPR+FPR) — which are provably incompatible when groups differ in base rate or score distribution. Bias often sits upstream in the data, so picking a metric is a value judgment, not a checkbox.",
    "prereqs": [
      "roc",
      "calibration"
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
  }
};
window.CONCEPT_REVERSE = {
  "fairness": [
    {
      "kind": "demo",
      "slug": "fairness"
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
      "kind": "module",
      "slug": "supervised-learning"
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
      "kind": "module",
      "slug": "trustworthy-ai"
    }
  ]
};
