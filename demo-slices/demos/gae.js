// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "gae" (3), for its Connections
// panel. Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "gae": [
      "gae",
      "td-lambda",
      "actor-critic"
    ]
  },
  "games": {}
};
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
  }
};
window.CONCEPT_REVERSE = {
  "gae": [
    {
      "kind": "demo",
      "slug": "gae"
    }
  ],
  "td-lambda": [
    {
      "kind": "demo",
      "slug": "td-lambda"
    },
    {
      "kind": "demo",
      "slug": "gae"
    }
  ],
  "actor-critic": [
    {
      "kind": "demo",
      "slug": "actor-critic"
    },
    {
      "kind": "demo",
      "slug": "ppo"
    },
    {
      "kind": "demo",
      "slug": "gae"
    }
  ]
};
