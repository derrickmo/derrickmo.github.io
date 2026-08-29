// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/neural-nets/label-noise/.
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
  "conceptId": "label-noise",
  "lesson": {
    "title": "Label Noise & Memorization",
    "oneLine": "Networks learn the signal first and memorise the noise afterwards — which is why early stopping is a noise-robustness method, with a measurable payoff.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "A sufficiently large network can fit any labelling of its training set, including labels assigned at random. That result — networks reaching zero training error on randomly shuffled labels — showed that capacity-based explanations of generalisation are incomplete, since the same architecture that generalises well on real labels can memorise nonsense equally well.",
          "The consolation is the ORDER in which it happens. Networks do not fit noisy labels uniformly alongside clean ones. Early in training they learn the patterns shared across many examples, because those produce consistent gradients that reinforce each other. Memorising an individual mislabelled example requires a specific, isolated adjustment, and that happens later.",
          "So training on noisy labels produces a characteristic curve: clean test accuracy rises to a peak while the network learns the real structure, then falls as it starts fitting the mislabelled examples one by one."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Under symmetric label noise the Bayes-optimal classifier is unchanged, which is why the signal is still learnable at all:"
        ],
        "tex": "\\tilde{y} = \\begin{cases} y & \\text{w.p. } 1-\\eta \\\\ \\text{uniform over other classes} & \\text{w.p. } \\eta \\end{cases} \\quad \\Longrightarrow \\quad \\arg\\max_c P(\\tilde{y}=c \\mid x) = \\arg\\max_c P(y=c \\mid x)",
        "texNote": "Symmetric noise below the point where a wrong class overtakes the right one preserves the argmax, so the optimal decision rule survives — only the achievable accuracy on the noisy labels falls. Asymmetric noise, where one class is systematically mislabelled as a specific other, does NOT have this property and is far more damaging."
      },
      {
        "h": "In code",
        "code": "import torch\n\n# 1. Early stopping on a CLEAN validation set is the whole method. It needs only a small\n#    amount of trustworthy data, which is usually affordable even when the training set\n#    is not.\n#\n# 2. Robust losses bound the damage from any single example. MAE is provably robust to\n#    symmetric noise but trains poorly; the generalized cross entropy interpolates:\ndef gce_loss(logits, target, q=0.7):\n    p = torch.softmax(logits, dim=1).gather(1, target[:, None]).squeeze(1)\n    return ((1.0 - p.clamp_min(1e-7) ** q) / q).mean()\n    # q -> 0 recovers cross-entropy (trains fast, not robust)\n    # q -> 1 recovers MAE           (robust, trains slowly)\n\n# 3. Small-loss selection exploits the ordering directly: examples the model still finds\n#    hard LATE in training are disproportionately the mislabelled ones, so train on the\n#    lowest-loss fraction of each batch. Co-teaching runs two networks that select\n#    batches for each other, so neither confirms its own mistakes.",
        "caption": "All three exploit the same fact — that noisy examples are learned later and stay higher-loss for longer. None of them requires knowing which labels are wrong.",
        "paras": [
          "The practical toolkit is small and every part of it rests on the early-learning ordering."
        ]
      },
      {
        "h": "Measured, with a control",
        "paras": [
          "A control comes first, because a decline in test accuracy means nothing if the model never learned the task. On clean labels this setup reaches 98.4 percent test accuracy, so the task is learnable and a decline is attributable to the noise.",
          "With 30 percent of training labels flipped, clean test accuracy peaks at 82.3 percent by epoch 3 and then falls to 71.1 percent by epoch 120 — a loss of 11.2 points, recoverable for free by stopping at the peak. Meanwhile training accuracy on the noisy labels reached 100 percent, against a ceiling of 70 percent for a model that had learned only the signal. It memorised every flipped label individually.",
          "Sweeping the noise level shows the pattern is systematic rather than a single lucky run. The gap between peak and final test accuracy was 0.5 points at zero noise, then 3.0, 7.1, 11.2 and 11.1 points at 10, 20, 30 and 40 percent. The value of early stopping grows with the noise, which is exactly what the early-learning story predicts. And at every noise level the network reached 100 percent training accuracy on the corrupted labels.",
          "Two things to carry into practice. First, your validation set has the same noise as your training set unless you specifically cleaned it, so validation accuracy will also be depressed and the peak in TRUE accuracy is what you want — a small hand-verified validation set is worth more than a large noisy one. Second, treat memorisation as a signal rather than only a nuisance: examples with persistently high loss late in training are the ones worth re-examining, and running that query against a real dataset usually finds genuine labelling errors."
        ]
      }
    ],
    "takeaways": [
      "Networks fit signal before noise, so clean test accuracy peaks and then declines — measured at 82.3% peak against 71.1% final under 30% label noise, an 11.2-point gap.",
      "That gap grows with the noise level (0.5, 3.0, 7.1, 11.2 points at 0-30%), which makes early stopping a noise-robustness method rather than merely an efficiency one.",
      "Robust losses and small-loss selection exploit the same ordering; keep a small hand-verified validation set, since a noisy one hides the peak you are trying to find."
    ],
    "demo": "label-noise"
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
  "index": 7,
  "prev": "adam",
  "next": null
};
