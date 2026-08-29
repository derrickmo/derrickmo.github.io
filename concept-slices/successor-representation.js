// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/successor-representation/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
  "successor-representation": {
    "id": "successor-representation",
    "name": "Successor Representation",
    "area": "Reinforcement Learning",
    "summary": "M(s,s') is the expected discounted number of future visits to s' starting from s under a policy — equal to (I−γP)⁻¹. It factorizes value into dynamics and reward, V(s)=Σ_s' M(s,s')R(s'), so when the reward changes you recompute V instantly as M·R with no relearning of dynamics. Learned by TD just like a value function but bootstrapping one-hot occupancy. Sits between model-free and model-based RL; the deep version (successor features) enables transfer across reward functions, and predictive maps like it appear in hippocampal place/grid cells.",
    "tex": "M = (I - \\gamma P)^{-1},\\qquad V = M R",
    "prereqs": [
      "mdp-bellman",
      "markov"
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
  "markov": {
    "id": "markov",
    "name": "Markov / n-gram Models",
    "area": "NLP",
    "summary": "Predict the next token from the last n — the lookup-table ancestor of every LLM.",
    "leadsTo": [
      "transformer-block",
      "hmm-viterbi",
      "successor-representation",
      "pagerank"
    ],
    "prereqs": []
  }
};
window.CONCEPT_REVERSE = {
  "successor-representation": [
    {
      "kind": "demo",
      "slug": "successor-representation"
    }
  ]
};
