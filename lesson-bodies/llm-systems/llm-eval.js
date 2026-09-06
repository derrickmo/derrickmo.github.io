// GENERATED from content/lessons/llm-systems/llm-eval.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/llm-systems/llm-eval/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "llm-eval": {
    "level": "core",
    "body": {
      "intuition": [
        "This is the module's capstone and it is about the instruments rather than the systems, because every decision in the preceding lessons was justified by a measurement. Quantization is lossless - measured how? A distilled student matches its teacher - on what? A scaling law predicts a large run - of which quantity? The answer changes the conclusion in each case, and the module's recurring finding is that the metric people reach for is frequently structurally unable to see the effect they are asking about.",
        "The sharpest instance recurs three times in this module and is worth naming as one pattern. MULTIPLE-CHOICE ACCURACY IS A STEP FUNCTION OF THE LOGITS. A small perturbation rarely flips a confident argmax, so quantization can degrade a model's output distribution measurably while accuracy does not move at all. The same blindness explains why constrained decoding's parse rate is not a result, why preference judging cannot distinguish style from capability, and why emergent abilities looked discontinuous. In each case the instrument was answering a different question from the one being asked - and it answered it correctly, which is why the error is so persistent.",
        "So the discipline is to choose an instrument that can actually move in response to what you are testing, and to know each instrument's blind spot. Perplexity is continuous and sensitive and does not measure capability. Benchmarks are comparable and contaminated. LLM judges are cheap and scale, and carry position, length and self-preference biases. Human preference is the ground truth for helpfulness and measures style heavily. Checkable tasks are unfoolable and cover only what can be checked. None of these is the right answer; the right answer is a portfolio chosen so that the failure modes do not overlap, plus an honest statement of what remains unmeasured."
      ],
      "math": [
        {
          "h": "Why accuracy cannot see a distributional change",
          "paras": [
            "Accuracy depends on the logits only through which is largest. That makes it a step function, insensitive to any perturbation smaller than the margin.",
            "Perplexity depends on the probability assigned to the observed token, so it responds continuously to the same perturbation."
          ],
          "tex": "\\mathrm{acc} = \\mathbb{1}\\big[\\arg\\max_i z_i = y\\big] \\quad\\text{vs}\\quad \\mathrm{PPL} = \\exp\\!\\Big(-\\tfrac{1}{N}\\textstyle\\sum_t \\log p(x_t \\mid x_{<t})\\Big)",
          "texNote": "So a change that shifts every logit by a small amount leaves accuracy exactly unchanged and moves perplexity immediately. That single difference explains why quantization passes benchmarks and degrades generation, and why a continuous metric is the right first instrument for any change that perturbs the distribution rather than the ranking."
        },
        {
          "h": "The judge's biases, as a model of what it measures",
          "paras": [
            "An LLM or human judge's preference is a function of several things, only one of which is quality. Writing it out makes clear why a win-rate is not a quality measurement.",
            "Length is the best-documented of these and it is the one that most often explains an apparent improvement."
          ],
          "tex": "\\Pr[A \\succ B] = f\\big(\\underbrace{q_A - q_B}_{\\text{quality}},\\; \\underbrace{|A| - |B|}_{\\text{length}},\\; \\underbrace{\\text{style}}_{\\text{register, format}},\\; \\underbrace{\\text{position}}_{\\text{order shown}}\\big)",
          "texNote": "The practical consequences: report mean output length beside every win-rate, since length-controlled comparison routinely removes a large share of an apparent win; randomize and average over presentation order, because position bias is real in both human and model judges; and be wary of a model judging its own family, where self-preference has been measured."
        },
        {
          "h": "Contamination as a validity threat, not a quality one",
          "paras": [
            "A benchmark score decomposes into performance on items the model has seen and items it has not. Only the second is measuring capability.",
            "Reporting both, rather than the aggregate, is what makes a number interpretable."
          ],
          "tex": "\\text{score} = \\rho \\cdot s_{\\text{seen}} + (1-\\rho)\\cdot s_{\\text{unseen}}, \\qquad s_{\\text{seen}} \\to 1 \\text{ under memorization}",
          "texNote": "So the contaminated fraction rho inflates the score toward one, and the honest report gives the score on the clean subset alongside the full figure - the difference between them IS the contamination's effect. Note this is a validity failure rather than a quality one: it does not make the model worse, it makes the number mean something other than what it appears to."
        }
      ],
      "code": [
        {
          "h": "The instruments, and what each is blind to",
          "paras": [
            "There is no single right metric. The design decision is choosing a set whose blind spots do not overlap, and stating what remains uncovered."
          ],
          "code": "# INSTRUMENT              SEES                        BLIND TO\n# ------------------------------------------------------------------------\n# perplexity              distributional change,      capability; comparable\n#                         continuous, cheap           only within a tokenizer\n# multiple-choice acc.    ranking of options          ANY change smaller than\n#                                                     the margin - a STEP FN\n# checkable tasks         genuine capability          only what is checkable\n#   (code runs, maths)    (style cannot fake it)\n# LLM judge               open-ended quality, cheap,  length, position, self-\n#                         scalable                    preference bias\n# human preference        helpfulness (the target)    style/length heavily;\n#                                                     expensive, ~70% agreement\n# production A/B          the thing you actually      slow, confounded, only\n#                         care about                  post-deployment\n\n# THE PATTERN THIS MODULE KEEPS HITTING - one blindness, three symptoms:\n#   QUANTIZATION passes benchmarks and degrades generation (accuracy is a\n#     step function; generation compounds and samples the TAIL)\n#   CONSTRAINED DECODING reports 100% parse rate (that is the DEFINITION)\n#   IMITATION models win preference and gain no capability (preference on\n#     short comparisons largely measures STYLE)\n# In each case the instrument answered a DIFFERENT question - correctly.\n\n# THE MINIMUM PORTFOLIO I would run on any model change:\nreport = {\n  \"ppl_in_domain\":     perplexity(model, held_out),        # continuous, sensitive\n  \"checkable_acc\":     exact_match(model, verifiable_set), # style cannot fake it\n  \"judge_winrate\":     judge(model, baseline),             # ...and beside it:\n  \"mean_output_len\":   mean_len(model), mean_len(baseline),# THE confound\n  \"contaminated_frac\": ngram_overlap(evalset, corpus),     # validity check\n  \"capability_suite\":  before_after(base_model, model),    # what was LOST\n}",
          "caption": "The table is the lesson: no instrument is right, and the design decision is choosing a set whose blind spots do not overlap. The three symptoms below it are one blindness seen three times in this module."
        },
        {
          "h": "Judges, contamination, and the statistics people skip",
          "paras": [
            "Three practical corrections, each of which changes conclusions and each of which is routinely omitted."
          ],
          "code": "# 1. LENGTH-CONTROL EVERY PREFERENCE COMPARISON.\nprint(\"win rate\", wr, \"| lengths\", mean_len(a), mean_len(b))\n#   Judges prefer longer at equal quality, and almost every intervention makes\n#   models longer. If the winner is 40% longer, the comparison is not yet\n#   interpretable - regress out length or match it, which routinely removes a\n#   large share of an apparent win.\n\n# 2. DEBIAS THE JUDGE.\nscores = [judge(a, b), judge(b, a)]        # BOTH orders, then average -\n                                            # position bias is real in human\n                                            # AND model judges\n#   And avoid a judge from the same family as a candidate: SELF-PREFERENCE has\n#   been measured. Validate the judge against human labels on a subset and\n#   report that agreement - a judge nobody has validated is an unknown\n#   instrument, and its agreement ceiling is the human-human rate of ~70-75%.\n\n# 3. REPORT UNCERTAINTY. A 3-point difference on 200 examples is noise.\nse = sqrt(p * (1 - p) / n)                  # +- ~3.5 points at n=200, p=0.5\n#   Bootstrap the confidence interval, and for A-vs-B use the PAIRED test on\n#   per-item outcomes - far more powerful than comparing two independent means,\n#   because item difficulty is the dominant variance component.\n\n# 4. CONTAMINATION - a VALIDITY check, not a quality one.\nseen = [ex for ex in evalset if any(ng in corpus_ngrams\n                                    for ng in ngrams(ex, n=13))]\nprint(\"contaminated:\", len(seen)/len(evalset))\nprint(\"score full:\", score(evalset), \"| score CLEAN:\", score(evalset - seen))\n#   The DIFFERENCE between those two is the contamination's effect. A benchmark\n#   number reported without this is an upper bound, not a measurement.\n\n# 5. THE ONE PEOPLE FORGET ENTIRELY: what did the change BREAK? Fix a\n#    capability suite BEFORE the change, run it on the base model, and re-run\n#    after. Every metric above is computed on the thing you were optimizing;\n#    regressions happen off it, by construction.",
          "caption": "Four corrections that change conclusions and are routinely omitted, plus the fifth that is skipped entirely: every metric here measures what you optimized, so regressions occur off it by construction and need a pre-declared suite."
        }
      ],
      "useCases": [
        "Deciding whether a systems change - quantization, distillation, a new serving path - preserved quality, which requires an instrument sensitive to distributional change rather than one that only sees the ranking.",
        "Comparing model candidates for a deployment, where the portfolio approach plus contamination checking plus paired statistics is what separates a real difference from noise or memorization.",
        "Monitoring a deployed model, where production A/B on the metric you actually care about is the ground truth and everything else is a cheap proxy run beforehand.",
        "Reading published results critically: knowing what each instrument is blind to lets you infer what a reported number can and cannot support, which is most of the skill in evaluating claims about models."
      ],
      "pitfalls": [
        "Using multiple-choice accuracy to evaluate a distributional change. It is a step function of the logits and rarely moves when a perturbation is smaller than the margin, so it is structurally unable to detect quantization damage. Use perplexity and long-output generation.",
        "Reporting a preference win-rate without output length. Judges prefer longer responses at equal quality and almost every intervention lengthens output, so an uncontrolled win-rate conflates verbosity with quality - and length control routinely removes much of the apparent gain.",
        "Trusting an unvalidated LLM judge. Position bias, length bias and self-preference are all measured effects. Present both orders and average, avoid judging a model with one from its own family, and report agreement with human labels on a subset.",
        "Comparing two scores without uncertainty. A three-point difference on two hundred examples is inside the noise, and the standard error is one line. For A-versus-B use a paired test on per-item outcomes, since item difficulty dominates the variance.",
        "Reporting a benchmark score without a contamination check. Evaluation sets appear in web crawls, so the number may reflect memorization - which is a validity failure rather than a quality one, and it makes the figure an upper bound rather than a measurement.",
        "Measuring only what you optimized. Every metric in a training or tuning loop is computed on the target, so regressions happen off it by construction. A capability suite fixed before the change and run on the base model is the only way to see them.",
        "Treating any single number as the evaluation. Each instrument answers a different question, and the design decision is a portfolio whose blind spots do not overlap - plus an explicit statement of what remains unmeasured."
      ],
      "connections": [
        {
          "ref": "llm-systems/quantization",
          "text": "The clearest instance of the module's evaluation failure: accuracy is a step function and cannot see a distributional change, while generation compounds perturbations and samples the tail where quantization error is largest."
        },
        {
          "ref": "llm-systems/scaling-laws",
          "text": "Where loss and capability come apart. Scaling predicts cross-entropy smoothly; benchmark performance is measured with metrics that can be discontinuous, which is much of why emergence looked like a qualitative change."
        },
        {
          "ref": "fine-tuning/instruction-tuning",
          "text": "The same instrument failure in the fine-tuning setting - imitation models winning preference while gaining no checkable capability, because short preference comparisons largely measure style."
        },
        {
          "ref": "llm-systems/llm-data-pipelines",
          "text": "Contamination is a data-pipeline problem with an evaluation consequence, and the near-duplicate machinery built for deduplication is exactly the tool for detecting it."
        },
        {
          "ref": "ml-theory/evaluation-metrics",
          "text": "The general treatment of what a metric can and cannot express. The failures here are that framework applied to generative models, where the output is a distribution over sequences rather than a label."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Why does accuracy miss quantization damage?",
          "a": "It is a step function of the logits - only the argmax matters - so a perturbation smaller than the margin leaves it exactly unchanged while the distribution has measurably shifted."
        },
        {
          "q": "What should you use instead?",
          "a": "Perplexity on in-domain held-out text, which is continuous and responds immediately, plus long-output generation where errors compound and sampling reads the tail."
        },
        {
          "q": "Why is perplexity not sufficient on its own?",
          "a": "It measures distributional fit, not capability, and it is comparable only within a fixed tokenizer and data distribution."
        },
        {
          "q": "What is the main bias in preference judging?",
          "a": "Length - judges prefer longer responses at equal quality, and almost every intervention lengthens output, so an uncontrolled win-rate conflates verbosity with quality."
        },
        {
          "q": "How do you correct for position bias?",
          "a": "Present both orders and average. It is a measured effect in both human and LLM judges."
        },
        {
          "q": "What is self-preference?",
          "a": "A model judge rating outputs from its own family more favourably. It is measured, and it is why a judge should not come from the same family as a candidate."
        },
        {
          "q": "How do you validate a judge?",
          "a": "Compare it against human labels on a subset and report the agreement. Its ceiling is the human-human agreement rate, around 70 to 75%."
        },
        {
          "q": "What is contamination?",
          "a": "Evaluation data appearing in the training corpus, so the score reflects memorization. It is a validity failure rather than a quality one."
        },
        {
          "q": "How do you report a contaminated benchmark honestly?",
          "a": "Give the score on the full set and on the contamination-free subset. The difference between them is the contamination's effect."
        },
        {
          "q": "Why use a paired test for A versus B?",
          "a": "Item difficulty dominates the variance, so comparing per-item outcomes is far more powerful than comparing two independent means."
        },
        {
          "q": "What does a three-point difference on 200 examples mean?",
          "a": "Nothing on its own - the standard error at p of 0.5 and n of 200 is about 3.5 points, so the difference is inside the noise."
        },
        {
          "q": "What does every metric in a tuning loop miss?",
          "a": "Regressions, because it is computed on what you were optimizing and regressions happen off it. A pre-declared capability suite on the base model is the only way to see them."
        }
      ],
      "standard": [
        {
          "q": "How would you evaluate whether a systems change preserved model quality?",
          "a": "THE FIRST QUESTION IS WHAT KIND OF CHANGE IT IS, because that determines which instruments can see it. A change that perturbs the output DISTRIBUTION - quantization, a different kernel, a fused attention implementation - needs a continuous metric. A change that alters CAPABILITY - distillation, fine-tuning - needs checkable tasks. A change that alters FORMAT - constrained decoding - needs the validity and correctness terms reported separately. THE INSTRUMENT THAT FAILS MOST OFTEN, and it is worth leading with because it recurs three times in this module. Multiple-choice accuracy is a STEP FUNCTION of the logits: only the argmax matters, so any perturbation smaller than the margin leaves it exactly unchanged. Quantization can shift every logit measurably and accuracy will not move, which is why quantized models pass benchmarks and produce worse generations. The same blindness explains why constrained decoding's 100% parse rate is the definition rather than a result, and why imitation models win preference comparisons while gaining no capability. One blindness, three symptoms - and in each case the metric answered a different question correctly, which is why the error persists. WHAT I WOULD ACTUALLY RUN, as a portfolio chosen so the blind spots do not overlap. (1) PERPLEXITY on in-domain held-out text. Continuous, cheap, and sensitive to exactly the distributional shifts that accuracy hides. This is the first thing I would measure for any systems change and it would have caught most of the failures in this module. (2) CHECKABLE TASKS - code that runs against tests, mathematics with exact answers, extraction with unique targets. Style cannot fake these, so they are the honest capability column. (3) LONG-OUTPUT GENERATION scored the way production scores it, because autoregressive errors compound over hundreds of steps and sampling reads the low-probability tail where perturbation is proportionally largest. Repetition rate and format-violation rate belong here. (4) A PREFERENCE COMPARISON if the task is open-ended - with mean output length reported beside it, both presentation orders averaged, and the judge validated against human labels on a subset. (5) THE CAPABILITY SUITE, fixed before the change and run on the base model, because every other metric is computed on what I was optimizing and regressions happen off it by construction. THE STATISTICS, which are routinely skipped. Report uncertainty: a three-point difference on two hundred examples is inside the noise. Use a PAIRED test on per-item outcomes for A-versus-B, since item difficulty is the dominant variance component and pairing removes it. And bootstrap rather than assuming normality on a bounded score. AND THE VALIDITY CHECK: contamination. Evaluation sets appear in web crawls, so I would check n-gram overlap against the training corpus where I can see it, and report the score on the clean subset alongside the full one. Without it a benchmark figure is an upper bound rather than a measurement. THE PRINCIPLE I WOULD STATE. Choose an instrument that CAN MOVE in response to the thing you are testing, know what each one is blind to, and say explicitly what remains unmeasured. That last part is what makes an evaluation honest rather than merely thorough.",
          "deepDive": {
            "q": "Design an evaluation for a quantized model that would actually catch the problems.",
            "a": "I WOULD DESIGN IT AROUND WHAT QUANTIZATION ACTUALLY DOES: it perturbs the logits slightly and everywhere. So the evaluation has to be sensitive to small distributional changes and to their compounding, which is a specific requirement. TIER 1 - DIRECT DISTRIBUTIONAL MEASUREMENT, the most informative and the cheapest. (a) PERPLEXITY on held-out in-domain text, full precision versus quantized. Continuous, sensitive, one number. (b) KL DIVERGENCE between the two models' output distributions at each position on a sample of real prompts - this measures the thing that changed rather than a downstream consequence of it, and it localizes WHERE the divergence is largest, which no benchmark does. (c) The distribution of that divergence, not just its mean, because a small mean with a heavy tail is a different situation from a uniform small shift. TIER 2 - COMPOUNDING, which is where the practical damage lives. Generate long outputs from both models on the same prompts with the same seed and measure: length distribution, repetition rate - n-gram repetition within a response - format-violation rate on structured tasks, and degeneration onset, meaning at what token position the outputs start diverging qualitatively rather than merely differing. The mechanism is that each token conditions on all previous ones, so a perturbation that changes one token in fifty changes the context for everything after; a 500-token response amplifies what a 20-token one hides. So the evaluation must use LONG outputs, and a benchmark of short answers is structurally unable to show this. TIER 3 - SAMPLING BEHAVIOUR, which is the second mechanism and is usually omitted entirely. Under temperature or nucleus sampling you are not taking the argmax - you are sampling, so changes in the LOW-PROBABILITY TAIL directly change which tokens can appear, and quantization error is proportionally largest exactly there. So: measure at the sampling parameters you actually deploy, not greedily. Compare the entropy of the output distributions. And measure diversity across multiple samples from the same prompt, since a shift in the tail shows up as reduced or altered diversity before it shows as wrong answers. TIER 4 - CAPABILITY, on checkable tasks, as the backstop. Style cannot fake code that runs, and if these move you have a serious problem rather than a subtle one. TIER 5 - THE PRODUCTION PROXY. Real prompts sampled from traffic, scored the way production scores them. This is the only evaluation whose distribution is guaranteed correct, and its absence is why the problem shipped in the first place. WHAT I WOULD DELIBERATELY NOT RELY ON. Multiple-choice benchmarks, which are step functions of the logits and will show no change while the model degrades - and which are, unfortunately, what most published quantization evaluations use. I would include them only to demonstrate that they do not move, which is itself a useful thing to show a stakeholder. THE ACCEPTANCE CRITERION I WOULD SET IN ADVANCE. Perplexity within a stated tolerance, repetition and format-violation rates unchanged, checkable accuracy unchanged, and the production-proxy score within tolerance. Stating these before running is what makes the evaluation a test rather than a search for a favourable number - which is the discipline the whole curriculum keeps returning to."
          }
        },
        {
          "q": "How would you use an LLM as a judge, and what are its failure modes?",
          "a": "WHY IT IS ATTRACTIVE: it scales. Human evaluation is expensive, slow, and has its own agreement ceiling around 70 to 75%, so for anything requiring thousands of comparisons a model judge is the only practical instrument. It also correlates reasonably well with human preference on many tasks, which is what made it standard. THE FAILURE MODES, and each has a correction. (1) POSITION BIAS. Judges systematically favour one presentation position, and the effect is large enough to flip conclusions. CORRECTION: present both orders and average, or randomize and report over enough samples that it washes out. This is cheap and it is skipped constantly. (2) LENGTH BIAS. Longer responses are preferred at equal quality, and almost every intervention makes models longer - so an uncontrolled win-rate conflates verbosity with quality. CORRECTION: report mean output length beside every win-rate, and length-control the comparison by matching or regressing out. This routinely removes a large share of an apparent win, which tells you how much of the effect was verbosity. (3) SELF-PREFERENCE. A judge rates outputs from its own family more favourably, which is a measured effect. CORRECTION: never use a judge from the same family as a candidate, and if unavoidable, report it as a limitation. (4) STYLE OVER SUBSTANCE. This is the deepest one. Short preference comparisons largely measure register, formatting and confidence - precisely what fine-tuning and imitation transfer most readily - which is why imitation models win preference comparisons while gaining no checkable capability. CORRECTION: pair every judge evaluation with a checkable-task column. The judge cannot substitute for it. (5) SENSITIVITY TO THE RUBRIC. Judge scores move substantially with the prompt, the scale, and whether reasoning is requested before the verdict. CORRECTION: fix the rubric, version it, and treat a rubric change as invalidating comparisons across it. HOW I WOULD VALIDATE THE JUDGE, which is the step that turns it from an unknown instrument into a measured one. Collect human labels on a subset - a few hundred comparisons - and report the judge's agreement with them, broken down by task type. Its ceiling is the human-human agreement rate, so a judge agreeing 70% with humans who agree 72% with each other is close to as good as the format allows. Reporting that agreement is what lets a reader calibrate everything else. WHAT I WOULD USE IT FOR AND NOT FOR. Good for: relative comparisons at scale, regression detection between model versions, and filtering candidates before human review. Bad for: absolute quality claims, anything where style and substance can diverge, and any comparison where the two candidates differ systematically in length or format. THE FRAMING I WOULD OFFER. An LLM judge is a cheap, biased, high-variance instrument with a measurable relationship to the thing you care about. Used with its corrections and alongside an unfoolable metric, it is extremely useful. Used alone as the arbiter, it optimizes for what it measures - which is a reward-model overoptimization problem wearing evaluation clothes."
        },
        {
          "q": "What makes a good benchmark, and why do benchmarks stop working?",
          "a": "WHAT MAKES ONE GOOD, in rough order of importance. (1) IT MEASURES SOMETHING THAT MATTERS and that transfers - performance on it should predict performance on the real task. Surprisingly many do not, and the transfer is rarely validated. (2) IT IS HARD ENOUGH TO HAVE HEADROOM. A benchmark where the frontier is at 95% cannot distinguish models, and its remaining 5% is often mislabelled items rather than genuine difficulty - so improvements past that point are fitting annotation noise. (3) THE METRIC IS SENSITIVE to the differences you care about, which is this lesson's theme: a step-function metric on a task where the interesting variation is distributional measures nothing. (4) IT IS RESISTANT TO SHORTCUTS. The best benchmarks are constructed so the shortcut and the task DISAGREE - which is the discipline behind counterfactual and adversarial splits, and it requires knowing what the shortcut would be. (5) IT IS CHEAP AND REPRODUCIBLE, so people actually run it identically. WHY THEY STOP WORKING - four mechanisms. (1) CONTAMINATION. Published benchmarks enter web crawls, so newer models have seen them. This is time-dependent: the same benchmark is clean for a model trained before publication and contaminated after, so a score is partly a function of training date rather than capability. And it is a validity failure - the number stops meaning what it appears to. (2) SATURATION. Once the frontier reaches the ceiling, the benchmark cannot discriminate, and the remaining errors are frequently label noise. (3) OPTIMIZATION PRESSURE - Goodhart. Once a benchmark becomes a target, effort goes into it specifically, and the correlation with the underlying capability weakens. This is the same overoptimization structure as a reward model: the measure was informative until it became the objective. (4) SHORTCUTS BEING FOUND. Benchmarks constructed procedurally often contain artefacts, and the field's history is full of cases where a model exploiting an artefact scored well - a text-only baseline on a multimodal benchmark, a hypothesis-only baseline on inference. Those discoveries are how you learn a benchmark was measuring something else. WHAT FOLLOWS PRACTICALLY. Prefer benchmarks constructed AFTER your model's training cutoff, or construct your own held-out set from production data, which is the only one whose distribution is guaranteed correct. Report a contamination check with every number. Treat a benchmark as informative until it becomes a target, and expect its informativeness to decay once it does. And run the shortcut baseline yourself - a blind or ablated model on the benchmark - because if a degenerate baseline scores well, the benchmark is not measuring what it claims and you have learned that cheaply. THE HABIT I WOULD RECOMMEND. When you see a strong benchmark result, ask three questions: could it be contaminated, could a shortcut baseline achieve it, and does the metric have headroom. Those three account for most of the reported results that fail to reproduce as capability.",
          "deepDive": {
            "q": "You need to evaluate a model for a specific product. How would you build the evaluation?",
            "a": "I WOULD BUILD IT FROM PRODUCTION TRAFFIC AND WORK BACKWARDS, because the only evaluation set whose distribution is guaranteed correct is one sampled from the distribution you serve. Public benchmarks are for comparing models in general; a product needs an instrument aimed at its own task. STEP 1: SAMPLE REAL TRAFFIC, or the closest available proxy if the product is not live - a pilot, an internal dogfood period, or a carefully constructed simulation of expected use. Stratify it: by request type, by length, by user segment, by anything you suspect matters. A few hundred examples is enough to start and the stratification matters more than the size. STEP 2: LABEL IT, which is where the real work is. Decide what correct means for each request type and write it down as a rubric with worked examples of the hard cases, because most annotator disagreement is not irreducible variation - it is annotators optimizing different unstated criteria. Measure inter-annotator agreement and treat it as the ceiling on everything downstream. STEP 3: SEPARATE THE CHECKABLE FROM THE JUDGED. Whatever can be verified programmatically - a structured field, a retrieved citation that exists, an arithmetic result, code that runs - should be, because those are unfoolable and cheap to re-run. Everything else needs a judge, human or model, with the corrections from earlier. Report them as separate columns; do not blend them into one score. STEP 4: BUILD THE ADVERSARIAL AND EDGE SLICES DELIBERATELY. The cases where the right answer is a refusal, or an admission of uncertainty, or a clarifying question. Ambiguous inputs. Very long inputs. Inputs in the second-most-common language. These are where models fail and where an average over typical traffic will not look. STEP 5: FIX A CAPABILITY SUITE from before any change, so regressions off the optimization target are visible. STEP 6: DEFINE THE DECISION RULE IN ADVANCE - what result would cause you to ship, and what would cause you not to. Without it the evaluation becomes a search for a favourable framing. THE THINGS I WOULD MEASURE BESIDES CORRECTNESS, because a product is not only accurate. Latency at the percentiles that matter, not the mean. Cost per request. Refusal rate and format-violation rate. Output length, since it affects both cost and user experience. And the failure MODE distribution - what kinds of wrong, not just how often - because a system that fails by declining is very different from one that fails by confabulating. THE PROCESS POINT I WOULD MAKE MOST FIRMLY. Build this BEFORE you need it. The common sequence is to ship on public benchmarks, discover a problem in production, and then construct the evaluation that would have caught it - by which point you are building the instrument and diagnosing the failure simultaneously, which is the worst time for both. And once built, run it on every candidate and every systems change, so it accumulates history and a regression is visible as a deviation from a trend rather than an isolated number nobody can calibrate."
          }
        },
        {
          "q": "What is the single most common evaluation mistake in this module's material?",
          "a": "USING AN INSTRUMENT THAT IS STRUCTURALLY UNABLE TO MOVE IN RESPONSE TO THE THING BEING TESTED. It appears three times in this module and once more in the fine-tuning material, and each time it looks like a different problem. INSTANCE ONE: QUANTIZATION PASSING BENCHMARKS. Multiple-choice accuracy is a step function of the logits - only the argmax matters. Quantization shifts every logit slightly. If the correct option led comfortably, a small shift does not change which is largest, so accuracy is IDENTICAL while the distribution has measurably changed. The damage appears in generation, where errors compound over hundreds of autoregressive steps and sampling reads the low-probability tail. INSTANCE TWO: CONSTRAINED DECODING REPORTING A 100% PARSE RATE. That is the definition of the technique, not a result. Constraining sets validity to one by construction, so the only quantity that can move is correctness given validity - and an evaluation reporting the parse rate has measured the definition. INSTANCE THREE: IMITATION MODELS WINNING PREFERENCE COMPARISONS. Short preference judging largely measures register, formatting and confidence - exactly what imitation transfers most readily - so the instrument is structurally unable to distinguish a style gain from a capability gain. The measured finding was crowdworkers rating imitations competitive while checkable benchmarks barely moved. INSTANCE FOUR, one level up: EMERGENT ABILITIES. Exact-match accuracy on a multi-step task is a step function of the underlying per-token probability, so smooth improvement shows as a sudden jump. Replace it with a continuous measure and the improvement is visible all along. WHAT THEY HAVE IN COMMON. In every case the metric answered a question CORRECTLY - it answered whether the argmax survived, whether the output parses, which response reads better, whether every token was right. Nobody asked whether the distribution changed, whether the values are correct, whether capability improved, or whether the underlying probability rose. The instrument was not broken; it was pointed at a different question, and the error is durable precisely because the number is trustworthy. THE DIAGNOSTIC QUESTION that catches all four. Before running an evaluation, ask: what change in the system would this metric FAIL to detect? If the answer includes the change you are testing, you have the wrong instrument. That question takes seconds and it would have prevented every instance above. THE CORRECTIVE HABIT. Match the metric's sensitivity to the change's nature. Distributional change needs a continuous metric - perplexity, KL divergence. Capability change needs checkable tasks. Format change needs validity and correctness reported separately. And when you cannot find an instrument that can see it, say so explicitly rather than reporting the one that cannot."
        },
        {
          "q": "How do you evaluate long-context capability?",
          "a": "IT IS A GOOD CASE STUDY IN INSTRUMENT DESIGN, because the obvious test is nearly useless and the field learned that publicly. THE OBVIOUS TEST: NEEDLE IN A HAYSTACK. Insert a specific fact at some position in a long context and ask for it. It measures retrieval of a verbatim string, which models became very good at quickly - and a model can pass it comprehensively while being unable to use long context for anything real. It is close to saturated and it is still widely reported, which makes it a good example of a benchmark surviving past its usefulness. WHAT IT MISSES. (1) MULTIPLE needles, and reasoning that requires combining them - retrieval of one fact is a much easier problem than aggregation over several. (2) The POSITION EFFECT: performance is systematically worse for information in the MIDDLE of a long context than at either end, which is a real and well-documented finding and which a single-needle test at a random position averages away. (3) Whether the model can use the context for anything other than copying - summarizing it, reasoning over it, noticing a contradiction within it. (4) Whether long context DEGRADES ordinary performance, which is the regression question. WHAT I WOULD ACTUALLY BUILD. (a) POSITION-STRATIFIED retrieval, reporting accuracy as a function of where in the context the information sits, because the aggregate hides exactly the effect that matters. (b) MULTI-HOP tasks requiring information from several widely-separated positions. (c) AGGREGATION tasks - count, compare, summarize across the whole context - which cannot be solved by retrieval. (d) A CONTRADICTION test: place conflicting statements and see whether the model notices, which tests whether it is integrating rather than sampling. (e) A NEGATIVE control: ask about something NOT present, to measure whether the model confabulates rather than declining. That last one is skipped almost universally and it is where long-context systems fail most expensively. (f) LENGTH SCALING: the same task at 4k, 16k, 64k, 128k, so degradation with length is visible as a curve rather than a point. THE MEASUREMENT DETAIL THAT MATTERS. Distinguish what the model CAN do from what the context window ADVERTISES. A model with a 128k window whose performance collapses past 32k has a 128k window and a 32k capability, and only the length-scaling curve shows that. Advertised context length is a configuration, not a measurement. AND THE SYSTEMS CONNECTION, since this is the module's last lesson. Long context is expensive in exactly the way this module cares about: the KV cache scales linearly with sequence length, so it bounds the servable batch and therefore the throughput and the cost per token. So the evaluation should report not only capability at length but COST at length - because a model that is capable at 128k and can serve two concurrent requests there is a different product from one capable at 32k serving thirty. That pairing of a capability curve with a cost curve is the honest way to characterize long context, and it is what the two-regime framing recommends."
        },
        {
          "q": "Summarize what this module has been about.",
          "a": "THAT LLM SYSTEMS LIVE IN TWO REGIMES WITH OPPOSITE BOTTLENECKS, and that almost every technique is legible once you know which one it targets. TRAINING IS COMPUTE-BOUND. Weights are amortized over batch times sequence positions, so arithmetic intensity is high and the constraint is the compute budget. The question is how to ALLOCATE it, and the scaling laws answer: roughly equally between parameters and tokens, which made the token supply a first-order constraint and turned deduplication, quality filtering and packing from plumbing into determinants of model quality. Mixture of experts belongs here too - it decouples capacity from FLOPs, which is a compute-regime win. GENERATION IS MEMORY-BANDWIDTH-BOUND. Producing one token requires reading every weight and the entire KV cache to do one token's arithmetic - intensity about one, against hardware ratios in the hundreds, so the accelerator idles. The constraint is BYTES READ PER TOKEN, and every inference technique is an attack on it. Quantization reduces bytes per parameter. Distillation reduces the number of parameters. Grouped-query attention reduces the cache read - and the KV-cache formula's omission of query heads is why that works. Speculative decoding amortizes the read over more tokens, which is only possible because a k-token pass costs what a one-token pass costs. Batching amortizes over more sequences. THE ERRORS THE FRAMING PREVENTS. Expecting quantization to speed up training proportionally - it does not, because training is compute-bound. Expecting MoE to be as attractive to serve as to train - it is not, because all experts must be resident and residency bounds the batch. Quoting Chinchilla-optimal for a model you intend to deploy - that is a training-only answer, and the inference-aware objective pushes toward smaller models trained longer. Each of those is a training intuition carried into inference or the reverse. THE CAPSTONE'S ADDITION. Every claim in the module rests on a measurement, and the module's recurring failure is an instrument structurally unable to see the effect being tested. Accuracy is a step function and cannot detect a distributional change - which is why quantization passes benchmarks and degrades generation. A parse rate under constrained decoding is the definition, not a result. Preference judging measures style, which is what imitation transfers. Each time, the metric answered a different question correctly. THE ONE-SENTENCE VERSION. Know which regime you are in, because the same operation has opposite economics in each - and know what your instrument is blind to, because the technique that appears to be free is often one whose cost your metric cannot see."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "Why accuracy cannot see a distributional change",
        "back": "acc = 1[argmax z = y] is a STEP FUNCTION - only the ranking matters, so any perturbation smaller than the margin leaves it EXACTLY unchanged. Perplexity depends on p(observed token) and responds continuously. That difference is why quantization passes benchmarks and degrades generation."
      },
      {
        "type": "intuition",
        "front": "One blindness, three symptoms",
        "back": "QUANTIZATION passes benchmarks but degrades generation. CONSTRAINED DECODING reports 100% parse rate (the DEFINITION). IMITATION models win preference and gain no capability. Each time the metric answered a DIFFERENT question - correctly. That is why the error is durable."
      },
      {
        "type": "formula",
        "front": "What a preference judge actually measures",
        "back": "P(A > B) = f(quality gap, LENGTH gap, style, POSITION). Report mean output length beside every win-rate; average over BOTH orders; never judge with a model from a candidate's own family (self-preference is measured)."
      },
      {
        "type": "intuition",
        "front": "Validate the judge, and know its ceiling",
        "back": "Compare against human labels on a subset and REPORT the agreement. The ceiling is human-human agreement, ~70-75% - so a judge agreeing 70% with humans who agree 72% with each other is near the format's limit. An unvalidated judge is an unknown instrument."
      },
      {
        "type": "formula",
        "front": "Contamination is a VALIDITY failure",
        "back": "score = rho * s_seen + (1-rho) * s_unseen, with s_seen -> 1 under memorization. Report the score on the FULL set AND the CLEAN subset - the difference IS the effect. A benchmark number without this check is an upper bound, not a measurement."
      },
      {
        "type": "pitfall",
        "front": "Report uncertainty, and use a PAIRED test",
        "back": "SE = sqrt(p(1-p)/n) is ~3.5 points at n=200 - so a 3-point difference is noise. For A-vs-B, compare PER-ITEM outcomes: item difficulty is the dominant variance component, and pairing removes it."
      },
      {
        "type": "intuition",
        "front": "The instrument portfolio",
        "back": "PERPLEXITY sees distributional change, not capability. ACCURACY sees ranking only. CHECKABLE TASKS see capability, cover only the checkable. JUDGES scale, are biased. HUMANS are ground truth for helpfulness, measure style. Choose a set whose BLIND SPOTS DO NOT OVERLAP."
      },
      {
        "type": "intuition",
        "front": "The diagnostic question before any evaluation",
        "back": "What change in the system would this metric FAIL to detect? If the answer includes the change you are testing, you have the wrong instrument. Seconds to ask, and it would have prevented every failure in this module."
      },
      {
        "type": "pitfall",
        "front": "Every metric misses regressions BY CONSTRUCTION",
        "back": "They are all computed on what you were OPTIMIZING; regressions happen OFF it. Fix a capability suite BEFORE the change, run it on the BASE model, and put both columns in the same table. This is the step skipped entirely."
      },
      {
        "type": "intuition",
        "front": "Why benchmarks stop working",
        "back": "CONTAMINATION (time-dependent - clean before publication, dirty after), SATURATION (remaining errors are label noise), GOODHART (informative until it becomes a target), and SHORTCUTS being found. Run the degenerate baseline yourself - if it scores well, you have learned that cheaply."
      },
      {
        "type": "intuition",
        "front": "Long context: needle-in-a-haystack is nearly useless",
        "back": "It tests verbatim retrieval, which saturated. Build instead: POSITION-STRATIFIED accuracy (middle is worse), multi-hop, aggregation, contradiction detection, a NEGATIVE control (ask for what is absent), and a LENGTH-SCALING curve. Advertised window is a configuration, not a measurement."
      },
      {
        "type": "intuition",
        "front": "The module in one sentence",
        "back": "TRAINING is compute-bound (allocate the budget); GENERATION is memory-bandwidth-bound (read fewer bytes per token). The same operation has OPPOSITE economics in each - and the technique that appears free is often one whose cost your metric cannot see."
      }
    ],
    "refs": [
      {
        "title": "Zheng et al. (2023), Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena",
        "url": "https://arxiv.org/abs/2306.05685"
      },
      {
        "title": "Liang et al. (2022), Holistic Evaluation of Language Models (HELM)",
        "url": "https://arxiv.org/abs/2211.09110"
      },
      {
        "title": "Liu et al. (2023), Lost in the Middle: How Language Models Use Long Contexts",
        "url": "https://arxiv.org/abs/2307.03172"
      },
      {
        "title": "Schaeffer, Miranda & Koyejo (2023), Are Emergent Abilities of Large Language Models a Mirage?",
        "url": "https://arxiv.org/abs/2304.15004"
      },
      {
        "title": "Dubois et al. (2024), Length-Controlled AlpacaEval: A Simple Way to Debias Automatic Evaluators",
        "url": "https://arxiv.org/abs/2404.04475"
      }
    ],
    "demos": [
      "calibration",
      "classification-metrics",
      "conformal",
      "lost-in-the-middle"
    ],
    "demoTitles": {
      "calibration": "Model Calibration",
      "classification-metrics": "Classification Metrics",
      "conformal": "Conformal Prediction",
      "lost-in-the-middle": "Lost in the Middle"
    }
  }
};
