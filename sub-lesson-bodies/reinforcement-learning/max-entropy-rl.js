// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/reinforcement-learning/max-entropy-rl/.
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
  "conceptId": "max-entropy-rl",
  "lesson": {
    "title": "Maximum-Entropy RL (Soft Value Iteration)",
    "oneLine": "Add the policy's entropy to the objective and the max in the Bellman backup becomes a log-sum-exp — which is where SAC comes from.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Standard RL maximises expected return, and its optimal policy is deterministic. That has costs: exploration must be bolted on from outside as epsilon-greedy or injected noise, near-equivalent actions are collapsed to an arbitrary choice, and the resulting policy is brittle when the environment shifts slightly.",
          "Maximum-entropy RL changes the objective to expected return plus the entropy of the policy, weighted by a temperature. The agent is now paid to remain as random as it can while still performing well, which makes exploration part of the objective instead of a heuristic wrapped around it.",
          "The consequence for the algorithm is a single substitution. The hard maximum in the Bellman backup becomes a soft maximum — a log-sum-exp — and the greedy policy becomes a Boltzmann distribution over action values. Everything else about value iteration is unchanged, which is why this slots into existing algorithms so cleanly."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "The objective, and the soft backup that replaces the max:"
        ],
        "tex": "J(\\pi) = \\mathbb{E}\\left[\\sum_t r_t + \\tau\\,\\mathcal{H}\\!\\left(\\pi(\\cdot|s_t)\\right)\\right], \\qquad V(s) = \\tau \\log \\sum_a \\exp\\!\\left(\\frac{Q(s,a)}{\\tau}\\right)",
        "texNote": "The optimal policy is then exactly the Boltzmann distribution exp((Q - V)/tau). As tau goes to zero the log-sum-exp converges to the maximum and the policy to the greedy one, so standard value iteration is the zero-temperature limit of this."
      },
      {
        "h": "In code",
        "code": "import torch\n\ndef soft_value(q, tau):\n    \"\"\"tau * logsumexp(q / tau), computed so it does not overflow.\"\"\"\n    m = q.max(dim=-1, keepdim=True).values\n    return (m + tau * torch.log(torch.exp((q - m) / tau).sum(dim=-1, keepdim=True))).squeeze(-1)\n    # equivalently: tau * torch.logsumexp(q / tau, dim=-1) - torch.logsumexp is already\n    # implemented with the max-subtraction, which is why you should call it rather than\n    # writing log(sum(exp(...))) yourself\n\n# SAC tunes tau automatically against a target entropy rather than fixing it, because the\n# right temperature depends on the reward SCALE - and reward scale changes during training.\n#   alpha_loss = -(log_alpha * (log_prob + target_entropy).detach()).mean()\n#   target_entropy = -action_dim          # the usual heuristic for continuous control",
        "caption": "Automatic temperature tuning is the change that made SAC reliable. With a fixed temperature the same hyperparameter has to be re-found for every environment, because it trades against the raw magnitude of the reward."
      },
      {
        "h": "Two things measured",
        "paras": [
          "First, the soft value is always an over-estimate of the hard maximum, bounded by the temperature times the log of the action count. Checked across temperatures on a three-action problem with values 1.0, 0.9 and 0.2: at temperature 1 the gap was 0.856 against a bound of 1.099; at 0.5, 0.352 against 0.549; at 0.1, 0.031 against 0.110; at 0.01, effectively zero. The bound held at every temperature, and it makes the bias explicit — a maximum-entropy agent systematically over-values states, by an amount you can compute and shrink.",
          "Second, a genuine implementation trap. Writing the log-sum-exp directly as the logarithm of a sum of exponentials returns Infinity at a temperature of 0.001, because it forms exp(1000) and overflows float64. The max-subtracted form returns exactly the hard maximum at temperatures down to 1e-6. This is not a micro-optimisation — the naive expression silently destroys the low-temperature end of the range, which is exactly the regime where the agent is meant to become near-greedy. Call the library's logsumexp.",
          "The framing worth carrying: maximum-entropy RL is inference. Maximising return plus entropy is equivalent to inferring the posterior over trajectories in a graphical model where reward acts as the log-likelihood of an optimality variable — which is what connects soft Q-learning, SAC, and the KL-regularised objective used in RLHF, where the reference-model penalty plays the same structural role as the entropy term.",
          "The practical caveat: the temperature trades against the raw scale of the reward, so a value tuned on one environment means something different on another. Fixing tau is the standard way to get a maximum-entropy agent that either behaves randomly or ignores the entropy term entirely; tune it against a target entropy instead."
        ]
      }
    ],
    "takeaways": [
      "Adding policy entropy to the objective replaces the max in the Bellman backup with a log-sum-exp and makes the optimal policy Boltzmann; standard value iteration is the zero-temperature limit.",
      "The soft value over-estimates the max by at most tau*log(#actions), verified at every temperature tested — an explicit, computable bias.",
      "Compute it with the max-subtracted form: the naive expression overflowed to Infinity at tau = 0.001, destroying exactly the near-greedy regime, while the stable form works to 1e-6."
    ],
    "demo": "max-entropy-rl"
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
  "index": 14,
  "prev": "successor-representation",
  "next": "cfr"
};
