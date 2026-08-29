// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/ml-theory/proximal-gradient/.
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
  "conceptId": "proximal-gradient",
  "lesson": {
    "title": "Proximal Gradient & Soft-Thresholding (ISTA/FISTA)",
    "oneLine": "Take a gradient step on the smooth part, then apply the penalty exactly — and add momentum only once you know the problem is ill-conditioned.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Many objectives split into a smooth part you can differentiate and a non-smooth part you cannot — least squares plus an L1 penalty, a likelihood plus a nuclear norm, a loss plus an indicator that keeps you inside a set. Subgradient descent handles these but converges slowly and never produces exact zeros, because a subgradient step lands on a zero only by accident.",
          "Proximal gradient splits the work. Take an ordinary gradient step on the smooth part, then apply the proximal operator of the non-smooth part, which asks: what is the nearest point that trades distance against penalty? For the L1 norm that operator is soft-thresholding, so every iteration produces genuinely sparse iterates. Applied to the lasso this is ISTA, iterative shrinkage-thresholding.",
          "The projected gradient method you already know is the same algorithm: when the non-smooth part is the indicator of a convex set, its proximal operator is exactly projection onto that set."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "The proximal operator, and the resulting iteration for f smooth with L-Lipschitz gradient plus g non-smooth:"
        ],
        "tex": "\\operatorname{prox}_{tg}(v) = \\arg\\min_x \\left\\{ g(x) + \\tfrac{1}{2t}\\lVert x - v \\rVert^2 \\right\\}, \\qquad x^{k+1} = \\operatorname{prox}_{tg}\\!\\left(x^k - t\\nabla f(x^k)\\right)",
        "texNote": "With g the L1 norm the prox is the soft-threshold at level t*lambda; with g the indicator of a set it is Euclidean projection; with g identically zero it is plain gradient descent. A step size t = 1/L is always safe and gives an O(1/k) rate."
      },
      {
        "h": "In code",
        "code": "import numpy as np\n\ndef soft(v, t):\n    return np.sign(v) * np.maximum(np.abs(v) - t, 0.0)\n\ndef fista(X, y, lam, iters=1000, accelerate=True):\n    L = np.linalg.norm(X.T @ X, 2)          # Lipschitz constant of the gradient\n    x = np.zeros(X.shape[1])\n    z, t = x.copy(), 1.0\n    for _ in range(iters):\n        grad = X.T @ (X @ z - y)\n        x_new = soft(z - grad / L, lam / L)  # gradient step, then prox\n        if accelerate:\n            t_new = (1 + np.sqrt(1 + 4 * t * t)) / 2\n            z = x_new + ((t - 1) / t_new) * (x_new - x)   # Nesterov extrapolation\n            t = t_new\n        else:\n            z = x_new\n        x = x_new\n    return x",
        "caption": "Setting accelerate=False gives ISTA. The only difference is the extrapolation step, which costs one vector operation and no extra gradient."
      },
      {
        "h": "When acceleration actually pays",
        "paras": [
          "ISTA converges at O(1/k) and FISTA at O(1/k squared), and it is tempting to always reach for FISTA. Measured on a well-conditioned random design — 200 samples, 50 features, uncorrelated — ISTA needed 25 iterations to reach the optimum and FISTA needed 26. No speedup at all. The asymptotic rate is irrelevant when the problem is easy enough that you never get to the asymptote.",
          "Rebuild the same problem with strongly correlated columns, a condition number in the thousands, and the gap opens exactly as advertised: ISTA takes 5,020 iterations to reach the objective FISTA reaches in 642, a factor of 7.8. Watching the suboptimality directly is clearer still — after 1,000 iterations ISTA is 3.6 away from optimal and FISTA is 1.7e-5 away.",
          "Two practical notes. FISTA is not monotone: the objective can rise on individual iterations, which looks like a bug and is not, though monotone variants exist if you need the guarantee. And on the lasso specifically, coordinate descent beat both on the same ill-conditioned problem, converging in 372 sweeps — acceleration closes the gap to coordinate descent, it does not overturn it."
        ]
      }
    ],
    "takeaways": [
      "Proximal gradient = gradient step on the smooth part, then the proximal operator of the non-smooth part; L1 gives soft-thresholding, a set indicator gives projection, zero gives plain gradient descent.",
      "The O(1/k) to O(1/k^2) improvement is real but conditional: on a well-conditioned lasso ISTA took 25 iterations and FISTA 26, while on an ill-conditioned one it was 5,020 against 642.",
      "FISTA's objective is not monotone — a rising loss on some iterations is expected behaviour, not a broken implementation."
    ],
    "demo": "ista"
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
  "index": 6,
  "prev": "coordinate-descent",
  "next": "quasi-newton"
};
