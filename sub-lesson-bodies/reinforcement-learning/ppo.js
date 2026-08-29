// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/reinforcement-learning/ppo/.
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
  "conceptId": "ppo",
  "lesson": {
    "title": "Proximal Policy Optimization",
    "oneLine": "Take the biggest safe policy step by clipping the update.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Big policy-gradient steps can collapse a policy. PPO lets you reuse a batch for several updates but clips the change in action probabilities, so the new policy never strays too far from the old one. This simple clip makes training stable and sample-efficient - it is the default for RLHF."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Clip the probability ratio so the surrogate objective cannot reward going too far:"
        ],
        "tex": "L = \\mathbb{E}\\big[\\min(r_t A_t,\\ \\mathrm{clip}(r_t, 1-\\epsilon, 1+\\epsilon)A_t)\\big]",
        "texNote": "r_t is the new/old probability ratio; outside the band the gradient is zero."
      },
      {
        "h": "In code",
        "code": "ratio = np.exp(logp_new - logp_old)\nclip = np.clip(ratio, 1 - eps, 1 + eps)\nloss = -np.minimum(ratio * A, clip * A).mean()",
        "caption": "The clip parks the ratio inside a trust region."
      },
      {
        "h": "The clip bounds a ratio, not the policy",
        "paras": [
          "The clipped objective does what it says: running repeated epochs on one batch, the probability ratio rises to 1.201 and stops there, held at the 1 + epsilon boundary exactly as designed. What it does not do is bound how far the policy has moved. Over the same run the KL divergence from the behaviour policy grows from 0.00031 after one epoch to 0.02064 after ten — a factor of 66 — while the ratio itself moved only 1.17x.",
          "That gap is the whole reason PPO is a heuristic rather than a trust region. The clip is a per-sample, per-action constraint; the quantity the theory cares about is a divergence over the whole state distribution, and nothing in the objective measures it. It is why real implementations bound the epoch count, watch the KL as a diagnostic, and often stop the update early when it crosses a threshold — reinstating by convention the guarantee that TRPO enforced by construction and PPO traded away for simplicity."
        ]
      }
    ],
    "takeaways": [
      "PPO clips the policy update into a trust region.",
      "It allows several epochs per batch, stably.",
      "It is the workhorse of modern RL and RLHF."
    ],
    "demo": "ppo"
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
  "index": 5,
  "prev": "gae",
  "next": "dyna-q"
};
