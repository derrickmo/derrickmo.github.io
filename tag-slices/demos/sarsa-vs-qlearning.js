// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "sarsa-vs-qlearning" (3), for its Connections panel.
// Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "sarsa-vs-qlearning": [
      "sarsa",
      "q-learning",
      "mdp-bellman"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "sarsa": {
    "id": "sarsa",
    "name": "SARSA & On-policy vs Off-policy TD",
    "area": "Reinforcement Learning",
    "summary": "Temporal-difference control comes in two flavors that differ only in the bootstrap target. SARSA is on-policy — it updates toward Q(s',a') for the action it will actually take, so it accounts for its own exploration and learns safer policies. Q-learning is off-policy — it updates toward max_a' Q(s',a'), learning the optimal greedy policy from any behavior, which is what makes replay and DQN possible. On Cliff Walking, SARSA takes the safe path and Q-learning the optimal cliff-edge path.",
    "tex": "Q(s,a) \\leftarrow Q(s,a) + \\alpha\\,[\\,r + \\gamma\\,Q(s',a') - Q(s,a)\\,]",
    "prereqs": [
      "q-learning",
      "mdp-bellman"
    ],
    "leadsTo": [
      "double-q-learning"
    ]
  },
  "q-learning": {
    "id": "q-learning",
    "name": "Q-Learning / TD",
    "area": "Reinforcement Learning",
    "summary": "Sample the Bellman backup from experience — model-free RL's foundational update.",
    "prereqs": [
      "mdp-bellman"
    ],
    "leadsTo": [
      "sarsa",
      "td-lambda",
      "dyna-q",
      "double-q-learning",
      "distributional-rl"
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
  "sarsa": [
    {
      "kind": "demo",
      "slug": "sarsa-vs-qlearning"
    },
    {
      "kind": "demo",
      "slug": "double-q-learning"
    }
  ],
  "q-learning": [
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
      "slug": "double-q-learning"
    },
    {
      "kind": "demo",
      "slug": "distributional-rl"
    },
    {
      "kind": "game",
      "slug": "snake-dqn"
    },
    {
      "kind": "module",
      "slug": "reinforcement-learning"
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
