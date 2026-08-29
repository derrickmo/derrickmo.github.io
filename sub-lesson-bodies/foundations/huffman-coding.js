// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/foundations/huffman-coding/.
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
  "conceptId": "huffman-coding",
  "lesson": {
    "title": "Huffman Coding",
    "oneLine": "Give frequent symbols short codes — provably optimal among per-symbol codes, and that qualifier is where all the interesting losses hide.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Fixed-length codes spend the same bits on 'e' as on 'z', which is obviously wasteful when one is a hundred times more common. Huffman builds the code bottom-up: repeatedly take the two least frequent symbols, merge them into a node whose frequency is their sum, and let the tree's shape assign the codes.",
          "The result is a prefix code — no codeword is a prefix of another — so a stream decodes unambiguously with no separators. And the greedy construction is provably optimal, which is unusual: most greedy algorithms are heuristics, and this one is the answer."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Entropy is the floor, and Huffman lands within one bit of it:"
        ],
        "tex": "H(X) \\;\\le\\; L_{\\text{Huffman}} \\;<\\; H(X) + 1",
        "texNote": "That +1 is the cost of using a whole number of bits per symbol. It hurts most when the alphabet is small and skewed: a symbol with probability 0.9 deserves 0.15 bits and must be given 1, so a binary source can run 6x over entropy. Arithmetic coding removes exactly this loss by not requiring integer code lengths."
      },
      {
        "h": "In code",
        "code": "import heapq\nfrom collections import Counter\n\ndef huffman(text):\n    heap = [[w, i, {c: \"\"}] for i, (c, w) in enumerate(Counter(text).items())]\n    heapq.heapify(heap)\n    while len(heap) > 1:\n        w1, _, c1 = heapq.heappop(heap)\n        w2, i2, c2 = heapq.heappop(heap)\n        merged = {c: \"0\" + b for c, b in c1.items()}\n        merged.update({c: \"1\" + b for c, b in c2.items()})\n        heapq.heappush(heap, [w1 + w2, i2, merged])\n    return heap[0][2]",
        "caption": "The tie-break index keeps the heap comparison from reaching the dict and makes the output deterministic — ties are common and otherwise the code changes run to run."
      },
      {
        "h": "Why nothing modern uses it alone",
        "paras": [
          "It is optimal only among codes that assign a whole number of bits to each symbol INDEPENDENTLY, and every real source violates the independence part. In English text 'u' after 'q' is nearly certain, and a per-symbol code cannot exploit that at all; a context model can.",
          "So modern compressors use it as the final stage rather than the whole method. DEFLATE finds repeated substrings with LZ77 and Huffman-codes the result; JPEG quantises DCT coefficients and Huffman-codes those. The modelling happens first, and the entropy coder only cashes in whatever skew the model produced.",
          "The same split is worth recognising in machine learning, where the model IS the compressor: a language model's cross-entropy loss is literally the average number of bits it would need to encode the next token, and a better model is a better compressor. The entropy coder is a solved problem; the model is not."
        ]
      }
    ],
    "takeaways": [
      "Greedy bottom-up merging gives a provably optimal prefix code — rare for a greedy algorithm.",
      "It is within one bit of entropy, and that bit is expensive on small skewed alphabets, which is why arithmetic coding exists.",
      "It cannot exploit context, so it is the last stage of a compressor rather than the whole of one — the modelling happens first."
    ],
    "demo": "huffman-coding"
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
  "index": 11,
  "prev": "reservoir-sampling",
  "next": "aliasing"
};
