// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "mixture-of-depths" (3), for its Connections panel.
// Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "mixture-of-depths": [
      "mixture-of-depths",
      "moe",
      "transformer-block"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "mixture-of-depths": {
    "id": "mixture-of-depths",
    "name": "Mixture-of-Depths",
    "area": "NLP",
    "summary": "Conditional computation along the depth axis: a per-block router selects, under a fixed capacity (top-k tokens), which tokens get full compute while the rest take the residual skip. Fixes the FLOPs (lower than dense) and keeps the compute graph static so it still batches — unlike ragged early-exit. Works because token difficulty is uneven; a well-trained router spends the budget on the tokens that need depth. Width-axis cousin of mixture-of-experts.",
    "prereqs": [
      "moe",
      "transformer-block"
    ],
    "leadsTo": []
  },
  "moe": {
    "id": "moe",
    "name": "Mixture of Experts (MoE)",
    "area": "Training Systems",
    "summary": "Conditional computation: a router sends each token to only the top-k of N expert sub-networks, so total parameters scale while active compute per token stays at k/N. Enables sparse trillion-parameter models (Switch Transformer, Mixtral), at the cost of routing complexity and a constant fight against load imbalance — handled with an auxiliary balancing loss and per-expert capacity limits.",
    "tex": "y = \\sum_{i \\in \\mathrm{top\\text{-}k}(g(x))} g_i(x)\\, E_i(x)",
    "prereqs": [
      "attention",
      "scaling-laws"
    ],
    "leadsTo": [
      "mixture-of-depths"
    ]
  },
  "transformer-block": {
    "id": "transformer-block",
    "name": "Transformer Block",
    "area": "Transformers",
    "summary": "Attention + feed-forward + residual + layer-norm — the basic stacked unit of GPT/BERT/Llama.",
    "prereqs": [
      "attention",
      "multi-head"
    ],
    "animation": "viz/transformer.html",
    "leadsTo": [
      "mixture-of-depths"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "mixture-of-depths": [
    {
      "kind": "demo",
      "slug": "mixture-of-depths"
    }
  ],
  "moe": [
    {
      "kind": "demo",
      "slug": "model-cascade"
    },
    {
      "kind": "demo",
      "slug": "mixture-of-depths"
    },
    {
      "kind": "demo",
      "slug": "moe"
    },
    {
      "kind": "module",
      "slug": "frontier-frameworks"
    }
  ],
  "transformer-block": [
    {
      "kind": "demo",
      "slug": "multi-head-attention"
    },
    {
      "kind": "demo",
      "slug": "mixture-of-depths"
    },
    {
      "kind": "module",
      "slug": "transformers"
    },
    {
      "kind": "module",
      "slug": "advanced-nlp"
    },
    {
      "kind": "hf",
      "slug": "fundamentals"
    },
    {
      "kind": "hf",
      "slug": "audio"
    }
  ]
};
