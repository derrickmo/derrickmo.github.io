// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/fourier/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
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
  "positional-encoding": {
    "id": "positional-encoding",
    "name": "Positional Encoding (sinusoidal / RoPE)",
    "area": "Transformers",
    "summary": "Inject order into attention — sinusoidal vectors or RoPE rotations that encode relative position.",
    "prereqs": [
      "attention",
      "fourier"
    ],
    "leadsTo": [
      "rope",
      "context-extension"
    ]
  },
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
  "mfcc": {
    "id": "mfcc",
    "name": "Mel Filterbank & MFCC",
    "area": "Signal",
    "summary": "The classic speech feature: take a frame's power spectrum, pool it through triangular filters spaced on the perceptual mel scale, take the log (loudness compression), then a DCT to decorrelate the bands into a handful of cepstral coefficients. The first ~13 capture the spectral envelope (the phoneme / vocal-tract shape) while discarding pitch and noise. Dominated speech recognition (with GMM-HMMs) for decades; modern systems often feed log-mel spectrograms straight to a CNN/transformer instead.",
    "prereqs": [
      "spectrogram",
      "fourier"
    ],
    "leadsTo": []
  },
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
  "aliasing": {
    "id": "aliasing",
    "name": "Aliasing & the Nyquist Limit",
    "area": "Signal",
    "summary": "The Nyquist-Shannon theorem: a signal is captured faithfully only if sampled faster than twice its highest frequency (the Nyquist rate). Sample too slowly and high frequencies FOLD back as lower-frequency aliases, f_alias = |f - fs·round(f/fs)|, indistinguishable from real low frequencies in the samples. The fix is always to band-limit (anti-alias low-pass filter) before sampling. Shows up as the wagon-wheel effect, image moire, and downsampling artifacts in CNNs.",
    "prereqs": [
      "fourier"
    ],
    "leadsTo": []
  }
};
window.CONCEPT_REVERSE = {
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
