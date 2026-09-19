// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "scaling-laws" (2), for its Connections panel.
// Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "scaling-laws": [
      "scaling-laws",
      "double-descent"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "scaling-laws": {
    "id": "scaling-laws",
    "name": "Neural Scaling Laws",
    "area": "Training Systems",
    "summary": "Test loss falls as a power law in parameters, data and compute, which is what lets you plan large training runs.",
    "prereqs": [
      "cross-entropy"
    ],
    "leadsTo": [
      "moe"
    ]
  },
  "double-descent": {
    "id": "double-descent",
    "name": "Double Descent",
    "area": "Evaluation & Calibration",
    "summary": "Test error is NOT a simple U in model capacity. As you add parameters it falls, then spikes at the interpolation threshold (#params ≈ #train points, where the model can just barely fit the data), then falls AGAIN in the over-parameterized regime. The peak is noise-driven and tied to ill-conditioning at P≈N; the second descent relies on a benign implicit bias (minimum-norm / SGD). Optimal regularization or early stopping removes the peak. Reconciles classical bias-variance with why huge networks generalize.",
    "tex": "\\text{risk}(P) \\text{ peaks at } P/N = 1, \\text{ then decreases for } P \\gg N",
    "prereqs": [
      "bias-variance",
      "regularization"
    ],
    "leadsTo": []
  }
};
window.CONCEPT_REVERSE = {
  "scaling-laws": [
    {
      "kind": "demo",
      "slug": "scaling-laws"
    },
    {
      "kind": "demo",
      "slug": "moe"
    },
    {
      "kind": "module",
      "slug": "training-systems"
    },
    {
      "kind": "module",
      "slug": "llm-systems"
    },
    {
      "kind": "hf",
      "slug": "best-practices"
    }
  ],
  "double-descent": [
    {
      "kind": "demo",
      "slug": "double-descent"
    },
    {
      "kind": "demo",
      "slug": "bias-variance-decomp"
    },
    {
      "kind": "demo",
      "slug": "scaling-laws"
    }
  ]
};
