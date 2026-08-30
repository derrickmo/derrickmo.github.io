// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to modules "trustworthy-ai" (13), for its Connections panel.
// Same global names as concepts-index.js, with 175 fewer concepts in them.

window.CONCEPT_TAGS = {
  "modules": {
    "trustworthy-ai": [
      "calibration",
      "conformal",
      "conformal-regression",
      "fairness",
      "shap",
      "saliency",
      "adversarial-examples",
      "certified-robustness",
      "superposition",
      "sparse-autoencoder",
      "probing-classifier",
      "activation-patching",
      "drift-detection"
    ]
  }
};
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
  },
  "probing-classifier": {
    "id": "probing-classifier",
    "name": "Linear Probing",
    "area": "Trustworthy ML",
    "summary": "Test what a layer represents by fitting the simplest possible readout — a linear classifier — to its frozen activations. Accuracy rises with depth as the network reformats data into a linearly separable geometry. Shows decodability, not causal use.",
    "tex": "\\hat y = \\mathrm{softmax}(W\\,h^{(\\ell)} + b),\\ \\ h^{(\\ell)}\\ \\text{frozen}",
    "prereqs": [
      "mlp",
      "logistic-regression"
    ],
    "leadsTo": [
      "activation-patching"
    ]
  },
  "activation-patching": {
    "id": "activation-patching",
    "name": "Activation Patching (Causal Tracing)",
    "area": "Trustworthy ML",
    "summary": "Localize what a network uses by intervention: copy an activation from a clean run into a corrupted run and measure how much the output is restored. Unlike probing or saliency it makes a causal claim — the basis of circuit-level mechanistic interpretability (ROME, IOI, induction heads).",
    "tex": "\\Delta_c = \\frac{m(\\text{patch}_c) - m(\\text{corrupt})}{m(\\text{clean}) - m(\\text{corrupt})}",
    "prereqs": [
      "mlp",
      "probing-classifier"
    ],
    "leadsTo": []
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
  ],
  "conformal": [
    {
      "kind": "demo",
      "slug": "certified-robustness"
    },
    {
      "kind": "demo",
      "slug": "conformal"
    },
    {
      "kind": "demo",
      "slug": "conformal-regression"
    },
    {
      "kind": "module",
      "slug": "trustworthy-ai"
    }
  ],
  "conformal-regression": [
    {
      "kind": "demo",
      "slug": "conformal-regression"
    },
    {
      "kind": "module",
      "slug": "trustworthy-ai"
    }
  ],
  "fairness": [
    {
      "kind": "demo",
      "slug": "fairness"
    },
    {
      "kind": "module",
      "slug": "trustworthy-ai"
    }
  ],
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
      "kind": "demo",
      "slug": "grad-cam"
    },
    {
      "kind": "module",
      "slug": "trustworthy-ai"
    }
  ],
  "saliency": [
    {
      "kind": "demo",
      "slug": "adversarial-examples"
    },
    {
      "kind": "demo",
      "slug": "saliency"
    },
    {
      "kind": "demo",
      "slug": "grad-cam"
    },
    {
      "kind": "module",
      "slug": "trustworthy-ai"
    }
  ],
  "adversarial-examples": [
    {
      "kind": "demo",
      "slug": "adversarial-examples"
    },
    {
      "kind": "demo",
      "slug": "certified-robustness"
    },
    {
      "kind": "module",
      "slug": "trustworthy-ai"
    }
  ],
  "certified-robustness": [
    {
      "kind": "demo",
      "slug": "certified-robustness"
    },
    {
      "kind": "module",
      "slug": "trustworthy-ai"
    }
  ],
  "superposition": [
    {
      "kind": "demo",
      "slug": "superposition"
    },
    {
      "kind": "module",
      "slug": "trustworthy-ai"
    }
  ],
  "sparse-autoencoder": [
    {
      "kind": "demo",
      "slug": "sparse-autoencoder"
    },
    {
      "kind": "demo",
      "slug": "superposition"
    },
    {
      "kind": "module",
      "slug": "trustworthy-ai"
    }
  ],
  "probing-classifier": [
    {
      "kind": "demo",
      "slug": "probing-classifier"
    },
    {
      "kind": "demo",
      "slug": "activation-patching"
    },
    {
      "kind": "module",
      "slug": "trustworthy-ai"
    }
  ],
  "activation-patching": [
    {
      "kind": "demo",
      "slug": "activation-patching"
    },
    {
      "kind": "module",
      "slug": "trustworthy-ai"
    }
  ],
  "drift-detection": [
    {
      "kind": "demo",
      "slug": "canary-rollout"
    },
    {
      "kind": "demo",
      "slug": "drift-detection"
    },
    {
      "kind": "module",
      "slug": "mlops"
    },
    {
      "kind": "module",
      "slug": "trustworthy-ai"
    }
  ]
};
