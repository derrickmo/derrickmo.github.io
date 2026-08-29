// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/ml-applications/fairness/.
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
  "conceptId": "fairness",
  "lesson": {
    "title": "Fairness Metrics",
    "oneLine": "Measure group disparities - and confront their impossibility.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "A model can be accurate yet unfair across groups. Different metrics formalize fairness: demographic parity (equal positive rates), equal opportunity (equal true-positive rates), equalized odds (both error rates equal). The uncomfortable result is that, when base rates differ, you cannot satisfy them all at once - fairness requires a choice."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Equal opportunity demands matched true-positive rates across groups:"
        ],
        "tex": "P(\\hat{y}=1\\mid y=1, A=a) = P(\\hat{y}=1\\mid y=1, A=b)",
        "texNote": "Demographic parity and calibration generally cannot hold simultaneously with this."
      },
      {
        "h": "In code",
        "code": "tpr = lambda g: ((pred==1) & (y==1) & (A==g)).sum() / ((y==1)&(A==g)).sum()\neo_gap = abs(tpr('a') - tpr('b'))      # equal-opportunity gap",
        "caption": "Compute per-group rates; the gaps are the disparities."
      },
      {
        "h": "The criteria are mutually exclusive",
        "paras": [
          "With unequal base rates, a classifier cannot equalise error rates and predictive values at the same time — not as a matter of engineering effort but as arithmetic. Scoring two groups with base rates 0.30 and 0.10 using the same score distribution and the same threshold, the false-positive rate is 0.213 in both groups and the false-negative rate 0.213 and 0.210, so error rates are equalised. Positive predictive value comes out at 0.612 and 0.295 — a gap of 0.317 that no threshold removes.",
          "This is the Chouldechova and Kleinberg et al. impossibility result, and its practical consequence is that \"is the model fair\" has no answer until someone names which criterion matters. That is a decision about consequences rather than about modelling: equal false-negative rates matter when a miss is a denied opportunity, equal predictive value matters when a positive prediction is acted on directly. Any audit that reports one criterion without saying it chose one is reporting a preference as a fact."
        ]
      }
    ],
    "takeaways": [
      "Fairness has several incompatible definitions.",
      "With unequal base rates you cannot satisfy them all.",
      "Choosing a metric is a value judgment, not a technicality."
    ],
    "demo": "fairness"
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
  "index": 3,
  "prev": "conformal",
  "next": "pagerank"
};
