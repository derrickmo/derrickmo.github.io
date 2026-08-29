// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/interview-capstone/max-flow/.
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
  "conceptId": "max-flow",
  "lesson": {
    "title": "Max Flow / Min Cut",
    "oneLine": "The most you can push equals the cheapest thing you can sever — one theorem that turns matching, segmentation and scheduling into the same problem.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Model a network as edges with capacities, and ask how much can flow from a source to a sink without exceeding any capacity and without accumulating anywhere in between. Separately, ask which set of edges is cheapest to cut so that no path from source to sink survives. The max-flow min-cut theorem says these two numbers are always equal.",
          "One direction is obvious: every unit of flow must cross every cut, so no flow can exceed any cut's capacity. The surprising direction is that the bound is always achieved — there is always a cut as small as the maximum flow. Verified on the standard textbook network: maximum flow 23, minimum cut 23, with the cut consisting of edges of capacity 12, 7 and 4.",
          "Ford-Fulkerson finds both at once. Repeatedly find any source-to-sink path with spare capacity and push as much as it allows, recording backward residual edges so later iterations can undo earlier commitments. When no such path remains, the flow is maximum — and the vertices still reachable from the source in the residual graph define exactly the minimum cut. You get the certificate for free."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "The theorem, and the residual capacity that drives the algorithm:"
        ],
        "tex": "\\max_{f} |f| = \\min_{(S,T)} c(S,T) = \\min_{(S,T)} \\sum_{u \\in S,\\, v \\in T} c(u,v), \\qquad c_f(u,v) = c(u,v) - f(u,v) + f(v,u)",
        "texNote": "The backward term is what makes it work. Allowing flow to be pushed back along an edge lets the algorithm revise a bad earlier routing, which is why a purely greedy forward-only search is not enough. Using shortest augmenting paths — Edmonds-Karp — bounds the iteration count at O(VE) independent of the capacities."
      },
      {
        "h": "In code",
        "code": "from collections import deque\n\ndef max_flow(cap, s, t):                   # cap: dict-of-dicts, mutated into residual\n    flow = 0\n    while True:\n        parent = {s: s}\n        q = deque([s])\n        while q and t not in parent:       # BFS => shortest augmenting path (Edmonds-Karp)\n            u = q.popleft()\n            for v, c in cap[u].items():\n                if c > 0 and v not in parent:\n                    parent[v] = u\n                    q.append(v)\n        if t not in parent:\n            break\n        bottleneck, v = float(\"inf\"), t\n        while v != s:\n            bottleneck = min(bottleneck, cap[parent[v]][v]); v = parent[v]\n        v = t\n        while v != s:\n            cap[parent[v]][v] -= bottleneck\n            cap[v][parent[v]] = cap[v].get(parent[v], 0) + bottleneck   # residual\n            v = parent[v]\n        flow += bottleneck\n    return flow, parent            # vertices reachable at the end = the min cut's S side",
        "caption": "BFS rather than DFS is not a stylistic choice. With DFS and adversarial capacities the iteration count can depend on the capacity VALUES; BFS bounds it by the graph size alone.",
        "paras": [
          "The residual edge is the part people omit when writing this from memory, and omitting it produces an algorithm that returns a maximal flow rather than a maximum one — plausible, and wrong."
        ]
      },
      {
        "h": "The reductions are the point",
        "paras": [
          "Bipartite matching is a flow problem. Add a source joined to every left vertex with capacity one, a sink joined from every right vertex with capacity one, and unit capacities on the original edges. The maximum flow is the maximum matching, because unit capacities force each vertex to be used at most once. Verified against brute-force enumeration on a random bipartite graph: both gave 4. And the minimum cut came out at 4 as well — that is König's theorem, maximum matching equals minimum vertex cover, falling out of the same computation.",
          "Image segmentation is a flow problem. Nodes are pixels, source and sink represent foreground and background, edges to the terminals encode per-pixel likelihood and edges between neighbours encode a smoothness penalty. The minimum cut is then the segmentation minimising the combined energy — this is GrabCut, and it is why graph cuts dominated interactive segmentation before deep learning.",
          "Project selection, baseball elimination, and scheduling with constraints all reduce the same way. The practical skill is recognising the shape: a problem is a flow problem when it has two sides, a per-unit capacity, and a conflict that forces a choice.",
          "The limit worth knowing is that this is a two-label technique. Cuts separate a graph into two parts, so the exact-minimisation guarantee applies to binary labelling. Multi-label problems use alpha-expansion, which repeatedly solves binary sub-problems and gives an approximation with a bounded ratio rather than the exact answer."
        ]
      }
    ],
    "takeaways": [
      "Max flow equals min cut always — verified at 23 on the textbook network — and the residual graph hands you the optimal cut as a by-product of computing the flow.",
      "Backward residual edges are what let the algorithm revise earlier routing; without them you get a maximal flow, not a maximum one.",
      "Bipartite matching, König's theorem and binary image segmentation are all the same computation; the exactness guarantee is limited to two labels."
    ],
    "demo": "max-flow"
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
  "index": 10,
  "prev": "mst",
  "next": null
};
