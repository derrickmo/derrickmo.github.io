// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/markov/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
  "markov": {
    "id": "markov",
    "name": "Markov / n-gram Models",
    "area": "NLP",
    "summary": "Predict the next token from the last n, the lookup-table ancestor of every LLM.",
    "leadsTo": [
      "transformer-block",
      "hmm-viterbi",
      "successor-representation",
      "pagerank"
    ],
    "prereqs": []
  },
  "transformer-block": {
    "id": "transformer-block",
    "name": "Transformer Block",
    "area": "Transformers",
    "summary": "Attention, feed-forward, residual and layer-norm together form the basic stacked unit of GPT, BERT and Llama.",
    "prereqs": [
      "attention",
      "multi-head"
    ],
    "animation": "viz/transformer.html",
    "leadsTo": [
      "mixture-of-depths"
    ]
  },
  "hmm-viterbi": {
    "id": "hmm-viterbi",
    "name": "HMM & the Viterbi Algorithm",
    "area": "Probability & Bayes",
    "summary": "A hidden Markov model has latent states that transition over time and emit observations, and Viterbi is the dynamic program that finds the single most-likely hidden state path in O(TK^2), working in log space to avoid underflow. It is exact MAP sequence decoding, the discrete-state sibling of the Kalman filter, and it powered classical speech recognition, POS tagging, gene finding and regime detection. Forward-backward gives per-step marginals, and Baum-Welch (EM) learns the parameters.",
    "tex": "\\delta_t(k) = \\max_j\\,[\\delta_{t-1}(j) + \\log A_{j,k}] + \\log B_k(o_t)",
    "prereqs": [
      "markov",
      "bayes"
    ],
    "leadsTo": []
  },
  "successor-representation": {
    "id": "successor-representation",
    "name": "Successor Representation",
    "area": "Reinforcement Learning",
    "summary": "M(s,s') is the expected discounted number of future visits to s' starting from s under a policy, equal to (I-gamma*P)-1. It factorizes value into dynamics and reward, V(s)=sum_s' M(s,s')R(s'), so when the reward changes you recompute V instantly as M.R with no relearning of dynamics. It is learned by TD just like a value function, but bootstrapping one-hot occupancy. It sits between model-free and model-based RL, and the deep version, successor features, enables transfer across reward functions. Predictive maps like it appear in hippocampal place and grid cells.",
    "tex": "M = (I - \\gamma P)^{-1},\\qquad V = M R",
    "prereqs": [
      "mdp-bellman",
      "markov"
    ],
    "leadsTo": []
  },
  "pagerank": {
    "id": "pagerank",
    "name": "PageRank",
    "area": "Graphs",
    "summary": "Rank nodes by the importance of the nodes linking to them, resolved by power iteration: PR_i = (1-d)/N + d*sum_{j to i} PR_j/outdeg_j, plus dangling mass. It is the stationary distribution of a random surfer who follows a link with probability d and teleports otherwise, and the teleport is what makes the chain ergodic so a unique answer exists. Mathematically it is the dominant eigenvector of the damped transition matrix. It launched Google and was reused for citation ranking, recommendation, spam detection and TextRank.",
    "tex": "PR_i = \\frac{1-d}{N} + d \\sum_{j \\to i} \\frac{PR_j}{\\mathrm{outdeg}(j)}",
    "prereqs": [
      "markov"
    ],
    "leadsTo": [
      "community-detection"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "markov": [
    {
      "kind": "demo",
      "slug": "hmm-viterbi"
    },
    {
      "kind": "demo",
      "slug": "markov"
    },
    {
      "kind": "demo",
      "slug": "successor-representation"
    },
    {
      "kind": "demo",
      "slug": "pagerank"
    },
    {
      "kind": "game",
      "slug": "rps"
    },
    {
      "kind": "module",
      "slug": "rnn-nlp"
    }
  ]
};
