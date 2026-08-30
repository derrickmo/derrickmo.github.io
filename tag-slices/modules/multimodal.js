// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to modules "multimodal" (4), for its Connections panel.
// Same global names as concepts-index.js, with 184 fewer concepts in them.

window.CONCEPT_TAGS = {
  "modules": {
    "multimodal": [
      "contrastive-learning",
      "embeddings",
      "spectrogram",
      "mfcc"
    ]
  }
};
window.CONCEPTS_INDEX = {
  "contrastive-learning": {
    "id": "contrastive-learning",
    "name": "Contrastive Learning",
    "area": "Neural Networks",
    "summary": "Self-supervised representation learning: make two augmented views of the same item agree in embedding space (positives) while separating all other items (negatives), via the NT-Xent/InfoNCE loss with temperature τ. Minimizing it yields alignment (positives collapse) + uniformity (items spread evenly), the basis of SimCLR, MoCo, and CLIP. Needs many negatives (large batches/queues) and good augmentations; non-contrastive variants (BYOL, VICReg) avoid the collapse problem differently.",
    "tex": "\\ell_i = -\\log\\frac{\\exp(\\mathrm{sim}(z_i,z_i^+)/\\tau)}{\\sum_{k\\neq i}\\exp(\\mathrm{sim}(z_i,z_k)/\\tau)}",
    "prereqs": [
      "embeddings",
      "softmax"
    ],
    "leadsTo": []
  },
  "embeddings": {
    "id": "embeddings",
    "name": "Embeddings",
    "area": "NLP",
    "summary": "Map tokens (or items) to vectors so that distance and direction encode meaning.",
    "prereqs": [
      "tokenization"
    ],
    "leadsTo": [
      "vector-search",
      "attention",
      "word2vec",
      "contrastive-learning",
      "tsne",
      "rag-chunking",
      "semantic-caching",
      "hyde"
    ],
    "animation": "viz/embeddings.html"
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
  }
};
window.CONCEPT_REVERSE = {
  "contrastive-learning": [
    {
      "kind": "demo",
      "slug": "contrastive-learning"
    },
    {
      "kind": "module",
      "slug": "multimodal"
    }
  ],
  "embeddings": [
    {
      "kind": "demo",
      "slug": "pca"
    },
    {
      "kind": "demo",
      "slug": "tsne"
    },
    {
      "kind": "demo",
      "slug": "word2vec"
    },
    {
      "kind": "demo",
      "slug": "attention"
    },
    {
      "kind": "demo",
      "slug": "embeddings"
    },
    {
      "kind": "demo",
      "slug": "contrastive-learning"
    },
    {
      "kind": "demo",
      "slug": "vector-search"
    },
    {
      "kind": "demo",
      "slug": "rag-chunking"
    },
    {
      "kind": "demo",
      "slug": "semantic-caching"
    },
    {
      "kind": "demo",
      "slug": "hyde"
    },
    {
      "kind": "module",
      "slug": "rnn-nlp"
    },
    {
      "kind": "module",
      "slug": "rag-agents"
    },
    {
      "kind": "module",
      "slug": "multimodal"
    },
    {
      "kind": "hf",
      "slug": "fundamentals"
    },
    {
      "kind": "hf",
      "slug": "multimodal"
    },
    {
      "kind": "hf",
      "slug": "agentic"
    }
  ],
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
  "mfcc": [
    {
      "kind": "demo",
      "slug": "mfcc"
    },
    {
      "kind": "module",
      "slug": "multimodal"
    }
  ]
};
