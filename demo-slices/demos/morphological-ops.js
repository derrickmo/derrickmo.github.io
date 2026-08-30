// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "morphological-ops" (2), for its Connections
// panel. Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "morphological-ops": [
      "morphological-operations",
      "convolution"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "morphological-operations": {
    "id": "morphological-operations",
    "name": "Morphological Operations",
    "area": "Computer Vision",
    "summary": "Set-based reshaping of binary (or grayscale) images by probing with a structuring element. Erosion/dilation are min/max neighborhood filters; opening removes specks, closing fills holes, gradient extracts boundaries. The cleanup stage after thresholding/segmentation.",
    "tex": "(A \\ominus B),\\ (A \\oplus B),\\ A\\circ B = (A\\ominus B)\\oplus B",
    "prereqs": [
      "convolution"
    ],
    "leadsTo": []
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
  "morphological-operations": [
    {
      "kind": "demo",
      "slug": "morphological-ops"
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
      "slug": "vision"
    }
  ]
};
