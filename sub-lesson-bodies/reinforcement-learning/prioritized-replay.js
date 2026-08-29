// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/reinforcement-learning/prioritized-replay/.
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
  "conceptId": "prioritized-replay",
  "lesson": {
    "title": "Prioritized Experience Replay",
    "oneLine": "Replay surprising transitions more often — which speeds learning and quietly changes what you are averaging over, unless you correct for it.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Uniform experience replay treats every stored transition as equally worth revisiting. It is not. Most transitions in a replay buffer are already well predicted and produce a near-zero gradient; the informative ones are those the network still gets wrong. Prioritized replay samples in proportion to the magnitude of the temporal-difference error, so the agent spends its updates where there is something to learn.",
          "The gain is real and largest exactly where you would want it: sparse-reward tasks, where the handful of transitions that reached a reward are drowned out by thousands of uninformative ones. Replaying them proportionally to their surprise is what propagates value back along the trajectory in a reasonable number of updates.",
          "But sampling non-uniformly from a buffer means you are no longer estimating the expectation you intended. Every gradient estimate is now taken under a different distribution, and the fixed point moves."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "The sampling distribution and the importance-sampling weight that undoes its effect on the expectation:"
        ],
        "tex": "P(i) = \\frac{p_i^{\\alpha}}{\\sum_k p_k^{\\alpha}}, \\qquad w_i = \\left(\\frac{1}{N}\\cdot\\frac{1}{P(i)}\\right)^{\\beta} \\Big/ \\max_j w_j",
        "texNote": "Alpha interpolates between uniform at 0 and fully greedy prioritisation at 1. Beta controls how much of the bias is corrected — it is annealed from about 0.4 to 1 over training, because the bias matters most near convergence and the extra variance hurts most early on."
      },
      {
        "h": "In code",
        "code": "import numpy as np\n\nclass PrioritizedBuffer:\n    def __init__(self, capacity, alpha=0.6, eps=1e-6):\n        self.data = []\n        self.prio = np.zeros(capacity, dtype=np.float64)\n        self.capacity, self.alpha, self.eps = capacity, alpha, eps\n        self.pos = 0\n\n    def add(self, transition):\n        # new transitions get MAX priority so every one is replayed at least once;\n        # initialising them at zero means a transition can never be sampled and so\n        # never gets a priority - it is invisible forever\n        self.prio[self.pos] = self.prio.max() if self.data else 1.0\n        if len(self.data) < self.capacity:\n            self.data.append(transition)\n        else:\n            self.data[self.pos] = transition\n        self.pos = (self.pos + 1) % self.capacity\n\n    def sample(self, batch, beta=0.4):\n        p = self.prio[:len(self.data)] ** self.alpha\n        p = p / p.sum()\n        idx = np.random.choice(len(self.data), batch, p=p)\n        w = (len(self.data) * p[idx]) ** (-beta)\n        return idx, [self.data[i] for i in idx], w / w.max()\n\n    def update(self, idx, td_errors):\n        self.prio[idx] = np.abs(td_errors) + self.eps    # eps: never priority zero",
        "caption": "A production buffer uses a sum-tree so sampling and priority updates are logarithmic rather than linear in the buffer size — at a million transitions the linear version dominates the training step."
      },
      {
        "h": "The bias is not theoretical",
        "paras": [
          "Reduced to the smallest case that shows it: a buffer whose true mean is 1.0, estimated by repeatedly sampling an element and taking a small step toward it. Uniform sampling converged to 1.0747. Sampling with priority proportional to the current error, without importance weights, converged to 2.5332 — off by a factor of two and a half, and stable there, so no amount of extra training fixes it. Adding the importance-sampling weight brought it back to 0.9638.",
          "The mechanism is worth stating plainly: prioritisation over-samples exactly the high-error items, which are the extreme ones, so the running average is pulled toward the extremes. In a real agent that shows up as systematically over-estimated values, which then compounds through bootstrapping.",
          "Two practical failures follow from the same source. Noisy environments create permanently high TD error that is irreducible, so the buffer fixates on transitions nothing can learn — the epsilon and the alpha exponent both exist to blunt that. And stale priorities: a transition's priority is only updated when it happens to be sampled, so the ordering drifts away from the truth as the network changes underneath it.",
          "Worth knowing that the picture has moved on. Later analyses found much of the reported benefit could be matched by simply doing more gradient steps per environment step, and distributed agents get similar effects from having many actors at different exploration levels. Prioritised replay is still standard in single-actor value-based agents, and it is no longer the free win the original results suggested."
        ]
      }
    ],
    "takeaways": [
      "Sampling by TD error concentrates updates where the model is still wrong, which matters most in sparse-reward tasks where informative transitions are rare.",
      "It biases the fixed point: a buffer with true mean 1.0 converged to 2.5332 without importance weights and 0.9638 with them, and the bias is stable, so more training does not remove it.",
      "Beta anneals the correction because bias matters near convergence while variance hurts early; new transitions must enter at maximum priority or they are never sampled at all."
    ],
    "demo": "prioritized-replay"
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
  "index": 11,
  "prev": "neuroevolution",
  "next": "distributional-rl"
};
