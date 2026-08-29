// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/context-extension/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

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
  },
  "attention": {
    "id": "attention",
    "name": "Self-Attention",
    "area": "Transformers",
    "summary": "Score every pair of tokens by a softmax over scaled dot products; the core op of every transformer.",
    "tex": "\\mathrm{Attn}(Q,K,V) = \\mathrm{softmax}\\!\\left(\\tfrac{QK^\\top}{\\sqrt{d_k}}\\right) V",
    "prereqs": [
      "softmax",
      "embeddings"
    ],
    "leadsTo": [
      "multi-head",
      "positional-encoding",
      "transformer-block",
      "lora",
      "kv-cache",
      "rope",
      "kv-cache-eviction",
      "lost-in-the-middle",
      "moe",
      "attention-rollout"
    ]
  },
  "softmax": {
    "id": "softmax",
    "name": "Softmax",
    "area": "Neural Networks",
    "summary": "Turn a vector of logits into a probability distribution; the workhorse output and attention nonlinearity.",
    "tex": "\\mathrm{softmax}(z)_i = \\frac{e^{z_i}}{\\sum_j e^{z_j}}",
    "leadsTo": [
      "contrastive-learning",
      "cross-entropy",
      "word2vec",
      "attention",
      "decoding"
    ],
    "prereqs": []
  },
  "embeddings": {
    "id": "embeddings",
    "name": "Embeddings",
    "area": "NLP",
    "summary": "Map tokens (or items) to vectors so that distance and direction encode meaning.",
    "prereqs": [
      "tokenization"
    ],
    "leadsTo": [
      "vector-search",
      "attention",
      "word2vec",
      "contrastive-learning",
      "tsne",
      "rag-chunking",
      "semantic-caching",
      "hyde"
    ],
    "animation": "viz/embeddings.html"
  },
  "tokenization": {
    "id": "tokenization",
    "name": "Tokenization (BPE)",
    "area": "NLP",
    "summary": "Subword units learned by merging frequent character pairs — every LLM's first step.",
    "leadsTo": [
      "embeddings",
      "constrained-decoding"
    ],
    "prereqs": []
  },
  "fourier": {
    "id": "fourier",
    "name": "Fourier Series",
    "area": "Signal",
    "summary": "Any periodic signal decomposes into a sum of sines and cosines — the backbone of signal processing and positional encodings.",
    "leadsTo": [
      "positional-encoding",
      "spectrogram",
      "mfcc",
      "pitch-detection",
      "aliasing"
    ],
    "prereqs": []
  }
};
window.CONCEPT_REVERSE = {
  "context-extension": [
    {
      "kind": "demo",
      "slug": "context-extension"
    }
  ]
};
