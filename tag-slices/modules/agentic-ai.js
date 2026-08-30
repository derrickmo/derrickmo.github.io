// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to modules "agentic-ai" (5), for its Connections panel.
// Same global names as concepts-index.js, with 183 fewer concepts in them.

window.CONCEPT_TAGS = {
  "modules": {
    "agentic-ai": [
      "react-agent",
      "tool-routing",
      "reflection",
      "guardrails",
      "prompt-injection"
    ]
  }
};
window.CONCEPTS_INDEX = {
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
  },
  "tool-routing": {
    "id": "tool-routing",
    "name": "Tool Routing & Dispatch",
    "area": "NLP",
    "summary": "The dispatch decision in front of an agent: classify a query and send it to the right tool (or expert/model), routing to the top match only above a confidence threshold and otherwise falling back to the general model. Implemented as the model's function-calling, an intent classifier over embeddings, or a cheap LLM selector. Precision (don't fire the wrong tool) vs coverage (handle more) is the core tradeoff.",
    "prereqs": [
      "react-agent"
    ],
    "leadsTo": []
  },
  "reflection": {
    "id": "reflection",
    "name": "Self-Correction (Reflection)",
    "area": "NLP",
    "summary": "The agentic generate–critique–revise loop (Reflexion / self-refine): a critic scores an answer and the model revises until the bar is met or a budget runs out. Bounded by the verifier — informative, accurate critics (tests, tools, a reward model) make it work; self-grading with no external signal stalls or false-passes.",
    "prereqs": [
      "reward-model",
      "self-consistency"
    ],
    "leadsTo": [
      "react-agent"
    ]
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
  ],
  "tool-routing": [
    {
      "kind": "demo",
      "slug": "agent-router"
    },
    {
      "kind": "module",
      "slug": "agentic-ai"
    }
  ],
  "reflection": [
    {
      "kind": "demo",
      "slug": "reflection"
    },
    {
      "kind": "demo",
      "slug": "react-agent"
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
  "prompt-injection": [
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
