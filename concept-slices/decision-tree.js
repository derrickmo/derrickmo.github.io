// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/decision-tree/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
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
  "entropy": {
    "id": "entropy",
    "name": "Entropy & Information Gain",
    "area": "Information Theory",
    "summary": "Measure uncertainty in bits — the criterion behind decision-tree splits, cross-entropy, and information-greedy strategies.",
    "tex": "H(p) = -\\sum_i p_i \\log p_i",
    "leadsTo": [
      "mutual-information",
      "channel-capacity",
      "huffman-coding"
    ],
    "prereqs": []
  },
  "ensembles": {
    "id": "ensembles",
    "name": "Ensembles (Bagging & Boosting)",
    "area": "Classical ML",
    "summary": "Combine many trees to beat any single one. Bagging trains each tree on a bootstrap resample and averages them, cutting VARIANCE (random forests add per-split feature randomness) — wants deep, high-variance learners and is order-independent. Boosting fits trees sequentially to the residual error, adding a shrunken step ν·tree, cutting BIAS — wants shallow weak learners and generalizes residual-fitting to any differentiable loss (gradient boosting: XGBoost/LightGBM). The dominant approach for tabular data.",
    "tex": "\\text{bagging: } \\bar f = \\tfrac1M\\sum_m f_m, \\quad \\text{boosting: } F_M = F_0 + \\nu\\sum_m h_m",
    "prereqs": [
      "decision-tree",
      "bias-variance"
    ],
    "leadsTo": []
  }
};
window.CONCEPT_REVERSE = {
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
  ]
};
