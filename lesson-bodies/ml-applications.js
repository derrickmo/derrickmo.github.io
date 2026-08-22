// GENERATED from content/lessons/ml-applications/ by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// Store-authored lesson bodies for module "ml-applications". Loaded by the lesson pages
// BEFORE lesson-app.jsx, which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "neural-recommenders": {
    "level": "core",
    "body": {
      "intuition": [
        "A two-tower model is matrix factorization with the lookup tables replaced by encoders. That one change is what buys everything: because the user tower and the item tower never interact until a dot product at the very end, item embeddings can be precomputed and indexed, and retrieval over hundreds of millions of items becomes an approximate nearest-neighbour lookup instead of a scoring pass.",
        "The architectural constraint IS the feature. A cross-encoder that lets user and item features interact early is strictly more expressive and cannot be precomputed, which is why it lives at the end of the funnel scoring around a hundred items rather than at the start scoring a hundred million. Expressiveness and precomputability are in direct tension, and the funnel exists to buy both.",
        "This module's spine shows up here immediately: the structure that makes recommenders learnable - users repeat, items are popular, interactions are ordered in time - is the same structure that makes naive validation leak. In simulation, computing a per-user click-rate feature over the whole dataset before splitting gave AUC 0.5659 against 0.5012 for the same feature computed on train only. THE SPLIT WAS ALREADY CORRECT AND TEMPORAL. The leak was in the feature."
      ],
      "math": [
        {
          "h": "The two-tower factorization, and what it forbids",
          "paras": [
            "Score is an inner product of two independently-computed embeddings. Nothing about the user may influence the item embedding, which is exactly the property an index requires.",
            "Everything you might want - early feature crosses, attention between the query and the candidate - breaks precomputability."
          ],
          "tex": "s(u,i) = \\langle f_\\theta(x_u),\\, g_\\phi(x_i)\\rangle \\quad\\text{vs cross-encoder}\\quad s(u,i)=h_\\psi(x_u, x_i)",
          "texNote": "The first can be served as an ANN lookup over precomputed g(x_i). The second must be evaluated per pair, which at 115 ms of ranker budget is about 128 items rather than 230,000 - the arithmetic that forces the funnel."
        },
        {
          "h": "Sampled softmax and the correction that matters",
          "paras": [
            "Training against every item is intractable, so the softmax denominator is estimated from sampled negatives. Sampling in-batch is cheap and biased toward popular items, because popular items appear in batches more often.",
            "The logQ correction subtracts the log sampling probability, which removes the bias without giving up the cheap sampler."
          ],
          "tex": "\\mathcal{L} = -\\log\\frac{e^{s(u,i^+)}}{e^{s(u,i^+)}+\\sum_{j\\in\\mathcal{N}} e^{s(u,j)}}, \\qquad s'(u,j)=s(u,j)-\\log Q(j)",
          "texNote": "Without the correction the model learns to down-rank popular items, because they appear as negatives far more often than their true frequency implies. This is the single most common training bug in a two-tower system."
        },
        {
          "h": "★ Where the leak actually lives",
          "paras": [
            "A correct temporal split is necessary and not sufficient. Any aggregate computed before the split carries test information into training.",
            "Measured with a temporal split held fixed and only the feature's computation changed."
          ],
          "tex": "\\text{user click-rate over ALL data: AUC } \\mathbf{0.5659} \\qquad \\text{over TRAIN only: AUC } 0.5012",
          "texNote": "The 0.5012 is the honest number and it is essentially chance, which is the correct answer for that feature on this data. The 0.0647 gap is entirely manufactured by computing a statistic across the split boundary."
        }
      ],
      "code": [
        {
          "h": "The funnel, and why each stage exists",
          "paras": [
            "Each stage is a different point on the expressiveness-versus-precomputability curve."
          ],
          "code": "# RETRIEVAL     two-tower + ANN over precomputed item embeddings\n#               ~1 ms for 500M items. NO user-item interaction possible.\n# FILTERING     business rules, eligibility, dedupe, already-seen\n#               cheap, and the place most product logic actually lives\n# RANKING       GBDT or MLP over user x item CROSS features\n#               ~3 ms for 500 items. Interaction allowed, precompute lost.\n# RE-RANK       cross-encoder / listwise model on the top ~50\n#               ~45 ms. Full interaction, and diversity/business objectives\n#               that only make sense over a SET rather than per item.\n\n# ★ The last stage is the only one that can optimize the SLATE - diversity,\n#   de-duplication across creators, exposure fairness - because those are\n#   properties of the list, not of an item. Pointwise ranking cannot see them.",
          "caption": "Retrieval decides what is possible and ranking decides what is shown. The recall ceiling from the design case applies: a perfect ranker cannot exceed retrieval's recall."
        },
        {
          "h": "The leaks specific to this domain",
          "paras": [
            "Three of them, and only the first is fixed by choosing the split correctly."
          ],
          "code": "# 1 SPLIT LEAK      random interaction split lets a user's LATER behaviour\n#                   train a model evaluated on their EARLIER behaviour.\n#                   Fix: split by TIME, globally - not per user.\n\n# 2 FEATURE LEAK    any aggregate computed before the split.\n#                   measured: user click-rate over all data AUC 0.5659,\n#                   over train only 0.5012. THE SPLIT WAS ALREADY CORRECT.\n#                   Fix: compute every aggregate inside the training window,\n#                   with the same as-of logic serving will use.\n\n# 3 POPULARITY LEAK evaluating on a popularity-skewed test set makes a\n#                   popularity baseline look strong and a personalized\n#                   model look marginal.\n#                   Fix: report per-slice (head/torso/tail) and against a\n#                   popularity baseline explicitly.\n\n# ★ The as-of discipline is the general fix: every feature must be computable\n#   from information available at the prediction timestamp, and the training\n#   pipeline must enforce that rather than trusting the author.",
          "caption": "Feature leakage survives a correct split, which is why 'we used a temporal split' is not an answer to 'how do you know this generalizes'."
        }
      ],
      "useCases": [
        "Candidate generation for any large-catalogue recommender, where the corpus is too large to score and an ANN index is the only viable retrieval.",
        "Cold-start-tolerant retrieval, since a content-based item tower produces an embedding for an item with no interaction history at all.",
        "Multi-surface reuse, where one item tower serves feed, search, notifications and related-items with different user towers.",
        "Any retrieval problem with the same shape - job matching, document search, product similarity - where the two-tower plus ANN pattern transfers directly."
      ],
      "pitfalls": [
        "Computing features before splitting. A per-user click rate over all data gave AUC 0.5659 against 0.5012 computed on train only, with the temporal split already correct.",
        "Sampled softmax without the logQ correction. In-batch negatives are popularity-biased, so the model learns to down-rank popular items - the most common two-tower training bug.",
        "Random interaction splits. They let a user's later behaviour train a model evaluated on their earlier behaviour, which the serving system will never be able to do.",
        "Optimizing the ranker when retrieval is the ceiling. System recall is bounded by retrieval recall, and a perfect ranker cannot exceed it.",
        "Expecting a two-tower model to capture user-item interaction. It cannot by construction - the towers never meet before the dot product, and that limitation is what makes the index possible.",
        "Ignoring the ANN's own recall. The index is an approximation, so its recall is a second ceiling stacked under the retrieval model's, and it is a tunable parameter rather than a library default.",
        "Reporting a single aggregate metric on a popularity-skewed test set, where a popularity baseline looks strong and personalization looks marginal - report head, torso and tail separately."
      ],
      "connections": [
        {
          "ref": "ml-applications/recommenders-cf",
          "text": "The matrix-factorization ancestor, and the precise sense in which a two-tower model generalizes it by replacing lookup tables with encoders."
        },
        {
          "ref": "rag-agents/embeddings-vector-stores",
          "text": "The retrieval infrastructure - ANN indexes, recall-versus-latency tuning - which is the same machinery under a different application."
        },
        {
          "ref": "interview-capstone/design-recommender",
          "text": "The design-round treatment, including the retrieval recall ceiling and the position-bias correction that this lesson's leaks sit alongside."
        },
        {
          "ref": "causal-inference/potential-outcomes",
          "text": "Why logged interactions are confounded by the incumbent policy, which is the deeper version of the leakage problem here."
        },
        {
          "ref": "ml-theory/cross-validation",
          "text": "The general discipline this lesson specializes: what a split must respect, and why the unit of splitting is a modelling decision."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is a two-tower model?",
          "a": "Independent user and item encoders whose outputs meet only in a final dot product: s(u,i) = ⟨f(x_u), g(x_i)⟩."
        },
        {
          "q": "Why does that architecture matter?",
          "a": "Item embeddings can be precomputed and ANN-indexed, so retrieval over hundreds of millions of items is a lookup rather than a scoring pass."
        },
        {
          "q": "What does it give up?",
          "a": "Any user-item interaction before the dot product. A cross-encoder is strictly more expressive and cannot be precomputed."
        },
        {
          "q": "So where does a cross-encoder go?",
          "a": "The end of the funnel — ~128 items in a 115 ms budget against 230,000 for a dot product. The arithmetic forces the placement."
        },
        {
          "q": "What is sampled softmax for?",
          "a": "The full softmax denominator over all items is intractable, so it's estimated from sampled negatives."
        },
        {
          "q": "★ What is the logQ correction?",
          "a": "Subtract log Q(j) from the sampled logits. In-batch negatives are popularity-biased, so without it the model learns to DOWN-RANK popular items — the most common two-tower bug."
        },
        {
          "q": "★ Give the feature-leak result.",
          "a": "Per-user click rate computed over ALL data: AUC **0.5659**. The same feature computed on TRAIN only: **0.5012**. The temporal split was already correct."
        },
        {
          "q": "What's the general fix?",
          "a": "As-of discipline: every feature must be computable from information available at the prediction timestamp, enforced by the pipeline rather than trusted to the author."
        },
        {
          "q": "Why not a random interaction split?",
          "a": "It lets a user's LATER behaviour train a model evaluated on their EARLIER behaviour — information serving will never have."
        },
        {
          "q": "What are the two stacked recall ceilings?",
          "a": "The retrieval model's recall, and under it the ANN index's own approximate recall. Both cap the system; both are tunable."
        },
        {
          "q": "Which stage can optimize diversity?",
          "a": "Only re-ranking. Diversity, cross-creator dedupe and exposure fairness are properties of the SET, and pointwise ranking cannot see them."
        },
        {
          "q": "Why report head/torso/tail separately?",
          "a": "A popularity-skewed test set makes a popularity baseline look strong and personalization look marginal. The aggregate hides which one you built."
        }
      ],
      "standard": [
        {
          "q": "Explain the two-tower architecture and the trade it makes.",
          "a": "IT IS MATRIX FACTORIZATION WITH THE LOOKUP TABLES REPLACED BY ENCODERS. A user tower maps user features to an embedding, an item tower maps item features to an embedding, and the score is their inner product. THE CRITICAL PROPERTY IS WHAT THE ARCHITECTURE FORBIDS: nothing about the user may influence the item embedding, because the towers never interact before the final dot product. That constraint is not a limitation to work around — it IS the feature, because it means every item embedding can be computed offline, stored in an ANN index, and retrieved in about a millisecond regardless of catalogue size. THE TRADE IS EXPRESSIVENESS. A cross-encoder that lets user and item features interact early is strictly more expressive and cannot be precomputed, so it must be evaluated per pair; with 115 ms of ranker budget that is roughly 128 items against 230,000 for a dot product. Those two numbers are why the funnel has the shape it has everywhere: retrieve with the cheap precomputable model, then spend the expressiveness on the few dozen candidates that survive. UPGRADING FROM CLASSICAL MF, the encoders also give you cold start for free — an item with no interactions still has content features, so it still gets an embedding.",
          "deepDive": "The training detail that separates a working system from a broken one is negative sampling. The softmax denominator over the full catalogue is intractable, so it is estimated from sampled negatives, and the cheap sampler is in-batch — treat the other items in the batch as negatives. That sampler is popularity-biased by construction, because popular items appear in batches far more often than rare ones, so without correction the model learns that popular items are frequently negative and systematically down-ranks them. The logQ correction subtracts the log sampling probability from each sampled logit and removes the bias while keeping the cheap sampler. It is a one-line change and its absence produces a characteristic symptom: offline metrics look reasonable and the served results are strangely obscure. Worth also knowing that mixing in uniformly-sampled negatives alongside in-batch ones helps, because in-batch negatives are drawn from the interaction distribution and the model also needs to learn about items nobody interacts with — which is most of the catalogue."
        },
        {
          "q": "You used a temporal split. Why is that not enough?",
          "a": "BECAUSE THE SPLIT AND THE FEATURES ARE SEPARATE LEAK SURFACES, and fixing one says nothing about the other. I measured this with the split held correct and temporal, changing only how a feature was computed: a per-user click-rate feature computed over the WHOLE dataset gave AUC 0.5659, and the identical feature computed on the training window only gave 0.5012. The second number is essentially chance, which is the honest answer for that feature on that data; the 0.065 of apparent signal was manufactured entirely by computing a statistic that spans the split boundary. THE MECHANISM IS GENERAL: any aggregate — a user's mean, a category's conversion rate, a normalization constant, an imputation value, a target encoding — computed before splitting carries information from the test period into training. Target encoding is the most dangerous member of that family because it is explicitly a function of the label. THE FIX IS AS-OF DISCIPLINE: every feature must be computable from information available at the prediction timestamp, with the same logic the serving path will use, and the training pipeline must ENFORCE it rather than trusting the author to remember. That is what a point-in-time-correct feature store is for, and it is the main thing that distinguishes one from a table of precomputed columns.",
          "deepDive": "The reason this specific bug survives review is that the code looks correct at every line — you split, you train, you evaluate, and the leak is upstream in a groupby that ran before any of it. The detection habits worth building are cheap. First, a result that is surprisingly good is a leakage hypothesis before it is a modelling success, and the first thing to check is which features were computed over what window. Second, an ablation: drop the suspicious aggregate and see how much of the performance goes with it, since a single feature carrying most of the lift is a tell. Third, compare offline to online whenever an online number exists, because leakage is precisely the class of error that vanishes in production — the model in production genuinely cannot see the future, so a large offline-online gap with a correct split points straight at the features. Maintaining that gap as a standing number is the single most useful artefact a recommender team can have, and it also gives you a prior for how much to discount the next offline result."
        },
        {
          "q": "How would you evaluate a retrieval model?",
          "a": "ON RECALL AT THE CANDIDATE-SET SIZE, SEPARATELY FROM THE RANKER, because it is a ceiling rather than a contribution. If retrieval's recall@1000 is 0.70, a perfect ranker still achieves 0.70, so measuring end-to-end only tells you the product of two stages and cannot tell you which one to work on. I'D MEASURE recall@k against a held-out set of known-relevant items, for k at the actual candidate-set size, and I'd do it on a temporally-correct split with as-of features. THERE ARE TWO STACKED CEILINGS and both need reporting: the retrieval MODEL's recall, and beneath it the ANN INDEX's approximate recall, which is a tunable parameter — HNSW's ef and IVF's nprobe trade recall against latency, and a default value silently sets a system-level ceiling. Measuring index recall against exact search on a sample takes minutes and is routinely skipped. AND I'D SLICE THE RESULT, because a popularity-skewed test set lets a popularity baseline look strong and personalization look marginal; reporting head, torso and tail separately shows which one you actually built. FINALLY I'd compare against that popularity baseline explicitly, since a retrieval model that does not beat it is not doing anything.",
          "deepDive": "There is a subtlety about what 'relevant' means here that is worth raising, because it determines whether the whole evaluation is meaningful. The held-out relevant set usually comes from logged interactions, and those interactions were generated by the incumbent system — so items the incumbent never showed are absent from the ground truth, and a new retrieval model that surfaces them is penalized for finding things the evaluation cannot see. That is the confounding problem from the causal module appearing as an evaluation artefact, and it systematically favours the incumbent. The mitigations are the same: a randomized exposure slice provides an unbiased relevance sample, and evaluating on that slice rather than on organic logs removes the bias for the region it covers. Failing that, reporting the fraction of a new model's top-k that the incumbent never showed is a useful diagnostic — a model whose candidates are entirely within the incumbent's historical exposure is not expanding anything, and one whose candidates are mostly outside it will score badly offline for reasons that may not be real."
        },
        {
          "q": "How does a two-tower model handle cold start?",
          "a": "MUCH BETTER THAN CLASSICAL MATRIX FACTORIZATION, AND STILL NOT COMPLETELY. In classical MF an item's embedding is a row of a learned table, so an item with no interactions has no embedding at all and cannot be retrieved by any query — the problem is total. In a two-tower model the item embedding is a FUNCTION of item features, so a new item with text, images, category and price gets an embedding immediately, and it lands near items with similar content. That is a genuine structural advantage and it is one of the main reasons the architecture replaced pure MF. WHAT IT DOES NOT SOLVE is that the content embedding is a prior, not evidence: the model learned the mapping from features to embeddings using items that HAVE interaction history, so it places a new item where similar historical items sat, which is a reasonable guess and systematically wrong for items whose appeal differs from their appearance. AND THE RANKER STILL PREFERS PROVEN ITEMS, so retrieval surfacing the new item does not mean it gets shown. THE MECHANISM THAT ACTUALLY CLOSES THE LOOP is exploration with a budget — a reserved impression fraction or an optimistic prior — which is a bandit's exploration term and a product decision rather than a modelling one.",
          "deepDive": "There is a training-time choice that matters for how well this works and is easy to get wrong: how much the item tower is allowed to rely on an item ID embedding versus content features. If an ID embedding is available and the item is well-observed, the model will lean on it because it is more informative, and the content pathway atrophies — which means cold-start performance degrades precisely as the warm-start performance improves. The standard mitigations are ID dropout during training, forcing the model to sometimes predict from content alone, and explicitly evaluating a cold-start slice where IDs are masked. Without that evaluation slice the regression is invisible, because aggregate metrics are dominated by warm items. This is the same aggregation problem as everywhere else in the curriculum — the metric that matters for a minority of the traffic has to be reported separately or it does not exist — and cold items are always a minority by interaction count and often a majority by catalogue count."
        },
        {
          "q": "When would you not use a two-tower model?",
          "a": "WHEN THE CATALOGUE IS SMALL ENOUGH TO SCORE EXHAUSTIVELY, AND WHEN THE INTERACTION IS THE SIGNAL. If you have ten thousand items and a 115 ms budget, a GBDT with user-item cross features can score all of them and will beat a dot product, because you are paying for an index you do not need and giving up expressiveness you could afford. The two-tower architecture is a response to a scale constraint, so without the constraint it is a strictly worse model. THE SECOND CASE IS WHEN THE MATCH DEPENDS ON FINE-GRAINED INTERACTION that a fixed-dimensional dot product cannot represent — query-document term matching in search is the classic example, where an exact rare-term match matters enormously and is exactly what a dense embedding smooths away. That is why serious search stacks run lexical retrieval alongside dense: they fail on disjoint query types. THE THIRD IS WHEN THE ITEM SET IS TINY BUT THE CONTEXT IS RICH, such as choosing among five layouts or three notification types, where the whole problem is the context and the candidate set is not the difficulty. IN ALL THREE THE DIAGNOSTIC IS THE SAME: does the arithmetic force a funnel? If it does not, the funnel is complexity with no return.",
          "deepDive": "There is a fourth case that is increasingly common and worth naming: when retrieval quality is not the bottleneck at all because the corpus is already filtered by hard constraints. In many marketplace and enterprise settings, eligibility rules — geography, permissions, inventory, contract terms — cut a hundred-million-item catalogue to a few hundred candidates before any model runs, and at that point the two-tower stage is solving a problem that no longer exists. The failure mode is architectural inertia: the funnel was designed when the constraint bound and remains after it stopped. Checking the actual post-filter candidate-set distribution takes one query and occasionally deletes an entire service. That connects to the design-round habit of doing the arithmetic before choosing the architecture — the same calculation that justifies a funnel also tells you when to remove one, and the second direction is much less often run."
        },
        {
          "q": "How does this lesson fit the module's theme?",
          "a": "THE STRUCTURE THAT MAKES RECOMMENDERS WORK IS THE STRUCTURE THAT MAKES THEM LEAK. Users repeat, so there is a per-user signature to exploit — and a random split turns that signature into a lookup table. Interactions are ordered in time, so recency is predictive — and a random split lets the future train the past. Items are popularity-skewed, so a popularity prior is genuinely informative — and an unsliced test set lets that prior masquerade as personalization. EVERY EXPLOITABLE REGULARITY IS ALSO A LEAK SURFACE, and that is the module's spine rather than a coincidence: the regularity is a dependency between rows, and validation assumes independence. WHAT MAKES THIS LESSON'S VERSION PARTICULARLY USEFUL is that the leak survived a CORRECT split — user click-rate over all data gave 0.5659 against 0.5012 computed on train only, with a temporal split in place the whole time. So 'we split by time' answers one of three leak surfaces and is routinely offered as though it answered all of them. THE TRANSFERABLE QUESTION for the rest of the module: what structure does this data have, and does my split — and every feature — respect it?",
          "deepDive": "It is worth stating the general form because it recurs in every remaining lesson with a different surface. Cross-validation assumes exchangeability between the training and held-out rows, and every domain in this module violates that in its own way: time series violate it through temporal order, graphs through edges, audio and medical data through the recording or the patient, search through the query, multi-task through shared examples across tasks. THE UNIT OF SPLITTING IS THEREFORE A MODELLING DECISION, not a default, and it should be chosen to match the unit of generalization you care about — if you will deploy to new users, split by user; to new time periods, split by time; to new hospitals, split by hospital. Getting that wrong produces a number that answers a question nobody asked, which is the same reference-class failure module 24 spent ten lessons on, arriving here as a two-line change in a data pipeline. The cheap habit is to state, in one sentence next to every metric, what unit was held out — because if you cannot, you do not know what the number means."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Two-tower model",
        "back": "s(u,i) = ⟨f(x_u), g(x_i)⟩ — independent encoders meeting only at a dot product. MF with the lookup tables replaced by encoders."
      },
      {
        "type": "intuition",
        "front": "★ The constraint IS the feature",
        "back": "Because the towers never interact, item embeddings PRECOMPUTE and ANN-index. A cross-encoder is strictly more expressive and cannot: ~128 items in a 115 ms budget vs 230,000 for a dot product."
      },
      {
        "type": "formula",
        "front": "Sampled softmax + logQ",
        "back": "L = −log[ e^{s(u,i⁺)} / (e^{s(u,i⁺)} + Σ_j e^{s(u,j)}) ], with s′(u,j) = s(u,j) − log Q(j). In-batch negatives are POPULARITY-BIASED; without the correction the model down-ranks popular items."
      },
      {
        "type": "pitfall",
        "front": "★ The leak that survives a correct split",
        "back": "Per-user click rate over ALL data: AUC **0.5659**. Same feature on TRAIN only: **0.5012** (chance — the honest answer). The temporal split was correct the whole time. The leak was in the FEATURE."
      },
      {
        "type": "definition",
        "front": "As-of discipline",
        "back": "Every feature must be computable from information available AT THE PREDICTION TIMESTAMP, with the same logic serving uses — and the pipeline must ENFORCE it. That's what a point-in-time-correct feature store is for."
      },
      {
        "type": "pitfall",
        "front": "The leaky aggregate family",
        "back": "Any statistic computed before splitting: a user mean, a category rate, a normalization constant, an imputation value, a TARGET ENCODING (most dangerous — it's an explicit function of the label)."
      },
      {
        "type": "intuition",
        "front": "Two stacked recall ceilings",
        "back": "The retrieval MODEL's recall, and under it the ANN INDEX's approximate recall (HNSW ef, IVF nprobe — a default silently sets a system ceiling). Measure index recall against exact search on a sample; it takes minutes."
      },
      {
        "type": "intuition",
        "front": "Which funnel stage sees the SET?",
        "back": "Only re-ranking. Diversity, cross-creator dedupe and exposure fairness are properties of the LIST, not of an item — pointwise ranking is structurally blind to them."
      },
      {
        "type": "intuition",
        "front": "Two-tower cold start",
        "back": "Better than MF (content features give a new item an embedding immediately) but not solved: the content mapping was LEARNED from items with history, so it's a prior, not evidence — and the ranker still prefers proven items."
      },
      {
        "type": "pitfall",
        "front": "ID embeddings atrophy the content pathway",
        "back": "If an item ID embedding is available the model leans on it, so cold-start performance degrades exactly as warm-start improves. Fix: ID dropout in training + an explicit masked-ID evaluation slice, or the regression is invisible."
      },
      {
        "type": "pitfall",
        "front": "When NOT to use two-tower",
        "back": "Small catalogue (score it all — you're paying for an index you don't need) · fine-grained term matching (dense smooths away rare exact matches — hence hybrid) · tiny candidate set with rich context · eligibility rules already cut the corpus."
      },
      {
        "type": "intuition",
        "front": "★ The module's spine, stated here",
        "back": "Every exploitable regularity is also a leak surface, because the regularity is a DEPENDENCY between rows and validation assumes independence. The unit of splitting is a modelling decision — match it to the unit of generalization you care about."
      }
    ],
    "refs": [
      {
        "title": "Yi et al. (2019), Sampling-Bias-Corrected Neural Modeling for Large Corpus Item Recommendations",
        "url": "https://dl.acm.org/doi/10.1145/3298689.3346996"
      },
      {
        "title": "Covington, Adams & Sargin (2016), Deep Neural Networks for YouTube Recommendations",
        "url": "https://research.google/pubs/pub45530/"
      },
      {
        "title": "Kapoor & Narayanan (2023), Leakage and the Reproducibility Crisis in Machine-Learning-Based Science",
        "url": "https://www.cell.com/patterns/fulltext/S2666-3899(23)00159-9"
      },
      {
        "title": "Rendle et al. (2020), Neural Collaborative Filtering vs. Matrix Factorization Revisited",
        "url": "https://arxiv.org/abs/2005.09683"
      },
      {
        "title": "Malkov & Yashunin (2018), Efficient and Robust Approximate Nearest Neighbor Search Using HNSW",
        "url": "https://arxiv.org/abs/1603.09320"
      }
    ],
    "demos": [
      "embeddings",
      "vector-search",
      "knn",
      "roc"
    ]
  },
  "time-series": {
    "level": "core",
    "body": {
      "intuition": [
        "Forecasting is the domain where the structure is most obvious and most often violated. Time gives you ordering, seasonality and autocorrelation to exploit; it also means rows are not exchangeable, so every default in the standard toolkit - random k-fold, fitting a scaler on the full series, a centred rolling window - is wrong in a way that produces a better number.",
        "The first thing to establish is the baseline, because forecasting is the field with the most published models that do not beat last-value. On a trend-plus-seasonal series, a lag model scored RMSE 0.2148 on an honest forward split against 0.3115 for predicting the previous value - a genuine 31% improvement. Quote both numbers or the first one means nothing.",
        "And the leak is subtler than the split. On a pure random walk, random k-fold and forward chaining agreed almost exactly, 0.9994 against 0.9972, because a leak needs a FEATURE that carries information across the boundary. Add one centred rolling mean - a window spanning the future rather than trailing - and forward chaining reports 1.4930 against a naive 0.9961, revealing a feature that makes the model 50% WORSE out of sample while the random split says it is harmless."
      ],
      "math": [
        {
          "h": "The baselines that must be beaten",
          "paras": [
            "Each is one line and each is genuinely hard to beat on the series it suits. A forecasting result without one of these alongside it is not a result.",
            "The seasonal naive baseline in particular is the one that eliminates most published gains on seasonal data."
          ],
          "tex": "\\hat{y}_{t+1}=y_t \\ \\text{(naive)}, \\qquad \\hat{y}_{t+h}=y_{t+h-m} \\ \\text{(seasonal naive, period } m), \\qquad \\hat{y}_{t+1}=\\bar{y} \\ \\text{(mean)}",
          "texNote": "Measured on a trend-plus-seasonal series: naive last-value RMSE 0.3115, and a lag-feature ridge model 0.2148 on a forward split - a 31.1% improvement, which is a real result precisely because the baseline is stated."
        },
        {
          "h": "★ The split gap, and why it is sometimes zero",
          "paras": [
            "Random k-fold is optimistic when a feature spans the boundary and honest when nothing does. The gap is a property of the FEATURES, not of the split alone, which is why 'I used a temporal split' is necessary and not sufficient.",
            "Pure random walk, lag features only, nothing crossing the boundary."
          ],
          "tex": "\\text{random walk, lags only}: \\ \\text{k-fold } 0.9994 \\ \\text{vs forward } 0.9972 \\ \\text{vs naive } 0.9961 \\quad \\text{(no gap)}",
          "texNote": "A useful negative result: the leak is not automatic. It requires a feature computed from information the model will not have at prediction time, and lag features by construction do not qualify."
        },
        {
          "h": "★ One centred window is enough",
          "paras": [
            "A rolling mean with a centred window uses values from after the timestamp. It is a one-character difference in most APIs and it inverts the conclusion."
          ],
          "tex": "\\text{+ centred rolling mean}: \\ \\text{k-fold } 0.9947 \\ (\\approx \\text{naive}) \\quad \\text{vs} \\quad \\text{forward } \\mathbf{1.4930} \\ (\\mathbf{50\\%\\ worse\\ than\\ naive})",
          "texNote": "Note the direction: the random split does not manufacture a gain here, it HIDES a harm. The feature is actively damaging out of sample and only the honest split shows it, which is the more dangerous version of the failure."
        }
      ],
      "code": [
        {
          "h": "The validation scheme, and the two things it must respect",
          "paras": [
            "Forward chaining, plus a gap when the forecast horizon exceeds one step."
          ],
          "code": "# FORWARD CHAINING (expanding or rolling origin)\n#   train [0:t)          test [t:t+h)\n#   train [0:t+h)        test [t+h:t+2h)   ...\n#   report the mean and SPREAD across folds - a single fold is one sample\n\n# ★ THE GAP nobody inserts: if you forecast h steps ahead, the last h\n#   training points overlap the test window's information horizon. Leave\n#   an h-step gap between train and test, or you are training on data\n#   that would not exist when the forecast is made.\n\n# ALSO WRONG BY DEFAULT\n#   * fitting a scaler / imputer on the full series      -> refit per fold\n#   * a CENTRED rolling window                           -> use trailing\n#   * interpolating missing values across the split      -> forward-fill only\n#   * de-seasonalizing with parameters from all the data -> estimate on train\n\n# Each is a one-line default that spans the boundary.",
          "caption": "Every item is a library default that is correct for cross-sectional data and wrong here, which is why the domain needs its own checklist rather than general care."
        },
        {
          "h": "What to reach for, in order",
          "paras": [
            "The honest ordering by return on effort, which is close to the reverse of the order these get attention."
          ],
          "code": "# 1 BASELINES              naive, seasonal naive, mean. Free, and they end\n#                          a surprising number of projects.\n# 2 CLASSICAL              ETS / ARIMA / Theta. Strong on short univariate\n#                          series, well-calibrated intervals, few knobs.\n# 3 GBDT ON LAG FEATURES   the workhorse for many related series. Handles\n#                          covariates and calendar effects naturally.\n#                          ★ lags, rolling stats (TRAILING), calendar,\n#                            holiday flags, and the series ID itself\n# 4 GLOBAL NEURAL MODELS   one model across many series - N-BEATS, DeepAR,\n#                          temporal fusion. Wins when series are numerous\n#                          and individually short, which is the common case.\n\n# ★ The M-competitions' repeated finding: simple statistical methods and\n#   ENSEMBLES of them are extremely hard to beat, and the winning entries\n#   are usually combinations rather than a single clever model.",
          "caption": "The ordering matters because effort spent on step 4 before step 1 is how a forecasting project produces a model that loses to last-value."
        }
      ],
      "useCases": [
        "Demand, capacity and traffic forecasting, where the decision is a quantity to provision and the loss is asymmetric between over and under.",
        "Anomaly detection built on a forecast residual, where the forecast defines what normal looks like and the residual defines the alarm.",
        "Any panel of related series - stores, SKUs, regions, users - where a global model across series beats per-series fitting because each series is short.",
        "Capacity planning against a quantile rather than a mean, which is what most operational forecasts are actually for."
      ],
      "pitfalls": [
        "Reporting a forecast metric with no baseline. A lag model at RMSE 0.2148 is only a result next to the naive 0.3115 it beat by 31.1%.",
        "Random k-fold on a time series. It is optimistic whenever any feature spans the boundary, and the gap is a property of the features rather than of the split alone.",
        "A centred rolling window. One character in most APIs, and it took forward-chained RMSE to 1.4930 against a naive 0.9961 - a feature that actively harms, hidden entirely by the random split.",
        "Fitting scalers, imputers or de-seasonalizing parameters on the full series. Each is an aggregate spanning the split, which is the same leak as any other pre-split statistic.",
        "Omitting the gap between train and test when forecasting h steps ahead. The last h training points carry information the forecast would not have.",
        "Reporting a single fold. Forward chaining gives several origins, and the spread across them is the number that says whether the improvement is real.",
        "Optimizing the mean when the decision needs a quantile. Provisioning to a mean forecast is wrong whenever the cost of under- and over-provisioning differ, which is nearly always."
      ],
      "connections": [
        {
          "ref": "ml-theory/cross-validation",
          "text": "The general scheme this specializes, and the reason the unit of splitting has to match the unit of generalization."
        },
        {
          "ref": "causal-inference/time-series-causality",
          "text": "The causal counterpart - Granger's predictive precedence is not causation, and a common driver at staggered lags manufactures the pattern."
        },
        {
          "ref": "unsupervised-learning/anomaly-detection",
          "text": "The most common downstream use, where the forecast defines normal and the residual defines the alarm."
        },
        {
          "ref": "trustworthy-ai/conformal-prediction",
          "text": "Distribution-free prediction intervals for forecasts, and the exchangeability caveat that time series violate by construction."
        },
        {
          "ref": "ml-applications/multi-task",
          "text": "Global models across a panel of series, which is multi-task learning with the series as the task."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Name the baselines a forecast must beat.",
          "a": "Naive (ŷ = y_t), seasonal naive (ŷ = y_{t+h−m}), and the mean. A forecasting metric without one alongside it is not a result."
        },
        {
          "q": "Give the measured improvement.",
          "a": "Trend-plus-seasonal series: lag-feature ridge RMSE **0.2148** on a forward split against a naive **0.3115** — a genuine 31.1% gain, meaningful because the baseline is stated."
        },
        {
          "q": "Why not random k-fold?",
          "a": "Rows are not exchangeable. It lets future values train a model evaluated on the past — information the forecast will never have."
        },
        {
          "q": "★ When is the k-fold gap zero?",
          "a": "When no feature spans the boundary. On a random walk with lag features only: k-fold 0.9994 vs forward 0.9972 vs naive 0.9961 — no gap. The leak needs a FEATURE, not just a split."
        },
        {
          "q": "★ What does one centred rolling window do?",
          "a": "k-fold 0.9947 (≈ naive) but forward chaining **1.4930** — 50% WORSE than naive. The random split HIDES a harm rather than manufacturing a gain."
        },
        {
          "q": "Name four defaults that are wrong here.",
          "a": "Fitting a scaler/imputer on the full series · centred rolling windows · interpolating across the split · de-seasonalizing with parameters from all the data."
        },
        {
          "q": "What is forward chaining?",
          "a": "Train [0:t), test [t:t+h); then train [0:t+h), test [t+h:t+2h); expanding or rolling origin. Report the mean AND spread across folds."
        },
        {
          "q": "Why insert a gap between train and test?",
          "a": "If you forecast h steps ahead, the last h training points carry information the forecast wouldn't have. Leave an h-step gap."
        },
        {
          "q": "What's the M-competition finding?",
          "a": "Simple statistical methods and ENSEMBLES of them are extremely hard to beat, and winning entries are usually combinations rather than one clever model."
        },
        {
          "q": "When does a global neural model win?",
          "a": "Many related series that are individually short — the common case. One model across the panel beats per-series fitting."
        },
        {
          "q": "Mean or quantile?",
          "a": "Quantile, whenever the costs of over- and under-provisioning differ — which is nearly always for operational forecasts."
        },
        {
          "q": "Why report several folds?",
          "a": "A single origin is one sample. The spread across forward-chained folds is what says whether the improvement is real."
        }
      ],
      "standard": [
        {
          "q": "How do you validate a forecasting model?",
          "a": "FORWARD CHAINING, WITH A GAP, REPORTED ACROSS SEVERAL ORIGINS. Train on [0, t), test on [t, t+h); then expand or roll the origin and repeat. THE GAP IS THE PART PEOPLE OMIT: if the forecast horizon is h steps, the last h training points carry information that would not exist at the moment the forecast is made, so train and test need an h-step separation. And a single fold is a single sample — the spread across origins is what tells you whether an improvement is real, and forecasting metrics are noisy enough that a one-fold comparison routinely reverses. THE DEEPER POINT IS THAT THE SPLIT ALONE IS NOT THE PROTECTION. I measured a random walk with lag features only, and random k-fold and forward chaining agreed almost exactly — 0.9994 against 0.9972, with naive at 0.9961. No gap at all, because a leak requires a FEATURE that carries information across the boundary and lag features by construction do not. THEN ADDING ONE CENTRED ROLLING MEAN, a window spanning the future rather than trailing, forward chaining reported 1.4930 against the naive 0.9961 — the feature makes the model 50% worse out of sample, and the random split reported it as harmless at 0.9947.",
          "deepDive": "That direction is worth dwelling on because it is the more dangerous version of leakage. The familiar story is that a leak manufactures a gain you cannot reproduce; here the random split HID a harm. A feature that is actively damaging out of sample looked neutral, so a practitioner using k-fold would have kept it and shipped a model worse than last-value. The general lesson is that the random split does not systematically inflate — it makes the estimate uninformative, and which direction the error goes depends on the feature. The checklist that follows is mechanical: every transformation with a window must be trailing; every fitted parameter — scaler, imputer, de-seasonalizer, target encoder — must be estimated inside the training fold and applied to the test fold, not fitted once on the series; and interpolation of missing values must be forward-fill rather than any method that looks ahead. Each is a one-line default that is correct for cross-sectional data and wrong here, which is why time series need their own checklist rather than general carefulness."
        },
        {
          "q": "What would you try first on a new forecasting problem?",
          "a": "BASELINES, AND I WOULD NOT SKIP THEM EVEN UNDER TIME PRESSURE, because forecasting is the field with the largest gap between published gains and gains over last-value. Naive, seasonal naive at the dominant period, and the mean — three lines, and they end a surprising number of projects by revealing that the series is close to a random walk and nothing will beat persistence. THEN CLASSICAL METHODS: ETS, ARIMA or Theta, which are strong on short univariate series, produce well-calibrated intervals, and have few knobs to overfit. THEN GBDT ON LAG FEATURES, which is the workhorse when there are covariates, calendar effects and many related series — lags, TRAILING rolling statistics, calendar and holiday flags, and the series identifier itself, which lets one model specialize across a panel. THEN GLOBAL NEURAL MODELS such as N-BEATS, DeepAR or temporal fusion transformers, which win when series are numerous and individually short, since each series alone has too little data and the panel together has plenty. THE ORDERING MATTERS because effort spent at step four before step one is exactly how a project produces a model that loses to last-value with a good-looking validation number.",
          "deepDive": "The M-competitions are the empirical backbone of that ordering and worth citing accurately: across M3, M4 and M5 the repeated finding is that simple statistical methods are extremely hard to beat, that ENSEMBLES of simple methods beat individual sophisticated ones, and that the winning entries have generally been combinations. M4's winner was a hybrid of exponential smoothing and a recurrent network, and M5 was dominated by gradient-boosted trees on engineered features. That is not an argument against neural forecasting — it is an argument for the ordering, since the neural methods win in a specific regime (many short related series with covariates) and lose outside it. The practical consequence is to establish where you are before choosing: count the series, count the observations per series, and check whether there are exogenous covariates worth conditioning on. Those three numbers determine the method more reliably than any benchmark leaderboard, which is the same 'do the arithmetic first' discipline as the design lessons."
        },
        {
          "q": "Your forecast has good RMSE but operations complain. What is likely wrong?",
          "a": "YOU OPTIMIZED THE MEAN AND THEY NEED A QUANTILE. Almost every operational forecast feeds a provisioning decision — inventory, staffing, capacity, budget — where the cost of under-forecasting differs from the cost of over-forecasting, often by a large factor. Minimizing squared error targets the conditional mean, and the optimal provisioning level is the quantile at C_under/(C_under + C_over), which for a 5-to-1 cost asymmetry is the 83rd percentile rather than the 50th. So a model with excellent RMSE can stock out constantly and be exactly as designed. THE FIX IS PINBALL LOSS at the required quantile, or a distributional forecast from which any quantile can be read — and that reframes the deliverable from a number to a distribution, which is usually what the downstream system wanted anyway. THE SECOND COMMON COMPLAINT is that the metric is aggregate and the pain is concentrated: RMSE over a thousand SKUs is dominated by the high-volume ones, while the operational damage lives in the intermittent ones where the series is mostly zeros and RMSE is nearly meaningless. Slice by volume band, and use a metric appropriate for intermittent demand rather than one that is dominated by scale.",
          "deepDive": "The metric choice deserves more attention than it usually gets because the standard ones misbehave in specific, known ways. MAPE is undefined at zero and asymmetric — it penalizes over-forecasting more than under-forecasting — which silently biases models toward under-forecasting on exactly the intermittent series where that hurts most. sMAPE fixes the asymmetry partially and remains unstable near zero. MASE, scaling error by the in-sample naive error, is scale-free and well-behaved and is the M-competition default for good reason. For intermittent demand, aggregate error over a period is more meaningful than per-period error. The general habit is the one from the trustworthy-AI module: state what the metric is an average over and check whether that population matches the decision, because a forecast metric aggregated over a heterogeneous panel is a weighted average dominated by the largest series, and the operational failures are usually elsewhere."
        },
        {
          "q": "How do you produce prediction intervals you can trust?",
          "a": "THREE OPTIONS WITH DIFFERENT ASSUMPTIONS, AND ALL OF THEM NEED CHECKING AGAINST REALIZED COVERAGE. CLASSICAL MODELS give analytic intervals from their error model — ETS and ARIMA both do — and those intervals are well-calibrated when the model's assumptions hold and systematically too narrow when they do not, because they account for parameter and innovation uncertainty but not for model misspecification. QUANTILE REGRESSION targets the quantiles directly with pinball loss, which makes no distributional assumption and gives you exactly the levels you asked for, at the cost of fitting one model per quantile or a model with a quantile output head. CONFORMAL METHODS give a distribution-free coverage guarantee, and this is where the module's caveat bites hardest: conformal assumes exchangeability, and a time series violates it by construction. The adaptations — blocked or weighted conformal, and adaptive conformal that updates the level from observed miscoverage — restore something usable and are not free. WHATEVER YOU USE, MEASURE REALIZED COVERAGE on forward-chained folds: if your 90% intervals cover 72% of the time, that is the number that matters and no derivation overrides it.",
          "deepDive": "The coverage check is worth automating because interval calibration decays faster than point accuracy and is invisible in RMSE. In practice the most common failure is intervals that are far too narrow at long horizons, because uncertainty compounds with the horizon and many implementations propagate it incorrectly or not at all — so the h=1 interval is fine and the h=12 interval is fiction. Reporting coverage BY HORIZON rather than pooled is the diagnostic, and it is one groupby. The second common failure is that intervals are conditioned on the model being right about the regime, so they widen appropriately for noise and not at all for a structural break — which is the distribution-shift problem from module 24, and the honest response is the same: no unlabelled statistic anticipates a regime change, so you monitor realized coverage continuously and treat a sustained drop as the alarm rather than trying to predict the break."
        },
        {
          "q": "When is a time series problem not a forecasting problem?",
          "a": "MORE OFTEN THAN THE FRAMING SUGGESTS, AND MISCLASSIFYING IT IS EXPENSIVE. If the question is 'what will happen', it is forecasting. If the question is 'what happens if we DO something' — change a price, run a campaign, add capacity — that is a causal question, and a forecasting model answers it only under an assumption it cannot check. Module 23's material applies directly: Granger causality reported F = 2119.66 with p = 1.1e-16 between two series with NO causal arrow between them, because a hidden common driver at staggered lags manufactures predictive precedence. So a model that forecasts well is not evidence about an intervention. IF THE QUESTION IS 'IS THIS NORMAL', that is anomaly detection, and a forecast is a component rather than the answer — the residual defines the alarm and the threshold comes from a cost ratio, not from a round number of standard deviations. IF THE QUESTION IS 'WHAT DROVE THIS CHANGE', that is decomposition or attribution, and the honest tools are difference-in-differences or synthetic control with their untestable assumptions stated. THE HABIT IS TO ASK WHAT DECISION THE NUMBER FEEDS before choosing the model, because all four questions look identical when the input is a series.",
          "deepDive": "The intervention case is the one that causes real damage because it is so easy to answer badly with a good model. A demand forecast trained on historical data where price moved for business reasons will happily report the association between price and demand, and using it to choose a price is exactly the confounded-observational-estimate problem — the historical price changes were not random, so the elasticity it implies is a mixture of the causal effect and whatever drove the pricing decisions. The correct instruments are a randomized price test, a staggered rollout with a synthetic control, or an explicit causal model with the assumption stated. Saying that in an applied setting is often unwelcome and is the difference between a forecast that informs a decision and one that launders a correlation into a policy. The tell to watch for is a stakeholder asking a forecasting model a 'what if' question, which happens constantly and is usually answered without anyone noticing the frame changed."
        },
        {
          "q": "How does this lesson instantiate the module's theme?",
          "a": "TIME IS THE CLEAREST CASE OF THE STRUCTURE BEING BOTH THE PRIOR AND THE TRAP. Ordering, autocorrelation and seasonality are exactly what makes a series forecastable — without them the best you can do is the mean — and they are exactly what makes rows non-exchangeable, so every validation default built for cross-sectional data is wrong here. The same property you exploit is the property that breaks the evaluation. WHAT THIS LESSON ADDS TO THE MODULE'S SPINE is that the split is only half the surface. On a random walk with lag features, random k-fold and forward chaining agreed to within 0.002, because nothing crossed the boundary; add one centred rolling window and forward chaining revealed a feature 50% worse than naive that k-fold called harmless. SO THE QUESTION IS NOT 'DID I SPLIT CORRECTLY' BUT 'DOES ANY FEATURE, TRANSFORMATION OR FITTED PARAMETER CROSS THE BOUNDARY', and the answer is a checklist rather than a single decision. That generalizes to every remaining domain in the module — the boundary is different, and the question is identical.",
          "deepDive": "It is worth stating the general form once, since the remaining lessons will each instantiate it. Validation estimates generalization by holding out data that stands in for the future or for unseen units, and that estimate is valid only if the held-out data is genuinely independent of the training data in the way deployment will be. Every domain has a dependency structure — time here, edges in graphs, speakers in audio, patients in medical data, queries in search, users in recommenders — and the dependency has TWO channels: the split, which decides which rows are held out, and the FEATURES, which decide what information those rows carry. Practitioners attend to the first and forget the second, which is why leakage survives correct splits so reliably. The one-sentence habit worth carrying: name the unit of generalization, split on it, and then check that no computed quantity was estimated across the boundary — and state both next to the metric, because a number without them does not have a defined meaning."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "The baselines a forecast must beat",
        "back": "Naive (ŷ=y_t), seasonal naive (ŷ=y_{t+h−m}), mean. Three lines, and they end a surprising number of projects. Measured: lag ridge **0.2148** vs naive **0.3115** = a real 31.1% gain."
      },
      {
        "type": "formula",
        "front": "★ When is the k-fold gap ZERO?",
        "back": "When no feature spans the boundary. Random walk, lag features only: k-fold 0.9994 vs forward 0.9972 vs naive 0.9961. **The leak needs a FEATURE, not just a split.**"
      },
      {
        "type": "pitfall",
        "front": "★ One centred rolling window",
        "back": "k-fold 0.9947 (≈ naive) but forward chaining **1.4930** — 50% WORSE than naive. The random split HID a harm rather than manufacturing a gain, which is the more dangerous direction."
      },
      {
        "type": "definition",
        "front": "Forward chaining, with the gap",
        "back": "Train [0:t) → test [t:t+h); expand or roll the origin. **Leave an h-step GAP** — the last h training points carry information the forecast wouldn't have. Report mean AND spread across origins."
      },
      {
        "type": "pitfall",
        "front": "Four defaults that are wrong on a series",
        "back": "Fitting a scaler/imputer on the FULL series · CENTRED rolling windows · interpolating across the split · de-seasonalizing with parameters from all the data. Each is correct for cross-sectional data."
      },
      {
        "type": "intuition",
        "front": "What to try, in order",
        "back": "Baselines → classical (ETS/ARIMA/Theta: strong on short univariate, calibrated intervals) → GBDT on TRAILING lag features → global neural (many short related series). Effort at step 4 before step 1 is how you lose to last-value."
      },
      {
        "type": "intuition",
        "front": "The M-competition finding",
        "back": "Simple statistical methods and ENSEMBLES of them are extremely hard to beat; winners are usually combinations. M4 = ETS+RNN hybrid; M5 = gradient-boosted trees on engineered features."
      },
      {
        "type": "formula",
        "front": "★ Good RMSE, operations complain",
        "back": "You optimized the MEAN and they need a QUANTILE. Optimal provisioning is at C_under/(C_under+C_over) — a 5:1 asymmetry means the **83rd percentile**, not the 50th. Fix with pinball loss or a distributional forecast."
      },
      {
        "type": "pitfall",
        "front": "Forecast metric pathologies",
        "back": "MAPE: undefined at zero and ASYMMETRIC (penalizes over-forecasting more → biases toward under-forecasting on intermittent series). sMAPE: unstable near zero. **MASE** is scale-free and well-behaved — the M-competition default."
      },
      {
        "type": "pitfall",
        "front": "Interval calibration decays invisibly",
        "back": "Intervals are usually far too narrow at LONG horizons — uncertainty compounds and implementations propagate it badly. Report realized coverage BY HORIZON, not pooled. If your 90% intervals cover 72%, that's the number."
      },
      {
        "type": "intuition",
        "front": "When it isn't a forecasting problem",
        "back": "\"What WILL happen\" = forecast. \"What if we DO x\" = causal (Granger gave F=2119, p=1e−16 with NO arrow). \"Is this normal\" = anomaly detection. \"What drove this\" = attribution. All four look identical when the input is a series."
      },
      {
        "type": "intuition",
        "front": "★ The module's spine, generalized",
        "back": "Dependency has TWO channels: the SPLIT (which rows are held out) and the FEATURES (what information those rows carry). People attend to the first and forget the second — which is why leakage survives correct splits so reliably."
      }
    ],
    "refs": [
      {
        "title": "Hyndman & Athanasopoulos, Forecasting: Principles and Practice (3rd ed.)",
        "url": "https://otexts.com/fpp3/"
      },
      {
        "title": "Makridakis, Spiliotis & Assimakopoulos (2020), The M4 Competition: 100,000 Time Series and 61 Forecasting Methods",
        "url": "https://www.sciencedirect.com/science/article/pii/S0169207019301128"
      },
      {
        "title": "Bergmeir & Benitez (2012), On the Use of Cross-Validation for Time Series Predictor Evaluation",
        "url": "https://www.sciencedirect.com/science/article/abs/pii/S0020025511006773"
      },
      {
        "title": "Salinas, Flunkert, Gasthaus & Januschowski (2020), DeepAR: Probabilistic Forecasting with Autoregressive Recurrent Networks",
        "url": "https://www.sciencedirect.com/science/article/pii/S0169207019301888"
      },
      {
        "title": "Hyndman & Koehler (2006), Another Look at Measures of Forecast Accuracy (MASE)",
        "url": "https://www.sciencedirect.com/science/article/abs/pii/S0169207006000239"
      }
    ],
    "demos": [
      "forecasting",
      "kalman-filter",
      "dtw",
      "aliasing"
    ]
  },
  "search-ranking": {
    "level": "core",
    "body": {
      "intuition": [
        "Ranking is not classification with a sort. The loss must know that the items in a query's result list compete with each other, that a mistake at rank 1 costs far more than the same mistake at rank 20, and that the comparison is meaningful only WITHIN a query. Get any of those wrong and you have built a pointwise classifier that happens to output a number.",
        "That within-query structure is also this module's trap, and it is the sharpest version in the module. The unit of generalization is the QUERY, so a random row split puts documents from the same query in both train and test - and a model can then learn the query's answer rather than how to rank. The grouped-split experiment measured the general form of this: AUC 0.9999 on a random row split against 0.5807 on a group split, an optimism of +0.4192 from the same data, same model, same features.",
        "The retrieval half has its own structural fact worth stating plainly: lexical and dense retrieval fail on DISJOINT query types - lexical on synonyms and paraphrase, dense on rare exact terms, product IDs, model numbers and typos. So the answer is the union rather than a choice, and a team tuning one of them alone is optimizing a component whose failures the other one covers for free."
      ],
      "math": [
        {
          "h": "The three loss families, and what each knows",
          "paras": [
            "Pointwise treats each document independently and knows nothing about competition. Pairwise learns from preferences within a query. Listwise optimizes a metric over the whole list.",
            "The move from pointwise to pairwise is where most of the gain is; the move to listwise is smaller and buys the ability to express position weighting directly."
          ],
          "tex": "\\text{pointwise } \\ell(f(x_i),y_i) \\quad\\to\\quad \\text{pairwise } \\ell\\big(f(x_i)-f(x_j)\\big)\\ \\text{for } y_i>y_j,\\ \\text{same query} \\quad\\to\\quad \\text{listwise } \\ell(\\text{NDCG})",
          "texNote": "LambdaRank's insight is that you do not need the metric's gradient - you need a weight on each pair equal to the metric change from swapping them, which turns an unrankable objective into a usable one. LambdaMART is that idea inside GBDT and remains a very strong baseline."
        },
        {
          "h": "NDCG, and the discount that encodes the whole problem",
          "paras": [
            "The logarithmic discount is what makes rank 1 matter more than rank 20, and the per-query normalization is what makes queries with different numbers of relevant documents comparable.",
            "Both are the structure, written into the metric."
          ],
          "tex": "\\mathrm{DCG@}k=\\sum_{i=1}^{k}\\frac{2^{\\mathrm{rel}_i}-1}{\\log_2(i+1)}, \\qquad \\mathrm{NDCG@}k=\\frac{\\mathrm{DCG@}k}{\\mathrm{IDCG@}k}",
          "texNote": "Normalizing per query is essential: without it, queries with many relevant documents dominate the average and the metric measures query mix rather than ranking quality. That is the same aggregation failure this curriculum keeps finding."
        },
        {
          "h": "★ The unit of generalization is the query",
          "paras": [
            "A random row split puts documents from the same query on both sides, which lets the model memorize per-query answers rather than learn to rank. The general form, measured on grouped data with a per-group signature:"
          ],
          "tex": "\\text{random ROW split: AUC } \\mathbf{0.9999} \\qquad \\text{GROUP split: AUC } \\mathbf{0.5807} \\qquad \\text{optimism } +0.4192",
          "texNote": "Same data, same model, same features. A group signature that appears in both train and test is a free lookup table for any label that is a property of the group - and for search, relevance is largely a property of the query."
        }
      ],
      "code": [
        {
          "h": "Hybrid retrieval, and why it is a union",
          "paras": [
            "The two methods fail on different query types, so tuning either alone leaves the other's failure class untouched."
          ],
          "code": "# LEXICAL (BM25)          strong: rare exact terms, IDs, model numbers,\n#                         typos-as-typed, negation-free keyword queries\n#                         weak:   synonyms, paraphrase, cross-lingual\n# DENSE (two-tower)       strong: synonyms, paraphrase, intent\n#                         weak:   rare exact tokens the encoder smooths away,\n#                                 out-of-domain vocabulary, long-tail entities\n\n# FUSION - reciprocal rank fusion needs no score calibration:\n#   RRF(d) = sum over retrievers of  1 / (k + rank_r(d))     (k ~ 60)\n# ★ score-based fusion requires the two scores to be on a comparable scale,\n#   which they are not, so RANK-based fusion is the robust default.\n\n# THE FUNNEL\n#   lexical U dense  ->  ~1000  ->  filter  ->  LambdaMART  ->  ~50\n#   ->  cross-encoder re-rank  ->  10\n#   (115 ms of budget scores ~128 cross-encoder items - the funnel is forced)",
          "caption": "RRF is the unglamorous right answer for fusion: no calibration, no tuning beyond one constant, and it is hard to beat with a learned combiner."
        },
        {
          "h": "The labels, and the one that is worth more than the rest",
          "paras": [
            "Search has a better cheap label than any other domain in this module, and it is a session-level one."
          ],
          "code": "# HUMAN JUDGEMENTS   expensive, unbiased, low-volume. The only ground truth,\n#                    and the thing to spend a labelling budget on.\n# CLICKS             free, high-volume, POSITION-BIASED (rank 1 vs rank 10\n#                    gave 0.4991 vs 0.0989 on IDENTICAL true relevance)\n# LONG DWELL         closer to satisfaction, still impression-level\n# ★ NO REFORMULATION the user did not have to ask again. SESSION-level,\n#                    aligns with the goal far better than a click, and free.\n# ABANDONMENT        the negative signal, and the one most systems ignore\n\n# ★ Train on debiased clicks (IPS on the examination propensity), VALIDATE\n#   on human judgements, and MONITOR reformulation and abandonment - three\n#   different labels for three different jobs.",
          "caption": "Using one label for training, validation and monitoring is the most common structural mistake in a search stack, because no single label is good at all three."
        }
      ],
      "useCases": [
        "Any query-driven retrieval surface - web, site, enterprise, code, product search - where relevance is defined relative to an expressed intent.",
        "The retrieval stage of a RAG system, which is search with a generation step attached and inherits every ranking problem in this lesson.",
        "Marketplace and job matching, where the query is structured but the ranking machinery, losses and metrics are identical.",
        "Evaluating any retriever, since NDCG with per-query normalization and a query-level split is the correct frame regardless of what is being retrieved."
      ],
      "pitfalls": [
        "Splitting by row rather than by query. The general form measured +0.4192 of optimism - AUC 0.9999 against 0.5807 - from a group signature appearing on both sides.",
        "Using a pointwise loss. It cannot express that documents compete within a query, which is the entire structure of the problem.",
        "Averaging DCG without per-query normalization. Queries with many relevant documents then dominate, and the metric measures query mix rather than ranking quality.",
        "Choosing dense over lexical rather than alongside it. They fail on disjoint query types, so the union is the design and tuning one alone leaves the other's failures untouched.",
        "Fusing by score rather than by rank. The two retrievers' scores are not on a comparable scale, and reciprocal rank fusion needs no calibration.",
        "Training on raw clicks. Rank 1 versus rank 10 gave 0.4991 against 0.0989 on identical true relevance, so the model learns the incumbent's placement.",
        "Using one label for training, validation and monitoring. Clicks are for training after debiasing, human judgements for validation, and reformulation and abandonment for monitoring."
      ],
      "connections": [
        {
          "ref": "ml-applications/neural-recommenders",
          "text": "The same funnel and the same two-tower retrieval, with a query replacing the user - and the same as-of feature discipline."
        },
        {
          "ref": "rag-agents/chunking-retrieval",
          "text": "Hybrid retrieval in the RAG setting, where the same lexical-plus-dense union argument decides the design."
        },
        {
          "ref": "interview-capstone/design-search-ads",
          "text": "The design-round version, including why the ads side needs calibration conditional on the ad while the organic side needs only an ordering."
        },
        {
          "ref": "supervised-learning/boosting",
          "text": "LambdaMART's engine, and why gradient boosting remains the strong baseline for ranking over tabular relevance features."
        },
        {
          "ref": "ml-theory/evaluation-metrics",
          "text": "Why NDCG's discount and normalization are modelling choices rather than conventions, and what they encode about the decision."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Why is ranking not classification plus a sort?",
          "a": "The loss must know that documents compete WITHIN a query, that rank 1 costs more than rank 20, and that comparisons across queries are meaningless."
        },
        {
          "q": "Name the three loss families.",
          "a": "Pointwise ℓ(f(xᵢ), yᵢ) · pairwise ℓ(f(xᵢ)−f(x_j)) for yᵢ>y_j within a query · listwise, optimizing a metric like NDCG."
        },
        {
          "q": "What is LambdaRank's insight?",
          "a": "You don't need the metric's gradient — you need a per-pair weight equal to the metric change from swapping them. LambdaMART is that inside GBDT, and still a strong baseline."
        },
        {
          "q": "Write NDCG@k.",
          "a": "DCG@k = Σ (2^rel_i − 1)/log₂(i+1), normalized by IDCG@k. The log discount encodes position; the normalization makes queries comparable."
        },
        {
          "q": "Why normalize per query?",
          "a": "Without it, queries with many relevant documents dominate the average and the metric measures QUERY MIX rather than ranking quality."
        },
        {
          "q": "★ What is the unit of generalization?",
          "a": "The QUERY. A random row split puts a query's documents on both sides. Measured optimism on the general form: AUC **0.9999** (row split) vs **0.5807** (group split), +0.4192."
        },
        {
          "q": "Lexical or dense retrieval?",
          "a": "Both. They fail on DISJOINT query types — lexical on synonyms/paraphrase, dense on rare exact terms, IDs, model numbers, typos. The union is the design."
        },
        {
          "q": "How do you fuse two retrievers?",
          "a": "Reciprocal rank fusion: RRF(d) = Σ_r 1/(k + rank_r(d)), k ≈ 60. RANK-based, so it needs no score calibration — the scores aren't on a comparable scale."
        },
        {
          "q": "Give the position-bias numbers.",
          "a": "P(click) 0.4991 at rank 1 vs 0.0989 at rank 10 on IDENTICAL true relevance. Training on raw clicks teaches the incumbent's placement."
        },
        {
          "q": "★ Name search's best cheap label.",
          "a": "NO REFORMULATION — the user didn't have to ask again. Session-level, free, and far better aligned with the goal than an impression-level click."
        },
        {
          "q": "How many labels does a search stack need?",
          "a": "Three, for three jobs: debiased clicks to TRAIN, human judgements to VALIDATE, reformulation and abandonment to MONITOR."
        },
        {
          "q": "Where does the cross-encoder go?",
          "a": "The top ~50 — 115 ms of budget scores about 128 cross-encoder items, so the funnel position is forced by arithmetic."
        }
      ],
      "standard": [
        {
          "q": "How does learning to rank differ from classification?",
          "a": "THE LOSS HAS TO KNOW ABOUT THE QUERY, and three properties follow from that. First, documents within a query COMPETE — only their relative order matters, and an absolute score is meaningful only up to a within-query monotone transform. Second, POSITION IS WEIGHTED — an error at rank 1 costs far more than the same error at rank 20, which is why NDCG's discount is logarithmic rather than uniform. Third, COMPARISONS ACROSS QUERIES ARE MEANINGLESS, so both the loss and the metric normalize per query. THE THREE LOSS FAMILIES DIFFER IN HOW MUCH OF THAT THEY ENCODE. Pointwise treats each document independently and knows none of it — it is a classifier whose output you happen to sort. Pairwise learns from preferences between documents within the same query, which captures competition and is where most of the gain over pointwise lives. Listwise optimizes a list metric directly, and LambdaRank's contribution is the trick that makes that tractable: you do not need NDCG's gradient, you need a weight on each pair equal to the metric change from swapping them. LambdaMART puts that inside gradient boosting and remains a very strong baseline on tabular relevance features — frequently still the thing to beat.",
          "deepDive": "The metric details are worth having because they are modelling choices presented as conventions. The gain 2^rel − 1 is exponential in the relevance grade, which makes the difference between 'perfect' and 'good' much larger than between 'good' and 'fair' — a deliberate encoding of the belief that top-grade results matter disproportionately, and one you should check against your product. The log₂(i+1) discount is a smooth stand-in for an examination probability, and if you have a measured examination curve from your own logs you can use it instead, which makes the metric match your interface rather than a 2002 convention. Per-query normalization by IDCG is the part with the sharpest consequences: without it, a query with fifty relevant documents contributes fifty times the DCG of one with a single relevant document, so the average becomes a statistic about your query mix. That is the same aggregation failure the trustworthy-AI module kept surfacing, and it means an unnormalized ranking metric can improve because your traffic shifted rather than because your ranker did."
        },
        {
          "q": "How would you split data to evaluate a ranker?",
          "a": "BY QUERY, ALWAYS, AND BY TIME AS WELL IF THE CORPUS OR INTENT DRIFTS. The unit of generalization is the query: you want to know how the ranker performs on queries it has not seen, so a query's documents must appear entirely in train or entirely in test. A random ROW split puts some of a query's documents on each side, and a model can then learn the answer for that query rather than how to rank in general — the query becomes an identifiable group and the group's relevance pattern becomes a lookup table. I MEASURED THE GENERAL FORM of this on grouped data with a per-group signature and a weak true signal: a random row split gave AUC 0.9999 and a group split gave 0.5807, an optimism of +0.4192 with the same data, the same model and the same features. That is not a subtle bias; it is the difference between a working model and a useless one. AND THE FEATURE SIDE STILL APPLIES: query-level aggregates — historical CTR for this query, average dwell for this query — must be computed inside the training window with as-of logic, or they carry test information across a correctly-drawn boundary, which is exactly the failure the recommender lesson measured.",
          "deepDive": "There is a second split axis that matters in production and is usually ignored: the DOCUMENT. If the corpus changes — new products, new pages, new listings — then the deployment question is partly about documents the model has not seen, and a split that holds queries out but shares documents across the boundary will overstate performance on new inventory. The clean version is a two-dimensional holdout: unseen queries against seen documents, seen queries against unseen documents, and unseen against unseen, reported separately. That is more work and it answers three different deployment questions, which is usually what a stakeholder actually wants to know. It is also worth stating the head-tail issue: search traffic is extremely skewed, so a random query split is dominated by head queries and a model can improve on the aggregate while degrading the tail, which is where the unmet need usually lives. Stratifying the report by query frequency band is one groupby and it changes conclusions regularly."
        },
        {
          "q": "Lexical or dense retrieval, and why?",
          "a": "BOTH, AND THE REASON IS THAT THEY FAIL ON DISJOINT QUERY TYPES rather than that one is better on average. Lexical scoring such as BM25 is strong exactly where an exact token match carries the meaning — rare terms, product identifiers, model numbers, error codes, names — and weak on synonyms, paraphrase and intent. Dense two-tower retrieval is strong on precisely those and weak on rare exact tokens, which a fixed-dimensional embedding smooths away, plus out-of-domain vocabulary and long-tail entities the encoder never saw. Tuning either one alone therefore leaves the other's failure class completely untouched, which is why every serious stack runs the union. THE FUSION SHOULD BE RANK-BASED. Reciprocal rank fusion — sum over retrievers of 1/(k + rank), with k around 60 — needs no score calibration, and that matters because BM25 scores and dot-product similarities are on entirely incomparable scales, so a score-weighted combination requires a calibration step that is itself a modelling problem. RRF has one constant, no training, and is genuinely hard to beat with a learned combiner, which makes it the right default rather than a fallback.",
          "deepDive": "There is a third retrieval family worth knowing because it partly dissolves the dichotomy: learned sparse retrieval, such as SPLADE or doc2query-style expansion, which produces sparse term-weighted representations learned by a neural model. It keeps the exact-match strength and inverted-index efficiency of lexical retrieval while learning expansions that cover synonyms, so it captures some of the dense side's advantage without the dense side's blind spot on rare tokens. It is not a strict replacement — it still struggles on genuinely out-of-vocabulary entities — and it is the strongest single-retriever option in several benchmarks. The practical point for a design discussion is that 'lexical versus dense' is a 2020 framing and the current answer is a portfolio, chosen by measuring per-query-type recall on your own traffic rather than by citing a benchmark. That measurement — recall by query class, on your data — is the thing that actually decides the architecture, and it takes an afternoon."
        },
        {
          "q": "What labels would you use, and for what?",
          "a": "THREE LABELS FOR THREE JOBS, AND USING ONE FOR ALL THREE IS THE MOST COMMON STRUCTURAL MISTAKE IN A SEARCH STACK. TO TRAIN: clicks, because they are free and high-volume, but DEBIASED, because raw clicks measure placement at least as much as preference — measured, rank 1 gave a click rate of 0.4991 against 0.0989 at rank 10 on identical true relevance. Inverse propensity weighting on the examination probability corrects it and requires the propensity, which is best obtained from a small randomized-ranking slice logged at serving time rather than estimated from a model. TO VALIDATE: human relevance judgements, because they are the only unbiased ground truth and because a validation signal drawn from the same biased distribution as training cannot detect the bias. They are expensive and low-volume, which is exactly the right shape for a validation set. TO MONITOR: reformulation and abandonment, which are session-level, free, high-volume and align with the user's goal far better than any impression-level signal — a user who did not have to ask again is the cheapest good outcome measure search has. AND ABANDONMENT is the negative signal most systems never instrument.",
          "deepDive": "The reformulation signal deserves emphasis because it is search's structural advantage over most ranking domains and it is under-used. It is session-level, so it captures whether the user's need was met rather than whether a particular result attracted a click; it is naturally negative-labelled, giving signal on failures rather than only successes; and it costs nothing to collect. The caveat is that reformulation is not always failure — exploratory sessions legitimately involve several queries — so it needs segmenting by intent, and a rising reformulation rate on navigational queries is a much stronger alarm than on informational ones. On the human-judgement side, the thing worth budgeting for is not volume but COVERAGE: a few thousand judgements stratified across query frequency bands and intent classes is worth more than ten thousand drawn from head traffic, because the head is where the ranker is already fine. That is the same stratification argument as everywhere in this curriculum — the aggregate is a weighted average and the failures live in the tail."
        },
        {
          "q": "How does this lesson fit the module's theme?",
          "a": "SEARCH HAS THE SHARPEST VERSION OF THE MODULE'S SPINE BECAUSE ITS STRUCTURE IS THE MOST EXPLICIT. The query is what makes ranking learnable — it defines which documents compete, it makes relevance a relative rather than absolute property, and it is the unit the metric normalizes over. AND IT IS EXACTLY THE UNIT A NAIVE SPLIT DESTROYS. Put a query's documents on both sides of the split and the model learns that query's answer rather than how to rank, which the grouped-split measurement showed in its general form: AUC 0.9999 against 0.5807, an optimism of +0.4192 from the same data and model. THE STRUCTURE IS THE PRIOR AND THE TRAP, in one object. WHAT SEARCH ADDS to the module's argument is that the dependency has a second axis most people never consider — documents as well as queries — so the honest evaluation is a two-dimensional holdout answering three different deployment questions. AND THE FEATURE CHANNEL STILL APPLIES on top of both: query-level aggregates computed before the split leak across a correctly-drawn boundary, which is the recommender lesson's finding arriving in a different domain with the same mechanism.",
          "deepDive": "It is worth noting how this connects to the retrieval-augmented generation work, since that is where most people now meet ranking. A RAG system is search with a generation step attached, and it inherits every problem in this lesson: the retriever's recall is a hard ceiling on the generator's factuality, the split for evaluating retrieval must be by query, hybrid retrieval beats either method alone for the same disjoint-failure reason, and the labels have the same three-jobs structure. What RAG adds is that the downstream metric — answer quality — is generated by a model whose scoring inherits the eval problems from the LLM-systems module, so the whole evaluation stack has two layers of measurement error rather than one. Anyone who has internalized this lesson's frame will ask the right first question about a RAG system, which is what the retriever's recall is on a query-level held-out set, and that question is skipped remarkably often in favour of tuning the prompt."
        },
        {
          "q": "You improved NDCG offline and online metrics did not move. What do you check?",
          "a": "THE SAME THREE THINGS AS THE RECOMMENDER CASE, WITH ONE SEARCH-SPECIFIC ADDITION. FIRST, WHETHER THE OFFLINE LABELS ARE BIASED IN THE INCUMBENT'S FAVOUR. If the relevance labels come from logged clicks, they encode the current ranker's placement, so a new model is rewarded for agreeing with the old one and NDCG measures similarity rather than quality. Evaluating on human judgements or on a randomized-ranking slice removes that, and the gap between the two evaluations is itself diagnostic. SECOND, WHETHER RETRIEVAL CHANGED AT ALL — a ranking gain over a fixed candidate set cannot exceed the retrieval recall ceiling, so if recall@1000 is the binding constraint, reordering does nothing. THIRD, WHETHER THE SPLIT WAS BY QUERY and whether any query-level feature was computed across the boundary, since either produces an offline gain with no online counterpart. THE SEARCH-SPECIFIC ONE IS THE QUERY MIX: NDCG averaged over a query sample that does not match live traffic will move for reasons unrelated to the ranker, and head-weighted improvements can be invisible online if the traffic is tail-heavy or vice versa. Stratifying the offline metric by query frequency band usually resolves it in one groupby.",
          "deepDive": "There is a fourth possibility specific to ranking that is easy to miss: the improvement is real, and it is below the interface's resolution. If the product shows ten results and your change reorders positions six through nine, NDCG moves and user behaviour does not, because almost nobody scrolls that far — the examination probability at those ranks is small enough that the change is invisible. That is not a measurement failure, it is a genuine mismatch between the metric's discount and the interface's actual examination curve, and it is the argument for fitting the discount to your own logs rather than using log₂(i+1). Checking WHERE in the ranking your change acts, before running the experiment, is a two-line diagnostic that predicts whether an online test can detect it at all — and it is the ranking version of the minimum-detectable-effect discipline from the experimentation module, which is the check most likely to be missing when an offline gain fails to reproduce."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "★ Why ranking ≠ classification + sort",
        "back": "The loss must know documents COMPETE within a query, that rank 1 costs more than rank 20, and that cross-query comparisons are meaningless. Miss any and you've built a pointwise classifier that outputs a number."
      },
      {
        "type": "definition",
        "front": "The three loss families",
        "back": "Pointwise ℓ(f(xᵢ),yᵢ) — knows nothing. Pairwise ℓ(f(xᵢ)−f(x_j)) within a query — where most of the gain is. Listwise — optimizes NDCG directly."
      },
      {
        "type": "definition",
        "front": "LambdaRank's trick",
        "back": "You don't need NDCG's gradient — you need a per-pair WEIGHT equal to the metric change from swapping them. LambdaMART is that inside GBDT and is frequently still the thing to beat."
      },
      {
        "type": "formula",
        "front": "NDCG@k",
        "back": "DCG@k = Σᵢ (2^{rel_i} − 1)/log₂(i+1), ÷ IDCG@k. The exponential gain and log discount are MODELLING CHOICES, not conventions — fit the discount to your own examination curve."
      },
      {
        "type": "pitfall",
        "front": "Why normalize per query?",
        "back": "Without IDCG, a query with 50 relevant docs contributes 50× one with a single relevant doc — so the average becomes a statistic about your QUERY MIX, and it moves when traffic shifts rather than when the ranker improves."
      },
      {
        "type": "pitfall",
        "front": "★ The unit of generalization is the QUERY",
        "back": "A random ROW split puts a query's documents on both sides, so the model learns that query's answer. Measured (general form): AUC **0.9999** row split vs **0.5807** group split — optimism **+0.4192**, same data and model."
      },
      {
        "type": "intuition",
        "front": "The second split axis nobody uses",
        "back": "The DOCUMENT. Unseen-query/seen-doc, seen-query/unseen-doc, and unseen/unseen answer three different deployment questions. Also stratify by query FREQUENCY BAND — traffic is skewed and the tail is where unmet need lives."
      },
      {
        "type": "intuition",
        "front": "★ Lexical vs dense — a union, not a choice",
        "back": "They fail on DISJOINT query types: lexical on synonyms/paraphrase, dense on rare exact terms, IDs, model numbers, typos. Tuning one leaves the other's failures untouched. (Learned sparse — SPLADE — partly dissolves the dichotomy.)"
      },
      {
        "type": "formula",
        "front": "Reciprocal rank fusion",
        "back": "RRF(d) = Σ_r 1/(k + rank_r(d)), k ≈ 60. RANK-based, so no calibration — BM25 scores and dot products are on incomparable scales. One constant, no training, hard to beat with a learned combiner."
      },
      {
        "type": "intuition",
        "front": "★ Three labels for three jobs",
        "back": "TRAIN on debiased clicks (rank 1 vs 10 = 0.4991 vs 0.0989 on identical relevance). VALIDATE on human judgements (the only unbiased ground truth). MONITOR reformulation + abandonment (session-level, free, goal-aligned)."
      },
      {
        "type": "intuition",
        "front": "Search's structural advantage",
        "back": "NO REFORMULATION is session-level, naturally negative-labelled, and free. Caveat: exploratory sessions legitimately reformulate — segment by intent, since a rise on NAVIGATIONAL queries is a much stronger alarm."
      },
      {
        "type": "pitfall",
        "front": "Offline NDCG up, online flat — the ranking-specific cause",
        "back": "Your change may act BELOW the interface's resolution. Reordering positions 6–9 moves NDCG and not behaviour, because examination there is near zero. Check WHERE in the ranking the change acts before running the test."
      }
    ],
    "refs": [
      {
        "title": "Burges (2010), From RankNet to LambdaRank to LambdaMART: An Overview",
        "url": "https://www.microsoft.com/en-us/research/publication/from-ranknet-to-lambdarank-to-lambdamart-an-overview/"
      },
      {
        "title": "Robertson & Zaragoza (2009), The Probabilistic Relevance Framework: BM25 and Beyond",
        "url": "https://www.nowpublishers.com/article/Details/INR-019"
      },
      {
        "title": "Cormack, Clarke & Buettcher (2009), Reciprocal Rank Fusion Outperforms Condorcet and Individual Rank Learning Methods",
        "url": "https://dl.acm.org/doi/10.1145/1571941.1572114"
      },
      {
        "title": "Joachims, Swaminathan & Schnabel (2017), Unbiased Learning-to-Rank with Biased Feedback",
        "url": "https://arxiv.org/abs/1608.04468"
      },
      {
        "title": "Formal, Piwowarski & Clinchant (2021), SPLADE: Sparse Lexical and Expansion Model for First Stage Ranking",
        "url": "https://arxiv.org/abs/2107.05720"
      }
    ],
    "demos": [
      "pagerank",
      "vector-search",
      "rag-reranker",
      "roc"
    ]
  },
  "shap": {
    "level": "core",
    "body": {
      "intuition": [
        "SHAP is the applied face of Shapley values, and the reason it became ubiquitous is TreeSHAP: exact Shapley values for tree ensembles in polynomial time rather than exponential. That algorithmic result is what turned a theoretically appealing attribution into something you can run on a million rows, and it is why tree models and SHAP arrived together in practice.",
        "The thing to internalize before using it is that SHAP explains the MODEL, not the world, and it explains the model RELATIVE TO A BASELINE you chose. Two configurations disagree completely on a feature the model provably does not use: at a correlation of 0.99 the interventional value was 0.000 and the conditional value 2.344. Both are correct answers to different questions, and most practitioners do not know which one their library ran.",
        "And the attribution is a property of the REPRESENTATION rather than only of the model. Write a linear model as 3x0 + 2x1 and the mean absolute SHAP values are 2.371 and 1.612. Write the IDENTICAL function as 1.5x0a + 1.5x0b + 2x1, splitting the first feature into two identical copies, and each copy attributes 1.186 - both now ranking BELOW the second feature. Predictions are bit-for-bit unchanged and the ranking inverted."
      ],
      "math": [
        {
          "h": "Why TreeSHAP made this practical",
          "paras": [
            "Exact Shapley requires evaluating the model on every subset of features, which is exponential. TreeSHAP exploits the tree structure to compute the same values by a single traversal that tracks the proportion of subsets flowing down each path.",
            "That is the difference between an interesting definition and a tool."
          ],
          "tex": "\\text{exact: } O(2^{M}) \\quad\\longrightarrow\\quad \\text{TreeSHAP: } O(T\\,L\\,D^{2}) \\quad (T \\text{ trees},\\ L \\text{ leaves},\\ D \\text{ depth})",
          "texNote": "KernelSHAP is the model-agnostic fallback: it approximates Shapley values by weighted regression over sampled coalitions, so it works on anything and is orders of magnitude slower, with a sampling error you must control."
        },
        {
          "h": "★ The baseline decides the answer",
          "paras": [
            "The Shapley axioms fix the allocation given a value function, and they say nothing about how to evaluate the model on an absent feature. That choice is the modelling decision.",
            "A model using only x0, with x1 correlated to it and a coefficient of exactly zero:"
          ],
          "tex": "\\begin{array}{lrr} \\rho & \\phi_{x_1}\\ \\text{interventional} & \\phi_{x_1}\\ \\text{conditional}\\\\ 0.00 & 0.000 & 0.000\\\\ 0.50 & 0.000 & 1.191\\\\ 0.90 & 0.000 & 2.165\\\\ 0.99 & 0.000 & \\mathbf{2.344} \\end{array}",
          "texNote": "Interventional answers 'what does the model use', which is the debugging and adverse-action question. Conditional answers 'what does this feature tell me about the output', which is a question about the data. Neither is wrong; the library default decides for you."
        },
        {
          "h": "★ Attribution is representation-dependent",
          "paras": [
            "Symmetry and efficiency together force credit to split between identical features, so a re-parameterization that changes no prediction changes every ranking."
          ],
          "tex": "3x_0+2x_1: \\ \\overline{|\\phi|}=(2.371,\\,1.612) \\quad\\longrightarrow\\quad 1.5x_{0a}+1.5x_{0b}+2x_1: \\ \\overline{|\\phi|}=(1.186,\\,1.186,\\,1.612)",
          "texNote": "Near-duplicates are everywhere in a real feature store - the same signal at two aggregation windows, a raw value and its log, a field and its imputed version - so this dilution is the normal case rather than a constructed one."
        }
      ],
      "code": [
        {
          "h": "The applied workflow, and the decisions inside it",
          "paras": [
            "Three choices that are usually made by default and each of which changes the output."
          ],
          "code": "# 1 WHICH EXPLAINER\n#   TreeExplainer   exact, fast, for tree ensembles. The default for tabular.\n#   LinearExplainer exact and trivial for linear models.\n#   KernelExplainer model-agnostic, SAMPLED - control nsamples and report it.\n#   DeepExplainer   for nets; approximate, and inherits the saliency caveats.\n\n# 2 WHICH BACKGROUND (the baseline distribution)\n#   a sample of the TRAINING data  -> 'compared to a typical row'\n#   a single all-median row        -> often OFF-MANIFOLD and meaningless\n#   a chosen reference cohort      -> 'compared to THIS population'\n#   ★ the background defines what 'absent' means. Report it with the plot.\n\n# 3 WHICH VARIANT\n#   interventional (marginal)  -> what the MODEL uses. Debugging, adverse action.\n#   conditional  (observational) -> what the FEATURE tells you. Data analysis.\n#   ★ measured: 0.000 vs 2.344 on a feature with coefficient exactly zero.\n#     TreeSHAP's default has CHANGED between library versions - check yours.",
          "caption": "A SHAP plot without its explainer, background and variant stated is not reproducible, and those three lines are the whole difference."
        },
        {
          "h": "What the plots are actually for",
          "paras": [
            "Each answers a different question, and using the wrong one is how SHAP gets over-read."
          ],
          "code": "# WATERFALL / FORCE   ONE prediction, decomposed. The only genuinely LOCAL\n#                     view, and the right one for an adverse-action notice.\n# BEESWARM            global importance AND the direction of effect per\n#                     feature. The most information per pixel in the library.\n# DEPENDENCE PLOT     one feature's SHAP value against its value - reveals\n#                     nonlinearity and interaction. ★ the plot that finds\n#                     threshold effects and U-shapes a bar chart hides.\n# BAR (mean |SHAP|)   global ranking. ★ the most-used and least-informative:\n#                     it discards sign, discards interaction, and is the one\n#                     most damaged by correlated features (2.371 -> 1.186).\n\n# ★ AVERAGING HIDES SIGN. A feature that helps half the population and hurts\n#   the other half has a large mean |SHAP| and a near-zero mean SHAP, and the\n#   bar chart shows only the first.",
          "caption": "The beeswarm is the default worth adopting because it shows the distribution the bar chart collapses, at no extra cost."
        }
      ],
      "useCases": [
        "Debugging a model that is right for the wrong reason - a leaked identifier, a timestamp encoding the label, a proxy nobody intended - which SHAP finds immediately and is its strongest use.",
        "Regulatory adverse-action notices, where a per-decision explanation is required and the interventional variant with a stated baseline is the closest available thing.",
        "Feature pruning, where the interventional value answers what happens if a feature is removed - though an ablation answers it more directly.",
        "Communicating a tabular model to a non-technical stakeholder, where a beeswarm plot conveys direction and magnitude faster than any coefficient table."
      ],
      "pitfalls": [
        "Not knowing which variant your library ran. Interventional gave 0.000 and conditional 2.344 for a feature with a coefficient of exactly zero, and TreeSHAP's default has changed between versions.",
        "Reading the bar chart as feature importance. Splitting one feature into two identical copies took 2.371 to 1.186 each, inverting the ranking with predictions bit-for-bit unchanged.",
        "Using an all-median row as the background. That row often does not exist in the data, so the model is being evaluated off-manifold and the explanation is extrapolation.",
        "Averaging SHAP values without noting that sign cancels. A feature helping half the population and hurting the other half has large mean absolute SHAP and near-zero mean SHAP.",
        "Reading SHAP as causal. It describes what the model uses, and whether the world works that way is an entirely separate question with its own untestable assumptions.",
        "Running KernelSHAP without reporting nsamples. It is a sampling estimate, so the values have a variance that nobody quotes and that changes the ranking between runs.",
        "Explaining a model whose validation was leaky. A confident explanation of a model that will not generalize is a confident explanation of an artefact, which is why this lesson sits after the split discipline."
      ],
      "connections": [
        {
          "ref": "trustworthy-ai/attribution",
          "text": "The conceptual treatment - the axioms, the baseline problem, and the model-randomization sanity check that most saliency methods fail."
        },
        {
          "ref": "supervised-learning/boosting",
          "text": "The model family TreeSHAP exists for, and the reason tree ensembles and SHAP became standard together."
        },
        {
          "ref": "causal-inference/causal-graphs",
          "text": "Why interventional and conditional SHAP disagree: one is a do-operation and the other an observation, which is the same distinction the causal module is built on."
        },
        {
          "ref": "ml-applications/tabular-dl",
          "text": "The models this is usually applied to, and why the tabular domain's structure keeps trees competitive."
        },
        {
          "ref": "trustworthy-ai/fairness",
          "text": "Where SHAP gets used as audit evidence, and why 'the protected attribute had low attribution' is unpersuasive when correlated proxies split the credit."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What makes TreeSHAP practical?",
          "a": "Exact Shapley values for tree ensembles in O(T·L·D²) instead of O(2^M). That algorithmic result is why SHAP became ubiquitous alongside GBDT."
        },
        {
          "q": "What is KernelSHAP?",
          "a": "The model-agnostic fallback — Shapley approximated by weighted regression over sampled coalitions. Works on anything, orders of magnitude slower, and has a sampling error you must control and report."
        },
        {
          "q": "★ Interventional vs conditional SHAP?",
          "a": "Interventional draws absent features marginally (a do-operation): what the MODEL uses. Conditional draws from p(x_{−S}|x_S): what the FEATURE tells you about the output."
        },
        {
          "q": "Show they disagree.",
          "a": "Feature with coefficient exactly ZERO, ρ=0.99 with a used feature: interventional **0.000**, conditional **2.344**. TreeSHAP's default has changed between library versions."
        },
        {
          "q": "Which for debugging or an adverse-action notice?",
          "a": "Interventional — both ask a counterfactual question about the model. Conditional is a claim about the data and should be labelled as one."
        },
        {
          "q": "★ What happens if you duplicate a feature?",
          "a": "Credit splits. 3x₀+2x₁ gives |φ| = (2.371, 1.612); the identical function as 1.5x₀ₐ+1.5x₀ᵦ+2x₁ gives (1.186, 1.186, 1.612) — the ranking INVERTS with predictions unchanged."
        },
        {
          "q": "Is that a bug?",
          "a": "No — symmetry plus efficiency force it. Any attribution obeying conservation has it, and near-duplicates are the normal case in a real feature store."
        },
        {
          "q": "What does the background dataset do?",
          "a": "It defines what 'absent' means. A training sample means \"vs a typical row\"; an all-median row is often OFF-MANIFOLD and meaningless. Report it with the plot."
        },
        {
          "q": "Which plot for one prediction?",
          "a": "Waterfall or force — the only genuinely local view, and the right one for an adverse-action notice."
        },
        {
          "q": "Which plot is most under-used?",
          "a": "The dependence plot — SHAP value against feature value. It reveals threshold effects, U-shapes and interactions that a bar chart hides entirely."
        },
        {
          "q": "★ What does the mean-|SHAP| bar chart hide?",
          "a": "SIGN. A feature helping half the population and hurting the other half has large mean |SHAP| and near-zero mean SHAP — the bar shows only the first. Use a beeswarm."
        },
        {
          "q": "Is SHAP causal?",
          "a": "No. It describes what the MODEL uses. Whether the world works that way is a separate question with its own untestable assumptions."
        }
      ],
      "standard": [
        {
          "q": "Explain SHAP and the choices that decide its output.",
          "a": "SHAP APPLIES SHAPLEY VALUES TO MODEL PREDICTIONS: each feature's attribution is its average marginal contribution over all orderings of the others, which is the unique allocation satisfying efficiency, symmetry, dummy and additivity. THE REASON IT BECAME UBIQUITOUS IS TREESHAP — exact Shapley values for tree ensembles in O(T·L·D²) rather than the exponential O(2^M) of the naive computation, which turned an appealing definition into something you can run on a million rows. KernelSHAP is the model-agnostic fallback, approximating the values by weighted regression over sampled coalitions; it works on anything and is far slower with a sampling error nobody reports. THREE CHOICES THEN DECIDE THE OUTPUT and all three are usually made by default. The EXPLAINER, which is mostly determined by the model family. The BACKGROUND dataset, which defines what an absent feature means — a training sample gives 'compared to a typical row', and an all-median row is frequently off-manifold and therefore meaningless. And the VARIANT: interventional draws absent features marginally, which is a do-operation answering what the model uses; conditional draws from the conditional distribution, answering what the feature tells you about the output. MEASURED ON A FEATURE WITH COEFFICIENT EXACTLY ZERO at correlation 0.99: interventional 0.000, conditional 2.344.",
          "deepDive": "That last disagreement is the one worth checking in your own stack, because TreeSHAP's default variant has changed between library versions, which means published SHAP figures from different years are not necessarily comparable and neither are two analyses in the same organisation. The rule for choosing is to name the question: debugging, feature pruning and adverse-action notices all want INTERVENTIONAL, because each asks a counterfactual about the model — what happens if this feature changes or is removed. Understanding the data-generating process wants CONDITIONAL, and it should be labelled as a statement about the data rather than the model. The honest trade is that interventional evaluates the model at combinations that never occur — resampling one feature independently can produce an impossible row — so its answer in those regions is extrapolation, while conditional stays on-manifold and credits features the model demonstrably ignores. There is no variant that avoids both problems, which is why the choice has to be made deliberately rather than inherited."
        },
        {
          "q": "Why is SHAP-based feature ranking unreliable?",
          "a": "BECAUSE ATTRIBUTION IS A PROPERTY OF THE REPRESENTATION, NOT ONLY OF THE MODEL, and the demonstration takes one line. Take f = 3x₀ + 2x₁, where mean absolute SHAP is 2.371 and 1.612 — x₀ dominates, correctly. Now write the identical function as 1.5x₀ₐ + 1.5x₀ᵦ + 2x₁, where the two copies are the same column. Predictions are bit-for-bit unchanged; it is the same function. Each copy now attributes 1.186, so BOTH RANK BELOW x₁. The most important input appears twice, in third and fourth place. THAT IS THE AXIOMS WORKING CORRECTLY — symmetry says identical features get identical credit and efficiency says the total is fixed, so the credit must split. AND DUPLICATION IS NOT ARTIFICIAL: near-duplicates are everywhere in a production feature store — the same signal at two aggregation windows, a raw value and its log, a field and its imputed version, overlapping embeddings — so this dilution is the normal case. THE PRACTICAL CONSEQUENCE is that SHAP rankings are comparable within a fixed feature set and not across pipelines, so a feature that drops after a pipeline change may have gained a correlated sibling rather than lost influence.",
          "deepDive": "Grouped Shapley values are the standard mitigation: treat a set of related columns as one player, which restores the ranking and requires you to define the groups, which is a domain judgement. That is the right answer when the group is genuinely one concept measured several ways, and it is unavailable for learned embeddings where you do not know the structure. The audit implication is worth stating because it comes up in fairness reviews: 'the protected attribute had low SHAP importance' is unpersuasive when a dozen correlated proxies are present, because the credit for that concept is spread across all of them and no single one looks important. Grouping the proxies and attributing to the group is the correct analysis and it typically changes the picture substantially. More generally, any attribution obeying an efficiency axiom has this property — a fixed total must be divided, so adding a correlated feature necessarily reduces someone's share whether or not the model's behaviour changed — so it is a consequence of conservation rather than a defect of SHAP in particular."
        },
        {
          "q": "How would you actually use SHAP on a production model?",
          "a": "FOR DEBUGGING FIRST, BECAUSE THAT IS ITS STRONGEST USE BY SOME MARGIN. When a model is right for the wrong reason — a leaked identifier, a hospital tag, a timestamp that encodes the label, a proxy nobody intended — the offending feature attributes enormously and a human recognizes instantly that it should not. That is a hypothesis-generation use where a false positive costs a few minutes and a true positive saves a launch, and it justifies the tooling on its own. THE WORKFLOW I'D RUN: a beeswarm over a representative sample to see global importance AND direction, then dependence plots for the top features to catch threshold effects and interactions that a bar chart hides, then waterfall plots on individual predictions the business flagged as surprising. I'D REPORT THE THREE CHOICES alongside any figure — explainer, background, variant — because a SHAP plot without them is not reproducible, and I'd use a training sample as the background rather than an all-median row, which is frequently off-manifold. WHAT I WOULD NOT DO is present the mean-absolute bar chart as the deliverable. It discards sign, discards interaction, and is the plot most damaged by correlated features, which is an unfortunate combination for the one everybody uses.",
          "deepDive": "There is a sequencing point that matters and is often violated: explain the model AFTER you trust the validation, not before. A confident explanation of a model whose split leaked is a confident explanation of an artefact, and SHAP will happily produce a beautiful beeswarm for a model that learned a per-group signature — which is why this lesson sits after the split discipline in this module rather than before it. In fact SHAP is a decent leakage DETECTOR when used that way: an implausibly dominant single feature is a leakage hypothesis before it is a modelling success, and checking what window that feature was computed over is usually the fastest resolution. The other operational point is cost: TreeSHAP is fast but not free at scale, and explaining every prediction in production is usually unnecessary — sampling for monitoring dashboards and computing on demand for individual cases covers both needs. Where per-decision explanations are legally required, that cost becomes a serving-path constraint and belongs in the latency budget rather than being discovered afterwards."
        },
        {
          "q": "A stakeholder asks whether SHAP shows what causes the outcome. How do you answer?",
          "a": "IT SHOWS WHAT THE MODEL USES, WHICH IS A DIFFERENT AND MORE LIMITED CLAIM. The model learned associations in the training data; SHAP decomposes the model's output; so the chain runs from data associations to model behaviour to attribution, and nowhere in it is there a claim about what would happen if you intervened on the world. If a feature is a proxy for an unmeasured cause, SHAP will attribute to the proxy, correctly describing the model and misleading anyone who reads it as a lever. THE CONCRETE VERSION: interventional and conditional SHAP disagreeing by 0.000 against 2.344 on a feature the model provably does not use IS the observational-versus-interventional distinction from the causal module, appearing inside the attribution itself — and note that even the interventional variant is an intervention on the MODEL'S INPUT, not on the world. WHAT I WOULD OFFER INSTEAD depends on the question. If they want to know what to change, that is a causal question needing an experiment or an identification strategy with its assumptions stated. If they want to know why this decision came out this way, SHAP with the interventional variant and a stated background is the right tool. If they want to know whether the model is trustworthy, neither — that is validation, monitoring and calibration.",
          "deepDive": "The distinction is worth making concrete with an example that lands, because the abstract version rarely does. Suppose a churn model attributes heavily to 'number of support tickets'. Reading that causally suggests reducing support tickets to reduce churn, which could mean making it harder to file one — and that would plausibly increase churn while improving the feature. The model was never wrong: tickets genuinely predict churn, because unhappy customers file them. The attribution was never wrong either: the model does use that feature. The error is entirely in the reading. That is the causal module's confounding lesson in its most familiar business form, and it is why the honest framing of any SHAP output is 'this is how the model reached its answer' rather than 'this is why the outcome happens'. Being disciplined about that one sentence in every writeup prevents a specific and expensive class of decision, and it costs nothing."
        },
        {
          "q": "How does this lesson fit the module's theme?",
          "a": "IT IS THE MODULE'S THEME APPLIED TO AN EXPLANATION RATHER THAN A SPLIT. Tabular data's structure — heterogeneous columns, correlated features, engineered aggregates — is what makes tree ensembles work and what makes their explanations fragile. Correlated features are informative and they split SHAP credit, taking 2.371 to 1.186 each on an unchanged model. Engineered aggregates are predictive and they are the most common leakage surface. THE SAME PROPERTY DOES BOTH JOBS, which is the spine. WHAT THIS LESSON ADDS is a sequencing rule the rest of the module implies and does not state: EXPLAIN AFTER YOU TRUST THE VALIDATION, never before. SHAP will produce a confident, beautiful, entirely coherent explanation of a model that learned a per-group signature — the grouped-split experiment's model at AUC 0.9999 would have had a compelling beeswarm — and nothing in the explanation reveals that its validation was optimistic by +0.4192. AN EXPLANATION IS DOWNSTREAM OF A MODEL AND INHERITS EVERYTHING WRONG WITH IT, which makes an impressive explanation of an unvalidated model actively harmful rather than merely uninformative.",
          "deepDive": "That inheritance point generalizes past SHAP and is worth carrying. Every downstream artefact of a model — an explanation, a calibration curve, a fairness audit, a monitoring baseline — is computed from the model and therefore assumes the model is what you think it is. If the validation was leaky, all of them are describing an artefact with full confidence, and none of them contains a signal that this happened. That is why the ordering in a project matters: split correctly, verify the features do not cross the boundary, establish that the number is real, and only then explain, calibrate and audit. Teams routinely run those in the opposite order because the downstream artefacts are more visible and more requested. The cheap safeguard is to attach the validation scheme — the unit held out and whether any aggregate crossed it — to every downstream artefact as a single line, so that a beeswarm plot travelling through an organisation carries its own provenance rather than acquiring authority as it goes."
        },
        {
          "q": "When would you not reach for SHAP?",
          "a": "WHEN AN ABLATION ANSWERS THE QUESTION MORE DIRECTLY, WHICH IS MORE OFTEN THAN PEOPLE ASSUME. If the question is 'does this feature matter', dropping it and retraining answers it exactly, in the model's own terms, with no baseline choice and no representation dependence — and it is the answer for feature pruning. SHAP is preferable when you need PER-PREDICTION attributions, when retraining is expensive enough that a hundred ablations is impractical, or when you need direction as well as magnitude. WHEN THE MODEL IS ALREADY INTERPRETABLE: a linear model's coefficients with standardized inputs, or a small decision tree, communicate more clearly than an attribution layer on top, and adding SHAP to a logistic regression is usually a signal that nobody looked at the coefficients. WHEN THE FEATURES ARE NOT MEANINGFUL UNITS — raw pixels, token embeddings, learned representations — attribution over them produces a picture rather than an explanation, and the saliency caveats from the trustworthy-AI module apply, including the randomization test that several popular methods fail. AND WHEN THE REAL QUESTION IS CAUSAL, where no attribution method substitutes for a design.",
          "deepDive": "The ablation comparison deserves a caveat so the recommendation is honest: retrain-and-drop measures the model's dependence on a feature GIVEN that the model can reorganize around its absence, so with correlated features it systematically understates importance — drop one of two near-duplicates and performance barely moves, because the other carries the signal. That is the same conservation issue as SHAP's credit splitting, arriving with the opposite sign, which is a useful pairing: SHAP splits the credit and ablation attributes none of it, and the truth is that the GROUP matters. Running both and noticing the disagreement is itself diagnostic of correlation structure, and it costs one extra experiment. The general habit is the one this curriculum keeps returning to: when two methods that should agree disagree, the disagreement is information about the data rather than a reason to pick a favourite."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "What made SHAP practical",
        "back": "TreeSHAP: exact Shapley for tree ensembles in **O(T·L·D²)** instead of O(2^M). KernelSHAP is the model-agnostic fallback — sampled coalitions, far slower, with a sampling error nobody reports."
      },
      {
        "type": "pitfall",
        "front": "★ Interventional vs conditional",
        "back": "Feature with coefficient exactly ZERO at ρ=0.99: interventional **0.000**, conditional **2.344**. Do-operation vs observation. TreeSHAP's default has CHANGED between library versions — check yours."
      },
      {
        "type": "intuition",
        "front": "Which variant for which question?",
        "back": "Debugging / pruning / adverse-action → INTERVENTIONAL (a counterfactual about the model). Understanding the data → CONDITIONAL, labelled as a claim about the data. Neither avoids both problems."
      },
      {
        "type": "formula",
        "front": "★ Duplicate a feature, invert the ranking",
        "back": "3x₀+2x₁ → |φ| = (2.371, 1.612). The IDENTICAL function as 1.5x₀ₐ+1.5x₀ᵦ+2x₁ → (1.186, 1.186, 1.612). Predictions bit-for-bit unchanged; the dominant feature now ranks 3rd and 4th."
      },
      {
        "type": "intuition",
        "front": "Why duplication splits credit",
        "back": "Symmetry + efficiency FORCE it — any attribution obeying conservation has this. Near-duplicates are the normal case: two aggregation windows, a raw value and its log, a field and its imputation."
      },
      {
        "type": "definition",
        "front": "The three choices to report",
        "back": "EXPLAINER (Tree/Linear/Kernel/Deep) · BACKGROUND (defines what 'absent' means — a training sample, not an all-median row, which is often OFF-MANIFOLD) · VARIANT (interventional vs conditional). Without all three the plot isn't reproducible."
      },
      {
        "type": "intuition",
        "front": "Which plot for which job",
        "back": "Waterfall/force = ONE prediction (the only local view; right for adverse action). Beeswarm = global importance AND direction. Dependence = nonlinearity and interaction. Bar = most used, least informative."
      },
      {
        "type": "pitfall",
        "front": "★ What the bar chart hides",
        "back": "SIGN. A feature helping half the population and hurting the other half has large mean |SHAP| and near-ZERO mean SHAP — the bar shows only the first. The beeswarm shows the distribution at no extra cost."
      },
      {
        "type": "pitfall",
        "front": "Is SHAP causal?",
        "back": "No — it describes what the MODEL uses. A churn model attributing to 'support tickets' does not mean suppressing tickets reduces churn; it might increase it while improving the feature. The model and the attribution are both right; the READING is wrong."
      },
      {
        "type": "intuition",
        "front": "★ Explain AFTER you trust the validation",
        "back": "SHAP produces a coherent, beautiful explanation of a model that learned a per-group signature — the AUC 0.9999 leaky model would have a compelling beeswarm, with nothing revealing the +0.4192 optimism. An explanation INHERITS everything wrong with the model."
      },
      {
        "type": "intuition",
        "front": "SHAP as a leakage detector",
        "back": "An implausibly dominant single feature is a LEAKAGE HYPOTHESIS before it's a modelling success. Check what window that feature was computed over — usually the fastest resolution."
      },
      {
        "type": "intuition",
        "front": "When to ablate instead",
        "back": "\"Does this feature matter\" → drop and retrain: exact, no baseline, no representation dependence. But ablation UNDERSTATES with correlated features (the other copy carries the signal) — SHAP splits the credit, ablation attributes none. Disagreement between them is itself diagnostic."
      }
    ],
    "refs": [
      {
        "title": "Lundberg & Lee (2017), A Unified Approach to Interpreting Model Predictions",
        "url": "https://arxiv.org/abs/1705.07874"
      },
      {
        "title": "Lundberg et al. (2020), From Local Explanations to Global Understanding with Explainable AI for Trees",
        "url": "https://www.nature.com/articles/s42256-019-0138-9"
      },
      {
        "title": "Janzing, Minorics & Blobaum (2020), Feature Relevance Quantification in Explainable AI: A Causal Problem",
        "url": "https://proceedings.mlr.press/v108/janzing20a.html"
      },
      {
        "title": "Kumar, Venkatasubramanian, Scheidegger & Friedler (2020), Problems with Shapley-value-based Explanations as Feature Importance Measures",
        "url": "https://arxiv.org/abs/2002.11097"
      },
      {
        "title": "Molnar, Interpretable Machine Learning (2nd ed.)",
        "url": "https://christophm.github.io/interpretable-ml-book/"
      }
    ],
    "demos": [
      "shap",
      "saliency",
      "decision-tree",
      "bagging-boosting"
    ]
  },
  "gnn": {
    "level": "advanced",
    "body": {
      "intuition": [
        "A graph neural network is a stack of permutation-invariant aggregations over neighbourhoods. Each layer lets a node see one hop further, so a k-layer network computes a function of each node's k-hop subgraph, and the whole design question is what to aggregate and how far to go before the neighbourhoods stop being informative.",
        "The structure being exploited is HOMOPHILY - the assumption that connected nodes are similar. That assumption is what makes message passing work, and it is worth testing rather than assuming: on heterophilous graphs, where connected nodes tend to DIFFER, a plain GCN can underperform an MLP that ignores the graph entirely, which is a result people find surprising and should not.",
        "And the module's spine has its sharpest form here, because in a graph THE LEAK TRAVELS ALONG EDGES. Hiding a node's own label is not sufficient - its neighbours' labels must be hidden too, or message passing reads them directly. Measured with a 1-hop neighbour vote at 85% homophily: using all labels gave AUC 0.9901 and using train labels only gave 0.9783. The gap is modest here because the vote was already near-saturated; with weaker features and a deeper network it is much larger, and the mechanism is the same."
      ],
      "math": [
        {
          "h": "Message passing, and what the aggregator must be",
          "paras": [
            "Every GNN layer is the same three steps: transform each neighbour, aggregate over the neighbourhood, update the node. The aggregator must be permutation-invariant because a neighbourhood is a set, not a sequence.",
            "That invariance is the architectural prior, exactly as translation equivariance is a CNN's."
          ],
          "tex": "h_v^{(k+1)} = \\phi\\Big(h_v^{(k)},\\ \\bigoplus_{u\\in\\mathcal{N}(v)} \\psi\\big(h_v^{(k)},h_u^{(k)}\\big)\\Big), \\qquad \\bigoplus \\in \\{\\text{sum},\\ \\text{mean},\\ \\text{max},\\ \\text{attention}\\}",
          "texNote": "The choice of aggregator determines expressiveness: SUM can distinguish multisets that MEAN and MAX cannot, which is why GIN with a sum aggregator is as powerful as the 1-Weisfeiler-Lehman test and mean-pooled GCNs are strictly weaker."
        },
        {
          "h": "The depth problem is not vanishing gradients",
          "paras": [
            "Stacking layers grows the receptive field exponentially, so beyond a few hops every node's neighbourhood is most of the graph and all embeddings converge toward the same value.",
            "That is over-smoothing, and it is why GNNs are typically two or three layers rather than dozens."
          ],
          "tex": "|\\mathcal{N}_k(v)| \\approx \\bar{d}^{\\,k} \\quad\\Rightarrow\\quad \\bar{d}=10,\\ k=4 \\Rightarrow 10{,}000\\ \\text{nodes};\\ k=6 \\Rightarrow 10^{6}",
          "texNote": "Over-squashing is the companion problem: exponentially many nodes must be compressed into a fixed-width vector, so long-range dependencies are lost regardless of depth. Residual connections, jumping knowledge and graph rewiring all target these rather than gradient flow."
        },
        {
          "h": "★ The leak travels along edges",
          "paras": [
            "Transductive evaluation - the standard setup in much of the literature - lets the model see the whole graph structure and the test nodes' features. If any label information reaches a test node through message passing, the evaluation is compromised.",
            "One-hop neighbour vote, 85% homophily, 30% of nodes held out."
          ],
          "tex": "\\text{using ALL labels: AUC } 0.9901 \\qquad \\text{using TRAIN labels only: AUC } 0.9783",
          "texNote": "The gap is modest because a 1-hop vote at high homophily is already near-saturated. The mechanism is what matters: hiding a node's own label is not enough, because its neighbours carry the same information one hop away."
        }
      ],
      "code": [
        {
          "h": "The three evaluation settings, and which one you need",
          "paras": [
            "They answer different deployment questions and are routinely conflated in reported numbers."
          ],
          "code": "# TRANSDUCTIVE     the whole graph, including test nodes' features and edges,\n#                  is available at training time. Only their LABELS are hidden.\n#                  -> answers: 'can I label the rest of THIS graph?'\n#                  -> the standard academic setup (Cora, Citeseer, Pubmed)\n\n# INDUCTIVE        test nodes are unseen at training time.\n#                  -> answers: 'can I label nodes that arrive later?'\n#                  -> what almost every production system actually needs\n\n# FULLY INDUCTIVE  an entirely unseen GRAPH.\n#                  -> answers: 'does this transfer to a new network?'\n\n# ★ Numbers from these three are not comparable, and a paper reporting a\n#   transductive result on a citation benchmark is not evidence about a\n#   production system that scores new nodes hourly.\n\n# AND IN ALL THREE: neighbours' labels must be masked, not just the node's.\n#   measured: 1-hop vote AUC 0.9901 with all labels, 0.9783 with train only.",
          "caption": "Choosing the setting is choosing the question. Most production graph problems are inductive and most reported benchmarks are transductive."
        },
        {
          "h": "The baseline that decides whether you need a GNN",
          "paras": [
            "Run these first. On many real graphs one of them wins, and the ones that lose tell you which structure is present."
          ],
          "code": "# 1 MLP ON NODE FEATURES ONLY   ignores the graph entirely.\n#     ★ if this wins, the graph carries no signal you are exploiting -\n#       which happens more often than the literature suggests\n# 2 LABEL PROPAGATION           uses ONLY the graph, no features.\n#     if this wins, features are noise and homophily is strong\n# 3 MLP + propagated features    concatenate neighbour-averaged features\n#     ★ a very strong, very cheap baseline that beats GCNs on several\n#       benchmarks and requires no message-passing machinery\n# 4 GNN                          the two together, learned end to end\n\n# CHECK HOMOPHILY EXPLICITLY before any of this:\n#   h = fraction of edges connecting same-label nodes\n#   h >> base rate -> homophilous, message passing should help\n#   h ~ base rate  -> the graph is uninformative about the label\n#   h << base rate -> HETEROPHILOUS, and a plain GCN can lose to an MLP",
          "caption": "The homophily statistic is one line and it predicts whether the whole architecture is appropriate, which makes it the highest-value thing to compute first."
        }
      ],
      "useCases": [
        "Fraud and abuse rings, where the signal is relational - shared devices, payment instruments or IPs - and an isolated account looks fine while the component does not.",
        "Recommendation as link prediction on a user-item bipartite graph, where higher-order connectivity captures collaborative signal that a two-tower model sees only through co-occurrence.",
        "Molecular property prediction, the domain where GNNs are least contested, because a molecule genuinely is a graph and the permutation invariance is exactly right.",
        "Knowledge-graph completion and entity resolution, where connected components and relational structure are the problem rather than a feature."
      ],
      "pitfalls": [
        "Masking a node's label but not its neighbours'. Message passing reads them one hop away - the 1-hop vote scored 0.9901 with all labels against 0.9783 with train labels only.",
        "Comparing transductive and inductive numbers. They answer different deployment questions, and most benchmarks are transductive while most production systems are inductive.",
        "Assuming homophily. On heterophilous graphs a plain GCN can lose to an MLP that ignores the graph, and the homophily statistic that predicts this is one line.",
        "Stacking layers to increase capacity. Beyond a few hops the receptive field is most of the graph - mean degree 10 at 6 layers reaches a million nodes - and embeddings converge, which is over-smoothing rather than a gradient problem.",
        "Skipping the MLP-on-features baseline. If it wins, the graph is not contributing and the architecture is unjustified complexity.",
        "Ignoring over-squashing. Exponentially many nodes compressed into a fixed-width vector means long-range dependencies are lost regardless of depth, and depth does not fix it.",
        "Neighbour sampling without noting it changes the function. Sampled aggregation is a stochastic approximation, so inference should either sample consistently or aggregate over the full neighbourhood."
      ],
      "connections": [
        {
          "ref": "ml-applications/semi-supervised",
          "text": "Label propagation as the featureless limit of message passing, and the same homophily assumption doing the work under a different name."
        },
        {
          "ref": "ml-applications/neural-recommenders",
          "text": "Recommendation as link prediction, and the point where a bipartite graph view and a two-tower view describe the same system."
        },
        {
          "ref": "neural-nets/backprop",
          "text": "Why over-smoothing is not a gradient problem: the receptive field grows exponentially and the representations converge, which no optimization fix addresses."
        },
        {
          "ref": "transformers/self-attention",
          "text": "Attention as message passing on a complete graph, which is the cleanest way to see what a GNN's sparsity buys and costs."
        },
        {
          "ref": "ml-theory/cross-validation",
          "text": "Why the split has to respect edges, which is this domain's instance of matching the unit of splitting to the unit of generalization."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Write the message-passing update.",
          "a": "h_v^{(k+1)} = φ(h_v^{(k)}, ⊕_{u∈N(v)} ψ(h_v^{(k)}, h_u^{(k)})). The aggregator ⊕ must be PERMUTATION-INVARIANT — a neighbourhood is a set."
        },
        {
          "q": "Why does the aggregator choice matter?",
          "a": "Expressiveness. SUM distinguishes multisets that MEAN and MAX cannot — GIN with sum matches 1-WL power; mean-pooled GCNs are strictly weaker."
        },
        {
          "q": "What does a k-layer GNN compute?",
          "a": "A function of each node's k-hop subgraph. Depth is receptive-field radius, not capacity."
        },
        {
          "q": "★ Why are GNNs shallow?",
          "a": "OVER-SMOOTHING. Receptive field grows like d̄^k — mean degree 10 at k=4 is 10,000 nodes, at k=6 is 10⁶ — so embeddings converge. Not a gradient problem."
        },
        {
          "q": "What is over-squashing?",
          "a": "Exponentially many nodes compressed into a fixed-width vector, so long-range dependencies are lost REGARDLESS of depth. Rewiring and jumping knowledge target it; depth doesn't."
        },
        {
          "q": "★ Where does the leak travel in a graph?",
          "a": "Along EDGES. Hiding a node's own label isn't enough — neighbours carry it one hop away. Measured: 1-hop vote AUC **0.9901** with all labels vs **0.9783** with train only."
        },
        {
          "q": "Name the three evaluation settings.",
          "a": "Transductive (whole graph available, only test LABELS hidden) · inductive (test nodes unseen) · fully inductive (an unseen graph). Their numbers are not comparable."
        },
        {
          "q": "Which does production usually need?",
          "a": "Inductive — new nodes arrive and must be scored. Most published benchmarks are transductive."
        },
        {
          "q": "What is homophily and why check it?",
          "a": "The fraction of edges connecting same-label nodes. h ≫ base rate → message passing helps. h ≈ base rate → the graph is uninformative. h ≪ → HETEROPHILOUS, and a plain GCN can lose to an MLP."
        },
        {
          "q": "Name the baselines before a GNN.",
          "a": "MLP on node features only · label propagation (graph only, no features) · **MLP + neighbour-averaged features** — that third one is cheap and beats GCNs on several benchmarks."
        },
        {
          "q": "What if the MLP-on-features baseline wins?",
          "a": "The graph carries no signal you're exploiting, and the architecture is unjustified complexity. This happens more often than the literature suggests."
        },
        {
          "q": "How does attention relate to message passing?",
          "a": "Self-attention is message passing on a COMPLETE graph. That framing is the clearest way to see what a GNN's sparsity buys and costs."
        }
      ],
      "standard": [
        {
          "q": "Explain how a GNN works and what the architectural prior is.",
          "a": "EVERY GNN LAYER IS THE SAME THREE STEPS: transform each neighbour's representation, aggregate over the neighbourhood, and update the node. Written out, h_v^{(k+1)} = φ(h_v^{(k)}, ⊕_{u∈N(v)} ψ(h_v, h_u)). THE AGGREGATOR MUST BE PERMUTATION-INVARIANT because a neighbourhood is a set with no canonical ordering, and that invariance is the architectural prior in exactly the way translation equivariance is a CNN's. A k-layer network therefore computes a function of each node's k-hop subgraph, so DEPTH IS RECEPTIVE-FIELD RADIUS RATHER THAN CAPACITY — which is a genuinely different meaning of depth from other architectures and explains most of what is unusual about training them. THE AGGREGATOR CHOICE DETERMINES EXPRESSIVENESS: sum can distinguish multisets that mean and max cannot, which is why GIN with a sum aggregator matches the 1-Weisfeiler-Lehman test's discriminative power and mean-pooled GCNs are provably weaker. AND THE ASSUMPTION UNDERNEATH IT ALL IS HOMOPHILY — that connected nodes are similar. Message passing averages over neighbours, so if neighbours tend to differ, averaging destroys signal, and on heterophilous graphs a plain GCN can lose to an MLP that ignores the graph entirely.",
          "deepDive": "The homophily check is the highest-value thing to compute before choosing an architecture and it is one line: the fraction of edges connecting same-label nodes, compared against the base rate you would expect from random wiring. Well above it means message passing should help; at it means the graph carries no label information and you are adding machinery for nothing; well below it means heterophily, where the standard fixes are to separate the ego and neighbour representations rather than averaging them together, to use higher-order neighbourhoods, or to learn signed aggregation. That check also reframes the baseline discussion: an MLP on node features tests whether the graph is needed at all, label propagation tests whether the features are needed at all, and 'MLP plus neighbour-averaged features' — simply concatenating a mean of neighbours' features and training an ordinary network — is a very strong, very cheap baseline that beats GCNs on several standard benchmarks. Running those three before a GNN takes an afternoon and frequently ends the project with a simpler model."
        },
        {
          "q": "How do you split a graph for evaluation?",
          "a": "FIRST DECIDE WHICH QUESTION YOU ARE ANSWERING, because the three standard settings are not comparable and are routinely conflated. TRANSDUCTIVE gives the model the whole graph — all node features and all edges, including test nodes — and hides only the test LABELS; it answers 'can I label the rest of this graph', and it is the setup behind most academic benchmarks. INDUCTIVE holds test nodes out entirely, so they are unseen at training time; it answers 'can I label nodes that arrive later', which is what almost every production system actually needs. FULLY INDUCTIVE holds out an entire graph and answers whether the model transfers to a new network. A transductive number on a citation benchmark is therefore not evidence about a system that scores new accounts hourly. THEN, IN ALL THREE SETTINGS, THE LEAK TRAVELS ALONG EDGES. Masking a test node's own label is insufficient because its neighbours carry nearly the same information one hop away — measured with a 1-hop neighbour vote at 85% homophily, using all labels gave AUC 0.9901 and using train labels only gave 0.9783. The mechanism matters more than that particular gap, which is small because the vote was near-saturated.",
          "deepDive": "The practical version of edge-aware splitting depends on what you are predicting. For NODE classification, mask the labels of all held-out nodes and ensure message passing uses only training labels — if you use label-propagation-style features or label reuse tricks, those must be computed from the training mask alone. For LINK prediction the discipline is stricter and more commonly violated: the edges you are trying to predict must be REMOVED from the graph used for message passing, or the model can see the answer as part of its input, which is the most direct leak available in this domain. Negative sampling for link prediction also has to respect the split, since sampling negatives from the full edge set can produce 'negatives' that are actually held-out positives. For temporal graphs, add the time dimension: edges after the split time must not be present in the message-passing graph at all, which is the time-series discipline arriving in a graph costume. Each of these is a mask over the adjacency rather than a row filter, which is why the standard tooling does not protect you."
        },
        {
          "q": "Why are GNNs typically only two or three layers deep?",
          "a": "OVER-SMOOTHING, WHICH IS NOT A GRADIENT PROBLEM AND IS NOT FIXED BY THE USUAL DEPTH TOOLKIT. Each layer extends the receptive field by one hop, so the number of nodes influencing a representation grows roughly as mean degree to the power k. At a mean degree of 10, four layers reaches about ten thousand nodes and six layers about a million — which on most real graphs is a large fraction of everything. When every node aggregates over nearly the whole graph, every node's representation converges toward the same value, and the model loses the ability to distinguish nodes at all. THAT IS A PROPERTY OF REPEATED AVERAGING rather than of optimization, so residual connections and normalization help only marginally; the effective fixes change what is aggregated — jumping knowledge, which combines representations from several depths, or graph rewiring, which changes the connectivity. THE COMPANION PROBLEM IS OVER-SQUASHING: even if you avoided smoothing, exponentially many nodes must be compressed into a fixed-width vector, so information from distant nodes is lost regardless of depth. Together they mean the useful range is small, and that a graph problem requiring genuinely long-range interaction may need a different architecture — which is one motivation for graph transformers.",
          "deepDive": "The contrast with CNNs is instructive and worth having, because the intuition that 'deeper is more powerful' transfers wrongly. A CNN's receptive field grows linearly with depth on a regular grid, so fifty layers is reasonable and the field remains local; a GNN's grows exponentially because real graphs have small diameter — the six-degrees property is exactly what makes depth useless here. So the same word describes two different geometries, and importing the intuition costs you. The practical consequence is that a GNN's capacity has to come from width and from the transformation functions rather than from depth, which is the opposite of the usual scaling lever. It also explains why graph transformers, which attend over all nodes with structural encodings, are attractive for problems needing long-range interaction: they trade the sparsity that caused the problem for quadratic cost, which is affordable on molecules and not on a billion-node social graph. Knowing which regime you are in — small graphs with long-range structure, or huge graphs with local structure — decides the architecture more reliably than benchmark leaderboards do."
        },
        {
          "q": "How would you scale a GNN to a very large graph?",
          "a": "BY SAMPLING, AND THE THING TO BE CLEAR ABOUT IS THAT SAMPLING CHANGES THE FUNCTION. Full-batch message passing requires the whole graph in memory and the receptive-field explosion means a single node's k-hop neighbourhood can be a large fraction of it, so exact training does not scale. NEIGHBOUR SAMPLING, as in GraphSAGE, fixes a sample size per layer, which bounds the computation per node at the cost of making the aggregation a stochastic estimate — so the trained function is an expectation over samples, and inference should either sample consistently or aggregate over the full neighbourhood, and reporting which one you did matters because they differ. CLUSTER-BASED APPROACHES partition the graph and train on subgraphs, which is memory-efficient and drops the edges crossing partitions, biasing toward local structure. HISTORICAL-EMBEDDING METHODS cache stale representations for out-of-batch neighbours, trading accuracy for memory. AND THE PRECOMPUTATION APPROACH is often the best value: propagate features over the graph ONCE as a preprocessing step, then train an ordinary MLP on the propagated features — no message passing at training time at all, trivially scalable, and competitive on many benchmarks.",
          "deepDive": "That last option deserves more attention than it gets because it collapses most of the engineering difficulty. SGC and SIGN-style methods observe that a linear GCN's propagation is just a fixed sparse matrix power applied to the feature matrix, which can be computed once offline; everything after that is standard supervised learning on a wider feature vector, with all the tooling, distributed training and serving simplicity that implies. The cost is that the propagation is no longer learned and no longer interleaved with nonlinearity, which matters on some problems and not on many. In a production setting the operational advantage is large — no graph in the serving path, no neighbour fetching at inference, no sampling variance — so the honest evaluation is to compare a full GNN against precomputed propagation on your data and check whether the accuracy difference justifies the infrastructure. Frequently it does not, and the team discovers this after building the harder thing, which is the same 'do the arithmetic before choosing the architecture' point the design lessons make."
        },
        {
          "q": "When is a graph the wrong frame?",
          "a": "WHEN THE HOMOPHILY CHECK COMES BACK NEAR THE BASE RATE, which means the edges carry no information about the label and every layer of message passing is mixing in noise. That check is one line and it should precede the architecture decision, because the alternative is discovering it after building a pipeline. SECOND, WHEN THE MLP-ON-FEATURES BASELINE WINS — the graph is then not contributing, and the honest report is that a simpler model is better, which happens more often than the literature suggests because benchmarks were selected partly for having exploitable structure. THIRD, WHEN THE GRAPH IS SMALL AND DENSE ENOUGH THAT ATTENTION OVER ALL NODES IS AFFORDABLE, in which case a graph transformer with structural encodings sidesteps over-smoothing and over-squashing entirely and usually wins — the sparsity a GNN exploits is only a benefit when the graph is genuinely large. FOURTH, WHEN THE RELATIONAL STRUCTURE IS BETTER CAPTURED AS FEATURES: degree, PageRank, cluster membership, triangle counts and component size are cheap, interpretable, and feed a GBDT that will often outperform a GNN on a tabular-plus-graph problem, which is a very common shape in fraud and risk.",
          "deepDive": "That fourth case is the one most likely to be relevant in industry and least likely to be tried, because it is unglamorous. A fraud problem with a device-sharing graph usually has most of its signal in a handful of aggregate graph statistics — how many accounts share this device, how large is the connected component, what is the component's historical fraud rate — and those are columns in a table, computed by a graph query rather than learned. A GBDT over them plus the usual tabular features is fast, explainable, and competitive, and it inherits the tabular domain's advantages from the next lessons. The GNN wins when the relevant structure is genuinely higher-order and not summarizable — when it matters not just that the component is large but how it is shaped — and that is a real and narrower condition than 'we have a graph'. Testing it is straightforward: build the statistics, fit the GBDT, and make the GNN beat it. If nobody has run that comparison, the architecture choice was made by fashion."
        },
        {
          "q": "How does this lesson fit the module's theme?",
          "a": "GRAPHS GIVE THE MOST LITERAL VERSION OF THE MODULE'S SPINE: the structure IS the edges, and the leak travels along them. Homophily is what makes a graph learnable — connected nodes share labels, so a neighbour's label is evidence about yours — and that is precisely why hiding a node's own label is insufficient protection. THE DEPENDENCY THAT MAKES THE PROBLEM SOLVABLE IS THE DEPENDENCY THAT BREAKS THE EVALUATION, with no gap between the two. Measured with a 1-hop vote at 85% homophily: 0.9901 with all labels against 0.9783 with train labels only, and the mechanism generalizes with depth since a k-layer network reaches k hops. WHAT GRAPHS ADD TO THE MODULE'S ARGUMENT is that the split is not a row operation at all — it is a MASK OVER THE ADJACENCY, and for link prediction the edges being predicted must be removed from the message-passing graph entirely. Standard tooling splits rows, so it offers no protection here, which is why this domain's leaks survive careful people. THE TRANSFERABLE FORM: identify the channel through which information flows between examples, and make sure the split cuts that channel rather than merely partitioning the index.",
          "deepDive": "Stating it that way makes the whole module's pattern precise. In every domain there is a channel: time in a series, the group in clustered data, the query in search, the user in a recommender, the edge in a graph. A split cuts the index; the question is whether it cuts the channel. Random k-fold cuts the index and no channel, which is why it is wrong everywhere in this module and right for genuinely i.i.d. tabular rows. Once you see the split as cutting a channel rather than partitioning rows, the correct scheme for a new domain is derivable rather than memorized — ask what makes two examples informative about each other, and hold out along that. It also explains why feature leakage survives correct splits, which was the recommender lesson's finding: a feature computed across the boundary is a second channel that the split never touched, so cutting one and leaving the other open is exactly what the measurements kept showing."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "Message passing",
        "back": "h_v^{(k+1)} = φ(h_v^{(k)}, ⊕_{u∈N(v)} ψ(h_v, h_u)). ⊕ must be PERMUTATION-INVARIANT — a neighbourhood is a set. That invariance is the architectural prior."
      },
      {
        "type": "intuition",
        "front": "Why the aggregator matters",
        "back": "Expressiveness. SUM distinguishes multisets that MEAN and MAX cannot — GIN with sum matches 1-WL power; mean-pooled GCNs are provably weaker."
      },
      {
        "type": "formula",
        "front": "★ Why GNNs are shallow",
        "back": "OVER-SMOOTHING: receptive field ≈ d̄^k. At d̄=10, k=4 reaches 10,000 nodes and k=6 reaches 10⁶ — so representations converge. A property of repeated AVERAGING, not of gradients."
      },
      {
        "type": "definition",
        "front": "Over-squashing",
        "back": "Exponentially many nodes compressed into a fixed-width vector, so long-range information is lost REGARDLESS of depth. Jumping knowledge and rewiring target it; adding layers does not."
      },
      {
        "type": "pitfall",
        "front": "★ In a graph, the leak travels along EDGES",
        "back": "Masking a node's own label is insufficient — neighbours carry it one hop away. Measured (1-hop vote, 85% homophily): AUC **0.9901** with all labels vs **0.9783** with train only."
      },
      {
        "type": "definition",
        "front": "The three evaluation settings",
        "back": "TRANSDUCTIVE (whole graph, only test labels hidden — most benchmarks) · INDUCTIVE (test nodes unseen — what production needs) · FULLY INDUCTIVE (unseen graph). Their numbers are NOT comparable."
      },
      {
        "type": "pitfall",
        "front": "Link prediction's stricter rule",
        "back": "The edges you're predicting must be REMOVED from the message-passing graph, or the model sees the answer as input. And negatives must respect the split, or you sample held-out positives as 'negatives'."
      },
      {
        "type": "definition",
        "front": "★ Check homophily FIRST",
        "back": "h = fraction of edges joining same-label nodes. h ≫ base rate → message passing helps. h ≈ base rate → the graph is uninformative. h ≪ → HETEROPHILOUS, and a plain GCN can LOSE to an MLP."
      },
      {
        "type": "intuition",
        "front": "The three baselines before a GNN",
        "back": "MLP on features only (is the graph needed?) · label propagation (are features needed?) · **MLP + neighbour-averaged features** — cheap, no message passing, and it beats GCNs on several benchmarks."
      },
      {
        "type": "intuition",
        "front": "Scaling: precompute the propagation",
        "back": "A linear GCN's propagation is a fixed sparse matrix power — compute it ONCE offline, then train an ordinary MLP (SGC/SIGN). No graph in the serving path, no neighbour fetching, no sampling variance. Often competitive."
      },
      {
        "type": "intuition",
        "front": "When a graph is the wrong frame",
        "back": "Homophily ≈ base rate · the MLP baseline wins · the graph is small enough for a graph transformer · **the structure is summarizable as FEATURES** (degree, PageRank, component size, component fraud rate) feeding a GBDT — very common in fraud, and rarely tried."
      },
      {
        "type": "intuition",
        "front": "★ The module's spine, made precise",
        "back": "Every domain has a CHANNEL through which examples inform each other: time, group, query, user, edge. A split cuts the INDEX — the question is whether it cuts the CHANNEL. Random k-fold cuts no channel, which is why it's wrong everywhere here."
      }
    ],
    "refs": [
      {
        "title": "Hamilton, Ying & Leskovec (2017), Inductive Representation Learning on Large Graphs (GraphSAGE)",
        "url": "https://arxiv.org/abs/1706.02216"
      },
      {
        "title": "Xu, Hu, Leskovec & Jegelka (2019), How Powerful are Graph Neural Networks? (GIN)",
        "url": "https://arxiv.org/abs/1810.00826"
      },
      {
        "title": "Zhu et al. (2020), Beyond Homophily in Graph Neural Networks",
        "url": "https://arxiv.org/abs/2006.11468"
      },
      {
        "title": "Wu et al. (2019), Simplifying Graph Convolutional Networks (SGC)",
        "url": "https://arxiv.org/abs/1902.07153"
      },
      {
        "title": "Alon & Yahav (2021), On the Bottleneck of Graph Neural Networks and its Practical Implications",
        "url": "https://arxiv.org/abs/2006.05205"
      }
    ],
    "demos": [
      "gnn",
      "pagerank",
      "louvain",
      "label-propagation"
    ]
  },
  "audio-classification": {
    "level": "core",
    "body": {
      "intuition": [
        "Audio classification is mostly a decision about REPRESENTATION, and the standard answer is to stop treating it as audio. Convert the waveform to a log-mel spectrogram and you have a 2D array where one axis is time and the other is frequency, at which point a vision architecture applies directly and the whole CNN toolkit transfers.",
        "That transfer is not free, and knowing where it breaks is the substance. A spectrogram is not an image: the axes mean different things, so vertical and horizontal translation are not the same operation - shifting in time is a delay and shifting in frequency is a pitch change, and only one of those usually preserves the label. Every augmentation and pooling decision follows from that asymmetry.",
        "And this domain has the module's cleanest leak, because the recording is a group. A model that sees clips from the same speaker or the same recording session in both train and test learns the fingerprint rather than the label - measured on grouped data with a strong per-group signature and a weak true signal, AUC 0.9999 on a random clip split against 0.5807 on a group split. THAT IS +0.4192 OF OPTIMISM from the same data, model and features, and it is the single most common way an audio result fails to reproduce."
      ],
      "math": [
        {
          "h": "The representation, and why mel and log",
          "paras": [
            "The short-time Fourier transform gives time-frequency energy. The mel scale compresses frequency to match human perceptual resolution, and the log compresses amplitude to match perceptual loudness and to turn multiplicative gain into an additive offset.",
            "That last property is why log-mel is robust to recording volume: a gain change becomes a constant added to every bin, which normalization removes."
          ],
          "tex": "X(t,f)=\\Big|\\sum_n x[n]\\,w[n-t]\\,e^{-2\\pi i fn/N}\\Big|^2 \\;\\to\\; \\text{mel filterbank} \\;\\to\\; \\log(\\cdot+\\epsilon)",
          "texNote": "MFCCs add a DCT on top to decorrelate the mel bands, which mattered for GMM-HMM systems that assumed diagonal covariance. Neural networks do not need that decorrelation and it discards information, so log-mel is the modern default and MFCCs are largely legacy."
        },
        {
          "h": "The window trade is the aliasing trade",
          "paras": [
            "Window length sets time-frequency resolution and you cannot have both. A short window resolves onsets and smears pitch; a long window resolves pitch and smears onsets.",
            "Choose it from what the label depends on, not from a default."
          ],
          "tex": "\\Delta t \\cdot \\Delta f \\gtrsim \\frac{1}{4\\pi} \\quad\\Rightarrow\\quad \\text{25 ms window / 10 ms hop} \\approx 40\\ \\text{Hz resolution}",
          "texNote": "25 ms with a 10 ms hop is the speech default and it is a choice about speech, not a law. For music or machine sounds where fine pitch matters, a longer window is correct; for transient detection a shorter one is."
        },
        {
          "h": "★ The recording is the group",
          "paras": [
            "Clips from one recording share channel, microphone, room, noise floor and speaker characteristics - a fingerprint far stronger than most label signals.",
            "Measured on grouped data with exactly that structure: a strong per-group signature and a weak true label signal."
          ],
          "tex": "\\text{random CLIP split: AUC } \\mathbf{0.9999} \\qquad \\text{GROUP (speaker/recording) split: AUC } \\mathbf{0.5807}",
          "texNote": "Optimism of +0.4192, same data, same model, same features. Any label that is a property of the speaker - accent, condition, identity, sentiment tendency - becomes a lookup on the fingerprint the moment a speaker appears on both sides."
        }
      ],
      "code": [
        {
          "h": "Augmentation, and the one that respects the axes",
          "paras": [
            "The asymmetry between the axes decides which augmentations are valid, and the standard recipe encodes it."
          ],
          "code": "# SPECAUGMENT - masks applied directly on the spectrogram\n#   TIME MASKING       zero a band of time steps   -> simulates dropout/occlusion\n#   FREQUENCY MASKING  zero a band of mel bins     -> forces distributed reliance\n#   TIME WARPING       mild stretch along time     -> tempo invariance\n#   ★ note what is ABSENT: no frequency SHIFT, because shifting frequency is a\n#     pitch change and for speech that changes speaker identity, not nothing.\n\n# WAVEFORM-DOMAIN (before the transform)\n#   speed / tempo perturbation (0.9x, 1.0x, 1.1x) - the classic ASR recipe\n#   room impulse responses and additive noise at controlled SNR\n#   ★ these change the CHANNEL, which is exactly the nuisance variable the\n#     group split is protecting against - so they are the right augmentation\n#     for a model that must generalize across recordings.\n\n# ★ HORIZONTAL AND VERTICAL FLIPS ARE WRONG. Time reversal is not audio and\n#   frequency inversion is not a sound. Vision defaults do not transfer.",
          "caption": "The augmentation list is the axis asymmetry written down. Anything that treats the two axes symmetrically is importing an image prior that does not hold."
        },
        {
          "h": "The pipeline, and where the group must be tracked",
          "paras": [
            "The split has to be enforced upstream of every aggregate, exactly as in the recommender case."
          ],
          "code": "# 1 SPLIT BY RECORDING / SPEAKER FIRST, before anything else touches the data\n#     -> AUC 0.9999 vs 0.5807 is what this step is worth\n# 2 compute normalization statistics on the TRAINING split only\n#     ★ per-recording normalization (CMVN) is fine and is computed per clip;\n#       a GLOBAL mean/variance fitted on all data is a leak\n# 3 log-mel, window chosen from what the label depends on\n# 4 SpecAugment on the training split only\n# 5 a 2D CNN, or a pretrained audio backbone fine-tuned\n# 6 report per-GROUP metrics, not per-clip\n#     ★ a clip-level average over 30 clips from one speaker is one\n#       independent observation wearing thirty hats - the confidence\n#       interval computed from clip count is far too narrow\n\n# ★ Step 6 is the one people miss after fixing step 1: the split is right\n#   and the error bars are still computed as though clips were independent.",
          "caption": "Getting the split right and the standard error wrong is a common half-fix, and it produces confident comparisons between models that are indistinguishable."
        }
      ],
      "useCases": [
        "Keyword spotting and wake words, where the model runs continuously on-device and the constraint is compute rather than accuracy.",
        "Acoustic event detection - machine faults, glass breaking, infant cries - where the label is a property of the event and the recording conditions are the nuisance.",
        "Speaker and language identification, where the fingerprint that causes the leakage problem is itself the target and the split must instead hold out sessions.",
        "Medical and industrial audio, where recordings come from a small number of devices or patients and the group split is the difference between a publishable result and a real one."
      ],
      "pitfalls": [
        "Splitting by clip rather than by speaker or recording. Measured optimism of +0.4192 - AUC 0.9999 against 0.5807 - because the recording fingerprint becomes a lookup table.",
        "Computing normalization statistics over the whole dataset. Per-clip normalization is fine; a global mean and variance fitted before the split is the same aggregate leak as everywhere else in this module.",
        "Reporting clip-level confidence intervals after a group split. Thirty clips from one speaker are one independent observation, so intervals computed from clip count are far too narrow.",
        "Applying vision augmentations unchanged. Horizontal flip is time reversal and vertical flip is frequency inversion, and neither is a sound.",
        "Shifting in frequency as an augmentation. That is a pitch change, which for speech alters speaker identity rather than leaving the label invariant.",
        "Using MFCCs by default. The DCT existed to decorrelate for diagonal-covariance GMMs, discards information, and neural networks do not need it - log-mel is the modern default.",
        "Choosing the window length from a tutorial. 25 ms with a 10 ms hop is a decision about speech, and music or transient detection want different values."
      ],
      "connections": [
        {
          "ref": "multimodal/audio-representations",
          "text": "The signal-processing substance - STFT, mel filterbanks, and what each transform preserves and discards."
        },
        {
          "ref": "cnn/cnn-architectures",
          "text": "The architectures that transfer to spectrograms, and the translation-equivariance prior that transfers along one axis and not the other."
        },
        {
          "ref": "ml-theory/data-augmentation",
          "text": "The general framing - augmentation encodes an invariance you believe in - which is what makes the axis asymmetry decisive here."
        },
        {
          "ref": "ml-applications/semi-supervised",
          "text": "Where audio's labelling cost leads: unlabelled audio is abundant and transcription is expensive, which is the setting semi-supervised methods were built for."
        },
        {
          "ref": "multimodal/stt-tts",
          "text": "The sequence version of the same representation, where the model outputs a transcript rather than a class and alignment becomes the problem."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is the standard audio representation?",
          "a": "Log-mel spectrogram: STFT → mel filterbank → log. Turns audio into a 2D time-frequency array so vision architectures apply."
        },
        {
          "q": "Why log?",
          "a": "It matches perceptual loudness AND turns multiplicative gain into an additive offset — so a volume change becomes a constant that normalization removes."
        },
        {
          "q": "Why mel rather than linear frequency?",
          "a": "It compresses frequency resolution to match human perception, concentrating resolution where it carries information for speech and most natural sounds."
        },
        {
          "q": "Should you use MFCCs?",
          "a": "Usually not. The DCT existed to decorrelate for diagonal-covariance GMM-HMMs; it discards information and neural nets don't need it. Log-mel is the modern default."
        },
        {
          "q": "What does window length trade?",
          "a": "Time against frequency resolution — you cannot have both. Short windows resolve onsets and smear pitch; long windows do the reverse. 25 ms / 10 ms hop is a SPEECH choice, not a law."
        },
        {
          "q": "★ Give the group-split result.",
          "a": "Random CLIP split AUC **0.9999** vs GROUP (speaker/recording) split **0.5807** — optimism **+0.4192** on the same data, model and features."
        },
        {
          "q": "Why is the recording such a strong group?",
          "a": "Clips share channel, microphone, room, noise floor and speaker characteristics — a fingerprint far stronger than most label signals."
        },
        {
          "q": "★ What's the half-fix people stop at?",
          "a": "Fixing the split and still computing CLIP-level confidence intervals. Thirty clips from one speaker is ONE independent observation — the interval is far too narrow."
        },
        {
          "q": "Which augmentations does SpecAugment use?",
          "a": "Time masking, frequency masking, mild time warping. Note what's absent: no frequency SHIFT, because that's a pitch change."
        },
        {
          "q": "Why are flips wrong?",
          "a": "Horizontal flip is time reversal and vertical flip is frequency inversion. Neither is a sound — the axes mean different things, so vision defaults don't transfer."
        },
        {
          "q": "Which augmentation targets the leakage nuisance?",
          "a": "Waveform-domain: room impulse responses, additive noise at controlled SNR, speed perturbation. They vary the CHANNEL, which is exactly what the group split protects against."
        },
        {
          "q": "Is per-clip normalization a leak?",
          "a": "No — it's computed within a clip. A GLOBAL mean/variance fitted across the dataset before splitting is, like any pre-split aggregate."
        }
      ],
      "standard": [
        {
          "q": "How would you build an audio classifier, and where does the vision analogy break?",
          "a": "CONVERT TO A LOG-MEL SPECTROGRAM AND USE A 2D CNN, WHICH IS THE STANDARD ANSWER AND IS CORRECT. The STFT gives time-frequency energy, the mel filterbank compresses frequency to match perceptual resolution, and the log compresses amplitude — the log is doing more work than it appears, because it turns a multiplicative gain into an additive offset, so a recording-volume change becomes a constant that normalization removes. At that point you have a 2D array and the entire vision toolkit transfers. WHERE THE ANALOGY BREAKS IS THAT THE AXES ARE NOT INTERCHANGEABLE. In an image, horizontal and vertical translation are the same kind of operation; in a spectrogram, shifting along time is a delay and shifting along frequency is a pitch change, and only the first usually preserves the label. THAT ASYMMETRY DECIDES THE AUGMENTATIONS: SpecAugment uses time masking, frequency masking and mild time warping, and conspicuously does NOT use frequency shifting — because for speech, changing pitch changes speaker identity rather than nothing. Horizontal and vertical flips are simply wrong: time reversal is not audio and frequency inversion is not a sound. AND THE WINDOW LENGTH IS A MODELLING CHOICE — 25 ms with a 10 ms hop is a decision about speech, and music or transient detection want different values.",
          "deepDive": "There is a second place the analogy strains that is worth knowing: pooling and receptive fields. In an image, pooling over both axes equally is sensible because objects are roughly isotropic; in a spectrogram, pooling over frequency merges harmonics that carry timbre while pooling over time merges phonemes, and those are different losses. Architectures that treat the axes differently — separable convolutions with asymmetric kernels, or frequency-wise recurrence — often outperform a stock ResNet for that reason. The other consideration is that global pooling over time gives clip-level invariance to WHEN the event occurred, which is right for classification and wrong for detection, where you need the location; that is the same distinction as classification versus detection in vision and it usually decides the head rather than the backbone. The modern default for many tasks is now a pretrained audio backbone fine-tuned on the target task, which sidesteps most of these choices and inherits whatever the pretraining corpus's biases were — worth checking when the deployment domain is far from it, such as industrial machine sound."
        },
        {
          "q": "How do you split audio data, and why does it matter so much here?",
          "a": "BY RECORDING OR SPEAKER, BEFORE ANYTHING ELSE TOUCHES THE DATA, AND THE MEASURED COST OF GETTING IT WRONG IS THE LARGEST IN THIS MODULE. On grouped data with exactly this structure — a strong per-group signature and a weak true label signal — a random clip split gave AUC 0.9999 and a group split gave 0.5807. That is +0.4192 of optimism from the same data, the same model and the same features. THE MECHANISM IS THAT THE RECORDING IS AN EXTREMELY STRONG GROUP: clips from one session share microphone, channel response, room acoustics, noise floor and speaker characteristics, and that fingerprint is far more identifiable than most label signals. So if any label is a property of the speaker — accent, medical condition, identity, an individual's tendency toward a sentiment — putting one speaker on both sides of the split turns the fingerprint into a lookup table. THE SECOND HALF, WHICH PEOPLE MISS AFTER FIXING THE SPLIT, IS THE ERROR BARS: thirty clips from one speaker are one independent observation wearing thirty hats, so a confidence interval computed from clip count is far too narrow and will declare differences between indistinguishable models. Report per-group metrics and compute intervals over groups.",
          "deepDive": "There is a subtlety worth raising for datasets assembled from public sources, which is most academic audio data: the group may not be labelled. If clips were scraped and speaker identity was not recorded, you cannot split by speaker even though the dependency exists, and the standard mitigation is to cluster on speaker embeddings and split by cluster — imperfect, and much better than nothing. The same applies to recording session, which often correlates with upload date or file naming and can be recovered approximately. It is worth checking whether the benchmark you are comparing against did any of this, because a leaderboard where the standard split is clip-level is measuring something different from what your production system needs, and a model that wins there may lose on a group-split evaluation. That is not a criticism of the benchmark so much as a warning about transferring its numbers — which is the same reference-class discipline the trustworthy-AI module built, arriving here as a question about how a dataset was partitioned."
        },
        {
          "q": "What augmentations would you use and why?",
          "a": "TWO FAMILIES, AND THE CHOICE FOLLOWS FROM WHAT INVARIANCE YOU BELIEVE IN. ON THE SPECTROGRAM, SpecAugment: time masking, frequency masking and mild time warping. Time masking simulates occlusion and dropout of a temporal region; frequency masking forces the model to distribute reliance across bands rather than depending on one; time warping buys mild tempo invariance. What is deliberately absent is frequency SHIFTING, because that is a pitch change and for speech it alters speaker identity — the augmentation would be teaching an invariance that is false. IN THE WAVEFORM DOMAIN, before the transform: speed and tempo perturbation, additive noise at controlled signal-to-noise ratios, and convolution with room impulse responses. THOSE ARE THE MOST VALUABLE ONES FOR THIS DOMAIN because they vary the CHANNEL — microphone, room, noise floor — which is precisely the nuisance variable the group split is protecting against. So they attack the same problem from the other side: the split stops you fooling yourself, and channel augmentation makes the model actually robust to the thing you stopped fooling yourself about. AND VISION DEFAULTS DO NOT TRANSFER: horizontal flip is time reversal, vertical flip is frequency inversion, and neither is a sound.",
          "deepDive": "The pairing of group split and channel augmentation is the practical core of this lesson and it generalizes. Whenever there is a nuisance variable that groups your data — recording, hospital, camera, site — you have two complementary tools: split on it so your evaluation is honest, and augment along it so your model is robust. Doing only the first gives you an honest measurement of a fragile model; doing only the second gives you a possibly-robust model you cannot measure. Domain-adversarial training is the more aggressive version of the second, explicitly penalizing the model for being able to predict the group from its representation, which is worth reaching for when the group effect is strong and the label signal is weak — exactly the regime where the leak was worth 0.42 of AUC. It has a real cost, since forcing group-invariance can remove genuine signal when the group correlates with the label for legitimate reasons, so it needs the group-split evaluation to tell whether it helped. That mutual dependence — the fix needs the honest measurement to be evaluable — is the reason the split comes first in the pipeline."
        },
        {
          "q": "Your audio model scored well in the paper's benchmark and poorly in production. What happened?",
          "a": "THREE HYPOTHESES, IN THE ORDER I'D CHECK THEM. FIRST, THE SPLIT: if the benchmark's standard partition is clip-level and your production population is new speakers, the benchmark number is a transductive-style result and yours is inductive — measured, that difference was 0.9999 against 0.5807 on data with this structure. That single check explains most cases and is a five-minute investigation. SECOND, THE CHANNEL: benchmark audio is typically cleaner, more consistently recorded and narrower in device diversity than production audio, so the model has learned a channel-conditioned decision boundary. The tell is that performance varies enormously by device, room or SNR bucket, which is a groupby away, and the fix is channel augmentation plus a device-stratified evaluation. THIRD, THE LABEL DISTRIBUTION: benchmarks are usually balanced and production is not, so a model with good accuracy on a balanced set can have poor precision at the base rate you deploy at — which is the imbalance arithmetic from the fraud case, where a 1% FPR at a 0.1% base rate gives precision 0.083. I'D ALSO CHECK THE ERROR BARS, because a benchmark comparison computed over clips rather than speakers may never have been a real difference.",
          "deepDive": "The channel hypothesis deserves the most attention because it is the one that produces the strangest symptoms. A model that has partly learned the channel will show performance that correlates with device model, firmware version, or even geography, none of which are causally related to the label — and those correlations are invisible unless you log the metadata and slice on it. Logging device and capture parameters alongside every inference is cheap and it is the difference between diagnosing this in an afternoon and rebuilding blind. The related trap is that fixing it by adding production data to training can WORSEN the leak if the new data has its own group structure that the split does not respect; the discipline has to be applied to every data source rather than once. And the general shape here is the module's: the recording is the channel through which examples inform each other, so both the split and the robustness work have to be organized around it, and a pipeline that treats clips as independent rows will fail in both directions at once."
        },
        {
          "q": "How does this lesson fit the module's theme?",
          "a": "AUDIO GIVES THE MODULE'S LARGEST MEASURED GAP AND ITS CLEAREST GROUP STRUCTURE. The recording is a nuisance variable that is enormously identifiable — microphone, room, noise floor, voice — and any label that is a property of the speaker becomes a lookup on that fingerprint the moment a speaker appears on both sides of the split. The measurement is stark: AUC 0.9999 on a random clip split against 0.5807 on a group split, +0.4192 of optimism with nothing changed but which rows went where. THE STRUCTURE THAT MAKES THE DOMAIN TRACTABLE — that a recording is coherent, that a speaker sounds like themselves — IS EXACTLY THE STRUCTURE THAT BREAKS THE EVALUATION. WHAT AUDIO ADDS to the module's argument is the second half that survives a correct split: the ERROR BARS. Thirty clips from one speaker are one independent observation, so a group split with clip-level confidence intervals is a half-fix that produces confident comparisons between indistinguishable models. That is the same shape as the recommender lesson's feature leak — fix one channel, leave another open — and it is why 'we used a group split' is necessary and not sufficient.",
          "deepDive": "The general statement, which now has three instances in this module, is that dependence has to be handled in three places rather than one: the SPLIT decides which rows are held out, the FEATURES decide what information those rows carry, and the STANDARD ERROR decides how many independent observations you actually have. Time series violate all three through ordering; recommenders through user identity; audio through the recording. Fixing only the split is the common half-measure because it is the visible one, and the other two are silent — a leaked feature inflates the point estimate and a wrong error bar inflates confidence in it, and neither raises an exception. The one-sentence habit worth carrying out of this module: next to every metric, state the unit you held out, confirm no aggregate crossed that boundary, and compute the interval over that same unit. Three clauses, and they make a number mean something."
        },
        {
          "q": "When is a spectrogram the wrong representation?",
          "a": "WHEN PHASE MATTERS, WHEN THE TASK IS GENERATION, AND WHEN THE TIME SCALE IS WRONG FOR ANY SINGLE WINDOW. A magnitude spectrogram discards phase, which is invisible for most classification tasks and fatal for synthesis and for anything depending on precise timing relationships between channels — source separation and spatial audio both need it, which is why those systems either model phase explicitly or operate on the waveform. FOR GENERATION, inverting a magnitude spectrogram requires phase reconstruction, and the artefacts of doing so approximately are exactly why waveform-domain and neural-vocoder approaches took over. THE TIME-SCALE PROBLEM is subtler: a single window length fixes the time-frequency trade-off, so a task depending on both fine transients and fine pitch cannot be served well by any one choice, and the answers are multi-resolution representations or learned front-ends that adapt the filterbank. AND THERE IS A GROWING CASE FOR LEARNED FRONT-ENDS generally — a convolution over the raw waveform can learn a filterbank suited to the task rather than one designed around human perception, which matters most when the sounds are not the ones human hearing evolved for, such as machine faults or ultrasound.",
          "deepDive": "That last point is worth stating carefully because it is easy to over-claim. Learned front-ends have repeatedly been shown to converge toward something mel-like on speech, which is a nice validation of the mel scale and an argument AGAINST bothering for speech tasks — you pay optimization difficulty to rediscover a known answer. Where they pay is exactly where the perceptual motivation does not apply: industrial and biological sounds outside the human range, sensor data that is audio-shaped but not audio, and tasks where the relevant structure is narrowband and high-frequency. The practical rule is to use log-mel as the default and treat a learned front-end as a hypothesis to test when the domain is not human hearing, rather than as a general upgrade. It is the same discipline as everything else in this module: the representation encodes a prior about the structure, and the prior should match the domain rather than the tooling's defaults."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "The standard representation",
        "back": "Log-mel spectrogram: STFT → mel filterbank → log. Mel matches perceptual frequency resolution; **log turns multiplicative gain into an additive offset**, so volume changes become a constant normalization removes."
      },
      {
        "type": "pitfall",
        "front": "Should you use MFCCs?",
        "back": "Usually not. The DCT existed to decorrelate for diagonal-covariance GMM-HMMs. It discards information and neural nets don't need it — log-mel is the modern default and MFCCs are largely legacy."
      },
      {
        "type": "formula",
        "front": "The window trade",
        "back": "Δt·Δf ≳ 1/4π — you cannot have both. Short windows resolve onsets and smear pitch; long windows do the reverse. **25 ms / 10 ms hop is a decision about SPEECH**, not a law."
      },
      {
        "type": "pitfall",
        "front": "★ The recording is the group",
        "back": "Random CLIP split AUC **0.9999** vs GROUP split **0.5807** — **+0.4192 optimism**, same data, model and features. Clips share mic, channel, room, noise floor and voice: a fingerprint stronger than most label signals."
      },
      {
        "type": "pitfall",
        "front": "★ The half-fix after the split",
        "back": "CLIP-level confidence intervals. Thirty clips from one speaker is ONE independent observation wearing thirty hats — the interval is far too narrow and declares differences between indistinguishable models."
      },
      {
        "type": "intuition",
        "front": "Why the vision analogy breaks",
        "back": "The axes aren't interchangeable. Time shift = delay (label-preserving). Frequency shift = PITCH CHANGE (for speech, a different speaker). Every augmentation and pooling decision follows from that asymmetry."
      },
      {
        "type": "definition",
        "front": "SpecAugment — and what's absent",
        "back": "Time masking, frequency masking, mild time warping. **No frequency SHIFT** — that's a pitch change and would teach a false invariance. And no flips: time reversal isn't audio, frequency inversion isn't a sound."
      },
      {
        "type": "intuition",
        "front": "★ The augmentation that targets the leak",
        "back": "Waveform-domain: room impulse responses, additive noise at controlled SNR, speed perturbation. They vary the CHANNEL — the exact nuisance the group split protects against. Split = honest measurement; augmentation = actual robustness."
      },
      {
        "type": "pitfall",
        "front": "Normalization: which is a leak?",
        "back": "Per-clip normalization (CMVN) is fine — computed within a clip. A GLOBAL mean/variance fitted across the dataset before splitting is a pre-split aggregate, same as everywhere in this module."
      },
      {
        "type": "intuition",
        "front": "When the group isn't labelled",
        "back": "Scraped datasets often lack speaker IDs. Cluster on speaker embeddings and split by cluster — imperfect, much better than nothing. And check what split the BENCHMARK used before transferring its numbers."
      },
      {
        "type": "intuition",
        "front": "When a spectrogram is wrong",
        "back": "Phase matters (source separation, spatial audio) · generation (inverting magnitude needs phase reconstruction — hence neural vocoders) · a single window can't serve both fine transients and fine pitch."
      },
      {
        "type": "intuition",
        "front": "★ Dependence must be handled in THREE places",
        "back": "The SPLIT (which rows are held out) · the FEATURES (what information they carry) · the STANDARD ERROR (how many independent observations you have). Fixing only the split is the visible half-measure; the other two fail silently."
      }
    ],
    "refs": [
      {
        "title": "Park et al. (2019), SpecAugment: A Simple Data Augmentation Method for Automatic Speech Recognition",
        "url": "https://arxiv.org/abs/1904.08779"
      },
      {
        "title": "Hershey et al. (2017), CNN Architectures for Large-Scale Audio Classification",
        "url": "https://arxiv.org/abs/1609.09430"
      },
      {
        "title": "Gemmeke et al. (2017), AudioSet: An Ontology and Human-Labeled Dataset for Audio Events",
        "url": "https://research.google/pubs/pub45857/"
      },
      {
        "title": "Zeghidour et al. (2021), LEAF: A Learnable Frontend for Audio Classification",
        "url": "https://arxiv.org/abs/2101.08596"
      },
      {
        "title": "Gong, Chung & Glass (2021), AST: Audio Spectrogram Transformer",
        "url": "https://arxiv.org/abs/2104.01778"
      }
    ],
    "demos": [
      "spectrogram",
      "mfcc",
      "pitch-detection",
      "aliasing"
    ]
  },
  "semi-supervised": {
    "level": "core",
    "body": {
      "intuition": [
        "Semi-supervised learning uses unlabelled data to improve a supervised model, and it only works because of an ASSUMPTION about structure: that the decision boundary lies in a low-density region, that points in the same cluster share a label, or that the data lies on a manifold along which labels vary smoothly. Those three are the same idea from different directions, and unlabelled data is informative only to the extent one of them holds.",
        "That makes this the module's most explicit instance of the spine, because here the structure is not incidental to the domain - it IS the method. Where the assumption fails, unlabelled data does not merely fail to help: pseudo-labelling actively propagates the model's early mistakes, which is confirmation bias with a training loop around it.",
        "The honest framing that the field converged on is that SSL's reported gains shrink dramatically under fair comparison. Oliver et al.'s realistic-evaluation result is the reference point: give the purely supervised baseline the same tuning budget, the same augmentation and the same architecture, and much of the published advantage disappears. So the question to ask of any SSL claim is not whether it beat a baseline but whether the baseline was given the same budget."
      ],
      "math": [
        {
          "h": "The three assumptions, which are one assumption",
          "paras": [
            "Each says that the unlabelled data's geometry constrains where the boundary can be. If the geometry is uninformative about the label, none of them holds and unlabelled data cannot help.",
            "Stating which one you are relying on is the first step, because it tells you what to check."
          ],
          "tex": "\\text{cluster: } x_i,x_j\\ \\text{same cluster} \\Rightarrow y_i=y_j \\quad\\cdot\\quad \\text{low-density: } p(x)\\ \\text{small at the boundary} \\quad\\cdot\\quad \\text{manifold: } y\\ \\text{smooth along } \\mathcal{M}",
          "texNote": "The check is cheap and rarely run: cluster the unlabelled data and measure label purity within clusters on whatever labelled data you have. High purity means the assumption holds; purity near the base rate means SSL will not help and may hurt."
        },
        {
          "h": "Consistency regularization, the method that works",
          "paras": [
            "Require the model's prediction to be stable under perturbations that should not change the label. That is an augmentation-encoded invariance applied to unlabelled points, which is why SSL's success tracks augmentation quality so closely.",
            "FixMatch's contribution is the pairing: a weak augmentation produces the pseudo-label and a strong one must match it, with a confidence threshold gating which points participate."
          ],
          "tex": "\\mathcal{L}=\\mathcal{L}_{\\text{sup}} + \\lambda\\,\\mathbb{E}_{x\\sim\\mathcal{U}}\\Big[\\mathbb{1}\\{\\max p(y|\\alpha(x))>\\tau\\}\\cdot H\\big(\\hat{y}_{\\alpha(x)},\\,p(y|\\mathcal{A}(x))\\big)\\Big]",
          "texNote": "The threshold tau is doing the real work: it restricts pseudo-labelling to points the model is already confident about, which limits how fast errors can propagate. It is also why calibration matters here - an overconfident model admits bad pseudo-labels at any threshold."
        },
        {
          "h": "★ Confirmation bias, and why it compounds",
          "paras": [
            "Self-training fits on its own predictions, so an early error becomes a training label, which reinforces the error, which admits more of the same. There is no external signal in the loop to correct it.",
            "The failure is characteristically silent: training loss falls throughout and the pseudo-label distribution collapses toward whichever class the model started favouring."
          ],
          "tex": "\\hat{y}^{(t+1)} = f_{\\theta^{(t)}}(x_u) \\;\\to\\; \\theta^{(t+1)} \\;\\to\\; \\hat{y}^{(t+2)} \\quad\\text{(no external correction anywhere in the loop)}",
          "texNote": "The diagnostic to run every round is the pseudo-label CLASS DISTRIBUTION against the labelled set's prior. Drift toward one class is the tell, and it appears well before any validation metric moves."
        }
      ],
      "code": [
        {
          "h": "The check that decides whether to bother",
          "paras": [
            "One clustering run answers whether the assumption these methods depend on actually holds in your data."
          ],
          "code": "# BEFORE any SSL method:\n#   1 cluster the UNLABELLED pool (k-means, or the model's embeddings)\n#   2 measure label PURITY within each cluster using the labelled data\n#   3 compare against the base rate\n#\n#   purity >> base rate  -> cluster assumption holds, SSL should help\n#   purity ~  base rate  -> the geometry says nothing about the label;\n#                           SSL will not help and pseudo-labelling may hurt\n#\n# ★ This is the same statistic as HOMOPHILY in the graph lesson, computed\n#   over clusters instead of edges. Both answer 'does the structure I am\n#   about to exploit carry label information at all?'\n\n# AND THE OTHER PRECONDITION, which is easy to check and often false:\n#   the unlabelled pool must come from the SAME distribution as the\n#   labelled data. Class distribution mismatch - unlabelled data containing\n#   classes not in the labelled set - reliably makes SSL worse than\n#   supervised-only, which is one of the realistic-evaluation findings.",
          "caption": "Two checks, both cheap, both usually skipped. Together they predict whether the method can work before you implement it."
        },
        {
          "h": "Evaluating an SSL claim honestly",
          "paras": [
            "The realistic-evaluation protocol, which is the reason reported gains shrank when it was applied."
          ],
          "code": "# GIVE THE SUPERVISED BASELINE EVERYTHING THE SSL METHOD GETS\n#   * the same architecture\n#   * the same AUGMENTATION (strong augmentation alone explains much of\n#     the reported gain, because it is doing the regularizing)\n#   * the same TUNING BUDGET (SSL papers often tune the SSL method\n#     extensively against a lightly-tuned baseline)\n#   * a REALISTICALLY SMALL validation set - tuning on a large labelled\n#     validation set contradicts the premise that labels are scarce\n\n# AND REPORT\n#   * transfer learning as a baseline: a pretrained model fine-tuned on the\n#     labelled data alone is frequently better than SSL from scratch, and\n#     is the option a practitioner actually has\n#   * the labelled-set size sweep - SSL's advantage is largest when labels\n#     are very scarce and vanishes as they grow\n\n# ★ 'It beat the baseline' is uninformative without the baseline's budget.",
          "caption": "The validation-set point is the sharpest: tuning SSL hyperparameters on a thousand labelled examples while claiming a hundred-label regime is not a fair experiment."
        }
      ],
      "useCases": [
        "Domains where unlabelled data is nearly free and labels are expensive - audio, medical imaging, industrial sensing - which is the setting these methods were designed for.",
        "Bootstrapping a first model when a labelling budget exists but has not been spent, where active learning chooses what to label and SSL uses the rest.",
        "Exploiting a large unlabelled pool that genuinely matches the deployment distribution, which is the precondition most often violated.",
        "Deciding NOT to use SSL, which the cluster-purity check answers in an afternoon and saves a quarter."
      ],
      "pitfalls": [
        "Not checking whether the cluster assumption holds. Cluster purity near the base rate means the geometry carries no label information and SSL cannot help - the same check as homophily in the graph lesson.",
        "Comparing against an under-tuned supervised baseline. Realistic evaluation showed much of the reported advantage disappears when the baseline gets the same architecture, augmentation and tuning budget.",
        "Tuning on a large labelled validation set while claiming a label-scarce regime. That contradicts the premise and is the most common structural flaw in SSL results.",
        "Assuming the unlabelled pool matches the labelled distribution. Class mismatch - unlabelled data containing classes absent from the labelled set - reliably makes SSL worse than supervised-only.",
        "Ignoring confirmation bias. Self-training fits on its own predictions with no external correction, so an early error compounds and the tell is pseudo-label class drift, not the loss.",
        "Skipping transfer learning as a baseline. A pretrained model fine-tuned on the labelled data alone is frequently better than SSL from scratch and is the option actually available.",
        "Using a fixed confidence threshold on an uncalibrated model. The threshold is what limits error propagation, and an overconfident model admits bad pseudo-labels at any setting."
      ],
      "connections": [
        {
          "ref": "ml-applications/gnn",
          "text": "Label propagation is the graph instance of the same idea, and the homophily statistic is the cluster-purity check computed over edges."
        },
        {
          "ref": "ml-theory/data-augmentation",
          "text": "Why consistency regularization works at all - it applies an augmentation-encoded invariance to unlabelled points, so SSL's success tracks augmentation quality."
        },
        {
          "ref": "trustworthy-ai/calibration",
          "text": "Why the confidence threshold needs a calibrated model: an overconfident network admits bad pseudo-labels at any threshold, and modern networks are overconfident by default."
        },
        {
          "ref": "unsupervised-learning/kmeans",
          "text": "The clustering used for the precondition check, and the low-density intuition the cluster assumption formalizes."
        },
        {
          "ref": "multimodal/simclr-byol",
          "text": "Self-supervised pretraining, which is the alternative use of unlabelled data and frequently the stronger one - representation first, then supervised fine-tuning."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What assumption does SSL depend on?",
          "a": "That the data's geometry constrains the label: cluster (same cluster ⇒ same label), low-density (the boundary sits where p(x) is small), or manifold (y varies smoothly along it). Three views of one idea."
        },
        {
          "q": "★ How do you check it?",
          "a": "Cluster the unlabelled pool and measure label PURITY within clusters using whatever labels you have. Purity ≫ base rate → it holds. Purity ≈ base rate → SSL can't help."
        },
        {
          "q": "What is that check's analogue elsewhere?",
          "a": "HOMOPHILY in the graph lesson — the same statistic computed over edges instead of clusters. Both ask whether the structure carries label information at all."
        },
        {
          "q": "What is consistency regularization?",
          "a": "Require predictions to be stable under label-preserving perturbations, applied to unlabelled points. It's an augmentation-encoded invariance, which is why SSL tracks augmentation quality."
        },
        {
          "q": "What does FixMatch pair?",
          "a": "A WEAK augmentation produces the pseudo-label; a STRONG one must match it; a confidence threshold gates which points participate."
        },
        {
          "q": "What is the threshold actually doing?",
          "a": "Limiting how fast errors propagate — it restricts pseudo-labelling to points the model is already confident about. Which is why an uncalibrated, overconfident model breaks it at any setting."
        },
        {
          "q": "★ What is confirmation bias here?",
          "a": "Self-training fits on its own predictions, so an early error becomes a training label and reinforces itself. There is no external signal anywhere in the loop to correct it."
        },
        {
          "q": "How do you detect it?",
          "a": "Track the pseudo-label CLASS DISTRIBUTION against the labelled prior each round. Drift toward one class appears well before any validation metric moves. Training loss falls throughout."
        },
        {
          "q": "★ What did realistic evaluation show?",
          "a": "Much of SSL's reported advantage disappears when the supervised baseline gets the same architecture, augmentation and tuning budget (Oliver et al.)."
        },
        {
          "q": "Name the sharpest protocol flaw.",
          "a": "Tuning SSL hyperparameters on a large labelled validation set while claiming a hundred-label regime. It contradicts the premise that labels are scarce."
        },
        {
          "q": "When does SSL reliably HURT?",
          "a": "Class distribution mismatch — when the unlabelled pool contains classes absent from the labelled set. It reliably underperforms supervised-only."
        },
        {
          "q": "What baseline is usually missing?",
          "a": "Transfer learning. A pretrained model fine-tuned on the labelled data alone is frequently better than SSL from scratch, and it's the option a practitioner actually has."
        }
      ],
      "standard": [
        {
          "q": "When does semi-supervised learning help, and how do you know in advance?",
          "a": "IT HELPS WHEN THE UNLABELLED DATA'S GEOMETRY CARRIES INFORMATION ABOUT THE LABEL, and that is a checkable property rather than a hope. The three standard assumptions — cluster, low-density and manifold — are the same idea from different directions: that the decision boundary sits where the data is sparse, so seeing where the data IS constrains where the boundary CAN BE. If the geometry is uninformative about the label, unlabelled points tell you nothing about the boundary and no method recovers that. THE CHECK IS CHEAP AND ALMOST NEVER RUN: cluster the unlabelled pool, then measure label purity within clusters using whatever labelled data you have, and compare against the base rate. Purity well above the base rate means the assumption holds. Purity near the base rate means it does not, and pseudo-labelling will propagate noise. THAT IS THE SAME STATISTIC AS HOMOPHILY in the graph lesson, computed over clusters instead of edges — both answer whether the structure you are about to exploit carries label information at all. THE SECOND PRECONDITION is that the unlabelled pool comes from the same distribution as the labelled data: class mismatch, where the pool contains classes absent from the labelled set, reliably makes SSL worse than supervised-only.",
          "deepDive": "The distribution-match precondition is the one most often violated in practice because unlabelled data is usually collected differently from labelled data — it is whatever was cheap to gather, and the labelled set is whatever someone chose to annotate, which is frequently a curated or filtered subset. So the two differ systematically in ways nobody documented. Checking it is a domain-classifier exercise: train a model to distinguish labelled from unlabelled examples, and an AUC well above 0.5 means they are distinguishable, which is exactly the diagnostic from the distribution-shift lesson used for a different purpose. If they are distinguishable, the honest options are to subset the unlabelled pool to the overlapping region, to reweight, or to accept that SSL is being applied across a shift and expect degradation. None of that is exotic and all of it is skipped when the unlabelled pool is treated as free data rather than as a second dataset with its own provenance."
        },
        {
          "q": "Explain confirmation bias in self-training and how you would detect it.",
          "a": "SELF-TRAINING FITS ON ITS OWN PREDICTIONS, AND THERE IS NO EXTERNAL SIGNAL ANYWHERE IN THE LOOP. The model labels unlabelled points, those pseudo-labels become training targets, the model trains on them, and the next round's pseudo-labels come from a model that has been reinforced in whatever it already believed. An early error is therefore not corrected but amplified, and the amplification compounds across rounds. THE FAILURE IS CHARACTERISTICALLY SILENT: training loss falls monotonically the whole way, because the model is getting better at predicting labels it generated, and every internal signal looks healthy. THE DIAGNOSTIC IS THE PSEUDO-LABEL CLASS DISTRIBUTION compared against the labelled set's prior, checked every round. Drift toward one class is the tell, and it appears well before any validation metric moves — a model that starts slightly favouring a majority class will pseudo-label it more, train on it more, and collapse toward it. THE MITIGATIONS ARE ALL ABOUT LIMITING THE RATE: a confidence threshold so only high-certainty points participate, class-balanced pseudo-label selection so the distribution cannot drift, and a held-out labelled validation set that never enters the loop, which is the only genuinely external correction available.",
          "deepDive": "The confidence threshold is doing more work than it appears and it interacts badly with a fact from the trustworthy-AI module: modern networks are systematically overconfident, so a threshold of 0.95 admits far more than 5% error. That means the threshold is not the guarantee it looks like, and calibrating the model — temperature scaling on the labelled validation set, which took ECE from 0.087 to 0.011 there — makes the threshold mean approximately what it says. That is a genuinely useful and cheap coupling between two lessons: the SSL threshold's effectiveness depends on a calibration step nobody in the SSL literature mentions. The other mitigation worth naming is to REGENERATE pseudo-labels from scratch each round rather than accumulating them, so an early mistake can be revised rather than being frozen into the training set permanently. Accumulating is more stable and more prone to lock-in, which is the trade to state explicitly rather than inherit from an implementation."
        },
        {
          "q": "How would you evaluate a claimed SSL improvement?",
          "a": "BY CHECKING WHAT THE BASELINE WAS GIVEN, because that is where most reported gains went when the field looked properly. The realistic-evaluation protocol is the reference: give the purely supervised baseline the SAME architecture, the SAME augmentation, and the SAME tuning budget as the SSL method. Strong augmentation alone explains a large share of the reported advantage in several methods, because the augmentation is doing the regularizing and the SSL machinery is along for the ride — so a baseline trained without it is not a comparison. AND THE TUNING BUDGET MATTERS ENORMOUSLY: SSL papers frequently tune their method extensively against a lightly-tuned baseline, which is a comparison of effort rather than of methods. THE SHARPEST PROTOCOL FLAW is the validation set: tuning SSL hyperparameters on a large labelled validation set while claiming a hundred-label regime contradicts the premise. If labels were that scarce you would not have a thousand of them to tune on, so the reported regime is not the regime the method was developed in. I'D ALSO REQUIRE TRANSFER LEARNING AS A BASELINE, since a pretrained model fine-tuned on the labelled data alone is frequently better than SSL from scratch and is the option a practitioner actually has, and a labelled-set-size sweep, because SSL's advantage is largest when labels are very scarce and shrinks as they grow.",
          "deepDive": "That last sweep is the most informative single plot in an SSL evaluation and it is often absent. Performance against labelled-set size, with and without the method, shows where the crossover is — and the crossover is the decision-relevant quantity, because it tells you whether to spend the next month on the method or on labelling. If SSL buys the equivalent of three hundred extra labels and three hundred labels cost a week of annotation, the method is not worth implementing, and that comparison is the one a manager should be shown. Framing SSL's value in LABEL-EQUIVALENT terms rather than in accuracy points makes it directly comparable to the alternative use of the budget, which is the argument that actually decides projects. It also connects to active learning, which spends the labelling budget more efficiently rather than avoiding it, and the two are complements rather than competitors: choose what to label with active learning, use the rest with SSL, and measure both against simply labelling randomly."
        },
        {
          "q": "SSL or self-supervised pretraining?",
          "a": "USUALLY PRETRAINING FIRST, AND THE DISTINCTION IS WORTH KEEPING SHARP BECAUSE THE TERMS GET CONFLATED. Self-supervised pretraining learns a REPRESENTATION from unlabelled data using a pretext task — contrastive, masked prediction, or a generative objective — with no reference to the downstream labels, and then you fine-tune supervised on the labelled set. Semi-supervised learning uses unlabelled data DURING supervised training, with the labels shaping how the unlabelled data is used. THE PRACTICAL ARGUMENT FOR PRETRAINING is that the representation is reusable across tasks, the training is stable and has no confirmation-bias loop, and the pretrained model can come from someone else's compute — which is decisive, since a strong public backbone plus fine-tuning on your labels is a very high baseline that costs almost nothing. THE ARGUMENT FOR SSL is that it uses unlabelled data from YOUR distribution specifically, which matters when the deployment domain is far from any available pretraining corpus — industrial sensing, specialized medical imaging, proprietary signal data. THEY COMPOSE: pretrain on the unlabelled pool, fine-tune on labels, then apply consistency regularization on the remaining unlabelled data, and each step is checkable independently.",
          "deepDive": "The honest current state is that for images, text and audio, pretraining has largely absorbed the practical role SSL was invented for, because public backbones cover so much of the input space that starting from scratch is rarely correct. Where SSL retains a clear edge is narrow domains with abundant unlabelled in-distribution data and no relevant pretrained model — and that set is shrinking as multimodal backbones broaden. That is not a reason to dismiss the methods; it is a reason to sequence the evaluation properly, since a paper comparing SSL-from-scratch against supervised-from-scratch answers a question nobody faces. The related point for a practitioner is that the two use unlabelled data for different things: pretraining learns what the input space looks like, SSL learns where the boundary is. If your problem is that the model does not understand the inputs, pretraining is the fix; if it understands the inputs and has too few labels to place the boundary, SSL is. Diagnosing which of those you have takes one experiment — fine-tune a pretrained backbone and see whether the remaining error looks like representation failure or boundary uncertainty."
        },
        {
          "q": "How does this lesson fit the module's theme?",
          "a": "IT IS THE MODULE'S SPINE IN ITS PUREST FORM, BECAUSE HERE THE STRUCTURE IS NOT INCIDENTAL TO THE DOMAIN — IT IS THE METHOD. Time series exploit ordering, graphs exploit edges, audio exploits the recording's coherence; those are properties of the data that a method uses. Semi-supervised learning has no content beyond the structural assumption: unlabelled data helps if and only if the geometry constrains the label, and the cluster, low-density and manifold assumptions are three ways of saying that. So the question 'does the structure I am exploiting actually hold' is not a caveat here, it is the entire feasibility check — and it is answered by one clustering run and a purity comparison against the base rate. WHAT THIS LESSON ADDS is the failure direction. In the other domains, ignoring the structure produced an over-optimistic MEASUREMENT — 0.9999 against 0.5807, or a centred window hiding a harm. Here, a structure that does not hold makes the MODEL ITSELF worse, because pseudo-labelling propagates errors with no external correction. THE STRUCTURE IS THE PRIOR AND THE TRAP, and when the prior is false the trap closes on the model rather than on the evaluation.",
          "deepDive": "That distinction is worth carrying because it changes what the check buys you. In the leakage domains, checking the structure protects your knowledge of how good the model is; the model itself is unaffected. In SSL — and in the graph lesson's heterophily case, which is the same shape — checking the structure protects the model. Those are different stakes and they justify different amounts of effort: a wrong split costs you a bad decision, and a wrong structural assumption costs you a worse model than you started with. The pleasing part is that both checks are the same statistic in different clothing, cluster purity and homophily, and both are one line. If this module leaves one operational habit, it should be to compute the structure statistic before choosing the method — purity for clustered data, homophily for graphs, autocorrelation for series, group signature strength for grouped data — because it decides both whether the method can work and how the evaluation must be built."
        },
        {
          "q": "What would you actually do with a large unlabelled pool and a small labelling budget?",
          "a": "SPEND THE BUDGET WELL BEFORE TRYING TO AVOID SPENDING IT. FIRST, THE TWO CHECKS: cluster purity against the base rate, which says whether the geometry is informative, and a domain classifier between labelled and unlabelled data, which says whether they are the same distribution. Together they take an afternoon and they determine whether anything downstream can work. SECOND, THE STRONGEST CHEAP BASELINE: a pretrained backbone fine-tuned on whatever labels exist. That is usually better than SSL from scratch and it costs an afternoon. THIRD, SPEND THE LABELLING BUDGET WITH ACTIVE LEARNING rather than randomly — uncertainty or coreset selection typically reaches a given accuracy with meaningfully fewer labels, and unlike SSL it adds real information rather than redistributing existing information. FOURTH, APPLY CONSISTENCY REGULARIZATION on the remaining unlabelled data, with a calibrated confidence threshold and class-balanced selection, monitoring pseudo-label class drift every round. AND THROUGHOUT, MEASURE IN LABEL-EQUIVALENT TERMS: how many labels is this method worth? That number is comparable to the cost of annotation and is the one that decides whether to continue.",
          "deepDive": "The active-learning caveat worth stating is that it interacts badly with the evaluation discipline this module is built on. An actively-selected labelled set is not a random sample of the population — it is deliberately concentrated on hard or uncertain regions — so a validation set drawn from it is biased and will understate performance, sometimes substantially. The fix is to keep a separate randomly-sampled labelled set purely for evaluation, spent from the same budget and never used for training or selection. That feels wasteful and is the only way to know what the model does on the actual population, which is the same argument as the permanent randomized holdout in the recommender lesson and the random allow-through slice in the fraud case — the third appearance of 'reserve a random sample or you cannot measure anything' in this curriculum. When a recommendation recurs that often across unrelated domains, it has stopped being domain advice and become a principle."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "★ SSL's three assumptions (which are one)",
        "back": "CLUSTER (same cluster ⇒ same label) · LOW-DENSITY (the boundary sits where p(x) is small) · MANIFOLD (y varies smoothly along it). Unlabelled data helps iff the geometry constrains the label."
      },
      {
        "type": "intuition",
        "front": "★ The feasibility check",
        "back": "Cluster the unlabelled pool, measure label PURITY within clusters, compare to the base rate. Purity ≫ base rate → SSL should help. Purity ≈ base rate → it can't, and pseudo-labelling will propagate noise."
      },
      {
        "type": "intuition",
        "front": "Its analogue elsewhere",
        "back": "HOMOPHILY in the graph lesson — the same statistic over edges instead of clusters. Both ask: does the structure I'm about to exploit carry label information at all?"
      },
      {
        "type": "formula",
        "front": "Consistency regularization / FixMatch",
        "back": "L = L_sup + λ·E_u[ 1{max p(y|α(x)) > τ} · H(ŷ_α, p(y|A(x))) ]. WEAK augmentation makes the pseudo-label, STRONG must match, and τ gates participation."
      },
      {
        "type": "pitfall",
        "front": "★ The threshold needs a CALIBRATED model",
        "back": "τ limits how fast errors propagate — but modern nets are systematically overconfident, so τ=0.95 admits far more than 5% error. Temperature scaling (ECE 0.087→0.011) makes the threshold mean what it says."
      },
      {
        "type": "pitfall",
        "front": "Confirmation bias",
        "back": "Self-training fits on its OWN predictions with no external signal in the loop, so early errors amplify. Training loss falls monotonically the whole time — every internal signal looks healthy."
      },
      {
        "type": "intuition",
        "front": "How to detect it",
        "back": "Track the pseudo-label CLASS DISTRIBUTION against the labelled prior each round. Drift appears well before any validation metric moves. Fixes: class-balanced selection, and REGENERATE pseudo-labels each round rather than accumulating."
      },
      {
        "type": "pitfall",
        "front": "★ What realistic evaluation showed",
        "back": "Much of SSL's reported advantage disappears once the supervised baseline gets the same architecture, augmentation and TUNING BUDGET (Oliver et al.). Strong augmentation alone explains much of the gain."
      },
      {
        "type": "pitfall",
        "front": "The sharpest protocol flaw",
        "back": "Tuning SSL hyperparameters on a LARGE labelled validation set while claiming a hundred-label regime. If labels were that scarce you wouldn't have a thousand to tune on."
      },
      {
        "type": "pitfall",
        "front": "When SSL reliably HURTS",
        "back": "Class distribution mismatch — the unlabelled pool contains classes absent from the labelled set. Check it with a domain classifier between labelled and unlabelled data (AUC ≫ 0.5 = distinguishable)."
      },
      {
        "type": "intuition",
        "front": "Report in LABEL-EQUIVALENT terms",
        "back": "\"This method is worth ~300 labels.\" That's directly comparable to the cost of annotation and is the number that decides the project — unlike accuracy points, which aren't."
      },
      {
        "type": "intuition",
        "front": "★ The failure direction is different here",
        "back": "Elsewhere, ignoring the structure gives an over-optimistic MEASUREMENT. Here a false assumption makes the MODEL worse. A wrong split costs a bad decision; a wrong structural assumption costs you a worse model than you started with."
      }
    ],
    "refs": [
      {
        "title": "Oliver, Odena, Raffel, Cubuk & Goodfellow (2018), Realistic Evaluation of Deep Semi-Supervised Learning Algorithms",
        "url": "https://arxiv.org/abs/1804.09170"
      },
      {
        "title": "Sohn et al. (2020), FixMatch: Simplifying Semi-Supervised Learning with Consistency and Confidence",
        "url": "https://arxiv.org/abs/2001.07685"
      },
      {
        "title": "Chapelle, Scholkopf & Zien (2006), Semi-Supervised Learning",
        "url": "https://mitpress.mit.edu/9780262033589/semi-supervised-learning/"
      },
      {
        "title": "Arazo et al. (2020), Pseudo-Labeling and Confirmation Bias in Deep Semi-Supervised Learning",
        "url": "https://arxiv.org/abs/1908.02983"
      },
      {
        "title": "Chen, Kornblith, Norouzi & Hinton (2020), A Simple Framework for Contrastive Learning of Visual Representations (SimCLR)",
        "url": "https://arxiv.org/abs/2002.05709"
      }
    ],
    "demos": [
      "label-propagation",
      "active-learning",
      "coreset",
      "kmeans"
    ]
  },
  "multi-task": {
    "level": "core",
    "body": {
      "intuition": [
        "Multi-task learning shares a representation across tasks and hopes that what one task learns helps the others. The structure being exploited is TASK RELATEDNESS - that the tasks depend on overlapping features of the input - and it is an assumption exactly like homophily or the cluster assumption, checkable in advance and frequently false.",
        "When it holds, the sharing acts as a regularizer: each task's data constrains the shared representation, so tasks with little data borrow structure from tasks with plenty. When it does not hold, you get NEGATIVE TRANSFER - a shared trunk forced to serve incompatible objectives does both jobs worse than two separate models would, and the aggregate metric can improve while the task you care about degrades.",
        "The engineering reality is that most of the difficulty is not architectural but arithmetic: losses on different scales, tasks with different amounts of data, and gradients that conflict. A regression loss in the thousands and a cross-entropy near one mean the model is optimizing the first and ignoring the second regardless of what the architecture diagram says, and that is the most common way a multi-task model quietly becomes a single-task model."
      ],
      "math": [
        {
          "h": "The objective, and where the difficulty lives",
          "paras": [
            "A weighted sum of per-task losses over a shared trunk. Everything hard about multi-task learning is in the weights and in what the shared parameters are asked to do.",
            "Fixed equal weights are almost never right, because the losses are on different scales and the tasks have different amounts of data."
          ],
          "tex": "\\mathcal{L}(\\theta_{\\text{shared}},\\{\\theta_t\\}) = \\sum_{t} w_t\\,\\mathcal{L}_t\\big(f_{\\theta_t}(g_{\\theta_{\\text{shared}}}(x)),\\,y_t\\big)",
          "texNote": "If one loss is on the scale of thousands and another near one, the first dominates the shared gradient entirely. That is not a subtle effect - it means the second task's head trains and the shared trunk does not serve it."
        },
        {
          "h": "Uncertainty weighting, the principled default",
          "paras": [
            "Learn a per-task noise scale and weight each loss by its inverse, with a log penalty preventing the trivial solution of sending every weight to zero.",
            "It handles the scale problem automatically and gives noisy tasks less influence, which is usually what you want."
          ],
          "tex": "\\mathcal{L}=\\sum_t \\frac{1}{2\\sigma_t^2}\\mathcal{L}_t + \\log\\sigma_t \\qquad (\\sigma_t \\text{ learned})",
          "texNote": "The interpretation is a Gaussian likelihood per task with learned observation noise. Tasks whose loss cannot be reduced get large sigma and small weight, which is the correct behaviour and also means a genuinely hard task quietly stops contributing."
        },
        {
          "h": "★ Negative transfer, and the check for it",
          "paras": [
            "The comparison that matters is per-task against a single-task baseline, not an aggregate against nothing. An average across tasks hides the case where one task gained and the one you care about lost.",
            "Gradient conflict is the mechanism: when two tasks' gradients on the shared parameters point in opposing directions, progress on one costs the other."
          ],
          "tex": "\\cos\\big(\\nabla_{\\theta_{\\text{shared}}}\\mathcal{L}_i,\\ \\nabla_{\\theta_{\\text{shared}}}\\mathcal{L}_j\\big) < 0 \\;\\Longrightarrow\\; \\text{the tasks are fighting over the trunk}",
          "texNote": "Logging that cosine per task pair during training is cheap and diagnostic. Persistently negative values mean the tasks do not belong in the same trunk, and no loss-weighting scheme fixes a genuine conflict - it only chooses who wins."
        }
      ],
      "code": [
        {
          "h": "The architectural choices, from most to least sharing",
          "paras": [
            "How much to share is the main design decision and it should follow from how related the tasks are."
          ],
          "code": "# HARD SHARING      one trunk, per-task heads. Maximum regularization,\n#                   maximum risk of negative transfer. The default.\n# SOFT SHARING      per-task towers with a penalty tying their weights\n#                   together. More capacity, less interference, more params.\n# MMoE              a set of expert subnetworks with per-task GATES, so each\n#                   task learns WHICH experts to use.\n#                   ★ this is the design that made multi-task ranking work in\n#                     production - it lets unrelated tasks route around each\n#                     other instead of fighting over one trunk\n# PLE / CGC         MMoE plus task-SPECIFIC experts alongside the shared ones,\n#                   which bounds how much any task can damage the others\n\n# ★ The trend across these is the same idea: give conflicting tasks somewhere\n#   to go. Hard sharing forces a compromise; gating lets tasks opt out.",
          "caption": "MMoE-style gating is the practical answer to negative transfer, because it converts an all-or-nothing sharing decision into a learned, per-task one."
        },
        {
          "h": "The split, and the leak specific to this setting",
          "paras": [
            "Multi-task data usually has the same example appearing under several tasks, which creates a channel most pipelines do not close."
          ],
          "code": "# THE SHARED-EXAMPLE LEAK\n#   the same underlying entity - a user, a document, an image - often\n#   carries labels for several tasks. Split PER TASK independently and the\n#   entity lands in task A's train set and task B's test set.\n#   -> the shared trunk has seen it, so task B's evaluation is compromised\n#   Fix: split ONCE at the ENTITY level, then derive every task's split\n#        from that partition.\n\n# AND THE REPORTING RULE\n#   compare PER TASK against a SINGLE-TASK baseline trained on the same\n#   data with the same budget. An aggregate across tasks is meaningless:\n#   it can improve while the task you care about degrades.\n\n# ★ Log cos(grad_i, grad_j) on the shared parameters during training.\n#   Persistently negative -> the tasks are fighting, and loss weighting\n#   will only choose a winner rather than resolve it.",
          "caption": "One entity-level split derived down to every task is the whole fix, and it is a pipeline structure rather than a per-task decision."
        }
      ],
      "useCases": [
        "Recommendation and ranking with several objectives - click, watch time, like, share, report - where MMoE-style gating is the production standard precisely because the objectives conflict.",
        "Any setting with an abundant proxy label and a scarce target label, where the proxy task regularizes a representation the scarce task could not learn alone.",
        "Multi-output prediction where the outputs are structurally linked - joint detection and segmentation, or depth and normals - and sharing is nearly free.",
        "Deployment efficiency, where one trunk serving five heads is the difference between one model in production and five, which is often the real motivation."
      ],
      "pitfalls": [
        "Fixed equal loss weights. A regression loss in the thousands and a cross-entropy near one means the first dominates the shared gradient entirely and the second task's trunk never trains.",
        "Reporting an aggregate across tasks. It can improve while the task you care about degrades, which is the aggregation failure this curriculum keeps finding, applied to tasks instead of subgroups.",
        "Not comparing against single-task baselines. Negative transfer is only visible against a per-task baseline trained with the same data and budget.",
        "Splitting per task independently. The same entity then appears in one task's training set and another's test set, and the shared trunk has seen it - split once at the entity level and derive from there.",
        "Expecting loss weighting to fix gradient conflict. A persistently negative cosine between task gradients means the tasks are fighting, and weighting only chooses a winner.",
        "Adding tasks because data is available. Relatedness is an assumption, and an unrelated task consumes trunk capacity and can damage every other task.",
        "Ignoring that uncertainty weighting down-weights hard tasks. A task whose loss cannot be reduced gets a large learned sigma and quietly stops contributing, which is correct behaviour and often not what you wanted."
      ],
      "connections": [
        {
          "ref": "neural-nets/loss-functions",
          "text": "Why loss scale determines gradient magnitude, which is the mechanism behind the most common multi-task failure."
        },
        {
          "ref": "ml-theory/bias-variance",
          "text": "Multi-task sharing as a regularizer - each task's data constrains the shared representation, trading a little bias for variance reduction."
        },
        {
          "ref": "ml-applications/neural-recommenders",
          "text": "Where MMoE became standard: multi-objective ranking, with conflicting engagement objectives fighting over one trunk."
        },
        {
          "ref": "ml-applications/time-series",
          "text": "Global forecasting models across a panel of series, which is multi-task learning with the series as the task."
        },
        {
          "ref": "fine-tuning/adapters",
          "text": "The parameter-efficient version of the same trade - a shared frozen trunk with small per-task modules, which bounds interference by construction."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What structure does multi-task learning exploit?",
          "a": "TASK RELATEDNESS — that the tasks depend on overlapping features of the input. An assumption like homophily or the cluster assumption, checkable and frequently false."
        },
        {
          "q": "When it holds, what does sharing buy?",
          "a": "Regularization. Each task's data constrains the shared representation, so data-poor tasks borrow structure from data-rich ones."
        },
        {
          "q": "★ What is negative transfer?",
          "a": "A shared trunk forced to serve incompatible objectives does both jobs worse than separate models. And the aggregate metric can improve while the task you care about degrades."
        },
        {
          "q": "How do you detect it?",
          "a": "Compare PER TASK against a single-task baseline with the same data and budget. An aggregate across tasks is meaningless for this."
        },
        {
          "q": "What is the mechanism?",
          "a": "Gradient conflict: cos(∇L_i, ∇L_j) < 0 on the SHARED parameters means progress on one task costs the other. Log it per task pair — it's cheap and diagnostic."
        },
        {
          "q": "Does loss weighting fix conflict?",
          "a": "No — it only chooses a winner. A persistently negative cosine means the tasks don't belong in the same trunk."
        },
        {
          "q": "★ What's wrong with fixed equal loss weights?",
          "a": "Scale. A regression loss in the thousands and a cross-entropy near one means the first dominates the shared gradient entirely — the second task's head trains and the trunk doesn't serve it."
        },
        {
          "q": "Give the uncertainty-weighting objective.",
          "a": "L = Σ_t (1/2σ_t²)·L_t + log σ_t, with σ_t learned. A Gaussian likelihood per task with learned observation noise; the log term prevents σ → ∞."
        },
        {
          "q": "What's its side effect?",
          "a": "A task whose loss can't be reduced gets a large σ and small weight — it quietly stops contributing. Correct behaviour, and often not what you wanted."
        },
        {
          "q": "What is MMoE?",
          "a": "Expert subnetworks with per-task GATES, so each task learns which experts to use. It lets conflicting tasks route AROUND each other instead of fighting over one trunk."
        },
        {
          "q": "★ Name the split leak specific to this setting.",
          "a": "The SHARED EXAMPLE. Split per task independently and one entity lands in task A's train and task B's test — the shared trunk has seen it. Split once at the ENTITY level and derive every task's split from that."
        },
        {
          "q": "Why is multi-task often adopted anyway?",
          "a": "Deployment efficiency — one trunk with five heads instead of five models. Frequently the real motivation, and a legitimate one, but it should be stated rather than dressed as accuracy."
        }
      ],
      "standard": [
        {
          "q": "When does multi-task learning help, and when does it hurt?",
          "a": "IT HELPS WHEN THE TASKS ARE GENUINELY RELATED — when they depend on overlapping features of the input, so that learning one constrains the shared representation in a way the others benefit from. In that regime the sharing acts as a regularizer, and the biggest gains go to data-poor tasks that borrow structure from data-rich ones. THAT RELATEDNESS IS AN ASSUMPTION, exactly like homophily in the graph lesson or the cluster assumption in the semi-supervised one, and it is frequently false. WHEN IT FAILS YOU GET NEGATIVE TRANSFER: a shared trunk asked to serve incompatible objectives does both jobs worse than two separate models would. THE MECHANISM IS GRADIENT CONFLICT — when two tasks' gradients on the shared parameters point in opposing directions, every step that helps one hurts the other, and logging the cosine between per-task gradients on the shared trunk makes it directly observable. Persistently negative values mean the tasks are fighting, and no loss-weighting scheme resolves that; weighting only chooses which task wins. THE DETECTION DISCIPLINE IS PER-TASK COMPARISON against single-task baselines trained on the same data with the same budget, because an aggregate across tasks can improve while the task you actually care about degrades.",
          "deepDive": "That aggregate failure is the same one this curriculum keeps finding — the average hiding a subgroup — applied to tasks rather than to people, and it is worth noticing that it recurs because the structure is identical: a weighted mean over heterogeneous units conceals reversals in the units. The architectural response to conflict is to give tasks somewhere to go rather than forcing a compromise, which is what MMoE does: a pool of expert subnetworks with per-task gating, so each task learns which experts to route through and unrelated tasks can simply stop sharing. That design is what made multi-task ranking practical in production recommenders, where engagement objectives genuinely conflict — optimizing for watch time and for reports pulls in opposite directions by construction. PLE and CGC extend it with task-specific experts alongside the shared pool, which bounds how much any one task can damage the others. The trend across all of them is the same recognition: hard parameter sharing makes an all-or-nothing decision, and the useful generalization is to make sharing learned and partial."
        },
        {
          "q": "How would you set the loss weights?",
          "a": "NOT BY HAND, AND CERTAINLY NOT EQUALLY, because the losses are on different scales and equal weights therefore encode an arbitrary priority. If a regression loss sits in the thousands and a cross-entropy near one, the regression dominates the shared gradient entirely — the classification head still trains, since its own parameters see its own gradient, but the shared trunk is optimized almost exclusively for the regression task. That is the most common way a multi-task model quietly becomes a single-task model with extra heads, and the architecture diagram gives no hint of it. THE PRINCIPLED DEFAULT IS UNCERTAINTY WEIGHTING: learn a per-task noise scale and weight each loss by one over twice its square, with a log-sigma penalty preventing the degenerate solution of sending every weight to zero. It is a Gaussian likelihood per task with learned observation noise, it handles the scale problem automatically, and it gives noisy tasks less influence. ITS SIDE EFFECT IS WORTH KNOWING: a task whose loss cannot be reduced — because it is genuinely hard or its labels are noisy — gets a large sigma and a small weight, so it quietly stops contributing. That is correct behaviour under the model and frequently not what you intended, so the learned sigmas should be logged and inspected rather than trusted.",
          "deepDive": "The alternatives worth knowing solve different parts of the problem. GradNorm balances the gradient MAGNITUDES rather than the loss scales, which is closer to the actual mechanism, since what matters is the size of each task's contribution to the shared update rather than its loss value. PCGrad addresses conflict directly by projecting each task's gradient onto the normal plane of any conflicting task's gradient, removing the opposing component — which helps when conflict is intermittent and cannot manufacture compatibility when it is structural. And the simplest option, which is often competitive and rarely tried, is to normalize each loss by its running mean so all tasks contribute on a comparable scale, then tune a small number of relative priorities by hand from product requirements. That last one has the advantage of being interpretable: the weights encode a stated business priority rather than an emergent one, which matters when someone eventually asks why the model favours one objective. In production ranking systems the weights are usually a product decision dressed as a hyperparameter, and making that explicit is worth more than an automatic scheme."
        },
        {
          "q": "How do you split data for a multi-task problem?",
          "a": "ONCE, AT THE ENTITY LEVEL, AND DERIVE EVERY TASK'S SPLIT FROM THAT PARTITION. The leak specific to this setting is the SHARED EXAMPLE: the same underlying entity — a user, a document, an image, a molecule — commonly carries labels for several tasks, and if you split each task's dataset independently, that entity lands in task A's training set and task B's test set. The shared trunk has then seen the entity during training, so task B's evaluation is compromised even though task B's labels were held out correctly. IT IS THE MODULE'S PATTERN AGAIN: the dependency channel here is the entity, the split has to cut that channel, and a per-task split cuts the index without cutting the channel. THE FIX IS A PIPELINE STRUCTURE rather than a per-task decision — partition entities once, then every task's train, validation and test sets are the labels attached to entities in the corresponding partition. THAT ALSO FIXES THE STANDARD-ERROR QUESTION, because the independent unit is the entity rather than the task-example, so metrics should be aggregated with that in mind when one entity contributes to several tasks. AND THE REPORTING RULE STANDS: per-task metrics against per-task single-task baselines, never an aggregate.",
          "deepDive": "There is a second-order version worth watching for in settings where tasks have very unequal data. If task A has ten million examples and task B has ten thousand, then even with a correct entity-level split, task B's evaluation is noisy enough that negative transfer on it may be undetectable — you can degrade the small task meaningfully and see nothing, because its confidence interval is wide. The practical response is to size the evaluation set for the SMALLEST task rather than proportionally, which sometimes means deliberately over-sampling small tasks into the held-out set, and to report intervals rather than point estimates so the comparison against the single-task baseline is honest about what it can detect. That is the minimum-detectable-effect discipline from the experimentation module applied to model comparison, and it is the reason a multi-task change can be shipped while quietly damaging a low-volume but important objective — which in a ranking system is usually the safety or quality objective rather than the engagement one."
        },
        {
          "q": "What architecture would you use, and why has the field moved?",
          "a": "I'D START WITH HARD SHARING AND MOVE TOWARD GATING IF CONFLICT SHOWS UP, and the movement in the field is exactly that trajectory. HARD SHARING — one trunk, per-task heads — is the simplest, gives maximum regularization, and carries maximum risk of negative transfer, because every task's gradient hits the same parameters and a conflict has nowhere to go. SOFT SHARING gives each task its own tower with a penalty tying weights together, which reduces interference at the cost of parameters and of a coupling strength to tune. MMoE replaces the single trunk with a pool of expert subnetworks and a per-task GATE, so each task learns which experts to use — and that is the design change that made multi-task ranking work in production, because it converts an all-or-nothing sharing decision into a learned, per-task, partial one. Unrelated tasks route around each other rather than fighting. PLE AND CGC go further by adding task-specific experts alongside the shared pool, which bounds how much any single task can damage the others by construction. THE THROUGH-LINE IS THE SAME RECOGNITION: hard sharing forces a compromise, and the useful generalization is to let the model decide how much to share per task.",
          "deepDive": "There is a parameter-efficiency framing of the same idea that has become more prominent: a large frozen shared trunk with small per-task adapter modules, which is the fine-tuning module's territory and is structurally multi-task learning with sharing fixed at 100% for the trunk and 0% for the adapters. That bounds interference completely — tasks cannot damage each other because they cannot modify anything shared — at the cost of giving up the regularization benefit that motivated sharing in the first place. Which end of that spectrum is right depends entirely on whether the tasks are related, which returns to the assumption check. It is also worth naming the real reason many multi-task systems exist, which is neither accuracy nor regularization: SERVING COST. One trunk with five heads is one model in production rather than five, with one deployment, one monitoring stack and one latency budget, and that is frequently the actual motivation. It is a legitimate one and it should be stated rather than dressed up as a modelling argument, because if efficiency is the goal then a small per-task accuracy loss may be entirely acceptable and the evaluation should say so."
        },
        {
          "q": "How does this lesson fit the module's theme?",
          "a": "THE STRUCTURE IS TASK RELATEDNESS, AND IT IS BOTH THE PRIOR AND THE TRAP IN THE SAME WAY THE OTHERS ARE. When tasks share the features that matter, the shared trunk is a regularizer and data-poor tasks benefit from data-rich ones — that is the prior, and it is why anyone does this. WHEN THEY DO NOT, the shared trunk is a contested resource and you get negative transfer, which the aggregate metric hides because it averages over tasks exactly as an aggregate metric averages over subgroups. THE TRAP HAS A SECOND FORM HERE that is purely about evaluation: the SHARED EXAMPLE. Split each task independently and one entity is in task A's train set and task B's test set, so the trunk has seen it — the dependency channel is the entity, and a per-task split cuts the index without cutting the channel. THAT IS THE MODULE'S PATTERN STATED PRECISELY for the fourth time, and by now it should be derivable rather than memorized: identify what makes two examples informative about each other, and split along that. Here it is the entity; in a graph it was the edge; in audio the recording; in a series, time.",
          "deepDive": "Multi-task also completes the module's set of failure directions, which is worth collecting. In time series, recommenders and audio, a wrong structural treatment produced an over-optimistic MEASUREMENT while the model itself was unaffected. In semi-supervised learning and in heterophilous graphs, a false structural assumption made the MODEL worse. Multi-task has both at once: the shared-example leak inflates the measurement, and negative transfer degrades the model, and they can occur in the same system without either being visible in an aggregate number. That is the strongest argument in the module for the three-part discipline — check the structural assumption before choosing the method, cut the dependency channel in the split, and report per unit rather than in aggregate. Any one of the three alone leaves a channel open, and this lesson is where all three are needed simultaneously."
        },
        {
          "q": "Product wants to add a sixth objective to a ranking model. What do you say?",
          "a": "I'D ASK WHAT IT IS EXPECTED TO TRADE AGAINST, BECAUSE ADDING AN OBJECTIVE IS ALWAYS A TRADE and the useful conversation is about which one. Then three concrete things. FIRST, MEASURE RELATEDNESS BEFORE BUILDING: train the new task standalone, then log the cosine between its gradient and the existing tasks' gradients on the shared trunk. Persistently negative means it will fight, and the architecture answer is a gated design where it can route around the others rather than a shared trunk where it cannot. SECOND, SET THE EVALUATION UP FOR NEGATIVE TRANSFER SPECIFICALLY: per-task metrics against the current production model, with intervals sized for the SMALLEST-volume objective, because that is where damage will be undetectable otherwise and it is usually the quality or safety objective rather than the engagement one. THIRD, BE EXPLICIT THAT THE LOSS WEIGHT IS A PRODUCT DECISION rather than a hyperparameter — it encodes how much of objective A you will give up for objective B, and that number should be owned by someone rather than tuned to maximize an aggregate. AND I'D CHECK WHETHER THE MOTIVATION IS ACCURACY OR SERVING COST, because if it is cost then a small per-task loss may be acceptable and the framing changes entirely.",
          "deepDive": "The loss-weight-as-product-decision point is the one worth pressing hardest, because it is where multi-task ranking systems accumulate silent policy. Every weight is a statement about the exchange rate between objectives — how many clicks a report is worth, how much watch time a quality flag is worth — and when those weights are tuned to maximize a composite metric, the exchange rate has been set by whoever defined the composite, usually implicitly and often years ago. Making the weights explicit, with an owner and a documented rationale, is the same governance argument as the fairness metric choice: the decision is not derivable from the data, someone accountable has to make it, and the alternative is that it gets made by a hyperparameter sweep. That connects the applications module back to the trustworthy-AI one, and it is a good note for a practitioner to carry: in a multi-objective system, the loss weights are the policy, and they deserve the review that a policy gets."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "What structure MTL exploits",
        "back": "TASK RELATEDNESS — the tasks depend on overlapping features of the input. An assumption like homophily or the cluster assumption: checkable in advance, and frequently false."
      },
      {
        "type": "formula",
        "front": "The multi-task objective",
        "back": "L = Σ_t w_t · L_t(f_{θ_t}(g_{θ_shared}(x)), y_t). Everything hard lives in the weights w_t and in what the shared parameters are asked to do."
      },
      {
        "type": "pitfall",
        "front": "★ Fixed equal loss weights",
        "back": "A regression loss in the thousands and a cross-entropy near one means the first dominates the shared gradient ENTIRELY. The second head still trains; the TRUNK doesn't serve it. The diagram gives no hint."
      },
      {
        "type": "formula",
        "front": "Uncertainty weighting",
        "back": "L = Σ_t (1/2σ_t²)L_t + log σ_t, σ_t learned — a Gaussian likelihood with learned observation noise. Side effect: a task whose loss can't be reduced gets large σ and **quietly stops contributing**."
      },
      {
        "type": "definition",
        "front": "★ Negative transfer",
        "back": "A shared trunk serving incompatible objectives does both jobs worse than separate models. The aggregate can IMPROVE while the task you care about degrades — the subgroup-averaging failure, applied to tasks."
      },
      {
        "type": "formula",
        "front": "The conflict diagnostic",
        "back": "cos(∇_shared L_i, ∇_shared L_j) < 0 means the tasks are fighting over the trunk. Log it per task pair — cheap and directly observable. Persistently negative ⇒ they don't belong in one trunk."
      },
      {
        "type": "intuition",
        "front": "Does loss weighting fix conflict?",
        "back": "No — it only chooses a WINNER. GradNorm balances gradient magnitudes (closer to the mechanism); PCGrad projects out the opposing component, which helps for intermittent conflict and can't manufacture compatibility."
      },
      {
        "type": "definition",
        "front": "The architecture ladder",
        "back": "Hard sharing (max regularization, max conflict risk) → soft sharing (tied towers) → **MMoE** (experts + per-task GATES, so tasks route AROUND each other) → PLE/CGC (task-specific experts too). The trend: make sharing learned and partial."
      },
      {
        "type": "pitfall",
        "front": "★ The shared-example leak",
        "back": "Split each task independently and one ENTITY lands in task A's train and task B's test — the shared trunk has seen it. Fix: partition entities ONCE, derive every task's split from it. A pipeline structure, not a per-task decision."
      },
      {
        "type": "pitfall",
        "front": "Sizing the evaluation",
        "back": "With unequal task data, the small task's interval may be too wide to DETECT negative transfer. Size the held-out set for the SMALLEST task and report intervals — otherwise you ship damage to the low-volume (usually safety) objective."
      },
      {
        "type": "intuition",
        "front": "The unstated motivation",
        "back": "SERVING COST — one trunk with five heads instead of five models: one deployment, one monitoring stack, one latency budget. Legitimate, and it should be stated, because then a small per-task loss may be acceptable."
      },
      {
        "type": "intuition",
        "front": "★ The loss weights ARE the policy",
        "back": "Each weight is an exchange rate between objectives — how many clicks a report is worth. Tuned to maximize a composite, that rate is set implicitly by whoever defined the composite. It needs an owner, like a fairness metric choice."
      }
    ],
    "refs": [
      {
        "title": "Caruana (1997), Multitask Learning",
        "url": "https://link.springer.com/article/10.1023/A:1007379606734"
      },
      {
        "title": "Kendall, Gal & Cipolla (2018), Multi-Task Learning Using Uncertainty to Weigh Losses",
        "url": "https://arxiv.org/abs/1705.07115"
      },
      {
        "title": "Ma et al. (2018), Modeling Task Relationships in Multi-task Learning with Multi-gate Mixture-of-Experts (MMoE)",
        "url": "https://dl.acm.org/doi/10.1145/3219819.3220007"
      },
      {
        "title": "Yu et al. (2020), Gradient Surgery for Multi-Task Learning (PCGrad)",
        "url": "https://arxiv.org/abs/2001.06782"
      },
      {
        "title": "Tang et al. (2020), Progressive Layered Extraction (PLE): A Novel Multi-Task Learning Model",
        "url": "https://dl.acm.org/doi/10.1145/3383313.3412236"
      }
    ],
    "demos": [
      "lr-schedule",
      "gradient-clipping",
      "bias-variance-decomp",
      "cross-validation"
    ]
  },
  "tabular-dl": {
    "level": "core",
    "body": {
      "intuition": [
        "Tabular data is the domain where deep learning has not won, and the reason is structural rather than a matter of effort. Tables have heterogeneous columns on incomparable scales, skewed marginals, high-cardinality categoricals, threshold effects, and a large fraction of irrelevant features - and axis-aligned splits handle all five natively while a dense network handles none of them without help.",
        "The measurement is stark. On synthetic data built with exactly those five properties: histogram gradient boosting reached AUC 0.7790 in 0.7 seconds, random forest 0.7270 in 0.8 seconds, and an MLP 0.5911 in 71 seconds - a hundred times the fit time for a model barely above chance. Adding a log transform and a smoothed target encoding took the MLP to 0.6802, which closes most of the gap and is still well short.",
        "THE PREPROCESSING IS THE MODEL. Every step that lifted the MLP - log-transforming skewed columns, encoding a high-cardinality categorical, scaling - is something the tree did for free, and that is the honest reason trees still win here rather than any claim about capacity. It also sets up this module's spine, because the most effective of those preprocessing steps, target encoding, is a function of the label and therefore the most direct leak available."
      ],
      "math": [
        {
          "h": "★ The five properties, and why trees handle them free",
          "paras": [
            "Each is a property of real tables and each is something a dense network must be given help with.",
            "Together they explain the result without appealing to capacity, data volume or tuning effort."
          ],
          "tex": "\\begin{array}{ll} \\text{skewed marginals} & \\text{splits are scale-invariant; a net needs transforms}\\\\ \\text{threshold effects} & \\text{axis-aligned splits find them EXACTLY}\\\\ \\text{high-cardinality categoricals} & \\text{native; a net needs an embedding or an encoding}\\\\ \\text{irrelevant columns} & \\text{never selected; a net must learn to ignore them}\\\\ \\text{heterogeneous scales} & \\text{irrelevant to a split; fatal to an unscaled net}\\end{array}",
          "texNote": "Measured on data with all five: HistGradientBoosting 0.7790, RandomForest 0.7270, MLP 0.5911. The MLP's deficit is not capacity - it is that the inductive bias of a smooth dense function is wrong for a piecewise-constant, axis-aligned target."
        },
        {
          "h": "What closes the gap, and what it costs",
          "paras": [
            "Give the network the preprocessing the tree performs implicitly and it improves substantially. The remaining gap is the inductive bias itself."
          ],
          "tex": "\\text{MLP raw } 0.5911 \\;\\xrightarrow{\\ \\log\\ +\\ \\text{target encoding}\\ +\\ \\text{scaling}\\ }\\; 0.6802 \\quad\\text{vs}\\quad \\text{GBDT } 0.7790\\ \\text{with none of it}",
          "texNote": "Fit time: 0.7 seconds for the GBDT against 71 seconds for the MLP, a factor of a hundred, before counting the engineering time for the preprocessing itself. On a problem where you will fit hundreds of models during development, that ratio is the decision."
        },
        {
          "h": "★ Target-encoding leakage scales with rarity",
          "paras": [
            "Target encoding replaces a category with its mean outcome, which is a function OF THE LABEL - the most direct leak available. Its severity is not fixed; it depends on how much the test rows contribute to each category's estimate.",
            "Same setup, varying only the number of categories at a fixed sample size."
          ],
          "tex": "\\begin{array}{rrrr} \\text{categories} & \\text{rows/cat} & \\text{train-only AUC} & \\text{train+test AUC}\\\\ 20 & 1000 & 0.7680 & 0.7680\\ (+0.0000)\\\\ 200 & 100 & 0.7489 & 0.7585\\ (+0.0096)\\\\ 2{,}000 & 10 & 0.7244 & 0.7964\\ (+0.0721)\\\\ 8{,}000 & 2.5 & 0.6644 & \\mathbf{0.8657\\ (+0.2013)} \\end{array}",
          "texNote": "Well-populated categories barely move when test rows are added; RARE categories are estimated almost entirely from the test rows themselves, which is a direct label lookup. So the leak is invisible on a low-cardinality demo and catastrophic on the high-cardinality columns you actually want to encode."
        }
      ],
      "code": [
        {
          "h": "The workflow that reflects the evidence",
          "paras": [
            "Order matters, and it is roughly the reverse of how tabular projects usually start."
          ],
          "code": "# 1 GBDT BASELINE, minimal tuning\n#     LightGBM / XGBoost / HistGradientBoosting. Handles skew, thresholds,\n#     missing values and categoricals natively. 0.7s in the measurement above.\n# 2 FEATURE WORK, which is where the returns actually are\n#     domain aggregates, ratios, time-since features, interaction terms\n#     ★ and every one of them checked for as-of correctness\n# 3 TUNING, modest - GBDTs are forgiving and the defaults are strong\n# 4 DEEP LEARNING, only if one of these holds:\n#     * genuinely huge data (tens of millions of rows and growing)\n#     * multimodal inputs - text or images alongside the table\n#     * MULTI-TASK or transfer across related problems, where a shared\n#       representation is the point\n#     * an embedding needed downstream (retrieval, similarity)\n\n# ★ Case 4's exceptions are all cases where you want something a tree cannot\n#   give you - a REPRESENTATION - rather than better accuracy on one table.",
          "caption": "The honest reading of the benchmark literature is that on a single tabular task, a tuned GBDT is the thing to beat and usually is not beaten."
        },
        {
          "h": "The encodings, in order of leak risk",
          "paras": [
            "The most effective encoding for high-cardinality columns is also the most dangerous, and its danger is a function of cardinality."
          ],
          "code": "# ONE-HOT             safe, explodes with cardinality, fine below ~50 levels\n# ORDINAL / NATIVE    what LightGBM and CatBoost do internally; no leak\n# HASHING             fixed width, collisions, no leak, no label involved\n# TARGET ENCODING     replace a category with its mean outcome\n#   ★ a function OF THE LABEL -> the most direct leak available\n#   ★ and the severity scales with RARITY:\n#       1000 rows/cat  -> leak +0.0000\n#        100 rows/cat  -> leak +0.0096\n#         10 rows/cat  -> leak +0.0721\n#        2.5 rows/cat  -> leak +0.2013\n#   Fix: compute INSIDE the training fold only, with smoothing toward the\n#        prior, and use out-of-fold encoding for the training rows themselves\n#        (CatBoost's ordered target statistics do this by construction)\n\n# ★ The trap is that it looks harmless when you test it on a low-cardinality\n#   column and is catastrophic on the high-cardinality ones you wanted it for.",
          "caption": "The dose-response table is the point: a leak with no measured effect on 20 categories is worth 0.20 of AUC on 8,000, so a demo cannot tell you whether yours is safe."
        }
      ],
      "useCases": [
        "Essentially all of applied ML in finance, insurance, healthcare operations, logistics and enterprise software, where the data is a table and a GBDT is the correct default.",
        "Fraud, risk and credit scoring, where GBDTs plus SHAP for explanation is the standard stack and the regulatory requirement makes explainability non-optional.",
        "Multimodal problems where a table sits alongside text or images, which is one of the genuine cases for a neural approach because the fusion needs a shared representation.",
        "Deciding NOT to use deep learning, which the benchmark evidence supports and which saves substantial engineering time on most tabular problems."
      ],
      "pitfalls": [
        "Reaching for deep learning on a single tabular task. Measured: GBDT 0.7790 in 0.7 seconds against an MLP at 0.5911 in 71 seconds, and the MLP reached only 0.6802 after the preprocessing the tree did for free.",
        "Target encoding computed across the split. The severity scales with rarity - +0.0000 at 1000 rows per category and +0.2013 at 2.5 - so it is invisible on a low-cardinality test and catastrophic where you actually want it.",
        "Testing a leak-prone encoding on a low-cardinality column and concluding it is safe. The dose-response is the whole point, and cardinality relative to sample size is the variable.",
        "Scaling, imputing or fitting any transform before splitting. The same pre-split aggregate leak as every other domain in this module, and tabular pipelines have the most of these steps.",
        "Tuning a GBDT extensively before doing feature work. The returns are in the features; GBDT defaults are strong and the model is forgiving.",
        "Comparing a heavily-tuned neural model against a default GBDT. That is the realistic-evaluation flaw from the semi-supervised lesson in a different domain.",
        "Assuming the benchmark result transfers. If your table is genuinely huge, multimodal, or feeding a downstream representation, the exceptions apply and the default reverses."
      ],
      "connections": [
        {
          "ref": "supervised-learning/boosting",
          "text": "The model that wins here, and why axis-aligned splits are the right inductive bias for piecewise-constant, threshold-driven targets."
        },
        {
          "ref": "ml-applications/shap",
          "text": "The explanation layer that pairs with GBDTs, including why correlated tabular features split SHAP credit and make the ranking fragile."
        },
        {
          "ref": "ml-theory/feature-engineering",
          "text": "Where the returns actually are on tabular problems, and the as-of discipline every engineered aggregate must satisfy."
        },
        {
          "ref": "interview-capstone/design-fraud-llm",
          "text": "The design case built on this stack, where the operating point comes from a cost ratio and the model is downstream of it."
        },
        {
          "ref": "ml-theory/cross-validation",
          "text": "The split discipline this domain has the most opportunities to violate, since tabular pipelines contain the most fitted transforms."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "★ Give the tabular comparison.",
          "a": "On data with tabular structure: HistGradientBoosting AUC **0.7790** in 0.7 s, RandomForest 0.7270 in 0.8 s, MLP **0.5911** in **71 s** — a hundred times the fit time, barely above chance."
        },
        {
          "q": "Why do trees win?",
          "a": "Five properties of real tables: skewed marginals, threshold effects, high-cardinality categoricals, many irrelevant columns, heterogeneous scales. Axis-aligned splits handle all five natively."
        },
        {
          "q": "How much does preprocessing close?",
          "a": "MLP 0.5911 → **0.6802** with log transforms, target encoding and scaling. Most of the gap, still well short of 0.7790. **The preprocessing IS the model.**"
        },
        {
          "q": "Is the deficit capacity?",
          "a": "No — it's inductive bias. A smooth dense function is the wrong prior for a piecewise-constant, axis-aligned target."
        },
        {
          "q": "★ Why is target encoding dangerous?",
          "a": "It replaces a category with its mean OUTCOME — a function of the label, so computing it across the split is the most direct leak available."
        },
        {
          "q": "Give the dose-response.",
          "a": "Leak by rows per category: 1000 → **+0.0000**, 100 → +0.0096, 10 → +0.0721, 2.5 → **+0.2013**."
        },
        {
          "q": "Why does it scale with rarity?",
          "a": "Well-populated categories barely move when test rows are added. RARE categories are estimated almost entirely FROM the test rows — a direct label lookup."
        },
        {
          "q": "So what's the trap?",
          "a": "It looks harmless tested on a low-cardinality column and is catastrophic on the high-cardinality ones you wanted it for. A demo can't tell you whether yours is safe."
        },
        {
          "q": "How do you do target encoding safely?",
          "a": "Compute inside the training fold only, smooth toward the prior, and use OUT-OF-FOLD encoding for the training rows themselves. CatBoost's ordered target statistics do this by construction."
        },
        {
          "q": "Rank the encodings by leak risk.",
          "a": "One-hot (safe, explodes past ~50 levels) · ordinal/native (LightGBM, CatBoost — no leak) · hashing (no label involved) · TARGET encoding (most effective, most dangerous)."
        },
        {
          "q": "When IS deep learning right on tabular data?",
          "a": "Genuinely huge data · multimodal inputs (text/images alongside the table) · multi-task or transfer · an embedding needed downstream. All cases where you want a REPRESENTATION, not accuracy on one table."
        },
        {
          "q": "Where are the returns on a tabular project?",
          "a": "Feature work — domain aggregates, ratios, time-since features, interactions — not tuning. GBDT defaults are strong and the model is forgiving."
        }
      ],
      "standard": [
        {
          "q": "Why does gradient boosting still beat deep learning on tabular data?",
          "a": "BECAUSE OF FIVE PROPERTIES OF REAL TABLES, AND AXIS-ALIGNED SPLITS HANDLE ALL FIVE NATIVELY. Skewed marginals: a split is scale-invariant, and a network needs transforms. Threshold effects: a split finds a threshold exactly, and a smooth dense function approximates it with a sigmoid that never quite gets there. High-cardinality categoricals: trees handle them natively, and a network needs an embedding or an encoding. Many irrelevant columns: a tree simply never selects them, and a network must learn to ignore them, which costs capacity and data. Heterogeneous scales: irrelevant to a split and fatal to an unscaled network. MEASURED ON DATA BUILT WITH ALL FIVE: histogram gradient boosting reached AUC 0.7790 in 0.7 seconds, random forest 0.7270 in 0.8, and an MLP 0.5911 in 71 seconds — a hundred times the fit time for a model barely above chance. GIVING THE NETWORK THE PREPROCESSING THE TREE PERFORMS IMPLICITLY — log transforms on the skewed columns, a smoothed target encoding for the categorical, scaling — took it to 0.6802, which closes most of the gap and is still well short. THE PREPROCESSING IS THE MODEL, and that is the honest reason rather than any claim about capacity or tuning effort.",
          "deepDive": "The framing worth carrying is that this is an inductive-bias argument, not a capacity argument, which is why more data and more tuning do not reliably reverse it — Grinsztajn et al. found the gap persists across dataset sizes and holds after extensive tuning of both families. The specific bias mismatch is that tabular targets are frequently piecewise-constant and axis-aligned — a rule like 'approve if income above X and tenure above Y' is exactly two splits and is an awkward function for a smooth network — while networks excel where the input has a spatial, sequential or compositional structure that weight sharing can exploit, and a table has none. That also predicts the exceptions correctly: neural approaches become competitive when the table is huge enough that the network can learn the preprocessing itself, when there is genuine structure across columns as in high-cardinality interaction-heavy recommendation data, or when the tabular part is one modality among several. Those are the cases where you want a representation, and a tree cannot give you one — which is the real dividing line rather than accuracy on a single table."
        },
        {
          "q": "Explain target encoding and how you would use it safely.",
          "a": "IT REPLACES A CATEGORY WITH ITS MEAN OUTCOME, which makes it enormously effective for high-cardinality columns — one column instead of thousands of one-hot dimensions, carrying exactly the signal you want — AND MAKES IT A FUNCTION OF THE LABEL, which is the most direct leak available. If you compute it before splitting, every test row's label contributed to the feature the model was trained on. THE SEVERITY IS NOT FIXED, AND THAT IS THE PART PEOPLE MISS. Measured at a constant sample size, varying only the number of categories: at 1,000 rows per category the leak was +0.0000 of AUC, at 100 rows +0.0096, at 10 rows +0.0721, and at 2.5 rows +0.2013. THE MECHANISM IS THAT WELL-POPULATED CATEGORIES BARELY MOVE when test rows are added to their estimate, while rare categories are estimated almost entirely from the test rows themselves — which is a direct label lookup for those rows. SO THE TRAP IS PRECISE: it looks harmless when you test it on a low-cardinality column and is catastrophic on the high-cardinality ones you wanted it for in the first place. THE SAFE RECIPE is to compute inside the training fold only, smooth toward the global prior with a pseudo-count, and use out-of-fold encoding for the training rows themselves so a row's own label does not contribute to its own feature.",
          "deepDive": "That last point — out-of-fold encoding for the training rows — is the part that is genuinely subtle and is what CatBoost's ordered target statistics implement by construction, using only rows that precede the current one in a random permutation. Without it, even a correctly-split pipeline has each training row's label leaking into its own feature, which causes the model to over-rely on the encoding and generalize worse; the symptom is a training-validation gap that widens with cardinality. The smoothing parameter is the other lever and it has a clean interpretation as a Bayesian shrinkage toward the prior, with the pseudo-count being how many observations of the prior you are worth: small categories shrink to the base rate and large ones keep their own estimate. Setting it from the cardinality distribution rather than by tuning is both more principled and more robust. The general lesson is the module's: this is a feature whose leak severity is a function of a data property — cardinality relative to sample size — so the safety of the technique cannot be established once and reused, it has to be checked per dataset."
        },
        {
          "q": "How would you approach a new tabular problem?",
          "a": "IN ROUGHLY THE REVERSE ORDER OF HOW TABULAR PROJECTS USUALLY START. FIRST, A GBDT BASELINE WITH MINIMAL TUNING — LightGBM, XGBoost or HistGradientBoosting — which handles skew, thresholds, missing values and categoricals natively and takes under a second on a moderate dataset. That establishes what the data supports before any engineering. SECOND, FEATURE WORK, which is where the returns actually are: domain aggregates, ratios, time-since features, interaction terms — and every one of them checked for as-of correctness, because tabular pipelines contain more fitted transforms than any other domain in this module and therefore more opportunities to compute an aggregate across the split. THIRD, MODEST TUNING, because GBDTs are forgiving and the defaults are strong, so an extensive sweep before feature work is effort in the wrong place. FOURTH, DEEP LEARNING ONLY IF ONE OF FOUR CONDITIONS HOLDS: genuinely huge and growing data, multimodal inputs where text or images sit alongside the table, multi-task or transfer across related problems, or a downstream need for an embedding. NOTE WHAT THOSE FOUR HAVE IN COMMON — each is a case where you want a REPRESENTATION, which a tree cannot produce, rather than better accuracy on one table.",
          "deepDive": "The as-of discipline deserves emphasis in this domain specifically because the leak surface is larger than anywhere else in the module. A typical tabular pipeline scales, imputes, encodes, bins, winsorizes and aggregates — six fitted transforms, each of which is a pre-split aggregate if implemented naively, and most library APIs make the naive version the shorter code. The structural fix is to express the whole pipeline as an object fitted inside each fold rather than as a sequence of dataframe operations, which is exactly what scikit-learn's Pipeline exists for and which is routinely bypassed because it is less convenient during exploration. The habit that catches the rest is to ask, of every column, what timestamp it could have been computed at and whether that precedes the prediction — and for any aggregate over a group, whether the group's other rows include held-out ones. Those two questions find essentially all of it, and they take a minute per feature, which is affordable because tabular models have tens of features rather than thousands."
        },
        {
          "q": "What are the neural architectures for tabular data and are they worth it?",
          "a": "THERE ARE THREE FAMILIES AND THE HONEST ANSWER IS THAT NONE HAS DISPLACED GBDTS ON SINGLE-TABLE TASKS. ATTENTION-BASED models such as TabNet and TabTransformer apply feature-level attention, aiming to learn which columns matter and how they interact; they are competitive on some benchmarks and have not shown a consistent advantage. EMBEDDING-BASED approaches — entity embeddings for categoricals feeding an MLP — are the oldest and the most practically useful, because the embeddings themselves are the deliverable when something downstream needs them. TREE-INSPIRED DIFFERENTIABLE models such as NODE try to give a network the axis-aligned bias directly, which is a principled response to the diagnosis and has not translated into a decisive win. THE FAIR-COMPARISON PROBLEM APPLIES HERE exactly as it did in the semi-supervised lesson: many reported advantages come from comparing a heavily-tuned neural model against a lightly-tuned GBDT, and Grinsztajn et al.'s benchmark, which equalized the tuning budget, found the gap persists in the trees' favour. SO MY POSITION is that neural tabular models are worth it when you need what they uniquely provide — a shared representation for multi-task, multimodal fusion, or a downstream embedding — and not as a general upgrade.",
          "deepDive": "The multimodal case is the one growing fastest and it is worth being concrete about, because it is where the dividing line genuinely moves. If a record has structured columns plus a free-text description plus an image, then a GBDT can only consume the text and image through hand-built features — embeddings computed separately and appended — whereas a single network can learn the fusion end to end and let the tabular part inform how the text is read. That is a real advantage and it is about JOINT representation rather than about tabular modelling. The pragmatic middle ground that works well and is under-used is a hybrid: compute text and image embeddings with a pretrained model, append them as columns, and feed the whole thing to a GBDT. That captures most of the multimodal signal, keeps the tabular strengths, and avoids training a large network — and it should be the baseline any end-to-end multimodal architecture has to beat. Skipping that comparison is the same error as skipping the GBDT baseline in the first place, one level up."
        },
        {
          "q": "How does this lesson fit the module's theme?",
          "a": "TABULAR DATA'S STRUCTURE IS HETEROGENEITY — columns that mean different things, on different scales, with different cardinalities — and it is both the prior and the trap in the module's usual way. IT IS THE PRIOR because that heterogeneity is exactly what axis-aligned splits exploit, which is why a GBDT reached 0.7790 where an MLP reached 0.5911 with a hundred times the fit time. IT IS THE TRAP because the most effective response to one part of that heterogeneity — target encoding for high-cardinality categoricals — is a function of the label, and therefore the most direct leak available. WHAT THIS LESSON ADDS TO THE MODULE IS A DOSE-RESPONSE CURVE, which none of the others has. The leak is worth +0.0000 at 1,000 rows per category and +0.2013 at 2.5, so its severity is a continuous function of a data property rather than a binary fact about the technique. THAT MEANS THE SAFETY OF A METHOD CANNOT BE ESTABLISHED ONCE AND REUSED — it has to be checked against the cardinality of your columns and the size of your data, which is a more demanding standard than 'is this technique safe' and a more accurate one.",
          "deepDive": "That dose-response framing generalizes to the rest of the module more than it first appears. The grouped-split leak was worth +0.4192 with a strong per-group signature and a weak label signal, and it would be worth almost nothing if the group signature were weak — so it too is a function of a data property rather than a property of the split scheme. The time-series leak was zero with lag features and large with a centred window, so it is a function of the feature set. In every case the question 'how bad is this leak' has the answer 'it depends on a measurable property of your data', and the measurement is usually cheap: fit with and without the suspect step, on an honest split, and read the difference. That is the single most useful habit this module can leave — not a list of forbidden operations, but the practice of measuring the optimism your pipeline produces, which is one extra experiment and turns a rule of thumb into a number you can act on."
        },
        {
          "q": "Your GBDT scores 0.95 AUC on validation and 0.71 in production. Where do you look?",
          "a": "LEAKAGE FIRST, AND THIS DOMAIN HAS THE MOST SURFACES FOR IT. In order of prior probability. ONE, TARGET ENCODING computed across the split — measured at +0.2013 of AUC on a high-cardinality column, which alone can produce a gap of this size, and it is the single most likely cause on a tabular problem with categorical features. TWO, ANY OTHER FITTED TRANSFORM applied before splitting: scaler, imputer, binner, winsorizer, or a group aggregate. Tabular pipelines contain six or more of these and the naive implementation of each is a leak. THREE, THE SPLIT UNIT — if rows are grouped by customer, account or session and the split was by row, the group signature is a lookup table, which the module measured at +0.4192 in its general form. FOUR, A FEATURE THAT ENCODES THE FUTURE, such as an aggregate computed over a window that extends past the prediction timestamp, which is the time-series lesson's centred window in tabular clothing. FIVE, ONLY THEN, distribution shift — which is real and is the least likely explanation for a gap this large appearing immediately at launch rather than degrading over weeks.",
          "deepDive": "The diagnostic that separates leakage from shift quickly is the shape of the gap over time. Leakage produces a gap that is present from the first day of production and does not change; shift produces a gap that starts small and widens. That single plot resolves most investigations in an hour. If it is leakage, the fastest localization is ablation: drop the suspect feature group and re-run the honest evaluation, and the feature carrying most of the disappearing lift is the culprit — a single feature accounting for a large share of performance is a leakage hypothesis before it is a modelling success, which is also how SHAP serves as a leak detector. If it is shift, the drift lesson's conclusion applies and the honest response is a labelled sample, since no unlabelled monitor sees a concept change. Either way, the number worth institutionalizing is the offline-online gap itself, tracked over releases, because it is the only calibration you have for how much to trust the next offline result — and teams that maintain it stop being surprised."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "★ The tabular comparison",
        "back": "HistGradientBoosting AUC **0.7790** (0.7 s) · RandomForest 0.7270 (0.8 s) · MLP **0.5911** (**71 s**). A hundred times the fit time for a model barely above chance."
      },
      {
        "type": "definition",
        "front": "The five properties trees handle free",
        "back": "Skewed marginals (splits are scale-invariant) · THRESHOLD effects (found exactly) · high-cardinality categoricals · many irrelevant columns (never selected) · heterogeneous scales (irrelevant to a split)."
      },
      {
        "type": "intuition",
        "front": "★ The preprocessing IS the model",
        "back": "MLP 0.5911 → **0.6802** with log transforms + target encoding + scaling — most of the gap, still short of 0.7790. Every step is something the tree did for free. It's an INDUCTIVE-BIAS argument, not a capacity one."
      },
      {
        "type": "formula",
        "front": "★ Target-encoding leak, dose-response",
        "back": "By rows per category: 1000 → **+0.0000** · 100 → +0.0096 · 10 → +0.0721 · **2.5 → +0.2013**. Well-populated categories barely move; rare ones are estimated from the TEST rows — a direct label lookup."
      },
      {
        "type": "pitfall",
        "front": "The target-encoding trap",
        "back": "It looks harmless tested on a LOW-cardinality column and is catastrophic on the HIGH-cardinality ones you wanted it for. A demo cannot tell you whether yours is safe."
      },
      {
        "type": "definition",
        "front": "Safe target encoding",
        "back": "Compute inside the training fold only · smooth toward the prior with a pseudo-count (Bayesian shrinkage) · **out-of-fold encoding for the training rows themselves**, so a row's own label doesn't feed its own feature. CatBoost's ordered statistics do this by construction."
      },
      {
        "type": "intuition",
        "front": "Encodings by leak risk",
        "back": "One-hot (safe, explodes past ~50 levels) · ordinal/native (LightGBM, CatBoost — no leak) · hashing (no label involved) · TARGET encoding (most effective, most dangerous)."
      },
      {
        "type": "intuition",
        "front": "The workflow, in order",
        "back": "GBDT baseline, minimal tuning → **FEATURE WORK** (where the returns are, each checked as-of) → modest tuning → deep learning only under four conditions. Roughly the reverse of how projects usually start."
      },
      {
        "type": "intuition",
        "front": "★ When deep learning IS right here",
        "back": "Genuinely huge data · multimodal inputs · multi-task/transfer · a downstream embedding. All four are cases where you want a **REPRESENTATION**, which a tree cannot produce — not better accuracy on one table."
      },
      {
        "type": "intuition",
        "front": "The multimodal middle ground",
        "back": "Compute text/image embeddings with a pretrained model, APPEND them as columns, feed to a GBDT. Captures most of the signal, keeps the tabular strengths — and it's the baseline an end-to-end architecture must beat."
      },
      {
        "type": "pitfall",
        "front": "0.95 validation, 0.71 production — where to look",
        "back": "Target encoding across the split (+0.2013 alone) → other pre-split fitted transforms (a pipeline has six) → wrong split UNIT (+0.4192) → a future-spanning window → and only then shift."
      },
      {
        "type": "intuition",
        "front": "★ Leakage vs shift, in one plot",
        "back": "LEAKAGE: the gap is present from day one and constant. SHIFT: it starts small and widens. That plot resolves most investigations in an hour — then localize by ablation, since a single feature carrying most of the lift is a leak hypothesis."
      }
    ],
    "refs": [
      {
        "title": "Grinsztajn, Oyallon & Varoquaux (2022), Why Do Tree-Based Models Still Outperform Deep Learning on Tabular Data?",
        "url": "https://arxiv.org/abs/2207.08815"
      },
      {
        "title": "Shwartz-Ziv & Armon (2022), Tabular Data: Deep Learning is Not All You Need",
        "url": "https://arxiv.org/abs/2106.03253"
      },
      {
        "title": "Prokhorenkova et al. (2018), CatBoost: Unbiased Boosting with Categorical Features",
        "url": "https://arxiv.org/abs/1706.09516"
      },
      {
        "title": "Ke et al. (2017), LightGBM: A Highly Efficient Gradient Boosting Decision Tree",
        "url": "https://papers.nips.cc/paper/2017/hash/6449f44a102fde848669bdd9eb6b76fa-Abstract.html"
      },
      {
        "title": "Guo & Berkhahn (2016), Entity Embeddings of Categorical Variables",
        "url": "https://arxiv.org/abs/1604.06737"
      }
    ],
    "demos": [
      "decision-tree",
      "bagging-boosting",
      "overfitting",
      "cross-validation"
    ]
  }
};
