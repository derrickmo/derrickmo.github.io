// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/tokenization/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
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
  "constrained-decoding": {
    "id": "constrained-decoding",
    "name": "Constrained Decoding",
    "area": "NLP",
    "summary": "Guarantee structured output (JSON mode, function calling) by intersecting the model's next-token distribution with the tokens a grammar permits at each step, then sampling from the survivors. A schema/regex/CFG compiled to a finite-state machine supplies the per-step token mask.",
    "tex": "\\tilde{p}(t) \\propto p_\\theta(t) \\cdot \\mathbb{1}\\!\\left[ t \\in \\mathrm{valid}(\\text{state}) \\right]",
    "prereqs": [
      "decoding",
      "tokenization"
    ],
    "leadsTo": [
      "guardrails"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "tokenization": [
    {
      "kind": "demo",
      "slug": "tokenizer"
    },
    {
      "kind": "demo",
      "slug": "constrained-decoding"
    },
    {
      "kind": "module",
      "slug": "rnn-nlp"
    },
    {
      "kind": "hf",
      "slug": "nlp"
    }
  ]
};
