// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "kv-cache-eviction" (3), for its Connections
// panel. Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "kv-cache-eviction": [
      "kv-cache-eviction",
      "kv-cache",
      "paged-attention"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "kv-cache-eviction": {
    "id": "kv-cache-eviction",
    "name": "KV-Cache Eviction",
    "area": "NLP",
    "summary": "The KV cache grows linearly with sequence length, so long-context serving must evict past tokens to bound memory — and which tokens you drop decides whether quality survives. Sliding-window discards the early 'attention sink' tokens that carry disproportionate mass (StreamingLLM) and perplexity spikes; keeping a few sinks + a recent window recovers it; H2O additionally retains the heavy-hitter tokens by accumulated attention. It is the OS eviction-policy problem (LRU/LFU) transplanted into attention.",
    "prereqs": [
      "kv-cache",
      "attention"
    ],
    "leadsTo": []
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
  }
};
window.CONCEPT_REVERSE = {
  "kv-cache-eviction": [
    {
      "kind": "demo",
      "slug": "kv-cache-eviction"
    }
  ],
  "kv-cache": [
    {
      "kind": "demo",
      "slug": "kv-cache"
    },
    {
      "kind": "demo",
      "slug": "kv-cache-eviction"
    },
    {
      "kind": "demo",
      "slug": "speculative-decoding"
    },
    {
      "kind": "demo",
      "slug": "paged-attention"
    }
  ],
  "paged-attention": [
    {
      "kind": "demo",
      "slug": "batching"
    },
    {
      "kind": "demo",
      "slug": "kv-cache-eviction"
    },
    {
      "kind": "demo",
      "slug": "paged-attention"
    },
    {
      "kind": "module",
      "slug": "frontier-frameworks"
    }
  ]
};
