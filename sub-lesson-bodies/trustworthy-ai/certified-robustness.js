// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/trustworthy-ai/certified-robustness/.
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
  "conceptId": "certified-robustness",
  "lesson": {
    "title": "Certified Robustness",
    "oneLine": "A proof that no perturbation within a radius can change the prediction — narrower than it sounds, and the only claim an adaptive attacker cannot refute.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Empirical robustness is a claim that no attack you tried succeeded, and the history of the field is a graveyard of defences that met that bar and were broken within months by a stronger attack. Certification changes the claim: for this input, no perturbation inside this radius can change the answer — proved, not tested.",
          "Randomized smoothing is the version that scales. Do not certify the network itself; certify a NEW classifier defined as 'what does the network say most often under Gaussian noise?'. That smoothed classifier is provably stable even though the network inside it is not."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "If the top class wins under noise with probability at least p, the smoothed classifier is constant within an L2 ball of radius"
        ],
        "tex": "R = \\sigma\\,\\Phi^{-1}(\\underline{p_A})",
        "texNote": "★ p_A must be a LOWER CONFIDENCE BOUND from the Monte-Carlo samples, not the sample mean. Using the point estimate produces radii that look entirely plausible and are invalid — the certificate then claims more than the evidence supports, and nothing about the output looks wrong."
      },
      {
        "h": "In code",
        "code": "import numpy as np\nfrom scipy.stats import norm, beta\n\ndef certify(model, x, sigma, n=10000, alpha=0.001):\n    votes = np.bincount([model(x + np.random.randn(*x.shape) * sigma).argmax()\n                         for _ in range(n)])\n    top = votes.argmax()\n    # Clopper-Pearson LOWER bound, not votes.max()/n. This is the whole certificate.\n    p_lower = beta.ppf(alpha, votes[top], n - votes[top] + 1)\n    if p_lower <= 0.5:\n        return None, None                 # abstain: no radius can be claimed\n    return top, sigma * norm.ppf(p_lower)",
        "caption": "Abstention is a first-class outcome. A certified classifier that cannot prove anything about an input must say so rather than guess."
      },
      {
        "h": "How narrow the guarantee actually is",
        "paras": [
          "It is an L2 guarantee. It says nothing about an L-infinity perturbation, a rotation, a crop, a JPEG artefact, or a change of lighting — and real-world corruption is rarely a small L2 ball. A model can be certified and still fail on a photograph taken in the rain.",
          "It costs a lot. The radius grows with sigma, but so does the noise the network has to classify through, so accuracy falls; and each certification needs thousands of forward passes. The certified accuracy curve — accuracy as a function of radius — is the honest report, not a single number.",
          "There is an invariant worth carrying, because it once caught a real bug in my own implementation: certified accuracy can never exceed empirical accuracy. A lower bound cannot be larger than the thing it bounds. If it is, the certificate is invalid — and that check found the error when code review had not, because the code correctly implemented the wrong formula."
        ]
      }
    ],
    "takeaways": [
      "Certification proves no perturbation in a radius changes the answer; empirical robustness only reports that your attacks failed.",
      "Randomized smoothing certifies a smoothed classifier, and the radius must come from a confidence LOWER bound, not the sample mean.",
      "The guarantee is L2-only and costs accuracy and compute — report the certified-accuracy curve, not one number."
    ],
    "demo": "certified-robustness"
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
  "index": 6,
  "prev": "sparse-autoencoder",
  "next": "conformal-regression"
};
