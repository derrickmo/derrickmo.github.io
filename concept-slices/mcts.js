// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/mcts/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
  "mcts": {
    "id": "mcts",
    "name": "Monte-Carlo Tree Search",
    "area": "Game AI",
    "summary": "Build a search tree biased by UCB and random rollouts — the engine behind AlphaGo and AlphaZero.",
    "prereqs": [
      "bandit",
      "minimax"
    ],
    "leadsTo": []
  },
  "bandit": {
    "id": "bandit",
    "name": "Multi-Armed Bandit (Explore/Exploit)",
    "area": "Reinforcement Learning",
    "summary": "Choose between uncertain options to minimize cumulative regret — RL's simplest, omnipresent problem.",
    "leadsTo": [
      "mcts",
      "bayesian-optimization",
      "regret-matching"
    ],
    "prereqs": []
  },
  "minimax": {
    "id": "minimax",
    "name": "Minimax + Alpha-Beta",
    "area": "Game AI",
    "summary": "Search the game tree assuming the opponent plays optimally; prune branches that can't improve the result.",
    "prereqs": [
      "search-astar"
    ],
    "leadsTo": [
      "mcts"
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
  "mcts": [
    {
      "kind": "demo",
      "slug": "mcts"
    },
    {
      "kind": "game",
      "slug": "go"
    }
  ]
};
