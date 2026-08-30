// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "canary-rollout" (3), for its Connections panel.
// Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "canary-rollout": [
      "canary-rollout",
      "model-serving",
      "drift-detection"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "canary-rollout": {
    "id": "canary-rollout",
    "name": "Canary Rollout & Progressive Delivery",
    "area": "Training Systems",
    "summary": "Deploy a new model (or code) safely by exposing it to a small slice of live traffic first and widening only if a health metric stays good: 5% -> 25% -> 50% -> 100%, with an automated guard at each stage. The guard is a statistical test (here a one-sided two-proportion z-test of the canary's error vs the stable baseline) — significantly worse triggers an automatic rollback, capping the blast radius to the few users the canary touched versus a full deploy. Guard sensitivity is a detection tradeoff: too tight rolls back good releases on noise (false alarms), too loose lets a worse model through; and at low canary traffic, small regressions are hard to distinguish from noise (low statistical power). Generalizes to blue/green, feature flags, shadow traffic, and A/B + bandit rollouts.",
    "prereqs": [
      "model-serving"
    ],
    "leadsTo": []
  },
  "model-serving": {
    "id": "model-serving",
    "name": "Model Serving & Batching",
    "area": "Training Systems",
    "summary": "Deploying a trained model as a service is a queueing problem before it is a math problem. A GPU runs a batch in time base + slope*size, so batching many requests amortizes the fixed overhead and raises throughput — but each request then waits for the batch to form (a max batch-window) and to finish, inflating mean and especially tail (p99) latency: the central throughput-vs-latency tradeoff. Capacity = batch / batch-time requests per second; when the arrival rate pushes utilization toward 100% the queue and latency blow up (Little's law: average queue length = arrival rate * wait time), which is why autoscaling, admission control, and load shedding exist. Continuous/in-flight batching (vLLM) refines this by swapping finished sequences out of the running batch instead of waiting.",
    "tex": "L = \\lambda W,\\quad \\text{capacity} = \\frac{B}{\\text{base} + \\text{slope}\\cdot B}",
    "prereqs": [
      "paged-attention"
    ],
    "leadsTo": [
      "canary-rollout",
      "autoscaling",
      "model-cascade"
    ]
  },
  "drift-detection": {
    "id": "drift-detection",
    "name": "Data Drift Detection",
    "area": "Training Systems",
    "summary": "Monitor a deployed model for distribution shift, since accuracy silently decays as the world moves away from training data. Compare a live window to a reference with the Population Stability Index (PSI=Σ(cur−ref)·ln(cur/ref)), KL divergence, or two-sample tests, and alarm past a threshold. Covers covariate shift P(X), label shift P(Y), and concept drift P(Y|X).",
    "tex": "\\mathrm{PSI} = \\sum_b (c_b - r_b)\\,\\ln\\!\\frac{c_b}{r_b}",
    "prereqs": [
      "clt",
      "calibration"
    ],
    "leadsTo": []
  }
};
window.CONCEPT_REVERSE = {
  "canary-rollout": [
    {
      "kind": "demo",
      "slug": "canary-rollout"
    },
    {
      "kind": "module",
      "slug": "mlops"
    }
  ],
  "model-serving": [
    {
      "kind": "demo",
      "slug": "batching"
    },
    {
      "kind": "demo",
      "slug": "autoscaling"
    },
    {
      "kind": "demo",
      "slug": "canary-rollout"
    },
    {
      "kind": "module",
      "slug": "mlops"
    }
  ],
  "drift-detection": [
    {
      "kind": "demo",
      "slug": "canary-rollout"
    },
    {
      "kind": "demo",
      "slug": "drift-detection"
    },
    {
      "kind": "module",
      "slug": "mlops"
    },
    {
      "kind": "module",
      "slug": "trustworthy-ai"
    }
  ]
};
