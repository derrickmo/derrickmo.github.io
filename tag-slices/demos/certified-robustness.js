// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "certified-robustness" (3), for its Connections panel.
// Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "certified-robustness": [
      "certified-robustness",
      "adversarial-examples",
      "conformal"
    ]
  },
  "games": {}
};
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
      "kind": "demo",
      "slug": "bootstrap"
    },
    {
      "kind": "module",
      "slug": "trustworthy-ai"
    }
  ]
};
