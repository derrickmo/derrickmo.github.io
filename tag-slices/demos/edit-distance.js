// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "edit-distance" (2), for its Connections panel.
// Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "edit-distance": [
      "dynamic-programming",
      "backtracking"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
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
  "backtracking": {
    "id": "backtracking",
    "name": "Backtracking & CSP",
    "area": "Algorithms",
    "summary": "Solve constraint-satisfaction problems by depth-first search: assign variables one at a time, and the moment a constraint is violated with no legal value left, undo and try the previous variable differently. Constraint propagation (forward checking, AC-3) and ordering heuristics prune the exponential tree to make it practical. A complete method, so it finds a solution if one exists.",
    "prereqs": [
      "search-astar"
    ],
    "leadsTo": [
      "arc-consistency"
    ]
  }
};
window.CONCEPT_REVERSE = {
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
  ],
  "backtracking": [
    {
      "kind": "demo",
      "slug": "n-queens"
    },
    {
      "kind": "demo",
      "slug": "graph-coloring"
    },
    {
      "kind": "demo",
      "slug": "sudoku"
    },
    {
      "kind": "demo",
      "slug": "edit-distance"
    }
  ]
};
