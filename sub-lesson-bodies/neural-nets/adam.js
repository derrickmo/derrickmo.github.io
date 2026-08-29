// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/neural-nets/adam/.
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
  "conceptId": "adam",
  "lesson": {
    "title": "Adam",
    "oneLine": "Per-parameter step sizes from running estimates of the gradient's mean and variance — the default, and worth knowing why it is not always the right default.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Plain SGD uses one learning rate for every parameter, which is a problem when their gradients differ in scale by orders of magnitude — a rate small enough to be stable for the loudest parameter crawls for the quietest one. Adam gives each parameter its own effective step by dividing by a running estimate of that parameter's gradient magnitude.",
          "Two running averages do the work. The first is momentum: a decayed average of recent gradients, which smooths noise and carries the update through flat regions. The second is a decayed average of squared gradients, which measures how large that parameter's gradients have recently been. Dividing one by the root of the other makes the step roughly scale-free."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Two exponential moving averages, a bias correction, and a normalised step:"
        ],
        "tex": "m_t = \\beta_1 m_{t-1} + (1-\\beta_1)g_t,\\quad v_t = \\beta_2 v_{t-1} + (1-\\beta_2)g_t^2,\\quad \\theta_{t+1} = \\theta_t - \\eta\\,\\frac{\\hat{m}_t}{\\sqrt{\\hat{v}_t}+\\epsilon}",
        "texNote": "Both averages start at zero, so early steps are biased toward zero — hence the correction m-hat = m / (1 - beta1^t). Skipping it makes the first few hundred updates far too small, which is exactly the regime where a transformer diverges, and is why warmup and bias correction get discussed together."
      },
      {
        "h": "In code",
        "code": "import numpy as np\n\ndef adam_step(g, state, lr=1e-3, b1=0.9, b2=0.999, eps=1e-8):\n    state[\"t\"] += 1\n    state[\"m\"] = b1 * state[\"m\"] + (1 - b1) * g\n    state[\"v\"] = b2 * state[\"v\"] + (1 - b2) * g * g\n    m_hat = state[\"m\"] / (1 - b1 ** state[\"t\"])     # bias correction\n    v_hat = state[\"v\"] / (1 - b2 ** state[\"t\"])\n    return -lr * m_hat / (np.sqrt(v_hat) + eps)",
        "caption": "Two extra tensors per parameter is the memory cost: an Adam model needs roughly 3x the optimizer state of plain SGD, which is why ZeRO shards it."
      },
      {
        "h": "What it costs, and when SGD still wins",
        "paras": [
          "Adam stores two extra values per parameter, so optimizer state is about twice the model size in fp32. On large models that is often the biggest allocation after the weights themselves, and it is exactly what ZeRO-1 shards across data-parallel ranks — the sharding is exact because Adam is elementwise.",
          "Well-tuned SGD with momentum still generalises better than Adam on many vision benchmarks. The adaptive step is a convenience that finds a decent basin quickly; it is not a guarantee of a better one. Reach for Adam when you cannot afford to tune, which is most of the time, and be honest that it is that trade.",
          "The most common real bug is applying weight decay through Adam's L2 penalty rather than decoupled from it. Adding lambda*theta to the gradient means the decay is also divided by the running variance, so parameters with large gradients get decayed less. AdamW decouples it, and it is not a cosmetic difference."
        ]
      }
    ],
    "takeaways": [
      "Adam is per-parameter step sizes derived from running mean and variance of the gradient — momentum plus a scale normaliser.",
      "Bias correction matters most in the first steps, which is the regime where training actually diverges.",
      "It costs two extra tensors per parameter, and tuned SGD still generalises better on many vision tasks; use AdamW if you decay weights."
    ],
    "demo": "optimizers"
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
  "index": 6,
  "prev": "perceptron",
  "next": "label-noise"
};
