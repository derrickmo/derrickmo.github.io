// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/ml-theory/regularization/.
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
  "conceptId": "regularization",
  "lesson": {
    "title": "Regularization",
    "oneLine": "Penalize complexity to trade a little bias for much less variance.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Regularization discourages the model from fitting noise by adding a penalty on the size of its weights. L2 (weight decay) shrinks weights smoothly; L1 drives some to exactly zero, selecting features. Either way you accept slightly more bias for a big drop in variance."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Add a penalty term to the loss, weighted by lambda:"
        ],
        "tex": "\\mathcal{L}_{\\text{reg}} = \\mathcal{L}(\\theta) + \\lambda\\,\\|\\theta\\|_2^2",
        "texNote": "Larger lambda means simpler models; it is tuned on validation data."
      },
      {
        "h": "In code",
        "code": "# L2 adds a constant pull toward zero to every gradient step\ngrad = data_grad(theta) + 2 * lam * theta\ntheta = theta - eta * grad      # 'weight decay'",
        "caption": "A constant shrink toward the origin each update."
      },
      {
        "h": "L1 and L2 are different models, not different amounts",
        "paras": [
          "The two penalties are usually presented as a pair of dials, and they do genuinely different things. On a problem with 40 features of which only 5 matter, L1 at a penalty of 0.5 leaves exactly 5 coefficients non-zero — it recovered the true support. L2 at the same penalty, and at every other penalty tried, leaves all 40 non-zero, because shrinking towards zero and reaching zero are not the same operation.",
          "The geometry is the reason: L1's constraint region has corners on the axes and the optimum lands on them, while L2's is a sphere with no corners to land on. So the choice is about what you believe — L2 when many small effects are real and you want them all shrunk, L1 when you believe the truth is sparse and want a subset selected, and elastic net when features are correlated, since L1 alone picks one of a correlated group arbitrarily. Reaching for \"more regularisation\" without saying which is choosing a model class by accident."
        ]
      }
    ],
    "takeaways": [
      "Regularization penalizes complexity to cut variance.",
      "L2 shrinks smoothly; L1 induces sparsity.",
      "lambda is chosen by cross-validation."
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
  "index": 0,
  "prev": null,
  "next": "double-descent"
};
