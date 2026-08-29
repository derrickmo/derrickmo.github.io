// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/vae/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
  "vae": {
    "id": "vae",
    "name": "Variational Autoencoder",
    "area": "Generative",
    "summary": "Encode to a Gaussian latent, sample via the reparameterization trick, decode — KL pulls the latent to a usable prior.",
    "prereqs": [
      "gmm-em"
    ],
    "leadsTo": [
      "diffusion"
    ]
  },
  "gmm-em": {
    "id": "gmm-em",
    "name": "Gaussian Mixtures & EM",
    "area": "Classical ML",
    "summary": "Soft clustering by alternating responsibilities (E-step) and Gaussian re-fits (M-step) — the ancestor of variational inference.",
    "prereqs": [
      "kmeans"
    ],
    "leadsTo": [
      "vae"
    ]
  },
  "kmeans": {
    "id": "kmeans",
    "name": "K-Means Clustering",
    "area": "Classical ML",
    "summary": "Alternate-assign-then-update centroids until clusters stabilize (Lloyd's algorithm).",
    "leadsTo": [
      "gmm-em",
      "hierarchical-clustering",
      "spectral-clustering",
      "coreset"
    ],
    "prereqs": []
  },
  "diffusion": {
    "id": "diffusion",
    "name": "Diffusion Models",
    "area": "Generative",
    "summary": "Add noise to data step by step, then learn to reverse it — the engine behind modern image/video generators.",
    "prereqs": [
      "mlp",
      "vae"
    ],
    "leadsTo": []
  }
};
window.CONCEPT_REVERSE = {
  "vae": [
    {
      "kind": "demo",
      "slug": "variational-inference"
    },
    {
      "kind": "demo",
      "slug": "vae"
    },
    {
      "kind": "demo",
      "slug": "diffusion"
    },
    {
      "kind": "module",
      "slug": "generative"
    }
  ]
};
