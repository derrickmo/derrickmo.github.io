// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/dtw/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

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
  },
  "mdp-bellman": {
    "id": "mdp-bellman",
    "name": "MDPs & Bellman Backup",
    "area": "Reinforcement Learning",
    "summary": "Sequential decision-making under uncertainty; the Bellman equation defines optimal value recursively.",
    "tex": "V^*(s) = \\max_a \\bigl[ R(s,a) + \\gamma\\, \\mathbb{E}_{s'} V^*(s') \\bigr]",
    "leadsTo": [
      "q-learning",
      "policy-gradient",
      "actor-critic",
      "dqn",
      "sarsa",
      "td-lambda",
      "dyna-q",
      "distributional-rl",
      "successor-representation",
      "max-entropy-rl",
      "dynamic-programming"
    ],
    "prereqs": []
  }
};
window.CONCEPT_REVERSE = {
  "dtw": [
    {
      "kind": "demo",
      "slug": "dtw"
    }
  ]
};
