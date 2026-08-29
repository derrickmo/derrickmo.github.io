// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/trustworthy-ai/superposition/.
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
  "conceptId": "superposition",
  "lesson": {
    "title": "Superposition",
    "oneLine": "More features than dimensions, packed at an angle - which is why single neurons rarely mean one thing.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "A layer with 4 dimensions can represent more than 4 features if the features are SPARSE - rarely active at the same time. The model stores them as non-orthogonal directions and tolerates the interference, because the cost of occasional collision is lower than the cost of dropping a feature entirely.",
          "That is the mechanistic reason interpretability cannot proceed neuron by neuron. If features are packed at angles to the basis, a single neuron participates in several of them, so it is polysemantic by construction rather than by accident, and looking for 'the cat neuron' is looking for something the geometry says need not exist."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "The toy model compresses and reconstructs with a tied decoder; interference is the off-diagonal of the Gram matrix:"
        ],
        "tex": "\\hat{x} = \\mathrm{ReLU}\\big(W^\\top W x + b\\big), \\qquad \\text{interference} = \\big|\\,(W^\\top W)_{ij}\\,\\big|_{i \\neq j}",
        "texNote": "The ReLU is load-bearing - it absorbs small negative interference, and removing it changes the behaviour qualitatively."
      },
      {
        "h": "In code",
        "code": "# Sparsity is what makes superposition worth it.\n# Dense features  -> only m of n represented, and orthogonally.\n# Sparse features -> all n packed into m dims, at angles.\n\n# Five features in two dimensions arrange as a regular pentagon,\n# ~72 degrees apart - the geometry is not arbitrary.\nangles = np.degrees(np.arccos(W.T @ W))",
        "caption": "Sparse autoencoders try to undo the packing; measured recovery was 5 of 24 planted features at the BEST reconstruction, so the units are not identified."
      },
      {
        "h": "It works because activations are sparse",
        "paras": [
          "Superposition packs more features than there are dimensions by giving each an almost-orthogonal direction, and the cost is interference. In 64 dimensions the mean absolute overlap between two random feature directions is about 0.10 whether you store 16 features or 1,024 — that number is set by the dimension, not the count. What grows is the total: the summed worst-case interference against one feature goes from 1.48 at 16 features to 25.4 at 256 and 102.3 at 1,024.",
          "Which is why sparsity is the enabling condition rather than a detail. Reading one feature back out of the same 256-feature code, the error is 0.000 when one feature is active, 0.171 when four are, 0.359 at sixteen and 0.723 at sixty-four — against a true value of 1.0. The scheme is only coherent while few features fire at once, and that is the assumption a sparse autoencoder is exploiting when it tries to recover the directions: it is not merely a convenient prior, it is the condition that made the code possible in the first place."
        ]
      }
    ],
    "takeaways": [
      "Superposition requires sparsity - it is a bet that features rarely co-occur.",
      "Polysemantic neurons are the predicted consequence, not a curiosity.",
      "An SAE's reconstruction can be near-perfect while the recovered features are mostly wrong."
    ],
    "demo": "superposition"
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
  "index": 3,
  "prev": "adversarial-examples",
  "next": "activation-patching"
};
