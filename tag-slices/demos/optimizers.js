// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "optimizers" (3), for its Connections panel.
// Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "optimizers": [
      "optimizers",
      "gradient-descent",
      "adam"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "optimizers": {
    "id": "optimizers",
    "name": "Adaptive Optimizers (Momentum / RMSProp / Adam)",
    "area": "Optimization",
    "summary": "Practical generalizations of SGD: momentum builds velocity, adaptive methods rescale per-parameter step sizes — Adam combines both and dominates in practice.",
    "tex": "m_t = \\beta_1 m_{t-1} + (1{-}\\beta_1)\\,g_t,\\quad v_t = \\beta_2 v_{t-1} + (1{-}\\beta_2)\\,g_t^{\\,2}",
    "prereqs": [
      "gradient-descent"
    ],
    "leadsTo": [
      "lr-schedule"
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
  "adam": {
    "id": "adam",
    "name": "Adam Optimizer",
    "area": "Optimization",
    "summary": "Per-parameter adaptive step sizes via running estimates of the gradient and its square.",
    "prereqs": [
      "gradient-descent"
    ],
    "leadsTo": []
  }
};
window.CONCEPT_REVERSE = {
  "optimizers": [
    {
      "kind": "demo",
      "slug": "optimizers"
    },
    {
      "kind": "module",
      "slug": "neural-nets"
    }
  ],
  "gradient-descent": [
    {
      "kind": "demo",
      "slug": "gradient-descent"
    },
    {
      "kind": "demo",
      "slug": "newton-vs-gradient"
    },
    {
      "kind": "demo",
      "slug": "coordinate-descent"
    },
    {
      "kind": "demo",
      "slug": "l-bfgs"
    },
    {
      "kind": "demo",
      "slug": "adversarial-examples"
    },
    {
      "kind": "demo",
      "slug": "optimizers"
    },
    {
      "kind": "demo",
      "slug": "lr-schedule"
    },
    {
      "kind": "demo",
      "slug": "gradient-clipping"
    },
    {
      "kind": "demo",
      "slug": "regression"
    },
    {
      "kind": "demo",
      "slug": "policy-gradient"
    },
    {
      "kind": "module",
      "slug": "foundations"
    }
  ],
  "adam": [
    {
      "kind": "demo",
      "slug": "gradient-descent"
    },
    {
      "kind": "demo",
      "slug": "optimizers"
    },
    {
      "kind": "module",
      "slug": "training-systems"
    }
  ]
};
