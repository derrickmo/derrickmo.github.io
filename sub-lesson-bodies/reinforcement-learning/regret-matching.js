// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/reinforcement-learning/regret-matching/.
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
  "conceptId": "regret-matching",
  "lesson": {
    "title": "Regret Matching & Nash Equilibrium",
    "oneLine": "Play each action in proportion to how much you regret not having played it — and the time-average converges to equilibrium.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "In a game against an adapting opponent there is no fixed best action to learn: whatever you settle on, they exploit. Regret matching sidesteps this by never settling. After each round you ask, for every action, how much better off you would have been had you always played it. Actions you regret not playing get more probability next time.",
          "The result is not that any single round is optimal. It is that the running average of your strategy converges to an equilibrium, which is the strongest thing available when the opponent is also learning."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Cumulative regret for action a is how much more you would have scored by always choosing it. The next policy is regret, clipped at zero, normalised:"
        ],
        "tex": "R_T(a) = \\sum_{t=1}^{T}\\big(u_t(a) - u_t(\\sigma_t)\\big), \\qquad \\sigma_{T+1}(a) = \\frac{[R_T(a)]^{+}}{\\sum_{a'}[R_T(a')]^{+}}",
        "texNote": "Clipping at zero matters: an action you do not regret gets no weight at all. If every regret is negative the policy falls back to uniform. Regret grows sub-linearly, so the AVERAGE regret goes to zero — which is exactly the condition for the average strategy to be an equilibrium."
      },
      {
        "h": "In code",
        "code": "import numpy as np\n\ndef regret_matching(payoff, rounds=10000):\n    n = payoff.shape[0]\n    regret = np.zeros(n)\n    avg = np.zeros(n)\n    for _ in range(rounds):\n        pos = np.maximum(regret, 0)\n        p = pos / pos.sum() if pos.sum() > 0 else np.ones(n) / n\n        avg += p\n        u = payoff @ p                  # value of each action against the current mix\n        regret += u - u @ p             # regret is action value minus achieved value\n    return avg / avg.sum()              # the AVERAGE strategy is the equilibrium",
        "caption": "Run this on rock-paper-scissors and the average converges to (1/3, 1/3, 1/3). The current strategy never settles there — only the average does."
      },
      {
        "h": "Why this is the poker algorithm",
        "paras": [
          "Counterfactual regret minimisation is this rule applied at every information set of an imperfect-information game, with regrets weighted by the probability of reaching that decision point. It is what produced superhuman poker, and the core update is the four lines above.",
          "The distinction that trips people up: the CURRENT strategy oscillates forever and is not an equilibrium. The AVERAGE over all iterations is. Reporting the last iterate rather than the average is the classic implementation bug, and it looks like the algorithm failed to converge.",
          "The gap between the two is large enough to be unmistakable once measured. Running regret matching on a biased rock-paper-scissors where a win over scissors pays double, the AVERAGE strategy converges to the Nash 0.5 / 0.25 / 0.25 and its exploitability falls from 0.194 at 10 iterations to 0.0079 at 10,000 and 0.0025 at 100,000. The CURRENT strategy over the same run is a pure strategy that keeps changing — 0/0/1, then 1/0/0, then 0/1/0 — with an exploitability of 1 to 2 at every checkpoint, no better at 100,000 iterations than at 10. The average is not a smoothing convenience; it is the object the theorem is about."
        ]
      }
    ],
    "takeaways": [
      "Regret matching plays each action in proportion to positive cumulative regret; unregretted actions get zero weight.",
      "The AVERAGE strategy converges to equilibrium, not the current one — averaging is not a smoothing detail, it is the result.",
      "CFR is this update applied per information set, which is how imperfect-information games like poker were solved."
    ],
    "demo": "regret-matching"
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
  "index": 7,
  "prev": "dyna-q",
  "next": "minimax"
};
