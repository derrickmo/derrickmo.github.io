// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to demo "react-agent" (3), for its Connections
// panel. Same global names as concepts-index.js, with 185 fewer concepts in them.

window.CONCEPT_TAGS = {
  "demos": {
    "react-agent": [
      "react-agent",
      "reflection",
      "rag-chunking"
    ]
  },
  "games": {}
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
  "rag-chunking": [
    {
      "kind": "demo",
      "slug": "rag-chunking"
    },
    {
      "kind": "demo",
      "slug": "lost-in-the-middle"
    },
    {
      "kind": "demo",
      "slug": "react-agent"
    },
    {
      "kind": "demo",
      "slug": "multi-query"
    },
    {
      "kind": "demo",
      "slug": "rag-reranker"
    }
  ]
};
