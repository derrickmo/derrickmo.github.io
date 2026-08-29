// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/foundations/entropy/.
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
  "conceptId": "entropy",
  "lesson": {
    "title": "Entropy and Information",
    "oneLine": "Measure how much uncertainty a distribution carries, in bits.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Entropy quantifies surprise. A fair coin is maximally uncertain (1 bit); a loaded one carries less. It is the currency behind decision-tree splits (which question removes the most uncertainty?), cross-entropy loss, and compression."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Entropy is the expected number of bits to encode an outcome:"
        ],
        "tex": "H(p) = -\\sum_i p_i \\log_2 p_i",
        "texNote": "Maximized by the uniform distribution; zero when one outcome is certain."
      },
      {
        "h": "In code",
        "code": "import numpy as np\n\ndef entropy(p):\n    p = np.asarray(p)\n    p = p[p > 0]\n    return -np.sum(p * np.log2(p))",
        "caption": "A decision tree picks the split that drops this the most."
      },
      {
        "h": "It cannot see structure",
        "paras": [
          "Entropy is a property of the distribution over symbols, not of their arrangement. The sequences AAAAAAAABBBBBBBB, ABABABABABABABAB and ABBABAABBAABABBA all measure exactly 1.0000 bits per symbol, because each contains eight As and eight Bs. One is perfectly ordered, one perfectly periodic and one shuffled, and the measure cannot tell them apart.",
          "That is a specification rather than a defect, and knowing it tells you when to reach for something else. Structure that lives in the ordering — periodicity, long-range dependence, grammar — needs a model with memory before entropy will register it: conditional entropy, block entropy over n-grams, or a compressor. It is also why \"high entropy\" is not a synonym for \"random\": the periodic sequence above is entirely predictable and scores the maximum."
        ]
      }
    ],
    "takeaways": [
      "Entropy measures uncertainty in bits.",
      "Information gain (entropy drop) drives decision-tree splits.",
      "Cross-entropy, the workhorse classification loss, is built from it."
    ],
    "demo": "decision-tree"
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
  "index": 5,
  "prev": "bayes",
  "next": "clt"
};
