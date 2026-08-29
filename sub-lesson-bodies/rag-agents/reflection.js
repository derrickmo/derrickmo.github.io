// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/rag-agents/reflection/.
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
  "conceptId": "reflection",
  "lesson": {
    "title": "Reflection",
    "oneLine": "Draft, critique, and revise toward a quality bar.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "A model can often improve its own output if asked to critique it. Reflection loops draft -> critique -> revise until a quality bar is met. The catch: self-correction is only as good as the critic. A sharp critic converges fast; a weak or miscalibrated one can pass bad answers or reject good ones."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Quality improves only when the critic carries real signal:"
        ],
        "tex": "q_{t+1} = q_t + \\eta\\,(\\,\\text{critic informativeness}\\,)",
        "texNote": "Bounded by the verifier: a useless critic yields no gain."
      },
      {
        "h": "In code",
        "code": "draft = llm(task)\nfor _ in range(max_iters):\n    critique = llm(f'Critique: {draft}')\n    if passes(critique): break\n    draft = llm(f'Revise given: {critique}\\n{draft}')",
        "caption": "Iterate until the critic is satisfied - or you give up."
      },
      {
        "h": "It cannot fix what the critic cannot see",
        "paras": [
          "Reflection works when the critic catches errors the generator made, and its arithmetic is encouraging while that holds: a critic catching 70% of errors leaves 30% after one round, 9% after two and 2.7% after three. The trouble is that generator and critic are usually the same model, so they share a blind spot, and errors inside that blind spot are caught with probability zero at every round.",
          "That puts a floor under the whole loop. With a 25% blind spot and an otherwise strong 70% critic, the remaining error goes 0.475 after one round, 0.270 after three — and 0.250 after ten, which is the floor exactly. Extra rounds buy nothing after the third, while costing a model call each. It is why the reflection setups that earn their keep introduce something the generator does not have: test execution, a retrieval step, a different model, or a human — an external signal rather than a second opinion from the same source."
        ]
      }
    ],
    "takeaways": [
      "Reflection is a draft-critique-revise loop.",
      "Its ceiling is the quality of the critic.",
      "It is the sequential cousin of self-consistency."
    ],
    "demo": "reflection"
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
  "index": 5,
  "prev": "self-consistency",
  "next": "prompt-injection"
};
