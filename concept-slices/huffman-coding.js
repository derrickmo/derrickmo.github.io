// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/huffman-coding/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

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
  }
};
window.CONCEPT_REVERSE = {
  "huffman-coding": [
    {
      "kind": "demo",
      "slug": "huffman-coding"
    }
  ]
};
