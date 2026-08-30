// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "model-cascade" (3), for its Connections panel.
// Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "model-cascade": [
      "model-cascade",
      "calibration",
      "moe"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
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
  "moe": {
    "id": "moe",
    "name": "Mixture of Experts (MoE)",
    "area": "Training Systems",
    "summary": "Conditional computation: a router sends each token to only the top-k of N expert sub-networks, so total parameters scale while active compute per token stays at k/N. Enables sparse trillion-parameter models (Switch Transformer, Mixtral), at the cost of routing complexity and a constant fight against load imbalance — handled with an auxiliary balancing loss and per-expert capacity limits.",
    "tex": "y = \\sum_{i \\in \\mathrm{top\\text{-}k}(g(x))} g_i(x)\\, E_i(x)",
    "prereqs": [
      "attention",
      "scaling-laws"
    ],
    "leadsTo": [
      "mixture-of-depths"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "model-cascade": [
    {
      "kind": "demo",
      "slug": "model-cascade"
    },
    {
      "kind": "module",
      "slug": "mlops"
    }
  ],
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
  "moe": [
    {
      "kind": "demo",
      "slug": "model-cascade"
    },
    {
      "kind": "demo",
      "slug": "mixture-of-depths"
    },
    {
      "kind": "demo",
      "slug": "moe"
    },
    {
      "kind": "module",
      "slug": "frontier-frameworks"
    }
  ]
};
