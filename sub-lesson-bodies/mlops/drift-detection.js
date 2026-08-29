// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/mlops/drift-detection/.
// concept-lesson-app.jsx reads window.DM_SUBLESSON_CTX and falls back to
// window.DM_SUBLESSON(...) so the page still works if this file is ever missing.

window.DM_SUBLESSON_CTX = {
  "module": {
    "title": "MLOps and Serving",
    "lessons": {
      "autoscaling": {
        "title": "Autoscaling"
      },
      "canary-rollout": {
        "title": "Canary Rollouts"
      },
      "drift-detection": {
        "title": "Drift Detection"
      },
      "bloom-filter": {
        "title": "Bloom Filter"
      },
      "count-min-sketch": {
        "title": "Count-Min Sketch"
      },
      "semantic-caching": {
        "title": "Semantic Caching"
      },
      "model-cascade": {
        "title": "Model Cascade & Early-Exit"
      }
    }
  },
  "moduleSlug": "mlops",
  "conceptId": "drift-detection",
  "lesson": {
    "title": "Drift Detection",
    "oneLine": "Notice when production data has shifted away from training.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Models silently decay when the world changes - new user behavior, a shifted input distribution, a broken upstream feature. Drift detection compares the live input distribution against a training reference and raises an alarm when they diverge, so you retrain before accuracy quietly collapses."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "The population stability index sums the binned distribution shift:"
        ],
        "tex": "\\mathrm{PSI} = \\sum_b (p_b - q_b)\\,\\ln\\frac{p_b}{q_b}",
        "texNote": "PSI above ~0.2 flags a meaningful shift worth investigating."
      },
      {
        "h": "In code",
        "code": "import numpy as np\n\ndef psi(expected, actual, bins=10):\n    e, _ = np.histogram(expected, bins); a, _ = np.histogram(actual, bins)\n    e = e/e.sum()+1e-6; a = a/a.sum()+1e-6\n    return np.sum((a - e) * np.log(a / e))",
        "caption": "Bin both distributions; sum the divergence."
      },
      {
        "h": "Drift is a hypothesis, not a measurement",
        "paras": [
          "Two things go wrong at once. Testing daily at alpha 0.05 gives a 30.2% chance of at least one false alarm within a week and 78.5% within a month, so a monitor that fires a few times a year is behaving exactly as specified — the alerting threshold has to account for how often you look, not just for one test.",
          "More importantly, input drift and degradation are different events. Holding a trained model fixed and shifting its inputs by up to three standard deviations while leaving P(y|x) alone, accuracy does not move at all; changing P(y|x) while leaving the inputs exactly where they were drops accuracy to 0.793. A drift detector watches the first and is silent about the second. It is a cheap early-warning signal precisely because it needs no labels, and it should be read as a prompt to go and look rather than as evidence that anything has broken."
        ]
      }
    ],
    "takeaways": [
      "Drift detection compares live data to a training reference.",
      "PSI quantifies distribution shift; ~0.2 is a common alarm.",
      "Catching drift early triggers retraining before accuracy falls."
    ],
    "demo": "drift-detection"
  },
  "order": [
    "autoscaling",
    "canary-rollout",
    "drift-detection",
    "bloom-filter",
    "count-min-sketch",
    "semantic-caching",
    "model-cascade"
  ],
  "index": 2,
  "prev": "canary-rollout",
  "next": "bloom-filter"
};
