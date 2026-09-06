// GENERATED from content/lessons/trustworthy-ai/conformal-prediction.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/trustworthy-ai/conformal-prediction/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "conformal-prediction": {
    "level": "core",
    "body": {
      "intuition": [
        "Conformal prediction gives you a coverage guarantee without requiring the model's probabilities to be right, without assuming anything about the model, and without asymptotics. Score how badly each calibration point was predicted, take the appropriate quantile of those scores, and emit the SET of labels that score better than it. The set contains the truth 90% of the time, finite-sample, distribution-free.",
        "It is the strongest guarantee in this module, and it is exactly as narrow as advertised. Measured coverage came out at 0.9020 against a 0.90 target - essentially exact. Then split it by class and coverage ranges from 0.727 to 0.990, and split it by subgroup and the minority gets 0.7734 against the majority's 0.9193. NOTHING WENT WRONG. The guarantee is MARGINAL: averaged over the whole distribution, not conditional on anything.",
        "The other thing worth internalizing is that set SIZE is the output that carries information. Coverage is fixed at 90% by construction, so a conformal predictor cannot tell you it is struggling by being wrong more often - it tells you by returning bigger sets. Easy classes averaged 2.47 labels and hard ones 4.79; the minority group averaged 4.63 against the majority's 3.61. Read the size, not the coverage."
      ],
      "math": [
        {
          "h": "Split conformal, in three lines",
          "paras": [
            "Define a nonconformity score measuring how surprising the true label was. Take a specific finite-sample quantile of it on a held-out calibration set. Include every label whose score falls below that quantile.",
            "The quantile's ceiling correction is what makes the guarantee exact rather than asymptotic."
          ],
          "tex": "s_i = 1-\\hat{p}(y_i\\mid x_i), \\quad \\hat{q}=\\text{Quantile}\\Big(\\{s_i\\};\\tfrac{\\lceil (n+1)(1-\\alpha)\\rceil}{n}\\Big), \\quad C(x)=\\{y: 1-\\hat{p}(y\\mid x)\\leq \\hat{q}\\}",
          "texNote": "Measured with alpha = 0.10 and n = 30,000: q = 0.9578 and marginal coverage 0.9020. The model is used only to produce a score - any model, any score, no assumption that p-hat is calibrated."
        },
        {
          "h": "The guarantee, stated precisely",
          "paras": [
            "The probability is over the joint draw of the calibration set AND the test point. It holds for any distribution and any model, and it says nothing conditional on x, on the class, or on any subgroup.",
            "Exchangeability is the whole assumption, and it is the only one."
          ],
          "tex": "1-\\alpha \\ \\leq\\ P\\big(Y_{n+1}\\in C(X_{n+1})\\big)\\ \\leq\\ 1-\\alpha+\\tfrac{1}{n+1}",
          "texNote": "A two-sided bound: conformal cannot systematically over-cover either. The marginalization is over everything - so 90% coverage is consistent with 73% for one group and 99% for another, which is exactly what happened."
        },
        {
          "h": "★ Marginal is not conditional, measured",
          "paras": [
            "Ten classes of steadily increasing difficulty, one pooled threshold. The marginal guarantee holds exactly and every conditional one fails."
          ],
          "tex": "\\begin{array}{lrr} \\text{class difficulty} & \\text{coverage} & \\text{mean set size}\\\\ \\text{easiest} & 0.9899 & 2.47\\\\ \\text{hardest} & 0.7269 & 4.79\\\\ \\hline \\text{MARGINAL} & \\mathbf{0.9020} & 3.74 \\end{array}",
          "texNote": "Per-class coverage spans 0.727 to 0.990. Per-group: minority 0.7734, majority 0.9193. The pooled quantile is a compromise that over-covers easy regions and under-covers hard ones, and the average lands exactly on target."
        }
      ],
      "code": [
        {
          "h": "Mondrian conformal buys conditional coverage",
          "paras": [
            "Compute a separate quantile within each class. The guarantee then holds per class, at the cost of needing enough calibration data in each."
          ],
          "code": "for k in classes:                      # a threshold PER class\n    s = 1 - p[cal & (y==k), k]\n    q[k] = quantile(s, ceil((n_k+1)*(1-alpha))/n_k)\n\n#                     marginal   per-class range    mean set size\n#  pooled (split)      0.9020    0.727 -- 0.990         3.736\n#  Mondrian (per-cls)  0.9024    0.891 -- 0.917         3.286\n\n# ★ THE SET SIZE WENT DOWN, not up. The pooled quantile is dominated by the\n#   HARD classes, so easy classes were getting needlessly large sets. Buying\n#   class-conditional coverage was free here - and it is not free in general,\n#   because each class now needs its own calibration sample.",
          "caption": "The usual expectation is that conditional coverage costs set size. It did not here, and the reason - a pooled quantile set by the hardest classes - is worth checking for in your own data."
        },
        {
          "h": "Exchangeability is the assumption, and it breaks silently",
          "paras": [
            "The same fitted threshold applied to test data that is progressively harder than calibration."
          ],
          "code": "# test-time difficulty shift    coverage   (target 0.90)\n#             0.00               0.9186\n#            -0.20               0.8998\n#            -0.50               0.8478\n#            -1.00               0.7524\n\n# ★ No error, no warning, no diagnostic. The sets keep coming out the same\n#   SIZE, because the threshold is frozen - only the truth-containment rate\n#   changes, and you cannot observe that without labels.\n\n# MITIGATIONS\n#   weighted conformal      reweight calibration scores by a likelihood ratio\n#                           (needs the shift to be covariate-only and estimable)\n#   adaptive conformal      update alpha online from observed miscoverage\n#                           (needs labels, eventually)",
          "caption": "This is the one thing that can invalidate a conformal guarantee, and it is invisible without labelled test data - which is exactly what you lack in deployment."
        }
      ],
      "useCases": [
        "Any deployment where an honest 'I am not sure between these three' is more useful than a confident single guess - medical triage, document routing, defect classification with human review.",
        "Putting a hard bound on a human review queue: set a target coverage, then measure the volume implied by the set sizes rather than guessing a confidence threshold.",
        "Regression intervals with no distributional assumption, via conformalized quantile regression, where the interval width adapts to input difficulty.",
        "Wrapping a black-box or third-party model whose probabilities you have no reason to trust, since conformal needs only a score and a calibration set."
      ],
      "pitfalls": [
        "Reading the coverage guarantee as conditional. It is marginal: per-class coverage spanned 0.727 to 0.990 and the minority subgroup got 0.7734 while the marginal was exactly 0.9020.",
        "Watching coverage as a health metric. It is fixed at 1-alpha by construction on exchangeable data, so it cannot signal difficulty - SET SIZE is the informative output.",
        "Assuming exchangeability holds in deployment. A modest difficulty shift took coverage from 0.919 to 0.752 with no error, no warning, and unchanged set sizes.",
        "Reusing the calibration set for model selection or threshold tuning. Any data-dependent choice made on that split breaks exchangeability and voids the guarantee.",
        "Applying Mondrian conformal with too few calibration points per class. The finite-sample quantile needs at least ceil((n+1)(1-alpha)) <= n, so alpha = 0.10 requires n >= 9 per class before it is even defined.",
        "Ignoring empty prediction sets. They occur when no label beats the threshold and are informative - a flag that the input is unlike anything in calibration - but they crash downstream code that assumes at least one label.",
        "Treating conformal as a substitute for a good model. Coverage is guaranteed for a random classifier too; it will just return nearly every label, and the set size is what tells you."
      ],
      "connections": [
        {
          "ref": "trustworthy-ai/calibration",
          "text": "The same marginal-versus-subgroup gap in the other formalism - and the contrast that conformal needs no assumption that the probabilities are right."
        },
        {
          "ref": "trustworthy-ai/distribution-shift",
          "text": "The failure mode that invalidates the guarantee, and the weighted and adaptive conformal variants that partially repair it."
        },
        {
          "ref": "trustworthy-ai/fairness",
          "text": "Why unequal per-group coverage is a fairness question and not only a statistical one, and why equalizing it has the same structure as every other parity choice."
        },
        {
          "ref": "causal-inference/resampling",
          "text": "The other distribution-free machinery - and the sharp contrast: permutation tests are exact under exchangeability too, and conformal is the prediction-set version of the same idea."
        },
        {
          "ref": "ml-theory/cross-validation",
          "text": "Where the held-out split comes from, and the cross-conformal variants that recover calibration data at the cost of computation."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What does conformal prediction guarantee?",
          "a": "P(Y ∈ C(X)) ≥ 1−α, finite-sample, distribution-free, model-agnostic. Assumes only exchangeability of calibration and test data."
        },
        {
          "q": "Give the split conformal recipe.",
          "a": "Score s = 1 − p̂(y|x) on a held-out calibration set; take q = Quantile(s, ⌈(n+1)(1−α)⌉/n); emit {y : 1 − p̂(y|x) ≤ q}."
        },
        {
          "q": "Why the ⌈(n+1)(1−α)⌉/n correction?",
          "a": "It makes the guarantee EXACT in finite samples rather than asymptotic. Coverage is also upper-bounded by 1−α+1/(n+1)."
        },
        {
          "q": "★ Is the guarantee conditional on the class?",
          "a": "No — MARGINAL. Measured: marginal 0.9020 while per-class coverage spanned 0.727 to 0.990."
        },
        {
          "q": "What about subgroups?",
          "a": "Same gap. Minority 0.7734 vs majority 0.9193, marginal 0.9020. Nothing malfunctioned — the average is over everything."
        },
        {
          "q": "Should you monitor coverage as a health metric?",
          "a": "No — it's pinned at 1−α by construction on exchangeable data. SET SIZE is the informative output."
        },
        {
          "q": "What did set size tell you?",
          "a": "Easy classes 2.47 labels, hard classes 4.79; minority 4.63 vs majority 3.61. Difficulty shows up as size, never as coverage."
        },
        {
          "q": "What is Mondrian conformal?",
          "a": "A separate quantile per class (or per group), buying conditional coverage. Measured: per-class range tightened 0.727–0.990 → 0.891–0.917."
        },
        {
          "q": "What did Mondrian cost in set size?",
          "a": "Nothing here — it went DOWN, 3.736 → 3.286. The pooled quantile was set by hard classes, so easy ones were over-covered."
        },
        {
          "q": "What breaks the guarantee?",
          "a": "Exchangeability. A difficulty shift took coverage 0.9186 → 0.7524 with no error and unchanged set sizes."
        },
        {
          "q": "Can you reuse the calibration set to tune a threshold?",
          "a": "No. Any data-dependent choice on that split breaks exchangeability and voids the guarantee."
        },
        {
          "q": "Does conformal make a bad model good?",
          "a": "No. Coverage holds for a random classifier too — it will just return nearly every label. Set size is what exposes model quality."
        }
      ],
      "standard": [
        {
          "q": "Explain conformal prediction and state its guarantee precisely.",
          "a": "IT CONVERTS ANY SCORE INTO A PREDICTION SET WITH A COVERAGE GUARANTEE. Split conformal is three steps: on a held-out calibration set, compute a nonconformity score measuring how surprising the true label was — the standard choice is s = 1 − p̂(y|x); take the quantile of those scores at level ⌈(n+1)(1−α)⌉/n; then at test time emit every label whose score falls below that quantile. THE GUARANTEE IS P(Y ∈ C(X)) ≥ 1 − α, and it is remarkable for what it does NOT require: no assumption about the model, no assumption that the probabilities are calibrated, no distributional assumption, and no asymptotics. It is finite-sample exact, and two-sided — coverage is also bounded above by 1 − α + 1/(n+1), so it cannot systematically over-cover. Measured with α = 0.10 and 30,000 calibration points: q = 0.9578 and coverage 0.9020. THE ONE ASSUMPTION IS EXCHANGEABILITY of the calibration and test data, which is weaker than i.i.d. and is the same condition that makes a permutation test exact. THE CRUCIAL QUALIFIER IS 'MARGINAL': the probability is over the joint draw of the calibration set and the test point, so it says nothing conditional on the input, the class, or any subgroup.",
          "deepDive": {
            "q": "How much does that qualifier actually matter?",
            "a": "That qualifier is not a footnote, it is the whole practical story, and the numbers make it vivid. With ten classes of steadily increasing difficulty and one pooled threshold, marginal coverage was 0.9020 while per-class coverage ran from 0.7269 on the hardest to 0.9899 on the easiest, and the minority subgroup got 0.7734 against the majority's 0.9193. Nothing malfunctioned — a pooled quantile is a compromise that over-covers easy regions and under-covers hard ones, and by construction the average lands on target. Full conditional coverage, P(Y ∈ C(x) | X = x) ≥ 1 − α for every x, is provably unattainable without distributional assumptions in a distribution-free framework; that is a theorem, not an engineering gap. What IS attainable is coverage conditional on a partition you choose in advance, which is what Mondrian conformal does. So the design question becomes: which partition do my decisions actually run over — class, subgroup, region, time window — and can I afford a calibration sample in each cell? That reframes conformal from a black box that returns 90% into a tool where you specify the reference class, which is exactly the module's thesis."
          }
        },
        {
          "q": "Your conformal predictor reports 90% coverage. What is your next question?",
          "a": "COVERAGE OVER WHAT, AND WHAT ARE THE SET SIZES. The first because the guarantee is marginal, so 90% is compatible with wildly unequal treatment of the parts you care about — in simulation, per-class coverage spanned 0.727 to 0.990 and the minority subgroup got 0.7734 while the headline was exactly 0.9020. If the deployment makes per-case decisions, and it does, then the aggregate describes a population no individual belongs to. So I would immediately compute coverage by class, by subgroup, and by any segment the product treats differently. THE SECOND QUESTION MATTERS MORE THAN PEOPLE EXPECT: coverage is PINNED at 1 − α by construction on exchangeable data, so it carries no information about how the model is doing — a random classifier achieves 90% coverage too, by returning almost every label. All the information is in set size. Measured: easy classes averaged 2.47 labels and hard classes 4.79, and the minority group averaged 4.63 against the majority's 3.61. THAT IS THE MONITORING SIGNAL. If mean set size drifts upward in production, the model is losing confidence in a way that coverage will never show, and it is observable without labels — which makes it one of the few genuinely useful unlabelled monitoring metrics available.",
          "deepDive": {
            "q": "What makes conformal prediction easy to sell internally?",
            "a": "Set size also converts directly into an operational number, which is what makes conformal easy to sell internally. If your policy is 'auto-resolve when the set is a singleton, otherwise send to a human', then the singleton rate IS your automation rate and the rest is your queue volume, both computable in advance from the calibration set at any α you choose. That turns the abstract coverage parameter into a staffing decision, and it lets you present a curve — automation rate against α — rather than asking a product owner to pick a confidence threshold whose meaning nobody can explain. Two operational details worth having ready. Empty sets occur when no label beats the threshold; they are genuinely informative, flagging an input unlike anything in calibration, and they will crash downstream code that assumes at least one label, so decide the policy before it happens. And with adaptive scores such as RAPS or APS the size distribution behaves better than with the naive 1 − p̂ score, which tends to produce a few very large sets; the choice of nonconformity score does not affect the coverage guarantee at all, only the sizes, which makes it a free design axis."
          }
        },
        {
          "q": "How would you get class-conditional or group-conditional coverage, and what does it cost?",
          "a": "MONDRIAN CONFORMAL: compute a separate quantile within each cell of a partition you fix in advance. The guarantee then holds within each cell, because you are running an independent conformal procedure per cell. Measured: per-class quantiles tightened the coverage range from 0.727–0.990 down to 0.891–0.917, with marginal coverage essentially unchanged at 0.9024. THE SURPRISE WAS THE COST. I expected set size to grow, since conditional guarantees usually cost width. It SHRANK, from 3.736 to 3.286. The reason is that the pooled quantile is dominated by the hard classes — they contribute the largest nonconformity scores — so easy classes were being given needlessly large sets to satisfy a threshold set by someone else's difficulty. Splitting the quantile let the easy classes tighten more than the hard ones loosened. THAT IS NOT GUARANTEED IN GENERAL and depends on the difficulty spread, so it is worth measuring rather than assuming in either direction. THE REAL COST IS DATA: each cell needs its own calibration sample, and the finite-sample quantile requires ⌈(n+1)(1−α)⌉ ≤ n, so at α = 0.10 a cell is not even defined below n = 9, and is very noisy well above that.",
          "deepDive": {
            "q": "How do you choose the partition?",
            "a": "That data requirement is what makes the partition choice consequential rather than free. Conditioning on class is usually affordable; conditioning on class × subgroup × region quickly produces cells with a handful of points, and a quantile estimated from twelve scores is not delivering a meaningful guarantee even though the arithmetic runs. So the honest procedure is to pick the coarsest partition that matches the decisions you make, check the per-cell counts before committing, and pool cells that are too small while saying which ones you pooled. There is a middle path worth knowing: conditioning on a small number of difficulty BINS derived from the model's own score, rather than on semantic categories, gets much of the adaptivity with better-populated cells, and is closer to what adaptive scores like APS do implicitly. And where the partition is a protected attribute, the same caveat as per-group temperature scaling applies — equalizing coverage across groups requires group membership at inference, which is a policy decision, and it is the same structural choice the fairness lesson turns into an impossibility result."
          }
        },
        {
          "q": "What breaks a conformal guarantee in production?",
          "a": "EXCHANGEABILITY, AND ALMOST NOTHING ELSE — which is both the strength and the danger. Applying a frozen threshold to test data progressively harder than calibration, coverage fell 0.9186 → 0.8998 → 0.8478 → 0.7524. THERE WAS NO ERROR, NO WARNING, AND NO OBSERVABLE SYMPTOM: the sets kept coming out the same size, because the threshold is fixed and the score distribution moved underneath it, so the only thing that changed was the truth-containment rate — which you cannot measure without labels, which is exactly what deployment lacks. THE COMMON CAUSES ARE MUNDANE. Temporal drift, since calibration data is from the past. A model retrain without recalibration, which invalidates every score. Reusing the calibration split for model selection or threshold tuning, which makes the split data-dependent and voids the guarantee. Feedback loops, where the system's own predictions change what data arrives. Selection, where only certain cases reach the model at test time. THE MITIGATIONS ARE PARTIAL. Weighted conformal reweights calibration scores by an estimated likelihood ratio, which handles covariate shift when the shift is estimable and does nothing for concept shift. Adaptive conformal updates α online from observed miscoverage, which is principled and requires labels to arrive eventually.",
          "deepDive": {
            "q": "If the failure is unobservable, what do you monitor instead?",
            "a": "Because the failure is unobservable without labels, the practical answer is monitoring proxies plus a labelling budget, and it is worth planning both at design time rather than after. The proxies: track the SCORE distribution on live traffic against the calibration distribution, since a shift there is directly the thing that breaks coverage and needs no labels; track mean set size, which moves under some shifts; and run a drift detector on the inputs, with the caveat from the drift lesson that covariate-shift detectors fire on harmless changes and miss concept shift. The labelling budget: a small random sample of production cases labelled continuously gives a direct coverage estimate, and the sample size needed is modest because you are estimating a proportion near 0.9 — a few hundred labels a week bounds coverage to a couple of points. That is a much better investment than an elaborate unlabelled monitoring stack, and it is the same recommendation as calibrating observational estimates against experimental truth in the causal module: a small amount of ground truth, collected continuously, is worth more than a large amount of inference about ground truth."
          }
        },
        {
          "q": "Compare conformal prediction with calibration. When would you use each?",
          "a": "THEY ANSWER DIFFERENT QUESTIONS AND THE COMPARISON IS NOT ABOUT WHICH IS BETTER. Calibration makes the model's PROBABILITIES trustworthy, so any downstream consumer of the number — a cost-based threshold, an expected-value calculation, a cascade decision — gets something meaningful. It is cheap, requires no change to the output format, and gives an aggregate property with no per-prediction guarantee. Conformal changes the OUTPUT TYPE from a label to a set and attaches a per-prediction-set guarantee that holds without assuming the probabilities are right at all. USE CALIBRATION when downstream code needs a scalar probability, when the output format cannot change, or when you are computing expected costs. USE CONFORMAL when the consumer is a human or a routing rule that can act on a set, when you need a defensible coverage claim, or when the model is a black box you have no reason to trust — a third-party API, say, where conformal only needs a score and a calibration set. THEY COMPOSE WELL: calibrate first, then conform. Calibration does not affect the coverage guarantee, since conformal is invariant to monotone transforms of the score, but it improves the SET SIZES, because a better-ordered score separates plausible from implausible labels more sharply.",
          "deepDive": {
            "q": "What do calibration and conformal have deeply in common?",
            "a": "The deeper commonality is the one this module keeps returning to: both deliver a real guarantee over a reference class, and both get quoted about a wider class than the one they hold on. Calibration's ECE was 0.0105 overall and 0.1527 for the minority; conformal's coverage was 0.9020 overall and 0.7734 for the same group. Same gap, same cause, two different formalisms — which is a good sign the pattern is structural rather than a quirk of either method. The practical difference is that conformal makes the gap easier to close, because Mondrian conditioning is a first-class part of the framework and costs only calibration data, whereas per-group calibration feels like a hack bolted on. It is also worth being clear about what neither one does: neither improves the model. Conformal on a weak model returns large sets, calibration on a weak model returns honest low confidences, and both are correctly reporting that the model does not know. Treating either as a fix rather than as instrumentation is the mistake, and the useful framing for a stakeholder is that they convert model weakness from something hidden into something the system can route around."
          }
        },
        {
          "q": "How does this lesson advance the module's thesis?",
          "a": "IT IS THE STRONGEST POSSIBLE TEST OF IT. Conformal has the best guarantee in this module — finite-sample, distribution-free, model-agnostic, with no assumption that anything about the model is right. If any method were going to mean what its name suggests, it is this one. AND IT STILL HAS THE GAP. Coverage 0.9020 marginally; 0.727 to 0.990 by class; 0.7734 versus 0.9193 by subgroup. The word doing all the work is 'marginal', it is stated plainly in every paper, and it is dropped in essentially every summary. THE IMPORTANT PART IS THAT THIS IS NOT A DEFECT. Full conditional coverage is provably unattainable distribution-free, so marginality is not laziness — it is the price of requiring nothing of the model or the distribution. Every guarantee has a reference class, and the stronger the guarantee's other properties, the more likely the reference class is where the compromise lives. SO THE TRANSFERABLE QUESTION IS THE MODULE'S: over what set does this hold, and is it the set I care about? Here the answer is unusually actionable, because Mondrian conditioning lets you MOVE the reference class to a partition you choose — and the measured cost was zero set size, though it cost calibration data per cell.",
          "deepDive": {
            "q": "What general shape does that argument have?",
            "a": "It is worth carrying the general shape of that argument, because it recurs outside this module. When a guarantee is strong along several axes at once — finite-sample, distribution-free, assumption-light — something has to give, and what gives is usually the SET the guarantee ranges over. Certified adversarial robustness in a later lesson has the identical structure: a genuine mathematical certificate, holding inside one norm ball, quoted as 'robust'. A red-team suite's clean report is a real result about the attacks you ran. A drift detector's silence is a real statement about the statistic you monitored. In every case the number is honest and the reference class is narrower than the noun. The habit that catches all of them is to read the guarantee's quantifier out loud — 'for a random test point drawn exchangeably with calibration' rather than 'for this patient' — and then ask whether the decision you are about to make is quantified the same way. When it is not, either move the reference class, as Mondrian does, or state the gap in the writeup. Both are cheap; neither is default."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "The conformal guarantee",
        "back": "1−α ≤ P(Y ∈ C(X)) ≤ 1−α+1/(n+1). Finite-sample, distribution-free, model-agnostic. Assumes ONLY exchangeability of calibration and test data."
      },
      {
        "type": "formula",
        "front": "Split conformal, three lines",
        "back": "s = 1 − p̂(y|x) on held-out cal; q = Quantile(s, ⌈(n+1)(1−α)⌉/n); C(x) = {y : 1 − p̂(y|x) ≤ q}. The ceiling correction makes it EXACT, not asymptotic."
      },
      {
        "type": "pitfall",
        "front": "★ Marginal, not conditional",
        "back": "Marginal coverage 0.9020 (exact ✓). Per-class: **0.727 → 0.990**. Per-group: minority **0.7734** vs majority 0.9193. Nothing malfunctioned — the average is over everything."
      },
      {
        "type": "intuition",
        "front": "★ Read the SET SIZE, not the coverage",
        "back": "Coverage is PINNED at 1−α by construction — a random classifier gets 90% too. Difficulty shows up as size: easy classes 2.47 labels, hard 4.79; minority 4.63 vs majority 3.61."
      },
      {
        "type": "intuition",
        "front": "Why full conditional coverage isn't offered",
        "back": "P(Y ∈ C(x) | X=x) ≥ 1−α for every x is PROVABLY unattainable distribution-free. Marginality is the price of requiring nothing of the model or distribution — a theorem, not a gap."
      },
      {
        "type": "definition",
        "front": "Mondrian conformal",
        "back": "A separate quantile per cell of a pre-chosen partition. Measured: per-class range 0.727–0.990 → **0.891–0.917**, marginal unchanged at 0.9024."
      },
      {
        "type": "intuition",
        "front": "★ Mondrian's set size went DOWN",
        "back": "3.736 → 3.286, against expectation. The pooled quantile is dominated by HARD classes, so easy classes were over-covered. Not guaranteed in general — measure it. Real cost is calibration data per cell."
      },
      {
        "type": "pitfall",
        "front": "★ Exchangeability breaks silently",
        "back": "Difficulty shift → coverage 0.9186 → 0.8998 → 0.8478 → **0.7524**. No error, no warning, and SET SIZES UNCHANGED (the threshold is frozen). Unobservable without labels."
      },
      {
        "type": "pitfall",
        "front": "Common exchangeability breakers",
        "back": "Temporal drift; retraining without recalibrating; **reusing the calibration split for model/threshold selection**; feedback loops; selection into who reaches the model."
      },
      {
        "type": "definition",
        "front": "Mitigations under shift",
        "back": "Weighted conformal (reweight cal scores by a likelihood ratio — covariate shift only, must be estimable). Adaptive conformal (update α online from observed miscoverage — needs labels eventually)."
      },
      {
        "type": "intuition",
        "front": "Set size → an operational number",
        "back": "Singleton rate IS your automation rate; the rest is queue volume — both computable in advance from calibration at any α. Present a curve, don't ask someone to pick a confidence threshold."
      },
      {
        "type": "pitfall",
        "front": "Conformal + calibration compose",
        "back": "Calibrate first, then conform. Calibration cannot change coverage (conformal is invariant to monotone score transforms) but it IMPROVES SET SIZES. Neither one improves the model."
      }
    ],
    "refs": [
      {
        "title": "Vovk, Gammerman & Shafer (2005), Algorithmic Learning in a Random World",
        "url": "https://link.springer.com/book/10.1007/b106715"
      },
      {
        "title": "Angelopoulos & Bates (2023), A Gentle Introduction to Conformal Prediction and Distribution-Free Uncertainty Quantification",
        "url": "https://arxiv.org/abs/2107.07511"
      },
      {
        "title": "Romano, Sesia & Candes (2020), Classification with Valid and Adaptive Coverage (APS)",
        "url": "https://arxiv.org/abs/2006.02544"
      },
      {
        "title": "Tibshirani, Barber, Candes & Ramdas (2019), Conformal Prediction Under Covariate Shift",
        "url": "https://arxiv.org/abs/1904.06019"
      },
      {
        "title": "Gibbs & Candes (2021), Adaptive Conformal Inference Under Distribution Shift",
        "url": "https://arxiv.org/abs/2106.00170"
      }
    ],
    "demos": [
      "conformal",
      "conformal-regression",
      "calibration",
      "classification-metrics"
    ],
    "demoTitles": {
      "conformal": "Conformal Prediction",
      "conformal-regression": "Conformal Regression",
      "calibration": "Model Calibration",
      "classification-metrics": "Classification Metrics"
    }
  }
};
