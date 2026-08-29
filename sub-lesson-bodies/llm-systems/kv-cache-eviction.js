// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/llm-systems/kv-cache-eviction/.
// concept-lesson-app.jsx reads window.DM_SUBLESSON_CTX and falls back to
// window.DM_SUBLESSON(...) so the page still works if this file is ever missing.

window.DM_SUBLESSON_CTX = {
  "module": {
    "title": "LLM Systems and Efficiency",
    "lessons": {
      "pruning": {
        "title": "Pruning"
      },
      "paged-attention": {
        "title": "Paged Attention"
      },
      "kv-cache-eviction": {
        "title": "KV-Cache Eviction"
      },
      "mixture-of-depths": {
        "title": "Mixture-of-Depths"
      }
    }
  },
  "moduleSlug": "llm-systems",
  "conceptId": "kv-cache-eviction",
  "lesson": {
    "title": "KV-Cache Eviction",
    "oneLine": "The cache, not the weights, is what fills your GPU at long context — and which tokens you may drop is not obvious.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Autoregressive generation caches the key and value tensors for every token already processed, so each new token attends to the past without recomputing it. That turns generation from quadratic into linear, and it is why the cache exists at all. The problem is that it grows without bound.",
          "The arithmetic is stark and worth doing once. Llama-3-8B has 32 layers, 8 key-value heads and a head dimension of 128, stored in two bytes — so two tensors times 32 times 8 times 128 times 2 bytes is 128 KB per token. At a 32,000-token context that is 4.0 GB for a single sequence. Serve 64 concurrent sequences and the cache is 256 GB, against 16 GB of weights.",
          "Grouped-query attention is the first and largest lever, and it is architectural rather than a serving trick: the same model with 32 key-value heads instead of 8 would need 512 KB per token, four times more. The 70B model, with 80 layers, sits at 320 KB per token. Once that is fixed, everything else is about not keeping tokens you do not need."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Cache size, which you should be able to reproduce from a model card:"
        ],
        "tex": "\\text{bytes} = 2 \\times L \\times H_{kv} \\times d_{head} \\times \\text{seq} \\times \\text{batch} \\times \\text{bytes per element}",
        "texNote": "The leading 2 is keys and values. Note what is absent: the number of QUERY heads. Grouped-query attention shrinks the cache precisely because it reduces H_kv while leaving the query heads alone, which is why it costs so little quality."
      },
      {
        "h": "In code",
        "code": "# The eviction policy in outline. The scoring is what distinguishes the methods.\ndef evict(cache, budget, attn_weights, n_sink=4, n_recent=256):\n    keep = set(range(n_sink))                       # ALWAYS keep the first few tokens\n    keep |= set(range(len(cache) - n_recent, len(cache)))   # and the recent window\n    remaining = budget - len(keep)\n    if remaining > 0:\n        # H2O: accumulated attention mass is the heavy-hitter score\n        scores = attn_weights.sum(dim=(0, 1))       # sum over layers and heads\n        for i in scores.argsort(descending=True):\n            if len(keep) >= budget:\n                break\n            keep.add(int(i))\n    return cache[sorted(keep)]\n\n# PagedAttention (vLLM) attacks a DIFFERENT problem: not which tokens to drop, but\n# FRAGMENTATION. Storing the cache in fixed-size blocks with an index removes the need to\n# pre-allocate a contiguous max-length buffer per sequence, and lets a shared prompt\n# prefix be stored once across many sequences.",
        "caption": "Eviction and paging are complementary, not alternatives — one reduces how many tokens you store, the other removes the waste in how you store them."
      },
      {
        "h": "The first tokens are not optional",
        "paras": [
          "The obvious policy is a sliding window: keep the last N tokens and drop the rest. It fails badly, and the reason is one of the more surprising empirical findings in LLM serving. Attention distributions place a large and content-independent share of their mass on the first few tokens of the sequence — attention sinks. A head with nothing it particularly wants to attend to still has to put its softmax mass somewhere, and the initial tokens, visible to every position and semantically neutral, become the default destination.",
          "So evicting the first tokens removes the place the mass was going. The softmax redistributes onto whatever remains, the attention pattern is distorted at every layer, and perplexity degrades sharply. StreamingLLM's result is that retaining just four initial tokens alongside the sliding window restores stable behaviour over inputs far longer than the training context — four tokens, at a cost of well under one percent of a typical window.",
          "That result also shapes the heavier policies. H2O scores tokens by accumulated attention mass and keeps the heavy hitters, and SnapKV compresses the prompt's cache by observing which prompt tokens the last few positions actually attend to. Both keep sinks and a recent window as a floor and spend the remaining budget on the scored set.",
          "The caveat to state before you deploy any of this: eviction is lossy and irreversible. A token dropped at step 1,000 cannot be consulted at step 5,000, so a task whose answer depends on a detail the policy judged unimportant will fail — and it will fail silently, with a fluent wrong answer rather than an error. Perplexity on generic text is not a sufficient test; evaluate with retrieval over the full context. Where the requirement is exactness rather than throughput, quantising the cache to 8 or 4 bits keeps every token and is often the better trade."
        ]
      }
    ],
    "takeaways": [
      "Do the arithmetic once: Llama-3-8B is 128 KB per token, so 32k context is 4 GB per sequence and 256 GB at batch 64 — the cache dwarfs the 16 GB of weights.",
      "Grouped-query attention is the largest single lever, cutting the cache 4x by reducing key-value heads while leaving query heads untouched.",
      "A plain sliding window fails because the first tokens are attention sinks; keeping about four of them alongside the window is what makes streaming stable, and all eviction is silently lossy."
    ],
    "demo": "kv-cache-eviction"
  },
  "order": [
    "pruning",
    "paged-attention",
    "kv-cache-eviction",
    "mixture-of-depths"
  ],
  "index": 2,
  "prev": "paged-attention",
  "next": "mixture-of-depths"
};
