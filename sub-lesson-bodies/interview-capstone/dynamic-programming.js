// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/interview-capstone/dynamic-programming/.
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
  "conceptId": "dynamic-programming",
  "lesson": {
    "title": "Dynamic Programming",
    "oneLine": "Overlapping subproblems plus optimal substructure - and the ML versions are the same recursion wearing different names.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "DP applies when a problem decomposes into subproblems that RECUR, so a naive recursion recomputes the same answers exponentially often, and when an optimal solution is built from optimal solutions to those subproblems. Memoize or fill a table and the exponential collapses to polynomial.",
          "For an ML candidate the payoff is recognizing it outside the coding round. Viterbi is DP over a trellis. Edit distance underpins word error rate. The Bellman equation is DP over states - value iteration IS the table fill. Preparing this pattern and its ML homes together halves the cost of two interview rounds."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "The recurrence is the whole algorithm; the table is an implementation detail:"
        ],
        "tex": "D[i][j] = \\min\\big(D[i-1][j] + 1,\\; D[i][j-1] + 1,\\; D[i-1][j-1] + \\mathbb{1}[a_i \\neq b_j]\\big)",
        "texNote": "Edit distance in one line - delete, insert, or substitute-if-different."
      },
      {
        "h": "In code",
        "code": "def edit_distance(a, b):\n    prev = list(range(len(b) + 1))\n    for i, ca in enumerate(a, 1):\n        cur = [i]\n        for j, cb in enumerate(b, 1):\n            cur.append(min(prev[j] + 1, cur[j-1] + 1, prev[j-1] + (ca != cb)))\n        prev = cur\n    return prev[-1]\n\n# Timed in the module on disjoint strings: naive recursion 0.05 -> 1207 ms\n# from L=4 to L=10, while the DP stays ~0.02 ms and handles L=1000 in 0.25 s.",
        "caption": "Only the previous row is needed, so the O(nm) table collapses to O(min(n,m)) space - the standard follow-up."
      },
      {
        "h": "Polynomial in the wrong variable",
        "paras": [
          "The 0/1 knapsack table is n by W and everyone calls it polynomial, but W is the capacity rather than the size of the input. With 100 items the table is 100,000 cells at capacity 1,000, 10^8 cells at capacity 10^6, and 10^11 cells — about 400 GB at four bytes — at capacity 10^9. The capacity is written in log2(W) bits, so the table is exponential in the length of the input, which is why knapsack is still NP-hard and why the term of art is pseudo-polynomial.",
          "The memory is also usually reducible in a way that costs something. Rolling the table down to a single row takes a 1000-by-10^6 problem from 4 GB to 4 MB, but the traceback goes with it: you recover the optimal value and no longer know which items produced it, and recovering them needs either a second pass or the Hirschberg divide-and-conquer trick. Optimal substructure is what makes the recurrence correct; the table's shape is what makes it affordable, and those are separate questions."
        ]
      }
    ],
    "takeaways": [
      "Two conditions: overlapping subproblems AND optimal substructure. Missing either means DP is the wrong tool.",
      "Write the recurrence first; the table or memo is mechanical once it is right.",
      "Viterbi, edit distance and value iteration are the same pattern - prepare them together."
    ],
    "demo": "knapsack"
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
  "index": 1,
  "prev": "classification-metrics",
  "next": "graph-search"
};
