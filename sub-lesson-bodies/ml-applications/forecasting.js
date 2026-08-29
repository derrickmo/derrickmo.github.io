// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/ml-applications/forecasting/.
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
  "conceptId": "forecasting",
  "lesson": {
    "title": "Time-Series Forecasting",
    "oneLine": "Predict future values from the patterns in past observations.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Forecasting exploits structure in time: trend, seasonality, and autocorrelation. Classical methods decompose the series and extrapolate; modern ones learn the patterns directly. The cardinal rule is to respect time when you evaluate - never let the model peek at the future, and backtest on rolling windows."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "A series is often modeled as trend plus seasonality plus noise:"
        ],
        "tex": "y_t = T_t + S_t + \\varepsilon_t",
        "texNote": "Validate with rolling-origin backtests, never a random split."
      },
      {
        "h": "In code",
        "code": "import numpy as np\n# simple seasonal-naive baseline: repeat last season\ndef seasonal_naive(y, m, h):\n    return np.array([y[-m + (i % m)] for i in range(h)])",
        "caption": "Beat this baseline before trusting anything fancier."
      },
      {
        "h": "The horizon is the whole story",
        "paras": [
          "A forecast's value decays with how far ahead it reaches, and the decay is a property of the process rather than of the model. On an AR(1) series with phi = 0.85 and unconditional standard deviation 1.898, the optimal forecast's RMSE is 1.002 at one step ahead, 1.737 at five, 1.889 at ten and 1.915 at twenty — by which point predicting the unconditional mean scores 1.916. The model has converged to knowing nothing.",
          "Two habits follow. Report error by horizon rather than as a single number, because a model that looks strong at h = 1 may be worthless at the horizon the decision actually needs; and always carry the trivial baselines, since the honest question is not whether the model has skill but whether it has skill over predicting the last value or the mean. On this series the random walk is the worse baseline throughout (1.041 rising to 2.664) precisely because the process is mean-reverting — which baseline wins is itself a statement about the data."
        ]
      }
    ],
    "takeaways": [
      "Forecasting models trend, seasonality, and autocorrelation.",
      "Evaluate with rolling backtests, never a random split.",
      "Always compare against a seasonal-naive baseline."
    ],
    "demo": "forecasting"
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
  "index": 0,
  "prev": null,
  "next": "calibration"
};
