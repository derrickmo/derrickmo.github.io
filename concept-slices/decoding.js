// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/decoding/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
  "decoding": {
    "id": "decoding",
    "name": "Decoding Strategies",
    "area": "NLP",
    "summary": "Pick the next token from the model's distribution — greedy, beam, top-k, nucleus, temperature.",
    "prereqs": [
      "softmax"
    ],
    "leadsTo": [
      "beam-search",
      "self-consistency",
      "constrained-decoding",
      "speculative-decoding"
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
  "beam-search": {
    "id": "beam-search",
    "name": "Beam Search",
    "area": "NLP",
    "summary": "Keep the top-K partial sequences by total log-probability at every decoding step. Greedy is K=1; bigger K finds higher-probability sentences at multiplied cost.",
    "prereqs": [
      "decoding"
    ],
    "leadsTo": []
  },
  "self-consistency": {
    "id": "self-consistency",
    "name": "Self-Consistency",
    "area": "NLP",
    "summary": "Sample several chains of thought at nonzero temperature and majority-vote the final answer. When errors are independent, voting concentrates on the single correct answer (a Condorcet effect) and lifts accuracy for the cost of N samples; correlated errors form a false consensus it can't fix.",
    "tex": "\\hat{y} = \\arg\\max_{y} \\sum_{i=1}^{N} \\mathbb{1}\\!\\left[ y_i = y \\right]",
    "prereqs": [
      "decoding",
      "clt"
    ],
    "leadsTo": [
      "reflection"
    ]
  },
  "constrained-decoding": {
    "id": "constrained-decoding",
    "name": "Constrained Decoding",
    "area": "NLP",
    "summary": "Guarantee structured output (JSON mode, function calling) by intersecting the model's next-token distribution with the tokens a grammar permits at each step, then sampling from the survivors. A schema/regex/CFG compiled to a finite-state machine supplies the per-step token mask.",
    "tex": "\\tilde{p}(t) \\propto p_\\theta(t) \\cdot \\mathbb{1}\\!\\left[ t \\in \\mathrm{valid}(\\text{state}) \\right]",
    "prereqs": [
      "decoding",
      "tokenization"
    ],
    "leadsTo": [
      "guardrails"
    ]
  },
  "speculative-decoding": {
    "id": "speculative-decoding",
    "name": "Speculative Decoding",
    "area": "Training Systems",
    "summary": "Speed up LLM generation losslessly: a small draft model proposes k tokens, the big target verifies them in one parallel pass, accepting the longest prefix it agrees with and resampling the first miss from its own distribution. Emits accepted+1 tokens per expensive pass; speedup ≈ (1−p^{k+1})/(1−p) for acceptance p. Output distribution is identical to the target alone.",
    "tex": "\\mathbb{E}[\\text{tokens/pass}] = \\frac{1 - p^{\\,k+1}}{1 - p}",
    "prereqs": [
      "decoding",
      "kv-cache"
    ],
    "leadsTo": []
  }
};
window.CONCEPT_REVERSE = {
  "decoding": [
    {
      "kind": "demo",
      "slug": "markov"
    },
    {
      "kind": "demo",
      "slug": "decoding"
    },
    {
      "kind": "demo",
      "slug": "beam-search"
    },
    {
      "kind": "demo",
      "slug": "self-consistency"
    },
    {
      "kind": "demo",
      "slug": "constrained-decoding"
    },
    {
      "kind": "demo",
      "slug": "speculative-decoding"
    },
    {
      "kind": "module",
      "slug": "advanced-nlp"
    }
  ]
};
