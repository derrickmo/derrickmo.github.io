// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "dyna-q" (3), for its Connections panel.
// Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "dyna-q": [
      "dyna-q",
      "q-learning",
      "mdp-bellman"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "dyna-q": {
    "id": "dyna-q",
    "name": "Dyna-Q & Model-Based RL",
    "area": "Reinforcement Learning",
    "summary": "Integrates learning, planning, and acting: the agent does ordinary Q-learning from real steps AND learns a one-step model (remembering (s,a)->(r,s')), then performs n planning updates per real step by replaying remembered transitions through the model. Planning propagates value across the state space without extra real experience, so Dyna-Q is far more sample-efficient than model-free Q-learning. The bridge between learning from experience and planning with a known model; experience replay is the same idea, and World Models / MuZero / Dreamer are its modern descendants. Risk: planning inside a wrong model learns the wrong thing.",
    "prereqs": [
      "q-learning",
      "mdp-bellman"
    ],
    "leadsTo": []
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
  "dyna-q": [
    {
      "kind": "demo",
      "slug": "dyna-q"
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
