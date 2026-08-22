// GENERATED from content/lessons/causal-inference/bayesian-workflow.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/causal-inference/bayesian-workflow/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
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
          "deepDive": {
            "q": "What is each of these checks blind to?",
            "a": "The reason to be systematic rather than opportunistic is that each check has a specific blind spot, and they are complementary rather than redundant. Prior predictive checks cannot see likelihood misspecification. Recovery on simulated data cannot see that the generative model is wrong about the real world, since you generated from it. R-hat cannot see model error. Posterior predictive checks are weak against exactly the features the model was fitted to, which is why the test quantity matters more than the check. LOO estimates predictive performance and is silent on causal validity. So the workflow is a set of partially-overlapping nets rather than one filter, and skipping any of them leaves a specific class of failure entirely uncaught. The other thing worth saying is that this is genuinely more disciplined than most frequentist practice, and that is the honest case for Bayesian methods — not that priors are philosophically superior, but that the workflow forces you to write down and check things that other traditions leave implicit. A maximum likelihood fit has a likelihood too, and its misspecification is just as damaging; it simply has no cultural norm requiring you to check it."
          }
        },
        {
          "q": "Someone reports R-hat below 1.01 and calls the analysis validated. Respond.",
          "a": "R-HAT VALIDATES THE SAMPLER, NOT THE MODEL, AND THOSE COME APART COMPLETELY. R-hat compares between-chain to within-chain variance, so it answers 'did my chains converge to the same distribution' — which is a question about MCMC, and it is entirely possible to converge beautifully on a posterior belonging to a model that could never have produced the data. THE DEMONSTRATION IS DIRECT: fitting a normal model to Student-t data with two degrees of freedom, R-hat came out at 1.0002, well inside any threshold, and the posterior mean for the location was 3.006 against a true 3.000. Everything looked correct. Then the posterior predictive check: replicated datasets had maximum absolute values in [9.83, 14.47] against an observed 29.43, and kurtosis in [-0.40, 0.49] against an observed 42.01, with Bayesian p-values of 0.0000 for both. The model cannot generate data resembling the data it was fitted to. THE HONEST NUANCE IS THAT THE PARAMETER WAS FINE — misspecification did not bias the location. What it destroyed was the predictive distribution, which is far too narrow, so every interval and every decision based on tail risk is wrong. If the deliverable is a point estimate you may survive this; if it is uncertainty, which is usually why one goes Bayesian, you do not.",
          "deepDive": {
            "q": "What does R-hat miss even on its own terms?",
            "a": "I would add what R-hat itself misses, because it is not a strong check even on its own terms. Chains initialised near each other can agree while all missing a mode entirely, which is why over-dispersed initialisation matters. R-hat is insensitive to poor mixing in the tails, so effective sample size should be reported alongside it — and specifically the tail ESS, since a bulk ESS of 4,000 is compatible with terrible resolution on a 95% quantile. Divergences in Hamiltonian samplers are more informative than R-hat about geometry problems, and they should be treated as a modelling signal rather than a tuning nuisance: they usually mean a funnel, and the fix is a non-centred reparameterization rather than a smaller step size, which merely hides the symptom. Energy-based BFMI catches a different failure again. The general pattern is the module's: each diagnostic answers exactly the question it was built for, and every one of them gets read as a general certificate of correctness. The habit that helps is to say out loud, for each diagnostic, what would have to be true for it to fire — and then notice how narrow that set is."
          }
        },
        {
          "q": "How do you choose a prior, and how do you defend it?",
          "a": "I CHOOSE IT ON THE OUTCOME SCALE AND DEFEND IT BY SHOWING WHAT IT PREDICTS. The intuition that a wide prior is safe fails as soon as there is a link function, because flatness on the parameter scale is not flatness on anything you care about. Measured: a N(0,1) prior on a logit coefficient puts essentially no mass on implied probabilities below 0.01 or above 0.99; N(0,10) puts 64.7% there; and N(0,100) — the one people pick precisely because it looks agnostic — puts 96.3% there. So the 'uninformative' prior is a strong assertion that the effect is nearly certain in one direction. THE PROCEDURE IS THE PRIOR PREDICTIVE CHECK: push the prior through the model, simulate datasets, and look at them. If they contain conversion rates of 99.9% or revenue figures larger than the world economy, the prior is wrong regardless of how neutral it looked. Weakly informative priors that rule out the absurd while staying agnostic within the plausible range are the sensible default. THEN I DEFEND IT BY SENSITIVITY: rerun under two or three defensible alternatives and report the range. In the Beta-Binomial simulation, three priors gave posterior means of 0.0512, 0.1667 and 0.7364 at n=10, and 0.0491, 0.0491 and 0.0498 at n=100,000.",
          "deepDive": {
            "q": "How do you settle an argument about whose prior is right?",
            "a": "That last comparison is the most useful thing in the lesson operationally, because it reframes the whole prior debate as an empirical question. Whether the prior matters is not philosophical — it is a measurable property of how much information the data carries about that parameter, and you can just check. If the conclusion is stable across defensible priors, the argument is over and nobody needs to relitigate it. If the conclusion moves, that is not a reason to argue harder about which prior is right; it is a finding, and the honest report is that the data did not answer the question, with the range shown. That framing tends to defuse the objection that Bayesian analysis is subjective, because you have converted the subjectivity into a reported sensitivity rather than hiding it in a default. Worth adding that hierarchical models are where priors do their most valuable work and attract the least objection: a prior over group-level effects implements partial pooling, which is a principled answer to the multiple-comparisons problem from the experimentation lesson. Instead of correcting many independent tests, you model the effects as drawn from a common distribution, and the shrinkage falls out of the model rather than being bolted on."
          }
        },
        {
          "q": "How would you use Bayesian methods in causal work specifically?",
          "a": "THE HIGHEST-VALUE USE IS SENSITIVITY ANALYSIS, because it turns the module's central untestable assumption into something with a distribution on it. Rather than asserting no unmeasured confounding, put a prior on the confounder's strength — its association with treatment and with outcome — and report the posterior over the effect, marginalising across that prior. The output is a statement like 'the effect remains positive unless an unmeasured confounder is at least as strong as age', which a reader can evaluate against confounders they know about. That is strictly more informative than a point estimate with an interval that conditions on the assumption being exactly true, and it is the natural Bayesian analogue of the E-value and Rosenbaum bounds. THE SECOND USE IS PARTIAL POOLING ACROSS SEGMENTS OR MARKETS. Heterogeneous treatment effects estimated independently per segment are noisy and invite exactly the multiple-comparisons failure from the experimentation lesson; a hierarchical model shrinks them toward the pooled effect by an amount the data determines, which is both better estimation and a principled answer to multiplicity. THE THIRD IS DECISION-MAKING UNDER A LOSS FUNCTION, where the posterior over the effect combines with the cost of acting to give an expected loss, which is the quantity the decision actually needs.",
          "deepDive": {
            "q": "Does a Bayesian treatment help with identification?",
            "a": "The caution is the one this whole module has been building: none of this touches identification. A Bayesian estimate of a confounded effect is a confounded estimate with a posterior attached, and the posterior will be narrow and wrong in exactly the way the bootstrap interval was in the resampling lesson. Priors express uncertainty about PARAMETERS within a model; they do not express uncertainty about whether the model's causal structure is right, unless you explicitly build that in — which is what the sensitivity approach above does, and it is why it is the use case worth leading with. The other practical caution concerns Bayesian A/B testing, which is often sold as immune to peeking. It is not, quite. If you monitor the posterior probability that B beats A and stop when it crosses 95%, you have an optional stopping rule, and its operating characteristics depend on the prior and the rule rather than being automatically controlled. What genuinely fixes it is specifying a decision rule with a loss function in advance and not moving it, which is the same discipline the frequentist version requires, arrived at from a different direction."
          }
        },
        {
          "q": "What is a posterior predictive check actually checking, and how do you pick the test quantity?",
          "a": "IT CHECKS WHETHER THE FITTED MODEL COULD HAVE PRODUCED YOUR DATA. You draw parameters from the posterior, simulate a replicated dataset for each draw, compute some test quantity on each replicate, and compare that distribution to the observed value. If the observed value sits far in the tail, the model cannot generate data with that feature. THE TEST QUANTITY IS THE ENTIRE DESIGN DECISION, because a check on something the model was fitted to is close to vacuous — a model fitted by matching the mean will reproduce the mean, and the resulting Bayesian p-value near 0.5 tells you nothing. THE PRINCIPLE IS TO PROBE WHAT THE MODEL WAS NOT FITTED TO AND WHAT YOUR DECISION DEPENDS ON. In the worked example the informative quantities were the maximum absolute value — observed 29.43 against a replicated 95% interval of [9.83, 14.47] — and kurtosis, observed 42.01 against [-0.40, 0.49], both with p-values of 0.0000. Both probe the tails, which is exactly where a normal model fitted to heavy-tailed data must fail, and exactly what a risk decision would depend on. For time series I would check autocorrelation; for counts, the proportion of zeros; for hierarchical models, the between-group variance.",
          "deepDive": {
            "q": "How much should you trust a posterior predictive p-value?",
            "a": "Two honest caveats. First, posterior predictive p-values are not calibrated in the frequentist sense — the data is used twice, once to fit and once to test, so the reference distribution is conservative and the p-value is not uniform under the true model. That makes them a diagnostic rather than a hypothesis test, and the right reading is qualitative: 0.0000 versus [9.83, 14.47] against 29.43 is unambiguous, whereas 0.03 warrants a shrug. Cross-validated versions such as LOO-PIT fix the double use and are worth preferring when the check is borderline. Second, a passing check does not mean the model is right — it means the model reproduces the features you thought to test, and it is silent on everything you did not. That is the same asymmetry as everywhere in this module: refutation is available, confirmation is not. The practical upshot is that the checks worth running are the ones that could plausibly fail and that you would act on, which usually means deriving them from the decision rather than from a list. If you are going to use the model to size a tail risk, check the tail; if you are going to use it to rank groups, check the ranking."
          }
        },
        {
          "q": "How does this lesson fit the module's thesis?",
          "a": "IT IS THE ONE PLACE WHERE THE ASSUMPTIONS ARE WRITTEN DOWN AND SOME OF THEM CAN BE CHECKED, and it still has an untestable core. The workflow is unusually honest by construction: the prior is explicit, the likelihood is explicit, and both are interrogable — prior predictive checks catch absurd priors, posterior predictive checks catch likelihoods that cannot generate the data, simulation-based calibration catches bugs in the pipeline itself. That is more self-scrutiny than any other method in this module offers. AND THE SAME TRAP IS PRESENT. R-hat at 1.0002 with a posterior mean of 3.006 against a truth of 3.000 was a perfectly convergent sampler on a model whose predictive check returned 0.0000, and any reader who stopped at the convergence diagnostic would have shipped it. THE STRUCTURE IS IDENTICAL to the first-stage F testing strength rather than validity, and to the balance table reporting on its own inputs: a diagnostic computed from the same fit as the estimate cannot be independent evidence about the assumption behind it. WHAT BAYES ADDS TO THE CAUSAL PROBLEM is the ability to put a distribution on the untestable part — the strength of an unmeasured confounder — and report the effect across it, which converts an assertion into a range. It does not make the assumption testable. It makes it PRICED.",
          "deepDive": {
            "q": "If almost none of these assumptions can be tested, what is the realistic goal?",
            "a": "That distinction between testable and priced is worth carrying out of the module, because it is the realistic goal for most applied causal work. Almost nothing here can be verified: not ignorability, not exclusion, not parallel trends, not SUTVA. What you can do in every case is state the assumption plainly, show what the answer becomes under specified violations, and let the reader judge. An E-value does this on the risk-ratio scale, Rosenbaum bounds do it for matched designs, plausible-exogeneity analysis does it for instruments, and a prior over confounder strength does it in the Bayesian idiom. The four are the same move in four notations, and running one of them is the single most reliable marker distinguishing careful applied work from careless applied work — more reliable than the sophistication of the estimator, which is usually uncorrelated with credibility. If I had one recommendation to leave with a team, it would be that: report the sensitivity, always, in whatever notation the audience reads. It costs an afternoon and it is the only part of the writeup that speaks to the thing the whole estimate rests on."
          }
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
  }
};
