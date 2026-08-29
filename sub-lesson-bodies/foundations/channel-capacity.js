// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/foundations/channel-capacity/.
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
  "conceptId": "channel-capacity",
  "lesson": {
    "title": "Channel Capacity",
    "oneLine": "The exact number of bits a noisy channel can carry per use — reachable with coding, and unreachable without it.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "A noisy channel corrupts some of what you send. The naive expectation is that reliability must be bought with redundancy, and that driving the error rate toward zero requires the rate to go toward zero with it. Shannon's noisy-channel coding theorem says otherwise: there is a positive rate, the capacity, below which arbitrarily reliable communication is possible, and above which it is not.",
          "Capacity is the maximum mutual information between input and output, maximised over input distributions. Mutual information measures how much observing the output tells you about the input, and choosing the input distribution is choosing how to use the channel.",
          "For a binary symmetric channel that flips each bit with probability p, the capacity is one minus the binary entropy of p. Verified by brute-force search over input distributions rather than assumed: at p of 0, 0.01, 0.1 and 0.25 the maximising input is uniform and the maximised mutual information matches 1 minus H(p) to six decimal places."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Capacity in general, and the two standard channels:"
        ],
        "tex": "C = \\max_{p(x)} I(X;Y), \\qquad C_{\\text{BSC}} = 1 - H(p), \\qquad C_{\\text{AWGN}} = \\tfrac{1}{2}\\log_2\\!\\left(1 + \\mathrm{SNR}\\right)",
        "texNote": "The theorem is asymptotic and non-constructive: it proves good codes exist, by showing the average over random codebooks works, without exhibiting one. Closing that gap took fifty years, ending with turbo codes, LDPC and polar codes."
      },
      {
        "h": "In code",
        "code": "import numpy as np\n\ndef H(p):\n    p = np.clip(p, 1e-12, 1 - 1e-12)\n    return -(p * np.log2(p) + (1 - p) * np.log2(1 - p))\n\ndef bsc_mutual_information(p, q):\n    \"\"\"I(X;Y) for a binary symmetric channel, input P(X=1) = q.\"\"\"\n    py1 = q * (1 - p) + (1 - q) * p\n    return H(py1) - H(p)          # H(Y) - H(Y|X), and H(Y|X) = H(p) regardless of q\n\n# Capacity is the max over q. For the BSC it is at q = 0.5 by symmetry, but for an\n# ASYMMETRIC channel it is not, and there is no closed form - use Blahut-Arimoto, which\n# alternates between the input distribution and the reverse channel and converges to C.",
        "caption": "H(Y|X) = H(p) independently of the input distribution, which is why maximising I(X;Y) reduces to maximising the output entropy H(Y) — and a uniform input is what makes the output uniform."
      },
      {
        "h": "What the number means, and the trap in it",
        "paras": [
          "Capacity is a hard ceiling, not a target. Below it, error probability can be driven to zero with long enough codes; above it, the error probability is bounded away from zero no matter how clever the code. This is the reason a modem's advertised speed does not improve with a better modem past a point — the line's capacity is a property of the line.",
          "The counterintuitive case is worth keeping. Capacity is zero at p equal to 0.5, not at p equal to 1. A channel that flips every single bit is perfectly reliable — invert the output and you have the input, capacity 1 bit, confirmed directly. It is the channel that flips half the time that is useless, because then the output is statistically independent of the input. Noise is only destructive when it is unpredictable; a deterministic corruption is not noise at all.",
          "For the additive-Gaussian channel the capacity is half the log of one plus the signal-to-noise ratio, which is why bandwidth buys more than power: 0.500 bits per use at 0 dB, 1.730 at 10 dB, 3.329 at 20 dB, and 4.984 at 30 dB. Every further 10 dB — a tenfold power increase — adds only about 1.66 bits.",
          "The connection back to machine learning is direct and not merely analogical. A model's cross-entropy on held-out data is literally the number of bits per symbol it needs to encode that data, so a better language model is a better compressor of the same text. And the information bottleneck frames representation learning as a rate-distortion problem — compress the input as far as possible while retaining the information relevant to the label — which is the same optimisation with the same machinery."
        ]
      }
    ],
    "takeaways": [
      "Capacity is the maximum mutual information over input distributions; for the BSC a brute-force search confirmed the maximum is at a uniform input and equals 1 - H(p) exactly.",
      "Capacity is zero at p = 0.5, not p = 1 — a channel that always flips is perfect, because noise only destroys information when it is unpredictable.",
      "Below capacity arbitrarily reliable coding exists and above it does not; and a model's cross-entropy is literally its bits per symbol, which is what links this to compression and the information bottleneck."
    ],
    "demo": "channel-capacity"
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
  "index": 13,
  "prev": "aliasing",
  "next": null
};
