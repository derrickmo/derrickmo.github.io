// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/advanced-cv/harris-corners/.
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
  "conceptId": "harris-corners",
  "lesson": {
    "title": "Corner Detection",
    "oneLine": "Find points where intensity changes in every direction.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Corners are the most distinctive local features - unlike a smooth region or a straight edge, a corner shifts in appearance whichever way you move. The Harris detector measures this with the structure tensor of local gradients; large change in two directions means a corner worth tracking across frames."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "The Harris response from the structure tensor M:"
        ],
        "tex": "R = \\det(M) - k\\,\\mathrm{tr}(M)^2",
        "texNote": "Large positive R means two strong gradient directions - a corner."
      },
      {
        "h": "In code",
        "code": "Ix, Iy = grad(I)\nM = [[smooth(Ix*Ix), smooth(Ix*Iy)],\n     [smooth(Ix*Iy), smooth(Iy*Iy)]]\nR = det(M) - 0.04 * trace(M)**2      # corners where R is large",
        "caption": "Two strong gradient directions = a trackable corner."
      },
      {
        "h": "The window is the scale, and it is fixed",
        "paras": [
          "The detector looks at intensity variation inside one window, so it can only find corners at the scale that window happens to match. Viewing the same square corner at progressively coarser scale, the Harris response with a fixed 3x3 window falls from 1.95e-2 to 1.10e-3 after one step of blurring, and by two steps it has gone negative (-8.85e-5) — the corner has been reclassified as an edge, which is what a negative response means.",
          "Nothing is scale-invariant here, and no threshold repairs it: the same physical corner seen from twice the distance simply is not a corner to a fixed window any more. That is precisely the gap that scale-space detectors were built to close, by searching over a range of window sizes and keeping the extremum — Harris-Laplace, and the difference-of-Gaussians pyramid underneath SIFT."
        ]
      }
    ],
    "takeaways": [
      "Corners change in all directions - the best local features.",
      "The structure tensor's eigenvalues reveal them.",
      "They anchor tracking, matching, and motion estimation."
    ],
    "demo": "harris-corners"
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
  "index": 2,
  "prev": "hough-transform",
  "next": "hog"
};
