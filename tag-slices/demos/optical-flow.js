// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "optical-flow" (2), for its Connections panel.
// Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "optical-flow": [
      "optical-flow",
      "harris-corners"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "optical-flow": {
    "id": "optical-flow",
    "name": "Optical Flow (Lucas-Kanade)",
    "area": "Computer Vision",
    "summary": "Estimate the per-pixel motion field between two frames. Assume brightness constancy — a moving point keeps its intensity — and linearize to the optical-flow constraint Ix*u + Iy*v + It = 0: one equation, two unknowns, so a single pixel is ambiguous (the aperture problem, where you only recover motion normal to an edge). Lucas-Kanade assumes a small window shares one motion, stacks the constraints, and solves the 2x2 least-squares system (the same structure-tensor matrix as Harris, now with a temporal term). Only valid for small motion because brightness is linearized; coarse-to-fine image pyramids extend the range. Powers video stabilization, frame interpolation, visual odometry/SLAM, and action recognition.",
    "prereqs": [
      "harris-corners",
      "edge-detection"
    ],
    "leadsTo": []
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
  "optical-flow": [
    {
      "kind": "demo",
      "slug": "optical-flow"
    },
    {
      "kind": "demo",
      "slug": "image-pyramids"
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
