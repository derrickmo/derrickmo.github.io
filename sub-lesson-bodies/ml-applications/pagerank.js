// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/ml-applications/pagerank/.
// concept-lesson-app.jsx reads window.DM_SUBLESSON_CTX and falls back to
// window.DM_SUBLESSON(...) so the page still works if this file is ever missing.

window.DM_SUBLESSON_CTX = {
  "module": {
    "title": "Applied Machine Learning",
    "lessons": {
      "forecasting": {
        "title": "Time-Series Forecasting"
      },
      "calibration": {
        "title": "Calibration"
      },
      "conformal": {
        "title": "Conformal Prediction"
      },
      "fairness": {
        "title": "Fairness Metrics"
      },
      "pagerank": {
        "title": "PageRank"
      },
      "community-detection": {
        "title": "Community Detection (Louvain)"
      },
      "label-propagation": {
        "title": "Label Propagation"
      },
      "kalman-filter": {
        "title": "Kalman Filter"
      }
    }
  },
  "moduleSlug": "ml-applications",
  "conceptId": "pagerank",
  "lesson": {
    "title": "PageRank",
    "oneLine": "Importance as the stationary distribution of a random walk — an eigenvector problem that you solve by repeated multiplication, never by decomposition.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Counting inbound links makes a page's rank easy to fake: point a thousand junk pages at it. PageRank makes the definition recursive instead — a page is important if important pages link to it — and that circularity is what makes it hard to game and interesting to compute.",
          "The clean reading is a random surfer. Follow links at random forever, and occasionally teleport to a page uniformly at random. PageRank is the long-run fraction of time you spend on each page."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "The teleport term is what makes this well-posed, not a detail:"
        ],
        "tex": "r = \\alpha M r + \\frac{1-\\alpha}{N}\\mathbf{1}, \\qquad \\alpha \\approx 0.85",
        "texNote": "Without teleportation the walk gets trapped: a page with no outbound links absorbs all the probability, and a cycle with no exit hoards it. Teleporting makes the chain irreducible and aperiodic, which is exactly the condition for a unique stationary distribution to exist. alpha is not a tuning knob so much as the guarantee."
      },
      {
        "h": "In code",
        "code": "import numpy as np\n\ndef pagerank(M, alpha=0.85, iters=100, tol=1e-10):\n    n = M.shape[0]\n    r = np.ones(n) / n\n    for _ in range(iters):\n        r_new = alpha * (M @ r) + (1 - alpha) / n\n        if np.abs(r_new - r).sum() < tol:\n            return r_new\n        r = r_new\n    return r",
        "caption": "Power iteration: multiply, renormalise, repeat. On a web-scale graph M is enormous and sparse, so this is the only feasible route — you never form or decompose the matrix."
      },
      {
        "h": "What it generalises to",
        "paras": [
          "Personalised PageRank replaces the uniform teleport vector with a distribution concentrated on a few nodes, which turns a global importance score into 'important RELATIVE to these seeds'. That is the version that actually powers recommendations and related-item panels.",
          "The same eigenvector-of-a-normalised-graph shape appears in spectral clustering and in graph neural network propagation — a GNN layer is a learned version of the same neighbourhood averaging, which is why over-smoothing in deep GNNs looks like every node converging to the stationary distribution.",
          "The honest limit: PageRank scores a graph's link structure, not relevance to a query. It was one signal among many even in the search engine it is named for, and treating a structural prior as a relevance model is the classic misuse."
        ]
      }
    ],
    "takeaways": [
      "PageRank is the stationary distribution of a random walk with teleportation — importance defined recursively.",
      "The teleport term is what guarantees a unique solution exists; it is not a hack for dangling nodes.",
      "Power iteration is the algorithm because the graph is huge and sparse, and personalised PageRank is the version most systems actually use."
    ],
    "demo": "pagerank"
  },
  "order": [
    "forecasting",
    "calibration",
    "conformal",
    "fairness",
    "pagerank",
    "community-detection",
    "label-propagation",
    "kalman-filter"
  ],
  "index": 4,
  "prev": "fairness",
  "next": "community-detection"
};
