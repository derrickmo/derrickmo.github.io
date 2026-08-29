// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/rnn-nlp/lstm-gates/.
// concept-lesson-app.jsx reads window.DM_SUBLESSON_CTX and falls back to
// window.DM_SUBLESSON(...) so the page still works if this file is ever missing.

window.DM_SUBLESSON_CTX = {
  "module": {
    "title": "Sequence Models and NLP",
    "lessons": {
      "markov": {
        "title": "Markov Chains"
      },
      "word2vec": {
        "title": "Word2Vec"
      },
      "lstm-gates": {
        "title": "LSTM Gates"
      },
      "hmm-viterbi": {
        "title": "HMM & the Viterbi Algorithm"
      }
    }
  },
  "moduleSlug": "rnn-nlp",
  "conceptId": "lstm-gates",
  "lesson": {
    "title": "LSTM Gates",
    "oneLine": "Gates let a recurrent net keep or forget information over long spans.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "The LSTM adds a cell state that information can travel along nearly untouched, controlled by gates: a forget gate decides what to drop, an input gate what to add, an output gate what to expose. This gated highway keeps gradients alive far longer than a plain RNN."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Each gate is a learned sigmoid; the cell is updated additively:"
        ],
        "tex": "c_t = f_t \\odot c_{t-1} + i_t \\odot \\tilde{c}_t",
        "texNote": "The additive update is what preserves gradient flow across many steps."
      },
      {
        "h": "In code",
        "code": "f = sigmoid(Wf @ z)    # forget\ni = sigmoid(Wi @ z)    # input\no = sigmoid(Wo @ z)    # output\nc = f * c + i * np.tanh(Wc @ z)\nh = o * np.tanh(c)",
        "caption": "Gates throttle what the cell keeps, adds, and reveals."
      },
      {
        "h": "The gate delays the decay, it does not remove it",
        "paras": [
          "The gradient along the cell state is a product of the forget gates it passed through, so the gate decides the decay rate rather than abolishing it. At a forget gate of 0.9 the signal is 5.2e-3 after 50 steps and 7.1e-10 after 200. Even at 0.99 — a gate almost fully open — it is 0.13 after 200 steps and 4.3e-5 after 1,000, which is 99.996% of the signal gone.",
          "What makes the LSTM work is that the gate can sit at exactly 1.0, where the product stays 1.0 forever, and that this is a value the network can learn per timestep rather than a fixed property of the weights. A vanilla RNN has no such setting: its factor is the recurrent weight times a tanh derivative, which is below one wherever the unit is doing anything nonlinear, giving 7.1e-10 over 200 steps at an effective factor of 0.9. The gate is a mechanism for choosing when to remember, and the additive path is what makes remembering free when it chooses to."
        ]
      }
    ],
    "takeaways": [
      "LSTM gates control keep / add / expose for the cell state.",
      "The additive cell update fights vanishing gradients.",
      "GRUs are a lighter, two-gate variant."
    ],
    "demo": "rnn-gates"
  },
  "order": [
    "markov",
    "word2vec",
    "lstm-gates",
    "hmm-viterbi"
  ],
  "index": 2,
  "prev": "word2vec",
  "next": "hmm-viterbi"
};
