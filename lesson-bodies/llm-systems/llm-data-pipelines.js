// GENERATED from content/lessons/llm-systems/llm-data-pipelines.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/llm-systems/llm-data-pipelines/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "llm-data-pipelines": {
    "level": "core",
    "body": {
      "intuition": [
        "Chinchilla made this lesson urgent. Once tokens are co-equal with parameters in the compute-optimal allocation, the supply and quality of data becomes a first-order constraint rather than plumbing - and the supply of high-quality text is finite. That reframes everything here: deduplication is not hygiene, it is a way of increasing the EFFECTIVE token count of a corpus you already have, because a duplicate is an extra epoch you took without knowing it. Quality filtering is not tidiness, it shows up as a better scaling curve.",
        "The pipeline is a funnel with four stages and each has a characteristic technique. QUALITY FILTERING removes documents that are not worth training on, and the most interesting signal is not a language model but COMPRESSION RATIO - repetitive machine-generated junk compresses far better than natural prose, so zlib's ratio separates them cheaply and without a learned classifier. DEDUPLICATION removes exact and near-duplicates, which needs MinHash with LSH banding because comparing every pair is quadratic and the corpora are enormous. PACKING concatenates documents and chunks them to the context length, which sounds trivial and recovers an enormous amount of wasted compute. MIXING decides how much of each source to sample, usually with a temperature that interpolates between proportional and uniform.",
        "The packing number is the one that surprises people, so it is worth stating plainly. Padding each document to the context length wastes roughly 40% of the token slots on padding for a typical document-length distribution; concatenating everything into one stream and chunking wastes under 1%. That is about thirty times fewer wasted slots - a large fraction of your training compute, recovered by a change that is a few lines and no modelling decision at all. It is the clearest example in this module of a systems detail dominating a modelling one."
      ],
      "math": [
        {
          "h": "MinHash estimates Jaccard similarity",
          "paras": [
            "Represent each document as a set of word k-shingles. For a random permutation of the universe, the probability that two sets share a minimum element is exactly their Jaccard similarity - which is the whole trick.",
            "Using P independent hash permutations turns that into an estimator: the fraction of signature positions that agree is an unbiased estimate of the Jaccard, with error falling as one over the square root of P."
          ],
          "tex": "\\Pr[\\,h_{\\min}(A) = h_{\\min}(B)\\,] = \\frac{|A \\cap B|}{|A \\cup B|} = J(A,B), \\qquad \\hat{J} = \\frac{1}{P}\\sum_{i=1}^{P} \\mathbb{1}[h_i(A)=h_i(B)]",
          "texNote": "So a signature of a few hundred integers stands in for a document of any length, and comparing signatures estimates similarity without touching the text. That is the compression that makes corpus-scale deduplication possible - the error at P = 128 is on the order of a few percent, which is ample for a similarity threshold."
        },
        {
          "h": "LSH banding: the S-curve that avoids the quadratic",
          "paras": [
            "Comparing all pairs of signatures is still quadratic. Split each signature into b bands of r rows, hash each band, and call two documents CANDIDATES if any band matches exactly.",
            "The probability of becoming a candidate as a function of true similarity is a sharp S-curve, and b and r place its threshold."
          ],
          "tex": "\\Pr[\\text{candidate}] = 1 - \\big(1 - s^{\\,r}\\big)^{b}, \\qquad \\text{threshold} \\approx \\left(\\tfrac{1}{b}\\right)^{1/r}",
          "texNote": "The S-curve is what makes this practical: below the threshold almost nothing becomes a candidate, above it almost everything does, so you compare a tiny fraction of pairs. Choosing b and r sets where the transition sits - more rows per band sharpens and raises the threshold, more bands lowers it. This is the same banding idea as any LSH scheme and it is what turns an intractable comparison into a hash-table lookup."
        },
        {
          "h": "Packing efficiency, and temperature mixing",
          "paras": [
            "Padding each document to the context length wastes everything between the document's length and the window. Concatenating and chunking wastes only the final partial chunk.",
            "And the mixture weights: sampling each source in proportion to its size lets the largest source dominate, while a temperature interpolates toward uniform."
          ],
          "tex": "\\eta_{\\text{pad}} = \\frac{\\mathbb{E}[\\ell]}{L_{\\text{ctx}}} \\;\\;\\text{vs}\\;\\; \\eta_{\\text{pack}} \\approx 1, \\qquad p_d \\propto \\Big(\\frac{n_d}{\\sum_j n_j}\\Big)^{1/\\tau}",
          "texNote": "For a typical web-document length distribution against a multi-thousand-token window, padding efficiency lands around 60% - roughly 40% of slots wasted - against over 99% for packing. On the mixing side, tau = 1 is proportional sampling and web text swamps everything; larger tau flattens the distribution and up-samples the small high-quality sources such as books and academic text, which is why temperature is the standard knob."
        }
      ],
      "code": [
        {
          "h": "Quality filtering, and the signal that needs no model",
          "paras": [
            "A handful of cheap heuristics remove most of what is not worth training on. The compression-ratio test is the one worth knowing because it catches a failure mode word-count rules miss entirely."
          ],
          "code": "def quality_ok(doc: str) -> bool:\n    words = doc.split()\n    if len(words) < 50:                      return False   # too short\n    if mean(len(w) for w in words) > 10:     return False   # not prose\n    if symbol_ratio(doc) > 0.1:              return False   # markup/code spam\n    if doc.count(\"\\n\") / max(len(words), 1) > 0.3: return False  # list dumps\n    # THE INTERESTING ONE - compression ratio. Repetitive machine-generated\n    # text compresses FAR better than natural prose, so zlib separates them\n    # with no learned classifier and no vocabulary assumptions:\n    ratio = len(zlib.compress(doc.encode())) / len(doc.encode())\n    if ratio < 0.25:                         return False   # too compressible\n    return True\n\n# Measured on a labelled synthetic corpus (clean prose vs short / symbol-spam /\n# repetitive junk), these heuristics reached precision and recall of about 1.0\n# on junk removal - and the compression ratio was what separated the REPETITIVE\n# class, which the length and symbol rules pass straight through.\n# HONEST: those numbers depend on the junk mix. Real pipelines add a LEARNED\n# quality classifier (often trained to distinguish web text from a curated\n# reference corpus), PII removal, and safety filtering on top.\n\n# THE FUNNEL, and roughly what each stage removes:\n#   raw crawl\n#     -> language ID + heuristics       (the bulk of it)\n#     -> EXACT dedup by content hash    (cheap, and there is more than you think)\n#     -> NEAR dedup by MinHash + LSH    (the expensive, high-value stage)\n#     -> quality classifier / safety\n#     -> tokenize + PACK\n#\n# WHY DEDUP IS A SCALING CONCERN, not hygiene: a duplicated document is an\n# extra EPOCH you took without deciding to. Since repeated data has sharply\n# diminishing returns past a few passes, removing duplicates INCREASES the\n# effective token count of a corpus you already have - which is the cheapest\n# response available to the data wall.",
          "caption": "The compression-ratio test catches repetitive machine-generated text that length and symbol heuristics pass through, and it needs no model. And dedup belongs in the scaling conversation: a duplicate is an unplanned epoch."
        },
        {
          "h": "MinHash with LSH, packing, and the mixture",
          "paras": [
            "Near-duplicate detection at corpus scale, then the two cheapest wins in the whole pipeline."
          ],
          "code": "def minhash(doc, P=128, k=5):\n    shingles = {hash(tuple(w[i:i+k])) for i in range(len(w := doc.split()) - k)}\n    return [min((a * s + b) % PRIME for s in shingles) for a, b in HASHES[:P]]\n#   P(signature position matches) == Jaccard, so the FRACTION matching is an\n#   unbiased Jaccard estimate with error ~ 1/sqrt(P). A few hundred integers\n#   stand in for a document of any length.\n\ndef lsh_candidates(sigs, b=16, r=8):        # b*r must equal P\n    buckets = defaultdict(list)\n    for doc_id, sig in enumerate(sigs):\n        for band in range(b):\n            key = (band, tuple(sig[band*r:(band+1)*r]))\n            buckets[key].append(doc_id)     # share a WHOLE band -> candidate\n    return {tuple(sorted(p)) for v in buckets.values()\n            for p in combinations(v, 2)}\n#   P(candidate) = 1 - (1 - s^r)^b, an S-CURVE with threshold ~ (1/b)^(1/r).\n#   Below it almost nothing is a candidate; above it almost everything is - so\n#   you compare a tiny fraction of pairs instead of all O(n^2) of them.\n\n# ---- PACKING: the cheapest large win in the pipeline ----\n# PAD each document to the context length:  ~60% of slots useful  (~40% wasted)\n# CONCATENATE all documents and CHUNK:      >99% of slots useful  (<1% wasted)\n#   -> about 30x fewer wasted slots, for a few lines and no modelling decision.\nstream = chain.from_iterable(tokenize(d) + [EOS] for d in docs)\nbatches = [list(islice(stream, L)) for _ in range(n)]      # chunk to context\n#   THE CAVEAT: chunks now cross document boundaries, so a sequence can contain\n#   the tail of one document and the head of another. Either accept it (common,\n#   and the EOS token marks the seam) or use a block-diagonal attention mask so\n#   documents cannot attend across the boundary - which is more correct and\n#   costs a mask.\n\n# ---- MIXING: temperature over source sizes ----\np = (counts / counts.sum()) ** (1 / tau)\np = p / p.sum()\n#   tau = 1  -> proportional; web text swamps books and academic sources\n#   tau > 1  -> flattens toward uniform, UP-SAMPLING the small high-quality\n#               sources. This is the standard knob and it is where most of the\n#               judgement in a data mixture lives.",
          "caption": "The S-curve is what makes corpus-scale dedup tractable - it turns an all-pairs comparison into a hash-table lookup. And packing recovers about 40% of your token slots for a few lines, which is the largest cheap win in the pipeline."
        }
      ],
      "useCases": [
        "Building a pretraining corpus, where the funnel from raw crawl through filtering, deduplication and packing determines both the token count and the quality of every downstream model trained on it.",
        "Extending the effective size of a corpus you already have, since deduplication removes epochs you were taking unknowingly and quality filtering raises the value of each remaining token - both showing up as a better scaling curve rather than merely a cleaner dataset.",
        "Recovering wasted training compute through sequence packing, which is a few lines and typically returns a large fraction of the token slots that padding was consuming.",
        "Auditing a corpus for benchmark contamination, using the same near-duplicate machinery against evaluation sets - which is the only way to know whether a reported benchmark number reflects capability or memorization."
      ],
      "pitfalls": [
        "Treating deduplication as hygiene. A duplicated document is an extra epoch you did not decide to take, and repeated data has sharply diminishing returns - so dedup increases the EFFECTIVE token count of a fixed corpus, which is a scaling concern.",
        "Padding each document to the context length. For typical document lengths that wastes around 40% of token slots, against under 1% for concatenate-and-chunk - roughly thirty times more waste, for no modelling benefit.",
        "Packing without deciding about document boundaries. Chunks cross documents, so a sequence can contain the end of one and the start of another. Either accept it with an EOS marker or use a block-diagonal mask, but decide rather than discover.",
        "Comparing all pairs for near-duplicates. That is quadratic in corpus size and infeasible at scale. MinHash compresses documents to short signatures and LSH banding turns the comparison into a hash-table lookup with a tunable similarity threshold.",
        "Relying only on length and symbol heuristics for quality. They pass repetitive machine-generated text straight through; a compression ratio catches it cheaply and with no learned model, and it is the signal that distinguishes that class.",
        "Sampling sources in proportion to their size. Web text then swamps the smaller high-quality sources, so a temperature above one is the standard correction - and choosing it is where most of the judgement in a data mixture actually lives.",
        "Not checking for benchmark contamination. Evaluation sets appear in web crawls, so a model can score well by memorization, and the same near-duplicate machinery used for deduplication is what detects it."
      ],
      "connections": [
        {
          "ref": "llm-systems/scaling-laws",
          "text": "Why this lesson exists in its current form. Once Chinchilla made data co-equal with parameters, the token supply became a binding constraint - and deduplication and filtering became ways of increasing the effective supply rather than tidying it."
        },
        {
          "ref": "training-systems/data-loading-scale",
          "text": "The delivery side of the same problem. That lesson gets bytes to the accelerators at rate; this one decides which bytes are worth delivering, and the shard-building stage is where the two meet."
        },
        {
          "ref": "llm-systems/llm-eval",
          "text": "Contamination is a data-pipeline problem with an evaluation consequence, and the near-duplicate machinery here is exactly the tool for detecting it. A benchmark number from a contaminated corpus measures memorization."
        },
        {
          "ref": "fine-tuning/instruction-tuning",
          "text": "The same quality-over-quantity finding at a much smaller scale: a thousand curated examples outperforming far larger sets is the fine-tuning analogue of filtering being worth more than volume."
        },
        {
          "ref": "unsupervised-learning/matrix-factorization",
          "text": "MinHash is a sketching technique, and the family - Bloom filters for membership, count-min for frequency - is the standard toolkit whenever a corpus is too large to hold exactly and an approximate answer with bounded error suffices."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Why did Chinchilla make data pipelines urgent?",
          "a": "It made tokens co-equal with parameters in the compute-optimal allocation, so the finite supply of high-quality text became a first-order constraint rather than plumbing."
        },
        {
          "q": "Why is deduplication a scaling concern?",
          "a": "A duplicated document is an extra epoch taken unknowingly, and repeated data has sharply diminishing returns - so dedup increases the effective token count of a fixed corpus."
        },
        {
          "q": "What does MinHash estimate?",
          "a": "Jaccard similarity. The probability that two sets share a minimum under a random hash permutation is exactly their Jaccard, so the fraction of matching signature positions is an unbiased estimate."
        },
        {
          "q": "How accurate is a MinHash signature?",
          "a": "The error falls as one over the square root of the number of permutations, so a few hundred integers give a few percent error - ample for a similarity threshold."
        },
        {
          "q": "What is LSH banding for?",
          "a": "Avoiding the quadratic all-pairs comparison. Split signatures into bands, hash each, and treat a whole-band match as a candidate pair."
        },
        {
          "q": "What shape is the LSH candidate probability?",
          "a": "An S-curve: 1 minus (1 minus s to the r) to the b, with the threshold around (1/b) to the power 1/r. Below it almost nothing is a candidate, above it almost everything is."
        },
        {
          "q": "How much does packing save?",
          "a": "Padding each document to the context length wastes about 40% of token slots for typical lengths; concatenate-and-chunk wastes under 1% - roughly thirty times less waste."
        },
        {
          "q": "What does packing cost?",
          "a": "Chunks cross document boundaries, so a sequence can span two documents. Either accept it with an EOS marker or use a block-diagonal attention mask."
        },
        {
          "q": "What is the compression-ratio quality signal?",
          "a": "Repetitive machine-generated text compresses far better than natural prose, so a low zlib ratio flags it - a cheap filter needing no learned model."
        },
        {
          "q": "What is temperature mixing?",
          "a": "Sampling source d with probability proportional to its size raised to 1/tau. Tau of one is proportional; larger values flatten toward uniform and up-sample small high-quality sources."
        },
        {
          "q": "Why is proportional sampling usually wrong?",
          "a": "Web text swamps the smaller curated sources like books and academic text, which are typically the higher-quality part of the mixture."
        },
        {
          "q": "What is benchmark contamination?",
          "a": "Evaluation data appearing in the training corpus, so a model scores by memorization. The same near-duplicate machinery used for dedup is what detects it."
        }
      ],
      "standard": [
        {
          "q": "Walk through building a pretraining corpus from a raw web crawl.",
          "a": "THE FUNNEL HAS FIVE STAGES and each removes a different kind of problem. STAGE 1: LANGUAGE IDENTIFICATION AND HEURISTIC FILTERING. Cheap rules that remove the bulk: minimum word count, mean word length, symbol ratio, line structure. The one worth highlighting is the COMPRESSION RATIO - repetitive machine-generated text compresses far better than natural prose, so zlib's ratio flags it with no learned model and no vocabulary assumption. It catches a class that length and symbol rules pass straight through, which is why it appears in the major public pipelines. STAGE 2: EXACT DEDUPLICATION by content hash. Cheap, and there is far more exact duplication in a crawl than people expect - the same article syndicated, boilerplate pages, mirrored sites. STAGE 3: NEAR DEDUPLICATION, which is the expensive and high-value stage. All-pairs comparison is quadratic and infeasible, so: represent each document as a set of word k-shingles, compute a MinHash signature of a few hundred integers - which works because the probability two sets share a minimum under a random permutation is exactly their Jaccard similarity - and then use LSH BANDING to find candidates. Split the signature into b bands of r rows, hash each band, and treat a whole-band match as a candidate. The candidate probability is an S-curve with a threshold near (1/b)^(1/r), so you compare a tiny fraction of pairs. STAGE 4: QUALITY CLASSIFICATION AND SAFETY. A learned classifier, often trained to distinguish web text from a curated reference corpus, plus PII removal and safety filtering. STAGE 5: TOKENIZE AND PACK. WHY DEDUP MATTERS MORE THAN IT LOOKS, and this is the connection I would make explicitly. A duplicated document is an extra EPOCH you took without deciding to. Since repeated data has sharply diminishing returns past a few passes, removing duplicates INCREASES the effective token count of a corpus you already have. In a world where Chinchilla made tokens co-equal with parameters and the supply is finite, that is the cheapest available response to the data wall - and it reframes dedup from hygiene into a scaling intervention. THE PACKING NUMBER, which is the biggest cheap win. Padding each document to the context length wastes roughly 40% of token slots for a typical document-length distribution. Concatenating everything into one stream and chunking wastes under 1%. That is about thirty times fewer wasted slots, recovered by a few lines with no modelling decision - the clearest case in this module of a systems detail dominating a modelling one. The caveat is that chunks cross document boundaries, so either accept the seam with an EOS marker or use a block-diagonal attention mask. THE MIXTURE. Sampling sources proportionally lets web text swamp books and academic material, so a temperature above one flattens the distribution and up-samples the small high-quality sources. That temperature is where most of the judgement in a corpus actually lives, and it is worth evaluating by fitting scaling curves per mixture rather than by intuition. AND THE STEP PEOPLE OMIT: check for BENCHMARK CONTAMINATION with the same near-duplicate machinery, against your evaluation sets. Without it, a benchmark number may be measuring memorization.",
          "deepDive": {
            "q": "Derive the LSH banding S-curve and explain how you would choose b and r.",
            "a": "THE SETUP. Two documents have true Jaccard similarity s. Their MinHash signatures agree at each position independently with probability s - that is the MinHash property. The signature has P = b*r positions, split into b bands of r rows each. THE DERIVATION, four short steps. (1) A single BAND matches entirely when all r of its positions agree, which has probability s^r. (2) A band FAILS to match with probability 1 - s^r. (3) ALL b bands fail with probability (1 - s^r)^b, since the bands are independent given the signature. (4) So at least one band matches - the pair becomes a CANDIDATE - with probability 1 - (1 - s^r)^b. WHY IT IS AN S-CURVE. Consider the two regimes. For small s, s^r is very small because r is a power, so (1 - s^r)^b is close to one and the candidate probability is near zero. For s near one, s^r is close to one, so (1 - s^r) is near zero and raising it to the b makes it vanish - candidate probability near one. Between them the transition is sharp, and it sharpens as r grows. The inflection is approximately at s = (1/b)^(1/r), which is the standard rule for the threshold. HOW b AND r TRADE. Their product is fixed by the signature length P, so choosing one determines the other. LARGER r means each band is harder to match, which RAISES the threshold and SHARPENS the curve - you catch fewer false positives and risk missing true near-duplicates just below the threshold. LARGER b means more chances to match, which LOWERS the threshold and catches more - at the cost of more candidate pairs to verify and more false positives. HOW I WOULD ACTUALLY CHOOSE. Start from the SIMILARITY THRESHOLD you want, which is a corpus decision - typically something like 0.8 Jaccard for near-duplicate documents. Then solve (1/b)^(1/r) = threshold subject to b*r = P for an integer pair, and plot the resulting curve to check its sharpness at your threshold. With P = 128 and a target near 0.8, something like b = 16 and r = 8 lands close. Then VALIDATE on a labelled sample: take pairs you know to be duplicates and pairs you know are not, and measure the recall and the candidate-set size. WHAT THE ASYMMETRY OF COSTS IMPLIES. A false positive is cheap - it becomes a candidate and you verify it exactly, discarding it. A false negative is a duplicate that survives into the corpus, taking an epoch you did not intend. So I would bias toward a LOWER threshold and more candidates, accepting more verification work, because the verification is a linear pass and the missed duplicate is permanent. That asymmetry is the practical reason production pipelines run fairly generous banding. THE SCALING PROPERTY THAT MAKES IT WORK. Without LSH the comparison is O(n^2) - for a billion documents that is 10^18 pairs, which is not happening. With banding it is O(n*b) hash-table insertions plus verification of the candidate set, which is close to linear when the threshold is set so the candidate set is small. That transformation from quadratic to near-linear is the entire reason corpus-scale deduplication is feasible, and it is the same banding idea used in every other LSH application."
          }
        },
        {
          "q": "How would you evaluate a data mixture?",
          "a": "THE WRONG WAY, which is the common one: train one model on each candidate mixture at whatever scale you can afford and compare final loss or a benchmark. That comparison is confounded, because a difference at small scale may not survive scaling and because you have one point per mixture with no way to separate a genuine advantage from noise. THE RIGHT WAY: FIT A SCALING CURVE PER MIXTURE. Train a ladder of small models on each candidate - parameters over a couple of orders of magnitude, tokens in proportion, learning-rate schedule matched to each run's token count - and fit L(N,D) = E + A/N^a + B/D^b for each. Then compare the CURVES rather than the points. A better mixture shows a lower irreducible term or better constants, and crucially you can extrapolate to the scale you actually intend to train at, where the ranking may differ from the small-scale ranking. This costs a fraction of a real run and it is the only method that answers the question you are actually asking. WHAT TO MEASURE BESIDES LOSS. (1) DOMAIN-SPECIFIC HELD-OUT LOSS, per source, because a mixture that improves aggregate loss by up-weighting web text may be degrading code or mathematics. The aggregate hides exactly the trade you are trying to make. (2) DOWNSTREAM TASK PERFORMANCE on a small suite, remembering that loss is not capability and the mapping can be sharp. (3) CONTAMINATION, checked against every evaluation set with the same near-duplicate machinery used for dedup - because a mixture that happens to include more of a benchmark's source will look better for the wrong reason, and this is a live risk when comparing mixtures specifically. THE TEMPERATURE SWEEP, which is where most of the value is. Rather than comparing hand-designed mixtures, sweep the temperature that interpolates between proportional and uniform sampling and fit a curve at several values. That gives you a one-dimensional family with a principled parameterization instead of an unstructured comparison, and the optimum is usually interior - proportional lets web text dominate, uniform over-samples small sources into repetition. WHAT MAKES THIS HARD AND IS WORTH SAYING. The optimal mixture depends on the model scale and on the token budget, because up-sampling a small source means repeating it, and repetition's cost depends on how many total tokens you are consuming. So a mixture tuned at small scale can be wrong at large scale for a structural reason rather than a noise reason - the small source that was seen twice at 10B tokens is seen forty times at 200B. That interaction is the strongest argument for the curve-fitting method over point comparisons, since it is exactly what the curve extrapolates. WHAT I WOULD REPORT. The fitted curve per mixture, the extrapolated loss at the target scale with the fitting range stated, per-domain held-out losses, and the contamination check. That is a defensible basis for a decision that will otherwise be made on intuition about which sources feel higher quality."
        },
        {
          "q": "Explain sequence packing and its consequences.",
          "a": "THE PROBLEM. Documents vary in length and the model consumes fixed-size sequences. The naive approach pads each document to the context length, which wastes every slot between the document's actual length and the window. For a typical web-document length distribution against a multi-thousand-token context, that is roughly 40% of slots consumed by padding - and padding contributes nothing to learning while costing full compute and memory. THE FIX. Concatenate all tokenized documents into one long stream with a separator, then chunk it at the context length. Now the only waste is the final partial chunk, which is under 1% of the corpus. That is about thirty times fewer wasted slots, and it is a few lines with no modelling decision - which makes it the largest cheap win in the pipeline and the clearest case of a systems detail dominating a modelling one. THE CONSEQUENCE THAT NEEDS A DECISION. Chunks now cross document boundaries, so a sequence can contain the tail of one document and the head of an unrelated one. Two options and you should pick deliberately. (1) ACCEPT IT, with an EOS token marking the seam. The model attends across the boundary, learns that content after an EOS is unrelated, and this is what most pretraining does. The cost is a small amount of attention spent relating unrelated text, and some argument that it teaches the model to handle topic shifts. (2) BLOCK-DIAGONAL MASKING, so attention cannot cross a document boundary within a sequence. More correct - each document is processed as if alone - at the cost of constructing and applying the mask, and of the model never seeing a cross-document transition. Both are defensible; the failure is doing (1) without knowing you did. THE SECOND-ORDER EFFECTS worth knowing. (a) LOSS NORMALIZATION. With packing, every slot is a real token, so the per-token normalization is trivially correct. With padding you must mask and divide by the real count - which is the bug from the custom-loss lesson, and packing removes the opportunity to make it. (b) POSITION IDS. If documents are masked block-diagonally you generally want positions to RESET per document rather than running across the whole chunk, or the second document in a sequence is presented at positions it would never see alone. Forgetting this is a real and subtle bug. (c) BATCH COMPOSITION. Packed sequences are homogeneous in length by construction, which removes the length-bucketing question entirely and makes throughput predictable. (d) VERY LONG DOCUMENTS are split across chunks, so their later portions are seen without their beginning - which is unavoidable and worth being aware of for long-form data. WHERE PACKING IS NOT USED. Fine-tuning on instruction data, where each example is a coherent unit and mixing two instructions in one sequence is genuinely wrong - though even there, packing WITH block-diagonal masking is increasingly common because the efficiency argument does not go away and the masking makes it correct."
        },
        {
          "q": "Why does deduplication improve models, beyond saving compute?",
          "a": "THREE DISTINCT MECHANISMS, and separating them explains why the effect is larger than a compute-saving argument would suggest. (1) IT REMOVES UNPLANNED EPOCHS. A document appearing ten times in the corpus is trained on ten times, which is ten epochs over that content while everything else gets one. Repeated data has sharply diminishing and eventually negative returns, so those extra passes are worth little and consume budget. Removing them means the same compute covers more distinct content, which raises the EFFECTIVE token count of a fixed corpus. In a data-constrained regime that is the cheapest available intervention, and it is why dedup belongs in the scaling conversation rather than the hygiene one. (2) IT REDUCES MEMORIZATION. Content seen many times is memorized rather than generalized from, and memorization is a problem in several directions at once: verbatim regurgitation of training data is a privacy and licensing exposure; memorized text inflates evaluation numbers on anything that overlaps; and capacity spent on memorizing a duplicated document is capacity not spent on generalizing. The published deduplication work found measurable reductions in verbatim emission alongside the quality improvement, which is the strongest form of this argument because it is a direct measurement rather than an inference. (3) IT DE-BIASES THE DISTRIBUTION. Duplication is not uniform across content types - boilerplate, syndicated news, SEO-generated pages and licence texts duplicate far more than original writing. So a duplicated corpus is a distorted sample of the intended distribution, over-weighting exactly the least informative material. Deduplicating moves the training distribution toward the one you meant to sample. THE MEASURED RESULT. The deduplication literature reports better models at equal compute and reduced memorization, from removing duplicates alone - no other change. That is an unusually clean finding for a data intervention, and it is the reason near-duplicate removal became standard in every serious public pipeline. THE VARIANT THAT MATTERS AND IS HARDER. Document-level dedup catches whole duplicates; SUBSTRING dedup catches a paragraph repeated across many otherwise-different documents, which is extremely common with boilerplate and quoted material. That needs suffix arrays rather than MinHash, is more expensive, and catches a class the document-level method misses entirely. Whether it is worth it depends on the corpus, and it is a decision worth making explicitly rather than defaulting to document level because it is easier. THE ONE I WOULD FLAG AS UNDER-DONE. Deduplicating the training corpus AGAINST THE EVALUATION SETS - contamination checking. It uses the same machinery, it is cheap once the pipeline exists, and without it a benchmark number may be measuring memorization of the test set rather than capability. That is not a data-quality issue, it is a validity issue, and it undermines everything downstream of the evaluation.",
          "deepDive": {
            "q": "How would you detect and quantify benchmark contamination?",
            "a": "THE PROBLEM. Evaluation sets are published on the web, so they end up in crawls. A model that has seen the test set scores well by memorization, and the number then measures nothing you care about. This is a validity failure rather than a quality one, and it invalidates comparisons rather than merely degrading them. DETECTION METHOD 1: N-GRAM OVERLAP, the standard approach. For each evaluation example, check whether a sufficiently long n-gram from it - typically something in the range of 8 to 13 tokens - appears anywhere in the training corpus. Long n-grams essentially never collide by chance in natural text, so a match is strong evidence. Implementation is a hash set or a Bloom filter over the corpus's n-grams, which makes the lookup constant-time at the cost of a small false-positive rate that you can bound by sizing the filter. This is what most public reporting uses. DETECTION METHOD 2: NEAR-DUPLICATE MATCHING with the MinHash and LSH machinery already built for deduplication. It catches paraphrased or reformatted versions that exact n-gram matching misses - a benchmark question reproduced with different whitespace or a slightly different preamble. Cheap once the dedup pipeline exists. DETECTION METHOD 3: BEHAVIOURAL, when you cannot inspect the training data - which is the usual situation with a model someone else trained. Compare the model's likelihood on the exact benchmark text against its likelihood on trivially perturbed versions: reorder the multiple-choice options, rephrase the question, change names or numbers. A model that has memorized shows an anomalous preference for the canonical form. Alternatively, compare performance on a benchmark against performance on a freshly-constructed equivalent set created after the model's training cutoff - a large gap is the signature. QUANTIFICATION. Report the FRACTION of evaluation examples with a training-set match, and report the benchmark score BOTH ways: on the full set and on the contamination-free subset. The difference between those two numbers is the contamination's effect, and it is the number that should be quoted. If removing contaminated examples drops the score substantially, the original figure was measuring memorization. WHAT MAKES THIS GENUINELY HARD. (1) You often cannot see the training data - most reported model evaluations are on models whose corpora are undisclosed, so only the behavioural methods apply. (2) Contamination is a spectrum: the exact test item, a paraphrase, a discussion of the benchmark, a solution posted in a forum, or merely the source document the question was written from. Where to draw the line is a judgement, and different papers draw it differently, which makes cross-paper comparisons of contamination rates unreliable. (3) NEW BENCHMARKS DECAY. A benchmark released today is clean today and contaminated in two years, so a model's score is partly a function of when it was trained relative to the benchmark's publication. THE PRACTICE I WOULD ADOPT. Run n-gram contamination checking against every evaluation set as a standard pipeline stage, report the contaminated fraction alongside every benchmark number, and prefer held-out sets constructed after the training cutoff where the question is important. And treat a benchmark score reported without a contamination check as an upper bound rather than a measurement - which is the honest reading of most published numbers."
          }
        },
        {
          "q": "How do you decide what quality filtering to apply?",
          "a": "THE TENSION IS THAT FILTERING REMOVES TOKENS, and in a data-constrained regime tokens are the scarce resource. So every filter has to justify itself against the loss of volume, and the right criterion is whether it improves the SCALING CURVE rather than whether the surviving documents look nicer. THE LADDER OF FILTERS, roughly by cost and by how well-established they are. (1) LANGUAGE IDENTIFICATION, if you want a monolingual or a controlled-mixture corpus. Cheap, unambiguous. (2) LENGTH AND STRUCTURE HEURISTICS: minimum words, mean word length, symbol ratio, fraction of lines that are bullets or navigation. These remove the obvious bulk and are essentially free. (3) THE COMPRESSION-RATIO TEST, which I would highlight because it catches a class the others miss. Repetitive machine-generated text - SEO spam, templated pages, keyword stuffing - compresses far better than natural prose, so a low zlib ratio flags it. No model, no vocabulary assumption, and it is the signal that separates the repetitive class after length and symbol rules have passed it through. (4) REPETITION-WITHIN-DOCUMENT metrics: the fraction of duplicate lines or paragraphs, which the Gopher-style rules use and which catch a related failure. (5) A LEARNED QUALITY CLASSIFIER, typically trained to distinguish crawl text from a curated reference corpus. More powerful and more opaque, and it imports whatever biases the reference corpus has - a classifier trained against a formal reference will down-weight informal but perfectly good text, which is a real and under-examined cost. (6) SAFETY AND PII filtering, which is a requirement rather than a quality decision. HOW I WOULD DECIDE WHAT TO KEEP. Fit a scaling curve for the corpus with and without each filter. A filter that improves the curve is worth its volume loss; one that does not is removing tokens for nothing. This is the same method as evaluating a mixture and it is the only way to answer the question empirically rather than aesthetically. I would also measure the volume removed per filter, so the cost side of the trade is explicit. WHAT I WOULD BE CAUTIOUS ABOUT. Aggressive filtering has a documented failure mode: it removes dialects, non-standard registers, and the writing of under-represented groups at a higher rate, because those look further from a curated reference. That is a quality decision with a fairness consequence and it should be made knowingly. And filtering interacts with the mixture - if a filter removes 60% of one source and 5% of another, you have silently changed the mixture weights, which is a common and invisible side effect. THE ORDER THAT MATTERS. Deduplicate BEFORE running expensive filters, so you are not classifying the same document repeatedly. And do contamination checking last, against the final corpus, since earlier stages change what is in it. THE JUDGEMENT I WOULD OFFER. The heuristic filters are well-established and cheap and I would apply them by default. The learned classifier is where the real decisions are, and I would treat its reference corpus as a modelling choice deserving the same scrutiny as an architecture - because it determines what the model considers normal text."
        },
        {
          "q": "How does this lesson fit the module's two-regime framing?",
          "a": "IT IS ENTIRELY A TRAINING-REGIME LESSON, and saying so precisely is useful because it clarifies what these techniques can and cannot buy. THE TRAINING REGIME'S QUESTION is how to allocate a compute budget, and Chinchilla answered it: split it roughly equally between parameters and tokens, around twenty tokens per parameter. That answer makes the TOKEN SUPPLY a first-order constraint, and everything in this lesson is a response to that constraint. WHAT EACH TECHNIQUE BUYS, in those terms. DEDUPLICATION increases the effective token count of a fixed corpus, because a duplicate was an unplanned epoch and repeated data has diminishing returns. QUALITY FILTERING raises the value of each remaining token, visible as a better scaling curve. PACKING recovers the roughly 40% of token slots that padding was consuming, which is compute rather than data but is spent on the same axis. MIXING decides which tokens you spend the budget on. All four are ways of getting more out of the D term in the scaling law, and none of them touches inference at all. THE CONTRAST WITH THE INFERENCE REGIME, which nothing here addresses. Quantization, grouped-query attention, speculative decoding and paged attention are all about bytes read per generated token, and no amount of data-pipeline work changes any of them. A model trained on a beautifully curated corpus decodes at exactly the same speed as one trained on a filthy one. That sounds obvious stated plainly and it is worth stating, because data-quality arguments sometimes get invoked in efficiency discussions where they are simply irrelevant. WHERE THE TWO REGIMES MEET, and there are two places. (1) THE INFERENCE-AWARE SCALING OBJECTIVE from the scaling-laws lesson says a served model should be smaller and trained on MORE tokens - which increases the demand on this pipeline. So the deployment plan raises the token requirement, and data-pipeline work is what makes that possible. The pipeline is therefore doing work in service of an inference-regime decision, which is the connection worth drawing. (2) CONTAMINATION, which is a data-pipeline problem whose consequence is an evaluation problem - and evaluation spans both regimes because it is how you decide anything at all. THE STRATEGIC READING. Chinchilla shifted the marginal value of effort from architecture toward data, and the data wall shifted it further - toward deduplication, quality, synthetic generation, and post-training. This lesson is where the first two of those live, and its techniques went from unglamorous plumbing to a determinant of frontier model quality in about two years, entirely because the binding constraint moved. That is a good illustration of the module's general claim: the technique that matters is the one addressing whatever currently binds, and which one that is changes."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "MinHash estimates Jaccard",
        "back": "P[h_min(A) = h_min(B)] = J(A,B) EXACTLY. So the fraction of matching signature positions is an UNBIASED Jaccard estimate, error ~ 1/sqrt(P). A few hundred integers stand in for a document of any length."
      },
      {
        "type": "formula",
        "front": "The LSH banding S-curve",
        "back": "P(candidate) = 1 - (1 - s^r)^b, threshold ~ (1/b)^(1/r), with b*r = P. Below the threshold almost nothing is a candidate, above it almost everything is - turning O(n^2) all-pairs into a hash-table lookup."
      },
      {
        "type": "intuition",
        "front": "Bias LSH toward MORE candidates",
        "back": "A false POSITIVE is cheap - you verify it exactly and discard it. A false NEGATIVE is a duplicate that survives, taking an epoch you did not intend. Asymmetric costs, so run generous banding and accept the verification pass."
      },
      {
        "type": "intuition",
        "front": "Sequence packing: the biggest cheap win",
        "back": "PAD each document to context: ~40% of slots wasted. CONCATENATE and CHUNK: <1%. About 30x fewer wasted slots, for a few lines and no modelling decision. The clearest case of a systems detail dominating a modelling one."
      },
      {
        "type": "pitfall",
        "front": "Packing crosses document boundaries",
        "back": "A sequence can hold the tail of one document and the head of another. Either ACCEPT it with an EOS marker (what most pretraining does) or use a BLOCK-DIAGONAL mask - and if you mask, RESET position ids per document. The failure is doing it unknowingly."
      },
      {
        "type": "intuition",
        "front": "Dedup is a SCALING intervention, not hygiene",
        "back": "A duplicated document is an extra EPOCH you took without deciding to - and repeated data has sharply diminishing returns. So dedup raises the EFFECTIVE token count of a corpus you already have: the cheapest response to the data wall."
      },
      {
        "type": "intuition",
        "front": "Three mechanisms by which dedup improves models",
        "back": "(1) removes unplanned epochs -> more distinct content per unit compute; (2) reduces MEMORIZATION (privacy, licensing, inflated evals, wasted capacity); (3) DE-BIASES the distribution, since boilerplate/syndicated/SEO text duplicates far more than original writing."
      },
      {
        "type": "definition",
        "front": "The compression-ratio quality signal",
        "back": "Repetitive machine-generated text compresses FAR better than natural prose, so a low zlib ratio flags it - no learned model, no vocabulary assumption. It catches the class that length and symbol heuristics pass straight through."
      },
      {
        "type": "formula",
        "front": "Temperature mixing",
        "back": "p_d ~ (n_d / sum n)^(1/tau). tau=1 is PROPORTIONAL and web text swamps everything; tau>1 flattens toward uniform, UP-SAMPLING small high-quality sources. Sweep tau and fit a scaling curve at each value rather than hand-designing mixtures."
      },
      {
        "type": "intuition",
        "front": "Evaluate a mixture by its CURVE, not a point",
        "back": "Train a LADDER per candidate and fit L(N,D) = E + A/N^a + B/D^b. Compare curves and extrapolate. A point comparison at small scale cannot separate a real advantage from noise, and the ranking can INVERT at scale because up-sampling a small source means more repetition as D grows."
      },
      {
        "type": "pitfall",
        "front": "Check benchmark CONTAMINATION",
        "back": "Evaluation sets are on the web. Use the same MinHash/LSH machinery, or n-gram (8-13 token) matching via a Bloom filter. Report the score on the FULL set AND the clean subset - the difference is the contamination's effect. A score without this check is an upper bound."
      },
      {
        "type": "pitfall",
        "front": "Filtering silently changes the MIXTURE",
        "back": "A filter removing 60% of one source and 5% of another has reweighted your corpus. And aggressive filtering removes dialects and non-standard registers at a higher rate, because they look further from a curated reference - a quality decision with a fairness consequence."
      }
    ],
    "refs": [
      {
        "title": "Lee et al. (2022), Deduplicating Training Data Makes Language Models Better",
        "url": "https://arxiv.org/abs/2107.06499"
      },
      {
        "title": "Penedo et al. (2023), The RefinedWeb Dataset for Falcon LLM",
        "url": "https://arxiv.org/abs/2306.01116"
      },
      {
        "title": "Rae et al. (2021), Scaling Language Models: Methods, Analysis & Insights from Training Gopher",
        "url": "https://arxiv.org/abs/2112.11446"
      },
      {
        "title": "Soldaini et al. (2024), Dolma: an Open Corpus of Three Trillion Tokens",
        "url": "https://arxiv.org/abs/2402.00159"
      },
      {
        "title": "Raffel et al. (2020), Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer (C4)",
        "url": "https://arxiv.org/abs/1910.10683"
      }
    ],
    "demos": [
      "bloom-filter",
      "count-min-sketch",
      "reservoir-sampling",
      "importance-sampling"
    ]
  }
};
