// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/llm-systems/paged-attention/.
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
  "conceptId": "paged-attention",
  "lesson": {
    "title": "Paged Attention",
    "oneLine": "Manage the KV cache like virtual memory to kill fragmentation.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Serving many requests with different lengths fragments the KV-cache memory, wasting much of the GPU. Paged attention borrows the OS idea of paging: store the cache in fixed-size blocks allocated on demand, so memory is packed tightly and sequences can share blocks. It is what lets servers batch far more requests."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "A logical token position maps to a physical block and offset:"
        ],
        "tex": "(\\text{block},\\ \\text{offset}) = \\big(\\lfloor i/B\\rfloor,\\ i \\bmod B\\big)",
        "texNote": "Non-contiguous blocks via an indirection table - just like OS page tables."
      },
      {
        "h": "In code",
        "code": "# a block table maps logical positions to physical blocks\nblock = block_table[seq][i // B]\nk = kv_blocks[block][i % B]            # gather K/V by page",
        "caption": "Fixed-size pages, allocated on demand, packed tight."
      },
      {
        "h": "The win is not reserving what you might need",
        "paras": [
          "Classic serving allocates a contiguous KV buffer sized to the maximum sequence length, which wastes everything a request does not use. With 64 concurrent sequences whose real lengths run from 32 to 1,180 tokens and total 15,155 tokens, reserving 2,048 slots each consumes 131,072 — 88.4% of the memory held for text that was never generated.",
          "Paging that allocation into fixed blocks removes almost all of it: at a block size of 16 the same workload occupies 15,648 slots, a waste of 3.2%, and the only remaining loss is the partial final block of each sequence. The block size is the trade — 64 wastes 12.6% and 256 wastes 36.3%, since larger blocks mean coarser rounding — and the reason this matters so much is that the reclaimed memory converts directly into concurrent requests. It is a memory-allocator improvement rather than a numerical one, which is unusual for a headline inference optimisation."
        ]
      }
    ],
    "takeaways": [
      "Paged attention pages the KV cache like virtual memory.",
      "It removes fragmentation and packs more requests per GPU.",
      "It is the core idea behind high-throughput servers like vLLM."
    ],
    "demo": "paged-attention"
  },
  "order": [
    "pruning",
    "paged-attention",
    "kv-cache-eviction",
    "mixture-of-depths"
  ],
  "index": 1,
  "prev": "pruning",
  "next": "kv-cache-eviction"
};
