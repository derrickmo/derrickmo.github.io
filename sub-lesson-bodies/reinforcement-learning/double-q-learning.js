// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/reinforcement-learning/double-q-learning/.
// concept-lesson-app.jsx reads window.DM_SUBLESSON_CTX and falls back to
// window.DM_SUBLESSON(...) so the page still works if this file is ever missing.

window.DM_SUBLESSON_CTX = {
  "module": {
    "title": "Reinforcement Learning",
    "lessons": {
      "bandit": {
        "title": "Multi-Armed Bandits"
      },
      "sarsa": {
        "title": "SARSA"
      },
      "td-lambda": {
        "title": "TD(lambda) and Eligibility Traces"
      },
      "double-q-learning": {
        "title": "Double Q-Learning"
      },
      "gae": {
        "title": "Generalized Advantage Estimation"
      },
      "ppo": {
        "title": "Proximal Policy Optimization"
      },
      "dyna-q": {
        "title": "Dyna-Q"
      },
      "regret-matching": {
        "title": "Regret Matching & Nash Equilibrium"
      },
      "minimax": {
        "title": "Minimax & Alpha-Beta"
      },
      "mcts": {
        "title": "Monte-Carlo Tree Search"
      },
      "neuroevolution": {
        "title": "Neuroevolution"
      },
      "prioritized-replay": {
        "title": "Prioritized Experience Replay"
      },
      "distributional-rl": {
        "title": "Distributional RL (C51)"
      },
      "successor-representation": {
        "title": "Successor Representation"
      },
      "max-entropy-rl": {
        "title": "Maximum-Entropy RL (Soft Value Iteration)"
      },
      "cfr": {
        "title": "Counterfactual Regret Minimization"
      },
      "replicator-dynamics": {
        "title": "Replicator Dynamics"
      },
      "iterated-prisoners-dilemma": {
        "title": "Iterated Prisoner's Dilemma"
      }
    }
  },
  "moduleSlug": "reinforcement-learning",
  "conceptId": "double-q-learning",
  "lesson": {
    "title": "Double Q-Learning",
    "oneLine": "Cancel the optimistic bias that fools plain Q-learning.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Taking a max over noisy action-value estimates systematically overestimates - the maximization bias. Double Q-learning keeps two value tables and uses one to pick the best action and the other to evaluate it, decoupling selection from evaluation so the noise no longer inflates the estimate."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Select with one estimator, evaluate with the other:"
        ],
        "tex": "Q_A(s,a)\\leftarrow Q_A(s,a)+\\alpha\\big[r+\\gamma Q_B\\big(s',\\arg\\max_{a'}Q_A(s',a')\\big)-Q_A(s,a)\\big]",
        "texNote": "Randomly update A or B each step; the cross-evaluation removes the upward bias."
      },
      {
        "h": "In code",
        "code": "if np.random.rand() < 0.5:\n    a_star = Q_A[s2].argmax()\n    Q_A[s, a] += alpha * (r + gamma * Q_B[s2, a_star] - Q_A[s, a])\n# else symmetric: pick with B, evaluate with A",
        "caption": "Decouple action selection from action evaluation."
      },
      {
        "h": "Where the bias actually comes from",
        "paras": [
          "The overestimation is not a bug in Q-learning's update but a property of taking a maximum over noisy numbers: E[max] is greater than max[E]. With every action's true value exactly zero and each estimate carrying unit-variance noise, the max of the estimates averages 0.573 over 2 actions, 1.171 over 5, 1.544 over 10 and 2.249 over 50 — a bias that grows with the number of actions, out of pure noise.",
          "What double Q-learning changes is not the noise but the coupling. Selecting the action with one estimator and reading its value from an independent second one gives 0.005, 0.009, -0.002 and 0.005 on the same four cases — the bias is gone because the estimate being read was not the one that won the argmax. The cost is halved data per estimator and a slower start, and the residual risk is the opposite one: with a genuinely better action the decoupled read can be pessimistic."
        ]
      }
    ],
    "takeaways": [
      "max over noisy estimates overestimates values.",
      "Double Q-learning decouples selection from evaluation.",
      "It is the idea behind Double DQN."
    ],
    "demo": "double-q-learning"
  },
  "order": [
    "bandit",
    "sarsa",
    "td-lambda",
    "double-q-learning",
    "gae",
    "ppo",
    "dyna-q",
    "regret-matching",
    "minimax",
    "mcts",
    "neuroevolution",
    "prioritized-replay",
    "distributional-rl",
    "successor-representation",
    "max-entropy-rl",
    "cfr",
    "replicator-dynamics",
    "iterated-prisoners-dilemma"
  ],
  "index": 3,
  "prev": "td-lambda",
  "next": "gae"
};
