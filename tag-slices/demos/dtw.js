// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "dtw" (2), for its Connections panel.
// Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "dtw": [
      "dtw",
      "dynamic-programming"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "dtw": {
    "id": "dtw",
    "name": "Dynamic Time Warping",
    "area": "Time Series",
    "summary": "An elastic distance between two sequences that may run at different speeds. DTW finds the cheapest monotonic alignment via a DP cost matrix, D[i][j] = (A_i-B_j)² + min(D[i-1][j], D[i][j-1], D[i-1][j-1]), then backtracks the warping path; a Sakoe-Chiba band limits how far the path strays from the diagonal. Unlike point-by-point Euclidean distance, a small time shift doesn't wreck the comparison. The standard elastic metric for speech, gesture, ECG, and signature matching, and the continuous sibling of edit distance.",
    "prereqs": [
      "dynamic-programming"
    ],
    "leadsTo": []
  },
  "dynamic-programming": {
    "id": "dynamic-programming",
    "name": "Dynamic Programming",
    "area": "Algorithms",
    "summary": "Solve a problem by combining optimal answers to overlapping subproblems, computed once and reused (memoized). Requires optimal substructure; turns exponential brute force into polynomial table-filling. The 0/1 knapsack table is canonical; the same idea drives edit distance, shortest paths, the Bellman equation, and Viterbi/CTC decoding.",
    "tex": "\\mathrm{dp}[i][c] = \\max\\bigl( \\mathrm{dp}[i{-}1][c],\\; \\mathrm{dp}[i{-}1][c - w_i] + v_i \\bigr)",
    "prereqs": [
      "mdp-bellman"
    ],
    "leadsTo": [
      "dtw",
      "branch-and-bound"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "dtw": [
    {
      "kind": "demo",
      "slug": "dtw"
    }
  ],
  "dynamic-programming": [
    {
      "kind": "demo",
      "slug": "dtw"
    },
    {
      "kind": "demo",
      "slug": "knapsack"
    },
    {
      "kind": "demo",
      "slug": "branch-and-bound"
    },
    {
      "kind": "demo",
      "slug": "edit-distance"
    },
    {
      "kind": "demo",
      "slug": "complexity-growth"
    },
    {
      "kind": "demo",
      "slug": "ctc-alignment"
    },
    {
      "kind": "demo",
      "slug": "integral-image"
    },
    {
      "kind": "module",
      "slug": "interview-capstone"
    }
  ]
};
