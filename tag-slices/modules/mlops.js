// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to modules "mlops" (5), for its Connections panel.
// Same global names as concepts-index.js, with 183 fewer concepts in them.

window.CONCEPT_TAGS = {
  "modules": {
    "mlops": [
      "model-serving",
      "drift-detection",
      "canary-rollout",
      "autoscaling",
      "model-cascade"
    ]
  }
};
window.CONCEPTS_INDEX = {
  "model-serving": {
    "id": "model-serving",
    "name": "Model Serving & Batching",
    "area": "Training Systems",
    "summary": "Deploying a trained model as a service is a queueing problem before it is a math problem. A GPU runs a batch in time base + slope*size, so batching many requests amortizes the fixed overhead and raises throughput, but each request then waits for the batch to form, up to a max batch-window, and to finish, inflating mean and especially tail p99 latency. That is the central throughput-versus-latency tradeoff. Capacity is batch over batch-time requests per second, and when the arrival rate pushes utilization toward 100% the queue and latency blow up (Little's law: average queue length equals arrival rate times wait time), which is why autoscaling, admission control and load shedding exist. Continuous or in-flight batching (vLLM) refines this by swapping finished sequences out of the running batch instead of waiting.",
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
  "canary-rollout": {
    "id": "canary-rollout",
    "name": "Canary Rollout & Progressive Delivery",
    "area": "Training Systems",
    "summary": "Deploy a new model or code safely by exposing it to a small slice of live traffic first and widening only if a health metric stays good: 5%, then 25%, then 50%, then 100%, with an automated guard at each stage. The guard is a statistical test, here a one-sided two-proportion z-test of the canary's error against the stable baseline, and a significantly worse result triggers an automatic rollback, capping the blast radius to the few users the canary touched rather than a full deploy. Guard sensitivity is a detection tradeoff: too tight rolls back good releases on noise, too loose lets a worse model through, and at low canary traffic small regressions are hard to distinguish from noise. Generalizes to blue/green, feature flags, shadow traffic, and A/B plus bandit rollouts.",
    "prereqs": [
      "model-serving"
    ],
    "leadsTo": []
  },
  "autoscaling": {
    "id": "autoscaling",
    "name": "Autoscaling",
    "area": "Training Systems",
    "summary": "Match serving capacity to a time-varying load by adjusting the replica pool. A reactive controller, Kubernetes HPA style, sizes the fleet to keep utilization near a target: desired = ceil(load / (target * per-replica capacity)). The hard part is the cold-start lag, since a new replica must pull an image and load weights before it serves, so on a demand spike capacity cannot rise fast enough and the SLO breaches until warming replicas come online. Lower target utilization carries spare headroom that absorbs spikes at higher idle cost, and that headroom-versus-cost dial plus the cold-start tax is the core of capacity management. Refinements include predictive scaling, scale-in cooldowns to avoid flapping, warm pools and provisioned concurrency (which is why scale-to-zero is hard for big models), and load shedding when even max replicas are not enough.",
    "prereqs": [
      "model-serving"
    ],
    "leadsTo": []
  },
  "model-cascade": {
    "id": "model-cascade",
    "name": "Model Cascade & Early-Exit",
    "area": "Training Systems",
    "summary": "Spend big compute only where it changes the answer: a cheap fast model handles every input and the uncertain, low-confidence ones are escalated to an expensive accurate model. Because most inputs are easy, you approach the expensive model's accuracy while paying its cost on only a slice of traffic, giving a steep cost/accuracy curve early on. The router is confidence, so it only works if that confidence is trustworthy, which ties it to calibration and conformal uncertainty; a confidently-wrong cheap model defers the wrong inputs. The pattern recurs as early-exit and anytime networks, the Viola-Jones detector cascade, and retrieval-then-LLM fallback, and it is the model-level cousin of mixture-of-experts routing and speculative decoding.",
    "prereqs": [
      "calibration",
      "model-serving"
    ],
    "leadsTo": []
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
  "autoscaling": [
    {
      "kind": "demo",
      "slug": "autoscaling"
    },
    {
      "kind": "module",
      "slug": "mlops"
    }
  ],
  "model-cascade": [
    {
      "kind": "demo",
      "slug": "model-cascade"
    },
    {
      "kind": "module",
      "slug": "mlops"
    }
  ]
};
