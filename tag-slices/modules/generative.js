// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to modules "generative" (3), for its Connections panel.
// Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "modules": {
    "generative": [
      "vae",
      "gan",
      "diffusion"
    ]
  }
};
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
  "gan": {
    "id": "gan",
    "name": "Generative Adversarial Network",
    "area": "Generative",
    "summary": "Two networks duel — a generator fabricates samples, a discriminator scores them as real or fake. The game's equilibrium is a generator that matches the real distribution.",
    "tex": "\\min_G \\max_D \\; \\mathbb{E}_x[\\log D(x)] + \\mathbb{E}_z[\\log(1 - D(G(z)))]",
    "prereqs": [
      "mlp",
      "cross-entropy"
    ],
    "leadsTo": [
      "diffusion"
    ]
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
  ],
  "gan": [
    {
      "kind": "demo",
      "slug": "gan"
    },
    {
      "kind": "module",
      "slug": "generative"
    }
  ],
  "diffusion": [
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
