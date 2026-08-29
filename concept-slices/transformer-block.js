// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/transformer-block/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
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
  "mixture-of-depths": {
    "id": "mixture-of-depths",
    "name": "Mixture-of-Depths",
    "area": "NLP",
    "summary": "Conditional computation along the depth axis: a per-block router selects, under a fixed capacity (top-k tokens), which tokens get full compute while the rest take the residual skip. Fixes the FLOPs (lower than dense) and keeps the compute graph static so it still batches — unlike ragged early-exit. Works because token difficulty is uneven; a well-trained router spends the budget on the tokens that need depth. Width-axis cousin of mixture-of-experts.",
    "prereqs": [
      "moe",
      "transformer-block"
    ],
    "leadsTo": []
  }
};
window.CONCEPT_REVERSE = {
  "transformer-block": [
    {
      "kind": "demo",
      "slug": "multi-head-attention"
    },
    {
      "kind": "demo",
      "slug": "mixture-of-depths"
    },
    {
      "kind": "module",
      "slug": "transformers"
    },
    {
      "kind": "module",
      "slug": "advanced-nlp"
    },
    {
      "kind": "hf",
      "slug": "nlp"
    },
    {
      "kind": "hf",
      "slug": "audio"
    }
  ]
};
