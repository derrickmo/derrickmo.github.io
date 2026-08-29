// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/advanced-cv/hog/.
// concept-lesson-app.jsx reads window.DM_SUBLESSON_CTX and falls back to
// window.DM_SUBLESSON(...) so the page still works if this file is ever missing.

window.DM_SUBLESSON_CTX = {
  "module": {
    "title": "Advanced Computer Vision",
    "lessons": {
      "edge-detection": {
        "title": "Edge Detection"
      },
      "hough-transform": {
        "title": "The Hough Transform"
      },
      "harris-corners": {
        "title": "Corner Detection"
      },
      "hog": {
        "title": "HOG Features"
      },
      "optical-flow": {
        "title": "Optical Flow"
      },
      "image-segmentation": {
        "title": "Image Segmentation"
      },
      "iou-nms": {
        "title": "IoU and Non-Max Suppression"
      },
      "histogram-equalization": {
        "title": "Histogram Equalization"
      },
      "morphological-operations": {
        "title": "Morphological Operations"
      },
      "template-matching": {
        "title": "Template Matching (Cross-Correlation)"
      }
    }
  },
  "moduleSlug": "advanced-cv",
  "conceptId": "hog",
  "lesson": {
    "title": "HOG Features",
    "oneLine": "Describe shape by the histogram of gradient orientations in each cell.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Before deep nets, HOG was the go-to descriptor for object shape, especially pedestrians. Split the image into small cells, build a histogram of gradient orientations in each, then normalize over blocks for lighting invariance. The result is a compact vector capturing local edge structure."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Each pixel votes into orientation bins weighted by gradient magnitude:"
        ],
        "tex": "\\theta = \\operatorname{atan2}(G_y, G_x),\\qquad \\text{vote weight} = \\|G\\|",
        "texNote": "Block normalization across neighboring cells gives robustness to illumination."
      },
      {
        "h": "In code",
        "code": "import numpy as np\nmag = np.hypot(Gx, Gy)\nori = (np.degrees(np.arctan2(Gy, Gx)) % 180)\nbins = (ori / 20).astype(int)            # 9 orientation bins per cell\n# accumulate mag into per-cell histograms, then block-normalize",
        "caption": "Orientation histograms per cell, normalized per block."
      },
      {
        "h": "Shape, but only at one orientation",
        "paras": [
          "The descriptor is a histogram of gradient orientations, so rotating the object rotates the histogram and the match degrades immediately. Rotating a bar and comparing normalised descriptors against the unrotated original, the L2 distance goes 0 at 0 degrees, 0.285 at 5, 0.844 at 15 and 1.366 at 30 — and the descriptor is unit length, so 1.366 is most of the distance available.",
          "In practice that is handled by not asking the descriptor to be invariant: detectors sweep a sliding window and rely on training data that contains the orientations you expect, which is why HOG works so well for upright pedestrians and so poorly for objects at arbitrary angles. If the orientations really are arbitrary, the honest options are augmenting the training set, searching over rotations at cost, or using a descriptor that estimates a dominant orientation first, the way SIFT does."
        ]
      }
    ],
    "takeaways": [
      "HOG encodes shape as per-cell gradient-orientation histograms.",
      "Block normalization adds lighting invariance.",
      "It powered classical detection before CNNs."
    ],
    "demo": "hog"
  },
  "order": [
    "edge-detection",
    "hough-transform",
    "harris-corners",
    "hog",
    "optical-flow",
    "image-segmentation",
    "iou-nms",
    "histogram-equalization",
    "morphological-operations",
    "template-matching"
  ],
  "index": 3,
  "prev": "harris-corners",
  "next": "optical-flow"
};
