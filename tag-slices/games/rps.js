// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to games "rps" (3), for its Connections panel.
// Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {},
  "games": {
    "rps": [
      "markov",
      "regret-matching",
      "replicator-dynamics"
    ]
  }
};
window.CONCEPTS_INDEX = {
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
  },
  "regret-matching": {
    "id": "regret-matching",
    "name": "Regret Matching & Nash Equilibrium",
    "area": "Reinforcement Learning",
    "summary": "A no-regret learning rule: play actions in proportion to positive cumulative regret. In self-play the time-averaged strategy converges to a Nash equilibrium — the normal-form core of CFR (Counterfactual Regret Minimization), the algorithm behind superhuman poker.",
    "tex": "\\sigma^{t+1}(a) = \\frac{R^t_+(a)}{\\sum_{a'} R^t_+(a')}",
    "prereqs": [
      "bandit"
    ],
    "leadsTo": [
      "replicator-dynamics",
      "iterated-prisoners-dilemma",
      "cfr"
    ]
  },
  "replicator-dynamics": {
    "id": "replicator-dynamics",
    "name": "Replicator Dynamics",
    "area": "Reinforcement Learning",
    "summary": "Evolutionary game theory: each strategy's population share grows with how much its payoff beats the average. Fixed points are Nash equilibria; adds evolutionarily-stable strategies. Zero-sum games like RPS produce perpetual orbits — the continuous-time cousin of no-regret learning, and a cautionary tale for multi-agent learning.",
    "tex": "\\dot{x}_i = x_i\\big( (Ax)_i - x^{\\top}Ax \\big)",
    "prereqs": [
      "regret-matching"
    ],
    "leadsTo": []
  }
};
window.CONCEPT_REVERSE = {
  "markov": [
    {
      "kind": "demo",
      "slug": "hmm-viterbi"
    },
    {
      "kind": "demo",
      "slug": "markov"
    },
    {
      "kind": "demo",
      "slug": "successor-representation"
    },
    {
      "kind": "demo",
      "slug": "pagerank"
    },
    {
      "kind": "game",
      "slug": "rps"
    },
    {
      "kind": "module",
      "slug": "rnn-nlp"
    }
  ],
  "regret-matching": [
    {
      "kind": "demo",
      "slug": "regret-matching"
    },
    {
      "kind": "demo",
      "slug": "replicator-dynamics"
    },
    {
      "kind": "demo",
      "slug": "pd-tournament"
    },
    {
      "kind": "game",
      "slug": "poker"
    },
    {
      "kind": "game",
      "slug": "rps"
    }
  ],
  "replicator-dynamics": [
    {
      "kind": "demo",
      "slug": "replicator-dynamics"
    },
    {
      "kind": "demo",
      "slug": "pd-tournament"
    },
    {
      "kind": "game",
      "slug": "rps"
    }
  ]
};
