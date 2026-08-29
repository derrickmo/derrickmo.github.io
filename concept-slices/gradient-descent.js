// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/gradient-descent/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
  "gradient-descent": {
    "id": "gradient-descent",
    "name": "Gradient Descent",
    "area": "Optimization",
    "summary": "Follow the negative loss gradient downhill — the engine of essentially all neural-network training.",
    "tex": "\\theta_{t+1} = \\theta_t - \\eta\\, \\nabla_\\theta \\mathcal{L}(\\theta_t)",
    "prereqs": [
      "chain-rule"
    ],
    "leadsTo": [
      "backprop",
      "lr-schedule",
      "adam",
      "newtons-method",
      "coordinate-descent",
      "proximal-gradient",
      "quasi-newton",
      "variational-inference",
      "adversarial-examples",
      "optimizers",
      "gradient-clipping",
      "policy-gradient"
    ],
    "animation": "viz/gradient.html"
  },
  "chain-rule": {
    "id": "chain-rule",
    "name": "Chain Rule",
    "area": "Optimization",
    "summary": "Compose derivatives through a graph — the calculus identity that makes backprop possible.",
    "tex": "\\frac{\\partial L}{\\partial x} = \\frac{\\partial L}{\\partial y}\\, \\frac{\\partial y}{\\partial x}",
    "leadsTo": [
      "gradient-descent",
      "backprop"
    ],
    "prereqs": []
  },
  "backprop": {
    "id": "backprop",
    "name": "Backpropagation",
    "area": "Neural Networks",
    "summary": "Apply the chain rule through a computational graph to get gradients for every parameter at once.",
    "prereqs": [
      "chain-rule",
      "gradient-descent"
    ],
    "leadsTo": [
      "activations",
      "mlp",
      "dqn",
      "pruning",
      "saliency",
      "mixed-precision"
    ]
  },
  "lr-schedule": {
    "id": "lr-schedule",
    "name": "Learning-Rate Schedule",
    "area": "Optimization",
    "summary": "Vary the step size over training — warmup then decay — to balance stability and convergence.",
    "prereqs": [
      "gradient-descent"
    ],
    "leadsTo": []
  },
  "adam": {
    "id": "adam",
    "name": "Adam Optimizer",
    "area": "Optimization",
    "summary": "Per-parameter adaptive step sizes via running estimates of the gradient and its square.",
    "prereqs": [
      "gradient-descent"
    ],
    "leadsTo": []
  },
  "newtons-method": {
    "id": "newtons-method",
    "name": "Newton's Method (Second-Order Optimization)",
    "area": "Optimization",
    "summary": "Use curvature (the Hessian) to jump to the minimum of the local quadratic model — one step on a true quadratic, but attracted to any stationary point, including saddles. The conceptual root of L-BFGS and natural-gradient methods.",
    "tex": "\\theta_{t+1} = \\theta_t - H^{-1}\\nabla f(\\theta_t)",
    "prereqs": [
      "gradient-descent"
    ],
    "leadsTo": [
      "quasi-newton"
    ]
  },
  "coordinate-descent": {
    "id": "coordinate-descent",
    "name": "Coordinate Descent",
    "area": "Optimization",
    "summary": "Minimize one coordinate at a time, holding the rest fixed — cheap closed-form updates that power Lasso/glmnet, but slow to converge when features are correlated.",
    "tex": "x_i \\leftarrow \\arg\\min_{u}\\ f(x_1,\\dots,u,\\dots,x_n)",
    "prereqs": [
      "gradient-descent"
    ],
    "leadsTo": []
  },
  "proximal-gradient": {
    "id": "proximal-gradient",
    "name": "Proximal Gradient & Soft-Thresholding (ISTA/FISTA)",
    "area": "Optimization",
    "summary": "Optimize smooth-plus-nonsmooth objectives by a gradient step followed by a proximal operator. For L1 the prox is soft-thresholding, which yields exact sparsity — the basis of Lasso and compressed sensing. FISTA adds momentum for O(1/k²).",
    "tex": "x_{t+1} = \\mathrm{prox}_{t\\lambda}\\!\\big(x_t - t\\,\\nabla g(x_t)\\big)",
    "prereqs": [
      "gradient-descent",
      "regularization"
    ],
    "leadsTo": []
  },
  "quasi-newton": {
    "id": "quasi-newton",
    "name": "Quasi-Newton Methods (BFGS / L-BFGS)",
    "area": "Optimization",
    "summary": "Approximate the inverse Hessian from successive gradient differences instead of computing it. L-BFGS keeps only the last m pairs (O(mn) memory) and rebuilds the search direction with the two-loop recursion — the default optimizer for smooth, deterministic, mid-scale problems.",
    "tex": "d_k = -H_k\\,\\nabla f(x_k),\\quad H_k \\approx (\\nabla^2 f)^{-1}\\ \\text{from } \\{s_i,y_i\\}",
    "prereqs": [
      "newtons-method",
      "gradient-descent"
    ],
    "leadsTo": []
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
  "adversarial-examples": {
    "id": "adversarial-examples",
    "name": "Adversarial Examples & Robustness",
    "area": "Trustworthy ML",
    "summary": "Worst-case input perturbations, found by climbing the gradient of the loss w.r.t. the INPUT, that flip a confident prediction while staying imperceptibly small. FGSM (one step) and PGD (iterated) are the standard attacks; adversarial training is the strongest general defense, at a cost to clean accuracy.",
    "tex": "x_{adv} = x + \\epsilon\\,\\mathrm{sign}\\big(\\nabla_x \\mathcal{L}(x,y)\\big)",
    "prereqs": [
      "gradient-descent",
      "saliency"
    ],
    "leadsTo": [
      "certified-robustness"
    ]
  },
  "optimizers": {
    "id": "optimizers",
    "name": "Adaptive Optimizers (Momentum / RMSProp / Adam)",
    "area": "Optimization",
    "summary": "Practical generalizations of SGD: momentum builds velocity, adaptive methods rescale per-parameter step sizes — Adam combines both and dominates in practice.",
    "tex": "m_t = \\beta_1 m_{t-1} + (1{-}\\beta_1)\\,g_t,\\quad v_t = \\beta_2 v_{t-1} + (1{-}\\beta_2)\\,g_t^{\\,2}",
    "prereqs": [
      "gradient-descent"
    ],
    "leadsTo": [
      "lr-schedule"
    ]
  },
  "gradient-clipping": {
    "id": "gradient-clipping",
    "name": "Gradient Clipping",
    "area": "Training Systems",
    "summary": "Bounds the update when a sharp region of the loss (a 'cliff', common in RNNs and deep transformers) produces an exploding gradient. Clip-by-norm rescales the whole gradient to a maximum length τ, preserving direction; clip-by-value caps each coordinate. A standard stability rail (often global-norm 1.0) paired with warmup. Biases the step when active, so it's tuned as a safety mechanism, not a primary regularizer.",
    "tex": "g \\leftarrow g\\cdot\\min\\!\\Bigl(1,\\ \\tfrac{\\tau}{\\lVert g\\rVert}\\Bigr)",
    "prereqs": [
      "gradient-descent",
      "rnn"
    ],
    "leadsTo": []
  },
  "policy-gradient": {
    "id": "policy-gradient",
    "name": "Policy Gradient (REINFORCE)",
    "area": "Reinforcement Learning",
    "summary": "Push up the log-probability of high-reward actions, push down low-reward ones — the foundation of every modern policy-based RL method, including PPO, GRPO, and RLHF.",
    "tex": "\\nabla_\\theta J = \\mathbb{E}_{\\pi_\\theta}\\bigl[ \\nabla_\\theta \\log \\pi_\\theta(a \\mid s) \\cdot (R - b) \\bigr]",
    "prereqs": [
      "mdp-bellman",
      "gradient-descent"
    ],
    "leadsTo": [
      "actor-critic",
      "reward-model",
      "dpo",
      "ppo",
      "max-entropy-rl"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "gradient-descent": [
    {
      "kind": "demo",
      "slug": "gradient-descent"
    },
    {
      "kind": "demo",
      "slug": "newton-vs-gradient"
    },
    {
      "kind": "demo",
      "slug": "coordinate-descent"
    },
    {
      "kind": "demo",
      "slug": "l-bfgs"
    },
    {
      "kind": "demo",
      "slug": "adversarial-examples"
    },
    {
      "kind": "demo",
      "slug": "optimizers"
    },
    {
      "kind": "demo",
      "slug": "lr-schedule"
    },
    {
      "kind": "demo",
      "slug": "gradient-clipping"
    },
    {
      "kind": "demo",
      "slug": "regression"
    },
    {
      "kind": "demo",
      "slug": "policy-gradient"
    },
    {
      "kind": "module",
      "slug": "foundations"
    }
  ]
};
