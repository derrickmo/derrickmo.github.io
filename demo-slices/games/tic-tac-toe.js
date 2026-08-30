// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to game "tic-tac-toe" (1), for its Connections
// panel. Same global names as concepts-index.js, with 187 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {},
  "games": {
    "tic-tac-toe": [
      "minimax"
    ]
  }
};
window.CONCEPTS_INDEX = {
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
  }
};
window.CONCEPT_REVERSE = {
  "minimax": [
    {
      "kind": "demo",
      "slug": "mcts"
    },
    {
      "kind": "game",
      "slug": "tic-tac-toe"
    },
    {
      "kind": "game",
      "slug": "connect-four"
    },
    {
      "kind": "game",
      "slug": "chess"
    },
    {
      "kind": "game",
      "slug": "go"
    },
    {
      "kind": "game",
      "slug": "twenty48"
    }
  ]
};
