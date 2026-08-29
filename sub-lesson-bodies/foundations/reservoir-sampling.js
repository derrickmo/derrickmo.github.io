// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/foundations/reservoir-sampling/.
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
  "conceptId": "reservoir-sampling",
  "lesson": {
    "title": "Reservoir Sampling",
    "oneLine": "A uniform sample of k items from a stream of unknown length, in one pass and constant memory.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "You are reading a log you cannot fit in memory and do not know the length of, and you want k items chosen uniformly at random from all of them. You cannot count first, and you cannot store everything.",
          "Keep the first k. For each later item, decide whether it belongs in the sample with a probability that shrinks exactly as fast as the stream grows, and if it does, evict a uniformly chosen incumbent. Every item ever seen ends up with the same probability of being in the reservoir, and you never knew the total."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Accept item i with probability k/i. The induction is short and worth carrying:"
        ],
        "tex": "P(\\text{item } i \\text{ in reservoir after } n) = \\frac{k}{i}\\prod_{j=i+1}^{n}\\left(1 - \\frac{k}{j}\\cdot\\frac{1}{k}\\right) = \\frac{k}{n}",
        "texNote": "Each surviving step multiplies by (1 - 1/j), and the product telescopes to i/n, cancelling the k/i to leave k/n — the same for every item, which is the definition of uniform. One pass, O(k) memory, no knowledge of n."
      },
      {
        "h": "In code",
        "code": "import random\n\ndef reservoir(stream, k):\n    res = []\n    for i, item in enumerate(stream, start=1):\n        if i <= k:\n            res.append(item)\n        else:\n            j = random.randrange(i)      # 0..i-1, so P(j < k) = k/i\n            if j < k:\n                res[j] = item            # evict a uniformly chosen incumbent\n    return res",
        "caption": "Eight lines. The subtle part is that a single randrange does both jobs — deciding whether to accept AND which slot to overwrite."
      },
      {
        "h": "Where it actually matters",
        "paras": [
          "Any time you need an unbiased sample of a stream too large to store: training-data subsampling from a firehose, log sampling for debugging, or holding a representative window of production traffic for drift monitoring.",
          "The weighted version (A-Res) generalises it by giving each item a key of u^(1/w) for uniform u and weight w, then keeping the k largest keys. That is how you sample proportional to importance without a second pass.",
          "The trap: reservoir sampling is uniform over ITEMS, and that is often not what you want. If your stream is 99% one class, a uniform sample is 99% that class. Stratified reservoirs — one per stratum — are the fix, and choosing between them is a modelling decision rather than an implementation detail."
        ]
      }
    ],
    "takeaways": [
      "One pass, O(k) memory, uniform over a stream whose length you never learn.",
      "The accept probability k/i is what makes the telescoping product come out to k/n for every item.",
      "Uniform over items is not the same as representative — a skewed stream needs a stratified reservoir."
    ],
    "demo": "reservoir-sampling"
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
  "index": 10,
  "prev": "importance-sampling",
  "next": "huffman-coding"
};
