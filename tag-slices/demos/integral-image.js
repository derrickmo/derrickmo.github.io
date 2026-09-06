// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "integral-image" (2), for its Connections panel.
// Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "integral-image": [
      "dynamic-programming",
      "convolution"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "dynamic-programming": {
    "id": "dynamic-programming",
    "name": "Dynamic Programming",
    "area": "Algorithms",
    "summary": "Solve a problem by combining optimal answers to overlapping subproblems, computed once and reused (memoized). Requires optimal substructure; turns exponential brute force into polynomial table-filling. The 0/1 knapsack table is canonical; the same idea drives edit distance, shortest paths, the Bellman equation, and Viterbi/CTC decoding.",
    "tex": "\\mathrm{dp}[i][c] = \\max\\bigl( \\mathrm{dp}[i{-}1][c],\\; \\mathrm{dp}[i{-}1][c - w_i] + v_i \\bigr)",
    "prereqs": [
      "mdp-bellman"
    ],
    "leadsTo": [
      "dtw",
      "branch-and-bound"
    ]
  },
  "convolution": {
    "id": "convolution",
    "name": "Convolution (CNN)",
    "area": "Computer Vision",
    "summary": "Slide a small learned kernel across an image — weight sharing + translation invariance.",
    "prereqs": [
      "mlp"
    ],
    "animation": "viz/convolution.html",
    "leadsTo": [
      "morphological-operations",
      "template-matching",
      "cnn",
      "edge-detection",
      "hog",
      "data-augmentation"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "dynamic-programming": [
    {
      "kind": "demo",
      "slug": "dtw"
    },
    {
      "kind": "demo",
      "slug": "knapsack"
    },
    {
      "kind": "demo",
      "slug": "branch-and-bound"
    },
    {
      "kind": "demo",
      "slug": "edit-distance"
    },
    {
      "kind": "demo",
      "slug": "complexity-growth"
    },
    {
      "kind": "demo",
      "slug": "ctc-alignment"
    },
    {
      "kind": "demo",
      "slug": "integral-image"
    },
    {
      "kind": "module",
      "slug": "interview-capstone"
    }
  ],
  "convolution": [
    {
      "kind": "demo",
      "slug": "morphological-ops"
    },
    {
      "kind": "demo",
      "slug": "template-matching"
    },
    {
      "kind": "demo",
      "slug": "convolution"
    },
    {
      "kind": "demo",
      "slug": "edge-detection"
    },
    {
      "kind": "demo",
      "slug": "image-augmentation"
    },
    {
      "kind": "demo",
      "slug": "bilateral-filter"
    },
    {
      "kind": "demo",
      "slug": "image-pyramids"
    },
    {
      "kind": "demo",
      "slug": "receptive-field"
    },
    {
      "kind": "demo",
      "slug": "integral-image"
    },
    {
      "kind": "demo",
      "slug": "sift"
    },
    {
      "kind": "module",
      "slug": "cnn"
    },
    {
      "kind": "hf",
      "slug": "computer-vision"
    }
  ]
};
