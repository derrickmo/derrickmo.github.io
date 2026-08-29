// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/neural-nets/activations/.
// concept-lesson-app.jsx reads window.DM_SUBLESSON_CTX and falls back to
// window.DM_SUBLESSON(...) so the page still works if this file is ever missing.

window.DM_SUBLESSON_CTX = {
  "module": {
    "title": "Neural Networks from Scratch",
    "lessons": {
      "mlp": {
        "title": "The Multilayer Perceptron"
      },
      "activations": {
        "title": "Activation Functions"
      },
      "optimizers": {
        "title": "Optimizers: SGD to Adam"
      },
      "batch-norm": {
        "title": "Batch Normalization"
      },
      "weight-init": {
        "title": "Weight Initialization"
      },
      "perceptron": {
        "title": "The Perceptron"
      },
      "adam": {
        "title": "Adam"
      },
      "label-noise": {
        "title": "Label Noise & Memorization"
      }
    }
  },
  "moduleSlug": "neural-nets",
  "conceptId": "activations",
  "lesson": {
    "title": "Activation Functions",
    "oneLine": "The per-neuron nonlinearity that gives a network its expressive power.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Activations decide whether and how strongly a neuron fires. ReLU is the default - cheap, and it avoids the vanishing gradients that crippled deep sigmoid networks. Variants (LeakyReLU, GELU, SiLU) tweak the behavior near zero. The choice affects how easily gradients flow through depth."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "ReLU passes positives and zeroes negatives:"
        ],
        "tex": "\\mathrm{ReLU}(x) = \\max(0, x)",
        "texNote": "Its gradient is 1 for positive inputs - no shrinking signal as depth grows."
      },
      {
        "h": "In code",
        "code": "import numpy as np\nrelu  = lambda x: np.maximum(0, x)\ngelu  = lambda x: 0.5 * x * (1 + np.tanh(0.797 * (x + 0.044 * x**3)))\nsilu  = lambda x: x / (1 + np.exp(-x))",
        "caption": "Different shapes near zero, same job: inject nonlinearity."
      },
      {
        "h": "Both failure modes are the same fact",
        "paras": [
          "Saturating activations throttle the gradient by construction. The sigmoid's derivative peaks at 0.25 and falls to 0.0177 at z = 4 and 0.000335 at z = 8; tanh reaches 0.0013 at z = 4 and underflows by z = 8. Because backprop multiplies these together, even the best case compounds: ten stacked sigmoid layers, every one sitting at its most favourable point, still leaves a factor of 9.54e-7.",
          "ReLU removes that ceiling for positive inputs — its derivative is exactly 1 — and buys a different failure with the same shape. A unit whose pre-activation is negative for every input in the dataset receives a gradient of exactly zero, forever, and nothing can revive it. Constructed with a bias offset of -3, 24.4% of units never fire on any of 2,000 inputs; in training that offset is what a single oversized update leaves behind. Leaky ReLU, ELU and GELU all exist to keep that derivative non-zero so a unit that stops firing can still come back."
        ]
      }
    ],
    "takeaways": [
      "Activations make a deep stack more than one linear layer.",
      "ReLU keeps gradients alive through depth.",
      "GELU/SiLU are smooth variants common in transformers."
    ],
    "demo": "activations"
  },
  "order": [
    "mlp",
    "activations",
    "optimizers",
    "batch-norm",
    "weight-init",
    "perceptron",
    "adam",
    "label-noise"
  ],
  "index": 1,
  "prev": "mlp",
  "next": "optimizers"
};
