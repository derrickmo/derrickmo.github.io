// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "coordinate-descent" (2), for its Connections
// panel. Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "coordinate-descent": [
      "coordinate-descent",
      "gradient-descent"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "coordinate-descent": {
    "id": "coordinate-descent",
    "name": "Coordinate Descent",
    "area": "Optimization",
    "summary": "Minimize one coordinate at a time, holding the rest fixed — cheap closed-form updates that power Lasso/glmnet, but slow to converge when features are correlated.",
    "tex": "x_i \\leftarrow \\arg\\min_{u}\\ f(x_1,\\dots,u,\\dots,x_n)",
    "prereqs": [
      "gradient-descent"
    ],
    "leadsTo": []
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
  }
};
window.CONCEPT_REVERSE = {
  "coordinate-descent": [
    {
      "kind": "demo",
      "slug": "coordinate-descent"
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
  ]
};
