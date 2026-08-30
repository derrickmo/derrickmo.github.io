// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to modules "rnn-nlp" (4), for its Connections panel.
// Same global names as concepts-index.js, with 184 fewer concepts in them.

window.CONCEPT_TAGS = {
  "modules": {
    "rnn-nlp": [
      "rnn",
      "markov",
      "embeddings",
      "tokenization"
    ]
  }
};
window.CONCEPTS_INDEX = {
  "rnn": {
    "id": "rnn",
    "name": "Recurrent Neural Network",
    "area": "NLP",
    "summary": "A neural net with a hidden state that carries information across a sequence — the pre-transformer way to model order.",
    "prereqs": [
      "mlp"
    ],
    "leadsTo": [
      "attention",
      "gradient-clipping",
      "lstm-gates"
    ],
    "animation": "viz/recurrence.html"
  },
  "markov": {
    "id": "markov",
    "name": "Markov / n-gram Models",
    "area": "NLP",
    "summary": "Predict the next token from the last n — the lookup-table ancestor of every LLM.",
    "leadsTo": [
      "transformer-block",
      "hmm-viterbi",
      "successor-representation",
      "pagerank"
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
  }
};
window.CONCEPT_REVERSE = {
  "rnn": [
    {
      "kind": "demo",
      "slug": "gradient-clipping"
    },
    {
      "kind": "demo",
      "slug": "rnn-gates"
    },
    {
      "kind": "module",
      "slug": "rnn-nlp"
    }
  ],
  "markov": [
    {
      "kind": "demo",
      "slug": "hmm-viterbi"
    },
    {
      "kind": "demo",
      "slug": "markov"
    },
    {
      "kind": "demo",
      "slug": "successor-representation"
    },
    {
      "kind": "demo",
      "slug": "pagerank"
    },
    {
      "kind": "game",
      "slug": "rps"
    },
    {
      "kind": "module",
      "slug": "rnn-nlp"
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
