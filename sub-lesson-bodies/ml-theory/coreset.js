// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/ml-theory/coreset/.
// concept-lesson-app.jsx reads window.DM_SUBLESSON_CTX and falls back to
// window.DM_SUBLESSON(...) so the page still works if this file is ever missing.

window.DM_SUBLESSON_CTX = {
  "module": {
    "title": "Machine Learning Theory",
    "lessons": {
      "regularization": {
        "title": "Regularization"
      },
      "double-descent": {
        "title": "Double Descent"
      },
      "overfitting": {
        "title": "Overfitting & Generalization"
      },
      "newtons-method": {
        "title": "Newton's Method & Second-Order Optimization"
      },
      "active-learning": {
        "title": "Active Learning"
      },
      "coordinate-descent": {
        "title": "Coordinate Descent"
      },
      "proximal-gradient": {
        "title": "Proximal Gradient & Soft-Thresholding (ISTA/FISTA)"
      },
      "quasi-newton": {
        "title": "Quasi-Newton Methods (BFGS / L-BFGS)"
      },
      "coreset": {
        "title": "Coresets"
      },
      "dataset-distillation": {
        "title": "Dataset Distillation"
      }
    }
  },
  "moduleSlug": "ml-theory",
  "conceptId": "coreset",
  "lesson": {
    "title": "Coresets",
    "oneLine": "A small weighted subset that provably approximates the full dataset's objective — and the weights are what make it unbiased.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Training on a random subset is the obvious way to work with less data, and it fails in a specific way: uniform sampling reproduces the frequent parts of a dataset and misses the rare ones. If a rare region matters to the objective — and it usually does, since rare points are typically the expensive ones — the subset gives a systematically wrong answer.",
          "A coreset fixes this with two ideas together. Sample points in proportion to their SENSITIVITY, a measure of how much any solution's cost could depend on that point, so rare and costly points are over-represented. Then assign each sampled point a weight inversely proportional to its sampling probability, which removes the bias that over-sampling introduced. The result is a weighted subset whose objective approximates the full objective to within a factor of one plus epsilon, for every candidate solution simultaneously.",
          "That last part is what makes it a coreset rather than a sample. The guarantee is uniform over solutions, so you can run any algorithm on the coreset — including one that searches — and the answer transfers."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "The defining guarantee, and the sensitivity that drives the sampling:"
        ],
        "tex": "\\forall\\, Q:\\ (1-\\varepsilon)\\,\\mathrm{cost}(P, Q) \\le \\mathrm{cost}(C, Q) \\le (1+\\varepsilon)\\,\\mathrm{cost}(P, Q), \\qquad s(p) = \\sup_{Q} \\frac{\\mathrm{cost}(p, Q)}{\\mathrm{cost}(P, Q)}",
        "texNote": "The for-all is the whole point. A uniform sample gives an unbiased estimate of the cost of a FIXED solution, which is useless when you intend to optimise — the optimiser will find the solution the sample happens to favour. Sensitivity is bounded in practice via a cheap bicriteria approximation rather than computed exactly."
      },
      {
        "h": "In code",
        "code": "import numpy as np\n\ndef kmeans_coreset(X, k, m, rng):\n    # 1. cheap bicriteria solution - a few rounds of k-means++ is enough\n    centres = kmeans_pp(X, k, rng)\n    d2 = ((X[:, None, :] - centres[None]) ** 2).sum(-1).min(1)\n    labels = ((X[:, None, :] - centres[None]) ** 2).sum(-1).argmin(1)\n    counts = np.bincount(labels, minlength=k)\n\n    # 2. sensitivity upper bound: cost share PLUS a per-cluster floor. The floor is what\n    #    guarantees a tiny cluster still gets sampled even when its cost share is small.\n    sens = d2 / d2.sum() + 1.0 / (k * counts[labels])\n    p = sens / sens.sum()\n\n    idx = rng.choice(len(X), size=m, p=p)\n    weights = 1.0 / (m * p[idx])      # unbiasing weights - omitting these is the bug\n    return X[idx], weights\n\n# Then run WEIGHTED k-means on (X[idx], weights). Passing the points without the weights\n# gives a result biased toward exactly the rare regions you over-sampled.",
        "caption": "The per-cluster floor in the sensitivity is easy to drop and is what protects small clusters. Without it the bound is not valid and small structure is lost again."
      },
      {
        "h": "Measured against uniform sampling",
        "paras": [
          "Six thousand points in five clusters, one of which holds only fifty points and sits far from the rest — the situation coresets exist for. The full-data k-means objective is 12,348, computed with k-means++ and twelve restarts so the comparison is not local-minimum noise.",
          "At 20 points, a uniform sample gives a median objective of 38,515 while the coreset gives 15,459 — a relative error of 25 percent against roughly 212 percent. At 50 points it is 14,346 against 13,007. At 100, 13,223 against 12,882. At 300, 12,569 against 12,450, a relative error of 0.8 percent from five percent of the data.",
          "The mechanism is visible directly: at size 50, a uniform sample misses the fifty-point far cluster entirely in 70 percent of draws. When it misses, k-means places no centre there and the objective is dominated by that one error. Sensitivity sampling makes those points among the most likely to be drawn, and the weights keep the estimate honest.",
          "Two honest limits. The guarantees are strongest for the problems they were derived for — k-means, k-median, linear regression, logistic regression, some SVMs — and coreset constructions for deep networks are heuristic, usually gradient-matching or submodular selection, without the uniform-over-solutions guarantee. And coreset size typically grows with the dimension and with one over epsilon squared, so a tight approximation in high dimensions may not be much smaller than the data. Check the size the construction actually needs before assuming a coreset helps."
        ]
      }
    ],
    "takeaways": [
      "A coreset approximates the objective for EVERY candidate solution, not just a fixed one — which is what makes it safe to optimise on, unlike a uniform sample.",
      "Sample by sensitivity and reweight by the inverse probability: at 300 of 6,000 points the objective was within 0.8% of optimal, where uniform sampling missed a rare cluster in 70% of draws.",
      "The guarantees cover classical objectives; deep-learning coresets are heuristic, and coreset size grows with dimension and 1/eps^2, so verify it is actually smaller."
    ],
    "demo": "coreset"
  },
  "order": [
    "regularization",
    "double-descent",
    "overfitting",
    "newtons-method",
    "active-learning",
    "coordinate-descent",
    "proximal-gradient",
    "quasi-newton",
    "coreset",
    "dataset-distillation"
  ],
  "index": 8,
  "prev": "quasi-newton",
  "next": "dataset-distillation"
};
