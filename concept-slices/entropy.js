// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/entropy/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
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
  "channel-capacity": {
    "id": "channel-capacity",
    "name": "Channel Capacity",
    "area": "Information Theory",
    "summary": "The maximum rate at which information can be sent reliably over a noisy channel: C = max over inputs of I(X;Y). For the binary symmetric channel C = 1 − H(p). Shannon's coding theorem says any rate below C is achievable with vanishing error, and nothing above it.",
    "tex": "C = \\max_{p(x)} I(X;Y) = 1 - H(p)\\ \\text{(BSC)}",
    "prereqs": [
      "entropy",
      "mutual-information"
    ],
    "leadsTo": []
  },
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
  }
};
window.CONCEPT_REVERSE = {
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
