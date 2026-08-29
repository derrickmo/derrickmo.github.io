// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/dbscan/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
  "dbscan": {
    "id": "dbscan",
    "name": "DBSCAN",
    "area": "Classical ML",
    "summary": "Density-based clustering: declare any point with at least MIN_PTS neighbors within EPS a core point, link cores into clusters, sweep up reachable borders, label the rest as noise.",
    "prereqs": [
      "knn"
    ],
    "leadsTo": []
  },
  "knn": {
    "id": "knn",
    "name": "k-Nearest Neighbors",
    "area": "Classical ML",
    "summary": "Label by majority vote of the k closest training points — no training, the data is the model.",
    "leadsTo": [
      "vector-search",
      "dbscan",
      "label-propagation",
      "kernel-density"
    ],
    "prereqs": []
  }
};
window.CONCEPT_REVERSE = {
  "dbscan": [
    {
      "kind": "demo",
      "slug": "dbscan"
    }
  ]
};
