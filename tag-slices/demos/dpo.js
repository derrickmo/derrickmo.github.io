// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "dpo" (3), for its Connections panel.
// Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "dpo": [
      "dpo",
      "reward-model",
      "policy-gradient"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "dpo": {
    "id": "dpo",
    "name": "Direct Preference Optimization (DPO)",
    "area": "Reinforcement Learning",
    "summary": "Align a policy directly from preference pairs without a separate reward model or RL loop: the policy implicitly defines the reward r(y)=β·log(π(y)/π_ref(y)), turning the RLHF objective into one supervised-style loss. Reaches the same KL-regularized optimum as RLHF.",
    "tex": "L = -\\log \\sigma\\Bigl( \\beta \\log \\tfrac{\\pi_\\theta(y_w)}{\\pi_{ref}(y_w)} - \\beta \\log \\tfrac{\\pi_\\theta(y_l)}{\\pi_{ref}(y_l)} \\Bigr)",
    "prereqs": [
      "reward-model",
      "policy-gradient"
    ],
    "leadsTo": []
  },
  "reward-model": {
    "id": "reward-model",
    "name": "Reward Model (RLHF)",
    "area": "Reinforcement Learning",
    "summary": "Turn pairwise human preferences into a scalar reward with the Bradley-Terry model: P(a≻b)=σ(r(a)−r(b)). The learned reward is the signal a policy method (PPO) then maximizes — step two of RLHF, and the objective DPO optimizes directly.",
    "tex": "L = -\\mathbb{E}_{(w,l)}\\bigl[ \\log \\sigma\\bigl( r_\\theta(w) - r_\\theta(l) \\bigr) \\bigr]",
    "prereqs": [
      "logistic-regression",
      "policy-gradient"
    ],
    "leadsTo": [
      "dpo",
      "reflection"
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
  }
};
window.CONCEPT_REVERSE = {
  "dpo": [
    {
      "kind": "demo",
      "slug": "dpo"
    }
  ],
  "reward-model": [
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
      "slug": "reflection"
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
