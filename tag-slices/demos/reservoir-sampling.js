// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "reservoir-sampling" (2), for its Connections panel.
// Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "reservoir-sampling": [
      "reservoir-sampling",
      "clt"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
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
  "reservoir-sampling": [
    {
      "kind": "demo",
      "slug": "reservoir-sampling"
    },
    {
      "kind": "demo",
      "slug": "count-min-sketch"
    }
  ],
  "clt": [
    {
      "kind": "demo",
      "slug": "ica"
    },
    {
      "kind": "demo",
      "slug": "clt"
    },
    {
      "kind": "demo",
      "slug": "mcmc"
    },
    {
      "kind": "demo",
      "slug": "importance-sampling"
    },
    {
      "kind": "demo",
      "slug": "reservoir-sampling"
    },
    {
      "kind": "demo",
      "slug": "kalman-filter"
    },
    {
      "kind": "demo",
      "slug": "kernel-density"
    },
    {
      "kind": "demo",
      "slug": "drift-detection"
    },
    {
      "kind": "module",
      "slug": "foundations"
    }
  ]
};
