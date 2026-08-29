// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/aliasing/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

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
  ]
};
