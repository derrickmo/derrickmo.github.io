// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/proximal-gradient/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
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
  "regularization": {
    "id": "regularization",
    "name": "Regularization (L2 / weight decay)",
    "area": "Evaluation & Calibration",
    "summary": "Penalize large weights to fight overfitting — the same dial whether it's ridge, weight decay, or dropout.",
    "prereqs": [
      "overfitting"
    ],
    "tex": "\\mathcal{L} + \\lambda \\lVert \\theta \\rVert^2",
    "leadsTo": [
      "proximal-gradient",
      "sparse-autoencoder",
      "double-descent",
      "data-augmentation"
    ]
  },
  "overfitting": {
    "id": "overfitting",
    "name": "Overfitting & Generalization",
    "area": "Evaluation & Calibration",
    "summary": "A model that memorises its training set stops describing the world. The gap between training error and test error is the quantity every regularizer, held-out split and early-stopping rule exists to manage — and it is why a lower training loss is never on its own evidence of a better model.",
    "tex": "\\mathbb{E}[\\text{test}] = \\underbrace{\\mathbb{E}[\\text{train}]}_{\\text{fit}} + \\underbrace{(\\mathbb{E}[\\text{test}] - \\mathbb{E}[\\text{train}])}_{\\text{generalization gap}}",
    "prereqs": [
      "bias-variance"
    ],
    "leadsTo": [
      "regularization",
      "cross-validation",
      "double-descent",
      "label-noise"
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
  }
};
window.CONCEPT_REVERSE = {
  "proximal-gradient": [
    {
      "kind": "demo",
      "slug": "ista"
    }
  ]
};
