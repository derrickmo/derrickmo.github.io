// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/distributional-rl/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
  "distributional-rl": {
    "id": "distributional-rl",
    "name": "Distributional RL (C51)",
    "area": "Reinforcement Learning",
    "summary": "Learn the full distribution of returns Z(s,a) instead of just its expectation. C51 represents Z as a categorical distribution over a fixed set of atoms and applies the distributional Bellman backup TZ = R + γZ(s'), projecting the shifted/scaled target back onto the atom support. Stochastic rewards make returns multimodal — a shape the scalar value (the mean) hides — enabling more stable learning and risk-aware decisions. Successors QR-DQN and IQN learn quantiles instead of fixed atoms.",
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
  "distributional-rl": [
    {
      "kind": "demo",
      "slug": "distributional-rl"
    }
  ]
};
