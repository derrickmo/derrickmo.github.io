// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/ml-theory/double-descent/.
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
  "conceptId": "double-descent",
  "lesson": {
    "title": "Double Descent",
    "oneLine": "Past the interpolation threshold, more parameters can help again.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Classical theory says test error is U-shaped in model size. Modern overparameterized models show a second descent: error rises to a peak right where the model can exactly fit the training data, then falls again as you add even more capacity. It is why huge networks generalize despite zero training error."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Error peaks near the interpolation threshold where parameters P match samples N:"
        ],
        "tex": "P \\approx N \\;\\Rightarrow\\; \\text{test error peaks, then descends again}",
        "texNote": "Implicit regularization from SGD picks low-norm solutions in the overparameterized regime."
      },
      {
        "h": "In code",
        "code": "# sweep model width and record test error\nfor width in widths:\n    model = fit(width)\n    err.append(test_error(model))\n# err first dips, spikes near width ~ n_samples, then dips again",
        "caption": "The second dip is the modern, overparameterized regime."
      },
      {
        "h": "The peak is at the interpolation threshold",
        "paras": [
          "The classical U-shaped curve holds only up to the point where the model can exactly fit the training data, and it is worth seeing what happens there. In a random-features regression with 60 training points, test RMSE falls from 3.961 at 10 features to 3.351 at 30, then rises sharply — 4.514 at 50, 11.671 at 58 and 56.543 at exactly 60, where the number of parameters equals the number of examples.",
          "Past that threshold it falls again, and keeps falling: 10.459 at 62 features, 4.491 at 70, 2.337 at 100 and 1.256 at 400 — better than anything the underparameterised regime achieved. At the threshold there is exactly one interpolating solution and it is forced to be wild; beyond it there are many, and the minimum-norm one the solver happens to find is well behaved. That is why more parameters can be a regulariser rather than a risk, and why \"stop before you fit the training set\" is advice from the left half of a curve whose right half is where modern models live."
        ]
      }
    ],
    "takeaways": [
      "Test error can be double-descent shaped, not just U-shaped.",
      "The peak sits at the interpolation threshold (params ~ samples).",
      "Overparameterization plus SGD's implicit bias explains big-model success."
    ],
    "demo": "double-descent"
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
  "index": 1,
  "prev": "regularization",
  "next": "overfitting"
};
