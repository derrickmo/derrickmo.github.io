// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/superposition/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
  "superposition": {
    "id": "superposition",
    "name": "Superposition",
    "area": "Trustworthy ML",
    "summary": "Networks represent more features than they have neurons by packing them into overlapping directions, tolerating interference because features are sparse. Driven by sparsity and feature importance; the reason neurons are polysemantic and the problem sparse autoencoders solve.",
    "tex": "x \\approx \\mathrm{ReLU}(W^{\\top} W x + b),\\quad W \\in \\mathbb{R}^{d\\times f},\\ d < f",
    "prereqs": [
      "activations"
    ],
    "leadsTo": [
      "sparse-autoencoder"
    ]
  },
  "activations": {
    "id": "activations",
    "name": "Activation Functions",
    "area": "Neural Networks",
    "summary": "The per-neuron nonlinearity that lets a stack of linear maps approximate any function.",
    "prereqs": [
      "perceptron"
    ],
    "tex": "\\mathrm{ReLU}(x) = \\max(0, x)",
    "leadsTo": [
      "sparse-autoencoder",
      "superposition",
      "batch-norm",
      "weight-init",
      "mlp"
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
  "sparse-autoencoder": {
    "id": "sparse-autoencoder",
    "name": "Sparse Autoencoders (Superposition)",
    "area": "Trustworthy ML",
    "summary": "Disentangle polysemantic neurons into monosemantic features. Networks store more concepts than dimensions (superposition); an overcomplete autoencoder with an L1-sparse code recovers an interpretable feature dictionary. The leading tool of mechanistic interpretability.",
    "tex": "\\min_{W}\\ \\lVert x - W_d\\,\\mathrm{ReLU}(W_e x)\\rVert^2 + \\lambda\\lVert \\mathrm{ReLU}(W_e x)\\rVert_1",
    "prereqs": [
      "activations",
      "regularization"
    ],
    "leadsTo": []
  }
};
window.CONCEPT_REVERSE = {
  "superposition": [
    {
      "kind": "demo",
      "slug": "superposition"
    },
    {
      "kind": "module",
      "slug": "trustworthy-ai"
    }
  ]
};
