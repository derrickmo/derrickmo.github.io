// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/transformers/embeddings/.
// concept-lesson-app.jsx reads window.DM_SUBLESSON_CTX and falls back to
// window.DM_SUBLESSON(...) so the page still works if this file is ever missing.

window.DM_SUBLESSON_CTX = {
  "module": {
    "title": "Transformers",
    "lessons": {
      "tokenization": {
        "title": "Tokenization"
      },
      "embeddings": {
        "title": "Embeddings"
      },
      "attention": {
        "title": "Attention"
      },
      "multi-head": {
        "title": "Multi-Head Attention"
      },
      "decoding": {
        "title": "Decoding"
      }
    }
  },
  "moduleSlug": "transformers",
  "conceptId": "embeddings",
  "lesson": {
    "title": "Embeddings",
    "oneLine": "Map each token id to a dense vector whose geometry carries meaning.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "A token id is just an index — id 4017 means nothing on its own. An embedding layer is a learned lookup table that turns each id into a vector of real numbers, and training shapes that table so related tokens land near each other.",
          "Once tokens are vectors, 'meaning' becomes geometry: similarity is a dot product, analogies are directions, and every later layer gets to do linear algebra instead of string matching."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "The embedding matrix is E in R^(V x d) for vocabulary size V and model width d. Looking up token i is just selecting a row:"
        ],
        "tex": "e_i = E_{i,:} \\in \\mathbb{R}^{d}",
        "texNote": "E is a parameter — it is learned by gradient descent like any other weight."
      },
      {
        "h": "In code",
        "code": "import numpy as np\n\nV, d = 50000, 256\nE = np.random.randn(V, d) * 0.02      # learned embedding table\n\nids = np.array([101, 4017, 2009])     # a tokenized sentence\nx = E[ids]                            # (3, d) — one vector per token\n\n# similarity between two tokens is a dot product\ncos = E[4017] @ E[2009] / (np.linalg.norm(E[4017]) * np.linalg.norm(E[2009]))",
        "caption": "The whole layer is a row-select; the magic is in what training writes into E."
      },
      {
        "h": "What counts as similar is set by the dimension",
        "paras": [
          "Cosine similarity does not mean the same thing at every width, because high-dimensional vectors are nearly orthogonal by default. Across 4,000 random pairs, the spread of cosine similarity is 0.704 at d = 2, 0.247 at 16, 0.089 at 128, 0.036 at 768 and 0.018 at 3,072. At d = 768 the single most similar pair out of 4,000 unrelated vectors reaches only 0.125.",
          "So a similarity of 0.3 is unremarkable in two dimensions and enormous in seven hundred and sixty-eight, and any fixed threshold carried over from one model to another is meaningless. The practical consequences follow directly: judge similarity against the distribution of scores for that model rather than an absolute cut-off, expect a re-embedded corpus to need its thresholds refitted, and treat the raw number as a ranking signal rather than a probability."
        ]
      }
    ],
    "takeaways": [
      "Embeddings convert discrete ids into a continuous space where similarity is measurable.",
      "The table is learned, so structure (synonyms, analogies) emerges from the training objective.",
      "Every downstream layer benefits — they all operate on vectors, never on tokens."
    ],
    "demo": "embeddings"
  },
  "order": [
    "tokenization",
    "embeddings",
    "attention",
    "multi-head",
    "decoding"
  ],
  "index": 1,
  "prev": "tokenization",
  "next": "attention"
};
