// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/word2vec/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
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
  "word2vec": [
    {
      "kind": "demo",
      "slug": "word2vec"
    }
  ]
};
