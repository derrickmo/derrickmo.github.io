// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/certified-robustness/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
  "certified-robustness": {
    "id": "certified-robustness",
    "name": "Certified Robustness (Randomized Smoothing)",
    "area": "Trustworthy ML",
    "summary": "A provable defense: classify by majority vote of the base net under Gaussian noise. If the top class wins fraction pA>1/2 of votes, the smoothed prediction is constant within a certified L2 radius R = sigma*Phi^-1(pA). The rigorous counterpart to empirical adversarial training; sigma trades radius vs clean accuracy.",
    "tex": "R = \\sigma\\,\\Phi^{-1}(p_A),\\quad p_A > \\tfrac12",
    "prereqs": [
      "adversarial-examples",
      "conformal"
    ],
    "leadsTo": []
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
  "conformal": {
    "id": "conformal",
    "name": "Conformal Prediction",
    "area": "Evaluation & Calibration",
    "summary": "Wrap any model to output a prediction SET with a finite-sample, distribution-free coverage guarantee: P(y ∈ set) ≥ 1−α. Calibrate a nonconformity-score quantile q̂ on held-out data; the guarantee holds regardless of model quality (a worse model just yields larger sets). Assumes exchangeability; coverage is marginal, not conditional.",
    "tex": "\\hat q = \\mathrm{Quantile}\\bigl( \\{s_i\\}, \\tfrac{\\lceil (n+1)(1-\\alpha) \\rceil}{n} \\bigr)",
    "prereqs": [
      "calibration",
      "roc"
    ],
    "leadsTo": [
      "certified-robustness",
      "conformal-regression"
    ]
  },
  "calibration": {
    "id": "calibration",
    "name": "Model Calibration",
    "area": "Evaluation & Calibration",
    "summary": "Whether a model's confidence scores are honest: a calibrated classifier that says 90% is right 90% of the time. Measured by the reliability diagram and Expected Calibration Error (ECE); modern nets are overconfident, and temperature scaling (divide logits by T) is the standard one-parameter post-hoc fix that leaves predictions unchanged.",
    "tex": "\\mathrm{ECE} = \\sum_{b} \\frac{n_b}{N} \\,\\bigl| \\mathrm{acc}(b) - \\mathrm{conf}(b) \\bigr|",
    "prereqs": [
      "logistic-regression",
      "roc"
    ],
    "leadsTo": [
      "conformal",
      "active-learning",
      "fairness",
      "distillation",
      "drift-detection",
      "mc-dropout",
      "model-cascade"
    ]
  },
  "roc": {
    "id": "roc",
    "name": "ROC / PR Curves",
    "area": "Classical ML",
    "summary": "Slide a threshold across a score model to read off recall, precision, and the threshold-free AUC.",
    "prereqs": [
      "logistic-regression"
    ],
    "leadsTo": [
      "classification-metrics",
      "calibration",
      "conformal",
      "fairness"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "certified-robustness": [
    {
      "kind": "demo",
      "slug": "certified-robustness"
    },
    {
      "kind": "module",
      "slug": "trustworthy-ai"
    }
  ]
};
