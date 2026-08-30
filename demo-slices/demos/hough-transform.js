// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "hough-transform" (2), for its Connections
// panel. Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "hough-transform": [
      "hough-transform",
      "edge-detection"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "hough-transform": {
    "id": "hough-transform",
    "name": "Hough Transform",
    "area": "Computer Vision",
    "summary": "Detect parametric shapes (lines, circles) by voting in parameter space. Each edge point votes for every shape that could pass through it — a line point traces a sinusoid in (rho, theta) space via rho = x*cos(theta) + y*sin(theta). Collinear points vote for the same cell, so a real line is a bright accumulator peak; reading peaks back out recovers the lines. Robust to noise and gaps because scattered points rarely conspire into a false peak. Generalizes to circles (a,b,r) and arbitrary shapes; the voting-for-consensus idea is shared with RANSAC.",
    "prereqs": [
      "edge-detection"
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
  "hough-transform": [
    {
      "kind": "demo",
      "slug": "hough-transform"
    },
    {
      "kind": "demo",
      "slug": "ransac"
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
