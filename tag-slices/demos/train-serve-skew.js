// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "train-serve-skew" (3), for its Connections panel.
// Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "train-serve-skew": [
      "model-serving",
      "drift-detection",
      "calibration"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
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
  },
  "calibration": {
    "id": "calibration",
    "name": "Model Calibration",
    "area": "Evaluation & Calibration",
    "summary": "Whether a model's confidence scores are honest: a calibrated classifier that says 90% is right 90% of the time. Measured by the reliability diagram and Expected Calibration Error (ECE); modern nets are overconfident, and temperature scaling (divide logits by T) is the standard one-parameter post-hoc fix that leaves predictions unchanged.",
    "tex": "\\mathrm{ECE} = \\sum_{b} \\frac{n_b}{N} \\,\\bigl| \\mathrm{acc}(b) - \\mathrm{conf}(b) \\bigr|",
    "prereqs": [
      "logistic-regression",
      "roc"
    ],
    "leadsTo": [
      "conformal",
      "active-learning",
      "fairness",
      "distillation",
      "drift-detection",
      "mc-dropout",
      "model-cascade"
    ]
  }
};
window.CONCEPT_REVERSE = {
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
      "kind": "demo",
      "slug": "train-serve-skew"
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
      "kind": "demo",
      "slug": "train-serve-skew"
    },
    {
      "kind": "module",
      "slug": "mlops"
    },
    {
      "kind": "module",
      "slug": "trustworthy-ai"
    }
  ],
  "calibration": [
    {
      "kind": "demo",
      "slug": "model-cascade"
    },
    {
      "kind": "demo",
      "slug": "calibration"
    },
    {
      "kind": "demo",
      "slug": "conformal"
    },
    {
      "kind": "demo",
      "slug": "fairness"
    },
    {
      "kind": "demo",
      "slug": "distillation"
    },
    {
      "kind": "demo",
      "slug": "mc-dropout"
    },
    {
      "kind": "demo",
      "slug": "imbalanced-data"
    },
    {
      "kind": "demo",
      "slug": "train-serve-skew"
    },
    {
      "kind": "module",
      "slug": "trustworthy-ai"
    }
  ]
};
