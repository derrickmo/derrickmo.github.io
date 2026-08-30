// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "gradient-descent" (3), for its Connections
// panel. Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "gradient-descent": [
      "gradient-descent",
      "adam",
      "lr-schedule"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
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
  ],
  "lr-schedule": [
    {
      "kind": "demo",
      "slug": "gradient-descent"
    },
    {
      "kind": "demo",
      "slug": "lr-schedule"
    },
    {
      "kind": "module",
      "slug": "training-systems"
    }
  ]
};
