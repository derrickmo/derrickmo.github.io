// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/training-systems/lr-schedule/.
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
  "conceptId": "lr-schedule",
  "lesson": {
    "title": "Learning-Rate Schedules",
    "oneLine": "Vary the step size over training - warm up, then decay.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "A fixed learning rate is a compromise. Schedules do better: a short warmup avoids early instability while statistics settle, then a decay (cosine or linear) lets the model settle into a good minimum. The right schedule can matter as much as the optimizer."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "A cosine schedule decays smoothly from the peak rate to near zero:"
        ],
        "tex": "\\eta_t = \\tfrac12\\eta_{\\max}\\big(1 + \\cos(\\pi\\,t/T)\\big)",
        "texNote": "Often preceded by a linear warmup over the first few percent of steps."
      },
      {
        "h": "In code",
        "code": "import numpy as np\n\ndef lr(t, T, warm=500, peak=3e-4):\n    if t < warm: return peak * t / warm        # warmup\n    return 0.5 * peak * (1 + np.cos(np.pi * (t - warm) / (T - warm)))",
        "caption": "Warm up, then cosine-decay to near zero."
      },
      {
        "h": "The decay is what buys the last digit",
        "paras": [
          "A constant learning rate converges to a ball around the optimum rather than to the optimum, and the radius is set by the rate. On a noisy quadratic, the final RMS distance is 0.2233 at a constant rate of 0.1, 0.0701 at 0.01 and 0.0190 at 0.001 — a tenfold smaller rate buys roughly a threefold smaller ball, and nothing about running longer changes it.",
          "Decaying gets both halves: starting at 0.1 and annealing to zero on a cosine reaches 0.0167, better than the best constant rate tested while also making the early progress that the small constant rate could not. Adding a 5% warmup gives 0.0175 here, essentially the same — on this well-conditioned problem warmup is neutral, and its value in real training is about the early instability of adaptive optimisers rather than about the final distance. The schedule is doing two separate jobs, and it is worth knowing which one you are tuning."
        ]
      }
    ],
    "takeaways": [
      "Schedules beat a single fixed learning rate.",
      "Warmup avoids early divergence; decay sharpens the minimum.",
      "Cosine decay is a strong default."
    ],
    "demo": "lr-schedule"
  },
  "order": [
    "lr-schedule",
    "gradient-clipping",
    "scaling-laws",
    "bayesian-optimization"
  ],
  "index": 0,
  "prev": null,
  "next": "gradient-clipping"
};
