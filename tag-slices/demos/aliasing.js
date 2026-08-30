// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "aliasing" (2), for its Connections panel.
// Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "aliasing": [
      "aliasing",
      "fourier"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "aliasing": {
    "id": "aliasing",
    "name": "Aliasing & the Nyquist Limit",
    "area": "Signal",
    "summary": "The Nyquist-Shannon theorem: a signal is captured faithfully only if sampled faster than twice its highest frequency (the Nyquist rate). Sample too slowly and high frequencies FOLD back as lower-frequency aliases, f_alias = |f - fs·round(f/fs)|, indistinguishable from real low frequencies in the samples. The fix is always to band-limit (anti-alias low-pass filter) before sampling. Shows up as the wagon-wheel effect, image moire, and downsampling artifacts in CNNs.",
    "prereqs": [
      "fourier"
    ],
    "leadsTo": []
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
  "aliasing": [
    {
      "kind": "demo",
      "slug": "aliasing"
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
