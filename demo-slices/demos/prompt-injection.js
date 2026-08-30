// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "prompt-injection" (3), for its Connections
// panel. Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "prompt-injection": [
      "prompt-injection",
      "guardrails",
      "react-agent"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
  "prompt-injection": {
    "id": "prompt-injection",
    "name": "Prompt Injection",
    "area": "NLP",
    "summary": "The defining LLM security flaw: instructions and untrusted data share one token channel, so attacker-controlled content (a user turn, a retrieved page, a tool result) can pose as a new instruction. Attack shapes include direct override, INDIRECT injection (payload hidden in fetched content), jailbreaks, and data exfiltration. Defenses — delimiting/spotlighting, the trained instruction hierarchy, input classifiers, output exfil filters — are layered and partial; none reaches zero.",
    "prereqs": [
      "guardrails"
    ],
    "leadsTo": []
  },
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
  "react-agent": {
    "id": "react-agent",
    "name": "ReAct (Reason + Act)",
    "area": "NLP",
    "summary": "The tool-using agent loop: interleave Thought → Action (a tool call) → Observation until the model can answer, grounding it in facts and computation it can't do from weights alone. Because steps chain, per-step error compounds — the core reliability problem of agent engineering.",
    "prereqs": [
      "reflection",
      "rag-chunking"
    ],
    "leadsTo": [
      "tool-routing"
    ]
  }
};
window.CONCEPT_REVERSE = {
  "prompt-injection": [
    {
      "kind": "demo",
      "slug": "prompt-injection"
    },
    {
      "kind": "module",
      "slug": "agentic-ai"
    }
  ],
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
  "react-agent": [
    {
      "kind": "demo",
      "slug": "prompt-injection"
    },
    {
      "kind": "demo",
      "slug": "react-agent"
    },
    {
      "kind": "demo",
      "slug": "agent-router"
    },
    {
      "kind": "module",
      "slug": "agentic-ai"
    }
  ]
};
