// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "template-matching" (3), for its Connections panel.
// Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "template-matching": [
      "template-matching",
      "convolution",
      "harris-corners"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "template-matching": {
    "id": "template-matching",
    "name": "Template Matching (Cross-Correlation)",
    "area": "Computer Vision",
    "summary": "Find a known patch by sliding it over an image and scoring each position. SSD is brightness-sensitive; normalized cross-correlation (NCC) subtracts the mean and divides by the norm to match the pattern invariant to brightness/contrast. It IS convolution with the template as the kernel — but fails under scale/rotation.",
    "tex": "\\mathrm{NCC} = \\frac{\\sum (I-\\bar I)(T-\\bar T)}{\\sqrt{\\sum (I-\\bar I)^2 \\sum (T-\\bar T)^2}}",
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
  },
  "harris-corners": {
    "id": "harris-corners",
    "name": "Harris Corner Detector",
    "area": "Computer Vision",
    "summary": "Find corner keypoints — points where image intensity changes in two directions at once. Build the structure tensor M by summing gradient products (Ix^2, Iy^2, IxIy) over a Gaussian window; its two eigenvalues describe how intensity varies in the two principal directions. Flat = both small, edge = one large, corner = both large. The response R = det(M) - k*trace(M)^2 detects the both-large case cheaply (positive at corners, negative at edges), then threshold + non-max suppression localize them. Foundation of feature tracking, image matching, panorama stitching, camera calibration, and SLAM.",
    "prereqs": [
      "edge-detection",
      "pca"
    ],
    "leadsTo": [
      "optical-flow"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "template-matching": [
    {
      "kind": "demo",
      "slug": "template-matching"
    },
    {
      "kind": "demo",
      "slug": "image-pyramids"
    },
    {
      "kind": "demo",
      "slug": "sift"
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
  ],
  "harris-corners": [
    {
      "kind": "demo",
      "slug": "template-matching"
    },
    {
      "kind": "demo",
      "slug": "harris-corners"
    },
    {
      "kind": "demo",
      "slug": "optical-flow"
    },
    {
      "kind": "demo",
      "slug": "sift"
    }
  ]
};
