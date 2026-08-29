// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/importance-sampling/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
  "importance-sampling": {
    "id": "importance-sampling",
    "name": "Importance Sampling",
    "area": "Probability & Bayes",
    "summary": "Estimate an expectation under a target p by sampling an easier proposal q and reweighting by w=p/q: E_p[f]=E_q[w·f]. Lets you hit rare events (tail probabilities) that naive Monte Carlo misses, and underlies off-policy RL evaluation and particle-filter resampling. Quality lives and dies by the proposal — if q has lighter tails than p the weights have infinite variance, so monitor the Effective Sample Size ESS=(Σw)²/Σw². Self-normalized IS needs the target only up to a constant. Degrades in high dimensions; fixes are adaptive/annealed IS and SMC.",
    "tex": "\\mathbb{E}_p[f] = \\mathbb{E}_q\\!\\left[\\tfrac{p(x)}{q(x)} f(x)\\right],\\quad \\mathrm{ESS}=\\tfrac{(\\sum w_i)^2}{\\sum w_i^2}",
    "prereqs": [
      "mcmc",
      "clt"
    ],
    "leadsTo": [
      "prioritized-replay"
    ]
  },
  "mcmc": {
    "id": "mcmc",
    "name": "MCMC (Metropolis-Hastings)",
    "area": "Probability & Bayes",
    "summary": "Sample from a distribution known only up to a constant by simulating a Markov chain whose stationary distribution is the target. Random-walk Metropolis proposes x'=x+N(0,σ²I) and accepts with prob min(1, p(x')/p(x)); the visited points (after burn-in) are correlated samples from p. The engine of practical Bayesian inference (Stan, PyMC) when the posterior has no closed form. Proposal scale trades acceptance against mixing; high dimensions and separated modes need gradient-based samplers (HMC/NUTS).",
    "tex": "\\alpha = \\min\\!\\left(1, \\dfrac{p(x')}{p(x)}\\right)",
    "prereqs": [
      "bayes",
      "clt"
    ],
    "leadsTo": [
      "importance-sampling"
    ]
  },
  "bayes": {
    "id": "bayes",
    "name": "Bayes' Rule (Conjugate Updating)",
    "area": "Probability & Bayes",
    "summary": "Update a prior belief into a posterior with new evidence — Beta-Bernoulli is the closed-form case behind A/B tests, Thompson sampling, and uncertainty estimation.",
    "tex": "P(\\theta \\mid D) = \\frac{P(D \\mid \\theta)\\, P(\\theta)}{P(D)}",
    "prereqs": [
      "cross-entropy"
    ],
    "leadsTo": [
      "bandit",
      "vae",
      "kalman-filter",
      "mcmc",
      "bayesian-linear-regression",
      "variational-inference",
      "naive-bayes",
      "gaussian-process",
      "hmm-viterbi",
      "simpsons-paradox"
    ]
  },
  "cross-entropy": {
    "id": "cross-entropy",
    "name": "Cross-Entropy",
    "area": "Information Theory",
    "summary": "The loss that measures how much a predicted distribution disagrees with the true labels.",
    "tex": "H(p, q) = -\\sum_i p_i \\log q_i",
    "prereqs": [
      "softmax"
    ],
    "leadsTo": [
      "scaling-laws",
      "bayes",
      "gan",
      "logistic-regression"
    ]
  },
  "softmax": {
    "id": "softmax",
    "name": "Softmax",
    "area": "Neural Networks",
    "summary": "Turn a vector of logits into a probability distribution; the workhorse output and attention nonlinearity.",
    "tex": "\\mathrm{softmax}(z)_i = \\frac{e^{z_i}}{\\sum_j e^{z_j}}",
    "leadsTo": [
      "contrastive-learning",
      "cross-entropy",
      "word2vec",
      "attention",
      "decoding"
    ],
    "prereqs": []
  },
  "clt": {
    "id": "clt",
    "name": "Central Limit Theorem",
    "area": "Probability & Bayes",
    "summary": "Averages of many independent samples converge to a Gaussian — why the bell curve is everywhere.",
    "leadsTo": [
      "ica",
      "mcmc",
      "importance-sampling",
      "reservoir-sampling",
      "kalman-filter",
      "kernel-density",
      "self-consistency",
      "drift-detection"
    ],
    "prereqs": []
  },
  "prioritized-replay": {
    "id": "prioritized-replay",
    "name": "Prioritized Experience Replay",
    "area": "Reinforcement Learning",
    "summary": "Replace uniform sampling from the replay buffer with sampling ∝ |TD error|^α, so surprising transitions are revisited more often. On sparse-reward tasks this produces a backward sweep of value from the goal and learns in far fewer updates. Because non-uniform sampling biases the expected update, correct it with importance-sampling weights w=(N·P)^(-β), annealing β toward 1. A standard upgrade to DQN; the data-side counterpart to Dyna-Q's planning.",
    "prereqs": [
      "dqn",
      "importance-sampling"
    ],
    "leadsTo": []
  }
};
window.CONCEPT_REVERSE = {
  "importance-sampling": [
    {
      "kind": "demo",
      "slug": "importance-sampling"
    },
    {
      "kind": "demo",
      "slug": "prioritized-replay"
    }
  ]
};
