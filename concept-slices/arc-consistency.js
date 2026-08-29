// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/arc-consistency/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

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
  },
  "search-astar": {
    "id": "search-astar",
    "name": "A* / Informed Search",
    "area": "Algorithms",
    "summary": "Rank candidate states by cost-so-far plus an admissible estimate of cost-to-go (f = g + h).",
    "tex": "f(n) = g(n) + h(n)",
    "leadsTo": [
      "minimax",
      "mcts",
      "simulated-annealing",
      "backtracking",
      "graph-search"
    ],
    "prereqs": []
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
  ]
};
