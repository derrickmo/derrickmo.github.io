// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "decision-tree" (2), for its Connections
// panel. Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "decision-tree": [
      "decision-tree",
      "entropy"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "decision-tree": {
    "id": "decision-tree",
    "name": "Decision Tree",
    "area": "Classical ML",
    "summary": "Split feature space greedily by the cut that most reduces impurity; the building block of forests and boosting.",
    "leadsTo": [
      "entropy",
      "ensembles"
    ],
    "prereqs": []
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
  }
};
window.CONCEPT_REVERSE = {
  "decision-tree": [
    {
      "kind": "demo",
      "slug": "bagging-boosting"
    },
    {
      "kind": "demo",
      "slug": "decision-tree"
    },
    {
      "kind": "module",
      "slug": "supervised-learning"
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
  ]
};
