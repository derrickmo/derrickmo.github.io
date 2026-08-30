// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/linear-regression/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
  "linear-regression": {
    "id": "linear-regression",
    "name": "Linear Regression",
    "area": "Classical ML",
    "summary": "Fit a line by minimizing squared error — convex, with a closed-form OLS solution. The simplest supervised model and the algebraic backbone of half of statistics.",
    "tex": "\\hat{w} = (X^\\top X)^{-1} X^\\top y",
    "leadsTo": [
      "logistic-regression",
      "pca",
      "bayesian-linear-regression",
      "bias-variance",
      "svm",
      "perceptron",
      "forecasting",
      "conformal-regression",
      "simpsons-paradox",
      "instrumental-variables"
    ],
    "prereqs": []
  },
  "logistic-regression": {
    "id": "logistic-regression",
    "name": "Logistic Regression",
    "area": "Classical ML",
    "summary": "Sigmoid over a linear score, trained with binary cross-entropy. The last layer of every neural classifier — and the multi-class generalization is softmax.",
    "tex": "P(y{=}1 \\mid x) = \\sigma(w^\\top x + b)",
    "prereqs": [
      "linear-regression",
      "cross-entropy"
    ],
    "leadsTo": [
      "mlp",
      "probing-classifier",
      "roc",
      "reward-model",
      "calibration",
      "shap",
      "active-learning"
    ]
  },
  "pca": {
    "id": "pca",
    "name": "PCA / SVD",
    "area": "Classical ML",
    "summary": "Project data onto the eigenvectors of its covariance — the basic linear dimensionality reduction.",
    "leadsTo": [
      "embeddings",
      "lora",
      "tsne",
      "ica",
      "manifold-learning",
      "harris-corners",
      "spectral-clustering"
    ],
    "prereqs": []
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
  "bias-variance": {
    "id": "bias-variance",
    "name": "Bias-Variance Tradeoff",
    "area": "Evaluation & Calibration",
    "summary": "Generalization error decomposes into rigid-model bias plus over-fitting variance — the central tension of ML.",
    "prereqs": [
      "linear-regression"
    ],
    "leadsTo": [
      "regularization",
      "double-descent",
      "cross-validation",
      "overfitting",
      "ensembles"
    ]
  },
  "svm": {
    "id": "svm",
    "name": "SVM (Max-Margin + Kernels)",
    "area": "Classical ML",
    "summary": "Find the widest-margin separating boundary; bend it nonlinearly with the kernel trick.",
    "prereqs": [
      "linear-regression"
    ],
    "tex": "\\min_w \\tfrac{1}{2}\\lVert w \\rVert^2 + C \\sum_i \\xi_i",
    "leadsTo": [
      "attention",
      "gaussian-process"
    ]
  },
  "perceptron": {
    "id": "perceptron",
    "name": "The Perceptron",
    "area": "Neural Networks",
    "summary": "A single linear threshold unit, ŷ=sign(w·x+b), trained online by the first mistake-driven learning rule: do nothing when right, nudge w←w+η·y·x when wrong. The Perceptron Convergence Theorem guarantees a separating hyperplane in finite updates IF the data is linearly separable; on non-separable data it never halts (Minsky & Papert's XOR critique). The historical seed of neural nets — smooth the step activation and train by gradient descent to get the MLP; add a max margin to get the SVM.",
    "tex": "\\text{if } y(w\\cdot x + b) \\le 0:\\; w \\leftarrow w + \\eta\\, y\\, x",
    "prereqs": [
      "linear-regression"
    ],
    "leadsTo": [
      "mlp",
      "svm",
      "activations"
    ]
  },
  "forecasting": {
    "id": "forecasting",
    "name": "Exponential Smoothing & ARIMA",
    "area": "Time Series",
    "summary": "Track a series' level, trend, and seasonality with classical smoothers — strong baselines for any deep forecaster.",
    "prereqs": [
      "linear-regression"
    ],
    "leadsTo": []
  },
  "conformal-regression": {
    "id": "conformal-regression",
    "name": "Conformal Regression",
    "area": "Evaluation & Calibration",
    "summary": "Split conformal applied to regression: calibrate a residual score on held-out data, take its (1−α) quantile q̂, and emit the interval f̂(x) ± q̂. Coverage P(y ∈ [lo,hi]) ≥ 1−α holds for any regressor — underfitting just widens the band. Normalizing the score by a local spread estimate σ̂(x) gives locally-adaptive widths (the idea behind Conformalized Quantile Regression, CQR).",
    "tex": "C(x) = \\hat f(x) \\pm \\hat q\\,\\hat\\sigma(x), \\quad \\hat q = \\mathrm{Quantile}\\bigl(\\{|y_i-\\hat f(x_i)|/\\hat\\sigma(x_i)\\}, \\tfrac{\\lceil (n+1)(1-\\alpha)\\rceil}{n}\\bigr)",
    "prereqs": [
      "conformal",
      "linear-regression"
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
  },
  "instrumental-variables": {
    "id": "instrumental-variables",
    "name": "Instrumental Variables",
    "area": "Causal Inference",
    "summary": "When a confounder is unobserved so back-door adjustment fails, an instrument Z recovers the causal effect of X on Y. Z must satisfy relevance (it moves X) and exclusion (it affects Y only through X). Two-stage least squares regresses X on Z, then Y on the fitted X̂; equivalently β̂ = Cov(Z,Y)/Cov(Z,X). Weak instruments (low first-stage F) inflate variance; exclusion violations reintroduce bias. Under heterogeneity it estimates a local effect (LATE).",
    "tex": "\\hat\\beta_{IV} = \\frac{\\mathrm{Cov}(Z,Y)}{\\mathrm{Cov}(Z,X)}",
    "prereqs": [
      "causal-inference",
      "linear-regression"
    ],
    "leadsTo": []
  }
};
window.CONCEPT_REVERSE = {
  "linear-regression": [
    {
      "kind": "demo",
      "slug": "ista"
    },
    {
      "kind": "demo",
      "slug": "bayesian-linear-regression"
    },
    {
      "kind": "demo",
      "slug": "perceptron"
    },
    {
      "kind": "demo",
      "slug": "regression"
    },
    {
      "kind": "demo",
      "slug": "conformal-regression"
    },
    {
      "kind": "demo",
      "slug": "simpsons-paradox"
    },
    {
      "kind": "demo",
      "slug": "instrumental-variables"
    },
    {
      "kind": "demo",
      "slug": "ransac"
    }
  ]
};
