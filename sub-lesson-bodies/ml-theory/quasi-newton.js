// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/ml-theory/quasi-newton/.
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
  "conceptId": "quasi-newton",
  "lesson": {
    "title": "Quasi-Newton Methods (BFGS / L-BFGS)",
    "oneLine": "Build curvature from the gradients you already computed — and treat the memory length as a real hyperparameter, because it is.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Newton's method converges quadratically because it uses curvature, but it needs the Hessian and a solve against it: n squared storage and n cubed work per step. At any realistic model size that is not a candidate.",
          "Quasi-Newton methods notice that consecutive gradients already contain curvature information. If the parameters moved by s and the gradient changed by y, then any sensible curvature estimate B should satisfy B s = y — the secant condition. BFGS maintains an approximation to the inverse Hessian by applying the cheapest rank-two update consistent with that condition at every step, so curvature accumulates for free from the gradients you were computing anyway.",
          "L-BFGS goes one step further and never forms the matrix. It keeps the last m pairs of s and y and reconstructs the search direction with a two-loop recursion costing O(mn). That is what makes it the standard choice for smooth, deterministic, medium-scale problems — full-batch logistic regression, CRF training, bundle adjustment, and the inner loop of many scipy.optimize calls."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Write s for the change in parameters and y for the change in gradient. The secant condition asks the curvature estimate B to satisfy B s = y — the multivariate version of a finite-difference second derivative. BFGS applies the least-change rank-two update to the inverse Hessian approximation H that keeps this true:"
        ],
        "tex": "H_{k+1} = \\left(I - \\rho_k s_k y_k^{\\top}\\right)H_k\\left(I - \\rho_k y_k s_k^{\\top}\\right) + \\rho_k s_k s_k^{\\top}, \\qquad \\rho_k = \\frac{1}{y_k^{\\top}s_k}",
        "texNote": "The update preserves positive definiteness exactly when the curvature condition y'k s'k > 0 holds, which a Wolfe line search guarantees. If it does not hold — and with a noisy or stochastic gradient it often does not — the correct response is to SKIP the update, not to apply it and hope."
      },
      {
        "h": "In code",
        "code": "import numpy as np\n\ndef lbfgs_direction(g, S, Y):\n    \"\"\"Two-loop recursion: returns -H*g without ever forming H.\"\"\"\n    q, alpha = g.copy(), [0.0] * len(S)\n    for i in reversed(range(len(S))):\n        rho = 1.0 / (Y[i] @ S[i])\n        alpha[i] = rho * (S[i] @ q)\n        q -= alpha[i] * Y[i]\n    if S:                                     # scale by the latest curvature estimate\n        q *= (S[-1] @ Y[-1]) / (Y[-1] @ Y[-1])\n    for i in range(len(S)):\n        rho = 1.0 / (Y[i] @ S[i])\n        beta = rho * (Y[i] @ q)\n        q += (alpha[i] - beta) * S[i]\n    return -q\n\n# after each accepted step:\n#   s, y = x_new - x, grad_new - grad\n#   if s @ y > 1e-10:            # curvature condition — skip the update if it fails\n#       S.append(s); Y.append(y)\n#       if len(S) > m: S.pop(0); Y.pop(0)",
        "caption": "The guard on s @ y is not optional. Applying an update that violates the curvature condition destroys positive definiteness and the next direction may not even be a descent direction."
      },
      {
        "h": "The memory length is not a minor knob",
        "paras": [
          "On a 10-dimensional Rosenbrock function with the same Armijo line search for every method — so the comparison isolates the search DIRECTION and nothing else — gradient descent needed 21,534 iterations to reach a gradient norm below 1e-6. L-BFGS with memory 7 needed 99, and with memory 20 needed 70.",
          "But memory 3 needed 10,195. That is the result worth remembering: with too little memory L-BFGS was barely better than gradient descent on the same problem, a 100-fold gap between m = 3 and m = 7. Defaults in the range 5 to 20 exist for a reason, and a disappointing L-BFGS run is worth re-testing with more memory before concluding the method is wrong for the problem.",
          "One honest caveat about the storage claim. At n = 10 the 2mn = 140 numbers L-BFGS keeps are MORE than the 100 a full Hessian approximation would need — the memory argument is asymptotic, and only bites at scale. At a million parameters it is 1.4e7 against 1e12, which is the regime the method was built for.",
          "The decisive limitation is different: L-BFGS assumes the objective is the same function each time it is evaluated. Mini-batch gradients break the secant condition, because the difference between two gradients now mixes real curvature with sampling noise, and the accumulated approximation degrades. That, not cost, is why deep learning runs on Adam and SGD rather than on quasi-Newton methods."
        ]
      }
    ],
    "takeaways": [
      "BFGS satisfies the secant condition with a rank-two update, so curvature is assembled from gradients you already computed; L-BFGS keeps the last m pairs and never forms the matrix.",
      "Memory length matters enormously: on the same 10-d Rosenbrock, m=3 took 10,195 iterations and m=7 took 99, against 21,534 for gradient descent.",
      "It needs a deterministic objective. Mini-batch noise corrupts the secant pairs, which is the real reason deep nets are trained with SGD-family optimisers instead."
    ],
    "demo": "l-bfgs"
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
  "index": 7,
  "prev": "proximal-gradient",
  "next": "coreset"
};
