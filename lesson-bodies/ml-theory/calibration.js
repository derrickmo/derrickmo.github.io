// GENERATED from content/lessons/ml-theory/calibration.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/ml-theory/calibration/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "calibration": {
    "level": "advanced",
    "body": {
      "intuition": [
        "A model is CALIBRATED if its confidence means what it says: among all the cases where it predicts 70%, about 70% should actually be positive. This is a completely different property from ACCURACY or from RANKING quality, and the distinction is the heart of the topic. A model can rank perfectly - every positive scored above every negative, AUC 1.0 - while its numbers are badly wrong, because AUC is invariant to any monotone transformation of the scores. Conversely a model can be perfectly calibrated and useless: one that always outputs the base rate is calibrated by construction and has zero discriminative power.",
        "Calibration matters exactly when something downstream consumes the NUMBER rather than the ordering. Cost-based thresholds (t* = C_FP/(C_FP+C_FN)) assume the probability is real. Expected-value calculations - bid = pCTR x value, risk = probability x exposure - multiply the probability by money, so an error in level costs money directly even when the ranking is right. Humans reading '80% confident' will act on it. And combining models or evidence multiplies distortions. If your system only ever thresholds at a point you tuned empirically, calibration is irrelevant; if any of the above applies, it is a first-class requirement.",
        "The empirical fact worth carrying: modern neural networks are systematically OVERCONFIDENT, and the effect got worse as networks got bigger. Guo et al. (2017) showed a shallow LeNet was reasonably calibrated while a much more accurate ResNet was substantially miscalibrated - accuracy improved and confidence quality degraded. The mechanism is that cross-entropy with hard one-hot targets keeps pushing the correct class's probability toward 1, which requires ever-larger logits, long after the classification decision is settled. The good news is that the cheapest fix - TEMPERATURE SCALING, one parameter fitted on a validation set - removes most of it while leaving accuracy and ranking exactly unchanged, because dividing all logits by a constant cannot reorder them."
      ],
      "math": [
        {
          "h": "Perfect calibration, and how ECE approximates it",
          "paras": [
            "The definition is a conditional statement that cannot be checked directly (you never see two examples with exactly the same predicted probability), so it is estimated by BINNING: group predictions into confidence bins and compare each bin's average confidence to its observed accuracy. Expected Calibration Error is the size-weighted average of those gaps."
          ],
          "tex": "\\mathbb{P}\\big(y=1 \\;\\big|\\; \\hat{p}=p\\big) = p \\;\\; \\forall p \\in [0,1], \\qquad \\mathrm{ECE} = \\sum_{m=1}^{M} \\frac{|B_m|}{n}\\Big| \\mathrm{acc}(B_m) - \\mathrm{conf}(B_m) \\Big|",
          "texNote": "B_m = the examples whose confidence falls in bin m. ECE is a BIASED estimator whose value depends on the bin count (measured drift: 0.009 at 5 bins to 0.030 at 100 on the same predictions), so always report the binning scheme, and prefer adaptive/equal-mass bins over equal-width ones."
        },
        {
          "h": "Temperature scaling: one parameter, ranking preserved",
          "paras": [
            "Divide the logits by a scalar T fitted by minimizing negative log-likelihood on a HELD-OUT set. T > 1 softens an overconfident model. The crucial property is that dividing every logit by the same positive constant is monotone, so the argmax and the full ranking are untouched - accuracy and AUC are exactly unchanged."
          ],
          "tex": "\\hat{p}_i = \\frac{\\exp(z_i / T)}{\\sum_j \\exp(z_j / T)}, \\qquad T^\\star = \\arg\\min_{T>0} \\; -\\sum_{k} \\log \\hat{p}^{(T)}_{y_k}(x_k)",
          "texNote": "T = 1 recovers the original model; T -> infinity gives the uniform distribution; T < 1 sharpens an underconfident one. Fit T on validation data the model did NOT train on - fitting it on training data recovers T ~ 1 and does nothing, which is the classic implementation mistake."
        }
      ],
      "code": [
        {
          "h": "Measuring calibration, then fixing it",
          "paras": [
            "The reliability diagram plus ECE is the diagnostic; temperature scaling is usually the fix. Note in the numbers that accuracy is IDENTICAL before and after - which is the property that makes temperature scaling free to adopt."
          ],
          "code": "import numpy as np, torch\nfrom scipy.optimize import minimize_scalar\n\ndef ece(probs, labels, n_bins=15):\n    \"\"\"Expected Calibration Error with equal-width bins.\"\"\"\n    conf, pred = probs.max(1), probs.argmax(1)\n    correct = (pred == labels).astype(float)\n    edges, total = np.linspace(0, 1, n_bins + 1), 0.0\n    for lo, hi in zip(edges[:-1], edges[1:]):\n        m = (conf > lo) & (conf <= hi)\n        if m.sum() == 0: continue\n        total += m.mean() * abs(correct[m].mean() - conf[m].mean())\n    return total\n\ndef fit_temperature(val_logits, val_labels):\n    \"\"\"One parameter, fitted by NLL on a HELD-OUT set.\"\"\"\n    z = torch.tensor(val_logits); y = torch.tensor(val_labels)\n    nll = lambda T: torch.nn.functional.cross_entropy(z / T, y).item()\n    return minimize_scalar(nll, bounds=(0.05, 10.0), method='bounded').x\n\nT = fit_temperature(val_logits, val_labels)\np_raw = torch.softmax(torch.tensor(test_logits), 1).numpy()\np_cal = torch.softmax(torch.tensor(test_logits) / T, 1).numpy()\n\nprint(f'T* = {T:.2f}')                                        # T* = 2.11  (>1: overconfident)\nprint(f'ECE  raw {ece(p_raw, y_test):.4f} -> cal {ece(p_cal, y_test):.4f}')\n#   ECE  raw 0.0834 -> cal 0.0121\nprint(f'acc  raw {(p_raw.argmax(1)==y_test).mean():.4f} -> '\n      f'cal {(p_cal.argmax(1)==y_test).mean():.4f}')\n#   acc  raw 0.9231 -> cal 0.9231     <- IDENTICAL: monotone rescaling cannot reorder",
          "caption": "Temperature scaling cuts ECE from 0.083 to 0.012 with accuracy unchanged to four decimals - dividing logits by a constant is monotone, so the argmax and the entire ranking are preserved. One parameter, fitted on held-out data."
        },
        {
          "h": "When one temperature is not enough",
          "paras": [
            "Temperature scaling can only apply a single global sharpening. If the miscalibration is not a uniform distortion - different in different confidence regions - you need a more flexible map. Isotonic regression fits any monotone function, at the cost of more validation data and a risk of overfitting."
          ],
          "code": "from sklearn.isotonic import IsotonicRegression\nfrom sklearn.linear_model import LogisticRegression\n\n# Platt scaling: fit a sigmoid a*s + b on validation scores (2 parameters)\nplatt = LogisticRegression().fit(val_scores.reshape(-1, 1), y_val)\np_platt = platt.predict_proba(test_scores.reshape(-1, 1))[:, 1]\n\n# Isotonic: fit ANY non-decreasing map (non-parametric, needs more data)\niso = IsotonicRegression(out_of_bounds='clip').fit(val_scores, y_val)\np_iso = iso.predict(test_scores)\n\n# On a NON-AFFINE distortion (scores raised to a power - a shape a single\n# temperature cannot undo):\n#   method            ECE\n#   raw             0.249\n#   temperature     0.147   <- helps, but cannot fix the shape\n#   Platt           0.132\n#   isotonic        0.023   <- flexible enough for the real distortion\n#\n# Trade-off: isotonic needs ~1000+ validation points or it overfits; temperature\n# needs very few and cannot overfit meaningfully (one parameter). Default to\n# temperature; escalate to isotonic when the reliability diagram is non-monotone\n# in shape and you have the data.",
          "caption": "Temperature scaling assumes the distortion is a uniform sharpening. Against a non-affine distortion it only reaches ECE 0.147 while isotonic regression - which fits any monotone map - reaches 0.023, at the cost of needing far more validation data."
        }
      ],
      "useCases": [
        "Any decision made by thresholding on expected cost: the optimal threshold C_FP/(C_FP+C_FN) is derived assuming the probability is real, so a miscalibrated model sits at the wrong operating point even when its ranking is excellent.",
        "Expected-value systems where probability multiplies money - ad bidding (pCTR x value), insurance and credit pricing, portfolio risk - where an error in LEVEL costs directly and identical AUC can leave measurable value on the table.",
        "Human-in-the-loop settings: clinical decision support, triage, and content review, where a stated confidence is acted on by a person and must be trustworthy, and where selective prediction (abstain below a confidence threshold) requires meaningful probabilities.",
        "Model combination and cascades: averaging or multiplying probabilities from several models compounds their distortions, so calibrating each component is a prerequisite for ensembling or for routing between a cheap and an expensive model."
      ],
      "pitfalls": [
        "Confusing calibration with accuracy or ranking: AUC is invariant to any monotone transform of the scores, so it cannot detect miscalibration at all. Report a proper scoring rule (log loss or Brier) plus a reliability diagram alongside your discrimination metric.",
        "Fitting the calibrator on training data: the model is already near-perfectly confident on data it fitted, so temperature comes out at ~1 and nothing changes. Calibration must be fitted on a held-out set the model did not train on.",
        "Trusting ECE as an exact number: it is a biased, binning-dependent estimator - the same predictions can give 0.009 at 5 bins and 0.030 at 100. Always state the bin count and scheme, and prefer equal-mass bins.",
        "Assuming calibration transfers under distribution shift: a model calibrated on validation data is not calibrated on a shifted deployment distribution, and neural networks degrade sharply under shift. Recalibrate on data from the target distribution and monitor it over time.",
        "Treating aggregate calibration as per-instance reliability: a model can be perfectly calibrated overall and badly miscalibrated within a subgroup, and the aggregate hides it. Check calibration per slice, especially for the groups the decision affects most."
      ],
      "connections": [
        {
          "ref": "trustworthy-ai/calibration",
          "text": "The trustworthy-AI module goes further with known-truth experiments - a closed-form Bayes posterior as a perfectly-calibrated reference, and the measured recovery of an injected sharpening factor by temperature scaling."
        },
        {
          "ref": "trustworthy-ai/conformal-prediction",
          "text": "Conformal prediction gives distribution-free coverage guarantees on SETS rather than calibrated point probabilities - the complementary approach when you need a guarantee rather than a well-fitted number."
        },
        {
          "ref": "ml-theory/evaluation-metrics",
          "text": "The cost-optimal threshold derived there assumes calibrated probabilities, which is why threshold selection and calibration are really one conversation."
        },
        {
          "ref": "ml-theory/imbalanced-data",
          "text": "Resampling and class weighting shift the implied class prior and therefore break calibration - a rebalanced model needs a prior correction before its probabilities can be used quantitatively."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What does calibrated mean?",
          "a": "Among all cases predicted at confidence p, a fraction p are actually positive. The predicted probability matches the observed frequency."
        },
        {
          "q": "How is calibration different from accuracy?",
          "a": "They are independent. A model can rank perfectly (AUC 1.0) with badly wrong numbers, and a model that always outputs the base rate is perfectly calibrated and useless."
        },
        {
          "q": "Why can't AUC detect miscalibration?",
          "a": "AUC depends only on the ORDER of scores, and it is invariant to any monotone transformation - so squashing or stretching all probabilities leaves it unchanged."
        },
        {
          "q": "What is a reliability diagram?",
          "a": "Bin predictions by confidence and plot each bin's observed accuracy against its mean confidence. Perfect calibration is the diagonal; below it means overconfident."
        },
        {
          "q": "What is ECE?",
          "a": "Expected Calibration Error: the size-weighted mean absolute gap between bin accuracy and bin confidence. Biased and binning-dependent, so always report the bin count."
        },
        {
          "q": "What is temperature scaling?",
          "a": "Divide the logits by a single scalar T fitted by NLL on held-out data. T > 1 softens an overconfident model; accuracy and ranking are exactly unchanged."
        },
        {
          "q": "Why does temperature scaling not change accuracy?",
          "a": "Dividing all logits by the same positive constant is monotone, so the argmax - and the whole ranking - is preserved. Only the probability values move."
        },
        {
          "q": "Are modern neural networks well calibrated?",
          "a": "No - they are systematically overconfident, and it got worse as networks got larger and more accurate (Guo et al., 2017). Cross-entropy on one-hot targets keeps inflating logits after the decision is settled."
        },
        {
          "q": "Platt vs isotonic scaling?",
          "a": "Platt fits a sigmoid (2 parameters, works with little data). Isotonic fits any monotone map (non-parametric, more flexible, needs ~1000+ validation points or it overfits)."
        },
        {
          "q": "Where must the calibrator be fitted?",
          "a": "On a held-out set the model did not train on. Fitting on training data gives T ~ 1 and no effect, because the model is already confident there."
        },
        {
          "q": "What is aleatoric vs epistemic uncertainty?",
          "a": "Aleatoric: irreducible noise in the data (more data does not help). Epistemic: uncertainty about the model itself (more data DOES help). Different sources, different responses."
        },
        {
          "q": "How does label smoothing relate?",
          "a": "It also prevents overconfidence, by softening the targets during training rather than rescaling logits afterwards - but it degrades a model's usefulness as a distillation teacher by erasing inter-class structure."
        }
      ],
      "standard": [
        {
          "q": "What is calibration, why do neural networks lose it, and how do you fix it?",
          "a": "THE DEFINITION. A model is calibrated if P(y=1 | phat = p) = p for all p: among the cases where it says 70%, 70% really are positive. This is orthogonal to discrimination. A model with AUC 1.0 can be badly calibrated because AUC depends only on ORDER and is invariant to any monotone transform of the scores; and a model that always outputs the base rate is perfectly calibrated with zero discriminative power. So you need to report both, and a proper scoring rule (log loss or Brier) is the metric that sees both at once - Brier even decomposes into reliability minus resolution plus uncertainty, separating calibration quality from discriminative ability. WHY NEURAL NETWORKS LOSE IT. Guo et al. (2017) documented the striking pattern: a shallow LeNet was reasonably calibrated, while a far more ACCURATE ResNet was substantially overconfident. Accuracy improved and confidence quality degraded, which was not what anyone expected. The mechanism: training with cross-entropy against HARD one-hot targets means the loss keeps decreasing as the correct class's probability approaches 1, which requires ever-larger logits. Long after the classification decision is settled, gradient descent continues inflating logit magnitudes because that is what reduces the loss. Modern capacity and long training schedules give it room to do so. Contributing factors: reduced weight decay (which used to bound logit growth), batch normalization, and training essentially to zero training error. WHY IT MATTERS - the part that determines whether you should care. It matters when something downstream consumes the NUMBER: cost-based thresholding (t* = C_FP/(C_FP+C_FN) assumes real probabilities); expected-value decisions where probability multiplies money (bidding, pricing, risk); human consumption, where '80% confident' must mean something; selective prediction / abstention, which needs a meaningful confidence to threshold on; and model combination, since averaging distorted probabilities compounds the distortion. It does NOT matter if your system emits a hard decision at a threshold you tuned empirically on validation data - then you are using the model as a ranker and a monotone distortion changes nothing. THE FIXES, in order of what I would try. (1) TEMPERATURE SCALING: divide all logits by a single scalar T fitted by minimizing NLL on a held-out set. It is one parameter, cannot meaningfully overfit, and - crucially - leaves accuracy and ranking EXACTLY unchanged because the transform is monotone. In practice it removes most of the miscalibration: a representative result is ECE 0.083 -> 0.012 with accuracy identical to four decimal places. This should be the default, and it is essentially free to adopt. (2) PLATT SCALING: fit a sigmoid (two parameters) on the scores - the classical choice for SVMs and other models whose outputs are not probabilities at all. (3) ISOTONIC REGRESSION: fit any non-decreasing map, non-parametrically. More flexible, and it is what you need when the distortion is not a uniform sharpening - against a non-affine distortion, temperature reaches ECE 0.147 while isotonic reaches 0.023. The cost is data: with fewer than roughly a thousand validation points it overfits. (4) TRAINING-TIME approaches: label smoothing, mixup (both soften targets and measurably improve calibration), focal loss, and deep ensembles - ensembles are among the best-calibrated models available and also improve accuracy, at M times the cost. THE IMPLEMENTATION DETAIL people get wrong: the calibrator must be fitted on data the model did NOT train on. Fit temperature on the training set and you get T ~ 1 and no effect, because the model is already maximally confident there. And under distribution shift, calibration does not transfer - so recalibrate on target-distribution data and monitor it, rather than treating calibration as a one-time fix.",
          "deepDive": {
            "q": "ECE is the standard metric but it has real problems. What are they, and what should you use instead?",
            "a": "THE PROBLEMS WITH ECE, which are worth knowing because it is reported everywhere. (1) IT IS BINNING-DEPENDENT AND BIASED. ECE approximates a conditional expectation by grouping predictions into bins, and the estimate depends on the number and placement of bins. With few bins, genuine miscalibration averages out within a bin and ECE understates it; with many bins, each contains few samples so the accuracy estimate is noisy and ECE overstates it. Measured on identical predictions, ECE drifts from ~0.009 at 5 bins to ~0.030 at 100 - a factor of three from a reporting choice. It is a biased estimator of the true calibration error and the bias does not vanish with a fixed bin count as n grows. Consequence: ECE values are not comparable across papers unless the binning matches, and 'we reduced ECE' can be a binning artifact. (2) EQUAL-WIDTH BINS ARE BADLY SUITED to modern networks, whose confidences pile up near 1.0 - most bins are nearly empty while one bin holds most of the mass, so the average is dominated by a single bin's estimate. ADAPTIVE (equal-mass) binning fixes this and should be the default. (3) IT ONLY MEASURES TOP-LABEL CONFIDENCE in its usual form. Standard ECE looks at max-probability versus accuracy, ignoring whether the rest of the distribution is sensible. CLASSWISE ECE (averaged over all classes) is stricter and catches distortions the top-label version misses. (4) IT IS NOT A PROPER SCORING RULE. You can game it - a model that outputs the base rate for everything has ECE 0 and no discriminative power - so optimizing ECE directly is a bad idea, and reporting ECE alone is misleading. (5) IT SAYS NOTHING ABOUT PER-INSTANCE OR PER-GROUP reliability. A model can have excellent aggregate ECE while being systematically overconfident for one subgroup and underconfident for another, with the errors cancelling. WHAT TO USE INSTEAD, or in addition. (a) PROPER SCORING RULES - log loss and Brier score - which are minimized only by truthful probabilities and therefore cannot be gamed. Brier's decomposition (reliability - resolution + uncertainty) is particularly useful because it separates calibration from discrimination in one number set. Report these as the primary quantitative measure. (b) RELIABILITY DIAGRAMS as the qualitative artifact: they show the SHAPE of the miscalibration - uniformly overconfident, overconfident only at high confidence, non-monotone - which tells you whether temperature scaling will suffice or whether you need isotonic. A single scalar cannot convey this and the plot takes seconds. (c) ADAPTIVE-BINNING ECE with the scheme stated, if you want a scalar for tracking. (d) CLASSWISE or per-slice ECE for anything where subgroup behaviour matters. (e) DEBIASED estimators of calibration error, and kernel-based measures (KCE/MMCE) that avoid binning altogether - less common but principled. (f) For the decision that actually matters, DOWNSTREAM COST: if the point of calibration is a cost-optimal threshold, then measure the realized cost of the calibrated versus uncalibrated model, which is the end-to-end number and is immune to all of the above measurement issues. THE RECOMMENDATION I WOULD GIVE: report log loss or Brier as the scalar, show a reliability diagram with equal-mass bins, quote ECE with its binning scheme if a scalar calibration number is wanted, check per-slice calibration for the groups your decision affects, and - if there is a cost model - report realized cost. And treat any paper reporting only ECE with an unstated bin count as having reported very little."
          }
        },
        {
          "q": "Distinguish aleatoric and epistemic uncertainty. Why does the distinction matter?",
          "a": "THE TWO SOURCES. ALEATORIC uncertainty is randomness inherent in the data-generating process - measurement noise, genuinely ambiguous inputs, and the fact that the features do not fully determine the label. A blurry photograph that could be a cat or a small dog carries aleatoric uncertainty: even an ideal model with infinite data would be uncertain, because the information is not in the input. It is IRREDUCIBLE with respect to more data of the same kind (though it can be reduced by better FEATURES or better sensors, which is an important caveat). EPISTEMIC uncertainty is uncertainty about the MODEL - about which function is correct, given that you have finite data. It is high in regions where you have few or no training examples, and it is REDUCIBLE: collect data there and it shrinks. A model asked to classify an input unlike anything it trained on should have high epistemic uncertainty. WHY THE DISTINCTION IS ACTIONABLE - this is the whole point. (1) IT TELLS YOU WHAT TO DO. High aleatoric uncertainty means more data will not help; you need better features, better instrumentation, or an acceptance that the task has a ceiling. High epistemic uncertainty means more data WILL help, and specifically data from the uncertain region - which is exactly the principle behind ACTIVE LEARNING (query the examples the model is most epistemically uncertain about, since those are the informative ones; querying high-aleatoric examples is wasted annotation because the label is inherently ambiguous). (2) IT DETECTS OUT-OF-DISTRIBUTION INPUTS. Epistemic uncertainty should spike for inputs unlike the training data, which is the basis of OOD detection and of safe abstention. Standard softmax confidence conflates the two and is notoriously overconfident on OOD inputs, which is why 'the model was 99% sure and completely wrong' happens. (3) IT DRIVES DIFFERENT SAFETY RESPONSES. High aleatoric on a medical case means 'this test cannot resolve the question - order a different one'. High epistemic means 'this case is unlike our training population - escalate to a human'. Both are abstentions, with different follow-ups. HOW TO ESTIMATE THEM. Aleatoric: have the model predict the noise directly - a heteroscedastic head that outputs both a mean and a variance for regression, trained with a Gaussian NLL, or simply the entropy of a well-calibrated softmax for classification. Epistemic: you need a distribution over MODELS. DEEP ENSEMBLES (train M models from different initializations and look at their DISAGREEMENT) are the strongest practical method and the usual baseline - disagreement is high where the data did not constrain the function. MC-DROPOUT (keep dropout on at inference and average many stochastic passes) is a cheap approximation, interpretable as approximate Bayesian inference. Bayesian neural networks and last-layer Laplace approximations are more principled and less practical. Gaussian processes give it exactly and analytically, which is one of their main attractions. The decomposition is clean in the ensemble framing: total predictive entropy = expected entropy of the members (aleatoric) + mutual information between prediction and model (epistemic). THE HONEST CAVEATS I would state. The separation is model-relative rather than absolute - what looks aleatoric to a model with weak features is partly epistemic to a model with better ones. Deep ensembles are expensive (M times training and inference) and their disagreement is a heuristic rather than a posterior. MC-dropout's quality depends heavily on the dropout rate and placement, and it often underestimates epistemic uncertainty. And under distribution shift ALL of these degrade - the well-known result that uncertainty estimates themselves become unreliable exactly when you need them most. Which is why, when a guarantee rather than an estimate is required, conformal prediction - distribution-free coverage on prediction SETS - is the tool to reach for instead."
        },
        {
          "q": "Your model has AUC 0.94 but the business says its probabilities are useless. Diagnose and fix.",
          "a": "THE DIAGNOSIS IS ALMOST CERTAINLY MISCALIBRATION, and the surprising part for the team is precisely that AUC did not warn them. AUC depends only on the ORDER of scores and is invariant to any monotone transformation, so a model can rank essentially perfectly while its numbers are systematically wrong - squash every probability toward 0.5, or inflate them all toward 1, and AUC does not move a point. So 'good AUC, useless probabilities' is not a contradiction; it is the expected outcome when nobody measured calibration. STEP 1 - CONFIRM AND CHARACTERIZE IT. Plot a RELIABILITY DIAGRAM on held-out data: bin predictions by confidence (equal-mass bins), plot observed frequency against mean predicted probability. The shape is diagnostic. Below the diagonal everywhere means uniformly overconfident (the typical neural-network pattern) and temperature scaling will fix it. A non-monotone or S-shaped curve means the distortion is not a uniform sharpening and you will need isotonic regression. Compute ECE (with the binning stated) and log loss or Brier as the scalars. STEP 2 - FIND THE CAUSE, because it changes the fix. (a) Standard neural-network overconfidence from cross-entropy on hard targets, especially with long training and low weight decay - the most common cause. (b) CLASS REBALANCING during training (resampling, class weights, SMOTE), which changes the implied prior and shifts probabilities systematically - the fix is a prior correction or recalibration on the true distribution, and it is worth checking first because it is easy to overlook. (c) The model is not probabilistic at all - an SVM's decision function or a ranking model's score is not a probability and never was; Platt scaling exists exactly for this. (d) DISTRIBUTION SHIFT: calibrated at training time, drifted since. Check by computing calibration on recent data specifically. STEP 3 - FIX IT, cheapest first. TEMPERATURE SCALING on a held-out validation set: one parameter, no accuracy or ranking change whatsoever, typically removing most of the error (a representative result: ECE 0.083 -> 0.012 with accuracy identical). If the reliability diagram showed a non-affine shape and you have 1,000+ validation points, use ISOTONIC REGRESSION instead. Fit on data the model did not train on - fitting on training data yields T ~ 1 and does nothing, which is the classic implementation bug. STEP 4 - VERIFY IN THE UNITS THE BUSINESS CARES ABOUT. This is what makes the fix credible. If they threshold on cost, show that the cost-optimal threshold derived from the formula now matches the empirically-optimal one, and report realized cost before and after. If they multiply probability by value (bidding, pricing, expected revenue), show the realized value: a well-documented pattern is that two models with IDENTICAL AUC and very different ECE realize noticeably different value, because the miscalibrated one systematically misprices. If a human reads the number, show the reliability diagram - it is the artifact that makes the claim legible to a non-specialist. STEP 5 - MAKE IT STICK. Add calibration to standard reporting alongside AUC (log loss plus a reliability diagram). Monitor ECE in production over time, since calibration decays under drift faster than discrimination does. Recalibrate on a rolling window rather than treating it as a one-time fix. And check calibration PER SLICE for the groups the decision affects - aggregate calibration can be excellent while a subgroup is badly miscalibrated, with the errors cancelling. THE ONE-SENTENCE VERSION I would give the business: the model orders cases correctly but its confidence numbers were on the wrong scale, which is a separate and cheaply-fixable property that our metrics were not measuring - and here is the corrected model with unchanged accuracy and probabilities that now mean what they say."
        },
        {
          "q": "Compare temperature scaling, Platt scaling, and isotonic regression.",
          "a": "All three are POST-HOC calibrators: fit a mapping from the model's raw outputs to calibrated probabilities using a held-out set, leaving the model itself untouched. They differ in flexibility, data requirements, and what they preserve. TEMPERATURE SCALING. Divide all logits by a single scalar T, then softmax. ONE parameter, fitted by minimizing NLL on validation data. PROPERTIES: cannot overfit in any meaningful sense (one parameter); needs very little validation data (a few hundred points suffice); and crucially it is MONOTONE and applied uniformly, so accuracy and the entire ranking are exactly preserved - AUC does not change by a single point. It extends naturally to multi-class, where it preserves the full argmax structure. LIMITATION: it can only apply a uniform sharpening or softening. If the miscalibration differs in shape across the confidence range, a single T cannot fix it - against a non-affine distortion it might reach ECE 0.147 where isotonic reaches 0.023. USE IT AS THE DEFAULT for neural networks, whose miscalibration is usually well-approximated as uniform overconfidence. PLATT SCALING. Fit a logistic sigmoid p = sigma(a*s + b) on the validation scores. TWO parameters. PROPERTIES: also monotone (for a > 0), so ranking is preserved; works on any real-valued score, not just logits, which is why it is the classical choice for SVMs and other models whose outputs are not probabilities at all; needs little data. LIMITATION: it assumes the correct mapping has a sigmoid shape, which is a real parametric assumption and can be wrong. Historically it is the origin of this whole family (Platt 1999, for SVMs) and temperature scaling is essentially its one-parameter multi-class relative. ISOTONIC REGRESSION. Fit ANY non-decreasing function from score to probability, using the pool-adjacent-violators algorithm. NON-PARAMETRIC. PROPERTIES: maximally flexible among monotone maps, so it can correct distortions of any shape and typically achieves the lowest calibration error when it has enough data. Still monotone, so ranking is preserved - though its step-function output can create TIES that collapse fine-grained ordering, which matters if you need to rank within a narrow score band. LIMITATIONS: it needs substantially more validation data (roughly 1,000+ points, more for multi-class) or it overfits the validation set and generalizes worse than temperature; it produces a piecewise-constant function, so probabilities are quantized; and it extrapolates poorly outside the observed score range (hence out_of_bounds='clip'). BETA CALIBRATION deserves a mention as a middle ground - a three-parameter family more flexible than Platt without isotonic's data appetite. HOW I CHOOSE. Start with a reliability diagram. If the curve is a smooth uniform deviation from the diagonal -> temperature scaling, and stop there. If the curve has a genuinely different shape (S-shaped, non-monotone in the trend) AND you have 1,000+ held-out points -> isotonic. If the model's output is not a logit at all (SVM margins, tree ensemble votes, arbitrary scores) -> Platt or isotonic. If validation data is scarce -> temperature or Platt, never isotonic. And validate the calibrator itself on a THIRD split or by cross-validation, because a calibrator fitted and evaluated on the same held-out data reports optimistically - this is a real and commonly-overlooked leak. THE ALTERNATIVE FAMILY worth naming: training-time methods - label smoothing, mixup, focal loss, and deep ensembles - which improve calibration during training rather than after. Ensembles in particular are among the best-calibrated models available and improve accuracy too, at M times the cost. Post-hoc scaling and training-time methods compose, and in practice a mixup-trained ensemble with temperature scaling on top is close to the state of the art for calibrated deep classifiers."
        },
        {
          "q": "When would you use conformal prediction instead of calibrating probabilities?",
          "a": "THE DIFFERENT PROMISES. Calibration produces a POINT PROBABILITY that is well-fitted on average: among the cases you call 70%, 70% are positive. It is an empirical, distributional property, and it can silently fail under shift or within a subgroup. CONFORMAL PREDICTION produces a SET (or interval) with a distribution-free FINITE-SAMPLE COVERAGE GUARANTEE: with a chosen error rate alpha, the true label lies in the predicted set at least 1-alpha of the time. That is a theorem, requiring only that the data be exchangeable - no assumption about the model, the data distribution, or the model being any good. HOW IT WORKS, briefly. Split conformal: hold out a calibration set, compute a NONCONFORMITY SCORE for each held-out example (for classification, typically 1 minus the predicted probability of the true class), take the appropriate empirical quantile of those scores, and at test time include in the prediction set every label whose score falls below that quantile. The finite-sample quantile index is ceil((n+1)(1-alpha))/n, and that correction is what makes the guarantee exact rather than asymptotic. WHEN CONFORMAL IS THE RIGHT CHOICE. (1) YOU NEED A GUARANTEE, NOT AN ESTIMATE - regulated settings, safety cases, medical or legal contexts where 'our validation ECE was 0.01' is not an acceptable argument but 'coverage is at least 90% by construction' is. (2) THE OUTPUT SHOULD EXPRESS AMBIGUITY AS A SET. 'It is one of {A, B}' is often more useful and more honest than 'A with 55%' - for a clinician narrowing a differential, or a triage system routing to a specialist. Set SIZE is itself an interpretable difficulty signal: easy inputs get singletons, hard ones get larger sets. (3) THE MODEL IS A BLACK BOX or is not probabilistic at all - conformal wraps any point predictor, including ones whose scores are meaningless. (4) YOU WANT VALIDITY DECOUPLED FROM ACCURACY. A striking demonstration: even an UNTRAINED model achieves the target coverage under conformal - it just does so with near-full sets (e.g. 2.75 labels out of 3). Coverage is guaranteed; USEFULNESS (small sets) is what a good model buys. That decoupling is exactly what you want in a safety argument. WHEN CALIBRATION IS THE RIGHT CHOICE INSTEAD. (1) A DOWNSTREAM SYSTEM NEEDS A NUMBER to multiply - expected-value calculations, bidding, risk aggregation, and cost-optimal thresholding all need a scalar probability, and a set does not compose with them. (2) You need a single decision at a tuned operating point rather than a set. (3) Simplicity and familiarity matter, and the consumers of the output expect probabilities. THE LIMITATIONS OF CONFORMAL that keep the comparison honest: the guarantee is MARGINAL, not conditional - coverage holds on average over the whole distribution, so a specific subgroup or difficulty band can be under-covered (a measured example: worst difficulty bin at 0.851 against a 0.90 target). Adaptive variants (APS, Mondrian/group-conditional conformal, CQR for regression) improve conditional behaviour but do not fully solve it. And the guarantee requires EXCHANGEABILITY, so it breaks under distribution shift like everything else - measured coverage can fall from 0.90 to 0.76 under a corrupted test distribution. There is work on covariate-shift-weighted conformal, but it needs the shift to be characterized. WHAT I WOULD ACTUALLY DO in a high-stakes system: use both. Calibrate the probabilities so any expected-value logic downstream is sound, AND wrap the predictor in conformal so the system can abstain or escalate with a coverage guarantee. They answer different questions - 'how confident, in a number I can compute with' versus 'what set of labels can I rule in with a guarantee' - and a serious deployment usually wants both."
        },
        {
          "q": "How do you monitor and maintain calibration in production?",
          "a": "The core difficulty is that calibration DECAYS under distribution shift, and typically decays faster than discrimination does - a model whose AUC has barely moved can have drifted badly in its probability levels, because AUC only cares about order. So calibration needs monitoring as a first-class metric, not as a one-time check at training. WHAT TO MONITOR. (1) CALIBRATION ITSELF, once labels arrive: ECE with a fixed, stated binning scheme, plus log loss or Brier as the proper scoring rules, computed on a rolling window. Track them as a time series and alert on trend, not just on a threshold. (2) A RELIABILITY DIAGRAM per period, retained as an artifact - the shape tells you whether a simple retemperature will fix it or whether something structural changed. (3) THE PREDICTED-PROBABILITY DISTRIBUTION itself, which needs NO labels and is therefore available immediately. If the mean predicted probability drifts away from the historical realized rate, that is an early warning; PSI or a KS statistic on the score distribution formalizes it. (4) INPUT DRIFT on features (PSI per feature, and a multivariate check like MMD or a domain classifier, since correlation shifts can leave marginals unchanged). (5) THE REALIZED BASE RATE, since a genuine change in prevalence changes what calibrated means and may call for a prior correction rather than a model change. (6) PER-SLICE calibration for the groups the decision affects - aggregate calibration can look fine while a subgroup is badly off, with errors cancelling. THE LABEL-DELAY PROBLEM, which is the practical complication people underestimate. In fraud, credit, and medical settings, ground truth arrives days to months later, so calibration measured on recent data is computed on incomplete labels and is systematically biased (the positives that have not yet been confirmed look like negatives). Responses: measure calibration only on cohorts old enough to be mature; model the label-arrival delay explicitly and correct; and lean on the label-free signals (score distribution, input drift) for early warning. MAINTENANCE. (a) PERIODIC RECALIBRATION on a recent labelled window is much cheaper than retraining and often sufficient - refitting a temperature is seconds of compute, and it addresses the most common failure mode. Automate it on a schedule. (b) FULL RETRAINING when discrimination has also degraded, which indicates concept shift rather than a level shift. (c) PRIOR CORRECTION when only the base rate moved - the analytic odds-reweighting is exact and does not need new labels beyond an estimate of the new prevalence. (d) Keep a HOLDOUT stream of recent labelled data reserved for calibration, separate from training data. THE OPERATIONAL DESIGN POINT I would raise: decide in advance what the system does when calibration degrades. Options are recalibrate automatically, widen abstention thresholds (predict less, escalate more) until recalibration happens, or fall back to a conservative default. A monitoring system that only produces alerts nobody can act on is not worth much, and the fallback behaviour is the part that makes the monitoring useful. FINALLY, the argument for conformal as a complement: because calibration is a distributional property that silently degrades, a system that also carries a coverage guarantee (with the caveat that it too assumes exchangeability) degrades more gracefully - sets get larger rather than probabilities getting quietly wrong, and larger sets are a VISIBLE signal that something changed."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Calibration",
        "back": "P(y=1 | phat = p) = p: among cases predicted at 70%, 70% are positive. INDEPENDENT of accuracy and of ranking - a base-rate predictor is perfectly calibrated and useless."
      },
      {
        "type": "pitfall",
        "front": "AUC cannot see miscalibration",
        "back": "AUC depends only on ORDER and is invariant to any monotone transform of the scores. Report a proper scoring rule (log loss / Brier) plus a reliability diagram alongside it."
      },
      {
        "type": "formula",
        "front": "ECE",
        "back": "Size-weighted mean |bin accuracy - bin confidence|. BIASED and binning-dependent: the same predictions give 0.009 at 5 bins and 0.030 at 100. State the scheme; prefer equal-MASS bins."
      },
      {
        "type": "formula",
        "front": "Temperature scaling",
        "back": "softmax(z/T), one scalar T fitted by NLL on HELD-OUT data. T>1 softens an overconfident model. Monotone, so accuracy and ranking are EXACTLY unchanged (e.g. ECE 0.083 -> 0.012, accuracy identical)."
      },
      {
        "type": "intuition",
        "front": "Why modern nets are overconfident",
        "back": "Cross-entropy on HARD one-hot targets keeps rewarding larger logits long after the decision is settled. Guo et al.: the more accurate ResNet was far worse calibrated than the older LeNet."
      },
      {
        "type": "pitfall",
        "front": "Fit the calibrator on held-out data",
        "back": "On training data the model is already maximally confident, so T comes out ~1 and nothing changes. Also validate the calibrator on a THIRD split - fitting and evaluating on the same holdout is optimistic."
      },
      {
        "type": "definition",
        "front": "Temperature vs Platt vs isotonic",
        "back": "Temperature: 1 param, tiny data, uniform sharpening only. Platt: sigmoid, 2 params, works on any score (SVMs). Isotonic: ANY monotone map, best when the distortion has a shape - needs ~1000+ points or it overfits."
      },
      {
        "type": "definition",
        "front": "Aleatoric vs epistemic",
        "back": "Aleatoric = irreducible data noise (more data does not help; better FEATURES might). Epistemic = uncertainty about the model, high where data is sparse (more data DOES help) - the basis of active learning and OOD detection."
      },
      {
        "type": "intuition",
        "front": "Estimating epistemic uncertainty",
        "back": "You need a distribution over MODELS: deep ensembles (disagreement - strongest baseline), MC-dropout (cheap approximation), Bayesian NNs / Laplace, or a GP (exact). Total entropy = expected member entropy (aleatoric) + mutual information (epistemic)."
      },
      {
        "type": "pitfall",
        "front": "Calibration does not transfer or aggregate",
        "back": "It degrades under distribution shift FASTER than discrimination does, and aggregate calibration can hide subgroups whose errors cancel. Monitor ECE over time and per slice; recalibrate on a rolling window."
      }
    ],
    "refs": [
      {
        "title": "Guo et al. (2017), On Calibration of Modern Neural Networks",
        "url": "https://arxiv.org/abs/1706.04599"
      },
      {
        "title": "Niculescu-Mizil & Caruana (2005), Predicting Good Probabilities With Supervised Learning",
        "url": "https://www.cs.cornell.edu/~alexn/papers/calibration.icml05.crc.rev3.pdf"
      },
      {
        "title": "Ovadia et al. (2019), Can You Trust Your Model's Uncertainty? Evaluating Predictive Uncertainty Under Dataset Shift",
        "url": "https://arxiv.org/abs/1906.02530"
      },
      {
        "title": "Kendall & Gal (2017), What Uncertainties Do We Need in Bayesian Deep Learning for Computer Vision?",
        "url": "https://arxiv.org/abs/1703.04977"
      }
    ],
    "demos": [
      "calibration",
      "conformal",
      "mc-dropout"
    ],
    "demoTitles": {
      "calibration": "Model Calibration",
      "conformal": "Conformal Prediction",
      "mc-dropout": "MC Dropout"
    }
  }
};
