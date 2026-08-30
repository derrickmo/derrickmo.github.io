// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "guardrails" (2), for its Connections
// panel. Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "guardrails": [
      "guardrails",
      "constrained-decoding"
    ]
  },
  "games": {}
};
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
  ],
  "constrained-decoding": [
    {
      "kind": "demo",
      "slug": "constrained-decoding"
    },
    {
      "kind": "demo",
      "slug": "guardrails"
    }
  ]
};
