// GENERATED from content/lessons/interview-capstone/design-search-ads.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/interview-capstone/design-search-ads/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "design-search-ads": {
    "level": "core",
    "body": {
      "intuition": [
        "Search and ads share a funnel with the recommender and differ in one structural way that decides the whole design: IN A FEED ONLY THE ORDER MATTERS, AND IN AN AUCTION THE PROBABILITY IS A PRICE. That single sentence is the case, and knowing which camp you are in changes the loss function, the metric, and what counts as a bug.",
        "The surprising half is that the naive version of 'ads need calibration' is wrong, and the arithmetic says so. In a second-price auction ranked by eCPM = bid x pCTR, the price charged is the runner-up's eCPM divided by the winner's pCTR - so a UNIFORM scale error cancels in both the ranking and the price. Measured across pCTR multipliers of 0.5x to 2.0x, revenue moved by at most 0.1%.",
        "The expensive error is HETEROGENEOUS. A per-ad log-normal pCTR error with sd 0.25 cost 4.7% of revenue, sd 0.50 cost 14.8%, and sd 1.00 cost 36.9% - because a per-ad error reorders the auction and puts the wrong ad first. So the requirement is not 'calibrated' but CALIBRATED CONDITIONAL ON THE AD, which is module 24's reference-class thesis arriving as a revenue number."
      ],
      "math": [
        {
          "h": "The auction, and why uniform error cancels",
          "paras": [
            "Rank by expected value per impression; charge the minimum bid that would have retained the position. Both the ranking statistic and the price contain pCTR, and a uniform scale factor appears in both.",
            "This is why a systematically overconfident pCTR model can run for years without anyone noticing in revenue."
          ],
          "tex": "\\text{rank by } e_i = b_i\\hat{p}_i, \\qquad \\text{price}_{(1)} = \\frac{e_{(2)}}{\\hat{p}_{(1)}} = \\frac{b_{(2)}\\hat{p}_{(2)}}{\\hat{p}_{(1)}}: \\quad \\hat{p}\\to c\\hat{p} \\Rightarrow \\text{order fixed, price fixed}",
          "texNote": "Measured revenue change for uniform multipliers 0.5x, 0.8x, 1.25x and 2.0x: -0.1%, +0.0%, -0.0%, -0.0%. The cancellation is exact up to the reserve price."
        },
        {
          "h": "★ Heterogeneous error is expensive because it reorders",
          "paras": [
            "A per-ad multiplicative error does not cancel: it changes which ad wins and derives the price from a wrong estimate.",
            "Log-normal per-ad error of the stated standard deviation, eight bidders per auction, second price with a reserve."
          ],
          "tex": "\\begin{array}{lr} \\text{per-ad error sd} & \\text{revenue vs calibrated}\\\\ 0.00 & +0.0\\%\\\\ 0.25 & -4.7\\%\\\\ 0.50 & -14.8\\%\\\\ 1.00 & \\mathbf{-36.9\\%} \\end{array}",
          "texNote": "So the ads-specific requirement is calibration CONDITIONAL on the ad, the advertiser, the slot and the query segment - a per-slice property, not an aggregate one. Aggregate ECE can be excellent while per-segment calibration is destroying a third of revenue."
        },
        {
          "h": "Where uniform calibration does bite: eligibility",
          "paras": [
            "A reserve price is a threshold on eCPM, and a uniform scale error moves every eCPM across it together. Pricing is invariant; eligibility is not."
          ],
          "tex": "\\text{show iff } b\\hat{p} \\geq \\text{floor}: \\quad \\hat{p}\\times 0.5 \\Rightarrow \\text{fill } 0.999 \\to 0.960, \\qquad \\hat{p}\\times 2.0 \\Rightarrow \\text{fill } \\to 1.000",
          "texNote": "The honest summary to give in an interview: a uniform scale error is free for PRICING and not for ELIGIBILITY; a per-ad error is expensive for both. Saying which one you mean is the differentiator."
        }
      ],
      "code": [
        {
          "h": "The case, walked",
          "paras": [
            "Sponsored results on a search page. The organic and sponsored sides have different objectives and share a latency budget."
          ],
          "code": "# 1 CLARIFY  sponsored results on a search page, 50k QPS peak, p99 150 ms\n#            (tighter than a feed - the page blocks on it), objective is\n#            long-run revenue subject to a relevance floor\n# 2 FRAME    per-query auction over eligible ads. TWO models: pCTR (must be\n#            calibrated per-ad) and relevance (only needs to rank)\n# 3 LABELS   click (position-biased, as in 25-03), conversion (delayed days,\n#            sparse, and the thing advertisers pay for), advertiser-reported\n#            conversions (biased and self-reported)\n# 4 FEATURES query-ad match, historical ad CTR (★ cold-start trap), advertiser\n#            quality, slot position, user context. Serving-time only.\n# 5 MODEL    retrieval by query-ad match -> pCTR + relevance -> auction\n# 6 SERVING  eligible ads (~1000) -> filter (policy, budget) -> score -> auction\n# 7 METRICS  revenue/1000 queries PRIMARY; guardrails: relevance, ad load,\n#            advertiser ROI, long-run query abandonment\n# 8 ITERATE  ship calibration monitoring per segment BEFORE any model change\n\n# ★ The ad-load guardrail is the one with real teeth: more ads is always more\n#   revenue today and fewer searches next quarter. It is the clearest Goodhart\n#   case in a design round.",
          "caption": "The organic and sponsored sides differ in exactly the way this lesson is about: organic needs a ranking, sponsored needs a price."
        },
        {
          "h": "Search-specific: relevance is a ranking problem again",
          "paras": [
            "The organic side is the recommender case with an explicit query, which changes retrieval and leaves the label problem intact."
          ],
          "code": "# RETRIEVAL     lexical (BM25) UNION dense (two-tower) - hybrid beats either,\n#               because they fail on different queries: lexical on synonyms,\n#               dense on rare exact terms, IDs and typos\n# RANKING       GBDT on match features + behavioural signals\n# RE-RANK       cross-encoder on the top ~50 (128 items fit a 115 ms budget)\n\n# LABELS - the same proxy ladder as the feed, one rung better\n#   click            seconds, position-biased\n#   long dwell       minutes, closer to satisfaction\n#   no reformulation ★ the strongest cheap signal in search: the user did\n#                      not have to ask again\n#   explicit rating  rare, expensive, and the only unbiased one\n\n# ★ 'No reformulation' is the answer that marks someone who has worked on\n#   search, because it is a session-level label rather than an impression-level\n#   one, and it aligns with the goal far better than a click does.",
          "caption": "Hybrid retrieval is worth stating with the reason: the two methods fail on disjoint query types, which is why the union beats tuning either."
        }
      ],
      "useCases": [
        "Any search, ads, or marketplace-ranking design round, and the class of systems where a predicted probability is used as a price rather than as an ordering.",
        "Diagnosing revenue loss in an auction, where per-segment calibration is the first thing to check and aggregate calibration is close to uninformative.",
        "Deciding whether a model needs calibration at all, by asking whether anything downstream consumes the probability rather than the order.",
        "Setting reserve prices and ad load, where the trade is short-run revenue against long-run user retention and the guardrail is the whole decision."
      ],
      "pitfalls": [
        "Saying 'ads need a calibrated model' without qualification. Uniform miscalibration from 0.5x to 2.0x moved revenue by at most 0.1%, because the scale cancels in second-price pricing.",
        "Reporting aggregate calibration for an auction. The costly error is per-ad: sd 0.25 cost 4.7% of revenue, sd 0.50 cost 14.8%, sd 1.00 cost 36.9%.",
        "Forgetting the reserve price. Uniform scale is free for pricing and not for eligibility - a 0.5x error moved fill rate from 0.999 to 0.960.",
        "Using historical ad CTR as a feature without handling cold start. New ads have no history, rank low, get no impressions, and never accumulate history - the feedback loop from the recommender case with money attached.",
        "Optimizing revenue per query with no ad-load guardrail. More ads is always more revenue today and fewer searches next quarter, which is the cleanest Goodhart case available.",
        "Treating search relevance and ad ranking as the same problem. One needs an ordering and the other needs a price, and the loss function should differ accordingly.",
        "Choosing dense retrieval over lexical rather than alongside it. They fail on disjoint query types - synonyms versus rare exact terms, IDs and typos - so the union is the design."
      ],
      "connections": [
        {
          "ref": "trustworthy-ai/calibration",
          "text": "The property this case turns into revenue, and the reason the aggregate number is the wrong one - per-segment calibration is what the auction consumes."
        },
        {
          "ref": "interview-capstone/design-recommender",
          "text": "The shared funnel, the shared position-bias problem, and the shared feedback loop - here with advertiser money making the cold-start trap more expensive."
        },
        {
          "ref": "rag-agents/chunking-retrieval",
          "text": "Hybrid lexical-plus-dense retrieval and why the union wins, which is the same argument in a different application."
        },
        {
          "ref": "trustworthy-ai/alignment-governance",
          "text": "Ad load as the design round's clearest Goodhart case: the proxy rises monotonically while the thing you want turns over."
        },
        {
          "ref": "ml-theory/evaluation-metrics",
          "text": "Why the primary metric here is revenue per thousand queries rather than CTR, and what the guardrail tier has to contain for that to be safe."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "★ What is the structural difference between a feed and an auction?",
          "a": "In a feed only the ORDER matters. In an auction the probability is a PRICE. That decides the loss, the metric, and what counts as a bug."
        },
        {
          "q": "Give the second-price formula.",
          "a": "Rank by eᵢ = bᵢ·p̂ᵢ; the winner pays e₍₂₎/p̂₍₁₎ = b₍₂₎p̂₍₂₎/p̂₍₁₎."
        },
        {
          "q": "★ What does UNIFORM pCTR miscalibration cost?",
          "a": "Essentially nothing for pricing: −0.1% to +0.0% across multipliers 0.5× to 2.0×. The scale appears in both the ranking and the price, so it cancels."
        },
        {
          "q": "What does HETEROGENEOUS miscalibration cost?",
          "a": "Per-ad log-normal error: sd 0.25 → **−4.7%**, sd 0.50 → **−14.8%**, sd 1.00 → **−36.9%**. It reorders the auction and prices off a wrong estimate."
        },
        {
          "q": "So what is the real requirement?",
          "a": "Calibrated CONDITIONAL ON THE AD (and advertiser, slot, query segment) — a per-slice property. Module 24's reference class, as a revenue number."
        },
        {
          "q": "Where does uniform calibration bite?",
          "a": "Eligibility. A reserve price is a threshold on eCPM, so a 0.5× scale moved fill rate 0.999 → 0.960. Free for pricing, not for eligibility."
        },
        {
          "q": "Why hybrid retrieval in search?",
          "a": "Lexical and dense fail on DISJOINT query types — lexical on synonyms, dense on rare exact terms, IDs and typos. The union beats tuning either."
        },
        {
          "q": "Name the strongest cheap label in search.",
          "a": "No reformulation — the user didn't have to ask again. A session-level label that aligns with the goal far better than an impression-level click."
        },
        {
          "q": "What is the ad cold-start trap?",
          "a": "Historical ad CTR as a feature: new ads have no history → rank low → no impressions → no history. The recommender's feedback loop with money attached."
        },
        {
          "q": "What guardrail has the most teeth here?",
          "a": "Ad load. More ads is always more revenue today and fewer searches next quarter — the cleanest Goodhart case in any design round."
        },
        {
          "q": "Which labels does the ads side have?",
          "a": "Click (position-biased), conversion (delayed days, sparse, what advertisers pay for), advertiser-reported conversions (biased, self-reported)."
        },
        {
          "q": "Does the relevance model need calibration?",
          "a": "No — it only feeds an ordering. Only the model whose output is consumed as a probability does. Ask what consumes the number."
        }
      ],
      "standard": [
        {
          "q": "Design the sponsored results for a search page.",
          "a": "CLARIFY: sponsored slots on a search results page, 50k peak QPS, p99 of 150 ms — tighter than a feed because the page blocks on it — optimizing long-run revenue subject to a relevance floor. FRAME: a per-query auction over eligible ads, and critically TWO models with different requirements. The pCTR model's output is consumed as a probability and must be calibrated; the relevance model's output only feeds an ordering and need not be. LABELS: clicks arrive in seconds and are position-biased exactly as in the feed case; conversions arrive in days, are sparse, and are what advertisers actually pay for; advertiser-reported conversions are available and self-reported, so biased. FEATURES: query-ad match, historical ad CTR — which is a cold-start trap — advertiser quality, slot, user context, all serving-time only. SERVING: about a thousand eligible ads, filtered by policy and budget, scored, then auctioned. METRICS: revenue per thousand queries as primary, with relevance, ad load, advertiser ROI and query abandonment as guardrails. AND I'D SHIP PER-SEGMENT CALIBRATION MONITORING BEFORE ANY MODEL CHANGE, because as the next answer shows, the aggregate number is close to uninformative here.",
          "deepDive": {
            "q": "Why argue the ad-load guardrail rather than simply list it?",
            "a": "The ad-load guardrail deserves to be argued rather than listed, because it is the clearest Goodhart case available in a design round and it maps directly onto module 24's measurement. Showing more ads raises revenue per query monotonically and reduces the number of queries, with the second effect arriving quarters later — so the proxy rises the whole way while the quantity you want turns over, exactly the shape where true quality peaked at 2.536 and the proxy kept climbing to a true value of −49.319. The defence is the same as the alignment one: bound the optimization pressure with an explicit ad-load cap chosen on a long-horizon holdout rather than on the revenue curve, and treat that cap as a governance decision with an owner rather than a tunable. Saying that in a round, briefly, with the mechanism named, is unusual and it demonstrates the thing the round is testing — that you would be willing to own the system rather than only ship it."
          }
        },
        {
          "q": "Does the pCTR model need to be calibrated? Be precise.",
          "a": "THE NAIVE ANSWER IS YES AND IT IS WRONG IN AN INSTRUCTIVE WAY. In a second-price auction ranked by eCPM = bid × pCTR, the winner pays the runner-up's eCPM divided by the winner's pCTR. A UNIFORM scale error appears in both the ranking statistic and the price, so it cancels: measured across multipliers of 0.5×, 0.8×, 1.25× and 2.0×, revenue moved by at most 0.1%. A systematically overconfident pCTR model can run for years without showing up in revenue at all. THE EXPENSIVE ERROR IS HETEROGENEOUS, because a per-ad error does not cancel — it reorders the auction, putting the wrong ad first, and then derives the price from a wrong estimate. Measured with per-ad log-normal error: sd 0.25 cost 4.7% of revenue, sd 0.50 cost 14.8%, and sd 1.00 cost 36.9%. SO THE REQUIREMENT IS NOT 'CALIBRATED' BUT CALIBRATED CONDITIONAL ON THE AD — and by extension on the advertiser, the slot and the query segment. AND THERE IS A THIRD PIECE: uniform scale is free for pricing and NOT for eligibility, because a reserve price is a threshold on eCPM, so a 0.5× error moved the fill rate from 0.999 to 0.960.",
          "deepDive": {
            "q": "How does that connect back to the trustworthy-AI material?",
            "a": "That decomposition — free for pricing, costly for eligibility, and per-slice error costly for both — is the precise answer, and it is a direct instance of module 24's thesis: an aggregate ECE is a true number about a population you chose, and the auction consumes a per-slice property that the aggregate can hide entirely. A pCTR model with excellent overall calibration and systematic per-vertical bias is losing a double-digit percentage of revenue while every dashboard is green. The practical consequence is that calibration monitoring for ads must be sliced by whatever the auction conditions on, and the slices are numerous — advertiser, vertical, slot, device, query intent class — which makes it a real engineering commitment rather than a metric. Two more wrinkles worth knowing: first-price auctions, which much of the display market moved to, change this analysis because the price no longer contains pCTR, so uniform calibration stops being free; and budget pacing introduces a feedback loop where a miscalibrated pCTR causes budgets to exhaust at the wrong time of day, which shows up as a revenue loss with no obvious calibration symptom."
          }
        },
        {
          "q": "How does the search side differ from the recommender case?",
          "a": "THE QUERY CHANGES RETRIEVAL AND LEAVES THE LABEL PROBLEM ALMOST INTACT. Retrieval becomes hybrid: lexical scoring such as BM25 UNIONED with dense two-tower retrieval, and the reason to say union rather than 'dense is better' is that they fail on disjoint query types — lexical misses synonyms and paraphrases, dense misses rare exact terms, product IDs, model numbers and typos. Tuning either alone leaves the other's failure class unaddressed, which is why every serious search stack runs both. Ranking and re-ranking are then the same funnel as the feed, with a cross-encoder on the top 50 because 128 items is what a 115 ms budget permits. THE LABELS ARE THE SAME LADDER WITH ONE BETTER RUNG. Clicks are position-biased identically. Long dwell is closer to satisfaction. And search has NO REFORMULATION — the user did not have to ask again — which is the strongest cheap signal available, because it is session-level rather than impression-level and aligns with the actual goal far better than a click does. Explicit ratings are unbiased and too rare to train on. THE OTHER DIFFERENCE IS INTENT VARIANCE: navigational, informational and transactional queries want different things, so a single ranker optimizing one metric across all of them is averaging over incompatible objectives.",
          "deepDive": {
            "q": "Where does search-specific judgment actually show?",
            "a": "The intent point is worth developing because it is where search-specific judgment shows. A navigational query has essentially one correct answer and the metric that matters is whether it is at rank one; an informational query wants coverage and diversity; a transactional query wants freshness and availability. Optimizing aggregate NDCG across all three produces a ranker that is mediocre at each, and the standard fix is either an intent classifier routing to different rankers or intent features letting one model condition. That is the same subgroup-aggregation problem module 24 kept surfacing — the aggregate metric hides per-segment behaviour — appearing here as a product decision. The second search-specific issue is freshness: for some query classes the right answer changes hourly, so index update latency is a first-class design parameter rather than an implementation detail, and it interacts with the funnel because a stale ANN index silently drops new documents from retrieval, which is invisible in end-to-end metrics until it is large. Monitoring retrieval recall on a fresh-document holdout is the cheap catch."
          }
        },
        {
          "q": "How would you handle ad cold start?",
          "a": "IT IS THE RECOMMENDER'S FEEDBACK LOOP WITH MONEY ATTACHED, AND THE MONEY MAKES IT WORSE IN BOTH DIRECTIONS. A new ad has no historical CTR, so the pCTR model predicts low, so its eCPM is low, so it loses auctions, so it accumulates no history — and the advertiser, who is paying, sees zero delivery. Content features help and do not break the loop: ad text, landing page, advertiser history and vertical give the model a prior, which is necessary and not sufficient because proven ads still win. THE MECHANISM THAT BREAKS IT is an explicit exploration allocation — an optimistic prior on new ads, or a reserved fraction of impressions, which is a bandit's exploration term with a budget you can state. Thompson sampling over the pCTR posterior is the principled version and is genuinely used, because it allocates exploration in proportion to uncertainty rather than uniformly. THE COMPLICATION ADS ADD is that exploration spends someone else's money: showing an unproven ad costs the auction its expected revenue AND may charge an advertiser for a poorly-targeted impression. So the exploration budget is a commercial decision, not only a statistical one, and stating that is what distinguishes an answer that has met an advertiser from one that has not.",
          "deepDive": {
            "q": "Which related trap does the auction make worse?",
            "a": "The related trap is the pCTR model's own feedback loop, which is subtler than the recommender's because the auction amplifies it. The model's predictions determine which ads are shown, which determines the training data, so an ad the model underestimates never generates the evidence that would correct the underestimate — and because eCPM ranking is a hard cutoff rather than a soft one, the censoring is severe. That makes propensity logging even more valuable here than in the feed case, and the same module 23 argument applies: log the probability with which each ad was selected, keep a small randomized slice, and you can do off-policy evaluation for years. Without it, every counterfactual question about the auction — would this ad have converted, what would a different ranker have earned — becomes an observational estimate on logs the incumbent generated. The honest framing for a stakeholder is that the exploration slice is the price of being able to answer those questions at all, and its cost is exactly measurable while its value is not, which is why it needs a defender."
          }
        },
        {
          "q": "What metrics would you use, and what would you refuse to optimize?",
          "a": "PRIMARY: REVENUE PER THOUSAND QUERIES, because it captures the auction's actual output and is not gameable by simply showing more ads within a fixed page. GUARDRAILS, ALL WITH THE BURDEN OF PROOF REVERSED — I need evidence of no harm, not absence of evidence of harm: relevance of shown ads, ad load, advertiser ROI, and long-run query abandonment. WHAT I WOULD REFUSE TO OPTIMIZE IS CTR, and the reason is worth stating: CTR rises when you show fewer, safer ads and when you show more clickbait, so it is compatible with both a conservative and a degenerate strategy and distinguishes neither. It is a diagnostic, not an objective. I WOULD ALSO REFUSE SHORT-HORIZON REVENUE AS THE SOLE TARGET, because ad load is the clean Goodhart case: more ads raises revenue per query today and reduces queries next quarter, so a system optimized on the short-horizon proxy walks off the end of the range where the proxy tracks value. THE DEFENCE IS THE ONE FROM MODULE 24 — bound the optimization pressure with an ad-load cap selected on a long-horizon holdout, and treat the cap as an owned governance decision rather than a hyperparameter someone can tune in a config file.",
          "deepDive": {
            "q": "Which guardrail is most often omitted?",
            "a": "Advertiser ROI deserves particular emphasis because it is the guardrail teams most often omit and the one whose failure is slowest and most damaging. An auction that extracts maximum revenue per impression in the short run degrades advertiser returns, and advertisers respond by reducing budgets — an effect with a lag of quarters that no impression-level metric can see. It is a two-sided marketplace, so the health of the supply side is part of the objective even though it appears in none of the model's losses. That is the same structure as creator coverage in the feed case, and both are instances of the general point that a system with two populations needs guardrails for the one that is not the direct user. On measurement: the long-horizon effects here are exactly where module 23's methods earn their keep, since you cannot run a two-year experiment on ad load, and the practical answers are geo-level long-running holdouts and synthetic control on markets — with the honest caveat that the parallel-trends assumption is doing real work and its pre-trend test catches a 12% bias only 18.5% of the time."
          }
        },
        {
          "q": "What is the one thing you would want the interviewer to remember from this case?",
          "a": "ASK WHAT CONSUMES THE NUMBER. That question decides more of this design than any modelling choice, and it generalizes past ads. If a downstream system consumes only the ORDER — a feed, an organic search ranking, a recommendation list — then calibration is optional and any monotone transform is free, which is why temperature scaling is a no-op for those systems. If something consumes the PROBABILITY — an auction price, a cost-based threshold, an expected-value calculation, a cascade decision, an abstention rule — then the probability must be right, and 'right' means right conditional on whatever the consumer conditions on. THE MEASUREMENTS MAKE THE STAKES CONCRETE: uniform pCTR error cost at most 0.1% of revenue because second-price pricing cancels it, and per-ad error cost 4.7%, 14.8% and 36.9% at increasing spread because it reorders the auction. Same model, same aggregate calibration, two completely different consequences depending on the structure of the error and what reads it. THAT IS MODULE 24'S THESIS ARRIVING AS A REVENUE NUMBER: the guarantee 'this model is calibrated' is true over a reference class, and the consumer's reference class is the one that decides whether it matters.",
          "deepDive": {
            "q": "What generalizes from this into real work?",
            "a": "The generalization is worth carrying into every remaining case and into real work. Most systems drift from consuming an order to consuming a probability without anyone re-examining the model — someone wires a threshold to a score, or a downstream service starts multiplying two models' outputs, or a cost calculation appears in a config — and at that moment a model that was fine becomes wrong in a way nothing alerts on. The cheap defence is a written contract for every model output: what it means, what consumes it, and whether it is an ordering or a probability, checked when consumers change. That sounds bureaucratic and is about ten lines in a model card; the alternative is discovering it through a revenue investigation. It is also the reason this lesson sits after the calibration lesson rather than before it — the property was defined there, and here it acquires a price, which is usually what makes an engineering organization act on something."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "★ Feed vs auction, in one line",
        "back": "In a feed only the ORDER matters. In an auction the probability is a PRICE. That single distinction decides the loss function, the metric, and what counts as a bug."
      },
      {
        "type": "formula",
        "front": "Second-price auction",
        "back": "Rank by eᵢ = bᵢ·p̂ᵢ (eCPM); winner pays e₍₂₎/p̂₍₁₎ = b₍₂₎p̂₍₂₎/p̂₍₁₎. The winner's pCTR appears in BOTH the ranking and the price."
      },
      {
        "type": "formula",
        "front": "★ Uniform miscalibration is FREE for pricing",
        "back": "Multipliers 0.5× / 0.8× / 1.25× / 2.0× moved revenue **−0.1% / +0.0% / −0.0% / −0.0%**. The scale cancels in both the ranking and the price. An overconfident pCTR model can run for years unnoticed."
      },
      {
        "type": "formula",
        "front": "★ Heterogeneous miscalibration is not",
        "back": "Per-ad log-normal error: sd 0.25 → **−4.7%**, sd 0.50 → **−14.8%**, sd 1.00 → **−36.9%**. It REORDERS the auction and prices off a wrong estimate."
      },
      {
        "type": "intuition",
        "front": "So what is the ads requirement?",
        "back": "Not \"calibrated\" — **calibrated CONDITIONAL ON THE AD** (advertiser, slot, query segment). A per-slice property. Module 24's reference class, priced."
      },
      {
        "type": "pitfall",
        "front": "Where uniform calibration DOES bite",
        "back": "Eligibility. A reserve price is a threshold on eCPM, so every eCPM moves across it together: 0.5× took fill rate **0.999 → 0.960**. Free for pricing, not for eligibility."
      },
      {
        "type": "intuition",
        "front": "Why hybrid retrieval",
        "back": "Lexical and dense fail on DISJOINT query types — lexical on synonyms/paraphrase, dense on rare exact terms, product IDs, model numbers, typos. The union beats tuning either."
      },
      {
        "type": "definition",
        "front": "The strongest cheap search label",
        "back": "NO REFORMULATION — the user didn't have to ask again. Session-level rather than impression-level, and far better aligned with the goal than a click."
      },
      {
        "type": "pitfall",
        "front": "Query intent variance",
        "back": "Navigational (one right answer at rank 1), informational (coverage/diversity), transactional (freshness/availability). One ranker on aggregate NDCG averages incompatible objectives — route or condition."
      },
      {
        "type": "pitfall",
        "front": "Ad cold start",
        "back": "No history → low pCTR → low eCPM → loses auctions → no history, and the advertiser sees zero delivery. Content features give a prior but don't break the loop. Thompson sampling over the pCTR posterior does."
      },
      {
        "type": "pitfall",
        "front": "★ Why not optimize CTR?",
        "back": "CTR rises both when you show fewer safer ads AND when you show clickbait — it's compatible with a conservative and a degenerate strategy and distinguishes neither. A diagnostic, not an objective."
      },
      {
        "type": "intuition",
        "front": "★ The question that generalizes",
        "back": "ASK WHAT CONSUMES THE NUMBER. Order-only → calibration optional, any monotone transform is free. Probability consumed (price, cost threshold, expected value, cascade, abstention) → it must be right, conditional on what the consumer conditions on."
      }
    ],
    "refs": [
      {
        "title": "McMahan et al. (2013), Ad Click Prediction: a View from the Trenches",
        "url": "https://research.google/pubs/pub41159/"
      },
      {
        "title": "Edelman, Ostrovsky & Schwarz (2007), Internet Advertising and the Generalized Second-Price Auction",
        "url": "https://www.aeaweb.org/articles?id=10.1257/aer.97.1.242"
      },
      {
        "title": "He et al. (2014), Practical Lessons from Predicting Clicks on Ads at Facebook",
        "url": "https://research.facebook.com/publications/practical-lessons-from-predicting-clicks-on-ads-at-facebook/"
      },
      {
        "title": "Karpukhin et al. (2020), Dense Passage Retrieval for Open-Domain Question Answering",
        "url": "https://arxiv.org/abs/2004.04906"
      },
      {
        "title": "Hofmann, Li & Radlinski (2016), Online Evaluation for Information Retrieval",
        "url": "https://www.nowpublishers.com/article/Details/INR-051"
      }
    ],
    "demos": [
      "pagerank",
      "vector-search",
      "calibration",
      "rag-reranker"
    ],
    "demoTitles": {
      "pagerank": "PageRank",
      "vector-search": "Vector Search",
      "calibration": "Model Calibration",
      "rag-reranker": "RAG Reranker"
    }
  }
};
