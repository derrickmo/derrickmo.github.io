// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/trustworthy-ai/adversarial-examples/.
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
  "conceptId": "adversarial-examples",
  "lesson": {
    "title": "Adversarial Examples",
    "oneLine": "Imperceptible perturbations that flip a prediction - and the direction, not the size, is what does it.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Add a carefully chosen perturbation, small enough that a person sees no change, and a confident classifier flips. The essential comparison is against a RANDOM perturbation of the same size, which barely moves accuracy at all - so this is not fragility to noise, it is fragility to a specific direction that an optimizer can find.",
          "The uncomfortable framing is that the model may not be making an error in any statistical sense. Ilyas et al. argue these arise from non-robust features that are genuinely predictive on the natural distribution and evaporate under a small shift - the model is using real signal that happens not to survive an adversary."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "FGSM takes one step along the sign of the loss gradient; PGD iterates it inside the ball:"
        ],
        "tex": "x_{\\text{adv}} = \\Pi_{\\mathcal{B}_\\epsilon(x)}\\Big( x + \\alpha\\,\\mathrm{sign}\\big(\\nabla_x \\mathcal{L}(f(x), y)\\big) \\Big)",
        "texNote": "The projection keeps the perturbation inside the threat model; PGD with restarts is the standard evaluation attack."
      },
      {
        "h": "In code",
        "code": "# Measured in the module: clean 0.97, random perturbation at eps=0.3 -> 0.93,\n# PGD at the same eps -> 0.28. Same budget, entirely different outcome.\n\n# The trap when EVALUATING a defence:\nfgsm_acc = evaluate(model, fgsm_attack)   # 0.62 - looks robust\npgd_acc  = evaluate(model, pgd_attack)   # 0.32 - it was gradient masking",
        "caption": "A defence that only resists the attack it was trained against is the standard way robustness is overstated."
      },
      {
        "h": "Dimension is the attacker's budget",
        "paras": [
          "Adversarial examples are often presented as a quirk of deep networks, but a linear model in 200 dimensions already has the property. Training logistic regression to 99.5% accuracy and then perturbing each input coordinate by a fixed L-infinity budget in the direction that hurts, accuracy falls to 97.8% at 0.005, 84.8% at 0.02 and 58.0% at 0.05 — a perturbation far too small to see, applied to every coordinate at once.",
          "The arithmetic explains why. Moving each coordinate by epsilon in the sign of its weight changes the logit by epsilon times the sum of the absolute weights, which here is 93: the per-coordinate change is tiny and there are hundreds of them to add up. So high dimension is not incidental to the phenomenon, it is the resource the attacker is spending, and no amount of accuracy on clean data removes it. That is also why robustness has to be trained for explicitly and why it costs clean accuracy — the decision boundary has to be moved away from the data, not just placed correctly."
        ]
      }
    ],
    "takeaways": [
      "Compare against a random perturbation of equal size or the result means nothing.",
      "Gradient masking makes a defence look strong to weak attacks; always evaluate with a strong adaptive one.",
      "'Robust' is meaningless without the threat model - the norm, the budget and the attacker's access."
    ],
    "demo": "adversarial-examples"
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
  "index": 2,
  "prev": "saliency",
  "next": "superposition"
};
