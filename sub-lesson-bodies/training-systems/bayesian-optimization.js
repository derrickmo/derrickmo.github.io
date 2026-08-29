// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/training-systems/bayesian-optimization/.
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
  "conceptId": "bayesian-optimization",
  "lesson": {
    "title": "Bayesian Optimization",
    "oneLine": "Model the objective you cannot see, then spend each expensive evaluation where the model says it will learn the most.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Some functions cost hours per evaluation — training a model, running a wet-lab assay, simulating a design — and give you no gradient. Grid and random search treat every point as equally worth trying. Bayesian optimisation instead fits a probabilistic model to the points seen so far and uses it to choose the next one.",
          "The model gives a mean and an uncertainty everywhere. That second quantity is the whole idea: a point can be worth trying because the model expects it to be good, or because the model has no idea, and an acquisition function decides how to weigh those."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Expected improvement, the standard acquisition function, integrates how much better a point could plausibly be:"
        ],
        "tex": "\\mathrm{EI}(x) = \\mathbb{E}\\big[\\max(0,\\; f(x) - f^{+})\\big] = (\\mu(x) - f^{+})\\Phi(Z) + \\sigma(x)\\phi(Z),\\quad Z = \\frac{\\mu(x)-f^{+}}{\\sigma(x)}",
        "texNote": "The two terms are exploitation and exploration made explicit: the first rewards a high predicted mean, the second rewards uncertainty. Where sigma is zero - a point already measured - EI is zero, so it never wastes an evaluation repeating itself."
      },
      {
        "h": "In code",
        "code": "import numpy as np\nfrom scipy.stats import norm\n\ndef expected_improvement(mu, sigma, best, xi=0.01):\n    sigma = np.maximum(sigma, 1e-9)          # guard the divide at measured points\n    z = (mu - best - xi) / sigma\n    return (mu - best - xi) * norm.cdf(z) + sigma * norm.pdf(z)\n\n# the loop: fit surrogate -> maximise EI -> evaluate the real objective -> repeat\nfor _ in range(budget):\n    gp.fit(X, y)\n    mu, sigma = gp.predict(candidates, return_std=True)\n    x_next = candidates[np.argmax(expected_improvement(mu, sigma, y.max()))]\n    X, y = np.vstack([X, x_next]), np.append(y, objective(x_next))",
        "caption": "Note the inner optimisation: you maximise EI over candidates, which is itself a search. It is cheap only because the surrogate is cheap."
      },
      {
        "h": "When it loses, which is more often than the pitch suggests",
        "paras": [
          "It wins when evaluations are genuinely expensive, the budget is small (tens, not thousands), and the space is low-dimensional and continuous. Outside that, the surrogate is the bottleneck: Gaussian processes scale cubically in observations, and their distance-based kernels lose meaning in high dimensions, so a GP over fifty hyperparameters is modelling noise.",
          "The comparison people skip is against a bandit-style scheduler. For neural network tuning, ASHA and Hyperband simply start many random configurations and kill the bad ones early — they exploit the fact that a partially trained model already tells you something, which Bayesian optimisation ignores by treating each evaluation as atomic. On a parallel cluster they frequently win outright.",
          "And it is sequential by nature, which is awkward when you have 32 workers idle. Batch variants exist and are noticeably harder than the single-point story implies."
        ]
      }
    ],
    "takeaways": [
      "Fit a surrogate with uncertainty, then let an acquisition function trade predicted quality against what you do not know.",
      "Expected improvement is zero where you have already measured, so the loop never repeats itself.",
      "It wins on expensive, low-dimensional, small-budget problems — and loses to early-stopping schedulers like ASHA on parallel hyperparameter search."
    ],
    "demo": "bayesian-optimization"
  },
  "order": [
    "lr-schedule",
    "gradient-clipping",
    "scaling-laws",
    "bayesian-optimization"
  ],
  "index": 3,
  "prev": "scaling-laws",
  "next": null
};
