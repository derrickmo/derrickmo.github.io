// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "active-learning" (2), for its Connections panel.
// Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "active-learning": [
      "active-learning",
      "logistic-regression"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
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
  }
};
window.CONCEPT_REVERSE = {
  "active-learning": [
    {
      "kind": "demo",
      "slug": "active-learning"
    },
    {
      "kind": "demo",
      "slug": "coreset"
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
  ]
};
