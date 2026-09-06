// GENERATED from content/lessons/ml-applications/neural-recommenders.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/ml-applications/neural-recommenders/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

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
          "deepDive": {
            "q": "Which training detail separates a working system from a broken one?",
            "a": "The training detail that separates a working system from a broken one is negative sampling. The softmax denominator over the full catalogue is intractable, so it is estimated from sampled negatives, and the cheap sampler is in-batch — treat the other items in the batch as negatives. That sampler is popularity-biased by construction, because popular items appear in batches far more often than rare ones, so without correction the model learns that popular items are frequently negative and systematically down-ranks them. The logQ correction subtracts the log sampling probability from each sampled logit and removes the bias while keeping the cheap sampler. It is a one-line change and its absence produces a characteristic symptom: offline metrics look reasonable and the served results are strangely obscure. Worth also knowing that mixing in uniformly-sampled negatives alongside in-batch ones helps, because in-batch negatives are drawn from the interaction distribution and the model also needs to learn about items nobody interacts with — which is most of the catalogue."
          }
        },
        {
          "q": "You used a temporal split. Why is that not enough?",
          "a": "BECAUSE THE SPLIT AND THE FEATURES ARE SEPARATE LEAK SURFACES, and fixing one says nothing about the other. I measured this with the split held correct and temporal, changing only how a feature was computed: a per-user click-rate feature computed over the WHOLE dataset gave AUC 0.5659, and the identical feature computed on the training window only gave 0.5012. The second number is essentially chance, which is the honest answer for that feature on that data; the 0.065 of apparent signal was manufactured entirely by computing a statistic that spans the split boundary. THE MECHANISM IS GENERAL: any aggregate — a user's mean, a category's conversion rate, a normalization constant, an imputation value, a target encoding — computed before splitting carries information from the test period into training. Target encoding is the most dangerous member of that family because it is explicitly a function of the label. THE FIX IS AS-OF DISCIPLINE: every feature must be computable from information available at the prediction timestamp, with the same logic the serving path will use, and the training pipeline must ENFORCE it rather than trusting the author to remember. That is what a point-in-time-correct feature store is for, and it is the main thing that distinguishes one from a table of precomputed columns.",
          "deepDive": {
            "q": "Why does that bug survive code review?",
            "a": "The reason this specific bug survives review is that the code looks correct at every line — you split, you train, you evaluate, and the leak is upstream in a groupby that ran before any of it. The detection habits worth building are cheap. First, a result that is surprisingly good is a leakage hypothesis before it is a modelling success, and the first thing to check is which features were computed over what window. Second, an ablation: drop the suspicious aggregate and see how much of the performance goes with it, since a single feature carrying most of the lift is a tell. Third, compare offline to online whenever an online number exists, because leakage is precisely the class of error that vanishes in production — the model in production genuinely cannot see the future, so a large offline-online gap with a correct split points straight at the features. Maintaining that gap as a standing number is the single most useful artefact a recommender team can have, and it also gives you a prior for how much to discount the next offline result."
          }
        },
        {
          "q": "How would you evaluate a retrieval model?",
          "a": "ON RECALL AT THE CANDIDATE-SET SIZE, SEPARATELY FROM THE RANKER, because it is a ceiling rather than a contribution. If retrieval's recall@1000 is 0.70, a perfect ranker still achieves 0.70, so measuring end-to-end only tells you the product of two stages and cannot tell you which one to work on. I'D MEASURE recall@k against a held-out set of known-relevant items, for k at the actual candidate-set size, and I'd do it on a temporally-correct split with as-of features. THERE ARE TWO STACKED CEILINGS and both need reporting: the retrieval MODEL's recall, and beneath it the ANN INDEX's approximate recall, which is a tunable parameter — HNSW's ef and IVF's nprobe trade recall against latency, and a default value silently sets a system-level ceiling. Measuring index recall against exact search on a sample takes minutes and is routinely skipped. AND I'D SLICE THE RESULT, because a popularity-skewed test set lets a popularity baseline look strong and personalization look marginal; reporting head, torso and tail separately shows which one you actually built. FINALLY I'd compare against that popularity baseline explicitly, since a retrieval model that does not beat it is not doing anything.",
          "deepDive": {
            "q": "What does 'relevant' actually mean in that evaluation?",
            "a": "There is a subtlety about what 'relevant' means here that is worth raising, because it determines whether the whole evaluation is meaningful. The held-out relevant set usually comes from logged interactions, and those interactions were generated by the incumbent system — so items the incumbent never showed are absent from the ground truth, and a new retrieval model that surfaces them is penalized for finding things the evaluation cannot see. That is the confounding problem from the causal module appearing as an evaluation artefact, and it systematically favours the incumbent. The mitigations are the same: a randomized exposure slice provides an unbiased relevance sample, and evaluating on that slice rather than on organic logs removes the bias for the region it covers. Failing that, reporting the fraction of a new model's top-k that the incumbent never showed is a useful diagnostic — a model whose candidates are entirely within the incumbent's historical exposure is not expanding anything, and one whose candidates are mostly outside it will score badly offline for reasons that may not be real."
          }
        },
        {
          "q": "How does a two-tower model handle cold start?",
          "a": "MUCH BETTER THAN CLASSICAL MATRIX FACTORIZATION, AND STILL NOT COMPLETELY. In classical MF an item's embedding is a row of a learned table, so an item with no interactions has no embedding at all and cannot be retrieved by any query — the problem is total. In a two-tower model the item embedding is a FUNCTION of item features, so a new item with text, images, category and price gets an embedding immediately, and it lands near items with similar content. That is a genuine structural advantage and it is one of the main reasons the architecture replaced pure MF. WHAT IT DOES NOT SOLVE is that the content embedding is a prior, not evidence: the model learned the mapping from features to embeddings using items that HAVE interaction history, so it places a new item where similar historical items sat, which is a reasonable guess and systematically wrong for items whose appeal differs from their appearance. AND THE RANKER STILL PREFERS PROVEN ITEMS, so retrieval surfacing the new item does not mean it gets shown. THE MECHANISM THAT ACTUALLY CLOSES THE LOOP is exploration with a budget — a reserved impression fraction or an optimistic prior — which is a bandit's exploration term and a product decision rather than a modelling one.",
          "deepDive": {
            "q": "Which training-time choice is easy to get wrong here?",
            "a": "There is a training-time choice that matters for how well this works and is easy to get wrong: how much the item tower is allowed to rely on an item ID embedding versus content features. If an ID embedding is available and the item is well-observed, the model will lean on it because it is more informative, and the content pathway atrophies — which means cold-start performance degrades precisely as the warm-start performance improves. The standard mitigations are ID dropout during training, forcing the model to sometimes predict from content alone, and explicitly evaluating a cold-start slice where IDs are masked. Without that evaluation slice the regression is invisible, because aggregate metrics are dominated by warm items. This is the same aggregation problem as everywhere else in the curriculum — the metric that matters for a minority of the traffic has to be reported separately or it does not exist — and cold items are always a minority by interaction count and often a majority by catalogue count."
          }
        },
        {
          "q": "When would you not use a two-tower model?",
          "a": "WHEN THE CATALOGUE IS SMALL ENOUGH TO SCORE EXHAUSTIVELY, AND WHEN THE INTERACTION IS THE SIGNAL. If you have ten thousand items and a 115 ms budget, a GBDT with user-item cross features can score all of them and will beat a dot product, because you are paying for an index you do not need and giving up expressiveness you could afford. The two-tower architecture is a response to a scale constraint, so without the constraint it is a strictly worse model. THE SECOND CASE IS WHEN THE MATCH DEPENDS ON FINE-GRAINED INTERACTION that a fixed-dimensional dot product cannot represent — query-document term matching in search is the classic example, where an exact rare-term match matters enormously and is exactly what a dense embedding smooths away. That is why serious search stacks run lexical retrieval alongside dense: they fail on disjoint query types. THE THIRD IS WHEN THE ITEM SET IS TINY BUT THE CONTEXT IS RICH, such as choosing among five layouts or three notification types, where the whole problem is the context and the candidate set is not the difficulty. IN ALL THREE THE DIAGNOSTIC IS THE SAME: does the arithmetic force a funnel? If it does not, the funnel is complexity with no return.",
          "deepDive": {
            "q": "Is there a fourth case worth naming?",
            "a": "There is a fourth case that is increasingly common and worth naming: when retrieval quality is not the bottleneck at all because the corpus is already filtered by hard constraints. In many marketplace and enterprise settings, eligibility rules — geography, permissions, inventory, contract terms — cut a hundred-million-item catalogue to a few hundred candidates before any model runs, and at that point the two-tower stage is solving a problem that no longer exists. The failure mode is architectural inertia: the funnel was designed when the constraint bound and remains after it stopped. Checking the actual post-filter candidate-set distribution takes one query and occasionally deletes an entire service. That connects to the design-round habit of doing the arithmetic before choosing the architecture — the same calculation that justifies a funnel also tells you when to remove one, and the second direction is much less often run."
          }
        },
        {
          "q": "How does this lesson fit the module's theme?",
          "a": "THE STRUCTURE THAT MAKES RECOMMENDERS WORK IS THE STRUCTURE THAT MAKES THEM LEAK. Users repeat, so there is a per-user signature to exploit — and a random split turns that signature into a lookup table. Interactions are ordered in time, so recency is predictive — and a random split lets the future train the past. Items are popularity-skewed, so a popularity prior is genuinely informative — and an unsliced test set lets that prior masquerade as personalization. EVERY EXPLOITABLE REGULARITY IS ALSO A LEAK SURFACE, and that is the module's spine rather than a coincidence: the regularity is a dependency between rows, and validation assumes independence. WHAT MAKES THIS LESSON'S VERSION PARTICULARLY USEFUL is that the leak survived a CORRECT split — user click-rate over all data gave 0.5659 against 0.5012 computed on train only, with a temporal split in place the whole time. So 'we split by time' answers one of three leak surfaces and is routinely offered as though it answered all of them. THE TRANSFERABLE QUESTION for the rest of the module: what structure does this data have, and does my split — and every feature — respect it?",
          "deepDive": {
            "q": "What is the general form of this?",
            "a": "It is worth stating the general form because it recurs in every remaining lesson with a different surface. Cross-validation assumes exchangeability between the training and held-out rows, and every domain in this module violates that in its own way: time series violate it through temporal order, graphs through edges, audio and medical data through the recording or the patient, search through the query, multi-task through shared examples across tasks. THE UNIT OF SPLITTING IS THEREFORE A MODELLING DECISION, not a default, and it should be chosen to match the unit of generalization you care about — if you will deploy to new users, split by user; to new time periods, split by time; to new hospitals, split by hospital. Getting that wrong produces a number that answers a question nobody asked, which is the same reference-class failure module 24 spent ten lessons on, arriving here as a two-line change in a data pipeline. The cheap habit is to state, in one sentence next to every metric, what unit was held out — because if you cannot, you do not know what the number means."
          }
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
    ],
    "demoTitles": {
      "embeddings": "Embedding Atlas",
      "vector-search": "Vector Search",
      "knn": "k-Nearest Neighbors",
      "roc": "ROC, PR & Thresholds"
    }
  }
};
