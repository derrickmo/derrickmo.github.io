// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/interview-capstone/arc-consistency/.
// concept-lesson-app.jsx reads window.DM_SUBLESSON_CTX and falls back to
// window.DM_SUBLESSON(...) so the page still works if this file is ever missing.

window.DM_SUBLESSON_CTX = {
  "module": {
    "title": "Concept by concept",
    "lessons": {
      "classification-metrics": {
        "title": "Classification Metrics"
      },
      "dynamic-programming": {
        "title": "Dynamic Programming"
      },
      "graph-search": {
        "title": "Graph Search"
      },
      "search-astar": {
        "title": "A* and Informed Search"
      },
      "dijkstra": {
        "title": "Dijkstra's Shortest Path"
      },
      "backtracking": {
        "title": "Backtracking & Constraint Satisfaction"
      },
      "simulated-annealing": {
        "title": "Simulated Annealing"
      },
      "branch-and-bound": {
        "title": "Branch & Bound"
      },
      "arc-consistency": {
        "title": "Arc Consistency (AC-3)"
      },
      "mst": {
        "title": "Minimum Spanning Tree"
      },
      "max-flow": {
        "title": "Max Flow / Min Cut"
      }
    }
  },
  "moduleSlug": "interview-capstone",
  "conceptId": "arc-consistency",
  "lesson": {
    "title": "Arc Consistency (AC-3)",
    "oneLine": "Delete values that provably cannot appear in any solution — a cheap pre-filter that prunes hard, and decides nothing.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "A constraint satisfaction problem is variables, domains, and constraints between them. Backtracking search assigns a variable, checks consistency, and undoes the assignment on failure — correct, and prone to rediscovering the same contradiction in thousands of different subtrees.",
          "Arc consistency attacks that waste before and during the search. An arc from X to Y is consistent when every remaining value of X has at least one compatible partner left in Y. If some value of X has no support anywhere in Y, no solution can ever use it, so it is deleted outright. Deleting it may strip the support of a neighbour, so the affected arcs are pushed back onto a queue and the pruning propagates.",
          "Measured over 40 random 3-colouring instances on 28-node graphs, plain forward checking explored 2,686 search nodes in total while maintaining arc consistency at every step explored 544 — 4.9 times fewer, with identical answers on all 40 instances."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "The definition of an arc being consistent — every surviving value at the tail must have at least one partner at the head:"
        ],
        "tex": "\\text{arc } (X_i, X_j) \\text{ is consistent} \\iff \\forall\\, a \\in D_i\\ \\ \\exists\\, b \\in D_j : (a,b) \\in C_{ij}",
        "texNote": "Enforcing this over the whole problem costs O(e d^3) for e arcs and domain size d: each arc can be re-queued once per value deleted at the other end, giving d revisions per arc, and each revision costs d squared to check every pair. Polynomial — which is exactly why it is worth running inside an exponential search."
      },
      {
        "h": "In code",
        "code": "from collections import deque\n\ndef revise(domains, i, j, compatible):\n    \"\"\"Drop values of i that have no support left in j.\"\"\"\n    removed = False\n    for a in list(domains[i]):\n        if not any(compatible(a, b) for b in domains[j]):\n            domains[i].discard(a)\n            removed = True\n    return removed\n\ndef ac3(domains, arcs, neighbours, compatible):\n    queue = deque(arcs)\n    while queue:\n        i, j = queue.popleft()\n        if revise(domains, i, j, compatible):\n            if not domains[i]:\n                return False                      # a wipe-out proves unsatisfiability\n            for k in neighbours[i]:\n                if k != j:\n                    queue.append((k, i))          # i shrank, so re-check its supporters\n    return True",
        "caption": "Only arcs pointing INTO the shrunken variable go back on the queue, and the arc just processed is excluded. Re-queueing everything is still correct but wastes most of the work.",
        "paras": [
          "The same routine plays two roles depending on when you call it. Run once before search it is a preprocessor that shrinks the domains you are about to search. Run again after every assignment it becomes MAC — maintaining arc consistency — which is what the 4.9-fold reduction above measured."
        ]
      },
      {
        "h": "The limit that catches people",
        "paras": [
          "Arc consistency is a filter, not a decision procedure. An arc-consistent problem can still be unsatisfiable, and the smallest example is a triangle with two colours: every vertex keeps both colours, every arc is consistent because each value has a partner at the other end, AC-3 reports success — and no valid colouring exists. Verified directly: AC-3 passes the instance with all three domains at size 2, and search then proves it unsatisfiable.",
          "The reason is that arc consistency only ever examines two variables at a time. The contradiction in a triangle is genuinely three-way, so no amount of pairwise reasoning can see it. Path consistency and the k-consistency hierarchy extend the reasoning to larger groups, at rapidly rising cost, and full n-consistency is just solving the problem.",
          "So the useful framing is a cost trade rather than a correctness one. Enforcing arc consistency costs polynomial time per node and reduces an exponential search; enforce too little and you search too much, enforce too much and the filtering costs more than the search it saves. MAC with arc consistency is the usual sweet spot, and it is the default in real CSP solvers for that reason."
        ]
      }
    ],
    "takeaways": [
      "A value with no support at the far end of any arc cannot appear in a solution, so deleting it is safe; deletions propagate through a queue of affected arcs.",
      "Maintaining arc consistency during search cut 3-colouring from 2,686 nodes to 544 across 40 instances, with identical answers.",
      "It prunes but does not decide: a two-coloured triangle is fully arc-consistent and unsatisfiable, because pairwise reasoning cannot see a three-way contradiction."
    ],
    "demo": "graph-coloring"
  },
  "order": [
    "classification-metrics",
    "dynamic-programming",
    "graph-search",
    "search-astar",
    "dijkstra",
    "backtracking",
    "simulated-annealing",
    "branch-and-bound",
    "arc-consistency",
    "mst",
    "max-flow"
  ],
  "index": 8,
  "prev": "branch-and-bound",
  "next": "mst"
};
