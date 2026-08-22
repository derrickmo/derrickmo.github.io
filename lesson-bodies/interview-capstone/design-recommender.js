// GENERATED from content/lessons/interview-capstone/design-recommender.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/interview-capstone/design-recommender/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "design-recommender": {
    "level": "core",
    "body": {
      "intuition": [
        "The first worked case, and the one where the skeleton's step 3 - where does a label come from - turns out to be the entire problem. Candidates spend the round on the ranker. The ranker is almost never the ceiling.",
        "TWO ARITHMETIC FACTS DECIDE THE DESIGN. First, a ranker cannot rank what retrieval never returned: if recall@1000 is 0.70, a PERFECT ranker tops out at 0.70, so the ceiling lives in candidate generation. Second, clicks measure placement rather than preference - with a realistic examination curve, P(click) at rank 1 was 0.4991 and at rank 10 was 0.0989, a 5.0x gap, while the TRUE relevance at those ranks was 0.5000 and 0.4994, identical by construction.",
        "That second fact is module 23 arriving in a product setting. Train on raw clicks and you teach the model to reproduce the previous ranker's placement. Inverse-propensity weighting recovered the truth almost exactly - naive CTR 0.1986 against an IPS estimate of 0.4999 for a true 0.5005 - and it requires the propensities to have been LOGGED, which is a step-3 design decision and cannot be retrofitted."
      ],
      "math": [
        {
          "h": "★ The retrieval recall ceiling",
          "paras": [
            "Everything downstream of candidate generation is a re-ordering of what it returned. Recall at the retrieval stage is a hard upper bound on the whole system's recall.",
            "This single observation redirects most design rounds productively, because it identifies where the marginal effort should go."
          ],
          "tex": "\\text{recall@}k_{\\text{system}} \\leq \\text{recall@}N_{\\text{retrieval}}: \\quad 0.70 \\Rightarrow \\text{a perfect ranker still achieves } 0.70",
          "texNote": "The practical consequence: measure retrieval recall separately and early. A two-point NDCG gain from a better ranker is worthless if retrieval is losing 30% of the relevant items before the ranker sees them."
        },
        {
          "h": "★ Position bias, measured",
          "paras": [
            "Model the click as relevance times an examination probability that decays with rank. The observed click rate then reflects both, and the rank effect dominates.",
            "True relevance is identical across ranks by construction here, so every difference in the click rate is bias."
          ],
          "tex": "P(\\text{click}) = P(\\text{relevant})\\cdot P(\\text{examined}\\mid \\text{rank}): \\quad 0.4991\\ (\\text{rank }1)\\ \\text{vs}\\ 0.0989\\ (\\text{rank }10),\\ \\text{true relevance } 0.5000\\ \\text{vs}\\ 0.4994",
          "texNote": "A 5.0x difference in clicks from a 0.001 difference in relevance. Any model trained on raw clicks learns the examination curve, which is the previous system's behaviour, not the user's preference."
        },
        {
          "h": "The correction, and what it costs you at design time",
          "paras": [
            "Reweight each observed click by the inverse probability that its position was examined. This is the same inverse-propensity machinery as module 23's IPW, with rank as the treatment."
          ],
          "tex": "\\hat{r} = \\mathbb{E}\\Big[\\frac{c_i}{P(\\text{examined}\\mid \\text{rank}_i)}\\Big] = 0.4999 \\quad\\text{vs naive } 0.1986 \\quad (\\text{true } 0.5005)",
          "texNote": "It recovers the truth to three decimals - and it needs the propensity, which means either an examination model or, far better, deliberate randomization logged at serving time. Retrofitting this onto existing logs is the expensive path."
        }
      ],
      "code": [
        {
          "h": "The case, walked with the skeleton",
          "paras": [
            "Answers are illustrative; the point is which questions get asked and in what order."
          ],
          "code": "# 1 CLARIFY   home feed, 100M DAU, 20 sessions/day, p99 200 ms,\n#             optimize long-term engagement; out of scope: ads, notifications\n# 2 FRAME     rank a candidate set per request. NOT a global CTR classifier.\n# 3 LABELS    ★ implicit only. click (seconds, position-biased), dwell>30s\n#             (minutes, closer to value), like (sparse, biased to extremes),\n#             next-day return (1 day, the thing we want, too delayed to train on)\n#             -> train on a WEIGHTED blend, validate against next-day return\n# 4 FEATURES  user history embedding, item embedding, context (time, device),\n#             cross features. ALL must exist at serving time.\n# 5 MODEL     two-tower for retrieval; GBDT or MLP for ranking; cross-encoder\n#             re-rank on the top ~50 only\n# 6 SERVING   500M -> 1000 (ANN) -> 500 (rules) -> 500 (rank) -> 50 (re-rank) -> 10\n# 7 METRICS   primary: next-day return. guardrails: diversity, creator\n#             coverage, time-to-first-interaction. offline: NDCG on a\n#             randomized slice, not on logged impressions\n# 8 ITERATE   ship retrieval first (the ceiling), then ranking",
          "caption": "Step 3 takes the longest and is the answer to why this is a hard problem. Step 5 takes ninety seconds and is where most candidates spend the round."
        },
        {
          "h": "The feedback loop, and the cheap insurance against it",
          "paras": [
            "The model chooses what is shown; what is shown determines what is logged; the logs train the next model. That is a closed loop with no external correction."
          ],
          "code": "# THE LOOP\n#   model -> impressions -> clicks -> training data -> model\n# Nothing in it observes items the model never showed, so the system\n# converges on a narrowing slice and reports improving offline metrics\n# the whole way.\n\n# SYMPTOMS\n#   * popularity concentration rising over time\n#   * new items never accumulating impressions (cold start becomes permanent)\n#   * offline NDCG improving while online engagement is flat\n\n# THE INSURANCE, decided at step 3 and cheap only if done early\n#   * LOG THE PROPENSITY with every impression\n#   * keep a small epsilon-random exploration slice permanently\n#   * keep a holdout that never sees the personalized feed\n# ★ These cost a little engagement now and are the only way to answer\n#   counterfactual questions later. They cannot be added retroactively.",
          "caption": "This is module 23's logged-propensity argument arriving as a product decision, and it is the highest-leverage thing a candidate can raise unprompted."
        }
      ],
      "useCases": [
        "The most common ML design prompt after search - feed, home page, 'people you may know', related items, and any personalized surface.",
        "Diagnosing a real recommender whose offline metrics improve while online engagement is flat, where position bias and the feedback loop are the first two hypotheses.",
        "Deciding where to spend engineering effort, since measuring retrieval recall separately usually reveals the ceiling is upstream of the ranker.",
        "Arguing for exploration budget and propensity logging with a concrete number rather than a principle."
      ],
      "pitfalls": [
        "Optimizing the ranker when retrieval is the ceiling. At recall@1000 of 0.70 a perfect ranker still achieves 0.70, and no ranking work changes that.",
        "Training on raw clicks. Rank 1 versus rank 10 gave a 5.0x click difference on identical true relevance, so the model learns the previous system's placement.",
        "Assuming the propensities will be available later. IPS recovered 0.4999 against a true 0.5005, and it needs the propensity logged at serving time - retrofitting is the expensive path.",
        "Choosing clicks as the training target without saying what they are a proxy for. Dwell, like and next-day return have different delays and different biases, and the blend is the actual design decision.",
        "Ignoring the feedback loop. Popularity concentration rises, new items never accumulate impressions, and offline metrics improve throughout.",
        "Evaluating offline on logged impressions. The logs were generated by the incumbent policy, so the evaluation is confounded in the model's favour - use a randomized slice.",
        "Proposing a cross-encoder over the full candidate set. It scores about 128 items in a 115 ms budget, which is why it belongs on the top 50 and nowhere earlier."
      ],
      "connections": [
        {
          "ref": "ml-applications/recommenders-cf",
          "text": "The modelling substance - matrix factorization, two-tower retrieval, implicit feedback - that this case arranges into a design."
        },
        {
          "ref": "causal-inference/potential-outcomes",
          "text": "Why logged clicks are confounded: the previous policy chose what was shown, so the observed outcome and the counterfactual differ systematically."
        },
        {
          "ref": "causal-inference/instrumental-variables",
          "text": "Randomized ranking perturbations as an instrument for exposure, which is how the propensity logging pays off later."
        },
        {
          "ref": "reinforcement-learning/bandits",
          "text": "The exploration budget argued for at step 3, and why a permanent epsilon-random slice is infrastructure rather than an experiment."
        },
        {
          "ref": "trustworthy-ai/distribution-shift",
          "text": "Why the offline-online gap persists: the training distribution is generated by the deployed policy and moves whenever the policy does."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "★ What caps a recommender's recall?",
          "a": "Retrieval. A ranker cannot rank what candidate generation never returned — at recall@1000 of 0.70, a PERFECT ranker still achieves 0.70."
        },
        {
          "q": "Give the position-bias numbers.",
          "a": "P(click) 0.4991 at rank 1 vs 0.0989 at rank 10 — a 5.0× gap — while true relevance was 0.5000 vs 0.4994, identical by construction."
        },
        {
          "q": "What does a model trained on raw clicks learn?",
          "a": "The previous ranker's examination curve — placement, not preference. It reproduces the incumbent policy."
        },
        {
          "q": "How do you correct it?",
          "a": "Inverse-propensity weighting by examination probability. Naive CTR 0.1986 → IPS estimate 0.4999 against a true 0.5005."
        },
        {
          "q": "What does IPS require?",
          "a": "The propensity LOGGED at serving time (or a randomized slice). A step-3 design decision that cannot be retrofitted cheaply."
        },
        {
          "q": "Name four candidate labels and their delays.",
          "a": "Click (seconds, position-biased), dwell >30s (minutes, closer to value), like (sparse, extreme-biased), next-day return (1 day, what you want, too delayed to train on)."
        },
        {
          "q": "So what do you train on?",
          "a": "A weighted blend of fast proxies, VALIDATED against the delayed thing you actually want. Saying that is the answer to step 3."
        },
        {
          "q": "Describe the feedback loop.",
          "a": "model → impressions → clicks → training data → model. Nothing observes items never shown, so the system narrows while offline metrics improve."
        },
        {
          "q": "Its three symptoms?",
          "a": "Rising popularity concentration; new items never accumulating impressions (permanent cold start); offline NDCG up while online engagement is flat."
        },
        {
          "q": "The insurance against it?",
          "a": "Log propensities with every impression, keep a permanent ε-random exploration slice, and keep a holdout that never sees the personalized feed."
        },
        {
          "q": "Why not offline-evaluate on logged impressions?",
          "a": "The logs were generated by the incumbent policy, so the evaluation is confounded in its favour. Evaluate on a randomized slice."
        },
        {
          "q": "Where does a cross-encoder go?",
          "a": "The top ~50 only — it scores about 128 items in a 115 ms budget, so anywhere earlier in the funnel is arithmetically impossible."
        }
      ],
      "standard": [
        {
          "q": "Design the ranking system for a home feed.",
          "a": "I'D WALK THE SKELETON AND SPEND MOST OF IT ON LABELS. CLARIFY: 100M DAU, 20 sessions a day, p99 of 200 ms, optimizing long-term engagement; ads and notifications out of scope. FRAME: rank a candidate set per request, not a global CTR classifier — a distinction that matters because the training data is per-impression and the metric is per-session. LABELS, WHERE THE PROBLEM ACTUALLY IS: everything available is implicit. A click arrives in seconds and is heavily position-biased. Dwell over 30 seconds arrives in minutes and is closer to value. A like is sparse and biased toward extremes. Next-day return is the thing we want and is far too delayed to train on. So I'd train on a weighted blend of the fast proxies and VALIDATE against next-day return, and say that explicitly, because the gap between the training target and the goal is the design's central compromise. FEATURES: user history embedding, item embedding, context, cross features — all constrained to what exists at serving time. MODEL: two-tower retrieval, GBDT or MLP ranking, cross-encoder re-rank on the top 50 only. SERVING: 500M → 1,000 → 500 → 500 → 50 → 10. METRICS: next-day return primary, with diversity and creator coverage as guardrails. ITERATE: ship retrieval first, because that is the ceiling.",
          "deepDive": {
            "q": "Why ship retrieval before the ranker?",
            "a": "The reason to ship retrieval first is worth defending with the arithmetic, because it is the highest-value thing in the answer. Everything downstream of candidate generation is a re-ordering of what it returned, so system recall is bounded by retrieval recall: at recall@1000 of 0.70, a perfect ranker still achieves 0.70. Candidates almost always spend the round on the ranker, and in real systems the ceiling is upstream far more often. The diagnostic is cheap — measure retrieval recall against a held-out set of known-relevant items, separately from end-to-end metrics — and it usually reallocates the roadmap. The second thing I'd raise unprompted is the guardrail set, because a feed optimized purely for engagement has well-known failure modes that a single metric cannot see: concentration on a shrinking set of creators, a permanent cold-start trap for new items, and drift toward whatever content maximizes short-run attention. Those are module 24's subgroup problem in a product costume — the aggregate metric improves while a segment collapses — and naming them shows you have watched a feed in production rather than only built one."
          }
        },
        {
          "q": "You are training on clicks. What is wrong with that, and what would you do?",
          "a": "CLICKS MEASURE PLACEMENT AT LEAST AS MUCH AS PREFERENCE. Modelling the click as relevance times an examination probability that decays with rank, and holding true relevance IDENTICAL across ranks by construction, P(click) came out at 0.4991 at rank 1 and 0.0989 at rank 10 — a 5.0× difference generated entirely by position. Any model trained on raw clicks learns that examination curve, which is a description of the PREVIOUS ranker's behaviour rather than of the user's preference, and it will therefore recommend what the incumbent already recommended. THE STANDARD FIX IS INVERSE-PROPENSITY WEIGHTING: reweight each click by the inverse probability that its position was examined. Measured, that recovered the truth almost exactly — naive CTR 0.1986 against an IPS estimate of 0.4999 for a true 0.5005. IT IS THE SAME MACHINERY AS MODULE 23'S IPW with rank as the treatment, and it inherits the same requirement: you need the propensity. The cheap and reliable way to get it is to log the assignment probability with every impression and to keep a small permanently-randomized slice, which makes the propensity KNOWN rather than estimated. That is a step-3 decision, and retrofitting it onto historical logs is the expensive path.",
          "deepDive": {
            "q": "What refinements would you add to that?",
            "a": "Two refinements worth having. First, IPW's variance problem transfers directly: items shown only at low-examination positions get large weights and a handful of observations can dominate, so the effective sample size is the honest diagnostic — exactly as it was for propensity matching. Clipping the weights trades bias for variance and, as in module 23, quietly changes the estimand. Second, position is not the only bias in the logs: there is selection bias in what was eligible for retrieval at all, presentation bias from thumbnails and titles, and trust bias where users click top results because they are top rather than because they were examined more. The examination model captures one of these and papers over the rest, which is why a randomized slice is worth more than a better propensity model — it dissolves all of them at once for the slice it covers. The cost is real and quantifiable: an ε of one percent on a feed is one percent of impressions served suboptimally, and that number is what you take to a product owner alongside the counterfactual questions it makes answerable."
          }
        },
        {
          "q": "Your offline NDCG improved 3% and online engagement did not move. What happened?",
          "a": "THE MOST LIKELY EXPLANATION IS THAT THE OFFLINE EVALUATION IS CONFOUNDED IN THE INCUMBENT'S FAVOUR, and it has three common forms. FIRST, EVALUATING ON LOGGED IMPRESSIONS: those impressions were chosen by the current model, so a new model is scored on its ability to reproduce the current model's choices, and NDCG on that set rewards agreement rather than quality. Evaluate on a randomized slice instead, where the impressions were not chosen by any model. SECOND, POSITION BIAS UNCORRECTED, which is the same problem in another form — the labels encode the incumbent's ranking, so matching them looks like winning. THIRD, A METRIC MISMATCH: NDCG measures ranking quality on a session's candidate set, and engagement is a longer-horizon, session-count quantity, so a ranking improvement can be real and still not move the thing you report. THE DIAGNOSTIC ORDER I'D USE: check whether the offline set is randomized; check whether retrieval changed at all, since a ranking gain on a fixed candidate set cannot exceed the retrieval ceiling of 0.70; and check the guardrails, because a diversity collapse can offset a relevance gain in aggregate engagement while both metrics move as designed.",
          "deepDive": {
            "q": "Is there a possibility that gets less discussion?",
            "a": "There is a fourth possibility that is less discussed and quite common: the improvement is real and the experiment is underpowered. Engagement metrics are noisy and session-level effects are small, so a 3% NDCG gain might correspond to a 0.2% engagement change that a two-week test cannot detect — which is module 23's MDE arithmetic, and the honest report is 'we could not have detected anything below X' rather than 'no effect'. Variance reduction with a pre-period covariate is the highest-value response, since CUPED-style adjustment bought roughly a 1.65× sample multiplier in that module for free. The other thing worth checking is novelty: a new ranker often produces a short-lived engagement bump from unfamiliar content that decays, so a one-week read of a permanent change measures a different quantity than a four-week read. Reporting the offline-online gap as a standing number — how much of an offline gain has historically translated — is the single most useful artifact a recommender team can maintain, and almost nobody does, which means every new model's projection is a guess."
          }
        },
        {
          "q": "How would you handle cold start for new items?",
          "a": "BY TREATING IT AS AN EXPLORATION PROBLEM RATHER THAN A FEATURE PROBLEM, because the feedback loop makes it self-reinforcing. A new item has no interaction history, so the model ranks it low, so it gets no impressions, so it never accumulates history — and the loop closes permanently. Content features help and do not break the loop: an item embedding from text, image or metadata gives the two-tower model something to work with and places the item near similar items, which is necessary and not sufficient, because the ranker will still prefer items with proven engagement. THE MECHANISM THAT BREAKS THE LOOP IS FORCED EXPOSURE with a budget: reserve a small fraction of impressions for under-explored items, which is exactly a bandit's exploration term and is best implemented as a permanent slice rather than a campaign. That converts cold start from a trap into a bounded cost you can state — one percent of impressions, say — and it produces the propensity-logged data that makes everything else measurable. I'D ALSO SET AN EXPLICIT GRADUATION CRITERION: how many impressions an item needs before its estimate is trusted, which is a confidence-interval question rather than a round number.",
          "deepDive": {
            "q": "Which guardrail would you add?",
            "a": "The guardrail worth adding is creator or supplier coverage, because cold start is usually not a per-item problem but a marketplace-health problem. A feed that never surfaces new creators loses supply over time, and that damage shows up in engagement much later than in the coverage metric, which is why coverage belongs in the guardrail tier from module 24 with the burden of proof reversed — you need evidence of NO harm rather than evidence of harm. There is also a measurement subtlety: exploration impressions are worth more than their engagement suggests, because their value is the information they produce, and evaluating the exploration slice on the same engagement metric as the exploit slice will always make exploration look like a loss. The honest framing is that the ε cost is an information purchase with a measurable return — the improvement in the model trained on the resulting data — and teams that never make that argument tend to have their exploration budget cut in the first efficiency review."
          }
        },
        {
          "q": "What would you monitor once this ships?",
          "a": "FOUR TIERS, AND THE FIRST IS THE ONE MOST TEAMS SKIP. LABELLED PERFORMANCE: a small continuously-labelled random sample, because module 24's result is that no unlabelled statistic detects concept shift — every input monitor stayed at control values while accuracy fell to 0.3375 there. For a feed, the equivalent is a randomized holdout whose engagement is measured continuously, which also gives an unbiased baseline for every future experiment. PIPELINE INTEGRITY: feature null rates, embedding freshness, index staleness, and schema invariants, which catch the failures that do the most damage fastest and are written as invariants rather than statistical tests. FUNNEL HEALTH: retrieval recall on a held-out set, candidate counts at each stage, and per-stage latency against the budget, since a silent retrieval regression is invisible in end-to-end engagement until it is large. GUARDRAILS: diversity, creator coverage, and the popularity concentration curve, which is the feedback loop's early symptom and moves long before engagement does.",
          "deepDive": {
            "q": "Which one would you argue hardest for?",
            "a": "The one I would argue hardest for is the permanent randomized holdout, because it does triple duty and is nearly impossible to add later. It gives an unbiased engagement baseline, so every experiment has a stable reference rather than a moving one; it gives unconfounded training data, which is the only clean source for evaluating a new ranker offline; and it gives the counterfactual for measuring the system's cumulative value, which is the number leadership eventually asks for and which no team without a holdout can answer. Its cost is precisely quantifiable — the engagement gap between holdout and treated users times the holdout fraction — and stating that cost up front is what gets it approved. The related monitoring habit from module 24 is to report per-segment rather than aggregate, since a feed can improve on average while degrading for a cohort, and the aggregate is a weighted average that hides exactly the reversal you most need to see."
          }
        },
        {
          "q": "What makes this case hard, in one sentence, and what does that generalize to?",
          "a": "THE LABEL YOU CAN MEASURE IS NOT THE OUTCOME YOU WANT, AND THE DATA YOU TRAIN ON WAS GENERATED BY THE SYSTEM YOU ARE TRYING TO IMPROVE. Both halves are step 3, and both are the causal module in a product setting. The first half is a proxy problem: clicks are fast and biased, next-day return is what matters and is too delayed to train on, so the design's central compromise is a weighted blend validated against the delayed target — and that compromise should be said out loud, because it is the honest answer to why this is hard. The second half is a confounding problem: impressions were chosen by the incumbent policy, so the logs describe that policy as much as they describe users, and a model trained on them converges toward reproducing it while offline metrics improve throughout. THE GENERALIZATION IS THE PATTERN TO CARRY INTO EVERY OTHER DESIGN CASE: ask what the label is a proxy for and how delayed it is, and ask which policy generated the data you are about to train on. Those two questions find the hard part of almost every applied ML system, and they take fifteen seconds.",
          "deepDive": {
            "q": "What is the third member of that family?",
            "a": "It is worth naming the third member of that family, which shows up in the remaining cases: the metric you optimize is not the metric you are judged on, and the gap between them is where Goodhart lives. In a feed, engagement is a proxy for value and optimizing it hard produces the well-documented pathologies; in ads, revenue per auction is a proxy for advertiser and user welfare; in fraud, caught-fraud is a proxy for loss prevented net of friction. Module 24's measurement showed the shape: a proxy tracking truth across the range where it was fitted and inverting outside it, with true quality at −49.319 where the proxy was maximized. The design-level defence is the same as the alignment-level one — bound the optimization pressure, keep a held-out measurement of the thing you actually want, and put guardrails on the failure directions you can name in advance. Saying that in a design round, briefly and with a number, is unusual and lands well, because it is the difference between designing a system and designing a system you would be willing to own."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "★ The retrieval recall ceiling",
        "back": "recall@k_system ≤ recall@N_retrieval. At recall@1000 = 0.70, a PERFECT ranker still achieves 0.70. Candidates spend the round on the ranker; the ceiling is almost always upstream."
      },
      {
        "type": "formula",
        "front": "★ Position bias, measured",
        "back": "P(click) = P(relevant)·P(examined | rank). Rank 1: **0.4991**. Rank 10: **0.0989** — a 5.0× gap — while true relevance was 0.5000 vs 0.4994, identical by construction."
      },
      {
        "type": "intuition",
        "front": "What does training on raw clicks teach?",
        "back": "The previous ranker's EXAMINATION CURVE — placement, not preference. The model learns to reproduce the incumbent policy, and offline metrics reward it for doing so."
      },
      {
        "type": "formula",
        "front": "The IPS correction",
        "back": "r̂ = E[ c_i / P(examined | rank_i) ]. Naive CTR **0.1986** → IPS **0.4999** (true 0.5005). Same machinery as module 23's IPW, with RANK as the treatment."
      },
      {
        "type": "pitfall",
        "front": "What IPS requires",
        "back": "The propensity LOGGED at serving time, or a permanently randomized slice (which makes it KNOWN rather than estimated). A step-3 decision — retrofitting onto historical logs is the expensive path."
      },
      {
        "type": "definition",
        "front": "Four labels, four delays",
        "back": "Click (seconds, position-biased) · dwell >30s (minutes, closer to value) · like (sparse, extreme-biased) · next-day return (1 day, WHAT YOU WANT, too delayed to train on). Train on a blend; VALIDATE on the delayed one."
      },
      {
        "type": "pitfall",
        "front": "★ The feedback loop",
        "back": "model → impressions → clicks → training data → model. Nothing observes items never shown. Symptoms: rising popularity concentration, permanent cold start, offline NDCG up while online engagement is flat."
      },
      {
        "type": "intuition",
        "front": "The three-part insurance",
        "back": "Log propensities with every impression · a permanent ε-random exploration slice · a holdout that never sees the personalized feed. Costs a little engagement now; cannot be added retroactively."
      },
      {
        "type": "pitfall",
        "front": "Why offline NDCG improves and engagement doesn't",
        "back": "Evaluating on LOGGED impressions scores a model on reproducing the incumbent's choices. Also: uncorrected position bias, a metric-horizon mismatch, or an underpowered test (module 23's MDE arithmetic)."
      },
      {
        "type": "intuition",
        "front": "Cold start is an exploration problem",
        "back": "No history → ranked low → no impressions → no history. Content features help and DON'T break the loop. Forced exposure with a stated budget does — plus an explicit graduation criterion (a CI question, not a round number)."
      },
      {
        "type": "intuition",
        "front": "Why the permanent holdout does triple duty",
        "back": "Unbiased engagement baseline · unconfounded training/eval data · the counterfactual for cumulative system value. Cost is exactly quantifiable, which is what gets it approved. Nearly impossible to add later."
      },
      {
        "type": "intuition",
        "front": "★ What makes this case hard (and generalizes)",
        "back": "The label you can measure isn't the outcome you want, AND the data you train on was generated by the system you're improving. Ask both of every design case — it takes fifteen seconds and finds the hard part."
      }
    ],
    "refs": [
      {
        "title": "Covington, Adams & Sargin (2016), Deep Neural Networks for YouTube Recommendations",
        "url": "https://research.google/pubs/pub45530/"
      },
      {
        "title": "Joachims, Swaminathan & Schnabel (2017), Unbiased Learning-to-Rank with Biased Feedback",
        "url": "https://arxiv.org/abs/1608.04468"
      },
      {
        "title": "Yi et al. (2019), Sampling-Bias-Corrected Neural Modeling for Large Corpus Item Recommendations",
        "url": "https://dl.acm.org/doi/10.1145/3298689.3346996"
      },
      {
        "title": "Chaney, Stewart & Engelhardt (2018), How Algorithmic Confounding in Recommendation Systems Increases Homogeneity",
        "url": "https://arxiv.org/abs/1710.11214"
      },
      {
        "title": "Bottou et al. (2013), Counterfactual Reasoning and Learning Systems",
        "url": "https://arxiv.org/abs/1209.2355"
      }
    ],
    "demos": [
      "embeddings",
      "vector-search",
      "bandit",
      "roc"
    ]
  }
};
