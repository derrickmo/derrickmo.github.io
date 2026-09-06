// GENERATED from content/lessons/causal-inference/propensity-matching.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/causal-inference/propensity-matching/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
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
          "deepDive": {
            "q": "Should you tune the propensity model for predictive accuracy?",
            "a": "A practical corollary that catches people: you should not tune the propensity model for predictive performance. A score with AUC 0.99 separates the arms almost perfectly, which means the treated and control units occupy disjoint regions of covariate space and there is essentially nothing to compare — the estimate becomes extrapolation dressed as matching. The right objective is BALANCE, so the workflow is fit, check balance, and if it is poor, add interactions and higher-order terms and refit, iterating on the balance table rather than on held-out log-loss. Covariate balancing propensity score methods and entropy balancing formalise this by optimising balance directly rather than fitting a model and hoping. It is also why the propensity model's coefficients should never be interpreted — it is a nuisance function. Doubly robust estimators go one step further: combine an outcome model with a propensity model and you get consistency if EITHER is correctly specified, which is real protection against misspecification. It is worth being precise that this buys robustness to functional form, not to unmeasured confounding, and the two are routinely conflated in practice."
          }
        },
        {
          "q": "A colleague shows you a matched analysis with a perfect balance table. What is your reaction?",
          "a": "I WOULD SAY THE BALANCE TABLE IS A REPORT ON THE PROCEDURE, NOT ON THE CONCLUSION, and then show why with the cleanest example I have. In the simulation, propensity matching drove the worst standardized mean difference among measured covariates from 0.436 down to 0.016 — comfortably inside the 0.1 convention, the kind of table that goes in a paper as evidence of a well-executed analysis. The estimate was 5.445 against a true effect of 3.000. The balance table is telling you, correctly, that the matching algorithm succeeded at equalizing the variables you handed it. That is a statement about the algorithm's inputs. THE DETAIL THAT MAKES IT VIVID: balance on the unmeasured confounder went from 1.317 to 1.491. Matching made it WORSE. That is not a fluke — the procedure reshuffles the sample to equalize measured covariates, and that reshuffle has no reason to respect anything else, so it can and does move unmeasured imbalance in either direction. SO MY QUESTIONS WOULD BE ABOUT THE ASSIGNMENT PROCESS, not the table: who decided treatment, what did they know, and is any of that knowledge absent from the covariate list. Then I would ask for an overlap diagnostic and a sensitivity analysis, because those are the two things that carry information the balance table does not.",
          "deepDive": {
            "q": "Are balance tables worth producing at all, then?",
            "a": "It is worth being fair to balance tables, because the criticism is about how they are used rather than whether they are worth producing. A FAILED balance table is highly informative — it tells you the specification is inadequate, that overlap may be poor, and that the estimate is leaning on extrapolation. It is only the passing case that is uninformative, and that asymmetry is exactly the shape of every diagnostic in this module: refutation is possible, confirmation is not. The useful addition is a sensitivity analysis in the same table's neighbourhood, which converts the untestable part into a number. Rosenbaum bounds are the natural fit for matched designs: they report how large the odds of differential assignment within a matched pair would have to be, due to an unobserved covariate, before the conclusion becomes uncertain. If the answer is Γ = 1.2, the study is fragile; if it is Γ = 4, it is robust to anything short of a very strong hidden factor. E-values do the analogous job on the risk-ratio scale. Reporting one of these alongside the balance table changes the document from 'we did the procedure correctly' to 'here is how much hidden confounding it would take to overturn us', which is the claim a reader actually needs."
          }
        },
        {
          "q": "How do you check overlap, and what do you do when it fails?",
          "a": "I CHECK IT THREE WAYS AND THEY AGREE WHEN THINGS ARE BAD. First, plot the propensity score distributions by arm; mass piling near 0 or 1, or regions where one arm has no support, is the visual signature. Second, look at the extreme weights — in the poor-overlap simulation the maximum IPW weight was 2,889, meaning one observation was standing in for nearly three thousand. Third, and most usefully, compute the effective sample size, n_eff = (Σw)²/Σw², which collapsed to 663 out of 60,000 rows, or 1.1%. THAT LAST NUMBER IS THE ONE TO REPORT, because every standard error computed from the row count is describing a sample two orders of magnitude larger than the one actually informing the estimate. In that same run the balance table also failed, at 0.235, so this is the pleasant case where the diagnostics are loud and consistent. WHAT I DO ABOUT IT is trim to the region of common support and say so explicitly, because trimming redefines the population: I am no longer estimating an effect for everyone, but for the subpopulation where a comparison exists. That is often the honest and useful answer, and it is much better than an estimate over the full population that is functional-form extrapolation in the regions where one arm is absent.",
          "deepDive": {
            "q": "Which of these two failures do the diagnostics actually catch?",
            "a": "The contrast with the unmeasured-confounding case is the reason I like teaching these together. Case C — poor overlap — is wrong by 0.46 and every single diagnostic screams: balance fails, weights explode, n_eff collapses. Case B — one unmeasured confounder — is wrong by 2.45, and every diagnostic is GREENER than in the case where the method works: balance is tighter at 0.016, n_eff is larger at 52,315. The failure that the data can detect is the smaller one, and the failure it cannot detect is the larger one. On the mechanics of trimming, the common conventions are to drop units outside the overlapping range of the score, or to use Crump et al.'s rule of restricting to 0.1 < e(X) < 0.9, which has an optimality justification in terms of variance. Weight stabilisation and clipping help with variance but they introduce bias in exchange, and clipping in particular quietly changes the estimand without announcing it. The one thing not to do is nothing — an unreported n_eff of 1.1% is the kind of omission that makes a whole analysis worthless while looking complete."
          }
        },
        {
          "q": "When would you choose matching over regression adjustment, or IPW over either?",
          "a": "THEY SHARE AN ASSUMPTION AND DIFFER IN VARIANCE, ESTIMAND AND TRANSPARENCY, so the choice is about those three and not about credibility. MATCHING'S ADVANTAGE IS THAT IT MAKES EXTRAPOLATION VISIBLE. If a treated unit has no comparable control, matching either drops it or matches it badly and the balance table shows it, whereas a regression will happily interpolate across a region with no data and produce a smooth, confident number. That transparency is worth a lot when the audience is not statistical, because a matched pair is something a domain expert can inspect. Its costs are efficiency — discarding unmatched units — and the fact that the naive standard errors are wrong, since they treat the matched set as fixed. IPW KEEPS EVERY UNIT and targets the ATE naturally, where matching most naturally targets the ATT, so the estimand should drive that choice: 'should we treat everyone' wants ATE, 'was treating these people worthwhile' wants ATT. IPW's weakness is variance under poor overlap, which is exactly when the extreme weights appear. REGRESSION IS THE MOST EFFICIENT WHEN THE OUTCOME MODEL IS RIGHT and the least honest when it is wrong. In practice I would default to a doubly robust estimator, which uses both an outcome model and a propensity model and is consistent if either is correct.",
          "deepDive": {
            "q": "Where does double machine learning fit, and what does it not solve?",
            "a": "The modern version of that default is worth naming: double machine learning, which uses flexible models for both nuisance functions, cross-fitting to avoid overfitting bias, and a Neyman-orthogonal score so first-order errors in the nuisance estimates do not contaminate the target. It is a genuine advance and it is easy to over-read. What it delivers is valid inference on the causal parameter while permitting arbitrary machine learning for the nuisance pieces. What it requires as INPUT is a covariate set satisfying the backdoor criterion — it assumes ignorability exactly as strongly as 1:1 matching does. So the honest framing is that the last two decades of methodological progress in this space have been about estimation efficiency and robustness to functional form, and none of it has moved the identification problem an inch, because the identification problem is not a statistical problem. That is worth saying out loud in an interview, because it demonstrates you know what the tooling does rather than just which library to import. It is also why 'we used causal forests' answers a different question from 'why do you believe there is no unmeasured confounding'."
          }
        },
        {
          "q": "Product shipped a feature to a self-selected group and wants to know its impact. Walk through what you would do.",
          "a": "I WOULD START BY TRYING TO END THE PROJECT HONESTLY, because the fastest useful thing I can do is check overlap. Fit a propensity model for adoption and plot the score by arm. If adopters and non-adopters barely overlap — which is common, since adoption is often driven by tenure and engagement that also drive every outcome metric — then there is no comparison to make for most of the population, and I would report that rather than produce a number. In the simulation, poor overlap took the effective sample size from 60,000 rows to 663. IF OVERLAP IS ADEQUATE, I would enumerate the drivers of adoption with the people who built the feature, before touching the data, and be explicit about which are recorded. That conversation is the actual analysis; everything after it is arithmetic. THEN I WOULD ESTIMATE with a doubly robust estimator, report the ATT rather than the ATE since the question is about the people who adopted, and attach three things: the overlap diagnostics including n_eff, a sensitivity analysis saying how strong an unmeasured confounder would need to be, and a negative-control outcome the feature cannot plausibly affect. AND I WOULD ASK FOR A HOLDOUT GOING FORWARD, because the cost of this whole exercise, in analyst time and in residual uncertainty, is far higher than the cost of randomising ten percent from the start.",
          "deepDive": {
            "q": "Which single check would you push hardest for?",
            "a": "The negative control is the part I would push hardest for, because it produces evidence in the same format as the estimate and non-technical stakeholders can read it directly. Pick a metric the feature could not affect through any plausible mechanism — payment method updates, say, or activity in an unrelated surface — and run the identical pipeline. A clean null there is genuine, if weak, evidence that the adjustment removed the selection; a large effect is proof that it did not, and it ends the argument immediately without anyone needing to understand ignorability. The other thing worth setting up is the counterfactual comparison of methods: if a holdout gets created later, re-run the observational estimate on the pre-holdout period and compare it to the experimental answer. That calibration exercise is enormously valuable organisationally, because it gives your team a measured sense of how far observational estimates in YOUR system tend to be from experimental ones — and in most consumer products the answer is 'much further than people expect', which is the single most useful fact you can establish about your own data."
          }
        },
        {
          "q": "What is the single most important thing this lesson changes about how you read an observational study?",
          "a": "I STOP READING THE BALANCE TABLE AS EVIDENCE AND START READING THE ASSIGNMENT NARRATIVE AS EVIDENCE. The balance table answers 'did the procedure equalize the covariates it was given', which is a question about the analyst's code, and the answer is nearly always yes because that is what the procedure optimises. Case B in the simulation makes this unignorable: balance improved to 0.016, n_eff was a healthy 52,315, and the estimate was 81% too high. Both diagnostics were BETTER than in the case where the method worked correctly. So the section of a paper I now weight most heavily is the one describing how units came to be treated — who decided, what information they had, and whether that information is in the covariate list. If a paper cannot tell that story, no amount of methodological sophistication downstream repairs it. THE SECOND THING I LOOK FOR IS A SENSITIVITY ANALYSIS, because it is the only part of the document that quantifies the untestable assumption rather than asserting it. A Rosenbaum bound or an E-value converts 'we controlled for confounders' into 'a hidden factor of this strength would overturn us', which is a claim I can evaluate against the confounders I can think of. A study with a mediocre balance table and a serious sensitivity analysis is more credible than one with a perfect table and none.",
          "deepDive": {
            "q": "What habit does this transfer beyond causal inference?",
            "a": "There is a broader habit here that transfers well beyond causal inference: notice which of a method's outputs are self-referential. A balance table is computed from the same covariates the matching optimised, so it is close to guaranteed to pass — the way training-set accuracy is close to guaranteed to look good. A first-stage F in an IV analysis measures the property the analyst already selected the instrument for. Cross-validated loss measures agreement with a distribution the model was fitted on. In each case the diagnostic and the procedure share an input, and diagnostics that share an input with the thing they are checking cannot be independent evidence about it. The diagnostics worth trusting are the ones that could have come out badly for reasons the procedure does not control — an out-of-sample negative control, a pre-period placebo, a prediction the DAG makes that the fitting never touched. Sorting a method's outputs into 'could this have failed' and 'was this guaranteed to pass' is a fast way to find out where the real evidence is, and it applies just as well to a model card or an eval harness as it does here."
          }
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
    ],
    "demoTitles": {
      "knn": "k-Nearest Neighbors",
      "calibration": "Model Calibration",
      "roc": "ROC, PR & Thresholds",
      "regression": "Linear & Logistic Regression"
    }
  }
};
