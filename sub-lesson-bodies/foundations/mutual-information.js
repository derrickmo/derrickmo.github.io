// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/foundations/mutual-information/.
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
  "conceptId": "mutual-information",
  "lesson": {
    "title": "Mutual Information",
    "oneLine": "How many bits knowing one variable saves you about another — a dependence measure that sees every relationship, not just linear ones.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Correlation asks whether two variables move together in a straight line. Plenty of real dependence is not a straight line: y = x squared has a correlation near zero on symmetric data while x determines y exactly. Mutual information asks the more basic question — does knowing X reduce your uncertainty about Y?",
          "It is zero if and only if the two are independent, which correlation cannot claim. That is the property worth paying for, and the cost is that it is much harder to estimate."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "The reduction in entropy, equivalently the KL divergence between the joint and the product of marginals:"
        ],
        "tex": "I(X;Y) = H(X) - H(X\\mid Y) = \\sum_{x,y} p(x,y)\\log\\frac{p(x,y)}{p(x)p(y)}",
        "texNote": "It is symmetric, non-negative, and measured in bits with log base 2. Zero exactly when p(x,y) = p(x)p(y) everywhere — that is what independence means, so the equivalence is a definition rather than a theorem."
      },
      {
        "h": "In code",
        "code": "import numpy as np\n\ndef mutual_information(x, y, bins=16):\n    joint, _, _ = np.histogram2d(x, y, bins=bins)\n    p = joint / joint.sum()\n    px = p.sum(1, keepdims=True)\n    py = p.sum(0, keepdims=True)\n    nz = p > 0                            # 0 log 0 is 0, not nan\n    return float((p[nz] * np.log2(p[nz] / (px @ py)[nz])).sum())",
        "caption": "Note the mask. Skipping it gives log(0) and a silent NaN, which is the single most common bug in a from-scratch MI implementation."
      },
      {
        "h": "The estimation problem, which is the real story",
        "paras": [
          "Binning continuous variables makes the estimate depend on the bin count, and the bias runs in a predictable direction: too many bins and every point lands in its own cell, so the estimate climbs toward its maximum on pure noise. Any MI number reported without its binning scheme is uninterpretable.",
          "It has no natural upper bound the way correlation is capped at one, so a raw MI value is hard to compare across variable pairs. Normalised variants divide by an entropy to restore a 0-to-1 scale, at the cost of a choice about which entropy.",
          "Where it earns its keep: feature selection that should notice non-monotone relationships, the information bottleneck view of representation learning, and as the quantity that InfoNCE and contrastive objectives are lower-bounding — which is why contrastive learning is often described as maximising mutual information between views."
        ]
      }
    ],
    "takeaways": [
      "MI is zero if and only if the variables are independent — a guarantee correlation cannot make.",
      "It measures the bits knowing one saves about the other, and it catches non-linear dependence.",
      "Estimating it from samples is the hard part: binning drives the answer, and on noise a fine binning reports dependence that is not there."
    ],
    "demo": "mutual-information"
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
  "index": 8,
  "prev": "fourier",
  "next": "importance-sampling"
};
