// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/rag-agents/react-agent/.
// concept-lesson-app.jsx reads window.DM_SUBLESSON_CTX and falls back to
// window.DM_SUBLESSON(...) so the page still works if this file is ever missing.

window.DM_SUBLESSON_CTX = {
  "module": {
    "title": "RAG and Agents",
    "lessons": {
      "rag-chunking": {
        "title": "Chunking for Retrieval"
      },
      "hyde": {
        "title": "HyDE"
      },
      "reranking": {
        "title": "Reranking"
      },
      "react-agent": {
        "title": "The ReAct Agent Loop"
      },
      "self-consistency": {
        "title": "Self-Consistency"
      },
      "reflection": {
        "title": "Reflection"
      },
      "prompt-injection": {
        "title": "Prompt Injection"
      },
      "rag-fusion": {
        "title": "Multi-Query & RAG-Fusion"
      }
    }
  },
  "moduleSlug": "rag-agents",
  "conceptId": "react-agent",
  "lesson": {
    "title": "The ReAct Agent Loop",
    "oneLine": "Interleave reasoning with tool calls in a thought-action-observation loop.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "A ReAct agent alternates thinking and acting: it reasons about what to do, calls a tool, observes the result, and repeats until it can answer. Tools (search, a calculator, code) let it ground its reasoning in real results instead of hallucinating - but every step is a chance to go off the rails, so reliability compounds."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "End-to-end success is the product of per-step reliability:"
        ],
        "tex": "P(\\text{success}) \\approx \\prod_{t=1}^{T} p_t",
        "texNote": "Many steps at 0.9 each still fail often - hence verification and retries."
      },
      {
        "h": "In code",
        "code": "while not done:\n    thought = model(scratchpad)            # reason\n    action, arg = parse_tool(thought)      # act\n    obs = tools[action](arg)               # observe\n    scratchpad += f'{thought}\\n{obs}\\n'",
        "caption": "Thought, action, observation - loop until answered."
      },
      {
        "h": "Reliability compounds, and twenty steps is a lot",
        "paras": [
          "A trajectory succeeds only if every step does, so per-step reliability enters as a power. At 95% per step — which sounds strong — a 5-step task finishes 77.4% of the time, a 10-step task 59.9%, and a 20-step task 35.8%. At 90% per step, 20 steps completes 12.2% of the time. Inverting it is the more useful framing: to finish a 20-step task 90% of the time you need a per-step success rate of 0.9947.",
          "That arithmetic is why long autonomous trajectories are hard in a way that better prompting does not touch, and why the engineering that works attacks the exponent rather than the base. Shorter trajectories, checkpoints the agent can be restarted from, verification after each tool call so an error is caught at step three rather than compounding to step twenty, and tools that fail loudly instead of returning something plausible. The alternative — a single long unverified chain — is a product of probabilities, and products of numbers below one go one way."
        ]
      }
    ],
    "takeaways": [
      "ReAct interleaves reasoning with grounded tool calls.",
      "Tools curb hallucination by injecting real results.",
      "Per-step error compounds, so reliability is the hard part."
    ],
    "demo": "react-agent"
  },
  "order": [
    "rag-chunking",
    "hyde",
    "reranking",
    "react-agent",
    "self-consistency",
    "reflection",
    "prompt-injection",
    "rag-fusion"
  ],
  "index": 3,
  "prev": "reranking",
  "next": "self-consistency"
};
