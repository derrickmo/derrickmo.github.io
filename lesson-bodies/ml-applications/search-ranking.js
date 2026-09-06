// GENERATED from content/lessons/ml-applications/search-ranking.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/ml-applications/search-ranking/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
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
          "deepDive": {
            "q": "What are the NDCG conventions actually encoding?",
            "a": "The metric details are worth having because they are modelling choices presented as conventions. The gain 2^rel − 1 is exponential in the relevance grade, which makes the difference between 'perfect' and 'good' much larger than between 'good' and 'fair' — a deliberate encoding of the belief that top-grade results matter disproportionately, and one you should check against your product. The log₂(i+1) discount is a smooth stand-in for an examination probability, and if you have a measured examination curve from your own logs you can use it instead, which makes the metric match your interface rather than a 2002 convention. Per-query normalization by IDCG is the part with the sharpest consequences: without it, a query with fifty relevant documents contributes fifty times the DCG of one with a single relevant document, so the average becomes a statistic about your query mix. That is the same aggregation failure the trustworthy-AI module kept surfacing, and it means an unnormalized ranking metric can improve because your traffic shifted rather than because your ranker did."
          }
        },
        {
          "q": "How would you split data to evaluate a ranker?",
          "a": "BY QUERY, ALWAYS, AND BY TIME AS WELL IF THE CORPUS OR INTENT DRIFTS. The unit of generalization is the query: you want to know how the ranker performs on queries it has not seen, so a query's documents must appear entirely in train or entirely in test. A random ROW split puts some of a query's documents on each side, and a model can then learn the answer for that query rather than how to rank in general — the query becomes an identifiable group and the group's relevance pattern becomes a lookup table. I MEASURED THE GENERAL FORM of this on grouped data with a per-group signature and a weak true signal: a random row split gave AUC 0.9999 and a group split gave 0.5807, an optimism of +0.4192 with the same data, the same model and the same features. That is not a subtle bias; it is the difference between a working model and a useless one. AND THE FEATURE SIDE STILL APPLIES: query-level aggregates — historical CTR for this query, average dwell for this query — must be computed inside the training window with as-of logic, or they carry test information across a correctly-drawn boundary, which is exactly the failure the recommender lesson measured.",
          "deepDive": {
            "q": "Is there a second split axis?",
            "a": "There is a second split axis that matters in production and is usually ignored: the DOCUMENT. If the corpus changes — new products, new pages, new listings — then the deployment question is partly about documents the model has not seen, and a split that holds queries out but shares documents across the boundary will overstate performance on new inventory. The clean version is a two-dimensional holdout: unseen queries against seen documents, seen queries against unseen documents, and unseen against unseen, reported separately. That is more work and it answers three different deployment questions, which is usually what a stakeholder actually wants to know. It is also worth stating the head-tail issue: search traffic is extremely skewed, so a random query split is dominated by head queries and a model can improve on the aggregate while degrading the tail, which is where the unmet need usually lives. Stratifying the report by query frequency band is one groupby and it changes conclusions regularly."
          }
        },
        {
          "q": "Lexical or dense retrieval, and why?",
          "a": "BOTH, AND THE REASON IS THAT THEY FAIL ON DISJOINT QUERY TYPES rather than that one is better on average. Lexical scoring such as BM25 is strong exactly where an exact token match carries the meaning — rare terms, product identifiers, model numbers, error codes, names — and weak on synonyms, paraphrase and intent. Dense two-tower retrieval is strong on precisely those and weak on rare exact tokens, which a fixed-dimensional embedding smooths away, plus out-of-domain vocabulary and long-tail entities the encoder never saw. Tuning either one alone therefore leaves the other's failure class completely untouched, which is why every serious stack runs the union. THE FUSION SHOULD BE RANK-BASED. Reciprocal rank fusion — sum over retrievers of 1/(k + rank), with k around 60 — needs no score calibration, and that matters because BM25 scores and dot-product similarities are on entirely incomparable scales, so a score-weighted combination requires a calibration step that is itself a modelling problem. RRF has one constant, no training, and is genuinely hard to beat with a learned combiner, which makes it the right default rather than a fallback.",
          "deepDive": {
            "q": "Is there a third option that partly dissolves the dichotomy?",
            "a": "There is a third retrieval family worth knowing because it partly dissolves the dichotomy: learned sparse retrieval, such as SPLADE or doc2query-style expansion, which produces sparse term-weighted representations learned by a neural model. It keeps the exact-match strength and inverted-index efficiency of lexical retrieval while learning expansions that cover synonyms, so it captures some of the dense side's advantage without the dense side's blind spot on rare tokens. It is not a strict replacement — it still struggles on genuinely out-of-vocabulary entities — and it is the strongest single-retriever option in several benchmarks. The practical point for a design discussion is that 'lexical versus dense' is a 2020 framing and the current answer is a portfolio, chosen by measuring per-query-type recall on your own traffic rather than by citing a benchmark. That measurement — recall by query class, on your data — is the thing that actually decides the architecture, and it takes an afternoon."
          }
        },
        {
          "q": "What labels would you use, and for what?",
          "a": "THREE LABELS FOR THREE JOBS, AND USING ONE FOR ALL THREE IS THE MOST COMMON STRUCTURAL MISTAKE IN A SEARCH STACK. TO TRAIN: clicks, because they are free and high-volume, but DEBIASED, because raw clicks measure placement at least as much as preference — measured, rank 1 gave a click rate of 0.4991 against 0.0989 at rank 10 on identical true relevance. Inverse propensity weighting on the examination probability corrects it and requires the propensity, which is best obtained from a small randomized-ranking slice logged at serving time rather than estimated from a model. TO VALIDATE: human relevance judgements, because they are the only unbiased ground truth and because a validation signal drawn from the same biased distribution as training cannot detect the bias. They are expensive and low-volume, which is exactly the right shape for a validation set. TO MONITOR: reformulation and abandonment, which are session-level, free, high-volume and align with the user's goal far better than any impression-level signal — a user who did not have to ask again is the cheapest good outcome measure search has. AND ABANDONMENT is the negative signal most systems never instrument.",
          "deepDive": {
            "q": "Which signal is search's structural advantage?",
            "a": "The reformulation signal deserves emphasis because it is search's structural advantage over most ranking domains and it is under-used. It is session-level, so it captures whether the user's need was met rather than whether a particular result attracted a click; it is naturally negative-labelled, giving signal on failures rather than only successes; and it costs nothing to collect. The caveat is that reformulation is not always failure — exploratory sessions legitimately involve several queries — so it needs segmenting by intent, and a rising reformulation rate on navigational queries is a much stronger alarm than on informational ones. On the human-judgement side, the thing worth budgeting for is not volume but COVERAGE: a few thousand judgements stratified across query frequency bands and intent classes is worth more than ten thousand drawn from head traffic, because the head is where the ranker is already fine. That is the same stratification argument as everywhere in this curriculum — the aggregate is a weighted average and the failures live in the tail."
          }
        },
        {
          "q": "How does this lesson fit the module's theme?",
          "a": "SEARCH HAS THE SHARPEST VERSION OF THE MODULE'S SPINE BECAUSE ITS STRUCTURE IS THE MOST EXPLICIT. The query is what makes ranking learnable — it defines which documents compete, it makes relevance a relative rather than absolute property, and it is the unit the metric normalizes over. AND IT IS EXACTLY THE UNIT A NAIVE SPLIT DESTROYS. Put a query's documents on both sides of the split and the model learns that query's answer rather than how to rank, which the grouped-split measurement showed in its general form: AUC 0.9999 against 0.5807, an optimism of +0.4192 from the same data and model. THE STRUCTURE IS THE PRIOR AND THE TRAP, in one object. WHAT SEARCH ADDS to the module's argument is that the dependency has a second axis most people never consider — documents as well as queries — so the honest evaluation is a two-dimensional holdout answering three different deployment questions. AND THE FEATURE CHANNEL STILL APPLIES on top of both: query-level aggregates computed before the split leak across a correctly-drawn boundary, which is the recommender lesson's finding arriving in a different domain with the same mechanism.",
          "deepDive": {
            "q": "How does this connect to retrieval-augmented generation?",
            "a": "It is worth noting how this connects to the retrieval-augmented generation work, since that is where most people now meet ranking. A RAG system is search with a generation step attached, and it inherits every problem in this lesson: the retriever's recall is a hard ceiling on the generator's factuality, the split for evaluating retrieval must be by query, hybrid retrieval beats either method alone for the same disjoint-failure reason, and the labels have the same three-jobs structure. What RAG adds is that the downstream metric — answer quality — is generated by a model whose scoring inherits the eval problems from the LLM-systems module, so the whole evaluation stack has two layers of measurement error rather than one. Anyone who has internalized this lesson's frame will ask the right first question about a RAG system, which is what the retriever's recall is on a query-level held-out set, and that question is skipped remarkably often in favour of tuning the prompt."
          }
        },
        {
          "q": "You improved NDCG offline and online metrics did not move. What do you check?",
          "a": "THE SAME THREE THINGS AS THE RECOMMENDER CASE, WITH ONE SEARCH-SPECIFIC ADDITION. FIRST, WHETHER THE OFFLINE LABELS ARE BIASED IN THE INCUMBENT'S FAVOUR. If the relevance labels come from logged clicks, they encode the current ranker's placement, so a new model is rewarded for agreeing with the old one and NDCG measures similarity rather than quality. Evaluating on human judgements or on a randomized-ranking slice removes that, and the gap between the two evaluations is itself diagnostic. SECOND, WHETHER RETRIEVAL CHANGED AT ALL — a ranking gain over a fixed candidate set cannot exceed the retrieval recall ceiling, so if recall@1000 is the binding constraint, reordering does nothing. THIRD, WHETHER THE SPLIT WAS BY QUERY and whether any query-level feature was computed across the boundary, since either produces an offline gain with no online counterpart. THE SEARCH-SPECIFIC ONE IS THE QUERY MIX: NDCG averaged over a query sample that does not match live traffic will move for reasons unrelated to the ranker, and head-weighted improvements can be invisible online if the traffic is tail-heavy or vice versa. Stratifying the offline metric by query frequency band usually resolves it in one groupby.",
          "deepDive": {
            "q": "Is there a fourth possibility specific to ranking?",
            "a": "There is a fourth possibility specific to ranking that is easy to miss: the improvement is real, and it is below the interface's resolution. If the product shows ten results and your change reorders positions six through nine, NDCG moves and user behaviour does not, because almost nobody scrolls that far — the examination probability at those ranks is small enough that the change is invisible. That is not a measurement failure, it is a genuine mismatch between the metric's discount and the interface's actual examination curve, and it is the argument for fitting the discount to your own logs rather than using log₂(i+1). Checking WHERE in the ranking your change acts, before running the experiment, is a two-line diagnostic that predicts whether an online test can detect it at all — and it is the ranking version of the minimum-detectable-effect discipline from the experimentation module, which is the check most likely to be missing when an offline gain fails to reproduce."
          }
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
    ],
    "demoTitles": {
      "pagerank": "PageRank",
      "vector-search": "Vector Search",
      "rag-reranker": "RAG Reranker",
      "roc": "ROC, PR & Thresholds"
    }
  }
};
