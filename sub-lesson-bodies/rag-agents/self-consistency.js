// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/rag-agents/self-consistency/.
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
  "conceptId": "self-consistency",
  "lesson": {
    "title": "Self-Consistency",
    "oneLine": "Sample several reasoning paths and take the majority answer.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "A single chain of reasoning can go wrong by chance. Self-consistency samples several independent chains at nonzero temperature and votes on the final answer. When errors are independent, the majority is far more reliable than any one path - a Condorcet-style lift. It fails when the errors are correlated."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "With independent per-sample accuracy p, the majority of N improves sharply:"
        ],
        "tex": "P(\\text{majority correct}) = \\sum_{k>N/2}\\binom{N}{k}p^k(1-p)^{N-k}",
        "texNote": "Correlated errors break the independence this relies on."
      },
      {
        "h": "In code",
        "code": "from collections import Counter\nanswers = [extract(llm(prompt, temperature=0.7)) for _ in range(N)]\nfinal = Counter(answers).most_common(1)[0][0]   # vote",
        "caption": "Many samples, one vote - reliability from diversity."
      },
      {
        "h": "It amplifies whatever is more likely, right or wrong",
        "paras": [
          "Majority voting over independent samples is a variance reduction, not a knowledge addition, and the binomial makes that precise. With a 60% chance of being right per sample, the majority of 5 is right 68.3% of the time, of 11 is 75.3%, and of 21 is 82.6%. The gain is real but sub-linear in samples, and it is largest for exactly the questions where the model is already more right than wrong.",
          "Turn the probability around and the mechanism shows its other face. If the model is systematically wrong — 40% correct per sample — the majority of 5 is right 31.7% of the time and the majority of 21 only 17.4%. Voting made it worse, confidently, because it amplifies whichever answer the distribution favours; a shared misconception is reinforced by every extra sample rather than averaged away. Self-consistency assumes errors are independent noise around a correct mode, and when the errors are a systematic bias it converges harder onto the wrong answer."
        ]
      }
    ],
    "takeaways": [
      "Self-consistency votes over multiple reasoning samples.",
      "Independent errors make the majority much more reliable.",
      "Correlated errors defeat it."
    ],
    "demo": "self-consistency"
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
  "index": 4,
  "prev": "react-agent",
  "next": "reflection"
};
