// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "contrastive-learning" (3), for its Connections panel.
// Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "contrastive-learning": [
      "contrastive-learning",
      "embeddings",
      "softmax"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "contrastive-learning": {
    "id": "contrastive-learning",
    "name": "Contrastive Learning",
    "area": "Neural Networks",
    "summary": "Self-supervised representation learning: make two augmented views of the same item agree in embedding space (positives) while separating all other items (negatives), via the NT-Xent/InfoNCE loss with temperature τ. Minimizing it yields alignment (positives collapse) + uniformity (items spread evenly), the basis of SimCLR, MoCo, and CLIP. Needs many negatives (large batches/queues) and good augmentations; non-contrastive variants (BYOL, VICReg) avoid the collapse problem differently.",
    "tex": "\\ell_i = -\\log\\frac{\\exp(\\mathrm{sim}(z_i,z_i^+)/\\tau)}{\\sum_{k\\neq i}\\exp(\\mathrm{sim}(z_i,z_k)/\\tau)}",
    "prereqs": [
      "embeddings",
      "softmax"
    ],
    "leadsTo": []
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
  }
};
window.CONCEPT_REVERSE = {
  "contrastive-learning": [
    {
      "kind": "demo",
      "slug": "contrastive-learning"
    },
    {
      "kind": "module",
      "slug": "multimodal"
    }
  ],
  "embeddings": [
    {
      "kind": "demo",
      "slug": "pca"
    },
    {
      "kind": "demo",
      "slug": "tsne"
    },
    {
      "kind": "demo",
      "slug": "word2vec"
    },
    {
      "kind": "demo",
      "slug": "attention"
    },
    {
      "kind": "demo",
      "slug": "embeddings"
    },
    {
      "kind": "demo",
      "slug": "contrastive-learning"
    },
    {
      "kind": "demo",
      "slug": "vector-search"
    },
    {
      "kind": "demo",
      "slug": "rag-chunking"
    },
    {
      "kind": "demo",
      "slug": "semantic-caching"
    },
    {
      "kind": "demo",
      "slug": "hyde"
    },
    {
      "kind": "module",
      "slug": "rnn-nlp"
    },
    {
      "kind": "module",
      "slug": "rag-agents"
    },
    {
      "kind": "module",
      "slug": "multimodal"
    },
    {
      "kind": "hf",
      "slug": "fundamentals"
    },
    {
      "kind": "hf",
      "slug": "multimodal"
    },
    {
      "kind": "hf",
      "slug": "agentic"
    }
  ],
  "softmax": [
    {
      "kind": "demo",
      "slug": "word2vec"
    },
    {
      "kind": "demo",
      "slug": "attention"
    },
    {
      "kind": "demo",
      "slug": "decoding"
    },
    {
      "kind": "demo",
      "slug": "contrastive-learning"
    },
    {
      "kind": "demo",
      "slug": "cross-entropy"
    }
  ]
};
