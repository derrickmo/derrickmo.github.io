// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "harris-corners" (2), for its Connections panel.
// Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "harris-corners": [
      "harris-corners",
      "edge-detection"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
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
  },
  "edge-detection": {
    "id": "edge-detection",
    "name": "Edge Detection (Canny)",
    "area": "Computer Vision",
    "summary": "Find where image brightness changes sharply. The Canny pipeline: Gaussian blur (denoise) -> Sobel gradient (magnitude + direction) -> non-maximum suppression (thin ridges to 1px along the gradient) -> double threshold (strong vs weak pixels) -> hysteresis (keep weak pixels connected to strong ones). The high-bar-to-start / low-bar-to-continue hysteresis rule links broken contours while rejecting isolated noise. Still a standard preprocessor before Hough line/circle detection and a building block of HOG/SIFT-style features.",
    "prereqs": [
      "convolution"
    ],
    "leadsTo": [
      "hough-transform",
      "harris-corners",
      "optical-flow",
      "hog",
      "image-segmentation"
    ]
  }
};
window.CONCEPT_REVERSE = {
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
  ],
  "edge-detection": [
    {
      "kind": "demo",
      "slug": "edge-detection"
    },
    {
      "kind": "demo",
      "slug": "hough-transform"
    },
    {
      "kind": "demo",
      "slug": "harris-corners"
    },
    {
      "kind": "demo",
      "slug": "hog"
    },
    {
      "kind": "demo",
      "slug": "watershed"
    },
    {
      "kind": "demo",
      "slug": "bilateral-filter"
    }
  ]
};
