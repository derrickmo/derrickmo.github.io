// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "paged-attention" (2), for its Connections panel.
// Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "paged-attention": [
      "paged-attention",
      "kv-cache"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
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
  }
};
window.CONCEPT_REVERSE = {
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
  ]
};
