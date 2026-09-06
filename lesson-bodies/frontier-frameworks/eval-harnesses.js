// GENERATED from content/lessons/frontier-frameworks/eval-harnesses.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/frontier-frameworks/eval-harnesses/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "eval-harnesses": {
    "level": "advanced",
    "body": {
      "intuition": [
        "The first result in this lesson makes the rest of it necessary. Take one fixed set of model outputs, from a model whose true skill is 0.85 by construction, and score it four ways. Exact string match gives 0.22. Normalized match - lowercase, strip punctuation and whitespace - gives 0.83. Pass-at-1 gives 0.56 and pass-at-5 gives 0.86. Same outputs, same model, four numbers spanning almost the entire range. THE SCORER IS THE EVAL, and 'what did the model score' is an unanswerable question without it.",
        "The second is the same statistical point that governs any small evaluation, with the interval attached. At fifty items, the Wilson 95% confidence interval is about eleven points wide. A model that is genuinely four points better is ranked correctly only 67% of the time - barely better than a coin flip - so a comparison on a fifty-item suite is close to uninformative for effects of that size. That is a stronger claim than 'the number is noisy': the ORDERING is wrong a third of the time.",
        "The third and fourth are about the two ways an eval can be quietly wrong. Contamination inflates a score LINEARLY and leaves no signature - each leaked item contributes one minus the model's skill, so a 20% leak turns a true 0.70 into 0.76 with nothing in the output to indicate it. And a biased judge can be worse than noisy: a judge with both position and length bias picked the correct answer 77% of the time when it was shown first, which looks like a competent judge - and swap-averaging revealed that it actually preferred the WRONG BUT LONGER answer 41.5% of the time. The naive number was hiding the bias, not reflecting it."
      ],
      "math": [
        {
          "h": "The scorer determines the score",
          "paras": [
            "Four scorers applied to one fixed set of outputs from a model with known skill.",
            "The spread is nearly the whole range."
          ],
          "tex": "\\text{true skill } 0.85 \\;\\longrightarrow\\; \\underbrace{0.22}_{\\text{exact match}},\\; \\underbrace{0.83}_{\\text{normalized}},\\; \\underbrace{0.56}_{\\text{pass@1}},\\; \\underbrace{0.86}_{\\text{pass@5}}",
          "texNote": "Exact match punishes formatting rather than measuring capability; normalization recovers the underlying skill; and pass-at-k is answering a different question entirely - whether ANY of k samples succeeds, which is the right metric for a system that can verify and retry and the wrong one for a single-shot product. So pin the scorer FIRST, version it with the results, and treat a scorer change as invalidating every comparison made across it."
        },
        {
          "h": "Small suites get the ordering wrong",
          "paras": [
            "The Wilson interval is the right binomial interval at small n, and it is wide.",
            "The consequence for comparisons is worse than for point estimates."
          ],
          "tex": "\\text{Wilson 95\\% CI at } N{=}50 \\approx \\pm 11\\text{pt}, \\qquad \\Pr[\\text{correct ranking of a 4pt gap}] = 0.67",
          "texNote": "Two thirds is barely above chance for a decision that is usually presented as a finding. The Wilson interval is preferred over the normal approximation here because it behaves correctly near zero and one, where small evals often sit. And the practical rule follows: size the suite from the effect you need to detect, and if you cannot, report the interval and say explicitly that differences below some size are not resolvable."
        },
        {
          "h": "Contamination is linear and leaves no trace",
          "paras": [
            "A leaked item is answered correctly regardless of skill, so it contributes the gap between one and the skill.",
            "The inflation is smooth and invisible in the score itself."
          ],
          "tex": "\\text{observed} = s + \\rho\\,(1-s), \\qquad \\rho{=}0.2,\\; s{=}0.70 \\;\\Rightarrow\\; 0.76",
          "texNote": "There is no signature in the score - no bimodality, no odd distribution, nothing that would make a reader suspicious. It is a straight line in the leaked fraction, which means the only defences are external: a private held-out set, freshly constructed items, or an n-gram overlap check against the training corpus where you can see it. Detecting it after the fact from the number alone is not possible."
        },
        {
          "h": "Position bias cancels under swapping; length bias does not",
          "paras": [
            "Position bias is antisymmetric in the ordering, so averaging both orders removes it exactly.",
            "Length bias is symmetric in the ordering, so it survives."
          ],
          "tex": "\\tfrac{1}{2}\\big[P(A \\mid AB) + P(A \\mid BA)\\big] \\;\\Rightarrow\\; \\text{position cancels}, \\qquad 0.77 \\;\\longrightarrow\\; 0.415",
          "texNote": "The naive 77% looked like a competent judge and was mostly the correct answer being shown first. Swap-averaging did not merely reduce noise - it UNMASKED the real preference, which was for the wrong but longer answer at 41.5%. A length-free judge swap-averages to a fair 50%, confirming the machinery. So swapping is mandatory and it is not sufficient: length bias needs rubric scoring or explicit length control on top."
        }
      ],
      "code": [
        {
          "h": "★ The scorer is the eval",
          "paras": [
            "One fixed set of outputs, four scorers, four incompatible conclusions."
          ],
          "code": "# SAME model outputs. TRUE skill 0.85 by construction.\n#   exact string match     0.22   <- punishes FORMATTING, not capability\n#   normalized match       0.83   <- lowercase/strip/collapse -> recovers\n#                                    the actual skill\n#   pass@1                 0.56   \\  a DIFFERENT QUESTION: does ANY of k\n#   pass@5                 0.86   /  samples succeed?\n#\n# ★ So \"what did the model score\" is UNANSWERABLE without the scorer.\n#   PIN IT FIRST, version it with the results, and treat a scorer\n#   change as INVALIDATING every comparison made across it.\n\n# WHICH SCORER IS RIGHT depends on the consumer, not on taste:\n#   single-shot product        -> pass@1 (or normalized match)\n#   generate-and-VERIFY system -> pass@k is the right question, because\n#                                 you can afford to sample and check\n#   free-form answers          -> normalized match, or a judge with the\n#                                 corrections below\n#   ⚠ exact match is almost never what you want, and it is the default\n#     in more harnesses than you would expect.\n\n# ⚠ AND YOUR HARNESS HAS BUGS TOO. While building this, a repeated\n#   8-prompt suite let the mock model's per-prompt cache QUANTIZE the\n#   realized skill to all-known - producing a clean, plausible, and\n#   completely fake 1.00. The fix was DISTINCT prompts.\n#   ★ An eval that returns a suspiciously round number is a bug\n#     signature, not a result.",
          "caption": "Four scorers, one set of outputs, scores from 0.22 to 0.86 — which is why the scorer must be pinned and versioned before any comparison means anything."
        },
        {
          "h": "Noise, contamination, and debiasing a judge",
          "paras": [
            "Three failure modes: one statistical, one invisible, one that swapping partly fixes."
          ],
          "code": "# 1. NOISE - use the WILSON interval, not the normal approximation\n#    (it behaves correctly near 0 and 1, where small evals often sit):\n#      N=50  ->  95% CI ~ +-11 points\n#      a genuinely 4pt-better model is ranked CORRECTLY only 67% of\n#      the time. Not \"noisy\" - the ORDERING is wrong a third of the\n#      time, on a comparison usually presented as a finding.\n\n# 2. CONTAMINATION - linear, and INVISIBLE in the score:\n#      observed = skill + leak_frac * (1 - skill)\n#      20% leak turns a true 0.70 into 0.76\n#    ★ No signature. No bimodality, nothing odd in the distribution.\n#      Defences are all EXTERNAL: a private held-out set, freshly\n#      written items, or n-gram overlap against the corpus you can see.\n\n# 3. ★ JUDGE BIAS - and swapping does more than reduce noise:\n#      naive (correct answer shown FIRST)        0.770\n#      swap-averaged over BOTH orderings         0.415\n#    Position bias is ANTISYMMETRIC in the ordering, so averaging\n#    cancels it EXACTLY - and what it revealed is that the judge\n#    actually PREFERS THE WRONG BUT LONGER ANSWER. The 0.77 was hiding\n#    the bias, not reflecting competence.\nscore = 0.5*(judge(a, b) + judge(b, a))     # mandatory, ~free\n#    ⚠ LENGTH bias is SYMMETRIC in the ordering, so it SURVIVES\n#      swapping. It needs rubric scoring or explicit length control.\n#    ✔ SANITY CHECK: a length-free judge swap-averages to a fair 0.500,\n#      which confirms the machinery rather than the conclusion.",
          "caption": "Swap-averaging cancels position bias exactly because it is antisymmetric — and in doing so it unmasked a judge that preferred the wrong, longer answer."
        }
      ],
      "useCases": [
        "Building an internal evaluation suite, where pinning and versioning the scorer is the decision that makes every later comparison meaningful.",
        "Comparing two models or two prompts, where suite size determines whether the comparison resolves the effect you care about at all.",
        "Reading a published evaluation critically, where the scorer, the suite size and the contamination check are the three things most often missing.",
        "Using an LLM judge responsibly, where swap-averaging is mandatory and free and length control is the part it does not fix."
      ],
      "pitfalls": [
        "Reporting a score without the scorer. Identical outputs scored 0.22, 0.83, 0.56 and 0.86 under four scorers, so the number alone carries no information.",
        "Using exact string match by default. It punishes formatting rather than measuring capability, and it is the default in more harnesses than people expect.",
        "Quoting pass-at-k as if it answered the same question as pass-at-1. It asks whether any of k samples succeeds, which is right for a verify-and-retry system and wrong for a single-shot product.",
        "Drawing conclusions from a fifty-item suite. The Wilson interval is about eleven points wide there, and a genuinely four-point-better model is ranked correctly only two thirds of the time.",
        "Expecting to detect contamination from the score. It is linear in the leaked fraction and leaves no signature - the defences are all external.",
        "Using an LLM judge without swap-averaging. Position bias is antisymmetric so averaging both orders cancels it exactly, and it costs one extra call.",
        "Believing swap-averaging fixes a judge. Length bias is symmetric in the ordering and survives it, which is why rubric scoring or length control is still needed.",
        "Trusting a suspiciously clean result from your own harness. A repeated-prompt suite produced a fake 1.00 here, and a round number is a bug signature rather than a finding."
      ],
      "connections": [
        {
          "ref": "llm-systems/llm-eval",
          "text": "The instrument-level treatment - which metric can move in response to which change, and the diagnostic question of what a metric would fail to detect."
        },
        {
          "ref": "agentic-ai/agent-evaluation",
          "text": "The same statistics applied to agents, where a five-task suite mis-ranks a better agent half the time and a holistic judge shows a length bias."
        },
        {
          "ref": "ml-theory/cross-validation",
          "text": "Where selection over noise inflates a reported result, which is the mechanism behind tuning optimism and the reason for a held-out slice."
        },
        {
          "ref": "ml-theory/evaluation-metrics",
          "text": "The underlying discipline - what a metric expresses, why intervals are not optional, and how a threshold encodes a cost decision."
        },
        {
          "ref": "frontier-frameworks/staying-current",
          "text": "Why headline results regress: best-of-many-configurations on a noisy metric produces a gap that is mostly selection, and it shrinks on replication."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What did four scorers do to one set of outputs?",
          "a": "Exact match 0.22, normalized 0.83, pass-at-1 0.56, pass-at-5 0.86 - from a model whose true skill was 0.85 by construction."
        },
        {
          "q": "What follows from that?",
          "a": "The scorer is the eval. Pin it first, version it with the results, and treat a scorer change as invalidating comparisons made across it."
        },
        {
          "q": "What is wrong with exact string match?",
          "a": "It punishes formatting rather than measuring capability - here it reported 0.22 for a model with 0.85 skill."
        },
        {
          "q": "When is pass-at-k the right metric?",
          "a": "When the system can sample several times and verify, so any success counts. For a single-shot product it answers a different question."
        },
        {
          "q": "How wide is the interval at fifty items?",
          "a": "About eleven points, using the Wilson interval - which is preferred because it behaves correctly near zero and one."
        },
        {
          "q": "What does that do to a comparison?",
          "a": "A genuinely four-point-better model is ranked correctly only 67% of the time, so the ordering is wrong a third of the time."
        },
        {
          "q": "How does contamination affect a score?",
          "a": "Linearly - observed equals skill plus leaked fraction times one minus skill, so a 20% leak turns a true 0.70 into 0.76."
        },
        {
          "q": "Can you detect it from the score?",
          "a": "No. There is no signature, so the defences are external: a private held-out set, fresh items, or n-gram overlap against the corpus."
        },
        {
          "q": "What did the naive judge report?",
          "a": "77% for the correct answer - when the correct answer was shown first, which looked like competence."
        },
        {
          "q": "What did swap-averaging reveal?",
          "a": "41.5% - the judge actually preferred the wrong but longer answer. The naive number was hiding the bias rather than reflecting quality."
        },
        {
          "q": "Why does swapping cancel position bias exactly?",
          "a": "Position bias is antisymmetric in the ordering, so averaging the two orders removes it. It costs one extra call."
        },
        {
          "q": "Why does length bias survive?",
          "a": "It is symmetric in the ordering, so averaging does not touch it - it needs rubric scoring or explicit length control."
        }
      ],
      "standard": [
        {
          "q": "Why is the scorer the most important choice in an evaluation?",
          "a": "BECAUSE IT DETERMINES THE NUMBER MORE THAN THE MODEL DOES, and the measurement makes that concrete rather than rhetorical. THE EXPERIMENT: take one fixed set of outputs from a model whose true skill is 0.85 by construction, and score it four ways. Exact string match reports 0.22. Normalized match - lowercase, strip punctuation, collapse whitespace - reports 0.83. Pass-at-1 reports 0.56. Pass-at-5 reports 0.86. Same outputs, same model, four numbers covering almost the whole range. WHAT EACH IS ACTUALLY MEASURING. Exact match measures whether the output string matched a reference exactly, which mostly measures FORMATTING - and a model that is right but adds a period, capitalizes differently, or wraps the answer in a sentence is scored wrong. That is why it reported 0.22 for a model with 0.85 skill, and it is the default in more harnesses than people expect. Normalized match removes the formatting sensitivity and recovers the underlying skill. Pass-at-k asks a genuinely different question: does ANY of k samples succeed? That is the right question when the system can sample repeatedly and verify - a code task with tests, a structured extraction you can validate - and the wrong question for a single-shot product where the user sees one answer. SO 'WHAT DID THE MODEL SCORE' IS UNANSWERABLE without the scorer, and any comparison across different scorers is meaningless. THE PRACTICAL RULES. Pin the scorer before running anything, version it alongside the results, and treat a scorer change as invalidating every comparison made across it - which means a harness upgrade can silently break your historical trend. Choose it from the CONSUMER: what does the downstream system actually need to be true? If a human reads the answer, formatting tolerance is appropriate. If a parser consumes it, format matters and exact match may genuinely be right. If you can verify and retry, pass-at-k is the honest metric and reporting pass-at-1 understates the system. THE FAILURE THIS PREVENTS: two teams reporting different numbers for the same model and concluding one of them made a mistake, when both were correct under different scorers. Or a model appearing to regress after a harness upgrade changed the normalization. Both are common and both are avoided by treating the scorer as part of the result rather than as an implementation detail. AND A WARNING ABOUT YOUR OWN HARNESS, which came out of building this one: a repeated-prompt suite caused the mock model's per-prompt caching to quantize the realized skill, producing a clean, plausible, entirely fake 1.00. The fix was distinct prompts. A suspiciously round number from an eval is a bug signature rather than a finding, and checking your harness against a model of KNOWN skill is the cheapest way to catch it.",
          "deepDive": {
            "q": "Design an evaluation harness for your own product. What are the decisions?",
            "a": "SEVEN DECISIONS, AND THE FIRST TWO DETERMINE WHETHER THE REST MEANS ANYTHING. DECISION 1 - THE SCORER, pinned and versioned before anything runs. Choose it from the consumer: what must be true for the downstream system to work? A parser consuming the output makes format part of correctness; a human reading it does not. If the product can verify and retry, pass-at-k is the honest metric; if it is single-shot, pass-at-1 is. Write the scorer down, version it with the results, and make a scorer change an explicit event that invalidates prior comparisons - because it silently will anyway. DECISION 2 - THE SUITE SIZE, from the effect you need to detect. At fifty items the Wilson interval is about eleven points and a four-point difference is ranked correctly two thirds of the time, so a small suite does not merely blur the result - it inverts the ordering often enough to make the decision uninformed. Decide the smallest difference worth acting on, then size for it. If you cannot afford that size, say so explicitly and report the interval rather than presenting an underpowered comparison as a finding. DECISION 3 - THE ITEMS, sampled from real traffic and stratified by request type. This is the only set whose distribution is guaranteed to match what you serve. Supplement with synthetic items for coverage, knowing they are systematically easier, and include the cases that break things: ambiguous inputs, absent answers, adversarial phrasings, and the second-most-common language of your users. DECISION 4 - CONTAMINATION CONTROL. Keep the suite PRIVATE, since a published set enters crawls and a future model will have seen it. Prefer freshly written items over public benchmarks where you can afford them. And where you can inspect the training corpus, run an n-gram overlap check - because contamination is linear and invisible in the score, so the number itself will never warn you. DECISION 5 - THE JUDGE, if free-form outputs require one. Swap-average over both orderings, which is mandatory and costs one extra call and cancels position bias exactly. Report answer LENGTH alongside every result, because length bias survives swapping. Validate the judge against human labels on a subset and report the agreement, remembering the human-human ceiling. And version the rubric, since judge scores move with its wording. DECISION 6 - THE HELD-OUT SLICE, touched rarely. A suite you tune against repeatedly stops being an unbiased estimate through pure selection - the same mechanism that inflates any repeatedly-optimized benchmark - so keeping a portion untouched is what preserves an honest number for the decisions that matter. DECISION 7 - THE REPORTING FORMAT: score with an interval, the scorer version, the suite version and size, and the failure breakdown by category. The last one is the most useful for improving the product and the least often included. AND THE MAINTENANCE COMMITMENT, which is a decision people make implicitly and should make explicitly: sample new production items in periodically, because the query distribution drifts and a fixed suite quietly becomes a measure of last year's product. Add every production failure as a permanent case, which is how the suite grows into a description of your real failure modes rather than your imagined ones."
          }
        },
        {
          "q": "How do you use an LLM judge without being misled by it?",
          "a": "BY DEBIASING WHAT CAN BE DEBIASED AND MEASURING WHAT CANNOT - and the measurement here shows that the naive number can be actively misleading rather than merely noisy. THE RESULT. A judge with both position and length bias picked the correct answer 77% of the time when the correct answer was shown first. That looks like a reasonably competent judge. Swap-averaging over both orderings gave 41.5% - meaning the judge actually PREFERRED THE WRONG BUT LONGER answer. The naive 77% was not a noisy estimate of competence; it was position bias masquerading as competence. WHY SWAPPING WORKS EXACTLY. Position bias is ANTISYMMETRIC in the ordering - whatever the judge gains from being shown first in one order, it loses in the other - so averaging the two removes it precisely rather than approximately. That is a structural property, not a variance reduction, which is why one extra call is enough and why it is mandatory rather than advisable. WHY LENGTH BIAS SURVIVES. It is SYMMETRIC in the ordering: the longer answer is preferred regardless of where it appears, so averaging over positions does nothing to it. That is why the swap-averaged number revealed the length preference rather than removing it - and why length control is a separate intervention. The fixes are rubric scoring, which replaces one holistic judgement with several specific checks that have no length preference, or explicit length control, matching or regressing out the difference. THE SANITY CHECK THAT VALIDATES THE MACHINERY: a length-free judge swap-averages to a fair 50%. That is worth running, because it confirms the debiasing procedure is doing what you think rather than introducing its own artefact - and it is the kind of control that distinguishes a measurement from a hope. WHAT ELSE I WOULD DO. Validate the judge against HUMAN labels on a subset and report the agreement, remembering that the ceiling is human-human agreement of roughly 70 to 75%. Report answer length alongside every win rate, always, since it is the confound most likely to explain a result. Avoid a judge from the same family as a candidate, where self-preference applies. And version the rubric, because judge scores move substantially with its wording and a rubric change invalidates comparisons across it. THE FRAMING I WOULD KEEP: a judge is an instrument with measurable properties, and the properties are not all fixable. Position bias is fixable exactly and cheaply. Length bias is not fixable by the same trick and must be measured and controlled. Self-preference is avoidable by choice of judge. Reporting a win rate without stating which of these were handled is reporting an unknown instrument's output - and as this measurement shows, the unhandled version can point in the opposite direction from the truth."
        },
        {
          "q": "Why can't you detect contamination from the results?",
          "a": "BECAUSE ITS EFFECT IS LINEAR AND SMOOTH, SO IT LEAVES NO SIGNATURE ANYWHERE IN THE OUTPUT. THE MECHANISM. A contaminated item is one the model has effectively memorized, so it is answered correctly regardless of the model's actual skill. That item therefore contributes the difference between one and the skill. Across a suite with a leaked fraction, the observed score is the skill plus the leaked fraction times one minus the skill - a straight line. A 20% leak turns a true 0.70 into 0.76. WHY THAT IS HARD. There is nothing anomalous to find. The score distribution is not bimodal, the per-item pattern looks ordinary, and the inflated number sits in a completely plausible range - 0.76 is not a suspicious result for a model that could genuinely score it. Any statistical test you might apply to the results is looking for a signature that the mechanism does not produce. THE DEFENCES, all external to the score. A PRIVATE suite, never published, so it cannot enter a crawl. FRESHLY CONSTRUCTED items, written after the model's training cutoff where you know it. N-GRAM OVERLAP against the training corpus, when you can see the corpus - which for open-weight models with published data is sometimes possible and for API models is not. And REPORTING THE CLEAN SUBSET separately when you can identify contaminated items, since the difference between the full and clean scores IS the contamination's effect. THE TIME-DEPENDENCE that makes this worse and is easy to overlook: the same benchmark is clean for a model trained before publication and contaminated after. So a benchmark's validity decays, and a comparison between an older and a newer model on a public benchmark is partly a comparison of training dates rather than of capability. That is a structural problem with public leaderboards rather than a mistake anyone made. WHAT I WOULD ACTUALLY DO for a product evaluation: build the suite from your own traffic, keep it private, and rotate in new items periodically. Those three practices remove most of the exposure, and they are things you would do anyway for distribution reasons. For reading OTHERS' results: treat public-benchmark numbers as an upper bound, weight results on freshly-constructed or private sets much more heavily, and be especially sceptical when a model performs unusually well on an older, popular benchmark relative to its performance elsewhere. AND THE HONEST SUMMARY: contamination is a VALIDITY failure rather than a quality one. It does not make the model worse; it makes the number mean something other than what it appears to. That distinction matters because the instinct on discovering contamination is to distrust the model, and the correct response is to distrust the measurement."
        },
        {
          "q": "How large should an evaluation suite be?",
          "a": "LARGE ENOUGH TO RESOLVE THE DIFFERENCE YOU INTEND TO ACT ON, and the argument is about ORDERING rather than about precision, which makes it much sharper than the usual plea for bigger samples. THE STANDARD FRAMING is that a small sample gives a wide interval - at fifty items the Wilson 95% interval is about eleven points - and people accept that and proceed. THE STRONGER FRAMING is what that does to a comparison, which is what evaluations are actually for. A model that is genuinely four points better is ranked CORRECTLY only 67% of the time on a fifty-item suite. So a third of the time you conclude the worse model is better, and you cannot tell which case you are in. That is not a precision problem; it is a decision that carries almost no information while looking like a finding. WHY THE WILSON INTERVAL rather than the normal approximation: small evaluations often produce scores near zero or one, where the normal approximation misbehaves badly - it can produce intervals extending past the valid range. Wilson is well-behaved there and is the right default for binomial proportions at small n. HOW I WOULD SIZE IT. Decide the smallest difference worth acting on. If a three-point difference would not change any decision, do not size for it. Then choose n so that difference is detectable at the confidence you need - and remember that comparing two models is a comparison of two estimates, so the relevant variance is larger than for a single score. WHAT BUYS MORE THAN A BIGGER SUITE: PAIRING. Run both models on the SAME items and compare per-item outcomes. Item difficulty is the dominant variance component - some items are hard for everything - and pairing removes it entirely. That is frequently worth more than doubling n and it costs nothing you were not already doing, so it should be the default rather than the exception. WHAT TO DO WHEN YOU CANNOT AFFORD IT, since evaluation is genuinely expensive: report the interval, state that differences below some size are not resolvable by this suite, and do not present an underpowered comparison as a result. That is a legitimate position honestly stated, and it is much better than the alternative, which is a confident ranking that is wrong a third of the time. AND WHEN READING OTHERS' EVALUATIONS: suite size and whether intervals were reported are the first two things to check, because their absence tells you how much weight the number can carry. Combined with the selection effect - a result reported as the best of several configurations regresses on replication - an unqualified small-sample gap is close to uninterpretable, which is a strong claim and I think the measurements support it."
        },
        {
          "q": "What should an eval harness give you beyond a number?",
          "a": "PROVENANCE, DECOMPOSITION AND REPRODUCIBILITY - because the number alone cannot be acted on and often cannot even be compared to itself six months later. PROVENANCE, which the scorer result makes non-negotiable. Every reported score should carry: which scorer and its version, which suite and its version and size, which model and its exact settings including temperature and any quantization, and the date. Without the scorer version, a harness upgrade that changes normalization looks like a model regression. Without the suite version, adding items to the suite looks like a quality change. Both of those are common and both waste days. DECOMPOSITION - a per-category breakdown rather than a single aggregate. This is where the actionable information is: an aggregate of 0.76 tells you nothing about what to fix, and a breakdown showing 0.95 on extraction and 0.40 on multi-hop tells you exactly where to work. It also protects against the aggregate hiding a badly failing minority, which is the same structural blindness that recurs across this curriculum. UNCERTAINTY, attached to every number, with paired comparisons for A-versus-B. Without it, a reader cannot tell a real difference from noise, and the mis-ranking result says they will often be wrong. FAILURE EXAMPLES, not just failure counts. Being able to read the actual outputs that failed is the highest-information activity available for improving a system, and a harness that only emits aggregate scores makes it impossible. I would want the harness to save every failing input, output and expected value by default. REPRODUCIBILITY: fixed seeds where sampling is involved, pinned model versions, and enough recorded state that a result from three months ago can be regenerated. Model endpoints change underneath you, so an unpinned historical comparison may be comparing two different models. AND THE PROPERTY THAT MATTERS MOST OPERATIONALLY: the harness should be cheap enough to run on every change. An evaluation that takes a day is run before releases; one that takes minutes is run on every commit and catches regressions when they are one change old rather than fifty. That argues for a fast tier of cheap verifiable items running constantly, and a slower expensive tier with judges and long-form outputs running less often - the same tiering as any test suite. WHAT I WOULD CHECK ABOUT THE HARNESS ITSELF, given what happened while building this one: run it against a model of KNOWN skill and confirm it reports that skill. A repeated-prompt suite here produced a clean, plausible, entirely fake 1.00 because per-prompt caching quantized the realized skill. An eval harness is code, it has bugs, and a suspiciously round number is a bug signature rather than a finding."
        },
        {
          "q": "How does this lesson fit the module's thesis?",
          "a": "IT IS THE MODULE APPLIED TO THE INSTRUMENT RATHER THAN THE SYSTEM, and it separates a durable practice from a perishable tooling landscape. Evaluation harnesses are libraries with versions, and the benchmark landscape turns over even faster than the model landscape - suites saturate, get contaminated, and get replaced. What does not turn over is the practice: pin the scorer, size for the effect, keep the suite private, debias the judge where the bias is structurally removable and measure it where it is not. Those apply to any harness and any benchmark, including ones that do not exist yet. THE RESULT THAT CARRIES FURTHEST is the first one. Identical outputs scoring 0.22, 0.83, 0.56 and 0.86 under four scorers means the scorer is not an implementation detail but the definition of the measurement. That reframes a class of confusing experiences - two teams reporting different numbers for one model, a model appearing to regress after a harness upgrade - as the same predictable thing rather than as mistakes. THE SHARPEST is the judge result, because the naive number pointed in the OPPOSITE direction from the truth. A judge that looked 77% competent was, once position bias was cancelled, preferring the wrong-but-longer answer at 41.5%. Swap-averaging is not noise reduction; it is an exact cancellation of an antisymmetric bias, and it UNMASKED something the naive measurement hid. Meanwhile length bias is symmetric and survives, which is why the same trick does not fix it. Knowing WHICH biases a correction removes, and why, is the difference between a debiased instrument and a differently-biased one. AND THE HABIT the whole module keeps installing appears here too: check your own instrument. A repeated-prompt suite produced a fake 1.00 through caching, and the reflex it teaches - run the harness against a model of known skill, treat a suspiciously round number as a bug signature - is the same reflex as measuring the compile cache before believing a speedup, and checking the data pipeline before believing a chance-level accuracy. In every case the number was produced by the instrument rather than by the system, and the only defence is a control that would have revealed it."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "★ THE SCORER IS THE EVAL",
        "back": "One fixed set of outputs, TRUE skill 0.85: exact match **0.22** · normalized **0.83** · pass@1 **0.56** · pass@5 **0.86**. \"What did the model score\" is unanswerable without the scorer. Pin it, version it, treat a change as invalidating comparisons."
      },
      {
        "type": "intuition",
        "front": "Choose the scorer from the CONSUMER",
        "back": "Single-shot product → pass@1 / normalized. Generate-and-VERIFY system → pass@k is the honest question. Parser downstream → format is part of correctness. ⚠ Exact match punishes formatting and is the default in more harnesses than you'd expect."
      },
      {
        "type": "formula",
        "front": "★ Small suites invert the ORDERING",
        "back": "Wilson 95% CI at N=50 ≈ ±11 pts, and a genuinely 4-pt-better model is ranked correctly only **67%** of the time. Not \"noisy\" — wrong a third of the time, on a comparison presented as a finding."
      },
      {
        "type": "intuition",
        "front": "Use WILSON, not the normal approximation",
        "back": "Small evals often sit near 0 or 1, where the normal approximation misbehaves and can produce intervals outside the valid range. Wilson is well-behaved there — the right default for binomial proportions at small n."
      },
      {
        "type": "intuition",
        "front": "Pairing beats doubling n",
        "back": "Run both models on the SAME items and compare per-item outcomes. Item difficulty is the dominant variance component and pairing removes it entirely — costs nothing you weren't already doing."
      },
      {
        "type": "formula",
        "front": "★ Contamination is LINEAR and invisible",
        "back": "observed = skill + ρ(1−skill). A 20% leak turns a true 0.70 into 0.76. **No signature** — not bimodal, nothing odd. Defences are all EXTERNAL: private suite, fresh items, n-gram overlap against the corpus."
      },
      {
        "type": "intuition",
        "front": "Contamination is a VALIDITY failure",
        "back": "It doesn't make the model worse; it makes the NUMBER mean something else. So the correct response is to distrust the measurement, not the model. And it's time-dependent: a benchmark is clean before publication and contaminated after."
      },
      {
        "type": "formula",
        "front": "★ Swap-averaging UNMASKED the judge",
        "back": "Naive (correct shown first) **0.770** → swap-averaged **0.415**. The judge actually preferred the WRONG BUT LONGER answer. The 0.77 was position bias masquerading as competence — not a noisy estimate of it."
      },
      {
        "type": "formula",
        "front": "Why swapping works EXACTLY",
        "back": "Position bias is ANTISYMMETRIC in the ordering, so ½[P(A|AB) + P(A|BA)] cancels it precisely — a structural property, not variance reduction. One extra call. Mandatory, not advisable."
      },
      {
        "type": "pitfall",
        "front": "LENGTH bias SURVIVES swapping",
        "back": "It's SYMMETRIC in the ordering — the longer answer wins wherever it appears. Needs rubric scoring (several specific checks, no length preference) or explicit length control. Report answer length beside every win rate."
      },
      {
        "type": "intuition",
        "front": "The control that validates the machinery",
        "back": "A length-free judge swap-averages to a fair **0.500**. Running it confirms the debiasing does what you think rather than introducing its own artefact — the difference between a measurement and a hope."
      },
      {
        "type": "pitfall",
        "front": "★ Your harness has bugs too",
        "back": "A repeated 8-prompt suite let per-prompt caching QUANTIZE the mock model's skill to all-known → a clean, plausible, entirely fake **1.00**. Run the harness against a model of KNOWN skill. A suspiciously round number is a bug signature, not a result."
      }
    ],
    "refs": [
      {
        "title": "Zheng et al. (2023), Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena",
        "url": "https://arxiv.org/abs/2306.05685"
      },
      {
        "title": "Chen et al. (2021), Evaluating Large Language Models Trained on Code (pass@k)",
        "url": "https://arxiv.org/abs/2107.03374"
      },
      {
        "title": "Brown, Cai & DasGupta (2001), Interval Estimation for a Binomial Proportion",
        "url": "https://projecteuclid.org/euclid.ss/1009213286"
      },
      {
        "title": "Sainz et al. (2023), NLP Evaluation in Trouble: On the Need to Measure LLM Data Contamination",
        "url": "https://arxiv.org/abs/2310.18018"
      },
      {
        "title": "EleutherAI, Language Model Evaluation Harness",
        "url": "https://github.com/EleutherAI/lm-evaluation-harness"
      }
    ],
    "demos": [
      "classification-metrics",
      "calibration",
      "conformal",
      "cross-validation"
    ],
    "demoTitles": {
      "classification-metrics": "Classification Metrics",
      "calibration": "Model Calibration",
      "conformal": "Conformal Prediction",
      "cross-validation": "Cross-Validation"
    }
  }
};
