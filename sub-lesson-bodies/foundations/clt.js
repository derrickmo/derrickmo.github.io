// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/foundations/clt/.
// concept-lesson-app.jsx reads window.DM_SUBLESSON_CTX and falls back to
// window.DM_SUBLESSON(...) so the page still works if this file is ever missing.

window.DM_SUBLESSON_CTX = {
  "module": {
    "title": "Mathematical and Programming Foundations",
    "lessons": {
      "chain-rule": {
        "title": "The Chain Rule"
      },
      "gradient-descent": {
        "title": "Gradient Descent"
      },
      "softmax": {
        "title": "Softmax"
      },
      "cross-entropy": {
        "title": "Cross-Entropy Loss"
      },
      "bayes": {
        "title": "Bayes' Rule"
      },
      "entropy": {
        "title": "Entropy and Information"
      },
      "clt": {
        "title": "The Central Limit Theorem"
      },
      "fourier": {
        "title": "Fourier Series"
      },
      "mutual-information": {
        "title": "Mutual Information"
      },
      "importance-sampling": {
        "title": "Importance Sampling"
      },
      "reservoir-sampling": {
        "title": "Reservoir Sampling"
      },
      "huffman-coding": {
        "title": "Huffman Coding"
      },
      "aliasing": {
        "title": "Aliasing & the Nyquist Limit"
      },
      "channel-capacity": {
        "title": "Channel Capacity"
      }
    }
  },
  "moduleSlug": "foundations",
  "conceptId": "clt",
  "lesson": {
    "title": "The Central Limit Theorem",
    "oneLine": "Sums of many independent random draws look Gaussian, whatever the source.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Average enough independent random quantities and the distribution of the average becomes a bell curve - even if each piece is wildly non-Gaussian. This is why noise is so often modeled as Gaussian, why error bars shrink as 1/sqrt(n), and why the normal distribution is everywhere."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "The standardized sample mean converges to a standard normal:"
        ],
        "tex": "\\frac{\\bar{X}_n - \\mu}{\\sigma/\\sqrt{n}} \\;\\xrightarrow{d}\\; \\mathcal{N}(0,1)",
        "texNote": "The spread of the mean shrinks like 1/sqrt(n) - quadruple the data to halve the error."
      },
      {
        "h": "In code",
        "code": "import numpy as np\n\n# means of uniform samples become Gaussian\nmeans = [np.random.rand(50).mean() for _ in range(10000)]\n# histogram of `means` is a tight bell curve around 0.5",
        "caption": "Sum anything independent enough times and a bell curve appears."
      },
      {
        "h": "How fast, and when it never arrives",
        "paras": [
          "The theorem is asymptotic, so \"n = 30 is enough\" is really a statement about how much skew you will tolerate. Averaging draws from an exponential distribution, whose skew is 2.039, the sample mean still carries skew 0.36 at n = 30 and 0.233 at n = 100. It decays as one over the square root of n, so buying a visibly Gaussian shape from a skewed source costs an order of magnitude more data than the rule of thumb suggests.",
          "Some distributions never arrive at all. The theorem needs finite variance, and the Cauchy has none: averaging Cauchy draws leaves the interquartile range of the sample mean at 1.853 for n = 10 and 1.938 for n = 100,000. A hundred thousand samples buy nothing, because the mean of Cauchy draws is Cauchy again. Heavy tails are not a slow case of the CLT — they are outside it, which is worth knowing before quoting a standard error on a metric with occasional enormous values."
        ]
      }
    ],
    "takeaways": [
      "Averages of independent variables tend to a Gaussian.",
      "Estimation error shrinks like 1/sqrt(n).",
      "It justifies Gaussian noise assumptions across ML."
    ],
    "demo": "clt"
  },
  "order": [
    "chain-rule",
    "gradient-descent",
    "softmax",
    "cross-entropy",
    "bayes",
    "entropy",
    "clt",
    "fourier",
    "mutual-information",
    "importance-sampling",
    "reservoir-sampling",
    "huffman-coding",
    "aliasing",
    "channel-capacity"
  ],
  "index": 6,
  "prev": "entropy",
  "next": "fourier"
};
