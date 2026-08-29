// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/mlops/canary-rollout/.
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
  "conceptId": "canary-rollout",
  "lesson": {
    "title": "Canary Rollouts",
    "oneLine": "Ship a new model to a slice of traffic, watch, then ramp or roll back.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Deploying a new model to everyone at once is risky. A canary sends a small fraction of traffic to the new version, compares its error rate against the old one with a statistical test, and only ramps up if it passes. A regression hits a few percent of users instead of all of them, and rolls back automatically."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "A one-sided test gates each ramp stage on the error-rate difference:"
        ],
        "tex": "z = \\frac{\\hat{p}_{\\text{new}} - \\hat{p}_{\\text{old}}}{\\sqrt{\\hat{p}(1-\\hat{p})(1/n_1 + 1/n_2)}}",
        "texNote": "Pass the guard, ramp the traffic split; fail, roll back."
      },
      {
        "h": "In code",
        "code": "for split in [0.05, 0.25, 0.5, 1.0]:\n    route(new_version, split)\n    if error_rate(new) > error_rate(old) + margin:\n        rollback(); break        # guard tripped",
        "caption": "Ramp the split only while the guard holds."
      },
      {
        "h": "A small canary cannot see a small regression",
        "paras": [
          "How long a canary must run is arithmetic, not judgement. Detecting an error-rate rise from 1% to 2% at 80% power needs about 4,637 requests per arm; from 1% to 1.2% needs 85,387; and from 0.1% to 0.12% needs 862,434. Serving 100 requests per second with 5% on the canary, those last two are 4.7 and 47.9 hours of traffic respectively.",
          "So a 5% canary held for thirty minutes can detect a catastrophe and is blind to exactly the kind of regression that quietly costs money. Knowing the number changes the design rather than the patience: raise the canary share, pick a metric with a larger effect size, or accept that rare-but-severe failures are not a significance-testing problem at all and need a guardrail that trips on a single occurrence. The failure mode to avoid is a canary that always passes and is therefore believed."
        ]
      }
    ],
    "takeaways": [
      "Canaries limit a bad deploy's blast radius.",
      "A statistical guard decides ramp versus rollback.",
      "Progressive traffic shifting makes releases safe."
    ],
    "demo": "canary-rollout"
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
  "index": 1,
  "prev": "autoscaling",
  "next": "drift-detection"
};
