// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/bloom-filter/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

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
  },
  "clt": {
    "id": "clt",
    "name": "Central Limit Theorem",
    "area": "Probability & Bayes",
    "summary": "Averages of many independent samples converge to a Gaussian — why the bell curve is everywhere.",
    "leadsTo": [
      "ica",
      "mcmc",
      "importance-sampling",
      "reservoir-sampling",
      "kalman-filter",
      "kernel-density",
      "self-consistency",
      "drift-detection"
    ],
    "prereqs": []
  }
};
window.CONCEPT_REVERSE = {
  "bloom-filter": [
    {
      "kind": "demo",
      "slug": "bloom-filter"
    }
  ]
};
