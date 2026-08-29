// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/gae/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
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
  },
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
  "actor-critic": {
    "id": "actor-critic",
    "name": "Actor-Critic",
    "area": "Reinforcement Learning",
    "summary": "Train a value function (critic) and a policy (actor) together: the critic's bootstrapped TD error is the low-variance advantage that drives the policy gradient. The workhorse behind A2C, A3C, PPO, and RLHF.",
    "tex": "\\delta_t = r_t + \\gamma V(s_{t+1}) - V(s_t); \\quad \\theta \\leftarrow \\theta + \\alpha\\, \\delta_t\\, \\nabla_\\theta \\log \\pi_\\theta(a_t \\mid s_t)",
    "prereqs": [
      "policy-gradient",
      "mdp-bellman"
    ],
    "leadsTo": [
      "ppo",
      "gae"
    ]
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
  },
  "gradient-descent": {
    "id": "gradient-descent",
    "name": "Gradient Descent",
    "area": "Optimization",
    "summary": "Follow the negative loss gradient downhill — the engine of essentially all neural-network training.",
    "tex": "\\theta_{t+1} = \\theta_t - \\eta\\, \\nabla_\\theta \\mathcal{L}(\\theta_t)",
    "prereqs": [
      "chain-rule"
    ],
    "leadsTo": [
      "backprop",
      "lr-schedule",
      "adam",
      "newtons-method",
      "coordinate-descent",
      "proximal-gradient",
      "quasi-newton",
      "variational-inference",
      "adversarial-examples",
      "optimizers",
      "gradient-clipping",
      "policy-gradient"
    ],
    "animation": "viz/gradient.html"
  },
  "chain-rule": {
    "id": "chain-rule",
    "name": "Chain Rule",
    "area": "Optimization",
    "summary": "Compose derivatives through a graph — the calculus identity that makes backprop possible.",
    "tex": "\\frac{\\partial L}{\\partial x} = \\frac{\\partial L}{\\partial y}\\, \\frac{\\partial y}{\\partial x}",
    "leadsTo": [
      "gradient-descent",
      "backprop"
    ],
    "prereqs": []
  }
};
window.CONCEPT_REVERSE = {
  "gae": [
    {
      "kind": "demo",
      "slug": "gae"
    }
  ]
};
