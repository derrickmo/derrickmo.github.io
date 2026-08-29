// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/ml-applications/label-propagation/.
// concept-lesson-app.jsx reads window.DM_SUBLESSON_CTX and falls back to
// window.DM_SUBLESSON(...) so the page still works if this file is ever missing.

window.DM_SUBLESSON_CTX = {
  "module": {
    "title": "Applied Machine Learning",
    "lessons": {
      "forecasting": {
        "title": "Time-Series Forecasting"
      },
      "calibration": {
        "title": "Calibration"
      },
      "conformal": {
        "title": "Conformal Prediction"
      },
      "fairness": {
        "title": "Fairness Metrics"
      },
      "pagerank": {
        "title": "PageRank"
      },
      "community-detection": {
        "title": "Community Detection (Louvain)"
      },
      "label-propagation": {
        "title": "Label Propagation"
      },
      "kalman-filter": {
        "title": "Kalman Filter"
      }
    }
  },
  "moduleSlug": "ml-applications",
  "conceptId": "label-propagation",
  "lesson": {
    "title": "Label Propagation",
    "oneLine": "Let a few labels diffuse through a similarity graph — powerful when the manifold assumption holds, and biased by whichever class you happened to label.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Given a handful of labelled points and a great many unlabelled ones, build a graph connecting similar points and let the labels spread along its edges. Each unlabelled node repeatedly takes the weighted average of its neighbours' label distributions while the labelled nodes are pinned to their known values. Iterate to convergence and read off the majority label at each node.",
          "The assumption this encodes is that the data lies on a low-dimensional manifold and that labels vary smoothly along it — points connected by a short path through dense regions should share a label, even if they are far apart in straight-line distance. That is exactly the situation where supervised learning from four labelled points would be hopeless and this is not.",
          "Measured on two interleaved moons with just two labelled points per class: label propagation on a 7-nearest-neighbour graph classified all 156 remaining points correctly, against 97.4 percent for a nearest-neighbour classifier given the same four labels. The gain comes entirely from following the manifold rather than the ambient distance."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "The iteration and its closed form. Splitting the weight matrix into labelled and unlabelled blocks, the fixed point is a linear solve, so this is a harmonic function on the graph:"
        ],
        "tex": "F_u \\leftarrow D_{uu}^{-1}\\left(W_{ul}F_l + W_{uu}F_u\\right) \\quad \\Longrightarrow \\quad F_u = \\left(D_{uu} - W_{uu}\\right)^{-1}W_{ul}F_l",
        "texNote": "The solution is harmonic: every unlabelled node's value is the weighted average of its neighbours', which is the discrete analogue of a function with zero Laplacian. It is also equivalent to the probability that a random walk started at that node reaches a positively labelled node before a negatively labelled one."
      },
      {
        "h": "In code",
        "code": "from sklearn.semi_supervised import LabelSpreading\nimport numpy as np\n\ny_semi = np.full(len(X), -1)          # -1 marks unlabelled\ny_semi[labelled_idx] = y[labelled_idx]\n\n# kNN kernel, not RBF. A dense RBF graph over the whole set gives every pair a nonzero\n# weight, so labels leak directly across the gap between manifolds instead of following\n# them - which quietly destroys the property the method exists for.\nmodel = LabelSpreading(kernel=\"knn\", n_neighbors=7, alpha=0.2)\nmodel.fit(X, y_semi)\npred = model.transduction_\n\n# LabelSpreading uses the NORMALISED Laplacian and a clamping parameter alpha, so labelled\n# points can be overridden - which is what you want if some labels are noisy.\n# LabelPropagation clamps them hard, which is right only when labels are trusted.",
        "caption": "The graph construction is the model. Choosing the kernel and its bandwidth or neighbour count matters more than anything in the propagation step, and there is no way to cross-validate it honestly with four labels."
      },
      {
        "h": "The bias, and what it actually follows",
        "paras": [
          "Repeat the same experiment with an imbalanced dataset — 140 points in one class and 20 in the other, still two labels per class — and accuracy falls to 82.1 percent, which is BELOW the 88.5 percent you would get by predicting the majority class for everything. It assigned 46 of the unlabelled points to the minority class when only 18 belong there.",
          "The usual folk statement is that propagation is biased toward the majority class. The measurement says something more precise: the bias follows the composition of the LABELLED set, not the true prior. Two seeds among 20 points exert far more influence per unlabelled point than two seeds among 140, so the sparsely populated class over-propagates. Label proportionally to the classes and the effect reverses.",
          "Class mass normalisation is the standard correction — rescale each class's total mass to match a known or estimated prior before taking the argmax. It recovered 94.9 percent on the same imbalanced problem, back above the majority baseline.",
          "One honest control result: on that imbalanced problem, plain nearest-neighbour from the same four labels scored 98.1 percent, beating both. The moons are nearly separable in the ambient space at this noise level, so the manifold structure had little to add and the graph's imbalance sensitivity was pure downside. Label propagation earns its keep when the manifold assumption genuinely does work — and when it does not, it is a more fragile method than the simple baseline, not merely an equivalent one. Always run the trivial baseline."
        ]
      }
    ],
    "takeaways": [
      "Labels diffuse to a harmonic fixed point on the graph, equivalent to a random walk's hitting probability; with 2 labels per class it reached 100% on two moons against 97.4% for nearest-neighbour.",
      "The imbalance bias follows the LABELLED set's composition, not the true prior — 46 points assigned to a 18-point class — and class mass normalisation corrected it from 82.1% to 94.9%.",
      "The graph IS the model, and it cannot be honestly cross-validated with a handful of labels. On a problem where the manifold added nothing, plain 1-NN beat it at 98.1%."
    ],
    "demo": "label-propagation"
  },
  "order": [
    "forecasting",
    "calibration",
    "conformal",
    "fairness",
    "pagerank",
    "community-detection",
    "label-propagation",
    "kalman-filter"
  ],
  "index": 6,
  "prev": "community-detection",
  "next": "kalman-filter"
};
