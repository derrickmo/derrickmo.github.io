// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/bayes/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
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
  "bandit": {
    "id": "bandit",
    "name": "Multi-Armed Bandit (Explore/Exploit)",
    "area": "Reinforcement Learning",
    "summary": "Choose between uncertain options to minimize cumulative regret — RL's simplest, omnipresent problem.",
    "leadsTo": [
      "mcts",
      "bayesian-optimization",
      "regret-matching"
    ],
    "prereqs": []
  },
  "vae": {
    "id": "vae",
    "name": "Variational Autoencoder",
    "area": "Generative",
    "summary": "Encode to a Gaussian latent, sample via the reparameterization trick, decode — KL pulls the latent to a usable prior.",
    "prereqs": [
      "gmm-em"
    ],
    "leadsTo": [
      "diffusion"
    ]
  },
  "kalman-filter": {
    "id": "kalman-filter",
    "name": "Kalman Filter",
    "area": "Time Series",
    "summary": "Optimal recursive state estimation for a linear-Gaussian system: keep a Gaussian belief (mean + covariance) over hidden state and alternately predict it forward through a motion model and update it toward each noisy measurement. The Kalman gain optimally blends model trust (process noise Q) against sensor trust (measurement noise R). It's exact recursive Bayesian filtering, the workhorse behind GPS/IMU sensor fusion, robotics/SLAM, and object tracking; nonlinear systems use the Extended/Unscented variants or particle filters.",
    "tex": "K = P^- H^\\top (H P^- H^\\top + R)^{-1}",
    "prereqs": [
      "bayes",
      "clt"
    ],
    "leadsTo": []
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
  "bayesian-linear-regression": {
    "id": "bayesian-linear-regression",
    "name": "Bayesian Linear Regression",
    "area": "Probability & Bayes",
    "summary": "Place a Gaussian prior on the weights and infer a Gaussian posterior in closed form, yielding a full predictive distribution with calibrated error bars. The MAP estimate is exactly ridge regression; the infinite-basis limit is a Gaussian process.",
    "tex": "S_N^{-1} = \\alpha I + \\beta\\Phi^{\\top}\\Phi,\\quad m_N = \\beta S_N \\Phi^{\\top} t",
    "prereqs": [
      "linear-regression",
      "bayes"
    ],
    "leadsTo": [
      "gaussian-process"
    ]
  },
  "variational-inference": {
    "id": "variational-inference",
    "name": "Variational Inference (ELBO)",
    "area": "Probability & Bayes",
    "summary": "Approximate an intractable posterior by optimization: pick a tractable family q and maximize the ELBO (minimize reverse KL). Fast but biased — mean-field q underestimates variance and is mode-seeking. The training objective behind the VAE.",
    "tex": "\\mathcal{L}(q) = \\mathbb{E}_q[\\log p(x,z)] - \\mathbb{E}_q[\\log q(z)] \\le \\log p(x)",
    "prereqs": [
      "bayes",
      "gradient-descent"
    ],
    "leadsTo": [
      "vae"
    ]
  },
  "naive-bayes": {
    "id": "naive-bayes",
    "name": "Naive Bayes",
    "area": "Classical ML",
    "summary": "A generative classifier applying Bayes' rule with a deliberately naive twist: features are assumed conditionally independent given the class, so the class-conditional likelihood factorizes into per-feature terms (a diagonal-covariance Gaussian, or word counts for text). Fast, low-data, high-dimensional-friendly — the classic spam filter and a perennial baseline. Relaxing the diagonal constraint gives QDA (full per-class covariance) or LDA (shared); the independence assumption is usually wrong yet the argmax is often still right, though predicted probabilities end up overconfident/poorly calibrated.",
    "tex": "\\hat y = \\arg\\max_c\\; P(c)\\prod_{j} P(x_j \\mid c)",
    "prereqs": [
      "bayes"
    ],
    "leadsTo": [
      "svm"
    ]
  },
  "gaussian-process": {
    "id": "gaussian-process",
    "name": "Gaussian Processes",
    "area": "Classical ML",
    "summary": "A distribution over functions defined by a kernel: any finite set of points is jointly Gaussian. Conditioning on observations gives a closed-form posterior — mean k*ᵀ(K+σ²I)⁻¹y and variance that shrinks at data and grows away from it, so predictions come with honest, calibrated uncertainty. The kernel (lengthscale, amplitude) is the entire inductive bias. Exact inference is O(n³) (matrix inverse), the basis of Bayesian optimization and kriging; sparse/inducing-point methods scale it up.",
    "tex": "\\mu(x_*)=k_*^\\top(K+\\sigma_n^2 I)^{-1}y,\\quad \\sigma^2(x_*)=k_{**}-k_*^\\top(K+\\sigma_n^2 I)^{-1}k_*",
    "prereqs": [
      "bayes",
      "svm"
    ],
    "leadsTo": [
      "bayesian-optimization"
    ]
  },
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
  "simpsons-paradox": {
    "id": "simpsons-paradox",
    "name": "Simpson's Paradox & Confounding",
    "area": "Causal Inference",
    "summary": "A trend present in every subgroup can reverse when the groups are pooled, because a confounder correlates with both X and Y. The most vivid demonstration that correlation is not causation: the correct estimate depends on which variables you condition on, which is decided by the causal structure, not the data alone. Motivates stratification, regression controls, and randomization.",
    "prereqs": [
      "linear-regression",
      "bayes"
    ],
    "leadsTo": [
      "causal-inference"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "bayes": [
    {
      "kind": "demo",
      "slug": "bayesian-linear-regression"
    },
    {
      "kind": "demo",
      "slug": "variational-inference"
    },
    {
      "kind": "demo",
      "slug": "thompson-vs-ucb"
    },
    {
      "kind": "demo",
      "slug": "conjugate-updating"
    },
    {
      "kind": "demo",
      "slug": "gaussian-process"
    },
    {
      "kind": "demo",
      "slug": "bayes"
    },
    {
      "kind": "demo",
      "slug": "mcmc"
    },
    {
      "kind": "demo",
      "slug": "kalman-filter"
    },
    {
      "kind": "demo",
      "slug": "hmm-viterbi"
    },
    {
      "kind": "demo",
      "slug": "naive-bayes"
    },
    {
      "kind": "module",
      "slug": "foundations"
    },
    {
      "kind": "module",
      "slug": "causal-inference"
    }
  ]
};
