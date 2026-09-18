// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "histogram-equalization" (2), for its Connections panel.
// Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "histogram-equalization": [
      "histogram-equalization",
      "entropy"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "histogram-equalization": {
    "id": "histogram-equalization",
    "name": "Histogram Equalization",
    "area": "Computer Vision",
    "summary": "Enhance contrast by remapping pixel intensities through the image's own CDF, making the output histogram roughly uniform. It's the probability integral transform applied to pixels; CLAHE clips tall bins first to avoid amplifying noise. A standard preprocessing step.",
    "tex": "s = T(r) = (L-1)\\!\\int_0^r p_r(w)\\,dw",
    "prereqs": [],
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
  "histogram-equalization": [
    {
      "kind": "demo",
      "slug": "histogram-equalization"
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
      "slug": "histogram-equalization"
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
