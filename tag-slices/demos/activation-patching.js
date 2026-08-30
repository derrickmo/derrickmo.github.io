// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "activation-patching" (3), for its Connections panel.
// Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "activation-patching": [
      "activation-patching",
      "probing-classifier",
      "causal-inference"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
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
  "causal-inference": {
    "id": "causal-inference",
    "name": "Causal Inference (do-operator)",
    "area": "Causal Inference",
    "summary": "P(Y|X) — what you observe — is not P(Y|do(X)) — what happens if you intervene. The do-operator models intervention as cutting the incoming arrows to the variable you set, removing confounding bias. When you can't experiment, the back-door criterion says which variables to condition on to recover the causal effect from observational data; condition on the wrong one (collider/mediator) and you add bias.",
    "tex": "P(Y \\mid do(X)) = \\sum_{z} P(Y \\mid X, z)\\, P(z)",
    "prereqs": [
      "simpsons-paradox"
    ],
    "leadsTo": [
      "instrumental-variables"
    ]
  }
};
window.CONCEPT_REVERSE = {
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
  "causal-inference": [
    {
      "kind": "demo",
      "slug": "activation-patching"
    },
    {
      "kind": "demo",
      "slug": "do-intervention"
    },
    {
      "kind": "demo",
      "slug": "instrumental-variables"
    },
    {
      "kind": "module",
      "slug": "causal-inference"
    }
  ]
};
