// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/rnn-nlp/markov/.
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
  "conceptId": "markov",
  "lesson": {
    "title": "Markov Chains",
    "oneLine": "Model a sequence where the next step depends only on the current state.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "A Markov chain assumes the future depends on the present, not the full past. n-gram language models are exactly this: predict the next token from the last few. It is a weak assumption that is still a surprisingly strong baseline - and the conceptual ancestor of every sequence model."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "The Markov property drops all but the current state:"
        ],
        "tex": "P(x_t \\mid x_{<t}) = P(x_t \\mid x_{t-1})",
        "texNote": "Transition probabilities are just normalized counts of observed pairs."
      },
      {
        "h": "In code",
        "code": "from collections import Counter, defaultdict\n\ndef fit_bigram(tokens):\n    trans = defaultdict(Counter)\n    for a, b in zip(tokens, tokens[1:]):\n        trans[a][b] += 1\n    return trans            # sample next token from trans[current]",
        "caption": "Count pairs, normalize, sample - an n-gram model."
      },
      {
        "h": "Longer context, exponentially less data",
        "paras": [
          "The Markov assumption trades context for countability, and the exchange rate is brutal. Training on 80% of this site's prose and testing on the rest, the share of test n-grams never seen in training is 4.1% for unigrams, 54.4% for bigrams, 88.9% for trigrams, 97.0% for 4-grams and 98.8% for 5-grams. By order five, essentially every context at test time is one the model has no counts for.",
          "That is why n-gram language models stop at three to five orders and why so much classical NLP was smoothing — backoff, Kneser-Ney and the rest exist to answer the question \"what do I do when the count is zero\", which is the common case rather than the exception. It is also the precise gap that distributed representations closed: a neural model can generalise across contexts it never saw because similar words share parameters, whereas a count table can only ever look up what it has already observed."
        ]
      }
    ],
    "takeaways": [
      "Markov models condition only on the current state.",
      "n-gram language models are Markov chains over tokens.",
      "They are a strong, simple baseline for sequences."
    ],
    "demo": "markov"
  },
  "order": [
    "markov",
    "word2vec",
    "lstm-gates",
    "hmm-viterbi"
  ],
  "index": 0,
  "prev": null,
  "next": "word2vec"
};
