// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/frontier-frameworks/lora/.
// concept-lesson-app.jsx reads window.DM_SUBLESSON_CTX and falls back to
// window.DM_SUBLESSON(...) so the page still works if this file is ever missing.

window.DM_SUBLESSON_CTX = {
  "module": {
    "title": "Concept by concept",
    "lessons": {
      "quantization": {
        "title": "Quantization"
      },
      "speculative-decoding": {
        "title": "Speculative Decoding"
      },
      "lora": {
        "title": "LoRA"
      },
      "moe": {
        "title": "Mixture of Experts"
      }
    }
  },
  "moduleSlug": "frontier-frameworks",
  "conceptId": "lora",
  "lesson": {
    "title": "LoRA",
    "oneLine": "Assume the update is low rank, train two thin matrices, and merge them back for free inference.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Fine-tuning learns a weight UPDATE. LoRA's bet is that this update, unlike the weights themselves, is approximately low rank - the task is a small correction, not a new model. So freeze W and learn BA with an inner dimension r that is tiny next to the layer width.",
          "The memory win is often misattributed. It is not mainly the adapter's size; it is that the frozen base needs no gradients and no optimizer state, which is where the bulk of training memory lives. And because BA is a matrix, it can be added into W after training, so inference costs exactly nothing extra."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "The adapted layer is the frozen weight plus a low-rank correction, scaled:"
        ],
        "tex": "W' = W + \\frac{\\alpha}{r} BA, \\qquad B \\in \\mathbb{R}^{d \\times r},\\; A \\in \\mathbb{R}^{r \\times k}",
        "texNote": "B is zero-initialized, so training starts exactly at the pretrained function and learns a perturbation."
      },
      {
        "h": "In code",
        "code": "class LoRALinear(nn.Module):\n    def __init__(self, base, r, alpha):\n        super().__init__()\n        self.base = base\n        for p in self.base.parameters():\n            p.requires_grad = False              # the actual memory win\n        self.A = nn.Parameter(torch.randn(r, base.in_features) * 0.01)\n        self.B = nn.Parameter(torch.zeros(base.out_features, r))\n        self.s = alpha / r\n\n    def forward(self, x):\n        return self.base(x) + (x @ self.A.T @ self.B.T) * self.s",
        "caption": "Merging W + (alpha/r)BA back into the base weight was verified exact to ~1e-6, so serving is unchanged."
      },
      {
        "h": "It is cheap because it is a restriction",
        "paras": [
          "A LoRA adapter can only express updates of rank r, and that is the whole trade rather than an implementation detail. Approximating a random full-rank 128x128 update, rank 8 captures 46.1% of it while training 12.5% of the parameters, and rank 32 captures 79.1% at 50%. On a target with no low-rank structure the method simply cannot reach the answer, however long you train it.",
          "That it works so well in practice is therefore a claim about fine-tuning rather than about the technique: adapting a pretrained model to a narrow task really does seem to need a low-rank change, which is why rank 8 or 16 is usually enough and why raising the rank stops helping. It also predicts where LoRA struggles — teaching genuinely new capabilities or a new language, where the required update is not a small correction to what the model already computes, and full fine-tuning earns its cost back."
        ]
      }
    ],
    "takeaways": [
      "The saving comes from the frozen base carrying no optimizer state, not from the adapter being small.",
      "Rank should be pushed until it reaches the task's intrinsic rank, then stopped - the curve has an elbow.",
      "Merging makes inference cost identical to the base model, which is the real deployment argument."
    ],
    "demo": "lora"
  },
  "order": [
    "quantization",
    "speculative-decoding",
    "lora",
    "moe"
  ],
  "index": 2,
  "prev": "speculative-decoding",
  "next": "moe"
};
