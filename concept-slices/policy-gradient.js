// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/policy-gradient/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
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
  }
};
window.CONCEPT_REVERSE = {
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
