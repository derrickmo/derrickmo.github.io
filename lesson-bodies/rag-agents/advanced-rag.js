// GENERATED from content/lessons/rag-agents/advanced-rag.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/rag-agents/advanced-rag/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "advanced-rag": {
    "level": "advanced",
    "body": {
      "intuition": [
        "Everything in this lesson exists because of one cost asymmetry. A bi-encoder scores a query against a document by embedding each SEPARATELY and taking a dot product, which means every document vector can be computed once, offline, and reused forever - so search is a nearest-neighbour lookup over precomputed vectors. A cross-encoder feeds the query and the document through a transformer TOGETHER, letting every query token attend to every document token, which is substantially more accurate and cannot be precomputed at all, because the representation depends on the pair. One forward pass per candidate, per query.",
        "That asymmetry forces the architecture rather than suggesting it. You cannot cross-encode ten million passages per query, and you would not want to search with the weaker model if you could avoid it, so you use the cheap model to reduce ten million to a hundred and the expensive model to order those hundred. The funnel is not a design preference - it is what the cost structure permits. This is the same retrieve-then-rank shape that classical search settled on decades ago, rediscovered with neural components.",
        "The consequence to keep straight is directional. Reranking raises PRECISION at small k and cannot raise RECALL, because it only reorders what it was given - a passage that missed the candidate set is gone regardless of how good the reranker is. So a reranker is a reason to retrieve DEEPER, not shallower, and the common disappointment ('we added a reranker and it barely helped') is usually a system whose first stage was already the binding constraint. HyDE and query rewriting attack the problem from the other end, before retrieval, which is why they can move recall when a reranker cannot."
      ],
      "math": [
        {
          "h": "Bi-encoder vs cross-encoder - why one can be an index and the other cannot",
          "paras": [
            "The bi-encoder factorizes the score into two independent functions, which is exactly the property that permits precomputation.",
            "The cross-encoder refuses to factorize, and that refusal is both its accuracy advantage and its cost."
          ],
          "tex": "\\text{bi:}\\;\\; s(q,d) = f(q)^\\top f(d) \\;\\;\\text{(precompute all } f(d)\\text{)} \\qquad\\text{cross:}\\;\\; s(q,d) = g([q;d]) \\;\\;\\text{(no factorization)}",
          "texNote": "Because the bi-encoder's document term does not depend on the query, you compute it once at ingestion and search with ANN. The cross-encoder's score depends on the pair, so scoring N candidates costs N transformer passes - fine for N of 100, impossible for N of ten million. That single structural difference is what creates the funnel, and it is also why the cross-encoder is more accurate: joint attention lets the query condition the document's representation, which a dot product of two fixed vectors cannot express."
        },
        {
          "h": "The funnel's ceiling, again",
          "paras": [
            "The reranker's output is a subset of the retriever's candidates, so the retriever's recall bounds it.",
            "This is the module's ceiling structure appearing inside a single stage."
          ],
          "tex": "\\text{recall@}k_{\\text{final}}^{\\;\\text{reranked}} \\;\\le\\; \\text{recall@}K_{\\text{retrieve}}, \\qquad K \\gg k",
          "texNote": "So the reranker can only improve the ORDER within the candidate set. The practical rule follows directly: adding a reranker should make you increase K, not decrease it - retrieve 50 to 100 and rerank to 5, rather than retrieving 10. And the diagnostic when a reranker underdelivers is to measure recall@K first, because if recall@K is 0.72 then the reranked system is capped at 0.72 and the reranker was never the problem."
        },
        {
          "h": "Late interaction - the middle of the spectrum",
          "paras": [
            "ColBERT keeps a vector per TOKEN and scores by summing each query token's best match in the document.",
            "It is more expressive than one vector per document and far cheaper than a cross-encoder."
          ],
          "tex": "s(q,d) = \\sum_{i \\in q} \\max_{j \\in d} \\; E_{q_i}^\\top E_{d_j}",
          "texNote": "The max over document tokens is the 'late interaction': the query and document are still encoded independently, so document token vectors are precomputable, but the interaction happens at scoring time rather than being collapsed into a single dot product. The cost is storage - a vector per token rather than per passage, which is one to two orders of magnitude more, mitigated by aggressive quantization in later versions. It is the right answer when a single vector is too lossy and a cross-encoder is too slow."
        }
      ],
      "code": [
        {
          "h": "The funnel, and where each technique acts",
          "paras": [
            "Five interventions, each at a different point, with different reach - the position determines whether it can move recall."
          ],
          "code": "# THE PIPELINE, and what each stage CAN and CANNOT fix:\n#\n#   query -> [REWRITE/HyDE] -> [RETRIEVE K=100] -> [RERANK -> k=5] -> LLM\n#             ^^^^^^^^^^^^^     ^^^^^^^^^^^^^^     ^^^^^^^^^^^^^\n#             can move RECALL   sets the CEILING   PRECISION only\n#\n# BEFORE retrieval (can raise recall):\n#   HyDE          - generate a hypothetical ANSWER, embed THAT, search\n#                   with it. Closes the query/document distribution gap.\n#   multi-query   - generate 3-5 paraphrases, retrieve each, fuse (RRF).\n#                   Cheap, reliable, embarrassingly parallel.\n#   step-back     - ask a more general question first, retrieve for both.\n#   decomposition - split a multi-hop question into sub-questions.\n#\n# AFTER retrieval (cannot raise recall - reordering only):\n#   cross-encoder rerank over the top 50-100\n#   MMR / diversity re-ranking, to stop 5 near-duplicate chunks\n#\n# ★ THE RULE THAT FOLLOWS: adding a reranker means retrieving DEEPER,\n#   not shallower. K=100 -> rerank -> 5 beats K=10 -> rerank -> 5, and\n#   the second is the version people actually build.\n\n# THE DIAGNOSTIC WHEN A RERANKER \"DOESN'T HELP\":\nprint(\"recall@K (retrieval) :\", recall_at_K)   # the ceiling\nprint(\"recall@k after rerank:\", recall_at_k)   # bounded by the above\n#   If recall@K is 0.72, the whole system is capped at 0.72 and the\n#   reranker was never the binding constraint. Raise K, or fix chunking.",
          "caption": "Position in the pipeline determines reach: anything before retrieval can move the ceiling, anything after can only reorder beneath it."
        },
        {
          "h": "HyDE, and the honest caveats",
          "paras": [
            "A genuinely clever idea whose measured benefit is narrower than its popularity suggests."
          ],
          "code": "# THE IDEA: a question and a passage are different KINDS of text (18-01's\n# asymmetry). So don't embed the question - embed a fake ANSWER to it,\n# which lives in the same distribution as the corpus.\nhypothetical = llm(f\"Write a passage that answers: {query}\")\nresults = dense_index.search(embed(hypothetical), k)\n#   The hypothetical can be factually WRONG and still work - it only has\n#   to be the right SHAPE, with the right vocabulary and register. That\n#   is the insight, and it is why the technique is not as fragile as it\n#   first sounds.\n\n# WHEN IT ACTUALLY HELPS - be specific, because the gains are uneven:\n#   ✔ zero-shot / no training data, unfamiliar domain, out-of-domain corpus\n#   ✔ short or underspecified queries with little to embed\n#   ✘ you already fine-tuned the retriever on in-domain pairs (much less\n#     headroom - the asymmetry it fixes has already been trained away)\n#   ✘ latency-sensitive paths: it adds a FULL GENERATION before retrieval\n#   ✘ queries about rare entities, where a hallucinated hypothetical can\n#     drag the search into the wrong neighbourhood entirely\n\n# THE CHEAPER THING TO TRY FIRST, which often wins on cost/benefit:\nqueries = [query] + llm_paraphrase(query, n=3)     # multi-query\nfused   = rrf([retrieve(q) for q in queries])      # parallel, robust\n#   Same goal (cover more of the embedding space), no dependence on the\n#   hypothetical being well-shaped, and the retrievals run concurrently.\n\n# AND MEASURE THE COST, not just the gain: every one of these adds a\n# generation call or a model pass. Report recall@k AND p95 latency AND\n# cost per query. A 2-point recall gain for +600ms is a product decision,\n# not an obvious win.",
          "caption": "HyDE's insight is that the hypothetical need only be the right SHAPE, not correct - but its benefit concentrates in zero-shot settings, and multi-query is usually the better first try."
        }
      ],
      "useCases": [
        "Any RAG system where the top-5 passages must be genuinely the best five - the reranker is the cheapest large precision gain available once retrieval depth is adequate.",
        "Zero-shot retrieval over an unfamiliar corpus with no labelled pairs, which is HyDE's strongest measured setting.",
        "Multi-hop and underspecified questions, where decomposition and step-back retrieval reach evidence a single query cannot.",
        "Latency-budget negotiation, where each of these techniques is an explicit purchase of quality with milliseconds and money that must be measured, not assumed."
      ],
      "pitfalls": [
        "Expecting a reranker to fix recall. It reorders the candidate set and nothing more, so a passage that missed retrieval is gone - and 'the reranker barely helped' usually means retrieval was already the binding constraint.",
        "Adding a reranker without increasing K. The reranker's value comes from ordering a DEEP candidate set; retrieving 10 and reranking to 5 discards most of the benefit.",
        "Assuming a cross-encoder always beats the retriever's own ordering. On in-domain data with a fine-tuned bi-encoder the margin can be small, so measure rather than assume - it is a real model with real latency.",
        "Treating HyDE as a default. Its measured gains concentrate in zero-shot and out-of-domain settings; with a fine-tuned in-domain retriever the asymmetry it fixes has largely been trained away.",
        "Ignoring what these techniques cost. HyDE adds a full generation before retrieval, reranking adds a model pass over every candidate, multi-query multiplies retrieval calls - report p95 latency and cost per query beside the recall gain.",
        "Skipping diversity in the final selection. Five near-duplicate chunks fill the context with one fact; MMR or simple deduplication buys real coverage for very little.",
        "Stacking every technique at once. Each adds latency and a failure mode, and their gains overlap heavily - add one, measure, keep it only if it earns its cost."
      ],
      "connections": [
        {
          "ref": "rag-agents/chunking-retrieval",
          "text": "The stage this one sits on top of. If chunking is the binding constraint, no amount of reranking or query rewriting moves the number - which is why the diagnostic order runs upstream first."
        },
        {
          "ref": "rag-agents/rag-eval",
          "text": "Where the recall-versus-precision distinction becomes a measurement protocol, and where you learn whether any of these techniques earned its latency."
        },
        {
          "ref": "ml-applications/search-ranking",
          "text": "The classical version of this exact funnel, with the learning-to-rank objectives - pointwise, pairwise, listwise - that a neural reranker inherits."
        },
        {
          "ref": "multimodal/clip",
          "text": "The same bi-encoder structure in a different setting: two towers, independent encoding, dot-product scoring - and the same precomputation advantage that makes retrieval possible."
        },
        {
          "ref": "advanced-nlp/qa",
          "text": "The retriever-reader architecture this generalizes, including the measured result that reader accuracy is capped by retriever recall."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Bi-encoder versus cross-encoder in one sentence?",
          "a": "A bi-encoder embeds query and document separately so document vectors precompute; a cross-encoder scores the pair jointly, which is more accurate and cannot be precomputed."
        },
        {
          "q": "Why can't a cross-encoder be the retriever?",
          "a": "Its score depends on the pair, so scoring N candidates costs N transformer passes - fine at 100, impossible at ten million."
        },
        {
          "q": "What does a reranker improve?",
          "a": "Precision at small k, by reordering the candidate set. It cannot improve recall, because it only sees what retrieval returned."
        },
        {
          "q": "So what should change when you add a reranker?",
          "a": "Retrieve deeper. K of 50-100 reranked to 5 beats K of 10 reranked to 5, because the reranker's value is in ordering a deep candidate set."
        },
        {
          "q": "A reranker barely helped. First thing to check?",
          "a": "recall@K for the retrieval stage. If it is 0.72 the whole system is capped at 0.72 and retrieval, not ranking, is binding."
        },
        {
          "q": "What is HyDE?",
          "a": "Generate a hypothetical answer passage, embed that instead of the question, and search with it - closing the query/document distribution gap."
        },
        {
          "q": "Does the hypothetical need to be correct?",
          "a": "No. It needs the right shape, vocabulary and register. Being factually wrong while structurally right still retrieves well, which is the insight."
        },
        {
          "q": "When does HyDE help least?",
          "a": "When the retriever is already fine-tuned on in-domain pairs - the asymmetry it fixes has been trained away - and on latency-sensitive paths, since it adds a full generation."
        },
        {
          "q": "What is multi-query retrieval?",
          "a": "Generate several paraphrases of the query, retrieve for each, and fuse with RRF. Cheap, parallel, and usually the better first try before HyDE."
        },
        {
          "q": "What is late interaction (ColBERT)?",
          "a": "A vector per token with scoring by sum-over-query-tokens of the max similarity to any document token - more expressive than one vector, far cheaper than a cross-encoder, at high storage cost."
        },
        {
          "q": "Why deduplicate the final context?",
          "a": "Five near-duplicate chunks fill the context with one fact. MMR or simple dedup buys coverage for almost nothing."
        },
        {
          "q": "What should you report for any of these techniques?",
          "a": "The recall or precision gain together with p95 latency and cost per query. Each one is a purchase, and the trade is a product decision."
        }
      ],
      "standard": [
        {
          "q": "Explain the two-stage retrieval funnel and why it exists.",
          "a": "IT EXISTS BECAUSE OF A COST ASYMMETRY, not because someone preferred the architecture, and the asymmetry comes from whether the scoring function FACTORIZES. A BI-ENCODER computes s(q,d) as a dot product of two independently produced vectors. Because the document term does not depend on the query, every document vector can be computed once at ingestion and reused forever, which turns search into a nearest-neighbour lookup - sublinear with an ANN index, over a corpus of any size. A CROSS-ENCODER computes s(q,d) by feeding the concatenated pair through a transformer, so every query token attends to every document token. That joint attention is what makes it more accurate: the query can CONDITION the document's representation, expressing things like which sense of an ambiguous term is meant, which a dot product of two fixed vectors structurally cannot. And it is exactly why it cannot be an index - the representation depends on the pair, so nothing precomputes, and scoring N candidates costs N forward passes. SO THE FUNNEL IS FORCED. Use the cheap factorizing model to go from ten million to a hundred, then the expensive joint model to order those hundred. Typical shape: retrieve K of 50-100 with a bi-encoder plus BM25, rerank to a final 5. This is the same retrieve-then-rank structure classical search settled on decades ago, rediscovered with neural components, and it recurs everywhere the same cost asymmetry appears - recommenders, ads, entity matching. THE PROPERTY TO KEEP STRAIGHT, and it is where most of the practical mistakes live: the reranker's output is a SUBSET of the retriever's candidates, so the retriever's recall@K is a hard ceiling on the reranked result. The reranker improves ORDER, never coverage. Two consequences. First, adding a reranker is a reason to retrieve DEEPER - the reranker's value grows with candidate-set depth, and retrieving 10 to rerank to 5 discards most of the benefit while paying the latency. Second, when a reranker underdelivers, the diagnosis is upstream: measure recall@K, and if it is 0.72 the system is capped at 0.72 and ranking was never the binding constraint. THE MIDDLE OF THE SPECTRUM is worth knowing about - late interaction, as in ColBERT, keeps a vector per token and scores by summing each query token's best match in the document. The encoders stay independent so document vectors still precompute, but the interaction happens at scoring time instead of being collapsed into one dot product. It is more expressive than a single vector and much cheaper than a cross-encoder, and it pays in storage, one to two orders of magnitude more than passage-level vectors. WHAT I WOULD MEASURE: recall@K for stage one, precision or NDCG at the final k for stage two, and the p95 latency the reranker adds. And I would check the reranker against the retriever's own ordering - on in-domain data with a fine-tuned bi-encoder that margin is sometimes small enough that the reranker is not worth its latency, which is the sort of thing only a measurement tells you.",
          "deepDive": {
            "q": "You have a retrieval system at recall@10 of 0.75. Walk me through improving it.",
            "a": "FIRST I WOULD FIND OUT WHAT KIND OF 0.75 IT IS, because 'recall@10 is 0.75' is consistent with several different systems and the interventions do not overlap. THE DIAGNOSTIC SPLIT, cheap and decisive. Take the 25% of failures and check each against: (a) is the answer in the corpus at all - if not it is an ingestion problem and nothing in retrieval helps; (b) does a chunk exist that fully contains the answer - if not, chunking is the binding constraint; (c) does BM25 find it when dense does not, or vice versa - that is a hybrid case; (d) does BRUTE-FORCE exact search find it when the ANN index does not - that is an index operating-point problem. That partition tells me where the 25% actually lives, and in my experience it is rarely uniformly distributed. THEN, IN COST ORDER. (1) RAISE K, if there is a reranker downstream. This is nearly free and it directly raises the ceiling: recall@50 is meaningfully higher than recall@10 on most systems, and with a reranker the final quality tracks recall@K rather than recall@10. Often this alone is the largest single move, and it is one number. (2) CHECK THE ANN OPERATING POINT. Compare against exact search. If exact finds passages the index misses, raise ef_search or nprobe and re-measure - that is recall you are losing to a configuration rather than to a model. Also check whether metadata filters are involved, since post-filtering collapses recall silently. (3) ADD HYBRID. If part (c) of the split showed BM25 rescuing queries with identifiers or rare terms, this is a structural gap that no embedding upgrade closes. RRF, five lines, no re-embedding. (4) FIX CHUNKING, if part (b) said so. Overlap, structural splitting, contextual prefixes, small-to-big. This is often the biggest move and the cheapest to test, and it is where I would look before touching a model. (5) QUERY-SIDE EXPANSION - multi-query with RRF first, since it is parallel and robust; HyDE if the domain is unfamiliar and there are no training pairs. Both act BEFORE retrieval, which is what makes them able to move recall at all. (6) FINE-TUNE THE EMBEDDER, last, because it is the most expensive and it obliges a full re-embedding. If I have query-passage pairs from logs or tickets, contrastive training with hard negatives on a few thousand pairs can beat a much larger generic model on my data. THE STOPPING RULE, which matters as much as the ordering: after each change I would measure recall@k AND end-to-end accuracy together. Once end-to-end stops tracking recall improvements, the ceiling has risen above the binding constraint - the problem has moved downstream to how the context is used, and further retrieval work is wasted effort. That is the point at which I would switch to the generation half of the system rather than continuing to optimize a stage that is no longer binding."
          }
        },
        {
          "q": "How does HyDE work, and would you use it?",
          "a": "THE MECHANISM. It attacks the query/document asymmetry from the query side. A question and a passage are different kinds of text - different length, register, vocabulary and syntax - so embedding a question and searching among passage embeddings means comparing across a distribution gap. HyDE closes it by asking a model to WRITE a passage that would answer the question, then embedding that hypothetical passage and searching with it. You are now comparing a passage to passages. THE COUNTERINTUITIVE PART, which is the actual insight: the hypothetical does not have to be TRUE. It can contain wrong facts and still work, because its job is to land in the right neighbourhood of the embedding space - to have the right vocabulary, structure and topic. The embedding is not fact-checking; it is measuring similarity of form and content. That is why the technique is far less fragile than 'have a language model make something up' initially sounds. WOULD I USE IT: sometimes, and not by default. WHERE IT EARNS ITS COST. Zero-shot settings with no labelled pairs and no fine-tuned retriever - which is its original evaluation setting and where the reported gains are strongest. Unfamiliar or specialized domains where the off-the-shelf embedder was not trained on this kind of text. Short or underspecified queries, where there is very little to embed and the hypothetical supplies context. WHERE IT DOES NOT. When the retriever has been fine-tuned on in-domain query-passage pairs, because the asymmetry HyDE fixes is precisely what that training removes - the headroom is already spent. On latency-sensitive paths, since it inserts a full generation call BEFORE retrieval, which is typically the largest single latency addition in this lesson. And on queries about rare entities, where a hallucinated hypothetical can pull the search into an entirely wrong neighbourhood - a failure mode that is worse than not helping, because it degrades queries that previously worked. WHAT I WOULD TRY FIRST. Multi-query: generate three to five paraphrases, retrieve for each, fuse with reciprocal rank fusion. It targets the same goal - covering more of the embedding space around the user's intent - the retrievals run in parallel so the latency is one round trip rather than a serial generation-then-retrieval, and it does not depend on any single generated artefact being well-shaped. In my experience it is the better cost/benefit starting point, and HyDE is worth testing after it rather than instead of it. HOW I WOULD DECIDE: run all three - plain, multi-query, HyDE - on the same labelled query set, and report recall@k with p95 latency and cost per query beside it. A two-point recall gain for six hundred milliseconds is a product decision about the specific application, not a general win, and it should be made with the numbers visible."
        },
        {
          "q": "How would you improve retrieval for multi-hop questions?",
          "a": "THE STRUCTURAL PROBLEM FIRST: a single retrieval pass returns passages similar to the QUERY, but a multi-hop question - 'who signed the contract that superseded the 2019 agreement' - has an answer whose passage may share almost no vocabulary with the question. The bridging entity is unknown at query time, so no amount of tuning a one-shot retriever finds it. This is a different failure from low recall on a simple question; it is a failure of the retrieval SHAPE, and the fixes are architectural. THE OPTIONS, in increasing capability and cost. (1) QUERY DECOMPOSITION. Ask a model to split the question into sub-questions, retrieve for each independently, and pool the results. Cheap, parallel, and it works when the sub-questions are actually independent. It fails when hop two depends on hop one's ANSWER, which is the defining case of multi-hop - so it covers less than it appears to. (2) ITERATIVE RETRIEVAL. Retrieve, read, formulate the next query from what you found, retrieve again. This handles genuine dependency because the second query is written with the first hop's answer in hand. It is a loop, which brings in everything 18-06 is about: termination conditions, a step budget, and the fact that errors compound across steps. Two or three hops is usually the practical limit before reliability decays. (3) STEP-BACK PROMPTING. Ask a more general question first - 'what agreements exist in this contract family' - retrieve for both the general and the specific query, and fuse. It is a cheap approximation of a first hop and it helps when the specific query is too narrow to match anything. (4) GRAPH-STRUCTURED RETRIEVAL. Extract entities and relations at ingestion time and traverse them. This is the natural representation for relational questions, and it turns a two-hop question into a traversal rather than two searches. The cost is real: entity extraction quality becomes a new ceiling, the graph needs maintenance, and it only pays when a substantial share of traffic is genuinely relational. (5) STRUCTURED ROUTING. If the underlying data is relational, the honest answer may be that this is not a retrieval problem at all - route to SQL. 'Which contracts expire this quarter' is a query, not a top-k. HOW I WOULD CHOOSE: by measuring what fraction of real traffic is multi-hop, which is the number that decides whether any of this is worth building. If it is 5%, I would use decomposition and accept the misses. If it is 40%, iterative retrieval or a graph is justified. AND THE EVALUATION NOTE, since it is easy to fool yourself here: multi-hop recall must be measured with ALL required passages, not any of them. A system that reliably finds hop one and never hop two can look respectable under a per-passage recall metric while answering nothing correctly. Score the question, not the passages."
        },
        {
          "q": "How would you build the reranking stage specifically?",
          "a": "I WOULD TREAT IT AS A SEPARATE MODEL WITH ITS OWN BUDGET, because that is what it is - a second inference pass over every candidate, with a latency cost proportional to K. THE MODEL CHOICE. A cross-encoder trained for relevance is the standard, and the off-the-shelf ones are strong; there are also LLM-based rerankers that score or rank candidates by prompting, which are more capable and considerably more expensive. The trade is straightforward: a small cross-encoder over 100 candidates is tens of milliseconds on a GPU, an LLM reranker over the same 100 is a different order of cost and latency. I would start with the cross-encoder. THE PARAMETERS THAT MATTER. K, the candidate depth, is the important one and it should be as large as the latency budget allows, because the reranker's whole value is ordering a DEEP set and recall@K is the ceiling on everything it can do. The final k is a context-budget decision, and with long-context models it can be larger than the traditional 3-5. Batch the candidate scoring - it is embarrassingly parallel and treating it as a loop is a common and expensive mistake. THE VALIDATION I WOULD INSIST ON, because it is skipped and it sometimes changes the decision: compare the reranker against the RETRIEVER'S OWN ORDERING on your data. An off-the-shelf cross-encoder was trained on a general relevance distribution; if your bi-encoder has been fine-tuned in-domain, the reranker's margin can be small or occasionally negative. That is a real outcome and it means the latency is buying nothing. Measure NDCG or precision at the final k both ways. WHAT ELSE BELONGS IN THIS STAGE. DIVERSITY - five near-duplicate chunks fill the context with one fact, which is a common and invisible waste. MMR or simple similarity-based deduplication over the reranked list buys real coverage for almost no cost, and it matters more as the final k grows. ORDERING within the final context, because models attend unevenly across long contexts and use information in the middle less reliably; putting the strongest passage first, or first and last, is a real intervention with measured effects. And an ABSTENTION threshold - if the top reranked score is below a bar, the honest behaviour is to say there is nothing relevant rather than to answer from five weak passages. That threshold is a calibration question and it is one of the highest-value guardrails in a RAG system. WHAT I WOULD REPORT: precision and NDCG at the final k, recall@K beside them so the ceiling is visible, p95 added latency, and the fraction of queries falling under the abstention threshold - which doubles as a monitoring signal, since a rise in that fraction usually means the corpus or the traffic has shifted."
        },
        {
          "q": "Which of these techniques would you actually put in a first production system?",
          "a": "FEWER THAN THE LITERATURE SUGGESTS, and I would sequence them by cost-to-test rather than by sophistication, because each one adds latency, a failure mode and a thing to maintain - and their gains overlap heavily, so stacking them all buys much less than the sum of the published numbers. WHAT GOES IN FROM THE START. (1) HYBRID RETRIEVAL with RRF. It is about five lines, needs no re-embedding, and it covers a structural gap - exact identifiers and rare terms - that no embedding model closes. On technical, legal or e-commerce traffic this is not an optimization. (2) A CROSS-ENCODER RERANKER over a deep candidate set, K of 50-100. This is the largest reliable precision gain per unit of complexity, provided K is deep enough to give it something to work with. (3) DEDUPLICATION of the final context. Nearly free, and it prevents the common waste of five near-identical chunks. (4) AN ABSTENTION THRESHOLD on the top score. Cheap, and it converts a class of confident wrong answers into an honest 'I don't have that', which is usually the better product behaviour and a useful monitoring signal besides. WHAT I WOULD ADD ONLY WITH EVIDENCE. Multi-query, if the eval set shows queries failing for phrasing reasons - it is cheap and parallel, so the bar is low. HyDE, if the domain is unfamiliar and there is no fine-tuned retriever; otherwise it is a full generation call before retrieval for gains that concentrate in a setting I may not be in. Decomposition or iterative retrieval, only if measurement shows a meaningful share of traffic is genuinely multi-hop. Late interaction, only if single-vector retrieval is measurably too lossy and a cross-encoder is too slow - it is a storage commitment. WHAT I WOULD DO INSTEAD OF ANY OF IT, if forced to choose one thing: fix chunking and build the evaluation set. Chunking usually moves recall more than any technique in this lesson, it costs an afternoon, and without the eval set none of the above can be justified or rejected. The order that actually maximizes quality per week of effort is unglamorous - eval set, chunking, hybrid, reranker - and only then the techniques with papers attached. THE PRINCIPLE I WOULD STATE. Every item here is a purchase: some quality for some latency, cost and operational surface. So each one needs a measurement showing it earned its price ON THIS TRAFFIC, and a system carrying techniques nobody measured is slower, more expensive and more fragile for reasons no one can name. That is a worse failure than missing a technique, because it is invisible."
        },
        {
          "q": "How does this lesson fit the module's framing?",
          "a": "IT SHOWS THE CEILING STRUCTURE OPERATING INSIDE A SINGLE STAGE, which is the sharpest version of the module's first idea. The funnel is two components, and the first one bounds the second EXACTLY: the reranker's output is a subset of the retriever's candidates, so recall@K is a hard cap on everything the reranker can achieve. That is not an approximation or a tendency - it is set inclusion. And it produces the module's characteristic error in miniature: teams add a reranker, see little improvement, and conclude the reranker is weak, when the measurement that would settle it - recall@K - takes minutes and usually shows the ceiling was the problem. THE DIRECTIONAL LESSON generalizes beyond retrieval, and it is the reason this lesson is worth its place. WHERE a component sits in a pipeline determines what it can fix. Anything acting BEFORE the bottleneck can raise the ceiling: HyDE, query rewriting, decomposition, better chunking. Anything acting AFTER it can only rearrange what survived: reranking, diversity, prompt ordering. So when you are choosing what to build, the first question is not which technique is strongest in the literature but which side of the binding constraint it acts on - because a strong technique on the wrong side of a ceiling is worth zero, reliably. THE COST ASYMMETRY THAT CREATES THE FUNNEL is also worth generalizing. Bi-encoders factorize and therefore precompute; cross-encoders do not and therefore cannot scale. That same structure - a cheap factorizing model for coverage, an expensive joint model for precision - recurs in recommenders, ads ranking, entity resolution, and it is the reason two-stage architectures are everywhere rather than a retrieval quirk. Recognizing the pattern lets you predict what a system will look like before you see it. AND IT PREPARES THE SECOND STRUCTURE. Every technique here is a purchase - latency, cost, a new failure mode - and once you start chaining purchases you are composing unreliable steps, which is exactly what 18-06 formalizes when the loop arrives. The discipline this lesson asks for, measuring whether each addition earned its price rather than accumulating techniques with good papers, is the same discipline that keeps an agent from being ten steps of 0.95 pretending to be a product."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "Why the funnel is FORCED, not chosen",
        "back": "bi: s(q,d)=f(q)ᵀf(d) — factorizes, so f(d) precomputes → ANN over any corpus. cross: s(q,d)=g([q;d]) — no factorization, N transformer passes per query. Fine at N=100, impossible at 10M."
      },
      {
        "type": "formula",
        "front": "The reranker's hard ceiling",
        "back": "reranked recall@k ≤ recall@K_retrieve. Set inclusion, not a tendency. So a reranker means retrieve DEEPER (K=50–100 → 5), and \"the reranker barely helped\" is usually recall@K being the real constraint."
      },
      {
        "type": "intuition",
        "front": "Position determines reach",
        "back": "BEFORE retrieval (HyDE, multi-query, step-back, decomposition, chunking) can move the CEILING. AFTER retrieval (rerank, MMR, prompt order) can only reorder beneath it. A strong technique on the wrong side of a ceiling is worth zero."
      },
      {
        "type": "intuition",
        "front": "HyDE's counterintuitive core",
        "back": "Generate a hypothetical ANSWER, embed that, search with it — passage-to-passage instead of question-to-passage. The hypothetical can be factually WRONG and still work: it only needs the right SHAPE, vocabulary and register."
      },
      {
        "type": "pitfall",
        "front": "When HyDE does NOT pay",
        "back": "A fine-tuned in-domain retriever (the asymmetry is already trained away) · latency-sensitive paths (a full generation BEFORE retrieval) · rare entities (a hallucinated hypothetical drags search into the wrong neighbourhood — worse than no help)."
      },
      {
        "type": "intuition",
        "front": "Try multi-query before HyDE",
        "back": "3–5 paraphrases → retrieve each → RRF. Same goal (cover more of the space), runs in PARALLEL (one round trip, not serial generate-then-retrieve), and doesn't depend on one generated artefact being well-shaped."
      },
      {
        "type": "formula",
        "front": "Late interaction (ColBERT)",
        "back": "s(q,d) = Σ_{i∈q} max_{j∈d} E_qᵢᵀE_dⱼ. Encoders stay independent (doc token vectors precompute) but interaction happens at SCORING time. More expressive than one vector, far cheaper than cross-encoding; pays in storage (10–100×)."
      },
      {
        "type": "pitfall",
        "front": "Validate the reranker against the retriever's own order",
        "back": "An off-the-shelf cross-encoder was trained on a general relevance distribution. Against a fine-tuned in-domain bi-encoder its margin can be small or negative — in which case the latency buys nothing. Measure NDCG both ways."
      },
      {
        "type": "intuition",
        "front": "Multi-hop needs a different SHAPE, not tuning",
        "back": "The bridging entity is unknown at query time, so one pass can't find hop two. Decomposition (parallel, fails on dependent hops) → iterative retrieval (handles dependency, but it's a LOOP) → graph traversal → route to SQL if it's really relational."
      },
      {
        "type": "pitfall",
        "front": "Score the QUESTION, not the passages",
        "back": "Multi-hop recall must require ALL needed passages. A system that reliably finds hop one and never hop two looks respectable under per-passage recall while answering nothing correctly."
      },
      {
        "type": "intuition",
        "front": "The first production system",
        "back": "IN: hybrid+RRF, cross-encoder over a DEEP K, dedup, abstention threshold. LATER, with evidence: multi-query, HyDE, decomposition, late interaction. INSTEAD OF ALL OF IT, if forced: build the eval set and fix chunking."
      },
      {
        "type": "pitfall",
        "front": "Every technique is a PURCHASE",
        "back": "Report the recall/precision gain WITH p95 latency and cost per query. +2 points for +600 ms is a product decision, not a win. A system carrying unmeasured techniques is slower, costlier and more fragile for reasons nobody can name."
      }
    ],
    "refs": [
      {
        "title": "Nogueira & Cho (2019), Passage Re-ranking with BERT",
        "url": "https://arxiv.org/abs/1901.04085"
      },
      {
        "title": "Gao et al. (2022), Precise Zero-Shot Dense Retrieval without Relevance Labels (HyDE)",
        "url": "https://arxiv.org/abs/2212.10496"
      },
      {
        "title": "Khattab & Zaharia (2020), ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction",
        "url": "https://arxiv.org/abs/2004.12832"
      },
      {
        "title": "Ma et al. (2023), Query Rewriting for Retrieval-Augmented Large Language Models",
        "url": "https://arxiv.org/abs/2305.14283"
      },
      {
        "title": "Zheng et al. (2023), Take a Step Back: Evoking Reasoning via Abstraction in Large Language Models",
        "url": "https://arxiv.org/abs/2310.06117"
      }
    ],
    "demos": [
      "rag-reranker",
      "vector-search",
      "embeddings",
      "rag-chunking"
    ]
  }
};
