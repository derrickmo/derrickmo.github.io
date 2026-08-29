// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/advanced-cv/iou-nms/.
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
  "conceptId": "iou-nms",
  "lesson": {
    "title": "IoU and Non-Max Suppression",
    "oneLine": "Collapse many overlapping detections into clean, single boxes.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "A detector fires many overlapping boxes around each object. Non-max suppression keeps the highest-scoring box and discards others that overlap it too much, where overlap is measured by intersection-over-union. The same IoU metric also scores how well a predicted box matches the ground truth."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "IoU is overlap area over union area:"
        ],
        "tex": "\\mathrm{IoU}(A,B) = \\frac{|A\\cap B|}{|A\\cup B|}",
        "texNote": "NMS removes any box with IoU above a threshold against a higher-scoring one."
      },
      {
        "h": "In code",
        "code": "def nms(boxes, scores, thr=0.5):\n    keep, order = [], scores.argsort()[::-1]\n    while len(order):\n        i = order[0]; keep.append(i)\n        order = [j for j in order[1:] if iou(boxes[i], boxes[j]) < thr]\n    return keep",
        "caption": "Keep the best box, drop its high-overlap neighbors, repeat."
      },
      {
        "h": "The threshold has to know how crowded the scene is",
        "paras": [
          "Non-max suppression assumes that heavily overlapping boxes are duplicates, which stops being true the moment two real objects overlap. With two people standing shoulder to shoulder, whose ground-truth boxes themselves overlap at IoU 0.471, running NMS at a threshold of 0.3 keeps a single box and recovers only 1 of the 2 real objects. The second detection was correct and was deleted for looking like a duplicate.",
          "Raising the threshold to 0.5 recovers both, but a threshold above the typical duplicate overlap lets duplicates through instead, so the parameter is a straight trade between missed neighbours and repeated boxes — and the right value depends on how crowded your scenes are, which is a property of the dataset rather than of the detector. Soft-NMS decays scores instead of deleting outright for exactly this reason, and end-to-end detectors like DETR drop the step altogether by learning not to emit duplicates."
        ]
      }
    ],
    "takeaways": [
      "IoU measures box overlap quality.",
      "NMS deduplicates overlapping detections by score.",
      "The IoU threshold trades duplicates against missed objects."
    ],
    "demo": "nms"
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
  "index": 6,
  "prev": "image-segmentation",
  "next": "histogram-equalization"
};
