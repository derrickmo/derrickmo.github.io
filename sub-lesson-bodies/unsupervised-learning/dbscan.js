// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/unsupervised-learning/dbscan/.
// concept-lesson-app.jsx reads window.DM_SUBLESSON_CTX and falls back to
// window.DM_SUBLESSON(...) so the page still works if this file is ever missing.

window.DM_SUBLESSON_CTX = {
  "module": {
    "title": "Unsupervised Learning",
    "lessons": {
      "dbscan": {
        "title": "DBSCAN"
      },
      "hierarchical-clustering": {
        "title": "Hierarchical Clustering"
      },
      "tsne": {
        "title": "t-SNE"
      },
      "spectral-clustering": {
        "title": "Spectral Clustering"
      },
      "kernel-density": {
        "title": "Kernel Density Estimation"
      }
    }
  },
  "moduleSlug": "unsupervised-learning",
  "conceptId": "dbscan",
  "lesson": {
    "title": "DBSCAN",
    "oneLine": "Find dense clusters of any shape, and label the rest as noise.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "k-means assumes round, similarly sized blobs. DBSCAN instead grows clusters from dense regions: a point with enough neighbors within a radius is a core point, and clusters expand through chains of core points. It finds arbitrarily shaped clusters, needs no k, and marks sparse outliers as noise."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "A point is core if its eps-neighborhood holds at least minPts points:"
        ],
        "tex": "|\\{x' : \\|x - x'\\| \\le \\varepsilon\\}| \\ge \\text{minPts}",
        "texNote": "eps and minPts set the density threshold; non-reachable points become noise."
      },
      {
        "h": "In code",
        "code": "# region query + expansion (sketch)\nneighbors = [j for j in range(n) if dist(i, j) <= eps]\nif len(neighbors) >= min_pts:\n    expand_cluster(i, neighbors)      # flood through dense points",
        "caption": "Grow clusters through dense, connected regions."
      },
      {
        "h": "One epsilon cannot serve two densities",
        "paras": [
          "DBSCAN's epsilon is a single global scale, so a dataset with clusters at different densities has no correct setting. With two tight clusters (sd 0.10) sitting 1.0 apart and one loose cluster (sd 2.5) elsewhere, epsilon 0.15 keeps the tight pair properly separated and labels the loose cluster entirely noise — all 200 of its points. Epsilon 0.5 shatters the loose cluster into nine fragments with 130 noise points and has already merged the tight pair into one.",
          "By epsilon 1.5 the loose cluster is recovered cleanly and the two tight clusters are irrevocably one. There is no value that is right for both, which is not a tuning failure but the shape of the algorithm: density is defined relative to a fixed radius. That is exactly what OPTICS and HDBSCAN address, by building the reachability structure across scales and extracting clusters from it rather than committing to one radius in advance."
        ]
      }
    ],
    "takeaways": [
      "DBSCAN clusters by density, not distance to a center.",
      "It finds arbitrary shapes and needs no k.",
      "Sparse points are labeled noise rather than forced into a cluster."
    ],
    "demo": "dbscan"
  },
  "order": [
    "dbscan",
    "hierarchical-clustering",
    "tsne",
    "spectral-clustering",
    "kernel-density"
  ],
  "index": 0,
  "prev": null,
  "next": "hierarchical-clustering"
};
