// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "spectrogram" (2), for its Connections panel.
// Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "spectrogram": [
      "spectrogram",
      "fourier"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "spectrogram": {
    "id": "spectrogram",
    "name": "Spectrogram (STFT)",
    "area": "Signal",
    "summary": "The Short-Time Fourier Transform slides a window along a signal and FFTs each chunk, producing a time-frequency image — the spectrogram. The window length sets a hard tradeoff: short windows resolve time but smear frequency, long windows resolve frequency but smear time (the time-frequency uncertainty principle). It is the standard front end for speech and audio models, usually feeding a mel/MFCC stage or a CNN.",
    "prereqs": [
      "fourier"
    ],
    "leadsTo": [
      "mfcc"
    ]
  },
  "fourier": {
    "id": "fourier",
    "name": "Fourier Series",
    "area": "Signal",
    "summary": "Any periodic signal decomposes into a sum of sines and cosines — the backbone of signal processing and positional encodings.",
    "leadsTo": [
      "positional-encoding",
      "spectrogram",
      "mfcc",
      "pitch-detection",
      "aliasing"
    ],
    "prereqs": []
  }
};
window.CONCEPT_REVERSE = {
  "spectrogram": [
    {
      "kind": "demo",
      "slug": "spectrogram"
    },
    {
      "kind": "demo",
      "slug": "mfcc"
    },
    {
      "kind": "module",
      "slug": "multimodal"
    }
  ],
  "fourier": [
    {
      "kind": "demo",
      "slug": "positional-encoding"
    },
    {
      "kind": "demo",
      "slug": "fourier"
    },
    {
      "kind": "demo",
      "slug": "spectrogram"
    },
    {
      "kind": "demo",
      "slug": "mfcc"
    },
    {
      "kind": "demo",
      "slug": "pitch-detection"
    },
    {
      "kind": "demo",
      "slug": "aliasing"
    },
    {
      "kind": "hf",
      "slug": "audio"
    }
  ]
};
