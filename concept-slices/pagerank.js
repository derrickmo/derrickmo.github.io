// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/pagerank/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
  "pagerank": {
    "id": "pagerank",
    "name": "PageRank",
    "area": "Graphs",
    "summary": "Rank nodes by the importance of the nodes linking to them, resolved by power iteration: PR_i = (1-d)/N + d·Σ_{j→i} PR_j/outdeg_j (plus dangling mass). It is the stationary distribution of a random surfer who follows a link with probability d and teleports otherwise — the teleport makes the chain ergodic so a unique answer exists. Mathematically the dominant eigenvector of the damped transition matrix. Launched Google; reused for citation ranking, recommendation, spam detection, and TextRank.",
    "tex": "PR_i = \\frac{1-d}{N} + d \\sum_{j \\to i} \\frac{PR_j}{\\mathrm{outdeg}(j)}",
    "prereqs": [
      "markov"
    ],
    "leadsTo": [
      "community-detection"
    ]
  },
  "markov": {
    "id": "markov",
    "name": "Markov / n-gram Models",
    "area": "NLP",
    "summary": "Predict the next token from the last n — the lookup-table ancestor of every LLM.",
    "leadsTo": [
      "transformer-block",
      "hmm-viterbi",
      "successor-representation",
      "pagerank"
    ],
    "prereqs": []
  },
  "community-detection": {
    "id": "community-detection",
    "name": "Community Detection (Louvain)",
    "area": "Graphs",
    "summary": "Partition a network into densely-connected groups by maximizing modularity Q = Σ_c [ in_c/2m − (tot_c/2m)² ] — how many more edges fall inside communities than chance predicts. Louvain's local-moving phase greedily relocates each node to the neighbor community that most raises Q, then collapses communities into super-nodes and repeats. Fast and widely used (Leiden is the improved successor), but Q has many near-equal optima and a resolution limit that can merge small real communities. The graph analogue of clustering.",
    "prereqs": [
      "pagerank"
    ],
    "leadsTo": []
  }
};
window.CONCEPT_REVERSE = {
  "pagerank": [
    {
      "kind": "demo",
      "slug": "pagerank"
    },
    {
      "kind": "demo",
      "slug": "louvain"
    }
  ]
};
