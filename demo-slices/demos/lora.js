// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "lora" (2), for its Connections
// panel. Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "lora": [
      "lora",
      "pca"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "lora": {
    "id": "lora",
    "name": "LoRA (Low-Rank Adaptation)",
    "area": "Fine-Tuning",
    "summary": "Freeze the base model and learn a thin rank-r product B·A per layer — adapt big models on a budget.",
    "prereqs": [
      "pca",
      "mlp",
      "attention"
    ],
    "leadsTo": [
      "quantization"
    ]
  },
  "pca": {
    "id": "pca",
    "name": "PCA / SVD",
    "area": "Classical ML",
    "summary": "Project data onto the eigenvectors of its covariance — the basic linear dimensionality reduction.",
    "leadsTo": [
      "embeddings",
      "lora",
      "tsne",
      "ica",
      "manifold-learning",
      "harris-corners",
      "spectral-clustering"
    ],
    "prereqs": []
  }
};
window.CONCEPT_REVERSE = {
  "lora": [
    {
      "kind": "demo",
      "slug": "lora"
    },
    {
      "kind": "demo",
      "slug": "quantization"
    },
    {
      "kind": "module",
      "slug": "fine-tuning"
    },
    {
      "kind": "module",
      "slug": "frontier-frameworks"
    },
    {
      "kind": "hf",
      "slug": "advanced"
    }
  ],
  "pca": [
    {
      "kind": "demo",
      "slug": "pca"
    },
    {
      "kind": "demo",
      "slug": "ica"
    },
    {
      "kind": "demo",
      "slug": "tsne"
    },
    {
      "kind": "demo",
      "slug": "isomap"
    },
    {
      "kind": "demo",
      "slug": "lora"
    },
    {
      "kind": "demo",
      "slug": "spectral-clustering"
    },
    {
      "kind": "demo",
      "slug": "pagerank"
    },
    {
      "kind": "module",
      "slug": "unsupervised-learning"
    }
  ]
};
