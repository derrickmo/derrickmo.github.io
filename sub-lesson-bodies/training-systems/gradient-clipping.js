// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/training-systems/gradient-clipping/.
// concept-lesson-app.jsx reads window.DM_SUBLESSON_CTX and falls back to
// window.DM_SUBLESSON(...) so the page still works if this file is ever missing.

window.DM_SUBLESSON_CTX = {
  "module": {
    "title": "Training at Scale",
    "lessons": {
      "lr-schedule": {
        "title": "Learning-Rate Schedules"
      },
      "gradient-clipping": {
        "title": "Gradient Clipping"
      },
      "scaling-laws": {
        "title": "Scaling Laws"
      },
      "bayesian-optimization": {
        "title": "Bayesian Optimization"
      }
    }
  },
  "moduleSlug": "training-systems",
  "conceptId": "gradient-clipping",
  "lesson": {
    "title": "Gradient Clipping",
    "oneLine": "Cap the gradient norm so a bad batch cannot blow up training.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Occasionally a batch produces a huge gradient that sends the weights flying and the loss to NaN - common in RNNs and transformers. Clipping rescales the gradient when its norm exceeds a threshold, preserving direction but bounding the step. Cheap insurance against rare instabilities."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Rescale the gradient if its norm exceeds the threshold c:"
        ],
        "tex": "g \\leftarrow g \\cdot \\min\\!\\Big(1,\\ \\tfrac{c}{\\|g\\|}\\Big)",
        "texNote": "Direction is preserved; only the magnitude is capped."
      },
      {
        "h": "In code",
        "code": "import numpy as np\n\ndef clip(g, c=1.0):\n    norm = np.linalg.norm(g)\n    return g * min(1.0, c / (norm + 1e-9))",
        "caption": "Keep the direction, bound the magnitude."
      },
      {
        "h": "Clip the norm, not the values",
        "paras": [
          "The two clipping strategies sound interchangeable and are not. Clipping by global norm rescales the whole vector, so the direction is untouched: measured over 2,000 gradients with occasional huge coordinates, the cosine between the raw gradient and the norm-clipped one is exactly 1.0000. Clipping each coordinate to a fixed range gives 0.5174 — the step is bounded and it is no longer the direction the loss asked for.",
          "The reason value clipping does so much damage is that it flattens exactly the coordinates carrying the most signal, and the larger the outlier the more of it is discarded. Norm clipping bounds the step size while preserving what the gradient said, which is why it is the default in every serious training loop and why the threshold is usually reported alongside the learning rate: together they set the maximum distance a single step can move, which is the quantity that actually governs stability."
        ]
      }
    ],
    "takeaways": [
      "Clipping bounds the update from a rare huge gradient.",
      "It preserves direction, only scaling magnitude.",
      "Standard practice for RNNs and transformers."
    ],
    "demo": "gradient-clipping"
  },
  "order": [
    "lr-schedule",
    "gradient-clipping",
    "scaling-laws",
    "bayesian-optimization"
  ],
  "index": 1,
  "prev": "lr-schedule",
  "next": "scaling-laws"
};
