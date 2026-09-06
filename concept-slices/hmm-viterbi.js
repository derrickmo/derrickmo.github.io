// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/hmm-viterbi/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
  "hmm-viterbi": {
    "id": "hmm-viterbi",
    "name": "HMM & the Viterbi Algorithm",
    "area": "Probability & Bayes",
    "summary": "A hidden Markov model has latent states that transition over time (Markov) and emit observations; Viterbi is the dynamic program that finds the single most-likely hidden state path in O(TK^2), working in log space to avoid underflow. It's exact MAP sequence decoding — the discrete-state sibling of the Kalman filter — and powered classical speech recognition, POS tagging, gene finding, and regime detection. Forward-backward gives per-step marginals; Baum-Welch (EM) learns the parameters.",
    "tex": "\\delta_t(k) = \\max_j\\,[\\delta_{t-1}(j) + \\log A_{j,k}] + \\log B_k(o_t)",
    "prereqs": [
      "markov",
      "bayes"
    ],
    "leadsTo": []
  },
  "markov": {
    "id": "markov",
    "name": "Markov / n-gram Models",
    "area": "NLP",
    "summary": "Predict the next token from the last n — the lookup-table ancestor of every LLM.",
    "leadsTo": [
      "transformer-block",
      "hmm-viterbi",
      "successor-representation",
      "pagerank"
    ],
    "prereqs": []
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
  }
};
window.CONCEPT_REVERSE = {
  "hmm-viterbi": [
    {
      "kind": "demo",
      "slug": "hmm-viterbi"
    },
    {
      "kind": "demo",
      "slug": "ctc-alignment"
    }
  ]
};
