// GENERATED from content/lessons/causal-inference/confounding.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/causal-inference/confounding/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "confounding": {
    "level": "intro",
    "body": {
      "intuition": [
        "Simpson's paradox is not a paradox and it is not about statistics being unreliable. It is arithmetic: a weighted average can move against every one of its components when the weights differ enough. The real content is that the arithmetic gives you two contradictory answers and the data contains nothing that adjudicates between them.",
        "The canonical case is real. In Charig's 1986 kidney stone study, treatment A beat treatment B on small stones, 93.1% to 86.7%, and beat it on large stones, 73.0% to 68.8%, and LOST overall, 78.0% to 82.6%. The mechanism is visible once you look at assignment: 75.1% of A's patients had large stones versus 22.9% of B's. Surgeons sent the hard cases to A.",
        "Here is the part that makes this lesson the module's thesis in its sharpest form. If stone size is a CONFOUNDER - determined before treatment - the right answer is to adjust, and A wins by 5.4 points. If the same variable were a MEDIATOR, determined after treatment, the right answer is the crude comparison, and B wins by 4.6 points. SAME FOUR CELLS, OPPOSITE RECOMMENDATION. The fact that decides it, when the covariate was determined relative to treatment, is nowhere in the table."
      ],
      "math": [
        {
          "h": "The reversal is exact arithmetic, not a small-sample artefact",
          "paras": [
            "Each treatment's overall rate is a weighted average of its stratum rates, weighted by that treatment's own case mix. When the mixes differ sharply, the averages can order oppositely to every stratum.",
            "Multiply every cell by a thousand and every rate is preserved exactly, so the reversal survives any sample size. It is not noise and no confidence interval addresses it."
          ],
          "tex": "\\underbrace{0.931 > 0.867}_{\\text{small}},\\quad \\underbrace{0.730 > 0.688}_{\\text{large}},\\quad \\text{but}\\quad \\underbrace{0.780 < 0.826}_{\\text{overall}}, \\qquad w^{A}_{\\text{large}} = 0.751,\\ w^{B}_{\\text{large}} = 0.229",
          "texNote": "A's overall rate is dragged down by a case mix that is three quarters large stones. B's is lifted by a mix that is three quarters small stones. Nothing about the treatments changed between the rows and the total."
        },
        {
          "h": "The two answers, from the same four cells",
          "paras": [
            "Standardizing to the pooled population - backdoor adjustment on stone size - reweights both treatments to the same case mix. Whether that is the RIGHT thing to do depends on a fact outside the table."
          ],
          "tex": "\\text{adjusted: } P(R\\mid do(A)) = 0.833 > P(R\\mid do(B)) = 0.779 \\quad\\Longleftrightarrow\\quad \\text{crude: } P(R\\mid A)=0.780 < P(R\\mid B)=0.826",
          "texNote": "Adjust if size is a pre-treatment confounder: A better by 5.4 points. Do not adjust if size were a post-treatment mediator: B better by 4.6 points. The data is identical in both readings and cannot distinguish them."
        },
        {
          "h": "Sensitivity: how strong would an unmeasured confounder have to be?",
          "paras": [
            "The E-value converts an observed association into the minimum strength - on the risk ratio scale, with BOTH treatment and outcome - that an unmeasured confounder would need to explain it away entirely.",
            "It replaces an unfalsifiable claim of 'no unmeasured confounding' with a number the reader can judge against known covariates."
          ],
          "tex": "E\\text{-value} = RR + \\sqrt{RR(RR-1)}: \\quad RR{=}1.06 \\to 1.31,\\quad 1.25 \\to 1.81,\\quad 1.50 \\to 2.37,\\quad 2.00 \\to 3.41,\\quad 3.00 \\to 5.45",
          "texNote": "The crude kidney-stone risk ratio of 1.06 has an E-value of only 1.31 - a very weak confounder would suffice, and stone size clears it easily. Weak associations need weak confounders to overturn, which is exactly why they deserve the least trust."
        }
      ],
      "code": [
        {
          "h": "The table, and the reversal",
          "paras": [
            "Charig et al. 1986, open surgery (A) versus percutaneous nephrolithotomy (B), 350 patients each."
          ],
          "code": "#            treatment A            treatment B\n# small       81/87  = 93.1%       234/270 = 86.7%     A +6.4pp\n# large      192/263 = 73.0%        55/80  = 68.8%     A +4.3pp\n# TOTAL      273/350 = 78.0%       289/350 = 82.6%     B +4.6pp\n\n# assignment is the mechanism, and it is not subtle:\n#   share of A patients with LARGE stones = 75.1%\n#   share of B patients with LARGE stones = 22.9%\n\n# ★ Surgeons sent the hard cases to A. That is good medicine and\n#   terrible data: severity drives BOTH the treatment and the outcome.",
          "caption": "The confounder here is not hidden or exotic. It is the single most obvious clinical variable, and it still reverses the answer."
        },
        {
          "h": "Adjusting is a decision, not a default",
          "paras": [
            "The same computation, run under two different beliefs about what the covariate is."
          ],
          "code": "w_small, w_large = 357/700, 343/700      # pooled case mix\n\n# IF stone size is a pre-treatment CONFOUNDER  -> backdoor adjust\nadj_A = w_small*(81/87)  + w_large*(192/263)   # 83.3%\nadj_B = w_small*(234/270)+ w_large*(55/80)     # 77.9%   -> A better by 5.4pp\n\n# IF the same variable were a post-treatment MEDIATOR -> do NOT adjust\ncrude_A, crude_B = 273/350, 289/350            # 78.0%, 82.6% -> B better by 4.6pp\n\n# ★ Both computations are correct. They answer different questions,\n#   and the four cells are identical in both. Nothing in the data\n#   tells you which question you are in.",
          "caption": "This is the module's thesis at its most literal: the estimate is fully determined by an assumption that leaves no trace in the dataset."
        }
      ],
      "useCases": [
        "Reading any aggregate comparison across groups with different case mixes - hospital mortality tables, school performance, model accuracy by cohort, conversion rate by acquisition channel.",
        "Reviewing a dashboard where a metric moves the opposite way from every segment, which is Simpson's paradox and almost always a mix shift rather than a change in any segment.",
        "Deciding whether to control for a variable in an observational analysis, where the decisive question is when it was determined relative to treatment.",
        "Writing up an observational result honestly, by reporting an E-value alongside the estimate so a reader can weigh 'no unmeasured confounding' against named candidate confounders."
      ],
      "pitfalls": [
        "Calling the reversal a paradox and moving on. It is exact arithmetic driven by weights of 75.1% versus 22.9%, and treating it as a curiosity skips the question of which number to act on.",
        "Assuming the disaggregated answer is always right. It is right when the covariate is a pre-treatment confounder, and wrong when it is post-treatment; here that choice flips the recommendation by 10 points.",
        "Assuming more data resolves it. Multiplying every cell by a thousand preserves every rate exactly, so the reversal is invariant to sample size.",
        "Reporting an aggregate metric that moved without checking whether the segment mix moved. A model whose accuracy fell while improving in every segment usually just received harder traffic.",
        "Treating 'we adjusted for the obvious confounders' as settling the matter. In the kidney-stone case the E-value is 1.31, so a very weak unmeasured confounder would suffice to erase the crude result.",
        "Adjusting for a variable measured after treatment because it is available and predictive. That is the mediator case, and it silently changes the estimand from total effect to direct effect.",
        "Reading a large E-value as proof of causation. It bounds what a single unmeasured confounder must look like; it says nothing about selection bias, measurement error, or several weak confounders acting together."
      ],
      "connections": [
        {
          "ref": "causal-inference/causal-graphs",
          "text": "The formal version of the choice made here: whether the covariate sits on a backdoor path or on the causal path, which is what makes adjustment right or wrong."
        },
        {
          "ref": "causal-inference/potential-outcomes",
          "text": "The selection term, which is what the 75.1% versus 22.9% case mix produces, expressed as a contrast between an observed and a counterfactual quantity."
        },
        {
          "ref": "causal-inference/propensity-matching",
          "text": "Adjustment scaled up to many covariates at once, where the case-mix reweighting done by hand here becomes a fitted model."
        },
        {
          "ref": "ml-theory/imbalanced-data",
          "text": "The predictive cousin of a mix shift: aggregate metrics that move because the class or segment composition moved, not because any conditional behaviour changed."
        },
        {
          "ref": "trustworthy-ai/fairness",
          "text": "Where subgroup reversals become a legal question, since a model can appear fair in aggregate and unfair in every stratum, or the reverse."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "State Simpson's paradox.",
          "a": "An association present in every subgroup can reverse when the subgroups are pooled, because the pooled rate is a weighted average with group-specific weights."
        },
        {
          "q": "Give the canonical numbers.",
          "a": "Charig 1986: A beats B on small stones 93.1% vs 86.7% and on large stones 73.0% vs 68.8%, but loses overall 78.0% vs 82.6%."
        },
        {
          "q": "What drives the reversal there?",
          "a": "Case mix: 75.1% of A's patients had large stones versus 22.9% of B's. Surgeons routed hard cases to A."
        },
        {
          "q": "Does more data fix it?",
          "a": "No. Scale every cell by 1000 and every rate is preserved exactly. It is arithmetic, not sampling error."
        },
        {
          "q": "Which answer is correct, disaggregated or pooled?",
          "a": "Depends on the causal role of the covariate. Pre-treatment confounder → adjust (A wins by 5.4pp). Post-treatment mediator → don't (B wins by 4.6pp)."
        },
        {
          "q": "Where does the deciding fact live?",
          "a": "Outside the table. When the covariate was determined relative to treatment leaves no trace in the four cells."
        },
        {
          "q": "Define a confounder in graph terms.",
          "a": "A variable on a backdoor path from treatment to outcome — a path with an arrow into treatment. Blocking it is what adjustment does."
        },
        {
          "q": "What is standardization?",
          "a": "Reweighting each treatment's stratum rates to a common population mix: Σ_z P(Y|t,z)P(z). Here it moves A to 83.3% and B to 77.9%."
        },
        {
          "q": "What is an E-value?",
          "a": "The minimum risk-ratio strength an unmeasured confounder needs with BOTH treatment and outcome to explain away an observed association. E = RR + √(RR(RR−1))."
        },
        {
          "q": "E-value for an observed RR of 1.06? Of 2.0?",
          "a": "1.31 and 3.41. Weak associations need only weak confounders to overturn."
        },
        {
          "q": "Your dashboard metric fell while every segment improved. Diagnosis?",
          "a": "Mix shift. Segment composition moved toward lower-performing segments; no segment's behaviour changed."
        },
        {
          "q": "Is a large E-value proof of causation?",
          "a": "No. It bounds a single unmeasured confounder on the RR scale — silent on selection bias, measurement error, and several weak confounders combined."
        }
      ],
      "standard": [
        {
          "q": "Explain Simpson's paradox with the kidney-stone data and say which answer you would act on.",
          "a": "IT IS A WEIGHTED-AVERAGE REVERSAL, NOT A FAILURE OF STATISTICS. In Charig's 1986 study, treatment A beat B on small stones 93.1% to 86.7%, beat it on large stones 73.0% to 68.8%, and lost overall 78.0% to 82.6%. The mechanism is the case mix: 75.1% of A's patients had large stones against 22.9% of B's, because surgeons sensibly routed the hard cases to open surgery. Each treatment's overall rate is an average of its own stratum rates under its OWN weights, so with mixes that lopsided the averages can order oppositely to every stratum. This survives any sample size — multiply every cell by a thousand and the rates are unchanged, so it is arithmetic and no confidence interval speaks to it. I WOULD ACT ON THE ADJUSTED ANSWER, and I would say why rather than asserting it: stone size is determined before treatment and causes both the assignment and the outcome, which makes it a classic backdoor confounder, so standardizing both treatments to the pooled mix is what estimates the effect of intervening. That gives A 83.3% against B 77.9%, a 5.4 point advantage — the same direction as both strata, which is the consistency you would hope for.",
          "deepDive": {
            "q": "So is 'always disaggregate' the lesson to take away?",
            "a": "The part worth pushing on is that 'always disaggregate' is the wrong lesson to take away, and this dataset can demonstrate it. Imagine the identical four cells with the third variable measured AFTER treatment — say a post-operative complication that the treatment itself causes. Now it is a mediator on the causal path, adjusting for it blocks part of the effect you are trying to measure, and the correct comparison is the crude one, where B wins by 4.6 points. So the same table supports opposite recommendations depending on a fact that is nowhere in it: when the covariate was determined relative to treatment. That is why the habit to build is asking about the data-generating process rather than reaching for a default rule, and it is why this lesson sits early in the module. It also explains a common real-world pattern: two analysts, same data, opposite conclusions, both computing correctly. The disagreement is not about statistics at all — it is about a causal claim, and it can only be settled by argument about the process."
          }
        },
        {
          "q": "A dashboard shows overall conversion down 3% while every acquisition channel is up. What do you tell the team?",
          "a": "THIS IS ALMOST CERTAINLY A MIX SHIFT, AND THE OVERALL NUMBER IS NOT THE ONE TO DEBUG. The aggregate rate is a weighted average over channels, and the weights are traffic share, so if share moved toward a structurally lower-converting channel the total can fall while every component rises. FIRST I WOULD PRODUCE THE DECOMPOSITION rather than assert it: split the change into a within-channel component, holding last period's mix fixed, and a between-channel component, holding each channel's rate fixed. If the between term accounts for the drop, the story is settled in one table and the team can stop looking for a regression in the funnel. THEN THE ACTUAL QUESTION, which is what to do about it, and that depends on why the mix moved. If marketing deliberately shifted spend toward a cheaper, lower-converting channel, the aggregate drop may be exactly the intended trade and the right metric is downstream — revenue per dollar, not conversion rate. If the mix moved because a high-converting channel broke or was throttled, that is the real incident and the conversion dashboard is a lagging symptom of it. I would also check that channel is not post-treatment relative to whatever change is under suspicion, because if a release altered which channels users arrive through, conditioning on channel is conditioning on a mediator.",
          "deepDive": {
            "q": "What should a team change permanently after seeing this once?",
            "a": "Two operational habits follow from this. First, mix-adjusted versions of headline metrics are worth maintaining permanently — a conversion rate standardized to a fixed reference mix, reported alongside the raw one — because the pair immediately separates 'behaviour changed' from 'population changed', and teams stop rediscovering this from scratch each quarter. The cost is that the reference mix goes stale and eventually needs re-basing, which should be a deliberate, announced event. Second, the same structure is why model-monitoring dashboards mislead: aggregate accuracy dropping while per-segment accuracy is flat means traffic composition moved, and retraining will not help because nothing about the conditional distribution changed. The inverse also happens and is more dangerous, because aggregate accuracy can hold steady while a segment degrades badly, hidden by that segment being small. That is the argument for reporting segmented metrics by default rather than on request — the aggregate is a weighted average, and a weighted average can conceal a reversal in either direction."
          }
        },
        {
          "q": "How do you decide whether to adjust for a particular variable?",
          "a": "I ASK WHEN IT WAS DETERMINED AND WHAT IT CAUSES, in that order, because those two facts settle it and no property of the data does. IF IT WAS DETERMINED BEFORE TREATMENT AND CAUSES BOTH treatment and outcome, it is a confounder on a backdoor path and I adjust. IF IT WAS DETERMINED AFTER TREATMENT, I almost never adjust: if it is on the causal path it is a mediator and adjusting silently changes the estimand from total effect to direct effect, which in the graph lesson's simulation moved a true 3.800 to 1.998; if it is caused by both treatment and outcome it is a collider and adjusting manufactures bias, which moved the same 3.800 to 0.131. IF IT IS PRE-TREATMENT BUT PREDICTS ONLY THE OUTCOME, adjusting is harmless and improves precision, so I include it. IF IT IS PRE-TREATMENT BUT PREDICTS ONLY TREATMENT, I exclude it — conditioning on a near-instrument amplifies whatever unmeasured confounding already exists, which is Z-bias, and it is the counterintuitive case people get wrong. What I do NOT do is decide by looking at whether the coefficient changes, or whether fit improves, because both criteria systematically select the wrong specification.",
          "deepDive": {
            "q": "What is wrong with the change-in-estimate rule for choosing controls?",
            "a": "The 'change-in-estimate' heuristic deserves a specific rebuttal because it is still taught and still used: the rule says include a covariate if adding it moves the treatment coefficient more than some threshold, typically 10%. Every one of the harmful controls moves the coefficient a lot — the collider moved it by 97% — so the heuristic is not merely weak, it is anti-correlated with correctness in exactly the cases that matter. The timestamp rule is much better but has a known exception worth being able to name: M-bias, where a pre-treatment variable is a collider between two unmeasured confounders, so conditioning on it opens a backdoor that was closed. In practice M-bias is rarer and weaker than the mediator and collider cases, so 'never adjust for post-treatment variables, adjust for pre-treatment confounders, and be suspicious of pre-treatment variables that predict only treatment' is a good working policy. When the structure is genuinely uncertain, report the estimate under several defensible adjustment sets and show the range, which converts a hidden analytic choice into a visible one the reader can price."
          }
        },
        {
          "q": "You cannot rule out unmeasured confounding. How do you report the result responsibly?",
          "a": "I QUANTIFY WHAT IT WOULD TAKE TO OVERTURN THE RESULT, rather than asserting that nothing was missed. The E-value is the cheapest version: it converts the observed association into the minimum strength an unmeasured confounder would need — on the risk-ratio scale, with BOTH treatment and outcome — to explain it away entirely, via E = RR + √(RR(RR−1)). Concretely, an observed RR of 1.06 has an E-value of 1.31, an RR of 1.25 gives 1.81, 1.50 gives 2.37, 2.00 gives 3.41 and 3.00 gives 5.45. THE VALUE OF REPORTING IT IS THAT IT MAKES THE CLAIM ARGUABLE: a reader can compare 1.31 against confounders they know about and immediately see that stone size, or age, or baseline severity would clear that bar without effort, whereas an E-value of 5.45 would require an unmeasured factor stronger than anything typically observed in that field. It also disciplines the writeup, because weak associations turn out to need only weak confounders, which is a quantitative reason to distrust small observational effects rather than a stylistic preference. ALONGSIDE IT I WOULD REPORT FALSIFICATION EVIDENCE: a negative-control outcome the treatment cannot affect, a pre-period placebo estimate that should be zero, and the adjustment-set range, so the reader sees both how fragile the number is and what tests it survived.",
          "deepDive": {
            "q": "What does an E-value not cover?",
            "a": "The honest limits of the E-value are worth stating in the same breath, because it is often used as a talisman. It addresses a single unmeasured confounder on the risk-ratio scale and says nothing about selection bias, differential measurement error, or several weak confounders acting jointly — and joint action is the realistic case, since three confounders at RR 1.4 each can do the work of one at a much higher value. It is also a bound on what is REQUIRED, not evidence about what EXISTS: an E-value of 5.45 does not mean no such confounder is present, only that a weaker one would not suffice. And it uses the observed association, so it inherits any bias in that estimate. The broader framework here is the Cornfield-style sensitivity tradition, and the modern versions — Rosenbaum bounds for matched designs, and Cinelli and Hazlett's partial-R² sensitivity for regression — give richer answers, including how the estimate moves under a confounder as strong as a named observed covariate. That last framing, 'as strong as age', tends to be far more persuasive to a non-technical audience than any number on the RR scale."
          }
        },
        {
          "q": "Why is Simpson's paradox described as arithmetic rather than a statistical anomaly, and does that distinction matter?",
          "a": "IT MATTERS BECAUSE IT TELLS YOU WHICH TOOLS ARE IRRELEVANT. The reversal follows from the identity that a pooled rate is Σ_z w_z · rate_z with treatment-specific weights, and with weights of 75.1% versus 22.9% on the worse stratum, A's average is dragged below B's despite winning both rows. Nothing probabilistic is involved: multiply every cell by a thousand and the rates and the reversal are bit-for-bit identical. SO EVERY STATISTICAL INSTINCT IS THE WRONG REACH — bigger samples, tighter intervals, a better test, a more flexible model, bootstrapping the difference. None of them touch it, because there is no sampling error to reduce, and reaching for them wastes the effort that should go into the actual question. THE ACTUAL QUESTION IS CAUSAL: which weighting corresponds to the intervention you care about. Standardizing to the pooled mix answers 'what if we gave everyone A', the crude comparison answers 'what happened under the existing assignment policy', and both are legitimate quantities that happen to disagree by ten points here. Framing it as arithmetic also explains why it is so common — it needs only imbalanced weights, which is the normal condition of observational data, not a rare pathology.",
          "deepDive": {
            "q": "If finer slicing can keep flipping the sign, what stops the regress?",
            "a": "There is a genuinely surprising corollary: because the reversal is arithmetic, it can be constructed to any degree you like, and further stratification does not converge to a stable answer. Add a third variable and the sign can flip back; add a fourth and it can flip again. There is no 'most disaggregated' level that is automatically correct, which kills the intuition that finer slicing gets you closer to truth. What terminates the regress is not more data but the causal structure — the backdoor criterion names a specific set that suffices, and conditioning on more than that set is not more rigorous, it is often worse. The related result on the continuous side is the ecological fallacy and its mirror, the atomistic fallacy: group-level regression coefficients and individual-level ones need not even share a sign, and Robinson's 1950 example of literacy and immigration status is the classic. Both are the same phenomenon — an aggregate is a weighted summary, and summaries can order differently from their parts whenever the weights differ."
          }
        },
        {
          "q": "What does this lesson establish about what data can and cannot settle?",
          "a": "IT ESTABLISHES THE LIMIT CASE: two analyses of the SAME FOUR NUMBERS, both arithmetically correct, giving opposite recommendations, with nothing in the dataset that adjudicates. Adjust for stone size and A is better by 5.4 points; do not adjust and B is better by 4.6. Which is right depends on whether the covariate was determined before or after treatment, and that fact is a property of the world, not of the table. You could hand this dataset to any algorithm ever written and it could not recover it. THAT IS THE MODULE'S THESIS AT ITS MOST LITERAL: the assumption is the estimate. It also reframes what the rest of the module is doing. Randomization, instruments, matching, difference-in-differences and synthetic control are not competing estimators of one quantity — they are different ways of BUYING the missing fact, each at a different price, and each with a different failure mode when the purchase does not go through. And it sets the standard for a writeup: because the deciding fact is external, it has to be stated externally, as an argument about the process by which units came to be treated, with sensitivity analysis attached so the reader can price the assumption rather than take it on trust.",
          "deepDive": {
            "q": "Why can't disagreements about causal method be settled the way ML ones are?",
            "a": "There is a useful contrast with the rest of machine learning here that is worth making explicit, because it changes how you should read causal papers. In supervised learning, disagreements about method are settled empirically: two people propose different models, they run both on held-out data, and the comparison is decisive. That whole apparatus is unavailable here, since the counterfactual outcome is absent from every split by construction — no test set contains what would have happened. So the literature's quality control has to come from elsewhere, and it comes from three places: transparency about the assumption, falsification tests that could refute it, and replication across designs whose assumptions fail differently. The last one is the strongest and the most underrated. If an instrumental-variables study, a difference-in-differences study and a matched cohort study all land near the same estimate, that is real evidence, not because any one is trustworthy but because their assumptions are unlikely to be wrong in the same direction. Triangulation across designs is the closest thing this field has to a test set, and it is the standard worth holding your own work to."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Simpson's paradox",
        "back": "An association in every subgroup reverses when pooled, because each group's total is a weighted average under ITS OWN weights. Arithmetic, not a statistical anomaly."
      },
      {
        "type": "formula",
        "front": "★ The canonical table (Charig 1986)",
        "back": "small: A 93.1% > B 86.7% | large: A 73.0% > B 68.8% | TOTAL: A 78.0% < B 82.6%. Driver: 75.1% of A's patients had large stones vs 22.9% of B's."
      },
      {
        "type": "intuition",
        "front": "★ Same four cells, opposite recommendation",
        "back": "Size as pre-treatment CONFOUNDER → adjust → A wins by 5.4pp. Same variable as post-treatment MEDIATOR → don't adjust → B wins by 4.6pp. The deciding fact is nowhere in the table."
      },
      {
        "type": "pitfall",
        "front": "Does more data resolve the reversal?",
        "back": "No. Scale every cell ×1000 and every rate is bit-for-bit identical. There is no sampling error to reduce — bigger n, tighter CIs, bootstrap, flexible models all miss."
      },
      {
        "type": "formula",
        "front": "Standardization / backdoor adjustment",
        "back": "P(Y|do(t)) = Σ_z P(Y|t,z)·P(z) — reweight both arms to a COMMON mix. Kidney stones: A → 83.3%, B → 77.9%."
      },
      {
        "type": "formula",
        "front": "E-value",
        "back": "E = RR + √(RR(RR−1)) — minimum confounder strength (with BOTH treatment and outcome) to explain away an association. RR 1.06→1.31, 1.25→1.81, 1.50→2.37, 2.00→3.41, 3.00→5.45."
      },
      {
        "type": "intuition",
        "front": "Why weak associations deserve the least trust",
        "back": "Their E-values are tiny. The kidney-stone crude RR of 1.06 needs only a 1.31-strength confounder — stone size clears that without effort."
      },
      {
        "type": "pitfall",
        "front": "Dashboard down 3%, every segment up",
        "back": "Mix shift. Decompose into within-segment (mix fixed) and between-segment (rates fixed) terms. The aggregate isn't the thing to debug — and check the segment isn't post-treatment."
      },
      {
        "type": "definition",
        "front": "The adjust / don't-adjust decision rule",
        "back": "Pre-treatment + causes both → ADJUST. Post-treatment → almost never. Pre-treatment, predicts outcome only → adjust (precision). Pre-treatment, predicts TREATMENT only → exclude (Z-bias amplifies confounding)."
      },
      {
        "type": "pitfall",
        "front": "The change-in-estimate heuristic",
        "back": "\"Include it if the coefficient moves >10%\" is ANTI-correlated with correctness — the collider moved the estimate by 97%. Decide by causal role, never by how much the number shifts."
      },
      {
        "type": "pitfall",
        "front": "Is finer stratification always better?",
        "back": "No — the sign can flip back with a 3rd variable and again with a 4th. There is no 'most disaggregated' level that's automatically right. The backdoor criterion terminates the regress; more data does not."
      },
      {
        "type": "intuition",
        "front": "What replaces a test set in causal inference",
        "back": "Triangulation. If IV, DiD and matched-cohort designs land near the same estimate, that's real evidence — not because any one is trustworthy, but because their assumptions fail differently."
      }
    ],
    "refs": [
      {
        "title": "Charig et al. (1986), Comparison of treatment of renal calculi by open surgery, percutaneous nephrolithotomy, and ESWL",
        "url": "https://www.bmj.com/content/292/6524/879"
      },
      {
        "title": "Simpson (1951), The Interpretation of Interaction in Contingency Tables",
        "url": "https://www.jstor.org/stable/2984065"
      },
      {
        "title": "Pearl (2014), Comment: Understanding Simpson's Paradox",
        "url": "https://ftp.cs.ucla.edu/pub/stat_ser/r414.pdf"
      },
      {
        "title": "VanderWeele & Ding (2017), Sensitivity Analysis in Observational Research: Introducing the E-Value",
        "url": "https://www.acpjournals.org/doi/10.7326/M16-2607"
      },
      {
        "title": "Cinelli & Hazlett (2020), Making Sense of Sensitivity: Extending Omitted Variable Bias",
        "url": "https://academic.oup.com/jrsssb/article/82/1/39/7056023"
      }
    ],
    "demos": [
      "simpsons-paradox",
      "do-intervention",
      "regression",
      "bias-variance-decomp"
    ],
    "demoTitles": {
      "simpsons-paradox": "Simpson's Paradox",
      "do-intervention": "do() & Backdoor Adjustment",
      "regression": "Linear & Logistic Regression",
      "bias-variance-decomp": "Bias-Variance Decomposition"
    }
  }
};
