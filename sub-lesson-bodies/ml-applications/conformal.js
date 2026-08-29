// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/ml-applications/conformal/.
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
  "conceptId": "conformal",
  "lesson": {
    "title": "Conformal Prediction",
    "oneLine": "Output prediction sets with a guaranteed coverage rate.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Instead of one guess, conformal prediction returns a set that contains the truth with a chosen probability - say 90% - and that guarantee holds for any model, with no distributional assumptions. When the model is unsure the set is large; when it is confident the set shrinks. It turns any predictor into one with honest uncertainty."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Use a calibration quantile of nonconformity scores to build the set:"
        ],
        "tex": "C(x) = \\{\\,y : s(x,y) \\le \\hat{q}_{1-\\alpha}\\,\\}",
        "texNote": "Coverage of at least 1 - alpha holds marginally; set size grows as the model weakens."
      },
      {
        "h": "In code",
        "code": "import numpy as np\nscores = nonconformity(calib_X, calib_y)\nqhat = np.quantile(scores, 1 - alpha)        # threshold\npred_set = [y for y in classes if score(x, y) <= qhat]",
        "caption": "Calibrate a threshold; include every plausible label."
      },
      {
        "h": "The guarantee is marginal, not conditional",
        "paras": [
          "Split conformal prediction promises that intervals cover the truth at the stated rate over the population, and it delivers exactly that. Calibrating for 90% coverage on a population split evenly between a low-noise and a high-noise group, the measured marginal coverage is 0.895 — and the low-noise group gets 1.000 while the high-noise group gets 0.795.",
          "Nothing has gone wrong: the average is the thing that was promised, and a single global interval width is too wide for one group and too narrow for the other. But it means the guarantee is weakest exactly where the uncertainty is largest, which is usually where someone is relying on it. Recovering per-group behaviour requires asking for it — Mondrian or group-conditional conformal calibrates within each group, and conformalized quantile regression lets the width vary with the input — and each buys conditional coverage with more calibration data per group."
        ]
      }
    ],
    "takeaways": [
      "Conformal sets guarantee coverage for any model.",
      "Set size grows when the model is uncertain.",
      "Coverage is distribution-free and finite-sample valid."
    ],
    "demo": "conformal"
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
  "index": 2,
  "prev": "calibration",
  "next": "fairness"
};
