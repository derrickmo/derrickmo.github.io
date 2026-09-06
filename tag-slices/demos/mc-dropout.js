// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "mc-dropout" (2), for its Connections panel.
// Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "mc-dropout": [
      "mc-dropout",
      "calibration"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "mc-dropout": {
    "id": "mc-dropout",
    "name": "MC Dropout (Bayesian uncertainty)",
    "area": "Evaluation & Calibration",
    "summary": "Estimate predictive uncertainty by keeping dropout on at inference and averaging many stochastic forward passes — each mask is a thinned sub-network, and their spread approximates Bayesian posterior uncertainty (Gal & Ghahramani, 2016). Uncertainty grows where data is sparse; the cheap cousin of Bayesian nets and deep ensembles. Powers selective prediction, active learning, and OOD detection.",
    "prereqs": [
      "calibration"
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
  }
};
window.CONCEPT_REVERSE = {
  "mc-dropout": [
    {
      "kind": "demo",
      "slug": "mc-dropout"
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
  ]
};
