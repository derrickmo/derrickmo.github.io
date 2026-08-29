// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/overfitting/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
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
  "cross-validation": {
    "id": "cross-validation",
    "name": "Cross-Validation",
    "area": "Evaluation & Calibration",
    "summary": "Estimate out-of-sample error and select hyperparameters by rotating a held-out fold through the data: split into k folds, train on k−1 and score on the held-out one, average over all k. Train error falls monotonically with capacity and can't pick a model; the CV error is U-shaped and its minimum is the bias/variance sweet spot. k=5/10 are typical (k=N is leave-one-out). Watch for leakage — use grouped/stratified/time-series splits, and nested CV when selecting AND scoring.",
    "tex": "\\mathrm{CV} = \\tfrac{1}{k}\\sum_{f=1}^{k} \\mathrm{err}\\big(\\text{model}_{-f},\\, \\text{fold}_f\\big)",
    "prereqs": [
      "bias-variance"
    ],
    "leadsTo": []
  },
  "double-descent": {
    "id": "double-descent",
    "name": "Double Descent",
    "area": "Evaluation & Calibration",
    "summary": "Test error is NOT a simple U in model capacity. As you add parameters it falls, then spikes at the interpolation threshold (#params ≈ #train points, where the model can just barely fit the data), then falls AGAIN in the over-parameterized regime. The peak is noise-driven and tied to ill-conditioning at P≈N; the second descent relies on a benign implicit bias (minimum-norm / SGD). Optimal regularization or early stopping removes the peak. Reconciles classical bias-variance with why huge networks generalize.",
    "tex": "\\text{risk}(P) \\text{ peaks at } P/N = 1, \\text{ then decreases for } P \\gg N",
    "prereqs": [
      "bias-variance",
      "regularization"
    ],
    "leadsTo": []
  },
  "label-noise": {
    "id": "label-noise",
    "name": "Label Noise & Memorization",
    "area": "Evaluation & Calibration",
    "summary": "Learning when training labels are wrong. A flexible model first fits the genuine structure (good test accuracy) but, given enough capacity and epochs, memorizes the mislabeled points — train accuracy on noisy labels rises while true test accuracy falls. Motivates early stopping, robust losses, label smoothing, sample selection, and confident-learning data cleaning.",
    "prereqs": [
      "overfitting"
    ],
    "leadsTo": []
  }
};
window.CONCEPT_REVERSE = {
  "overfitting": [
    {
      "kind": "demo",
      "slug": "overfitting"
    },
    {
      "kind": "demo",
      "slug": "label-noise"
    }
  ]
};
