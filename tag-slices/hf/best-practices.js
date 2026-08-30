// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to hf "best-practices" (2), for its Connections panel.
// Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "hf": {
    "best-practices": [
      "scaling-laws",
      "quantization"
    ]
  }
};
window.CONCEPTS_INDEX = {
  "scaling-laws": {
    "id": "scaling-laws",
    "name": "Neural Scaling Laws",
    "area": "Training Systems",
    "summary": "Test loss falls as a power law in parameters, data, and compute — letting you plan large training runs.",
    "prereqs": [
      "cross-entropy"
    ],
    "leadsTo": [
      "moe"
    ]
  },
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
  }
};
window.CONCEPT_REVERSE = {
  "scaling-laws": [
    {
      "kind": "demo",
      "slug": "scaling-laws"
    },
    {
      "kind": "demo",
      "slug": "moe"
    },
    {
      "kind": "module",
      "slug": "training-systems"
    },
    {
      "kind": "module",
      "slug": "llm-systems"
    },
    {
      "kind": "hf",
      "slug": "best-practices"
    }
  ],
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
    },
    {
      "kind": "hf",
      "slug": "best-practices"
    }
  ]
};
