// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/newtons-method/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
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
  }
};
window.CONCEPT_REVERSE = {
  "newtons-method": [
    {
      "kind": "demo",
      "slug": "newton-vs-gradient"
    },
    {
      "kind": "demo",
      "slug": "l-bfgs"
    }
  ]
};
