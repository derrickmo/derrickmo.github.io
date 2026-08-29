// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/foundations/cross-entropy/.
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
  "conceptId": "cross-entropy",
  "lesson": {
    "title": "Cross-Entropy Loss",
    "oneLine": "Measure how far a predicted distribution is from the true label.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Cross-entropy is the standard classification loss. It rewards putting probability mass on the correct class and punishes confident wrong answers harshly. Paired with softmax, its gradient is beautifully simple - just predicted minus actual - which is why the combination is everywhere."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Negative log-likelihood of the true class under the predicted distribution:"
        ],
        "tex": "\\mathcal{L} = -\\sum_i y_i \\log \\hat{p}_i",
        "texNote": "For a one-hot label this is just -log of the predicted probability of the right class."
      },
      {
        "h": "In code",
        "code": "import numpy as np\n\ndef cross_entropy(p, y):       # y is the true class index\n    return -np.log(p[y] + 1e-12)\n# softmax + cross-entropy gradient is simply (p - onehot(y))",
        "caption": "Punishes confident mistakes; trivial gradient with softmax."
      },
      {
        "h": "It is not accuracy, and it is unbounded",
        "paras": [
          "Optimising cross-entropy is not optimising accuracy, and the two can rank models in opposite orders. On five examples, a model barely right on all of them (p = 0.51 throughout) scores 100% accuracy and mean cross-entropy 0.673; a model confident on four and wrong on the fifth scores 80% accuracy and mean cross-entropy 0.151 — 4.5x the lower loss with 20 points less accuracy. Selecting on validation loss and reporting accuracy can hand you the worse model.",
          "The second property follows from the logarithm: the loss is unbounded, so a single example can dominate. 999 correct predictions at p = 0.99 contribute 10.04 nats between them; one confident-and-wrong prediction at p = 1e-6 contributes 13.82 nats on its own, about 1,375 times the average example. That is the mechanism behind a loss curve that spikes on one mislabelled row, and the reason label noise hurts this objective more than it hurts a bounded one."
        ]
      }
    ],
    "takeaways": [
      "Cross-entropy is negative log-likelihood of the true class.",
      "It penalizes confident wrong predictions sharply.",
      "With softmax, the gradient is predicted minus actual."
    ],
    "demo": "cross-entropy"
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
  "index": 3,
  "prev": "softmax",
  "next": "bayes"
};
