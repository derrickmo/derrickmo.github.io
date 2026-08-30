// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "ppo" (3), for its Connections
// panel. Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "ppo": [
      "ppo",
      "policy-gradient",
      "actor-critic"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "ppo": {
    "id": "ppo",
    "name": "Proximal Policy Optimization (PPO)",
    "area": "Reinforcement Learning",
    "summary": "A stable, first-order policy-gradient method: maximize a clipped surrogate of the importance-weighted advantage, min(r·A, clip(r,1-ε,1+ε)·A) where r=π_θ/π_old. The clip flattens the objective outside a trust region [1-ε,1+ε], zeroing the gradient so an update can't push the policy too far off-policy — which lets PPO safely reuse one batch for several epochs. A cheap stand-in for TRPO's hard KL constraint; the workhorse of RLHF.",
    "tex": "L^{CLIP} = \\mathbb{E}\\big[\\min(r_t A_t,\\ \\mathrm{clip}(r_t,1-\\epsilon,1+\\epsilon) A_t)\\big]",
    "prereqs": [
      "policy-gradient",
      "actor-critic"
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
  "ppo": [
    {
      "kind": "demo",
      "slug": "ppo"
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
