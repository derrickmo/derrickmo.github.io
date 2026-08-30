// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "pitch-detection" (3), for its Connections
// panel. Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "pitch-detection": [
      "pitch-detection",
      "fourier",
      "forecasting"
    ]
  },
  "games": {}
};
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
  },
  "forecasting": {
    "id": "forecasting",
    "name": "Exponential Smoothing & ARIMA",
    "area": "Time Series",
    "summary": "Track a series' level, trend, and seasonality with classical smoothers — strong baselines for any deep forecaster.",
    "prereqs": [
      "linear-regression"
    ],
    "leadsTo": []
  }
};
window.CONCEPT_REVERSE = {
  "pitch-detection": [
    {
      "kind": "demo",
      "slug": "pitch-detection"
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
  ],
  "forecasting": [
    {
      "kind": "demo",
      "slug": "forecasting"
    },
    {
      "kind": "demo",
      "slug": "pitch-detection"
    },
    {
      "kind": "module",
      "slug": "ml-applications"
    }
  ]
};
