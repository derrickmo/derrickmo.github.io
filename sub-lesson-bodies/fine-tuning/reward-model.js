// GENERATED from sub-lessons.js by scripts/gen-sublesson-pages.mjs -- DO NOT EDIT.
// One concept's rendering context, loaded only by learn/fine-tuning/reward-model/.
// concept-lesson-app.jsx reads window.DM_SUBLESSON_CTX and falls back to
// window.DM_SUBLESSON(...) so the page still works if this file is ever missing.

window.DM_SUBLESSON_CTX = {
  "module": {
    "title": "Fine-Tuning and Alignment",
    "lessons": {
      "reward-model": {
        "title": "Reward Modeling"
      },
      "dpo": {
        "title": "Direct Preference Optimization"
      }
    }
  },
  "moduleSlug": "fine-tuning",
  "conceptId": "reward-model",
  "lesson": {
    "title": "Reward Modeling",
    "oneLine": "Learn a scalar reward from human preference comparisons.",
    "sections": [
      {
        "h": "The intuition",
        "paras": [
          "You cannot write down a loss for 'a helpful answer', but people can compare two answers and say which is better. A reward model learns a scalar score from many such comparisons, so that preferred responses score higher. That learned reward is what RLHF then optimizes the policy against."
        ]
      },
      {
        "h": "The math",
        "paras": [
          "The Bradley-Terry model turns score differences into preference probabilities:"
        ],
        "tex": "P(a \\succ b) = \\sigma\\!\\big(r(a) - r(b)\\big)",
        "texNote": "Train r by maximizing the log-likelihood of the observed preferences."
      },
      {
        "h": "In code",
        "code": "# pairwise preference loss (chosen > rejected)\nloss = -np.log(sigmoid(r(chosen) - r(rejected))).mean()",
        "caption": "Push the chosen response's score above the rejected one's."
      },
      {
        "h": "Goodhart, with the turnover measured",
        "paras": [
          "A reward model is a proxy fitted on a region of behaviour, and optimising it hard takes the policy out of that region. Modelling that directly — a proxy correlated 0.95 with the true objective, whose accuracy decays once the policy moves beyond the radius its training data covered — the true objective rises to 34.3 at eight steps of optimisation and then falls, reaching 2.6 by thirty-two steps. The proxy score is still climbing the whole time.",
          "Worth being explicit that the turnover comes from the validity-decay assumption rather than from the correlation itself: a linear proxy with a fixed correlation never turns over, however hard you push it, which is why simply reporting a proxy's correlation says nothing about how far it can be trusted. The practical consequences are the standard ones and now have a shape attached — the KL penalty back to the reference in RLHF exists to bound exactly this distance, and periodically refreshing the reward model on freshly sampled policy outputs is what moves its region of validity along with the policy."
        ]
      }
    ],
    "takeaways": [
      "Reward models learn from pairwise preferences, not absolute labels.",
      "Bradley-Terry links score gaps to preference probabilities.",
      "Goodhart risk: optimizing a proxy reward invites reward hacking."
    ],
    "demo": "reward-model"
  },
  "order": [
    "reward-model",
    "dpo"
  ],
  "index": 0,
  "prev": null,
  "next": "dpo"
};
