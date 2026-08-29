// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/rag-agents/prompt-injection/.
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
  "conceptId": "prompt-injection",
  "lesson": {
    "title": "Prompt Injection",
    "oneLine": "The attacks that hijack an LLM, and the layered defenses against them.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Because an LLM cannot fully separate instructions from data, attacker-controlled text - in a prompt, a retrieved document, or a tool result - can override your instructions. Defenses layer up: delimit and spotlight untrusted content, assert an instruction hierarchy, classify inputs, and filter outputs for exfiltration. No single layer is sufficient."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Residual risk is what survives every defense layer:"
        ],
        "tex": "\\text{ASR} = \\prod_{\\ell} (1 - d_\\ell)",
        "texNote": "ASR is attack success rate; each defense d_l catches some fraction, none all."
      },
      {
        "h": "In code",
        "code": "# spotlighting: clearly fence untrusted content\nprompt = (system + '\\n<<UNTRUSTED>>\\n' + retrieved + '\\n<<END>>')\n# plus an output filter that blocks secret/exfiltration patterns",
        "caption": "Defense in depth - delimit, prioritize, classify, filter."
      },
      {
        "h": "A filter enumerates; an attacker does not",
        "paras": [
          "Blocklists lose because they have to name the attack and the attacker only has to avoid the name. A substring filter for \"ignore previous instructions\" catches the literal string and then fails on every rephrasing of it: letter-spacing, a Cyrillic homoglyph inside an otherwise identical word, a plain synonym, base64, splitting the phrase across two turns, or the same request arriving inside a retrieved document. Of seven variants, that filter blocked one.",
          "None of those is a new capability — they are all the same instruction, and that is the point: the input space is unbounded and the blocklist is finite. It is why the defences that hold are structural rather than lexical, and why they are layered: treating retrieved text as data rather than instructions, keeping privilege out of the model (the tool decides what it will do, not the prompt), constraining outputs to a schema, and requiring confirmation for anything irreversible. Each is weak alone; the combination is what removes the single point of failure."
        ]
      }
    ],
    "takeaways": [
      "Injection exploits the instruction-vs-data ambiguity.",
      "Untrusted text can arrive via documents and tool results.",
      "Layered defenses reduce, but never zero, the attack surface."
    ],
    "demo": "prompt-injection"
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
  "index": 6,
  "prev": "reflection",
  "next": "rag-fusion"
};
