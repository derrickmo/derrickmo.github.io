// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/embeddings/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
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
  "vector-search": {
    "id": "vector-search",
    "name": "Vector Search / ANN",
    "area": "Retrieval",
    "summary": "Embed items, then fetch the k nearest by cosine or Euclidean — the engine under semantic search and RAG.",
    "prereqs": [
      "embeddings",
      "knn"
    ],
    "leadsTo": [
      "rag-chunking",
      "semantic-caching",
      "hyde",
      "reranking",
      "rag-fusion"
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
  "word2vec": {
    "id": "word2vec",
    "name": "word2vec (Skip-gram)",
    "area": "NLP",
    "summary": "Learn a dense vector per word by predicting its context (skip-gram) or the word from its context (CBOW), trained by SGD on softmax / negative sampling over co-occurrences. Embodies the distributional hypothesis — words in similar contexts get similar vectors — and yields the famous linear analogy structure (king−man+woman≈queen). The static-embedding ancestor of contextual transformer embeddings; one vector per word, so it can't disambiguate senses and inherits corpus bias.",
    "tex": "P(o\\mid c) = \\frac{\\exp(u_o^\\top v_c)}{\\sum_w \\exp(u_w^\\top v_c)}",
    "prereqs": [
      "embeddings",
      "softmax"
    ],
    "leadsTo": []
  },
  "contrastive-learning": {
    "id": "contrastive-learning",
    "name": "Contrastive Learning",
    "area": "Neural Networks",
    "summary": "Self-supervised representation learning: make two augmented views of the same item agree in embedding space (positives) while separating all other items (negatives), via the NT-Xent/InfoNCE loss with temperature τ. Minimizing it yields alignment (positives collapse) + uniformity (items spread evenly), the basis of SimCLR, MoCo, and CLIP. Needs many negatives (large batches/queues) and good augmentations; non-contrastive variants (BYOL, VICReg) avoid the collapse problem differently.",
    "tex": "\\ell_i = -\\log\\frac{\\exp(\\mathrm{sim}(z_i,z_i^+)/\\tau)}{\\sum_{k\\neq i}\\exp(\\mathrm{sim}(z_i,z_k)/\\tau)}",
    "prereqs": [
      "embeddings",
      "softmax"
    ],
    "leadsTo": []
  },
  "tsne": {
    "id": "tsne",
    "name": "t-SNE / UMAP",
    "area": "Classical ML",
    "summary": "Nonlinear dimensionality reduction for visualization that preserves local NEIGHBORHOODS, not distances. Converts high-D distances to neighbor probabilities (Gaussian, width set by perplexity), matches them in 2D with a heavy-tailed Student-t, and minimizes KL(P‖Q) by gradient descent — the fat tail lets clusters separate without crowding. Unlike PCA it separates nonlinearly-tangled clusters, but cluster sizes and inter-cluster gaps are NOT meaningful and results depend on perplexity/seed. UMAP is the faster modern alternative.",
    "tex": "q_{ij} = \\frac{(1+\\lVert y_i-y_j\\rVert^2)^{-1}}{\\sum_{k\\neq l}(1+\\lVert y_k-y_l\\rVert^2)^{-1}}",
    "prereqs": [
      "pca",
      "embeddings"
    ],
    "leadsTo": []
  },
  "rag-chunking": {
    "id": "rag-chunking",
    "name": "RAG Chunking",
    "area": "Retrieval",
    "summary": "How a corpus is split into chunks before embedding decides what retrieval can find. Chunk size trades dilution (too large) against splitting a fact across boundaries (too small); overlap and sentence-aware splitting keep answer spans intact. The cheapest lever on retrieval recall.",
    "prereqs": [
      "embeddings",
      "vector-search"
    ],
    "leadsTo": [
      "lost-in-the-middle",
      "react-agent",
      "reranking",
      "rag-fusion"
    ]
  },
  "semantic-caching": {
    "id": "semantic-caching",
    "name": "Semantic Caching",
    "area": "Retrieval",
    "summary": "Cache LLM responses by embedding similarity rather than exact string match: embed the query, and if the nearest cached query is within a cosine-similarity threshold, serve its stored answer instead of calling the model. Collapses paraphrases of one intent into a single call. The threshold trades hit rate / cost savings against FALSE HITS — serving a stale or wrong answer for a query that was close in embedding space but semantically different.",
    "prereqs": [
      "embeddings",
      "vector-search"
    ],
    "leadsTo": []
  },
  "hyde": {
    "id": "hyde",
    "name": "HyDE (Hypothetical Document Embeddings)",
    "area": "Retrieval",
    "summary": "A query-transformation trick for dense retrieval: questions and answers embed to different regions, so first have the model draft a hypothetical answer and retrieve by ITS embedding — even a factually wrong draft lands near the real answer passages. Averaging several drafts cancels noise.",
    "prereqs": [
      "embeddings",
      "vector-search"
    ],
    "leadsTo": []
  }
};
window.CONCEPT_REVERSE = {
  "embeddings": [
    {
      "kind": "demo",
      "slug": "pca"
    },
    {
      "kind": "demo",
      "slug": "tsne"
    },
    {
      "kind": "demo",
      "slug": "word2vec"
    },
    {
      "kind": "demo",
      "slug": "attention"
    },
    {
      "kind": "demo",
      "slug": "embeddings"
    },
    {
      "kind": "demo",
      "slug": "contrastive-learning"
    },
    {
      "kind": "demo",
      "slug": "vector-search"
    },
    {
      "kind": "demo",
      "slug": "rag-chunking"
    },
    {
      "kind": "demo",
      "slug": "semantic-caching"
    },
    {
      "kind": "demo",
      "slug": "hyde"
    },
    {
      "kind": "module",
      "slug": "rnn-nlp"
    },
    {
      "kind": "module",
      "slug": "rag-agents"
    },
    {
      "kind": "module",
      "slug": "multimodal"
    },
    {
      "kind": "hf",
      "slug": "fundamentals"
    },
    {
      "kind": "hf",
      "slug": "multimodal"
    },
    {
      "kind": "hf",
      "slug": "agentic"
    }
  ]
};
