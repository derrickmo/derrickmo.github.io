// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/attention/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
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
  "multi-head": {
    "id": "multi-head",
    "name": "Multi-Head Attention",
    "area": "Transformers",
    "summary": "Run several attention heads in parallel so one layer can track multiple relationships at once.",
    "prereqs": [
      "attention"
    ],
    "leadsTo": [
      "transformer-block",
      "attention-rollout"
    ]
  },
  "positional-encoding": {
    "id": "positional-encoding",
    "name": "Positional Encoding (sinusoidal / RoPE)",
    "area": "Transformers",
    "summary": "Inject order into attention — sinusoidal vectors or RoPE rotations that encode relative position.",
    "prereqs": [
      "attention",
      "fourier"
    ],
    "leadsTo": [
      "rope",
      "context-extension"
    ]
  },
  "transformer-block": {
    "id": "transformer-block",
    "name": "Transformer Block",
    "area": "Transformers",
    "summary": "Attention + feed-forward + residual + layer-norm — the basic stacked unit of GPT/BERT/Llama.",
    "prereqs": [
      "attention",
      "multi-head"
    ],
    "animation": "viz/transformer.html",
    "leadsTo": [
      "mixture-of-depths"
    ]
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
  "rope": {
    "id": "rope",
    "name": "Rotary Position Embedding (RoPE)",
    "area": "Transformers",
    "summary": "Encode position by rotating Q and K in 2-D pair-blocks by an angle that grows linearly with position; the attention score then depends only on the relative offset (m-n).",
    "tex": "\\theta_i(m) = m \\cdot 10000^{-2i/d}",
    "prereqs": [
      "positional-encoding",
      "attention"
    ],
    "leadsTo": [
      "context-extension"
    ]
  },
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
  "lost-in-the-middle": {
    "id": "lost-in-the-middle",
    "name": "Lost in the Middle",
    "area": "NLP",
    "summary": "Transformers use information at the start and end of a long context far more reliably than the middle, so accuracy vs the position of the relevant passage is U-shaped — and the dip deepens with context length. Motivates reranking the most relevant chunks to the prompt's edges and keeping contexts tight.",
    "prereqs": [
      "attention",
      "rag-chunking"
    ],
    "leadsTo": []
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
  },
  "attention-rollout": {
    "id": "attention-rollout",
    "name": "Attention Rollout",
    "area": "NLP",
    "summary": "Turn a stack of attention maps into one input-token attribution by composing them across layers, accounting for residual connections: Â=0.5A+0.5I, R=Â_L···Â_1. Row i is token i's rolled-up attention back to the input. A training-free transformer-interpretability tool (Abnar & Zuidema, 2020) — but attention isn't a faithful explanation by itself; it ignores values/MLPs and averages heads.",
    "tex": "R = \\prod_{l=L}^{1} \\bigl( 0.5\\,A_l + 0.5\\,I \\bigr)",
    "prereqs": [
      "attention",
      "multi-head"
    ],
    "leadsTo": []
  }
};
window.CONCEPT_REVERSE = {
  "attention": [
    {
      "kind": "demo",
      "slug": "svm"
    },
    {
      "kind": "demo",
      "slug": "attention"
    },
    {
      "kind": "demo",
      "slug": "positional-encoding"
    },
    {
      "kind": "demo",
      "slug": "multi-head-attention"
    },
    {
      "kind": "demo",
      "slug": "kv-cache"
    },
    {
      "kind": "demo",
      "slug": "rope"
    },
    {
      "kind": "demo",
      "slug": "lost-in-the-middle"
    },
    {
      "kind": "demo",
      "slug": "attention-rollout"
    },
    {
      "kind": "demo",
      "slug": "moe"
    },
    {
      "kind": "module",
      "slug": "transformers"
    },
    {
      "kind": "hf",
      "slug": "nlp"
    }
  ]
};
