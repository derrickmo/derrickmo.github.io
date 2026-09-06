// GENERATED from content/lessons/rag-agents/rag-eval.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/rag-agents/rag-eval/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "rag-eval": {
    "level": "core",
    "body": {
      "intuition": [
        "A RAG system produces one visible number - did it answer correctly - and that number is the least useful measurement in the system. It is a product of several stages, so a bad score is consistent with a chunking problem, a retrieval problem, a context-ordering problem, or a generation problem, and it cannot distinguish them. Teams read the aggregate, form a hypothesis about which stage is at fault, and spend weeks on the wrong one. The single most valuable thing this lesson has to offer is the habit of never reporting that number alone.",
        "The decomposition is not subtle. Retrieval either put the evidence in the context or it did not - that is recall@k, and it is a hard ceiling on everything after it. Given the evidence was present, the generator either used it or it did not - that is faithfulness, and it is a separate measurement on a separate population. Splitting one number into two immediately tells you which half of the system to work on, and the split costs almost nothing once the labelled set exists.",
        "The second idea is that FAITHFUL and CORRECT are different properties and you need both, because the interesting failures live where they disagree. An answer can be faithful to a retrieved passage that happens to be wrong - the system behaved correctly and retrieval failed. An answer can be correct while unsupported by anything retrieved, which means the model used its parametric knowledge and got lucky; that system will be confidently wrong the moment your corpus contains something the model disagrees with, and no aggregate accuracy score shows it coming. Measuring only correctness makes the second case invisible, and the second case is the one that fails in production."
      ],
      "math": [
        {
          "h": "The factorization that separates the stages",
          "paras": [
            "Answering correctly requires the evidence to be retrieved and then used. Each factor is a different team's problem.",
            "Reporting only the product tells you the system is at 0.55 without telling you which term caused it."
          ],
          "tex": "\\underbrace{\\Pr[\\text{correct}]}_{\\text{end-to-end}} = \\underbrace{\\Pr[\\text{evidence} \\in \\text{context}]}_{\\text{recall@}k\\;\\text{(retrieval)}} \\times \\underbrace{\\Pr[\\text{correct} \\mid \\text{evidence present}]}_{\\text{grounded generation}}",
          "texNote": "So 0.55 end-to-end could be 0.95 x 0.58 - a generation problem - or 0.60 x 0.92 - a retrieval problem - and the two demand completely different work. Measure both factors and the diagnosis is immediate. The second factor must be computed on the SUBSET where evidence was retrieved, which is the detail people get wrong: averaging over failures of the first stage contaminates the second measurement."
        },
        {
          "h": "The 2x2 that faithfulness and correctness generate",
          "paras": [
            "Scoring both properties on the same answers produces four cells, and each one implies a different action.",
            "The dangerous cell is the one a correctness-only evaluation cannot see."
          ],
          "tex": "\\begin{array}{l|cc} & \\text{faithful} & \\text{unfaithful} \\\\ \\hline \\text{correct} & \\text{healthy} & \\textbf{lucky (parametric)} \\\\ \\text{incorrect} & \\text{retrieval failed} & \\text{hallucination} \\end{array}",
          "texNote": "CORRECT-BUT-UNFAITHFUL is the cell that matters, because it scores as a success and is a latent failure: the model answered from parametric knowledge rather than from your documents, so it will be confidently wrong as soon as your corpus says something the model was not trained to believe - a new policy, a changed price, an internal exception. INCORRECT-BUT-FAITHFUL is the reassuring one: the pipeline behaved correctly and retrieval is the thing to fix."
        },
        {
          "h": "Faithfulness as a claim-level ratio",
          "paras": [
            "Rather than judging a whole answer, decompose it into atomic claims and ask which are supported by the retrieved context.",
            "This makes the metric interpretable and localizes the unsupported part."
          ],
          "tex": "\\text{faithfulness} = \\frac{|\\{c \\in \\text{claims}(a) : \\text{supported}(c, C)\\}|}{|\\text{claims}(a)|}",
          "texNote": "Decomposing first is what makes this usable: a whole-answer verdict is a coin flip on a long answer, while claim-level scoring both correlates better with human judgement and tells you WHICH sentence was invented. The same decomposition drives citation checking - if every claim must cite a retrieved chunk, an unsupported claim is detectable automatically at generation time, which converts an evaluation metric into a runtime guardrail."
        }
      ],
      "code": [
        {
          "h": "The panel, not the number",
          "paras": [
            "Six measurements, each answering a question the others cannot, and the whole point is reporting them together."
          ],
          "code": "report = {\n  # --- RETRIEVAL (the ceiling) ---\n  \"recall@k\":        ...,  # is the evidence in the context AT ALL?\n  \"mrr / ndcg@k\":    ...,  # is it near the TOP? (matters: mid-context loss)\n  \"context_precision\":..., # what fraction of retrieved chunks are relevant?\n                           # low = wasted context budget + more distraction\n\n  # --- GENERATION, scored ONLY where evidence was retrieved ---\n  \"faithfulness\":    ...,  # claim-level: supported by the context?\n  \"answer_relevance\":...,  # does it address the QUESTION asked?\n\n  # --- END-TO-END ---\n  \"correctness\":     ...,  # bounded above by recall@k, always\n  \"abstention_rate\": ...,  # on UNANSWERABLE queries - see below\n}\n\n# ★ THE DIAGNOSTIC, which is the entire reason to keep them separate:\n#   recall LOW,  faithfulness HIGH -> fix RETRIEVAL (chunking first)\n#   recall HIGH, faithfulness LOW  -> fix GENERATION (prompt, context\n#                                     order, model, or too many chunks)\n#   both HIGH,   correctness LOW   -> the QUESTIONS need reasoning the\n#                                     evidence alone doesn't supply\n#   correctness HIGH, faithfulness LOW -> ★ THE DANGEROUS ONE: answering\n#                                     from PARAMETRIC memory. Looks fine\n#                                     today; fails the moment your corpus\n#                                     disagrees with the model's training.\n\n# AND THE STATISTICS, skipped as reliably here as anywhere else:\n#   SE = sqrt(p(1-p)/n)  -> +-3.5 pts at n=200. A 3-point \"improvement\"\n#   on 200 questions is noise. Use a PAIRED test on per-question outcomes;\n#   question difficulty dominates the variance and pairing removes it.",
          "caption": "The four diagnostic rows are the payoff: each combination of retrieval and generation scores points at a different half of the system, which a single correctness number never could."
        },
        {
          "h": "Building the eval set - including the part everyone omits",
          "paras": [
            "The set determines what you can learn, and one omission accounts for most production surprises."
          ],
          "code": "# TIER 1 - REAL QUERIES. Sample production traffic (or pilot/dogfood\n#   traffic pre-launch), label the answering passage and the answer.\n#   A few hundred is enough. This is the only set whose DISTRIBUTION is\n#   guaranteed right, and building it is the highest-value hour available.\n\n# TIER 2 - SYNTHETIC, generated from your own corpus. Cheap, scales, and\n#   useful for coverage across document types. THE HONEST CAVEAT:\n#   generated questions are answerable from ONE chunk BY CONSTRUCTION,\n#   so they systematically overstate performance and under-represent\n#   multi-hop, ambiguous, and absent-answer queries. Use it to supplement\n#   tier 1, never to replace it.\n\n# ★ TIER 3 - UNANSWERABLE QUESTIONS. The most-skipped item in RAG\n#   evaluation, and the source of the worst production failures.\nunanswerable = [\n  \"What is our policy on X?\",        # plausible, simply not in the corpus\n  \"What were Q3 numbers?\",           # was removed / not yet ingested\n  \"Who approved the 2019 exception?\" # entity exists, fact does not\n]\n#   Retrieval ALWAYS returns k chunks - similarity search has no concept\n#   of \"nothing matched\" - so the generator is handed k irrelevant\n#   passages and asked a confident-sounding question. Without this tier\n#   you never measure whether the system says \"I don't know\", which is\n#   the single most valuable behavior it has.\n#   MEASURE: abstention rate on tier 3, AND false-abstention on tier 1\n#   (refusing when the answer WAS there). It's a threshold trade-off.\n\n# TIER 4 - ADVERSARIAL / EDGE: multi-hop, contradictory sources,\n#   outdated-vs-current versions of the same fact, very long documents,\n#   and questions whose right answer is a clarifying question.",
          "caption": "Tier 3 is the one that changes production outcomes: retrieval always returns k chunks, so without unanswerable questions you never measure whether the system can decline."
        }
      ],
      "useCases": [
        "Deciding where to spend engineering effort on a RAG system, which the per-stage decomposition answers in an afternoon and an aggregate score never answers at all.",
        "Regression-testing changes to chunking, retrieval, prompts or models, where a fixed labelled set turns 'it feels better' into a paired comparison with a confidence interval.",
        "Detecting parametric-knowledge dependence before it fails, by scoring faithfulness alongside correctness and looking specifically at the correct-but-unfaithful cell.",
        "Setting and monitoring an abstention threshold, which requires unanswerable questions in the eval set and is one of the highest-value behaviours a RAG system can have."
      ],
      "pitfalls": [
        "Reporting only end-to-end correctness. It is a product of stages, so it cannot say which stage is binding - and the intuitive guess favours the visible, expensive generator over the upstream constraint.",
        "Computing generation quality over all questions instead of over the subset where evidence was actually retrieved. Retrieval failures then contaminate the generation measurement and both numbers become uninterpretable.",
        "Measuring correctness without faithfulness. The correct-but-unfaithful case scores as success while indicating the model answered from memory - a latent failure that triggers the moment your corpus disagrees with the model's training.",
        "Omitting unanswerable questions. Retrieval always returns k chunks, so the generator is always handed something; without this tier you never learn whether the system can say 'I don't know'.",
        "Relying on synthetically generated questions alone. They are answerable from a single chunk by construction, so they overstate performance and under-represent exactly the multi-hop and absent-answer cases that fail in production.",
        "Using an unvalidated LLM judge for faithfulness. Report its agreement with human labels on a subset, present both orders where it compares, and remember the human-human ceiling of roughly 70-75%.",
        "Comparing two configurations without uncertainty. A three-point difference on two hundred questions is inside the noise, and per-question paired tests are far more powerful than comparing two means."
      ],
      "connections": [
        {
          "ref": "rag-agents/chunking-retrieval",
          "text": "The stage this evaluation most often indicts. Chunking sets the recall ceiling, and a per-stage decomposition is what reveals that the boring ingestion parameter is the binding constraint."
        },
        {
          "ref": "rag-agents/advanced-rag",
          "text": "Every technique there is a purchase, and this is the measurement that says whether it earned its latency - including the recall@K check that explains a disappointing reranker."
        },
        {
          "ref": "llm-systems/llm-eval",
          "text": "The general treatment of LLM evaluation instruments and their blind spots - judge biases, contamination, and choosing a metric that can actually move in response to the change being tested."
        },
        {
          "ref": "ml-theory/evaluation-metrics",
          "text": "The underlying discipline: what a metric can express, why thresholds are cost decisions, and why proper scoring rules matter when the output is a probability."
        },
        {
          "ref": "trustworthy-ai/conformal-prediction",
          "text": "A principled route to abstention - distribution-free coverage guarantees turn 'the top score looks low' into a calibrated decision to decline."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Why is end-to-end accuracy insufficient for RAG?",
          "a": "It is a product of stages, so a low score is consistent with chunking, retrieval, context-ordering or generation failures and cannot distinguish them."
        },
        {
          "q": "What is the basic decomposition?",
          "a": "P(correct) = recall@k times P(correct given evidence present) - a retrieval factor and a generation factor, measured separately."
        },
        {
          "q": "0.55 end-to-end. What do you need to know?",
          "a": "The split. 0.95 x 0.58 is a generation problem; 0.60 x 0.92 is a retrieval problem. Same aggregate, opposite work."
        },
        {
          "q": "On which population do you score generation quality?",
          "a": "Only on questions where the evidence was actually retrieved. Averaging over retrieval failures contaminates the measurement."
        },
        {
          "q": "What is faithfulness?",
          "a": "The fraction of the answer's atomic claims that are supported by the retrieved context - a claim-level ratio, not a whole-answer verdict."
        },
        {
          "q": "Why decompose an answer into claims first?",
          "a": "A whole-answer verdict is nearly a coin flip on long answers; claim-level scoring correlates better with humans and localizes which sentence was invented."
        },
        {
          "q": "Which cell of the faithful/correct 2x2 is dangerous?",
          "a": "Correct but unfaithful. It scores as success and means the model answered from parametric memory, so it fails when your corpus disagrees with its training."
        },
        {
          "q": "What does incorrect-but-faithful tell you?",
          "a": "The pipeline behaved correctly and retrieval is the thing to fix - a reassuring diagnosis rather than a worrying one."
        },
        {
          "q": "What is context precision, and why care?",
          "a": "The fraction of retrieved chunks that are relevant. Low precision wastes context budget and adds distracting text that degrades generation."
        },
        {
          "q": "What is the most-skipped tier of a RAG eval set?",
          "a": "Unanswerable questions. Retrieval always returns k chunks, so without them you never measure whether the system can say 'I don't know'."
        },
        {
          "q": "What is wrong with synthetic questions alone?",
          "a": "They are answerable from a single chunk by construction, so they overstate performance and under-represent multi-hop and absent-answer cases."
        },
        {
          "q": "What is the noise floor at 200 questions?",
          "a": "About plus or minus 3.5 points, so a three-point difference is noise. Use a paired per-question test, since question difficulty dominates the variance."
        }
      ],
      "standard": [
        {
          "q": "How would you evaluate a RAG system?",
          "a": "AS A PANEL OF PER-STAGE MEASUREMENTS RATHER THAN A NUMBER, because the end-to-end score is a product of stages and therefore structurally unable to say which one is binding. That is the whole design principle, and it takes an afternoon to implement once a labelled set exists. THE FACTORIZATION I WOULD START FROM. Answering correctly requires the evidence to be retrieved and then used, so P(correct) = recall@k times P(correct given evidence present). The first factor belongs to retrieval and is a hard ceiling; the second belongs to generation and must be computed only on the subset where retrieval succeeded - averaging over retrieval failures contaminates it, and that mistake makes both numbers uninterpretable. WHAT I WOULD REPORT. On the RETRIEVAL side: recall@k, which is the ceiling; MRR or NDCG, because position matters given that models use mid-context information less reliably; and context precision, the fraction of retrieved chunks that are relevant, since low precision wastes context budget and adds distracting text. On the GENERATION side, scored on the retrieval-succeeded subset: faithfulness, decomposed to CLAIM level rather than judged whole-answer, and answer relevance, which asks whether the response addresses the question at all. END-TO-END: correctness, and abstention rate on unanswerable questions. THE DIAGNOSTIC TABLE those produce is the payoff. Recall low with faithfulness high means fix retrieval, and usually chunking first. Recall high with faithfulness low means fix generation - the prompt, the context ordering, the model, or simply too many chunks crowding the relevant one. Both high with correctness low means the questions need reasoning the evidence alone does not supply. And correctness high with faithfulness LOW is the dangerous one: the model is answering from parametric memory, which looks fine today and fails the moment your corpus contains something it was not trained to believe. THE EVAL SET, which determines everything above. Tier one is real traffic with labelled answering passages - the only set whose distribution is guaranteed right. Tier two is synthetic questions generated from the corpus, useful for coverage but systematically optimistic, since they are answerable from one chunk by construction. Tier three is UNANSWERABLE questions, and it is the most-skipped and most important: retrieval always returns k chunks because similarity search has no concept of 'nothing matched', so the generator is always handed something plausible. Without this tier you never measure the system's ability to decline. Tier four is adversarial - multi-hop, contradictory sources, outdated-versus-current facts. THE STATISTICS, which are skipped as reliably here as anywhere: report confidence intervals, use paired per-question tests since question difficulty dominates the variance, and remember that a three-point difference on two hundred questions is noise.",
          "deepDive": {
            "q": "How would you measure faithfulness and hallucination specifically?",
            "a": "I WOULD DEFINE IT PRECISELY FIRST, because 'hallucination' covers several different failures with different fixes. The definition I would use: a claim in the answer that is not supported by the retrieved context. Note that this is deliberately relative to the CONTEXT rather than to the world - a claim can be true and still unfaithful, and that case is informative rather than harmless, because it means the system is not actually using its documents. THE MEASUREMENT PROCEDURE. Step one, decompose the answer into atomic claims - short, independently checkable statements. This matters more than the scoring method that follows: a whole-answer verdict on a five-sentence response is close to a coin flip and tells you nothing about where the problem is, while claim-level scoring both correlates better with human judgement and localizes the invented sentence. Step two, for each claim, ask whether the retrieved context entails it. This is a natural language inference problem, which is why an NLI model is a legitimate and cheap scorer here and why the technique connects to 10-06. An LLM judge also works and handles paraphrase better. Step three, faithfulness is the supported fraction. VALIDATING THE SCORER, which is the step that makes the number mean something. Whatever scores the claims - NLI model or LLM judge - is an instrument with unknown error until measured. I would hand-label a couple of hundred claims, report the scorer's agreement with those labels broken down by claim type, and remember that the ceiling is human-human agreement, around 70-75%. An unvalidated judge is an unknown instrument, and reporting its output as if it were ground truth is the most common way these evaluations mislead. THE DISTINCTIONS WORTH TRACKING SEPARATELY, since they need different fixes. Fabricated facts - invented entities, numbers, dates - which are the classic case and usually respond to prompt changes and citation requirements. Unsupported INFERENCE, where the model reasons beyond the evidence to a plausible conclusion; harder to detect and often more damaging, because it reads as analysis. Contradiction of the context, which is rarer and usually indicates conflict between retrieved passages and parametric belief. And ATTRIBUTION errors, where the claim is supported but cited to the wrong chunk - invisible to a faithfulness score and very visible to a user who clicks the citation. CONVERTING THE METRIC INTO A RUNTIME GUARDRAIL, which is where this becomes valuable rather than merely informative. If the generation is required to cite a chunk for every claim, unsupported claims become detectable automatically at inference time, not just in offline evaluation. You can then either strip them, regenerate, or surface the uncertainty to the user. That is the same claim-decomposition machinery doing double duty, and it is the single highest-leverage thing to build off this metric. WHAT I WOULD ALSO WATCH: faithfulness tends to fall as the number of retrieved chunks grows - more context means more opportunity to blend sources and to drift - so the context-size decision should be evaluated against faithfulness, not only against recall. That interaction is easy to miss when the two metrics are owned by different people."
          }
        },
        {
          "q": "How would you build the evaluation dataset?",
          "a": "IN TIERS, BECAUSE ONE SET CANNOT SERVE ALL THE QUESTIONS I NEED TO ASK, and because the cheapest tier is the most misleading if used alone. TIER 1 - REAL QUERIES, and this is the one that matters. Sample production traffic, or pilot and dogfood traffic before launch, and label each with the passage that answers it plus the correct answer. A few hundred is enough to start; stratification across query types matters more than raw size. This is the only set whose DISTRIBUTION is guaranteed to match what you serve, and building it is the highest-value hour in the project because every subsequent decision is a comparison on it. TIER 2 - SYNTHETIC QUESTIONS generated from your own corpus. Take a chunk, ask a model to write a question it answers, keep the pair. This is cheap, scales, and gives coverage across document types you may not see in early traffic. THE HONEST CAVEAT, which is the reason it cannot stand alone: these questions are answerable from a SINGLE CHUNK by construction, so they measure the easiest case. They systematically overstate performance and under-represent multi-hop questions, ambiguous questions, and questions with no answer. A system tuned on synthetic questions is tuned for the distribution the generator produced, not the one users produce. TIER 3 - UNANSWERABLE QUESTIONS, the most-skipped item and the one that changes production outcomes. The mechanism is worth stating: retrieval ALWAYS returns k chunks, because similarity search has no notion of 'nothing matched' - it returns the k nearest things regardless of how far away they are. So the generator is always handed k plausible-looking passages and a confident-sounding question. Without this tier you never measure whether the system says 'I don't know', which is its single most valuable behaviour. I would include questions that are plausible but absent, questions about data that was removed or not yet ingested, and questions about real entities with fabricated attributes. And I would measure BOTH directions: abstention rate on tier 3, and FALSE abstention on tier 1, since it is a threshold trade-off and moving one moves the other. TIER 4 - ADVERSARIAL AND EDGE CASES. Multi-hop questions. Contradictory sources. Outdated versus current versions of the same fact, which tests whether the system prefers the right one. Very long documents. Questions where the correct response is a clarifying question rather than an answer. Questions in the second-most-common language of your user base. HOW I WOULD MAINTAIN IT. Sample new real queries into tier 1 periodically, because the query distribution drifts and an eval set built once becomes a measure of last year's product. Add every production failure as a test case, which turns incidents into permanent regression coverage. And keep a held-out slice touched rarely, since a set you tune against repeatedly stops being an unbiased estimate - the same selection effect that inflates any repeatedly-optimized benchmark."
        },
        {
          "q": "How do you decide whether to use an LLM as a judge here?",
          "a": "BY WHAT THE ALTERNATIVE COSTS AND WHAT THE JUDGE'S ERROR PROFILE IS, treating it as an instrument with measurable properties rather than as an oracle. WHY IT IS ATTRACTIVE FOR RAG SPECIFICALLY: the properties I need scored - faithfulness, answer relevance, context relevance - are judgements about text pairs that no exact-match metric captures, and they must be computed thousands of times across every configuration change. Human labelling of that volume is not viable, so the realistic choice is a model judge, a smaller specialized model, or no measurement at all. WHERE I WOULD USE A CHEAPER INSTRUMENT INSTEAD. Faithfulness is essentially natural language inference - does this context entail this claim - and a purpose-trained NLI model is fast, cheap, and often competitive on that specific task, especially after claim decomposition has made each judgement small. That is worth trying before reaching for a large judge, and it makes the evaluation cheap enough to run on every commit. Retrieval metrics need no judge at all when you have labelled answering passages, which is another reason the labelled set pays for itself. THE CORRECTIONS I WOULD APPLY when using an LLM judge, all of which are cheap and routinely skipped. Validate against human labels on a subset and REPORT the agreement, remembering the human-human ceiling of roughly 70-75%. Decompose into claims before judging, since small judgements are more reliable than whole-answer verdicts. Where the judge compares two answers, present both orders and average, because position bias is real. Watch length bias - longer answers with more claims can score differently for reasons unrelated to quality, so report answer length alongside. Avoid a judge from the same family as the generator where self-preference could apply. And fix the rubric and version it, since judge scores move substantially with prompt wording and a rubric change invalidates comparisons across it. WHAT I WOULD NOT USE IT FOR. Absolute quality claims - 'our faithfulness is 0.91' means little without the judge's validated agreement attached. And any high-stakes go/no-go decision on its own; for those I would sample and label by hand, using the judge to select what to sample. THE FRAMING I WOULD OFFER: an LLM judge is a cheap, biased, high-variance instrument with a measurable relationship to what I care about. Used with its corrections and reported alongside its human agreement, it makes continuous evaluation possible, which is worth a great deal. Used unvalidated as the arbiter, it becomes something the system gets optimized against - and then it stops measuring quality and starts measuring judge-agreement, which is the same overoptimization structure that appears wherever a proxy becomes a target."
        },
        {
          "q": "What would you monitor in production, as opposed to offline?",
          "a": "DIFFERENT THINGS, BECAUSE PRODUCTION HAS NO LABELS - that is the defining constraint and it drives every choice. Offline I have gold answers and can compute recall and correctness; online I have queries, retrieved chunks, generated answers and user behaviour, and I need signals that work without ground truth. THE LABEL-FREE SIGNALS I WOULD INSTRUMENT. (1) RETRIEVAL SCORE DISTRIBUTION. Log the top-k similarity scores for every query and watch the distribution, not the mean. A downward shift means the corpus or the traffic changed - new topics users ask about, or an ingestion problem. This is the earliest warning available and it costs nothing. (2) LOW-CONFIDENCE RATE - the fraction of queries whose top score falls below a threshold. It is a good cheap proxy for 'we probably have nothing relevant', it doubles as the abstention trigger, and a rise in it is usually the first visible symptom of a coverage gap. (3) ABSTENTION RATE, tracked over time and by query segment. A sudden change in either direction is meaningful: rising means coverage is degrading, falling can mean the threshold drifted or the corpus grew. (4) FAITHFULNESS ON A SAMPLE, scored offline by the same judge or NLI model. This needs no gold answer - only the answer and the context it was given - which makes it one of the few quality metrics computable on live traffic. That property makes it disproportionately valuable in production. (5) CITATION CLICK-THROUGH and citation validity, if the product exposes sources. A user clicking a citation and the cited chunk not supporting the claim is a direct, unambiguous quality signal. (6) USER BEHAVIOUR: rephrase rate - a user immediately re-asking is a strong implicit failure signal - session abandonment, explicit thumbs, and escalation to a human channel where one exists. (7) THE OPERATIONAL LAYER: p95 latency broken down by stage, cost per query, error and timeout rates, and index health including deleted-fraction and staleness. THE FEEDBACK LOOP I WOULD CLOSE. Sample production queries continuously into the offline eval set, prioritizing low-confidence and negative-feedback cases, and label them. That keeps the offline measurement aligned with the live distribution, which otherwise drifts silently until the eval set is measuring a product that no longer exists. Every production incident becomes a permanent regression case. THE ALERT I WOULD ACTUALLY SET, if limited to one: a shift in the retrieval score distribution combined with a rise in the low-confidence rate. That pair catches ingestion breakage, corpus drift and query-distribution shift, needs no labels, and fires before users complain - which is the property that distinguishes monitoring from reporting."
        },
        {
          "q": "How would you decide when the system should abstain?",
          "a": "BY TREATING IT AS A THRESHOLD ON A CALIBRATED SIGNAL WITH AN EXPLICIT COST RATIO, because that is what it is - and framing it that way turns a vague 'the model should be more careful' into a number someone can set. WHY IT MATTERS DISPROPORTIONATELY IN RAG. Retrieval always returns k chunks; similarity search has no concept of 'nothing matched', so it returns the k nearest passages regardless of how far away they are. The generator is therefore ALWAYS handed plausible-looking material and a question, which is the ideal setup for a confident wrong answer. Abstention is the mechanism that converts that class of failure into an honest 'I don't have that', and it is usually the highest-value behaviour in the system. THE SIGNALS I WOULD USE, in increasing quality. (1) THE TOP RETRIEVAL SCORE. Crude but genuinely useful, and free - you already have it. The distribution of top scores on answerable versus unanswerable questions overlaps but is separated enough to be informative. (2) THE RERANKER SCORE, which is better because a cross-encoder is a stronger relevance judge than a bi-encoder dot product. (3) A DEDICATED ANSWERABILITY CHECK - ask a model whether the retrieved context actually contains an answer, as a separate call before generating. More expensive, considerably more accurate, and it also gives you a reason. (4) SELF-REPORTED CONFIDENCE from the generator, which I would use with suspicion: verbalized confidence is poorly calibrated in general, and it is exactly the signal a fluent wrong answer will report highly. (5) FAITHFULNESS, computed post-hoc on the generated answer - if no claim is supported by the context, do not ship the answer. This is the most reliable and the most expensive, and it can run as a filter rather than a gate. SETTING THE THRESHOLD, which is a cost decision and not a modelling one. Two errors: answering when you should not, and declining when you could have answered. Their costs are asymmetric and domain-specific - in a medical or legal context a wrong answer is far worse than a decline; in a casual assistant an over-cautious system is useless. So I would write down the ratio and choose the threshold that minimizes expected cost, exactly as with any classification threshold. And I would measure BOTH directions on the eval set: abstention rate on the unanswerable tier and FALSE abstention on the answerable tier, since moving one moves the other and a single number hides the trade. THE PRINCIPLED VERSION, if the guarantee matters: conformal prediction gives distribution-free coverage - decline unless the evidence meets a calibrated bar, with a provable error rate on exchangeable data. That converts 'the score looked low' into a statement with a guarantee attached, which is worth the machinery in high-stakes settings. AND THE PRODUCT POINT: abstention is not a failure to display. 'I don't have information about that, but here is what I found on the related topic' is a good answer, and the low-confidence rate doubles as the best label-free monitoring signal you have - a rise in it usually means the corpus or the traffic moved before any user complains."
        },
        {
          "q": "How does this lesson anchor the module?",
          "a": "IT IS THE LESSON THAT MAKES THE OTHERS ACTIONABLE, because the module's central claim is that these systems are compositions with ceilings, and a ceiling is only useful if you can see where it sits. Every decision in 18-01 through 18-03 - which embedding model, which chunk size, whether hybrid earns its complexity, whether the reranker earns its latency - is a comparison on a labelled set. Without that set, all of them are preferences, and the module's argument is precisely that these are the kind of systems where preferences go wrong quietly rather than loudly. THE STRUCTURAL POINT it establishes: an aggregate score over a composed system cannot identify which stage is binding, and the intuitive guess is biased. It is biased in a specific direction - toward the visible, expensive, interesting component - which is why effort flows to the generator while the ceiling sits at chunking, two stages upstream and one line of configuration. The decomposition removes the guessing entirely for the price of measuring two numbers instead of one, which is the best trade in the module. THE SECOND STRUCTURAL POINT is about what metrics can and cannot see, which is 17-10's argument applied here. Correctness alone cannot see the correct-but-unfaithful case, and that case is the one that fails later: it looks like success and means the model is answering from memory rather than from your documents, so it will be confidently wrong exactly when your corpus contains something new. And no metric computed only on answerable questions can see the abstention failure, because retrieval always returns k chunks and the system is never given the chance to have nothing. In both cases the metric is answering a different question correctly - the recurring failure across this curriculum. WHERE IT POINTS NEXT. The abstention threshold from this lesson is the first guardrail, which is where 18-09 begins; the per-stage decomposition is what makes an agent's step-level failures diagnosable rather than mysterious when 18-06 introduces the loop; and the capstone in 18-10 is an ablation, which is only meaningful because each axis has a metric defined here. So this is less a chapter about metrics than the instrument set the rest of the module is measured with - and building it first, rather than last, is the practical recommendation the whole module implies."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "The factorization that ends the guessing",
        "back": "P(correct) = recall@k × P(correct | evidence present). 0.55 could be 0.95×0.58 (generation) or 0.60×0.92 (retrieval) — same aggregate, OPPOSITE work. And compute the second factor only on the retrieval-succeeded SUBSET."
      },
      {
        "type": "intuition",
        "front": "★ The faithful/correct 2×2",
        "back": "faithful+correct = healthy · faithful+incorrect = retrieval failed (reassuring) · unfaithful+incorrect = hallucination · **unfaithful+CORRECT = the dangerous cell** — parametric memory, scores as success, fails when your corpus disagrees."
      },
      {
        "type": "formula",
        "front": "Faithfulness = a claim-level ratio",
        "back": "supported claims / total claims. DECOMPOSE FIRST — a whole-answer verdict on a 5-sentence response is nearly a coin flip; claim-level correlates better with humans AND localizes the invented sentence."
      },
      {
        "type": "intuition",
        "front": "The four diagnostic rows",
        "back": "recall LOW + faith HIGH → fix retrieval (chunking first). recall HIGH + faith LOW → fix generation (prompt, order, too many chunks). both HIGH + correctness LOW → needs reasoning. correctness HIGH + faith LOW → parametric memory."
      },
      {
        "type": "pitfall",
        "front": "★ Retrieval ALWAYS returns k chunks",
        "back": "Similarity search has no notion of \"nothing matched\" — it returns the k nearest regardless of distance. So the generator is always handed plausible passages. Without UNANSWERABLE questions you never measure whether it can decline."
      },
      {
        "type": "pitfall",
        "front": "Why synthetic questions flatter you",
        "back": "Generated from a chunk, they're answerable from ONE chunk BY CONSTRUCTION. They overstate performance and under-represent multi-hop, ambiguous and absent-answer queries. Supplement tier-1 traffic; never replace it."
      },
      {
        "type": "intuition",
        "front": "Measure abstention in BOTH directions",
        "back": "Abstention rate on unanswerable questions AND false-abstention on answerable ones. It's a threshold trade-off — moving one moves the other, so a single number hides the cost."
      },
      {
        "type": "intuition",
        "front": "Context precision matters too",
        "back": "The fraction of retrieved chunks that are relevant. Low precision wastes context budget and adds distracting text — and faithfulness tends to FALL as chunk count grows, so evaluate context size against faithfulness, not just recall."
      },
      {
        "type": "pitfall",
        "front": "Validate the judge; know its ceiling",
        "back": "Hand-label ~200 claims, report agreement (ceiling = human-human ~70–75%). Decompose before judging, average both orders, report answer length, avoid same-family self-preference, and VERSION the rubric."
      },
      {
        "type": "intuition",
        "front": "Faithfulness needs no gold answer",
        "back": "It compares the answer to the context it was GIVEN — so it is computable on live traffic. That property makes it one of the few real quality metrics available in production monitoring."
      },
      {
        "type": "intuition",
        "front": "The one production alert worth having",
        "back": "A shift in the retrieval SCORE DISTRIBUTION plus a rise in the LOW-CONFIDENCE rate. Catches ingestion breakage, corpus drift and query-distribution shift; needs no labels; fires before users complain."
      },
      {
        "type": "pitfall",
        "front": "The statistics, skipped as reliably here as anywhere",
        "back": "SE = √(p(1−p)/n) ≈ ±3.5 pts at n=200 — a 3-point \"win\" is noise. Use a PAIRED per-question test: question difficulty is the dominant variance component and pairing removes it."
      }
    ],
    "refs": [
      {
        "title": "Es et al. (2023), RAGAS: Automated Evaluation of Retrieval Augmented Generation",
        "url": "https://arxiv.org/abs/2309.15217"
      },
      {
        "title": "Saad-Falcon et al. (2023), ARES: An Automated Evaluation Framework for RAG Systems",
        "url": "https://arxiv.org/abs/2311.09476"
      },
      {
        "title": "Chen et al. (2023), Benchmarking Large Language Models in Retrieval-Augmented Generation",
        "url": "https://arxiv.org/abs/2309.01431"
      },
      {
        "title": "Rajpurkar, Jia & Liang (2018), Know What You Don't Know: Unanswerable Questions for SQuAD",
        "url": "https://arxiv.org/abs/1806.03822"
      },
      {
        "title": "Liu et al. (2023), Lost in the Middle: How Language Models Use Long Contexts",
        "url": "https://arxiv.org/abs/2307.03172"
      }
    ],
    "demos": [
      "classification-metrics",
      "calibration",
      "conformal",
      "lost-in-the-middle"
    ],
    "demoTitles": {
      "classification-metrics": "Classification Metrics",
      "calibration": "Model Calibration",
      "conformal": "Conformal Prediction",
      "lost-in-the-middle": "Lost in the Middle"
    }
  }
};
