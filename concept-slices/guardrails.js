// GENERATED from concepts-index.js by scripts/generate-concept-pages.mjs -- DO NOT EDIT.
// Just what concepts/guardrails/ renders: this concept, its full prerequisite closure (which
// concept-paths.js walks for "how to get here"), its leadsTo neighbours, and its one
// CONCEPT_REVERSE row for the Connections panel. Same global names, less in them.

window.CONCEPTS_INDEX = {
  "guardrails": {
    "id": "guardrails",
    "name": "Guardrails",
    "area": "NLP",
    "summary": "The layered input/output safety pipeline wrapped around an LLM: redact PII, catch prompt injection and disallowed topics on the way in, and validate/filter the response (PII leakage, toxicity, schema, grounding) on the way out. Fail-closed defense-in-depth for production LLM systems.",
    "prereqs": [
      "constrained-decoding"
    ],
    "leadsTo": [
      "prompt-injection"
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
  "prompt-injection": {
    "id": "prompt-injection",
    "name": "Prompt Injection",
    "area": "NLP",
    "summary": "The defining LLM security flaw: instructions and untrusted data share one token channel, so attacker-controlled content (a user turn, a retrieved page, a tool result) can pose as a new instruction. Attack shapes include direct override, INDIRECT injection (payload hidden in fetched content), jailbreaks, and data exfiltration. Defenses — delimiting/spotlighting, the trained instruction hierarchy, input classifiers, output exfil filters — are layered and partial; none reaches zero.",
    "prereqs": [
      "guardrails"
    ],
    "leadsTo": []
  }
};
window.CONCEPT_REVERSE = {
  "guardrails": [
    {
      "kind": "demo",
      "slug": "guardrails"
    },
    {
      "kind": "demo",
      "slug": "prompt-injection"
    },
    {
      "kind": "module",
      "slug": "agentic-ai"
    }
  ]
};
