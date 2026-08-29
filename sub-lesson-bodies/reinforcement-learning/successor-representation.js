// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/reinforcement-learning/successor-representation/.
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
  "conceptId": "successor-representation",
  "lesson": {
    "title": "Successor Representation",
    "oneLine": "Cache where the policy tends to go, separately from what you get for going there — so a new reward is instant and a new wall is not.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Model-free methods learn a value that fuses dynamics and reward into one number, so any change in reward means relearning from scratch. Model-based methods learn the transition model and plan, which handles change but costs a search at every decision. The successor representation sits between them.",
          "It learns, for each state, the discounted expected number of future visits to every other state under the current policy. That object depends only on the dynamics and the policy — not on the reward at all. The value function is then a single dot product between that visitation vector and the reward vector.",
          "The consequence is the point. Change where the reward is and you do not relearn anything: recompute the dot product. Measured on a 5-by-5 gridworld, moving the reward from one corner to another and recomputing values from the unchanged successor matrix gave a maximum error of exactly zero across all 25 states — not an approximation, the exact new value function."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "The successor matrix as a discounted occupancy, its closed form, and the factorisation of value:"
        ],
        "tex": "M(s,s') = \\mathbb{E}\\left[\\sum_{t=0}^{\\infty}\\gamma^t \\mathbb{1}[S_t = s'] \\,\\middle|\\, S_0 = s\\right] = \\left(I - \\gamma P^{\\pi}\\right)^{-1}, \\qquad V^{\\pi}(s) = \\sum_{s'} M(s,s')\\,r(s')",
        "texNote": "M satisfies its own Bellman equation, so it can be learned by exactly the TD update used for values, with a one-hot indicator in place of the reward. Everything you know about TD learning transfers directly."
      },
      {
        "h": "In code",
        "code": "import numpy as np\n\ndef td_successor(env, policy, gamma=0.95, alpha=0.1, episodes=5000):\n    M = np.zeros((env.n_states, env.n_states))\n    for _ in range(episodes):\n        s = env.reset()\n        done = False\n        while not done:\n            s_next, done = env.step(policy(s))\n            onehot = np.zeros(env.n_states); onehot[s] = 1.0\n            target = onehot + gamma * M[s_next] * (not done)\n            M[s] += alpha * (target - M[s])       # same TD rule, vector-valued\n            s = s_next\n    return M\n\nvalue = M @ reward_vector          # any reward vector, no relearning\n\n# For large or continuous spaces, learn successor FEATURES instead: psi(s) predicts the\n# discounted sum of future feature vectors, and value is psi(s) @ w whenever the reward\n# is linear in those same features.",
        "caption": "The vector-valued TD update is the whole implementation. Because the target is an indicator rather than a reward, it learns the same object regardless of what the agent is being paid for.",
        "paras": [
          "The successor matrix is learned by the ordinary temporal-difference rule with the reward replaced by a one-hot state indicator, so nothing new is needed algorithmically."
        ]
      },
      {
        "h": "What it does not survive",
        "paras": [
          "The cache is a cache of the dynamics under the current policy, so changing the dynamics invalidates it. Adding a wall to the same gridworld while leaving the reward alone: the stale successor representation reported a value of 0.23847 at the start state when the truth was 0.17300, with a maximum error of 0.525 across the grid. It is confidently wrong, and nothing in the representation signals that anything changed.",
          "That asymmetry is exactly the point, and it is what makes the successor representation a serious model of animal behaviour. Rodents adapt almost instantly to a reward being moved or devalued, and adapt slowly to a barrier being introduced — the same asymmetry, from the same cause. It also predicts the shape of hippocampal place fields, which skew backward along frequently taken routes in the way a discounted occupancy map would.",
          "The second limitation is policy dependence. M is defined under the current policy, so as the policy improves the representation it was built on is drifting. Successor features with generalised policy improvement address this by keeping a set of representations for different policies and picking the best combination for a new task.",
          "Practically, this is the machinery behind fast transfer in multi-task RL: learn successor features once, and each new reward specification becomes a small linear problem instead of a new training run. The requirement is that the reward be linear in the features you chose, which is a real modelling constraint rather than a formality."
        ]
      }
    ],
    "takeaways": [
      "Value factorises into a policy-and-dynamics term and a reward term, so changing the reward is a dot product — recomputed values matched the exact answer to zero error across all states.",
      "Changing the DYNAMICS invalidates it: adding a wall left the stale representation confidently wrong by up to 0.525, with nothing to signal it.",
      "It is learned by the ordinary TD rule with a one-hot indicator in place of the reward, and that reward/dynamics asymmetry matches how animals actually adapt."
    ],
    "demo": "successor-representation"
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
  "index": 13,
  "prev": "distributional-rl",
  "next": "max-entropy-rl"
};
