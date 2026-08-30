// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "knapsack" (2), for its Connections
// panel. Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "knapsack": [
      "dynamic-programming",
      "mdp-bellman"
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
      "slug": "integral-image"
    },
    {
      "kind": "module",
      "slug": "interview-capstone"
    }
  ],
  "mdp-bellman": [
    {
      "kind": "demo",
      "slug": "gridworld-rl"
    },
    {
      "kind": "demo",
      "slug": "value-iteration"
    },
    {
      "kind": "demo",
      "slug": "policy-gradient"
    },
    {
      "kind": "demo",
      "slug": "actor-critic"
    },
    {
      "kind": "demo",
      "slug": "dqn"
    },
    {
      "kind": "demo",
      "slug": "sarsa-vs-qlearning"
    },
    {
      "kind": "demo",
      "slug": "td-lambda"
    },
    {
      "kind": "demo",
      "slug": "dyna-q"
    },
    {
      "kind": "demo",
      "slug": "distributional-rl"
    },
    {
      "kind": "demo",
      "slug": "successor-representation"
    },
    {
      "kind": "demo",
      "slug": "max-entropy-rl"
    },
    {
      "kind": "demo",
      "slug": "knapsack"
    },
    {
      "kind": "game",
      "slug": "snake-dqn"
    },
    {
      "kind": "game",
      "slug": "twenty48"
    },
    {
      "kind": "module",
      "slug": "reinforcement-learning"
    }
  ]
};
