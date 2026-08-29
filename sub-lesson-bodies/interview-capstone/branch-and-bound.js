// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/interview-capstone/branch-and-bound/.
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
  "conceptId": "branch-and-bound",
  "lesson": {
    "title": "Branch & Bound",
    "oneLine": "Search the whole tree in principle, and skip almost all of it in practice — the bound does the work, not the branching.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Branch and bound is exhaustive search that refuses to explore subtrees it can prove are hopeless. Branching splits the problem — include this item or do not — and bounding computes an optimistic estimate of the best value reachable anywhere below the current node. If that optimistic estimate is no better than the best complete solution already found, the entire subtree is discarded without being visited.",
          "The guarantee survives because the bound is a genuine over-estimate for a maximisation problem: nothing below can beat it, so nothing worth having is lost. This is the difference between branch and bound and a heuristic — the answer is provably optimal, only the runtime is uncertain.",
          "On a 24-item knapsack with capacity 220, enumerating every subset visits 8,491,277 nodes. Branch and bound with the standard fractional relaxation as its bound visits 87 and returns the identical optimum of 589. That is 0.001 percent of the tree, roughly a 97,600-fold reduction, and it is entirely attributable to the quality of the bound."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "For the knapsack the bound comes from relaxing the integrality constraint. The fractional knapsack is solved exactly by greedy on value density, so it is both cheap and a valid upper bound on the integer problem:"
        ],
        "tex": "\\text{bound}(node) = v + \\max_{0 \\le f_j \\le 1}\\ \\sum_{j \\in \\text{remaining}} f_j v_j \\ \\ \\text{s.t.}\\ \\sum_j f_j w_j \\le C - w \\ \\ \\ge\\ \\text{OPT}(node)",
        "texNote": "This is the general recipe: relax a constraint until the problem becomes easy, and the relaxed optimum bounds the true one. Linear-programming relaxation of an integer program is the same idea and is what every MILP solver runs at each node."
      },
      {
        "h": "In code",
        "code": "def knapsack_bb(items, cap):\n    # order by value density: makes the fractional bound tight and finds good\n    # incumbents early, which is what makes the pruning bite\n    items = sorted(items, key=lambda it: it.v / it.w, reverse=True)\n    best = 0\n\n    def bound(i, w, v):\n        bw, bv = w, v\n        for j in range(i, len(items)):\n            if bw + items[j].w <= cap:\n                bw += items[j].w; bv += items[j].v\n            else:\n                bv += (cap - bw) * items[j].v / items[j].w   # fractional tail\n                break\n        return bv\n\n    def rec(i, w, v):\n        nonlocal best\n        best = max(best, v)\n        if i == len(items):\n            return\n        if bound(i, w, v) <= best:      # PRUNE: nothing below can beat the incumbent\n            return\n        if w + items[i].w <= cap:\n            rec(i + 1, w + items[i].w, v + items[i].v)   # take it (explore first)\n        rec(i + 1, w, v)                                 # leave it\n    rec(0, 0, 0)\n    return best",
        "caption": "Two ordering decisions do most of the work: sorting by density makes the bound tight, and exploring the take branch first raises the incumbent early so later bounds have something to be compared against."
      },
      {
        "h": "What it does not promise",
        "paras": [
          "Worst-case complexity is unchanged. Branch and bound on an NP-hard problem is still exponential in the worst case, and adversarial instances exist for every bound — the 97,600-fold reduction above is a property of that instance and that bound, not a theorem.",
          "Everything therefore rests on two design choices. A weak bound prunes nothing and you have paid extra to run brute force. A bad incumbent early on means there is nothing to prune against, which is why practical solvers spend real effort on a primal heuristic before searching, and why depth-first is the usual node order: it reaches complete solutions fastest and so produces an incumbent soonest.",
          "The pattern generalises well beyond toy problems. Alpha-beta pruning is branch and bound on a game tree. Modern MILP solvers are branch and bound with LP relaxation bounds plus cutting planes. And it is the honest answer to an interview question about optimal subset selection, where the expected answer is dynamic programming but the constraints often do not fit a table."
        ]
      }
    ],
    "takeaways": [
      "Prune a subtree when its optimistic bound cannot beat the incumbent; the optimum is preserved exactly, so this is an exact method and not a heuristic.",
      "Measured: 87 nodes against 8,491,277 for brute force on a 24-item knapsack, same optimum — the bound quality, not the branching, produces that.",
      "Worst case is still exponential. A weak bound or a late first incumbent turns it back into brute force with overhead."
    ],
    "demo": "branch-and-bound"
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
  "index": 7,
  "prev": "simulated-annealing",
  "next": "arc-consistency"
};
