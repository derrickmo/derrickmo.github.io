// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "watershed" (2), for its Connections
// panel. Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "watershed": [
      "image-segmentation",
      "edge-detection"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "image-segmentation": {
    "id": "image-segmentation",
    "name": "Image Segmentation (Watershed)",
    "area": "Computer Vision",
    "summary": "Partition an image into regions. Watershed treats intensity (or the distance transform) as a topographic surface and floods it from markers: water rises from each seed basin and a dam — the watershed line — is built where two basins meet, giving the boundary between touching objects that a plain threshold would merge. Marker-controlled watershed seeds the basins at the regional maxima of the distance map to avoid the method's notorious over-segmentation from noisy gradients; too few markers under-segments (objects fuse), too many over-segments (objects shatter). The grow-from-seeds-and-cut-on-collision idea connects to region growing, graph cuts, and superpixels, and prefigures the object-vs-object boundaries learned by modern instance-segmentation networks.",
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
  "image-segmentation": [
    {
      "kind": "demo",
      "slug": "watershed"
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
