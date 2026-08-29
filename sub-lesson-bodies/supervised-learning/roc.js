// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/supervised-learning/roc/.
// concept-lesson-app.jsx reads window.DM_SUBLESSON_CTX and falls back to
// window.DM_SUBLESSON(...) so the page still works if this file is ever missing.

window.DM_SUBLESSON_CTX = {
  "module": {
    "title": "Supervised Learning",
    "lessons": {
      "decision-tree": {
        "title": "Decision Trees"
      },
      "roc": {
        "title": "ROC and Thresholds"
      },
      "bayesian-linear-regression": {
        "title": "Bayesian Linear Regression"
      }
    }
  },
  "moduleSlug": "supervised-learning",
  "conceptId": "roc",
  "lesson": {
    "title": "ROC and Thresholds",
    "oneLine": "Score a classifier honestly across every decision threshold.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Accuracy hides the trade-off between catching positives and raising false alarms - and collapses on imbalanced data. The ROC curve sweeps the decision threshold and plots true-positive rate against false-positive rate, and the area under it (AUC) summarizes ranking quality independent of any single threshold."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "The curve plots, over all thresholds t, the two rates:"
        ],
        "tex": "\\text{TPR} = \\frac{TP}{TP+FN},\\qquad \\text{FPR} = \\frac{FP}{FP+TN}",
        "texNote": "AUC is the probability a random positive is ranked above a random negative."
      },
      {
        "h": "In code",
        "code": "import numpy as np\n\ndef roc_points(scores, y):\n    for t in np.sort(scores)[::-1]:\n        pred = scores >= t\n        tpr = (pred & (y == 1)).sum() / max((y == 1).sum(), 1)\n        fpr = (pred & (y == 0)).sum() / max((y == 0).sum(), 1)\n        yield fpr, tpr",
        "caption": "Sweep the threshold, trace the curve, integrate for AUC."
      },
      {
        "h": "AUC is blind to the part you look at",
        "paras": [
          "ROC-AUC averages over every threshold, including the ones nobody would ever deploy, so under class imbalance it can rank two models almost identically while they differ enormously where it matters. On a 1%-positive problem, model A scores AUC 0.9979 and model B scores 0.9846 — a gap of 0.013, easily dismissed as noise. Precision@100 is 1.000 for A and 0.030 for B.",
          "The reason is that the false-positive rate on the x-axis is divided by a huge negative count, so a slice of confident false positives barely moves the curve while completely occupying the top of the ranked list. Since almost every deployment consumes a top-k list or a single threshold, precision-recall curves, precision@k or cost-weighted metrics answer the operational question and AUC answers a different one. Quote AUC for a threshold-free comparison of ranking quality, and never let it stand in for how the system will behave."
        ]
      }
    ],
    "takeaways": [
      "ROC separates ranking quality from the choice of threshold.",
      "AUC is threshold-free and robust to class imbalance.",
      "Pick the operating threshold from the curve, by the cost of each error."
    ],
    "demo": "roc"
  },
  "order": [
    "decision-tree",
    "roc",
    "bayesian-linear-regression"
  ],
  "index": 1,
  "prev": "decision-tree",
  "next": "bayesian-linear-regression"
};
