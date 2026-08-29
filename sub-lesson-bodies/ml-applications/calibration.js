// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/ml-applications/calibration/.
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
  "conceptId": "calibration",
  "lesson": {
    "title": "Calibration",
    "oneLine": "Make a model's confidence match its real accuracy.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "A trustworthy classifier that says 90% should be right about 90% of the time. Modern networks are often overconfident. Calibration fixes the scores without changing the ranking - temperature scaling divides the logits by a single learned constant so the confidences line up with observed accuracy."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Temperature scaling softens the logits by a learned scalar T:"
        ],
        "tex": "\\hat{p} = \\mathrm{softmax}(z / T)",
        "texNote": "T > 1 reduces overconfidence; it is fit on validation data and leaves the argmax unchanged."
      },
      {
        "h": "In code",
        "code": "# fit T to minimize validation NLL; predictions unchanged in rank\np = softmax(logits / T)\nece = expected_calibration_error(p, labels)",
        "caption": "One scalar recalibrates every confidence."
      },
      {
        "h": "Accuracy and calibration are separate properties",
        "paras": [
          "Sharpening or softening a model's probabilities by temperature never changes their ranking, so it never changes accuracy — but it changes calibration completely. On 20,000 simulated predictions, accuracy is 0.742 at temperature 0.5, 1.0 and 2.0 alike, while expected calibration error moves from 0.1021 to 0.0093 and back to 0.0903: an order of magnitude, at fixed accuracy.",
          "So a leaderboard number says nothing about whether a 0.9 means ninety percent, and the two failures need different fixes. That is also why temperature scaling is such a good deal — one parameter fitted on held-out data, no retraining, no accuracy cost — and why calibration must be checked on the deployment distribution rather than assumed: the temperature that was right for the validation set is not automatically right after a shift."
        ]
      }
    ],
    "takeaways": [
      "Calibration aligns confidence with actual accuracy.",
      "Temperature scaling fixes it with a single constant.",
      "It changes confidences but not the predicted class."
    ],
    "demo": "calibration"
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
  "index": 1,
  "prev": "forecasting",
  "next": "conformal"
};
