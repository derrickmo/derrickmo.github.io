// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/advanced-cv/morphological-operations/.
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
  "conceptId": "morphological-operations",
  "lesson": {
    "title": "Morphological Operations",
    "oneLine": "Erode, dilate, and the two useful compositions — shape-aware cleanup that is decided entirely by the structuring element you pick.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Morphology treats a binary image as a set and probes it with a small shape, the structuring element. Erosion keeps a pixel only where the element fits entirely inside the foreground, so regions shrink and anything thinner than the element disappears. Dilation keeps a pixel where the element touches the foreground at all, so regions grow and small gaps close.",
          "Neither is much use alone, because both change the size of everything. The compositions are what you actually reach for. Opening is erosion followed by dilation: the erosion deletes small objects, the dilation restores the survivors to roughly their original size. Closing is the reverse: dilation seals small holes and thin gaps, erosion brings the boundary back.",
          "Measured on a 40 by 40 square containing a 6 by 6 hole, with 43 single-pixel specks scattered outside it. The original has 44 connected components and 1 hole. After opening: 1 component — every speck gone — and the hole still there. After closing: 0 holes, and the specks still there. Opening then closing gives 1 component, 0 holes, and an area of 1,600 against the original 1,607."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "The four operations as set operations, with B the structuring element:"
        ],
        "tex": "A \\ominus B = \\{z : B_z \\subseteq A\\}, \\quad A \\oplus B = \\{z : B_z \\cap A \\neq \\emptyset\\}, \\quad A \\circ B = (A \\ominus B) \\oplus B, \\quad A \\bullet B = (A \\oplus B) \\ominus B",
        "texNote": "Both compositions are idempotent — applying opening twice changes nothing, confirmed directly on the test image. That is a genuinely useful property: there is no question of how many times to run it, unlike an iterative smoother where the iteration count becomes another parameter."
      },
      {
        "h": "In code",
        "code": "import cv2, numpy as np\n\n# The structuring element IS the parameter. A rectangle biases toward axis-aligned\n# structure; an ellipse is closer to isotropic; a line removes everything not parallel\n# to it, which is how table rulings get extracted from a scanned form.\nrect = cv2.getStructuringElement(cv2.MORPH_RECT,    (3, 3))\nellip = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))\nhline = cv2.getStructuringElement(cv2.MORPH_RECT,   (25, 1))\n\nclean = cv2.morphologyEx(mask, cv2.MORPH_OPEN,  ellip)   # drop specks\nsolid = cv2.morphologyEx(clean, cv2.MORPH_CLOSE, ellip)  # then seal holes\n\n# The gradient is the boundary; the two hats isolate features by POLARITY.\nedge    = cv2.morphologyEx(mask, cv2.MORPH_GRADIENT, rect)\ntophat  = cv2.morphologyEx(gray, cv2.MORPH_TOPHAT,  ellip)  # bright on dark\nblkhat  = cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, ellip) # dark on bright",
        "caption": "The top-hat is the standard trick for uneven illumination: subtracting an opening removes the slowly varying background and leaves the small bright detail, which is why it precedes thresholding in most OCR pipelines."
      },
      {
        "h": "What the compositions do not promise",
        "paras": [
          "Opening is not the inverse of closing and neither is the identity. On the test image, opening reduced the area from 1,607 to 1,564 — the specks it removed are gone for good, which is the point, but so is a thin sliver of the square's boundary. Erosion followed by dilation does not put back what erosion deleted; it only restores what survived.",
          "The two compositions also do not commute. On the clean test image, open-then-close and close-then-open produced pixel-for-pixel identical results, which made the order look irrelevant. On a random binary image they differ in 3,726 of 4,096 pixels. The clean case was a special case, not a rule, and the order you choose encodes which artefact you consider noise: open first if the specks are noise, close first if the holes are.",
          "The choice of structuring element dominates everything else. Its size sets the scale of what counts as small, and its shape sets which orientations survive — a horizontal line element deletes every vertical stroke, which is exactly how you separate table rulings from text. Choosing it is choosing the definition of noise for that image, and there is no default that is right twice.",
          "Finally, all of this extends to greyscale by replacing set containment with local minimum and maximum, which is why cv2.erode on a greyscale image is a min-filter. The intuition carries over unchanged."
        ]
      }
    ],
    "takeaways": [
      "Opening removes objects smaller than the structuring element and closing fills holes smaller than it: 44 components became 1, and 1 hole became 0, on the same test image.",
      "Both compositions are idempotent, so there is no iteration count to tune — but neither is the identity, and opening cost 43 pixels of the square's own boundary.",
      "They do not commute: identical on a clean image, but differing in 3,726 of 4,096 pixels on a random one. Ordering encodes whether you regard specks or holes as the noise."
    ],
    "demo": "morphological-ops"
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
  "index": 8,
  "prev": "histogram-equalization",
  "next": "template-matching"
};
