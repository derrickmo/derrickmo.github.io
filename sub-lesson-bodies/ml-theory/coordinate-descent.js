// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/ml-theory/coordinate-descent/.
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
  "conceptId": "coordinate-descent",
  "lesson": {
    "title": "Coordinate Descent",
    "oneLine": "Optimise one variable at a time. It is why lasso paths are cheap — and it silently stalls the moment the penalty stops being separable.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Freeze every coordinate but one, minimise exactly along that single direction, move to the next, repeat. There is no step size, no line search, and no gradient of the full objective — for the lasso the one-dimensional subproblem has a closed form, so each update is a dot product and a soft-threshold.",
          "That is the whole reason glmnet made L1 regression routine. Three properties compound: most coordinates are zero and stay zero, so a sweep touches an active set far smaller than p; the residual can be updated incrementally instead of recomputed; and when you fit a whole regularisation path you warm-start each lambda from the previous solution, which lands a few sweeps away rather than a few hundred.",
          "On a lasso with 200 samples, 50 features and 5 truly non-zero coefficients, cyclic coordinate descent converges in 10 sweeps and recovers exactly those 5. Make the features strongly correlated — the realistic case, and the one that hurts — and the same problem takes 372 sweeps. Correlation is what coordinate descent pays for, because axis-aligned moves cannot follow a diagonal valley."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "For the lasso, minimising over the single coordinate j with the others held fixed gives a closed-form update. Write the partial residual with j removed, correlate it with column j, and soft-threshold:"
        ],
        "tex": "\\beta_j \\leftarrow \\frac{S\\!\\left(\\sum_i x_{ij}\\,(y_i - \\hat{y}_i^{(-j)}),\\ \\lambda\\right)}{\\sum_i x_{ij}^2}, \\qquad S(z,\\lambda) = \\operatorname{sign}(z)\\,(|z| - \\lambda)_+",
        "texNote": "The soft-threshold is what produces exact zeros: any coordinate whose correlation with the partial residual is smaller than lambda is set to zero outright, not merely shrunk. Ridge has the same update without the S, which is why ridge never zeroes anything."
      },
      {
        "h": "In code",
        "code": "import numpy as np\n\ndef soft(z, t):\n    return np.sign(z) * np.maximum(np.abs(z) - t, 0.0)\n\ndef lasso_cd(X, y, lam, sweeps=1000, tol=1e-10):\n    n, p = X.shape\n    beta = np.zeros(p)\n    resid = y.copy()                 # keep the residual, never recompute it\n    colsq = (X ** 2).sum(axis=0)\n    for _ in range(sweeps):\n        move = 0.0\n        for j in range(p):\n            old = beta[j]\n            # add column j back in, then re-solve for it exactly\n            rho = X[:, j] @ (resid + X[:, j] * old)\n            beta[j] = soft(rho, lam) / colsq[j]\n            if beta[j] != old:\n                resid -= X[:, j] * (beta[j] - old)\n                move = max(move, abs(beta[j] - old))\n        if move < tol:\n            break\n    return beta",
        "caption": "The incremental residual update is the whole trick — without it each coordinate step costs a full matrix-vector product and the method loses to proximal gradient."
      },
      {
        "h": "Where it stalls, and why",
        "paras": [
          "Coordinate descent is guaranteed to converge when the objective is a smooth convex function plus a penalty that is SEPARABLE across coordinates — a sum of per-coordinate terms. The L1 penalty qualifies. That condition is not a technicality; violate it and the method stops at a point that is not a minimum.",
          "The smallest witness: minimise one half of the squared distance to c = (3, 1) plus three times the absolute difference between the two coordinates — a two-variable fused lasso. Started at the origin, no single-coordinate move improves the objective, so coordinate descent reports the origin as its answer with value 5. The true minimum is at (2, 2) with value 1. It is not slow convergence; it is a fixed point that is not optimal, and nothing in the iteration reveals the problem.",
          "The fix is to stop moving one coordinate at a time: group the coupled variables and solve the block jointly, or use a method that takes non-axis-aligned steps. Fused lasso and total-variation problems are exactly the ones that need this, and it is the standard trap when someone reaches for coordinate descent because it worked so well on the plain lasso."
        ]
      }
    ],
    "takeaways": [
      "The lasso's one-dimensional subproblem is a soft-threshold in closed form, which is why coordinate descent — with warm starts along the path and an incrementally updated residual — is the default L1 solver.",
      "Correlated features are the cost: the same problem went from 10 sweeps to 372 when the design was made strongly correlated, because axis-aligned steps cannot follow a diagonal valley.",
      "Convergence needs the non-smooth penalty to be SEPARABLE. On a two-variable fused lasso it halts at a value of 5 when the optimum is 1 — a wrong answer, not a slow one."
    ],
    "demo": "coordinate-descent"
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
  "index": 5,
  "prev": "active-learning",
  "next": "proximal-gradient"
};
