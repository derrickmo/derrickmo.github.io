// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/trustworthy-ai/saliency/.
// concept-lesson-app.jsx reads window.DM_SUBLESSON_CTX and falls back to
// window.DM_SUBLESSON(...) so the page still works if this file is ever missing.

window.DM_SUBLESSON_CTX = {
  "module": {
    "title": "Concept by concept",
    "lessons": {
      "shap": {
        "title": "SHAP Values"
      },
      "saliency": {
        "title": "Saliency Maps"
      },
      "adversarial-examples": {
        "title": "Adversarial Examples"
      },
      "superposition": {
        "title": "Superposition"
      },
      "activation-patching": {
        "title": "Activation Patching"
      },
      "sparse-autoencoder": {
        "title": "Sparse Autoencoders & Superposition"
      },
      "certified-robustness": {
        "title": "Certified Robustness"
      },
      "conformal-regression": {
        "title": "Conformal Regression"
      }
    }
  },
  "moduleSlug": "trustworthy-ai",
  "conceptId": "saliency",
  "lesson": {
    "title": "Saliency Maps",
    "oneLine": "Gradient-based heat maps that look convincing whether or not they track the model.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "The simplest attribution for an image is the gradient of the output with respect to the input: which pixels, if nudged, would change the score most. It is one backward pass, and it produces a picture that a human immediately finds persuasive - which is the problem.",
          "Plain gradients saturate. If the model is already confident, the local slope is near zero even though the feature is what drove the decision, so the map goes dark exactly where the evidence is strongest. Integrated Gradients fixes this by accumulating gradients along a path from a baseline, and satisfies a completeness property that plain saliency does not."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Integrated Gradients accumulates the gradient along a straight path from the baseline to the input:"
        ],
        "tex": "\\mathrm{IG}_i(x) = (x_i - x'_i)\\int_{0}^{1} \\frac{\\partial f\\big(x' + \\alpha(x - x')\\big)}{\\partial x_i}\\, d\\alpha",
        "texNote": "Completeness: the attributions sum to f(x) - f(x'), which plain gradients do not satisfy."
      },
      {
        "h": "In code",
        "code": "# The check that matters more than the map: does it track the MODEL?\nrandomized = deepcopy(model)\nrandomize_weights(randomized)\n\nif spearman(attr(model, x), attr(randomized, x)) > 0.5:\n    print(\"FAILS Adebayo sanity check - the map is a property of the input\")\n\n# Measured: IG and Shapley collapse to ~0.06 correlation (pass);\n# input-times-gradient survives at 0.493 (fails).",
        "caption": "An explanation should be sensitive to the thing it claims to explain, and that sensitivity is testable in ten lines."
      },
      {
        "h": "The sanity check most maps fail",
        "paras": [
          "A saliency map is supposed to explain a model, so randomising the model's weights should destroy it. Often it barely dents it. Comparing gradient-times-input saliency from a trained classifier against the same map from a randomly initialised one, the mean correlation across 400 inputs is 0.42 — and the correlation between the trained model's map and the raw input alone is 0.557. The map is tracking the input more than it is tracking the model.",
          "The plain gradient does much better on this test (correlation 0.113 with the random model), which is the useful diagnostic: multiplying by the input makes a map look sharper and more object-shaped while importing structure that has nothing to do with what was learned. Adebayo and colleagues turned this into a standard check, and the lesson generalises past saliency — an explanation that survives randomising the thing it explains is describing something else, and looking convincing is not evidence."
        ]
      }
    ],
    "takeaways": [
      "Plain gradients saturate, so a confident model gives a dark map where the evidence is.",
      "Run the model-randomization check - some popular methods produce near-identical maps for a randomized network.",
      "Plausibility is not faithfulness; a map that always looks reasonable is not evidence."
    ],
    "demo": "saliency"
  },
  "order": [
    "shap",
    "saliency",
    "adversarial-examples",
    "superposition",
    "activation-patching",
    "sparse-autoencoder",
    "certified-robustness",
    "conformal-regression"
  ],
  "index": 1,
  "prev": "shap",
  "next": "adversarial-examples"
};
