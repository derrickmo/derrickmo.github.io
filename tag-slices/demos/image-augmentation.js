// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "image-augmentation" (3), for its Connections panel.
// Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "image-augmentation": [
      "data-augmentation",
      "regularization",
      "convolution"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "data-augmentation": {
    "id": "data-augmentation",
    "name": "Data Augmentation",
    "area": "Data-Centric",
    "summary": "Synthesize new training examples by applying random transforms that change the input but not the label — horizontal flip, rotation, random-resized-crop, color/brightness jitter, and cutout/random-erasing for images. This enlarges and diversifies a finite dataset for free and bakes in known invariances, so the model learns features that survive the nuisances rather than memorizing exact pixels — one of the most reliable regularizers in deep learning. Each transform encodes a domain assumption (flipping a digit can change its label), so the augmentation set is task-specific. The idea generalizes to token masking/synonym swaps in NLP and time/frequency masking on audio, and the two-view scheme is the engine of contrastive self-supervised learning.",
    "prereqs": [
      "convolution",
      "regularization"
    ],
    "leadsTo": []
  },
  "regularization": {
    "id": "regularization",
    "name": "Regularization (L2 / weight decay)",
    "area": "Evaluation & Calibration",
    "summary": "Penalize large weights to fight overfitting — the same dial whether it's ridge, weight decay, or dropout.",
    "prereqs": [
      "overfitting"
    ],
    "tex": "\\mathcal{L} + \\lambda \\lVert \\theta \\rVert^2",
    "leadsTo": [
      "proximal-gradient",
      "sparse-autoencoder",
      "double-descent",
      "data-augmentation"
    ]
  },
  "convolution": {
    "id": "convolution",
    "name": "Convolution (CNN)",
    "area": "Computer Vision",
    "summary": "Slide a small learned kernel across an image — weight sharing + translation invariance.",
    "prereqs": [
      "mlp"
    ],
    "animation": "viz/convolution.html",
    "leadsTo": [
      "morphological-operations",
      "template-matching",
      "cnn",
      "edge-detection",
      "hog",
      "data-augmentation"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "data-augmentation": [
    {
      "kind": "demo",
      "slug": "image-augmentation"
    }
  ],
  "regularization": [
    {
      "kind": "demo",
      "slug": "ista"
    },
    {
      "kind": "demo",
      "slug": "sparse-autoencoder"
    },
    {
      "kind": "demo",
      "slug": "overfitting"
    },
    {
      "kind": "demo",
      "slug": "cross-validation"
    },
    {
      "kind": "demo",
      "slug": "double-descent"
    },
    {
      "kind": "demo",
      "slug": "bias-variance-decomp"
    },
    {
      "kind": "demo",
      "slug": "svm"
    },
    {
      "kind": "demo",
      "slug": "image-augmentation"
    },
    {
      "kind": "module",
      "slug": "ml-theory"
    }
  ],
  "convolution": [
    {
      "kind": "demo",
      "slug": "morphological-ops"
    },
    {
      "kind": "demo",
      "slug": "template-matching"
    },
    {
      "kind": "demo",
      "slug": "convolution"
    },
    {
      "kind": "demo",
      "slug": "edge-detection"
    },
    {
      "kind": "demo",
      "slug": "image-augmentation"
    },
    {
      "kind": "demo",
      "slug": "bilateral-filter"
    },
    {
      "kind": "demo",
      "slug": "image-pyramids"
    },
    {
      "kind": "demo",
      "slug": "receptive-field"
    },
    {
      "kind": "demo",
      "slug": "integral-image"
    },
    {
      "kind": "demo",
      "slug": "sift"
    },
    {
      "kind": "module",
      "slug": "cnn"
    },
    {
      "kind": "hf",
      "slug": "computer-vision"
    }
  ]
};
