// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/frontier-frameworks/quantization/.
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
  "conceptId": "quantization",
  "lesson": {
    "title": "Quantization",
    "oneLine": "Fewer bits per weight, and the outliers decide how few you can get away with.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Weights trained in 16 bits rarely need 16 bits to be evaluated. Mapping them onto a small grid - int8, int4, or a non-uniform codebook like NF4 - cuts memory and, because decoding is memory-bandwidth-bound, cuts latency roughly in proportion.",
          "What limits how far you can go is not the average weight but the OUTLIERS. A single large value in a tensor stretches the scale so every other weight lands on a coarse grid, which is why per-channel scales beat one per-tensor scale, and why the failure is a cliff rather than a slope."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Affine quantization maps a real range onto integers with a scale and a zero point:"
        ],
        "tex": "q = \\mathrm{round}\\!\\left(\\frac{w}{s}\\right) + z, \\qquad s = \\frac{\\max(w) - \\min(w)}{2^{b} - 1}",
        "texNote": "The scale is set by the extremes, so one outlier degrades every weight sharing that scale."
      },
      {
        "h": "In code",
        "code": "# per-tensor: one scale for everything - cheap, and outlier-sensitive\ns = (w.max() - w.min()) / (2**bits - 1)\n\n# per-channel: one scale per output channel - the standard fix\ns = (w.amax(dim=1, keepdim=True) - w.amin(dim=1, keepdim=True)) / (2**bits - 1)\n\nq = torch.round(w / s).clamp(0, 2**bits - 1)\nw_hat = q * s                                   # dequantized for the matmul",
        "caption": "Measured in the module: per-tensor int4 scored 0.655 against per-channel's 0.732 on the same weights."
      },
      {
        "h": "One outlier sets the scale for everyone",
        "paras": [
          "Quantisation maps a whole tensor onto a grid whose spacing is fixed by the largest magnitude in it, so a single extreme weight coarsens the grid for every other weight. On a Gaussian weight vector the relative error of INT8 is 0.0098; introducing one value at 20 sigma raises it to 0.0432, a factor of 4.4, with every other weight untouched. At INT4 the same outlier takes the error from 0.176 to 0.729.",
          "Grouping is the fix, and it is dramatic: quantising the same outlier-containing vector with 32 separate group scales gives 0.168 at INT4 — back to the clean level, because the outlier now only degrades its own group. This is why per-channel and group-wise scales are standard, why activation outliers in transformers spawned a whole family of outlier-aware methods, and why a quantisation result quoted without the granularity attached does not mean anything."
        ]
      }
    ],
    "takeaways": [
      "The win is bytes read per token, which is why it speeds up decoding and not training.",
      "Outliers set the scale, so granularity matters more than the rounding rule.",
      "Degradation is a cliff - int8 and int4 are often near-free while int2 collapses."
    ],
    "demo": "quantization"
  },
  "order": [
    "quantization",
    "speculative-decoding",
    "lora",
    "moe"
  ],
  "index": 0,
  "prev": null,
  "next": "speculative-decoding"
};
