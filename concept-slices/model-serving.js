// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/model-serving/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

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
  "paged-attention": {
    "id": "paged-attention",
    "name": "PagedAttention",
    "area": "Training Systems",
    "summary": "KV-cache memory management for LLM serving (vLLM). Contiguous per-sequence reservation of the max length wastes memory to internal fragmentation; PagedAttention stores the cache in fixed-size blocks allocated on demand (OS-paging style, via a block table), so memory tracks generated tokens and many more sequences fit — multiplying throughput, and enabling prefix-sharing via copy-on-write blocks.",
    "prereqs": [
      "kv-cache"
    ],
    "leadsTo": [
      "model-serving"
    ]
  },
  "kv-cache": {
    "id": "kv-cache",
    "name": "KV Cache",
    "area": "Transformers",
    "summary": "Cache the keys and values for every prefix token during autoregressive generation so each new step only computes one new K/V — the trick behind tractable LLM inference.",
    "prereqs": [
      "attention"
    ],
    "leadsTo": [
      "kv-cache-eviction",
      "paged-attention",
      "speculative-decoding"
    ]
  },
  "attention": {
    "id": "attention",
    "name": "Self-Attention",
    "area": "Transformers",
    "summary": "Score every pair of tokens by a softmax over scaled dot products; the core op of every transformer.",
    "tex": "\\mathrm{Attn}(Q,K,V) = \\mathrm{softmax}\\!\\left(\\tfrac{QK^\\top}{\\sqrt{d_k}}\\right) V",
    "prereqs": [
      "softmax",
      "embeddings"
    ],
    "leadsTo": [
      "multi-head",
      "positional-encoding",
      "transformer-block",
      "lora",
      "kv-cache",
      "rope",
      "kv-cache-eviction",
      "lost-in-the-middle",
      "moe",
      "attention-rollout"
    ]
  },
  "softmax": {
    "id": "softmax",
    "name": "Softmax",
    "area": "Neural Networks",
    "summary": "Turn a vector of logits into a probability distribution; the workhorse output and attention nonlinearity.",
    "tex": "\\mathrm{softmax}(z)_i = \\frac{e^{z_i}}{\\sum_j e^{z_j}}",
    "leadsTo": [
      "contrastive-learning",
      "cross-entropy",
      "word2vec",
      "attention",
      "decoding"
    ],
    "prereqs": []
  },
  "embeddings": {
    "id": "embeddings",
    "name": "Embeddings",
    "area": "NLP",
    "summary": "Map tokens (or items) to vectors so that distance and direction encode meaning.",
    "prereqs": [
      "tokenization"
    ],
    "leadsTo": [
      "vector-search",
      "attention",
      "word2vec",
      "contrastive-learning",
      "tsne",
      "rag-chunking",
      "semantic-caching",
      "hyde"
    ],
    "animation": "viz/embeddings.html"
  },
  "tokenization": {
    "id": "tokenization",
    "name": "Tokenization (BPE)",
    "area": "NLP",
    "summary": "Subword units learned by merging frequent character pairs — every LLM's first step.",
    "leadsTo": [
      "embeddings",
      "constrained-decoding"
    ],
    "prereqs": []
  },
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
  "model-cascade": {
    "id": "model-cascade",
    "name": "Model Cascade & Early-Exit",
    "area": "Training Systems",
    "summary": "Spend big compute only where it changes the answer: a cheap fast model handles every input and the uncertain ones (low confidence) are escalated to an expensive accurate model. Because most inputs are easy, you approach the expensive model's accuracy while paying its cost on only a slice of traffic — a steep cost/accuracy curve early on. The router is confidence, so it only works if that confidence is trustworthy (ties to calibration and conformal uncertainty); a confidently-wrong cheap model defers the wrong inputs. The pattern recurs as early-exit/anytime networks (stop at a shallow layer when confident), the Viola-Jones detector cascade, retrieval-then-LLM fallback, and is the model-level cousin of mixture-of-experts routing and speculative decoding.",
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
      "kind": "module",
      "slug": "mlops"
    }
  ]
};
