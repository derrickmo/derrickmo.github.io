// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/foundations/softmax/.
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
  "conceptId": "softmax",
  "lesson": {
    "title": "Softmax",
    "oneLine": "Turn a vector of scores into a probability distribution.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Softmax converts arbitrary real-valued scores (logits) into positive numbers that sum to one - a probability distribution. It is the output layer of nearly every classifier and the normalizer inside attention. The largest logit gets the most mass, but everything keeps a share, so it stays differentiable."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Exponentiate, then normalize:"
        ],
        "tex": "\\mathrm{softmax}(z)_i = \\frac{e^{z_i}}{\\sum_j e^{z_j}}",
        "texNote": "Subtract the max before exponentiating for numerical stability."
      },
      {
        "h": "In code",
        "code": "import numpy as np\n\ndef softmax(z):\n    z = z - z.max()          # stability\n    e = np.exp(z)\n    return e / e.sum()",
        "caption": "Shift, exponentiate, normalize."
      },
      {
        "h": "Invariant to shift, and not to scale",
        "paras": [
          "Softmax is exactly invariant to adding a constant to every logit: [2.0, 1.0, 0.5] and [12.0, 11.0, 10.5] both give [0.6285, 0.2312, 0.1402]. That invariance is what makes subtracting the maximum safe, and it is the only reason the function can be evaluated at all without overflowing. It is emphatically not invariant to scaling — doubling the same logits gives [0.8438, 0.1142, 0.0420].",
          "Scaling the logits IS the temperature knob: dividing by T = 0.5 and multiplying by 2 are the same operation. So the sharpness of the output is a free parameter the logits do not pin down. At T = 10 the same example flattens to [0.362, 0.327, 0.311], nearly uniform, with the ranking completely unchanged. A softmax output is therefore an ordering plus an arbitrary confidence, which is exactly why it is not a calibrated probability until something like temperature scaling has fitted that one number on held-out data."
        ]
      }
    ],
    "takeaways": [
      "Softmax maps logits to a probability distribution.",
      "It is the classifier head and the attention normalizer.",
      "Subtract the max for numerical stability."
    ],
    "demo": "decoding"
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
  "index": 2,
  "prev": "gradient-descent",
  "next": "cross-entropy"
};
