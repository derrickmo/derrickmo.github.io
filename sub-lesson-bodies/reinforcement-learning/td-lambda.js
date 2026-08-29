// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/reinforcement-learning/td-lambda/.
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
  "conceptId": "td-lambda",
  "lesson": {
    "title": "TD(lambda) and Eligibility Traces",
    "oneLine": "Dial smoothly between one-step TD and full Monte Carlo.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "One-step TD updates from the very next reward (low variance, biased); Monte Carlo waits for the full return (unbiased, high variance). TD(lambda) blends them with eligibility traces - a fading memory of recently visited states - so one update credits a whole trajectory. Intermediate lambda often learns fastest."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "The trace decays by gamma*lambda and gates how much each state is updated:"
        ],
        "tex": "e_t(s) = \\gamma\\lambda\\,e_{t-1}(s) + \\mathbb{1}[s_t = s]",
        "texNote": "lambda = 0 is one-step TD; lambda = 1 is Monte Carlo."
      },
      {
        "h": "In code",
        "code": "delta = r + gamma * V[s2] - V[s]\ne[s] += 1                              # mark visited\nV += alpha * delta * e                 # update all eligible states\ne *= gamma * lam                       # decay the trace",
        "caption": "One TD error updates every recently-seen state."
      },
      {
        "h": "Neither end of the dial is the right answer",
        "paras": [
          "Lambda interpolates between one-step TD and Monte Carlo, and the interesting fact is that the best setting is almost never at either end. On the classic 19-state random walk after 100 episodes, the RMS error of the learned values is 0.249 at lambda 0, falls to 0.071 at lambda 0.8, then rises again to 0.106 at 0.9, 0.161 at 0.95 and 0.492 at lambda 1 — a clean U, with the interior beating both extremes by a factor of three to seven.",
          "The two ends fail for opposite reasons. Lambda 0 propagates credit one step per episode, so information about a distant reward crawls back through the state space; lambda 1 assigns credit correctly in one pass but weights the whole noisy return, so each update is high variance. Eligibility traces are what make the middle affordable: rather than storing trajectories and computing lambda-returns afterwards, they carry a decaying record of recent visits so the same interpolation costs one extra vector."
        ]
      }
    ],
    "takeaways": [
      "Eligibility traces credit a whole trajectory per step.",
      "lambda interpolates TD(0) and Monte Carlo.",
      "Intermediate lambda usually learns fastest."
    ],
    "demo": "td-lambda"
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
  "index": 2,
  "prev": "sarsa",
  "next": "double-q-learning"
};
