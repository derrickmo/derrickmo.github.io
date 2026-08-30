// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "dbscan" (2), for its Connections
// panel. Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "dbscan": [
      "dbscan",
      "knn"
    ]
  },
  "games": {}
};
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
  ],
  "knn": [
    {
      "kind": "demo",
      "slug": "knn"
    },
    {
      "kind": "demo",
      "slug": "vector-search"
    },
    {
      "kind": "demo",
      "slug": "dbscan"
    },
    {
      "kind": "demo",
      "slug": "label-propagation"
    },
    {
      "kind": "demo",
      "slug": "kernel-density"
    },
    {
      "kind": "module",
      "slug": "supervised-learning"
    }
  ]
};
