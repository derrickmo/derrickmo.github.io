// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/rnn-nlp/word2vec/.
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
  "conceptId": "word2vec",
  "lesson": {
    "title": "Word2Vec",
    "oneLine": "Learn word vectors by predicting a word from its context.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Words that appear in similar contexts should have similar vectors. Skip-gram trains embeddings by pushing a word's vector toward the words around it and away from random negatives. The result is the famous geometry where king - man + woman lands near queen."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "Skip-gram maximizes the probability of context given the center word:"
        ],
        "tex": "P(c\\mid w) = \\frac{\\exp(v_c^{\\top} v_w)}{\\sum_{c'}\\exp(v_{c'}^{\\top} v_w)}",
        "texNote": "Negative sampling approximates the costly denominator with a few random words."
      },
      {
        "h": "In code",
        "code": "# one skip-gram step with negative sampling\nscore = v_center @ v_context\ngrad = (sigmoid(score) - label) * v_center   # label 1 for true ctx, 0 for neg\nv_context -= lr * grad",
        "caption": "Pull true context together, push negatives apart."
      },
      {
        "h": "One vector per word, so a polysemous word lands between senses",
        "paras": [
          "The model learns a single point per word type, so a word with two unrelated senses cannot occupy both. Taking two orthogonal sense vectors (cosine 0.02 to each other) and mixing them in the proportion the corpus uses, a 50/50 split leaves the learned vector at cosine 0.714 from each sense — closer to neither than either is to itself. At 90/10 it sits at 0.994 from the dominant sense and 0.13 from the other.",
          "So the position is decided by sense frequency, not by meaning, and the rare sense is effectively unrepresented. That is the structural limitation contextual embeddings removed: BERT and its successors produce a different vector for the same word in different sentences, which is a change of data model rather than a bigger version of the same one. It is also why word2vec analogies work best on words with one dominant sense, and quietly fail on the words a human would find most interesting."
        ]
      }
    ],
    "takeaways": [
      "Distributional meaning: context predicts the embedding.",
      "Negative sampling makes training cheap.",
      "It produces vectors with linear analogy structure."
    ],
    "demo": "word2vec"
  },
  "order": [
    "markov",
    "word2vec",
    "lstm-gates",
    "hmm-viterbi"
  ],
  "index": 1,
  "prev": "markov",
  "next": "lstm-gates"
};
