// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demos "context-extension" (3), for its Connections panel.
// Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "context-extension": [
      "context-extension",
      "rope",
      "positional-encoding"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "context-extension": {
    "id": "context-extension",
    "name": "Context-Length Extension",
    "area": "NLP",
    "summary": "Running a RoPE model beyond its training length puts far tokens at unseen rotation angles, so naive extrapolation makes perplexity explode just past L_train. Fixes rescale how inference positions map onto the trained rotary range: Position Interpolation linearly compresses positions (bounded, uniform cost), NTK-aware scaling rescales the RoPE base by frequency (keeps local resolution), and YaRN combines per-frequency NTK with attention scaling (best). How 4k/8k models become 128k+ without retraining.",
    "prereqs": [
      "rope",
      "positional-encoding"
    ],
    "leadsTo": []
  },
  "rope": {
    "id": "rope",
    "name": "Rotary Position Embedding (RoPE)",
    "area": "Transformers",
    "summary": "Encode position by rotating Q and K in 2-D pair-blocks by an angle that grows linearly with position; the attention score then depends only on the relative offset (m-n).",
    "tex": "\\theta_i(m) = m \\cdot 10000^{-2i/d}",
    "prereqs": [
      "positional-encoding",
      "attention"
    ],
    "leadsTo": [
      "context-extension"
    ]
  },
  "positional-encoding": {
    "id": "positional-encoding",
    "name": "Positional Encoding (sinusoidal / RoPE)",
    "area": "Transformers",
    "summary": "Inject order into attention — sinusoidal vectors or RoPE rotations that encode relative position.",
    "prereqs": [
      "attention",
      "fourier"
    ],
    "leadsTo": [
      "rope",
      "context-extension"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "context-extension": [
    {
      "kind": "demo",
      "slug": "context-extension"
    }
  ],
  "rope": [
    {
      "kind": "demo",
      "slug": "rope"
    },
    {
      "kind": "demo",
      "slug": "context-extension"
    }
  ],
  "positional-encoding": [
    {
      "kind": "demo",
      "slug": "positional-encoding"
    },
    {
      "kind": "demo",
      "slug": "fourier"
    },
    {
      "kind": "demo",
      "slug": "rope"
    },
    {
      "kind": "demo",
      "slug": "context-extension"
    },
    {
      "kind": "module",
      "slug": "transformers"
    }
  ]
};
