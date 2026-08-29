// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/calibration/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
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
  "active-learning": {
    "id": "active-learning",
    "name": "Active Learning",
    "area": "Data-Centric",
    "summary": "Cut labeling cost by letting the model choose what to label next. Uncertainty sampling queries the unlabeled point nearest the decision boundary (most uncertain); refitting on those informative points reaches high accuracy with far fewer labels than random. The core loop of data-centric ML and human-in-the-loop annotation.",
    "prereqs": [
      "logistic-regression",
      "calibration"
    ],
    "leadsTo": [
      "coreset"
    ]
  },
  "fairness": {
    "id": "fairness",
    "name": "Fairness & Group Metrics",
    "area": "Trustworthy ML",
    "summary": "Equitable treatment formalized into competing statistical criteria — demographic parity (equal selection rate), equal opportunity (equal TPR), equalized odds (equal TPR+FPR) — which are provably incompatible when groups differ in base rate or score distribution. Bias often sits upstream in the data, so picking a metric is a value judgment, not a checkbox.",
    "prereqs": [
      "roc",
      "calibration"
    ],
    "leadsTo": []
  },
  "distillation": {
    "id": "distillation",
    "name": "Knowledge Distillation",
    "area": "Fine-Tuning",
    "summary": "Train a small student to reproduce a large teacher's softened output distribution, not just its hard labels. The teacher's 'dark knowledge' — the relative probabilities of runner-up classes, exposed by a temperature on the softmax — is a richer training signal that lets the student generalize beyond its size. Powers DistilBERT, on-device LLMs, and training on a big model's generated data.",
    "tex": "L = (1-\\alpha)\\,\\mathrm{CE}(p, y) + \\alpha\\,T^2\\,\\mathrm{KL}\\!\\left( p^{(T)}_{\\text{teacher}} \\,\\|\\, p^{(T)}_{\\text{student}} \\right)",
    "prereqs": [
      "calibration",
      "quantization"
    ],
    "leadsTo": [
      "dataset-distillation"
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
  },
  "mc-dropout": {
    "id": "mc-dropout",
    "name": "MC Dropout (Bayesian uncertainty)",
    "area": "Evaluation & Calibration",
    "summary": "Estimate predictive uncertainty by keeping dropout on at inference and averaging many stochastic forward passes — each mask is a thinned sub-network, and their spread approximates Bayesian posterior uncertainty (Gal & Ghahramani, 2016). Uncertainty grows where data is sparse; the cheap cousin of Bayesian nets and deep ensembles. Powers selective prediction, active learning, and OOD detection.",
    "prereqs": [
      "calibration"
    ],
    "leadsTo": []
  },
  "model-cascade": {
    "id": "model-cascade",
    "name": "Model Cascade & Early-Exit",
    "area": "Training Systems",
    "summary": "Spend big compute only where it changes the answer: a cheap fast model handles every input and the uncertain ones (low confidence) are escalated to an expensive accurate model. Because most inputs are easy, you approach the expensive model's accuracy while paying its cost on only a slice of traffic — a steep cost/accuracy curve early on. The router is confidence, so it only works if that confidence is trustworthy (ties to calibration and conformal uncertainty); a confidently-wrong cheap model defers the wrong inputs. The pattern recurs as early-exit/anytime networks (stop at a shallow layer when confident), the Viola-Jones detector cascade, retrieval-then-LLM fallback, and is the model-level cousin of mixture-of-experts routing and speculative decoding.",
    "prereqs": [
      "calibration",
      "model-serving"
    ],
    "leadsTo": []
  }
};
window.CONCEPT_REVERSE = {
  "calibration": [
    {
      "kind": "demo",
      "slug": "model-cascade"
    },
    {
      "kind": "demo",
      "slug": "calibration"
    },
    {
      "kind": "demo",
      "slug": "conformal"
    },
    {
      "kind": "demo",
      "slug": "fairness"
    },
    {
      "kind": "demo",
      "slug": "distillation"
    },
    {
      "kind": "demo",
      "slug": "mc-dropout"
    },
    {
      "kind": "module",
      "slug": "trustworthy-ai"
    }
  ]
};
