// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/advanced-nlp/kv-cache/.
// concept-lesson-app.jsx reads window.DM_SUBLESSON_CTX and falls back to
// window.DM_SUBLESSON(...) so the page still works if this file is ever missing.

window.DM_SUBLESSON_CTX = {
  "module": {
    "title": "Advanced NLP and Generation",
    "lessons": {
      "beam-search": {
        "title": "Beam Search"
      },
      "rope": {
        "title": "Rotary Position Embeddings"
      },
      "kv-cache": {
        "title": "The KV Cache"
      }
    }
  },
  "moduleSlug": "advanced-nlp",
  "conceptId": "kv-cache",
  "lesson": {
    "title": "The KV Cache",
    "oneLine": "Cache past keys and values so each new token is cheap to generate.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "When generating text token by token, the keys and values for all previous tokens never change. Recomputing them every step is wasteful. The KV cache stores them, so producing the next token only computes one new query against the cached keys and values - turning quadratic regeneration into linear growth."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Step t attends a single new query against all cached keys and values:"
        ],
        "tex": "o_t = \\mathrm{softmax}\\!\\Big(\\tfrac{q_t K_{1:t}^{\\top}}{\\sqrt{d}}\\Big) V_{1:t}",
        "texNote": "Only q_t is new each step; K and V are appended to and reused from the cache."
      },
      {
        "h": "In code",
        "code": "# generation loop with a growing cache\nK_cache, V_cache = [], []\nfor step in range(max_len):\n    q, k, v = project(next_token)\n    K_cache.append(k); V_cache.append(v)\n    out = attend(q, np.array(K_cache), np.array(V_cache))",
        "caption": "Append the new key/value; reuse all the old ones."
      },
      {
        "h": "Linear in context AND in batch",
        "paras": [
          "The cache is often described as the cheap alternative to recomputation, which is true per token and misleading in aggregate, because it scales with context length and batch size together. For a 32-layer, 32-head model with d_head 128 in fp16, one sequence costs 1.07 GB at 2,048 tokens and 17.18 GB at 32,768. At batch 32 those become 34.4 GB and 549.8 GB.",
          "Set against a 7B model whose fp16 weights are 14 GB and never grow, the ratio is the whole story of modern serving: past a few thousand tokens the cache, not the model, is what fills the accelerator, and it is what caps how many users a GPU can hold at once. Every technique in this area attacks that number rather than the weights — grouped and multi-query attention shrink the per-token cost, paged attention removes the fragmentation, and cache quantisation trades precision for headroom."
        ]
      }
    ],
    "takeaways": [
      "The KV cache stores past keys and values across steps.",
      "It makes per-token generation cost grow linearly, not quadratically.",
      "Its memory cost motivates cache eviction and paging."
    ],
    "demo": "kv-cache"
  },
  "order": [
    "beam-search",
    "rope",
    "kv-cache"
  ],
  "index": 2,
  "prev": "rope",
  "next": null
};
