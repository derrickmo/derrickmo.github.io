// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/simulated-annealing/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
  "simulated-annealing": {
    "id": "simulated-annealing",
    "name": "Simulated Annealing",
    "area": "Optimization",
    "summary": "Local search with a Metropolis acceptance rule — accept worse moves with probability e^{-ΔE/T}, then cool. The general-purpose escape from local minima.",
    "tex": "P(\\text{accept}) = \\exp\\!\\left(-\\frac{\\Delta E}{T}\\right)",
    "prereqs": [
      "search-astar"
    ],
    "leadsTo": [
      "neuroevolution"
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
  },
  "neuroevolution": {
    "id": "neuroevolution",
    "name": "Neuroevolution",
    "area": "Reinforcement Learning",
    "summary": "Improve a neural-net policy by selection + crossover + mutation, no gradients required.",
    "prereqs": [
      "mlp"
    ],
    "leadsTo": []
  }
};
window.CONCEPT_REVERSE = {
  "simulated-annealing": [
    {
      "kind": "demo",
      "slug": "simulated-annealing"
    }
  ]
};
