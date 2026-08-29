// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/ml-theory/overfitting/.
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
  "conceptId": "overfitting",
  "lesson": {
    "title": "Overfitting & Generalization",
    "oneLine": "Fitting the noise instead of the signal — measurable only against data the model has never seen, which is why the split is the experiment.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "A model that memorises its training set has zero training error and has learned nothing transferable. Overfitting is not a bug in the optimiser; the optimiser did exactly what you asked. It is a mismatch between what you minimised (error on this sample) and what you wanted (error on the distribution).",
          "The consequence is that training loss cannot detect it. Only held-out data can, which is why the split is not administrative bookkeeping — it is the measuring instrument, and anything that leaks across it breaks the measurement rather than merely biasing it."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "The quantity you care about is the gap between empirical and true risk:"
        ],
        "tex": "\\underbrace{R(h)}_{\\text{true risk}} = \\underbrace{\\hat{R}_n(h)}_{\\text{training error}} + \\underbrace{\\big(R(h) - \\hat{R}_n(h)\\big)}_{\\text{generalization gap}}",
        "texNote": "Capacity control, more data and regularization all attack the second term. Note the gap is a property of the model AND the sample size AND the class of functions you searched — not of the architecture alone."
      },
      {
        "h": "In code",
        "code": "import numpy as np\n\ndef fit_curve(x_tr, y_tr, x_te, y_te, max_degree=15):\n    # The textbook demonstration: raise polynomial degree, watch the two curves split.\n    for d in range(1, max_degree + 1):\n        c = np.polyfit(x_tr, y_tr, d)\n        tr = np.mean((np.polyval(c, x_tr) - y_tr) ** 2)\n        te = np.mean((np.polyval(c, x_te) - y_te) ** 2)\n        print(f\"degree {d:2d}  train {tr:8.4f}  test {te:8.4f}\")",
        "caption": "Training error falls monotonically. Test error falls, bottoms out, then climbs. The gap between them IS the overfitting."
      },
      {
        "h": "What actually helps, and what only looks like it does",
        "paras": [
          "More data is the only intervention that reduces the gap without costing you capacity. Everything else — weight decay, dropout, early stopping, a smaller model — trades fit for gap and has an optimum you have to find.",
          "The modern caveat: the classical picture of test error rising monotonically past the interpolation point is incomplete. Very over-parameterised models often show DOUBLE DESCENT, where test error falls again beyond the point of fitting the training set exactly. Capacity alone does not predict generalisation.",
          "The failure that masquerades as success: a validation set you have selected against hundreds of times is no longer held out. Tuning optimism inflates your best number by roughly the spread of the configurations you searched, which is why a final untouched test set exists."
        ]
      }
    ],
    "takeaways": [
      "Overfitting is invisible in training loss by construction — the held-out split is the instrument, not paperwork.",
      "More data shrinks the generalization gap for free; every other lever trades fit against gap and has an optimum.",
      "Selecting repeatedly on a validation set consumes it, which is why the final number comes from a set you touched once."
    ],
    "demo": "overfitting"
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
  "index": 2,
  "prev": "double-descent",
  "next": "newtons-method"
};
