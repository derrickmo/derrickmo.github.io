// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/reinforcement-learning/sarsa/.
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
  "conceptId": "sarsa",
  "lesson": {
    "title": "SARSA",
    "oneLine": "On-policy control: update toward the action you actually took.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "SARSA is Q-learning's on-policy twin. Where Q-learning bootstraps from the best next action, SARSA bootstraps from the action its policy actually chose next - so it learns the value of the policy it is following, exploration and all. On a cliff-edge task it learns the safe path; Q-learning learns the risky optimal one."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "The target uses the next action a' sampled from the current policy:"
        ],
        "tex": "Q(s,a)\\leftarrow Q(s,a)+\\alpha\\big[r+\\gamma Q(s',a')-Q(s,a)\\big]",
        "texNote": "Replace Q(s',a') with max over a' and you are back to Q-learning."
      },
      {
        "h": "In code",
        "code": "a2 = policy(s2)                       # on-policy: sample next action\nQ[s, a] += alpha * (r + gamma * Q[s2, a2] - Q[s, a])",
        "caption": "Bootstrap from the action the policy really takes."
      },
      {
        "h": "Learning what you will actually do",
        "paras": [
          "On the cliff walk, SARSA and Q-learning disagree about the answer and both are right. Q-learning learns the optimal path, which runs along the very edge of the cliff, because its update assumes the greedy action will be taken next. SARSA updates toward the action its exploring policy will actually take, so it accounts for the 10% chance of stepping sideways into the cliff and settles on a path one row further back.",
          "Measured as online return over the last 100 episodes with epsilon 0.1 throughout, SARSA earns -23.7 and Q-learning -46.5. Q-learning has learned the better policy and earns roughly half as much while doing so, because it keeps falling off the cliff during exploration. Which one you want is a question about deployment rather than about algorithms: if the exploration is real — a robot, a live system — the on-policy answer is the one that reflects the cost you are actually paying."
        ]
      }
    ],
    "takeaways": [
      "SARSA is on-policy: it values the policy it follows.",
      "Q-learning is off-policy: it values the greedy optimum.",
      "On-policy learning is safer under exploration."
    ],
    "demo": "sarsa-vs-qlearning"
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
  "index": 1,
  "prev": "bandit",
  "next": "td-lambda"
};
