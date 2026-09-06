// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "pagerank" (3), for its Connections panel.
// Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "pagerank": [
      "pagerank",
      "markov",
      "pca"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "pagerank": {
    "id": "pagerank",
    "name": "PageRank",
    "area": "Graphs",
    "summary": "Rank nodes by the importance of the nodes linking to them, resolved by power iteration: PR_i = (1-d)/N + d·Σ_{j→i} PR_j/outdeg_j (plus dangling mass). It is the stationary distribution of a random surfer who follows a link with probability d and teleports otherwise — the teleport makes the chain ergodic so a unique answer exists. Mathematically the dominant eigenvector of the damped transition matrix. Launched Google; reused for citation ranking, recommendation, spam detection, and TextRank.",
    "tex": "PR_i = \\frac{1-d}{N} + d \\sum_{j \\to i} \\frac{PR_j}{\\mathrm{outdeg}(j)}",
    "prereqs": [
      "markov"
    ],
    "leadsTo": [
      "community-detection"
    ]
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
  "pca": {
    "id": "pca",
    "name": "PCA / SVD",
    "area": "Classical ML",
    "summary": "Project data onto the eigenvectors of its covariance — the basic linear dimensionality reduction.",
    "leadsTo": [
      "embeddings",
      "lora",
      "tsne",
      "ica",
      "manifold-learning",
      "harris-corners",
      "spectral-clustering"
    ],
    "prereqs": []
  }
};
window.CONCEPT_REVERSE = {
  "pagerank": [
    {
      "kind": "demo",
      "slug": "pagerank"
    },
    {
      "kind": "demo",
      "slug": "louvain"
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
  "pca": [
    {
      "kind": "demo",
      "slug": "pca"
    },
    {
      "kind": "demo",
      "slug": "ica"
    },
    {
      "kind": "demo",
      "slug": "tsne"
    },
    {
      "kind": "demo",
      "slug": "isomap"
    },
    {
      "kind": "demo",
      "slug": "lora"
    },
    {
      "kind": "demo",
      "slug": "spectral-clustering"
    },
    {
      "kind": "demo",
      "slug": "pagerank"
    },
    {
      "kind": "demo",
      "slug": "matmul"
    },
    {
      "kind": "demo",
      "slug": "eigenvectors"
    },
    {
      "kind": "module",
      "slug": "unsupervised-learning"
    }
  ]
};
