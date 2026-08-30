// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "hog" (2), for its Connections
// panel. Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "hog": [
      "hog",
      "edge-detection"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "hog": {
    "id": "hog",
    "name": "Histogram of Oriented Gradients",
    "area": "Computer Vision",
    "summary": "A hand-designed image descriptor that keeps where edges point and discards exact intensities. Compute gradient magnitude + orientation per pixel, split the image into small cells, and build a magnitude-weighted histogram of unsigned orientations (0-180, typically 9 bins) in each cell. Then block-normalize (L2 over overlapping cell blocks) so only the SHAPE of the orientation distribution survives — giving robustness to lighting and contrast. The concatenated cell histograms form a fixed-length feature vector. HOG + a linear SVM (Dalal-Triggs 2005) was the leading pedestrian/object detector before deep learning, and is the explicit ancestor of the oriented-edge filters a CNN learns in its first layers.",
    "prereqs": [
      "edge-detection",
      "convolution"
    ],
    "leadsTo": []
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
  "hog": [
    {
      "kind": "demo",
      "slug": "hog"
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
