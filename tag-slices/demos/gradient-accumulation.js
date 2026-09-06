// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "gradient-accumulation" (3), for its Connections panel.
// Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "gradient-accumulation": [
      "mixed-precision",
      "batch-norm",
      "contrastive-learning"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "mixed-precision": {
    "id": "mixed-precision",
    "name": "Mixed-Precision Training",
    "area": "Training Systems",
    "summary": "Train in 16-bit (fp16/bf16) for speed and memory while keeping an fp32 master copy of weights. fp16's narrow exponent range makes small gradients underflow and large ones overflow, so loss scaling multiplies the loss (and gradients) into the representable window and unscales before the step. bf16 keeps fp32's range (no scaling) at the cost of mantissa bits.",
    "prereqs": [
      "backprop",
      "quantization"
    ],
    "leadsTo": []
  },
  "batch-norm": {
    "id": "batch-norm",
    "name": "Batch Normalization",
    "area": "Neural Networks",
    "summary": "Re-standardizes each feature across the mini-batch before the nonlinearity, then rescales/shifts with learnable γ, β. Keeps activation distributions stable across depth regardless of the weights above, which smooths the loss landscape and lets you train deeper nets at higher learning rates. Behaves differently at train (batch stats) vs inference (running averages) and degrades with small batches — motivating LayerNorm/RMSNorm in sequence models and large transformers.",
    "tex": "\\hat z = \\frac{z - \\mu_B}{\\sqrt{\\sigma_B^2 + \\epsilon}}, \\quad y = \\gamma\\hat z + \\beta",
    "prereqs": [
      "activations",
      "mlp"
    ],
    "leadsTo": []
  },
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
  }
};
window.CONCEPT_REVERSE = {
  "mixed-precision": [
    {
      "kind": "demo",
      "slug": "mixed-precision"
    },
    {
      "kind": "demo",
      "slug": "float-precision"
    },
    {
      "kind": "demo",
      "slug": "gradient-accumulation"
    },
    {
      "kind": "module",
      "slug": "pytorch-internals"
    }
  ],
  "batch-norm": [
    {
      "kind": "demo",
      "slug": "batch-norm"
    },
    {
      "kind": "demo",
      "slug": "broadcasting"
    },
    {
      "kind": "demo",
      "slug": "gradient-accumulation"
    }
  ],
  "contrastive-learning": [
    {
      "kind": "demo",
      "slug": "contrastive-learning"
    },
    {
      "kind": "demo",
      "slug": "gradient-accumulation"
    },
    {
      "kind": "module",
      "slug": "multimodal"
    }
  ]
};
