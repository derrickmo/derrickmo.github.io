// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to games "self-driving" (2), for its Connections panel.
// Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {},
  "games": {
    "self-driving": [
      "neuroevolution",
      "policy-gradient"
    ]
  }
};
window.CONCEPTS_INDEX = {
  "neuroevolution": {
    "id": "neuroevolution",
    "name": "Neuroevolution",
    "area": "Reinforcement Learning",
    "summary": "Improve a neural-net policy by selection + crossover + mutation, no gradients required.",
    "prereqs": [
      "mlp"
    ],
    "leadsTo": []
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
  "neuroevolution": [
    {
      "kind": "game",
      "slug": "neuroevolution"
    },
    {
      "kind": "game",
      "slug": "self-driving"
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
    },
    {
      "kind": "game",
      "slug": "self-driving"
    }
  ]
};
