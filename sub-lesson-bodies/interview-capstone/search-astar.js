// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/interview-capstone/search-astar/.
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
  "conceptId": "search-astar",
  "lesson": {
    "title": "A* and Informed Search",
    "oneLine": "Dijkstra with a hint: rank by cost-so-far plus an estimate of cost-to-go, and stay optimal as long as the estimate never over-promises.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Dijkstra explores outward in every direction equally, because it only knows what a path has cost so far. If you also have a rough sense of how far the goal still is, you can spend your exploration budget on the promising side and reach the same answer having opened far fewer nodes.",
          "A* is that idea with one guarantee attached. The estimate must never overstate the remaining cost. If it never over-promises, A* still returns the optimal path; it just gets there faster."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Nodes come off the frontier in order of f, not g — the total estimated cost of a route through this node:"
        ],
        "tex": "f(n) = g(n) + h(n)",
        "texNote": "g is the known cost from the start; h is the heuristic estimate to the goal. h = 0 makes this exactly Dijkstra. h admissible (never over-estimates) keeps the result optimal; h consistent (obeys the triangle inequality) additionally means no node needs reopening."
      },
      {
        "h": "In code",
        "code": "import heapq\n\ndef astar(start, goal, neighbors, cost, h):\n    frontier = [(h(start), 0, start)]\n    best = {start: 0}\n    came = {}\n    while frontier:\n        _, g, node = heapq.heappop(frontier)\n        if node == goal:\n            return best[goal], came\n        if g > best.get(node, float(\"inf\")):\n            continue                      # a better route to this node already ran\n        for nxt in neighbors(node):\n            ng = g + cost(node, nxt)\n            if ng < best.get(nxt, float(\"inf\")):\n                best[nxt] = ng\n                came[nxt] = node\n                heapq.heappush(frontier, (ng + h(nxt), ng, nxt))\n    return None, came",
        "caption": "Delete h and this is Dijkstra. That is the honest way to remember A*: it is one term added to the priority."
      },
      {
        "h": "The trade the heuristic makes",
        "paras": [
          "A stronger heuristic opens fewer nodes but costs more to evaluate, and the useful comparison is total work, not nodes expanded. A perfect heuristic walks straight to the goal and is usually as expensive as solving the problem.",
          "Overestimating breaks optimality but is sometimes the right call: weighted A*, which multiplies h by a factor above one, finds a path bounded by that factor times optimal, far faster. Say which you chose — a route that is 10% long and instant is often the product decision.",
          "The same f = g + h shape reappears in beam search over language models, in branch and bound, and in Monte Carlo tree search's selection rule. Once you recognise 'known cost plus optimistic estimate', you see it everywhere."
        ]
      }
    ],
    "takeaways": [
      "A* is Dijkstra plus a heuristic term in the priority; setting h = 0 recovers Dijkstra exactly.",
      "Admissibility (never over-estimate) is what preserves optimality — it is a property of your estimate, not of the algorithm.",
      "Deliberately over-estimating buys speed for a bounded loss of optimality, which is frequently the right engineering trade."
    ],
    "demo": "pathfinding"
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
  "index": 3,
  "prev": "graph-search",
  "next": "dijkstra"
};
