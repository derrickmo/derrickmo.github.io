// GENERATED from content/lessons/rag-agents/embeddings-vector-stores.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/rag-agents/embeddings-vector-stores/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "embeddings-vector-stores": {
    "level": "core",
    "body": {
      "intuition": [
        "A vector store does not search your documents. It searches a GEOMETRY that an embedding model built, and that model's training decided what 'similar' means before you wrote a line of code. Swap the model and the same query returns different neighbours from the same corpus - not because the corpus changed, but because the definition of relevance did. This is the first thing to internalize about retrieval: the embedding model is not a preprocessing step, it is the specification.",
        "The second thing is that this stage sets a CEILING. Everything downstream - the reranker, the prompt, the model generating the answer - can only work with what retrieval hands it. If the passage containing the answer is not in the top-k, no amount of prompt engineering or model upgrading recovers it, because the information is not in the context. That gives a hard inequality: end-to-end answer accuracy cannot exceed retrieval recall at k. Most RAG systems that disappoint are disappointing here, and the aggregate score does not say so.",
        "The third thing is that approximate search makes recall a DIAL rather than a property. An ANN index trades recall for latency continuously, and the published benchmark number was measured on someone else's data with someone else's parameters. On your corpus, at your parameter settings, the recall is whatever you measure it to be - which means you have to measure it against exact search, and that measurement is the difference between a retrieval system you understand and one you hope about."
      ],
      "math": [
        {
          "h": "What the similarity function is actually comparing",
          "paras": [
            "Cosine measures angle only; dot product also rewards magnitude. If vectors are L2-normalized the two agree up to a monotone transform, so they induce the SAME ranking.",
            "That equivalence is why the practical question is not cosine-versus-dot but whether your model normalizes - and what magnitude means if it does not."
          ],
          "tex": "\\cos(q,d) = \\frac{q \\cdot d}{\\|q\\|\\,\\|d\\|}, \\qquad \\|q\\|=\\|d\\|=1 \\;\\Rightarrow\\; \\cos(q,d) = q\\cdot d = 1 - \\tfrac{1}{2}\\|q-d\\|^2",
          "texNote": "So under normalization cosine, dot product and Euclidean distance all rank identically - the choice is a convention, not a decision. It matters when vectors are NOT normalized: dot product then favours long vectors, and some models put corpus frequency or passage length into the norm, which silently biases retrieval toward a document class. Check whether your model normalizes, and use the similarity it was TRAINED with, because the training objective defined the geometry."
        },
        {
          "h": "The ceiling, stated as an inequality",
          "paras": [
            "Answering correctly requires the evidence to be present. If it is not retrieved, the generator has no path to the right answer other than reciting memorized knowledge.",
            "This is the module's central structure and it is worth writing down because it converts a vague quality complaint into a measurement."
          ],
          "tex": "\\Pr[\\text{correct}] = \\underbrace{\\Pr[\\text{evidence} \\in \\text{top-}k]}_{\\text{recall@}k} \\cdot \\Pr[\\text{correct} \\mid \\text{evidence present}] \\;\\le\\; \\text{recall@}k",
          "texNote": "The second factor is the generator's job; the first is retrieval's, and it is a hard ceiling. So the diagnostic is: measure recall@k separately. If recall@k is 0.74, a perfect generator scores 0.74 and swapping in a better model buys nothing. Conversely if recall@k is 0.95 and answers are at 0.60, the problem is downstream and more retrieval work is wasted effort. One number, and it tells you which half of the system to work on."
        },
        {
          "h": "Index arithmetic - why quantization shows up here too",
          "paras": [
            "A flat index stores every vector in full precision, and the memory follows directly from the count and the dimension.",
            "This is the same bytes-based argument as LLM serving, applied to a different array."
          ],
          "tex": "\\text{bytes} = N \\times d \\times b, \\qquad 10^7 \\times 768 \\times 4 \\;\\text{B} \\approx 30\\ \\text{GB}",
          "texNote": "Ten million passages at 768 dimensions in fp32 is about 30 GB before any index overhead - which is why product quantization and scalar quantization are standard in vector stores rather than exotic. Halving to fp16 or going to int8 cuts it 2x or 4x with a measurable but usually small recall cost, and Matryoshka-style embeddings let you truncate the dimension itself. The rule is the same as everywhere else: measure the recall cost on your data, do not assume the published one."
        }
      ],
      "code": [
        {
          "h": "The retrieval measurements that actually matter",
          "paras": [
            "Three numbers, each answering a different question, and none of them derivable from the others."
          ],
          "code": "# 1. RECALL@k AGAINST EXACT SEARCH - is the index losing results?\n#    This is an INDEX quality measure. Ground truth = brute-force top-k.\nexact = brute_force_topk(queries, corpus_vectors, k)     # slow, but truth\napprox = index.search(queries, k)\nann_recall = mean(len(set(a) & set(e)) / k for a, e in zip(approx, exact))\n#    An ANN index is a TUNABLE OPERATING POINT, not a fixed thing:\n#      HNSW  -> ef_search  up = better recall, slower\n#      IVF   -> nprobe     up = better recall, slower\n#    Sweep it, plot recall vs latency, and PICK a point. The published\n#    benchmark was someone else's corpus at someone else's parameters.\n\n# 2. RECALL@k AGAINST LABELLED ANSWERS - is the EMBEDDING finding the\n#    right thing? A perfect index over a bad embedding scores 1.0 above\n#    and still retrieves the wrong passages. DIFFERENT question.\ngold_recall = mean(gold_doc[q] in retrieved[q] for q in queries)\n\n# 3. THE CEILING CHECK - the one that tells you where to work.\nprint(\"retrieval recall@k :\", gold_recall)      # the ceiling\nprint(\"end-to-end accuracy:\", answer_acc)       # <= the ceiling, always\n#    gap small  -> generation is fine, FIX RETRIEVAL\n#    gap large  -> retrieval is fine, fix the prompt/model/context order\n\n# THE MISTAKE THIS PREVENTS: upgrading the generator when recall@k is 0.7.\n# A perfect generator scores 0.7. The money goes to retrieval.",
          "caption": "Two different recalls - index-vs-exact and retrieved-vs-gold - answer different questions, and the ceiling check tells you which half of the system to spend on."
        },
        {
          "h": "The production surprises: asymmetry, filters, and updates",
          "paras": [
            "Three failure modes that are invisible in a notebook and routine in a deployment."
          ],
          "code": "# A. QUERY/DOCUMENT ASYMMETRY. A question and a passage are different\n#    kinds of text. A model trained on sentence SIMILARITY (STS) treats\n#    them symmetrically and underperforms on retrieval.\n#      -> use a model TRAINED for retrieval (dual encoder, in-batch\n#         negatives, hard negatives), and use its prefixes if it has them:\nq_vec = model.encode(\"query: \" + question)     # many models are asymmetric\nd_vec = model.encode(\"passage: \" + document)   # and the prefix MATTERS\n#    Getting this backwards silently costs several points of recall, and\n#    nothing errors. (HyDE in 18-03 attacks the same asymmetry differently.)\n\n# B. FILTERED SEARCH - the classic production breakage.\n#    POST-filter: retrieve k, then drop non-matching. If the filter is\n#      selective (tenant_id, date range), you asked for 10 and keep 1.\n#      Recall collapses SILENTLY - the query still returns results.\n#    PRE-filter: restrict then search. Correct, but a graph index's\n#      connectivity assumed the FULL graph; naive pre-filtering can make\n#      it wander or miss. Use the store's native filtered search, and\n#      MEASURE recall under a realistic filter, not on the open corpus.\n\n# C. UPDATES AND STALENESS. In HNSW, a delete is usually a TOMBSTONE -\n#    the node stays in the graph. Churn degrades recall over time with no\n#    error and no alarm. Schedule rebuilds; track deleted-fraction.\n#    And when you change the embedding model you must RE-EMBED EVERYTHING:\n#    two models' vectors are not comparable, and mixing them produces\n#    confident nonsense rather than a crash.",
          "caption": "Each of these degrades recall silently and returns plausible results while doing it - which is why retrieval needs a standing measurement rather than a launch-day check."
        }
      ],
      "useCases": [
        "Any retrieval-augmented system, where this stage determines the ceiling on everything the generator can possibly do.",
        "Semantic search and deduplication over a corpus, where the embedding's notion of similarity is the product decision and the index is the engineering one.",
        "Recommendation and matching at scale, where the two-tower structure of 19-02 produces exactly these vectors and this index serves them.",
        "Choosing between an off-the-shelf embedding model and a fine-tuned one, which is a measurement (recall on your labelled queries) rather than a leaderboard lookup."
      ],
      "pitfalls": [
        "Treating the embedding model as interchangeable. It defines what similar means, so changing it changes the retrieved set - and changing it obliges you to RE-EMBED the entire corpus, since vectors from two models are not comparable.",
        "Using a symmetric similarity model for asymmetric retrieval. Questions and passages are different text distributions; retrieval-trained dual encoders and their query/passage prefixes exist for this reason, and getting the prefixes wrong costs recall with no error.",
        "Quoting a published ANN benchmark instead of measuring recall against exact search on your own corpus. Recall is a tunable operating point that depends on your data, dimension and parameters.",
        "Post-filtering a top-k result set by metadata. When the filter is selective, recall collapses silently while the query still returns plausible results. Use native filtered search and measure recall UNDER the filter.",
        "Ignoring index staleness. Deletes are typically tombstones and churn degrades recall gradually with no alarm, so deleted-fraction and periodic rebuilds belong in monitoring.",
        "Reporting only end-to-end accuracy. It is bounded above by recall@k, so without measuring recall separately you cannot tell whether to fix retrieval or generation - and the usual guess is wrong.",
        "Assuming a larger embedding dimension is better. It costs memory and latency linearly, and the recall gain is often small; measure the trade rather than defaulting to the biggest model."
      ],
      "connections": [
        {
          "ref": "rag-agents/chunking-retrieval",
          "text": "Chunking decides what CAN be embedded as a unit, so it sets a ceiling above this one - a fact split across a boundary is unretrievable at any k, no matter how good the model."
        },
        {
          "ref": "rag-agents/advanced-rag",
          "text": "Reranking and HyDE are the two standard responses to this stage's limits - one raises precision after retrieval, the other attacks the query/document asymmetry before it."
        },
        {
          "ref": "rnn-nlp/word-vectors",
          "text": "Where the idea of a learned vector space begins. The move from static word vectors to contextual passage embeddings is what makes dense retrieval work at all."
        },
        {
          "ref": "ml-applications/search-ranking",
          "text": "The retrieval-then-ranking funnel in its classical form, with the position-bias and IPW machinery that applies whenever your relevance labels come from logged clicks."
        },
        {
          "ref": "llm-systems/quantization",
          "text": "The same bytes-per-value argument, applied to the vector index instead of model weights - product and scalar quantization are why billion-scale search fits in memory."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What does an embedding model actually decide?",
          "a": "What 'similar' means. The geometry is fixed by its training, so the retrieved set is a property of the model as much as of the corpus."
        },
        {
          "q": "Cosine or dot product?",
          "a": "Identical rankings if vectors are L2-normalized. Use whatever the model was trained with; the question only bites when vectors are unnormalized, where dot rewards magnitude."
        },
        {
          "q": "What is the ceiling relation in RAG?",
          "a": "End-to-end accuracy is at most recall@k. If the evidence is not retrieved, no generator can recover it."
        },
        {
          "q": "Answers are wrong and recall@k is 0.7. What do you fix?",
          "a": "Retrieval. A perfect generator would score 0.7, so upgrading the model buys nothing."
        },
        {
          "q": "What is the difference between the two recalls you should measure?",
          "a": "Index recall (approximate vs exact search) measures index quality; gold recall (retrieved vs labelled answer) measures the embedding. A perfect index over a bad embedding scores 1.0 on the first."
        },
        {
          "q": "Why is ANN recall not a fixed number?",
          "a": "It is a tunable operating point - ef_search in HNSW, nprobe in IVF - trading recall against latency on your data and your parameters."
        },
        {
          "q": "What is query/document asymmetry?",
          "a": "A question and a passage are different text distributions, so retrieval-trained dual encoders treat them differently and often need query/passage prefixes."
        },
        {
          "q": "Why is post-filtering dangerous?",
          "a": "With a selective filter you retrieve k and keep a fraction, so recall collapses while the query still returns plausible-looking results. No error is raised."
        },
        {
          "q": "What happens to deleted vectors in HNSW?",
          "a": "They usually become tombstones - the node stays in the graph - so churn degrades recall gradually and silently. Track deleted-fraction and rebuild."
        },
        {
          "q": "What must you do when changing embedding models?",
          "a": "Re-embed the entire corpus. Vectors from two models are not comparable, and mixing them produces confident nonsense rather than an error."
        },
        {
          "q": "How much memory for 10M passages at 768 dims in fp32?",
          "a": "About 30 GB before index overhead - N x d x bytes - which is why quantized indexes are standard rather than exotic."
        },
        {
          "q": "Is a bigger embedding dimension better?",
          "a": "Not automatically. Cost is linear in dimension and the recall gain is often small, so it is a measured trade-off."
        }
      ],
      "standard": [
        {
          "q": "Walk me through how you would build the retrieval half of a RAG system.",
          "a": "I WOULD BUILD IT AS A MEASURED FUNNEL, and the reason for that framing is the inequality that governs the whole system: end-to-end answer accuracy is bounded above by retrieval recall at k. Everything downstream can only work with what retrieval hands it, so this stage is a CEILING and I want to know where it sits before I tune anything else. STEP 1 - THE EVALUATION SET, first, not last. A few hundred realistic queries with the passage that actually answers each one. This is the only thing that lets me say a change helped, and building it is the single highest-value hour in the project. Without it every subsequent decision is a preference. STEP 2 - THE EMBEDDING MODEL, chosen by measurement on that set rather than by leaderboard. Two things I would check specifically. It must be trained for RETRIEVAL, not sentence similarity, because a question and a passage are different text distributions and a symmetric model handles them worse; and if it uses query/passage PREFIXES I must apply them correctly, since getting that wrong costs several points of recall and raises no error. I would also fix the similarity function to whatever it was trained with - under normalization cosine, dot and Euclidean rank identically, so this is a convention unless the model leaves vectors unnormalized, in which case magnitude starts mattering. STEP 3 - CHUNKING, which logically precedes embedding and sets a ceiling above it: a fact split across a boundary cannot be retrieved at any k. I would measure a couple of strategies on the same eval set rather than reasoning about them. STEP 4 - THE INDEX, and here the key idea is that ANN recall is an OPERATING POINT, not a property. I would measure recall against brute-force exact search on my own corpus, sweep ef_search or nprobe, plot recall against latency, and choose deliberately. A published benchmark number is about someone else's data. STEP 5 - HYBRID RETRIEVAL. Dense and lexical fail differently - dense misses exact identifiers, rare terms and codes; BM25 misses paraphrase - so combining them via reciprocal rank fusion is usually a real gain for little complexity. STEP 6 - RERANKING, a cross-encoder over the top 50 to 100. It raises precision at small k and it CANNOT fix recall, which is worth stating explicitly because it is the most common misplaced hope. WHAT I WOULD REPORT. Recall@k against gold, index recall against exact, latency at p95 not mean, and end-to-end accuracy beside recall so the gap identifies which half to work on. THE FAILURE MODES I WOULD BUILD FOR FROM THE START, because all three are silent: post-filtering by metadata collapsing recall when the filter is selective; index staleness through tombstoned deletes; and the re-embedding obligation when the model changes. Each returns plausible results while degraded, which is why retrieval needs standing measurement rather than a launch-day check.",
          "deepDive": {
            "q": "Your RAG system's answers are unreliable. How do you diagnose it?",
            "a": "I WOULD DECOMPOSE BEFORE INVESTIGATING, because 'unreliable answers' is an end-to-end symptom and this system has at least four stages that can each produce it. The decomposition is cheap and it usually settles the question in an hour. STAGE 1 - IS THE EVIDENCE IN THE CORPUS AT ALL? Take failing queries and search manually. If the answer is not in the source documents, no retrieval or generation change helps - it is an ingestion or coverage problem, and it is more common than people expect, especially with PDFs where extraction quietly dropped tables, headers or multi-column text. STAGE 2 - IS IT RETRIEVED? Measure recall@k on the failing set. This is the ceiling check, and it usually resolves the diagnosis immediately: if recall is low, everything downstream is irrelevant. When it is low I would then ask WHY, because the fixes differ - chunking (the fact spans a boundary, or the chunk is so large the relevant sentence is diluted), embedding mismatch (the query vocabulary differs from the corpus, which is where hybrid and HyDE help), the index (compare against exact search - if exact search finds it and the index does not, raise ef_search or nprobe), or a filter (re-run without metadata filters; if it appears, you have a post-filtering problem). STAGE 3 - IS IT USED? The evidence can be in the context and the model still not use it. Two well-documented reasons: POSITION, since models attend less to the middle of a long context, so where the relevant chunk sits in the prompt matters and reordering is a real intervention; and CONFLICT, where retrieved passages disagree with each other or with the model's parametric knowledge, and the resolution behaviour is not something you should assume. I would test by putting the gold passage alone in the context - if the answer is right then, retrieval delivered it and the prompt is losing it. STAGE 4 - IS THE ANSWER FAITHFUL TO WHAT WAS RETRIEVED? Score groundedness: is every claim supported by a retrieved passage? Unfaithful-but-correct answers mean the model is using parametric knowledge and will be confidently wrong when the corpus disagrees. THE INSTRUMENTATION I WOULD ADD, since this diagnosis should not require a special investigation next time: log the retrieved chunk ids and scores with every request, log the score distribution so a shift is visible, and sample requests for offline scoring. WHAT I EXPECT TO FIND, from experience and from the structure: the majority of disappointing RAG systems are retrieval-limited, and a large share of THOSE are chunking-limited rather than model-limited. The reason the intuition points the other way is that the generator is the visible, interesting, expensive component - so it gets the attention, while the ceiling sits two stages upstream."
          }
        },
        {
          "q": "How do you choose an embedding model?",
          "a": "BY MEASUREMENT ON YOUR OWN QUERIES, which sounds obvious and is routinely skipped in favour of a leaderboard position. MTEB is genuinely useful for building a shortlist, but it is an average over many tasks and domains, and your application is one task in one domain - the ordering on your data frequently differs. So: build the labelled query set, evaluate three or four candidates, and pick on the number. THE AXES I WOULD ACTUALLY COMPARE. (1) RECALL@k on my eval set. This is the decision variable and everything else is a constraint. (2) DIMENSION, which sets index memory and search latency linearly - a 1536-dimension model costs twice a 768 one at the same corpus size, and the recall difference is often small enough that the smaller model wins on total cost. Matryoshka-trained models are attractive here because you can truncate the dimension and trade recall smoothly rather than re-embedding. (3) MAX SEQUENCE LENGTH, which interacts with chunking - a 512-token limit forces smaller chunks whether or not that suits the documents. (4) ASYMMETRY SUPPORT: is it trained for retrieval, and does it use query/passage prefixes. (5) LICENCE AND HOSTING - an API embedding model means every ingestion and every query is a network call with a cost and a latency, and re-embedding the corpus later is a bill; a local model is a deployment. (6) MULTILINGUAL, if relevant, remembering that a multilingual model usually costs some English quality. THE CASE FOR FINE-TUNING, which is the option people reach for too early. It is worth it when your domain vocabulary is genuinely unlike the pretraining distribution - internal codes, part numbers, clinical or legal shorthand - and you can assemble query-passage pairs, which you often can from existing logs, tickets or FAQ pairs. Contrastive fine-tuning with hard negatives on a few thousand pairs can give a substantial gain. But I would try hybrid retrieval FIRST, because BM25 handles exact identifiers and rare terms natively and often solves the same problem for a fraction of the effort. THE OPERATIONAL POINT that decides more than people expect: changing this model later means RE-EMBEDDING THE ENTIRE CORPUS. At ten million passages that is a real job with a real bill, and you cannot mix vector spaces in one index. So the choice has more inertia than most model choices in a system, which argues for measuring properly once rather than defaulting and revisiting."
        },
        {
          "q": "How does approximate nearest neighbour search work, and how do you configure it?",
          "a": "THE PROBLEM IT SOLVES: exact search is O(N) per query in the vector dimension, which is fine at ten thousand vectors and unacceptable at a hundred million. ANN buys sublinear search by giving up the guarantee of finding the true top-k, and the amount you give up is a parameter. HNSW, the common default. A multi-layer proximity graph: upper layers are sparse and act as express lanes, lower layers are dense. Search enters at the top, greedily walks toward the query, descends, and repeats. Build parameters are M (neighbours per node - higher gives better recall and more memory) and ef_construction (effort at build time). The search parameter is EF_SEARCH, the size of the candidate list, and it is the recall/latency dial at query time. Strengths: excellent recall/latency, no training step. Weaknesses: memory-hungry (the graph itself is substantial), and deletes are tombstones. IVF, the partition approach. Cluster the vectors, and at query time search only the NPROBE nearest clusters. Requires a training step on a sample. Cheaper in memory, and pairs naturally with product quantization (IVF-PQ), which compresses vectors into subspace codebooks - that is how billion-scale indexes fit in RAM. The failure mode is a query near a cluster boundary, where the true neighbour sits in an unsearched partition. HOW I WOULD CONFIGURE IT, which is one procedure regardless of index type. Build a query sample from real traffic. Compute exact top-k by brute force - this is affordable offline and it is your ground truth. Sweep the search parameter, and at each setting record recall against exact and latency at p95, not mean. Plot the curve, and pick the point where the recall gain flattens or where you hit the latency budget, whichever binds first. That curve is the artefact worth keeping, because it converts a vague configuration question into a visible choice. WHAT THE CURVE USUALLY SHOWS: recall rises steeply and then saturates, so there is typically a knee where a small latency increase buys nothing. Sitting past it is pure waste, and sitting well before it is silently losing results. THE POINTS PEOPLE MISS. Recall depends on your data's intrinsic dimensionality and clustering, so a benchmark number does not transfer. Adding a metadata filter changes everything and needs its own measurement - native filtered search is not the same operating point as open search. And in a two-stage funnel with a reranker downstream, retrieving a slightly larger k at slightly lower per-item recall is often the better trade, because the reranker restores precision but can never restore something that was never retrieved."
        },
        {
          "q": "When is dense retrieval the wrong choice?",
          "a": "MORE OFTEN THAN THE DEFAULT SUGGESTS, and the honest answer names the cases rather than treating embeddings as strictly better than what came before. WHERE LEXICAL SEARCH WINS OUTRIGHT. Exact identifiers - part numbers, error codes, SKUs, case citations, variable names. An embedding maps these into a smooth space where near-identical strings sit close together, which is exactly wrong when the difference between two codes is the entire query. BM25 matches the token or does not. Rare terms and proper nouns behave the same way: they are underrepresented in pretraining, so their vectors are poorly placed, while an inverted index treats a rare term as MORE informative through IDF - the opposite direction. And short keyword queries, where there is little context for an embedding to work with. WHERE THE ANSWER IS BOTH, which is the practical default. Dense and lexical fail on different queries, so a hybrid with reciprocal rank fusion is usually better than either and is cheap to implement. RRF is attractive specifically because it combines RANKS rather than scores, so you avoid the score-normalization problem between two systems whose scores are not comparable. I would treat hybrid as the starting point rather than an optimization. WHERE RETRIEVAL ITSELF IS THE WRONG FRAME. Aggregation queries - 'how many contracts expire this quarter' - are database questions; no top-k of passages answers them, and the right architecture routes to SQL rather than to a vector store. Whole-document questions - 'summarize this report' - do not need retrieval if the document fits the context window; retrieval would actively hurt by fragmenting it. Highly structured data with real fields should be queried through those fields, with the vector index at most a fallback. And small corpora: under a few hundred documents you may be able to put everything in context or use exact search, and the index is complexity without benefit. WHERE A DIFFERENT RETRIEVAL SHAPE FITS BETTER. Relational or multi-hop questions - 'who reported to the person who signed this' - are graph traversals; a graph store or an agentic multi-step retrieval loop suits them better than one top-k. WHAT I WOULD TAKE FROM THIS. The question is not whether to use embeddings, it is what the query distribution looks like. Sample real queries, categorize them, and let that decide the architecture. A system where a third of traffic is identifier lookups and no lexical path exists is failing a third of its users in a way the aggregate score partly hides."
        },
        {
          "q": "What breaks when a vector store goes to production?",
          "a": "THE COMMON THREAD IS THAT ALL OF IT DEGRADES SILENTLY. A broken retrieval system does not throw - it returns k plausible passages that happen to be the wrong ones, and the generator writes a fluent answer from them. So the production concerns are mostly about making degradation visible. (1) FILTERED SEARCH, the most common breakage. Multi-tenancy, date ranges and permissions all mean metadata filters, and post-filtering a top-k list collapses recall whenever the filter is selective - you asked for ten and kept one. The fix is the store's native filtered search plus a recall measurement UNDER a realistic filter, since the open-corpus number does not transfer. (2) PERMISSIONS, which is the same mechanism with a security consequence. If filtering happens after retrieval, a user's query has already touched documents they cannot see, and the retrieved text can leak through the generated answer even when the citation is stripped. Enforce access at the query, not after. (3) STALENESS AND CHURN. Tombstoned deletes degrade the graph over time; a corpus with heavy turnover needs scheduled rebuilds and a deleted-fraction metric. Also, when documents update, the OLD chunks must be removed - orphaned chunks from a previous version are a persistent source of confidently outdated answers. (4) THE RE-EMBEDDING OBLIGATION. Changing or upgrading the embedding model invalidates the entire index. Mixing spaces does not error, it just returns nonsense with high confidence. This needs a migration plan, ideally dual-write with a shadow index, and it is the reason to measure carefully before committing. (5) INGESTION QUALITY, which is upstream of everything and where I would look first on a real system. PDF extraction dropping tables and multi-column layout, HTML boilerplate embedded as content, OCR errors, and encoding problems all put garbage in the index. The chunk count going up is not evidence that the content is right. (6) DRIFT IN THE QUERY DISTRIBUTION. Your eval set was built at a point in time; what users ask changes. Sampling real queries into the eval set periodically is what keeps the measurement honest. (7) COST AND LATENCY. Embedding calls at ingestion and at query time, index memory, and the p95 that a reranker adds. WHAT I WOULD MONITOR: retrieval score distribution (a shift means something changed in the corpus or the traffic), the fraction of queries whose top score falls below a threshold - a good cheap proxy for 'we probably have nothing relevant' and a natural trigger for abstention - deleted-fraction, index size, and a periodic offline recall run against the labelled set. That last one is the only true measure, and it needs to be a scheduled job rather than a memory."
        },
        {
          "q": "How does this lesson set up the rest of the module?",
          "a": "IT ESTABLISHES THE MODULE'S CENTRAL STRUCTURE, which is that these systems are COMPOSITIONS and composition is unforgiving in two specific ways. THE FIRST IS THE CEILING. An upstream stage bounds what any downstream stage can achieve, and the bound here is exact: answer accuracy cannot exceed retrieval recall at k. That is not a heuristic, it is a factorization - correctness requires the evidence to be present, and retrieval decides presence. The consequence is that an end-to-end number cannot tell you which stage is binding, and the intuitive guess is usually wrong because the generator is the visible, expensive, interesting component while the ceiling sits upstream of it. Chunking (18-02) then sets a ceiling above THIS one, because a fact split across a boundary is unretrievable at any k regardless of embedding quality. So the module builds a stack of ceilings, and 18-05's evaluation lesson is where you learn to measure each separately instead of averaging over all of them. THE SECOND IS MULTIPLICATION, which arrives with agents (18-06). Adding a loop over an unreliable component compounds: ten steps at 0.95 reliability is about 0.60. Multi-agent (18-07) makes it worse because coordination overhead grows faster than the agent count, and voice (18-08) shows the same structure in latency, where a cascade's budget is a SUM across stages and each one spends from a fixed total. The inversion is guardrails (18-09), the one place composition works FOR you: independent defensive layers multiply the attacker's failure probability instead of yours, so three imperfect layers give a strong result where three imperfect pipeline stages give a weak one. That contrast is worth holding onto because it explains when to add components and when adding them is the problem. AND THE CAPSTONE (18-10) puts them together, where the finding is the one the framing predicts - each feature moves only its own axis, so only the assembled system is simultaneously capable, safe and bounded, and no single number would have shown you that."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "The embedding model IS the specification",
        "back": "You are not searching documents, you are searching a geometry its training chose. Swap the model and the neighbours change though the corpus did not - and you must RE-EMBED everything, because two models' vectors are not comparable."
      },
      {
        "type": "formula",
        "front": "The RAG ceiling",
        "back": "P(correct) = recall@k × P(correct | evidence present) ≤ recall@k. If recall@k is 0.7, a PERFECT generator scores 0.7. Measure recall separately or you will spend on the wrong half of the system."
      },
      {
        "type": "formula",
        "front": "Cosine vs dot vs Euclidean",
        "back": "Under L2 normalization all three give the SAME ranking (cos = q·d = 1 − ½‖q−d‖²). The choice only matters for UNnormalized vectors, where dot rewards magnitude. Use what the model was trained with."
      },
      {
        "type": "intuition",
        "front": "ANN recall is an OPERATING POINT, not a property",
        "back": "HNSW ef_search / IVF nprobe trade recall against latency continuously. Measure against brute-force exact search on YOUR corpus, sweep, plot recall-vs-latency, pick the knee. A published benchmark is someone else's data."
      },
      {
        "type": "pitfall",
        "front": "Two different recalls",
        "back": "INDEX recall = approximate vs exact (is the index losing results?). GOLD recall = retrieved vs labelled answer (is the embedding finding the right thing?). A perfect index over a bad embedding scores 1.0 on the first and fails the task."
      },
      {
        "type": "pitfall",
        "front": "Post-filtering collapses recall SILENTLY",
        "back": "Retrieve k, drop non-matching: with a selective filter (tenant, date) you asked for 10 and keep 1. The query still returns plausible results. Use native filtered search and measure recall UNDER the filter."
      },
      {
        "type": "pitfall",
        "front": "Query/document asymmetry",
        "back": "A question and a passage are different text distributions. Use a RETRIEVAL-trained dual encoder, not a sentence-similarity model, and apply its query:/passage: prefixes - getting them wrong costs recall and raises no error."
      },
      {
        "type": "formula",
        "front": "Index memory arithmetic",
        "back": "bytes = N × d × b. 10M × 768 × fp32 ≈ 30 GB before overhead - which is why PQ/scalar quantization is standard, not exotic. Same bytes argument as LLM serving, different array."
      },
      {
        "type": "pitfall",
        "front": "Deletes are tombstones",
        "back": "In HNSW the node stays in the graph, so churn degrades recall gradually with no error. Track deleted-fraction, schedule rebuilds, and remove OLD chunks when a document updates or you serve confidently outdated answers."
      },
      {
        "type": "intuition",
        "front": "When dense retrieval is the WRONG tool",
        "back": "Exact identifiers, part numbers, error codes, rare terms - embeddings smooth exactly what must match exactly, while BM25's IDF treats a rare term as MORE informative. Hybrid + RRF (combines RANKS, dodging score normalization) is the practical default."
      },
      {
        "type": "intuition",
        "front": "The diagnostic ladder for bad RAG answers",
        "back": "(1) Is the evidence in the corpus? (2) Is it retrieved? (recall@k = the ceiling check) (3) Is it USED? (position in context, conflicting passages) (4) Is the answer faithful to it? Most disappointing systems fail at (2) - and often really at chunking."
      },
      {
        "type": "intuition",
        "front": "The module's two structures",
        "back": "CEILINGS: an upstream stage bounds every downstream one, so an end-to-end number can't say which stage binds. MULTIPLICATION: reliability compounds over steps (0.95^10 ≈ 0.60). Guardrails are the INVERSION - independent layers multiply in your favour."
      }
    ],
    "refs": [
      {
        "title": "Karpukhin et al. (2020), Dense Passage Retrieval for Open-Domain Question Answering",
        "url": "https://arxiv.org/abs/2004.04906"
      },
      {
        "title": "Malkov & Yashunin (2016), Efficient and Robust Approximate Nearest Neighbor Search Using HNSW Graphs",
        "url": "https://arxiv.org/abs/1603.09320"
      },
      {
        "title": "Johnson, Douze & Jegou (2017), Billion-Scale Similarity Search with GPUs (FAISS)",
        "url": "https://arxiv.org/abs/1702.08734"
      },
      {
        "title": "Muennighoff et al. (2022), MTEB: Massive Text Embedding Benchmark",
        "url": "https://arxiv.org/abs/2210.07316"
      },
      {
        "title": "Izacard et al. (2021), Unsupervised Dense Information Retrieval with Contrastive Learning (Contriever)",
        "url": "https://arxiv.org/abs/2112.09118"
      }
    ],
    "demos": [
      "embeddings",
      "vector-search",
      "tokenizer",
      "quantization"
    ]
  }
};
