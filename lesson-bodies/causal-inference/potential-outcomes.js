// GENERATED from content/lessons/causal-inference/potential-outcomes.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/causal-inference/potential-outcomes/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

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
          "deepDive": {
            "q": "Which treatment effect does a given design actually identify?",
            "a": "Push on the estimand. Because the effect is heterogeneous - tau = 5 + 3X, larger for sicker patients - ATE, ATT and ATU are 4.99, 6.59 and 3.40, a spread of 3.19 that is bigger than most effects anyone reports. So 'the treatment effect' is genuinely three numbers, and which one your design targets is not a matter of intent. A randomized trial on volunteers identifies the effect for volunteers; an observational study of adopters identifies something near an ATT; a policy question about mandating the treatment needs the ATU, the group that has so far declined it and about whom you have the least evidence. The deeper point is that even the SPREAD is only visible here because the data was simulated. In the real world sd(tau) = 3.00 is not identified at all, because it depends on the correlation between Y(0) and Y(1), which is 0.98 in the simulation and unobservable in principle. This is why individual treatment effect claims deserve suspicion: uplift models estimate CATE, a conditional average, and the within-stratum spread stays invisible."
          }
        },
        {
          "q": "A colleague says 'we have ten million rows, so we don't need an experiment.' Respond.",
          "a": "SAMPLE SIZE AND CONFOUNDING LIVE ON DIFFERENT AXES, and ten million rows moves only one of them. The standard error shrinks like 1/sqrt(n); the selection term does not shrink at all, because it is a property of how units came to be treated, not of how many you observed. The demonstration is the four-row table: at n=2,000 the biased estimate was -1.933 with SE 0.286, and at n=2,000,000 it was -1.889 with SE 0.009. A thousandfold increase in data narrowed the interval by 32x and moved the point estimate by 0.044, and the truth, +4.99, was outside every interval. THE PRACTICAL DANGER IS THAT SCALE MAKES THE WRONG ANSWER LOOK AUTHORITATIVE: with ten million rows every p-value is astronomically small, every interval is tight, and the output has all the surface features of a settled question. I would then reframe the ask. The useful question is not 'is n large enough' but 'what would have to be true for this number to be causal', which is the conditional ignorability assumption, and 'would the data tell me if it weren't', which is usually no. If an experiment is genuinely impossible I would move to a design that buys identification some other way - an instrument, a discontinuity, a difference-in-differences on a policy change - and report a sensitivity analysis saying how strong an unmeasured confounder would need to be to erase the result.",
          "deepDive": {
            "q": "What does large observational data genuinely buy you, then?",
            "a": "There is a real counterargument worth conceding: large observational data does help, just not with this. It gives you the ability to condition finely, so if the confounders ARE measured, overlap is better and you can adjust within narrow strata rather than relying on a functional form. It supports heterogeneity analysis that a small experiment cannot power. And it makes falsification tests cheap - negative controls, pre-period placebo outcomes, and testing implied conditional independences all need volume. So the honest position is that scale converts an untestable assumption into a slightly-more-testable one and improves everything downstream of identification, while doing nothing for identification itself. The failure mode to name explicitly is that scale plus flexible models makes things worse in one specific way: a gradient boosted model with a thousand features will fit Y superbly and confidently attribute effect to treatment, and its excellent held-out predictive performance is not evidence about the counterfactual, because the counterfactual is not in the test set either."
          }
        },
        {
          "q": "Which of the identification assumptions can you actually check, and what do you do about the ones you cannot?",
          "a": "ONLY POSITIVITY IS CHECKABLE. Overlap says every covariate stratum has a nonzero probability of both arms, and it is a statement about the observed joint distribution of X and T, so you can plot the estimated propensity score by arm and look for mass piling at 0 or 1. Where it fails there is genuinely no comparison to make, and any estimate there comes from the model's functional form extrapolating rather than from data. IGNORABILITY IS NOT CHECKABLE, ever, because it is a statement about the unobserved potential outcomes. SUTVA is not checkable either, though it is often obviously false on inspection. What you do instead is a three-part discipline. FIRST, argue the assumption substantively - what process assigned treatment, who chose, what did they know - because the assumption is a claim about that process and can only be defended there. SECOND, run falsification tests: a negative-control outcome that the treatment cannot affect should show a null, a pre-treatment period should show no effect, and a DAG implies conditional independences you can test. These cannot confirm the assumption but they can refute it, and a refutation is worth a lot. THIRD, report sensitivity: state how strong an unmeasured confounder would have to be to overturn the conclusion, so the reader can judge plausibility rather than take the assumption on faith.",
          "deepDive": {
            "q": "Why can a balance table pass while the estimate stays badly biased?",
            "a": "The balance-check trap is worth spelling out because it is so common. A standardized mean difference above 0.1 is the conventional red flag, and in the simulation the measured confounder had an SMD of 1.257 - twelve times the threshold, unmissable. Now delete that column from the dataframe. The bias is exactly unchanged, every estimate is identical to the last decimal, and the balance table now reports perfect balance on everything remaining. That is the whole problem in one operation: balance diagnostics interrogate the covariates you recorded, and confounding is defined by the ones you did not. It is also why 'we controlled for a lot of variables' is a weak defence and can be an actively harmful one - as the next lesson shows, adding controls monotonically improved R-squared from 0.898 to 0.987 while driving the causal estimate from 3.80 to 0.50. Positivity has a subtler failure mode too: it can hold marginally on every covariate and fail jointly, so the propensity histogram is the diagnostic, not per-variable overlap."
          }
        },
        {
          "q": "What is SUTVA, and where does it break in systems you would actually build?",
          "a": "SUTVA IS TWO ASSUMPTIONS WEARING ONE NAME. First, no interference: unit i's outcome depends on unit i's treatment only, not on anyone else's. Second, consistency or 'no hidden versions': there is a single well-defined treatment, so Y(1) is unambiguous. Both are quietly violated in most systems worth working on. INTERFERENCE BREAKS WHEREVER UNITS COMPETE OR COMMUNICATE. In a marketplace, showing treated buyers better recommendations consumes the same finite inventory that control buyers need, so the control group is made worse by the treatment and the measured lift overstates the true effect - the estimate contains a transfer, not a creation. In a social product, a treated user's activity lands in an untreated friend's feed, which contaminates control in the opposite direction and shrinks the measured effect toward zero. Anything with a shared budget, a shared cache, a shared model retrained on pooled logs, or a shared human review queue has the same structure. THE HIDDEN-VERSIONS PROBLEM is subtler: 'treated' in a rollout usually means 'assigned', while some assigned users never saw the change and some saw a degraded version, so Y(1) is an average over a bag of different interventions whose mix will not be stable when you scale. The fix is design, not analysis: randomize at the level that contains the interference - cluster, market, region, time slice - and accept the power cost.",
          "deepDive": {
            "q": "What does randomizing at the market level cost, and what are the middle grounds?",
            "a": "The power cost is the reason people resist, and it is real: switching from user-level to market-level randomization can cut effective sample size by orders of magnitude, because the unit count collapses to the number of markets and outcomes within a market are correlated. Practical middle grounds exist. Switchback designs randomize time slices within a market and recover power at the cost of assuming effects do not carry across slices, which fails when the treatment changes a persistent state like a learned ranking model or a user's habit. Cluster designs on a social graph work when the graph has good community structure and fail when it does not. Two-sided randomization can separate buyer-side and seller-side effects in a marketplace. Whichever you pick, the reporting obligation is the same: name the interference channel you believe exists, say which direction it biases the estimate, and, if you can, bound it - a market-level experiment run in parallel with a user-level one gives you the gap between the two, and that gap IS the interference, measured rather than assumed."
          }
        },
        {
          "q": "Product asks: 'users who enabled dark mode retain 12% better - should we default it on?' Walk through your answer.",
          "a": "I WOULD SAY THE 12% IS ALMOST CERTAINLY NOT THE EFFECT OF DEFAULTING IT ON, and be precise about why, because the reason determines what to do next. The 12% compares enablers to non-enablers, so it equals the causal effect on enablers plus a selection term. Enabling dark mode requires opening settings, which is done by more engaged users, and engagement drives retention directly - so the selection term is positive and possibly the whole 12%. THE ESTIMAND MISMATCH IS THE SECOND PROBLEM, and it is independent of the first: even if that 12% were a clean ATT, the proposal is to treat everyone, which needs the ATE, and the people who never opened settings are exactly the group with no evidence. In the simulation ATT and ATU differed by 3.19 with the same sign; here they could plausibly differ in sign, since users who wanted dark mode and did not find the setting are helped while users who dislike it are harmed. THE ANSWER IS A CHEAP EXPERIMENT: randomize the default on a holdout, which buys ignorability by design and directly targets the estimand the decision needs. If a full rollout is too risky, randomize the SETTING'S DISCOVERABILITY instead and use it as an encouragement design - that identifies a local effect for the users a nudge can move, which is closer to the real question than the observational number.",
          "deepDive": {
            "q": "What would you check before anyone ships on this?",
            "a": "Two things I would add before anyone ships. First, positivity is worth checking even in this informal setting: if essentially nobody over some tenure has dark mode off, there is no comparison in that stratum and any 'adjusted' number there is model extrapolation. Second, the metric itself is downstream of treatment in a way that hides interference - retention is measured over a window during which the app may have shipped other changes, and if dark mode changes session length it changes exposure to those changes too. Practically I would also want a negative control: find an outcome dark mode cannot plausibly affect, such as payment-method updates, and check that enablers do not differ there. If they do, that is direct evidence of the selection term, measured rather than argued. That single check often ends the conversation faster than any amount of explaining what confounding is, because it produces a number in the same format as the one that started it."
          }
        },
        {
          "q": "What is the transferable question this module is training, and why frame it that way?",
          "a": "THE QUESTION IS: WHAT WOULD HAVE TO BE TRUE FOR THIS NUMBER TO BE CAUSAL, AND WOULD THE DATA TELL ME IF IT WEREN'T? Framing it as a pair matters, because the two halves catch different failures. The first half forces the assumption into the open - ignorability, an exclusion restriction, parallel trends, whatever the method is buying - and an assumption you have written down is one that colleagues can attack, which is the only quality control available. The second half is the one people skip, and it is where the discipline differs from the rest of machine learning. IN PREDICTION, THE TEST SET ADJUDICATES. You can be wrong about the model class, the features, the loss, and held-out performance still tells you. In causal inference the counterfactual is absent from every split, so there is no held-out set that can adjudicate the assumption, and the usual diagnostics keep passing regardless: in this lesson residual checks passed, the p-value was below 1e-300, R-squared was unremarkable and the answer had the wrong sign. Framing it as a question rather than a checklist is deliberate too, because the checklist changes per method while the question does not - it is the same question for an instrument, a matching estimator, a synthetic control and an A/B test, and only the answer changes.",
          "deepDive": {
            "q": "What does this framing not claim?",
            "a": "It is worth being clear about what this framing does NOT claim. It does not say observational estimates are worthless; it says their credibility comes from the argument for the assumption, and that argument belongs in the writeup with the same prominence as the confidence interval. It also does not say randomization is a magic word - randomized experiments have their own assumptions, and this module spends a whole lesson on the ways they leak: interference, non-compliance, differential attrition, peeking, and the multiple-comparison surface of a metrics dashboard. The reason to lead with the question is that it survives contact with the tooling churn. Estimators come and go, double machine learning and causal forests will be replaced by something else, and every one of them is a way of computing an estimate GIVEN identification. None of them supplies identification, and a library that returns a confidence interval without asking you what assignment mechanism you believe in is not doing anything the interval implies it is doing."
          }
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
    ],
    "demoTitles": {
      "do-intervention": "do() & Backdoor Adjustment",
      "regression": "Linear & Logistic Regression",
      "clt": "Central Limit Theorem",
      "simpsons-paradox": "Simpson's Paradox"
    }
  }
};
