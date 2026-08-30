// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "bloom-filter" (2), for its Connections panel.
// Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "bloom-filter": [
      "bloom-filter",
      "count-min-sketch"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "bloom-filter": {
    "id": "bloom-filter",
    "name": "Bloom Filter",
    "area": "Algorithms",
    "summary": "A space-efficient probabilistic set: an m-bit array and k hash functions. Insert sets the k hashed bits; query passes only if all k are set. No false negatives ever (insertion only sets bits), but false positives occur when other keys happened to set a query's bits, at rate ≈(1−e^{−kn/m})^k, minimized at k=(m/n)·ln2. Used as a 'definitely-not-here' gate in databases, caches, crawlers, and CDNs to skip expensive lookups. Can't delete or enumerate (counting/cuckoo variants fix that); must be sized for the expected load.",
    "tex": "\\Pr[\\text{false positive}] \\approx \\left(1 - e^{-kn/m}\\right)^k",
    "prereqs": [
      "count-min-sketch"
    ],
    "leadsTo": []
  },
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
  }
};
window.CONCEPT_REVERSE = {
  "bloom-filter": [
    {
      "kind": "demo",
      "slug": "bloom-filter"
    }
  ],
  "count-min-sketch": [
    {
      "kind": "demo",
      "slug": "count-min-sketch"
    },
    {
      "kind": "demo",
      "slug": "bloom-filter"
    }
  ]
};
