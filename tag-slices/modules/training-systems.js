// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to modules "training-systems" (3), for its Connections panel.
// Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "modules": {
    "training-systems": [
      "lr-schedule",
      "scaling-laws",
      "adam"
    ]
  }
};
window.CONCEPTS_INDEX = {
  "lr-schedule": {
    "id": "lr-schedule",
    "name": "Learning-Rate Schedule",
    "area": "Optimization",
    "summary": "Vary the step size over training — warmup then decay — to balance stability and convergence.",
    "prereqs": [
      "gradient-descent"
    ],
    "leadsTo": []
  },
  "scaling-laws": {
    "id": "scaling-laws",
    "name": "Neural Scaling Laws",
    "area": "Training Systems",
    "summary": "Test loss falls as a power law in parameters, data, and compute — letting you plan large training runs.",
    "prereqs": [
      "cross-entropy"
    ],
    "leadsTo": [
      "moe"
    ]
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
  ],
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
