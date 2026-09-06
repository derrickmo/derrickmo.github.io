// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "do-intervention" (2), for its Connections panel.
// Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "do-intervention": [
      "causal-inference",
      "simpsons-paradox"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
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
  },
  "simpsons-paradox": {
    "id": "simpsons-paradox",
    "name": "Simpson's Paradox & Confounding",
    "area": "Causal Inference",
    "summary": "A trend present in every subgroup can reverse when the groups are pooled, because a confounder correlates with both X and Y. The most vivid demonstration that correlation is not causation: the correct estimate depends on which variables you condition on, which is decided by the causal structure, not the data alone. Motivates stratification, regression controls, and randomization.",
    "prereqs": [
      "linear-regression",
      "bayes"
    ],
    "leadsTo": [
      "causal-inference"
    ]
  }
};
window.CONCEPT_REVERSE = {
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
      "kind": "demo",
      "slug": "hypothesis-test"
    },
    {
      "kind": "module",
      "slug": "causal-inference"
    }
  ],
  "simpsons-paradox": [
    {
      "kind": "demo",
      "slug": "simpsons-paradox"
    },
    {
      "kind": "demo",
      "slug": "do-intervention"
    },
    {
      "kind": "module",
      "slug": "causal-inference"
    }
  ]
};
