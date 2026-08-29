// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/double-q-learning/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
  "double-q-learning": {
    "id": "double-q-learning",
    "name": "Double Q-Learning & Maximization Bias",
    "area": "Reinforcement Learning",
    "summary": "Q-learning bootstraps off max_a Q(s',a); because the estimates are noisy and you both SELECT and EVALUATE with the same max, E[max] is biased high — it systematically overestimates action values and can prefer a worse action. Double Q-learning keeps two value tables and uses one to pick the maximizing action and the other to evaluate it; since their noise is independent, the bias cancels. The deep-RL version is Double DQN (online net selects, target net evaluates). A specific case of the 'optimizer's curse' that also haunts model selection.",
    "prereqs": [
      "q-learning",
      "sarsa"
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
  },
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
  }
};
window.CONCEPT_REVERSE = {
  "double-q-learning": [
    {
      "kind": "demo",
      "slug": "double-q-learning"
    }
  ]
};
