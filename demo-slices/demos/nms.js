// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "nms" (2), for its Connections
// panel. Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "nms": [
      "iou-nms",
      "cnn"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "iou-nms": {
    "id": "iou-nms",
    "name": "IoU & Non-Max Suppression",
    "area": "Computer Vision",
    "summary": "Score box overlap with IoU; greedily suppress duplicates — the cleanup step every detector ends with.",
    "leadsTo": [],
    "prereqs": []
  },
  "cnn": {
    "id": "cnn",
    "name": "Convolutional Neural Network",
    "area": "Computer Vision",
    "summary": "Stacks of convolutions and pooling that build a feature hierarchy from edges to objects.",
    "prereqs": [
      "convolution"
    ],
    "leadsTo": []
  }
};
window.CONCEPT_REVERSE = {
  "iou-nms": [
    {
      "kind": "demo",
      "slug": "nms"
    },
    {
      "kind": "module",
      "slug": "advanced-cv"
    }
  ],
  "cnn": [
    {
      "kind": "demo",
      "slug": "convolution"
    },
    {
      "kind": "demo",
      "slug": "nms"
    },
    {
      "kind": "demo",
      "slug": "receptive-field"
    },
    {
      "kind": "demo",
      "slug": "grad-cam"
    },
    {
      "kind": "module",
      "slug": "cnn"
    },
    {
      "kind": "hf",
      "slug": "vision"
    }
  ]
};
