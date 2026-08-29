// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/agentic-ai/tool-routing/.
// concept-lesson-app.jsx reads window.DM_SUBLESSON_CTX and falls back to
// window.DM_SUBLESSON(...) so the page still works if this file is ever missing.

window.DM_SUBLESSON_CTX = {
  "module": {
    "title": "Concept by concept",
    "lessons": {
      "tool-routing": {
        "title": "Tool Routing"
      },
      "guardrails": {
        "title": "Agent Guardrails"
      },
      "constrained-decoding": {
        "title": "Constrained Decoding"
      }
    }
  },
  "moduleSlug": "agentic-ai",
  "conceptId": "tool-routing",
  "lesson": {
    "title": "Tool Routing",
    "oneLine": "Choosing which tool to call is a classification problem hiding inside a generation problem.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "An agent with one tool has no routing problem. Give it twenty and the hardest part of a tool call is no longer emitting valid JSON - it is picking the right function in the first place. That decision is a classifier over the tool catalogue, conditioned on the request, and it fails differently from the formatting step around it.",
          "This matters because a single accuracy number hides three separate things: whether the right tool was SELECTED, whether the call was well FORMED, and whether the ARGUMENTS were right. They have different fixes. Format is solved by construction with constrained decoding; selection is a capability question; arguments are the residual, and usually the hardest."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Routing is a softmax over tools given the request, and the catalogue itself is part of the input:"
        ],
        "tex": "P(t \\mid q) = \\mathrm{softmax}\\big(f(q,\\, d_1),\\, \\dots,\\, f(q,\\, d_K)\\big)",
        "texNote": "Each tool's DESCRIPTION d_k is scored against the query, so a badly written description is a modelling error, not a documentation one."
      },
      {
        "h": "In code",
        "code": "# The catalogue is prompt content, so its wording is a tunable\ntools = [\n    {\"name\": \"search_docs\",\n     \"description\": \"Full-text search over internal policy documents. \"\n                    \"Use for questions about company policy, not general knowledge.\"},\n    {\"name\": \"run_sql\",\n     \"description\": \"Read-only SQL against the analytics warehouse.\"},\n]\n\ncall = model.choose_tool(query, tools)\nif call.name not in {t[\"name\"] for t in tools}:\n    raise ToolRoutingError(call.name)   # reject before executing, never after",
        "caption": "Validate the choice against the catalogue before anything runs - a rejected call is retryable, an executed wrong one may not be."
      },
      {
        "h": "Every tool you add makes routing harder",
        "paras": [
          "Routing is a top-1 selection among candidates, so the toolbox size enters directly: every additional tool is one more chance for a distractor to outscore the right one. With a scorer whose correct-tool margin is three standard deviations — strong by any measure — top-1 accuracy is 0.955 over 4 tools, 0.866 over 16, 0.729 over 64 and 0.564 over 256. Nothing about the scorer changed.",
          "And a routing error is not a wrong answer, it is a wrong action, which then compounds along the trajectory: at 95% per call, a five-call task routes correctly 77.4% of the time and a ten-call task 59.9%. Both facts push the same way — toward hierarchical routing that picks a small group before picking within it, toward retrieving a handful of candidate tools rather than presenting all of them, and toward making the descriptions distinguishable, since the margin is what the scorer actually has to work with."
        ]
      }
    ],
    "takeaways": [
      "Selection, format and arguments are three different failure modes behind one accuracy number.",
      "Tool descriptions are model input, so rewriting them is a legitimate and cheap fix for routing errors.",
      "Overlapping tools are the main cause of misrouting - merge them or make the boundary explicit in the description."
    ],
    "demo": "agent-router"
  },
  "order": [
    "tool-routing",
    "guardrails",
    "constrained-decoding"
  ],
  "index": 0,
  "prev": null,
  "next": "guardrails"
};
