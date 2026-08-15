// GENERATED from content/lessons/causal-inference/ by _private/scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// Store-authored lesson bodies for module "causal-inference". Loaded by the lesson pages
// BEFORE lesson-app.jsx, which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "potential-outcomes": {
    "level": "intro",
    "body": {
      "intuition": [
        "Every unit has TWO outcomes: the one under treatment, Y(1), and the one without it, Y(0). The effect on that unit is the difference. You will never observe both. Whichever one happens, the other is erased - not measured badly, not measured noisily, ERASED. That is the fundamental problem of causal inference, and it is not a data-collection problem you can spend your way out of.",
        "So every causal estimate is a comparison across DIFFERENT units standing in for the same unit, and the entire discipline is the study of when that substitution is legitimate. The substitution is never justified by the data. It is justified by an ASSUMPTION about how units came to be treated - and that assumption, not the estimator, is what determines whether your number means anything.",
        "This module's thesis in one line: THE ASSUMPTION IS THE ESTIMATE. Here is what that costs. A simulation where the treatment helps every single patient, with a true average effect of +4.99, hands back a difference in means of -1.91 - the wrong SIGN. And at two million samples the 95% interval is [-1.907, -1.871]: width 0.036, and nowhere near the truth. A thousand times more data narrowed the interval 32x and moved the answer by 0.04. Bias does not average out; it just gets better standard errors."
      ],
      "math": [
        {
          "h": "The estimand: three different numbers all called 'the effect'",
          "paras": [
            "When effects are heterogeneous, the average over everyone, the average over the treated, and the average over the untreated are three distinct quantities. A paper that says 'the effect' without saying which one has not said anything yet.",
            "In the simulation the treatment helps sicker patients more, and sicker patients are the ones who get treated. So ATT sits well above ATE, and ATU well below."
          ],
          "tex": "\\tau_i = Y_i(1)-Y_i(0), \\quad \\mathrm{ATE}=\\mathbb{E}[\\tau_i]=4.99, \\quad \\mathrm{ATT}=\\mathbb{E}[\\tau_i\\mid T_i=1]=6.59, \\quad \\mathrm{ATU}=\\mathbb{E}[\\tau_i\\mid T_i=0]=3.40",
          "texNote": "The spread ATT - ATU = 3.19 is not noise; it is the policy question. 'Does the drug work for the people already taking it' (ATT) and 'should we give it to everyone' (ATE) have different answers, and an experiment on volunteers estimates the first while the press release claims the second."
        },
        {
          "h": "Why the naive comparison fails, exactly",
          "paras": [
            "The difference in observed means decomposes into the causal quantity you want plus a SELECTION term - how the treated group would have differed from the untreated even with no treatment at all.",
            "The selection term is a contrast between one observed and one counterfactual quantity, so it is not estimable from the data. That is why no amount of sample size touches it."
          ],
          "tex": "\\underbrace{\\mathbb{E}[Y\\mid T{=}1]-\\mathbb{E}[Y\\mid T{=}0]}_{-1.91} = \\underbrace{\\mathbb{E}[Y(1)-Y(0)\\mid T{=}1]}_{\\mathrm{ATT}=6.59} + \\underbrace{\\mathbb{E}[Y(0)\\mid T{=}1]-\\mathbb{E}[Y(0)\\mid T{=}0]}_{\\text{selection}=-8.50}",
          "texNote": "Read it right to left: the treated group was already 8.5 points worse off. The treatment lifted them 6.6. The observable gap, -1.91, is what is left. Every number in this identity is exact in the simulation because the potential outcomes were generated, not inferred."
        },
        {
          "h": "The assumptions that make the substitution legal",
          "paras": [
            "Identification needs three things, and only the third is checkable from data. Randomization buys the first two by DESIGN, which is what makes an experiment worth its cost."
          ],
          "tex": "\\text{(1) } \\{Y(1),Y(0)\\} \\perp T \\mid X \\quad\\text{(2) SUTVA}\\quad \\text{(3) } 0 < P(T{=}1\\mid X) < 1",
          "texNote": "(1) ignorability / no unmeasured confounding - UNTESTABLE. (2) no interference between units and one version of the treatment - UNTESTABLE, and quietly false in marketplaces, social networks and anything with a shared budget. (3) overlap / positivity - the one you CAN check, by looking at the propensity distribution."
        }
      ],
      "code": [
        {
          "h": "More data makes the wrong answer more confident",
          "paras": [
            "Same generative process, same estimator, four sample sizes. The interval collapses; it never approaches the truth."
          ],
          "code": "# TRUE effect helps everyone: tau = 5 + 3X, ATE = 4.99\n# but sicker patients (high X) are both MORE treated and WORSE off\n\n#      N     estimate     SE      95% CI            covers 4.99?\n#  2,000      -1.933    0.286   [-2.493, -1.373]        NO\n# 20,000      -1.857    0.091   [-2.034, -1.679]        NO\n# 200,000     -1.906    0.029   [-1.962, -1.850]        NO\n# 2,000,000   -1.889    0.009   [-1.907, -1.871]        NO   <- 1000x data\n\n# the SAME estimator, treatment randomized instead:\n#  2,000       4.832    0.328   [ 4.189,  5.475]        YES\n# 2,000,000    4.999    0.010   [ 4.979,  5.019]        YES\n\n# ONE line of code changed. Not the estimator - the ASSIGNMENT.",
          "caption": "The estimator is identical in both blocks. What differs is a fact about the world that lives outside the dataset."
        },
        {
          "h": "What a diagnostic can and cannot see",
          "paras": [
            "Balance checks are genuinely useful and genuinely limited: they can only ever interrogate the covariates you recorded."
          ],
          "code": "# the diagnostic that FIRES\nsmd_X = (X[T==1].mean() - X[T==0].mean()) / pooled_sd   # = 1.257\n#   > 0.1 is the conventional red flag. This is 12x it.\n\n# the diagnostics that stay SILENT\n#   * balance on an UNMEASURED confounder    -> cannot be computed\n#   * residual normality of Y ~ T            -> passes\n#   * homoscedasticity                       -> passes\n#   * p-value on the treatment coefficient   -> p < 1e-300\n#   * R^2                                    -> a perfectly ordinary 0.022\n\n# ★ Now delete the X column from the dataframe. Every number above is\n#   unchanged except the one that fired. The bias did not move.",
          "caption": "The deleted-column thought experiment is the honest test: would you have caught this if the confounder had simply never been logged?"
        }
      ],
      "useCases": [
        "Deciding whether an observed lift is a reason to roll something out, which is a question about Y(1) vs Y(0) for the population you would roll it out TO, not about the users who happened to opt in.",
        "Reading a clinical or economics paper well enough to ask which estimand it reports - ATE, ATT, or a local effect on a subgroup you cannot name.",
        "Product analytics on non-randomized rollouts, where treatment is 'users who enabled the feature' and the selection term is usually larger than the effect.",
        "Interview questions of the form 'we saw X correlate with retention, should we ship it' - the expected answer is a decomposition, not a number."
      ],
      "pitfalls": [
        "Reporting 'the treatment effect' when effects are heterogeneous. ATE, ATT and ATU differed by 3.19 here, and the one your estimator targets is a property of the DESIGN, not of your intent.",
        "Treating a narrow confidence interval as evidence of correctness. The worst estimate in this lesson had the tightest interval, because n only controls variance and the problem was bias.",
        "Believing a large sample fixes confounding. It fixes sampling error. Confounding is not sampling error, and the two are not on the same axis.",
        "Reading a high R-squared as evidence the causal estimate is trustworthy. Fit quality measures agreement with observed outcomes; the counterfactual outcome is not in the data to disagree with.",
        "Forgetting SUTVA in any setting with interference - marketplaces, social features, shared inventory, shared budget. The control group is contaminated by the treatment and the effect shrinks or inverts.",
        "Checking balance only on the covariates you happen to have and calling the result 'no evidence of confounding'. Absence of a computable diagnostic is not evidence of absence.",
        "Assuming the individual treatment effect is estimable. Even sd(tau) = 3.00 in the simulation is not identified from data, because the correlation between Y(0) and Y(1) - here 0.98 - can never be observed."
      ],
      "connections": [
        {
          "ref": "causal-inference/confounding",
          "text": "The selection term, given a name and a worked example where the SAME four cells support opposite recommendations depending on when the covariate was measured."
        },
        {
          "ref": "causal-inference/causal-graphs",
          "text": "A language for stating the ignorability assumption precisely enough to argue about, instead of asserting it in a sentence."
        },
        {
          "ref": "causal-inference/ab-testing",
          "text": "What buying the assumption by design actually costs in practice - power, duration, and the ways randomization leaks."
        },
        {
          "ref": "ml-theory/evaluation-metrics",
          "text": "The contrast worth holding onto: predictive metrics score agreement with outcomes you observed, and every quantity in this lesson is defined by an outcome you did not."
        },
        {
          "ref": "ml-applications/recommenders-cf",
          "text": "A production setting where the training data is generated by the policy being evaluated, so the observed outcome and the counterfactual outcome are systematically different."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is the fundamental problem of causal inference?",
          "a": "For any unit you observe Y(1) or Y(0), never both. The individual effect is never measurable, so causal inference is always an imputation problem."
        },
        {
          "q": "Write the definition of the ATE.",
          "a": "E[Y(1) - Y(0)] over the whole population. ATT restricts the expectation to T=1, ATU to T=0."
        },
        {
          "q": "Why is the difference in observed means biased?",
          "a": "It equals ATT plus a selection term E[Y(0)|T=1] - E[Y(0)|T=0]: how the groups would have differed with no treatment at all."
        },
        {
          "q": "Does more data fix confounding?",
          "a": "No. It shrinks the standard error around the biased number. At n=2M the interval was width 0.036 and excluded the truth."
        },
        {
          "q": "Name the three identification assumptions.",
          "a": "Conditional ignorability, SUTVA, and positivity/overlap. Only overlap is checkable from data."
        },
        {
          "q": "What does randomization buy you?",
          "a": "Ignorability by construction - treatment is independent of the potential outcomes because a coin decided it, not the patient or the doctor."
        },
        {
          "q": "What is SUTVA?",
          "a": "No interference between units, and a single well-defined version of the treatment. It breaks in marketplaces, social graphs, and anything with a shared budget."
        },
        {
          "q": "What is positivity and why does it matter?",
          "a": "Every covariate stratum must have a nonzero chance of both arms. Where it fails there is no comparison to make and the estimate is extrapolation."
        },
        {
          "q": "Can you estimate the variance of individual treatment effects?",
          "a": "Not without extra assumptions. It depends on corr(Y(0), Y(1)), which is never observed - 0.98 in the simulation, unidentified from the data."
        },
        {
          "q": "ATE or ATT - which does an experiment on volunteers estimate?",
          "a": "The ATT for volunteers, or an ATE for the volunteer population. Generalizing to everyone is a separate assumption about transportability."
        },
        {
          "q": "Is a tight confidence interval evidence the estimate is right?",
          "a": "No. Intervals quantify variance. The most confident estimate in this lesson was the wrong-signed one."
        },
        {
          "q": "Your balance check passes. Is confounding ruled out?",
          "a": "Only for covariates you measured. Drop the confounding column and the check goes silent while the bias stays exactly where it was."
        }
      ],
      "standard": [
        {
          "q": "Explain the potential outcomes framework and why the naive difference in means is biased.",
          "a": "EVERY UNIT HAS TWO POTENTIAL OUTCOMES AND YOU SEE ONE OF THEM. Y_i(1) is what happens to unit i under treatment, Y_i(0) without it, and the individual effect is their difference. Whichever arm the unit lands in, the other outcome is erased - so the individual effect is never observed for anyone, and every causal estimate substitutes different units for the missing half. THE BIAS COMES FROM WHETHER THAT SUBSTITUTION IS LEGITIMATE, and it decomposes exactly: the difference in observed means equals the ATT plus a selection term, E[Y(0)|T=1] - E[Y(0)|T=0], which asks how the two groups would have differed with no treatment at all. In a simulation where the treatment helps every single patient, ATE = +4.99, the naive difference was -1.91: ATT of 6.59 plus selection of -8.50. THE SIGN FLIPPED. Sicker patients were both more likely to be treated and worse off regardless. The selection term contrasts an observed quantity with a counterfactual one, so it is not estimable, which is why sample size does nothing: at n=2,000 the estimate was -1.93 and at n=2,000,000 it was -1.89, with the interval collapsing from width 1.12 to 0.036 and never containing the truth. Randomization removes the term by construction, because a coin flip cannot correlate with potential outcomes; with the identical estimator and identical potential outcomes, the randomized version returned 4.999 [4.979, 5.019].",
          "deepDive": "Push on the estimand. Because the effect is heterogeneous - tau = 5 + 3X, larger for sicker patients - ATE, ATT and ATU are 4.99, 6.59 and 3.40, a spread of 3.19 that is bigger than most effects anyone reports. So 'the treatment effect' is genuinely three numbers, and which one your design targets is not a matter of intent. A randomized trial on volunteers identifies the effect for volunteers; an observational study of adopters identifies something near an ATT; a policy question about mandating the treatment needs the ATU, the group that has so far declined it and about whom you have the least evidence. The deeper point is that even the SPREAD is only visible here because the data was simulated. In the real world sd(tau) = 3.00 is not identified at all, because it depends on the correlation between Y(0) and Y(1), which is 0.98 in the simulation and unobservable in principle. This is why individual treatment effect claims deserve suspicion: uplift models estimate CATE, a conditional average, and the within-stratum spread stays invisible."
        },
        {
          "q": "A colleague says 'we have ten million rows, so we don't need an experiment.' Respond.",
          "a": "SAMPLE SIZE AND CONFOUNDING LIVE ON DIFFERENT AXES, and ten million rows moves only one of them. The standard error shrinks like 1/sqrt(n); the selection term does not shrink at all, because it is a property of how units came to be treated, not of how many you observed. The demonstration is the four-row table: at n=2,000 the biased estimate was -1.933 with SE 0.286, and at n=2,000,000 it was -1.889 with SE 0.009. A thousandfold increase in data narrowed the interval by 32x and moved the point estimate by 0.044, and the truth, +4.99, was outside every interval. THE PRACTICAL DANGER IS THAT SCALE MAKES THE WRONG ANSWER LOOK AUTHORITATIVE: with ten million rows every p-value is astronomically small, every interval is tight, and the output has all the surface features of a settled question. I would then reframe the ask. The useful question is not 'is n large enough' but 'what would have to be true for this number to be causal', which is the conditional ignorability assumption, and 'would the data tell me if it weren't', which is usually no. If an experiment is genuinely impossible I would move to a design that buys identification some other way - an instrument, a discontinuity, a difference-in-differences on a policy change - and report a sensitivity analysis saying how strong an unmeasured confounder would need to be to erase the result.",
          "deepDive": "There is a real counterargument worth conceding: large observational data does help, just not with this. It gives you the ability to condition finely, so if the confounders ARE measured, overlap is better and you can adjust within narrow strata rather than relying on a functional form. It supports heterogeneity analysis that a small experiment cannot power. And it makes falsification tests cheap - negative controls, pre-period placebo outcomes, and testing implied conditional independences all need volume. So the honest position is that scale converts an untestable assumption into a slightly-more-testable one and improves everything downstream of identification, while doing nothing for identification itself. The failure mode to name explicitly is that scale plus flexible models makes things worse in one specific way: a gradient boosted model with a thousand features will fit Y superbly and confidently attribute effect to treatment, and its excellent held-out predictive performance is not evidence about the counterfactual, because the counterfactual is not in the test set either."
        },
        {
          "q": "Which of the identification assumptions can you actually check, and what do you do about the ones you cannot?",
          "a": "ONLY POSITIVITY IS CHECKABLE. Overlap says every covariate stratum has a nonzero probability of both arms, and it is a statement about the observed joint distribution of X and T, so you can plot the estimated propensity score by arm and look for mass piling at 0 or 1. Where it fails there is genuinely no comparison to make, and any estimate there comes from the model's functional form extrapolating rather than from data. IGNORABILITY IS NOT CHECKABLE, ever, because it is a statement about the unobserved potential outcomes. SUTVA is not checkable either, though it is often obviously false on inspection. What you do instead is a three-part discipline. FIRST, argue the assumption substantively - what process assigned treatment, who chose, what did they know - because the assumption is a claim about that process and can only be defended there. SECOND, run falsification tests: a negative-control outcome that the treatment cannot affect should show a null, a pre-treatment period should show no effect, and a DAG implies conditional independences you can test. These cannot confirm the assumption but they can refute it, and a refutation is worth a lot. THIRD, report sensitivity: state how strong an unmeasured confounder would have to be to overturn the conclusion, so the reader can judge plausibility rather than take the assumption on faith.",
          "deepDive": "The balance-check trap is worth spelling out because it is so common. A standardized mean difference above 0.1 is the conventional red flag, and in the simulation the measured confounder had an SMD of 1.257 - twelve times the threshold, unmissable. Now delete that column from the dataframe. The bias is exactly unchanged, every estimate is identical to the last decimal, and the balance table now reports perfect balance on everything remaining. That is the whole problem in one operation: balance diagnostics interrogate the covariates you recorded, and confounding is defined by the ones you did not. It is also why 'we controlled for a lot of variables' is a weak defence and can be an actively harmful one - as the next lesson shows, adding controls monotonically improved R-squared from 0.898 to 0.987 while driving the causal estimate from 3.80 to 0.50. Positivity has a subtler failure mode too: it can hold marginally on every covariate and fail jointly, so the propensity histogram is the diagnostic, not per-variable overlap."
        },
        {
          "q": "What is SUTVA, and where does it break in systems you would actually build?",
          "a": "SUTVA IS TWO ASSUMPTIONS WEARING ONE NAME. First, no interference: unit i's outcome depends on unit i's treatment only, not on anyone else's. Second, consistency or 'no hidden versions': there is a single well-defined treatment, so Y(1) is unambiguous. Both are quietly violated in most systems worth working on. INTERFERENCE BREAKS WHEREVER UNITS COMPETE OR COMMUNICATE. In a marketplace, showing treated buyers better recommendations consumes the same finite inventory that control buyers need, so the control group is made worse by the treatment and the measured lift overstates the true effect - the estimate contains a transfer, not a creation. In a social product, a treated user's activity lands in an untreated friend's feed, which contaminates control in the opposite direction and shrinks the measured effect toward zero. Anything with a shared budget, a shared cache, a shared model retrained on pooled logs, or a shared human review queue has the same structure. THE HIDDEN-VERSIONS PROBLEM is subtler: 'treated' in a rollout usually means 'assigned', while some assigned users never saw the change and some saw a degraded version, so Y(1) is an average over a bag of different interventions whose mix will not be stable when you scale. The fix is design, not analysis: randomize at the level that contains the interference - cluster, market, region, time slice - and accept the power cost.",
          "deepDive": "The power cost is the reason people resist, and it is real: switching from user-level to market-level randomization can cut effective sample size by orders of magnitude, because the unit count collapses to the number of markets and outcomes within a market are correlated. Practical middle grounds exist. Switchback designs randomize time slices within a market and recover power at the cost of assuming effects do not carry across slices, which fails when the treatment changes a persistent state like a learned ranking model or a user's habit. Cluster designs on a social graph work when the graph has good community structure and fail when it does not. Two-sided randomization can separate buyer-side and seller-side effects in a marketplace. Whichever you pick, the reporting obligation is the same: name the interference channel you believe exists, say which direction it biases the estimate, and, if you can, bound it - a market-level experiment run in parallel with a user-level one gives you the gap between the two, and that gap IS the interference, measured rather than assumed."
        },
        {
          "q": "Product asks: 'users who enabled dark mode retain 12% better - should we default it on?' Walk through your answer.",
          "a": "I WOULD SAY THE 12% IS ALMOST CERTAINLY NOT THE EFFECT OF DEFAULTING IT ON, and be precise about why, because the reason determines what to do next. The 12% compares enablers to non-enablers, so it equals the causal effect on enablers plus a selection term. Enabling dark mode requires opening settings, which is done by more engaged users, and engagement drives retention directly - so the selection term is positive and possibly the whole 12%. THE ESTIMAND MISMATCH IS THE SECOND PROBLEM, and it is independent of the first: even if that 12% were a clean ATT, the proposal is to treat everyone, which needs the ATE, and the people who never opened settings are exactly the group with no evidence. In the simulation ATT and ATU differed by 3.19 with the same sign; here they could plausibly differ in sign, since users who wanted dark mode and did not find the setting are helped while users who dislike it are harmed. THE ANSWER IS A CHEAP EXPERIMENT: randomize the default on a holdout, which buys ignorability by design and directly targets the estimand the decision needs. If a full rollout is too risky, randomize the SETTING'S DISCOVERABILITY instead and use it as an encouragement design - that identifies a local effect for the users a nudge can move, which is closer to the real question than the observational number.",
          "deepDive": "Two things I would add before anyone ships. First, positivity is worth checking even in this informal setting: if essentially nobody over some tenure has dark mode off, there is no comparison in that stratum and any 'adjusted' number there is model extrapolation. Second, the metric itself is downstream of treatment in a way that hides interference - retention is measured over a window during which the app may have shipped other changes, and if dark mode changes session length it changes exposure to those changes too. Practically I would also want a negative control: find an outcome dark mode cannot plausibly affect, such as payment-method updates, and check that enablers do not differ there. If they do, that is direct evidence of the selection term, measured rather than argued. That single check often ends the conversation faster than any amount of explaining what confounding is, because it produces a number in the same format as the one that started it."
        },
        {
          "q": "What is the transferable question this module is training, and why frame it that way?",
          "a": "THE QUESTION IS: WHAT WOULD HAVE TO BE TRUE FOR THIS NUMBER TO BE CAUSAL, AND WOULD THE DATA TELL ME IF IT WEREN'T? Framing it as a pair matters, because the two halves catch different failures. The first half forces the assumption into the open - ignorability, an exclusion restriction, parallel trends, whatever the method is buying - and an assumption you have written down is one that colleagues can attack, which is the only quality control available. The second half is the one people skip, and it is where the discipline differs from the rest of machine learning. IN PREDICTION, THE TEST SET ADJUDICATES. You can be wrong about the model class, the features, the loss, and held-out performance still tells you. In causal inference the counterfactual is absent from every split, so there is no held-out set that can adjudicate the assumption, and the usual diagnostics keep passing regardless: in this lesson residual checks passed, the p-value was below 1e-300, R-squared was unremarkable and the answer had the wrong sign. Framing it as a question rather than a checklist is deliberate too, because the checklist changes per method while the question does not - it is the same question for an instrument, a matching estimator, a synthetic control and an A/B test, and only the answer changes.",
          "deepDive": "It is worth being clear about what this framing does NOT claim. It does not say observational estimates are worthless; it says their credibility comes from the argument for the assumption, and that argument belongs in the writeup with the same prominence as the confidence interval. It also does not say randomization is a magic word - randomized experiments have their own assumptions, and this module spends a whole lesson on the ways they leak: interference, non-compliance, differential attrition, peeking, and the multiple-comparison surface of a metrics dashboard. The reason to lead with the question is that it survives contact with the tooling churn. Estimators come and go, double machine learning and causal forests will be replaced by something else, and every one of them is a way of computing an estimate GIVEN identification. None of them supplies identification, and a library that returns a confidence interval without asking you what assignment mechanism you believe in is not doing anything the interval implies it is doing."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "★ The module's thesis",
        "back": "THE ASSUMPTION IS THE ESTIMATE. Data alone never identifies a causal effect - an untestable assumption does. Every method here is a different trade of assumption for identification."
      },
      {
        "type": "definition",
        "front": "Fundamental problem of causal inference",
        "back": "You observe Y(1) OR Y(0) for a unit, never both. The individual effect is not measured badly — it is ERASED. Every estimate substitutes other units for the missing half."
      },
      {
        "type": "formula",
        "front": "Decomposition of the naive difference",
        "back": "E[Y|T=1] − E[Y|T=0] = ATT + (E[Y(0)|T=1] − E[Y(0)|T=0]). Simulated: −1.91 = 6.59 + (−8.50). The second term contrasts an observed with a counterfactual quantity → not estimable."
      },
      {
        "type": "pitfall",
        "front": "★ More data makes the wrong answer more CONFIDENT",
        "back": "n=2k → −1.933 ± 0.286; n=2M → −1.889 ± 0.009. Truth +4.99. 1000× data narrowed the CI 32× and moved the estimate 0.04. Bias and variance are different axes."
      },
      {
        "type": "definition",
        "front": "ATE vs ATT vs ATU",
        "back": "Averages of τ over everyone / the treated / the untreated. Simulated: 4.99 / 6.59 / 3.40. With heterogeneous effects these are three different numbers, and your DESIGN picks which one you get."
      },
      {
        "type": "definition",
        "front": "The three identification assumptions",
        "back": "(1) conditional ignorability — UNTESTABLE. (2) SUTVA: no interference, one version of treatment — UNTESTABLE. (3) positivity/overlap — the ONLY one the data can check."
      },
      {
        "type": "intuition",
        "front": "What randomization actually buys",
        "back": "Ignorability by construction: a coin flip cannot correlate with potential outcomes. Same estimator, same Y(0)/Y(1), randomized assignment → 4.999 [4.979, 5.019] instead of −1.89."
      },
      {
        "type": "pitfall",
        "front": "The deleted-column test",
        "back": "The measured confounder had SMD 1.257 (12× the 0.1 flag). Delete the column: bias unchanged to the last decimal, balance table now reports perfect balance. Diagnostics see only what you logged."
      },
      {
        "type": "pitfall",
        "front": "Which diagnostics stay silent under confounding?",
        "back": "Residual normality ✓, homoscedasticity ✓, p < 1e−300 ✓, R² an ordinary 0.022 ✓ — all pass while the sign is wrong. Fit measures agreement with OBSERVED outcomes; the counterfactual isn't there to disagree."
      },
      {
        "type": "pitfall",
        "front": "Where SUTVA breaks in real systems",
        "back": "Marketplaces (shared inventory → control made worse, lift overstated), social feeds (spillover → effect shrunk), shared budgets/caches/retrained models. Fix is DESIGN: randomize at the level containing the interference."
      },
      {
        "type": "definition",
        "front": "Positivity / overlap",
        "back": "0 < P(T=1|X) < 1 in every stratum. Where it fails there is no comparison — the estimate is functional-form extrapolation. Check with a propensity histogram by arm, not per-variable balance."
      },
      {
        "type": "intuition",
        "front": "★ The transferable question",
        "back": "\"What would have to be true for this number to be causal, and would the data tell me if it weren't?\" In prediction the test set adjudicates. Here the counterfactual is in no split, so nothing adjudicates."
      }
    ],
    "refs": [
      {
        "title": "Rubin (1974), Estimating Causal Effects of Treatments in Randomized and Nonrandomized Studies",
        "url": "https://psycnet.apa.org/doi/10.1037/h0037350"
      },
      {
        "title": "Holland (1986), Statistics and Causal Inference",
        "url": "https://www.jstor.org/stable/2289064"
      },
      {
        "title": "Imbens & Rubin (2015), Causal Inference for Statistics, Social, and Biomedical Sciences",
        "url": "https://www.cambridge.org/core/books/causal-inference-for-statistics-social-and-biomedical-sciences/71126BE90C58F1A431FE9B2DD07938AB"
      },
      {
        "title": "Hernan & Robins, Causal Inference: What If (free textbook)",
        "url": "https://www.hsph.harvard.edu/miguel-hernan/causal-inference-book/"
      },
      {
        "title": "VanderWeele & Ding (2017), Sensitivity Analysis in Observational Research: Introducing the E-Value",
        "url": "https://www.acpjournals.org/doi/10.7326/M16-2607"
      }
    ],
    "demos": [
      "do-intervention",
      "regression",
      "clt",
      "simpsons-paradox"
    ]
  },
  "causal-graphs": {
    "level": "core",
    "body": {
      "intuition": [
        "A causal graph is a way of writing your assumption down so that other people can attack it. That is its entire job. It does not extract causation from correlation and it does not tell you which arrows to draw - you supply the arrows from domain knowledge, and the graph converts them into testable implications and an unambiguous rule for which variables to control for.",
        "Everything follows from three three-node patterns. A CHAIN X -> M -> Y passes association until you condition on M. A FORK X <- Z -> Y passes association until you condition on Z. A COLLIDER X -> C <- Y passes NOTHING until you condition on C, and then it starts. In simulation the chain and fork both went from about +0.5 to +0.002 when conditioned on the middle node, and the collider went from -0.001 to -0.501. Two independent causes became strongly correlated because we looked at their common effect.",
        "The collider is the pattern that makes 'control for everything you have' wrong, and it is why more controls can make an estimate worse. The demonstration that should stay with you: adding controls raised R-squared monotonically from 0.898 to 0.987 while the causal estimate moved from 3.80 to 0.50 against a true value of 3.80. THE BEST-FITTING MODEL WAS THE MOST WRONG ONE."
      ],
      "math": [
        {
          "h": "d-separation: a graph question with a purely mechanical answer",
          "paras": [
            "A path is blocked if it contains a non-collider you conditioned on, or a collider you did NOT condition on and none of whose descendants you conditioned on. Two variables are d-separated given a set if every path between them is blocked.",
            "The colliders' rule is inverted relative to the others, which is the entire source of difficulty. Once you can trace paths, the algorithm is graph search - there is no statistics in it."
          ],
          "tex": "\\text{chain } X\\!\\to\\! M\\!\\to\\! Y:\\ \\rho=0.578 \\to 0.002 \\mid M \\qquad \\text{fork } X\\!\\leftarrow\\! Z\\!\\to\\! Y:\\ \\rho=0.501 \\to 0.002 \\mid Z \\qquad \\text{collider } X\\!\\to\\! C\\!\\leftarrow\\! Y:\\ \\rho=-0.001 \\to -0.501 \\mid C",
          "texNote": "Conditioning BLOCKS in the first two and OPENS in the third. Selection is conditioning in disguise: restricting the sample to the top 20% of the collider produced a correlation of -0.356 between two variables generated independently."
        },
        {
          "h": "The backdoor criterion",
          "paras": [
            "A set Z is admissible if it blocks every path from T to Y that starts with an arrow INTO T, and contains no descendant of T. Then the interventional distribution is identified by adjustment.",
            "The second clause is what rules out mediators and colliders on the causal side, and it is exactly the clause 'control for everything' violates."
          ],
          "tex": "P(Y\\mid do(T{=}t)) = \\sum_{z} P(Y\\mid T{=}t, Z{=}z)\\,P(Z{=}z)",
          "texNote": "Note the second factor: P(z), not P(z | t). That single difference is the whole distinction between observing and intervening - you re-weight to the population's covariate distribution rather than the treated group's."
        },
        {
          "h": "What the data can and cannot identify about the graph",
          "paras": [
            "Observational data determines the graph only up to a Markov equivalence class: DAGs sharing the same skeleton and the same v-structures are indistinguishable, no matter how much data you collect.",
            "Three of the four three-node graphs below produce numerically identical correlation structure. The collider is the one the data CAN pick out, because its signature is inverted."
          ],
          "tex": "\\begin{array}{lcccc} \\text{DAG} & \\rho(X,M) & \\rho(M,Y) & \\rho(X,Y) & \\rho(X,Y\\mid M)\\\\ X\\to M\\to Y & 0.800 & 0.600 & 0.480 & -0.000\\\\ X\\leftarrow M\\leftarrow Y & 0.800 & 0.599 & 0.479 & -0.000\\\\ X\\leftarrow M\\to Y & 0.800 & 0.600 & 0.480 & 0.002\\\\ X\\to M\\leftarrow Y & 0.601 & 0.601 & 0.001 & -0.563 \\end{array}",
          "texNote": "Rows 1-3 agree to three decimals at n = 1,000,000. Intervening on X changes Y in row 1 and in none of the others. Discovery algorithms return the CLASS, and choosing within it is a modelling decision you make, not a result the data hands you."
        }
      ],
      "code": [
        {
          "h": "'Adjust for everything you have' is wrong, measured",
          "paras": [
            "Z is a genuine confounder, Med is a mediator on the causal path, Col is caused by both treatment and outcome. True total effect 3.800."
          ],
          "code": "# Z   -> T,  T -> Med -> Y,  T -> Y,  Z -> Y,  T -> Col <- Y\n\n# Y ~ T                     4.298   confounded\n# Y ~ T + Z    (BACKDOOR)   3.803   <- correct, and the SMALLEST model that is\n# Y ~ T + Z + Med           1.998   <- mediator blocks the indirect path\n# Y ~ T + Z + Col           0.131   <- collider opens a spurious path\n# Y ~ T + Z + Med + Col     0.504   <- kitchen sink\n\n# and the fit statistic, over the same four rows:\n#   R^2   0.8978 -> 0.9125 -> 0.9732 -> 0.9865      MONOTONICALLY BETTER\n\n# ★ The best-fitting model is the most wrong one, and no quantity computed\n#   from the residuals can tell the difference. The DAG can.",
          "caption": "Model selection by predictive fit selects against the correct causal specification here. That is not a quirk of this simulation; it is what fit statistics are for."
        },
        {
          "h": "The three rules of do-calculus, and what they are for",
          "paras": [
            "Each rule licenses a rewrite of an expression containing do(). Applied repeatedly, they either reduce the expression to observational quantities - identified - or they do not, and the effect is not identifiable from that graph."
          ],
          "code": "# Rule 1  insert/delete an OBSERVATION\n#   P(y | do(t), z, w) = P(y | do(t), w)      if (Y ⫫ Z | T,W) in G_T̄\n\n# Rule 2  exchange an ACTION for an OBSERVATION   <- this is the backdoor rule\n#   P(y | do(t), w)    = P(y | t, w)          if (Y ⫫ T | W) in G_T_\n\n# Rule 3  insert/delete an ACTION\n#   P(y | do(t), w)    = P(y | w)             if (Y ⫫ T | W) in G_T̄(W)\n\n# ★ COMPLETENESS (Shpitser & Pearl 2006): if these three rules cannot reduce\n#   the expression, NO method can identify it from that graph and observational\n#   data. A negative answer here is a proof, not a failure to find a trick.",
          "caption": "The completeness result is why the framework is worth learning: it answers 'is this even possible' before you spend a quarter estimating it."
        }
      ],
      "useCases": [
        "Deciding an adjustment set before you fit anything, which turns a modelling argument into a graph argument that a domain expert with no statistics can join.",
        "Reviewing someone else's regression: ask what each control is, and whether any of them is caused by the treatment. Post-treatment controls are the single most common error in applied work.",
        "Diagnosing suspicious correlations in observational logs, where sample restriction - only logged-in users, only sessions over 30 seconds, only successful requests - is collider conditioning by another name.",
        "Deriving falsification tests: a proposed DAG implies specific conditional independences, and those can be checked in the data even though the DAG itself cannot."
      ],
      "pitfalls": [
        "Controlling for a mediator when you want the total effect. The estimate drops to the direct effect - 1.998 against a truth of 3.800 - and it looks like a well-behaved regression the whole time.",
        "Controlling for a collider. It manufactures association where none existed: 0.131 against a truth of 3.800, and the conditional correlation between two independent variables went from -0.001 to -0.501.",
        "Selecting the sample on a collider. Restricting to the top 20% of a common effect produced a -0.356 correlation between independent variables. 'Only users who converted' and 'only patients who were admitted' are this exact mistake.",
        "Choosing controls by what improves R-squared or held-out loss. Fit rose monotonically across the sequence in which the causal estimate degraded by 87%.",
        "Believing a causal discovery algorithm outputs a DAG. It outputs an equivalence class; three of the four graphs above are indistinguishable at a million samples and disagree about whether intervening on X does anything at all.",
        "Drawing the graph after seeing the estimates, which converts a falsifiable assumption into a post-hoc rationalisation. Draw it first, write it down, and let it be wrong.",
        "Assuming a variable is safe to include because it is 'pre-treatment'. An M-bias structure can make a pre-treatment collider harmful, so the criterion is the path, not the timestamp."
      ],
      "connections": [
        {
          "ref": "causal-inference/potential-outcomes",
          "text": "The same assumption in the other dialect: conditional ignorability given Z is exactly the statement that Z satisfies the backdoor criterion."
        },
        {
          "ref": "causal-inference/confounding",
          "text": "The fork pattern at full strength, with a real dataset where the sign reverses and the deciding fact is not in the table."
        },
        {
          "ref": "causal-inference/instrumental-variables",
          "text": "What to do when no admissible adjustment set exists - a different graph pattern that identifies the effect without ever measuring the confounder."
        },
        {
          "ref": "unsupervised-learning/bayesian-inference",
          "text": "Graphical models used for the other purpose - factorizing a joint distribution for inference - where the arrows carry no interventional meaning and the same picture means something weaker."
        },
        {
          "ref": "trustworthy-ai/fairness",
          "text": "Where the mediator-versus-confounder distinction becomes a legal and ethical question, because path-specific effects decide which discrimination pathways count."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Name the three elementary path structures.",
          "a": "Chain X→M→Y, fork X←Z→Y, collider X→C←Y. Conditioning blocks the first two and OPENS the third."
        },
        {
          "q": "State d-separation in one sentence.",
          "a": "A path is blocked if a conditioned non-collider sits on it, or an unconditioned collider (with no conditioned descendant) sits on it; d-separated means every path is blocked."
        },
        {
          "q": "What is the backdoor criterion?",
          "a": "Z blocks every path from T to Y with an arrow into T, and contains no descendant of T. Then adjusting for Z identifies the causal effect."
        },
        {
          "q": "Why is the second clause of the backdoor criterion there?",
          "a": "It excludes post-treatment variables - mediators and colliders - which are exactly what 'control for everything' wrongly includes."
        },
        {
          "q": "Write the adjustment formula and say what is unusual about it.",
          "a": "P(Y|do(t)) = Σ_z P(Y|t,z)P(z). The weight is P(z), not P(z|t) — that is the difference between intervening and observing."
        },
        {
          "q": "What is a Markov equivalence class?",
          "a": "The set of DAGs with the same skeleton and same v-structures. Observational data cannot distinguish within it, however large."
        },
        {
          "q": "Which three-node graphs are indistinguishable from data?",
          "a": "X→M→Y, X←M←Y and X←M→Y — identical to three decimals at n=1M. Only the collider X→M←Y is separable."
        },
        {
          "q": "What happens if you control for a mediator?",
          "a": "You get the direct effect, not the total. Simulated: 1.998 against a true total of 3.800."
        },
        {
          "q": "What happens if you control for a collider?",
          "a": "You open a spurious path. Simulated: 0.131 against a true 3.800, and independent variables went to ρ = −0.501."
        },
        {
          "q": "How is sample selection related to colliders?",
          "a": "Selection IS conditioning. Restricting to the top 20% of a common effect produced ρ = −0.356 between independent variables."
        },
        {
          "q": "Can R-squared help you choose controls?",
          "a": "No, and it actively misleads: R² rose 0.898→0.987 across the exact sequence in which the causal estimate fell from 3.80 to 0.50."
        },
        {
          "q": "What does the completeness of do-calculus give you?",
          "a": "If the three rules cannot reduce the expression, no method identifies that effect from that graph and observational data. A proof of impossibility, not a failed search."
        }
      ],
      "standard": [
        {
          "q": "Explain d-separation and the backdoor criterion, and why the collider case is the one that trips people.",
          "a": "D-SEPARATION IS A GRAPH-SEARCH QUESTION WITH A MECHANICAL ANSWER. Association flows along paths, and a path is blocked in one of two ways: a non-collider on it that you conditioned on, or a collider on it that you did NOT condition on and none of whose descendants you conditioned on. Two variables are d-separated given a set when every path between them is blocked, which implies conditional independence. The three primitives are chain X→M→Y, fork X←Z→Y and collider X→C←Y, and in simulation the chain went from ρ = 0.578 to 0.002 given M, the fork from 0.501 to 0.002 given Z, and the collider from −0.001 to −0.501 given C. THE COLLIDER'S RULE IS INVERTED, which is the whole source of difficulty: for two of the three patterns conditioning removes association, and for the third it creates it. THE BACKDOOR CRITERION IS THE PAYOFF. A set Z is admissible if it blocks every path from T to Y that begins with an arrow into T, and contains no descendant of T. Then P(Y|do(t)) = Σ_z P(Y|t,z)P(z) — note P(z) and not P(z|t), which is precisely the difference between intervening and observing. The second clause is the one that makes 'adjust for everything you have' wrong, because everything you have usually includes post-treatment variables.",
          "deepDive": "The reason people trip on colliders is that the intuition transfers wrongly from prediction, where more conditioning is more information and the worst case is variance. Here conditioning has a direction. The cleanest way to internalise it is the selection version: restrict the sample to the top 20% of a variable that two independent causes both feed, and those causes acquire ρ = −0.356. That is not a subtle bias, and it has a familiar shape — among admitted patients, among users who converted, among applicants who were hired, among papers that got published. Each of those is a collider restriction, and each manufactures a negative association between the qualities that got you in. The practical habit worth building is that every filter in a query is a conditioning statement, so a WHERE clause deserves the same scrutiny as a covariate list. Note also that the timestamp heuristic is not quite safe: M-bias is a structure where a pre-treatment variable is a collider on a path between two unmeasured confounders, so conditioning on it opens a backdoor. The criterion is about paths, not about when the variable was recorded."
        },
        {
          "q": "Your colleague adds every available column as a control 'to be safe'. Show them why that is not safe.",
          "a": "I WOULD RUN THE FOUR-ROW TABLE, BECAUSE IT IS FASTER THAN THE ARGUMENT. Simulate a confounder Z that causes both treatment and outcome, a mediator on the path T→Med→Y, and a collider caused by both T and Y, with a known total effect of 3.800. Regressing Y on T alone gives 4.298, confounded. Adding Z — the correct backdoor set — gives 3.803. Adding the mediator on top gives 1.998, because conditioning on Med blocks the indirect path and leaves the direct effect. Adding the collider gives 0.131, because it opens a spurious path. The kitchen sink gives 0.504. SO THE CORRECT MODEL IS THE SECOND-SMALLEST ONE, and three of the four specifications are wrong in three different directions. THEN THE PART THAT LANDS: R-squared over the same sequence goes 0.8978, 0.9125, 0.9732, 0.9865. It improves monotonically, exactly as the causal estimate degrades by 87%. If you select controls by fit, cross-validated loss, or feature importance, you will reliably choose the worst specification, because those criteria measure agreement with observed Y and every post-treatment variable is enormously informative about observed Y. 'To be safe' has it backwards — including a variable is a claim, and the safe default is to include only what an argument justifies.",
          "deepDive": "There is a legitimate version of the colleague's instinct, and it is worth granting so the advice is actionable rather than just prohibitive. Adding PRE-TREATMENT variables that predict the outcome but not treatment is usually beneficial: it does not bias the estimate and it reduces residual variance, so precision improves. Adding pre-treatment variables that predict TREATMENT but not the outcome is the bad kind of harmless — they are instruments-in-waiting, and conditioning on them amplifies whatever unmeasured confounding bias exists, a phenomenon known as Z-bias or bias amplification. So the ranking is: confounders first, then outcome predictors for precision, never treatment-only predictors, never anything post-treatment. If you genuinely do not know the structure, the honest move is to present the estimate under several defensible adjustment sets and report the range, which at least converts a hidden choice into a visible one. What you must not do is pick the specification after seeing which gives the most publishable number, because at that point the graph has become a rationalisation rather than an assumption."
        },
        {
          "q": "What can a causal discovery algorithm actually give you from observational data?",
          "a": "THE EQUIVALENCE CLASS, AND NOT MORE. Constraint-based methods like PC and FCI test conditional independences and return a CPDAG — a graph where some edges are directed and some remain undirected because the data cannot orient them. The reason is structural, not statistical: DAGs sharing a skeleton and the same v-structures imply exactly the same set of conditional independences, so they are observationally equivalent at any sample size. In simulation, X→M→Y, X←M←Y and X←M→Y produced ρ(X,M) = 0.800, ρ(M,Y) ≈ 0.600, ρ(X,Y) ≈ 0.480 and ρ(X,Y|M) ≈ 0.000 — agreeing to three decimals at a million samples. AND THEY DISAGREE ABOUT EVERYTHING THAT MATTERS: intervening on X changes Y in the first and does nothing in the other two. The collider X→M←Y is the one case the data separates, with ρ(X,Y) = 0.001 rising to −0.563 once you condition, an inverted signature nothing else produces. So discovery is genuinely useful for narrowing hypotheses and for finding structure you did not think of, and it is not a substitute for the assumption. Orientation within the class comes from outside the data: time ordering, domain knowledge, an experiment, or a functional-form assumption such as additive non-Gaussian noise.",
          "deepDive": "Those functional-form escapes are worth knowing because they are frequently oversold. LiNGAM identifies the direction when relations are linear and noise is non-Gaussian, exploiting the fact that independence of the residual holds in only one direction; ANM and post-nonlinear models do the analogous thing for nonlinear relations with additive noise. Both are real theorems, and both fail quietly when their functional assumption is violated — which is the module's thesis restating itself, since the identification is again bought by an untestable assumption, just one about functional form rather than about confounding. The other practical limitation is that PC assumes causal sufficiency, meaning no unmeasured confounders, which is exactly what you would not assume if you were being careful; FCI relaxes it and pays by returning a still weaker object, a PAG, in which many edges say only 'these are related somehow'. My honest summary in an interview: use discovery to generate candidate structures and to check that the structure you believe is not refuted by the implied independences, then get orientation from design."
        },
        {
          "q": "Walk through the three rules of do-calculus and say what the completeness result means practically.",
          "a": "EACH RULE LICENSES A REWRITE OF AN EXPRESSION CONTAINING do(), justified by a d-separation statement in a MUTILATED graph. Rule 1 inserts or deletes an observation: P(y|do(t),z,w) = P(y|do(t),w) when Y is d-separated from Z given T and W in the graph with arrows into T removed. Rule 2 exchanges an action for an observation: P(y|do(t),w) = P(y|t,w) when Y is d-separated from T given W in the graph with arrows OUT of T removed — this is the backdoor rule, and it is the one that does the work in most applied problems. Rule 3 deletes an action entirely: P(y|do(t),w) = P(y|w) under d-separation in a graph with arrows into a subset of T removed. You apply them repeatedly, and either the do() operators disappear — leaving an expression in observational quantities, so the effect is IDENTIFIED and you now know exactly what to estimate — or they do not. THE COMPLETENESS RESULT SAYS THE SECOND CASE IS FINAL: if these three rules cannot eliminate the do(), then no method whatsoever identifies that effect from that graph plus observational data. Practically, that is a decision procedure you can run before committing resources, and a negative answer is a proof rather than a failure of imagination.",
          "deepDive": "The practical value shows up in two situations. The first is front-door identification, which is the reason to know rule 2 in both directions: if T→M→Y with an unmeasured confounder between T and Y but none touching M, the effect is identified even though no admissible adjustment set exists, by chaining T→M and M→Y. That is a genuinely surprising result and it is unreachable by backdoor reasoning alone. The second is the negative case — someone proposes a study, you sketch the graph, the algorithm returns non-identifiable, and the correct response is to change the DESIGN, not the estimator. Find an instrument, find a discontinuity, get a natural experiment, or measure the missing variable. What you should not do is switch to a more flexible model, because non-identifiability is a statement about the target quantity and no amount of model capacity addresses it. In practice tooling handles the algebra: the ID algorithm is implemented in several libraries, so your job is drawing a defensible graph and interpreting the verdict, not doing the derivations by hand."
        },
        {
          "q": "How would you use a DAG to produce falsification tests rather than just an adjustment set?",
          "a": "A DAG IMPLIES CONDITIONAL INDEPENDENCES, AND THOSE ARE CHECKABLE EVEN THOUGH THE DAG IS NOT. Every d-separation statement in the graph is a prediction about the observed distribution, so I would enumerate them — most tooling will do this — and test each one. Failing tests do not tell you which arrow is wrong, but they do tell you the graph as drawn is inconsistent with the data, which is a real refutation and worth more than any amount of asserting the assumption. This is the closest thing to a test set that causal inference has, and it is worth being precise about its limit: passing every implied independence does not confirm the graph, because everything in the same Markov equivalence class passes identically. SECOND FAMILY: NEGATIVE CONTROLS. A negative control outcome is one the treatment cannot plausibly affect, and finding a nonzero effect there is direct evidence of an open backdoor. A negative control exposure runs it the other way. Both convert 'I believe there is no unmeasured confounding' into a number in the same format as the estimate, which is much harder to wave away. THIRD: PLACEBO AND PRE-PERIOD TESTS, estimating the effect in a window before treatment could have acted, where the answer must be zero. Fourth, if you have a subgroup with known-zero effect, estimate it and check.",
          "deepDive": "Two cautions keep this honest. First, these tests have power problems in both directions: an implied independence can fail because of a nonlinearity your test cannot see, and it can pass because your test is underpowered, so a clean falsification report should state the effect sizes it could have detected rather than just p-values. Second, running a large battery of tests and reporting that most passed is a multiple-comparisons exercise, and there is a real temptation to drop the ones that failed. The disciplined version is to pre-register the implied independences from the graph you drew BEFORE looking, then report all of them. That ordering matters more than it sounds: a graph drawn after seeing the estimates is not an assumption, it is a rationalisation, and it has lost the property that made it worth drawing — that it could have been shown wrong. The graph's real function is to make your reasoning attackable, and every one of these tests is an invitation to attack it."
        },
        {
          "q": "Someone says DAGs are academic and they will just use a flexible model. What is your response?",
          "a": "THE FLEXIBLE MODEL AND THE DAG ANSWER DIFFERENT QUESTIONS, and the flexible model does not answer theirs. Model capacity buys you a better approximation of E[Y | T, X] — the observed conditional expectation. Identification is the question of whether that object has anything to do with E[Y | do(T)], and it is settled entirely by which variables are in X and how they relate to T and Y. A gradient boosted model with a thousand features fits the confounded simulation superbly and returns a confidently wrong effect, and its excellent held-out performance is not evidence, because the counterfactual is not in the test set either. THE SHARPEST VERSION IS THE FIT TABLE: across four specifications R-squared improved monotonically 0.898 → 0.987 while the causal estimate went 4.298 → 3.803 → 1.998 → 0.504 against a truth of 3.800. Any automatic model selection procedure driven by predictive loss picks the worst one. I would also grant the legitimate half of their point: modern estimators genuinely help, and double machine learning exists precisely to let you use flexible models for the nuisance functions while keeping a valid estimate of the target. But note what DML requires as input — a set of confounders that satisfies the backdoor criterion. IT ASSUMES THE DAG. It does not discover it.",
          "deepDive": "It is worth naming what DAGs are bad at, so the defence is not evangelism. They are coarse: an arrow means 'may affect' with no sign, magnitude or functional form, so two analysts can agree on the graph and disagree wildly about the estimate. They handle feedback loops and equilibrium systems awkwardly, which matters in economics and in any system with a control loop. They say nothing about measurement error unless you draw it explicitly, and people rarely do. And in a domain with hundreds of variables the graph becomes unreadable, at which point the honest move is to draw the subgraph relevant to the specific effect and state which variables you are assuming irrelevant. The reason to use them anyway is cheapness: sketching a graph takes minutes, catches post-treatment controls immediately, and forces the assumption into a form a domain expert with no statistics can argue with. That last property is the real one — the graph's value is social as much as mathematical, because it moves the argument from 'which regression' to 'what causes what', which is the argument that actually decides the answer."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "★ What a causal graph is for",
        "back": "Writing your assumption down so others can attack it. It does not extract causation from data — you supply the arrows, and it returns testable implications plus an unambiguous adjustment set."
      },
      {
        "type": "definition",
        "front": "The three path structures",
        "back": "Chain X→M→Y (0.578 → 0.002 | M), fork X←Z→Y (0.501 → 0.002 | Z), collider X→C←Y (−0.001 → −0.501 | C). Conditioning BLOCKS the first two, OPENS the third."
      },
      {
        "type": "definition",
        "front": "d-separation",
        "back": "A path is blocked by a conditioned non-collider, or by an unconditioned collider with no conditioned descendant. All paths blocked ⇒ conditional independence. Pure graph search — no statistics in it."
      },
      {
        "type": "formula",
        "front": "Backdoor adjustment",
        "back": "P(Y|do(t)) = Σ_z P(Y|t,z)·P(z). The weight is P(z), NOT P(z|t) — that single difference is observing vs intervening."
      },
      {
        "type": "pitfall",
        "front": "★ Best-fitting model = most wrong model",
        "back": "True effect 3.800. Y~T: 4.298 | +Z: 3.803 ✓ | +mediator: 1.998 | +collider: 0.131 | kitchen sink: 0.504. R² rose monotonically 0.898→0.987 across that same sequence."
      },
      {
        "type": "pitfall",
        "front": "Selection IS conditioning",
        "back": "Restrict to the top 20% of a collider → two independently generated variables show ρ = −0.356. 'Only admitted patients', 'only converted users', 'only published papers' are all this."
      },
      {
        "type": "definition",
        "front": "Markov equivalence class",
        "back": "DAGs with the same skeleton and same v-structures imply identical conditional independences. X→M→Y, X←M←Y, X←M→Y agreed to 3 decimals at n=1M — and disagree on whether do(X) does anything."
      },
      {
        "type": "intuition",
        "front": "Which structure CAN the data identify?",
        "back": "The v-structure. Collider signature is inverted: ρ(X,Y)=0.001 marginally, −0.563 conditionally. Nothing else produces that, which is why discovery orients some edges and not others."
      },
      {
        "type": "definition",
        "front": "Rule 2 of do-calculus",
        "back": "P(y|do(t),w) = P(y|t,w) when Y ⫫ T | W in the graph with arrows OUT of T deleted. This is the backdoor rule and does most of the applied work."
      },
      {
        "type": "intuition",
        "front": "Completeness of do-calculus",
        "back": "If the three rules can't eliminate do(), NO method identifies that effect from that graph + observational data. A negative answer is a proof — change the DESIGN, not the estimator."
      },
      {
        "type": "pitfall",
        "front": "Which controls are safe to add?",
        "back": "Confounders ✓. Pre-treatment outcome predictors ✓ (precision, no bias). Treatment-only predictors ✗ (Z-bias: AMPLIFIES existing confounding). Anything post-treatment ✗."
      },
      {
        "type": "pitfall",
        "front": "Is 'pre-treatment' enough to make a control safe?",
        "back": "No. M-bias: a pre-treatment variable can be a collider between two unmeasured confounders, so conditioning opens a backdoor. The criterion is the PATH, not the timestamp."
      }
    ],
    "refs": [
      {
        "title": "Pearl (2009), Causality: Models, Reasoning and Inference (2nd ed.)",
        "url": "https://bayes.cs.ucla.edu/BOOK-2K/"
      },
      {
        "title": "Pearl (1995), Causal Diagrams for Empirical Research",
        "url": "https://www.jstor.org/stable/2337329"
      },
      {
        "title": "Shpitser & Pearl (2006), Identification of Joint Interventional Distributions in Recursive Semi-Markovian Causal Models",
        "url": "https://ftp.cs.ucla.edu/pub/stat_ser/r327.pdf"
      },
      {
        "title": "Spirtes, Glymour & Scheines (2000), Causation, Prediction, and Search",
        "url": "https://mitpress.mit.edu/9780262194402/causation-prediction-and-search/"
      },
      {
        "title": "Cinelli, Forney & Pearl (2022), A Crash Course in Good and Bad Controls",
        "url": "https://journals.sagepub.com/doi/10.1177/00491241221099552"
      }
    ],
    "demos": [
      "do-intervention",
      "simpsons-paradox",
      "bfs-dfs-astar",
      "regression"
    ]
  },
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
          "deepDive": "The part worth pushing on is that 'always disaggregate' is the wrong lesson to take away, and this dataset can demonstrate it. Imagine the identical four cells with the third variable measured AFTER treatment — say a post-operative complication that the treatment itself causes. Now it is a mediator on the causal path, adjusting for it blocks part of the effect you are trying to measure, and the correct comparison is the crude one, where B wins by 4.6 points. So the same table supports opposite recommendations depending on a fact that is nowhere in it: when the covariate was determined relative to treatment. That is why the habit to build is asking about the data-generating process rather than reaching for a default rule, and it is why this lesson sits early in the module. It also explains a common real-world pattern: two analysts, same data, opposite conclusions, both computing correctly. The disagreement is not about statistics at all — it is about a causal claim, and it can only be settled by argument about the process."
        },
        {
          "q": "A dashboard shows overall conversion down 3% while every acquisition channel is up. What do you tell the team?",
          "a": "THIS IS ALMOST CERTAINLY A MIX SHIFT, AND THE OVERALL NUMBER IS NOT THE ONE TO DEBUG. The aggregate rate is a weighted average over channels, and the weights are traffic share, so if share moved toward a structurally lower-converting channel the total can fall while every component rises. FIRST I WOULD PRODUCE THE DECOMPOSITION rather than assert it: split the change into a within-channel component, holding last period's mix fixed, and a between-channel component, holding each channel's rate fixed. If the between term accounts for the drop, the story is settled in one table and the team can stop looking for a regression in the funnel. THEN THE ACTUAL QUESTION, which is what to do about it, and that depends on why the mix moved. If marketing deliberately shifted spend toward a cheaper, lower-converting channel, the aggregate drop may be exactly the intended trade and the right metric is downstream — revenue per dollar, not conversion rate. If the mix moved because a high-converting channel broke or was throttled, that is the real incident and the conversion dashboard is a lagging symptom of it. I would also check that channel is not post-treatment relative to whatever change is under suspicion, because if a release altered which channels users arrive through, conditioning on channel is conditioning on a mediator.",
          "deepDive": "Two operational habits follow from this. First, mix-adjusted versions of headline metrics are worth maintaining permanently — a conversion rate standardized to a fixed reference mix, reported alongside the raw one — because the pair immediately separates 'behaviour changed' from 'population changed', and teams stop rediscovering this from scratch each quarter. The cost is that the reference mix goes stale and eventually needs re-basing, which should be a deliberate, announced event. Second, the same structure is why model-monitoring dashboards mislead: aggregate accuracy dropping while per-segment accuracy is flat means traffic composition moved, and retraining will not help because nothing about the conditional distribution changed. The inverse also happens and is more dangerous, because aggregate accuracy can hold steady while a segment degrades badly, hidden by that segment being small. That is the argument for reporting segmented metrics by default rather than on request — the aggregate is a weighted average, and a weighted average can conceal a reversal in either direction."
        },
        {
          "q": "How do you decide whether to adjust for a particular variable?",
          "a": "I ASK WHEN IT WAS DETERMINED AND WHAT IT CAUSES, in that order, because those two facts settle it and no property of the data does. IF IT WAS DETERMINED BEFORE TREATMENT AND CAUSES BOTH treatment and outcome, it is a confounder on a backdoor path and I adjust. IF IT WAS DETERMINED AFTER TREATMENT, I almost never adjust: if it is on the causal path it is a mediator and adjusting silently changes the estimand from total effect to direct effect, which in the graph lesson's simulation moved a true 3.800 to 1.998; if it is caused by both treatment and outcome it is a collider and adjusting manufactures bias, which moved the same 3.800 to 0.131. IF IT IS PRE-TREATMENT BUT PREDICTS ONLY THE OUTCOME, adjusting is harmless and improves precision, so I include it. IF IT IS PRE-TREATMENT BUT PREDICTS ONLY TREATMENT, I exclude it — conditioning on a near-instrument amplifies whatever unmeasured confounding already exists, which is Z-bias, and it is the counterintuitive case people get wrong. What I do NOT do is decide by looking at whether the coefficient changes, or whether fit improves, because both criteria systematically select the wrong specification.",
          "deepDive": "The 'change-in-estimate' heuristic deserves a specific rebuttal because it is still taught and still used: the rule says include a covariate if adding it moves the treatment coefficient more than some threshold, typically 10%. Every one of the harmful controls moves the coefficient a lot — the collider moved it by 97% — so the heuristic is not merely weak, it is anti-correlated with correctness in exactly the cases that matter. The timestamp rule is much better but has a known exception worth being able to name: M-bias, where a pre-treatment variable is a collider between two unmeasured confounders, so conditioning on it opens a backdoor that was closed. In practice M-bias is rarer and weaker than the mediator and collider cases, so 'never adjust for post-treatment variables, adjust for pre-treatment confounders, and be suspicious of pre-treatment variables that predict only treatment' is a good working policy. When the structure is genuinely uncertain, report the estimate under several defensible adjustment sets and show the range, which converts a hidden analytic choice into a visible one the reader can price."
        },
        {
          "q": "You cannot rule out unmeasured confounding. How do you report the result responsibly?",
          "a": "I QUANTIFY WHAT IT WOULD TAKE TO OVERTURN THE RESULT, rather than asserting that nothing was missed. The E-value is the cheapest version: it converts the observed association into the minimum strength an unmeasured confounder would need — on the risk-ratio scale, with BOTH treatment and outcome — to explain it away entirely, via E = RR + √(RR(RR−1)). Concretely, an observed RR of 1.06 has an E-value of 1.31, an RR of 1.25 gives 1.81, 1.50 gives 2.37, 2.00 gives 3.41 and 3.00 gives 5.45. THE VALUE OF REPORTING IT IS THAT IT MAKES THE CLAIM ARGUABLE: a reader can compare 1.31 against confounders they know about and immediately see that stone size, or age, or baseline severity would clear that bar without effort, whereas an E-value of 5.45 would require an unmeasured factor stronger than anything typically observed in that field. It also disciplines the writeup, because weak associations turn out to need only weak confounders, which is a quantitative reason to distrust small observational effects rather than a stylistic preference. ALONGSIDE IT I WOULD REPORT FALSIFICATION EVIDENCE: a negative-control outcome the treatment cannot affect, a pre-period placebo estimate that should be zero, and the adjustment-set range, so the reader sees both how fragile the number is and what tests it survived.",
          "deepDive": "The honest limits of the E-value are worth stating in the same breath, because it is often used as a talisman. It addresses a single unmeasured confounder on the risk-ratio scale and says nothing about selection bias, differential measurement error, or several weak confounders acting jointly — and joint action is the realistic case, since three confounders at RR 1.4 each can do the work of one at a much higher value. It is also a bound on what is REQUIRED, not evidence about what EXISTS: an E-value of 5.45 does not mean no such confounder is present, only that a weaker one would not suffice. And it uses the observed association, so it inherits any bias in that estimate. The broader framework here is the Cornfield-style sensitivity tradition, and the modern versions — Rosenbaum bounds for matched designs, and Cinelli and Hazlett's partial-R² sensitivity for regression — give richer answers, including how the estimate moves under a confounder as strong as a named observed covariate. That last framing, 'as strong as age', tends to be far more persuasive to a non-technical audience than any number on the RR scale."
        },
        {
          "q": "Why is Simpson's paradox described as arithmetic rather than a statistical anomaly, and does that distinction matter?",
          "a": "IT MATTERS BECAUSE IT TELLS YOU WHICH TOOLS ARE IRRELEVANT. The reversal follows from the identity that a pooled rate is Σ_z w_z · rate_z with treatment-specific weights, and with weights of 75.1% versus 22.9% on the worse stratum, A's average is dragged below B's despite winning both rows. Nothing probabilistic is involved: multiply every cell by a thousand and the rates and the reversal are bit-for-bit identical. SO EVERY STATISTICAL INSTINCT IS THE WRONG REACH — bigger samples, tighter intervals, a better test, a more flexible model, bootstrapping the difference. None of them touch it, because there is no sampling error to reduce, and reaching for them wastes the effort that should go into the actual question. THE ACTUAL QUESTION IS CAUSAL: which weighting corresponds to the intervention you care about. Standardizing to the pooled mix answers 'what if we gave everyone A', the crude comparison answers 'what happened under the existing assignment policy', and both are legitimate quantities that happen to disagree by ten points here. Framing it as arithmetic also explains why it is so common — it needs only imbalanced weights, which is the normal condition of observational data, not a rare pathology.",
          "deepDive": "There is a genuinely surprising corollary: because the reversal is arithmetic, it can be constructed to any degree you like, and further stratification does not converge to a stable answer. Add a third variable and the sign can flip back; add a fourth and it can flip again. There is no 'most disaggregated' level that is automatically correct, which kills the intuition that finer slicing gets you closer to truth. What terminates the regress is not more data but the causal structure — the backdoor criterion names a specific set that suffices, and conditioning on more than that set is not more rigorous, it is often worse. The related result on the continuous side is the ecological fallacy and its mirror, the atomistic fallacy: group-level regression coefficients and individual-level ones need not even share a sign, and Robinson's 1950 example of literacy and immigration status is the classic. Both are the same phenomenon — an aggregate is a weighted summary, and summaries can order differently from their parts whenever the weights differ."
        },
        {
          "q": "What does this lesson establish about what data can and cannot settle?",
          "a": "IT ESTABLISHES THE LIMIT CASE: two analyses of the SAME FOUR NUMBERS, both arithmetically correct, giving opposite recommendations, with nothing in the dataset that adjudicates. Adjust for stone size and A is better by 5.4 points; do not adjust and B is better by 4.6. Which is right depends on whether the covariate was determined before or after treatment, and that fact is a property of the world, not of the table. You could hand this dataset to any algorithm ever written and it could not recover it. THAT IS THE MODULE'S THESIS AT ITS MOST LITERAL: the assumption is the estimate. It also reframes what the rest of the module is doing. Randomization, instruments, matching, difference-in-differences and synthetic control are not competing estimators of one quantity — they are different ways of BUYING the missing fact, each at a different price, and each with a different failure mode when the purchase does not go through. And it sets the standard for a writeup: because the deciding fact is external, it has to be stated externally, as an argument about the process by which units came to be treated, with sensitivity analysis attached so the reader can price the assumption rather than take it on trust.",
          "deepDive": "There is a useful contrast with the rest of machine learning here that is worth making explicit, because it changes how you should read causal papers. In supervised learning, disagreements about method are settled empirically: two people propose different models, they run both on held-out data, and the comparison is decisive. That whole apparatus is unavailable here, since the counterfactual outcome is absent from every split by construction — no test set contains what would have happened. So the literature's quality control has to come from elsewhere, and it comes from three places: transparency about the assumption, falsification tests that could refute it, and replication across designs whose assumptions fail differently. The last one is the strongest and the most underrated. If an instrumental-variables study, a difference-in-differences study and a matched cohort study all land near the same estimate, that is real evidence, not because any one is trustworthy but because their assumptions are unlikely to be wrong in the same direction. Triangulation across designs is the closest thing this field has to a test set, and it is the standard worth holding your own work to."
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
    ]
  },
  "instrumental-variables": {
    "level": "advanced",
    "body": {
      "intuition": [
        "Every method so far required you to MEASURE the confounder. An instrument is the trick that works when you cannot. Find a variable Z that shoves treatment around but has no other route to the outcome, and the variation in T that Z explains is as good as randomized - even though the rest of T is hopelessly confounded. You then use only that slice.",
        "The mechanics are a ratio: how much Y moves when Z moves, divided by how much T moves when Z moves. In simulation with an unmeasured confounder, OLS returned 2.702 against a truth of 2.000, and two-stage least squares with a valid instrument returned 2.004.",
        "The lesson's sting is what happens to the diagnostics. IV has exactly one well-known check, the first-stage F-statistic, and it tests STRENGTH. Weaken the instrument and F falls from 30,861 to 2.8 and correctly flags the problem. Now hold the instrument strong and violate the exclusion restriction instead: the estimate walks from 2.003 to 2.503 while the F-statistic sits at 30,731 in EVERY row. The one diagnostic you have is blind to the one assumption that cannot be tested."
      ],
      "math": [
        {
          "h": "The three conditions, and which of them is checkable",
          "paras": [
            "Relevance is a statement about the observed joint distribution of Z and T, so the data can speak to it. The other two are statements involving the unobserved confounder and the potential outcomes, so they cannot be tested with one instrument.",
            "This is the module's thesis again in a specific costume: the estimate is bought by exclusion, and exclusion is exactly the part no software will check for you."
          ],
          "tex": "\\text{(1) relevance } \\mathrm{Cov}(Z,T)\\neq 0 \\ \\ \\textbf{testable} \\qquad \\text{(2) exogeneity } Z \\perp U \\qquad \\text{(3) exclusion: } Z \\text{ affects } Y \\text{ ONLY through } T",
          "texNote": "With more instruments than endogenous regressors an overidentification test becomes available, but it only checks whether the instruments AGREE - if they are all invalid in the same direction, it passes cleanly."
        },
        {
          "h": "The Wald estimator, and why bias is amplified",
          "paras": [
            "The estimator is a ratio of reduced form to first stage. Any direct path from Z to Y, of size gamma, lands in the numerator and is divided by the instrument's strength pi.",
            "So the two failure modes multiply. A weak instrument is bad on its own; a weak instrument with a small validity problem is a disaster."
          ],
          "tex": "\\hat{\\beta}_{IV} = \\frac{\\mathrm{Cov}(Z,Y)}{\\mathrm{Cov}(Z,T)} \\ \\longrightarrow\\ \\beta + \\frac{\\gamma}{\\pi}, \\qquad \\frac{\\gamma}{\\pi} = 0.10,\\ 0.333,\\ 1.000 \\ \\text{ vs measured bias } 0.100,\\ 0.329,\\ 0.942",
          "texNote": "The predicted amplification matches the simulation to two decimals. At pi = 0.1 a direct effect of gamma = 0.1 - a twentieth the size of the true effect - produces a bias of +0.94 on a true value of 2.00."
        },
        {
          "h": "What IV actually estimates: LATE, not ATE",
          "paras": [
            "With heterogeneous effects and imperfect compliance, IV identifies the effect on COMPLIERS - the units whose treatment status the instrument actually moved. Always-takers and never-takers contribute nothing.",
            "Compliers cannot be identified individually. You know their share, not their names, which makes the estimand honest but awkward to act on."
          ],
          "tex": "\\hat{\\beta}_{IV} = \\mathbb{E}[Y(1)-Y(0)\\mid \\text{complier}] = 1.989 \\quad\\text{while}\\quad \\mathrm{ATE}=2.347,\\ \\mathrm{ATT}=3.772",
          "texNote": "In the encouragement design: 20% always-takers with effect 6.0, 50% compliers with effect 2.0, 30% never-takers with effect 0.5. The IV estimate of 1.989 is CORRECT and understates the ATE by 15%. Reporting it as 'the effect' overclaims."
        }
      ],
      "code": [
        {
          "h": "Two failure modes, one diagnostic",
          "paras": [
            "Same generative process, same estimator. The top block weakens the instrument; the bottom block keeps it strong and adds a direct path Z to Y."
          ],
          "code": "# WEAKENING THE INSTRUMENT - F sees it, and fires correctly\n#   pi     first-stage F    2SLS est     bias\n#  1.00        30,861         1.994     -0.006\n#  0.10           306         1.944     -0.056\n#  0.02            11.8       1.714     -0.286\n#  0.01             2.8       1.415     -0.585    (OLS on same data: 2.924)\n#   ^ 2SLS COLLAPSES BACK ONTO the OLS bias it was meant to fix\n\n# VIOLATING EXCLUSION - F is BLIND\n#  gamma   first-stage F    2SLS est     bias\n#   0.00        30,731         2.003     +0.003\n#   0.10        30,731         2.103     +0.103\n#   0.50        30,731         2.503     +0.503\n#   ^ IDENTICAL F in every row. The instrument is exactly as strong;\n#     it is just no longer valid, and nothing computed from the data\n#     can tell you so.",
          "caption": "F > 10 means your instrument is strong. It has never meant your instrument is good, and the two are routinely conflated in writeups."
        },
        {
          "h": "An encouragement design, and the estimand you actually get",
          "paras": [
            "Randomize the ENCOURAGEMENT, not the treatment - the standard move when you can nudge but cannot compel."
          ],
          "code": "# 20% always-takers (effect 6.0), 50% compliers (2.0), 30% never-takers (0.5)\n\n# naive as-treated:  T=1 vs T=0        5.093   contaminated by always-takers\n# ITT (Z=1 vs Z=0):                    0.996   real, policy-relevant, DILUTED\n# IV / Wald = ITT / first stage:       1.989   <- lands on LATE\n\n# true ATE  2.347      true ATT  3.772      true LATE  2.000\n\n# ★ ITT is what a rollout of the ENCOURAGEMENT would deliver.\n#   LATE is the effect on the people the encouragement moved.\n#   Neither is the ATE, and the gap is 15%.",
          "caption": "ITT and LATE answer different real questions. The mistake is reporting either one under the name 'the treatment effect'."
        }
      ],
      "useCases": [
        "Randomized encouragement designs, where you can nudge adoption but cannot force it - the most common way IV shows up in a product setting.",
        "Non-compliance in an otherwise clean experiment: randomized assignment is a valid instrument for actual take-up, which rescues the analysis without abandoning randomization.",
        "Natural experiments in policy and economics - lotteries, distance to a facility, weather, administrative cutoffs, staggered rollouts - where assignment was arbitrary for reasons unrelated to the outcome.",
        "Recommender and ads work, where a randomized ranking perturbation instruments for exposure, letting you estimate the effect of being shown an item despite selection into who sees it."
      ],
      "pitfalls": [
        "Treating the first-stage F as validation of the instrument. F was identical at 30,731 across exclusion violations that walked the estimate from 2.003 to 2.503; it measures strength only.",
        "Using a weak instrument because it is the only one available. At F = 2.8 the 2SLS estimate was 1.415 against a truth of 2.000, having collapsed toward the OLS bias of 2.924 that motivated the whole exercise.",
        "Underestimating amplification. Bias from a validity violation scales as gamma over pi, so at pi = 0.1 a direct effect one twentieth the size of the true effect produced +0.94 of bias on a true 2.00.",
        "Reporting LATE as if it were the ATE. In the encouragement design LATE was 1.989 while ATE was 2.347 and ATT 3.772 - all three correct, all three different questions.",
        "Assuming an overidentification test validates your instruments. It tests whether they agree; instruments that are invalid in the same direction pass it comfortably.",
        "Forgetting monotonicity. If the instrument pushes some units toward treatment and others away, defiers exist and the complier interpretation collapses - and nothing in the data reveals them.",
        "Using standard errors from a naively fitted second stage. The fitted values carry first-stage uncertainty, so the SEs need the 2SLS formula or a bootstrap of the whole procedure."
      ],
      "connections": [
        {
          "ref": "causal-inference/causal-graphs",
          "text": "Why an instrument works at all: it identifies the effect through a graph pattern rather than an adjustment set, which is why no admissible control set is needed."
        },
        {
          "ref": "causal-inference/ab-testing",
          "text": "Non-compliance in a live experiment, where randomized assignment instruments for actual exposure and ITT versus LATE becomes a reporting decision."
        },
        {
          "ref": "causal-inference/time-series-causality",
          "text": "Identification bought from timing rather than from an instrument - the same trade of an untestable assumption for a causal estimate, priced differently."
        },
        {
          "ref": "reinforcement-learning/bandits",
          "text": "Deliberately injected randomization as an instrument: a bandit's exploration is a logged, known-probability perturbation you can reuse for causal estimation later."
        },
        {
          "ref": "reinforcement-learning/offline-rl",
          "text": "The same structural problem at policy scale - estimating what an unobserved action would have produced from logs generated by a different policy."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What problem does an instrument solve?",
          "a": "Confounding by a variable you cannot measure. It isolates variation in treatment that is as-good-as-random without ever observing the confounder."
        },
        {
          "q": "State the three IV conditions.",
          "a": "Relevance (Cov(Z,T) ≠ 0), exogeneity (Z independent of the confounder), exclusion (Z affects Y only through T). Only relevance is testable."
        },
        {
          "q": "Write the Wald estimator.",
          "a": "β_IV = Cov(Z,Y)/Cov(Z,T) — the reduced form divided by the first stage."
        },
        {
          "q": "What does the first-stage F-statistic test?",
          "a": "Instrument STRENGTH only. F > 10 is the rule of thumb; it says nothing about validity."
        },
        {
          "q": "Show that F is blind to exclusion violations.",
          "a": "Holding strength fixed and adding a direct Z→Y path, the estimate went 2.003 → 2.503 while F stayed at 30,731 in every row."
        },
        {
          "q": "What happens to 2SLS with a very weak instrument?",
          "a": "It collapses toward the OLS bias it was meant to fix: at F=2.8 the estimate was 1.415 (truth 2.000, OLS 2.924)."
        },
        {
          "q": "How does exclusion-violation bias scale?",
          "a": "As γ/π — the direct effect divided by instrument strength. At π=0.1, γ=0.1 produced +0.94 bias on a true 2.00."
        },
        {
          "q": "What does IV estimate under heterogeneous effects?",
          "a": "LATE — the effect on compliers, the units whose treatment the instrument actually moved. Not ATE, not ATT."
        },
        {
          "q": "Name the four compliance types.",
          "a": "Always-takers, never-takers, compliers, defiers. Monotonicity assumes no defiers; you know complier SHARE, never which units they are."
        },
        {
          "q": "ITT vs LATE?",
          "a": "ITT = effect of ASSIGNMENT (0.996 in the sim) — what a rollout of the encouragement delivers. LATE = ITT / first stage = 1.989 — the effect on those it moved."
        },
        {
          "q": "Does an overidentification test validate instruments?",
          "a": "No. It tests whether instruments AGREE. Instruments invalid in the same direction pass it comfortably."
        },
        {
          "q": "Why can't you use OLS standard errors from the second stage?",
          "a": "The fitted values carry first-stage uncertainty. Use the 2SLS variance formula or bootstrap both stages together."
        }
      ],
      "standard": [
        {
          "q": "Explain instrumental variables and the conditions an instrument must satisfy.",
          "a": "AN INSTRUMENT IS A SOURCE OF VARIATION IN TREATMENT THAT HAS NO OTHER ROUTE TO THE OUTCOME. When a confounder is unmeasured, adjustment is unavailable — you cannot block a backdoor path through a variable you do not have. IV sidesteps that by finding a Z that shoves T around for reasons unrelated to the confounder, then using ONLY the slice of T that Z explains, discarding the rest as hopelessly contaminated. Mechanically it is a ratio: β_IV = Cov(Z,Y)/Cov(Z,T), the reduced form over the first stage, and two-stage least squares is the same thing computed by regressing T on Z, then Y on the fitted values. In a simulation with an unmeasured confounder, OLS gave 2.702 against a truth of 2.000, and 2SLS gave 2.004. THREE CONDITIONS ARE REQUIRED, AND ONLY ONE IS TESTABLE. Relevance, Cov(Z,T) ≠ 0, is a statement about observed variables, so the first-stage F speaks to it directly. Exogeneity, Z independent of the confounder, and the exclusion restriction, Z affecting Y only through T, both involve quantities you cannot see. So the credibility of an IV study rests entirely on a substantive argument about why the instrument could not touch the outcome except through treatment.",
          "deepDive": "The intuition worth carrying is that IV is not extracting more from the data — it is throwing data away in exchange for cleanliness. You discard all variation in T except the part Z explains, which is why the estimator is so much noisier than OLS and why weak instruments are catastrophic rather than merely inefficient. That also explains the estimand shift: the part of T you kept is the part Z moved, so the effect you recover is the effect on the units Z moved. A useful way to sanity-check a proposed instrument in an interview is to ask what the exclusion restriction would sound like as a sentence a domain expert could dispute — 'living further from a college affects earnings only by changing how much college you attend' is a claim someone can argue with, and it has been argued with for thirty years, which is exactly the right outcome. If the sentence sounds unfalsifiable or obviously false once stated plainly, the instrument is not worth using regardless of what the first stage says."
        },
        {
          "q": "Your first-stage F is 30,000. How confident are you in the estimate?",
          "a": "NOT CONFIDENT AT ALL, BECAUSE F ANSWERS A QUESTION I WASN'T WORRIED ABOUT. F measures relevance — whether the instrument moves treatment — and an F of 30,000 says only that it moves it a lot. The assumption that actually carries the estimate is exclusion, and F cannot see it. THE DEMONSTRATION IS DIRECT: holding instrument strength fixed and adding a direct path from Z to Y of increasing size, the 2SLS estimate walked 2.003 → 2.053 → 2.103 → 2.203 → 2.503, while the first-stage F sat at 30,731 in every single row. Identical diagnostic, completely different answer. SO WHAT I WOULD ACTUALLY DO is argue exclusion substantively and then test it where testing is possible. If I have more instruments than endogenous regressors I would run an overidentification test, while stating its limit — it checks agreement, so instruments invalid in the same direction pass. I would look for a subpopulation with zero first stage, where any reduced-form effect of Z on Y is direct-path evidence. I would run a pre-period or negative-control outcome the treatment cannot affect. And I would report a plausible-exogeneity sensitivity analysis: for a range of assumed direct effects γ, show what the estimate becomes.",
          "deepDive": "That last one is worth doing by default because the arithmetic is unforgiving. Bias from an exclusion violation is γ/π, so it is amplified by weak instruments, and the two failure modes multiply rather than add. Measured: at π = 1.0 a direct effect of γ = 0.1 produced +0.100 of bias; at π = 0.3 it produced +0.329; at π = 0.1 it produced +0.942 — a bias of nearly 50% of the true value from a direct path one twentieth the size of the effect being estimated. The predicted γ/π values were 0.100, 0.333, 1.000, so the formula is exact. This is why the combination that looks most attractive in practice — a clever, weak, natural instrument — is the most dangerous. And it explains a pathology in the applied literature: a paper reporting F = 12 and a large effect is often reporting amplified noise plus amplified violation. Modern practice has moved to reporting Anderson–Rubin confidence sets, which stay valid under weak instruments instead of quietly failing, and to the Lee et al. tF adjustment. If someone shows me an IV result with a big F and no discussion of exclusion, my read is that they checked the assumption they could and skipped the one that matters."
        },
        {
          "q": "What exactly does an IV estimate when treatment effects are heterogeneous?",
          "a": "THE LOCAL AVERAGE TREATMENT EFFECT — the average effect among COMPLIERS, meaning the units whose treatment status the instrument actually changed. Always-takers would have been treated regardless and never-takers would not have been treated regardless, so neither contributes any information about the effect; the instrument moved nothing for them. In an encouragement design with 20% always-takers whose effect is 6.0, 50% compliers whose effect is 2.0, and 30% never-takers whose effect is 0.5, the IV estimate came out at 1.989 — precisely LATE. The true ATE was 2.347 and the true ATT 3.772. ALL THREE ARE CORRECT ANSWERS TO DIFFERENT QUESTIONS, and calling the 1.989 'the treatment effect' understates the population average by 15% and the effect on the currently-treated by 47%. THE AWKWARD PART IS THAT COMPLIERS CANNOT BE IDENTIFIED INDIVIDUALLY. You can estimate their share from the first stage, and you can characterise them in aggregate by comparing covariate means, but you cannot label a row as a complier, because that would require knowing what they would have done under the other assignment. So the estimand is honest and hard to act on: it applies to a subpopulation defined by a counterfactual, and its policy relevance depends entirely on whether the intervention you are contemplating would move the same people.",
          "deepDive": "That last clause is the practical test and it is often favourable. If the instrument IS the policy — you are considering rolling out the encouragement itself — then compliers are exactly the people the rollout will move, and LATE is the most decision-relevant number available, more so than the ATE. If the contemplated policy is a mandate, LATE is the wrong number, because a mandate moves never-takers too and you have no evidence about them. Monotonicity deserves its own mention: LATE requires no defiers, units the instrument pushes AWAY from treatment, and nothing in the data reveals them. It is plausible for an encouragement and much less plausible for instruments like distance or price, where different subgroups can respond in opposite directions. Where monotonicity fails, the estimate is a weighted difference of complier and defier effects with some negative weights, and it can land outside the range of every individual effect in the population — an estimate that corresponds to nobody. Reporting complier characteristics, which is straightforward to compute, at least lets a reader judge how far the subpopulation is from the one they care about."
        },
        {
          "q": "An experiment had 30% non-compliance. Walk through how you would analyse it.",
          "a": "I WOULD REPORT ITT FIRST AND LATE SECOND, AND NEVER THE AS-TREATED COMPARISON. The as-treated comparison — those who actually took the treatment versus those who did not — throws away the randomization entirely, because take-up is a choice and is confounded by everything that drives it. In the simulation the as-treated number was 5.093 against a true complier effect of 2.000; it is contaminated by always-takers, who have both higher baseline outcomes and larger effects. Per-protocol analysis, dropping non-compliers, has the same problem in a more respectable-looking form. ITT COMPARES BY ASSIGNMENT, preserving randomization exactly, and it answers a real question: what a rollout of this policy actually delivers, given that some people will ignore it. It came out at 0.996. It is diluted by design, and that dilution is a genuine feature of the intervention, not a bug in the analysis. LATE THEN RESCALES ITT BY THE FIRST STAGE — divide 0.996 by the 0.50 complier share and you get 1.989, the effect on those the assignment moved. That is the number to quote when the question is about the treatment's efficacy rather than the policy's reach. I would report both with their interpretations attached, plus the compliance rate itself, since a reader cannot convert between them without it.",
          "deepDive": "Two complications come up in practice. First, differential attrition is a separate and more damaging problem than non-compliance, and it is often mistaken for it: if treated users drop out at a different rate than control, the surviving samples are no longer comparable and even ITT is broken, because you are conditioning on a post-treatment variable — survival — which is the collider case. The fix is not statistical; it is measuring outcomes for everyone assigned, including those who left, or bounding the effect with Manski or Lee bounds. Second, one-sided non-compliance, where control units cannot access the treatment, is much friendlier: there are no always-takers, so LATE equals the effect on the treated and the interpretation gets cleaner. Worth noting also that the randomization-as-instrument framing is exactly what makes this analysis defensible — assignment is randomized so exogeneity holds by construction, and exclusion is the claim that being ASSIGNED affects the outcome only through actually receiving treatment. That claim can fail: being told you are in the treatment group can change behaviour on its own, which is why blinding exists and why unblinded product experiments deserve a little suspicion."
        },
        {
          "q": "Where would you look for instruments in a product or ML setting?",
          "a": "THE BEST INSTRUMENTS ARE RANDOMIZATION YOU ALREADY PERFORMED, and most systems have more of it than people realise. An A/B test's assignment instruments for actual exposure whenever compliance is imperfect. A bandit or exploration policy injects logged, known-probability perturbations, and because the propensity is recorded rather than estimated, exogeneity holds by construction — this is the cleanest case there is. Randomized ranking perturbations in search or recommendations instrument for whether an item was seen, which lets you estimate the effect of exposure despite massive selection into who sees what. Randomized holdouts for a notification or email are encouragement designs by another name. THE SECOND FAMILY IS ARBITRARY OPERATIONAL VARIATION: staggered rollouts by region, capacity constraints, queue assignment, a cutoff in an eligibility rule, or infrastructure quirks like which datacenter served a request. These are quasi-random for reasons unrelated to the outcome, and the exclusion argument is often genuinely strong. WHAT I WOULD AVOID is the clever-sounding observational instrument — weather, distance, seasonality, a lagged value of the treatment — because in a product setting these almost always have plausible direct paths to the outcome, and the amplification arithmetic means a small direct path with a modest first stage destroys the estimate.",
          "deepDive": "The strategic version of this answer is worth giving, because it changes what you build rather than how you analyse. If exploration is what makes causal estimation possible later, then logging propensities is infrastructure, not analytics: record the assignment probability with every decision, keep a permanent small random holdout, and resist the urge to switch fully greedy the moment a model looks good. Teams that do this can answer counterfactual questions cheaply for years; teams that do not are stuck arguing about observational estimates on logs generated by a policy that changed six times. There is a real cost to state honestly — exploration means knowingly serving worse decisions to some users, and the right frame is that it buys the ability to know whether your decisions are good at all. The same logic connects directly to off-policy evaluation in recommenders and offline RL, where importance weighting requires exactly those logged propensities, and where the variance of the estimator blows up in precisely the regions the logging policy avoided. The overlap condition from the potential-outcomes lesson is the same condition wearing different notation."
        },
        {
          "q": "Summarise what IV buys and what it costs, in the module's framing.",
          "a": "IT BUYS IDENTIFICATION WITHOUT MEASURING THE CONFOUNDER, AND IT PAYS IN THREE CURRENCIES. The purchase is real and unusual: every other method in this module needs the confounder in your dataset, and IV needs only a variable with no second route to the outcome. That is why natural experiments are so valuable and why the technique survives in fields where randomization is impossible. THE FIRST COST IS AN UNTESTABLE ASSUMPTION WITH NO DIAGNOSTIC. Exclusion cannot be checked, and the one check that exists, the first-stage F, tests something else — it stayed at 30,731 while the estimate moved from 2.003 to 2.503. THE SECOND COST IS VARIANCE AND AMPLIFICATION. You discard all treatment variation except the instrumented slice, so estimates are noisy, and any violation is amplified by 1/π: at π = 0.1 a direct effect of 0.1 produced +0.94 of bias on a true 2.00. THE THIRD COST IS THE ESTIMAND. You get LATE, an effect on a subpopulation you cannot name — 1.989 when the ATE was 2.347 and the ATT was 3.772. In the module's framing, IV is not a better estimator than adjustment; it is a different trade. Adjustment assumes you measured the confounders. IV assumes you found a variable with one path. Both are assumptions, and IV's is the harder one to defend and the easier one to state.",
          "deepDive": "Being able to say when NOT to use IV is the part that separates a considered answer from a recited one. If the confounders are plausibly measured, adjustment or a matching estimator is better: lower variance, a cleaner estimand, and diagnostics that at least interrogate the assumption partially through balance. If the instrument is weak, IV is worse than doing nothing, because it produces a confidently reported number that has collapsed back toward the bias you were trying to remove — 1.415 at F = 2.8, against an OLS bias of 2.924 on a truth of 2.000. If you can run an experiment, run it, since randomization buys the same identification with a testable design and a clean estimand. IV is the right tool in a narrow band: unmeasured confounding, no possible experiment, and a strong instrument with a defensible exclusion story. That band is narrower than the volume of published IV work suggests, which is itself worth noticing — the amplification arithmetic means marginal instruments produce large, publishable, wrong effects, and publication selects on largeness."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "★ What an instrument buys",
        "back": "Identification WITHOUT measuring the confounder. Find Z that shoves T around with no other route to Y, then use only the slice of T that Z explains. OLS 2.702 → 2SLS 2.004 (truth 2.000)."
      },
      {
        "type": "definition",
        "front": "The three IV conditions",
        "back": "Relevance Cov(Z,T)≠0 — TESTABLE. Exogeneity Z ⫫ U — untestable. Exclusion: Z affects Y ONLY through T — untestable. The credibility rests entirely on the untestable two."
      },
      {
        "type": "formula",
        "front": "Wald / IV estimator",
        "back": "β_IV = Cov(Z,Y)/Cov(Z,T) — reduced form over first stage. 2SLS computes the same thing: regress T on Z, then Y on the fitted T̂."
      },
      {
        "type": "pitfall",
        "front": "★ The first-stage F is blind to what matters",
        "back": "Holding strength fixed, exclusion violations walked the estimate 2.003 → 2.503 while F stayed at 30,731 in EVERY row. F tests strength; validity has no diagnostic."
      },
      {
        "type": "pitfall",
        "front": "What a weak instrument does",
        "back": "2SLS collapses BACK onto the OLS bias it was meant to fix. F: 30,861 → 2.8; estimate 1.994 → 1.415 (truth 2.000, OLS 2.924). F<10 is the classic flag and it fires correctly here."
      },
      {
        "type": "formula",
        "front": "★ Bias amplification",
        "back": "Exclusion-violation bias = γ/π. Measured: π=1.0→+0.100, π=0.3→+0.329, π=0.1→+0.942 (predicted 0.100/0.333/1.000). Weak AND slightly invalid is catastrophic — the failures MULTIPLY."
      },
      {
        "type": "definition",
        "front": "LATE",
        "back": "The effect on COMPLIERS — units the instrument actually moved. Sim: LATE 1.989 ✓, while ATE=2.347 and ATT=3.772. All correct, all different questions."
      },
      {
        "type": "definition",
        "front": "The four compliance types",
        "back": "Always-takers, never-takers, compliers, defiers. Monotonicity = no defiers. You can estimate the complier SHARE but never label a row — the type is defined by a counterfactual."
      },
      {
        "type": "intuition",
        "front": "ITT vs LATE vs as-treated",
        "back": "ITT 0.996 = effect of ASSIGNMENT (what a rollout delivers, dilution included). LATE 1.989 = ITT ÷ first stage. As-treated 5.093 = randomization thrown away. Never report the third."
      },
      {
        "type": "pitfall",
        "front": "Does an overidentification test validate instruments?",
        "back": "No — it tests whether they AGREE. Instruments invalid in the same direction pass comfortably. Rejection is informative; passing is not."
      },
      {
        "type": "intuition",
        "front": "Where to find instruments in a product",
        "back": "Randomization you already did: A/B assignment (for exposure), bandit exploration (propensity LOGGED, not estimated), ranking perturbations, notification holdouts. Avoid clever observational ones — weather, distance, lags."
      },
      {
        "type": "pitfall",
        "front": "When NOT to use IV",
        "back": "Confounders plausibly measured → adjust instead (lower variance, cleaner estimand). Weak instrument → worse than nothing. Can run an experiment → run it. The valid band is narrower than the literature suggests."
      }
    ],
    "refs": [
      {
        "title": "Angrist, Imbens & Rubin (1996), Identification of Causal Effects Using Instrumental Variables",
        "url": "https://www.jstor.org/stable/2291629"
      },
      {
        "title": "Imbens & Angrist (1994), Identification and Estimation of Local Average Treatment Effects",
        "url": "https://www.jstor.org/stable/2951620"
      },
      {
        "title": "Bound, Jaeger & Baker (1995), Problems with Instrumental Variables Estimation When the Correlation Between the Instruments and the Endogenous Explanatory Variable is Weak",
        "url": "https://www.jstor.org/stable/2291055"
      },
      {
        "title": "Conley, Hansen & Rossi (2012), Plausibly Exogenous",
        "url": "https://direct.mit.edu/rest/article/94/1/260/58135/Plausibly-Exogenous"
      },
      {
        "title": "Lee, McCrary, Moreira & Porter (2022), What to Do When You Can't Use '1.96' Confidence Intervals for IV",
        "url": "https://www.aeaweb.org/articles?id=10.1257/aer.20211063"
      }
    ],
    "demos": [
      "instrumental-variables",
      "regression",
      "do-intervention",
      "bias-variance-decomp"
    ]
  },
  "propensity-matching": {
    "level": "core",
    "body": {
      "intuition": [
        "Adjusting for one covariate is a weighted average you can do by hand. Adjusting for twenty is hopeless by hand, because the strata are empty. Rosenbaum and Rubin's result is that you do not need the twenty - conditioning on the single scalar P(T=1 | X) is enough. That is a genuine reduction, and it is why propensity methods exist.",
        "It also creates the most dangerous diagnostic in the field. Because the score is built from your MEASURED covariates, matching or weighting on it produces beautiful balance on exactly those covariates, and a balance table full of green is what most writeups present as evidence of validity.",
        "The simulation makes the trap concrete. With one unmeasured confounder, propensity matching drove the worst measured imbalance from 0.436 down to 0.016 - an excellent balance table by any standard - while returning 5.445 against a true effect of 3.000, an overstatement of 81%. And the imbalance on the unmeasured confounder went from 1.317 to 1.491. MATCHING MADE IT WORSE, because it reshuffled the sample to equalize the variables it could see."
      ],
      "math": [
        {
          "h": "The balancing score theorem",
          "paras": [
            "If treatment is ignorable given X, it is ignorable given the scalar propensity score alone. That collapses a high-dimensional conditioning problem to a one-dimensional one.",
            "Read the conditional carefully: the theorem is conditional on ignorability holding for X. It converts a hard estimation problem into an easy one; it does nothing about identification."
          ],
          "tex": "\\{Y(1),Y(0)\\}\\perp T \\mid X \\ \\Longrightarrow\\ \\{Y(1),Y(0)\\}\\perp T \\mid e(X), \\qquad e(X)=P(T{=}1\\mid X)",
          "texNote": "The propensity score is a balancing score: X is independent of T given e(X). So matching on e(X) balances X in expectation - all of X that is IN X, and nothing that is not."
        },
        {
          "h": "Inverse propensity weighting, and why the weights explode",
          "paras": [
            "IPW reweights each unit by the inverse of its probability of receiving the treatment it got, constructing a pseudo-population in which treatment is independent of X.",
            "Units with extreme propensities receive enormous weight, so a handful of observations can dominate the estimate. Effective sample size is the diagnostic, and it is not the row count."
          ],
          "tex": "\\hat{\\tau}_{IPW}=\\frac{1}{n}\\sum_i\\left[\\frac{T_iY_i}{e(X_i)}-\\frac{(1-T_i)Y_i}{1-e(X_i)}\\right], \\qquad n_{\\text{eff}}=\\frac{(\\sum w_i)^2}{\\sum w_i^2}",
          "texNote": "Under poor overlap the simulation's effective sample size fell to 663 out of 60,000 - 1.1% - with a maximum weight of 2,889. The dataframe still had sixty thousand rows and the standard error computed from it was a fiction."
        },
        {
          "h": "Three regimes, and which diagnostics fire in each",
          "paras": [
            "The same code on three datasets. Only the middle case is silently wrong, and it is the case that looks best."
          ],
          "tex": "\\begin{array}{lccc} & \\text{estimate (true }3.000) & \\max|\\mathrm{SMD}|_{\\text{measured}} & n_{\\text{eff}}\\\\ \\text{A: all confounders measured} & 3.014 & 0.660\\!\\to\\!0.029 & 39{,}653\\\\ \\text{B: one unmeasured} & \\mathbf{5.445} & 0.436\\!\\to\\!\\mathbf{0.016} & 52{,}315\\\\ \\text{C: poor overlap} & 3.462 & 1.159\\!\\to\\!0.235\\ \\textbf{FAIL} & \\mathbf{663}\\end{array}",
          "texNote": "Case C is wrong and every diagnostic screams. Case B is far more wrong and every diagnostic is greener than in case A - the balance is better, the effective sample size is larger, and the answer is off by 81%."
        }
      ],
      "code": [
        {
          "h": "The balance table that means nothing",
          "paras": [
            "Ten measured covariates, one unmeasured confounder, treatment effect 3.000. Standard 1:1 nearest-neighbour matching on the estimated score."
          ],
          "code": "ps = LogisticRegression().fit(X, T).predict_proba(X)[:,1]\nmatched = nearest_neighbour(ps[T==1], ps[T==0])\n\n# BALANCE ON MEASURED COVARIATES\n#   max |SMD|   before 0.436  ->  after 0.016     PASS (<0.1), comfortably\n\n# ESTIMATE\n#   naive difference        6.252\n#   PS matching (ATT)       5.445      true effect 3.000   -> +81%\n#   IPW (ATE)               5.447\n\n# BALANCE ON THE UNMEASURED CONFOUNDER (we can peek; you cannot)\n#   |SMD|       before 1.317  ->  after 1.491     ★ WORSE AFTER MATCHING\n\n# ★ The procedure equalized what it could see by reshuffling the sample,\n#   and the reshuffle moved the thing it could not see in the wrong direction.",
          "caption": "A balance table is a report on the propensity model's fit to its own inputs. It is not, and has never been, evidence about unmeasured confounding."
        },
        {
          "h": "The diagnostic that does work: overlap",
          "paras": [
            "Positivity is the one identification assumption the data can speak to, and here it speaks loudly."
          ],
          "code": "w = np.where(T==1, 1/ps, 1/(1-ps))\nn_eff = w.sum()**2 / (w**2).sum()\n\n# GOOD OVERLAP    n_eff = 39,653 of 60,000  (66%)   max weight    54\n# POOR OVERLAP    n_eff =    663 of 60,000  (1.1%)  max weight 2,889\n#                 max |SMD| after matching = 0.235   FAIL\n\n# ★ Report n_eff, not nrow. Under poor overlap the standard error\n#   computed from 60,000 rows is describing a sample of 663.\n\n# and plot the score distributions by arm - the mass at the tails is\n# the region where there is simply no comparison to make.",
          "caption": "Overlap failure is loud and fixable - trim, restrict the estimand to the region of common support, and say so. Unmeasured confounding is silent."
        }
      ],
      "useCases": [
        "Observational program evaluation where randomization was impossible but the drivers of uptake are well understood and recorded - the setting the method was designed for.",
        "Retrospective analysis of a feature that shipped without a holdout, as the least-bad option, provided the writeup leads with the assumption rather than the balance table.",
        "Constructing a comparable control cohort for a clinical or operational study, where matching's transparency is worth more than a regression's efficiency.",
        "Checking overlap before committing to any observational analysis at all, since a propensity histogram by arm often ends the project honestly and early."
      ],
      "pitfalls": [
        "Presenting a balance table as evidence of validity. In the simulation, balance improved from 0.436 to 0.016 while the estimate overstated the truth by 81%.",
        "Assuming matching helps with unmeasured confounders. It moved the unmeasured imbalance from 1.317 to 1.491 - matching on measured covariates can actively worsen balance on the ones you do not have.",
        "Reporting standard errors from the row count under poor overlap. Effective sample size fell to 663 of 60,000, so the honest n is two orders of magnitude smaller than the dataframe.",
        "Optimizing the propensity model for AUC. A score that separates arms perfectly means no overlap and nothing to compare; the goal is balance, not discrimination.",
        "Ignoring the uncertainty introduced by matching itself. Naive standard errors on matched pairs treat the matching as fixed, which understates variance - bootstrap the whole procedure.",
        "Silently changing the estimand by trimming. Discarding units outside common support is often correct, but it redefines the population, and the writeup must say which population is left.",
        "Treating IPW and matching as different assumptions. They differ in variance and estimand, not in what they need to be true; both stand or fall on ignorability given the measured X."
      ],
      "connections": [
        {
          "ref": "causal-inference/confounding",
          "text": "The one-covariate version done by hand, where the same reweighting logic is visible in four cells rather than hidden in a fitted model."
        },
        {
          "ref": "causal-inference/instrumental-variables",
          "text": "The alternative when ignorability is indefensible - buying identification from a graph pattern instead of from a claim to have measured everything."
        },
        {
          "ref": "ml-theory/calibration",
          "text": "Why the propensity model should be calibrated rather than discriminative: the score is used as a probability in the weights, so miscalibration is bias, not just a worse ranking."
        },
        {
          "ref": "supervised-learning/logistic-regression",
          "text": "The workhorse model for the score, and the reason its coefficients are not to be interpreted - it is a nuisance function, fitted for balance, not for explanation."
        },
        {
          "ref": "ml-theory/imbalanced-data",
          "text": "The same weighting machinery used for a different purpose, where reweighting targets a loss rather than a counterfactual population."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is the propensity score?",
          "a": "e(X) = P(T=1 | X). A scalar summarizing the probability of treatment given measured covariates."
        },
        {
          "q": "State the balancing score theorem.",
          "a": "If treatment is ignorable given X, it is ignorable given e(X) alone — reducing high-dimensional conditioning to one dimension."
        },
        {
          "q": "What does that theorem NOT give you?",
          "a": "Identification. It is conditional on ignorability holding for X; it makes estimation tractable and says nothing about unmeasured confounders."
        },
        {
          "q": "Write the IPW estimator.",
          "a": "(1/n)Σ[ T·Y/e(X) − (1−T)·Y/(1−e(X)) ] — reweight each unit by the inverse probability of the arm it landed in."
        },
        {
          "q": "What does a balance table actually verify?",
          "a": "That the procedure equalized the covariates it was given. Sim: max |SMD| 0.436 → 0.016 while the estimate was 81% too high."
        },
        {
          "q": "Can matching worsen balance on an unmeasured confounder?",
          "a": "Yes. It went from |SMD| 1.317 to 1.491 — reshuffling to equalize measured covariates moved the unmeasured one the wrong way."
        },
        {
          "q": "What is effective sample size and why report it?",
          "a": "n_eff = (Σw)²/Σw². Under poor overlap it fell to 663 of 60,000 rows — the SE computed from nrow is a fiction."
        },
        {
          "q": "Should you maximize AUC of the propensity model?",
          "a": "No. Perfect separation means zero overlap and nothing to compare. The target is balance, not discrimination."
        },
        {
          "q": "Which identification assumption can a propensity analysis check?",
          "a": "Positivity/overlap — via score histograms by arm, extreme weights, and n_eff. Ignorability remains untestable."
        },
        {
          "q": "Matching vs IPW — different assumptions?",
          "a": "No. They differ in variance and estimand (ATT vs ATE), not in what must be true. Both stand or fall on ignorability given measured X."
        },
        {
          "q": "Why are naive matched-pair standard errors too small?",
          "a": "They treat the matching as fixed, ignoring the uncertainty of who got matched to whom. Bootstrap the entire procedure instead."
        },
        {
          "q": "What is doubly robust estimation?",
          "a": "Combine an outcome model with a propensity model; consistent if EITHER is correctly specified. Still requires ignorability — it buys robustness to specification, not to unmeasured confounding."
        }
      ],
      "standard": [
        {
          "q": "Explain propensity scores and what the balancing score theorem does and does not give you.",
          "a": "THE THEOREM IS A DIMENSION REDUCTION, NOT AN IDENTIFICATION RESULT. Rosenbaum and Rubin showed that if treatment is ignorable given a vector X, then it is ignorable given the single scalar e(X) = P(T=1|X). That is genuinely valuable, because conditioning on twenty covariates directly is hopeless — the strata are empty, and any estimate in them comes from functional form rather than from data. Matching or weighting on one number sidesteps that entirely. THE CONDITIONAL CLAUSE IS EVERYTHING, THOUGH: the theorem starts from 'if ignorability holds given X'. It converts a hard estimation problem into an easy one and does absolutely nothing about whether X contains the confounders. In the simulation with all confounders measured, matching returned 3.014 and IPW 2.996 against a truth of 3.000 — the method works exactly as advertised when its premise holds. WITH ONE UNMEASURED CONFOUNDER, THE SAME CODE RETURNED 5.445, an overstatement of 81%. Nothing about the procedure failed; the premise did. This is the module's thesis in the most operational form it takes: propensity methods are an estimation technology sitting on top of an identification assumption, and the technology being excellent tells you nothing about the assumption being true.",
          "deepDive": "A practical corollary that catches people: you should not tune the propensity model for predictive performance. A score with AUC 0.99 separates the arms almost perfectly, which means the treated and control units occupy disjoint regions of covariate space and there is essentially nothing to compare — the estimate becomes extrapolation dressed as matching. The right objective is BALANCE, so the workflow is fit, check balance, and if it is poor, add interactions and higher-order terms and refit, iterating on the balance table rather than on held-out log-loss. Covariate balancing propensity score methods and entropy balancing formalise this by optimising balance directly rather than fitting a model and hoping. It is also why the propensity model's coefficients should never be interpreted — it is a nuisance function. Doubly robust estimators go one step further: combine an outcome model with a propensity model and you get consistency if EITHER is correctly specified, which is real protection against misspecification. It is worth being precise that this buys robustness to functional form, not to unmeasured confounding, and the two are routinely conflated in practice."
        },
        {
          "q": "A colleague shows you a matched analysis with a perfect balance table. What is your reaction?",
          "a": "I WOULD SAY THE BALANCE TABLE IS A REPORT ON THE PROCEDURE, NOT ON THE CONCLUSION, and then show why with the cleanest example I have. In the simulation, propensity matching drove the worst standardized mean difference among measured covariates from 0.436 down to 0.016 — comfortably inside the 0.1 convention, the kind of table that goes in a paper as evidence of a well-executed analysis. The estimate was 5.445 against a true effect of 3.000. The balance table is telling you, correctly, that the matching algorithm succeeded at equalizing the variables you handed it. That is a statement about the algorithm's inputs. THE DETAIL THAT MAKES IT VIVID: balance on the unmeasured confounder went from 1.317 to 1.491. Matching made it WORSE. That is not a fluke — the procedure reshuffles the sample to equalize measured covariates, and that reshuffle has no reason to respect anything else, so it can and does move unmeasured imbalance in either direction. SO MY QUESTIONS WOULD BE ABOUT THE ASSIGNMENT PROCESS, not the table: who decided treatment, what did they know, and is any of that knowledge absent from the covariate list. Then I would ask for an overlap diagnostic and a sensitivity analysis, because those are the two things that carry information the balance table does not.",
          "deepDive": "It is worth being fair to balance tables, because the criticism is about how they are used rather than whether they are worth producing. A FAILED balance table is highly informative — it tells you the specification is inadequate, that overlap may be poor, and that the estimate is leaning on extrapolation. It is only the passing case that is uninformative, and that asymmetry is exactly the shape of every diagnostic in this module: refutation is possible, confirmation is not. The useful addition is a sensitivity analysis in the same table's neighbourhood, which converts the untestable part into a number. Rosenbaum bounds are the natural fit for matched designs: they report how large the odds of differential assignment within a matched pair would have to be, due to an unobserved covariate, before the conclusion becomes uncertain. If the answer is Γ = 1.2, the study is fragile; if it is Γ = 4, it is robust to anything short of a very strong hidden factor. E-values do the analogous job on the risk-ratio scale. Reporting one of these alongside the balance table changes the document from 'we did the procedure correctly' to 'here is how much hidden confounding it would take to overturn us', which is the claim a reader actually needs."
        },
        {
          "q": "How do you check overlap, and what do you do when it fails?",
          "a": "I CHECK IT THREE WAYS AND THEY AGREE WHEN THINGS ARE BAD. First, plot the propensity score distributions by arm; mass piling near 0 or 1, or regions where one arm has no support, is the visual signature. Second, look at the extreme weights — in the poor-overlap simulation the maximum IPW weight was 2,889, meaning one observation was standing in for nearly three thousand. Third, and most usefully, compute the effective sample size, n_eff = (Σw)²/Σw², which collapsed to 663 out of 60,000 rows, or 1.1%. THAT LAST NUMBER IS THE ONE TO REPORT, because every standard error computed from the row count is describing a sample two orders of magnitude larger than the one actually informing the estimate. In that same run the balance table also failed, at 0.235, so this is the pleasant case where the diagnostics are loud and consistent. WHAT I DO ABOUT IT is trim to the region of common support and say so explicitly, because trimming redefines the population: I am no longer estimating an effect for everyone, but for the subpopulation where a comparison exists. That is often the honest and useful answer, and it is much better than an estimate over the full population that is functional-form extrapolation in the regions where one arm is absent.",
          "deepDive": "The contrast with the unmeasured-confounding case is the reason I like teaching these together. Case C — poor overlap — is wrong by 0.46 and every single diagnostic screams: balance fails, weights explode, n_eff collapses. Case B — one unmeasured confounder — is wrong by 2.45, and every diagnostic is GREENER than in the case where the method works: balance is tighter at 0.016, n_eff is larger at 52,315. The failure that the data can detect is the smaller one, and the failure it cannot detect is the larger one. On the mechanics of trimming, the common conventions are to drop units outside the overlapping range of the score, or to use Crump et al.'s rule of restricting to 0.1 < e(X) < 0.9, which has an optimality justification in terms of variance. Weight stabilisation and clipping help with variance but they introduce bias in exchange, and clipping in particular quietly changes the estimand without announcing it. The one thing not to do is nothing — an unreported n_eff of 1.1% is the kind of omission that makes a whole analysis worthless while looking complete."
        },
        {
          "q": "When would you choose matching over regression adjustment, or IPW over either?",
          "a": "THEY SHARE AN ASSUMPTION AND DIFFER IN VARIANCE, ESTIMAND AND TRANSPARENCY, so the choice is about those three and not about credibility. MATCHING'S ADVANTAGE IS THAT IT MAKES EXTRAPOLATION VISIBLE. If a treated unit has no comparable control, matching either drops it or matches it badly and the balance table shows it, whereas a regression will happily interpolate across a region with no data and produce a smooth, confident number. That transparency is worth a lot when the audience is not statistical, because a matched pair is something a domain expert can inspect. Its costs are efficiency — discarding unmatched units — and the fact that the naive standard errors are wrong, since they treat the matched set as fixed. IPW KEEPS EVERY UNIT and targets the ATE naturally, where matching most naturally targets the ATT, so the estimand should drive that choice: 'should we treat everyone' wants ATE, 'was treating these people worthwhile' wants ATT. IPW's weakness is variance under poor overlap, which is exactly when the extreme weights appear. REGRESSION IS THE MOST EFFICIENT WHEN THE OUTCOME MODEL IS RIGHT and the least honest when it is wrong. In practice I would default to a doubly robust estimator, which uses both an outcome model and a propensity model and is consistent if either is correct.",
          "deepDive": "The modern version of that default is worth naming: double machine learning, which uses flexible models for both nuisance functions, cross-fitting to avoid overfitting bias, and a Neyman-orthogonal score so first-order errors in the nuisance estimates do not contaminate the target. It is a genuine advance and it is easy to over-read. What it delivers is valid inference on the causal parameter while permitting arbitrary machine learning for the nuisance pieces. What it requires as INPUT is a covariate set satisfying the backdoor criterion — it assumes ignorability exactly as strongly as 1:1 matching does. So the honest framing is that the last two decades of methodological progress in this space have been about estimation efficiency and robustness to functional form, and none of it has moved the identification problem an inch, because the identification problem is not a statistical problem. That is worth saying out loud in an interview, because it demonstrates you know what the tooling does rather than just which library to import. It is also why 'we used causal forests' answers a different question from 'why do you believe there is no unmeasured confounding'."
        },
        {
          "q": "Product shipped a feature to a self-selected group and wants to know its impact. Walk through what you would do.",
          "a": "I WOULD START BY TRYING TO END THE PROJECT HONESTLY, because the fastest useful thing I can do is check overlap. Fit a propensity model for adoption and plot the score by arm. If adopters and non-adopters barely overlap — which is common, since adoption is often driven by tenure and engagement that also drive every outcome metric — then there is no comparison to make for most of the population, and I would report that rather than produce a number. In the simulation, poor overlap took the effective sample size from 60,000 rows to 663. IF OVERLAP IS ADEQUATE, I would enumerate the drivers of adoption with the people who built the feature, before touching the data, and be explicit about which are recorded. That conversation is the actual analysis; everything after it is arithmetic. THEN I WOULD ESTIMATE with a doubly robust estimator, report the ATT rather than the ATE since the question is about the people who adopted, and attach three things: the overlap diagnostics including n_eff, a sensitivity analysis saying how strong an unmeasured confounder would need to be, and a negative-control outcome the feature cannot plausibly affect. AND I WOULD ASK FOR A HOLDOUT GOING FORWARD, because the cost of this whole exercise, in analyst time and in residual uncertainty, is far higher than the cost of randomising ten percent from the start.",
          "deepDive": "The negative control is the part I would push hardest for, because it produces evidence in the same format as the estimate and non-technical stakeholders can read it directly. Pick a metric the feature could not affect through any plausible mechanism — payment method updates, say, or activity in an unrelated surface — and run the identical pipeline. A clean null there is genuine, if weak, evidence that the adjustment removed the selection; a large effect is proof that it did not, and it ends the argument immediately without anyone needing to understand ignorability. The other thing worth setting up is the counterfactual comparison of methods: if a holdout gets created later, re-run the observational estimate on the pre-holdout period and compare it to the experimental answer. That calibration exercise is enormously valuable organisationally, because it gives your team a measured sense of how far observational estimates in YOUR system tend to be from experimental ones — and in most consumer products the answer is 'much further than people expect', which is the single most useful fact you can establish about your own data."
        },
        {
          "q": "What is the single most important thing this lesson changes about how you read an observational study?",
          "a": "I STOP READING THE BALANCE TABLE AS EVIDENCE AND START READING THE ASSIGNMENT NARRATIVE AS EVIDENCE. The balance table answers 'did the procedure equalize the covariates it was given', which is a question about the analyst's code, and the answer is nearly always yes because that is what the procedure optimises. Case B in the simulation makes this unignorable: balance improved to 0.016, n_eff was a healthy 52,315, and the estimate was 81% too high. Both diagnostics were BETTER than in the case where the method worked correctly. So the section of a paper I now weight most heavily is the one describing how units came to be treated — who decided, what information they had, and whether that information is in the covariate list. If a paper cannot tell that story, no amount of methodological sophistication downstream repairs it. THE SECOND THING I LOOK FOR IS A SENSITIVITY ANALYSIS, because it is the only part of the document that quantifies the untestable assumption rather than asserting it. A Rosenbaum bound or an E-value converts 'we controlled for confounders' into 'a hidden factor of this strength would overturn us', which is a claim I can evaluate against the confounders I can think of. A study with a mediocre balance table and a serious sensitivity analysis is more credible than one with a perfect table and none.",
          "deepDive": "There is a broader habit here that transfers well beyond causal inference: notice which of a method's outputs are self-referential. A balance table is computed from the same covariates the matching optimised, so it is close to guaranteed to pass — the way training-set accuracy is close to guaranteed to look good. A first-stage F in an IV analysis measures the property the analyst already selected the instrument for. Cross-validated loss measures agreement with a distribution the model was fitted on. In each case the diagnostic and the procedure share an input, and diagnostics that share an input with the thing they are checking cannot be independent evidence about it. The diagnostics worth trusting are the ones that could have come out badly for reasons the procedure does not control — an out-of-sample negative control, a pre-period placebo, a prediction the DAG makes that the fitting never touched. Sorting a method's outputs into 'could this have failed' and 'was this guaranteed to pass' is a fast way to find out where the real evidence is, and it applies just as well to a model card or an eval harness as it does here."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Balancing score theorem",
        "back": "Ignorability given X ⇒ ignorability given the scalar e(X)=P(T=1|X). A DIMENSION REDUCTION — it makes estimation tractable and does nothing about identification."
      },
      {
        "type": "pitfall",
        "front": "★ The balance table that means nothing",
        "back": "Max |SMD| 0.436 → 0.016 (well under the 0.1 flag), estimate 5.445 vs a true 3.000 — 81% too high. A balance table reports on the procedure's inputs, not on the conclusion."
      },
      {
        "type": "pitfall",
        "front": "★ Matching made the unmeasured imbalance WORSE",
        "back": "|SMD| on the unmeasured confounder went 1.317 → 1.491. Reshuffling the sample to equalize measured covariates has no reason to respect anything else."
      },
      {
        "type": "formula",
        "front": "IPW estimator",
        "back": "(1/n)Σ[ T·Y/e(X) − (1−T)·Y/(1−e(X)) ] — builds a pseudo-population where T ⫫ X. Extreme propensities ⇒ enormous weights ⇒ a few rows dominate."
      },
      {
        "type": "formula",
        "front": "Effective sample size",
        "back": "n_eff = (Σw)²/Σw². Poor overlap: 663 of 60,000 rows (1.1%), max weight 2,889. Report n_eff, not nrow — the SE from nrow is a fiction."
      },
      {
        "type": "intuition",
        "front": "★ Which failure is detectable?",
        "back": "Overlap failure: wrong by 0.46, EVERY diagnostic screams. Unmeasured confounder: wrong by 2.45, every diagnostic is GREENER than in the working case. The big failure is the silent one."
      },
      {
        "type": "pitfall",
        "front": "Should the propensity model maximize AUC?",
        "back": "No — perfect separation means zero overlap and nothing to compare. Optimize BALANCE: fit, check the table, add interactions, refit. CBPS/entropy balancing optimize balance directly."
      },
      {
        "type": "definition",
        "front": "Matching vs IPW vs regression",
        "back": "Same assumption; differ in variance, estimand and transparency. Matching → ATT, makes extrapolation visible. IPW → ATE, keeps every unit, explodes under poor overlap. Regression → most efficient, least honest when wrong."
      },
      {
        "type": "definition",
        "front": "Doubly robust / DML",
        "back": "Outcome model + propensity model; consistent if EITHER is right. DML adds cross-fitting and Neyman-orthogonal scores. Buys robustness to FUNCTIONAL FORM — not to unmeasured confounding."
      },
      {
        "type": "pitfall",
        "front": "Why are naive matched-pair SEs too small?",
        "back": "They treat the matched set as fixed, ignoring uncertainty in who got matched to whom. Bootstrap the entire procedure — model fit, matching, and estimate."
      },
      {
        "type": "definition",
        "front": "Rosenbaum bounds",
        "back": "How large the odds of differential assignment within a matched pair, due to an unobserved covariate, before the conclusion becomes uncertain. Γ=1.2 fragile, Γ=4 robust. Report it WITH the balance table."
      },
      {
        "type": "intuition",
        "front": "★ Self-referential diagnostics",
        "back": "Balance tables share an input with the matching that optimised them; first-stage F measures what the instrument was selected for. A diagnostic sharing an input with what it checks is not independent evidence about it."
      }
    ],
    "refs": [
      {
        "title": "Rosenbaum & Rubin (1983), The Central Role of the Propensity Score in Observational Studies for Causal Effects",
        "url": "https://academic.oup.com/biomet/article/70/1/41/240879"
      },
      {
        "title": "Stuart (2010), Matching Methods for Causal Inference: A Review and a Look Forward",
        "url": "https://projecteuclid.org/journals/statistical-science/volume-25/issue-1/Matching-Methods-for-Causal-Inference--A-Review-and-a/10.1214/09-STS313.full"
      },
      {
        "title": "King & Nielsen (2019), Why Propensity Scores Should Not Be Used for Matching",
        "url": "https://gking.harvard.edu/files/gking/files/pan1904_copy.pdf"
      },
      {
        "title": "Crump, Hotz, Imbens & Mitnik (2009), Dealing with Limited Overlap in Estimation of Average Treatment Effects",
        "url": "https://academic.oup.com/biomet/article/96/1/187/235329"
      },
      {
        "title": "Chernozhukov et al. (2018), Double/Debiased Machine Learning for Treatment and Structural Parameters",
        "url": "https://academic.oup.com/ectj/article/21/1/C1/5056401"
      }
    ],
    "demos": [
      "knn",
      "calibration",
      "roc",
      "regression"
    ]
  },
  "uplift-modeling": {
    "level": "core",
    "body": {
      "intuition": [
        "A response model answers 'who will convert'. A campaign needs 'who will convert BECAUSE OF US'. Those are different questions, and the gap between them is the entire subject. Every user falls into one of four boxes: SURE THINGS convert either way, LOST CAUSES convert neither way, PERSUADABLES convert only if treated, and SLEEPING DOGS convert only if left alone. A campaign creates value on exactly one of the four.",
        "The trap is that a response model is far better at its own task and much worse at the job. In simulation the response model scored AUC 0.895 on the outcome and the uplift score scored 0.513 - barely above chance. Targeting the top 10% by response earned 72 incremental conversions; targeting the top 10% by uplift earned 893. TWELVE TIMES MORE, from the model that looks worthless by the usual metric.",
        "The reason is visible in who each model picks. The response model's top decile was 100% sure things - people who were going to convert anyway, so the campaign paid for conversions it already had. The uplift model's top decile was 99% persuadables. And sleeping dogs, 10% of users at -0.15 each, destroyed 543 conversions inside a blanket campaign, which is why treating everyone is not the safe default."
      ],
      "math": [
        {
          "h": "The target is a difference of conditional expectations",
          "paras": [
            "Uplift is the conditional average treatment effect. Neither term is ever observed for the same unit, so unlike ordinary supervised learning there is no per-row label - the quantity being modelled has no ground truth at the individual level.",
            "That single fact drives every design decision in this lesson: the estimators, the metrics, and why validation is awkward."
          ],
          "tex": "\\tau(x)=\\mathbb{E}[Y(1)-Y(0)\\mid X{=}x]=\\underbrace{\\mathbb{E}[Y\\mid X{=}x,T{=}1]}_{\\text{estimable}}-\\underbrace{\\mathbb{E}[Y\\mid X{=}x,T{=}0]}_{\\text{estimable}}",
          "texNote": "Both halves are estimable under randomization, and their difference is what you want - but the difference is typically far smaller than either term, so a model with excellent accuracy on each can be useless on the gap. Signal-to-noise, not capacity, is the binding constraint."
        },
        {
          "h": "Predictive quality and business value come apart completely",
          "paras": [
            "The response model dominates on the prediction task and loses by an order of magnitude on the task that pays."
          ],
          "tex": "\\mathrm{AUC}_{\\text{response}}=0.895 \\gg \\mathrm{AUC}_{\\text{uplift}}=0.513, \\qquad \\text{incremental@10\\%}: \\ 72 \\ \\text{vs} \\ \\mathbf{893} \\ (12.4\\times)",
          "texNote": "The uplift score is nearly uninformative about WHO CONVERTS and nearly perfect about WHO IS MOVED. Ranking a validation set by AUC on the outcome would select the wrong model every single time."
        },
        {
          "h": "Treating fewer people can beat treating everyone",
          "paras": [
            "With sleeping dogs present, the blanket campaign is not the upper bound. It is beaten on effectiveness and on cost simultaneously."
          ],
          "tex": "\\text{treat all}: 1600 \\ \\text{conversions at } 100\\% \\text{ cost} \\qquad \\text{treat top } 30\\% \\text{ by uplift}: \\mathbf{1854} \\ \\text{at } 30\\% \\text{ cost}",
          "texNote": "Sleeping dogs were 10% of the population with an uplift of -0.150 each, destroying 543 conversions inside the blanket campaign. Excluding them is worth more than the entire budget saving."
        }
      ],
      "code": [
        {
          "h": "Who each model actually selects",
          "paras": [
            "Same features, same training data, same algorithm. Only the target differs."
          ],
          "code": "# response model:  fit Y ~ X          (T ignored entirely)\n# two-model uplift: fit Y ~ X | T=1  and  Y ~ X | T=0, take the difference\n\n# TOP 10% SELECTED BY EACH MODEL\n#   response: sure_thing 100%   persuadable  0%\n#   uplift  : sure_thing   0%   persuadable 99%\n\n# TRUE INCREMENTAL CONVERSIONS EARNED\n#   target   by RESPONSE          by UPLIFT       ratio\n#     5%      36 (+0.020/user)    445 (+0.247)    12.4x\n#    10%      72 (+0.020/user)    893 (+0.248)    12.4x\n#    20%     144 (+0.020/user)   1764 (+0.245)    12.3x\n#    50%    1279 (+0.071/user)   1948 (+0.108)     1.5x\n#   ALL     1600 (+0.044/user)\n\n# ★ The response model's per-user uplift is FLAT at +0.020 across the top\n#   20% - it is sorting by 'converts anyway', which carries no information\n#   about being moved.",
          "caption": "The response model is not slightly worse at targeting. It is sorting on a quantity that is close to orthogonal to the one that matters."
        },
        {
          "h": "Estimators, and the validation problem",
          "paras": [
            "There is no per-row uplift label, so every metric is computed on GROUPS, and the noise is correspondingly worse."
          ],
          "code": "# THREE STANDARD ESTIMATORS\n# T-learner   two models, subtract         simple; errors of two models add\n# S-learner   one model with T as feature  can drop T entirely if it is weak\n# X-learner   impute counterfactuals,      better with very unbalanced arms\n#             then model the imputed effect\n# ...plus causal forests / DR-learner, which target tau(x) directly\n\n# METRICS - all group-based, none per-row\n#   uplift curve   incremental outcome vs fraction targeted\n#   Qini           area between that curve and the random line\n#   AUUC           area under the uplift curve\n\n# ★ NEVER select an uplift model by AUC on Y. In this run that metric\n#   ranked the response model 0.895 against the uplift model's 0.513,\n#   and the 0.513 model earned 12.4x more.",
          "caption": "The metric has to be built from the treated-versus-control contrast within each ranked bucket, which is why uplift validation needs a randomized holdout and a lot of it."
        }
      ],
      "useCases": [
        "Retention and win-back campaigns, where sleeping dogs are real - a 'we miss you' email reminds a dormant user that a subscription exists and can trigger the cancellation.",
        "Discount and promotion targeting, where sure things are the dominant cost: the margin lost on people who would have bought anyway is usually the largest line in the campaign.",
        "Notification and email volume decisions, where the counterfactual is a quieter product and the negative-uplift segment is anyone close to muting you.",
        "Medical and operational triage, where the question is who benefits from an intervention rather than who is at risk - the same distinction between prognosis and treatment effect."
      ],
      "pitfalls": [
        "Shipping a response model as a targeting model. Its top decile was 100% sure things and earned 72 incremental conversions where the uplift model earned 893.",
        "Selecting an uplift model by AUC on the outcome. That metric preferred the response model 0.895 to 0.513, and the 0.513 model was worth twelve times more.",
        "Assuming treating everyone is the safe upper bound. Sleeping dogs at 10% of users and -0.150 each destroyed 543 conversions; targeting 30% beat targeting 100% on both effect and cost.",
        "Building uplift models on observational data. The two arms differ by selection, so the fitted difference is confounding plus effect - uplift needs a randomized training set, not just a large one.",
        "Underestimating the sample size required. You are modelling a difference much smaller than either term, so uplift needs far more data than a response model of similar complexity.",
        "Evaluating on the treated group only. Every uplift metric is a treated-versus-control contrast within a ranked bucket, so a permanent randomized holdout is infrastructure, not a nicety.",
        "Using an S-learner with a weak treatment signal. Regularization can drop the treatment feature entirely, producing a model that predicts zero uplift everywhere and looks stable while doing so."
      ],
      "connections": [
        {
          "ref": "causal-inference/potential-outcomes",
          "text": "Uplift is CATE - a conditional version of the same estimand - which is why it inherits the fundamental problem and has no per-row label."
        },
        {
          "ref": "causal-inference/ab-testing",
          "text": "Where the randomized training data comes from, and why a permanent holdout is what makes uplift modelling possible at all."
        },
        {
          "ref": "causal-inference/propensity-matching",
          "text": "What you are forced into when the training data is not randomized, and why the resulting uplift estimates inherit every ignorability concern."
        },
        {
          "ref": "ml-theory/evaluation-metrics",
          "text": "The general lesson in its home context: a metric that scores the model's stated task can be anti-correlated with the decision the model is deployed to make."
        },
        {
          "ref": "reinforcement-learning/bandits",
          "text": "The sequential version of the same targeting problem, where exploration keeps the counterfactual estimable instead of requiring a separate holdout."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What does an uplift model predict?",
          "a": "CATE: τ(x) = E[Y(1) − Y(0) | X=x]. The effect of treating a unit, not the probability the unit converts."
        },
        {
          "q": "Name the four segments.",
          "a": "Sure things (convert either way), lost causes (neither way), persuadables (only if treated), sleeping dogs (only if left alone)."
        },
        {
          "q": "Which segment creates value?",
          "a": "Persuadables only. Sure things cost margin for conversions you already had; sleeping dogs are actively harmed."
        },
        {
          "q": "Why can't you train uplift like ordinary supervised learning?",
          "a": "There is no per-row label — τ(x) is a difference of two quantities that are never both observed for the same unit."
        },
        {
          "q": "Give the headline numbers from the simulation.",
          "a": "Response model AUC 0.895 vs uplift 0.513; top-10% incremental conversions 72 vs 893 — 12.4× from the model that looks worthless."
        },
        {
          "q": "Who did each model's top decile contain?",
          "a": "Response: 100% sure things. Uplift: 99% persuadables. Same features, same algorithm, different target."
        },
        {
          "q": "Can targeting fewer users beat targeting everyone?",
          "a": "Yes. Top 30% by uplift earned 1,854 vs 1,600 for the blanket campaign — more conversions at 30% of the cost."
        },
        {
          "q": "What are sleeping dogs worth?",
          "a": "In the sim: 10% of users at −0.150 each, destroying 543 conversions inside a blanket campaign."
        },
        {
          "q": "Name three uplift estimators.",
          "a": "T-learner (two models, subtract), S-learner (one model with T as a feature), X-learner (impute counterfactuals, then model the imputed effect)."
        },
        {
          "q": "What is the S-learner's characteristic failure?",
          "a": "Regularization drops the weak treatment feature, so the model predicts zero uplift everywhere — and looks stable while doing it."
        },
        {
          "q": "Name the standard uplift metrics.",
          "a": "Uplift curve, Qini coefficient, AUUC. All group-based treated-vs-control contrasts within ranked buckets — never per-row."
        },
        {
          "q": "Can you train uplift on observational data?",
          "a": "Only under ignorability. Otherwise the fitted arm difference is confounding plus effect, and no amount of data separates them."
        }
      ],
      "standard": [
        {
          "q": "Explain uplift modeling and why a response model is the wrong tool for targeting.",
          "a": "UPLIFT MODELS THE EFFECT OF TREATING SOMEONE; A RESPONSE MODEL MODELS WHETHER THEY CONVERT. Formally uplift is CATE, τ(x) = E[Y(1) − Y(0) | X = x], and the useful mental model is four segments: sure things convert either way, lost causes convert neither way, persuadables convert only if treated, and sleeping dogs convert only if left alone. A campaign creates value on persuadables, wastes margin on sure things, wastes budget on lost causes, and does active harm to sleeping dogs. A RESPONSE MODEL RANKS BY P(CONVERT), WHICH SORTS SURE THINGS TO THE TOP — precisely the people who needed nothing. In simulation the response model's top decile was 100% sure things and earned 72 incremental conversions; the uplift model's top decile was 99% persuadables and earned 893, a factor of 12.4. And the response model's per-user uplift was FLAT at +0.020 across the entire top 20%, which is the tell: it is sorting on a quantity carrying essentially no information about being moved. THE UNCOMFORTABLE PART is that by ordinary metrics the response model is far better — AUC 0.895 against 0.513, barely above chance. Selecting between the two on held-out AUC picks the wrong one every time.",
          "deepDive": "The reason this is hard rather than merely counterintuitive is signal-to-noise. Both conditional expectations are estimable under randomization, and each can be modelled accurately, but their DIFFERENCE is typically much smaller than either term — so a pair of models with excellent individual accuracy can produce a difference that is mostly noise. That is why uplift needs far more data than a response model of comparable complexity, and why the discipline's estimators are all about controlling that noise rather than about capacity. The T-learner fits each arm separately and subtracts, which is simple and lets the two models' errors add. The S-learner uses one model with treatment as a feature, which shares statistical strength but risks regularizing the treatment feature away entirely when the effect is weak — producing a model that confidently predicts zero uplift everywhere. The X-learner imputes counterfactual outcomes and then models the imputed effect, which helps a lot when the arms are very unbalanced in size. Causal forests and DR-learners target τ(x) directly with orthogonalization, and are the modern default when there is enough randomized data to support them."
        },
        {
          "q": "How do you evaluate an uplift model when there is no ground-truth label?",
          "a": "YOU EVALUATE ON GROUPS, BECAUSE NO INDIVIDUAL LABEL EXISTS. The standard construction is the uplift curve: rank the holdout by predicted uplift, then for each prefix of that ranking compute the difference in outcome rate between treated and control units WITHIN the prefix, scaled to the population. A good model puts a steep rise at the left. The Qini coefficient is the area between that curve and the random-targeting diagonal, and AUUC is the area under the curve itself. All three share the same requirement: a randomized holdout, with both arms present at every level of the ranking, because every point on the curve is a treated-versus-control contrast. THAT MAKES A PERMANENT HOLDOUT INFRASTRUCTURE RATHER THAN A COURTESY — without it there is no way to evaluate the model at all, and it is not recoverable after the fact. THE FAILURE MODE TO NAME EXPLICITLY is evaluating with the outcome metric out of habit. In the simulation AUC on Y ranked the response model 0.895 against the uplift model's 0.513, and the 0.513 model was worth twelve times more in incremental conversions. Any automated model selection driven by predictive loss — a sweep, an AutoML run, a leaderboard — will reliably pick the worse targeting model.",
          "deepDive": "Two practical cautions. First, uplift curves are NOISY, much more so than ROC curves, because each point is a difference of two rates within a bucket rather than a count. Bucket-level confidence bands are essential, and it is common for two candidate models' Qini coefficients to be statistically indistinguishable on any realistic holdout — in which case the honest report is that you cannot tell them apart, not that the higher number wins. Second, the curve answers 'how good is this ranking' but the deployment question is usually 'what fraction should we treat', and the answer to that depends on cost, not on the curve's shape alone. The right object is a net-value curve with the per-treatment cost subtracted, whose maximum gives the treatment fraction. In the simulation the raw uplift curve keeps rising slowly past 30%, but with any nonzero contact cost the optimum lands well left of that. Worth adding that the sleeping-dog structure makes this non-monotonic in a way people find surprising: the total is not maximized at 100%, so even a free campaign has an interior optimum."
        },
        {
          "q": "A retention team wants to email every dormant user. What is your concern?",
          "a": "SLEEPING DOGS, AND THEY ARE ESPECIALLY LIKELY IN THIS EXACT CAMPAIGN. A 'we miss you' email to a dormant subscriber reminds them that a subscription exists and gives them a convenient link back into the product — which is also a convenient link to the cancellation page. The segment with negative uplift is not hypothetical here; it is the mechanism of the campaign working in reverse. In the simulation sleeping dogs were 10% of the population at −0.150 each, and they destroyed 543 conversions inside the blanket campaign. THE CONSEQUENCE IS THAT TREATING EVERYONE IS NOT THE UPPER BOUND, which is the assumption behind 'email everyone, it can only help'. Targeting the top 30% by uplift earned 1,854 against the blanket campaign's 1,600 — MORE total conversions at 30% of the cost. So the safe-sounding default was beaten on both axes simultaneously. WHAT I WOULD PROPOSE is a randomized holdout on the first send, which costs almost nothing and is the only way to learn any of this; measure the effect by segment, specifically looking for segments where the effect is negative rather than just small; and then build an uplift model on that randomized data and suppress the negative tail. The first campaign is the training set, and treating it that way costs one round of delay.",
          "deepDive": "There is an organisational obstacle worth anticipating, because the technical answer usually is not the hard part. Campaign teams are measured on conversions among the treated, and that metric goes UP when you target sure things and goes DOWN when you suppress them, so the incentive points at exactly the wrong model. Changing the metric to incremental conversions against a holdout is the actual intervention, and it is a reporting change rather than a modelling one. The second thing worth raising is that negative uplift is frequently invisible in aggregate: if sleeping dogs are 10% at −0.15 and persuadables are 20% at +0.25, the blanket average is positive, the campaign is declared a success, and nobody looks further. Only a segmented analysis against a holdout surfaces the harm. That pattern generalises well beyond email — push notification volume, upsell prompts, and re-engagement flows all have a segment for whom the intervention is the thing that reminds them to leave, and aggregate lift will hide it every time."
        },
        {
          "q": "Can you build an uplift model from observational data?",
          "a": "ONLY UNDER IGNORABILITY, AND THE PROBLEM IS WORSE HERE THAN FOR AN AVERAGE EFFECT. The mechanics do not object: fit one model on the treated rows, another on the untreated rows, subtract. But the difference between arms is then confounding plus effect, and since uplift models are estimating a small difference between two much larger quantities, a confounding term that is modest relative to the outcome can be large relative to the effect. AND IT VARIES BY X, which is the specific danger for targeting: the model does not just get the level wrong, it learns a RANKING driven by where selection is strongest. Since the users most likely to have selected into treatment are usually the most engaged — the sure things — an observational uplift model tends to rank exactly the wrong people to the top, reproducing the response-model failure while wearing causal language. IF I HAD NO CHOICE, I would use a doubly robust or DR-learner approach with a propensity model, restrict to the region of common support, and validate against whatever randomized data exists even if it is small and old. And I would report it as a hypothesis generator rather than a targeting policy, with a plan to randomize the first deployment so the model's own ranking gets tested.",
          "deepDive": "There is a cheap and underused middle path: partial randomization. You do not need a fully randomized campaign to learn uplift — a small random holdout plus a small random treated group carved out of the observational population is enough to estimate uplift in the overlap region and, critically, to CALIBRATE the observational model against experimental truth. Comparing the observational uplift ranking to the experimental one on that slice tells you how much to trust the rest, and in most consumer systems the answer is sobering. The other thing worth knowing is that logged propensities transform this problem completely: if the treatment decision was made by a model or a rule whose probabilities were recorded, you have a known assignment mechanism rather than an estimated one, and ignorability holds by construction rather than by assumption. That is a strong argument for building any targeting system with epsilon-randomization and propensity logging from day one — it is a small cost at build time and it is the difference between being able to answer counterfactual questions later and not."
        },
        {
          "q": "How much data does an uplift model need relative to a response model?",
          "a": "SUBSTANTIALLY MORE, AND THE REASON IS STRUCTURAL RATHER THAN INCIDENTAL. You are estimating a difference between two conditional expectations that is typically much smaller than either. If the baseline rate is 0.30 and the effect is 0.02, both arm models can be estimated to a few percent relative error and their difference is still mostly noise — the errors of the two models do not cancel, they add. The variance of a difference of independent estimates is the sum of variances, so the standard error on τ(x) is larger than on either term, while the quantity itself is an order of magnitude smaller. SO THE PRACTICAL RULE IS THAT SAMPLE SIZE SCALES WITH THE INVERSE SQUARE OF THE EFFECT SIZE, exactly as it does for experiment power, but now you need it WITHIN each region of covariate space where you want a distinct prediction. That is what makes fine-grained personalization of treatment expensive: every extra split of the feature space divides the data supporting each estimate. THE TWO LEVERS THAT ACTUALLY HELP are reducing outcome variance — use a pre-period covariate as a control, or CUPED-style adjustment — and constraining the model to fewer, coarser segments, which is often where the value is anyway. A model that reliably separates three segments beats a per-user score that is noise.",
          "deepDive": "The advice to prefer coarse segments deserves defending, since it sounds like giving up. In the simulation the entire value came from separating persuadables from sure things — a single binary distinction — and any model that finds it captures nearly all the available gain, with 12.4× at the top decile and 12.3× at the top 20%. The curve is remarkably flat across that range, meaning the fine ordering within the persuadable group barely matters. That is typical: uplift structure tends to be coarse in practice, driven by a few interpretable segments, and the marginal value of a highly personalized score over a good three-bucket rule is usually small and expensive. Tree-based uplift methods lean into this by splitting directly on the difference between arms rather than on outcome purity, which both regularizes toward coarse structure and produces something a marketing team can read. The other practical point is that uplift models degrade faster than response models, because the effect can shift when the creative, the price or the competitive context changes even if the baseline conversion behaviour does not — so the holdout is needed continuously, not once."
        },
        {
          "q": "What is the transferable lesson here beyond marketing?",
          "a": "A METRIC THAT SCORES THE MODEL'S STATED TASK CAN BE ANTI-CORRELATED WITH THE DECISION IT IS DEPLOYED TO MAKE. Here the gap is unusually stark and measurable: AUC 0.895 versus 0.513 on the prediction task, 72 versus 893 incremental conversions on the decision. The model that loses by 0.38 of AUC wins by 12.4×. The reason generalises — the deployed system is choosing an ACTION, and the value of an action is a difference between what happens with it and without it, which is not what a predictive score measures. THE SAME STRUCTURE APPEARS EVERYWHERE ONCE YOU LOOK. A recommender optimized for click probability recommends items the user would have found anyway, and its incremental value is much smaller than its offline metric implies. A churn model ranks people likely to leave, most of whom cannot be saved, when the actionable question is who can be. A fraud model scores likelihood rather than the effect of intervening, and blocking a transaction has its own costs on the other side. A medical risk score identifies prognosis rather than who benefits from treatment. IN EACH CASE THE FIX IS THE SAME SHAPE: define the decision, write the counterfactual comparison it implies, and build the metric from that — which almost always means a randomized holdout, because the counterfactual has to come from somewhere.",
          "deepDive": "There is a second, subtler transfer worth naming: the presence of a NEGATIVE segment. Most predictive framings implicitly assume the intervention is weakly helpful, so more of it is safe and the only question is budget. Sleeping dogs break that, and the consequence is not a smaller optimum but a qualitatively different one — treating 30% beat treating 100% on effect AND on cost, so the blanket policy was not even on the efficient frontier. Once you know to look for the negative segment you find it in a lot of systems: notifications that trigger muting, upsell prompts that trigger cancellation, security warnings that train users to dismiss warnings, aggressive fraud blocks that drive good customers away. Aggregate lift hides all of them, because a positive average is entirely compatible with a harmed minority, and the harmed minority is often the segment you least want to harm. So the operational habit is to look at the effect DISTRIBUTION across segments rather than its mean, and to treat a negative segment as a finding rather than as noise until a holdout says otherwise. That habit is the same one this module has been building throughout — ask what comparison the number came from, and what it would look like if the comfortable assumption were false."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "★ The four segments",
        "back": "Sure things (convert either way), lost causes (neither), persuadables (only if treated), sleeping dogs (only if LEFT ALONE). A campaign creates value on persuadables only."
      },
      {
        "type": "formula",
        "front": "Uplift = CATE",
        "back": "τ(x) = E[Y(1)−Y(0) | X=x]. Both halves estimable under randomization; the DIFFERENCE is far smaller than either term, so accurate arm models still give a noisy gap."
      },
      {
        "type": "pitfall",
        "front": "★ AUC 0.895 loses to AUC 0.513",
        "back": "Response model AUC 0.895 on Y; uplift score 0.513 (near chance). Top-10% incremental conversions: 72 vs 893 — 12.4×. Selecting by held-out AUC picks the wrong model every time."
      },
      {
        "type": "intuition",
        "front": "Who does each model pick?",
        "back": "Response top decile: 100% sure things (+0.020/user, FLAT across the top 20% — the tell). Uplift top decile: 99% persuadables (+0.248/user). Same features, same algorithm, different target."
      },
      {
        "type": "pitfall",
        "front": "★ Treating everyone is not the upper bound",
        "back": "Blanket campaign: 1,600 conversions at 100% cost. Top 30% by uplift: 1,854 at 30% cost. Sleeping dogs (10% of users, −0.150 each) destroyed 543 conversions inside the blanket."
      },
      {
        "type": "definition",
        "front": "T- / S- / X-learner",
        "back": "T: two arm models, subtract (errors ADD). S: one model with T as a feature (regularization can drop T → zero uplift everywhere). X: impute counterfactuals then model the imputed effect (good for unbalanced arms)."
      },
      {
        "type": "definition",
        "front": "Uplift metrics",
        "back": "Uplift curve (incremental outcome vs fraction targeted), Qini (area vs the random line), AUUC. All are treated-vs-control contrasts within ranked buckets — group-level, never per-row."
      },
      {
        "type": "pitfall",
        "front": "Why is a randomized holdout infrastructure?",
        "back": "Every point on an uplift curve needs BOTH arms present at that level of the ranking. Without a permanent holdout the model cannot be evaluated at all — and it is not recoverable after the fact."
      },
      {
        "type": "pitfall",
        "front": "Uplift on observational data",
        "back": "The arm difference = confounding + effect, and confounding VARIES BY X. Selection is strongest among the engaged — the sure things — so it ranks exactly the wrong users, in causal language."
      },
      {
        "type": "intuition",
        "front": "Why uplift needs more data",
        "back": "Variance of a difference ADDS while the quantity shrinks. n scales with 1/effect² WITHIN each region of feature space. Levers: variance reduction (CUPED, pre-period covariates) and coarser segments."
      },
      {
        "type": "intuition",
        "front": "Prefer coarse segments",
        "back": "The gain was 12.4× at top-10% and 12.3× at top-20% — nearly FLAT. All the value came from one binary distinction. Fine ordering within persuadables barely mattered."
      },
      {
        "type": "intuition",
        "front": "★ The transferable lesson",
        "back": "A metric scoring the model's stated task can be ANTI-correlated with the decision it's deployed for. Same shape in recommenders (would-have-clicked), churn (can't be saved), fraud, medical risk. Build the metric from the counterfactual the DECISION implies."
      }
    ],
    "refs": [
      {
        "title": "Radcliffe & Surry (2011), Real-World Uplift Modelling with Significance-Based Uplift Trees",
        "url": "https://www.stochasticsolutions.com/pdf/sig-based-up-trees.pdf"
      },
      {
        "title": "Gutierrez & Gerardy (2017), Causal Inference and Uplift Modelling: A Review of the Literature",
        "url": "https://proceedings.mlr.press/v67/gutierrez17a.html"
      },
      {
        "title": "Kunzel, Sekhon, Bickel & Yu (2019), Metalearners for Estimating Heterogeneous Treatment Effects",
        "url": "https://www.pnas.org/doi/10.1073/pnas.1804597116"
      },
      {
        "title": "Athey & Imbens (2016), Recursive Partitioning for Heterogeneous Causal Effects",
        "url": "https://www.pnas.org/doi/10.1073/pnas.1510489113"
      },
      {
        "title": "Wager & Athey (2018), Estimation and Inference of Heterogeneous Treatment Effects using Random Forests",
        "url": "https://www.tandfonline.com/doi/full/10.1080/01621459.2017.1319839"
      }
    ],
    "demos": [
      "decision-tree",
      "bagging-boosting",
      "roc",
      "classification-metrics"
    ]
  },
  "ab-testing": {
    "level": "core",
    "body": {
      "intuition": [
        "Randomization is the only method in this module that buys ignorability by DESIGN rather than by assumption. That is why an experiment is worth its cost, and it is also why the remaining failure modes are all about the design leaking - not about the estimator being wrong.",
        "The leaks are procedural and they are large. Checking an A/A test - two arms drawn from the same distribution, so the true effect is exactly zero - once gives a 5.0% false positive rate as advertised. Checking it ten times gives 19.7%, and twenty times gives 25.0%. Nothing about the data changed; the DECISION RULE changed, and the decision rule is part of the statistic.",
        "The same arithmetic runs across metrics rather than across time. Twenty independent metrics on a dashboard produce at least one nominally significant result 64.2% of the time under a true null, and fifty produce one 92.3% of the time. A team that ships when any metric is green under a nominal 5% test is running closer to a coin flip, and every individual test in that dashboard is computed correctly."
      ],
      "math": [
        {
          "h": "Peeking inflates the false positive rate, measured",
          "paras": [
            "Each interim look is another chance to cross the boundary, and the crossings are positively correlated but far from identical, so the family-wise rate climbs steeply at first and then slowly.",
            "Twenty thousand simulated A/A experiments per row, 4,000 users per arm, evenly spaced checkpoints."
          ],
          "tex": "\\text{peeks}: 1 \\to 5.0\\%, \\quad 2 \\to 8.1\\%, \\quad 5 \\to 14.0\\%, \\quad 10 \\to 19.7\\%, \\quad 20 \\to 25.0\\%",
          "texNote": "In the limit of continuous monitoring with a fixed nominal threshold, the probability of crossing at some point approaches 1 - the law of the iterated logarithm guarantees the statistic wanders back across any fixed boundary eventually."
        },
        {
          "h": "Minimum detectable effect scales as one over root n",
          "paras": [
            "Power calculations are the part of experimentation that is pure arithmetic, and the square root is what makes big experiments feel disappointing."
          ],
          "tex": "\\mathrm{MDE} = (z_{1-\\alpha/2}+z_{\\text{power}})\\,\\sigma\\sqrt{\\tfrac{2}{n}}: \\quad n{=}10^3 \\to 0.125\\sigma, \\quad 10^4 \\to 0.040\\sigma, \\quad 10^5 \\to 0.013\\sigma, \\quad 10^6 \\to 0.004\\sigma",
          "texNote": "A hundredfold increase in users buys a tenfold improvement in resolution. This is why variance reduction is worth more than traffic: it attacks sigma, which sits outside the square root."
        },
        {
          "h": "CUPED: free sample size from a pre-period covariate",
          "paras": [
            "Subtract off the part of the outcome predicted by a pre-treatment covariate. The covariate is pre-treatment so the adjustment cannot bias the estimate, and it removes variance in proportion to the squared correlation."
          ],
          "tex": "Y^{cuped}=Y-\\theta(X_{pre}-\\bar{X}_{pre}), \\quad \\theta=\\frac{\\mathrm{Cov}(Y,X_{pre})}{\\mathrm{Var}(X_{pre})}, \\quad \\mathrm{Var}\\ \\text{reduction}=\\rho^2",
          "texNote": "At rho = 0.627 the variance fell 39.3%, equivalent to multiplying the sample size by 1.65x at zero cost in users or duration. MDE at n = 50,000 improved from 0.0226 to 0.0176."
        }
      ],
      "code": [
        {
          "h": "The two multiplicity surfaces, and the fix that keeps early stopping",
          "paras": [
            "Peeking multiplies across TIME. A metrics dashboard multiplies across METRICS. Both are the same arithmetic and both are usually uncontrolled."
          ],
          "code": "# ACROSS TIME - A/A test, true effect exactly zero\n#   1 check  ->  5.0%      10 checks ->  19.7%\n#   5 checks -> 14.0%      20 checks ->  25.0%\n\n# ACROSS METRICS - P(at least one 'significant') under a true null\n#    1 metric  ->  5.0%      20 metrics ->  64.2%\n#   10 metrics -> 40.1%      50 metrics ->  92.3%\n\n# THE FIX IS NOT 'STOP LOOKING' - it is to pay for looking\n#   10 peeks at alpha=0.0500 each -> family-wise 19.3%\n#   10 peeks at alpha=0.0106 each -> family-wise  5.5%   <- Pocock-style\n\n# ★ You keep the ability to stop early. You pay for it in the boundary,\n#   which is a worse threshold at every single look.",
          "caption": "Sequential designs are not a way to avoid the cost of peeking. They are a way to pay it in advance, in a currency you choose."
        },
        {
          "h": "Where experiments leak even when the statistics are right",
          "paras": [
            "Every item here breaks the design rather than the estimator, so no amount of statistical care downstream repairs it."
          ],
          "code": "# INTERFERENCE      marketplace / social / shared budget -> SUTVA fails,\n#                   control is contaminated by treatment. Fix: cluster,\n#                   market, or switchback randomization (costly in power).\n# NON-COMPLIANCE    assigned != exposed. Report ITT; use assignment as an\n#                   instrument for LATE. Never analyse as-treated.\n# DIFFERENTIAL      attrition/outcome-logging differs by arm -> you are\n#   ATTRITION       conditioning on a POST-treatment variable (collider).\n# SAMPLE RATIO      observed split != designed split. A 50/50 that lands\n#   MISMATCH        50.4/49.6 at scale means assignment is broken - and\n#                   the whole analysis is void, not merely noisier.\n# NOVELTY /         effect decays or grows over the window; a 1-week read\n#   PRIMACY         of a permanent change is a different estimand.\n# TRIGGER DILUTION  analysing all users when only 3% saw the change divides\n#                   the effect by ~33 and the power with it.",
          "caption": "SRM is the highest-value automated check to run: it is cheap, it fires on the failures that invalidate everything, and it has no false-negative-free alternative."
        }
      ],
      "useCases": [
        "Any product change where the decision is reversible and the metric moves within a reasonable window - the default, and the reason to make experimentation infrastructure rather than a project.",
        "Sizing an experiment before running it, so that 'we saw no significant difference' can be reported honestly as 'we could not have detected anything below X'.",
        "Deciding between more traffic and better statistics: at rho = 0.627 CUPED was worth a 1.65x sample multiplier for free, which usually beats waiting another week.",
        "Designing holdouts that outlive a single test, since a permanent randomized holdout is what makes uplift modelling, long-run effect measurement and observational calibration possible later."
      ],
      "pitfalls": [
        "Peeking with a fixed threshold. Ten looks took the false positive rate from 5.0% to 19.7% and twenty took it to 25.0%, on data with no effect at all.",
        "Declaring success when any metric on a dashboard turns green. Twenty independent metrics produce a false positive 64.2% of the time and fifty produce one 92.3% of the time.",
        "Stopping as soon as significance appears, which is peeking with an optimal stopping rule and biases the effect size upward even when the direction is right - the winner's curse.",
        "Ignoring a sample ratio mismatch because it is 'only half a percent'. At scale that is overwhelming evidence that assignment is broken, and it voids the analysis rather than widening the interval.",
        "Analysing as-treated instead of intention-to-treat under non-compliance, which discards the randomization and reintroduces exactly the selection the experiment was built to remove.",
        "Reading a one-week experiment as an estimate of a permanent change. Novelty and primacy effects mean the estimand is 'the effect during week one', which is a different quantity.",
        "Diluting the effect by analysing all users when only a small triggered subset could possibly be affected, which divides the measured effect and the power along with it."
      ],
      "connections": [
        {
          "ref": "causal-inference/potential-outcomes",
          "text": "Why randomization works at all: it removes the selection term by construction rather than by assumption, and it is the only method here that does."
        },
        {
          "ref": "causal-inference/instrumental-variables",
          "text": "The repair for non-compliance - assignment instruments for exposure, giving ITT and LATE as two honest numbers instead of one dishonest one."
        },
        {
          "ref": "causal-inference/resampling",
          "text": "Permutation tests as the assumption-light alternative for skewed metrics, and the exact sense in which they are exact."
        },
        {
          "ref": "reinforcement-learning/bandits",
          "text": "The adaptive alternative that trades clean inference for lower regret, and why the resulting logs need logged propensities to remain analysable."
        },
        {
          "ref": "mlops/system-design",
          "text": "Experimentation as platform: assignment service, exposure logging, SRM alerting and a metric registry are infrastructure decisions, not analysis decisions."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Why does randomization identify the causal effect?",
          "a": "Assignment is independent of the potential outcomes by construction, so the selection term is exactly zero. It is bought by design, not assumed."
        },
        {
          "q": "What does peeking do to the false positive rate?",
          "a": "Inflates it. Measured on A/A data: 1 check 5.0%, 5 checks 14.0%, 10 checks 19.7%, 20 checks 25.0%."
        },
        {
          "q": "Why does it inflate?",
          "a": "Each look is another chance to cross a fixed boundary. Under continuous monitoring the crossing probability approaches 1."
        },
        {
          "q": "Twenty metrics, nominal 5% each. P(at least one false positive)?",
          "a": "1 − 0.95²⁰ = 64.2%. Fifty metrics gives 92.3%."
        },
        {
          "q": "Give the MDE formula and its scaling.",
          "a": "MDE = (z_{1−α/2} + z_power)·σ·√(2/n). ∝ 1/√n — 100× the users buys 10× the resolution."
        },
        {
          "q": "What is CUPED and what does it buy?",
          "a": "Y − θ(X_pre − mean). Variance reduction ρ². At ρ=0.627: 39.3% less variance ≈ a 1.65× sample multiplier, free."
        },
        {
          "q": "Why can't CUPED bias the estimate?",
          "a": "X_pre is pre-treatment, so it is independent of assignment. Adjusting for it removes variance, not signal."
        },
        {
          "q": "How do you keep early stopping legitimately?",
          "a": "Pay for it in the boundary. 10 peeks at α=0.0106 each gave 5.5% family-wise vs 19.3% at α=0.05. Or use always-valid p-values / mSPRT."
        },
        {
          "q": "What is sample ratio mismatch and why does it void an analysis?",
          "a": "Observed split ≠ designed split. It means assignment or logging is broken, so the arms are not exchangeable — the result is invalid, not just noisy."
        },
        {
          "q": "ITT or as-treated under non-compliance?",
          "a": "ITT. As-treated throws away the randomization and reintroduces selection. Use assignment as an instrument if you want LATE."
        },
        {
          "q": "What is the winner's curse in experimentation?",
          "a": "Stopping at first significance selects on a high realization of noise, so the reported effect is biased upward even when the sign is right."
        },
        {
          "q": "What is trigger dilution?",
          "a": "Analysing all users when only a triggered subset could be affected. If 3% trigger, the effect and the power are divided by ~33."
        }
      ],
      "standard": [
        {
          "q": "Explain why peeking at an experiment inflates the false positive rate, and how to fix it without giving up early stopping.",
          "a": "THE DECISION RULE IS PART OF THE STATISTIC, AND PEEKING CHANGES THE DECISION RULE. A p-value below 0.05 controls the error rate of ONE pre-specified test at one pre-specified time. If you evaluate repeatedly and stop the first time the threshold is crossed, you have defined a different procedure — 'reject if the statistic ever crosses' — whose error rate is much larger. Measured on simulated A/A experiments where the true effect is exactly zero: one check gives 5.0%, five gives 14.0%, ten gives 19.7%, twenty gives 25.0%. Nothing about the data generating process changed across those rows. And in the limit of continuous monitoring against a fixed boundary the crossing probability approaches 1, because the law of the iterated logarithm guarantees the statistic wanders back across any fixed threshold eventually. THE FIX IS NOT 'STOP LOOKING', which is unenforceable and wastes the operational value of early stopping. It is to PAY for looking. Group sequential designs spend the alpha budget across pre-planned looks: ten peeks at a Pocock-style boundary of 0.0106 each brought the family-wise rate back to 5.5% against 19.3% for the naive version. Always-valid p-values and mixture SPRT approaches go further and permit continuous monitoring with no pre-specified schedule.",
          "deepDive": "The honest trade is worth stating, because sequential methods are sometimes sold as free. You keep the ability to stop early and you pay in the boundary: the threshold is stricter at every single look, so if the effect is real and you run to the planned horizon anyway, you have less power than the fixed-horizon test would have given you. Sequential designs are therefore worth it when early stopping has operational value — a harmful change you want to kill fast, or a decision that unblocks other work — and not worth it when you were going to wait for the full sample regardless. There is a second, subtler cost that survives any correct sequential procedure: the winner's curse. Stopping at the first crossing selects on a high realization of noise, so the reported effect size is biased upward even when the sign is correct and the error rate is properly controlled. That is not a bug in the method, it is selection, and the mitigations are shrinkage toward a prior, reporting a de-biased estimate, or planning to re-measure the winner in a follow-up holdout. Teams that ship on the first crossing and then wonder why the aggregate of their wins does not show up in the top-line metric are usually seeing exactly this."
        },
        {
          "q": "Your experimentation platform tracks 40 metrics per test. What is your advice?",
          "a": "THE DASHBOARD IS A MULTIPLICITY SURFACE AND IT IS USUALLY UNCONTROLLED. Under a true null with independent metrics, the probability that at least one is nominally significant at 5% is 40.1% for ten metrics, 64.2% for twenty, and 92.3% for fifty. At forty it is around 87%. So a team that ships when any metric looks good is running a procedure whose false positive rate is close to certainty, and every individual test in it is computed correctly — which is why nobody notices. THE FIX IS STRUCTURAL, NOT STATISTICAL: designate ONE primary metric per experiment, in advance, and make the ship decision on it. Everything else is either a GUARDRAIL, tested in the other direction with the burden of proof reversed — you need evidence of no harm, so a wide interval is a failure rather than a pass — or it is EXPLORATORY, reported without a decision attached and treated as hypothesis generation. That taxonomy does most of the work and costs nothing. WHERE FORMAL CORRECTION IS STILL NEEDED, I would use Benjamini-Hochberg over Bonferroni for the exploratory tier: metrics on the same experiment are heavily correlated, so Bonferroni is badly conservative, and controlling false discovery rate matches what the tier is for.",
          "deepDive": "The guardrail asymmetry deserves emphasis because it is where teams most often get the logic backwards. For a primary metric the null is 'no effect' and you need evidence to move; for a guardrail like latency, crash rate or unsubscribes, shipping without evidence of harm is the risky action, so the sensible framing is a non-inferiority test against a pre-agreed margin. 'p > 0.05 on the guardrail' is not reassurance — it is often a statement that the experiment could not have detected a 20% regression, and that should block the ship rather than clear it. The other practical point is that metric correlation cuts both ways: it makes Bonferroni too conservative, and it also means the significant metrics in a given readout tend to arrive in correlated clusters, which reads as a coherent story and is very persuasive. A good platform makes the tiering mandatory at experiment-creation time rather than at readout time, because the entire value of pre-specification comes from the ordering. Choosing the primary metric after seeing the results is the same failure as peeking, in a form that leaves no trace in the logs."
        },
        {
          "q": "How do you decide how long to run an experiment, and what do you do if you are underpowered?",
          "a": "I START FROM THE MDE FORMULA AND WORK BACKWARDS FROM A DECISION-RELEVANT EFFECT SIZE. MDE = (z_{1−α/2} + z_power)·σ·√(2/n), so the resolution improves only as 1/√n: at 1,000 per arm it is 0.125σ, at 10,000 it is 0.040σ, at 100,000 it is 0.013σ, and at a million it is 0.004σ. A hundredfold increase in users buys tenfold resolution, which is why 'we have lots of traffic' is less decisive than people expect. THE RIGHT STARTING QUESTION IS NOT 'WHAT CAN WE DETECT' BUT 'WHAT WOULD CHANGE OUR DECISION' — if a 0.2% lift is not worth shipping, there is no point powering for it, and if only a 2% lift matters, the experiment may be short. I also fix the duration to whole weeks to cover day-of-week composition, and I check that the effect is plausibly stable over the window rather than a novelty spike. IF I AM UNDERPOWERED, the first move is variance reduction rather than more traffic, because sigma sits outside the square root: CUPED with a pre-period covariate at rho = 0.627 cut variance 39.3%, equivalent to a 1.65x sample multiplier for free, improving MDE at n = 50,000 from 0.0226 to 0.0176. After that: trigger-based analysis to remove unaffected users, a less noisy metric, or accepting that the question is not answerable and saying so.",
          "deepDive": "The last option is the one worth defending, because 'we cannot answer this' is a legitimate and underused outcome. A null result from an underpowered test is not evidence of no effect, and reporting it as 'no significant difference' invites exactly that misreading. The honest phrasing states the resolution: 'we could not have detected anything below 3%, and the point estimate was +0.4% with an interval spanning −2.1% to +2.9%.' That tells the reader what they actually learned. On trigger dilution, the arithmetic is brutal enough to be worth checking first: if only 3% of users ever encounter the changed surface, analysing all users divides the effect by roughly 33 and the power along with it, so a well-powered experiment on triggered users can be hopeless on the full population. The catch is that triggering must be defined by pre-treatment eligibility, not by observed exposure, because 'users who saw the new flow' is a post-treatment variable and conditioning on it is the collider problem. The clean pattern is to log a counterfactual trigger in BOTH arms — the moment a control user would have hit the change — which requires instrumenting the control path deliberately and is one of the highest-value things an experimentation platform can provide."
        },
        {
          "q": "What breaks an experiment even when the statistics are done perfectly?",
          "a": "THE DESIGN LEAKS, AND NO ESTIMATOR REPAIRS A BROKEN DESIGN. Six failures matter most. INTERFERENCE breaks SUTVA: in a marketplace, treated buyers consume inventory control buyers need, so the control arm is degraded by the treatment and the measured lift is partly a transfer; in a social product, spillover contaminates control the other way and shrinks the effect. Fix by randomizing at the level containing the interference and pay the power cost. NON-COMPLIANCE means assigned is not exposed; report ITT and use assignment as an instrument for LATE, never as-treated. DIFFERENTIAL ATTRITION is worse than it looks — if outcome logging or dropout differs by arm you are conditioning on a post-treatment variable, which is the collider case, and even ITT is compromised. SAMPLE RATIO MISMATCH is the highest-value automated check there is: a designed 50/50 landing at 50.4/49.6 at scale is overwhelming evidence that assignment or logging is broken, and it VOIDS the analysis rather than widening the interval. NOVELTY AND PRIMACY mean a one-week read of a permanent change estimates a different quantity. TRIGGER DILUTION divides both effect and power by the reciprocal of the trigger rate.",
          "deepDive": "SRM deserves the top spot because of its error profile: it is cheap, it is automatic, and it catches a class of failure whose other symptoms are subtle. The causes are usually mundane and always serious — a redirect that drops users asymmetrically, a bot filter applied after assignment, a client that fails to log for one variant, an eligibility check evaluated at different times in the two arms. In every case the arms have stopped being exchangeable, which is the one property the whole design rests on, and no analysis can be trusted afterward. The right response is to investigate and discard, not to reweight. On interference, the underrated practical move is to run the same change at two randomization levels simultaneously when you can afford it — user-level and market-level — because the gap between the two estimates IS the interference, measured rather than argued about. It is expensive, so it is worth doing once for a class of change rather than every time, and the resulting correction factor generalises reasonably well within that class. The general lesson is the module's: these are all failures of the assumption the design was supposed to buy, and none of them shows up as a wide confidence interval."
        },
        {
          "q": "When would you use a bandit instead of an A/B test?",
          "a": "WHEN MINIMISING REGRET MATTERS MORE THAN CLEAN INFERENCE. A bandit adaptively shifts traffic toward arms that look better, so it loses less value during the learning period, which is the right trade for short-lived decisions with many arms — headline selection, creative rotation, promotional offers, anything that expires before a proper experiment could finish. It is the wrong trade when you need a trustworthy effect estimate, because adaptive allocation destroys the clean statistics: sample sizes are data-dependent, the arms are no longer exchangeable at analysis time, and naive confidence intervals on the resulting logs are wrong in a way that is easy to miss. THE SECOND CONDITION IS STATIONARITY. Bandits assume the arm that was best stays best; if the environment shifts, a converged bandit is stuck exploiting a stale winner, and non-stationary variants exist but require you to know something about the drift rate. THE THIRD IS THE HORIZON — bandits pay off when the decision is made many times in a stream, not once. WHAT I WOULD DO IN PRACTICE is keep a small forced-exploration floor and LOG THE ASSIGNMENT PROPENSITIES, which preserves the ability to do off-policy evaluation later and turns the bandit's exploration into a valid instrument.",
          "deepDive": "That logging point is the one with the longest-lived consequences, and it is an infrastructure decision rather than an analysis one. If every decision records the probability with which it was made, you have a known assignment mechanism rather than an estimated one, so ignorability holds by construction and inverse propensity weighting is valid without any of the concerns from the propensity lesson. Teams that log propensities can answer counterfactual questions about their own system for years; teams that do not are reduced to observational estimates on logs generated by a policy that changed repeatedly, which is the hardest version of the problem. There is a middle design that is often the right default: run a bandit for allocation but hold out a fixed small fraction under uniform randomization permanently. That holdout costs a little regret and it buys unbiased measurement of the whole system's effect, a training set for uplift models, and a way to detect that the bandit has converged on something bad. The cost is easy to quantify and the benefit is not, which is why it tends to get cut — worth arguing for explicitly and early, since it cannot be recovered retroactively."
        },
        {
          "q": "In the module's framing, what does an experiment actually buy, and what does it not?",
          "a": "IT BUYS IGNORABILITY BY DESIGN — the one purchase in this module that does not rest on an untestable claim about the world. A coin flip cannot correlate with potential outcomes, so the selection term is exactly zero rather than assumed zero, and that is a categorical difference from adjustment, matching, or instruments. In the opening lesson the same estimator on the same potential outcomes gave −1.889 under confounded assignment and 4.999 under randomization, against a truth of 4.99. WHAT IT DOES NOT BUY IS ANY OF THE PROCEDURAL DISCIPLINE. Randomization says nothing about how many times you looked, how many metrics you scanned, whether the arms stayed exchangeable, whether treatment leaked between units, or whether the population you measured is the one you will ship to. Those are separate assumptions, and this lesson's numbers show they are not small: peeking took a 5.0% error rate to 25.0%, twenty metrics took it to 64.2%, and an SRM of half a percent invalidates everything upstream of it. SO THE FRAMING GENERALISES RATHER THAN CHANGING: the transferable question is still what would have to be true for this number to be causal, and for an experiment the answer is a list of design properties rather than a claim about confounders — which is progress, because design properties can be monitored.",
          "deepDive": "That last clause is the real reason experimentation platforms are worth building. The assumptions an experiment needs are mostly CHECKABLE at the platform level, which is not true for any other method here. SRM alerting checks exchangeability. Pre-registered primary metrics check multiplicity. Sequential boundaries check peeking. Exposure logging in both arms checks trigger dilution. Fixed whole-week durations check day-of-week composition. Each of those converts a discipline problem into an infrastructure property, which is the only way it survives contact with an organisation under deadline pressure. The residue that platforms cannot check is interference and external validity — whether the effect measured on this population, in this season, at this scale, transfers to the rollout — and those deserve explicit discussion in every readout rather than a default assumption of yes. The pattern to carry forward is that a method's value is partly determined by how many of its assumptions can be automated into a monitor, and by that criterion randomized experimentation is far ahead of everything else in this module, which is why it should be the default whenever it is possible at all."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "★ What randomization uniquely buys",
        "back": "Ignorability by DESIGN, not assumption — a coin flip can't correlate with potential outcomes, so the selection term is exactly zero. Same estimator: −1.889 confounded vs 4.999 randomized (truth 4.99)."
      },
      {
        "type": "pitfall",
        "front": "★ Peeking, measured on A/A data",
        "back": "1 check 5.0% | 5 checks 14.0% | 10 checks 19.7% | 20 checks 25.0%. Nothing about the data changed — the DECISION RULE changed, and the rule is part of the statistic."
      },
      {
        "type": "pitfall",
        "front": "The dashboard multiplicity surface",
        "back": "P(≥1 significant) under a true null: 10 metrics 40.1%, 20 metrics 64.2%, 50 metrics 92.3%. Every individual test is computed correctly — which is why nobody notices."
      },
      {
        "type": "formula",
        "front": "MDE and its scaling",
        "back": "MDE = (z_{1−α/2}+z_power)·σ·√(2/n). n=10³→0.125σ, 10⁴→0.040σ, 10⁵→0.013σ, 10⁶→0.004σ. 100× users = 10× resolution."
      },
      {
        "type": "formula",
        "front": "★ CUPED",
        "back": "Y − θ(X_pre − mean), θ = Cov(Y,X_pre)/Var(X_pre). Variance reduction = ρ². At ρ=0.627: −39.3% variance ≈ 1.65× sample size, FREE. Can't bias — X_pre is pre-treatment."
      },
      {
        "type": "intuition",
        "front": "Why variance reduction beats more traffic",
        "back": "MDE ∝ σ/√n. Traffic attacks n under a square root; CUPED attacks σ directly. That's why a pre-period covariate is worth more than another week."
      },
      {
        "type": "definition",
        "front": "Sequential testing — what it costs",
        "back": "10 peeks at α=0.0106 → 5.5% family-wise (vs 19.3% at α=0.05). You KEEP early stopping and pay in a stricter boundary at every look. Not free: less power if you run to the horizon anyway."
      },
      {
        "type": "pitfall",
        "front": "Winner's curse",
        "back": "Stopping at first crossing selects on a high noise realization → the reported effect is biased UPWARD even with the error rate correctly controlled. Shrink, or re-measure the winner."
      },
      {
        "type": "pitfall",
        "front": "★ Sample ratio mismatch",
        "back": "Designed 50/50 landing 50.4/49.6 at scale = assignment or logging is broken. It VOIDS the analysis — it doesn't widen the interval. Highest-value automated check there is."
      },
      {
        "type": "definition",
        "front": "The guardrail asymmetry",
        "back": "Primary metric: need evidence to move. Guardrail: need evidence of NO HARM — so p>0.05 is not reassurance, it's often 'we couldn't have detected a 20% regression'. Use non-inferiority against a pre-agreed margin."
      },
      {
        "type": "pitfall",
        "front": "Trigger dilution",
        "back": "3% trigger rate → effect and power both divided by ~33. Fix by triggered analysis — but define triggering by PRE-treatment eligibility, logged in BOTH arms. 'Users who saw it' is post-treatment (collider)."
      },
      {
        "type": "intuition",
        "front": "Why experiments are the default",
        "back": "Their assumptions are mostly CHECKABLE at the platform level — SRM alerts, pre-registered primaries, sequential boundaries, both-arm exposure logging. No other method here can automate its assumptions into a monitor."
      }
    ],
    "refs": [
      {
        "title": "Kohavi, Tang & Xu (2020), Trustworthy Online Controlled Experiments",
        "url": "https://experimentguide.com/"
      },
      {
        "title": "Deng, Xu, Kohavi & Walker (2013), Improving the Sensitivity of Online Controlled Experiments by Utilizing Pre-Experiment Data (CUPED)",
        "url": "https://exp-platform.com/Documents/2013-02-CUPED-ImprovingSensitivityOfControlledExperiments.pdf"
      },
      {
        "title": "Johari, Koomen, Pekelis & Walsh (2017), Peeking at A/B Tests: Why It Matters and What to Do About It",
        "url": "https://dl.acm.org/doi/10.1145/3097983.3097992"
      },
      {
        "title": "Fabijan et al. (2019), Diagnosing Sample Ratio Mismatch in Online Controlled Experiments",
        "url": "https://dl.acm.org/doi/10.1145/3292500.3330722"
      },
      {
        "title": "Benjamini & Hochberg (1995), Controlling the False Discovery Rate",
        "url": "https://www.jstor.org/stable/2346101"
      }
    ],
    "demos": [
      "clt",
      "bandit",
      "thompson-vs-ucb",
      "classification-metrics"
    ]
  },
  "resampling": {
    "level": "core",
    "body": {
      "intuition": [
        "The bootstrap's idea is that the sample is the best available stand-in for the population, so resampling from it with replacement imitates drawing fresh samples from the world. That gets you a sampling distribution for almost any statistic without deriving anything, which is why it is one of the most useful tools in applied statistics.",
        "It also inherits the limits of that stand-in exactly. Coverage of a 95% interval for the mean came out at 94.0% at n=50 and 96.5% at n=500, and for the median 95.2% - the tool works. Coverage for the MAXIMUM of a uniform distribution was 0.0% at n=50, 0.0% at n=500 and 0.0% at n=5,000, because a bootstrap resample can never contain a value larger than the sample maximum, so the upper end of the interval is structurally below the truth. More data does not repair it.",
        "The lesson's central point is narrower and more important than either. Bootstrap the confounded estimate from the module's first lesson - 1,000 resamples of a study whose true effect is +4.99 - and you get a beautifully tight 95% interval of [-1.958, -1.848]. THE INTERVAL IS CORRECT AND THE NUMBER HAS THE WRONG SIGN. Resampling quantifies uncertainty about the ESTIMATOR. It has nothing whatsoever to say about the ASSUMPTION."
      ],
      "math": [
        {
          "h": "The bootstrap principle, and where it stops",
          "paras": [
            "Replace the unknown population distribution F with the empirical distribution F-hat, then compute the sampling distribution of the statistic under F-hat by simulation.",
            "This works when the statistic is a smooth functional of the distribution. It fails for statistics that depend on the extreme tail, on the boundary of the support, or on a parameter at the edge of its space."
          ],
          "tex": "\\hat{F}_n \\to F \\ \\text{(Glivenko-Cantelli)}, \\qquad \\mathcal{L}(T(X)\\mid F) \\approx \\mathcal{L}(T(X^*)\\mid \\hat{F}_n)",
          "texNote": "Coverage measured: mean 94.0% at n=50 and 96.5% at n=500, median 95.2% at n=500, maximum of a uniform 0.0% at every n tested. The failure is not slow convergence - it is inconsistency."
        },
        {
          "h": "Permutation tests are exact under a sharp null",
          "paras": [
            "If the labels are exchangeable under the null, every reassignment of labels is equally likely, so the reference distribution is the observed data itself and the test's level is guaranteed by construction rather than by an approximation.",
            "The null being tested is sharp: no effect for ANY unit, which is stronger than a null on the mean."
          ],
          "tex": "p = \\frac{1+\\#\\{|T(\\pi(\\text{labels}))| \\geq |T_{\\text{obs}}|\\}}{1+B}",
          "texNote": "Measured false positive rates on A/A data with heavy-tailed outcomes: permutation 5.3% at n=10 and 5.3% at n=30 against a nominal 5%, while Welch's t was 1.4% and 2.9% - conservative rather than liberal, which costs power."
        },
        {
          "h": "Conservatism is not safety",
          "paras": [
            "A test spending only a fraction of its alpha budget looks safe and is paying for it in detection.",
            "Same lognormal data, same sample size, a real shift of +2.0."
          ],
          "tex": "\\text{FPR: perm } 5.3\\% \\ \\text{vs Welch } 2.9\\% \\qquad \\Longrightarrow \\qquad \\text{power: perm } \\mathbf{43.4\\%} \\ \\text{vs Welch } 37.2\\%",
          "texNote": "The 6.2 point power gap is the direct price of the t-test's unused alpha on skewed data. Neither test is invalid here; one is simply using the error budget it was given."
        }
      ],
      "code": [
        {
          "h": "★ A tight interval around a wrong number",
          "paras": [
            "The confounded design from lesson one: true ATE +4.99, naive difference in means −1.91, one thousand bootstrap resamples."
          ],
          "code": "for b in range(1000):\n    s = rng.integers(0, N, N)            # resample WITH replacement\n    est[b] = Y[s][T[s]==1].mean() - Y[s][T[s]==0].mean()\n\n# true ATE                      4.993\n# point estimate               -1.906\n# bootstrap 95% CI    [-1.958, -1.848]     width 0.109\n# covers the truth?              NO\n\n# ★ The bootstrap did its job PERFECTLY. It reported the sampling\n#   variability of the naive estimator, which is genuinely tiny.\n#   The estimator is biased, and bias is invisible to resampling\n#   because every resample inherits the same selection.",
          "caption": "Resampling is an answer to 'how much would this number move if I collected the data again the same way'. If the way is wrong, it moves very little, very confidently."
        },
        {
          "h": "Where the bootstrap is not consistent",
          "paras": [
            "Coverage measured over 400 simulated datasets per row, 600 resamples each."
          ],
          "code": "# WORKS      mean    n=50   -> 94.0%     n=500 -> 96.5%\n#            median  n=500  -> 95.2%\n\n# FAILS      max of Uniform(0,1)\n#            n=50   -> 0.0%     n=500 -> 0.0%     n=5000 -> 0.0%\n#   the bootstrap max can never exceed the SAMPLE max, so the upper\n#   limit sits below the truth at every sample size\n\n# THE FAMILY OF FAILURES\n#   * extremes / boundary of support     (max, min, range)\n#   * parameters on a boundary           (variance component = 0)\n#   * dependent data resampled i.i.d.    (time series, clusters, network)\n#   * n too small for the tail you need  (heavy tails, rare events)\n# fixes: block/cluster bootstrap for dependence, subsampling (m out of n)\n#        for non-smooth statistics, extreme-value theory for tails",
          "caption": "The i.i.d. bootstrap on time series or clustered data is the most common version of this error in practice, and it produces intervals that are far too narrow."
        }
      ],
      "useCases": [
        "Confidence intervals for statistics with no convenient closed form - medians, ratios, Gini coefficients, differences of quantiles, or any metric computed by a multi-step pipeline.",
        "Standard errors for a full procedure rather than a final step, such as a matching pipeline where the matching itself is a source of variance the analytic formula ignores.",
        "Small-sample or badly skewed A/B metrics, where a permutation test holds its nominal level exactly while parametric tests become conservative and lose power.",
        "Cluster and block bootstrapping for correlated data - users with many sessions, time series, or experiments randomized at the market level."
      ],
      "pitfalls": [
        "Reading a tight bootstrap interval as evidence of correctness. One thousand resamples of a confounded estimate returned [-1.958, -1.848] on a truth of +4.99 - bias is invisible to resampling because every resample inherits it.",
        "Bootstrapping the maximum, minimum or range. Coverage was 0.0% at every sample size tested, and the failure is inconsistency rather than slow convergence.",
        "Resampling rows i.i.d. when the data is clustered or serially correlated. The resulting intervals are far too narrow; use a block or cluster bootstrap that resamples the dependent unit.",
        "Treating a permutation test's null as a null on the mean. It tests the SHARP null of no effect for any unit, so rejection can be driven by a difference in variance or shape.",
        "Assuming a conservative test is the safe choice. Welch's t held 2.9% against a nominal 5% on skewed data and paid 6.2 points of power on the same data.",
        "Using too few resamples for a small p-value. A permutation p-value has resolution 1/(B+1), so B = 400 cannot report anything below about 0.0025 regardless of the evidence.",
        "Bootstrapping after model selection while ignoring the selection step. If the model was chosen using the data, the whole selection has to be inside the resampling loop or the interval is optimistic."
      ],
      "connections": [
        {
          "ref": "causal-inference/potential-outcomes",
          "text": "The bias-versus-variance distinction that this lesson makes operational: resampling addresses the second axis and is silent on the first."
        },
        {
          "ref": "causal-inference/ab-testing",
          "text": "Permutation tests as the assumption-light option for skewed experiment metrics, and where the extra power actually comes from."
        },
        {
          "ref": "causal-inference/propensity-matching",
          "text": "Why matched-pair standard errors need the whole procedure bootstrapped: the matching step is a source of variance the naive formula treats as fixed."
        },
        {
          "ref": "ml-theory/cross-validation",
          "text": "The other resampling scheme, aimed at generalization error rather than at a sampling distribution, and sharing the failure mode when the data is dependent."
        },
        {
          "ref": "supervised-learning/ensembles",
          "text": "Resampling used to build a predictor instead of an interval - bagging is the bootstrap turned into a variance-reduction device."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "State the bootstrap principle.",
          "a": "Substitute the empirical distribution for the unknown population, then simulate the statistic's sampling distribution by resampling with replacement."
        },
        {
          "q": "What does a bootstrap interval quantify?",
          "a": "Sampling variability of the estimator. Not bias, not model error, not identification."
        },
        {
          "q": "Give the headline demonstration of that limit.",
          "a": "1,000 resamples of a confounded estimate gave [−1.958, −1.848] on a true effect of +4.99 — correct interval, wrong sign."
        },
        {
          "q": "Why is bias invisible to the bootstrap?",
          "a": "Every resample is drawn from the same sample, so it inherits the same selection. The resamples vary; the bias does not."
        },
        {
          "q": "Name a statistic the bootstrap fails on.",
          "a": "The maximum. Coverage 0.0% at n=50, 500 and 5,000 — a resample can never exceed the sample max, so the upper limit sits below the truth."
        },
        {
          "q": "Is that failure fixed by more data?",
          "a": "No. It is inconsistency, not slow convergence. Use subsampling (m out of n) or extreme-value theory instead."
        },
        {
          "q": "What null does a permutation test actually test?",
          "a": "The SHARP null: no effect for any unit. Stronger than a null on the mean — rejection can come from a difference in shape or variance."
        },
        {
          "q": "Why is a permutation test exact?",
          "a": "Under exchangeability every label reassignment is equally likely, so the reference distribution is the data itself — the level holds by construction."
        },
        {
          "q": "Permutation vs Welch t on heavy-tailed A/A data?",
          "a": "Permutation 5.3% (nominal 5%); Welch 1.4% at n=10 and 2.9% at n=30 — conservative, not liberal."
        },
        {
          "q": "What does that conservatism cost?",
          "a": "Power. On lognormal data with a real +2.0 shift: permutation 43.4% vs Welch 37.2%."
        },
        {
          "q": "How do you bootstrap dependent data?",
          "a": "Resample the dependent UNIT — block bootstrap for time series, cluster bootstrap for grouped rows. i.i.d. row resampling gives intervals that are far too narrow."
        },
        {
          "q": "What is the resolution limit of a permutation p-value?",
          "a": "1/(B+1). With B=400 you cannot report below about 0.0025 no matter how strong the evidence."
        }
      ],
      "standard": [
        {
          "q": "Explain the bootstrap and be precise about what it can and cannot tell you.",
          "a": "THE BOOTSTRAP SUBSTITUTES THE SAMPLE FOR THE POPULATION. You have one dataset and want the sampling distribution of some statistic, which classically requires deriving it analytically. Instead you treat the empirical distribution as the population, draw resamples of the same size with replacement, recompute the statistic on each, and use the spread of those values as the sampling distribution. Glivenko-Cantelli justifies it: the empirical distribution converges to the true one, so for statistics that are smooth functionals of the distribution the imitation is asymptotically right. It works well — measured coverage of a nominal 95% interval was 94.0% for the mean at n=50, 96.5% at n=500, and 95.2% for the median. WHAT IT QUANTIFIES IS EXACTLY ONE THING: how much this estimator would move if you collected data the same way again. It says nothing about whether collecting it that way was a good idea. THE DEMONSTRATION I WOULD GIVE is bootstrapping the confounded estimate from earlier in the module — true effect +4.99, naive difference −1.91. One thousand resamples returned a 95% interval of [−1.958, −1.848], width 0.109, excluding the truth entirely. The bootstrap performed flawlessly; it reported that the naive estimator is very stable, which is true, and irrelevant.",
          "deepDive": "The reason bias is structurally invisible is worth being able to state cleanly: every resample is drawn from the same original sample, so every resample inherits the same selection mechanism. The resampling varies which rows you got; it cannot vary how rows came to be treated. That makes the bootstrap a variance tool by construction, and it means a narrow bootstrap interval on an observational estimate is one of the more misleading artefacts you can produce, because it has all the visual grammar of rigour. There is a partial exception worth knowing: the bootstrap CAN estimate the bias of an estimator relative to the resampling distribution, which is how bias-corrected accelerated intervals work and how the jackknife estimates small-sample bias. But that only captures bias arising from the estimator's nonlinearity — the plug-in bias of a ratio, say. It cannot capture bias arising from the sampling or assignment mechanism, because that mechanism is baked into the data and reproduced identically in every resample. Two different meanings of the word bias, and conflating them is a common source of overconfidence."
        },
        {
          "q": "Where does the bootstrap fail, and what do you use instead?",
          "a": "IT FAILS WHEN THE STATISTIC IS NOT A SMOOTH FUNCTIONAL OF THE DISTRIBUTION. The cleanest example is the maximum: sampling from Uniform(0,1), whose true supremum is 1.0, bootstrap coverage of a nominal 95% interval was 0.0% at n=50, 0.0% at n=500 and 0.0% at n=5,000. The reason is structural rather than statistical — a bootstrap resample can only contain values already in the sample, so the bootstrap maximum never exceeds the sample maximum, and the upper end of the interval sits below the truth by construction. It is inconsistency, not slow convergence, so more data does not fix it. THE FAMILY IS BROADER THAN EXTREMES: parameters on the boundary of their space, such as a variance component that is truly zero; statistics driven by the tail when n is too small to contain the tail; and, by far the most common in practice, DEPENDENT DATA RESAMPLED AS IF IT WERE I.I.D. If rows are sessions from the same user, or consecutive days of a time series, resampling rows destroys the dependence and the resulting intervals are far too narrow. THE FIXES ARE SPECIFIC: block bootstrap for serial dependence, cluster bootstrap resampling the whole user or market, subsampling (m out of n without replacement) for non-smooth statistics, and extreme-value theory for genuine tail questions.",
          "deepDive": "The dependence case deserves the most attention because it is silent and pervasive. Analytics data is almost never row-independent — users generate many events, events cluster in sessions, sessions cluster in days, and experiments are frequently randomized at a level coarser than the row. Resampling rows treats every event as independent evidence, which inflates the effective sample size by roughly the number of events per unit and shrinks the interval by its square root, so a factor of 25 events per user makes the interval about five times too narrow. The right unit to resample is the unit of randomization, always, and that is a rule worth applying mechanically. For serial dependence, block length is the parameter that matters and it needs to be long enough to contain the correlation structure — too short and you are back to i.i.d., too long and you have very few effective blocks. Also worth noting that if the model was SELECTED using the data, the selection step must live inside the resampling loop, otherwise the interval describes a model that was chosen with knowledge of the outcome and is optimistic for exactly the reason a training-set score is optimistic."
        },
        {
          "q": "When would you use a permutation test rather than a t-test?",
          "a": "WHEN THE DISTRIBUTIONAL ASSUMPTION IS DOUBTFUL AND EXCHANGEABILITY IS DEFENSIBLE. A permutation test is exact by construction: under the null the labels are exchangeable, so every reassignment is equally likely, and comparing the observed statistic to the distribution over reassignments gives a test whose level is guaranteed rather than approximated. That makes it the natural choice for small samples, heavy-tailed metrics, or statistics with no tractable null distribution — a difference in medians, a difference in 95th percentiles, or the output of a whole pipeline. Measured on A/A data with lognormal outcomes, the permutation test held 4.6% at n=10 and 5.3% at n=30 against a nominal 5%, while Welch's t came in at 1.4% and 2.9%. NOTE THE DIRECTION: the t-test was CONSERVATIVE, not liberal, which people often read as the safe outcome. IT IS NOT FREE. On the same lognormal data with a real shift of +2.0, permutation power was 43.4% and Welch power was 37.2% — the unused alpha budget shows up directly as 6.2 points of lost detection. In an experimentation context that is real money, because it is the difference between shipping a genuine improvement and calling it a null.",
          "deepDive": "The important caveat is what null you are actually testing. A permutation test tests the SHARP null — no effect for any unit whatsoever — which is stronger than the null of no average effect. The practical consequence is that rejection can be driven by a difference in variance or shape rather than in location, so on data where the treatment changes dispersion but not the mean, a permutation test can reject while the mean difference is genuinely zero. If the mean is the estimand, studentizing the test statistic largely repairs this and gives asymptotic validity for the weak null too. Two operational notes: the p-value has resolution 1/(B+1), so B = 400 cannot report anything below roughly 0.0025 regardless of the evidence, and you should always use the (1 + count)/(1 + B) form rather than count/B, which can report an impossible zero. And permutation requires exchangeability under the null, which randomization supplies directly — this is a genuinely nice property, since the same coin flip that identified the effect also licenses the inference, with no distributional assumption in between."
        },
        {
          "q": "How would you compute standard errors for a multi-step analysis pipeline?",
          "a": "BOOTSTRAP THE ENTIRE PIPELINE, NOT THE LAST STEP. The common error is to treat everything upstream of the final estimate as fixed — the fitted propensity model, the matching, the imputation, the feature selection, the choice of specification — and then compute an analytic standard error on the final number. That standard error answers 'how variable is this last step given everything before it', which is not the question. If the propensity model was fitted on this data, a different sample would have produced a different model, different matches, and a different estimate, and all of that variability belongs in the interval. SO THE PROCEDURE IS: resample at the unit of randomization or independence, then re-run everything — refit the propensity model, redo the matching, recompute the estimate — and take the spread across replicates. It is expensive, which is the honest reason people skip it, and the fix is fewer replicates rather than a shortcut, since even 200 replicates of the full pipeline beats 10,000 of the last step. I WOULD ALSO INCLUDE THE MODEL SELECTION if there was any, because selecting a specification on the data and then reporting the interval for the selected one is the same optimism as a training-set score.",
          "deepDive": "There are cases where the full bootstrap is known to be problematic and it is worth recognising them rather than trusting it blindly. Matching estimators are one: Abadie and Imbens showed the standard bootstrap is not valid for nearest-neighbour matching with a fixed number of matches, because the matching function is not smooth enough, and they derived analytic variance formulas instead. Cross-validation is another awkward case, since the folds are dependent and naive bootstrapping of CV estimates understates variance. So the honest guidance is: bootstrap the whole pipeline as the default, know the specific estimators where it is invalid, and when in doubt validate the procedure by simulation — generate data with a known answer, run the entire pipeline including the interval, and check coverage. That simulation habit is the most useful thing in this lesson and it generalises far beyond resampling: if you can write down the data generating process, you can measure whether your uncertainty quantification is honest, rather than assuming it. It is also the only way to catch the interaction effects between steps, which is where multi-step pipelines actually go wrong."
        },
        {
          "q": "A colleague reports a bootstrap interval as evidence their observational estimate is reliable. Respond.",
          "a": "I WOULD SEPARATE THE TWO QUESTIONS THAT ARE BEING RUN TOGETHER: how much would this number move on a fresh sample collected the same way, and is the way we collected it capable of answering the question. The bootstrap answers the first with real authority and is completely silent on the second. THE DEMONSTRATION IS ONE SLIDE. Take a study where the true effect is +4.99 and the assignment is confounded, so the naive difference is −1.91. Run a thousand bootstrap resamples: the 95% interval is [−1.958, −1.848], width 0.109, and it excludes the truth by seven units and the correct sign. Nothing malfunctioned. The estimator really is that stable, because every resample inherits the identical selection mechanism — resampling varies which rows you drew, and it cannot vary how those rows came to be treated. A TIGHT INTERVAL ON A BIASED ESTIMATE IS THE WORST OF BOTH WORLDS, because it has the visual grammar of rigour and encodes none of it, and it is more persuasive to a reader than the point estimate alone would have been. SO WHAT I WOULD ASK FOR INSTEAD is a sensitivity analysis quantifying how much unmeasured confounding would overturn the sign, a negative-control outcome, and the overlap diagnostics — the things that speak to the assumption rather than to the variance.",
          "deepDive": "This is worth generalising because the pattern recurs across the whole module. Every method here has a diagnostic that is genuinely informative about one thing and routinely read as evidence about another: the first-stage F measures instrument strength and gets read as validity; a balance table measures the matching procedure's success on its own inputs and gets read as absence of confounding; R-squared measures fit and gets read as causal correctness; and a bootstrap interval measures sampling variability and gets read as reliability. In each case the diagnostic is computed from the same data and under the same assumption as the estimate, so it cannot be independent evidence about that assumption. The sorting question that catches all four is: could this number have come out badly for a reason the procedure does not control? A bootstrap interval could not — it is guaranteed to be narrow when the estimator is stable, which biased estimators typically are. The diagnostics that pass this test are the ones drawing on something external: a negative control, a pre-period placebo, a prediction the DAG makes that the fitting never touched, or a comparison against an experiment."
        },
        {
          "q": "What is the role of simulation in your workflow, given all of this?",
          "a": "IT IS THE ONLY PLACE WHERE THE COUNTERFACTUAL IS AVAILABLE, SO IT IS WHERE I CHECK MY OWN TOOLS. Every result in this module comes from data whose ground truth I generated, and that is not a pedagogical convenience — it is the only setting in which you can measure whether a procedure recovers the right answer, because in real data the right answer is exactly the thing missing. So my working habit is: before trusting a pipeline on real data, write down a generative process that resembles it, run the entire pipeline including the interval, and check calibration and coverage. That catches problems nothing else catches. It is how you find that your bootstrap interval covers at 0% for the statistic you chose, that your cluster structure makes your intervals five times too narrow, that your propensity pipeline returns a confident answer with a hidden confounder, or that your sequential boundary is not spending alpha the way you think. THE SECOND ROLE IS SENSITIVITY: simulate the world where your assumption is FALSE by a specified amount, and report what the estimate becomes. That converts an untestable claim into a range a reader can price, and it is the closest thing to falsification available for the parts of the analysis no data can check.",
          "deepDive": "The habit worth naming explicitly is the negative-result discipline: run your pipeline on data generated with NO effect and confirm it returns no effect at the nominal rate. That single check catches an enormous fraction of real pipeline bugs — leaked outcome information, double-counted units, a filter applied post-treatment, a metric definition that partially encodes the assignment — and it is far cheaper than any of the alternatives. It is the A/A test generalised from experiments to analysis code, and the same argument applies: the failure it catches is invisible in production because everything looks plausible. The mirror discipline is the positive control: inject a known effect of known size and confirm the pipeline recovers it, which catches attenuation from dilution, mismatched joins and unit errors. Together those two are worth more than most of the statistical sophistication downstream, and they are the part of the workflow that survives changes in method. It is also, in the module's framing, a way of buying a small piece of what the field otherwise lacks — a place where you can be told you are wrong."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "The bootstrap principle",
        "back": "Substitute the empirical distribution F̂ₙ for the unknown F, then simulate the statistic's sampling distribution by resampling with replacement. Justified by Glivenko–Cantelli for SMOOTH functionals."
      },
      {
        "type": "pitfall",
        "front": "★ A tight interval around a wrong number",
        "back": "1,000 resamples of a confounded estimate: 95% CI [−1.958, −1.848], width 0.109, on a TRUE effect of +4.99. The bootstrap worked perfectly — it reported that a biased estimator is very stable."
      },
      {
        "type": "intuition",
        "front": "Why is bias invisible to resampling?",
        "back": "Every resample is drawn from the SAME sample, so each inherits the identical selection mechanism. Resampling varies which rows you drew; it can't vary how rows came to be treated."
      },
      {
        "type": "pitfall",
        "front": "★ Where the bootstrap is INCONSISTENT",
        "back": "Max of Uniform(0,1): coverage 0.0% at n=50, 500 AND 5,000. A resample can never exceed the sample max. Not slow convergence — inconsistency. Use subsampling (m of n) or EVT."
      },
      {
        "type": "definition",
        "front": "The bootstrap failure family",
        "back": "Extremes/boundary of support; parameters on a boundary; tails when n is too small; and — most common in practice — DEPENDENT data resampled i.i.d. (sessions, time series, clusters)."
      },
      {
        "type": "pitfall",
        "front": "i.i.d. bootstrap on clustered data",
        "back": "25 events per user ⇒ effective n inflated ~25× ⇒ interval ~5× too narrow. Always resample the unit of randomization: block bootstrap (serial), cluster bootstrap (grouped)."
      },
      {
        "type": "definition",
        "front": "Why permutation tests are exact",
        "back": "Under the null the labels are exchangeable, so every reassignment is equally likely — the reference distribution IS the data. Level holds by construction, no distributional assumption."
      },
      {
        "type": "pitfall",
        "front": "What null does permutation test?",
        "back": "The SHARP null — no effect for ANY unit. Stronger than a null on the mean, so rejection can come from a difference in variance or shape. Studentize the statistic to recover the weak null."
      },
      {
        "type": "formula",
        "front": "★ Conservatism is not safety",
        "back": "Lognormal A/A: permutation 5.3% FPR vs Welch t 2.9% (nominal 5%). With a real +2.0 shift: permutation POWER 43.4% vs Welch 37.2%. The unused alpha is paid in lost detection."
      },
      {
        "type": "pitfall",
        "front": "Permutation p-value mechanics",
        "back": "Resolution is 1/(B+1) — B=400 can't report below ~0.0025. Always use (1+count)/(1+B), never count/B, which can report an impossible zero."
      },
      {
        "type": "intuition",
        "front": "Bootstrapping a multi-step pipeline",
        "back": "Resample at the independence unit and re-run EVERYTHING — refit the propensity model, redo the matching, redo any model selection. 200 full-pipeline replicates beat 10,000 of the last step."
      },
      {
        "type": "intuition",
        "front": "★ A/A and positive-control discipline",
        "back": "Run the pipeline on NO-effect data and confirm the nominal rate; inject a KNOWN effect and confirm recovery. Catches leakage, double-counted units, post-treatment filters, dilution, unit errors — cheaply."
      }
    ],
    "refs": [
      {
        "title": "Efron (1979), Bootstrap Methods: Another Look at the Jackknife",
        "url": "https://projecteuclid.org/journals/annals-of-statistics/volume-7/issue-1/Bootstrap-Methods-Another-Look-at-the-Jackknife/10.1214/aos/1176344552.full"
      },
      {
        "title": "Efron & Tibshirani (1993), An Introduction to the Bootstrap",
        "url": "https://www.routledge.com/An-Introduction-to-the-Bootstrap/Efron-Tibshirani/p/book/9780412042317"
      },
      {
        "title": "Bickel, Gotze & van Zwet (1997), Resampling Fewer Than n Observations",
        "url": "https://www.jstor.org/stable/24306073"
      },
      {
        "title": "Abadie & Imbens (2008), On the Failure of the Bootstrap for Matching Estimators",
        "url": "https://onlinelibrary.wiley.com/doi/10.3982/ECTA6474"
      },
      {
        "title": "Good (2005), Permutation, Parametric, and Bootstrap Tests of Hypotheses",
        "url": "https://link.springer.com/book/10.1007/b138696"
      }
    ],
    "demos": [
      "clt",
      "reservoir-sampling",
      "importance-sampling",
      "cross-validation"
    ]
  },
  "bayesian-workflow": {
    "level": "advanced",
    "body": {
      "intuition": [
        "Bayes' theorem is one line and the workflow around it is the actual subject. The theorem tells you how to update; it does not tell you whether your model is any good, whether your prior is defensible, or whether your sampler found the posterior it was supposed to find. Those are three separate questions with three separate checks, and conflating them is the standard failure.",
        "The workflow's real value is that it makes assumptions EXPLICIT and then gives you tools to interrogate them - which is a rare thing in this module. A prior predictive check asks what your prior believes before any data arrives. A posterior predictive check asks whether your fitted model can generate data that looks like what you saw. Both can fail loudly, and both are cheap.",
        "The trap is the same shape as everywhere else in the module. R-hat, effective sample size and divergence counts are diagnostics of the SAMPLER. Fitting a normal model to Student-t data with two degrees of freedom, R-hat came out at 1.0002 - textbook convergence - and the posterior mean recovered the location almost exactly at 3.006 against a true 3.000. The posterior predictive check then reported that the model's replicated data had a maximum absolute value in [9.83, 14.47] against an observed 29.43, and kurtosis in [-0.40, 0.49] against an observed 42.01, with Bayesian p-values of 0.0000. THE SAMPLER CONVERGED PERFECTLY ON THE WRONG MODEL."
      ],
      "math": [
        {
          "h": "Prior sensitivity is measurable, so measure it",
          "paras": [
            "Whether the prior matters is not a philosophical question, it is a property of how much information the data carries about the parameter. Run the analysis under several defensible priors and report the range.",
            "Beta-Binomial conjugate updating, true conversion rate 0.05, three priors: flat, skeptical, and deliberately wrong."
          ],
          "tex": "\\begin{array}{lccc} n & \\text{Beta}(1,1) & \\text{Beta}(20,380) & \\text{Beta}(80,20)\\\\ 10 & 0.1667 & 0.0512 & 0.7364\\\\ 100 & 0.0686 & 0.0520 & 0.4300\\\\ 1{,}000 & 0.0449 & 0.0457 & 0.1127\\\\ 100{,}000 & 0.0491 & 0.0491 & 0.0498 \\end{array}",
          "texNote": "At n = 10 the posterior means span a factor of 14. At n = 100,000 they agree to three decimals. If your conclusion moves when the prior moves, the honest report is that the data did not answer the question."
        },
        {
          "h": "'Uninformative' priors are informative on the scale that matters",
          "paras": [
            "A wide prior on a logit coefficient is not agnostic - it is a strong claim about the implied probability, because the link function is nonlinear.",
            "Push the prior through the model and look at what it predicts. That is a prior predictive check, and it takes one line."
          ],
          "tex": "\\beta \\sim N(0,\\sigma) \\Rightarrow p=\\mathrm{logit}^{-1}(\\beta): \\quad P(p<0.01 \\text{ or } p>0.99) = 0.0\\%\\ (\\sigma{=}1), \\ 64.7\\%\\ (\\sigma{=}10), \\ 96.3\\%\\ (\\sigma{=}100)",
          "texNote": "The N(0,100) prior, chosen precisely because it looked like it said nothing, asserts that the effect is essentially certain in one direction or the other 96% of the time. Flatness on the parameter scale is not flatness on the outcome scale."
        },
        {
          "h": "Two different questions with two different checks",
          "paras": [
            "Convergence diagnostics ask whether the chains explored the posterior of the model you wrote. Predictive checks ask whether that model could have produced your data. Neither answers the other."
          ],
          "tex": "\\hat{R}=\\sqrt{\\frac{\\frac{n-1}{n}W+\\frac{1}{n}B}{W}} = 1.0002 \\quad\\text{(converged)} \\qquad p_B = P(T(y^{rep})\\geq T(y)) = 0.0000 \\quad\\text{(model rejected)}",
          "texNote": "Both numbers computed from the same fit of a normal model to Student-t(2) data. The chains agreed with each other perfectly, and the model cannot generate data with the observed tails."
        }
      ],
      "code": [
        {
          "h": "The posterior predictive check that catches it",
          "paras": [
            "Simulate replicated datasets from the posterior, compute a test quantity on each, and compare to the observed value."
          ],
          "code": "# fitted a NORMAL model to Student-t(df=2) data\n\n# SAMPLER DIAGNOSTICS\n#   R-hat for mu       1.0002      target < 1.01   -> CONVERGED\n#   posterior mean mu  3.006       true location 3.000  -> and ACCURATE\n\n# POSTERIOR PREDICTIVE CHECK\n#   test quantity      observed    replicated 95%      Bayesian p\n#   max |y|              29.43     [ 9.83, 14.47]        0.0000\n#   kurtosis             42.01     [-0.40,  0.49]        0.0000\n\n# ★ The parameter you asked about is FINE. The model is wrong anyway,\n#   and every predictive interval it produces is far too narrow.\n#   Choose the test quantity to probe what you will USE the model for.",
          "caption": "Misspecification does not always bias the parameter of interest. It reliably destroys the uncertainty, which is usually the reason you went Bayesian in the first place."
        },
        {
          "h": "The workflow as a checklist",
          "paras": [
            "Each step catches a different class of failure, and each is cheap relative to the cost of the failure it catches."
          ],
          "code": "# 1  WRITE THE GENERATIVE MODEL   what process could have produced y?\n# 2  PRIOR PREDICTIVE CHECK       simulate y from the prior alone.\n#                                 Does it look like data from your field?\n# 3  FIT ON SIMULATED DATA        generate with KNOWN parameters, refit,\n#                                 check recovery.  <- catches coding bugs\n# 4  SIMULATION-BASED CALIBRATION are the posterior quantiles of the true\n#                                 value uniform?   <- catches subtler bugs\n# 5  FIT THE REAL DATA\n# 6  SAMPLER DIAGNOSTICS          R-hat, ESS, divergences, energy (BFMI)\n# 7  POSTERIOR PREDICTIVE CHECK   can the model regenerate your data?\n# 8  PRIOR SENSITIVITY            rerun under 2-3 defensible priors\n# 9  MODEL COMPARISON             LOO / WAIC, with Pareto-k diagnostics\n\n# ★ steps 3 and 4 are the ones people skip, and they are the ones that\n#   catch bugs no amount of staring at the code will.",
          "caption": "Fitting a model to data you generated is the only place a Bayesian analysis has ground truth, which makes it the only place the pipeline itself can be validated."
        }
      ],
      "useCases": [
        "Small-sample decisions where a defensible prior carries real information - early experiment readouts, rare events, or hierarchical settings where partial pooling stabilises noisy per-group estimates.",
        "Any question where the deliverable is a full distribution rather than a point - risk estimates, expected loss under a decision, or a probability that a variant is better by more than a margin.",
        "Sensitivity analysis for causal work, where an unmeasured confounder's strength can be given a prior and the posterior over the effect reported across that range.",
        "Hierarchical models for experiments across many segments or markets, where partial pooling formalises the shrinkage that the multiple-comparisons problem otherwise demands."
      ],
      "pitfalls": [
        "Reading R-hat as evidence the model is right. R-hat was 1.0002 on a model whose posterior predictive check returned Bayesian p-values of 0.0000 in both directions tested.",
        "Assuming a wide prior is uninformative. N(0,100) on a logit coefficient puts 96.3% of its mass on effects that are essentially certain in one direction.",
        "Reporting a single prior. At n=10 three defensible priors gave posterior means of 0.05, 0.17 and 0.74 - and at n=100,000 they agreed to three decimals, which is the useful signal.",
        "Choosing a test quantity for the posterior predictive check that the model fits by construction. Checking the mean of a model fitted to the mean tells you nothing; probe tails, extremes, and whatever the decision depends on.",
        "Skipping fitting on simulated data. It is the only step where ground truth exists, and it catches indexing bugs and misspecified likelihoods that no amount of code review finds.",
        "Treating divergences in Hamiltonian samplers as a nuisance to be tuned away. They usually indicate posterior geometry the parameterization cannot handle, and the fix is reparameterization rather than a smaller step size.",
        "Comparing models by marginal likelihood without noticing its extreme prior sensitivity. LOO or WAIC with Pareto-k diagnostics is the more robust default for predictive comparison."
      ],
      "connections": [
        {
          "ref": "unsupervised-learning/bayesian-inference",
          "text": "The mechanics this lesson sits on top of - conjugacy, MCMC and variational approximation - here treated as the easy part of the problem."
        },
        {
          "ref": "causal-inference/confounding",
          "text": "Where a prior earns its keep in causal work: sensitivity analysis puts a distribution on the strength of an unmeasured confounder instead of asserting it is zero."
        },
        {
          "ref": "causal-inference/ab-testing",
          "text": "Bayesian experiment readouts, where a decision rule on the posterior avoids the peeking problem only if the loss function is specified rather than the threshold moved."
        },
        {
          "ref": "ml-theory/calibration",
          "text": "The frequentist check on a Bayesian claim: if you report 90% intervals, do 90% of them cover? Simulation-based calibration is that question asked of the whole pipeline."
        },
        {
          "ref": "causal-inference/resampling",
          "text": "The other route to an interval, and the useful contrast - resampling assumes the sample represents the population, while this workflow assumes the model represents the process."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What does R-hat measure?",
          "a": "Between-chain versus within-chain variance — whether the chains agree, i.e. whether the SAMPLER converged. It says nothing about the model."
        },
        {
          "q": "Give the demonstration of that limit.",
          "a": "Normal model fitted to Student-t(2) data: R-hat 1.0002 and posterior mean 3.006 (truth 3.000), while posterior predictive p-values were 0.0000."
        },
        {
          "q": "What is a prior predictive check?",
          "a": "Simulate data from the prior alone, before seeing any observations, and ask whether it looks like plausible data from your field."
        },
        {
          "q": "Is N(0,100) on a logit coefficient uninformative?",
          "a": "No — it puts 96.3% of its mass on implied probabilities below 0.01 or above 0.99. Flat on the parameter scale is not flat on the outcome scale."
        },
        {
          "q": "When does the prior stop mattering?",
          "a": "When the data carries enough information. Beta-Binomial: three priors spanned 14× at n=10 and agreed to three decimals at n=100,000."
        },
        {
          "q": "What is a posterior predictive check?",
          "a": "Simulate replicated datasets from the posterior, compute a test quantity on each, and compare to the observed value."
        },
        {
          "q": "How do you pick the test quantity?",
          "a": "Probe what the model was NOT fitted to and what the decision depends on — tails, extremes, autocorrelation. Checking the mean of a mean-fitted model is vacuous."
        },
        {
          "q": "What is simulation-based calibration?",
          "a": "Draw parameters from the prior, simulate data, refit, and check that the posterior quantile of the true value is uniform. Validates the whole pipeline."
        },
        {
          "q": "What do divergences in HMC indicate?",
          "a": "Posterior geometry the parameterization can't traverse — usually a funnel. Fix by reparameterizing (non-centred), not by shrinking the step size."
        },
        {
          "q": "LOO/WAIC or marginal likelihood for model comparison?",
          "a": "LOO/WAIC with Pareto-k diagnostics for predictive comparison. Marginal likelihood is extremely prior-sensitive, including on parameters the data pins down."
        },
        {
          "q": "Does misspecification always bias the parameter of interest?",
          "a": "No — the normal-on-t fit recovered the location to 3.006. It reliably destroys the predictive uncertainty, which is usually why you went Bayesian."
        },
        {
          "q": "Does a Bayesian readout solve peeking?",
          "a": "Only if the decision rule is a specified loss and stays fixed. Monitoring a posterior probability until it crosses a threshold is the same optional-stopping problem."
        }
      ],
      "standard": [
        {
          "q": "Walk through the Bayesian workflow and say what each step catches.",
          "a": "THE THEOREM IS ONE LINE; THE WORKFLOW IS THE SUBJECT. Step one is writing a generative model — what process could have produced this data — which is already more than most analyses commit to. Step two is a PRIOR PREDICTIVE CHECK: simulate data from the prior alone and ask whether it resembles data from your field, which catches priors that are absurd on the scale that matters. Step three is FITTING ON SIMULATED DATA with known parameters and checking recovery, and step four is SIMULATION-BASED CALIBRATION, drawing parameters from the prior, simulating, refitting, and confirming the posterior quantile of the truth is uniform. THOSE TWO ARE THE STEPS PEOPLE SKIP and they are the only place ground truth exists, so they catch indexing bugs and misspecified likelihoods that code review does not. Step five fits the real data. Step six is SAMPLER DIAGNOSTICS — R-hat, effective sample size, divergences. Step seven is the POSTERIOR PREDICTIVE CHECK. Step eight is PRIOR SENSITIVITY, rerunning under two or three defensible priors. Step nine is model comparison via LOO or WAIC. The structure worth noticing is that steps six and seven answer completely different questions, and treating either as a substitute for the other is the standard failure.",
          "deepDive": "The reason to be systematic rather than opportunistic is that each check has a specific blind spot, and they are complementary rather than redundant. Prior predictive checks cannot see likelihood misspecification. Recovery on simulated data cannot see that the generative model is wrong about the real world, since you generated from it. R-hat cannot see model error. Posterior predictive checks are weak against exactly the features the model was fitted to, which is why the test quantity matters more than the check. LOO estimates predictive performance and is silent on causal validity. So the workflow is a set of partially-overlapping nets rather than one filter, and skipping any of them leaves a specific class of failure entirely uncaught. The other thing worth saying is that this is genuinely more disciplined than most frequentist practice, and that is the honest case for Bayesian methods — not that priors are philosophically superior, but that the workflow forces you to write down and check things that other traditions leave implicit. A maximum likelihood fit has a likelihood too, and its misspecification is just as damaging; it simply has no cultural norm requiring you to check it."
        },
        {
          "q": "Someone reports R-hat below 1.01 and calls the analysis validated. Respond.",
          "a": "R-HAT VALIDATES THE SAMPLER, NOT THE MODEL, AND THOSE COME APART COMPLETELY. R-hat compares between-chain to within-chain variance, so it answers 'did my chains converge to the same distribution' — which is a question about MCMC, and it is entirely possible to converge beautifully on a posterior belonging to a model that could never have produced the data. THE DEMONSTRATION IS DIRECT: fitting a normal model to Student-t data with two degrees of freedom, R-hat came out at 1.0002, well inside any threshold, and the posterior mean for the location was 3.006 against a true 3.000. Everything looked correct. Then the posterior predictive check: replicated datasets had maximum absolute values in [9.83, 14.47] against an observed 29.43, and kurtosis in [-0.40, 0.49] against an observed 42.01, with Bayesian p-values of 0.0000 for both. The model cannot generate data resembling the data it was fitted to. THE HONEST NUANCE IS THAT THE PARAMETER WAS FINE — misspecification did not bias the location. What it destroyed was the predictive distribution, which is far too narrow, so every interval and every decision based on tail risk is wrong. If the deliverable is a point estimate you may survive this; if it is uncertainty, which is usually why one goes Bayesian, you do not.",
          "deepDive": "I would add what R-hat itself misses, because it is not a strong check even on its own terms. Chains initialised near each other can agree while all missing a mode entirely, which is why over-dispersed initialisation matters. R-hat is insensitive to poor mixing in the tails, so effective sample size should be reported alongside it — and specifically the tail ESS, since a bulk ESS of 4,000 is compatible with terrible resolution on a 95% quantile. Divergences in Hamiltonian samplers are more informative than R-hat about geometry problems, and they should be treated as a modelling signal rather than a tuning nuisance: they usually mean a funnel, and the fix is a non-centred reparameterization rather than a smaller step size, which merely hides the symptom. Energy-based BFMI catches a different failure again. The general pattern is the module's: each diagnostic answers exactly the question it was built for, and every one of them gets read as a general certificate of correctness. The habit that helps is to say out loud, for each diagnostic, what would have to be true for it to fire — and then notice how narrow that set is."
        },
        {
          "q": "How do you choose a prior, and how do you defend it?",
          "a": "I CHOOSE IT ON THE OUTCOME SCALE AND DEFEND IT BY SHOWING WHAT IT PREDICTS. The intuition that a wide prior is safe fails as soon as there is a link function, because flatness on the parameter scale is not flatness on anything you care about. Measured: a N(0,1) prior on a logit coefficient puts essentially no mass on implied probabilities below 0.01 or above 0.99; N(0,10) puts 64.7% there; and N(0,100) — the one people pick precisely because it looks agnostic — puts 96.3% there. So the 'uninformative' prior is a strong assertion that the effect is nearly certain in one direction. THE PROCEDURE IS THE PRIOR PREDICTIVE CHECK: push the prior through the model, simulate datasets, and look at them. If they contain conversion rates of 99.9% or revenue figures larger than the world economy, the prior is wrong regardless of how neutral it looked. Weakly informative priors that rule out the absurd while staying agnostic within the plausible range are the sensible default. THEN I DEFEND IT BY SENSITIVITY: rerun under two or three defensible alternatives and report the range. In the Beta-Binomial simulation, three priors gave posterior means of 0.0512, 0.1667 and 0.7364 at n=10, and 0.0491, 0.0491 and 0.0498 at n=100,000.",
          "deepDive": "That last comparison is the most useful thing in the lesson operationally, because it reframes the whole prior debate as an empirical question. Whether the prior matters is not philosophical — it is a measurable property of how much information the data carries about that parameter, and you can just check. If the conclusion is stable across defensible priors, the argument is over and nobody needs to relitigate it. If the conclusion moves, that is not a reason to argue harder about which prior is right; it is a finding, and the honest report is that the data did not answer the question, with the range shown. That framing tends to defuse the objection that Bayesian analysis is subjective, because you have converted the subjectivity into a reported sensitivity rather than hiding it in a default. Worth adding that hierarchical models are where priors do their most valuable work and attract the least objection: a prior over group-level effects implements partial pooling, which is a principled answer to the multiple-comparisons problem from the experimentation lesson. Instead of correcting many independent tests, you model the effects as drawn from a common distribution, and the shrinkage falls out of the model rather than being bolted on."
        },
        {
          "q": "How would you use Bayesian methods in causal work specifically?",
          "a": "THE HIGHEST-VALUE USE IS SENSITIVITY ANALYSIS, because it turns the module's central untestable assumption into something with a distribution on it. Rather than asserting no unmeasured confounding, put a prior on the confounder's strength — its association with treatment and with outcome — and report the posterior over the effect, marginalising across that prior. The output is a statement like 'the effect remains positive unless an unmeasured confounder is at least as strong as age', which a reader can evaluate against confounders they know about. That is strictly more informative than a point estimate with an interval that conditions on the assumption being exactly true, and it is the natural Bayesian analogue of the E-value and Rosenbaum bounds. THE SECOND USE IS PARTIAL POOLING ACROSS SEGMENTS OR MARKETS. Heterogeneous treatment effects estimated independently per segment are noisy and invite exactly the multiple-comparisons failure from the experimentation lesson; a hierarchical model shrinks them toward the pooled effect by an amount the data determines, which is both better estimation and a principled answer to multiplicity. THE THIRD IS DECISION-MAKING UNDER A LOSS FUNCTION, where the posterior over the effect combines with the cost of acting to give an expected loss, which is the quantity the decision actually needs.",
          "deepDive": "The caution is the one this whole module has been building: none of this touches identification. A Bayesian estimate of a confounded effect is a confounded estimate with a posterior attached, and the posterior will be narrow and wrong in exactly the way the bootstrap interval was in the resampling lesson. Priors express uncertainty about PARAMETERS within a model; they do not express uncertainty about whether the model's causal structure is right, unless you explicitly build that in — which is what the sensitivity approach above does, and it is why it is the use case worth leading with. The other practical caution concerns Bayesian A/B testing, which is often sold as immune to peeking. It is not, quite. If you monitor the posterior probability that B beats A and stop when it crosses 95%, you have an optional stopping rule, and its operating characteristics depend on the prior and the rule rather than being automatically controlled. What genuinely fixes it is specifying a decision rule with a loss function in advance and not moving it, which is the same discipline the frequentist version requires, arrived at from a different direction."
        },
        {
          "q": "What is a posterior predictive check actually checking, and how do you pick the test quantity?",
          "a": "IT CHECKS WHETHER THE FITTED MODEL COULD HAVE PRODUCED YOUR DATA. You draw parameters from the posterior, simulate a replicated dataset for each draw, compute some test quantity on each replicate, and compare that distribution to the observed value. If the observed value sits far in the tail, the model cannot generate data with that feature. THE TEST QUANTITY IS THE ENTIRE DESIGN DECISION, because a check on something the model was fitted to is close to vacuous — a model fitted by matching the mean will reproduce the mean, and the resulting Bayesian p-value near 0.5 tells you nothing. THE PRINCIPLE IS TO PROBE WHAT THE MODEL WAS NOT FITTED TO AND WHAT YOUR DECISION DEPENDS ON. In the worked example the informative quantities were the maximum absolute value — observed 29.43 against a replicated 95% interval of [9.83, 14.47] — and kurtosis, observed 42.01 against [-0.40, 0.49], both with p-values of 0.0000. Both probe the tails, which is exactly where a normal model fitted to heavy-tailed data must fail, and exactly what a risk decision would depend on. For time series I would check autocorrelation; for counts, the proportion of zeros; for hierarchical models, the between-group variance.",
          "deepDive": "Two honest caveats. First, posterior predictive p-values are not calibrated in the frequentist sense — the data is used twice, once to fit and once to test, so the reference distribution is conservative and the p-value is not uniform under the true model. That makes them a diagnostic rather than a hypothesis test, and the right reading is qualitative: 0.0000 versus [9.83, 14.47] against 29.43 is unambiguous, whereas 0.03 warrants a shrug. Cross-validated versions such as LOO-PIT fix the double use and are worth preferring when the check is borderline. Second, a passing check does not mean the model is right — it means the model reproduces the features you thought to test, and it is silent on everything you did not. That is the same asymmetry as everywhere in this module: refutation is available, confirmation is not. The practical upshot is that the checks worth running are the ones that could plausibly fail and that you would act on, which usually means deriving them from the decision rather than from a list. If you are going to use the model to size a tail risk, check the tail; if you are going to use it to rank groups, check the ranking."
        },
        {
          "q": "How does this lesson fit the module's thesis?",
          "a": "IT IS THE ONE PLACE WHERE THE ASSUMPTIONS ARE WRITTEN DOWN AND SOME OF THEM CAN BE CHECKED, and it still has an untestable core. The workflow is unusually honest by construction: the prior is explicit, the likelihood is explicit, and both are interrogable — prior predictive checks catch absurd priors, posterior predictive checks catch likelihoods that cannot generate the data, simulation-based calibration catches bugs in the pipeline itself. That is more self-scrutiny than any other method in this module offers. AND THE SAME TRAP IS PRESENT. R-hat at 1.0002 with a posterior mean of 3.006 against a truth of 3.000 was a perfectly convergent sampler on a model whose predictive check returned 0.0000, and any reader who stopped at the convergence diagnostic would have shipped it. THE STRUCTURE IS IDENTICAL to the first-stage F testing strength rather than validity, and to the balance table reporting on its own inputs: a diagnostic computed from the same fit as the estimate cannot be independent evidence about the assumption behind it. WHAT BAYES ADDS TO THE CAUSAL PROBLEM is the ability to put a distribution on the untestable part — the strength of an unmeasured confounder — and report the effect across it, which converts an assertion into a range. It does not make the assumption testable. It makes it PRICED.",
          "deepDive": "That distinction between testable and priced is worth carrying out of the module, because it is the realistic goal for most applied causal work. Almost nothing here can be verified: not ignorability, not exclusion, not parallel trends, not SUTVA. What you can do in every case is state the assumption plainly, show what the answer becomes under specified violations, and let the reader judge. An E-value does this on the risk-ratio scale, Rosenbaum bounds do it for matched designs, plausible-exogeneity analysis does it for instruments, and a prior over confounder strength does it in the Bayesian idiom. The four are the same move in four notations, and running one of them is the single most reliable marker distinguishing careful applied work from careless applied work — more reliable than the sophistication of the estimator, which is usually uncorrelated with credibility. If I had one recommendation to leave with a team, it would be that: report the sensitivity, always, in whatever notation the audience reads. It costs an afternoon and it is the only part of the writeup that speaks to the thing the whole estimate rests on."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "★ Bayes' theorem vs the Bayesian workflow",
        "back": "The theorem tells you how to UPDATE. It doesn't tell you if the model is good, the prior defensible, or the sampler converged. Three questions, three separate checks — conflating them is the standard failure."
      },
      {
        "type": "pitfall",
        "front": "★ R-hat 1.0002 on a wrong model",
        "back": "Normal model fitted to Student-t(2) data: R-hat 1.0002, posterior mean 3.006 (truth 3.000) — perfect. Posterior predictive: max|y| observed 29.43 vs replicated [9.83, 14.47], kurtosis 42.01 vs [−0.40, 0.49], both p = 0.0000."
      },
      {
        "type": "intuition",
        "front": "What R-hat actually measures",
        "back": "Between-chain vs within-chain variance — whether the SAMPLER converged on the posterior of the model you wrote. Silent on whether that model could have produced your data."
      },
      {
        "type": "pitfall",
        "front": "★ 'Uninformative' priors aren't",
        "back": "N(0,σ) on a logit coefficient ⇒ P(implied prob <0.01 or >0.99): σ=1 → 0.0%, σ=10 → 64.7%, σ=100 → 96.3%. Flat on the parameter scale ≠ flat on the outcome scale."
      },
      {
        "type": "formula",
        "front": "When does the prior stop mattering?",
        "back": "Beta-Binomial, true p=0.05. n=10: three priors give 0.0512 / 0.1667 / 0.7364 (14× spread). n=100,000: 0.0491 / 0.0491 / 0.0498. It's an EMPIRICAL question — measure it."
      },
      {
        "type": "definition",
        "front": "Prior predictive check",
        "back": "Simulate data from the prior ALONE, before any observations, and ask whether it resembles plausible data from your field. Catches priors absurd on the scale that matters."
      },
      {
        "type": "definition",
        "front": "Posterior predictive check — picking the test quantity",
        "back": "Probe what the model was NOT fitted to and what the decision depends on: tails, extremes, autocorrelation, proportion of zeros. Checking the mean of a mean-fitted model is vacuous."
      },
      {
        "type": "definition",
        "front": "Simulation-based calibration",
        "back": "Draw params from the prior → simulate data → refit → check the posterior quantile of the TRUE value is uniform. Validates the whole pipeline; the step people skip."
      },
      {
        "type": "pitfall",
        "front": "HMC divergences",
        "back": "A modelling signal, not a tuning nuisance — usually a funnel geometry. Fix by non-centred reparameterization, not a smaller step size (which hides the symptom)."
      },
      {
        "type": "intuition",
        "front": "Misspecification doesn't always bias the parameter",
        "back": "The normal-on-t fit recovered the location to 3.006. What it destroyed was the PREDICTIVE distribution — far too narrow. If your deliverable is uncertainty, you're sunk."
      },
      {
        "type": "pitfall",
        "front": "Does Bayes solve peeking?",
        "back": "Not automatically. Monitoring P(B>A) until it crosses 95% is still an optional-stopping rule whose properties depend on the prior. The fix is a fixed, pre-specified loss-based decision rule."
      },
      {
        "type": "intuition",
        "front": "★ Testable vs PRICED",
        "back": "Bayes can't make ignorability testable — it can put a prior on the confounder's strength and report the effect across it. E-values, Rosenbaum bounds, plausible-exogeneity and confounder priors are one move in four notations."
      }
    ],
    "refs": [
      {
        "title": "Gelman et al. (2020), Bayesian Workflow",
        "url": "https://arxiv.org/abs/2011.01808"
      },
      {
        "title": "Gelman et al. (2013), Bayesian Data Analysis (3rd ed.)",
        "url": "http://www.stat.columbia.edu/~gelman/book/"
      },
      {
        "title": "Vehtari, Gelman, Simpson, Carpenter & Burkner (2021), Rank-Normalization, Folding, and Localization: An Improved R-hat",
        "url": "https://projecteuclid.org/journals/bayesian-analysis/volume-16/issue-2/Rank-Normalization-Folding-and-Localization--An-Improved-R%CB%86-for/10.1214/20-BA1221.full"
      },
      {
        "title": "Talts, Betancourt, Simpson, Vehtari & Gelman (2018), Validating Bayesian Inference Algorithms with Simulation-Based Calibration",
        "url": "https://arxiv.org/abs/1804.06788"
      },
      {
        "title": "Betancourt (2017), A Conceptual Introduction to Hamiltonian Monte Carlo",
        "url": "https://arxiv.org/abs/1701.02434"
      }
    ],
    "demos": [
      "mcmc",
      "bayes",
      "conjugate-updating",
      "bayesian-linear-regression"
    ]
  },
  "time-series-causality": {
    "level": "advanced",
    "body": {
      "intuition": [
        "Time gives you something the cross-sectional methods lack: causes come before effects, so the arrow direction is often settled for free. It also gives you a new way to be wrong, because a hidden driver that hits two series at different lags manufactures exactly the pattern that 'X precedes and predicts Y' is supposed to detect.",
        "The demonstration is the module's cleanest false positive. Two series with NO causal arrow between them, both driven by a hidden common factor - one at lag 1, one at lag 2. Granger's test reports X causing Y with F = 2119.66 and p = 1.1e-16. The reverse direction is correctly null at F = 0.45. Controlling for the hidden driver kills it, F = 0.60, p = 0.662. A CLEAN, ONE-DIRECTIONAL, OVERWHELMING RESULT that is entirely an artefact of lag structure.",
        "Difference-in-differences and synthetic control do better because they buy identification from a parallel-trends assumption rather than from precedence. And they land in the same place the module always lands: the assumption is untestable, the pre-period check is the only diagnostic, and it is underpowered exactly where it matters. A pre-trend that biases the estimate by 12% is caught 18.5% of the time - barely above the 5% floor."
      ],
      "math": [
        {
          "h": "Granger causality tests precedence, not causation",
          "paras": [
            "The test asks whether past values of X improve prediction of Y beyond Y's own past. That is a genuine and useful question. It is not the interventional question, and a common driver with staggered lags satisfies it without any arrow existing.",
            "Controlling for the driver removes the result, which is the same backdoor logic as everywhere else - and requires you to have measured it."
          ],
          "tex": "H_0: \\beta_1=\\cdots=\\beta_p=0 \\ \\text{in}\\ Y_t=\\alpha_0+\\sum_i \\alpha_i Y_{t-i}+\\sum_j \\beta_j X_{t-j}+\\varepsilon_t",
          "texNote": "Measured with no X-Y arrow present: X to Y gives F = 2119.66, p = 1.1e-16; Y to X gives F = 0.45, p = 0.77; and X to Y controlling for the hidden driver U gives F = 0.60, p = 0.662."
        },
        {
          "h": "Difference-in-differences and the assumption it buys",
          "paras": [
            "Take the change in the treated unit and subtract the change in the control unit. Any time-invariant difference between them cancels, which is what makes the method attractive.",
            "What does not cancel is a difference in TRENDS. Parallel trends is the assumption, and it is a counterfactual claim about what the treated unit would have done, so it cannot be verified."
          ],
          "tex": "\\hat{\\tau}_{DiD}=(\\bar{Y}^{T}_{post}-\\bar{Y}^{T}_{pre})-(\\bar{Y}^{C}_{post}-\\bar{Y}^{C}_{pre}), \\qquad \\mathbb{E}[Y^T(0)_{post}-Y^T(0)_{pre}]=\\mathbb{E}[Y^C_{post}-Y^C_{pre}]",
          "texNote": "The assumption is about the treated unit's counterfactual trend, which is by definition unobserved. The pre-period is evidence about it, not a test of it."
        },
        {
          "h": "The pre-trend test is underpowered exactly where it matters",
          "paras": [
            "2,000 simulations per row, 12 pre-periods, 12 post-periods, true effect 5.0. The pre-trend test regresses the treated-minus-control gap on time over the pre period."
          ],
          "tex": "\\begin{array}{lccc} \\text{drift/period} & \\text{mean DiD} & \\text{bias} & \\text{pre-trend test rejects}\\\\ 0.00 & 4.995 & -0.1\\% & 5.0\\%\\\\ 0.05 & 5.595 & +11.9\\% & \\mathbf{18.5\\%}\\\\ 0.10 & 6.195 & +23.9\\% & 51.5\\%\\\\ 0.25 & 7.995 & +59.9\\% & 99.8\\% \\end{array}",
          "texNote": "A violation that inflates the estimate by 12% passes the only available check 81.5% of the time. Failing to reject a pre-trend is usually evidence that the pre period is short, not that the trends are parallel."
        }
      ],
      "code": [
        {
          "h": "Synthetic control, and what its weights do not mean",
          "paras": [
            "Fit a convex combination of donor units to match the treated unit over the pre-period, then read the post-period gap as the effect."
          ],
          "code": "# fit simplex weights on the PRE period only (T0 = 30 of 40 periods)\n\n# pre-period RMSE of the synthetic control   0.2415      excellent fit\n# post-period average gap                    2.417       true effect 2.500\n\n# ★ BUT THE WEIGHTS ARE NOT THE DONORS\n#   recovered: donor2 0.39  donor5 0.33  donor10 0.11  donor14 0.09\n#   TRUE:      donor2 0.40  donor5 0.30  donor9  0.20  donor14 0.10\n#   donor9 (true weight 0.20) got ~0; donor10 (true weight 0) got 0.11\n\n# The donors span a low-dimensional factor space, so many weightings fit\n# the pre-period equally well. The FIT is identified; the WEIGHTS are not.\n# Do not interpret them, and do not tell a story about which units matter.",
          "caption": "This is a small, specific version of the module's thesis: the procedure recovered the right answer for a reason that was not the reason it appeared to have."
        },
        {
          "h": "The inference that makes synthetic control usable",
          "paras": [
            "With one treated unit there is no sampling distribution, so significance comes from placebo permutation: apply the identical procedure to every donor as if it had been treated."
          ],
          "code": "for j in donors:                     # pretend donor j was treated\n    fit synthetic control for j from the OTHER donors\n    record its post-period gap\n\n# placebo |gap| across 20 donors:  median 0.093  p90 0.176  max 0.203\n# treated |gap|:                   2.417\n# permutation p-value = (rank + 1)/(n + 1) = 0.048\n\n# ★ Note the resolution limit: with 20 donors the smallest achievable\n#   p-value is 1/21 = 0.048. The donor pool size CAPS your inference,\n#   which is a design constraint, not an analysis choice.",
          "caption": "The placebo distribution is genuinely external evidence - it could have come out badly - which puts it in a different class from a balance table or a first-stage F."
        }
      ],
      "useCases": [
        "Geographic or market-level rollouts where user-level randomization is impossible because of interference, and a small number of treated markets is all you get.",
        "Policy and pricing changes evaluated after the fact, where a staggered rollout across regions supplies both timing and comparison units.",
        "Measuring a one-off event with no control group at all - an outage, a competitor's launch, a regulatory change - by constructing a synthetic comparison from unaffected units.",
        "Long-run effects that outlast an experiment's holdout, where a synthetic control on aggregate series extends measurement past the point the randomization was retired."
      ],
      "pitfalls": [
        "Reading Granger causality as causality. With no arrow present, a hidden driver at staggered lags produced F = 2119.66 and p = 1.1e-16 in one direction - clean, overwhelming, and false.",
        "Treating a failed pre-trend test as evidence of parallel trends. A violation biasing the estimate by 12% was caught 18.5% of the time, barely above the 5% false-positive floor.",
        "Interpreting synthetic control weights as which units matter. The fit was excellent and the weights were wrong: a donor with true weight 0.20 got approximately zero while one with true weight zero got 0.11.",
        "Extrapolating outside the donors' range. Synthetic control requires the treated unit to sit inside the convex hull of the donor pool; if it is an outlier, no convex combination matches it and the pre-period fit will show it.",
        "Ignoring the resolution limit of placebo inference. With 20 donors the smallest achievable p-value is 1/21 = 0.048, so the pool size caps the strength of any conclusion.",
        "Using two-way fixed effects for staggered adoption without checking the weights. With heterogeneous, time-varying effects, already-treated units act as controls and the estimator can produce a negatively-weighted average with the wrong sign.",
        "Choosing the post-period window after seeing the series. Effects that decay or ramp make the estimate a function of the window, and picking it post hoc is the specification-search version of peeking."
      ],
      "connections": [
        {
          "ref": "causal-inference/confounding",
          "text": "The common-driver structure that produces the Granger false positive is a fork with a lag on each arm - the same backdoor path, drawn in time."
        },
        {
          "ref": "causal-inference/ab-testing",
          "text": "Why these methods exist: interference at the market level forces coarse randomization or none at all, and this is what you do when none is available."
        },
        {
          "ref": "causal-inference/instrumental-variables",
          "text": "The other way to buy identification without measuring the confounder, and the direct comparison - timing versus exclusion, both untestable, priced differently."
        },
        {
          "ref": "causal-inference/bayesian-workflow",
          "text": "Bayesian structural time series as the model-based version of synthetic control, where the counterfactual is a fitted forecast with a posterior attached."
        },
        {
          "ref": "ml-applications/time-series",
          "text": "The forecasting machinery this borrows from, aimed at prediction rather than at a counterfactual, and the reason a good forecast is not automatically a good control."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What does Granger causality actually test?",
          "a": "Whether past X improves prediction of Y beyond Y's own past — predictive precedence, not intervention."
        },
        {
          "q": "Show it failing.",
          "a": "Two series with NO arrow between them, driven by a hidden factor at lags 1 and 2: X→Y gives F=2119.66, p=1.1e-16. Controlling for the driver: F=0.60, p=0.662."
        },
        {
          "q": "Why is a one-directional false positive worse than an ambiguous one?",
          "a": "Ambiguity invites suspicion. A clean, overwhelming, single-direction result invites belief — and the lag structure alone decides which direction you get."
        },
        {
          "q": "State the DiD estimator and its assumption.",
          "a": "(ΔY treated) − (ΔY control). Assumption: parallel trends — the treated unit's COUNTERFACTUAL trend equals the control's. Untestable by construction."
        },
        {
          "q": "What does DiD cancel out?",
          "a": "Any time-invariant difference between the units. What it does not cancel is a difference in TRENDS."
        },
        {
          "q": "How powerful is the pre-trend test?",
          "a": "Weak where it matters: a drift biasing the estimate +11.9% was rejected only 18.5% of the time (nominal floor 5.0%). At +23.9% bias, 51.5%."
        },
        {
          "q": "So what does a passing pre-trend test mean?",
          "a": "Usually that the pre period is short. Failing to reject an assumption is not evidence for it."
        },
        {
          "q": "What is synthetic control?",
          "a": "A convex combination of donor units fitted to match the treated unit over the pre-period; the post-period gap is the effect estimate."
        },
        {
          "q": "Are the synthetic control weights interpretable?",
          "a": "No. Sim: pre-RMSE 0.2415 and effect 2.417 (truth 2.5), but a donor with true weight 0.20 got ~0 and one with true weight 0 got 0.11. The fit is identified; the weights are not."
        },
        {
          "q": "How do you get a p-value with one treated unit?",
          "a": "Placebo permutation — run the identical procedure on each donor as if it were treated. Sim: placebo |gaps| median 0.093, max 0.203; treated 2.417; p = 0.048."
        },
        {
          "q": "What caps placebo inference?",
          "a": "Donor pool size. With 20 donors the smallest achievable p-value is 1/21 = 0.048 — a design constraint, not an analysis choice."
        },
        {
          "q": "What breaks two-way fixed effects under staggered adoption?",
          "a": "Already-treated units serve as controls, so with heterogeneous time-varying effects the estimator is a weighted average with NEGATIVE weights and can flip sign."
        }
      ],
      "standard": [
        {
          "q": "Explain Granger causality and why the name is misleading.",
          "a": "IT TESTS PREDICTIVE PRECEDENCE. The procedure regresses Y on its own lags, then adds lags of X, and tests whether the X coefficients are jointly zero — so it answers 'does past X help predict Y beyond Y's own history'. That is a genuine and useful question for forecasting. It is not the interventional question, and the gap between them is exactly the module's subject. THE FAILURE MODE IS A COMMON DRIVER WITH STAGGERED LAGS. In simulation I generated two series with NO causal arrow between them at all, both driven by a hidden autoregressive factor — one at lag 1, the other at lag 2. Granger's test reported X causing Y with F = 2119.66 and p = 1.1e-16, while the reverse direction was correctly null at F = 0.45, p = 0.77. Controlling for the hidden driver removed it entirely: F = 0.60, p = 0.662. WHAT MAKES THIS PARTICULARLY DANGEROUS IS THE CLEANLINESS. A bidirectional or marginal result invites suspicion; a single-direction result with a p-value of 1e-16 invites belief, and the direction was determined purely by which lag the common factor happened to hit first. The name is misleading because Granger himself was explicit that this was a definition of predictive causality within a closed system, and the closure assumption — no relevant omitted series — is the whole thing.",
          "deepDive": "The closure assumption is the same ignorability assumption in different notation: the test is valid as a causal claim only if there are no omitted common drivers, which is exactly what you cannot verify. Adding more series to the VAR helps in the same way adding covariates helps in the cross-sectional case, with the same limitation and the same collider risk. Two further wrinkles worth knowing. First, temporal aggregation destroys the ordering: if the true causal lag is faster than your sampling interval — the effect happens in minutes and you have daily data — the precedence structure can invert entirely, so daily data can show Y preceding X when the mechanism is X causing Y within the hour. Second, filtering and seasonal adjustment can induce or destroy Granger relationships, so results are sensitive to preprocessing in ways that are easy to miss. Where the test IS genuinely useful is as a falsification tool rather than a discovery tool: if you believe X causes Y and past X does not help predict Y at all, that is evidence against your belief. Negative results are informative here; positive ones are close to worthless without a closure argument."
        },
        {
          "q": "Explain difference-in-differences and how you would defend the parallel trends assumption.",
          "a": "DID SUBTRACTS TWO CHANGES: the treated unit's before-to-after change minus the control unit's. Any time-invariant difference between the units cancels, which is exactly what makes it attractive — you do not need the units to be comparable in LEVEL, only in TREND. The assumption is that the treated unit's COUNTERFACTUAL trend would have matched the control's, and that is a statement about an unobserved quantity, so it cannot be verified. HOW I WOULD DEFEND IT: first, plot the pre-period series and test for a differential pre-trend. Second, run placebo tests on periods before treatment, where the effect must be zero. Third, use a negative-control outcome the treatment could not affect. Fourth, report sensitivity — Rambachan and Roth's approach reports the effect under bounded deviations from parallel trends rather than assuming exact parallelism. AND I WOULD BE HONEST ABOUT THE PRE-TREND TEST'S POWER, because it is the diagnostic everyone leans on. Measured over 2,000 simulations with 12 pre-periods: a drift that inflated the estimate by 11.9% was detected 18.5% of the time against a 5.0% floor; at 23.9% bias detection was 51.5%. So a violation large enough to change a decision passes the check four times in five.",
          "deepDive": "That power result reframes what a pre-trend plot is for. It is evidence, and weak evidence, not a test — and 'we checked for pre-trends and found none' should be read as 'our pre period was short'. There is a worse version of the problem: conditioning the analysis on having passed a pre-trend test introduces its own selection, because you are keeping the samples where the pre-period noise happened to look flat, which biases the post-period estimate. Roth's work on this is the reference, and the practical implication is to report the pre-trend test's power alongside its result — 'we could have detected a differential trend of 0.15 per period with 80% probability' is a far more useful sentence than a p-value. The other big issue in modern practice is staggered adoption: the standard two-way fixed effects estimator uses already-treated units as controls for later-treated ones, and when effects are heterogeneous and time-varying that produces a weighted average with NEGATIVE weights, which can flip the sign of a uniformly positive effect. Goodman-Bacon decomposed exactly where those comparisons come from, and Callaway–Sant'Anna and Sun–Abraham give estimators that avoid them. If someone shows me a staggered-rollout DiD run as plain two-way fixed effects, that is the first thing I ask about."
        },
        {
          "q": "When would you use synthetic control, and how do you do inference with one treated unit?",
          "a": "WHEN YOU HAVE ONE OR A FEW TREATED UNITS, MANY UNTREATED ONES, AND A LONG PRE-PERIOD — typically market or geography level, where interference rules out user-level randomization. Instead of picking a comparison unit by judgment, you fit a convex combination of donors to match the treated unit's pre-period trajectory, and read the post-period gap as the effect. In simulation the pre-period RMSE was 0.2415 and the post-period gap was 2.417 against a true effect of 2.500. THE INFERENCE PROBLEM IS THAT THERE IS NO SAMPLING DISTRIBUTION — one treated unit means n = 1. The standard solution is placebo permutation: apply the identical procedure to every donor as if it had been treated, building a distribution of gaps under no treatment. Measured across 20 donors, placebo absolute gaps had a median of 0.093, a 90th percentile of 0.176 and a maximum of 0.203, against a treated gap of 2.417, giving a permutation p-value of 0.048. THAT INFERENCE IS GENUINELY EXTERNAL EVIDENCE — it could have come out badly — which puts it in a different class from a balance table or a first-stage F. And it has a hard resolution limit: with 20 donors the smallest achievable p-value is 1/21 = 0.048, so the pool size caps the conclusion.",
          "deepDive": "The finding I would foreground is that the WEIGHTS ARE NOT IDENTIFIED even when the effect is. In the simulation the recovered weights were donor2 at 0.39, donor5 at 0.33, donor10 at 0.11 and donor14 at 0.09, while the true generating weights were donor2 0.40, donor5 0.30, donor9 0.20 and donor14 0.10. A donor with true weight 0.20 got approximately zero and one with true weight zero got 0.11. The donors span a low-dimensional factor space, so many weightings fit the pre-period equally well, and the optimisation picks one arbitrarily. The estimate was still good, because what matters is that the synthetic unit tracks the factors, not that it uses the 'right' donors. So the practical rule is: never tell a story about which units the method selected, and be suspicious of papers that do. Two other requirements: the treated unit must lie inside the convex hull of the donor pool, or no combination can match it and the pre-period fit will reveal it; and donors must themselves be untreated and unaffected by the treatment, which fails if the intervention spills across markets. Ratios of post- to pre-period RMSE are the standard way to normalise placebo comparisons when donors fit at different qualities."
        },
        {
          "q": "A team ran a marketing campaign in three cities and wants the effect. How do you approach it?",
          "a": "I WOULD ASK FIRST WHETHER THE THREE CITIES WERE CHOSEN AT RANDOM, because that single fact determines everything downstream. If they were selected because they were underperforming, mean reversion alone produces an apparent positive effect and no method here repairs selection on the outcome's transitory component. If they were chosen for operational convenience, that is much better and the story is arguable. THEN I WOULD BUILD A SYNTHETIC CONTROL FOR EACH CITY from the untreated ones, fitting weights on the pre-period only, and report the post-period gaps with placebo permutation inference across the donor pool. Three treated units is actually helpful — I can require the effect to appear in all three, which is a much stronger claim than one city crossing a threshold. I WOULD CHECK FIVE THINGS: pre-period fit quality, since a poor fit voids the comparison; whether each treated city sits inside the donor hull; whether any donor city was contaminated by spillover from the campaign; a placebo in time, pretending the campaign started earlier; and a negative-control outcome the campaign could not affect. AND I WOULD PUSH FOR RANDOMIZED CITY SELECTION NEXT TIME, because with even ten or twenty markets randomized, the analysis becomes a straightforward experiment and all of this becomes unnecessary.",
          "deepDive": "The mean-reversion point deserves emphasis because it is the most common way this analysis goes wrong in industry, and it is invisible unless you ask. Campaigns are targeted at markets that are struggling, struggling markets have negative transitory shocks, and transitory shocks revert — so the post-period improvement is partly guaranteed regardless of the campaign. Synthetic control partially handles this, since the donors are fitted to the treated unit's pre-period INCLUDING its dip, but only if the dip is a common factor rather than idiosyncratic. The test is a placebo in time: pretend treatment started a year earlier and see whether the method finds an effect. On the forward-looking recommendation, geo-experiments with randomized market assignment are well-established and much cheaper than teams expect — the power calculation is over markets rather than users, which sounds fatal but is manageable with paired designs and pre-period covariates, and CUPED-style adjustment on market history helps a great deal. The argument that usually lands is the cost of the alternative: every non-randomized campaign generates a quarter of analyst time and an answer nobody fully believes, which is more expensive than holding out five markets."
        },
        {
          "q": "Compare the identification strategies in this module. When do you reach for which?",
          "a": "EACH BUYS THE SAME THING — permission to treat a comparison as causal — AT A DIFFERENT PRICE. RANDOMIZATION buys ignorability by construction, and its assumptions are largely checkable at the platform level, so it is the default whenever it is possible. ADJUSTMENT AND MATCHING assume you measured the confounders, which is untestable, and their diagnostics report on their own inputs — balance improved to 0.016 while the estimate was 81% wrong. INSTRUMENTS assume a variable with exactly one path to the outcome, untestable, with the only available diagnostic testing strength rather than validity: F stayed at 30,731 across violations that walked the estimate from 2.003 to 2.503. DIFFERENCE-IN-DIFFERENCES assumes parallel counterfactual trends, untestable, with a pre-period check that catches a 12% bias 18.5% of the time. SYNTHETIC CONTROL assumes the donor pool spans the treated unit's factor structure, and is the only observational method here whose inference is genuinely external, via placebo permutation. SO MY ORDERING IS: experiment if you can; if interference forbids user-level randomization, randomize markets; if you cannot randomize at all, prefer designs that exploit timing or an arbitrary rule over designs that assume you measured everything, because 'a policy changed on this date' is an easier claim to defend than 'our covariate list is complete'.",
          "deepDive": "The strongest move available is not choosing well among these but TRIANGULATING across them. If a synthetic control, a difference-in-differences on a different comparison group and a matched cohort all land near the same estimate, that is real evidence — not because any one is trustworthy, but because their assumptions fail in different directions and would have to be wrong in a coordinated way to agree. Where they disagree, the disagreement itself is informative and localises the problem. This is the closest thing the field has to a test set, and it is underused because it costs three analyses instead of one. The related discipline is to calibrate observational methods against experimental truth WHENEVER an experiment exists: run the observational estimator on the pre-experiment period and compare it to the randomized answer. That gives your organisation a measured sense of how far observational estimates in your system tend to be from the truth, which is far more valuable than any general methodological prior. In most consumer systems the gap is larger than people expect, and knowing your own number is worth more than knowing the literature's."
        },
        {
          "q": "This is the module's last lesson. What should someone take from it?",
          "a": "THE ASSUMPTION IS THE ESTIMATE. Every method here computes a number, and the number's meaning comes entirely from a claim the data cannot check: ignorability for adjustment, exclusion for instruments, parallel trends for DiD, factor-span for synthetic control, closure for Granger, and, for a randomized experiment, a set of design properties. The estimator is the easy part, and the last two decades of methodological progress — double machine learning, causal forests, modern DiD — has improved estimation while moving identification not at all. SECOND, THE DIAGNOSTICS SYSTEMATICALLY CHECK THE WRONG THING, and this repeated across every lesson: R-squared rose 0.898 to 0.987 as the causal estimate degraded 87%; balance went to 0.016 while the estimate was 81% high; the first-stage F sat at 30,731 through violations that added 25%; R-hat was 1.0002 on a model whose predictive check returned 0.0000; a bootstrap gave a width-0.109 interval around a wrong-signed number; and a pre-trend test caught a 12% bias 18.5% of the time. The pattern is that a diagnostic sharing an input with the procedure it checks cannot be independent evidence about it. THIRD, WHAT TO DO ANYWAY: argue the assignment mechanism, run falsification tests that could fail, report sensitivity so the assumption is PRICED, and triangulate across designs whose assumptions break differently.",
          "deepDive": "An honesty note about building this module, since it bears on how to read results generally. The Granger simulation was written expecting a symmetric artefact — a spurious result in BOTH directions, which would have made a tidy point about ambiguity. It came out one-directional and overwhelming instead: F = 2119.66 with p = 1.1e-16 forward, and a clean null of F = 0.45 backward. The first instinct was that the simulation was miscalibrated. It was not. The lag structure of the hidden driver picks a direction, and the result is a clean, confident, entirely false causal claim — which is a WORSE finding than the one expected, because a symmetric artefact would at least look suspicious. A one-directional p-value of 1e-16 looks like a discovery. Two other results in this module came from the same kind of surprise: the synthetic control recovered the effect while getting the donor weights wrong, and matching made imbalance on the unmeasured confounder WORSE rather than merely failing to help. In each case the expectation was wrong in the direction of the module's own thesis, which is the useful lesson to end on — the expected artefact is the one you would have caught."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "★ What Granger causality tests",
        "back": "Predictive PRECEDENCE: does past X improve prediction of Y beyond Y's own past? A useful forecasting question. Not the interventional one, and valid causally only under CLOSURE (no omitted driver)."
      },
      {
        "type": "pitfall",
        "front": "★ The clean false positive",
        "back": "Two series, NO arrow between them, hidden driver at lags 1 and 2: X→Y gives F=2119.66, p=1.1e-16. Reverse correctly null (F=0.45). Control for the driver: F=0.60, p=0.662."
      },
      {
        "type": "intuition",
        "front": "Why one-directional is worse than ambiguous",
        "back": "A bidirectional or marginal artefact invites suspicion. A single-direction p=1e-16 invites BELIEF — and the lag structure alone decided the direction."
      },
      {
        "type": "formula",
        "front": "Difference-in-differences",
        "back": "τ̂ = (ΔY treated) − (ΔY control). Cancels any TIME-INVARIANT difference between units. Does NOT cancel a difference in trends — that's the assumption."
      },
      {
        "type": "pitfall",
        "front": "★ Pre-trend test power",
        "back": "12 pre-periods, 2,000 sims: drift biasing +11.9% → rejected 18.5% (floor 5.0%). +23.9% → 51.5%. +59.9% → 99.8%. A decision-changing violation passes 4 times in 5."
      },
      {
        "type": "intuition",
        "front": "What a passing pre-trend test means",
        "back": "Usually that the pre period is short. Failing to reject an assumption is not evidence for it — and conditioning the analysis on passing introduces its own selection."
      },
      {
        "type": "definition",
        "front": "Synthetic control",
        "back": "Fit simplex weights over donor units to match the treated unit's PRE-period; the post-period gap is the effect. Sim: pre-RMSE 0.2415, gap 2.417 (truth 2.5)."
      },
      {
        "type": "pitfall",
        "front": "★ Synthetic control weights are NOT identified",
        "back": "Recovered donor2 0.39 / donor5 0.33 / donor10 0.11 / donor14 0.09 vs TRUE 0.40 / 0.30 / donor9 0.20 / 0.10. A 0.20-weight donor got ~0; a 0-weight donor got 0.11. The fit is identified; the weights aren't."
      },
      {
        "type": "definition",
        "front": "Placebo permutation inference",
        "back": "With n=1 treated unit there's no sampling distribution — run the identical procedure on each donor as if treated. Sim: placebo |gaps| median 0.093 / max 0.203 vs treated 2.417 → p = 0.048."
      },
      {
        "type": "pitfall",
        "front": "The donor-pool resolution limit",
        "back": "Smallest achievable placebo p-value is 1/(n_donors+1). With 20 donors that's 0.048 — a DESIGN constraint fixed before any analysis."
      },
      {
        "type": "pitfall",
        "front": "Two-way fixed effects under staggered adoption",
        "back": "Already-treated units act as controls for later-treated ones. With heterogeneous time-varying effects the estimator carries NEGATIVE weights and can flip sign. Use Callaway–Sant'Anna or Sun–Abraham."
      },
      {
        "type": "intuition",
        "front": "★ The module in one line",
        "back": "THE ASSUMPTION IS THE ESTIMATE. R² 0.898→0.987 as the estimate degraded 87%; balance 0.016 at 81% error; F=30,731 through a 25% violation; R-hat 1.0002 on a rejected model; a width-0.109 CI on the wrong sign. Diagnostics sharing an input with the procedure aren't evidence about it."
      }
    ],
    "refs": [
      {
        "title": "Granger (1969), Investigating Causal Relations by Econometric Models and Cross-spectral Methods",
        "url": "https://www.jstor.org/stable/1912791"
      },
      {
        "title": "Abadie, Diamond & Hainmueller (2010), Synthetic Control Methods for Comparative Case Studies",
        "url": "https://www.tandfonline.com/doi/abs/10.1198/jasa.2009.ap08746"
      },
      {
        "title": "Goodman-Bacon (2021), Difference-in-Differences with Variation in Treatment Timing",
        "url": "https://www.sciencedirect.com/science/article/pii/S0304407621001445"
      },
      {
        "title": "Callaway & Sant'Anna (2021), Difference-in-Differences with Multiple Time Periods",
        "url": "https://www.sciencedirect.com/science/article/pii/S0304407620303948"
      },
      {
        "title": "Rambachan & Roth (2023), A More Credible Approach to Parallel Trends",
        "url": "https://academic.oup.com/restud/article/90/5/2555/7039335"
      }
    ],
    "demos": [
      "forecasting",
      "kalman-filter",
      "markov",
      "drift-detection"
    ]
  }
};
