// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "diffusion" (2), for its Connections
// panel. Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "diffusion": [
      "diffusion",
      "vae"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
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
  },
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
  }
};
window.CONCEPT_REVERSE = {
  "diffusion": [
    {
      "kind": "demo",
      "slug": "diffusion"
    },
    {
      "kind": "module",
      "slug": "generative"
    }
  ],
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
