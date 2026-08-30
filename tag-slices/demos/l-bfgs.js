// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "l-bfgs" (3), for its Connections panel.
// Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "l-bfgs": [
      "quasi-newton",
      "newtons-method",
      "gradient-descent"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "quasi-newton": {
    "id": "quasi-newton",
    "name": "Quasi-Newton Methods (BFGS / L-BFGS)",
    "area": "Optimization",
    "summary": "Approximate the inverse Hessian from successive gradient differences instead of computing it. L-BFGS keeps only the last m pairs (O(mn) memory) and rebuilds the search direction with the two-loop recursion — the default optimizer for smooth, deterministic, mid-scale problems.",
    "tex": "d_k = -H_k\\,\\nabla f(x_k),\\quad H_k \\approx (\\nabla^2 f)^{-1}\\ \\text{from } \\{s_i,y_i\\}",
    "prereqs": [
      "newtons-method",
      "gradient-descent"
    ],
    "leadsTo": []
  },
  "newtons-method": {
    "id": "newtons-method",
    "name": "Newton's Method (Second-Order Optimization)",
    "area": "Optimization",
    "summary": "Use curvature (the Hessian) to jump to the minimum of the local quadratic model — one step on a true quadratic, but attracted to any stationary point, including saddles. The conceptual root of L-BFGS and natural-gradient methods.",
    "tex": "\\theta_{t+1} = \\theta_t - H^{-1}\\nabla f(\\theta_t)",
    "prereqs": [
      "gradient-descent"
    ],
    "leadsTo": [
      "quasi-newton"
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
  }
};
window.CONCEPT_REVERSE = {
  "quasi-newton": [
    {
      "kind": "demo",
      "slug": "l-bfgs"
    }
  ],
  "newtons-method": [
    {
      "kind": "demo",
      "slug": "newton-vs-gradient"
    },
    {
      "kind": "demo",
      "slug": "l-bfgs"
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
