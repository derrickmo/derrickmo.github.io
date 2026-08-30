// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "agent-router" (2), for its Connections
// panel. Same global names as concepts-index.js, with 186 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "agent-router": [
      "tool-routing",
      "react-agent"
    ]
  },
  "games": {}
};
window.CONCEPTS_INDEX = {
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
