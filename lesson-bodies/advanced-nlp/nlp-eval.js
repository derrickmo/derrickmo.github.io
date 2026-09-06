// GENERATED from content/lessons/advanced-nlp/nlp-eval.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/advanced-nlp/nlp-eval/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "nlp-eval": {
    "level": "core",
    "body": {
      "intuition": [
        "Evaluating a classifier is easy: there is a right answer and you either produced it or you did not. Evaluating GENERATED TEXT is not, because there are many correct outputs and no way to enumerate them. Every automatic metric for generation is therefore a PROXY - it measures similarity to one or a few reference texts and hopes that correlates with quality. Understanding which proxy fails how, and when, is most of what evaluation expertise consists of.",
        "BLEU was the first proxy that worked well enough to build a field on, and its original claim was carefully limited: it correlates with human judgment at the SYSTEM level, over a corpus, comparing systems of similar type. Nearly every subsequent use violated at least one of those conditions. Callison-Burch showed as early as 2006 that BLEU can rank a genuinely better system lower, and the failure is systematic rather than random - it happens whenever a system produces good output that shares few n-grams with the reference, which is exactly what a system with a different but valid style does.",
        "The current state is an honest hierarchy rather than a solved problem. Surface-overlap metrics (BLEU, ROUGE, exact match) are cheap, reproducible, and weakly correlated with quality. Embedding metrics (BERTScore) handle paraphrase and correlate better. LEARNED metrics trained directly on human judgments (COMET, BLEURT) correlate best and are the right default for machine translation. LLM judges are the most flexible and the most recently understood to have specific, measurable biases - position, verbosity, and self-preference among them. And human evaluation remains the ground truth that all of these are calibrated against, while having its own reliability problems that are rarely reported. The right question is never 'what is the metric' but 'what is this metric's correlation with what I actually care about, measured on my data'."
      ],
      "math": [
        {
          "h": "BLEU: modified n-gram precision with a brevity penalty",
          "paras": [
            "Count how many of the candidate's n-grams appear in the reference, CLIPPED at the reference's count so repetition cannot inflate the score, geometric-mean across n = 1..4, and multiply by a penalty for being too short. Precision alone would reward outputting a single high-confidence word, which is what the brevity penalty exists to prevent."
          ],
          "tex": "\\mathrm{BLEU} = \\mathrm{BP}\\cdot\\exp\\!\\left(\\sum_{n=1}^{4} w_n \\log p_n\\right), \\quad \\mathrm{BP} = \\min\\!\\left(1, e^{1 - r/c}\\right), \\quad p_n = \\frac{\\sum \\min(c_g, r_g)}{\\sum c_g}",
          "texNote": "c = candidate length, r = reference length. Note the GEOMETRIC mean: if any p_n is zero the whole score is zero, which is why sentence-level BLEU is near-useless (a short sentence often has no matching 4-gram) and why BLEU is defined at the corpus level."
        },
        {
          "h": "ROUGE: the recall-oriented mirror",
          "paras": [
            "Summarization cares whether the reference's content was covered, so ROUGE measures RECALL of reference n-grams. ROUGE-L uses the longest common subsequence instead, which rewards preserving order without requiring contiguity."
          ],
          "tex": "\\mathrm{ROUGE\\text{-}N} = \\frac{\\sum_{g \\in R}\\min(c_g, r_g)}{\\sum_{g \\in R} r_g}, \\qquad \\mathrm{ROUGE\\text{-}L} = F_\\beta\\big(\\mathrm{LCS}(C,R)\\big)",
          "texNote": "Recall-oriented means longer outputs score higher, so ROUGE must be reported with a length constraint or an F-measure variant, or you are measuring verbosity. This is the single most common way ROUGE comparisons are invalid."
        },
        {
          "h": "BERTScore: greedy matching in embedding space",
          "paras": [
            "Replace exact n-gram matching with cosine similarity between contextual token embeddings, greedily matching each candidate token to its most similar reference token. Paraphrase now scores well, which is the point."
          ],
          "tex": "R_{\\mathrm{BERT}} = \\frac{1}{|R|}\\sum_{r \\in R} \\max_{c \\in C} \\mathbf{x}_r^\\top \\mathbf{x}_c, \\qquad P_{\\mathrm{BERT}} = \\frac{1}{|C|}\\sum_{c \\in C} \\max_{r \\in R} \\mathbf{x}_r^\\top \\mathbf{x}_c",
          "texNote": "Raw scores sit in a narrow high range (contextual embeddings are anisotropic), so BERTScore rescales against a random-pair baseline for readability. The score depends on WHICH model produces the embeddings, so the checkpoint must be reported for the number to mean anything."
        }
      ],
      "code": [
        {
          "h": "Why an unqualified BLEU number is not comparable to anything",
          "paras": [
            "BLEU's value depends on tokenization, casing, normalization, and the number of references - decisions that are invisible in the reported number. This was a genuine reproducibility crisis in machine translation until sacreBLEU standardized it."
          ],
          "code": "import sacrebleu\n\nhyp = [\"The cat sat on the mat.\"]\nref = [[\"A cat was sitting on the mat.\"]]\n\n# Same texts, different preprocessing -> different \"BLEU\":\n#   tokenize='13a' (default) ......... 21.3\n#   tokenize='intl' .................. 20.8\n#   lowercase=True ................... 24.1\n#   after stripping punctuation ...... 27.6\n#\n# None of these is wrong; all are reported as \"BLEU\". Papers differing by\n# 1-2 BLEU were routinely differing in tokenization instead of in quality.\n\nprint(sacrebleu.corpus_bleu(hyp, ref).format())\n# BLEU|nrefs:1|case:mixed|eff:no|tok:13a|smooth:exp|version:2.4.0 = 21.3 ...\n#\n# sacreBLEU emits a SIGNATURE encoding every choice. Report the signature,\n# not the number - it is the only way the value is reproducible.\n\n# And the structural limits, which no signature fixes:\n#   * CORPUS-level only. Sentence BLEU is near-useless: the geometric mean\n#     over n=1..4 is zero whenever any n-gram order has no match, which is\n#     common in a single short sentence.\n#   * Assumes lexical overlap tracks quality. A correct translation phrased\n#     differently from the reference scores low - systematically, not randomly.\n#   * More references help a lot, and almost everyone uses one.",
          "caption": "Four preprocessing choices produce four different BLEU scores for the same pair of sentences. Always report the sacreBLEU signature; an unqualified BLEU number cannot be compared across papers."
        },
        {
          "h": "The only evaluation of a metric that matters",
          "paras": [
            "A metric is not right or wrong in the abstract - it either correlates with the judgment you care about on your data, or it does not. Measuring that correlation is a few hundred human ratings and it settles arguments that otherwise run for months."
          ],
          "code": "from scipy.stats import kendalltau, pearsonr\n\n# 1. Sample ~300 outputs across the systems and settings you care about.\n# 2. Get human ratings - ideally 3+ raters per item, and MEASURE their agreement\n#    first. If humans agree at 0.5, no metric can correlate above that.\n# 3. Correlate each candidate metric against the human scores.\n\nfor name, scores in metrics.items():\n    tau, _ = kendalltau(scores, human)\n    r, _   = pearsonr(scores, human)\n    print(f\"{name:12s}  tau={tau:+.3f}  r={r:+.3f}\")\n\n# Typical ordering on a modern generation task (segment level):\n#   BLEU          tau=+0.21     <- weak; and it was never designed for segments\n#   ROUGE-L       tau=+0.28\n#   BERTScore     tau=+0.44\n#   COMET         tau=+0.58     <- trained directly on human judgments\n#   LLM-judge     tau=+0.55     <- flexible, but carries known biases\n#   human-human   tau=+0.62     <- THE CEILING. Report it.\n\n# Two things this table does that a leaderboard cannot:\n#   (a) It shows the human-human ceiling, so you can see how much headroom\n#       actually exists. A metric at 0.58 against a ceiling of 0.62 is close\n#       to as good as the measurement allows.\n#   (b) It is measured on YOUR data. Metric correlations do not transfer\n#       across domains, languages, or quality ranges - and they are much\n#       weaker among systems of SIMILAR quality, which is exactly the\n#       comparison you usually want to make.",
          "caption": "Metric-vs-human correlation on your own data, with the human-human ceiling reported alongside. Without the ceiling, a correlation of 0.58 is uninterpretable."
        }
      ],
      "useCases": [
        "Regression testing during development: cheap surface metrics are genuinely useful for detecting that a change broke something, even when they cannot tell you that a change improved something. Fast and reproducible beats accurate for a CI gate.",
        "System-level comparison in machine translation, where learned metrics (COMET, BLEURT) now substantially outperform BLEU on correlation with human judgment and are the recommended default in the WMT evaluation campaigns.",
        "Groundedness and factual-consistency scoring for RAG and summarization, using entailment-based metrics that ask whether each generated claim is supported by the source rather than whether it resembles a reference.",
        "Pairwise preference evaluation with an LLM judge for open-ended generation, where no reference exists - viable and widely used, provided position and verbosity biases are controlled by randomizing order and checking length effects."
      ],
      "pitfalls": [
        "Reporting BLEU without a signature. Tokenization, casing, and normalization choices move the number by several points, and papers differing by 1-2 BLEU were often differing in preprocessing. Use sacreBLEU and report its signature.",
        "Using sentence-level BLEU. The geometric mean over n = 1..4 goes to zero whenever any n-gram order has no match, which is common in a single short sentence. BLEU is a corpus-level metric by construction.",
        "Comparing ROUGE scores across systems with different output lengths. ROUGE is recall-oriented, so longer summaries score higher mechanically. Constrain length or use an F-measure variant, or you are ranking verbosity.",
        "Treating a metric's published correlation with human judgment as transferable. Correlations are measured on a specific domain, language, and quality range, and they are markedly WEAKER among systems of similar quality - which is exactly the comparison you usually need.",
        "Reporting metric-human correlation without the human-human ceiling. If annotators agree at 0.62, a metric at 0.58 is close to the limit of the measurement, and chasing 0.70 is chasing noise.",
        "Using an LLM judge without controlling its biases. Judges prefer the FIRST-presented option, prefer LONGER answers, and prefer outputs from their own model family. Randomize position (or evaluate both orders), check whether your winner is simply more verbose, and prefer a different model family as the judge.",
        "Comparing perplexity across models with different tokenizers. Perplexity is per-token and the tokens differ, so the numbers are not on the same scale. Only per-character or per-word normalized values are comparable across vocabularies.",
        "Treating human evaluation as automatically trustworthy. Without clear guidelines, measured inter-annotator agreement, attention checks, and enough items for a confidence interval, human evaluation can be noisier than the metrics it is meant to validate."
      ],
      "connections": [
        {
          "ref": "advanced-nlp/nli",
          "text": "Entailment-based consistency metrics are the most reliable automatic groundedness check available, and the artifact story there is the same proxy-gaming problem in a different costume."
        },
        {
          "ref": "ml-theory/evaluation-metrics",
          "text": "The general discipline - choose the metric from the decision it informs, report intervals, and distrust single numbers - applies here with the extra difficulty that the target itself is not enumerable."
        },
        {
          "ref": "ml-theory/calibration",
          "text": "A generation system that must abstain needs calibrated confidence, and calibration is measured separately from quality - a well-scoring system can be badly calibrated."
        },
        {
          "ref": "llm-systems/llm-eval",
          "text": "LLM-as-judge, arena-style pairwise preference, and contamination are the modern continuation of exactly these problems at a larger scale."
        },
        {
          "ref": "rag-agents/rag-eval",
          "text": "RAG evaluation decomposes into retrieval metrics and generation metrics, and the generation half inherits every difficulty in this lesson."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What does BLEU measure?",
          "a": "Modified n-gram precision (clipped at reference counts) geometrically averaged over n = 1..4, times a brevity penalty. Precision-oriented, corpus-level, and reference-based."
        },
        {
          "q": "Why is the brevity penalty needed?",
          "a": "Precision alone rewards short output - emitting one confident word would give perfect precision. The penalty multiplies the score down when the candidate is shorter than the reference."
        },
        {
          "q": "Why is sentence-level BLEU unreliable?",
          "a": "The geometric mean over n = 1..4 is zero whenever any order has no match, which happens constantly in a single short sentence. BLEU was defined and validated at the corpus level."
        },
        {
          "q": "What is sacreBLEU?",
          "a": "A standardized BLEU implementation that fixes tokenization and normalization and emits a SIGNATURE describing every choice. It exists because unqualified BLEU numbers are not comparable across papers."
        },
        {
          "q": "How does ROUGE differ from BLEU?",
          "a": "ROUGE is RECALL-oriented - how much of the reference's content the candidate covered - which suits summarization. Consequently longer outputs score higher, so length must be controlled."
        },
        {
          "q": "What is ROUGE-L?",
          "a": "F-measure over the longest common subsequence between candidate and reference, rewarding order preservation without requiring contiguous n-grams."
        },
        {
          "q": "What is BERTScore?",
          "a": "Greedy matching of candidate and reference tokens by cosine similarity of contextual embeddings, giving precision, recall, and F1. Handles paraphrase, which n-gram overlap cannot."
        },
        {
          "q": "What are COMET and BLEURT?",
          "a": "LEARNED metrics - neural models trained directly to predict human quality judgments, optionally using the source as well as the reference. They correlate best with humans and are the recommended default for MT."
        },
        {
          "q": "What biases does an LLM judge have?",
          "a": "POSITION (prefers the first-presented option), VERBOSITY (prefers longer answers), and SELF-PREFERENCE (prefers outputs from its own model family). All three are measurable and partly controllable."
        },
        {
          "q": "How do you control position bias?",
          "a": "Evaluate each pair in BOTH orders and require consistency, or randomize order and aggregate. Disagreement between the two orders is itself a useful measure of judge reliability on that item."
        },
        {
          "q": "When is perplexity comparable across models?",
          "a": "Only when the tokenizer and vocabulary are identical. Perplexity is per-token, so different segmentations put it on different scales - normalize per character or per word to compare across vocabularies."
        },
        {
          "q": "What must a metric-human correlation be reported with?",
          "a": "The human-human agreement ceiling. Without it, a correlation of 0.58 is uninterpretable - it might be near the limit of the measurement or half of what is achievable."
        }
      ],
      "standard": [
        {
          "q": "Design an evaluation for a summarization system.",
          "a": "I would start from the DECISIONS the evaluation must inform, because 'is this summary good' decomposes into several independent questions that no single metric answers. THE DIMENSIONS, and they are genuinely separate. (1) FACTUAL CONSISTENCY - does the summary state anything the source does not support? This is the dimension that matters most in deployment and the one surface metrics are blindest to; a summary can score well on ROUGE while inventing a number. (2) RELEVANCE - did it capture the important content rather than arbitrary content? (3) COHERENCE AND FLUENCY - is it well-formed and readable? Modern models are near-ceiling here, so it is mostly a regression check now. (4) CONCISENESS - length relative to information conveyed. A system can improve on one and regress on another, so an aggregate score hides exactly what you need to see. THE AUTOMATIC LAYER, for fast iteration. ROUGE-1/2/L against references, reported WITH output length, because ROUGE is recall-oriented and rewards verbosity mechanically - a system that got 'better' by writing longer summaries is the classic false positive here. BERTScore, which handles paraphrase and correlates better. And an ENTAILMENT-BASED CONSISTENCY score, which I would treat as the primary automatic metric: decompose the summary into sentences or atomic claims, score each against each SOURCE sentence, take the max, and aggregate. This is SummaC's design and the sentence-level granularity matters - document-level NLI degrades badly on long premises. I would use these for CI and for detecting regressions, not for claiming improvement. THE JUDGE LAYER. An LLM judge scoring each dimension separately on a defined rubric, or making pairwise comparisons against a baseline system. Controls that are not optional: randomize or double-run the presentation order, check whether the preferred output is simply longer, and use a judge from a different model family than the system being evaluated. I would validate the judge against human ratings on a sample before trusting it, and report that agreement. THE HUMAN LAYER, which is the ground truth everything else is calibrated against. A few hundred summaries, rated by multiple annotators on each dimension with written guidelines and examples. I would MEASURE inter-annotator agreement first and report it, because it is the ceiling; if annotators agree at 0.5 on relevance, that dimension is not well-defined and the guidelines need work before any model comparison is meaningful. For factual consistency specifically, the better protocol is not a rating but a task: ask annotators to HIGHLIGHT unsupported spans, which is more reliable than a 1-5 score and produces error analysis for free. THE THINGS I WOULD BUILD IN DELIBERATELY. (a) A challenge set of documents where the easy strategy fails - the LEAD-3 baseline (just take the first three sentences) is famously hard to beat on news ROUGE, so if my system cannot beat lead-3, that is the finding. Reporting lead-3 alongside is non-negotiable in news summarization. (b) Documents with numbers, negation, and attributed statements, since these are where consistency failures concentrate. (c) Out-of-domain documents. (d) Long documents that exceed the context window, to see what truncation does. WHAT I WOULD REPORT: a table with one row per system and one column per dimension, automatic and human, with confidence intervals and the human-human ceiling, plus the lead-3 and reference-quality baselines. AND THE CAVEAT I would state explicitly: reference summaries are one valid summary among many, written by one person with one notion of importance. CNN/DailyMail references are famously extractive and noisy, which is why lead-3 competes with trained systems. Any reference-based metric is measuring agreement with that person's choices, and a system that summarizes differently but well is penalized. That is the fundamental limitation, and it is why the reference-free consistency check carries the most weight in my design.",
          "deepDive": {
            "q": "Why do surface-overlap metrics correlate poorly with human judgment, and what actually fixes it?",
            "a": "THE CORE MISMATCH. BLEU and ROUGE measure lexical overlap with a reference. Human quality judgment measures whether the output conveys the right meaning, well. These come apart in both directions and the failures are SYSTEMATIC rather than random, which is what makes them dangerous. FALSE NEGATIVES - good output, low score. (1) PARAPHRASE: 'the cat sat on the mat' and 'a feline was resting on the rug' share almost no n-grams and mean the same thing. (2) LEGITIMATE STYLISTIC VARIATION: a system with a different but valid register scores low against a reference in another register. (3) A SINGLE REFERENCE cannot cover the space of valid outputs, and almost every evaluation uses one - BLEU's original validation used four. (4) WORD ORDER flexibility in many languages means n-gram matching penalizes a correct alternative ordering. FALSE POSITIVES - bad output, high score. (1) FLUENT NONSENSE that reuses reference vocabulary. (2) A single word changed - a negation dropped, a number altered, an entity swapped - barely moves a 4-gram overlap score while completely inverting the meaning. This is the most serious one, because those are exactly the errors that matter most. (3) EXTRACTIVE COPYING scores well on ROUGE without any summarization occurring, which is why lead-3 is competitive on news. WHAT MAKES IT WORSE IN PRACTICE. The correlation is much weaker among systems of SIMILAR quality, which is precisely the comparison you usually want - metrics can distinguish terrible from good and struggle to distinguish good from slightly better. It degrades as systems improve, because good systems increasingly produce valid outputs unlike the reference. And it is not robust to OPTIMIZATION: as soon as you tune against the metric, you move into the region where it and quality diverge, which is Goodhart's law with a specific mechanism. WHAT ACTUALLY FIXES IT, in increasing order of effectiveness. (1) MORE REFERENCES help substantially and are rarely available. (2) EMBEDDING-BASED metrics (BERTScore, MoverScore) fix paraphrase by comparing in a semantic space rather than a lexical one. Real improvement, and still reference-based, so single-reference coverage remains a limitation. (3) LEARNED METRICS - COMET, BLEURT - are trained directly to predict human judgments from (source, candidate, reference) triples. Since the objective IS correlation with humans, they correlate best, and in WMT evaluations they now clearly outperform BLEU. Their costs are that they need human-judgment training data, they inherit the biases of that data, they are model-dependent and versioned, and they are themselves gameable if you optimize against them. (4) REFERENCE-FREE metrics evaluate the candidate against the SOURCE - entailment for consistency, QA-based methods that generate questions from the output and answer them from the source. These escape the single-reference problem entirely, which is conceptually the most important step, and they measure a specific property (groundedness) rather than overall quality. (5) LLM JUDGES, which are the most flexible and correlate well, with the biases discussed elsewhere. THE DEEPER POINT I would make, because it is the transferable one: the problem is not that BLEU is a bad metric. It is that AUTOMATIC EVALUATION OF OPEN-ENDED GENERATION IS FUNDAMENTALLY HARD, because the target is a SET of acceptable outputs that cannot be enumerated. Every method above is a different approximation of set membership - overlap with a sample from the set, semantic proximity to a sample, a learned model of the set, or a check of specific properties any member must have. That last framing is the most promising: rather than asking 'how close is this to a good output', decompose into checkable properties - is it grounded, does it cover the key content, is it the right length, does it follow the format - and verify each. It is less elegant and far more useful, because each property comes with an actionable failure mode."
          }
        },
        {
          "q": "How would you use an LLM as a judge, and what would you control for?",
          "a": "WHAT IT IS. Prompt a strong model to evaluate outputs - either scoring on a rubric, or comparing two outputs pairwise. It has become standard because it is flexible (any criterion you can describe), needs no references, gives explanations, correlates reasonably with humans (roughly 80% agreement with human preferences on chat evaluation, which is close to human-human agreement), and costs cents rather than dollars per item. THE BIASES, which are measured and specific. (1) POSITION BIAS: judges prefer the option presented FIRST, and the effect is large enough to flip conclusions. Control by evaluating each pair in BOTH orders; count a win only if it is consistent, and treat the inconsistent fraction as a measure of judge reliability on that comparison. (2) VERBOSITY BIAS: longer answers are preferred, roughly independent of whether the extra content helps. Control by reporting the length distribution of the outputs alongside the win rate, testing whether your winner is simply longer, and where possible length-controlling the comparison. This one is insidious because it produces genuine-looking improvements from a change that only made the model more verbose. (3) SELF-PREFERENCE: models prefer text from their own family. Control by using a judge from a different family than the system under test, and never use the model to judge itself in a competitive comparison. (4) STYLE OVER SUBSTANCE: confident, well-formatted, authoritative-sounding answers are preferred, including when they are wrong. This is the hardest to control, and it is why an LLM judge should not be the primary check on factual accuracy. (5) LIMITED DISCRIMINATION on absolute scales - 1-10 ratings cluster in a narrow band and are poorly separated, which is why PAIRWISE comparison is generally the better protocol. THE PROTOCOL I WOULD USE. Pairwise rather than absolute scoring. Both orders, consistency required. A specific rubric per criterion rather than 'which is better' - 'which answer is better GROUNDED IN THE PROVIDED CONTEXT' produces far more reliable judgments than an undefined preference. Chain-of-thought before the verdict, which measurably improves agreement. A three-way outcome including TIE, since forcing a choice on genuinely equivalent outputs manufactures noise. Few-shot examples of correctly-judged cases when the criterion is subtle. And a reference answer supplied to the judge when one exists, which helps considerably. THE VALIDATION STEP THAT IS NOT OPTIONAL. Before trusting a judge, measure its agreement with HUMAN judgments on a sample of a few hundred items from your own data, and report that agreement alongside every result the judge produces. Also measure the human-human agreement on the same sample, because that is the ceiling. If humans agree at 0.7 and the judge agrees with humans at 0.68, the judge is close to as good as the measurement allows and further prompt engineering is chasing noise. Skipping this step is how teams end up optimizing against a judge that disagrees with their users. WHERE I WOULD NOT USE IT. As the sole check on FACTUAL correctness in a specialist domain - the judge does not know your domain any better than the system does, and correlated errors between generator and judge are invisible. For anything with a checkable ground truth, where an exact or programmatic check is strictly better. And as the optimization TARGET, which is the most important limit: if you tune a system against a judge, you will find the judge's biases, and the well-documented result is systems that get more verbose and more confident rather than more correct. Use it to MEASURE, and keep a periodic human evaluation as the anchor that catches drift between what the judge rewards and what people want."
        },
        {
          "q": "What is perplexity, what does it tell you, and what does it not?",
          "a": "THE DEFINITION. Perplexity is the exponentiated average negative log-likelihood per token: exp(-(1/N) sum log p(x_i | x_<i)). It measures how surprised the model is by the text. The intuition worth carrying is that it is the effective BRANCHING FACTOR - a perplexity of 20 means the model is, on average, as uncertain as if it were choosing uniformly among 20 options at each token. Lower is better, and the theoretical floor is 1. WHAT IT IS GOOD FOR. (1) It is the direct exponential of the training loss, so it is the right thing to watch during pretraining - it is what you are optimizing. (2) COMPARING CHECKPOINTS of the same model on the same data, which is unambiguous and useful. (3) SCALING LAWS are expressed in loss/perplexity, and their predictive power over orders of magnitude is one of the more remarkable empirical results in the field. (4) Detecting DOMAIN MISMATCH - high perplexity on your domain's text tells you the model is out of its distribution, and this is a genuinely useful diagnostic before you commit to a base model. (5) Data quality screening: unusually high perplexity flags corrupted or unusual documents, which is a standard filter in corpus construction. WHAT IT IS NOT GOOD FOR, and these are the traps. (1) COMPARING MODELS WITH DIFFERENT TOKENIZERS. Perplexity is per TOKEN, and different tokenizers produce different numbers of tokens for the same text. A model with a larger vocabulary uses fewer, longer tokens, and each is harder to predict, so its per-token perplexity is higher for the same actual modelling quality. To compare across vocabularies you must normalize per CHARACTER or per WORD - bits-per-character is the standard fix and it is not optional. (2) MEASURING DOWNSTREAM CAPABILITY. Perplexity correlates with capability across large gaps but poorly at close range: two models within a few percent on perplexity can differ substantially on reasoning benchmarks, and instruction tuning typically makes a model far more useful while making its perplexity on raw text WORSE. Nothing about perplexity measures instruction-following, factuality, or safety. (3) EVALUATING GENERATION QUALITY. Perplexity is about assigning probability to given text, not about what the model produces. A model can have excellent perplexity and generate repetitive or degenerate text under greedy decoding - the objective never asked about the sampling distribution's behaviour. (4) COMPARING ACROSS DATASETS. Perplexity on Wikipedia and on Reddit are not comparable; the text has different intrinsic entropy. Only same-data comparisons mean anything. (5) MODELS THAT ARE NOT AUTOREGRESSIVE - masked models do not define a proper joint likelihood, so 'BERT's perplexity' is a pseudo-perplexity and not comparable to a decoder's. THE CONTAMINATION ISSUE, which deserves separate mention: if evaluation text appeared in pretraining, perplexity on it is meaninglessly low. This is pervasive with web-scraped corpora and standard benchmarks, and it is why perplexity on a curated, verifiably-held-out set is worth far more than perplexity on a public dataset. WHAT I WOULD ACTUALLY REPORT. Perplexity during pretraining as the primary training signal. Bits-per-character when comparing across tokenizers. Perplexity on in-domain held-out text when choosing a base model to adapt. And for anything about capability, TASK-SPECIFIC evaluations - because the relationship between perplexity and usefulness is real in the large and unreliable in the small, which is exactly the regime most model comparisons live in."
        },
        {
          "q": "How do you run a human evaluation that is actually reliable?",
          "a": "HUMAN EVALUATION IS THE GROUND TRUTH AND IT IS ROUTINELY DONE BADLY - often more noisily than the automatic metrics it is supposed to validate. The failures are procedural and every one is preventable. STEP 1 - DEFINE THE QUESTION PRECISELY. 'Rate the quality 1-5' produces noise because raters weight different things. Break it into specific, independently-judgeable dimensions: is every claim supported by the source; does it answer the question asked; is it fluent; is it appropriately concise. Each needs a written definition and worked examples of each score point, including the boundary cases. The guidelines are the experiment; time spent there buys more than any statistical treatment afterwards. STEP 2 - PREFER TASKS OVER RATINGS. People are much more reliable at concrete judgements than at abstract scores. 'Highlight every span not supported by the source' beats 'rate factuality 1-5'. 'Which of these two is better' beats 'score each 1-10' - pairwise comparison has far better inter-annotator agreement than absolute scales, and Likert responses cluster in the middle regardless. If you need a ranking of many systems, use pairwise comparisons and fit a Bradley-Terry or Elo model. STEP 3 - MEASURE AGREEMENT, AND REPORT IT. Multiple annotators per item, and compute Krippendorff's alpha or Cohen's kappa. This number is the CEILING on any metric's correlation and the ceiling on your ability to detect differences. If agreement is low, the problem is almost always the guidelines or the task definition, not the annotators - fix it and re-run rather than averaging harder. Publishing model comparisons without reporting annotator agreement is the single most common defect in human evaluation. STEP 4 - CONTROL THE OBVIOUS CONFOUNDS. Randomize the order in which systems are presented, and randomize which system is 'A'. Blind annotators to which system produced what. Interleave items from all systems rather than evaluating one system's outputs in a block, since raters drift and calibrate to what they have recently seen. Include ATTENTION CHECKS - items with a known answer - and screen out raters who fail them. Watch for fatigue: quality degrades measurably after about an hour, so cap session length. STEP 5 - GET THE RIGHT ANNOTATORS. For specialist domains, crowdworkers cannot judge factual correctness of clinical or legal text and will judge FLUENCY instead while believing they are judging accuracy. This is a serious and common failure - the evaluation then measures style and is reported as measuring correctness. Pay properly, because rushed annotation is bad annotation, and provide a channel for annotators to flag broken or ambiguous items. STEP 6 - SIZE THE STUDY. Compute how many items you need to detect the difference you care about, given the observed variance. Small human evaluations - twenty items, two raters - cannot distinguish systems that differ by a few percent, yet they are used to claim exactly that. Report CONFIDENCE INTERVALS on every human number, and if the intervals overlap, say the result is inconclusive rather than picking the higher mean. STEP 7 - ANALYZE PROPERLY. Aggregate per item before per system. Use statistical tests appropriate to paired designs. Report the DISTRIBUTION, not just the mean - a system that is usually excellent and occasionally terrible is different from one that is uniformly mediocre, and the mean conflates them. Look at the disagreement cases specifically; they are usually where the interesting behaviour is. THE PRACTICAL COMPROMISE for a real project, since full human evaluation is too slow for the development loop: run a careful human evaluation ONCE to validate an automatic metric or an LLM judge on your data, use the validated proxy for iteration, and re-anchor with a smaller human evaluation periodically to catch drift. The mistake is either extreme - trusting a proxy you never validated, or trying to run human evaluation on every change and therefore running it badly."
        },
        {
          "q": "How do you evaluate a system when there is no reference output at all?",
          "a": "THIS IS THE COMMON CASE IN PRODUCTION and most of the literature assumes otherwise. Chat assistants, agents, open-ended generation, and creative tasks have no gold answer, so reference-based metrics do not apply at all. The approach is to stop asking 'how close is this to the right answer' and start CHECKING PROPERTIES the output must have. WHAT YOU CAN CHECK WITHOUT A REFERENCE. (1) GROUNDEDNESS, which is the most valuable and the most tractable: is every claim supported by the provided source? Entailment models or an LLM judge with the source in hand answer this, and it needs no reference because the source IS the standard. (2) INSTRUCTION FOLLOWING: did it obey the constraints in the prompt - length, format, language, requested structure, exclusions? Many of these are programmatically checkable, which makes them the cheapest reliable signal you have. (3) FORMAT AND SCHEMA VALIDITY: is the JSON parseable, are the required fields present, do enumerated values come from the allowed set? Free and binary. (4) SELF-CONSISTENCY: sample several outputs at temperature and measure agreement. Disagreement correlates with error and needs no ground truth at all - it is one of the better uncertainty signals available. (5) SAFETY AND POLICY compliance via classifiers. (6) TASK-SPECIFIC EXECUTABLE CHECKS, which are the strongest signal when available: does the generated code compile and pass tests, does the SQL run and return plausible rows, does the extracted date parse. Wherever the output can be EXECUTED or VALIDATED, do that instead of judging it. COMPARATIVE EVALUATION, which sidesteps the reference problem. You usually do not need to know whether an output is good in the abstract - you need to know whether the new system is better than the old one. Pairwise preference between systems, judged by humans or an LLM, answers that directly. Arena-style Elo aggregates it across many comparisons. This is why chat evaluation converged on preference-based methods. ONLINE AND BEHAVIOURAL SIGNALS, which are the closest thing to ground truth in a deployed product. Did the user accept the suggestion, copy the answer, click the citation, rephrase the question, or abandon the session? Did the support ticket get resolved? These measure what you actually care about rather than a proxy for it. They are noisy, laggy, and confounded, and they require enough traffic for an A/B test - but they are the only signals that measure the real objective, and a system that improves on every offline metric while degrading acceptance rate is telling you the offline metrics are wrong. BUILDING A REFERENCE-FREE SUITE, which is what I would actually deliver. A layered set: programmatic checks (format, constraints, safety) run on every output because they are free; groundedness and self-consistency run on a sample continuously; LLM-judge pairwise comparison against the current production system on a fixed evaluation set for every candidate change; human evaluation periodically to anchor the judge; and online metrics as the final arbiter. Plus a REGRESSION SET of specific cases that previously failed - a growing collection of concrete failures with expected behaviour, which over time becomes the most valuable evaluation asset you have because every entry represents a real problem someone found. THE MINDSET SHIFT worth stating: with no reference, evaluation stops being a score and becomes a SPECIFICATION. You are enumerating what must be true of a good output and checking each. That is more work, and it is also more useful - each check that fails tells you exactly what is wrong, which a similarity score never does."
        },
        {
          "q": "How would you detect and handle benchmark contamination?",
          "a": "THE PROBLEM. Models are pretrained on web-scale corpora that include the benchmarks used to evaluate them - test sets, their solutions, discussion of them, and derivative copies. A contaminated benchmark measures memorization rather than capability, and every reported number on it is an overestimate of unknown size. As models train on more of the web, this gets worse rather than better. HOW TO DETECT IT, in order of directness. (1) N-GRAM OVERLAP against the pretraining corpus - search for long exact matches between test items and training data. This is what OpenAI and others do internally and it is the most direct method. Its limits are real: it requires access to the training data, which for most models you do not have, and it misses paraphrased or reformatted copies. (2) MEMBERSHIP-INFERENCE STYLE PROBES that need no corpus access. Compare the model's likelihood on the benchmark item against its likelihood on a perturbed version - a contaminated model assigns unusually high probability to the EXACT wording. The 'guided prompting' variant is cleaner: give the model the dataset name and the start of an instance and see whether it completes the rest verbatim; reproducing a test item exactly is strong evidence. (3) ORDERING SENSITIVITY: for multiple-choice benchmarks, a contaminated model's accuracy drops when the options are shuffled, because it memorized the answer position or the exact option text. Cheap and revealing. (4) TEMPORAL SPLITS: evaluate on data created AFTER the model's training cutoff. If performance drops sharply relative to older items of the same type and difficulty, that gap is a contamination estimate. This is the most convincing single test and it is why benchmarks with continuously-added fresh items are valuable. (5) PERFORMANCE ANOMALIES as a smell test: suspiciously strong performance on one benchmark relative to closely-related ones, or performance that does not degrade on harder subsets the way it should. HOW TO HANDLE IT. (1) PRIVATE HELD-OUT SETS that never touch the public internet. The most effective fix, and it requires discipline - one publication of your test set destroys it permanently. (2) DYNAMIC AND LIVE BENCHMARKS that add fresh items continuously, so any given model has a genuinely unseen slice. (3) PERTURBED VARIANTS: regenerate benchmark items with the same structure and different surface - new numbers, renamed entities, reworded questions. A large drop between original and perturbed is direct evidence of memorization, and this technique needs no corpus access, which makes it available to anyone evaluating a third-party model. (4) EVALUATE ON YOUR OWN DATA, which is the practical answer for most teams. Your production distribution is not in anyone's pretraining corpus, and it is the distribution you care about. (5) REPORT CONTAMINATION CHECKS as part of any evaluation, the way you report a train/test split. WHAT I WOULD TELL A TEAM CHOOSING A MODEL. Public benchmark numbers are a WEAK signal for ranking models, and the weakness is systematic rather than random - it favours whichever model absorbed more of the benchmark, which correlates with training-data scale rather than capability. Build a small internal evaluation set from your own data, keep it private, and rank candidate models on that. It takes a week and it is worth more than every leaderboard. THE DEEPER ISSUE worth naming: contamination is a specific instance of the general problem that a benchmark stops measuring a capability once it becomes an optimization target - directly through contamination, and indirectly through the field selecting architectures, data, and hyperparameters that happen to do well on it. Held-out data is only held out until someone looks at it, and the field has looked at every major benchmark many times. That argues for treating evaluation sets as consumable resources with a finite life, and for building fresh ones continuously rather than defending old ones."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "BLEU",
        "back": "Clipped n-gram PRECISION, geometric mean over n=1..4, times a brevity penalty. Corpus-level only - the geometric mean zeroes out whenever any n-gram order has no match, which is common in one short sentence."
      },
      {
        "type": "pitfall",
        "front": "Unqualified BLEU is not comparable",
        "back": "Tokenization, casing, and normalization move it by several points, so 1-2 BLEU differences between papers were often preprocessing differences. Use sacreBLEU and report its SIGNATURE, not just the number."
      },
      {
        "type": "pitfall",
        "front": "ROUGE rewards length",
        "back": "It is recall-oriented, so longer outputs cover more reference n-grams mechanically. Comparing systems with different output lengths ranks verbosity. Constrain length or use an F-measure variant."
      },
      {
        "type": "definition",
        "front": "BERTScore",
        "back": "Greedy match candidate to reference tokens by cosine similarity of CONTEXTUAL embeddings. Handles paraphrase, which n-gram overlap cannot. Score depends on the embedding checkpoint - report which one."
      },
      {
        "type": "definition",
        "front": "Learned metrics (COMET, BLEURT)",
        "back": "Neural models trained directly to predict human quality judgments from (source, candidate, reference). Since the objective IS human correlation, they correlate best - now the recommended default for MT."
      },
      {
        "type": "pitfall",
        "front": "LLM-judge biases",
        "back": "POSITION (prefers the first option), VERBOSITY (prefers longer), SELF-PREFERENCE (prefers its own family), and style-over-substance. Fix: both orders with consistency required, report length distributions, use a different model family, pairwise not 1-10."
      },
      {
        "type": "intuition",
        "front": "Always report the human-human ceiling",
        "back": "A metric correlating 0.58 with humans is uninterpretable alone. If annotators agree at 0.62, that metric is near the limit of the measurement; if they agree at 0.90, there is real headroom."
      },
      {
        "type": "pitfall",
        "front": "Perplexity across tokenizers",
        "back": "It is per-TOKEN, and different vocabularies segment text differently - larger vocabularies give fewer, harder tokens and higher perplexity at equal quality. Normalize to bits-per-character to compare."
      },
      {
        "type": "intuition",
        "front": "What perplexity does not measure",
        "back": "Downstream capability at close range (instruction tuning IMPROVES usefulness while WORSENING raw-text perplexity), generation quality under sampling, or anything cross-dataset. It measures surprise at given text."
      },
      {
        "type": "pitfall",
        "front": "The lead-3 baseline",
        "back": "Just taking a news article's first three sentences is famously competitive on ROUGE, because references are extractive and lead-biased. Report it alongside your system or the comparison is not interpretable."
      },
      {
        "type": "intuition",
        "front": "Reference-free evaluation",
        "back": "With no gold answer, stop scoring similarity and start CHECKING PROPERTIES: groundedness (entailment vs source), instruction compliance, schema validity, self-consistency across samples, and executable checks. Each failure is actionable; a similarity score never is."
      },
      {
        "type": "intuition",
        "front": "Benchmark contamination",
        "back": "Detect with n-gram overlap (needs corpus access), verbatim-completion probes, option-shuffling sensitivity, or post-cutoff data. Handle with private held-out sets, perturbed variants, and above all your OWN data - which is in nobody's pretraining corpus."
      }
    ],
    "refs": [
      {
        "title": "Papineni et al. (2002), BLEU: a Method for Automatic Evaluation of Machine Translation",
        "url": "https://aclanthology.org/P02-1040/"
      },
      {
        "title": "Post (2018), A Call for Clarity in Reporting BLEU Scores (sacreBLEU)",
        "url": "https://arxiv.org/abs/1804.08771"
      },
      {
        "title": "Zhang et al. (2020), BERTScore: Evaluating Text Generation with BERT",
        "url": "https://arxiv.org/abs/1904.09675"
      },
      {
        "title": "Rei et al. (2020), COMET: A Neural Framework for MT Evaluation",
        "url": "https://arxiv.org/abs/2009.09025"
      },
      {
        "title": "Zheng et al. (2023), Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena",
        "url": "https://arxiv.org/abs/2306.05685"
      }
    ],
    "demos": [
      "classification-metrics",
      "calibration",
      "embeddings",
      "edit-distance"
    ],
    "demoTitles": {
      "classification-metrics": "Classification Metrics",
      "calibration": "Model Calibration",
      "embeddings": "Embedding Atlas",
      "edit-distance": "Edit Distance"
    }
  }
};
