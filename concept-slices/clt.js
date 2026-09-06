// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/clt/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
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
  "ica": {
    "id": "ica",
    "name": "Independent Component Analysis",
    "area": "Classical ML",
    "summary": "Blind source separation: recover independent source signals from linear mixtures using only the mixtures. Where PCA decorrelates (second-order, orthogonal directions), ICA seeks statistical independence (all orders), found by maximizing non-Gaussianity — justified by the CLT, since mixtures look more Gaussian than their parts. FastICA whitens with PCA then runs a fixed-point iteration with a contrast like tanh. Recovers sources up to scale, sign, and permutation; at most one source may be Gaussian. Used for the cocktail-party problem and EEG/MEG/fMRI artifact removal.",
    "tex": "s = W x,\\quad W = \\arg\\max\\ \\text{nonGaussianity}(Wx)",
    "prereqs": [
      "pca",
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
  "reservoir-sampling": {
    "id": "reservoir-sampling",
    "name": "Reservoir Sampling",
    "area": "Algorithms",
    "summary": "Draw a uniform random sample of fixed size k from a stream of unknown/unbounded length in a single pass with O(k) memory. Vitter's Algorithm R: keep the first k, then accept item i (i>k) with probability k/i, evicting a uniformly random slot — so when the stream ends every item has probability k/n of being kept, independent of arrival order. The standard tool for sampling logs, events, and rows too big to store; Algorithm L skips faster, and A-Res/A-ExpJ handle weighted sampling. Unweighted, without replacement, fixed size.",
    "tex": "\\Pr[\\text{keep item } i] = \\frac{k}{i}\\ (i>k); \\quad \\Pr[\\text{in final sample}]=\\frac{k}{n}",
    "prereqs": [
      "clt"
    ],
    "leadsTo": [
      "count-min-sketch"
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
  "kernel-density": {
    "id": "kernel-density",
    "name": "Kernel Density Estimation",
    "area": "Classical ML",
    "summary": "Nonparametric density estimation: place a kernel K (Gaussian, Epanechnikov, box) on every sample and average them, f̂(x)=1/(Nh)·ΣK((x−x_i)/h). The bandwidth h is a pure bias/variance knob — too small overfits into spikes, too large oversmooths and merges modes. The smooth upgrade to a histogram; underlies kernel regression (Nadaraya-Watson), mean-shift clustering, anomaly detection, and violin plots. Suffers the curse of dimensionality and leaks mass past hard boundaries; bandwidth choice (CV / Silverman's rule) is the whole game.",
    "tex": "\\hat f(x) = \\frac{1}{Nh}\\sum_{i=1}^{N} K\\!\\left(\\frac{x - x_i}{h}\\right)",
    "prereqs": [
      "clt",
      "knn"
    ],
    "leadsTo": []
  },
  "self-consistency": {
    "id": "self-consistency",
    "name": "Self-Consistency",
    "area": "NLP",
    "summary": "Sample several chains of thought at nonzero temperature and majority-vote the final answer. When errors are independent, voting concentrates on the single correct answer (a Condorcet effect) and lifts accuracy for the cost of N samples; correlated errors form a false consensus it can't fix.",
    "tex": "\\hat{y} = \\arg\\max_{y} \\sum_{i=1}^{N} \\mathbb{1}\\!\\left[ y_i = y \\right]",
    "prereqs": [
      "decoding",
      "clt"
    ],
    "leadsTo": [
      "reflection"
    ]
  },
  "drift-detection": {
    "id": "drift-detection",
    "name": "Data Drift Detection",
    "area": "Training Systems",
    "summary": "Monitor a deployed model for distribution shift, since accuracy silently decays as the world moves away from training data. Compare a live window to a reference with the Population Stability Index (PSI=Σ(cur−ref)·ln(cur/ref)), KL divergence, or two-sample tests, and alarm past a threshold. Covers covariate shift P(X), label shift P(Y), and concept drift P(Y|X).",
    "tex": "\\mathrm{PSI} = \\sum_b (c_b - r_b)\\,\\ln\\!\\frac{c_b}{r_b}",
    "prereqs": [
      "clt",
      "calibration"
    ],
    "leadsTo": []
  }
};
window.CONCEPT_REVERSE = {
  "clt": [
    {
      "kind": "demo",
      "slug": "ica"
    },
    {
      "kind": "demo",
      "slug": "clt"
    },
    {
      "kind": "demo",
      "slug": "mcmc"
    },
    {
      "kind": "demo",
      "slug": "importance-sampling"
    },
    {
      "kind": "demo",
      "slug": "reservoir-sampling"
    },
    {
      "kind": "demo",
      "slug": "kalman-filter"
    },
    {
      "kind": "demo",
      "slug": "kernel-density"
    },
    {
      "kind": "demo",
      "slug": "drift-detection"
    },
    {
      "kind": "demo",
      "slug": "bootstrap"
    },
    {
      "kind": "demo",
      "slug": "hypothesis-test"
    },
    {
      "kind": "module",
      "slug": "foundations"
    }
  ]
};
