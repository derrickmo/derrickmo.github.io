// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/advanced-cv/optical-flow/.
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
  "conceptId": "optical-flow",
  "lesson": {
    "title": "Optical Flow",
    "oneLine": "Estimate the per-pixel motion between two frames.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Optical flow asks: where did each pixel go between frames? Assuming brightness is conserved as things move, the Lucas-Kanade method solves a small least-squares system in each neighborhood to recover the local motion vector. It powers tracking, stabilization, and motion-based segmentation."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "The brightness-constancy constraint relates spatial and temporal gradients:"
        ],
        "tex": "I_x u + I_y v + I_t = 0",
        "texNote": "One equation, two unknowns - Lucas-Kanade adds neighbors to solve it."
      },
      {
        "h": "In code",
        "code": "# Lucas-Kanade in a window: solve A [u v]^T = b\nA = np.stack([Ix[win], Iy[win]], 1)\nb = -It[win]\nuv = np.linalg.lstsq(A, b, rcond=None)[0]",
        "caption": "Least-squares over a patch gives the local flow."
      },
      {
        "h": "Two assumptions, both of which break",
        "paras": [
          "Lucas-Kanade rests on brightness constancy and on motion small enough for a first-order expansion, and both fail in ordinary footage. On a textured patch the estimate is excellent while the motion is small — 0.26 for a true 0.25 pixels, 1.02 for 1.0, 1.90 for 2.0 — and then collapses: 2.89 for a true 4 pixels and 1.11 for a true 8. That is the linearisation expiring, and it is why real implementations run the solver down a pyramid, so every level only ever sees a small displacement.",
          "Brightness constancy is the more insidious one because it fails silently. Brightening the same frame by 15% with nothing moving at all reports 0.33 pixels of motion in each direction — motion that never happened, from an auto-exposure change. And on a straight edge the system is singular: the same solve returns NaN, because a moving edge gives no information about how far it slid along itself. That is the aperture problem, and it is a property of the data rather than a bug in the solver."
        ]
      }
    ],
    "takeaways": [
      "Optical flow recovers per-pixel motion between frames.",
      "Brightness constancy plus a local window makes it solvable.",
      "It only works for small motions - hence coarse-to-fine pyramids."
    ],
    "demo": "optical-flow"
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
  "index": 4,
  "prev": "hog",
  "next": "image-segmentation"
};
