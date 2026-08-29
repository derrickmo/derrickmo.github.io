// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/advanced-cv/image-segmentation/.
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
  "conceptId": "image-segmentation",
  "lesson": {
    "title": "Image Segmentation",
    "oneLine": "Partition an image into coherent regions or objects.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Segmentation labels every pixel, grouping them into regions that belong together. Classical watershed treats intensity as a landscape and floods basins from markers, with boundaries forming where basins meet. It is how you separate touching objects before counting or measuring them."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Watershed floods from markers; ridges between catchment basins become boundaries:"
        ],
        "tex": "\\partial = \\{\\,x : \\text{two basins meet at } x\\,\\}",
        "texNote": "Marker placement controls over- versus under-segmentation."
      },
      {
        "h": "In code",
        "code": "# marker-controlled watershed (sketch)\ndist = distance_transform(binary)\nmarkers = local_maxima(dist)\nlabels = watershed(-dist, markers)     # basins flood from markers",
        "caption": "Flood from markers; boundaries form where basins collide."
      },
      {
        "h": "How many regions is a parameter, not a fact",
        "paras": [
          "Ask a watershed how many regions an image contains and the answer is set by how much you smoothed it first. On a textured surface, counting catchment basins gives 420 regions with no smoothing, 342 at sigma 0.5, 63 at sigma 1 and 3 at sigma 2 — two orders of magnitude spanned by one preprocessing knob, with the image unchanged throughout.",
          "That is the honest shape of the problem: without a definition of what an object is, there is no correct number, and the classic oversegmentation of watershed is the algorithm being faithful to a question that was never fully asked. It is why practical pipelines either supply that definition through markers and seeds, or accept the oversegmentation deliberately and merge afterwards — the superpixel approach — or replace the criterion entirely with a learned one."
        ]
      }
    ],
    "takeaways": [
      "Segmentation assigns every pixel to a region.",
      "Watershed floods basins from markers to split touching objects.",
      "Modern deep segmentation learns the regions end-to-end."
    ],
    "demo": "watershed"
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
  "index": 5,
  "prev": "optical-flow",
  "next": "iou-nms"
};
