// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/q-learning/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
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
  "sarsa": {
    "id": "sarsa",
    "name": "SARSA & On-policy vs Off-policy TD",
    "area": "Reinforcement Learning",
    "summary": "Temporal-difference control comes in two flavors that differ only in the bootstrap target. SARSA is on-policy — it updates toward Q(s',a') for the action it will actually take, so it accounts for its own exploration and learns safer policies. Q-learning is off-policy — it updates toward max_a' Q(s',a'), learning the optimal greedy policy from any behavior, which is what makes replay and DQN possible. On Cliff Walking, SARSA takes the safe path and Q-learning the optimal cliff-edge path.",
    "tex": "Q(s,a) \\leftarrow Q(s,a) + \\alpha\\,[\\,r + \\gamma\\,Q(s',a') - Q(s,a)\\,]",
    "prereqs": [
      "q-learning",
      "mdp-bellman"
    ],
    "leadsTo": [
      "double-q-learning"
    ]
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
  "dyna-q": {
    "id": "dyna-q",
    "name": "Dyna-Q & Model-Based RL",
    "area": "Reinforcement Learning",
    "summary": "Integrates learning, planning, and acting: the agent does ordinary Q-learning from real steps AND learns a one-step model (remembering (s,a)->(r,s')), then performs n planning updates per real step by replaying remembered transitions through the model. Planning propagates value across the state space without extra real experience, so Dyna-Q is far more sample-efficient than model-free Q-learning. The bridge between learning from experience and planning with a known model; experience replay is the same idea, and World Models / MuZero / Dreamer are its modern descendants. Risk: planning inside a wrong model learns the wrong thing.",
    "prereqs": [
      "q-learning",
      "mdp-bellman"
    ],
    "leadsTo": []
  },
  "double-q-learning": {
    "id": "double-q-learning",
    "name": "Double Q-Learning & Maximization Bias",
    "area": "Reinforcement Learning",
    "summary": "Q-learning bootstraps off max_a Q(s',a); because the estimates are noisy and you both SELECT and EVALUATE with the same max, E[max] is biased high — it systematically overestimates action values and can prefer a worse action. Double Q-learning keeps two value tables and uses one to pick the maximizing action and the other to evaluate it; since their noise is independent, the bias cancels. The deep-RL version is Double DQN (online net selects, target net evaluates). A specific case of the 'optimizer's curse' that also haunts model selection.",
    "prereqs": [
      "q-learning",
      "sarsa"
    ],
    "leadsTo": []
  },
  "distributional-rl": {
    "id": "distributional-rl",
    "name": "Distributional RL (C51)",
    "area": "Reinforcement Learning",
    "summary": "Learn the full distribution of returns Z(s,a) instead of just its expectation. C51 represents Z as a categorical distribution over a fixed set of atoms and applies the distributional Bellman backup TZ = R + γZ(s'), projecting the shifted/scaled target back onto the atom support. Stochastic rewards make returns multimodal — a shape the scalar value (the mean) hides — enabling more stable learning and risk-aware decisions. Successors QR-DQN and IQN learn quantiles instead of fixed atoms.",
    "prereqs": [
      "q-learning",
      "mdp-bellman"
    ],
    "leadsTo": []
  }
};
window.CONCEPT_REVERSE = {
  "q-learning": [
    {
      "kind": "demo",
      "slug": "gridworld-rl"
    },
    {
      "kind": "demo",
      "slug": "value-iteration"
    },
    {
      "kind": "demo",
      "slug": "sarsa-vs-qlearning"
    },
    {
      "kind": "demo",
      "slug": "td-lambda"
    },
    {
      "kind": "demo",
      "slug": "dyna-q"
    },
    {
      "kind": "demo",
      "slug": "double-q-learning"
    },
    {
      "kind": "demo",
      "slug": "distributional-rl"
    },
    {
      "kind": "game",
      "slug": "snake-dqn"
    },
    {
      "kind": "module",
      "slug": "reinforcement-learning"
    }
  ]
};
