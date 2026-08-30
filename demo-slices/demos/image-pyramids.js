// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "image-pyramids" (3), for its Connections
// panel. Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "image-pyramids": [
      "convolution",
      "optical-flow",
      "template-matching"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
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
  }
};
window.CONCEPT_REVERSE = {
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
  ],
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
  ]
};
