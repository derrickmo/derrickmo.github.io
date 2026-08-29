// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/foundations/aliasing/.
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
  "conceptId": "aliasing",
  "lesson": {
    "title": "Aliasing & the Nyquist Limit",
    "oneLine": "Sample too slowly and a high frequency comes back wearing a low frequency's clothes — indistinguishably, and permanently.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Sampling a continuous signal at rate fs keeps only its values at regular instants. Two different sinusoids can pass through exactly the same set of sample points, and once you have the samples there is nothing left to tell them apart. The high one has been folded down onto the low one, and no filter applied afterwards can separate them, because the information is not merely buried — it is gone.",
          "Nyquist gives the condition: a signal is recoverable only if it contains no energy at or above half the sampling rate. Anything above that limit does not vanish, it reappears at a mirrored frequency. Sampling a 1,000 Hz test tone at 1,000 Hz produces a measurable tone — and it sits at 100 Hz when the true tone is at 1,100 Hz.",
          "Measured directly, sampling at 1,000 Hz: a 700 Hz tone is detected at 300 Hz, 900 Hz at 100 Hz, 1,100 Hz at 100 Hz, and 1,900 Hz also at 100 Hz. The last two are the important pair — two genuinely different inputs produce the identical output, which is what makes aliasing irreversible rather than merely inconvenient."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Sampling replicates the spectrum at every multiple of fs. The apparent frequency of a tone is its distance to the nearest multiple:"
        ],
        "tex": "f_{\\text{apparent}} = \\bigl| f - f_s \\cdot \\operatorname{round}(f / f_s) \\bigr|, \\qquad \\text{recoverable} \\iff f < f_s/2",
        "texNote": "The fold is a reflection about each multiple of half the sampling rate, which is why the apparent frequency rises and falls as the true one climbs. Every measurement above matched this prediction to within the DFT's own resolution."
      },
      {
        "h": "In code",
        "code": "import numpy as np\n\n# WRONG: throwing away samples is not downsampling\ndef decimate_naive(x, M):\n    return x[::M]\n\n# RIGHT: band-limit FIRST, to below the NEW Nyquist rate, and only then drop samples.\n# The order is the whole point - filtering after the fact cannot undo a fold.\ndef decimate(x, M, fs):\n    from scipy.signal import firwin, filtfilt\n    taps = firwin(101, cutoff=0.5 * (fs / M), fs=fs)   # new Nyquist = fs/M/2\n    return filtfilt(taps, 1.0, x)[::M]",
        "caption": "scipy.signal.decimate does this for you; x[::M] does not. The bug is invisible in code review because both lines produce an array of the right shape."
      },
      {
        "h": "Where it bites, well outside audio",
        "paras": [
          "A concrete measurement: take a signal containing 120 Hz and 1,580 Hz components, sampled at 4,000 Hz, and decimate by 8 down to 500 Hz. The new Nyquist limit is 250 Hz, so 1,580 Hz folds to 80 Hz. Dropping every eighth sample produces an 80 Hz tone at full magnitude 1.000 — a tone that was never present in the input and cannot be distinguished from a real one. Low-pass filtering first leaves it at 0.049, a twentyfold suppression.",
          "That same run also shows the cost honestly: the crude box filter used here pulled the legitimate 120 Hz component down to 0.625. Anti-aliasing filters are not free, and choosing one is a trade between how much you fold and how much of the passband you damage.",
          "The pattern recurs everywhere a signal is sampled on a grid. Image downscaling without pre-filtering produces moiré on striped shirts and brick walls — the same fold in two dimensions, which is why every serious resizer blurs before it shrinks. Rendering strided textures without mipmaps aliases for the same reason. A strided convolution in a network is a decimation with no anti-alias filter, which is the argument behind blur-pool layers and one documented source of shift-instability in CNNs.",
          "And in monitoring: sampling a metric every 60 seconds cannot see a 45-second oscillation. It will report something, and that something will be a plausible-looking slow trend that does not exist. Nothing in the dashboard indicates the number is fictitious."
        ]
      }
    ],
    "takeaways": [
      "Above half the sampling rate a tone does not disappear — it folds to |f - fs*round(f/fs)|, verified here at 700 to 300 Hz and both 1,100 and 1,900 Hz to 100 Hz.",
      "Because two distinct inputs can produce identical samples, aliasing is not recoverable; the filter must come BEFORE the sample-dropping, never after.",
      "It is not an audio-only concern: image moiré, strided convolutions, and metrics sampled slower than the phenomenon they measure are all the same fold."
    ],
    "demo": "aliasing"
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
  "index": 12,
  "prev": "huffman-coding",
  "next": "channel-capacity"
};
