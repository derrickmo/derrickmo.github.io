// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "max-entropy-rl" (3), for its Connections
// panel. Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "max-entropy-rl": [
      "max-entropy-rl",
      "mdp-bellman",
      "policy-gradient"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "max-entropy-rl": {
    "id": "max-entropy-rl",
    "name": "Maximum-Entropy RL (Soft Value Iteration)",
    "area": "Reinforcement Learning",
    "summary": "Maximize expected reward PLUS policy entropy, weighted by a temperature α. This replaces the hard max in the Bellman equation with a soft log-sum-exp, V(s)=α·logΣ exp(Q(s,a)/α), and makes the optimal policy a Boltzmann distribution π(a|s)=softmax(Q(s,a)/α). The entropy bonus keeps exploration alive and yields robust policies; α→0 recovers ordinary value iteration and a greedy policy. The framework behind Soft Actor-Critic (SAC) and soft Q-learning, and kin to the KL-regularized objective of PPO/RLHF.",
    "tex": "V(s) = \\alpha \\log \\textstyle\\sum_a \\exp\\!\\big(Q(s,a)/\\alpha\\big)",
    "prereqs": [
      "mdp-bellman",
      "policy-gradient"
    ],
    "leadsTo": []
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
  },
  "policy-gradient": {
    "id": "policy-gradient",
    "name": "Policy Gradient (REINFORCE)",
    "area": "Reinforcement Learning",
    "summary": "Push up the log-probability of high-reward actions, push down low-reward ones — the foundation of every modern policy-based RL method, including PPO, GRPO, and RLHF.",
    "tex": "\\nabla_\\theta J = \\mathbb{E}_{\\pi_\\theta}\\bigl[ \\nabla_\\theta \\log \\pi_\\theta(a \\mid s) \\cdot (R - b) \\bigr]",
    "prereqs": [
      "mdp-bellman",
      "gradient-descent"
    ],
    "leadsTo": [
      "actor-critic",
      "reward-model",
      "dpo",
      "ppo",
      "max-entropy-rl"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "max-entropy-rl": [
    {
      "kind": "demo",
      "slug": "max-entropy-rl"
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
  ],
  "policy-gradient": [
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
      "slug": "reward-model"
    },
    {
      "kind": "demo",
      "slug": "dpo"
    },
    {
      "kind": "demo",
      "slug": "ppo"
    },
    {
      "kind": "demo",
      "slug": "max-entropy-rl"
    }
  ]
};
