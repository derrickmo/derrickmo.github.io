// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/interview-capstone/simulated-annealing/.
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
  "conceptId": "simulated-annealing",
  "lesson": {
    "title": "Simulated Annealing",
    "oneLine": "Accept worse moves on purpose, less and less often — the simplest escape from a local minimum that still works.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Hill climbing gets stuck the moment every neighbour is worse, which on a rugged landscape happens almost immediately and almost always at a mediocre point. Simulated annealing fixes it with one change: sometimes take the worse move anyway.",
          "How often depends on a temperature that starts high and cools. Early on the search wanders almost freely and explores the shape of the space; late on it accepts almost nothing worse and behaves like hill climbing. The name is the metaphor — cool a metal slowly and its atoms settle into a low-energy crystal; quench it and they freeze into whatever disordered state they were in."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "The Metropolis acceptance rule: always take an improvement, and take a worsening of size ΔE with probability"
        ],
        "tex": "P(\\text{accept}) = \\exp\\!\\left(-\\frac{\\Delta E}{T}\\right)",
        "texNote": "Two things follow directly. A slightly worse move is accepted far more often than a much worse one, so the search does not thrash. And as T falls the same ΔE becomes exponentially less acceptable, so the search tightens automatically without any extra logic."
      },
      {
        "h": "In code",
        "code": "import math, random\n\ndef anneal(state, energy, neighbour, T0=1.0, cool=0.995, steps=20000):\n    best = cur = state\n    e_cur = e_best = energy(state)\n    T = T0\n    for _ in range(steps):\n        cand = neighbour(cur)\n        e = energy(cand)\n        # Always accept an improvement; accept a worsening with prob exp(-dE/T).\n        if e < e_cur or random.random() < math.exp(-(e - e_cur) / max(T, 1e-12)):\n            cur, e_cur = cand, e\n            if e < e_best: best, e_best = cand, e   # keep the best EVER seen\n        T *= cool\n    return best",
        "caption": "Return the best state ever visited, not the final one. The walk can and does end somewhere worse than where it has been — forgetting this is the most common bug in an otherwise correct implementation."
      },
      {
        "h": "What actually determines whether it works",
        "paras": [
          "The neighbour function, far more than the schedule. It defines the landscape the search moves on, and a move that changes too much makes every step a random restart while one that changes too little makes the space effectively disconnected. On the travelling salesman problem, 2-opt (reverse a segment) works and 'swap two random cities' barely does — same objective, same schedule, different geometry.",
          "There is a theoretical guarantee of reaching the global optimum with a logarithmic cooling schedule, and it is useless in practice: it is slower than enumerating the space. Everyone uses geometric cooling, which has no such guarantee and works.",
          "Its real appeal is that it needs almost nothing — no gradient, no convexity, no structure beyond an energy and a notion of neighbour — so it applies where nothing else does: scheduling, layout, routing, and any discrete configuration problem where you can score a state and perturb it."
        ]
      }
    ],
    "takeaways": [
      "Accepting worse moves with probability exp(−ΔE/T) is what escapes local minima; cooling is what makes it converge.",
      "Return the best state ever seen — the final state is frequently worse.",
      "The neighbour function defines the landscape and matters more than the cooling schedule."
    ],
    "demo": "simulated-annealing"
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
  "index": 6,
  "prev": "backtracking",
  "next": "branch-and-bound"
};
