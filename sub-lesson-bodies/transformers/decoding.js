// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/transformers/decoding/.
// concept-lesson-app.jsx reads window.DM_SUBLESSON_CTX and falls back to
// window.DM_SUBLESSON(...) so the page still works if this file is ever missing.

window.DM_SUBLESSON_CTX = {
  "module": {
    "title": "Transformers",
    "lessons": {
      "tokenization": {
        "title": "Tokenization"
      },
      "embeddings": {
        "title": "Embeddings"
      },
      "attention": {
        "title": "Attention"
      },
      "multi-head": {
        "title": "Multi-Head Attention"
      },
      "decoding": {
        "title": "Decoding"
      }
    }
  },
  "moduleSlug": "transformers",
  "conceptId": "decoding",
  "lesson": {
    "title": "Decoding",
    "oneLine": "Turn the model's next-token distribution into actual generated text.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "A language model outputs a probability distribution over the next token. Decoding is the policy that picks one — and that choice shapes everything about the output. Always taking the argmax (greedy) is fluent but repetitive; sampling adds variety but can wander.",
          "Temperature sharpens or flattens the distribution; top-k and top-p (nucleus) clip the long tail so you sample only from plausible tokens; beam search keeps several candidate continuations at once."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Temperature T rescales the logits before the softmax — low T concentrates probability on the top tokens, high T spreads it out:"
        ],
        "tex": "p_i = \\frac{\\exp(z_i / T)}{\\sum_j \\exp(z_j / T)}",
        "texNote": "T -> 0 recovers greedy argmax; T = 1 is the model's raw distribution."
      },
      {
        "h": "In code",
        "code": "import numpy as np\n\ndef sample(logits, T=1.0, top_p=0.9):\n    z = logits / T\n    p = np.exp(z - z.max()); p /= p.sum()\n    order = np.argsort(p)[::-1]                 # nucleus: keep smallest\n    keep = order[np.cumsum(p[order]) <= top_p]  # set with mass >= top_p\n    if len(keep) == 0: keep = order[:1]\n    p2 = p[keep] / p[keep].sum()\n    return np.random.choice(keep, p=p2)",
        "caption": "Temperature reshapes the distribution; top-p trims the tail before sampling."
      },
      {
        "h": "The most likely continuation is a loop",
        "paras": [
          "Maximising likelihood and producing good text are different objectives, and the gap is easy to see on a real if small model. Building a bigram model over this site's prose and decoding 25 tokens, greedy search achieves an average log-probability of -2.849 per token and uses 4 distinct words: it emits \"the same data and the same data and the same data\" indefinitely. Sampling from the same model scores a worse -3.315 and uses 24 distinct words.",
          "Greedy won on the metric and lost on the task, and this is not an artefact of a small model — the same degeneration is why beam search, which finds even higher-likelihood sequences, is standard for translation and unusable for open-ended generation. A well-fitted model assigns high probability to repetition because repetition is locally predictable, so the decoding strategy has to supply the diversity the objective never asked for. That is what temperature, top-k, nucleus sampling and repetition penalties are all doing, and why the choice of decoder is a product decision rather than a detail."
        ]
      }
    ],
    "takeaways": [
      "Decoding is a separate policy on top of the model's distribution — it controls the style of the output.",
      "Temperature trades determinism for diversity; top-k / top-p remove implausible tokens.",
      "Greedy is just temperature -> 0; beam search searches several continuations at once."
    ],
    "demo": "decoding"
  },
  "order": [
    "tokenization",
    "embeddings",
    "attention",
    "multi-head",
    "decoding"
  ],
  "index": 4,
  "prev": "multi-head",
  "next": null
};
