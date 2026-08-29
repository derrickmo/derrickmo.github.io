// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/pitch-detection/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
  "pitch-detection": {
    "id": "pitch-detection",
    "name": "Pitch Detection (Autocorrelation)",
    "area": "Signal",
    "summary": "Estimate the fundamental frequency f0 of a periodic sound by autocorrelation: r(lag) peaks when the signal is shifted by a whole period, so f0 = sample_rate / first_strong_peak_lag. Timbre-independent (works on sines or rich tones); the main failure is octave error, picking 2x or 1/2 the true lag, which noise worsens. Basis of music tuners and the YIN/pYIN trackers. By Wiener-Khinchin, autocorrelation is the inverse transform of the power spectrum — the time-domain twin of reading f0 off the Fourier spectrum.",
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
  "pitch-detection": [
    {
      "kind": "demo",
      "slug": "pitch-detection"
    }
  ]
};
