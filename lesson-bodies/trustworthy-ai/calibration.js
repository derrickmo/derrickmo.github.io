// GENERATED from content/lessons/trustworthy-ai/calibration.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/trustworthy-ai/calibration/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "calibration": {
    "level": "core",
    "body": {
      "intuition": [
        "A calibrated model's confidence means what it says: among the predictions it made at 80% confidence, 80% should be right. Accuracy and calibration are independent axes - a model can be accurate and wildly overconfident, or badly inaccurate and perfectly honest about it. If anything downstream consumes the probability rather than the argmax, calibration is the property that matters.",
        "Modern networks are systematically overconfident, and the fix is embarrassingly cheap. Temperature scaling divides the logits by ONE learned scalar before the softmax, fitted on a held-out split. In simulation that took ECE from 0.0874 to 0.0105 with T = 1.948, and accuracy was unchanged at 0.8274 to the last decimal - dividing by a positive constant is monotone, so the argmax cannot move.",
        "This module's thesis starts here: EVERY GUARANTEE IN IT IS TRUE AND NARROWER THAN ITS NAME. That ECE of 0.0105 is a real number, honestly computed, and it is an AVERAGE over a population you chose. Split it by subgroup and the minority group is overconfident by +15.3 points with an ECE of 0.1527, while the majority is UNDERconfident by -2.6 - two errors in opposite directions, partially cancelling into an excellent aggregate. Ask over what set the guarantee holds."
      ],
      "math": [
        {
          "h": "What calibration is, and what it is not",
          "paras": [
            "Perfect calibration is a statement about conditional frequencies. It is orthogonal to accuracy: a model that predicts the base rate for every input is perfectly calibrated and useless.",
            "This is why calibration is reported alongside a discrimination metric, never instead of one."
          ],
          "tex": "P\\big(\\hat{Y}=Y \\;\\big|\\; \\hat{P}=p\\big) = p \\quad \\forall p\\in[0,1], \\qquad \\mathrm{ECE}=\\sum_{b} \\frac{|B_b|}{n}\\Big|\\mathrm{acc}(B_b)-\\mathrm{conf}(B_b)\\Big|",
          "texNote": "The constant predictor achieves ECE = 0 with zero discriminative value. Calibration and accuracy are separate axes, and shipping only one of them is how a useless model passes review."
        },
        {
          "h": "Temperature scaling: one parameter, no accuracy cost",
          "paras": [
            "Fit a single scalar on a held-out calibration split by minimizing negative log-likelihood, then divide the logits by it at inference.",
            "Because division by a positive constant preserves the ordering of logits, every predicted label is identical before and after. You are only changing how confident the model claims to be."
          ],
          "tex": "\\hat{p}_i = \\mathrm{softmax}(z_i/T), \\qquad T^{*} = \\arg\\min_T -\\!\\sum_{i\\in\\text{cal}} \\log \\hat{p}_{i,y_i}, \\qquad T^{*}=1.948",
          "texNote": "Measured: ECE 0.0874 to 0.0105, mean confidence 0.9148 to 0.8244, accuracy 0.8274 unchanged. T > 1 means the network was overconfident, which is the normal finding for a modern network trained to low training loss."
        },
        {
          "h": "The aggregate hides the subgroup",
          "paras": [
            "One global temperature is fitted to minimize loss over the whole calibration set, so it lands wherever the majority pulls it. Nothing forces it to be right anywhere in particular."
          ],
          "tex": "\\begin{array}{lrrrr} & n & \\text{acc} & \\text{conf} & \\text{ECE}\\\\ \\text{majority} & 17{,}647 & 0.8693 & 0.8438 & 0.0265\\\\ \\text{minority} & 2{,}353 & 0.5397 & 0.6925 & \\mathbf{0.1527}\\\\ \\text{OVERALL} & 20{,}000 & 0.8306 & 0.8260 & \\mathbf{0.0105} \\end{array}",
          "texNote": "The minority is overconfident by +15.3 points and the majority underconfident by 2.6. Fitting a temperature per group gives T = 1.695 and T = 3.411 and drives both ECEs under 0.015 - which is a policy decision about using group membership at inference, not a statistical one."
        }
      ],
      "code": [
        {
          "h": "Temperature scaling in full",
          "paras": [
            "The entire method. It needs a held-out split, and fitting it on the training set is the one way to get this wrong."
          ],
          "code": "# fit on a HELD-OUT calibration split (never train, never test)\ndef nll(T):\n    p = softmax(logits_cal / T)\n    return -np.log(p[np.arange(n), y_cal]).mean()\nT = minimize_scalar(nll, bounds=(0.05, 10), method='bounded').x   # 1.948\n\nprobs = softmax(logits_test / T)\n\n# BEFORE   acc 0.8274   mean conf 0.9148   ECE 0.0874\n# AFTER    acc 0.8274   mean conf 0.8244   ECE 0.0105\n#          ^^^^^^^^^^ identical: T > 0 is monotone, argmax invariant\n\n# ★ T > 1  -> the network was OVERCONFIDENT (the usual finding)\n#   T < 1  -> underconfident; check for label noise or heavy regularization",
          "caption": "One parameter, one held-out split, and an 8x reduction in ECE. It is the highest value-per-line change available in this module."
        },
        {
          "h": "★ ECE has a free parameter, and people compare across it",
          "paras": [
            "The number everyone quotes depends on a binning scheme that is almost never reported."
          ],
          "code": "#  bins    ECE\n#     5   0.0091\n#    10   0.0093\n#    15   0.0105\n#    30   0.0124\n#    50   0.0146\n#   100   0.0183     <- 2x the 5-bin value, same model, same data\n\n# more bins -> fewer samples per bin -> noise inflates the |acc - conf| gap,\n# so ECE is biased UPWARD by bin count and downward by too-coarse binning.\n\n# WHAT TO DO\n#   * fix and REPORT the binning scheme, or use equal-MASS bins\n#   * prefer a proper scoring rule with no free parameter: Brier, NLL\n#   * plot the reliability diagram - it shows the SHAPE, which a scalar hides",
          "caption": "A metric with an unreported free parameter that moves it 2x is not comparable across papers, and ECE is quoted across papers constantly."
        }
      ],
      "useCases": [
        "Anything that thresholds a probability against a cost - fraud review queues, medical triage, content moderation escalation - where the threshold is only meaningful if the probability is.",
        "Selective prediction and abstention, where the model defers to a human below a confidence cutoff and an overconfident model simply never defers.",
        "Ensembling and cascades, where a cheap model's confidence decides whether to invoke an expensive one, so miscalibration directly buys the wrong compute.",
        "Any pipeline where a downstream system multiplies or compares probabilities across models, since uncalibrated scores are not on a common scale."
      ],
      "pitfalls": [
        "Reporting aggregate ECE as a calibration guarantee. Overall ECE was 0.0105 while the minority subgroup sat at 0.1527 with a +15.3 point overconfidence gap.",
        "Comparing ECE values across papers without matching the binning. The same predictions gave 0.0091 at 5 bins and 0.0183 at 100 - a factor of 2 from an unreported choice.",
        "Fitting the temperature on the training set. Training logits are already overfitted, so the fitted T is far too close to 1 and the calibration does not transfer.",
        "Expecting temperature scaling to change accuracy. It cannot - it is monotone - so a report claiming both is a report of a bug.",
        "Treating calibration as a substitute for accuracy. A constant predictor is perfectly calibrated; always report a discrimination metric alongside.",
        "Calibrating once and never rechecking. Calibration is a property of the model AND the input distribution, so it decays under drift while accuracy may not visibly move.",
        "Reaching for per-group temperatures without noticing it requires group membership at inference time, which is a legal and product decision rather than a modelling one."
      ],
      "connections": [
        {
          "ref": "ml-theory/calibration",
          "text": "The core treatment - reliability diagrams, Platt scaling, isotonic regression - which this lesson assumes and extends into the subgroup and fairness question."
        },
        {
          "ref": "trustworthy-ai/conformal-prediction",
          "text": "The alternative that gives a coverage guarantee without needing the probabilities to be right, and which turns out to have exactly the same marginal-versus-conditional gap."
        },
        {
          "ref": "trustworthy-ai/fairness",
          "text": "Where per-group calibration stops being a statistical choice: calibration within groups is one leg of an impossibility result once base rates differ."
        },
        {
          "ref": "trustworthy-ai/distribution-shift",
          "text": "Why a calibration fitted once decays - the temperature is tuned to a distribution, and shift moves confidence before it moves accuracy."
        },
        {
          "ref": "llm-systems/llm-eval",
          "text": "The same problem for generative models, where token probabilities are poorly calibrated to answer correctness and verbalized confidence is worse."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Define calibration.",
          "a": "P(correct | confidence = p) = p for all p. Among predictions made at 80% confidence, 80% should be right."
        },
        {
          "q": "Is a calibrated model an accurate one?",
          "a": "No — independent axes. A constant base-rate predictor is perfectly calibrated and useless. Always report a discrimination metric too."
        },
        {
          "q": "What is temperature scaling?",
          "a": "Divide logits by a single scalar T fitted on a held-out split by minimizing NLL, then softmax."
        },
        {
          "q": "Why can't it change accuracy?",
          "a": "Division by a positive constant is monotone, so the argmax is invariant. Measured: 0.8274 before and after."
        },
        {
          "q": "Give the measured effect.",
          "a": "T = 1.948 took ECE from 0.0874 to 0.0105 and mean confidence from 0.9148 to 0.8244, accuracy unchanged."
        },
        {
          "q": "What does T > 1 tell you?",
          "a": "The network was overconfident — the normal finding for a modern net trained to low training loss. T < 1 suggests label noise or heavy regularization."
        },
        {
          "q": "Write ECE.",
          "a": "Σ_b (|B_b|/n)·|acc(B_b) − conf(B_b)| over confidence bins."
        },
        {
          "q": "★ What is ECE's hidden free parameter?",
          "a": "The bin count. Same predictions: 0.0091 at 5 bins, 0.0183 at 100 — a 2× swing that is almost never reported."
        },
        {
          "q": "Aggregate ECE 0.0105. Is the model calibrated?",
          "a": "For the population you averaged over. In the same run the minority subgroup had ECE 0.1527 and a +15.3pt overconfidence gap."
        },
        {
          "q": "Why did the aggregate look so good?",
          "a": "Opposite-signed errors cancel: minority +0.1527, majority −0.0256. An average over signed-then-absoluted subgroup errors hides both."
        },
        {
          "q": "Fix for the subgroup gap?",
          "a": "Per-group temperatures (T = 1.695 vs 3.411 here). Note that requires group membership at inference — a policy decision, not a statistical one."
        },
        {
          "q": "Where do you fit the temperature?",
          "a": "A held-out calibration split. Fitting on training logits gives T ≈ 1 because they're already overfitted, and it does not transfer."
        }
      ],
      "standard": [
        {
          "q": "Explain calibration and temperature scaling, and why the method is so cheap.",
          "a": "CALIBRATION IS A CLAIM ABOUT CONDITIONAL FREQUENCIES: among predictions made at confidence p, a fraction p should be correct. It is orthogonal to accuracy — a model that outputs the base rate for every input is perfectly calibrated and has no discriminative value, which is why calibration is always reported alongside a discrimination metric rather than instead of one. It matters whenever anything downstream consumes the PROBABILITY rather than the argmax: a cost-based threshold, an abstention rule, a cascade that decides whether to call an expensive model. TEMPERATURE SCALING IS ONE SCALAR. Fit T on a held-out calibration split by minimizing negative log-likelihood, then divide logits by T before the softmax at inference. Measured: T = 1.948 took ECE from 0.0874 to 0.0105, an eightfold reduction, with mean confidence dropping 0.9148 to 0.8244. ACCURACY WAS UNCHANGED AT 0.8274 TO FOUR DECIMALS, and it must be — division by a positive constant is monotone, so no argmax can move. That is why it is cheap and safe: it cannot damage the metric anyone is being held to, it needs one held-out split, and it is a single line at inference. T > 1 means the network was overconfident, which is the standard finding for modern nets trained to near-zero training loss.",
          "deepDive": {
            "q": "Why is the overconfidence systematic rather than incidental?",
            "a": "The reason overconfidence is systematic is worth knowing. Networks are trained with cross-entropy to convergence, and long after accuracy saturates the loss keeps rewarding pushing correct-class logits higher; capacity, batch norm and weak weight decay all amplify this. So the ordering of logits is good — accuracy is fine — while their SCALE is inflated, which is exactly the failure a single temperature repairs. That also explains why one parameter suffices: the defect is a global scale error rather than a per-class distortion. When one parameter is not enough, the ladder is vector scaling (per-class temperature), Platt scaling, and isotonic regression, in increasing flexibility and increasing calibration-set requirements — isotonic in particular will overfit a small split badly. Two practical cautions. First, temperature must be fitted on data the model did not train on, since training logits are already overfitted and yield T near 1 that does not transfer. Second, calibration is a joint property of the model AND the input distribution, so a temperature fitted in June is not valid in December under drift — and confidence typically degrades before accuracy visibly does, which makes calibration a useful early-warning signal."
          }
        },
        {
          "q": "Your model reports ECE of 0.01. What questions do you ask?",
          "a": "TWO, AND BOTH USUALLY CHANGE THE ANSWER. FIRST: OVER WHAT POPULATION? ECE is an average, and averages hide opposite-signed errors. In simulation, an overall ECE of 0.0105 decomposed into a majority group at 0.0265 that was UNDERconfident by 2.6 points and a minority group at 0.1527 that was OVERconfident by 15.3 points. The global temperature was fitted to minimize loss over the whole calibration set, so it landed where the majority pulled it, and nothing forced it to be right for the 12% subgroup. If the deployed decision is per-user, the aggregate number is describing a population that no individual belongs to. SECOND: WHAT BINNING? ECE has a free parameter that is almost never reported, and it moves the number materially — the same predictions gave 0.0091 at 5 bins, 0.0105 at 15, and 0.0183 at 100. More bins means fewer samples per bin, so noise inflates the |acc − conf| gap and ECE is biased upward by bin count. That makes cross-paper ECE comparisons close to meaningless unless the scheme matches. WHAT I WOULD ASK FOR INSTEAD is a reliability diagram, which shows the shape a scalar collapses, per-subgroup calibration for whatever slices matter, and a proper scoring rule — Brier or NLL — which has no free parameter and cannot be gamed by binning.",
          "deepDive": {
            "q": "Why does the bin count change the answer at all?",
            "a": "The binning bias has a clean intuition worth carrying: ECE estimates an expectation of |acc − conf| and the absolute value makes finite-sample noise strictly increase the estimate, so ECE is a biased estimator whose bias grows with bin count. Equal-mass binning helps because it puts comparable sample counts in each bin rather than leaving the sparse high-confidence bins to dominate, and debiased or kernel-based estimators exist. The deeper point is the one that recurs throughout this module: the metric is genuinely measuring something, and the something is narrower than the name suggests. 'Calibrated' with no qualifier gets read as a per-prediction property, when it is a population average — and the population is whatever your evaluation set happened to be. The strongest version of the property, per-input calibration, is unattainable, since you never see the same input twice. What is attainable and worth asking for is calibration within the slices your decisions actually partition on: subgroup, class, confidence band, and deployment segment."
          }
        },
        {
          "q": "How would you fix the subgroup calibration gap, and what does the fix cost?",
          "a": "THE DIRECT FIX IS A PER-GROUP TEMPERATURE, and it works cleanly: fitting separately gave T = 1.695 for the majority and T = 3.411 for the minority, driving both ECEs under 0.015 and both confidence-accuracy gaps under 0.003. The minority needed twice the temperature because the model's evidence there was genuinely weaker — accuracy 0.5397 against 0.8693 — so its logits needed to be flattened far more to tell the truth. THE COST IS THAT THIS REQUIRES GROUP MEMBERSHIP AT INFERENCE TIME, which converts a modelling change into a policy and legal question. In several jurisdictions and domains, using a protected attribute in the decision path is restricted or prohibited, and the fact that here it is used to make the model MORE honest rather than to change who gets selected is a distinction the statute may not draw. So this needs a decision from outside engineering, and presenting it as a technical fix is a mistake. THE ALTERNATIVES ARE WORSE OR SLOWER. Calibrating on non-protected proxies that correlate with the group recovers some of the benefit and reintroduces the proxy-discrimination question. Fixing the underlying accuracy gap — more data, better features, or a model with capacity for the minority distribution — is the honest long-run answer and does not help this quarter. Reporting per-group calibration WITHOUT acting on it is at minimum better than reporting the aggregate alone.",
          "deepDive": {
            "q": "What does 'fixing' the subgroup gap actually mean here?",
            "a": "There is a subtler framing worth raising, because it changes what 'fix' means. The minority group's problem is not really calibration — it is that the model knows less about them, with accuracy 0.5397 against 0.8693. Per-group temperature makes the model honest about that gap, which is genuinely valuable: an honest 0.55 confidence lets a downstream system abstain, escalate to a human, or collect more data, whereas a dishonest 0.85 silently pushes bad decisions through. So the calibration fix does not close the performance gap and should never be reported as if it had; what it does is make the gap VISIBLE to every downstream consumer instead of hidden. That is the right way to present it to a product owner. It also connects to the next lessons: conformal prediction turns that honesty into larger prediction sets for the harder group, which is the same information in a form a decision rule can consume, and the fairness lesson shows that once base rates differ, per-group calibration becomes one leg of a genuine impossibility rather than a free improvement."
          }
        },
        {
          "q": "When does calibration matter more than accuracy, and when does it not matter at all?",
          "a": "IT MATTERS EXACTLY WHEN SOMETHING CONSUMES THE PROBABILITY RATHER THAN THE ARGMAX. Cost-sensitive thresholding is the clearest case: if you review a transaction when expected loss exceeds review cost, the threshold is derived from the probability, so a model overconfident by 15 points sends the wrong volume to review and the operating point you chose is not the one you got. Selective prediction is another — an abstention rule that defers below 0.7 confidence never fires on an overconfident model, so the safety mechanism is silently disabled. Cascades have the same structure, since a cheap model's confidence decides whether to spend on the expensive one, and miscalibration buys the wrong compute. Anywhere probabilities from different models are compared or multiplied, they must be on a common scale, and uncalibrated scores are not. IT DOES NOT MATTER when only the ranking is consumed. If you always act on the top-1 label, or you rank items and take the top k, or your metric is AUC, then any monotone transform of the score is irrelevant and temperature scaling is a no-op by construction. THE TRAP IS THAT MOST SYSTEMS START IN THE SECOND CATEGORY AND DRIFT INTO THE FIRST, because someone eventually wires a threshold to the score without anyone re-examining whether it means anything.",
          "deepDive": {
            "q": "How often is 'we only need the ranking' actually true?",
            "a": "Worth adding that ranking-only is rarer than teams assume once you look at the whole pipeline. A recommender may rank, but the blending layer above it often combines scores from several models additively, which requires a shared scale. A classifier may be argmax-only, but a monitoring dashboard tracking mean confidence as a health signal is consuming the probability, and the alert threshold is calibration-dependent. Human-facing confidence is the sharpest case: showing a user '92% confident' creates an expectation that is a calibration claim, and getting it wrong damages trust in a way that is hard to recover, which is why many products show a coarse three-level indicator instead of a number. For LLMs the situation is worse than for classifiers — token probabilities are a poor proxy for answer correctness, verbalized confidence is worse and heavily anchored to phrasing, and the useful signals tend to be sampling-based, such as agreement across samples. That is a genuinely open area and it is worth saying so rather than implying the classifier machinery transfers."
          }
        },
        {
          "q": "What is the relationship between calibration and uncertainty estimation more broadly?",
          "a": "CALIBRATION IS A PROPERTY YOU CHECK; UNCERTAINTY ESTIMATION IS A SET OF METHODS THAT MAY OR MAY NOT ACHIEVE IT. The standard decomposition is aleatoric uncertainty — irreducible noise in the data, where the true label genuinely is not determined by the input — versus epistemic uncertainty, which is the model's ignorance and shrinks with more data. A softmax probability conflates them, and temperature scaling adjusts their sum without separating them. That distinction is what makes the difference operationally: aleatoric uncertainty tells you to abstain or change the input pipeline, while epistemic uncertainty tells you to collect data in that region, and the two demand different actions. THE METHODS TRADE COST AGAINST HONESTY. Deep ensembles are the strongest practical option and cost k times the training and inference. MC dropout is much cheaper and gives a weaker, sometimes poorly-calibrated approximation. Bayesian last layers are cheap and only capture uncertainty in the head. Evidential methods predict distribution parameters directly and are sensitive to their regularization. AND ALL OF THEM STILL NEED CHECKING, because none of these methods guarantees calibration — you fit them and then measure ECE, a reliability diagram, and per-subgroup calibration exactly as you would for a plain softmax.",
          "deepDive": {
            "q": "What do the more expensive uncertainty methods really buy?",
            "a": "The property most of these methods actually buy is not calibration in-distribution — temperature scaling already handles that for a single model at a fraction of the cost — but better behaviour OUT of distribution, where a single softmax remains confidently wrong and an ensemble's members disagree. That disagreement is the signal, and it is why ensembles remain the practical default despite the cost. The honest limitation is that ensembles trained on the same data with the same architecture share the same blind spots, so they under-report uncertainty on exactly the shifts that arise from a systematic gap in the training distribution — the failure they are most needed for. Which is the module's thesis again, in a new costume: the uncertainty estimate is real, and its guarantee holds over the distribution the ensemble members disagree about, not over everything you might see. The next lesson's approach is the interesting contrast, since conformal prediction sidesteps the whole question of whether probabilities are right and delivers a coverage guarantee from exchangeability alone — and then turns out to have its own marginal-versus-conditional gap of exactly the shape we found here."
          }
        },
        {
          "q": "How does this lesson set up the module's thesis?",
          "a": "IT IS THE FIRST INSTANCE OF THE PATTERN: EVERY GUARANTEE IN THIS MODULE IS TRUE, AND NARROWER THAN ITS NAME. The ECE of 0.0105 after temperature scaling is not a lie, a bug, or a bad measurement — it is an honestly computed average over the evaluation population, and it is a real improvement from 0.0874. What it is not is the claim that gets made from it, namely that the model's confidence can be trusted. Split the same predictions by subgroup and the minority is overconfident by 15.3 points at ECE 0.1527. Change the bin count and the headline number doubles. NEITHER OF THOSE IS A FAILURE OF THE METHOD; both are the guarantee being read over a wider set than the one it was computed on. THAT IS THE DIFFERENCE FROM THE CAUSAL MODULE, which is worth stating because the two look similar. There, the deciding fact was genuinely absent from the data and no diagnostic could recover it. Here everything is measurable — you can compute per-subgroup ECE in three lines — and the failure is a scope substitution: a number computed over one reference class, quoted about another. So the transferable question for this module is OVER WHAT SET DOES THIS HOLD, AND IS THAT THE SET I CARE ABOUT, and the answer is almost always available if you ask.",
          "deepDive": {
            "q": "Why phrase the question that way?",
            "a": "The reason to state the question that way is that it produces an action rather than a warning. For calibration it means reporting per-slice ECE alongside the aggregate, with slices chosen from the decision boundaries that matter — subgroup, class, confidence band, deployment segment. For conformal prediction, the next lesson, the same question yields per-class and per-group coverage, which turn out to span 0.727 to 0.990 while the marginal guarantee is exactly 0.902. For certified robustness it yields the threat model and the norm ball. For a red-team suite it yields the coverage of the attack space you actually tested. In each case the practice is the same: identify the reference class the number was computed over, identify the reference class the decision is made over, and if they differ, either recompute or say so plainly in the writeup. It is a cheap habit and it catches the most common way trustworthy-AI work misleads — not by producing wrong numbers, but by producing right numbers about the wrong population."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "★ The module's thesis",
        "back": "EVERY GUARANTEE HERE IS TRUE, AND NARROWER THAN ITS NAME. The failures are scope substitutions, not false claims. Transferable question: *over what set does this hold, and is that the set I care about?*"
      },
      {
        "type": "definition",
        "front": "Calibration",
        "back": "P(correct | confidence = p) = p for all p. ORTHOGONAL to accuracy — a constant base-rate predictor is perfectly calibrated and useless. Always report a discrimination metric alongside."
      },
      {
        "type": "formula",
        "front": "Temperature scaling",
        "back": "p̂ = softmax(z/T), T fitted on a HELD-OUT split by minimizing NLL. Measured: T=1.948 took ECE 0.0874 → 0.0105 with accuracy unchanged at 0.8274 (division by T>0 is monotone)."
      },
      {
        "type": "intuition",
        "front": "What does T > 1 tell you?",
        "back": "The network was overconfident — the normal finding, because cross-entropy keeps rewarding higher correct-class logits long after accuracy saturates. T < 1 suggests label noise or heavy regularization."
      },
      {
        "type": "pitfall",
        "front": "★ Aggregate ECE hides the subgroup",
        "back": "Overall 0.0105. Minority: ECE 0.1527, **+15.3pt overconfident**. Majority: 0.0265, −2.6pt UNDERconfident. Opposite-signed errors partially cancel into an excellent-looking average."
      },
      {
        "type": "pitfall",
        "front": "★ ECE's unreported free parameter",
        "back": "Bin count. Same predictions: 5 bins → 0.0091, 15 → 0.0105, 100 → 0.0183. Biased UPWARD by bin count (noise inflates |acc−conf|). Cross-paper ECE comparison is near-meaningless without the scheme."
      },
      {
        "type": "definition",
        "front": "Per-group temperature",
        "back": "T = 1.695 (majority) vs 3.411 (minority) drove both ECEs under 0.015. But it needs group membership AT INFERENCE — a legal/policy decision, not a modelling one."
      },
      {
        "type": "intuition",
        "front": "What per-group calibration does NOT fix",
        "back": "The accuracy gap (0.5397 vs 0.8693). It makes the gap HONEST and therefore VISIBLE to every downstream consumer — abstention, escalation, data collection — instead of hidden behind a confident 0.85."
      },
      {
        "type": "pitfall",
        "front": "Where do you fit T?",
        "back": "A held-out calibration split. Training logits are already overfitted → T ≈ 1 that doesn't transfer. Never train, never test."
      },
      {
        "type": "intuition",
        "front": "When does calibration matter?",
        "back": "Whenever something consumes the PROBABILITY: cost-based thresholds, abstention rules, cascades, cross-model score blending. Irrelevant under pure ranking/AUC — but systems drift from ranking into thresholding without anyone rechecking."
      },
      {
        "type": "definition",
        "front": "Aleatoric vs epistemic uncertainty",
        "back": "Irreducible data noise vs model ignorance. A softmax conflates them and temperature adjusts their SUM. Different actions: aleatoric → abstain; epistemic → collect data there."
      },
      {
        "type": "pitfall",
        "front": "What ensembles actually buy",
        "back": "Not in-distribution calibration (temperature does that at 1/k the cost) — better OOD behaviour via member disagreement. But members sharing data+architecture share blind spots, so they under-report exactly the shift they're needed for."
      }
    ],
    "refs": [
      {
        "title": "Guo, Pleiss, Sun & Weinberger (2017), On Calibration of Modern Neural Networks",
        "url": "https://proceedings.mlr.press/v70/guo17a.html"
      },
      {
        "title": "Niculescu-Mizil & Caruana (2005), Predicting Good Probabilities with Supervised Learning",
        "url": "https://www.cs.cornell.edu/~alexn/papers/calibration.icml05.crc.rev3.pdf"
      },
      {
        "title": "Ovadia et al. (2019), Can You Trust Your Model's Uncertainty? Evaluating Predictive Uncertainty Under Dataset Shift",
        "url": "https://arxiv.org/abs/1906.02530"
      },
      {
        "title": "Nixon et al. (2019), Measuring Calibration in Deep Learning (on ECE's estimator bias)",
        "url": "https://arxiv.org/abs/1904.01685"
      },
      {
        "title": "Lakshminarayanan, Pritzel & Blundell (2017), Simple and Scalable Predictive Uncertainty Estimation using Deep Ensembles",
        "url": "https://arxiv.org/abs/1612.01474"
      }
    ],
    "demos": [
      "calibration",
      "mc-dropout",
      "roc",
      "classification-metrics"
    ],
    "demoTitles": {
      "calibration": "Model Calibration",
      "mc-dropout": "MC Dropout",
      "roc": "ROC, PR & Thresholds",
      "classification-metrics": "Classification Metrics"
    }
  }
};
