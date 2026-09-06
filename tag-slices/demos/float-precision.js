// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "float-precision" (2), for its Connections panel.
// Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "float-precision": [
      "mixed-precision",
      "quantization"
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
      "kind": "demo",
      "slug": "float-precision"
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
