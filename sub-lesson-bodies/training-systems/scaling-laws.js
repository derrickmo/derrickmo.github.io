// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/training-systems/scaling-laws/.
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
  "conceptId": "scaling-laws",
  "lesson": {
    "title": "Scaling Laws",
    "oneLine": "Loss falls as a predictable power law in compute, data, and parameters.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Model quality improves smoothly and predictably with scale. Empirically, test loss drops as a power law in parameters, data, and compute - straight lines on a log-log plot. These curves let you forecast a big model's loss from small runs and allocate a compute budget optimally between size and data."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Loss versus a scale factor N follows a power law:"
        ],
        "tex": "L(N) \\approx L_\\infty + \\Big(\\tfrac{N_c}{N}\\Big)^{\\alpha}",
        "texNote": "Compute-optimal training (Chinchilla) balances N and data D for a fixed budget."
      },
      {
        "h": "In code",
        "code": "import numpy as np\n# fit a power law to small-scale runs, extrapolate\nlogL = np.log(losses); logN = np.log(sizes)\nslope, intercept = np.polyfit(logN, logL, 1)   # slope = -alpha",
        "caption": "A line on a log-log plot predicts the next scale."
      },
      {
        "h": "The exponents decide how to spend the budget",
        "paras": [
          "Fitting the Chinchilla form and optimising the split of a fixed compute budget, the answer is that parameters and tokens both grow, with tokens growing slightly faster: the optimal ratio of tokens to parameters runs 31.8 at 1e19 FLOPs, 50.3 at 1e21, 79.8 at 1e23 and 126.4 at 1e25. The headline correction stands — a budget spent entirely on parameters is being wasted — but the ratio is not a constant, and quoting a single tokens-per-parameter number is a simplification of a curve.",
          "The other half is what the money buys. Loss falls from 2.986 to 1.845 across those six orders of magnitude of compute, so a hundredfold increase is worth about 0.354 nats here. Power-law returns mean the next improvement always costs more than the last one, and the irreducible term sets a floor no budget crosses. That framing is what makes scaling laws useful in planning: they are less a promise about capability than a way of pricing the next increment before committing to it."
        ]
      }
    ],
    "takeaways": [
      "Loss is a power law in compute, data, and parameters.",
      "Small runs forecast large ones.",
      "Compute-optimal training balances model size against data."
    ],
    "demo": "scaling-laws"
  },
  "order": [
    "lr-schedule",
    "gradient-clipping",
    "scaling-laws",
    "bayesian-optimization"
  ],
  "index": 2,
  "prev": "gradient-clipping",
  "next": "bayesian-optimization"
};
