// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/causal-inference/mcmc/.
// concept-lesson-app.jsx reads window.DM_SUBLESSON_CTX and falls back to
// window.DM_SUBLESSON(...) so the page still works if this file is ever missing.

window.DM_SUBLESSON_CTX = {
  "module": {
    "title": "Concept by concept",
    "lessons": {
      "causal-inference": {
        "title": "Causal Inference"
      },
      "simpsons-paradox": {
        "title": "Simpson's Paradox"
      },
      "mcmc": {
        "title": "MCMC"
      }
    }
  },
  "moduleSlug": "causal-inference",
  "conceptId": "mcmc",
  "lesson": {
    "title": "MCMC",
    "oneLine": "Sample from a distribution you can only evaluate up to a constant, by building a chain whose stationary distribution is it.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Bayesian inference needs the posterior, and the posterior's normalizing constant is an integral that is usually intractable. MCMC sidesteps it: construct a random walk whose long-run visiting frequency IS the posterior, then run it and treat the visited states as samples. Because the acceptance rule uses a RATIO of densities, the unknown constant cancels.",
          "The practical consequence is that you get a completely general inference engine at the cost of correlated samples and a convergence question. Neither is free - a chain can look healthy and still have missed a mode entirely."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Metropolis-Hastings accepts a proposal with probability given by the density ratio, where the intractable constant cancels:"
        ],
        "tex": "\\alpha = \\min\\!\\left(1, \\frac{\\tilde{p}(\\theta')\\, q(\\theta \\mid \\theta')}{\\tilde{p}(\\theta)\\, q(\\theta' \\mid \\theta)}\\right)",
        "texNote": "Only the UNNORMALIZED density p-tilde appears, which is the whole trick."
      },
      {
        "h": "In code",
        "code": "theta = init\nfor _ in range(n_steps):\n    prop = theta + sigma * np.random.randn()\n    # log-space ratio: the normalizing constant is absent by construction\n    if np.log(np.random.rand()) < log_post(prop) - log_post(theta):\n        theta = prop\n    chain.append(theta)\n\n# Validate against a case with a closed form before trusting it anywhere else.\n# In the module: MCMC mean 2.4329 vs the analytic conjugate posterior's 2.4323.",
        "caption": "R-hat below 1.01 says the chains agree, not that the model is right - chains started near each other can agree while all missing a mode."
      },
      {
        "h": "The sample size you have is not the sample size you drew",
        "paras": [
          "MCMC produces correlated draws, so the number of iterations is not the amount of information. Sampling a standard normal with a random-walk Metropolis chain of 200,000 steps, a proposal width of 0.1 accepts 97.9% of moves and delivers an effective sample size of 333 — 0.17% of the draws. A width of 20 accepts 7.9% and delivers 10,982. The best of the four, width 4, accepts 38.9% and delivers 55,878, or 27.9%.",
          "Both extremes waste the chain for opposite reasons: tiny proposals are always accepted and barely move, huge ones are almost always rejected and do not move at all. A high acceptance rate is therefore a warning rather than a reassurance, which is why tuning targets a middling rate and why effective sample size, not iteration count, is the number to report. And note that every one of these chains reported a sample standard deviation near the correct 1.000 — the estimate looked fine in all four cases; only the ESS revealed how little was behind it."
        ]
      }
    ],
    "takeaways": [
      "The acceptance ratio cancels the normalizing constant, which is why an unnormalized density suffices.",
      "Samples are correlated, so effective sample size matters more than raw draw count - and tail ESS more than bulk.",
      "Convergence diagnostics check the SAMPLER, never the model; posterior predictive checks are what test the model."
    ],
    "demo": "mcmc"
  },
  "order": [
    "causal-inference",
    "simpsons-paradox",
    "mcmc"
  ],
  "index": 2,
  "prev": "simpsons-paradox",
  "next": null
};
