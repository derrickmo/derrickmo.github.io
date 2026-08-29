// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/histogram-equalization/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

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
