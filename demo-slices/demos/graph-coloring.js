// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "graph-coloring" (2), for its Connections
// panel. Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "graph-coloring": [
      "arc-consistency",
      "backtracking"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "arc-consistency": {
    "id": "arc-consistency",
    "name": "Arc Consistency (AC-3)",
    "area": "Algorithms",
    "summary": "The standard constraint-propagation algorithm for CSPs: repeatedly enforce that for every value in a variable's domain there exists a compatible value in each neighbor's domain, deleting unsupported values and cascading until a fixpoint. Run after each assignment in backtracking, it prunes doomed branches early; with MRV/LCV ordering it's the textbook recipe for practical CSP solving.",
    "prereqs": [
      "backtracking"
    ],
    "leadsTo": []
  },
  "backtracking": {
    "id": "backtracking",
    "name": "Backtracking & CSP",
    "area": "Algorithms",
    "summary": "Solve constraint-satisfaction problems by depth-first search: assign variables one at a time, and the moment a constraint is violated with no legal value left, undo (backtrack) and try the previous variable differently. Constraint propagation (forward checking, AC-3) and ordering heuristics prune the exponential tree to make it practical. A complete method — finds a solution if one exists.",
    "prereqs": [
      "search-astar"
    ],
    "leadsTo": [
      "arc-consistency"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "arc-consistency": [
    {
      "kind": "demo",
      "slug": "graph-coloring"
    },
    {
      "kind": "demo",
      "slug": "sudoku"
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
    }
  ]
};
