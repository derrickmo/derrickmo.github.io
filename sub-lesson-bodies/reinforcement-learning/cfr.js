// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/reinforcement-learning/cfr/.
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
  "conceptId": "cfr",
  "lesson": {
    "title": "Counterfactual Regret Minimization",
    "oneLine": "Minimise regret at every information set and the AVERAGE strategy converges to Nash — the current one never does, and confusing them is the classic bug.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Games of imperfect information break the machinery that works for chess and Go. You cannot evaluate a position because you do not know it — you know only an information set, the collection of states consistent with what you have seen. A strategy that is optimal at each information set in isolation is not optimal overall, because your own betting reveals information, and bluffing is only coherent as a randomised strategy.",
          "CFR attacks this with regret minimisation. Traverse the game tree accumulating, for each information set and each action, the counterfactual regret — how much better you would have done had you always played that action there, weighted by the probability of reaching that information set at all. Then set the next strategy proportional to positive regret, and repeat.",
          "The guarantee is that in a two-player zero-sum game the average of the strategies converges to a Nash equilibrium, with regret shrinking as one over the square root of the number of iterations. This is what solved heads-up limit hold'em and underpinned Libratus and Pluribus."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Counterfactual regret, and the regret-matching strategy update:"
        ],
        "tex": "R^T(I,a) = \\sum_{t=1}^{T} \\pi^{\\sigma^t}_{-i}(I)\\left(u_i(\\sigma^t|_{I \\to a}, I) - u_i(\\sigma^t, I)\\right), \\qquad \\sigma^{T+1}(I,a) = \\frac{\\left[R^T(I,a)\\right]^+}{\\sum_b \\left[R^T(I,b)\\right]^+}",
        "texNote": "The counterfactual weight is the probability that everyone EXCEPT you plays to reach this information set. Excluding your own contribution is what makes the regrets decompose across the tree, and it is what the word counterfactual is doing — it asks what would have happened had you tried to get here."
      },
      {
        "h": "In code",
        "code": "def cfr(history, p0, p1, node_map):\n    if is_terminal(history):\n        return payoff(history)\n    info_set = node_map[abstract(history)]\n    strategy = info_set.regret_matching()\n    util = [0.0] * n_actions\n    node_util = 0.0\n    for a in range(n_actions):\n        # recurse with the ACTING player's reach probability scaled by this action\n        if player(history) == 0:\n            util[a] = -cfr(history + [a], p0 * strategy[a], p1, node_map)\n        else:\n            util[a] = -cfr(history + [a], p0, p1 * strategy[a], node_map)\n        node_util += strategy[a] * util[a]\n\n    cf_reach = p1 if player(history) == 0 else p0      # the OPPONENT's reach\n    my_reach = p0 if player(history) == 0 else p1\n    for a in range(n_actions):\n        info_set.regret_sum[a] += cf_reach * (util[a] - node_util)\n        info_set.strategy_sum[a] += my_reach * strategy[a]   # weight by OWN reach\n    return node_util",
        "caption": "Note the two different reach probabilities. Regrets are weighted by the opponent's reach and the average strategy by your own — swapping them is a bug that still converges to something, just not to a Nash equilibrium."
      },
      {
        "h": "Why you must play the average",
        "paras": [
          "The convergence guarantee is about the average strategy, not the current one, and the difference is dramatic rather than technical. Run on a biased rock-paper-scissors where a scissors win pays double — a game whose Nash equilibrium is 0.5 rock, 0.25 paper, 0.25 scissors, verified analytically by checking the opponent is indifferent to all three replies.",
          "After a million iterations the current strategy was the pure strategy always-paper, an error of 0.75 from equilibrium. It had been always-rock a moment earlier, and always-scissors before that; it keeps cycling forever and never settles. Over the same run the average strategy went from an error of 0.325 at ten iterations to 0.0497 at a hundred, 0.0071 at ten thousand, and 0.00047 at a hundred thousand.",
          "So an implementation that stores regrets, runs a million iterations, and then plays the final strategy will produce an agent that is trivially exploitable while all its internal diagnostics look healthy. Accumulate the strategy sum and play its normalisation.",
          "Two scaling notes. Vanilla CFR traverses the entire tree every iteration, which is impossible for real poker, so practical solvers use Monte Carlo sampling variants and, more importantly, CFR+ — which zeroes negative regrets rather than letting them accumulate, and converges enough faster that it is now the default. And the whole guarantee is specific to two-player zero-sum games; with three or more players there is no equivalent result, which is why Pluribus's six-player success was notable and is explained by strong empirical performance rather than by a theorem."
        ]
      }
    ],
    "takeaways": [
      "CFR accumulates counterfactual regret per information set — weighted by the OPPONENT's reach probability — and plays proportional to positive regret.",
      "Only the AVERAGE strategy converges: after a million iterations the current one was a pure strategy with error 0.75, while the average was within 0.0005 of Nash.",
      "The guarantee holds for two-player zero-sum only; use CFR+ in practice, and Monte Carlo sampling once the tree is too large to traverse."
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
  "index": 15,
  "prev": "max-entropy-rl",
  "next": "replicator-dynamics"
};
