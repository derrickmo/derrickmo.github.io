// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "autoscaling" (2), for its Connections
// panel. Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "autoscaling": [
      "autoscaling",
      "model-serving"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "autoscaling": {
    "id": "autoscaling",
    "name": "Autoscaling",
    "area": "Training Systems",
    "summary": "Match serving capacity to a time-varying load by adjusting the replica pool. A reactive controller (Kubernetes HPA style) sizes the fleet to keep utilization near a target: desired = ceil(load / (target * per-replica capacity)). The hard part is the cold-start lag — a new replica must pull an image and load weights before it serves, so on a demand spike capacity can't rise fast enough and the SLO breaches until warming replicas come online. Lower target utilization carries spare headroom that absorbs spikes (fewer breaches) at higher idle cost; this headroom-vs-cost dial plus the cold-start tax is the core of capacity management. Refinements: predictive scaling, scale-in cooldowns to avoid flapping, warm pools / provisioned concurrency (why scale-to-zero is hard for big models), and load shedding when even max replicas aren't enough.",
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
  }
};
window.CONCEPT_REVERSE = {
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
  ]
};
