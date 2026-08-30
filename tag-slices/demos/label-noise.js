// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "label-noise" (2), for its Connections panel.
// Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "label-noise": [
      "label-noise",
      "overfitting"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "label-noise": {
    "id": "label-noise",
    "name": "Label Noise & Memorization",
    "area": "Evaluation & Calibration",
    "summary": "Learning when training labels are wrong. A flexible model first fits the genuine structure (good test accuracy) but, given enough capacity and epochs, memorizes the mislabeled points — train accuracy on noisy labels rises while true test accuracy falls. Motivates early stopping, robust losses, label smoothing, sample selection, and confident-learning data cleaning.",
    "prereqs": [
      "overfitting"
    ],
    "leadsTo": []
  },
  "overfitting": {
    "id": "overfitting",
    "name": "Overfitting & Generalization",
    "area": "Evaluation & Calibration",
    "summary": "A model that memorises its training set stops describing the world. The gap between training error and test error is the quantity every regularizer, held-out split and early-stopping rule exists to manage — and it is why a lower training loss is never on its own evidence of a better model.",
    "tex": "\\mathbb{E}[\\text{test}] = \\underbrace{\\mathbb{E}[\\text{train}]}_{\\text{fit}} + \\underbrace{(\\mathbb{E}[\\text{test}] - \\mathbb{E}[\\text{train}])}_{\\text{generalization gap}}",
    "prereqs": [
      "bias-variance"
    ],
    "leadsTo": [
      "regularization",
      "cross-validation",
      "double-descent",
      "label-noise"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "label-noise": [
    {
      "kind": "demo",
      "slug": "label-noise"
    }
  ],
  "overfitting": [
    {
      "kind": "demo",
      "slug": "overfitting"
    },
    {
      "kind": "demo",
      "slug": "label-noise"
    }
  ]
};
