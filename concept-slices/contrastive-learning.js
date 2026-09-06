// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/contrastive-learning/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

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
      "kind": "demo",
      "slug": "gradient-accumulation"
    },
    {
      "kind": "module",
      "slug": "multimodal"
    }
  ]
};
