// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to modules "pytorch-internals" (3), for its Connections panel.
// Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "modules": {
    "pytorch-internals": [
      "backprop",
      "chain-rule",
      "mixed-precision"
    ]
  }
};
window.CONCEPTS_INDEX = {
  "backprop": {
    "id": "backprop",
    "name": "Backpropagation",
    "area": "Neural Networks",
    "summary": "Apply the chain rule through a computational graph to get gradients for every parameter at once.",
    "prereqs": [
      "chain-rule",
      "gradient-descent"
    ],
    "leadsTo": [
      "activations",
      "mlp",
      "dqn",
      "pruning",
      "saliency",
      "mixed-precision"
    ]
  },
  "chain-rule": {
    "id": "chain-rule",
    "name": "Chain Rule",
    "area": "Optimization",
    "summary": "Compose derivatives through a graph — the calculus identity that makes backprop possible.",
    "tex": "\\frac{\\partial L}{\\partial x} = \\frac{\\partial L}{\\partial y}\\, \\frac{\\partial y}{\\partial x}",
    "leadsTo": [
      "gradient-descent",
      "backprop"
    ],
    "prereqs": []
  },
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
  }
};
window.CONCEPT_REVERSE = {
  "backprop": [
    {
      "kind": "demo",
      "slug": "backprop"
    },
    {
      "kind": "demo",
      "slug": "activations"
    },
    {
      "kind": "demo",
      "slug": "neural-playground"
    },
    {
      "kind": "demo",
      "slug": "pruning"
    },
    {
      "kind": "demo",
      "slug": "saliency"
    },
    {
      "kind": "demo",
      "slug": "autodiff"
    },
    {
      "kind": "module",
      "slug": "neural-nets"
    },
    {
      "kind": "module",
      "slug": "pytorch-internals"
    }
  ],
  "chain-rule": [
    {
      "kind": "demo",
      "slug": "backprop"
    },
    {
      "kind": "demo",
      "slug": "autodiff"
    },
    {
      "kind": "module",
      "slug": "foundations"
    },
    {
      "kind": "module",
      "slug": "pytorch-internals"
    }
  ],
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
  ]
};
