// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/attention-rollout/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
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
  }
};
window.CONCEPT_REVERSE = {
  "attention-rollout": [
    {
      "kind": "demo",
      "slug": "attention-rollout"
    }
  ]
};
