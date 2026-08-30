// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "prioritized-replay" (3), for its Connections
// panel. Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "prioritized-replay": [
      "prioritized-replay",
      "dqn",
      "importance-sampling"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "prioritized-replay": {
    "id": "prioritized-replay",
    "name": "Prioritized Experience Replay",
    "area": "Reinforcement Learning",
    "summary": "Replace uniform sampling from the replay buffer with sampling ∝ |TD error|^α, so surprising transitions are revisited more often. On sparse-reward tasks this produces a backward sweep of value from the goal and learns in far fewer updates. Because non-uniform sampling biases the expected update, correct it with importance-sampling weights w=(N·P)^(-β), annealing β toward 1. A standard upgrade to DQN; the data-side counterpart to Dyna-Q's planning.",
    "prereqs": [
      "dqn",
      "importance-sampling"
    ],
    "leadsTo": []
  },
  "dqn": {
    "id": "dqn",
    "name": "Deep Q-Network (DQN)",
    "area": "Reinforcement Learning",
    "summary": "Approximate Q(s,a) with a neural network and stabilize the bootstrapped training with two tricks — an experience replay buffer (decorrelate samples) and a periodically synced target network (a fixed bootstrap target). The algorithm that learned Atari from pixels.",
    "tex": "L(\\theta) = \\mathbb{E}\\Bigl[ \\bigl( r + \\gamma \\max_{a'} Q_{\\theta^-}(s',a') - Q_\\theta(s,a) \\bigr)^2 \\Bigr]",
    "prereqs": [
      "mdp-bellman",
      "backprop"
    ],
    "leadsTo": [
      "prioritized-replay"
    ]
  },
  "importance-sampling": {
    "id": "importance-sampling",
    "name": "Importance Sampling",
    "area": "Probability & Bayes",
    "summary": "Estimate an expectation under a target p by sampling an easier proposal q and reweighting by w=p/q: E_p[f]=E_q[w·f]. Lets you hit rare events (tail probabilities) that naive Monte Carlo misses, and underlies off-policy RL evaluation and particle-filter resampling. Quality lives and dies by the proposal — if q has lighter tails than p the weights have infinite variance, so monitor the Effective Sample Size ESS=(Σw)²/Σw². Self-normalized IS needs the target only up to a constant. Degrades in high dimensions; fixes are adaptive/annealed IS and SMC.",
    "tex": "\\mathbb{E}_p[f] = \\mathbb{E}_q\\!\\left[\\tfrac{p(x)}{q(x)} f(x)\\right],\\quad \\mathrm{ESS}=\\tfrac{(\\sum w_i)^2}{\\sum w_i^2}",
    "prereqs": [
      "mcmc",
      "clt"
    ],
    "leadsTo": [
      "prioritized-replay"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "prioritized-replay": [
    {
      "kind": "demo",
      "slug": "prioritized-replay"
    }
  ],
  "dqn": [
    {
      "kind": "demo",
      "slug": "dqn"
    },
    {
      "kind": "demo",
      "slug": "prioritized-replay"
    }
  ],
  "importance-sampling": [
    {
      "kind": "demo",
      "slug": "importance-sampling"
    },
    {
      "kind": "demo",
      "slug": "prioritized-replay"
    }
  ]
};
