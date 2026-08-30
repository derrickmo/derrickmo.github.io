// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "huffman-coding" (3), for its Connections
// panel. Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "huffman-coding": [
      "huffman-coding",
      "entropy",
      "cross-entropy"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "huffman-coding": {
    "id": "huffman-coding",
    "name": "Huffman Coding & Source Coding",
    "area": "Information Theory",
    "summary": "The optimal prefix code: greedily merge the two least-probable symbols so frequent symbols get short codes. Average length L satisfies H ≤ L < H+1 — entropy is the hard floor of lossless compression. The same bound is why cross-entropy loss measures a model's bits-per-token.",
    "tex": "H(X) \\le L < H(X) + 1",
    "prereqs": [
      "entropy"
    ],
    "leadsTo": []
  },
  "entropy": {
    "id": "entropy",
    "name": "Entropy & Information Gain",
    "area": "Information Theory",
    "summary": "Measure uncertainty in bits — the criterion behind decision-tree splits, cross-entropy, and information-greedy strategies.",
    "tex": "H(p) = -\\sum_i p_i \\log p_i",
    "leadsTo": [
      "mutual-information",
      "channel-capacity",
      "huffman-coding"
    ],
    "prereqs": []
  },
  "cross-entropy": {
    "id": "cross-entropy",
    "name": "Cross-Entropy",
    "area": "Information Theory",
    "summary": "The loss that measures how much a predicted distribution disagrees with the true labels.",
    "tex": "H(p, q) = -\\sum_i p_i \\log q_i",
    "prereqs": [
      "softmax"
    ],
    "leadsTo": [
      "scaling-laws",
      "bayes",
      "gan",
      "logistic-regression"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "huffman-coding": [
    {
      "kind": "demo",
      "slug": "huffman-coding"
    }
  ],
  "entropy": [
    {
      "kind": "demo",
      "slug": "mutual-information"
    },
    {
      "kind": "demo",
      "slug": "channel-capacity"
    },
    {
      "kind": "demo",
      "slug": "huffman-coding"
    },
    {
      "kind": "demo",
      "slug": "decision-tree"
    },
    {
      "kind": "demo",
      "slug": "cross-entropy"
    },
    {
      "kind": "game",
      "slug": "wordle"
    },
    {
      "kind": "game",
      "slug": "minesweeper"
    },
    {
      "kind": "module",
      "slug": "foundations"
    }
  ],
  "cross-entropy": [
    {
      "kind": "demo",
      "slug": "huffman-coding"
    },
    {
      "kind": "demo",
      "slug": "roc"
    },
    {
      "kind": "demo",
      "slug": "bayes"
    },
    {
      "kind": "demo",
      "slug": "gan"
    },
    {
      "kind": "demo",
      "slug": "regression"
    },
    {
      "kind": "demo",
      "slug": "cross-entropy"
    }
  ]
};
