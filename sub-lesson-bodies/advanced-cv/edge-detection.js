// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/advanced-cv/edge-detection/.
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
  "conceptId": "edge-detection",
  "lesson": {
    "title": "Edge Detection",
    "oneLine": "Find boundaries where image intensity changes sharply.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Edges are where brightness changes fast - the outlines that carry most of an image's structure. Gradient operators like Sobel estimate that change; the Canny pipeline then thins the response and links strong, connected edges while suppressing noise. It is the front end of countless vision algorithms."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Edge strength is the gradient magnitude:"
        ],
        "tex": "\\|\\nabla I\\| = \\sqrt{I_x^2 + I_y^2}",
        "texNote": "Canny adds non-max suppression and hysteresis thresholding on top of this."
      },
      {
        "h": "In code",
        "code": "import numpy as np\n\nSx = np.array([[-1,0,1],[-2,0,2],[-1,0,1]])\nGx = conv2d(I, Sx); Gy = conv2d(I, Sx.T)\nmag = np.hypot(Gx, Gy)            # edge strength",
        "caption": "Sobel gradients give magnitude and direction."
      },
      {
        "h": "The derivative is a noise amplifier",
        "paras": [
          "Differentiating is a high-pass operation, so it does exactly the wrong thing to sensor noise. On a synthetic step edge the Sobel magnitude at the edge barely moves as noise rises — 2.40, 2.41, 2.49, 2.26 — while the response in the flat regions climbs from 0 to 0.057, 0.141, 0.291. The signal-to-noise ratio falls from 42.3 at noise sd 0.02 to 7.8 at sd 0.1, entirely because the background got louder.",
          "This is why every practical edge detector smooths first and why Canny is a Gaussian derivative rather than a bare difference. On the same noisy image, blurring with sigma 1 before differentiating lifts the ratio from 8.7 to 16.5, and sigma 2 lifts it to 31. The blur is not a cosmetic pre-step; it is the term that decides which scale of edge you are asking about, and choosing it is choosing what counts as an edge rather than as texture."
        ]
      }
    ],
    "takeaways": [
      "Edges are gradient maxima in intensity.",
      "Sobel estimates the gradient; Canny refines it.",
      "Edge maps front-end detection, matching, and segmentation."
    ],
    "demo": "edge-detection"
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
  "index": 0,
  "prev": null,
  "next": "hough-transform"
};
