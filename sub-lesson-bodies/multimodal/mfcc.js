// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/multimodal/mfcc/.
// concept-lesson-app.jsx reads window.DM_SUBLESSON_CTX and falls back to
// window.DM_SUBLESSON(...) so the page still works if this file is ever missing.

window.DM_SUBLESSON_CTX = {
  "module": {
    "title": "Multimodal Learning",
    "lessons": {
      "contrastive-learning": {
        "title": "Contrastive Learning"
      },
      "vector-search": {
        "title": "Vector Search"
      },
      "spectrogram": {
        "title": "Spectrograms & the STFT"
      },
      "mfcc": {
        "title": "Mel Filterbank & MFCC"
      },
      "pitch-detection": {
        "title": "Pitch Detection (Autocorrelation)"
      },
      "dtw": {
        "title": "Dynamic Time Warping"
      }
    }
  },
  "moduleSlug": "multimodal",
  "conceptId": "mfcc",
  "lesson": {
    "title": "Mel Filterbank & MFCC",
    "oneLine": "Warp frequency the way hearing does, take the log, then decorrelate with a DCT — and know that the last step is the one modern systems drop.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "A spectrogram has hundreds of linearly spaced frequency bins, which is not how hearing works and not how speech is organised. Human frequency resolution is fine at the low end and coarse at the high end, so the difference between 200 and 300 Hz is enormous while the difference between 6,000 and 6,100 Hz is inaudible.",
          "The mel scale encodes exactly that. A bank of triangular filters spaced evenly on the mel scale is spaced unevenly in hertz — measured on a standard 26-filter bank, the first filter spans about 76 Hz while the twenty-fifth spans about 699 Hz, a factor of nine. Summing spectral energy within each filter collapses hundreds of bins to 26 numbers that discard mostly what the ear discards.",
          "Then take the logarithm, for two reasons at once. Loudness perception is roughly logarithmic, and more usefully, the log turns the source-filter product into a sum: a voice is a glottal source shaped by a vocal-tract filter, and in the log domain those become additive rather than entangled — which is what makes them separable downstream."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "The mel warping, and the DCT that produces the final coefficients:"
        ],
        "tex": "m = 2595 \\log_{10}\\!\\left(1 + \\frac{f}{700}\\right), \\qquad c_n = \\sum_{k=1}^{K} \\log(E_k)\\,\\cos\\!\\left[\\frac{\\pi n (k - 0.5)}{K}\\right]",
        "texNote": "The warping is near-linear below about 1 kHz and logarithmic above it, which is why the low filters end up narrow and the high ones wide. Typically 12 or 13 coefficients are kept; the higher ones describe fine spectral ripple that is mostly pitch and noise."
      },
      {
        "h": "In code",
        "code": "import numpy as np\n\ndef mel_filterbank(n_filters, n_fft, fs):\n    hz2mel = lambda f: 2595 * np.log10(1 + f / 700)\n    mel2hz = lambda m: 700 * (10 ** (m / 2595) - 1)\n    edges = mel2hz(np.linspace(hz2mel(20), hz2mel(fs / 2), n_filters + 2))\n    bins = np.round(n_fft * edges / fs).astype(int)\n    # A zero-width filter is silently produced when two edges land on the same FFT bin.\n    # At n_fft=512 the lowest filters collapse this way and the features go subtly wrong.\n    assert np.all(np.diff(bins) > 0), \"n_fft too small for this many filters\"\n    fb = np.zeros((n_filters, n_fft // 2 + 1))\n    for m in range(1, n_filters + 1):\n        for k in range(bins[m - 1], bins[m]):\n            fb[m - 1, k] = (k - bins[m - 1]) / (bins[m] - bins[m - 1])\n        for k in range(bins[m], bins[m + 1]):\n            fb[m - 1, k] = (bins[m + 1] - k) / (bins[m + 1] - bins[m])\n    return fb",
        "caption": "The assertion is worth keeping. At 16 kHz with 26 filters, an FFT size of 512 produces degenerate zero-width filters at the bottom of the range and an FFT size of 2048 produces none — a bug that never raises an error and merely makes the low-frequency features meaningless."
      },
      {
        "h": "What the DCT is for, and when to skip it",
        "paras": [
          "Neighbouring log-mel energies are strongly correlated, because a formant is far wider than one filter and lights up several at once. The DCT is applied to decorrelate them, and the justification is precise: the DCT-II approaches the Karhunen-Loeve transform for a first-order Markov source as its correlation coefficient approaches one.",
          "That is measurable rather than merely quotable. Generating band vectors with a controlled correlation and measuring the mean absolute off-diagonal correlation before and after the DCT: at correlation 0 the reduction is 1.6-fold, at 0.6 it is 4.6-fold, at 0.9 it is 28.8-fold, and at 0.99 it is 120-fold. The DCT output sits near 0.01 throughout. The decorrelation is real and it is entirely conditional on the input actually being correlated.",
          "Which explains why the step has largely disappeared. It existed to make diagonal-covariance Gaussian mixture models workable — those models assume independent dimensions, so correlated features violate their central assumption and MFCCs were the fix. A neural network has no such assumption. It can learn any linear mixing itself, and the DCT is an invertible linear map that discards nothing but does throw away the locality that makes convolution over frequency sensible.",
          "So the modern default is log-mel filterbank energies fed straight to the network, and MFCCs persist in speaker recognition, in low-resource settings where 13 numbers per frame is the point, and in a great deal of existing code. Knowing which stage buys what is the difference between copying a pipeline and choosing one."
        ]
      }
    ],
    "takeaways": [
      "Mel-spaced triangular filters are narrow at the bottom and wide at the top — 76 Hz against 699 Hz across one standard 26-filter bank — which discards roughly what the ear discards.",
      "The log makes the source-filter relationship additive; the DCT decorrelates, and measurably so only in proportion to how correlated the bands were (1.6x at correlation 0, 120x at 0.99).",
      "The DCT existed for diagonal-covariance GMMs. Networks do not need it, so log-mel is the modern default — and watch for zero-width filters when the FFT size is too small for the filter count."
    ],
    "demo": "mfcc"
  },
  "order": [
    "contrastive-learning",
    "vector-search",
    "spectrogram",
    "mfcc",
    "pitch-detection",
    "dtw"
  ],
  "index": 3,
  "prev": "spectrogram",
  "next": "pitch-detection"
};
