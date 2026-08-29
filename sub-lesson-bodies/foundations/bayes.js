// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/foundations/bayes/.
// concept-lesson-app.jsx reads window.DM_SUBLESSON_CTX and falls back to
// window.DM_SUBLESSON(...) so the page still works if this file is ever missing.

window.DM_SUBLESSON_CTX = {
  "module": {
    "title": "Mathematical and Programming Foundations",
    "lessons": {
      "chain-rule": {
        "title": "The Chain Rule"
      },
      "gradient-descent": {
        "title": "Gradient Descent"
      },
      "softmax": {
        "title": "Softmax"
      },
      "cross-entropy": {
        "title": "Cross-Entropy Loss"
      },
      "bayes": {
        "title": "Bayes' Rule"
      },
      "entropy": {
        "title": "Entropy and Information"
      },
      "clt": {
        "title": "The Central Limit Theorem"
      },
      "fourier": {
        "title": "Fourier Series"
      },
      "mutual-information": {
        "title": "Mutual Information"
      },
      "importance-sampling": {
        "title": "Importance Sampling"
      },
      "reservoir-sampling": {
        "title": "Reservoir Sampling"
      },
      "huffman-coding": {
        "title": "Huffman Coding"
      },
      "aliasing": {
        "title": "Aliasing & the Nyquist Limit"
      },
      "channel-capacity": {
        "title": "Channel Capacity"
      }
    }
  },
  "moduleSlug": "foundations",
  "conceptId": "bayes",
  "lesson": {
    "title": "Bayes' Rule",
    "oneLine": "Update what you believe in light of new evidence.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "Bayes' rule is how a rational agent revises a belief when data arrives. You start with a prior, see some evidence, and end with a posterior that blends the two - leaning on the prior when data is scarce and on the data when it is plentiful. It underlies Naive Bayes, Kalman filters, and probabilistic modeling generally."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "The posterior is the likelihood times the prior, normalized:"
        ],
        "tex": "P(H\\mid E) = \\frac{P(E\\mid H)\\,P(H)}{P(E)}",
        "texNote": "Posterior is proportional to likelihood times prior; the denominator just makes it sum to one."
      },
      {
        "h": "In code",
        "code": "def posterior(prior, likelihood):\n    # prior, likelihood: dict over hypotheses\n    joint = {h: prior[h] * likelihood[h] for h in prior}\n    z = sum(joint.values())\n    return {h: joint[h] / z for h in joint}",
        "caption": "Multiply prior by likelihood, then normalize."
      },
      {
        "h": "The base rate does not go away",
        "paras": [
          "A test with 99% sensitivity and 99% specificity sounds decisive until it meets a rare condition. At a prevalence of 1 in 1,000 a positive result gives a posterior of 9.02%: the test is right ninety-nine times in a hundred in isolation and wrong about nine times in ten in context, because the 0.1% of genuine cases is swamped by the false positives drawn from the other 99.9%.",
          "The fix is not more sensitivity. Holding sensitivity at 0.99, reaching a 90% posterior at that prevalence needs specificity 0.999892 — roughly a hundredfold cut in the false-positive rate. It is also why screening an asymptomatic population and testing a symptomatic patient are different problems with the same instrument: the second has already moved the prior, and the prior is doing most of the work."
        ]
      }
    ],
    "takeaways": [
      "Bayes' rule is the calculus of updating beliefs with evidence.",
      "Priors dominate when data is scarce; data dominates when it is plentiful.",
      "Base rates dominate more than intuition expects: a 99%-accurate test for a condition with 0.1% prevalence gives a positive result a posterior of only 9% - the same test at 10% prevalence gives 92%."
    ],
    "demo": "bayes"
  },
  "order": [
    "chain-rule",
    "gradient-descent",
    "softmax",
    "cross-entropy",
    "bayes",
    "entropy",
    "clt",
    "fourier",
    "mutual-information",
    "importance-sampling",
    "reservoir-sampling",
    "huffman-coding",
    "aliasing",
    "channel-capacity"
  ],
  "index": 4,
  "prev": "cross-entropy",
  "next": "entropy"
};
