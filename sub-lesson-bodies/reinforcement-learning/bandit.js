// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/reinforcement-learning/bandit/.
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
  "conceptId": "bandit",
  "lesson": {
    "title": "Multi-Armed Bandits",
    "oneLine": "The simplest RL problem: balance exploring options against exploiting the best.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "A bandit faces several actions with unknown payoffs and must learn which is best while earning reward. Pull the current best too eagerly and you may never discover a better one; explore too much and you waste pulls. Strategies like epsilon-greedy and UCB formalize this explore-exploit trade-off - the heart of all RL."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "UCB picks the arm with the best optimistic estimate, favoring uncertain arms:"
        ],
        "tex": "a_t = \\arg\\max_a\\; \\hat{\\mu}_a + c\\sqrt{\\tfrac{\\ln t}{N_a}}",
        "texNote": "The bonus term shrinks as an arm is tried more, so exploration self-regulates."
      },
      {
        "h": "In code",
        "code": "import numpy as np\n\ndef ucb(mu, N, t, c=2.0):\n    return np.argmax(mu + c * np.sqrt(np.log(t + 1) / (N + 1e-9)))",
        "caption": "Optimism in the face of uncertainty."
      },
      {
        "h": "A fixed epsilon never stops paying",
        "paras": [
          "Epsilon-greedy explores at a constant rate forever, so a fixed slice of every pull is spent on actions already known to be worse and the regret grows linearly in time. Over 20,000 pulls of a 10-armed Gaussian bandit, epsilon 0.1 accumulates 3,146.8 regret and epsilon 0.01 accumulates 1,610.0, while UCB with c = 1 accumulates 103.1 — about thirty times less than the better epsilon setting.",
          "The difference is not tuning, it is the shape of the curve: UCB's exploration bonus shrinks as an arm is sampled, so its regret grows logarithmically and the gap widens without bound as the horizon lengthens. That also explains when epsilon-greedy is nevertheless the right call — short horizons, or non-stationary rewards where a permanently curious policy is a feature and the optimal arm you stopped checking has quietly changed."
        ]
      }
    ],
    "takeaways": [
      "Bandits isolate the explore-exploit trade-off.",
      "Epsilon-greedy explores at random; UCB explores by uncertainty.",
      "Every RL method inherits this tension."
    ],
    "demo": "bandit"
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
  "index": 0,
  "prev": null,
  "next": "sarsa"
};
