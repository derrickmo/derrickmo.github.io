// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/shap/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
  "shap": {
    "id": "shap",
    "name": "Feature Attribution (SHAP)",
    "area": "Trustworthy ML",
    "summary": "Explain a single prediction by crediting each feature its Shapley value — its average marginal contribution over all orderings of adding features in. The unique attribution satisfying efficiency, symmetry, and dummy; the contributions sum exactly to the gap between the base value and the prediction, and split interactions fairly.",
    "tex": "\\phi_i = \\sum_{S \\subseteq F \\setminus \\{i\\}} \\frac{|S|!\\,(k-|S|-1)!}{k!}\\,\\bigl( f(S \\cup \\{i\\}) - f(S) \\bigr)",
    "prereqs": [
      "logistic-regression"
    ],
    "leadsTo": [
      "saliency"
    ]
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
  "saliency": {
    "id": "saliency",
    "name": "Saliency Maps",
    "area": "Computer Vision",
    "summary": "Explain a prediction by the gradient of the output with respect to each input pixel: bright = the model is most sensitive there. One backward pass; the image-space, gradient-based branch of explainability (vs SHAP's game-theoretic attributions). Refined by Grad-CAM, Integrated Gradients, and SmoothGrad — but raw gradients are noisy and show sensitivity, not correctness.",
    "tex": "\\mathrm{saliency}_k = \\left| \\frac{\\partial\\, z}{\\partial\\, x_k} \\right|",
    "prereqs": [
      "backprop",
      "shap"
    ],
    "leadsTo": [
      "adversarial-examples"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "shap": [
    {
      "kind": "demo",
      "slug": "shap"
    },
    {
      "kind": "demo",
      "slug": "saliency"
    },
    {
      "kind": "module",
      "slug": "trustworthy-ai"
    }
  ]
};
