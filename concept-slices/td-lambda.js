// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/td-lambda/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
  "td-lambda": {
    "id": "td-lambda",
    "name": "TD(λ) & Eligibility Traces",
    "area": "Reinforcement Learning",
    "summary": "A single mechanism that interpolates between one-step TD(0) and Monte-Carlo returns. An eligibility trace marks recently visited states (e(s) += 1, decaying by γλ each step); when a TD error δ occurs, every marked state is updated in proportion to its trace, spreading credit backward along the trajectory in one online pass. λ=0 is TD(0), λ=1 is Monte Carlo; intermediate λ usually learns fastest. The backward view equals the forward λ-return; GAE is its modern advantage-estimation descendant.",
    "tex": "\\delta_t = r_{t+1} + \\gamma V(s_{t+1}) - V(s_t);\\quad V(s) \\mathrel{+}= \\alpha\\,\\delta_t\\, e(s)",
    "prereqs": [
      "q-learning",
      "mdp-bellman"
    ],
    "leadsTo": [
      "gae"
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
  },
  "gae": {
    "id": "gae",
    "name": "Generalized Advantage Estimation",
    "area": "Reinforcement Learning",
    "summary": "The advantage estimator in modern policy-gradient methods: an exponentially-weighted sum of TD residuals, Â_t = Σ_l (γλ)^l δ_{t+l}. λ is a bias/variance dial — λ=0 is the one-step TD advantage (low variance, biased through an imperfect critic), λ=1 is the Monte-Carlo advantage (unbiased, high variance). A worse critic pushes the optimal λ toward 1; more reward noise pushes it toward 0. It is eligibility traces applied to advantages, and the default (λ≈0.95) inside PPO.",
    "tex": "\\hat{A}_t = \\sum_{l\\ge 0} (\\gamma\\lambda)^l\\, \\delta_{t+l},\\quad \\delta_l = r_l + \\gamma V(s_{l+1}) - V(s_l)",
    "prereqs": [
      "td-lambda",
      "actor-critic"
    ],
    "leadsTo": []
  }
};
window.CONCEPT_REVERSE = {
  "td-lambda": [
    {
      "kind": "demo",
      "slug": "td-lambda"
    },
    {
      "kind": "demo",
      "slug": "gae"
    }
  ]
};
