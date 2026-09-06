// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to modules "frontier-frameworks" (5), for its Connections panel.
// Same global names as concepts-index.js, with 183 fewer concepts in them.

window.CONCEPT_TAGS = {
  "modules": {
    "frontier-frameworks": [
      "quantization",
      "paged-attention",
      "speculative-decoding",
      "lora",
      "moe"
    ]
  }
};
window.CONCEPTS_INDEX = {
  "quantization": {
    "id": "quantization",
    "name": "Quantization",
    "area": "Fine-Tuning",
    "summary": "Shrink a model by storing weights (and activations) in low-bit integers instead of 32-bit floats. A scale maps floats to a small grid of levels; fewer bits = smaller/faster but coarser. Outliers stretch the scale and dominate the error, which is why LLM quantization (GPTQ, AWQ, QLoRA's NF4) is outlier-aware and often per-channel.",
    "tex": "q = \\mathrm{clamp}\\!\\left( \\mathrm{round}\\!\\left( \\tfrac{w}{s} \\right),\\, -2^{b-1},\\, 2^{b-1}-1 \\right),\\quad s = \\tfrac{\\max|w|}{2^{b-1}-1}",
    "prereqs": [
      "lora"
    ],
    "leadsTo": [
      "pruning",
      "distillation",
      "mixed-precision"
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
  "speculative-decoding": {
    "id": "speculative-decoding",
    "name": "Speculative Decoding",
    "area": "Training Systems",
    "summary": "Speed up LLM generation losslessly: a small draft model proposes k tokens, the big target verifies them in one parallel pass, accepting the longest prefix it agrees with and resampling the first miss from its own distribution. Emits accepted+1 tokens per expensive pass; speedup ≈ (1−p^{k+1})/(1−p) for acceptance p. Output distribution is identical to the target alone.",
    "tex": "\\mathbb{E}[\\text{tokens/pass}] = \\frac{1 - p^{\\,k+1}}{1 - p}",
    "prereqs": [
      "decoding",
      "kv-cache"
    ],
    "leadsTo": []
  },
  "lora": {
    "id": "lora",
    "name": "LoRA (Low-Rank Adaptation)",
    "area": "Fine-Tuning",
    "summary": "Freeze the base model and learn a thin rank-r product B·A per layer — adapt big models on a budget.",
    "prereqs": [
      "pca",
      "mlp",
      "attention"
    ],
    "leadsTo": [
      "quantization"
    ]
  },
  "moe": {
    "id": "moe",
    "name": "Mixture of Experts (MoE)",
    "area": "Training Systems",
    "summary": "Conditional computation: a router sends each token to only the top-k of N expert sub-networks, so total parameters scale while active compute per token stays at k/N. Enables sparse trillion-parameter models (Switch Transformer, Mixtral), at the cost of routing complexity and a constant fight against load imbalance — handled with an auxiliary balancing loss and per-expert capacity limits.",
    "tex": "y = \\sum_{i \\in \\mathrm{top\\text{-}k}(g(x))} g_i(x)\\, E_i(x)",
    "prereqs": [
      "attention",
      "scaling-laws"
    ],
    "leadsTo": [
      "mixture-of-depths"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "quantization": [
    {
      "kind": "demo",
      "slug": "quantization"
    },
    {
      "kind": "demo",
      "slug": "mixed-precision"
    },
    {
      "kind": "demo",
      "slug": "float-precision"
    },
    {
      "kind": "module",
      "slug": "frontier-frameworks"
    },
    {
      "kind": "hf",
      "slug": "best-practices"
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
  ],
  "speculative-decoding": [
    {
      "kind": "demo",
      "slug": "speculative-decoding"
    },
    {
      "kind": "module",
      "slug": "frontier-frameworks"
    }
  ],
  "lora": [
    {
      "kind": "demo",
      "slug": "lora"
    },
    {
      "kind": "demo",
      "slug": "quantization"
    },
    {
      "kind": "module",
      "slug": "fine-tuning"
    },
    {
      "kind": "module",
      "slug": "frontier-frameworks"
    },
    {
      "kind": "hf",
      "slug": "nlp"
    }
  ],
  "moe": [
    {
      "kind": "demo",
      "slug": "model-cascade"
    },
    {
      "kind": "demo",
      "slug": "mixture-of-depths"
    },
    {
      "kind": "demo",
      "slug": "moe"
    },
    {
      "kind": "module",
      "slug": "frontier-frameworks"
    }
  ]
};
