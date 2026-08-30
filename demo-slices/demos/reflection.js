// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "reflection" (3), for its Connections
// panel. Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "reflection": [
      "reflection",
      "reward-model",
      "self-consistency"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "reflection": {
    "id": "reflection",
    "name": "Self-Correction (Reflection)",
    "area": "NLP",
    "summary": "The agentic generate–critique–revise loop (Reflexion / self-refine): a critic scores an answer and the model revises until the bar is met or a budget runs out. Bounded by the verifier — informative, accurate critics (tests, tools, a reward model) make it work; self-grading with no external signal stalls or false-passes.",
    "prereqs": [
      "reward-model",
      "self-consistency"
    ],
    "leadsTo": [
      "react-agent"
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
  "self-consistency": {
    "id": "self-consistency",
    "name": "Self-Consistency",
    "area": "NLP",
    "summary": "Sample several chains of thought at nonzero temperature and majority-vote the final answer. When errors are independent, voting concentrates on the single correct answer (a Condorcet effect) and lifts accuracy for the cost of N samples; correlated errors form a false consensus it can't fix.",
    "tex": "\\hat{y} = \\arg\\max_{y} \\sum_{i=1}^{N} \\mathbb{1}\\!\\left[ y_i = y \\right]",
    "prereqs": [
      "decoding",
      "clt"
    ],
    "leadsTo": [
      "reflection"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "reflection": [
    {
      "kind": "demo",
      "slug": "reflection"
    },
    {
      "kind": "demo",
      "slug": "react-agent"
    },
    {
      "kind": "module",
      "slug": "agentic-ai"
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
  "self-consistency": [
    {
      "kind": "demo",
      "slug": "self-consistency"
    },
    {
      "kind": "demo",
      "slug": "reflection"
    }
  ]
};
