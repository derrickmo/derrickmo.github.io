// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/multimodal/vector-search/.
// concept-lesson-app.jsx reads window.DM_SUBLESSON_CTX and falls back to
// window.DM_SUBLESSON(...) so the page still works if this file is ever missing.

window.DM_SUBLESSON_CTX = {
  "module": {
    "title": "Multimodal Learning",
    "lessons": {
      "contrastive-learning": {
        "title": "Contrastive Learning"
      },
      "vector-search": {
        "title": "Vector Search"
      },
      "spectrogram": {
        "title": "Spectrograms & the STFT"
      },
      "mfcc": {
        "title": "Mel Filterbank & MFCC"
      },
      "pitch-detection": {
        "title": "Pitch Detection (Autocorrelation)"
      },
      "dtw": {
        "title": "Dynamic Time Warping"
      }
    }
  },
  "moduleSlug": "multimodal",
  "conceptId": "vector-search",
  "lesson": {
    "title": "Vector Search",
    "oneLine": "Find the nearest embeddings to a query, fast, at scale.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Once everything is an embedding, retrieval becomes nearest-neighbor search: find the stored vectors closest to a query vector. Exact search is too slow at scale, so approximate methods (HNSW graphs, IVF, product quantization) trade a little accuracy for orders-of-magnitude speed. It is the backbone of RAG and semantic search."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Retrieve the top-k by similarity, usually cosine:"
        ],
        "tex": "\\mathrm{top\\text{-}k}\\;\\arg\\max_i\\;\\frac{q^{\\top} v_i}{\\|q\\|\\,\\|v_i\\|}",
        "texNote": "Approximate indexes return near-neighbors in sublinear time."
      },
      {
        "h": "In code",
        "code": "import numpy as np\n\ndef search(q, V, k=5):\n    sims = V @ q / (np.linalg.norm(V, axis=1) * np.linalg.norm(q))\n    return np.argsort(sims)[::-1][:k]",
        "caption": "Brute force shown; real systems use ANN indexes."
      },
      {
        "h": "Recall is a dial, and the number is meaningless without it",
        "paras": [
          "Approximate search trades recall for work, and the curve is steep at the bottom. Partitioning 20,000 vectors into 200 cells and probing a few of them, recall@10 is 0.057 when scanning 0.5% of the index, 0.237 at 5%, 0.470 at 12.5% and 0.700 at 25%. Reaching 1.000 means scanning everything, at which point it is exact search under another name.",
          "So a benchmark latency quoted without the recall beside it says nothing at all — any ANN index can be made arbitrarily fast by being arbitrarily wrong, and the comparison that matters is two systems at matched recall. It also reframes the usual question about index choice: HNSW, IVF and product quantisation are different shapes of this same curve with different memory footprints and build times, and picking one starts with deciding what recall the application actually needs, which is often far below 1.0."
        ]
      }
    ],
    "takeaways": [
      "Retrieval over embeddings is nearest-neighbor search.",
      "Approximate indexes trade slight accuracy for big speedups.",
      "It is the retrieval half of RAG."
    ],
    "demo": "vector-search"
  },
  "order": [
    "contrastive-learning",
    "vector-search",
    "spectrogram",
    "mfcc",
    "pitch-detection",
    "dtw"
  ],
  "index": 1,
  "prev": "contrastive-learning",
  "next": "spectrogram"
};
