// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "count-min-sketch" (2), for its Connections panel.
// Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "count-min-sketch": [
      "count-min-sketch",
      "reservoir-sampling"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "count-min-sketch": {
    "id": "count-min-sketch",
    "name": "Count-Min Sketch",
    "area": "Algorithms",
    "summary": "A probabilistic data structure for approximate frequency counts over a stream in sublinear memory: a d×w table of counters with d independent hash functions. Each item increments one counter per row; a query returns the MINIMUM of its d counters. Collisions only add, so it never underestimates — error ≤ ε·N with prob 1−δ for w≈e/ε, d≈ln(1/δ). Heavy hitters are estimated accurately; rare keys are noisy. Used for traffic monitoring, top-k/trending, frequency capping. Siblings: reservoir sampling (samples), Bloom filters (membership), HyperLogLog (distinct counts).",
    "tex": "\\hat f(x) = \\min_{r} \\; \\mathrm{CMS}[r][h_r(x)] \\;\\ge\\; f(x)",
    "prereqs": [
      "reservoir-sampling"
    ],
    "leadsTo": [
      "bloom-filter"
    ]
  },
  "reservoir-sampling": {
    "id": "reservoir-sampling",
    "name": "Reservoir Sampling",
    "area": "Algorithms",
    "summary": "Draw a uniform random sample of fixed size k from a stream of unknown/unbounded length in a single pass with O(k) memory. Vitter's Algorithm R: keep the first k, then accept item i (i>k) with probability k/i, evicting a uniformly random slot — so when the stream ends every item has probability k/n of being kept, independent of arrival order. The standard tool for sampling logs, events, and rows too big to store; Algorithm L skips faster, and A-Res/A-ExpJ handle weighted sampling. Unweighted, without replacement, fixed size.",
    "tex": "\\Pr[\\text{keep item } i] = \\frac{k}{i}\\ (i>k); \\quad \\Pr[\\text{in final sample}]=\\frac{k}{n}",
    "prereqs": [
      "clt"
    ],
    "leadsTo": [
      "count-min-sketch"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "count-min-sketch": [
    {
      "kind": "demo",
      "slug": "count-min-sketch"
    },
    {
      "kind": "demo",
      "slug": "bloom-filter"
    }
  ],
  "reservoir-sampling": [
    {
      "kind": "demo",
      "slug": "reservoir-sampling"
    },
    {
      "kind": "demo",
      "slug": "count-min-sketch"
    }
  ]
};
