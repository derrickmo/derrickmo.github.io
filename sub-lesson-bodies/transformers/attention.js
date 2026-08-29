// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/transformers/attention/.
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
  "conceptId": "attention",
  "lesson": {
    "title": "Attention",
    "oneLine": "Weight every token by how relevant it is to the one you are computing.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Attention lets each token pull in information from every other token, weighted by relevance. Each token emits a query (what am I looking for?), a key (what do I offer?), and a value (what I'll pass along). A token's output is a relevance-weighted average of everyone's values.",
          "This is the operation that replaced recurrence: instead of passing a state step by step, every token talks to every other token in one parallel step."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Scaled dot-product attention scores each query against every key, softmax-normalizes the scores into weights, and mixes the values. The 1/sqrt(d_k) keeps the dot products from saturating the softmax:"
        ],
        "tex": "\\mathrm{Attention}(Q,K,V) = \\mathrm{softmax}\\!\\Big(\\tfrac{QK^{\\top}}{\\sqrt{d_k}}\\Big)V",
        "texNote": "Q, K, V are linear projections of the input. See the full derivation in the on-site Self-Attention lesson."
      },
      {
        "h": "In code",
        "code": "import numpy as np\n\ndef attention(Q, K, V):\n    dk = Q.shape[-1]\n    scores = Q @ K.T / np.sqrt(dk)     # (n, n) relevance\n    scores -= scores.max(-1, keepdims=True)\n    w = np.exp(scores)\n    w /= w.sum(-1, keepdims=True)      # softmax over keys\n    return w @ V                       # weighted mix of values",
        "caption": "Three matmuls and a softmax — the core of every transformer."
      },
      {
        "h": "The constant in the denominator is load-bearing",
        "paras": [
          "The 1/sqrt(d) in scaled dot-product attention is not cosmetic. A dot product of two d-dimensional unit-variance vectors has variance d, so the logits grow with the head width and softmax saturates. Attending over 64 keys with random vectors, the largest attention weight averages 0.399 at d = 8 and climbs to 0.778 at 64, 0.945 at 512 and 0.968 at 4,096 — effectively one-hot before training has begun, and a saturated softmax has almost no gradient. With the scaling applied the same measurement stays near 0.10 at every width.",
          "The other property is the one that shapes systems. Attention scores are an n-by-n object per head per layer: for a 32-layer, 32-head model in fp16 the scores alone are 2.1 GB at n = 1,024 and 137.4 GB at n = 8,192, against a KV cache of 0.54 GB and 4.29 GB — already 32 times larger, and 512 times larger by n = 131,072. That gap is why FlashAttention's contribution is refusing to materialise the matrix at all rather than computing it faster, and why context length is a memory problem before it is a quality one."
        ]
      }
    ],
    "takeaways": [
      "Attention is a content-based, weighted average of values — no recurrence required.",
      "Queries and keys decide the weights; values carry the information.",
      "The sqrt(d_k) scaling keeps gradients healthy as the dimension grows."
    ],
    "demo": "attention"
  },
  "order": [
    "tokenization",
    "embeddings",
    "attention",
    "multi-head",
    "decoding"
  ],
  "index": 2,
  "prev": "embeddings",
  "next": "multi-head"
};
