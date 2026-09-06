// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to modules "interview-capstone" (6), for its Connections panel.
// Same global names as concepts-index.js, with 182 fewer concepts in them.

window.CONCEPT_TAGS = {
  "modules": {
    "interview-capstone": [
      "bias-variance",
      "cross-validation",
      "classification-metrics",
      "dynamic-programming",
      "graph-search",
      "reranking"
    ]
  }
};
window.CONCEPTS_INDEX = {
  "bias-variance": {
    "id": "bias-variance",
    "name": "Bias-Variance Tradeoff",
    "area": "Evaluation & Calibration",
    "summary": "Generalization error decomposes into rigid-model bias plus over-fitting variance — the central tension of ML.",
    "prereqs": [
      "linear-regression"
    ],
    "leadsTo": [
      "regularization",
      "double-descent",
      "cross-validation",
      "overfitting",
      "ensembles"
    ]
  },
  "cross-validation": {
    "id": "cross-validation",
    "name": "Cross-Validation",
    "area": "Evaluation & Calibration",
    "summary": "Estimate out-of-sample error and select hyperparameters by rotating a held-out fold through the data: split into k folds, train on k−1 and score on the held-out one, average over all k. Train error falls monotonically with capacity and can't pick a model; the CV error is U-shaped and its minimum is the bias/variance sweet spot. k=5/10 are typical (k=N is leave-one-out). Watch for leakage — use grouped/stratified/time-series splits, and nested CV when selecting AND scoring.",
    "tex": "\\mathrm{CV} = \\tfrac{1}{k}\\sum_{f=1}^{k} \\mathrm{err}\\big(\\text{model}_{-f},\\, \\text{fold}_f\\big)",
    "prereqs": [
      "bias-variance"
    ],
    "leadsTo": []
  },
  "classification-metrics": {
    "id": "classification-metrics",
    "name": "Classification Metrics",
    "area": "Evaluation & Calibration",
    "summary": "Everything read off the confusion matrix: precision, recall, F1, and the macro/micro/weighted averagings plus F-beta. Accuracy and micro-F1 are dominated by the majority class; macro-F1 exposes weak minority classes. Choosing the metric that matches each error's cost is half of responsible ML.",
    "tex": "F_\\beta = (1+\\beta^2)\\,\\frac{P\\cdot R}{\\beta^2 P + R}",
    "prereqs": [
      "roc"
    ],
    "leadsTo": []
  },
  "dynamic-programming": {
    "id": "dynamic-programming",
    "name": "Dynamic Programming",
    "area": "Algorithms",
    "summary": "Solve a problem by combining optimal answers to overlapping subproblems, computed once and reused (memoized). Requires optimal substructure; turns exponential brute force into polynomial table-filling. The 0/1 knapsack table is canonical; the same idea drives edit distance, shortest paths, the Bellman equation, and Viterbi/CTC decoding.",
    "tex": "\\mathrm{dp}[i][c] = \\max\\bigl( \\mathrm{dp}[i{-}1][c],\\; \\mathrm{dp}[i{-}1][c - w_i] + v_i \\bigr)",
    "prereqs": [
      "mdp-bellman"
    ],
    "leadsTo": [
      "dtw",
      "branch-and-bound"
    ]
  },
  "graph-search": {
    "id": "graph-search",
    "name": "Graph Search (BFS / DFS / A*)",
    "area": "Algorithms",
    "summary": "Systematically explore a state graph from a start to a goal. Uninformed methods order the frontier without domain knowledge — BFS (queue, shortest path on unit edges), DFS (stack, low memory, not optimal); informed A* orders by g + h, an admissible heuristic that focuses search toward the goal and stays optimal. The frontier data structure is the whole difference.",
    "prereqs": [
      "search-astar"
    ],
    "leadsTo": [
      "dijkstra",
      "max-flow",
      "branch-and-bound"
    ]
  },
  "reranking": {
    "id": "reranking",
    "name": "Reranking (cross-encoder)",
    "area": "Retrieval",
    "summary": "The second stage of retrieval. A cheap bi-encoder/BM25 first stage maximizes recall over the whole corpus by scoring queries and docs independently; a slow cross-encoder then reads each (query, doc) pair jointly to score true relevance precisely and reorders the shortlist. Splits recall (stage 1) from precision (stage 2); the reranker is bounded by what the pool retrieved.",
    "prereqs": [
      "vector-search",
      "rag-chunking"
    ],
    "leadsTo": []
  }
};
window.CONCEPT_REVERSE = {
  "bias-variance": [
    {
      "kind": "demo",
      "slug": "overfitting"
    },
    {
      "kind": "demo",
      "slug": "cross-validation"
    },
    {
      "kind": "demo",
      "slug": "double-descent"
    },
    {
      "kind": "demo",
      "slug": "bias-variance-decomp"
    },
    {
      "kind": "demo",
      "slug": "bagging-boosting"
    },
    {
      "kind": "demo",
      "slug": "knn"
    },
    {
      "kind": "module",
      "slug": "ml-theory"
    },
    {
      "kind": "module",
      "slug": "interview-capstone"
    }
  ],
  "cross-validation": [
    {
      "kind": "demo",
      "slug": "cross-validation"
    },
    {
      "kind": "module",
      "slug": "interview-capstone"
    }
  ],
  "classification-metrics": [
    {
      "kind": "demo",
      "slug": "classification-metrics"
    },
    {
      "kind": "module",
      "slug": "interview-capstone"
    }
  ],
  "dynamic-programming": [
    {
      "kind": "demo",
      "slug": "dtw"
    },
    {
      "kind": "demo",
      "slug": "knapsack"
    },
    {
      "kind": "demo",
      "slug": "branch-and-bound"
    },
    {
      "kind": "demo",
      "slug": "edit-distance"
    },
    {
      "kind": "demo",
      "slug": "complexity-growth"
    },
    {
      "kind": "demo",
      "slug": "integral-image"
    },
    {
      "kind": "module",
      "slug": "interview-capstone"
    }
  ],
  "graph-search": [
    {
      "kind": "demo",
      "slug": "dijkstra"
    },
    {
      "kind": "demo",
      "slug": "max-flow"
    },
    {
      "kind": "demo",
      "slug": "branch-and-bound"
    },
    {
      "kind": "demo",
      "slug": "bfs-dfs-astar"
    },
    {
      "kind": "demo",
      "slug": "complexity-growth"
    },
    {
      "kind": "module",
      "slug": "interview-capstone"
    }
  ],
  "reranking": [
    {
      "kind": "demo",
      "slug": "rag-reranker"
    },
    {
      "kind": "module",
      "slug": "interview-capstone"
    }
  ]
};
