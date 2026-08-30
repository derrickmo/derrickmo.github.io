// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "histogram-equalization" (1), for its Connections panel.
// Same global names as concepts-index.js, with 187 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "histogram-equalization": [
      "histogram-equalization"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "histogram-equalization": {
    "id": "histogram-equalization",
    "name": "Histogram Equalization",
    "area": "Computer Vision",
    "summary": "Enhance contrast by remapping pixel intensities through the image's own CDF, making the output histogram roughly uniform. It's the probability integral transform applied to pixels; CLAHE clips tall bins first to avoid amplifying noise. A standard preprocessing step.",
    "tex": "s = T(r) = (L-1)\\!\\int_0^r p_r(w)\\,dw",
    "prereqs": [],
    "leadsTo": []
  }
};
window.CONCEPT_REVERSE = {
  "histogram-equalization": [
    {
      "kind": "demo",
      "slug": "histogram-equalization"
    }
  ]
};
