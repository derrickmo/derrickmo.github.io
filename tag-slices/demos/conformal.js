// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "conformal" (3), for its Connections panel.
// Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "conformal": [
      "conformal",
      "calibration",
      "roc"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "conformal": {
    "id": "conformal",
    "name": "Conformal Prediction",
    "area": "Evaluation & Calibration",
    "summary": "Wrap any model to output a prediction SET with a finite-sample, distribution-free coverage guarantee: P(y ∈ set) ≥ 1−α. Calibrate a nonconformity-score quantile q̂ on held-out data; the guarantee holds regardless of model quality (a worse model just yields larger sets). Assumes exchangeability; coverage is marginal, not conditional.",
    "tex": "\\hat q = \\mathrm{Quantile}\\bigl( \\{s_i\\}, \\tfrac{\\lceil (n+1)(1-\\alpha) \\rceil}{n} \\bigr)",
    "prereqs": [
      "calibration",
      "roc"
    ],
    "leadsTo": [
      "certified-robustness",
      "conformal-regression"
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
  "conformal": [
    {
      "kind": "demo",
      "slug": "certified-robustness"
    },
    {
      "kind": "demo",
      "slug": "conformal"
    },
    {
      "kind": "demo",
      "slug": "conformal-regression"
    },
    {
      "kind": "demo",
      "slug": "bootstrap"
    },
    {
      "kind": "module",
      "slug": "trustworthy-ai"
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
