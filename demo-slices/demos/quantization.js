// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "quantization" (2), for its Connections
// panel. Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "quantization": [
      "quantization",
      "lora"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "quantization": {
    "id": "quantization",
    "name": "Quantization",
    "area": "Fine-Tuning",
    "summary": "Shrink a model by storing weights (and activations) in low-bit integers instead of 32-bit floats. A scale maps floats to a small grid of levels; fewer bits = smaller/faster but coarser. Outliers stretch the scale and dominate the error, which is why LLM quantization (GPTQ, AWQ, QLoRA's NF4) is outlier-aware and often per-channel.",
    "tex": "q = \\mathrm{clamp}\\!\\left( \\mathrm{round}\\!\\left( \\tfrac{w}{s} \\right),\\, -2^{b-1},\\, 2^{b-1}-1 \\right),\\quad s = \\tfrac{\\max|w|}{2^{b-1}-1}",
    "prereqs": [
      "lora"
    ],
    "leadsTo": [
      "pruning",
      "distillation",
      "mixed-precision"
    ]
  },
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
  }
};
window.CONCEPT_REVERSE = {
  "quantization": [
    {
      "kind": "demo",
      "slug": "quantization"
    },
    {
      "kind": "demo",
      "slug": "mixed-precision"
    },
    {
      "kind": "module",
      "slug": "frontier-frameworks"
    }
  ],
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
  ]
};
