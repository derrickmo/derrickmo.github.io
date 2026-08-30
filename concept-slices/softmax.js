// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/softmax/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
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
  "cross-entropy": {
    "id": "cross-entropy",
    "name": "Cross-Entropy",
    "area": "Information Theory",
    "summary": "The loss that measures how much a predicted distribution disagrees with the true labels.",
    "tex": "H(p, q) = -\\sum_i p_i \\log q_i",
    "prereqs": [
      "softmax"
    ],
    "leadsTo": [
      "scaling-laws",
      "bayes",
      "gan",
      "logistic-regression"
    ]
  },
  "word2vec": {
    "id": "word2vec",
    "name": "word2vec (Skip-gram)",
    "area": "NLP",
    "summary": "Learn a dense vector per word by predicting its context (skip-gram) or the word from its context (CBOW), trained by SGD on softmax / negative sampling over co-occurrences. Embodies the distributional hypothesis — words in similar contexts get similar vectors — and yields the famous linear analogy structure (king−man+woman≈queen). The static-embedding ancestor of contextual transformer embeddings; one vector per word, so it can't disambiguate senses and inherits corpus bias.",
    "tex": "P(o\\mid c) = \\frac{\\exp(u_o^\\top v_c)}{\\sum_w \\exp(u_w^\\top v_c)}",
    "prereqs": [
      "embeddings",
      "softmax"
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
  "decoding": {
    "id": "decoding",
    "name": "Decoding Strategies",
    "area": "NLP",
    "summary": "Pick the next token from the model's distribution — greedy, beam, top-k, nucleus, temperature.",
    "prereqs": [
      "softmax"
    ],
    "leadsTo": [
      "beam-search",
      "self-consistency",
      "constrained-decoding",
      "speculative-decoding"
    ]
  }
};
window.CONCEPT_REVERSE = {
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
