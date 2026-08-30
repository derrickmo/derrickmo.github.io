// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "mutual-information" (2), for its Connections
// panel. Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "mutual-information": [
      "mutual-information",
      "entropy"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "mutual-information": {
    "id": "mutual-information",
    "name": "Mutual Information",
    "area": "Information Theory",
    "summary": "How much knowing one variable reduces uncertainty about another — dependence of ANY kind, not just linear correlation. MI = H(X)+H(Y)−H(X,Y); zero iff independent. The objective behind InfoNCE/contrastive learning and the information-bottleneck view of deep nets; brutal to estimate in high dimensions.",
    "tex": "I(X;Y) = \\sum_{x,y} p(x,y)\\,\\log\\frac{p(x,y)}{p(x)\\,p(y)}",
    "prereqs": [
      "entropy"
    ],
    "leadsTo": [
      "channel-capacity"
    ]
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
  "mutual-information": [
    {
      "kind": "demo",
      "slug": "mutual-information"
    },
    {
      "kind": "demo",
      "slug": "channel-capacity"
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
