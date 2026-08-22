// GENERATED from content/lessons/frontier-frameworks/staying-current.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/frontier-frameworks/staying-current/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "staying-current": {
    "level": "advanced",
    "body": {
      "intuition": [
        "This module has argued throughout that mechanisms outlive tools, and the capstone is where that stops being a preference and becomes a calculation. Model knowledge as a stock that you add to by studying and lose to forgetting: it settles where the two balance, at study rate over decay rate. Principles decay slowly - a half-life measured in years - and tool trivia decays fast, measured in months. Under the modelled half-lives, an hour spent on principles builds about 7.2 times more retained knowledge than an hour spent on tool specifics.",
        "The obvious conclusion from that ratio would be to study only principles, and the model says otherwise once you add the thing that makes tools different: their value SATURATES. You need to be fluent enough to ship, and past that, more tool depth buys very little - whereas principle depth keeps compounding. Putting a saturating return on one side and a scaling return on the other gives an optimum around 70% principles and 30% tools. Principle-HEAVY, not principle-only, and the second half of that is the part people get wrong in both directions.",
        "The other two results are about deciding what to believe. A method with a TRUE effect of ZERO, reported as the best of thirty configurations, showed a +4.1 point improvement - and replicated at +0.1. That gap is pure selection, the maximum over noisy draws, and it means a headline's size tells you as much about how many knobs were tuned as about the method. Requiring an independent second positive before adopting raised the precision of the adopted set from 48% to 84%, at a cost of 12 points of recall - which is the barbell: track everything cheaply, commit only to what replicates."
      ],
      "math": [
        {
          "h": "Knowledge is a stock with a decay rate",
          "paras": [
            "You add by studying and lose by forgetting, so the retained amount settles where the two balance.",
            "The decay rate is what separates a principle from a tool detail."
          ],
          "tex": "\\frac{dS}{dt} = u - \\lambda S \\;\\Rightarrow\\; S^{*} = \\frac{u}{\\lambda}, \\qquad \\frac{S^{*}_{\\text{principle}}}{S^{*}_{\\text{tool}}} = \\frac{\\lambda_{\\text{tool}}}{\\lambda_{\\text{principle}}} = \\frac{60}{8} \\approx 7.2",
          "texNote": "Steady-state stock is inversely proportional to the decay rate, so with half-lives of 60 months against 8, an hour on principles yields about 7.2 times the retained knowledge of an hour on tool trivia. That is the whole argument for mechanism-first learning, expressed as arithmetic rather than as taste - and it is why this module taught vLLM without vLLM and Optax without Optax."
        },
        {
          "h": "Why the answer is 70/30 and not 100/0",
          "paras": [
            "Tool knowledge SATURATES - you need enough to ship and more adds little.",
            "Principle depth does not saturate, so the optimum is interior."
          ],
          "tex": "V = \\underbrace{f_{\\text{sat}}(t)}_{\\text{tools: needed, then flat}} \\times \\underbrace{g(p)}_{\\text{principles: keeps scaling}} \\;\\Rightarrow\\; \\text{optimum} \\approx 70\\%\\ p / 30\\%\\ t",
          "texNote": "The saturation is what makes this a real optimum rather than a corner solution. Without it - with two symmetric scaling terms - the model returns a meaningless 50/50, which is exactly what the first version produced before tool sufficiency was modelled. So the interior optimum is a consequence of an asymmetry in the RETURNS, not of the decay rates alone, and getting to 30% tools is non-negotiable because you cannot ship on principles."
        },
        {
          "h": "Headlines regress because they are maxima over noise",
          "paras": [
            "Reporting the best of n configurations selects on noise as well as on effect.",
            "The expected inflation grows with the number of things tried."
          ],
          "tex": "\\mathbb{E}[\\max_n] \\approx \\sigma\\sqrt{2\\ln n}: \\quad \\text{true effect } 0 \\;\\longrightarrow\\; \\text{reported } +4.1\\text{pt} \\;\\longrightarrow\\; \\text{replicated } +0.1\\text{pt}",
          "texNote": "A method with no effect at all produced a 4.1-point headline purely by being the best of thirty tries. So the size of a reported gain is partly a measure of how many knobs were tuned, and the correction is to discount by that count - which papers rarely report - and to weight independent replications far more heavily than originals. This is the same selection mechanism as tuning optimism in cross-validation, appearing at the scale of a literature."
        },
        {
          "h": "A second independent positive buys precision",
          "paras": [
            "Requiring confirmation filters the adopted set at the cost of missing some real results.",
            "The gain is largest when genuinely good ideas are rare."
          ],
          "tex": "\\text{precision } 0.48 \\longrightarrow 0.84, \\qquad \\text{recall } -12\\text{pt}",
          "texNote": "Nearly doubling precision for twelve points of recall is a good trade whenever adoption is expensive - and adoption of an infrastructure change usually is, since it costs migration, training and a dependency. The mechanism is Bayesian: when the base rate of real effects is low, a single positive is weak evidence and a second independent one is strong. That is why the barbell works - tracking is cheap, committing is not."
        }
      ],
      "code": [
        {
          "h": "The allocation, and the honesty fix that produced it",
          "paras": [
            "The first model gave a non-answer, and the reason it did is the finding."
          ],
          "code": "# THE STOCK MODEL: dS/dt = study - decay*S  ->  S* = study/decay\n#   principles  half-life ~60 months\n#   tool trivia half-life ~8 months\n#   -> an hour on principles yields ~7.2x the RETAINED knowledge\n\n# ★ THE OBVIOUS CONCLUSION (\"study only principles\") IS WRONG, and the\n#   model only says so once you add the asymmetry that matters:\n#     TOOL value SATURATES - you need fluent-enough-to-ship, and past\n#       that more tool depth buys very little\n#     PRINCIPLE depth KEEPS SCALING\n#   -> optimum ~70% principles / 30% tools. Principle-HEAVY, not\n#      principle-ONLY. You cannot ship on principles.\n\n# ⚠ THE HONESTY FIX, and it is the real lesson here:\n#   the FIRST model used a symmetric geometric mean of two scaling\n#   terms. Steady stock is proportional to study rate, so the objective\n#   was symmetric and the optimum came out 50/50 - a meaningless\n#   non-answer dressed as a result.\n#   ★ A MODEL THAT RETURNS A NON-ANSWER IS TELLING YOU THE MODEL IS\n#     WRONG, NOT THAT THE QUESTION HAS NO ANSWER. Modelling tool\n#     SATURATION is what produced a real interior optimum - so the\n#     70/30 is a consequence of an asymmetry in RETURNS, not of the\n#     decay rates alone.\n\n# ★ THE DURABILITY SCORE, applied to THIS MODULE's own content:\n#     score = principle_content x (1 - churn_rate)\n#   DEEP (high durability):\n#     memory arithmetic (GB = params x bytes; KV = 2*L*h_kv*d*s*b)\n#     eval discipline (the scorer IS the eval; Wilson CIs; swap-averaging)\n#     roofline / arithmetic intensity; paging vs contiguous allocation\n#     the rank elbow; purity -> composable transforms\n#   SKIM (low durability):\n#     provider-API specifics, SDK surfaces, compiler FLAGS,\n#     current model names and leaderboard positions",
          "caption": "The first model's 50/50 non-answer was the informative failure — modelling tool saturation is what turned a symmetric objective into a real optimum."
        },
        {
          "h": "Deciding what to believe, and when to adopt",
          "paras": [
            "Two filters: discount the headline, and require a replication before committing."
          ],
          "code": "# ★ HEADLINES REGRESS - measured on a method whose TRUE effect is ZERO:\n#     reported as best-of-30-configs   +4.1 pt\n#     replicated                       +0.1 pt\n#   E[max of n noisy draws] ~ sigma*sqrt(2 ln n), so the reported size\n#   is partly a measure of HOW MANY KNOBS WERE TUNED.\n#\n#   THE QUESTIONS THAT DISCOUNT A CLAIM:\n#     how many configurations were tried?   (rarely reported)\n#     is the baseline TUNED, or a default?  (the usual asymmetry)\n#     COMPUTE-matched?                      (or is it just more compute)\n#     public benchmark => possible contamination (22-09)\n#     any independent replication?\n\n# ★ ADOPT-NOW vs WAIT - requiring an independent SECOND positive:\n#     precision of the adopted set  0.48 -> 0.84\n#     recall                        -12 pt\n#   Nearly doubling precision for 12 points of recall is a good trade\n#   whenever ADOPTION IS EXPENSIVE - and an infrastructure change is:\n#   migration, retraining people, a new dependency to maintain.\n#   The mechanism is Bayesian: when good ideas are RARE, one positive\n#   is weak evidence and a second independent one is strong.\n\n# ★ SO: THE BARBELL. Track everything cheaply; commit to what\n#   replicates.\n#     CHEAP  - skim broadly, note what exists, no commitment\n#     COSTLY - adopt only after independent confirmation, or after you\n#              reproduce the result on YOUR data\n#   The middle - adopting on a single impressive headline - is the\n#   expensive mistake, and it is the default behaviour.",
          "caption": "A true-zero method produced a +4.1 point headline by being the best of thirty tries — which is why the number of configurations tried is the first question to ask."
        }
      ],
      "useCases": [
        "Allocating your own learning time, which the stock model turns into an arithmetic question with a defensible answer rather than a matter of temperament.",
        "Deciding whether to adopt a new technique or dependency, where requiring an independent replication nearly doubles the precision of what you take on.",
        "Reading a paper or release announcement, where the number of configurations tried and the presence of a tuned baseline discount the headline before you read further.",
        "Deciding what to teach or document, where the durability score separates content worth writing carefully from content that will be wrong within a year."
      ],
      "pitfalls": [
        "Concluding from the 7.2 ratio that you should study only principles. Tool value saturates rather than being worthless, and you cannot ship on principles - the modelled optimum is 70/30.",
        "Taking a headline improvement at face value. A method with a true effect of zero reported +4.1 points as the best of thirty configurations, and replicated at +0.1.",
        "Ignoring how many things were tried. The expected inflation grows with the count, so a reported gain is partly a measure of tuning effort - and the count is rarely stated.",
        "Comparing against an untuned baseline. The asymmetry between a carefully tuned method and a default baseline accounts for a large share of reported gains.",
        "Adopting on a single positive result. Requiring an independent second raised adopted-set precision from 48% to 84% for twelve points of recall, which is a good trade when adoption is expensive.",
        "Treating a model that returns a non-answer as evidence that the question has none. The first allocation model gave a meaningless 50/50 because it was symmetric, and the fix was modelling saturation.",
        "Spending equal care on all learning. The durability score separates memory arithmetic and evaluation discipline, which stay true, from compiler flags and SDK surfaces, which do not."
      ],
      "connections": [
        {
          "ref": "frontier-frameworks/eval-harnesses",
          "text": "The measurement discipline this depends on - suite size, scorer choice and contamination are what make a replication meaningful rather than a second guess."
        },
        {
          "ref": "ml-theory/cross-validation",
          "text": "The same selection-over-noise mechanism at a smaller scale - tuning optimism from choosing the best of many configurations on a noisy metric."
        },
        {
          "ref": "interview-capstone/portfolio-capstone",
          "text": "Where the tuning-optimism result reappears as a take-home discipline, with the phantom gain isolated on a true-zero task."
        },
        {
          "ref": "mlops/ml-strategy",
          "text": "Adoption as an organizational decision, where the cost of a dependency and a migration is what makes the precision-over-recall trade worthwhile."
        },
        {
          "ref": "agentic-ai/agent-evaluation",
          "text": "The same statistics in another domain - small suites inverting rankings, and why the number of tasks decides whether a comparison carries information."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is the stock model of knowledge?",
          "a": "You add by studying and lose by forgetting, so retained knowledge settles at study rate over decay rate - inversely proportional to the decay rate."
        },
        {
          "q": "What ratio does that give?",
          "a": "With half-lives of 60 months for principles and 8 for tool trivia, an hour on principles yields about 7.2 times the retained knowledge."
        },
        {
          "q": "So should you study only principles?",
          "a": "No. Tool value saturates - you need fluent-enough-to-ship - while principle depth keeps scaling, which gives an optimum near 70/30."
        },
        {
          "q": "What made the first model fail?",
          "a": "It was symmetric, so the optimum came out 50/50 - a meaningless non-answer. Modelling tool saturation is what produced a real interior optimum."
        },
        {
          "q": "What does a non-answer from a model tell you?",
          "a": "That the model is wrong, not that the question has no answer. The symmetry was the bug."
        },
        {
          "q": "What did the true-zero method report?",
          "a": "+4.1 points as the best of thirty configurations, and +0.1 on replication. The gap is pure selection."
        },
        {
          "q": "Why does that happen?",
          "a": "The expected maximum of n noisy draws grows like sigma times the square root of two log n, so reporting the best of many selects on noise."
        },
        {
          "q": "What does the size of a headline partly measure?",
          "a": "How many knobs were tuned. The configuration count is rarely reported, which is why the discount has to be estimated."
        },
        {
          "q": "What did requiring a second positive buy?",
          "a": "Adopted-set precision from 48% to 84%, at a cost of twelve points of recall."
        },
        {
          "q": "When is that trade best?",
          "a": "When good ideas are rare and adoption is expensive - which describes most infrastructure changes, given migration and maintenance costs."
        },
        {
          "q": "What is the barbell strategy?",
          "a": "Track everything cheaply, commit only to what replicates. The middle - adopting on one impressive headline - is the expensive mistake."
        },
        {
          "q": "What is the durability score?",
          "a": "Principle content times one minus churn rate. It separates memory arithmetic and evaluation discipline from compiler flags and SDK surfaces."
        }
      ],
      "standard": [
        {
          "q": "How should you allocate learning time in a fast-moving field?",
          "a": "ROUGHLY 70% PRINCIPLES AND 30% TOOLS, AND THE MODEL IS WORTH SHOWING BECAUSE BOTH HALVES OF THAT ANSWER ARE NON-OBVIOUS. THE STOCK MODEL. Treat knowledge as a stock: you add to it by studying and lose it by forgetting, so what you retain settles where those balance, at study rate over decay rate. Steady-state stock is therefore INVERSELY proportional to the decay rate. With half-lives of about 60 months for principles and 8 for tool trivia, an hour spent on principles yields roughly 7.2 times the retained knowledge of an hour spent on tool specifics. That is the argument for mechanism-first learning as arithmetic rather than as taste. WHY THE ANSWER IS NOT 100% PRINCIPLES. Because tool value SATURATES. You need to be fluent enough to ship - to actually use the framework, read its errors, know its idioms - and past that point additional tool depth buys very little. Principle depth does not saturate; it keeps compounding, because a mechanism understood more deeply explains more situations. Putting a saturating return against a scaling one produces an interior optimum, around 70/30. THE HONESTY NOTE THAT MATTERS MOST HERE. The first version of this model gave 50/50 - a meaningless non-answer - because it used a symmetric objective in which steady stock was simply proportional to study rate on both sides. A symmetric objective has a symmetric optimum, so the model was answering a question about its own construction rather than about learning. Modelling tool SATURATION is what produced a real optimum, which means the 70/30 comes from an asymmetry in RETURNS rather than from the decay rates alone. AND THE GENERAL LESSON: a model that returns a non-answer is telling you the model is wrong, not that the question has no answer. WHAT THIS LOOKS LIKE IN PRACTICE. The durable half is mechanisms: memory arithmetic, the roofline argument, why paging beats contiguous allocation, why purity enables composable transforms, what a rank constraint means, and the evaluation discipline - the scorer being the eval, interval widths, swap-averaging. Those have been true for years and will stay true. The perishable half is API surfaces, SDK versions, compiler flags, current model names and leaderboard positions - and you need enough of it to work, refreshed continuously and cheaply. THE PRACTICAL SCHEDULE I would suggest: read mechanisms deliberately and slowly, in a form you can reconstruct - which usually means building the thing rather than reading about it, as this whole module did. Skim tooling broadly and often, without trying to retain the details, since they will change and you can look them up. And re-derive a mechanism occasionally rather than re-reading it, since retrieval is what slows the decay.",
          "deepDive": {
            "q": "How do you decide whether to adopt a new technique?",
            "a": "BY DISCOUNTING THE HEADLINE, THEN REQUIRING A REPLICATION BEFORE COMMITTING - and the two measurements make both steps quantitative. STEP 1 - DISCOUNT THE HEADLINE. A method with a TRUE effect of ZERO, reported as the best of thirty configurations, showed +4.1 points. It replicated at +0.1. The entire gap was selection: the expected maximum of n noisy draws grows like sigma times the square root of two log n, so reporting the best of many tries inflates the result even when there is nothing there. The consequence is that a reported gain's SIZE is partly a measure of how many knobs were tuned, not only of how good the method is. THE QUESTIONS THAT ESTIMATE THE DISCOUNT. How many configurations were tried - which is rarely reported, and its absence is itself informative. Was the baseline TUNED, or run at defaults? That asymmetry - a carefully tuned method against a default baseline - accounts for a large share of reported gains in this field and is easy to miss because it looks like a fair comparison. Was the comparison COMPUTE-matched, or is the improvement partly more computation? Is the benchmark public and therefore possibly contaminated, which 22-09 shows is linear and invisible? And has anyone independent reproduced it? STEP 2 - REQUIRE A SECOND POSITIVE. Adopting only after an independent confirmation raised the precision of the adopted set from 48% to 84%, at a cost of twelve points of recall. Nearly doubling precision for twelve points of recall is a good trade whenever adoption is expensive - and an infrastructure change is expensive: migration effort, people to retrain, a dependency to maintain, and a rollback path to build. The mechanism is Bayesian: when the base rate of genuinely good ideas is LOW, a single positive is weak evidence and an independent second is strong. So the rarer real advances are, the more this filter is worth. THE BARBELL THAT FOLLOWS. On the cheap end, track everything - skim releases, note what exists, understand roughly what a new thing claims - because that costs almost nothing and keeps you from being surprised. On the expensive end, commit only to what has replicated, or to what you have reproduced on YOUR data. The middle is the mistake: adopting on one impressive headline, which is the default behaviour and the one the measurements argue against. THE EXCEPTION I WOULD ALLOW, since a strict rule would be wrong: reproduce it yourself on your own data and your own evaluation. That is an independent replication - your own - and it is often cheaper than waiting, especially for a change that is easy to trial. The point is not to wait for permission from the literature; it is to require evidence that is not a single selected number from someone whose incentives favour a large one. AND THE SELF-APPLICATION, which keeps this honest: everything in this module is subject to the same discount. The measurements here are on toys with known ground truth, which makes them reproducible and does not make them universal - and the right response to any of them is the same one recommended above."
          }
        },
        {
          "q": "Why do published improvements shrink on replication?",
          "a": "BECAUSE PUBLICATION SELECTS ON THE MAXIMUM, AND A MAXIMUM OVER NOISE IS BIASED UPWARD - which the measurement isolates by using a method whose true effect is exactly zero. THE EXPERIMENT: take a method that does NOTHING, evaluate thirty configurations of it against a baseline on a noisy metric, and report the best. It showed +4.1 points. Replicating the reported configuration independently gave +0.1. All of the apparent effect was the selection. THE MECHANISM. Each configuration's measured result is the true effect plus noise. Taking the maximum over n draws selects for large POSITIVE noise as well as for genuine effect, and the expected inflation grows like the noise scale times the square root of two log n. So even with a true effect of zero, the best of thirty looks meaningfully positive - and the more you try, the larger the phantom. WHY THIS IS ENDEMIC RATHER THAN DISHONEST. Researchers try many variants, which is good practice. They report the one that worked, which is normal. Reviewers prefer positive results, so negative ones are less likely to appear. Nobody has to behave badly for the literature to acquire this bias, which is why it persists and why individual scepticism has to substitute for a systemic fix. THE COMPOUNDING FACTORS specific to this field. Baselines are frequently untuned while the proposed method is carefully tuned - a comparison that looks fair and is not. Evaluations are often small enough that the noise is large, which makes the max-over-noise term bigger. Compute is not always matched, so some of the gain is more computation rather than a better method. And public benchmarks may be contaminated, which is linear and invisible in the score. Each of these pushes in the same direction. HOW I DISCOUNT IN PRACTICE. Weight independent replications far above originals. Ask how many configurations were tried, and treat the absence of that number as a reason for a larger discount. Look for whether the baseline was tuned with comparable effort. Prefer results on private or freshly-constructed evaluation sets. And be more sceptical of larger reported gains on smaller evaluations, since that combination is exactly what the selection mechanism produces. WHAT I WOULD DO RATHER THAN DESPAIR: reproduce it yourself on your own data, which is both an independent replication and the only one that measures the thing you care about. That is often cheaper than the debate about whether to believe the paper, and it converts a literature question into an engineering one. AND THE SELF-DIRECTED VERSION, which is the harder discipline: when you tune thirty configurations and report your best, you are doing exactly this to yourself. The fix is a held-out set touched once, and it is the same fix as the tuning-optimism result in cross-validation - which is the same mechanism at a smaller scale."
        },
        {
          "q": "What makes a piece of knowledge durable?",
          "a": "TWO FACTORS THAT MULTIPLY: HOW MUCH OF IT IS PRINCIPLE, AND HOW FAST ITS DOMAIN CHURNS. The durability score is principle content times one minus churn rate, and applying it to a body of material sorts what deserves careful study from what deserves a skim. WHAT SCORES HIGH, using this module's own content as the example. MEMORY ARITHMETIC - gigabytes equals parameters times bytes, and the KV-cache formula. That is true for every model in this architecture family on every accelerator, and it decides deployment questions today and will next year. THE ROOFLINE ARGUMENT - arithmetic intensity against the hardware ratio, which explains why elementwise chains are bandwidth-bound and why LLM decode is too. It follows from a hardware trend that has been consistent for decades. EVALUATION DISCIPLINE - the scorer is the eval, interval widths, swap-averaging cancelling an antisymmetric bias, contamination being linear and invisible. Those are properties of measurement, not of any harness. ALLOCATION STRUCTURE - why paging beats contiguous reservation, which is an operating-systems result from the 1960s that arrived here wearing a new name. And MATHEMATICAL FACTS - a rank-r product cannot represent a rank-k update for k above r. WHAT SCORES LOW. API surfaces and SDK method names. Compiler flags and mode names. Current model identifiers and leaderboard positions. Library-specific configuration. Every one of these is genuinely useful and every one has a half-life measured in months - which is fine, because you look them up. THE ASYMMETRY THAT MAKES THIS ACTIONABLE: the two categories deserve different LEARNING METHODS, not just different amounts of time. Durable material is worth learning in a form you can RECONSTRUCT - which in practice means deriving it or building it rather than reading it, because a mechanism you have built is one you can rebuild. Perishable material is worth learning in a form you can LOOK UP - bookmarks, a scratch file, familiarity with where the documentation lives. Trying to memorize an API is wasted effort and trying to look up a mechanism mid-problem does not work. HOW I WOULD APPLY IT TO A NEW TOPIC. Ask what would still be true if the current tool were replaced tomorrow. If the answer is 'most of it', study it properly. If the answer is 'almost none of it', get fluent enough to ship and move on. And notice when a supposedly new idea is an old one renamed - paged attention as virtual memory, adapters as low-rank updates, continuous batching as work-conserving scheduling - because recognizing the precedent both accelerates the learning and tells you the idea is durable, since it already survived one turnover."
        },
        {
          "q": "How would you keep up without spending all your time reading?",
          "a": "WITH A BARBELL: CHEAP BROAD TRACKING AND EXPENSIVE NARROW COMMITMENT, and nothing in the middle - because the middle is where the effort goes and the returns are worst. THE CHEAP END. Skim broadly and frequently, with the goal of knowing what EXISTS rather than how it works. Read abstracts, release notes and summaries. Note the claim and move on. The value is that you are not surprised later and you know where to look when a problem arises - and it costs very little because you are deliberately not retaining details. This is where tool churn is handled: you do not need to learn each release, you need to know it happened. THE EXPENSIVE END. When something is relevant to a problem you actually have, go deep - and go deep on the MECHANISM rather than the interface, because that is the part with a five-year half-life. Build it if you can; the module's own pedagogy is the argument, since teaching vLLM by simulating paged allocation produces understanding that survives vLLM. And require evidence before committing: an independent replication, or your own reproduction on your own data, which the measurement values at nearly doubled precision for twelve points of recall. WHAT NOT TO DO, which is the middle: reading every paper in moderate depth, adopting on a single impressive headline, or trying to keep current with every framework's release notes at a level you could act on. That consumes the most time and returns the least, because moderate depth on perishable material decays before you use it and single-headline adoption has 48% precision. THE FILTERS THAT MAKE SKIMMING EFFICIENT. Prefer things that have survived a while - a technique still in use after two years has passed a replication test the literature did not run deliberately. Prefer independent replications over originals. Notice when something is an old idea renamed, which both speeds the learning and signals durability. And discount headlines by the number of configurations tried, which is usually unstated and whose absence is itself a signal. THE PRACTICE I WOULD ADD, because it addresses decay rather than acquisition: re-derive occasionally instead of re-reading. Retrieval slows forgetting far more than review does, and a mechanism you can reconstruct from scratch is one that has genuinely entered the durable stock. Writing it down in your own words works for the same reason. AND THE ALLOCATION, to close the loop: roughly 70% of deliberate learning time on mechanisms, 30% on tools, with the tool portion refreshed continuously and cheaply rather than studied intensively. Principle-heavy, not principle-only - because the 30% is what lets you ship, and a person who understands every mechanism and cannot use the tools has optimized the wrong objective."
        },
        {
          "q": "What would you distrust in this module itself?",
          "a": "MOST OF THE SPECIFIC NUMBERS, AND ALMOST NONE OF THE MECHANISMS - which is the module's own thesis applied to itself, and it would be inconsistent not to do it. WHAT I WOULD DISTRUST. Every measured figure here comes from a TOY with known ground truth. The 6.4x from paged allocation is a simulation of allocation behaviour, not a benchmark of any implementation. The 12x jit speedup is one function on one machine. The rank elbow is a constructed rank-2 task whose parameter ratio at 32 by 32 badly understates real widths. The 7.2 ratio in the learning model depends entirely on two assumed half-lives that were chosen, not measured. None of these transfer as numbers, and quoting them as though they did would be exactly the error 22-09 warns about. WHAT I WOULD TRUST MORE. The MECHANISMS and their directions. Contiguous reservation wastes the gap between expected and maximum length - that follows from the arithmetic and holds anywhere. Elementwise operations are bandwidth-bound because arithmetic intensity is about one - that follows from a hardware ratio. A rank-r product cannot represent a higher-rank update - that is linear algebra. Position bias is antisymmetric and cancels under swapping while length bias is symmetric and does not - that is a property of the transformation. Those survive because they are derivations rather than observations. WHAT I WOULD ACTIVELY CHECK before relying on any of it. Re-run the calculation with YOUR parameters - your length distribution for the paging decision, your task for the rank sweep, your workload for the compile decision. Every one of these lessons provides a model you can re-run in an afternoon, which is more useful than the number it produced, and that is deliberate. THE PLACES I THINK ARE WEAKEST. The learning-allocation model is the softest thing here: the half-lives are assumptions, the saturation curve is a modelling choice, and the 70/30 is sensitive to both. What I would defend is the STRUCTURE - that decay rates differ, that tool value saturates and principle depth does not, and therefore that the optimum is interior and principle-heavy. The specific split is illustrative. And the compiler lesson measured mechanisms rather than torch.compile itself, because it could not run - which is honest and is also a real gap. AND WHY SAYING THIS MATTERS RATHER THAN UNDERMINING THE MODULE: a body of work that names its own limits is easier to use correctly than one that does not, because a reader can tell which parts to lean on. The module has argued throughout that a claim without its regime is a superstition. Exempting itself would make the argument decorative, and the discount it recommends for other people's headlines is the discount it earns for its own."
        },
        {
          "q": "How does this capstone close the module?",
          "a": "BY MEASURING THE THESIS THE MODULE HAS BEEN ASSERTING SINCE THE FIRST LESSON. Every lesson here claimed that mechanisms outlive tools and taught accordingly - vLLM without vLLM, Optax without Optax, Triton in numpy, a graph IR and interpreter by hand. That is a pedagogical choice and it needed justification beyond preference. The stock model supplies one: retained knowledge is study rate over decay rate, so with half-lives of 60 months against 8, an hour on principles yields about 7.2 times the retained stock. The module's method is an allocation decision with arithmetic behind it. AND THE MODEL CORRECTS THE OVERREACH, which is the part I would want remembered. The ratio alone implies studying only principles, and that is wrong, because tool value SATURATES - you need fluent-enough-to-ship - while principle depth keeps scaling. The optimum is interior, around 70/30, and it is principle-HEAVY rather than principle-only. A person who understands every mechanism and cannot use the tools has optimized the wrong objective. THE HONESTY NOTE IS THE BEST SINGLE THING HERE. The first model was symmetric and returned 50/50 - a meaningless non-answer that could easily have been reported as a finding about balance. The correct reading was that the MODEL was wrong, and modelling tool saturation is what produced a real optimum. 'A non-answer means your model is wrong, not that the question has none' is the most transferable sentence in the lesson, and it belongs to the same family as the chance-level accuracy being a data bug and the warm cache measuring the cache. THE OTHER TWO RESULTS make you a better reader of everything else. Headlines regress because they are maxima over noise - a true-zero method reported +4.1 as the best of thirty and replicated at +0.1 - so the size of a claim partly measures how many knobs were turned. And requiring an independent second positive nearly doubles adopted-set precision for twelve points of recall, which is the barbell: track everything cheaply, commit only to what replicates. AND IT CLOSES BY RANKING ITS OWN CONTENT, which is the right way for a module about durability to end. Deep: memory arithmetic, the roofline argument, evaluation discipline, allocation structure, the rank constraint. Skim: API surfaces, compiler flags, model names, leaderboard positions. If the module is right, that ranking is what a reader should still be able to use when every tool it named has been replaced."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "★ Knowledge as a stock",
        "back": "dS/dt = u − λS ⇒ S* = u/λ, so retained knowledge is INVERSELY proportional to the decay rate. Half-lives 60mo (principles) vs 8mo (tool trivia) ⇒ an hour on principles yields **~7.2× the retained stock**."
      },
      {
        "type": "formula",
        "front": "★ Why 70/30 and not 100/0",
        "back": "Tool value SATURATES (you need fluent-enough-to-ship, then it flattens); principle depth KEEPS SCALING. A saturating return against a scaling one gives an INTERIOR optimum ≈ 70% principles / 30% tools. Principle-HEAVY, not principle-only."
      },
      {
        "type": "pitfall",
        "front": "★ A non-answer means the MODEL is wrong",
        "back": "The first allocation model was symmetric (stock ∝ study rate both sides) and returned a meaningless 50/50 — which could have been reported as a finding about balance. Modelling tool SATURATION produced a real optimum. Same family as chance-accuracy = a data bug."
      },
      {
        "type": "formula",
        "front": "★ Headlines regress: max over noise",
        "back": "E[max of n draws] ≈ σ√(2 ln n). A method with a TRUE effect of ZERO, reported as best-of-30-configs, showed **+4.1 pt** and replicated at **+0.1**. The reported SIZE partly measures how many knobs were turned."
      },
      {
        "type": "intuition",
        "front": "The questions that discount a claim",
        "back": "How many configurations were tried (rarely reported — its absence is a signal) · was the BASELINE tuned or default · compute-matched · public benchmark ⇒ possible contamination · any independent replication?"
      },
      {
        "type": "intuition",
        "front": "Why the bias is endemic, not dishonest",
        "back": "Researchers try many variants (good practice), report what worked (normal), reviewers prefer positives. Nobody behaves badly and the literature still acquires the bias — which is why individual scepticism substitutes for a systemic fix."
      },
      {
        "type": "formula",
        "front": "★ A second independent positive",
        "back": "Adopted-set precision **0.48 → 0.84** at **−12 pt recall**. Nearly doubling precision for 12 points is a good trade whenever ADOPTION is expensive. Bayesian: when good ideas are RARE, one positive is weak and a second independent one is strong."
      },
      {
        "type": "intuition",
        "front": "★ The BARBELL",
        "back": "CHEAP end: skim broadly, know what EXISTS, retain nothing. EXPENSIVE end: go deep on the mechanism when you have the problem, and commit only after replication (or your own reproduction). **The middle — adopting on one headline — is the expensive default.**"
      },
      {
        "type": "formula",
        "front": "The DURABILITY SCORE",
        "back": "principle_content × (1 − churn). DEEP: memory arithmetic · roofline/arithmetic intensity · eval discipline · paging vs contiguous · the rank constraint · purity→transforms. SKIM: API surfaces, compiler flags, model names, leaderboard positions."
      },
      {
        "type": "intuition",
        "front": "The two categories need different METHODS",
        "back": "Durable → learn in a form you can RECONSTRUCT (derive it, build it). Perishable → learn in a form you can LOOK UP. Memorizing an API is wasted; looking up a mechanism mid-problem doesn't work. And re-DERIVE occasionally — retrieval beats review."
      },
      {
        "type": "intuition",
        "front": "Notice when a \"new\" idea is an old one renamed",
        "back": "Paged attention = virtual memory · continuous batching = work-conserving scheduling · adapters = low-rank updates. Recognizing the precedent both accelerates the learning AND signals durability — it already survived one turnover."
      },
      {
        "type": "intuition",
        "front": "★ Apply the discount to THIS module",
        "back": "Distrust the NUMBERS — all from toys with known ground truth (6.4×, 12×, the rank elbow, even the 7.2 from two ASSUMED half-lives). Trust the MECHANISMS and their directions, because they're derivations. Re-run each model with your own parameters."
      }
    ],
    "refs": [
      {
        "title": "Ioannidis (2005), Why Most Published Research Findings Are False",
        "url": "https://journals.plos.org/plosmedicine/article?id=10.1371/journal.pmed.0020124"
      },
      {
        "title": "Recht et al. (2019), Do ImageNet Classifiers Generalize to ImageNet?",
        "url": "https://arxiv.org/abs/1902.10811"
      },
      {
        "title": "Henderson et al. (2017), Deep Reinforcement Learning That Matters",
        "url": "https://arxiv.org/abs/1709.06560"
      },
      {
        "title": "Open Science Collaboration (2015), Estimating the Reproducibility of Psychological Science",
        "url": "https://www.science.org/doi/10.1126/science.aac4716"
      },
      {
        "title": "Cepeda et al. (2006), Distributed Practice in Verbal Recall Tasks: A Review and Quantitative Synthesis",
        "url": "https://psycnet.apa.org/record/2006-05288-004"
      }
    ],
    "demos": [
      "calibration",
      "cross-validation",
      "bagging-boosting",
      "classification-metrics"
    ]
  }
};
