// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/optimizers/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

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
  "lr-schedule": {
    "id": "lr-schedule",
    "name": "Learning-Rate Schedule",
    "area": "Optimization",
    "summary": "Vary the step size over training — warmup then decay — to balance stability and convergence.",
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
  ]
};
