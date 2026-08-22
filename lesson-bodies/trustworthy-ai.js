// GENERATED from content/lessons/trustworthy-ai/ by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// Store-authored lesson bodies for module "trustworthy-ai". Loaded by the lesson pages
// BEFORE lesson-app.jsx, which renders window.DM_LESSON_BODIES[lessonSlug].

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
          "deepDive": "The reason overconfidence is systematic is worth knowing. Networks are trained with cross-entropy to convergence, and long after accuracy saturates the loss keeps rewarding pushing correct-class logits higher; capacity, batch norm and weak weight decay all amplify this. So the ordering of logits is good — accuracy is fine — while their SCALE is inflated, which is exactly the failure a single temperature repairs. That also explains why one parameter suffices: the defect is a global scale error rather than a per-class distortion. When one parameter is not enough, the ladder is vector scaling (per-class temperature), Platt scaling, and isotonic regression, in increasing flexibility and increasing calibration-set requirements — isotonic in particular will overfit a small split badly. Two practical cautions. First, temperature must be fitted on data the model did not train on, since training logits are already overfitted and yield T near 1 that does not transfer. Second, calibration is a joint property of the model AND the input distribution, so a temperature fitted in June is not valid in December under drift — and confidence typically degrades before accuracy visibly does, which makes calibration a useful early-warning signal."
        },
        {
          "q": "Your model reports ECE of 0.01. What questions do you ask?",
          "a": "TWO, AND BOTH USUALLY CHANGE THE ANSWER. FIRST: OVER WHAT POPULATION? ECE is an average, and averages hide opposite-signed errors. In simulation, an overall ECE of 0.0105 decomposed into a majority group at 0.0265 that was UNDERconfident by 2.6 points and a minority group at 0.1527 that was OVERconfident by 15.3 points. The global temperature was fitted to minimize loss over the whole calibration set, so it landed where the majority pulled it, and nothing forced it to be right for the 12% subgroup. If the deployed decision is per-user, the aggregate number is describing a population that no individual belongs to. SECOND: WHAT BINNING? ECE has a free parameter that is almost never reported, and it moves the number materially — the same predictions gave 0.0091 at 5 bins, 0.0105 at 15, and 0.0183 at 100. More bins means fewer samples per bin, so noise inflates the |acc − conf| gap and ECE is biased upward by bin count. That makes cross-paper ECE comparisons close to meaningless unless the scheme matches. WHAT I WOULD ASK FOR INSTEAD is a reliability diagram, which shows the shape a scalar collapses, per-subgroup calibration for whatever slices matter, and a proper scoring rule — Brier or NLL — which has no free parameter and cannot be gamed by binning.",
          "deepDive": "The binning bias has a clean intuition worth carrying: ECE estimates an expectation of |acc − conf| and the absolute value makes finite-sample noise strictly increase the estimate, so ECE is a biased estimator whose bias grows with bin count. Equal-mass binning helps because it puts comparable sample counts in each bin rather than leaving the sparse high-confidence bins to dominate, and debiased or kernel-based estimators exist. The deeper point is the one that recurs throughout this module: the metric is genuinely measuring something, and the something is narrower than the name suggests. 'Calibrated' with no qualifier gets read as a per-prediction property, when it is a population average — and the population is whatever your evaluation set happened to be. The strongest version of the property, per-input calibration, is unattainable, since you never see the same input twice. What is attainable and worth asking for is calibration within the slices your decisions actually partition on: subgroup, class, confidence band, and deployment segment."
        },
        {
          "q": "How would you fix the subgroup calibration gap, and what does the fix cost?",
          "a": "THE DIRECT FIX IS A PER-GROUP TEMPERATURE, and it works cleanly: fitting separately gave T = 1.695 for the majority and T = 3.411 for the minority, driving both ECEs under 0.015 and both confidence-accuracy gaps under 0.003. The minority needed twice the temperature because the model's evidence there was genuinely weaker — accuracy 0.5397 against 0.8693 — so its logits needed to be flattened far more to tell the truth. THE COST IS THAT THIS REQUIRES GROUP MEMBERSHIP AT INFERENCE TIME, which converts a modelling change into a policy and legal question. In several jurisdictions and domains, using a protected attribute in the decision path is restricted or prohibited, and the fact that here it is used to make the model MORE honest rather than to change who gets selected is a distinction the statute may not draw. So this needs a decision from outside engineering, and presenting it as a technical fix is a mistake. THE ALTERNATIVES ARE WORSE OR SLOWER. Calibrating on non-protected proxies that correlate with the group recovers some of the benefit and reintroduces the proxy-discrimination question. Fixing the underlying accuracy gap — more data, better features, or a model with capacity for the minority distribution — is the honest long-run answer and does not help this quarter. Reporting per-group calibration WITHOUT acting on it is at minimum better than reporting the aggregate alone.",
          "deepDive": "There is a subtler framing worth raising, because it changes what 'fix' means. The minority group's problem is not really calibration — it is that the model knows less about them, with accuracy 0.5397 against 0.8693. Per-group temperature makes the model honest about that gap, which is genuinely valuable: an honest 0.55 confidence lets a downstream system abstain, escalate to a human, or collect more data, whereas a dishonest 0.85 silently pushes bad decisions through. So the calibration fix does not close the performance gap and should never be reported as if it had; what it does is make the gap VISIBLE to every downstream consumer instead of hidden. That is the right way to present it to a product owner. It also connects to the next lessons: conformal prediction turns that honesty into larger prediction sets for the harder group, which is the same information in a form a decision rule can consume, and the fairness lesson shows that once base rates differ, per-group calibration becomes one leg of a genuine impossibility rather than a free improvement."
        },
        {
          "q": "When does calibration matter more than accuracy, and when does it not matter at all?",
          "a": "IT MATTERS EXACTLY WHEN SOMETHING CONSUMES THE PROBABILITY RATHER THAN THE ARGMAX. Cost-sensitive thresholding is the clearest case: if you review a transaction when expected loss exceeds review cost, the threshold is derived from the probability, so a model overconfident by 15 points sends the wrong volume to review and the operating point you chose is not the one you got. Selective prediction is another — an abstention rule that defers below 0.7 confidence never fires on an overconfident model, so the safety mechanism is silently disabled. Cascades have the same structure, since a cheap model's confidence decides whether to spend on the expensive one, and miscalibration buys the wrong compute. Anywhere probabilities from different models are compared or multiplied, they must be on a common scale, and uncalibrated scores are not. IT DOES NOT MATTER when only the ranking is consumed. If you always act on the top-1 label, or you rank items and take the top k, or your metric is AUC, then any monotone transform of the score is irrelevant and temperature scaling is a no-op by construction. THE TRAP IS THAT MOST SYSTEMS START IN THE SECOND CATEGORY AND DRIFT INTO THE FIRST, because someone eventually wires a threshold to the score without anyone re-examining whether it means anything.",
          "deepDive": "Worth adding that ranking-only is rarer than teams assume once you look at the whole pipeline. A recommender may rank, but the blending layer above it often combines scores from several models additively, which requires a shared scale. A classifier may be argmax-only, but a monitoring dashboard tracking mean confidence as a health signal is consuming the probability, and the alert threshold is calibration-dependent. Human-facing confidence is the sharpest case: showing a user '92% confident' creates an expectation that is a calibration claim, and getting it wrong damages trust in a way that is hard to recover, which is why many products show a coarse three-level indicator instead of a number. For LLMs the situation is worse than for classifiers — token probabilities are a poor proxy for answer correctness, verbalized confidence is worse and heavily anchored to phrasing, and the useful signals tend to be sampling-based, such as agreement across samples. That is a genuinely open area and it is worth saying so rather than implying the classifier machinery transfers."
        },
        {
          "q": "What is the relationship between calibration and uncertainty estimation more broadly?",
          "a": "CALIBRATION IS A PROPERTY YOU CHECK; UNCERTAINTY ESTIMATION IS A SET OF METHODS THAT MAY OR MAY NOT ACHIEVE IT. The standard decomposition is aleatoric uncertainty — irreducible noise in the data, where the true label genuinely is not determined by the input — versus epistemic uncertainty, which is the model's ignorance and shrinks with more data. A softmax probability conflates them, and temperature scaling adjusts their sum without separating them. That distinction is what makes the difference operationally: aleatoric uncertainty tells you to abstain or change the input pipeline, while epistemic uncertainty tells you to collect data in that region, and the two demand different actions. THE METHODS TRADE COST AGAINST HONESTY. Deep ensembles are the strongest practical option and cost k times the training and inference. MC dropout is much cheaper and gives a weaker, sometimes poorly-calibrated approximation. Bayesian last layers are cheap and only capture uncertainty in the head. Evidential methods predict distribution parameters directly and are sensitive to their regularization. AND ALL OF THEM STILL NEED CHECKING, because none of these methods guarantees calibration — you fit them and then measure ECE, a reliability diagram, and per-subgroup calibration exactly as you would for a plain softmax.",
          "deepDive": "The property most of these methods actually buy is not calibration in-distribution — temperature scaling already handles that for a single model at a fraction of the cost — but better behaviour OUT of distribution, where a single softmax remains confidently wrong and an ensemble's members disagree. That disagreement is the signal, and it is why ensembles remain the practical default despite the cost. The honest limitation is that ensembles trained on the same data with the same architecture share the same blind spots, so they under-report uncertainty on exactly the shifts that arise from a systematic gap in the training distribution — the failure they are most needed for. Which is the module's thesis again, in a new costume: the uncertainty estimate is real, and its guarantee holds over the distribution the ensemble members disagree about, not over everything you might see. The next lesson's approach is the interesting contrast, since conformal prediction sidesteps the whole question of whether probabilities are right and delivers a coverage guarantee from exchangeability alone — and then turns out to have its own marginal-versus-conditional gap of exactly the shape we found here."
        },
        {
          "q": "How does this lesson set up the module's thesis?",
          "a": "IT IS THE FIRST INSTANCE OF THE PATTERN: EVERY GUARANTEE IN THIS MODULE IS TRUE, AND NARROWER THAN ITS NAME. The ECE of 0.0105 after temperature scaling is not a lie, a bug, or a bad measurement — it is an honestly computed average over the evaluation population, and it is a real improvement from 0.0874. What it is not is the claim that gets made from it, namely that the model's confidence can be trusted. Split the same predictions by subgroup and the minority is overconfident by 15.3 points at ECE 0.1527. Change the bin count and the headline number doubles. NEITHER OF THOSE IS A FAILURE OF THE METHOD; both are the guarantee being read over a wider set than the one it was computed on. THAT IS THE DIFFERENCE FROM THE CAUSAL MODULE, which is worth stating because the two look similar. There, the deciding fact was genuinely absent from the data and no diagnostic could recover it. Here everything is measurable — you can compute per-subgroup ECE in three lines — and the failure is a scope substitution: a number computed over one reference class, quoted about another. So the transferable question for this module is OVER WHAT SET DOES THIS HOLD, AND IS THAT THE SET I CARE ABOUT, and the answer is almost always available if you ask.",
          "deepDive": "The reason to state the question that way is that it produces an action rather than a warning. For calibration it means reporting per-slice ECE alongside the aggregate, with slices chosen from the decision boundaries that matter — subgroup, class, confidence band, deployment segment. For conformal prediction, the next lesson, the same question yields per-class and per-group coverage, which turn out to span 0.727 to 0.990 while the marginal guarantee is exactly 0.902. For certified robustness it yields the threat model and the norm ball. For a red-team suite it yields the coverage of the attack space you actually tested. In each case the practice is the same: identify the reference class the number was computed over, identify the reference class the decision is made over, and if they differ, either recompute or say so plainly in the writeup. It is a cheap habit and it catches the most common way trustworthy-AI work misleads — not by producing wrong numbers, but by producing right numbers about the wrong population."
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
    ]
  },
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
          "deepDive": "That qualifier is not a footnote, it is the whole practical story, and the numbers make it vivid. With ten classes of steadily increasing difficulty and one pooled threshold, marginal coverage was 0.9020 while per-class coverage ran from 0.7269 on the hardest to 0.9899 on the easiest, and the minority subgroup got 0.7734 against the majority's 0.9193. Nothing malfunctioned — a pooled quantile is a compromise that over-covers easy regions and under-covers hard ones, and by construction the average lands on target. Full conditional coverage, P(Y ∈ C(x) | X = x) ≥ 1 − α for every x, is provably unattainable without distributional assumptions in a distribution-free framework; that is a theorem, not an engineering gap. What IS attainable is coverage conditional on a partition you choose in advance, which is what Mondrian conformal does. So the design question becomes: which partition do my decisions actually run over — class, subgroup, region, time window — and can I afford a calibration sample in each cell? That reframes conformal from a black box that returns 90% into a tool where you specify the reference class, which is exactly the module's thesis."
        },
        {
          "q": "Your conformal predictor reports 90% coverage. What is your next question?",
          "a": "COVERAGE OVER WHAT, AND WHAT ARE THE SET SIZES. The first because the guarantee is marginal, so 90% is compatible with wildly unequal treatment of the parts you care about — in simulation, per-class coverage spanned 0.727 to 0.990 and the minority subgroup got 0.7734 while the headline was exactly 0.9020. If the deployment makes per-case decisions, and it does, then the aggregate describes a population no individual belongs to. So I would immediately compute coverage by class, by subgroup, and by any segment the product treats differently. THE SECOND QUESTION MATTERS MORE THAN PEOPLE EXPECT: coverage is PINNED at 1 − α by construction on exchangeable data, so it carries no information about how the model is doing — a random classifier achieves 90% coverage too, by returning almost every label. All the information is in set size. Measured: easy classes averaged 2.47 labels and hard classes 4.79, and the minority group averaged 4.63 against the majority's 3.61. THAT IS THE MONITORING SIGNAL. If mean set size drifts upward in production, the model is losing confidence in a way that coverage will never show, and it is observable without labels — which makes it one of the few genuinely useful unlabelled monitoring metrics available.",
          "deepDive": "Set size also converts directly into an operational number, which is what makes conformal easy to sell internally. If your policy is 'auto-resolve when the set is a singleton, otherwise send to a human', then the singleton rate IS your automation rate and the rest is your queue volume, both computable in advance from the calibration set at any α you choose. That turns the abstract coverage parameter into a staffing decision, and it lets you present a curve — automation rate against α — rather than asking a product owner to pick a confidence threshold whose meaning nobody can explain. Two operational details worth having ready. Empty sets occur when no label beats the threshold; they are genuinely informative, flagging an input unlike anything in calibration, and they will crash downstream code that assumes at least one label, so decide the policy before it happens. And with adaptive scores such as RAPS or APS the size distribution behaves better than with the naive 1 − p̂ score, which tends to produce a few very large sets; the choice of nonconformity score does not affect the coverage guarantee at all, only the sizes, which makes it a free design axis."
        },
        {
          "q": "How would you get class-conditional or group-conditional coverage, and what does it cost?",
          "a": "MONDRIAN CONFORMAL: compute a separate quantile within each cell of a partition you fix in advance. The guarantee then holds within each cell, because you are running an independent conformal procedure per cell. Measured: per-class quantiles tightened the coverage range from 0.727–0.990 down to 0.891–0.917, with marginal coverage essentially unchanged at 0.9024. THE SURPRISE WAS THE COST. I expected set size to grow, since conditional guarantees usually cost width. It SHRANK, from 3.736 to 3.286. The reason is that the pooled quantile is dominated by the hard classes — they contribute the largest nonconformity scores — so easy classes were being given needlessly large sets to satisfy a threshold set by someone else's difficulty. Splitting the quantile let the easy classes tighten more than the hard ones loosened. THAT IS NOT GUARANTEED IN GENERAL and depends on the difficulty spread, so it is worth measuring rather than assuming in either direction. THE REAL COST IS DATA: each cell needs its own calibration sample, and the finite-sample quantile requires ⌈(n+1)(1−α)⌉ ≤ n, so at α = 0.10 a cell is not even defined below n = 9, and is very noisy well above that.",
          "deepDive": "That data requirement is what makes the partition choice consequential rather than free. Conditioning on class is usually affordable; conditioning on class × subgroup × region quickly produces cells with a handful of points, and a quantile estimated from twelve scores is not delivering a meaningful guarantee even though the arithmetic runs. So the honest procedure is to pick the coarsest partition that matches the decisions you make, check the per-cell counts before committing, and pool cells that are too small while saying which ones you pooled. There is a middle path worth knowing: conditioning on a small number of difficulty BINS derived from the model's own score, rather than on semantic categories, gets much of the adaptivity with better-populated cells, and is closer to what adaptive scores like APS do implicitly. And where the partition is a protected attribute, the same caveat as per-group temperature scaling applies — equalizing coverage across groups requires group membership at inference, which is a policy decision, and it is the same structural choice the fairness lesson turns into an impossibility result."
        },
        {
          "q": "What breaks a conformal guarantee in production?",
          "a": "EXCHANGEABILITY, AND ALMOST NOTHING ELSE — which is both the strength and the danger. Applying a frozen threshold to test data progressively harder than calibration, coverage fell 0.9186 → 0.8998 → 0.8478 → 0.7524. THERE WAS NO ERROR, NO WARNING, AND NO OBSERVABLE SYMPTOM: the sets kept coming out the same size, because the threshold is fixed and the score distribution moved underneath it, so the only thing that changed was the truth-containment rate — which you cannot measure without labels, which is exactly what deployment lacks. THE COMMON CAUSES ARE MUNDANE. Temporal drift, since calibration data is from the past. A model retrain without recalibration, which invalidates every score. Reusing the calibration split for model selection or threshold tuning, which makes the split data-dependent and voids the guarantee. Feedback loops, where the system's own predictions change what data arrives. Selection, where only certain cases reach the model at test time. THE MITIGATIONS ARE PARTIAL. Weighted conformal reweights calibration scores by an estimated likelihood ratio, which handles covariate shift when the shift is estimable and does nothing for concept shift. Adaptive conformal updates α online from observed miscoverage, which is principled and requires labels to arrive eventually.",
          "deepDive": "Because the failure is unobservable without labels, the practical answer is monitoring proxies plus a labelling budget, and it is worth planning both at design time rather than after. The proxies: track the SCORE distribution on live traffic against the calibration distribution, since a shift there is directly the thing that breaks coverage and needs no labels; track mean set size, which moves under some shifts; and run a drift detector on the inputs, with the caveat from the drift lesson that covariate-shift detectors fire on harmless changes and miss concept shift. The labelling budget: a small random sample of production cases labelled continuously gives a direct coverage estimate, and the sample size needed is modest because you are estimating a proportion near 0.9 — a few hundred labels a week bounds coverage to a couple of points. That is a much better investment than an elaborate unlabelled monitoring stack, and it is the same recommendation as calibrating observational estimates against experimental truth in the causal module: a small amount of ground truth, collected continuously, is worth more than a large amount of inference about ground truth."
        },
        {
          "q": "Compare conformal prediction with calibration. When would you use each?",
          "a": "THEY ANSWER DIFFERENT QUESTIONS AND THE COMPARISON IS NOT ABOUT WHICH IS BETTER. Calibration makes the model's PROBABILITIES trustworthy, so any downstream consumer of the number — a cost-based threshold, an expected-value calculation, a cascade decision — gets something meaningful. It is cheap, requires no change to the output format, and gives an aggregate property with no per-prediction guarantee. Conformal changes the OUTPUT TYPE from a label to a set and attaches a per-prediction-set guarantee that holds without assuming the probabilities are right at all. USE CALIBRATION when downstream code needs a scalar probability, when the output format cannot change, or when you are computing expected costs. USE CONFORMAL when the consumer is a human or a routing rule that can act on a set, when you need a defensible coverage claim, or when the model is a black box you have no reason to trust — a third-party API, say, where conformal only needs a score and a calibration set. THEY COMPOSE WELL: calibrate first, then conform. Calibration does not affect the coverage guarantee, since conformal is invariant to monotone transforms of the score, but it improves the SET SIZES, because a better-ordered score separates plausible from implausible labels more sharply.",
          "deepDive": "The deeper commonality is the one this module keeps returning to: both deliver a real guarantee over a reference class, and both get quoted about a wider class than the one they hold on. Calibration's ECE was 0.0105 overall and 0.1527 for the minority; conformal's coverage was 0.9020 overall and 0.7734 for the same group. Same gap, same cause, two different formalisms — which is a good sign the pattern is structural rather than a quirk of either method. The practical difference is that conformal makes the gap easier to close, because Mondrian conditioning is a first-class part of the framework and costs only calibration data, whereas per-group calibration feels like a hack bolted on. It is also worth being clear about what neither one does: neither improves the model. Conformal on a weak model returns large sets, calibration on a weak model returns honest low confidences, and both are correctly reporting that the model does not know. Treating either as a fix rather than as instrumentation is the mistake, and the useful framing for a stakeholder is that they convert model weakness from something hidden into something the system can route around."
        },
        {
          "q": "How does this lesson advance the module's thesis?",
          "a": "IT IS THE STRONGEST POSSIBLE TEST OF IT. Conformal has the best guarantee in this module — finite-sample, distribution-free, model-agnostic, with no assumption that anything about the model is right. If any method were going to mean what its name suggests, it is this one. AND IT STILL HAS THE GAP. Coverage 0.9020 marginally; 0.727 to 0.990 by class; 0.7734 versus 0.9193 by subgroup. The word doing all the work is 'marginal', it is stated plainly in every paper, and it is dropped in essentially every summary. THE IMPORTANT PART IS THAT THIS IS NOT A DEFECT. Full conditional coverage is provably unattainable distribution-free, so marginality is not laziness — it is the price of requiring nothing of the model or the distribution. Every guarantee has a reference class, and the stronger the guarantee's other properties, the more likely the reference class is where the compromise lives. SO THE TRANSFERABLE QUESTION IS THE MODULE'S: over what set does this hold, and is it the set I care about? Here the answer is unusually actionable, because Mondrian conditioning lets you MOVE the reference class to a partition you choose — and the measured cost was zero set size, though it cost calibration data per cell.",
          "deepDive": "It is worth carrying the general shape of that argument, because it recurs outside this module. When a guarantee is strong along several axes at once — finite-sample, distribution-free, assumption-light — something has to give, and what gives is usually the SET the guarantee ranges over. Certified adversarial robustness in a later lesson has the identical structure: a genuine mathematical certificate, holding inside one norm ball, quoted as 'robust'. A red-team suite's clean report is a real result about the attacks you ran. A drift detector's silence is a real statement about the statistic you monitored. In every case the number is honest and the reference class is narrower than the noun. The habit that catches all of them is to read the guarantee's quantifier out loud — 'for a random test point drawn exchangeably with calibration' rather than 'for this patient' — and then ask whether the decision you are about to make is quantified the same way. When it is not, either move the reference class, as Mondrian does, or state the gap in the writeup. Both are cheap; neither is default."
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
    ]
  },
  "fairness": {
    "level": "core",
    "body": {
      "intuition": [
        "There is no fairness metric. There are about twenty, several are mutually incompatible by arithmetic, and choosing among them is a policy decision that cannot be delegated to an optimizer. That is not a gap in the literature waiting to be filled - it is a theorem, and knowing it is what separates useful work here from a compliance exercise.",
        "The condition that forces the conflict is unequal base rates, which is the normal case. In simulation with base rates of 0.20 and 0.45 and an equally informative signal in both groups, a within-group-calibrated score at a common threshold gives an FNR gap of +0.198 - group A's true positives are missed twice as often. Move A's threshold from 0.500 to 0.232 and the FNR gap goes to exactly 0.0000, while the PPV gap blows out from -0.061 to -0.231. THE SAME SCORE NOW MEANS DIFFERENT THINGS IN THE TWO GROUPS.",
        "Every option costs someone something specific, and the module's thesis applies exactly: each metric is a true statement about a narrow property. 'Equal opportunity' really equalizes false negatives. It does not equalize anything else, and the name does not tell you that. Ask which error the system should distribute equally, and make someone accountable answer."
      ],
      "math": [
        {
          "h": "The three families, and what each fixes",
          "paras": [
            "Independence ignores the label. Separation conditions on the true label. Sufficiency conditions on the prediction. They are three different conditional independences and they are the reason the metrics conflict."
          ],
          "tex": "\\text{independence: } \\hat{Y}\\perp A \\qquad \\text{separation: } \\hat{Y}\\perp A \\mid Y \\qquad \\text{sufficiency: } Y\\perp A\\mid \\hat{Y}",
          "texNote": "Demographic parity is independence. Equalized odds (and its one-sided form, equal opportunity) is separation. Calibration within groups is sufficiency. Any two of the three force the third to fail whenever base rates differ."
        },
        {
          "h": "The impossibility, as arithmetic",
          "paras": [
            "The identity below ties PPV, FNR, FPR and the base rate together. Fix any two of them equal across groups and the third is determined - and it cannot match, because the base rate does not.",
            "This is not an approximation or an empirical tendency. It is an algebraic constraint."
          ],
          "tex": "\\mathrm{FPR}=\\frac{p}{1-p}\\cdot\\frac{1-\\mathrm{PPV}}{\\mathrm{PPV}}\\cdot(1-\\mathrm{FNR}), \\qquad \\frac{p_A/(1-p_A)}{p_B/(1-p_B)} = 0.3034",
          "texNote": "With base rates 0.199 and 0.450 the odds ratio is 0.3034, so equalizing PPV and FNR forces FPR to differ by that factor. No loss function, architecture or amount of data changes this."
        },
        {
          "h": "The three policies, measured on the same score",
          "paras": [
            "One equally-informative, within-group-calibrated score. Only the thresholds differ."
          ],
          "tex": "\\begin{array}{lrrrr} \\text{policy} & \\Delta\\text{sel} & \\Delta\\text{FNR} & \\Delta\\text{FPR} & \\Delta\\text{PPV}\\\\ \\text{common threshold }0.5 & -0.283 & \\mathbf{+0.198} & -0.091 & -0.061\\\\ \\text{equal opportunity} & -0.172 & \\mathbf{0.000} & -0.002 & \\mathbf{-0.231}\\\\ \\text{demographic parity} & \\mathbf{0.000} & -0.187 & +0.152 & \\mathbf{-0.392} \\end{array}",
          "texNote": "Every row zeroes exactly one column and pays in the others. Equal opportunity needed A's threshold at 0.2323 against B's 0.5000; demographic parity needed 0.1332 against 0.6714. The score is identical throughout."
        }
      ],
      "code": [
        {
          "h": "Group-blindness is not neutrality",
          "paras": [
            "Dropping the protected attribute does not remove its influence; it removes your ability to see it."
          ],
          "code": "# A score built WITHOUT the group attribute, from an equally\n# informative signal, on groups with base rates 0.20 vs 0.45:\n\n#   score bucket    P(Y=1 | A)   P(Y=1 | B)\n#     [0.4, 0.6)      0.2049       0.4456     <- same score, 2.2x the risk\n\n# ★ A group-blind score CANNOT be calibrated within both groups when base\n#   rates differ, because the same evidence implies different posteriors.\n#   'We don't use the attribute' is a statement about the FEATURE LIST,\n#   not about the model's behaviour - proxies carry it anyway.\n\n# The within-group-calibrated score used in the rest of this lesson USES\n# the group's base rate. That is the only way sufficiency can hold, and it\n# is exactly what several legal regimes restrict.",
          "caption": "The choice is not between using the attribute and not using it. It is between using it explicitly and having proxies use it invisibly."
        },
        {
          "h": "What each policy costs, in one place",
          "paras": [
            "Stated as who is harmed, because that is the form a decision-maker can act on."
          ],
          "code": "# DEMOGRAPHIC PARITY   equal selection rates\n#   pays: error rates diverge (FPR gap +0.152, PPV gap -0.392)\n#   harms: qualified members of the higher-base-rate group, rejected to\n#          hold the quota; and everyone relying on the score's meaning\n\n# EQUALIZED ODDS       equal TPR and FPR\n#   pays: sufficiency - PPV gap -0.231, so the SAME SCORE means different\n#          things by group\n#   harms: downstream users reading the score as a probability\n\n# CALIBRATION          the score means one thing everywhere\n#   pays: selection and error rates differ (FNR gap +0.198)\n#   harms: the lower-base-rate group, whose true positives are missed\n#          about twice as often\n\n# ★ There is no row with no cost. Picking one is choosing whom to fail.",
          "caption": "The deliverable from a fairness analysis is this table plus a named owner for the choice, not a single number that went green."
        }
      ],
      "useCases": [
        "Lending, hiring, admissions, insurance and criminal justice, where the metric choice is often constrained by statute and the engineering job is to surface the trade-off rather than resolve it.",
        "Content moderation and abuse detection, where FNR parity (equal protection from harm) and FPR parity (equal freedom from wrongful action) are both defensible and cannot both hold.",
        "Medical triage models, where base rates differ across populations for real clinical reasons and calibration is usually the property clinicians rely on.",
        "Any model with a subgroup accuracy gap, where the fairness question begins before the metric choice - a model that knows less about a group harms them under every parity definition."
      ],
      "pitfalls": [
        "Looking for the right fairness metric. Independence, separation and sufficiency conflict by arithmetic when base rates differ; the odds-ratio factor here was 0.3034 and no method removes it.",
        "Treating group-blindness as neutrality. A score built without the attribute gave P(Y=1) of 0.2049 and 0.4456 in the same score bucket - the attribute's influence survives via proxies while your ability to measure it does not.",
        "Reporting one parity metric as 'the model is fair'. Equal opportunity zeroed the FNR gap and moved the PPV gap to -0.231; the headline is true and radically incomplete.",
        "Assuming the base-rate difference is itself neutral. It often reflects historical measurement and access, so equalizing on a biased label equalizes with respect to the bias.",
        "Optimizing a fairness constraint into the loss without deciding the policy first. The optimizer will satisfy whatever you wrote, including a metric nobody would have chosen deliberately.",
        "Ignoring that per-group thresholds require the attribute at inference - the same legal constraint that blocks per-group calibration, and one engineering cannot resolve alone.",
        "Evaluating fairness only at the model, when the harm is usually produced by the surrounding process - who is measured, who appeals, and what happens after a positive."
      ],
      "connections": [
        {
          "ref": "trustworthy-ai/calibration",
          "text": "Sufficiency is calibration within groups, so the per-group temperature question from that lesson is one leg of this impossibility rather than a free improvement."
        },
        {
          "ref": "trustworthy-ai/conformal-prediction",
          "text": "The same parity choice in coverage form: minority coverage 0.7734 against 0.9193, and Mondrian conditioning is the equalizing move with the same policy cost."
        },
        {
          "ref": "causal-inference/confounding",
          "text": "Why the mediator-versus-confounder distinction becomes legal here - path-specific effects decide which routes from a protected attribute to an outcome count as discrimination."
        },
        {
          "ref": "causal-inference/potential-outcomes",
          "text": "The counterfactual framing of fairness - would this decision change if the attribute changed - and why it needs a causal model that the data cannot supply."
        },
        {
          "ref": "trustworthy-ai/alignment-governance",
          "text": "Where the unresolvable choice belongs: an accountable owner, a documented rationale, and a review process rather than a threshold in a config file."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Name the three families of fairness criteria.",
          "a": "Independence (Ŷ ⫫ A), separation (Ŷ ⫫ A | Y), sufficiency (Y ⫫ A | Ŷ). Demographic parity, equalized odds, and calibration-within-groups respectively."
        },
        {
          "q": "State the impossibility result.",
          "a": "When base rates differ, calibration within groups, equal FPR and equal FNR cannot all hold. Chouldechova 2017; Kleinberg–Mullainathan–Raghavan 2016."
        },
        {
          "q": "Why? Give the identity.",
          "a": "FPR = (p/(1−p))·((1−PPV)/PPV)·(1−FNR). Fix PPV and FNR equal; p differs, so FPR is forced to differ."
        },
        {
          "q": "Give the measured odds ratio.",
          "a": "Base rates 0.199 vs 0.450 → (p/(1−p)) ratio = 0.3034. That factor is the size of the forced gap."
        },
        {
          "q": "Common threshold 0.5 on a within-group-calibrated score — what's the gap?",
          "a": "FNR gap +0.198 (group A's positives missed ~2× as often), FPR gap −0.091, PPV gap −0.061."
        },
        {
          "q": "What does equal opportunity cost here?",
          "a": "A's threshold moves 0.500 → 0.2323, FNR gap → 0.0000, and the PPV gap blows out to −0.231. The same score now means different things by group."
        },
        {
          "q": "What does demographic parity cost?",
          "a": "Thresholds 0.1332 vs 0.6714; selection equal; FNR gap −0.187, FPR gap +0.152, PPV gap −0.392."
        },
        {
          "q": "★ Is group-blindness neutral?",
          "a": "No. A blind score gave P(Y=1) = 0.2049 vs 0.4456 in the SAME score bucket. It removes your ability to measure the effect, not the effect."
        },
        {
          "q": "Can a group-blind score be calibrated within both groups?",
          "a": "Not when base rates differ — the same evidence implies different posteriors. Sufficiency requires using the base rate, which is what several legal regimes restrict."
        },
        {
          "q": "Is the base-rate difference itself neutral?",
          "a": "Usually not. It often reflects historical measurement and access, so equalizing against a biased label equalizes with respect to the bias."
        },
        {
          "q": "Can you optimize your way out?",
          "a": "No. It is algebra, not an optimization gap. No loss, architecture, or volume of data removes a constraint on the confusion matrix."
        },
        {
          "q": "What is the deliverable from a fairness analysis?",
          "a": "The trade-off table plus a NAMED OWNER for the choice — not a single metric that went green."
        }
      ],
      "standard": [
        {
          "q": "Explain the fairness impossibility result and why it matters practically.",
          "a": "THERE ARE THREE FAMILIES OF CRITERIA AND THEY ARE THREE DIFFERENT CONDITIONAL INDEPENDENCES. Independence, Ŷ ⫫ A, ignores the label — demographic parity. Separation, Ŷ ⫫ A | Y, conditions on truth — equalized odds and its one-sided form, equal opportunity. Sufficiency, Y ⫫ A | Ŷ, conditions on the prediction — calibration within groups. WHEN BASE RATES DIFFER, ANY TWO FORCE THE THIRD TO FAIL, and it is arithmetic rather than an empirical tendency: FPR = (p/(1−p))·((1−PPV)/PPV)·(1−FNR) ties the confusion matrix to the base rate, so fixing PPV and FNR equal across groups determines FPR, which then cannot match because p does not. In simulation the base rates were 0.199 and 0.450, giving an odds-ratio factor of 0.3034 — that factor IS the forced gap. MEASURED ON ONE SCORE, ONLY CHANGING THRESHOLDS: at a common 0.5 the FNR gap was +0.198; equalizing FNR required moving A's threshold to 0.2323 and blew the PPV gap from −0.061 to −0.231; demographic parity required thresholds of 0.1332 and 0.6714 and produced a PPV gap of −0.392. Every policy zeroes exactly one column and pays in the others. PRACTICALLY THIS MEANS THE CHOICE IS A POLICY DECISION, not an engineering one, and the useful output is the trade-off table with a named owner.",
          "deepDive": "The framing that lands with non-technical stakeholders is to state each option as who is harmed rather than which metric moves. Demographic parity rejects qualified members of the higher-base-rate group to hold the selection rate, and it breaks the score's meaning for anyone downstream. Equalized odds makes error rates match and destroys sufficiency, so a caseworker reading '0.6' now means something different depending on the applicant — which is a real harm even though no fairness dashboard shows it. Calibration keeps the score honest and leaves the lower-base-rate group's true positives missed about twice as often. There is no row with no cost. It is also worth being precise about what the theorem does NOT say: it does not say fairness is impossible or that the work is futile. It says you cannot have all three parities simultaneously, which leaves enormous room for improvement on any one of them, and leaves entirely open the more important question of whether the accuracy gap between groups can be closed. A model that knows less about a group harms them under every definition, and closing that gap is strictly better than choosing how to distribute the failure."
        },
        {
          "q": "A team says they removed the protected attribute, so the model can't discriminate. Respond.",
          "a": "THAT IS A CLAIM ABOUT THE FEATURE LIST, NOT ABOUT THE MODEL'S BEHAVIOUR. I would show it directly: building a score from an equally informative signal WITHOUT using the group attribute, on groups with base rates 0.20 and 0.45, the same score bucket [0.4, 0.6) carried P(Y=1) = 0.2049 for one group and 0.4456 for the other. Same number, 2.2× the risk. THE MECHANISM IS PROXIES — postcode, education, device, employer, purchase history — and in a rich feature space the attribute is recoverable to high accuracy even when it is nowhere in the input. Removing the column removes your ability to MEASURE the disparity, not the disparity. THERE IS A SECOND, SHARPER POINT: a group-blind score cannot be calibrated within both groups when base rates differ, because the same evidence implies different posteriors. So blindness does not merely fail to guarantee fairness — it guarantees the violation of one specific fairness property. The within-group-calibrated score used in the rest of the analysis has to USE the base rate, which is exactly what several legal regimes restrict. SO THE REAL CHOICE is between using the attribute explicitly, where the effect is measurable and auditable, and having proxies use it invisibly, and that framing usually reorients the conversation productively.",
          "deepDive": "The legal picture genuinely complicates this and it is worth acknowledging rather than waving away, because engineers who dismiss it lose credibility with the people who have to sign off. Disparate treatment doctrine in several jurisdictions restricts using a protected attribute in the decision path, while disparate impact doctrine holds you responsible for the outcome — so the law can simultaneously forbid the most direct fix and penalise the result of not applying it. That tension is real and unresolved, and the practical consequence is that you must always MEASURE with the attribute even where you may not DECIDE with it. Collecting the attribute for audit purposes while excluding it from features is the standard compromise and it is worth setting up early, because retrofitting demographic data onto an existing pipeline is painful and sometimes impossible. One more caution: proxy removal cascades badly. Dropping postcode because it proxies for race also drops genuine signal about, say, delivery cost, and teams that iteratively drop every correlated feature end up with a much worse model and a disparity that is still there through some remaining combination."
        },
        {
          "q": "How would you actually run a fairness analysis on a production model?",
          "a": "I WOULD START BEFORE THE METRICS, WITH TWO QUESTIONS: what decision does this model drive, and who is harmed by each kind of error. The metric follows from that, not the other way round. In content moderation, false negatives mean a group receives less protection from harm and false positives mean it receives more wrongful enforcement — both are defensible parity targets, they conflict, and which one dominates is a product-values question. THEN THE MEASUREMENT, and I would measure more than the metrics. Subgroup ACCURACY first, because a model that simply knows less about a group harms them under every definition and that gap is fixable in a way the impossibility is not. Then the full table — selection rate, TPR, FPR, PPV, calibration — for every group and, critically, for INTERSECTIONS, since single-axis parity routinely hides intersectional gaps. Then confidence intervals, because subgroup samples are small and a 3-point gap on 200 examples is noise. THEN THE DELIVERABLE, which is the trade-off table plus a named owner, a documented rationale, and a review date. AND I WOULD LOOK PAST THE MODEL, because the harm usually lives in the surrounding process — who gets measured at all, who can appeal, what happens after a positive, and whether the label itself was generated by a biased process.",
          "deepDive": "That last point deserves the most weight and gets the least. If the label is 'was arrested' rather than 'committed an offence', or 'was promoted' rather than 'was capable', then the base rates you are equalizing against encode the historical process that produced them, and every parity metric computed on that label inherits it. Equalizing FNR with respect to a biased label equalizes with respect to the bias. There is no statistical fix — this is a measurement problem, and the honest responses are to find a better label, to model the label's generation explicitly, or to state plainly in the writeup that the analysis is conditional on a label you do not fully trust. The causal framing is the most principled available: counterfactual fairness asks whether the decision would change had the attribute been different, holding everything not causally downstream of it fixed, which requires a causal graph and immediately runs into the identification problems from the causal module. Path-specific effects are the version that matters legally, since some routes from attribute to outcome are considered legitimate and others are not — and that distinction is a legal judgment encoded in a graph, which is exactly the kind of assumption the previous module showed the data cannot supply."
        },
        {
          "q": "Which fairness criterion would you default to, and why?",
          "a": "I WOULD NOT DEFAULT — I WOULD MAKE THE CHOICE VISIBLE — but if pressed for a starting point it depends on one question: is the score consumed downstream as a probability, or is the decision terminal? IF THE SCORE IS CONSUMED, calibration within groups is close to mandatory, because a score meaning different things for different people corrupts every downstream decision and does so invisibly. A clinician, a caseworker or a pricing engine reading 0.6 has to be able to act on it identically regardless of group; equalized odds explicitly gives that up, with a measured PPV gap of −0.231 in the simulation. IF THE DECISION IS TERMINAL AND THE ERROR IS A DENIAL OF OPPORTUNITY, equal opportunity — equal FNR — is the most defensible starting point, because missing a qualified applicant twice as often in one group is the harm most people recognise as unfairness, and it was +0.198 at a common threshold here. DEMOGRAPHIC PARITY I would reserve for cases where the base-rate difference is itself suspect, since equalizing selection is a statement that the observed base rates should not be treated as ground truth — a coherent position when the label encodes historical exclusion, and an incoherent one when the base rate is real.",
          "deepDive": "The meta-point is that the criterion encodes a belief about the label's validity, and making that explicit resolves most arguments faster than debating metrics. If you trust the label as a measurement of the thing you care about, sufficiency and separation are the reasonable candidates and demographic parity looks like distortion. If you think the label is a record of a biased process, demographic parity looks like a correction and calibration looks like laundering the bias. People argue about metrics when they actually disagree about the label, and surfacing that reframes the discussion into one domain experts can settle. Two practical additions. First, whatever you pick, monitor the OTHERS too — the trade-off table should be a permanent dashboard, not a one-off analysis, since a retrain can move a gap you are not watching. Second, consider whether the model needs to make the decision at all: abstention and routing to human review, sized using the conformal machinery from the previous lesson, sidesteps the parity question for the hardest cases, which are exactly the ones where the impossibility bites hardest. That is often the most practical intervention available."
        },
        {
          "q": "Where does fairness work go wrong in practice, beyond picking the wrong metric?",
          "a": "THE MOST COMMON FAILURE IS TREATING IT AS A GATE RATHER THAN A DESIGN INPUT. A fairness review at the end of a project can only reject or accept; it cannot change what data was collected, what label was chosen, or who was in the training set — and those decisions determine most of the outcome. By the time there is a model to audit, the expensive fixes are unavailable. THE SECOND IS MEASURING THE MODEL AND NOT THE SYSTEM. The model is one component; the harm is produced by the pipeline around it — who is enrolled at all, whose data is missing, what the false-positive experience feels like, whether there is an appeal path, and who staffs it. A model with perfectly equal error rates embedded in a process where one group cannot appeal is not fair, and no model metric shows that. THE THIRD IS SINGLE-AXIS ANALYSIS. Parity on each attribute separately routinely coexists with large intersectional gaps, and the subgroups are small enough that people stop looking because the intervals are wide — which is a reason to collect more data on them, not to conclude there is no gap. THE FOURTH IS REPORTING ONE METRIC AS 'FAIR'. Equal opportunity zeroed the FNR gap while moving PPV to −0.231; the headline is true, and the omission is the whole story.",
          "deepDive": "There is a fifth that is more subtle and increasingly common: optimizing a fairness constraint directly into the training objective without deciding the policy first. The optimizer will satisfy whatever you wrote, and constrained training tends to satisfy it in the cheapest available way — often by degrading performance on the majority group rather than improving the minority, which technically closes the gap and helps nobody. Always check whether a closed gap was closed upward or downward; 'we equalized TPR' is compatible with having made everyone worse. The related trap is that in-processing constraints are fitted to the training distribution and the parity they enforce does not survive shift, so a model certified fair at launch can drift out of compliance silently — which argues for post-processing thresholds, which are transparent and re-tunable, over constrained training, which bakes the choice into weights nobody can inspect. The general shape is the module's again: 'this model satisfies equalized odds' is a true statement about a specific dataset, a specific partition, and a specific moment, and it gets quoted as a property of the system."
        },
        {
          "q": "How does this lesson relate to the module's thesis and to the causal module?",
          "a": "IT IS THE STRONGEST FORM OF THE MODULE'S THESIS: THE GUARANTEE IS TRUE AND NARROWER THAN ITS NAME, AND HERE THE NAMES ARE ACTIVELY MISLEADING. 'Equal opportunity' really equalizes false negative rates and nothing else. 'Demographic parity' really equalizes selection rates and nothing else. 'Fair' is not a property any of them establishes. Unlike calibration and conformal, where the gap was between marginal and conditional, here the gap is between a metric's NAME and its content — and the impossibility theorem means you cannot close it by computing more metrics, because the remaining ones are forced to differ. THE CONNECTION TO THE CAUSAL MODULE IS DIRECT AND USEFUL. That module's thesis was that the assumption is the estimate; here the assumption is about the LABEL and about which causal paths from the attribute to the outcome are legitimate. Counterfactual fairness — would this decision change had the attribute been different — is a causal question requiring a graph, with the same identification problems, and path-specific effects are how the legal distinction between permitted and prohibited pathways gets encoded. So a serious fairness analysis needs a causal model that the data cannot supply, which is exactly what the previous module established, arriving here as a legal requirement rather than a methodological preference.",
          "deepDive": "The practical synthesis of the two modules is a discipline worth stating as a checklist. Name the estimand — which error, over which group, under which decision. Name the assumption — what the label measures, which paths count, whether base rates are ground truth or artefact. Report the trade-off rather than a single number, since every alternative harms someone specifically. Price the untestable part with a sensitivity analysis, which here means asking how much of the base-rate difference would have to be measurement bias before the recommendation flips. And assign an owner, because the decision is not derivable from the data and someone accountable has to make it. None of that is technically hard; all of it is routinely skipped in favour of a dashboard with a green metric. If there is one habit to take from these two modules together, it is that the number is the easy part and the reference class, the assumption and the owner are the work."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "The three families",
        "back": "Independence Ŷ⫫A (demographic parity) · Separation Ŷ⫫A|Y (equalized odds / equal opportunity) · Sufficiency Y⫫A|Ŷ (calibration within groups). Three different conditional independences — hence the conflict."
      },
      {
        "type": "formula",
        "front": "★ The impossibility, as arithmetic",
        "back": "FPR = (p/(1−p))·((1−PPV)/PPV)·(1−FNR). Fix PPV and FNR equal across groups; p differs, so FPR is FORCED to differ. Measured odds ratio at p=0.199 vs 0.450: **0.3034**."
      },
      {
        "type": "formula",
        "front": "★ Three policies, one score, only thresholds change",
        "back": "Common 0.5: ΔFNR **+0.198**, ΔPPV −0.061. Equal opportunity (A at 0.2323): ΔFNR **0.000**, ΔPPV **−0.231**. Demographic parity (0.1332 vs 0.6714): Δsel **0.000**, ΔPPV **−0.392**. Each zeroes one column and pays in the rest."
      },
      {
        "type": "pitfall",
        "front": "★ Group-blindness is not neutrality",
        "back": "A blind score gave P(Y=1) = **0.2049 vs 0.4456 in the SAME score bucket**. Proxies carry the attribute; dropping the column removes your ability to MEASURE the disparity, not the disparity."
      },
      {
        "type": "intuition",
        "front": "Can a group-blind score be calibrated within both groups?",
        "back": "No, when base rates differ — the same evidence implies different posteriors. Blindness doesn't merely fail to guarantee fairness; it GUARANTEES violating sufficiency."
      },
      {
        "type": "intuition",
        "front": "Who each policy harms",
        "back": "Parity → qualified members of the higher-base-rate group, plus everyone reading the score. Equalized odds → downstream users (the score stops meaning one thing). Calibration → the lower-base-rate group, missed ~2× as often. **No row has no cost.**"
      },
      {
        "type": "pitfall",
        "front": "Is the base rate itself neutral?",
        "back": "Usually not. If the label is 'was arrested' not 'offended', or 'was promoted' not 'was capable', equalizing against it equalizes with respect to the bias. A measurement problem with no statistical fix."
      },
      {
        "type": "intuition",
        "front": "What actually decides the metric argument",
        "back": "A belief about the LABEL. Trust it → sufficiency/separation are reasonable, parity looks like distortion. Distrust it → parity looks like correction, calibration like laundering. People argue metrics when they disagree about labels."
      },
      {
        "type": "pitfall",
        "front": "Was the gap closed upward or downward?",
        "back": "Constrained training satisfies the constraint the CHEAPEST way — usually by degrading the majority group. 'We equalized TPR' is compatible with making everyone worse. Always check the direction."
      },
      {
        "type": "pitfall",
        "front": "In-processing vs post-processing",
        "back": "In-processing bakes the parity choice into weights fitted to one distribution — it drifts out of compliance silently. Post-processing thresholds are transparent and re-tunable. Prefer them."
      },
      {
        "type": "pitfall",
        "front": "Single-axis analysis",
        "back": "Parity on each attribute separately routinely coexists with large INTERSECTIONAL gaps. Small subgroups → wide intervals → people stop looking. That's a reason to collect more data, not to conclude no gap exists."
      },
      {
        "type": "intuition",
        "front": "★ The deliverable",
        "back": "The trade-off table + a NAMED OWNER + a documented rationale + a review date. Not a single metric that went green. The choice is not derivable from data — someone accountable must make it."
      }
    ],
    "refs": [
      {
        "title": "Chouldechova (2017), Fair Prediction with Disparate Impact",
        "url": "https://arxiv.org/abs/1703.00056"
      },
      {
        "title": "Kleinberg, Mullainathan & Raghavan (2016), Inherent Trade-Offs in the Fair Determination of Risk Scores",
        "url": "https://arxiv.org/abs/1609.05807"
      },
      {
        "title": "Hardt, Price & Srebro (2016), Equality of Opportunity in Supervised Learning",
        "url": "https://arxiv.org/abs/1610.02413"
      },
      {
        "title": "Barocas, Hardt & Narayanan, Fairness and Machine Learning (free textbook)",
        "url": "https://fairmlbook.org/"
      },
      {
        "title": "Kusner, Loftus, Russell & Silva (2017), Counterfactual Fairness",
        "url": "https://arxiv.org/abs/1703.06856"
      }
    ],
    "demos": [
      "fairness",
      "roc",
      "calibration",
      "classification-metrics"
    ]
  },
  "attribution": {
    "level": "core",
    "body": {
      "intuition": [
        "Attribution answers 'how much did each input contribute to this output', and the reason it is harder than it sounds is that CONTRIBUTION IS NOT WELL DEFINED until you say what you are comparing against. Shapley values are the principled answer - the unique allocation satisfying efficiency, symmetry, dummy and additivity - and even they require a baseline distribution, which is the choice that decides the answer.",
        "The sharpest demonstration is that attribution is a property of the REPRESENTATION, not only of the model. Take a linear model with weights 3, 2, 0 and mean |SHAP| of 2.371, 1.612, 0.000. Now write the identical function with the first feature split into two identical copies at weight 1.5 each. Predictions are bit-for-bit unchanged, and each copy now attributes 1.186 - BOTH RANKING BELOW the second feature at 1.612. Nothing about the model changed. The feature ranking inverted.",
        "And the module's thesis applies with force: every attribution method computes something real and narrower than 'the explanation'. Interventional SHAP tells you what happens if you resample a feature independently. Conditional SHAP tells you what a feature tells you ABOUT the output. At rho = 0.99 the first says an unused feature has importance 0.000 and the second gives it 2.344, for a coefficient of exactly zero. Both are correct. They answer different questions."
      ],
      "math": [
        {
          "h": "Shapley values, and the baseline that decides them",
          "paras": [
            "The Shapley value averages a feature's marginal contribution over all orderings of the other features. It is the unique attribution satisfying four reasonable axioms, which is why it dominates the field.",
            "But the value function v(S) requires evaluating the model on a subset of features, and a model needs all its inputs - so you must decide how to fill the missing ones. That decision is not part of the axioms."
          ],
          "tex": "\\phi_i = \\sum_{S\\subseteq N\\setminus\\{i\\}} \\frac{|S|!\\,(|N|-|S|-1)!}{|N|!}\\big[v(S\\cup\\{i\\})-v(S)\\big]",
          "texNote": "Interventional: v(S) = E_{x_{-S}}[f(x_S, x_{-S})] with the complement drawn MARGINALLY - a do-operation. Conditional: draw from p(x_{-S} | x_S) - an observation. Same axioms, different value function, different answers."
        },
        {
          "h": "★ The same function, two representations, an inverted ranking",
          "paras": [
            "Splitting one feature into two identical copies is a re-parameterization, not a model change. Efficiency then forces the credit to be shared."
          ],
          "tex": "f = 3x_0+2x_1: \\ \\bar{|\\phi|} = (2.371,\\ 1.612,\\ 0) \\quad\\longrightarrow\\quad f = 1.5x_{0a}+1.5x_{0b}+2x_1: \\ \\bar{|\\phi|} = (1.186,\\ 1.186,\\ 1.612)",
          "texNote": "Predictions identical to machine precision. Each copy of the dominant feature now ranks BELOW the secondary one. Symmetry and efficiency together guarantee this - it is a consequence of the axioms, not a bug in the implementation."
        },
        {
          "h": "Interventional versus conditional, measured",
          "paras": [
            "A model using only x0, with x1 correlated to it at varying strength. x1's coefficient is exactly zero in every row."
          ],
          "tex": "\\begin{array}{lrr} \\rho & \\phi_{x_1}\\ \\text{interventional} & \\phi_{x_1}\\ \\text{conditional}\\\\ 0.00 & 0.000 & 0.000\\\\ 0.50 & 0.000 & 1.191\\\\ 0.90 & 0.000 & 2.165\\\\ 0.99 & 0.000 & \\mathbf{2.344} \\end{array}",
          "texNote": "The interventional value says the model does not use x1, which is true. The conditional value says x1 is nearly as informative about the output as x0, which is also true. Choose the one matching your question: debugging the model, or understanding the data."
        }
      ],
      "code": [
        {
          "h": "★ The sanity check, and why some methods fail it",
          "paras": [
            "Adebayo et al.'s test: randomize the model's parameters and recompute the map. If it barely changes, the map was never about the model."
          ],
          "code": "# rank correlation between the saliency map BEFORE and AFTER\n# destroying the model's weights\n\n#      method        randomize last layer    randomize ALL layers\n#    gradient              -0.041                   0.095\n#  input x grad             0.420                   0.493\n\n# ★ PLAIN GRADIENT correctly collapses to ~0 - it genuinely depends on\n#   the weights, so destroying them destroys the explanation.\n# ★ INPUT x GRADIENT stays high, because the |x| factor is a property\n#   of the INPUT and survives replacing the model with noise.\n\n# That is the mechanism behind the published finding that several popular\n# saliency methods act as edge detectors: the structure you are admiring\n# is in the image, not in the model.",
          "caption": "Run this before trusting any attribution map. It is three lines, it has no false positives worth worrying about, and it disqualifies methods that look most convincing."
        },
        {
          "h": "What attention is and is not",
          "paras": [
            "Attention weights are a real quantity computed by the model. Reading them as an explanation adds a claim they do not support."
          ],
          "code": "# WHAT ATTENTION WEIGHTS ARE\n#   a normalized similarity used to mix VALUE vectors at one layer\n\n# WHAT THEY ARE NOT\n#   * a measure of importance - a large weight on a token whose value\n#     vector is near zero moves the output almost not at all\n#   * unique - different attention patterns can give identical outputs\n#   * end-to-end - one layer's weights say nothing about the residual\n#     stream carrying information around it\n\n# ROLLOUT multiplies attention matrices across layers (with a residual\n# term) to approximate token-to-token influence. Better than raw weights,\n# still correlational: it tracks where information COULD flow, not\n# whether the output DEPENDS on it.\n\n# ★ The causal test is ABLATION or PATCHING - change it and see. That is\n#   lesson 24-06, and it is the do-operator from module 23.",
          "caption": "The upgrade path from attention to rollout to patching is exactly the upgrade from correlation to causation, and it costs a forward pass per intervention."
        }
      ],
      "useCases": [
        "Debugging a model that is right for the wrong reason - a leaked identifier, a hospital tag in a scan, a timestamp that encodes the label - where a single high-attribution feature ends the investigation.",
        "Regulatory adverse-action notices, where the requirement is a reason a person can act on, and the interventional question 'what would have changed the decision' is closer to that than the conditional one.",
        "Feature selection and pipeline pruning, where the interventional value is the right choice because it answers what happens if the feature is removed.",
        "Understanding the data rather than the model - which is the conditional question, and legitimate as long as it is labelled as such."
      ],
      "pitfalls": [
        "Reading feature ranking as a property of the model. Splitting a feature into two identical copies left predictions bit-for-bit identical and dropped its attribution from 2.371 to 1.186 each, inverting the ranking against a weaker feature.",
        "Not knowing which SHAP variant your library ran. At rho = 0.99 the interventional value for an UNUSED feature was 0.000 and the conditional value was 2.344 - both correct, and only one answers your question.",
        "Trusting a saliency map that has not passed the model-randomization test. Input x gradient retained rank correlation 0.420 to 0.493 after the weights were replaced with noise.",
        "Treating attention weights as explanations. They are a similarity used to mix values at one layer, and a large weight on a near-zero value vector moves the output almost not at all.",
        "Using the training-set mean as a SHAP baseline without thinking. The baseline defines what 'absent' means, and an all-mean input is often off-manifold and outside anything the model saw.",
        "Interpreting attributions from a model with correlated features as causal. Attribution says what the MODEL uses; whether the world works that way is the previous module's question entirely.",
        "Averaging attributions over a dataset and calling it global importance without noting that opposite-signed local effects cancel, which is the same aggregation failure as subgroup calibration."
      ],
      "connections": [
        {
          "ref": "causal-inference/causal-graphs",
          "text": "Interventional SHAP is a do-operation and conditional SHAP is an observation - the same distinction, and the reason the two disagree by 2.344 on an unused feature."
        },
        {
          "ref": "trustworthy-ai/probing-patching",
          "text": "The causal upgrade: patching intervenes on an activation and measures the output change, which is what attention rollout only approximates."
        },
        {
          "ref": "trustworthy-ai/superposition-sae",
          "text": "Why input-space attribution has a ceiling - if the model's real units are directions in activation space rather than input features, no input attribution can name them."
        },
        {
          "ref": "trustworthy-ai/fairness",
          "text": "Where attribution gets used as evidence in an audit, and why 'the protected feature had low attribution' is a claim about the feature list, not about the behaviour."
        },
        {
          "ref": "ml-applications/shap",
          "text": "The applied treatment - TreeSHAP, plotting conventions, and the practical cost of exact versus sampled Shapley on real feature counts."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What are Shapley values?",
          "a": "The average marginal contribution of a feature over all orderings of the others — the unique attribution satisfying efficiency, symmetry, dummy and additivity."
        },
        {
          "q": "What do the axioms NOT determine?",
          "a": "The value function v(S) — how you fill in the absent features. That baseline choice decides the answer and is not part of the axioms."
        },
        {
          "q": "Interventional vs conditional SHAP?",
          "a": "Interventional draws the absent features MARGINALLY (a do-operation); conditional draws from p(x_{−S} | x_S) (an observation)."
        },
        {
          "q": "★ Show they disagree.",
          "a": "Model uses only x0; x1 has coefficient exactly 0. At ρ=0.99: interventional φ(x1) = 0.000, conditional = 2.344. Both correct, different questions."
        },
        {
          "q": "Which should you use for debugging a model?",
          "a": "Interventional — it answers what the model uses. Conditional answers what a feature tells you about the output, i.e. a question about the data."
        },
        {
          "q": "★ What happens if you duplicate a feature?",
          "a": "Credit splits. f = 3x₀+2x₁ gives |φ| = (2.371, 1.612); rewriting as 1.5x₀ₐ+1.5x₀ᵦ+2x₁ gives (1.186, 1.186, 1.612) with IDENTICAL predictions — the ranking inverts."
        },
        {
          "q": "Is that a bug?",
          "a": "No — symmetry plus efficiency force it. Attribution is a property of the REPRESENTATION, not only of the model."
        },
        {
          "q": "What is the model-randomization sanity check?",
          "a": "Randomize the model's weights and recompute the map. If the map barely changes, it was never explaining the model (Adebayo et al. 2018)."
        },
        {
          "q": "Give the measured result.",
          "a": "Rank correlation after randomizing all layers: plain gradient 0.095 (collapses ✓), input×gradient 0.493 (survives) — the |x| factor is a property of the input."
        },
        {
          "q": "Are attention weights explanations?",
          "a": "No. They're a normalized similarity mixing value vectors at one layer. A large weight on a near-zero value vector barely moves the output."
        },
        {
          "q": "What does attention rollout add?",
          "a": "Multiplies attention across layers with a residual term to approximate token-to-token influence. Still correlational — where information COULD flow, not what the output depends on."
        },
        {
          "q": "What's the causal test?",
          "a": "Ablation or activation patching — change it and measure the output. That's lesson 24-06, and it's module 23's do-operator applied inside the network."
        }
      ],
      "standard": [
        {
          "q": "Explain Shapley values and the baseline problem.",
          "a": "A SHAPLEY VALUE IS A FEATURE'S AVERAGE MARGINAL CONTRIBUTION OVER ALL ORDERINGS of the other features, and it is the unique attribution satisfying four axioms: efficiency (attributions sum to the prediction minus the baseline), symmetry (identical contributions get identical credit), dummy (an unused feature gets zero), and additivity (attributions of a sum of models add). That uniqueness is why it dominates the field — it is not one heuristic among many, it is the answer given those requirements. THE PROBLEM IS THAT THE AXIOMS DO NOT DETERMINE THE VALUE FUNCTION. Computing v(S) means evaluating the model on a subset of features, and a model needs all its inputs, so you must decide what 'absent' means. Interventional SHAP draws the absent features from their MARGINAL distribution, which is a do-operation, and answers 'what does the model use'. Conditional SHAP draws from p(x_{−S} | x_S), which is an observation, and answers 'what does this feature tell me about the output'. MEASURED, THEY DISAGREE COMPLETELY: with a model whose second feature has coefficient exactly zero, at ρ = 0.99 the interventional attribution is 0.000 and the conditional is 2.344. Both are correct. Most practitioners do not know which one their library ran.",
          "deepDive": "The choice has a clean rule once you name the question. Debugging the model, feature pruning, and adverse-action explanations all want INTERVENTIONAL, because they ask what happens if the feature changes or is removed — and adverse-action notices in particular need a reason the applicant could act on, which is a counterfactual. Understanding the data-generating process wants CONDITIONAL, and it should be labelled as a statement about the data rather than the model. The practical trap is that interventional SHAP evaluates the model at off-manifold points — resampling one feature independently can produce an input combination that never occurs, like a pregnancy flag on a male record — so the model is being asked about inputs it never saw, and its answer there is extrapolation. Conditional SHAP stays on-manifold and pays by attributing to features the model demonstrably ignores. There is no version that avoids both problems, and TreeSHAP's default in several libraries has changed between versions, which means published SHAP plots from different years are not necessarily comparable. Checking which variant you ran is a two-minute task that changes conclusions."
        },
        {
          "q": "Why is feature ranking by attribution unreliable?",
          "a": "BECAUSE ATTRIBUTION IS A PROPERTY OF THE REPRESENTATION, NOT ONLY OF THE MODEL, and the demonstration takes one line. Take f = 3x₀ + 2x₁ with mean |SHAP| of 2.371 and 1.612 — x₀ dominates, as it should. Now write the identical function as 1.5x₀ₐ + 1.5x₀ᵦ + 2x₁, where x₀ₐ and x₀ᵦ are two copies of the same column. Predictions are identical to machine precision; it is the same function. Each copy now attributes 1.186, so BOTH RANK BELOW x₁ at 1.612. The most important input in the model now appears twice, in third and fourth place. THIS IS NOT AN IMPLEMENTATION BUG — symmetry says identical features get identical credit and efficiency says the total is fixed, so the credit must split. The axioms force it. AND DUPLICATION IS NOT AN ARTIFICIAL SCENARIO: near-duplicates are everywhere in real feature stores — the same signal at two aggregation windows, a raw value and its log, a field and its imputed version, embeddings that overlap. Any of those dilutes attribution across the group. THE PRACTICAL CONSEQUENCE is that attribution rankings are comparable within a fixed feature set and not across pipelines, and a feature that drops in the ranking after a pipeline change may have gained a correlated sibling rather than lost influence.",
          "deepDive": "The mitigations are partial and worth knowing. Grouped Shapley values treat a set of related columns as a single player, which restores the ranking and requires you to define the groups — a domain judgment, and the right one when the group is genuinely one concept measured several ways. Owen values generalise this to a hierarchy. Both need you to know the structure in advance, which is fine for engineered features and hard for learned embeddings. The broader lesson is that any attribution obeying efficiency has this property: a fixed total must be divided, so adding a correlated feature necessarily reduces someone's share regardless of whether the model's behaviour changed. That is a general consequence of conservation rather than a defect of Shapley in particular. It also makes a specific audit argument invalid: 'the protected attribute had low attribution' is unpersuasive when a dozen correlated proxies are present, because the credit for that concept is spread across all of them and no single one looks important. Grouping the proxies is the right analysis, and it typically changes the picture substantially."
        },
        {
          "q": "How do you know whether to trust a saliency map?",
          "a": "RUN THE MODEL-RANDOMIZATION TEST BEFORE TRUSTING ANYTHING. Compute the map, then replace the model's parameters with random ones — first the last layer, then all of them — and recompute. If the map is substantially unchanged, it was never explaining the model. MEASURED: plain gradient saliency had rank correlation −0.041 after randomizing the last layer and 0.095 after randomizing everything, which is the correct behaviour — destroy the weights and you destroy the explanation. Input × gradient retained 0.420 and 0.493. The reason is structural: the |x| factor is a property of the INPUT, so it survives replacing the model with noise, and any map dominated by input magnitude will keep looking like the input no matter what the model does. THAT IS THE MECHANISM behind the published finding that several popular saliency methods behave as edge detectors — the structure you are admiring is in the image. It also explains why these maps are so persuasive: they look like the object because they are partly a picture of the object, and a human evaluator reads that as the model attending to the right thing. THE SECOND TEST IS A DATA-RANDOMIZATION CHECK: retrain on shuffled labels and confirm the map changes. A map that survives both randomizations is a visualization of the input with extra steps.",
          "deepDive": "The general principle is worth extracting because it applies well beyond saliency: an explanation should be sensitive to the thing it claims to explain, and that sensitivity is testable. It is the same logic as the causal module's habit of asking whether a diagnostic could have come out badly — a map guaranteed to look plausible regardless of the model is not evidence. It also connects to a practical point about human evaluation: plausibility and faithfulness are different properties, and human raters score plausibility. A map highlighting the dog in a dog image looks right whether or not the model used those pixels, so 'the explanations looked reasonable to our annotators' is close to no evidence at all. The faithfulness tests that do mean something are deletion and insertion curves — remove the top-k attributed pixels and measure how fast the prediction degrades, or add them to a blank input and measure how fast it recovers — because those intervene and measure the model's actual dependence. They have their own off-manifold problem, since a deleted region is an unusual input, which is a real caveat rather than a reason to skip them."
        },
        {
          "q": "Someone shows you attention weights as an explanation of an LLM's output. Respond.",
          "a": "ATTENTION WEIGHTS ARE A REAL QUANTITY THE MODEL COMPUTES, AND READING THEM AS AN EXPLANATION ADDS A CLAIM THEY DO NOT SUPPORT. What they are: a normalized similarity used to mix value vectors at one layer. What they are not, in three specific ways. FIRST, THEY ARE NOT IMPORTANCE — the output depends on the attention weight TIMES the value vector, so a large weight on a token whose value vector is near zero moves the output almost not at all, and the weight alone hides that. SECOND, THEY ARE NOT UNIQUE: different attention patterns can produce identical outputs, so 'the model attended here' is not a statement the output pins down. THIRD, THEY ARE NOT END-TO-END — one layer's weights say nothing about the residual stream carrying information around that layer, and in a deep model most information routing is not visible in any single attention matrix. ATTENTION ROLLOUT IS A GENUINE IMPROVEMENT, multiplying attention across layers with a residual term to approximate token-to-token influence, and it remains correlational: it tracks where information COULD flow, not whether the output depends on it. THE CAUSAL TEST IS PATCHING — replace an activation and measure the change in output — which is the do-operator from the causal module applied inside the network, and it costs one forward pass per intervention.",
          "deepDive": "The 'attention is not explanation' debate is worth being able to characterise accurately rather than citing one side. Jain and Wallace showed that adversarially-chosen alternative attention distributions can produce nearly identical outputs, which undercuts attention as THE explanation. Wiegreffe and Pinter responded that this tests a strong uniqueness claim nobody needs, and that attention is still informative under a weaker reading, particularly when the alternatives are constrained to be reachable by training. The reasonable synthesis is that attention is a useful HYPOTHESIS GENERATOR and a poor piece of evidence: use it to decide what to patch, then patch. That is also the right sequencing for cost, since patching is expensive per intervention and attention is free, so attention narrows the search space that ablation then tests. Worth adding that for modern models the more informative object is often not attention at all but the residual stream decomposition — logit lens, direct logit attribution — which measures how much each component moves the actual output logits, and is closer to a causal quantity by construction."
        },
        {
          "q": "What is attribution good for, given all these caveats?",
          "a": "IT IS EXCELLENT AT ONE THING: FINDING MODELS THAT ARE RIGHT FOR THE WRONG REASON. When a model has learned a shortcut — a leaked identifier, a hospital tag in a radiograph, a timestamp encoding the label, a whitespace pattern separating classes — attribution finds it immediately, because the shortcut feature attributes enormously and a human recognises instantly that it should not. That single use case justifies the tooling, and it is a HYPOTHESIS-GENERATION use where a false positive costs a few minutes and a true positive saves a launch. IT IS ALSO GENUINELY REQUIRED IN SOME DOMAINS, where regulation demands a reason a person can act on, and the interventional question — what would have had to differ for the decision to change — is the closest available thing. Counterfactual explanations are often better suited than attributions there, because they name an achievable change rather than a share of credit. WHERE IT IS WEAK is everything that sounds like the main use: ranking features reliably (representation-dependent, 2.371 → 1.186 from a rewrite), establishing causal claims about the world (it describes the model, not the world), and satisfying a stakeholder who wants to know whether to trust the model, which attribution does not answer. THE RULE I WOULD GIVE is that attribution generates hypotheses and interventions test them.",
          "deepDive": "That rule is the through-line for the rest of the module. Attribution is a correlational statement about a model's inputs; patching is an interventional statement about its internals; and the difference is exactly the difference the causal module spent ten lessons on, now applied to a system where — unusually — you CAN intervene freely. That is the genuinely hopeful part of interpretability: unlike an economist studying a labour market, you own the model, you can set any activation to any value, run the counterfactual, and observe the result at zero ethical cost and low compute cost. The fundamental problem of causal inference does not apply inside a network, because you can run both potential outcomes. So the field's methodological ceiling is much higher than in causal inference proper, and the reason interpretability results are still contested is not that intervention is impossible but that the units to intervene ON are unclear — which is precisely what the next two lessons are about, with superposition explaining why neurons are the wrong unit and patching supplying the causal test once you have a better one."
        },
        {
          "q": "How does this lesson fit the module's thesis?",
          "a": "IT SHOWS THE PATTERN IN A CASE WHERE EVEN THE AXIOMS DO NOT SAVE YOU. Shapley values are uniquely determined by four reasonable requirements, which is about as strong a foundation as an attribution method can have, and the guarantee is still narrower than 'the explanation'. Interventional SHAP truly reports what the model uses when features are resampled independently; conditional SHAP truly reports what a feature tells you about the output. On an unused feature at ρ = 0.99, those are 0.000 and 2.344. Both are correct. The name 'feature importance' does not distinguish them, and the library default decides which one you got. THE SECOND INSTANCE IS SHARPER: the ranking is a property of the representation, so the same function written two ways gives 2.371 and 1.186 for the same input, inverting the order. That is the axioms working correctly. SO THE MODULE'S QUESTION — over what set does this hold — becomes, here, over what BASELINE and what FEATURE PARAMETERIZATION. Both are choices, both are usually invisible in the plot, and both change the answer more than most modelling decisions do. The habit is to state the variant, the baseline, and the grouping alongside any attribution figure, the way you would state the binning alongside an ECE.",
          "deepDive": "There is one more parallel worth drawing across the module so far. Calibration's ECE was an average over a chosen population. Conformal's coverage was an average over a chosen exchangeable distribution. A fairness metric is a parity over a chosen partition. And an attribution is a contrast against a chosen baseline. In every case the method computes an honest number relative to a reference that the reporting convention omits, and in every case supplying the reference is cheap — a per-slice table, a Mondrian partition, the full trade-off matrix, the SHAP variant and baseline. None of these is technically difficult; all of them are routinely left out, and leaving them out is what converts a correct measurement into a misleading claim. If a reader takes one operational habit from this module it should be to name the reference class in the same sentence as the number, every time, because the number without it is not wrong so much as unfalsifiable."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Shapley values",
        "back": "Average marginal contribution over all orderings — the UNIQUE attribution satisfying efficiency, symmetry, dummy, additivity. The axioms do NOT determine v(S), i.e. what 'absent' means."
      },
      {
        "type": "pitfall",
        "front": "★ Interventional vs conditional SHAP",
        "back": "Model uses ONLY x₀; x₁'s coefficient is exactly 0. At ρ=0.99: interventional φ(x₁) = **0.000**, conditional = **2.344**. Both correct — do-operation vs observation. Most people don't know which their library ran."
      },
      {
        "type": "intuition",
        "front": "Which SHAP variant for which question?",
        "back": "Debugging / pruning / adverse-action → INTERVENTIONAL (what the model uses; counterfactual). Understanding the data → CONDITIONAL, and label it as a claim about the data."
      },
      {
        "type": "formula",
        "front": "★ Duplicate a feature, invert the ranking",
        "back": "f = 3x₀+2x₁ → |φ| = (2.371, 1.612). Rewrite as 1.5x₀ₐ+1.5x₀ᵦ+2x₁ → (1.186, 1.186, 1.612). Predictions bit-for-bit identical; the dominant feature now ranks THIRD and FOURTH."
      },
      {
        "type": "intuition",
        "front": "Why duplication splits credit",
        "back": "Symmetry (identical features, identical credit) + efficiency (fixed total) FORCE it. Any attribution obeying conservation has this property. Near-duplicates are everywhere: two windows, raw+log, field+imputation."
      },
      {
        "type": "pitfall",
        "front": "★ The model-randomization sanity check",
        "back": "Randomize the weights, recompute the map. Rank corr after randomizing ALL layers: plain gradient **0.095** (collapses ✓), input×gradient **0.493** (survives). The |x| factor belongs to the INPUT."
      },
      {
        "type": "intuition",
        "front": "Why saliency maps are so persuasive",
        "back": "They look like the object because they are partly a PICTURE of the object. Human raters score PLAUSIBILITY; faithfulness is a different property. \"The explanations looked reasonable\" is near-zero evidence."
      },
      {
        "type": "pitfall",
        "front": "Three things attention weights are not",
        "back": "(1) Not importance — output depends on weight × VALUE vector; a big weight on a near-zero value moves nothing. (2) Not unique — different patterns, identical outputs. (3) Not end-to-end — silent on the residual stream."
      },
      {
        "type": "definition",
        "front": "Attention → rollout → patching",
        "back": "Raw weights (one layer, correlational) → rollout (across layers with a residual term; where information COULD flow) → PATCHING (intervene, measure output change). The correlation→causation ladder, one forward pass per intervention."
      },
      {
        "type": "pitfall",
        "front": "The off-manifold problem",
        "back": "Interventional SHAP resamples one feature independently, creating inputs that never occur (a pregnancy flag on a male record) — the model's answer there is extrapolation. Conditional stays on-manifold and credits features the model ignores."
      },
      {
        "type": "intuition",
        "front": "★ What attribution is actually good for",
        "back": "Finding models RIGHT FOR THE WRONG REASON — leaked IDs, hospital tags, timestamps. A hypothesis-generation use where a false positive costs minutes and a true positive saves a launch. **Attribution generates hypotheses; interventions test them.**"
      },
      {
        "type": "intuition",
        "front": "Why interpretability's ceiling is higher than causal inference's",
        "back": "You OWN the model — set any activation, run both potential outcomes, zero ethical cost. The fundamental problem of causal inference does not apply inside a network. The hard part is knowing which UNITS to intervene on (→ 24-05)."
      }
    ],
    "refs": [
      {
        "title": "Lundberg & Lee (2017), A Unified Approach to Interpreting Model Predictions",
        "url": "https://arxiv.org/abs/1705.07874"
      },
      {
        "title": "Adebayo et al. (2018), Sanity Checks for Saliency Maps",
        "url": "https://arxiv.org/abs/1810.03292"
      },
      {
        "title": "Janzing, Minorics & Blobaum (2020), Feature Relevance Quantification in Explainable AI: A Causal Problem",
        "url": "https://proceedings.mlr.press/v108/janzing20a.html"
      },
      {
        "title": "Jain & Wallace (2019), Attention is not Explanation",
        "url": "https://arxiv.org/abs/1902.10186"
      },
      {
        "title": "Wiegreffe & Pinter (2019), Attention is not not Explanation",
        "url": "https://arxiv.org/abs/1908.04626"
      }
    ],
    "demos": [
      "shap",
      "saliency",
      "attention-rollout",
      "decision-tree"
    ]
  },
  "superposition-sae": {
    "level": "advanced",
    "body": {
      "intuition": [
        "The reason a neuron rarely means one thing is that models have more things to represent than they have neurons, and sparsity lets them cheat. If features are rarely active at the same time, you can store more of them than you have dimensions by giving each a DIRECTION rather than an axis, accepting interference between directions because collisions are rare. That is superposition, and it is why 'find the dog neuron' was always the wrong search.",
        "The toy model makes it concrete. Twenty features into five dimensions, so at most five can be orthogonal. At low sparsity the model represents about half of them and the loss sits at 0.062. Push the probability a feature is inactive to 0.99 and it represents ALL TWENTY at a loss of 0.0004 - a 150x improvement while storing four times more features than it has dimensions. The off-diagonal cosine stays around 0.36 throughout: the interference is real and the model accepts it.",
        "Sparse autoencoders are the leading attempt to recover those directions, and they inherit the module's thesis exactly. On a task with 24 known ground-truth features, the SAE with the BEST reconstruction - fraction of variance unexplained 0.0014, essentially perfect - recovered only 5 of the 24 true directions. A worse-reconstructing configuration recovered 16. THE FIT IS IDENTIFIED AND THE DECOMPOSITION IS NOT, which is the same structure as synthetic control's donor weights."
      ],
      "math": [
        {
          "h": "Why superposition is worth it",
          "paras": [
            "Storing n features in m < n dimensions forces non-orthogonal directions, so activating one feature leaks into the others. The leak costs you only when features co-occur, and under sparsity they rarely do.",
            "So the trade is interference against capacity, and sparsity sets the exchange rate."
          ],
          "tex": "h = \\sum_i x_i W_i, \\qquad \\hat{x}_j = \\mathrm{ReLU}\\Big(x_j\\|W_j\\|^2 + \\underbrace{\\sum_{i\\neq j} x_i \\langle W_i,W_j\\rangle}_{\\text{interference}} + b_j\\Big)",
          "texNote": "The ReLU is load-bearing: it lets the model absorb small negative interference into the flat region, which is why superposition works far better with a nonlinearity than without."
        },
        {
          "h": "The measured phase change",
          "paras": [
            "Twenty features, five dimensions, varying the probability that a feature is inactive."
          ],
          "tex": "\\begin{array}{lrrr} P(\\text{off}) & \\text{loss} & \\text{features represented} & \\overline{|\\cos|}_{\\text{off-diag}}\\\\ 0.000 & 0.0624 & 11 & 0.345\\\\ 0.500 & 0.0726 & 9 & 0.379\\\\ 0.900 & 0.0131 & 18 & 0.356\\\\ 0.990 & 0.0004 & \\mathbf{20} & 0.371\\\\ 0.999 & 0.00002 & \\mathbf{20} & 0.362 \\end{array}",
          "texNote": "At high sparsity all twenty features are stored in five dimensions with the loss falling by three orders of magnitude. The interference never goes away - the mean off-diagonal cosine stays near 0.36 - it simply stops being paid for."
        },
        {
          "h": "★ Reconstruction quality does not imply feature recovery",
          "paras": [
            "A sparse autoencoder trained on activations from a known generative model with 24 true features in 6 dimensions. Dictionary size and L1 penalty are both free parameters."
          ],
          "tex": "\\begin{array}{rrrrr} \\text{dict} & L_1 & \\text{FVU} & L_0 & \\text{true features recovered}\\\\ 24 & 0.02 & \\mathbf{0.0014} & 6.03 & \\mathbf{5/24}\\\\ 24 & 0.20 & 0.0775 & 2.84 & 13/24\\\\ 96 & 0.20 & 0.0769 & 3.96 & \\mathbf{16/24}\\\\ 96 & 0.02 & 0.0018 & 10.02 & 14/24 \\end{array}",
          "texNote": "The configuration with near-perfect reconstruction recovered the FEWEST true features. Recovery is judged by whether a dictionary direction has cosine above 0.9 with a true one; the counts move with hyperparameters that no reconstruction metric can select."
        }
      ],
      "code": [
        {
          "h": "'The SAE found N features' is a claim about N",
          "paras": [
            "Alive-feature counts across the same runs, where a feature counts as alive if it ever activates."
          ],
          "code": "#  dict size   L1     FVU      alive    L0     recovered\n#      12     0.20   0.0937     11     2.17      10/24\n#      24     0.02   0.0014     21     6.03       5/24   <- best fit, worst recovery\n#      24     0.20   0.0775     19     2.84      13/24\n#      24     1.00   0.6532     16     0.53      10/24\n#      48     0.20   0.0769     27     3.32      14/24\n#      96     0.20   0.0769     36     3.96      16/24\n#      96     0.02   0.0018     50    10.02      14/24   <- L0 of 10 is not sparse\n\n# ★ The number of 'features discovered' tracks the DICTIONARY SIZE you chose.\n#   Nothing in the reconstruction loss selects the right one, because the\n#   right one is defined by a ground truth you do not have.",
          "caption": "Every row is a defensible configuration and they disagree about how many features exist. That is not a tuning problem; it is an identification problem."
        },
        {
          "h": "What SAEs are genuinely for",
          "paras": [
            "The critique above is a critique of over-claiming, not of the method. Used as a hypothesis generator it is the best tool available."
          ],
          "code": "# WHAT AN SAE GIVES YOU\n#   * a basis that is SPARSER and more monosemantic than neurons\n#   * candidate directions you can name by inspecting top activations\n#   * something to INTERVENE on - which is the actual test (24-06)\n\n# WHAT IT DOES NOT GIVE YOU\n#   * the model's features - only a dictionary that reconstructs well\n#   * a feature COUNT - that is your dict-size hyperparameter\n#   * evidence of use - reconstruction is correlational, patching is not\n\n# THE EVALUATION THAT MEANS SOMETHING\n#   ablate a discovered feature and measure the change in model behaviour\n#   on inputs where the feature's proposed meaning predicts an effect.\n#   A feature you cannot break the model with is a feature you have not\n#   yet shown the model uses.",
          "caption": "The discipline is the same as attribution: the decomposition generates hypotheses and the intervention tests them."
        }
      ],
      "useCases": [
        "Explaining why single-neuron interpretability plateaus - polysemantic neurons are the expected outcome of a capacity-constrained model with sparse features, not a curiosity.",
        "Finding candidate directions in a language model's residual stream to steer, ablate or monitor, where the SAE narrows a 4,096-dimensional search to a few named directions.",
        "Safety monitoring, where a direction associated with deception or refusal can be watched at inference far more cheaply than running a classifier on outputs.",
        "Model diffing across fine-tunes, where comparing which dictionary features change is more informative than comparing weights."
      ],
      "pitfalls": [
        "Reading reconstruction quality as evidence the features are right. The best-reconstructing SAE, at FVU 0.0014, recovered 5 of 24 true features; a worse one at 0.0769 recovered 16.",
        "Quoting a feature count. Alive features ranged from 11 to 50 across defensible configurations of the same data - the number is a function of dictionary size, not a property of the model.",
        "Treating a low L1 as free accuracy. At dict 96 and L1 0.02 the FVU was excellent at 0.0018 and mean L0 was 10.02, which is not a sparse code in a 6-dimensional space.",
        "Naming a feature from its top activating examples alone. That is a correlational summary and it is systematically biased toward whatever is frequent in the sampling set.",
        "Assuming features are atomic. Dictionary directions can be composites or splits of true features - increasing dictionary size often shatters one feature into several that all look meaningful.",
        "Forgetting dead features. Sixteen of 24 dictionary elements were alive in one run; dead ones inflate the nominal dictionary while contributing nothing.",
        "Expecting superposition to disappear with scale. More dimensions means more features worth representing, so the ratio is what matters and it does not obviously improve."
      ],
      "connections": [
        {
          "ref": "trustworthy-ai/attribution",
          "text": "Why input-space attribution has a ceiling: if the model's units are directions in activation space, no attribution over input features can name them."
        },
        {
          "ref": "trustworthy-ai/probing-patching",
          "text": "The causal test that turns a discovered direction into a claim about use - and the lesson where a perfect probe meets a zero-effect intervention."
        },
        {
          "ref": "causal-inference/time-series-causality",
          "text": "The same identification structure as synthetic control: an excellent fit whose decomposition is not identified, so the weights should not be interpreted."
        },
        {
          "ref": "unsupervised-learning/matrix-factorization",
          "text": "The general problem - dictionary learning and sparse coding - of which SAEs are the activation-space instance, with the same rotation and scaling ambiguities."
        },
        {
          "ref": "unsupervised-learning/ica",
          "text": "The classical result on when a linear decomposition IS identifiable, which is the right baseline for asking what an SAE could recover in principle."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is superposition?",
          "a": "Representing more features than dimensions by giving each a DIRECTION rather than an axis, accepting interference because sparse features rarely co-activate."
        },
        {
          "q": "Give the measured phase change.",
          "a": "20 features in 5 dims. P(off)=0: 11 represented, loss 0.0624. P(off)=0.99: ALL 20, loss 0.0004 — three orders of magnitude better."
        },
        {
          "q": "Does the interference go away at high sparsity?",
          "a": "No. Mean off-diagonal cosine stayed ~0.36 throughout. It stops being PAID for, because collisions become rare."
        },
        {
          "q": "Why is ReLU load-bearing for superposition?",
          "a": "It absorbs small negative interference into the flat region, so the model can tolerate non-orthogonal directions far better than a linear map could."
        },
        {
          "q": "Why is a neuron the wrong unit?",
          "a": "Features are directions and there are more of them than neurons, so a neuron is a projection of several features — polysemanticity is the expected outcome, not a curiosity."
        },
        {
          "q": "What does an SAE do?",
          "a": "Learns an overcomplete dictionary with a sparsity penalty on activations, reconstructing the activation vector from few active dictionary elements."
        },
        {
          "q": "★ Give the reconstruction-vs-recovery result.",
          "a": "24 known true features. Best fit (FVU 0.0014) recovered **5/24**. A worse fit (FVU 0.0769, dict 96) recovered **16/24**."
        },
        {
          "q": "So what selects the right SAE?",
          "a": "Nothing in the reconstruction loss — the right one is defined by a ground truth you don't have. Same structure as synthetic control's donor weights."
        },
        {
          "q": "Is 'the SAE found 512 features' a finding?",
          "a": "No — it's a restatement of your dictionary size. Alive counts ranged 11 to 50 across defensible configs on the SAME data."
        },
        {
          "q": "What does the L1 coefficient trade?",
          "a": "Sparsity against reconstruction. dict 96, L1 0.02 → FVU 0.0018 but mean L0 = 10.02, which isn't a sparse code in 6 dimensions."
        },
        {
          "q": "What are dead features?",
          "a": "Dictionary elements that never activate. 16 of 24 alive in one run — they inflate the nominal dictionary while contributing nothing."
        },
        {
          "q": "What evaluation of a discovered feature actually means something?",
          "a": "Ablate or patch it and measure the behaviour change where its proposed meaning predicts an effect. Reconstruction is correlational; intervention is not."
        }
      ],
      "standard": [
        {
          "q": "Explain superposition and why it changes what interpretability should look for.",
          "a": "SUPERPOSITION IS A CAPACITY TRADE. A model has more things worth representing than it has dimensions, and if those things are SPARSE — rarely active simultaneously — it can store them as non-orthogonal DIRECTIONS rather than as axes, accepting interference between them because collisions are rare. The toy model shows the trade directly: twenty features into five dimensions, so at most five can be orthogonal. At zero sparsity the model represents about eleven of them at a loss of 0.0624. Push the probability a feature is inactive to 0.99 and it represents ALL TWENTY at a loss of 0.0004 — three orders of magnitude better while storing four times more features than dimensions. Crucially the interference does not disappear: mean off-diagonal cosine stayed around 0.36 in every regime. It simply stops being paid for, because two interfering features are rarely on at once. THE CONSEQUENCE FOR INTERPRETABILITY IS THAT A NEURON IS THE WRONG UNIT. If features are directions and there are more of them than neurons, then any single neuron is a projection of several features, and polysemanticity is the predicted outcome rather than a puzzle. 'Find the dog neuron' was searching in a basis the model never used.",
          "deepDive": "Two mechanistic details are worth having. First, the ReLU is load-bearing: it lets the model absorb small negative interference into its flat region, so superposition works far better with a nonlinearity than without, and the toy model's behaviour changes qualitatively if you remove it. Second, feature IMPORTANCE interacts with sparsity — when features have unequal importance, the model preferentially gives the important ones cleaner directions and crowds the rest, so you see a mix of near-monosemantic and heavily-shared directions rather than a uniform smear. On the question of whether scale rescues us: more dimensions means more features worth representing, so the RATIO is what matters and there is no strong reason to expect it to improve — larger models seem to have more superposition, not less, because their training distribution supports more distinguishable concepts. That makes superposition a structural fact about the field rather than a transitional problem, and it is the main argument for dictionary-learning approaches over neuron-level analysis."
        },
        {
          "q": "How do sparse autoencoders work, and how much should you trust their output?",
          "a": "AN SAE LEARNS AN OVERCOMPLETE DICTIONARY OVER ACTIVATIONS with a sparsity penalty: encode the activation into a much larger vector of nonnegative coefficients, penalize their L1, and decode back with unit-norm dictionary directions. The hope is that the learned directions recover the model's features, since the generative story — few active features combining linearly — matches the SAE's inductive bias. TRUST IT AS A HYPOTHESIS GENERATOR AND NOT AS A MEASUREMENT. On a task with 24 KNOWN ground-truth features in 6 dimensions, the configuration with the best reconstruction — FVU 0.0014, essentially perfect — recovered only 5 of the 24 true directions at cosine above 0.9. A configuration reconstructing far worse, FVU 0.0769 with a 96-element dictionary, recovered 16. THE BEST FIT GAVE THE WORST RECOVERY. And nothing in the training objective distinguishes them, because the objective measures reconstruction and the thing you want is identification, which is defined by a ground truth that in real models does not exist. Alive-feature counts ranged from 11 to 50 across defensible configurations of the same data, so 'the SAE found N features' is a restatement of the dictionary size.",
          "deepDive": "The structural parallel worth naming is synthetic control from the causal module: an excellent pre-period fit whose donor weights were wrong, where the fit was identified and the decomposition was not. Same shape here. The general lesson is that when a method has more free parameters than the data constrains, a good objective value is compatible with many different decompositions, and the objective cannot rank them. That is why the field has moved toward evaluations that do not rely on reconstruction: automated interpretability scoring, where a language model predicts activations from a proposed explanation; ablation studies measuring downstream loss when a feature is removed; and feature-splitting analysis checking whether a direction shatters into several as the dictionary grows, which is a strong hint it was a composite. None of these is decisive, and the honest current state is that SAE features are useful, better than neurons, and not yet shown to be the model's actual units. Saying that plainly is more defensible than either dismissing the technique or reporting feature counts as discoveries."
        },
        {
          "q": "How would you validate that a discovered feature is real?",
          "a": "BY INTERVENING, BECAUSE EVERYTHING ELSE IS CORRELATIONAL. The standard evidence — top activating examples all sharing a theme — is a summary of when the direction is active, which is exactly the kind of claim the causal module spent ten lessons warning about, and it is biased toward whatever is frequent in the sampling set. THE TEST THAT MEANS SOMETHING is ablation: set the feature's coefficient to zero, or subtract its direction from the residual stream, and measure the behaviour change on inputs where the proposed meaning PREDICTS an effect and on control inputs where it predicts none. A feature you cannot break the model with is a feature you have not shown the model uses. The converse test is steering: add the direction and check that the behaviour appears, which is the stronger evidence because it is harder to get by accident. I WOULD ALSO RUN THE NEGATIVE CONTROLS. Ablate a random direction of the same norm and confirm the effect is smaller. Check the effect on unrelated inputs to bound the specificity. And check whether the feature survives increasing the dictionary size, since a direction that shatters into three when the dictionary doubles was probably a composite rather than an atom.",
          "deepDive": "It is worth being clear about what ablation does and does not establish, because interpretability results are frequently over-read in the same way attribution results are. A successful ablation shows the model's output DEPENDS on that direction for those inputs; it does not show the direction means what you named it, and it does not show the model has no other route to the same behaviour. Redundancy is common — ablating one path often produces a smaller effect than expected because another path compensates, which is the self-repair phenomenon observed in language models and a genuine methodological headache, since it makes single-component ablations systematically understate importance. The mitigations are ablating sets rather than singletons, and measuring the effect with the compensating path also disabled. There is also a sampling issue in the naming step: top activating examples are drawn from a corpus, so a feature that fires on a rare construction will be named by whichever common thing also triggers it, and the explanation will be wrong in a way that is invisible until someone tests an input the naming set never contained."
        },
        {
          "q": "What is the practical value of this work if the features are not identified?",
          "a": "THE VALUE IS THAT IT NARROWS THE SEARCH AND GIVES YOU SOMETHING TO INTERVENE ON, which is a genuine advance over the alternative of staring at neurons. Three concrete uses. FIRST, SAFETY MONITORING: a direction associated with a behaviour you care about — refusal, deception, a specific capability — can be watched at inference for the cost of a dot product, far cheaper than running a classifier over outputs, and it fires before the output exists rather than after. Whether the direction is the model's true atom is somewhat beside the point if it reliably predicts the behaviour, which is a testable claim. SECOND, STEERING: adding or subtracting a direction changes behaviour at inference without retraining, which is a cheap and reversible control surface. THIRD, MODEL DIFFING: comparing which dictionary features change across a fine-tune is far more informative than comparing weights, and it is how you notice a safety fine-tune removed a capability versus merely suppressing its expression. IN ALL THREE THE CLAIM IS OPERATIONAL — this direction predicts or controls this behaviour — rather than ontological, and operational claims are testable in the way the identification claim is not.",
          "deepDive": "That reframing is the honest way to present the field's current state, and it also sets the right expectations for what could go wrong. A monitoring direction validated on one distribution can fail on another, exactly like every other guarantee in this module, so it needs the same treatment: state the reference class, test on held-out distributions, and expect degradation under shift. A steering vector strong enough to change behaviour is often strong enough to degrade capability generally, so the evaluation must include unrelated tasks and not just the target behaviour. And model diffing inherits the identification problem in a specific way — if the dictionary is refit on each model, the features are not comparable across them, so you need a shared dictionary or an explicit matching step, and papers that skip this are comparing coordinate systems rather than features. None of that undermines the utility; it means the results should be reported as engineering claims with measured operating characteristics, which is a lower bar than 'we understand the model' and a much more useful one."
        },
        {
          "q": "How does this lesson instantiate the module's thesis?",
          "a": "THROUGH A GUARANTEE THAT IS REAL AND ABOUT SOMETHING OTHER THAN WHAT PEOPLE READ IT AS. An SAE's reconstruction loss is an honest measurement of how well the dictionary reconstructs activations, and FVU of 0.0014 is a genuinely excellent reconstruction. What it is not is evidence about feature identification — that same configuration recovered 5 of 24 true features while a configuration reconstructing 50x worse recovered 16. The number is true; the claim made from it is about a different property. THE STRUCTURE IS THE SAME AS EVERY LESSON SO FAR. Calibration's ECE was an average over a chosen population. Conformal's coverage was marginal over a chosen exchangeable distribution. A fairness metric is a parity over a chosen partition. An attribution is a contrast against a chosen baseline. And a reconstruction score is a fit under a chosen dictionary size and sparsity penalty. IN EVERY CASE the reference — the population, the distribution, the partition, the baseline, the hyperparameter — is what determines the answer and is what the reporting convention omits. THE ACTION IS THE SAME TOO: state the reference alongside the number. For an SAE that means reporting dictionary size, L1 coefficient, alive-feature count and L0 whenever you report a feature, because the feature is not well defined without them.",
          "deepDive": "There is a sharper version specific to this lesson that connects back to the causal module. Superposition means the model's representation is genuinely not axis-aligned, so there is a rotation ambiguity at the heart of the problem: many bases reconstruct equally well, and choosing among them requires a criterion outside reconstruction. Sparsity IS that criterion — it is what breaks the rotation symmetry, which is why SAEs work at all, and it is the same reason independent component analysis can identify a decomposition that PCA cannot. But sparsity only identifies the basis when the true features really are sparse to the degree assumed, and the L1 coefficient encodes that assumption. So the free parameter is not merely a knob; it is a claim about the world, and the recovered features are its consequence. That is the causal module's thesis reappearing inside interpretability: the assumption is the estimate, and here the assumption is 'how sparse are the model's true features', which nobody knows."
        },
        {
          "q": "What would change your mind about how much to trust SAE-based interpretability?",
          "a": "SEVERAL THINGS WOULD, AND STATING THEM IS WHAT MAKES THE POSITION A POSITION RATHER THAN A MOOD. FIRST, RECOVERY ON KNOWN GROUND TRUTH AT SCALE. The experiment here used 24 planted features and the recovery rate was 5 to 16 out of 24 depending on hyperparameters. If SAEs recovered planted features reliably in a realistic-scale model with realistic feature statistics — and if the recovery were robust across dictionary sizes rather than tracking them — that would be strong evidence. SECOND, HYPERPARAMETER INDEPENDENCE: if the same features appeared at dictionary sizes 4x apart, rather than splitting, that would suggest the decomposition is finding something rather than fitting a budget. THIRD, PREDICTIVE INTERVENTIONS ON HELD-OUT BEHAVIOUR: naming a feature, predicting in advance what ablating it will do on inputs nobody has looked at, and being right. That is a pre-registration standard and it is the one the field is moving toward. FOURTH, CONVERGENCE ACROSS METHODS — if SAEs, probing and patching independently identified the same directions, their different failure modes would have to conspire, which is the triangulation argument from the causal module.",
          "deepDive": "Conversely, what would lower my confidence: evidence that discovered features are strongly dependent on the training corpus used to fit the SAE rather than on the model; feature-splitting behaviour that continues indefinitely with dictionary size, suggesting there is no atomic level to find; or a demonstration that steering vectors derived from SAE features are no more effective than directions found by much simpler means such as difference-in-means between contrastive prompts, which some results already suggest for certain behaviours. That last one is the most important practical check and the least glamorous: BASELINE AGAINST THE SIMPLE THING. A large fraction of interpretability's operational value — monitoring and steering — is achievable with contrastive difference vectors requiring no dictionary learning at all, and a technique should have to beat that baseline before its complexity is justified. Asking 'what does this beat' is the same discipline as asking for a negative control, and it is the question most likely to be missing from an impressive-looking result."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Superposition",
        "back": "Storing more features than dimensions as non-orthogonal DIRECTIONS, accepting interference because sparse features rarely co-activate. Interference vs capacity; sparsity sets the exchange rate."
      },
      {
        "type": "formula",
        "front": "★ The measured phase change",
        "back": "20 features in 5 dims. P(off)=0 → 11 represented, loss 0.0624. P(off)=0.99 → **ALL 20**, loss 0.0004. Off-diagonal cosine stays ~0.36 throughout — interference never leaves, it stops being PAID for."
      },
      {
        "type": "intuition",
        "front": "Why a neuron is the wrong unit",
        "back": "Features are directions and there are more of them than neurons, so any neuron is a projection of several. Polysemanticity is the PREDICTED outcome. \"Find the dog neuron\" searched a basis the model never used."
      },
      {
        "type": "intuition",
        "front": "Why ReLU is load-bearing here",
        "back": "It absorbs small negative interference into its flat region, so non-orthogonal directions are far more tolerable than in a linear map. Remove it and the toy model's behaviour changes qualitatively."
      },
      {
        "type": "pitfall",
        "front": "★ Best reconstruction, worst recovery",
        "back": "24 known true features. FVU **0.0014** (near-perfect) → **5/24** recovered. FVU 0.0769 (dict 96) → **16/24**. Nothing in the reconstruction loss distinguishes them."
      },
      {
        "type": "pitfall",
        "front": "\"The SAE found N features\"",
        "back": "A restatement of your dictionary size. Alive counts ran **11 to 50** across defensible configs on the SAME data. Report dict size, L1, alive count and L0 whenever you report a feature."
      },
      {
        "type": "intuition",
        "front": "The identification parallel",
        "back": "Same structure as synthetic control in module 23: **the FIT is identified, the DECOMPOSITION is not.** Good objective value is compatible with many decompositions and cannot rank them."
      },
      {
        "type": "pitfall",
        "front": "Low L1 is not free accuracy",
        "back": "dict 96, L1 0.02 → FVU 0.0018 (excellent) but mean **L0 = 10.02** in a 6-dimensional space. That is not a sparse code; it's a dense one with good reconstruction."
      },
      {
        "type": "definition",
        "front": "What validates a discovered feature",
        "back": "ABLATION (zero it, measure behaviour where the meaning predicts an effect + controls where it doesn't) and STEERING (add it, check the behaviour appears). Top-activating examples are a correlational summary."
      },
      {
        "type": "pitfall",
        "front": "Self-repair",
        "back": "Ablating one path often produces a smaller effect than expected because another compensates — so single-component ablations systematically UNDERSTATE importance. Ablate sets, or disable the compensating path too."
      },
      {
        "type": "intuition",
        "front": "What sparsity is really doing",
        "back": "Breaking the rotation symmetry. Many bases reconstruct equally well; sparsity is the criterion that picks one — same reason ICA identifies what PCA cannot. So the L1 coefficient is a CLAIM about how sparse the model's features are."
      },
      {
        "type": "intuition",
        "front": "★ The baseline SAEs must beat",
        "back": "Contrastive difference-in-means vectors — no dictionary learning at all — already deliver much of the monitoring and steering value. Ask what a technique BEATS before its complexity is justified."
      }
    ],
    "refs": [
      {
        "title": "Elhage et al. (2022), Toy Models of Superposition",
        "url": "https://transformer-circuits.pub/2022/toy_model/index.html"
      },
      {
        "title": "Bricken et al. (2023), Towards Monosemanticity: Decomposing Language Models With Dictionary Learning",
        "url": "https://transformer-circuits.pub/2023/monosemantic-features/index.html"
      },
      {
        "title": "Templeton et al. (2024), Scaling Monosemanticity: Extracting Interpretable Features from Claude 3 Sonnet",
        "url": "https://transformer-circuits.pub/2024/scaling-monosemanticity/index.html"
      },
      {
        "title": "Cunningham, Ewart, Riggs, Huben & Sharkey (2023), Sparse Autoencoders Find Highly Interpretable Features in Language Models",
        "url": "https://arxiv.org/abs/2309.08600"
      },
      {
        "title": "Olah et al. (2020), Zoom In: An Introduction to Circuits",
        "url": "https://distill.pub/2020/circuits/zoom-in/"
      }
    ],
    "demos": [
      "superposition",
      "sparse-autoencoder",
      "pca",
      "embeddings"
    ]
  },
  "probing-patching": {
    "level": "advanced",
    "body": {
      "intuition": [
        "A probe asks whether information is PRESENT in an activation. An intervention asks whether the output DEPENDS on it. Those are the correlational and the causal question, and this lesson is the causal module's thesis relocated inside a network - with the enormous advantage that here you can actually intervene.",
        "The demonstration is as clean as this subject gets. Train a network on a task whose label depends on fact A only, with an irrelevant fact B also present in the input. A linear probe reads B out of the hidden layer at 1.0000 accuracy - perfect. Flip B in the input and the mean change in output probability is 0.000003, with the predicted label flipping on 0.0000% of examples. Flip A and the mean change is 0.999990 with 100% of labels flipping. A PERFECT PROBE AND EXACTLY ZERO CAUSAL EFFECT.",
        "Both results are true and they answer different questions. 'The model represents B' is correct. 'The model uses B' is false. Every claim built on probing alone is the first kind wearing the language of the second, and the fix costs one forward pass: change the thing and see what happens."
      ],
      "math": [
        {
          "h": "What a probe measures",
          "paras": [
            "A probe is a small classifier fitted from activations to some property. Its accuracy is a statement about the DECODABILITY of that property from the representation, given the probe's capacity.",
            "Decodability is necessary for use and nowhere near sufficient, because a representation can carry information the downstream computation ignores."
          ],
          "tex": "\\text{probe: } g_\\theta(h(x)) \\to z, \\qquad \\mathrm{acc}(g) \\text{ bounds } I(h(x); z) \\text{ from below - not } \\frac{\\partial f}{\\partial z}",
          "texNote": "Measured: probe accuracy 1.0000 for the used fact A and 1.0000 for the unused fact B. The probe cannot distinguish them, because both are equally decodable and only one is consumed."
        },
        {
          "h": "What an intervention measures",
          "paras": [
            "Patching replaces an activation with the value it takes on a counterfactual input, then measures the change in output. It is the do-operator, applied to a component you fully control.",
            "This is the quantity causal inference spends whole modules trying to approximate, and inside a network it is directly computable."
          ],
          "tex": "\\Delta = \\mathbb{E}\\big|f(x)-f(x_{h\\leftarrow h'})\\big|: \\quad \\Delta_B = 3\\times10^{-6}\\ (0.0000\\%\\ \\text{label flips}), \\quad \\Delta_A = 0.999990\\ (100\\%)",
          "texNote": "Five orders of magnitude between a fact the model represents perfectly and a fact it uses. No correlational method separates these two; the intervention separates them completely."
        },
        {
          "h": "Probes need controls, exactly like any classifier",
          "paras": [
            "A probe's accuracy is meaningless without a baseline that says what accuracy is achievable by capacity alone."
          ],
          "tex": "\\text{random label on real activations}: 0.4998, \\qquad \\text{real label on random activations}: 0.4991",
          "texNote": "Both at chance here, which is what a clean setup looks like. In a real model with high-dimensional activations and a strong probe, both baselines can rise well above chance, and a probe score not compared against them says nothing."
        }
      ],
      "code": [
        {
          "h": "★ The experiment in full",
          "paras": [
            "Label depends on A only. B is in the input, irrelevant to the task, and perfectly decodable from the hidden layer."
          ],
          "code": "# task accuracy                                   1.0000\n\n# PROBING - is the information there?\n#   probe accuracy for A (used by the task)       1.0000\n#   probe accuracy for B (NOT used)               1.0000   <- indistinguishable\n\n# PATCHING - does the output depend on it?\n#   flip B: mean |dP(class 1)| = 0.000003   labels flipped   0.0000%\n#   flip A: mean |dP(class 1)| = 0.999990   labels flipped 100.0000%\n\n# CONTROLS (without these a probe score means nothing)\n#   probe for a RANDOM label on real activations  0.4998\n#   probe for B on RANDOM activations             0.4991\n\n# ★ 'The model represents B' is TRUE. 'The model uses B' is FALSE.\n#   One forward pass separates them.",
          "caption": "The gap is five orders of magnitude, and no amount of probing sophistication closes it, because probing is not measuring that quantity."
        },
        {
          "h": "The patching toolkit",
          "paras": [
            "Variants differ in what they hold fixed, and each answers a slightly different counterfactual."
          ],
          "code": "# ACTIVATION PATCHING  run x_clean, cache activations; run x_corrupt,\n#   splice in ONE cached activation, measure the output recovery.\n#   -> 'is this component sufficient to restore the behaviour?'\n\n# ABLATION             zero it, or replace with the dataset MEAN, or\n#   resample from another input.\n#   -> 'is this component necessary?'  ★ zero-ablation puts the model\n#      OFF-DISTRIBUTION; mean- or resample-ablation is usually fairer\n\n# PATH PATCHING        patch a component's effect along SOME edges only\n#   -> separates direct effect from effect through a mediator, which is\n#      exactly the mediator question from module 23\n\n# ATTRIBUTION PATCHING linearize the patch with a gradient to approximate\n#   thousands of patches in one backward pass - cheap, and an approximation\n\n# ★ Report the ablation TYPE. Zero, mean and resample give different\n#   numbers and the difference is often larger than the effect claimed.",
          "caption": "Path patching is the mediator-versus-total-effect distinction, and it is the reason circuit claims need more than a single ablation number."
        }
      ],
      "useCases": [
        "Testing whether a safety-relevant property a probe detects - deception, refusal intent, a capability - actually drives the output, before building monitoring on top of it.",
        "Localizing a behaviour to a small set of components so a fix can be targeted, which is the practical payoff of circuit analysis.",
        "Checking whether a fine-tune removed a capability or merely suppressed its expression, by probing for it and then patching to see if it can be reactivated.",
        "Debugging a model that fails on a slice, by patching activations from a working input to find where the computation diverges."
      ],
      "pitfalls": [
        "Reporting probe accuracy as evidence of use. A perfect 1.0000 probe accompanied a 0.000003 causal effect and 0.0000% label flips.",
        "Running a probe without controls. Random-label and random-activation baselines were both at chance here; in a real high-dimensional model a strong probe can score well above chance on pure noise.",
        "Using an over-powerful probe. A deep probe measures what is EXTRACTABLE with computation, not what the model has made available - which is why linear probes are the conservative default.",
        "Zero-ablating and calling it necessity. Zeroing puts the model off-distribution, so the damage measured includes the shock of an impossible activation; mean- or resample-ablation is fairer.",
        "Not reporting the ablation type. Zero, mean and resample ablation give materially different numbers, and the spread is frequently larger than the effect being claimed.",
        "Single-component ablations in the presence of self-repair. Other paths compensate, so the measured effect understates importance and a component can look unimportant while being load-bearing.",
        "Treating a circuit found on one prompt distribution as the model's algorithm. It is the algorithm for those inputs, and generalization to other inputs is a separate empirical claim."
      ],
      "connections": [
        {
          "ref": "causal-inference/causal-graphs",
          "text": "Patching IS the do-operator, and path patching is the mediator-versus-total-effect distinction - the same framework, applied where intervention is free."
        },
        {
          "ref": "trustworthy-ai/superposition-sae",
          "text": "Where the units to intervene ON come from, and why neurons are the wrong ones - patching a direction is only as good as the direction."
        },
        {
          "ref": "trustworthy-ai/attribution",
          "text": "The correlational tier of the same ladder: attention weights and saliency generate hypotheses that patching then tests."
        },
        {
          "ref": "advanced-nlp/interpretability",
          "text": "The applied NLP treatment - induction heads, name-mover circuits, and what a published circuit analysis actually contains."
        },
        {
          "ref": "causal-inference/potential-outcomes",
          "text": "Why this setting is unusually lucky: the fundamental problem of causal inference does not bind, because you can run both potential outcomes on the same unit."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What does a probe measure?",
          "a": "Decodability — whether a property can be read out of an activation by a small classifier. Necessary for use, nowhere near sufficient."
        },
        {
          "q": "What does patching measure?",
          "a": "Dependence — replace an activation with its counterfactual value and measure the output change. It is the do-operator."
        },
        {
          "q": "★ Give the headline result.",
          "a": "Probe accuracy for an UNUSED fact: 1.0000. Flipping it: mean |ΔP| = 0.000003, labels flipped 0.0000%. Flipping the used fact: 0.999990 and 100%."
        },
        {
          "q": "So is 'the model represents B' wrong?",
          "a": "No — it's true. 'The model uses B' is the false claim. Probing supports the first and gets quoted as the second."
        },
        {
          "q": "Which two controls does a probe need?",
          "a": "A random-label probe on real activations (0.4998 here) and a real-label probe on random activations (0.4991). Both at chance = a clean setup."
        },
        {
          "q": "Why prefer linear probes?",
          "a": "A deep probe measures what's EXTRACTABLE with computation, not what the model made available. Linear is the conservative default."
        },
        {
          "q": "Name the patching variants.",
          "a": "Activation patching (sufficiency), ablation (necessity), path patching (direct vs mediated), attribution patching (gradient-linearized, cheap approximation)."
        },
        {
          "q": "What's wrong with zero-ablation?",
          "a": "It puts the model off-distribution, so the measured damage includes the shock of an impossible activation. Mean- or resample-ablation is fairer."
        },
        {
          "q": "Why report the ablation type?",
          "a": "Zero, mean and resample give materially different numbers — the spread is often larger than the effect being claimed."
        },
        {
          "q": "What is self-repair and why does it matter?",
          "a": "Other paths compensate for an ablated component, so single-component ablations systematically UNDERSTATE importance. Ablate sets, or disable the compensating path."
        },
        {
          "q": "What is path patching for?",
          "a": "Separating a component's direct effect from its effect through a mediator — module 23's mediator question, inside a network."
        },
        {
          "q": "Why is interpretability luckier than causal inference?",
          "a": "You can run BOTH potential outcomes on the same unit. The fundamental problem of causal inference does not bind — intervention is free and repeatable."
        }
      ],
      "standard": [
        {
          "q": "Explain the difference between probing and patching, and why it matters.",
          "a": "A PROBE ASKS WHETHER INFORMATION IS PRESENT; PATCHING ASKS WHETHER THE OUTPUT DEPENDS ON IT. A probe is a small classifier fitted from activations to some property, so its accuracy bounds the information content of the representation from below. Patching replaces an activation with the value it takes on a counterfactual input and measures the resulting change in output — the do-operator, applied to a component you fully control. THE GAP BETWEEN THEM IS NOT SUBTLE. In a network trained on a task whose label depends on fact A only, with an irrelevant fact B also present in the input: the probe read B out of the hidden layer at 1.0000 accuracy, identical to its 1.0000 on the fact the task actually uses. Flipping B changed the output probability by a mean of 0.000003 and flipped 0.0000% of predicted labels. Flipping A changed it by 0.999990 and flipped 100%. FIVE ORDERS OF MAGNITUDE between a fact the model represents perfectly and a fact it uses. Both measurements are correct. 'The model represents B' is true; 'the model uses B' is false; and essentially every claim built on probing alone is the first sentence wearing the grammar of the second.",
          "deepDive": "Why would a model represent something it does not use? Because representations are shaped by the input and by pressure to be linearly separable early, not by the downstream task alone — early layers preserve much of the input, and information survives until something actively discards it. In real models this is pervasive: syntactic properties, speaker attributes, and formatting details are all decodable from hidden states of models that demonstrably do not condition on them for the task at hand. The practical consequence is that a probing result should be reported as 'decodable', not as 'encoded for the purpose of', and any downstream claim — this model is using demographic information, this model has learned a world model — needs an intervention. There is also a converse failure worth knowing: a probe can FAIL on information the model does use, if the information is stored non-linearly or in a direction the probe's inductive bias cannot find. So probe accuracy is neither necessary nor sufficient for use in general, which is a strong reason to treat it strictly as a hypothesis generator that tells you where to point the intervention."
        },
        {
          "q": "How would you design a probing study so its results mean something?",
          "a": "THREE THINGS, AND THE FIRST TWO ARE ROUTINELY MISSING. FIRST, CONTROLS. A probe accuracy is uninterpretable without a baseline for what capacity alone achieves: a random-label probe on real activations, and a real-label probe on random activations of the same dimension. In my setup both came in at chance, 0.4998 and 0.4991, which is what a clean result looks like. In a real model with thousands of dimensions and a strong probe, both baselines can sit well above chance, and a headline 0.85 against a 0.80 random-label control is close to no result at all. Hewitt and Liang's control tasks are the formal version — a probe with high selectivity is one that fits the real property much better than a random one. SECOND, PROBE CAPACITY. A deep probe measures what is extractable with computation, not what the model has made available, so linear probes are the conservative default and any nonlinear probe needs its capacity justified. THIRD, AND MOST IMPORTANTLY, AN INTERVENTION. If the claim is about use, probe to localize and then patch to test, because the probe cannot distinguish a fact the model consumes from one it merely carries.",
          "deepDive": "A fourth item worth adding is layer sweeps with an eye on what they can and cannot show. Probing every layer produces a curve, and the curve is often read as the model 'building up' a representation — but decodability rising across layers is also consistent with the property simply becoming more linearly separable while the computation ignores it throughout. The curve is a description of the representation's geometry, not of a process. Similarly, the amnesic-probing family of methods, which remove a property's direction from the representation and measure the downstream damage, is a genuine improvement because it intervenes; its caveat is that removing a direction can damage other things sharing that subspace, so it needs the same controls as ablation — remove a random direction of matched norm and compare. In practice the strongest probing papers now report the probe, the control, the selectivity, and an intervention, and the ones that report only the first number are making a claim their evidence does not reach."
        },
        {
          "q": "Walk through how you would test a claim that a model has a specific internal circuit.",
          "a": "I WOULD TREAT IT AS A CAUSAL CLAIM AND TEST IT THE WAY THE CAUSAL MODULE WOULD. FIRST, LOCALIZE CHEAPLY. Use attention patterns, attribution, or an SAE to generate candidates — all correlational, all fine for narrowing a search that would otherwise be intractable. SECOND, TEST SUFFICIENCY by activation patching: run a clean input, cache activations, run a corrupted input, splice in the candidate component, and measure how much of the clean behaviour is recovered. THIRD, TEST NECESSITY by ablation, and here the choice matters — zero-ablation puts the model off-distribution so the damage includes the shock of an impossible activation, while mean- or resample-ablation asks a fairer counterfactual. I would report which one I used and ideally all three, because the spread between them is frequently larger than the effect being claimed. FOURTH, SEPARATE DIRECT FROM MEDIATED EFFECTS with path patching, which is precisely the mediator question from module 23: a component can matter entirely through a downstream component, and reporting a total effect as a direct one is the same error as controlling for a mediator. FIFTH, CONTROLS AND GENERALIZATION: ablate random components of matched size, and test the circuit on prompts outside the distribution it was discovered on.",
          "deepDive": "That last step is where most circuit claims are weakest and it deserves emphasis. A circuit found on a narrow prompt template is the algorithm for that template; whether it is the model's general mechanism is a separate empirical question, and the honest papers test it explicitly on variants. Self-repair is the other major methodological hazard: ablating one component often produces a much smaller effect than expected because another path compensates, sometimes a path that only activates when the first is removed. That makes single-component ablation systematically understate importance and can make a load-bearing component look irrelevant. The mitigations are ablating sets rather than singletons, and measuring with the compensating path also disabled — which requires knowing about it, which is circular, which is why this remains genuinely hard. My honest summary is that sufficiency evidence via patching is usually strong, necessity evidence via ablation is usually weaker than reported, and generalization evidence is usually absent."
        },
        {
          "q": "Why is interpretability methodologically luckier than causal inference?",
          "a": "BECAUSE THE FUNDAMENTAL PROBLEM OF CAUSAL INFERENCE DOES NOT BIND. In the causal module, the defining difficulty was that a unit is either treated or not and the other potential outcome is erased, so every method was a different way of buying an untestable assumption to substitute one unit for another. INSIDE A NETWORK YOU CAN RUN BOTH POTENTIAL OUTCOMES ON THE SAME UNIT. You own the model, you can set any activation to any value, run the counterfactual forward pass, and observe the result exactly — at zero ethical cost, low compute cost, and with perfect repeatability. There is no confounding, because you set the value rather than observing it; there is no selection, because you choose the inputs; and there is no sampling error in the intervention itself. That is an enormous methodological advantage and it is why the measured gap in this lesson — 0.000003 against 0.999990 — is a fact rather than an estimate with an interval. SO THE FIELD'S CEILING IS MUCH HIGHER than causal inference's, and the reason its results are still contested is not that intervention is impossible but that THE UNITS TO INTERVENE ON ARE UNCLEAR, which is what the previous lesson was about: superposition means the natural basis is wrong, and the SAE that replaces it is not identified.",
          "deepDive": "There are real limits worth naming so the optimism is calibrated. The intervention is exact, but the INPUT DISTRIBUTION you intervene over is a choice, and results on one prompt set need not transfer — that is a sampling problem, not a causal one, and it is the same external-validity issue every empirical field has. Off-distribution activations are a genuine confound: setting a component to a value it would never take makes the downstream computation's behaviour uninformative about normal operation, which is the argument for resample-ablation over zeroing. And scale is a practical barrier, since exhaustive patching is quadratic in components and attribution patching's gradient linearization is an approximation that can be badly wrong where the function is sharply nonlinear. But none of these is the fundamental problem — they are engineering and design issues with known mitigations, whereas an unmeasured confounder in an observational study is not fixable at all. The right attitude is that interpretability should be held to a HIGHER evidentiary standard than causal inference, precisely because it can meet one."
        },
        {
          "q": "A team wants to monitor a safety property using a probe. What do you advise?",
          "a": "PROBE TO DETECT, BUT VALIDATE WITH INTERVENTION BEFORE BUILDING ON IT, because the property you can detect may be one the model does not act on. The failure mode is concrete: a probe fires reliably on a direction associated with, say, deceptive intent, the team ships monitoring, and the model's actual outputs are driven by a different pathway the probe never sees — so the monitor has excellent apparent sensitivity on a curated set and no relationship to the behaviour you care about. The test is to intervene: ablate or steer the direction and confirm the behaviour changes in the predicted direction on held-out inputs. If ablating it does nothing to the behaviour, the probe is detecting a correlate, and correlates drift. THAT SAID, I WOULD NOT OVERSTATE THE REQUIREMENT. For MONITORING specifically, a reliable correlate has genuine operational value even if it is not the causal pathway — you are making a prediction, not an intervention, and predictions can ride on correlations. What matters is that the claim is stated operationally, 'this direction predicts this behaviour on this distribution', and evaluated as a predictor with a base rate, a false positive rate, and a held-out distribution. THE CAUSAL CLAIM IS ONLY REQUIRED IF YOU INTEND TO INTERVENE on the direction to suppress the behaviour.",
          "deepDive": "That distinction — predicting versus intervening — is the crisp version of the advice and it maps exactly onto the causal module. A correlate suffices for prediction and fails for intervention, which is the first thing that module established. If the plan is to detect and then escalate to a human, the probe is doing prediction and a validated correlate is fine. If the plan is to ablate the direction at inference to prevent the behaviour, that is an intervention and it needs interventional evidence, or you will suppress a correlate while the behaviour continues through another path. There are two further cautions for monitoring in production. First, a probe trained on activations from one distribution degrades under shift like everything else in this module, so it needs the same treatment: state the reference distribution, monitor the activation statistics, and re-validate. Second, if the monitor becomes a training signal or an optimization target, it stops being a measurement — the model is then selected against the probe, and a direction that predicts the behaviour will be routed around. That is Goodhart applied to interpretability, and it is the strongest argument for keeping some monitors held out and unused in training."
        },
        {
          "q": "How does this lesson fit the module's thesis?",
          "a": "IT IS THE CLEANEST INSTANCE, BECAUSE THE NUMBERS LEAVE NO ROOM. A probe accuracy of 1.0000 is a true, honest, correctly computed measurement. It establishes decodability. Read as 'the model uses this', it is wrong, and the intervention says so with a mean output change of 0.000003 and 0.0000% of labels flipped. THE GUARANTEE IS TRUE AND NARROWER THAN ITS NAME — the same shape as an ECE that averages over a population, a conformal coverage that is marginal, a fairness metric that equalizes exactly one column, an attribution that depends on a baseline, and an SAE reconstruction that does not identify features. WHAT MAKES THIS LESSON DIFFERENT is that the wider claim is not merely unsupported, it is CHECKABLE and cheap to check. One forward pass with a modified activation separates decodability from use completely. So this is the module's most optimistic lesson: the gap between what is measured and what is claimed is, here, closable — and the reason it often is not closed is habit rather than difficulty. THE TRANSFERABLE HABIT is to ask, of any interpretability result, whether the evidence is correlational or interventional, and to notice that the language almost always implies the second while the method almost always delivers the first.",
          "deepDive": "It is worth connecting the two interpretability lessons explicitly, because together they define what the field can currently support. Lesson 24-05 established that the UNITS are not identified — an SAE's reconstruction can be near-perfect while recovering 5 of 24 true features, and the feature count tracks your dictionary size. This lesson establishes that USE is testable once you have a unit. Put together: interventions are trustworthy, and the objects you intervene on are hypotheses. That combination supports operational claims — this direction predicts, this ablation changes behaviour on this distribution — and does not yet support ontological ones about what the model 'really' represents. Being precise about which kind of claim you are making is most of the intellectual honesty available in this area right now, and it is also the difference between a result that survives replication and one that does not. The parallel with the causal module's ending is exact: name the estimand, name the assumption, price what you cannot test, and report the trade-off rather than a single number."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "★ Probing vs patching",
        "back": "Probe = is the information PRESENT (correlational). Patch = does the output DEPEND on it (causal, the do-operator). Module 23's thesis relocated inside a network — where you can actually intervene."
      },
      {
        "type": "formula",
        "front": "★ A perfect probe with zero causal effect",
        "back": "Label depends on A only; B is irrelevant. Probe accuracy for B: **1.0000** (same as for A). Flip B: mean |ΔP| = **0.000003**, labels flipped **0.0000%**. Flip A: 0.999990, 100%."
      },
      {
        "type": "intuition",
        "front": "Which claim does probing support?",
        "back": "\"The model REPRESENTS B\" — true. \"The model USES B\" — false. Nearly every probing claim is the first sentence wearing the grammar of the second."
      },
      {
        "type": "pitfall",
        "front": "The two controls a probe needs",
        "back": "Random-label probe on real activations (0.4998 here) and real-label probe on random activations (0.4991). In a real high-dim model BOTH can sit well above chance — selectivity, not raw accuracy, is the result."
      },
      {
        "type": "pitfall",
        "front": "Why prefer LINEAR probes?",
        "back": "A deep probe measures what's EXTRACTABLE with computation, not what the model made available. Capacity must be justified, not maximized."
      },
      {
        "type": "intuition",
        "front": "Why would a model represent what it doesn't use?",
        "back": "Representations are shaped by the input and by early linear separability, not by the task alone — information survives until something actively discards it. Syntax, speaker traits and formatting are all decodable from models that ignore them."
      },
      {
        "type": "definition",
        "front": "The patching toolkit",
        "back": "Activation patching (sufficiency) · ablation (necessity) · path patching (direct vs mediated — module 23's mediator question) · attribution patching (gradient-linearized, cheap, approximate)."
      },
      {
        "type": "pitfall",
        "front": "★ Zero-ablation is not a fair counterfactual",
        "back": "Zeroing puts the model OFF-DISTRIBUTION, so the damage includes the shock of an impossible activation. Prefer mean- or resample-ablation — and always report which, since the spread often exceeds the claimed effect."
      },
      {
        "type": "pitfall",
        "front": "Self-repair",
        "back": "Other paths compensate for an ablated component, sometimes only activating once it's removed. Single-component ablation systematically UNDERSTATES importance — a load-bearing component can look irrelevant."
      },
      {
        "type": "pitfall",
        "front": "A circuit found on one prompt template",
        "back": "…is the algorithm for that template. Generalization is a SEPARATE empirical claim, and it's the step most often missing. Test on variants outside the discovery distribution."
      },
      {
        "type": "intuition",
        "front": "★ Why interpretability is luckier than causal inference",
        "back": "You can run BOTH potential outcomes on the same unit — set any activation, zero ethical cost, perfectly repeatable. No confounding (you set it), no selection. The hard part is which UNITS to intervene on (→ 24-05)."
      },
      {
        "type": "intuition",
        "front": "Monitoring: predicting vs intervening",
        "back": "A validated CORRELATE suffices to predict-and-escalate. Ablating a direction to SUPPRESS a behaviour is an intervention and needs interventional evidence. And a monitor used as a training signal stops being a measurement (Goodhart)."
      }
    ],
    "refs": [
      {
        "title": "Meng, Bau, Andonian & Belinkov (2022), Locating and Editing Factual Associations in GPT (ROME)",
        "url": "https://arxiv.org/abs/2202.05262"
      },
      {
        "title": "Wang et al. (2022), Interpretability in the Wild: a Circuit for Indirect Object Identification in GPT-2 small",
        "url": "https://arxiv.org/abs/2211.00593"
      },
      {
        "title": "Hewitt & Liang (2019), Designing and Interpreting Probes with Control Tasks",
        "url": "https://arxiv.org/abs/1909.03368"
      },
      {
        "title": "Belinkov (2022), Probing Classifiers: Promises, Shortcomings, and Advances",
        "url": "https://direct.mit.edu/coli/article/48/1/207/107571"
      },
      {
        "title": "Zhang & Nanda (2024), Towards Best Practices of Activation Patching in Language Models",
        "url": "https://arxiv.org/abs/2309.16042"
      }
    ],
    "demos": [
      "probing-classifier",
      "activation-patching",
      "attention-rollout",
      "saliency"
    ]
  },
  "adversarial-robustness": {
    "level": "advanced",
    "body": {
      "intuition": [
        "Adversarial examples are not a curiosity about images. They are what happens when a model relies on features that carry real predictive signal and are individually smaller than the perturbation budget. Build a task with four large-margin features and two hundred tiny ones, each smaller than epsilon, and a standard model reaches 0.9056 clean accuracy and 0.6389 under an L-infinity attack it never saw - because it learned to use the two hundred.",
        "Adversarial training is the defence that works, and its cost is specific rather than universal. Here it recovered robust accuracy from 0.6389 to 0.8059 at a clean-accuracy cost of essentially zero, because the task HAD large-margin features available to fall back on. The famous robustness-accuracy trade-off is real when robust features are insufficient for the task, and it is not a law.",
        "The module's thesis lands hardest here, because 'robust' is the word most often used with no quantifier at all. Robustness is defined RELATIVE TO A THREAT MODEL. The model trained against L-infinity at 0.08 scores 0.8059 there, 0.6706 at twice the budget, 0.7193 under L-2, and 0.8496 against a contrast-and-brightness shift that lies outside every L-p ball. Four numbers, one model, one word."
      ],
      "math": [
        {
          "h": "The robust optimization problem",
          "paras": [
            "Adversarial training replaces empirical risk minimization with a min-max: minimize the worst-case loss inside a perturbation set. Everything that follows depends on what set you wrote down.",
            "PGD is the standard inner maximizer - projected gradient ascent, restarted from a random point in the ball."
          ],
          "tex": "\\min_\\theta\\ \\mathbb{E}_{(x,y)}\\Big[\\max_{\\|\\delta\\|_p\\leq \\varepsilon} \\mathcal{L}\\big(f_\\theta(x+\\delta),y\\big)\\Big]",
          "texNote": "The threat model is the pair (p, epsilon), and it is a MODELLING CHOICE, not a property of the world. A defence is a statement about that set and says nothing outside it."
        },
        {
          "h": "★ One model, four threat models",
          "paras": [
            "The adversarially-trained model was optimized against L-infinity perturbations of size 0.08. Every column below is the same two models."
          ],
          "tex": "\\begin{array}{lrr} \\text{attack} & \\text{standard} & \\text{adv-trained}\\\\ L_\\infty\\ \\varepsilon=0.08\\ \\text{(trained for)} & 0.6388 & \\mathbf{0.8059}\\\\ L_\\infty\\ \\varepsilon=0.16\\ \\text{(2x budget)} & 0.2901 & 0.6706\\\\ L_2\\ \\text{(comparable budget)} & 0.6995 & 0.7193\\\\ \\text{contrast + shift (no } L_p\\text{ bound)} & 0.6965 & 0.8496 \\end{array}",
          "texNote": "Robustness degrades gracefully off the trained threat model here and can collapse entirely in real systems. The number that gets published is the first row; the word 'robust' is read as all four."
        },
        {
          "h": "Certified versus empirical: a lower and an upper bound",
          "paras": [
            "Randomized smoothing gives a provable L-2 radius from a lower confidence bound on the smoothed classifier's top-class probability. It is a guarantee against EVERY perturbation in the ball, including ones nobody has invented.",
            "Empirical robust accuracy is an upper bound: it reflects only the attacks you ran."
          ],
          "tex": "R = \\sigma\\,\\Phi^{-1}(\\underline{p}), \\qquad \\underline{p} = \\text{Clopper-Pearson lower bound}, \\qquad \\text{certified} \\leq \\text{true} \\leq \\text{empirical}",
          "texNote": "Measured at radius 0.25: certified 0.8290, empirical 0.8420. At 0.50: 0.7435 and 0.7720. At 1.00: 0.0000 and 0.5965, because the maximum certifiable radius with this sigma and sample budget was 0.616. The gap IS the honest measure of your ignorance."
        }
      ],
      "code": [
        {
          "h": "★ The invalid certificate I wrote first",
          "paras": [
            "The tell was that certified accuracy came out ABOVE empirical accuracy, which a valid lower bound cannot do."
          ],
          "code": "# WRONG - the Monte Carlo POINT ESTIMATE of p\n#   p_hat = votes.max() / n,  clamped to 1 - 1e-6\n#   Phi^-1(1 - 1e-6) = 4.75  ->  max 'certified' radius 1.188\n#   ... and certified accuracy at r=1.0 came out at 0.7125 while the\n#       empirical attacked accuracy was 0.5930. A LOWER BOUND CANNOT\n#       EXCEED THE QUANTITY IT BOUNDS. That is how I knew it was broken.\n\n# RIGHT - Cohen et al. 2019\n#   1. SELECT the top class on a separate sample of n0 = 100\n#   2. ESTIMATE its probability on n = 1000 fresh samples\n#   3. take the CLOPPER-PEARSON LOWER BOUND at alpha = 0.001\n#   4. ABSTAIN if that bound is <= 0.5      (abstained on 1.6%)\n#   ->  max certified radius 0.616, and certified <= empirical everywhere\n\n# ★ The entire content of the certificate is the CONFIDENCE BOUND.\n#   Drop it and you have a number that looks like a guarantee and is not.",
          "caption": "A certificate computed from a point estimate is not a certificate. This is the module's thesis demonstrated by my own first attempt at it."
        },
        {
          "h": "Evaluating a defence honestly",
          "paras": [
            "The literature on broken defences is large and the failures are stereotyped."
          ],
          "code": "# THE CHECKLIST (Carlini et al., 'On Evaluating Adversarial Robustness')\n#   * ADAPTIVE attacks - designed against YOUR defence, not a library default\n#   * gradient sanity: does loss increase with more PGD steps? does a\n#     random-start ensemble help? if not you may have GRADIENT MASKING\n#   * check that eps -> large drives accuracy to ~0. If it does not, the\n#     attack is failing, not the model succeeding\n#   * report clean accuracy, the exact threat model, steps, restarts, and\n#     the attack's own hyperparameters\n#   * compare against adversarial training - most defences do not beat it\n\n# ★ GRADIENT MASKING is the standard way a defence looks good: obfuscated\n#   or shattered gradients make the ATTACK fail while the model remains\n#   just as vulnerable to an attack that does not need gradients.",
          "caption": "Most published defences that were not adversarial training were later broken by adaptive attacks. Assume yours will be, and evaluate accordingly."
        }
      ],
      "useCases": [
        "Security-relevant classifiers with a real adversary - malware, spam, fraud, content policy - where the threat model is a genuine question about attacker capability rather than a mathematical convenience.",
        "Certifying a safety-critical component where a provable bound is worth a large accuracy cost, and where the L-2 or L-infinity ball genuinely covers the perturbations of concern.",
        "Using adversarial training as a regularizer, since robust models tend to have more perceptually aligned features and better calibration under some shifts.",
        "Stress-testing before launch, where the goal is not a guarantee but finding the cheapest input change that flips a decision."
      ],
      "pitfalls": [
        "Saying 'robust' with no threat model. The same model scored 0.8059, 0.6706, 0.7193 and 0.8496 against four different perturbation sets, and only the first was the one it was trained for.",
        "Computing a certificate from a Monte Carlo point estimate. That gave a maximum radius of 1.188 against a correct 0.616, and produced certified accuracy above empirical accuracy - which is impossible and was the only reason I caught it.",
        "Reporting empirical robust accuracy as robustness. It is an upper bound reflecting the attacks you ran; certified accuracy is the lower bound, and the truth is between them.",
        "Evaluating a defence with a library-default attack. Adaptive attacks designed against the specific defence are the standard, and most non-adversarial-training defences fall to them.",
        "Missing gradient masking. If loss stops increasing with more PGD steps, or a huge epsilon does not drive accuracy to near zero, the attack is failing rather than the model succeeding.",
        "Assuming the robustness-accuracy trade-off is a law. Here adversarial training cost essentially nothing - 0.9056 to 0.9064 clean - because the task had large-margin features to fall back on.",
        "Forgetting that certified accuracy is a property of the SMOOTHED classifier, not the base model, and that smoothing itself cost clean accuracy - 0.9064 down to 0.8875."
      ],
      "connections": [
        {
          "ref": "cnn/adversarial",
          "text": "The vision treatment - FGSM, PGD, transferability and the physical-world attacks - which this lesson assumes and extends into certification."
        },
        {
          "ref": "trustworthy-ai/distribution-shift",
          "text": "The same question without an adversary: robustness to a distribution you did not choose, where the perturbation set is defined by the world rather than by you."
        },
        {
          "ref": "trustworthy-ai/red-teaming",
          "text": "The unbounded version - a human adversary with no L-p constraint at all - and why coverage of the attack space is the quantity that matters there."
        },
        {
          "ref": "trustworthy-ai/conformal-prediction",
          "text": "The other guarantee in this module with a stated reference class, and the same lower-bound discipline: a confidence bound is what makes a number a guarantee."
        },
        {
          "ref": "ml-theory/data-augmentation",
          "text": "The benign cousin of the min-max problem, where the perturbation set encodes invariances you want rather than an attacker you fear."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Write the robust optimization objective.",
          "a": "min_θ E[ max_{‖δ‖_p ≤ ε} L(f_θ(x+δ), y) ]. The threat model (p, ε) is a modelling CHOICE, not a property of the world."
        },
        {
          "q": "Why do adversarial examples exist?",
          "a": "Models use features that carry real signal and are individually smaller than ε. Here: 4 large-margin features plus 200 tiny ones, and the model learned the 200."
        },
        {
          "q": "Give the standard model's numbers.",
          "a": "Clean 0.9056; L∞ PGD-20 at ε=0.01/0.02/0.04/0.08 → 0.8852 / 0.8577 / 0.7969 / 0.6389."
        },
        {
          "q": "What did adversarial training buy?",
          "a": "Robust accuracy 0.6389 → 0.8059 at ε=0.08, with clean accuracy 0.9056 → 0.9064 — essentially no cost."
        },
        {
          "q": "So is the robustness-accuracy trade-off a law?",
          "a": "No. It bites when robust features are INSUFFICIENT for the task. Here large-margin features existed to fall back on, so the trade was free."
        },
        {
          "q": "★ Give the four threat models.",
          "a": "Adv-trained model: L∞ 0.08 → 0.8059 (trained for); L∞ 0.16 → 0.6706; L2 comparable → 0.7193; contrast+shift (no Lp bound) → 0.8496."
        },
        {
          "q": "Certified vs empirical — which bounds which?",
          "a": "certified ≤ true ≤ empirical. Certified covers EVERY perturbation in the ball; empirical reflects only the attacks you ran."
        },
        {
          "q": "Give the randomized smoothing radius formula.",
          "a": "R = σ·Φ⁻¹(p̲), where p̲ is a Clopper-Pearson LOWER confidence bound on the smoothed top-class probability."
        },
        {
          "q": "★ What happens if you use the point estimate instead?",
          "a": "You get an invalid certificate. Max radius 1.188 vs a correct 0.616 — and certified accuracy came out ABOVE empirical, which a lower bound cannot do."
        },
        {
          "q": "Give the measured certified/empirical gap.",
          "a": "r=0.25: 0.8290 / 0.8420. r=0.50: 0.7435 / 0.7720. r=1.00: 0.0000 / 0.5965 (max certifiable radius was 0.616)."
        },
        {
          "q": "What is gradient masking?",
          "a": "Obfuscated or shattered gradients make the ATTACK fail while the model stays vulnerable. Tell: loss stops rising with more PGD steps, or huge ε doesn't drive accuracy to ~0."
        },
        {
          "q": "How should a defence be evaluated?",
          "a": "ADAPTIVE attacks designed against it, gradient sanity checks, the full threat model and attack hyperparameters, and a comparison against adversarial training."
        }
      ],
      "standard": [
        {
          "q": "Explain adversarial examples and why adversarial training works.",
          "a": "ADVERSARIAL EXAMPLES ARE WHAT HAPPENS WHEN A MODEL USES FEATURES SMALLER THAN THE PERTURBATION BUDGET. They are not a bug about images or a quirk of high dimensions — they follow from the model doing exactly what it was trained to do, which is use whatever generalizes. I built the mechanism explicitly: a task with four large-margin features and two hundred tiny ones, each individually smaller than ε. The two hundred carry most of the aggregate signal, so a standard model uses them and reaches 0.9056 clean accuracy — and an L∞ attack at ε = 0.08 wipes them out, dropping it to 0.6389. The degradation is graded: 0.8852 at ε = 0.01, 0.8577 at 0.02, 0.7969 at 0.04. ADVERSARIAL TRAINING REPLACES EMPIRICAL RISK MINIMIZATION WITH A MIN-MAX: minimize the worst-case loss inside a perturbation set, with PGD as the inner maximizer. It works by forcing the model onto features that survive the perturbation — here, the four large-margin ones — recovering robust accuracy from 0.6389 to 0.8059. THE COST WAS ESSENTIALLY ZERO in clean accuracy, 0.9056 to 0.9064, because those robust features were sufficient for the task. That is the honest version of the famous trade-off: it bites when robust features are INSUFFICIENT, and it is not a law.",
          "deepDive": "The Ilyas et al. framing is worth having because it reorients the intuition: adversarial examples arise from 'non-robust features' that are genuinely predictive and genuinely brittle, so the model is not making an error in any statistical sense — it is using signal that generalizes on the natural distribution and evaporates under a small adversarial shift. The striking evidence is that a model trained only on adversarially-perturbed images labelled with the ATTACK's target class still generalizes to the clean test set, which is hard to explain if the perturbations were meaningless noise. Practically, that reframes robustness as a preference for a particular kind of feature rather than as fixing a defect, which explains why it costs something: you are restricting the model's hypothesis class. It also explains why adversarially-trained models have side benefits — more perceptually aligned gradients, better transfer, sometimes better calibration — since large-margin features tend to be the semantically meaningful ones. On the training side, the practical costs are real: PGD adversarial training is roughly k times the cost of standard training for k inner steps, and cheaper variants like FGSM-based fast adversarial training are prone to catastrophic overfitting, where robustness to single-step attacks appears while multi-step robustness collapses."
        },
        {
          "q": "Someone tells you their model is robust. What do you ask?",
          "a": "AGAINST WHAT, AND WITH WHICH ATTACK. 'Robust' with no quantifier is not a claim. Robustness is defined relative to a threat model — a perturbation set — and it says nothing outside it. My adversarially-trained model, optimized against L∞ at ε = 0.08, scored 0.8059 there, 0.6706 at twice the budget, 0.7193 under an L2 attack of comparable size, and 0.8496 against a contrast-and-brightness change that lies outside every L∞ ball. FOUR NUMBERS, ONE MODEL, ONE WORD, and only the first is the one the training targeted. In this synthetic setup the degradation off the trained threat model was graceful; in real systems it frequently is not, and models robust to L∞ have been shown to fall to L2, to rotations, to spatial transformations, and to perturbations no one thought to test. SECOND, WHICH ATTACK, because the number is an upper bound that reflects only what you ran. I would want the number of PGD steps, the number of random restarts, whether the attack was ADAPTIVE — designed against this specific defence rather than a library default — and the clean accuracy alongside it. THIRD, THE GRADIENT SANITY CHECKS: does the loss keep increasing with more steps, and does a large ε drive accuracy to near zero? If not, the attack is failing rather than the model succeeding.",
          "deepDive": "That last check is worth doing first because gradient masking is the standard way a defence looks good without being good. Obfuscated, shattered or stochastic gradients make the optimizer fail to find the adversarial example that exists, so the measured robust accuracy is high and the model is exactly as vulnerable to an attack that does not rely on those gradients — a transfer attack from a substitute model, a gradient-free method, or expectation over transformation for stochastic defences. Athalye, Carlini and Wagner broke seven of eight ICLR 2018 defences this way, and the pattern has repeated since. The base rate here is genuinely informative: essentially every published defence other than adversarial training and certified methods has eventually been broken, so the prior on a novel defence should be low and the burden of evidence high. The practical consequence for a reviewer is to ask for the adaptive-attack section specifically, and to treat its absence as decisive rather than as an omission. For a defender, the useful posture is to assume your defence will be broken and to design the evaluation as an attempt to break it yourself."
        },
        {
          "q": "What does a certified defence give you that adversarial training does not?",
          "a": "A PROOF INSTEAD OF A MEASUREMENT. Empirical robust accuracy is an upper bound on true robustness — it reflects only the attacks you ran, so tomorrow's attack can lower it. Certified accuracy is a LOWER bound: a guarantee that no perturbation within the specified ball changes the prediction, including perturbations nobody has invented. Randomized smoothing is the practical method at scale: classify under Gaussian noise, take the majority vote, and the smoothed classifier provably has an L2 radius R = σ·Φ⁻¹(p̲) where p̲ is a lower confidence bound on the top-class probability. THE GAP BETWEEN THE BOUNDS IS THE HONEST MEASURE OF YOUR IGNORANCE. Measured: at radius 0.25, certified 0.8290 against empirical 0.8420; at 0.50, 0.7435 against 0.7720; at 1.00, 0.0000 against 0.5965, because the maximum certifiable radius under my σ and sample budget was 0.616. THE COSTS ARE THREE. Certification is expensive at inference — the estimate needed a thousand noisy forward passes per input. Smoothing costs clean accuracy, 0.9064 down to 0.8875, and the certified model is the SMOOTHED one, not the base model. And the certificate covers one norm ball: the contrast-and-brightness perturbation lies outside every L2 ball and the certificate says nothing about it.",
          "deepDive": "The methodological detail that matters most is the confidence bound, and I learned it by getting it wrong. My first implementation used the Monte Carlo point estimate of p, clamped near 1, which gives Φ⁻¹(1 − 1e-6) ≈ 4.75 and a maximum 'certified' radius of 1.188 — nearly double the correct 0.616. The tell was that certified accuracy came out at 0.7125 while the empirical attacked accuracy was 0.5930, and A LOWER BOUND CANNOT EXCEED THE QUANTITY IT BOUNDS. Cohen et al.'s procedure is specific for exactly this reason: select the top class on a separate small sample so the selection does not bias the estimate, estimate its probability on fresh samples, take a Clopper-Pearson lower bound at a stated α, and ABSTAIN when that bound does not exceed 0.5 — which happened on 1.6% of inputs. The abstention is part of the guarantee, not an implementation detail: the certificate is a statement about the inputs where it did not abstain. All of which is the module's thesis demonstrated on myself: the entire content of the certificate is the confidence bound, and without it you have a number that looks like a guarantee and is not."
        },
        {
          "q": "How would you decide whether adversarial robustness is worth investing in for a given system?",
          "a": "BY ASKING WHETHER THERE IS AN ADVERSARY AND WHAT THEY CAN ACTUALLY DO. The L∞ threat model comes from an image-classification setting where the constraint encodes imperceptibility to a human, and it transfers poorly to most production systems. For malware, spam, fraud and content policy there IS a real adversary, and the right threat model is defined by their capability — which features they control, at what cost, with what feedback — not by a norm ball. An attacker who can rewrite text arbitrarily is not constrained by any L-p budget, so an L∞-robust model is answering a question nobody asked. FOR MOST SYSTEMS THERE IS NO ADVERSARY, and the money is better spent on distribution shift, which is the same robustness question with the perturbation set chosen by the world rather than by an attacker, and which causes far more production failures. WHERE I WOULD INVEST ANYWAY: as a regularizer, since adversarially-trained models tend to have more semantically aligned features and can generalize better under some natural shifts; and for a small safety-critical component where a certificate is worth a real accuracy cost and the norm ball genuinely covers the perturbations of concern. THE HONEST DEFAULT for most teams is stress-testing rather than certification — find the cheapest input change that flips a decision, and fix what that reveals.",
          "deepDive": "The threat-model question deserves to be made concrete because it is where most of the value is. For a fraud model, the attacker controls transaction attributes but not the victim's history, faces a real cost per attempt, and gets feedback only through accept/decline — so the realistic threat model is a small number of queries over a subset of features with a cost budget, which looks nothing like a norm ball and admits a much cheaper defence, such as making the expensive-to-forge features load-bearing. For an LLM, the attacker controls the entire prompt, so there is no perturbation budget at all and the adversarial-examples literature transfers mostly as intuition; the relevant discipline is red-teaming, which is the next-but-one lesson. The structural point is that the L-p framing was a modelling convenience that made the problem tractable and has been enormously productive academically, and its convenience is not evidence about your system. Choosing a threat model that describes your actual adversary is the highest-value step and it is usually skipped, because writing down a norm ball is easy and characterizing an adversary is not."
        },
        {
          "q": "You inherit a system with a published defence. How do you audit it?",
          "a": "I WOULD TRY TO BREAK IT, AND I WOULD START WITH THE FAILURE MODES THAT ARE STEREOTYPED. First, the gradient sanity checks, because they are cheap and they catch the most common problem: does the loss keep rising with more PGD steps; does adding random restarts help; does a very large ε drive accuracy toward zero as it must. If a huge budget leaves accuracy well above chance, the attack is failing rather than the model succeeding, and I am looking at gradient masking rather than robustness. Second, ATTACKS THAT DO NOT NEED THE DEFENCE'S GRADIENTS: transfer from a substitute model, a gradient-free method, and — if the defence is stochastic — expectation over transformation, which is what defeats randomized preprocessing defences. Third, an ADAPTIVE attack written against the specific mechanism, since a library default tests whether the defence resists a generic attack, which is not the claim. Fourth, I would compare against plain adversarial training at matched clean accuracy; most published defences do not beat it, and if this one does not either, the simpler thing is preferable for maintainability alone. FIFTH, I WOULD CHECK THE THREAT MODEL AGAINST THE SYSTEM'S ACTUAL ADVERSARY, because a defence can be correct and irrelevant.",
          "deepDive": "It is worth being explicit about the prior. Essentially every published defence that is not adversarial training or a certified method has eventually been broken by an adaptive attack — Athalye, Carlini and Wagner broke seven of eight defences at one ICLR, and the pattern held for years afterward. So the base rate says a novel defence is probably broken, and the audit should be structured as an attempt to confirm that rather than as a verification exercise. Carlini et al.'s evaluation checklist is the right document to work from and its most useful property is that it is a list of things that must be REPORTED — clean accuracy, exact threat model, attack steps and restarts, whether the attack was adaptive — so absence of a section is itself a finding. On the reporting side, the single most valuable artifact to produce from an audit is a robustness curve across ε rather than a point estimate, because the shape reveals gradient masking immediately: a genuine defence degrades smoothly toward chance, and a masked one holds flat and then falls off a cliff, or never falls at all. That curve costs almost nothing to produce and it is missing from most internal evaluations I would expect to inherit."
        },
        {
          "q": "How does this lesson instantiate the module's thesis, and what is the honesty note?",
          "a": "THE WORD 'ROBUST' IS THE MODULE'S THESIS IN A SINGLE ADJECTIVE. A certified radius is a genuine mathematical guarantee — stronger than anything else in this module, since it covers perturbations nobody has invented — and it holds inside ONE norm ball, for the SMOOTHED classifier, on the inputs where the procedure did not abstain. Four qualifiers, all stated in the paper, none of them in the word. Measured, the same model gave 0.8059, 0.6706, 0.7193 and 0.8496 across four perturbation sets. THE HONESTY NOTE IS THAT I PRODUCED AN INVALID CERTIFICATE MYSELF, on the first attempt, by computing the radius from a Monte Carlo point estimate instead of a Clopper-Pearson lower bound. It gave a maximum radius of 1.188 against the correct 0.616 — nearly double — and it looked entirely plausible. THE ONLY REASON I CAUGHT IT was an internal consistency check: certified accuracy at radius 1.0 came out at 0.7125 while the empirical attacked accuracy was 0.5930, and a lower bound cannot exceed the quantity it bounds. Without that comparison I would have published a number that had the form of a guarantee and none of the content. The entire content of a certificate is the confidence bound, and dropping it leaves something that is not a weaker certificate but not a certificate at all.",
          "deepDive": "The generalizable lesson from that mistake is about which checks catch which errors. No amount of re-reading the code would have found it, because the code correctly implemented what I wrote; the error was conceptual, substituting an estimate for a bound. What found it was a RELATIONSHIP THAT MUST HOLD — certified ≤ empirical — computed independently and compared. That is the same family as the causal module's habit of asking whether a diagnostic could have come out badly, and the same family as an A/A test: an invariant you can check without knowing the right answer. Whenever a quantity is claimed to be a bound, computing the thing it bounds and comparing is close to free and catches exactly the errors that review does not. It is worth building that in deliberately: for any lower bound, produce an upper bound; for any guarantee, produce an empirical estimate of the same quantity; and treat a violated ordering as decisive. In this case it turned a wrong result into the best teaching example in the lesson, which is the most useful thing a bug can do."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "Robust optimization",
        "back": "min_θ E[ max_{‖δ‖_p ≤ ε} L(f_θ(x+δ), y) ]. The threat model (p, ε) is a MODELLING CHOICE. A defence is a statement about that set and says nothing outside it."
      },
      {
        "type": "intuition",
        "front": "Why adversarial examples exist",
        "back": "The model uses features that are genuinely predictive and individually SMALLER than ε. Built explicitly: 4 large-margin + 200 tiny features → standard model learns the 200, clean 0.9056 → robust 0.6389."
      },
      {
        "type": "pitfall",
        "front": "★ \"Robust\" with no threat model",
        "back": "ONE model trained on L∞ ε=0.08: **0.8059** there, **0.6706** at 2× budget, **0.7193** under L2, **0.8496** vs contrast+shift (outside every Lp ball). Four numbers, one word."
      },
      {
        "type": "intuition",
        "front": "Is the robustness–accuracy trade-off a law?",
        "back": "No. Here adversarial training cost NOTHING (clean 0.9056 → 0.9064) while raising robust accuracy 0.6389 → 0.8059, because large-margin features existed to fall back on. It bites when robust features are INSUFFICIENT."
      },
      {
        "type": "definition",
        "front": "Certified vs empirical",
        "back": "certified ≤ true ≤ empirical. Certified = guarantee against EVERY perturbation in the ball, including uninvented ones. Empirical = only the attacks you ran. The GAP is the honest measure of your ignorance."
      },
      {
        "type": "formula",
        "front": "Randomized smoothing radius",
        "back": "R = σ·Φ⁻¹(p̲), p̲ = Clopper-Pearson LOWER bound on the smoothed top-class probability. Measured: r=0.25 → 0.8290/0.8420; r=0.50 → 0.7435/0.7720; r=1.00 → 0.0000/0.5965."
      },
      {
        "type": "pitfall",
        "front": "★ The invalid certificate",
        "back": "Point estimate instead of a confidence bound: Φ⁻¹(1−1e−6)=4.75 → max radius **1.188** vs correct **0.616**. Caught only because certified (0.7125) EXCEEDED empirical (0.5930) — impossible for a lower bound."
      },
      {
        "type": "definition",
        "front": "Cohen et al.'s procedure",
        "back": "(1) SELECT top class on a separate n₀ sample. (2) ESTIMATE on fresh n. (3) Clopper-Pearson lower bound at α. (4) **ABSTAIN if p̲ ≤ 0.5** (1.6% here). The abstention is part of the guarantee."
      },
      {
        "type": "pitfall",
        "front": "Gradient masking",
        "back": "Obfuscated/shattered/stochastic gradients make the ATTACK fail while the model stays vulnerable. Tells: loss stops rising with more PGD steps; restarts don't help; huge ε doesn't drive accuracy to ~0."
      },
      {
        "type": "pitfall",
        "front": "The base rate on novel defences",
        "back": "Essentially every published defence other than adversarial training and certified methods has been broken by adaptive attacks (7 of 8 at one ICLR). Assume yours is broken; structure the audit as an attempt to confirm it."
      },
      {
        "type": "intuition",
        "front": "Choosing a threat model that matters",
        "back": "L∞ encodes imperceptibility to a human — an image convenience. A fraud attacker has a QUERY and COST budget over a feature subset; an LLM attacker controls the whole prompt and has no budget at all. Describe your adversary, not a norm ball."
      },
      {
        "type": "intuition",
        "front": "★ The check that catches conceptual bugs",
        "back": "A RELATIONSHIP THAT MUST HOLD, computed independently. For any lower bound, produce the upper bound and compare; a violated ordering is decisive. Code review can't find an error where the code correctly implements the wrong idea."
      }
    ],
    "refs": [
      {
        "title": "Madry et al. (2018), Towards Deep Learning Models Resistant to Adversarial Attacks",
        "url": "https://arxiv.org/abs/1706.06083"
      },
      {
        "title": "Cohen, Rosenfeld & Kolter (2019), Certified Adversarial Robustness via Randomized Smoothing",
        "url": "https://arxiv.org/abs/1902.02918"
      },
      {
        "title": "Athalye, Carlini & Wagner (2018), Obfuscated Gradients Give a False Sense of Security",
        "url": "https://arxiv.org/abs/1802.00420"
      },
      {
        "title": "Carlini et al. (2019), On Evaluating Adversarial Robustness",
        "url": "https://arxiv.org/abs/1902.06705"
      },
      {
        "title": "Ilyas et al. (2019), Adversarial Examples Are Not Bugs, They Are Features",
        "url": "https://arxiv.org/abs/1905.02175"
      }
    ],
    "demos": [
      "adversarial-examples",
      "certified-robustness",
      "image-augmentation",
      "mc-dropout"
    ]
  },
  "distribution-shift": {
    "level": "core",
    "body": {
      "intuition": [
        "Drift detection is the most widely deployed trustworthy-AI machinery and the one whose guarantee is most consistently misread. A drift detector monitors P(x). Your alert is about accuracy. Those are different quantities, and they come apart in both directions.",
        "Measured on the same model: a covariate shift that moved ten of twenty input features by a full standard deviation produced a Bonferroni-corrected p-value of essentially zero with ten features flagged - a maximally loud alarm - while accuracy sat at 0.7446 against a baseline of 0.7506. Nothing was wrong. Then a concept shift that left P(x) EXACTLY unchanged and only flipped P(y|x) took accuracy to 0.3375, worse than chance, and every detector stayed quiet: minimum p-value 1.89e-02, zero features flagged, in every row.",
        "And it is not a tooling gap. On the concept shift the mean confidence was 0.7473 against a control's 0.7466, the prediction rate 0.5031 against 0.4938, a KS test on the predicted scores gave p = 0.911, and a domain classifier scored AUC 0.5223. EVERY UNLABELLED SIGNAL WAS BLIND, because the model saw exactly the inputs it was trained on and responded exactly as before. Only the labels moved, and labels are the only thing that can see it."
      ],
      "math": [
        {
          "h": "The three shifts, and which ones a monitor can see",
          "paras": [
            "Decomposing the joint tells you immediately what an input-only monitor can and cannot detect. Covariate shift changes the marginal on x; label shift changes the marginal on y; concept shift changes the conditional.",
            "Only the first is visible without labels, and it is the one least likely to hurt you."
          ],
          "tex": "P(x,y)=P(y\\mid x)P(x): \\quad \\text{covariate: } P(x)\\ \\text{moves} \\quad \\text{label: } P(y)\\ \\text{moves} \\quad \\text{concept: } P(y\\mid x)\\ \\text{moves}",
          "texNote": "Under pure covariate shift with a well-specified model, the optimal predictor is unchanged - which is exactly why the alarm fired on a harmless change. Concept shift changes the target function itself and is invisible in x."
        },
        {
          "h": "★ The detector fires when nothing is wrong",
          "paras": [
            "Two-sample KS per feature with Bonferroni correction, against a model whose baseline accuracy is 0.7506."
          ],
          "tex": "\\begin{array}{lrrl} \\text{shift} & \\text{accuracy} & \\text{Bonferroni } p & \\\\ 0.0 & 0.7437 & 6.5\\times10^{-1} & \\text{quiet}\\\\ 0.3 & 0.7429 & 3.2\\times10^{-156} & \\textbf{ALARM}\\\\ 0.6 & 0.7453 & 0.0 & \\textbf{ALARM}\\\\ 1.0 & 0.7446 & 0.0 & \\textbf{ALARM} \\end{array}",
          "texNote": "Ten of twenty features flagged, p-values underflowing to zero, and accuracy varying by less than one point across every row. The detector is correct about P(x) and irrelevant to the decision it triggers."
        },
        {
          "h": "★ And is silent when everything is",
          "paras": [
            "Concept shift with the input distribution held bit-for-bit identical to training."
          ],
          "tex": "\\begin{array}{lrrl} \\text{concept flip} & \\text{accuracy} & \\text{Bonferroni } p & \\\\ 0.00 & 0.7453 & 3.8\\times10^{-1} & \\text{quiet}\\\\ 0.25 & 0.6642 & 3.8\\times10^{-1} & \\text{quiet}\\\\ 0.50 & 0.5448 & 3.8\\times10^{-1} & \\text{quiet}\\\\ 1.00 & \\mathbf{0.3375} & 3.8\\times10^{-1} & \\textbf{quiet} \\end{array}",
          "texNote": "The p-value is identical in every row because the inputs are drawn from the same distribution in every row. Accuracy falls below chance and no input-space statistic moves at all."
        }
      ],
      "code": [
        {
          "h": "Nothing unlabelled sees the concept shift",
          "paras": [
            "Four monitors people actually deploy, on the same three scenarios."
          ],
          "code": "#          scenario     true acc   mean conf   pred rate   KS(score)   dom-clf AUC\n#  no shift (control)     0.7460      0.7466      0.4938      4.3e-01      0.5177\n# covariate shift 1.0     0.7446      0.7492      0.4364     2.9e-38      0.9882\n# concept flip (P(x)      0.3375      0.7473      0.5031      9.1e-01      0.5223\n#   identical)            ^^^^^^      ^^^^^^      ^^^^^^      ^^^^^^^      ^^^^^^\n#                         BROKEN      normal      normal       quiet       chance\n\n# ★ The model is wrong on two-thirds of inputs and is EXACTLY as confident as\n#   before, predicts the same class balance, produces the same score\n#   distribution, and its inputs are indistinguishable from training.\n\n# This is INFORMATION-THEORETIC, not a gap in the tooling. Nothing computed\n# from x and f(x) can detect a change in P(y|x). A labelling budget is the\n# only answer, and it should be planned at design time.",
          "caption": "The covariate-shift column is the one every monitoring stack is built to catch, and it is the column where accuracy did not move."
        },
        {
          "h": "Drift dashboards are alarm generators by default",
          "paras": [
            "Per-feature testing with no correction, on data with no shift whatsoever."
          ],
          "code": "# A/A comparisons - IDENTICAL distributions - at raw alpha = 0.01\n#     10 features ->  0 flagged      Bonferroni min-p*d = 0.822  quiet\n#     50 features ->  0 flagged                           1.370  quiet\n#    200 features ->  1 flagged                           0.985  quiet\n#   1000 features ->  6 flagged                           0.135  quiet\n\n# ★ Uncorrected per-feature drift monitoring on a wide table produces a\n#   steady stream of true nulls. Teams learn to ignore the dashboard,\n#   which is the worst possible outcome for the one alarm that matters.\n\n# WHAT TO DO INSTEAD\n#   * correct for multiplicity, or monitor a single multivariate statistic\n#   * alert on EFFECT SIZE, not p-value - at production n everything is\n#     significant and almost nothing is important\n#   * tie the alert to a DECISION: which features feed which model, and\n#     what would you do differently if this fired?",
          "caption": "A p-value threshold on a wide feature table at production sample sizes is a random alarm generator with a schedule."
        }
      ],
      "useCases": [
        "Deciding when to retrain, where the honest trigger is a labelled performance estimate and the input monitor is at best a cheap early hint.",
        "Debugging a pipeline break - a feature that silently became null, a unit change, an upstream schema migration - which is what input monitoring is genuinely excellent at.",
        "Sizing a continuous labelling budget, since a few hundred labelled production cases a week bound accuracy far better than any unlabelled monitor.",
        "Validating a model before deployment in a new region or segment, where the shift is known in advance and the question is whether performance transfers."
      ],
      "pitfalls": [
        "Treating a drift alarm as a performance alarm. A maximal covariate-shift alarm accompanied accuracy of 0.7446 against a 0.7506 baseline - a difference of six tenths of a point.",
        "Treating drift silence as reassurance. Concept shift drove accuracy to 0.3375 with the detector's p-value identical to the no-shift case in every row.",
        "Believing a better unlabelled monitor exists for concept shift. Mean confidence, prediction rate, score distribution and a domain classifier were all at control values while accuracy collapsed.",
        "Running uncorrected per-feature tests on a wide table. Six of a thousand features flagged at alpha 0.01 on identical distributions, which trains everyone to ignore the dashboard.",
        "Alerting on p-values at production sample sizes, where every difference is significant and the question is whether it is large enough to matter.",
        "Assuming importance-weighting fixes covariate shift. It requires the support of the training distribution to cover the test distribution, and the effective sample size collapses exactly as it did for propensity weighting.",
        "Monitoring features nobody uses. Drift in a feature the model ignores is not a finding, and half of most drift dashboards is exactly this."
      ],
      "connections": [
        {
          "ref": "trustworthy-ai/conformal-prediction",
          "text": "The guarantee that shift invalidates - coverage fell from 0.919 to 0.752 under shift with no observable symptom, the same blindness in another formalism."
        },
        {
          "ref": "trustworthy-ai/calibration",
          "text": "Why calibration decays first: the temperature was fitted to a distribution, and confidence degrades under some shifts before accuracy visibly does."
        },
        {
          "ref": "causal-inference/ab-testing",
          "text": "The labelling discipline that actually works - a small continuously-labelled random sample, which is the same recommendation as calibrating observational estimates against experiments."
        },
        {
          "ref": "trustworthy-ai/adversarial-robustness",
          "text": "The adversarial version of the same question, where the perturbation set is chosen by an attacker rather than by the world."
        },
        {
          "ref": "mlops/monitoring",
          "text": "The production plumbing - what to log, how to sample, and where the labelled feedback loop attaches."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Name the three shifts.",
          "a": "Covariate (P(x) moves), label (P(y) moves), concept (P(y|x) moves). Only the first is visible without labels."
        },
        {
          "q": "★ Give the covariate-shift result.",
          "a": "Ten of twenty features shifted by 1σ: Bonferroni p underflowed to 0, ten features flagged — and accuracy was 0.7446 vs a 0.7506 baseline."
        },
        {
          "q": "★ Give the concept-shift result.",
          "a": "P(x) held identical; accuracy 0.7453 → 0.6642 → 0.5448 → **0.3375**, and the detector's p-value was 3.8e-01 in EVERY row."
        },
        {
          "q": "Does mean confidence catch concept shift?",
          "a": "No. 0.7473 against a control's 0.7466. Prediction rate 0.5031 vs 0.4938, KS on scores p=0.911, domain-classifier AUC 0.5223 — all at control."
        },
        {
          "q": "Why is that not a tooling gap?",
          "a": "It's information-theoretic. Nothing computed from x and f(x) can see a change in P(y|x) — the model saw its training inputs and responded identically."
        },
        {
          "q": "So what detects concept shift?",
          "a": "Labels. A continuously-labelled random sample of production traffic is the only answer, and it should be planned at design time."
        },
        {
          "q": "Why is pure covariate shift often harmless?",
          "a": "With a well-specified model, P(y|x) is unchanged, so the optimal predictor is unchanged. Performance only moves if the model was wrong in the newly-visited region."
        },
        {
          "q": "What does uncorrected per-feature drift monitoring produce?",
          "a": "False alarms: 6 of 1000 features flagged at α=0.01 on IDENTICAL distributions. Teams then learn to ignore the dashboard."
        },
        {
          "q": "P-value or effect size for a drift alert?",
          "a": "Effect size. At production n everything is statistically significant and almost nothing is important."
        },
        {
          "q": "What is input monitoring genuinely good for?",
          "a": "Pipeline breaks — a feature silently null, a unit change, a schema migration. It's excellent at that and it's not a performance monitor."
        },
        {
          "q": "Does importance weighting fix covariate shift?",
          "a": "Only under support overlap, and the effective sample size collapses exactly as it did for propensity weighting in module 23."
        },
        {
          "q": "What's the first thing to prune from a drift dashboard?",
          "a": "Features the model doesn't use. Drift in an unused feature is not a finding, and it's half of most dashboards."
        }
      ],
      "standard": [
        {
          "q": "Explain the types of distribution shift and which ones you can monitor.",
          "a": "DECOMPOSE THE JOINT AND THE ANSWER FALLS OUT. P(x,y) = P(y|x)P(x). Covariate shift moves the marginal on x; label shift moves the marginal on y; concept shift moves the conditional. AN INPUT-ONLY MONITOR SEES EXACTLY ONE OF THEM, and it is the one least likely to hurt you — under pure covariate shift with a well-specified model, P(y|x) is unchanged, so the optimal predictor is unchanged and performance only degrades if the model was already wrong in the region newly being visited. THE MEASUREMENTS MAKE THIS UNCOMFORTABLE. Shifting ten of twenty features by a full standard deviation produced a Bonferroni-corrected p-value that underflowed to zero with ten features flagged — as loud as an alarm gets — while accuracy sat at 0.7446 against a baseline of 0.7506. Then a concept shift that left P(x) bit-for-bit identical and only flipped the conditional took accuracy to 0.3375, worse than chance, with the detector reporting a p-value of 3.8e-01 in every single row, identical to the no-shift control. THE DETECTOR FIRES WHEN NOTHING IS WRONG AND IS SILENT WHEN EVERYTHING IS, and both behaviours are correct, because it is answering a question about P(x) and being read as a question about accuracy.",
          "deepDive": "Label shift deserves its own note because it is the case where cheap correction genuinely works. If P(y) moves but P(x|y) does not — a disease becomes more prevalent, fraud rates rise seasonally — then the classifier's outputs can be corrected with a confusion-matrix-based estimate of the new label marginal, via BBSE or similar, using only unlabelled data plus the original confusion matrix. That is a real result and it is worth knowing because it is the one shift with a free lunch. Covariate shift has importance weighting, which is the same machinery as inverse propensity weighting from module 23 and inherits the same failure: it requires the training support to cover the test support, and the effective sample size collapses when it does not — so the honest diagnostic is n_eff, exactly as it was there. Concept shift has nothing, and the reason is structural rather than technical. The practical framing I would give a team is that unlabelled monitoring is a cheap smoke detector for pipeline breaks, and a labelled sample is the fire alarm for performance; conflating them is how a model degrades for a quarter with a green dashboard."
        },
        {
          "q": "Your drift dashboard is red. What do you do?",
          "a": "FIRST I ASK WHAT ACCURACY IS DOING, because the two are not the same question and the dashboard cannot answer the second. If there is a labelled sample, that ends the investigation in minutes. If there is not, that absence is the actual finding and I would fix it. SECOND I ASK WHICH FEATURES DRIFTED AND WHETHER THE MODEL USES THEM, since drift in an unused feature is not a finding and half of most dashboards is exactly that. THIRD I ASK WHETHER THIS IS A PIPELINE BREAK RATHER THAN A WORLD CHANGE — a feature silently going null, a unit change from cents to dollars, an upstream schema migration, a new client version writing a different default. Input monitoring is genuinely excellent at catching these, and it is the use case that justifies the dashboard. FOURTH I LOOK AT EFFECT SIZE RATHER THAN THE P-VALUE. At production sample sizes every difference is significant: in an A/A comparison with a thousand features and no shift at all, six flagged at alpha 0.01. If the alert is a p-value threshold on a wide table, it is a random alarm generator with a schedule, and the team has already learned to ignore it — which is the worst outcome, because the one alarm that matters will be ignored too.",
          "deepDive": "The design fix worth pushing is to tie every alert to a decision before it is created: which model consumes this feature, what would you do differently if this fired, and who is on the hook. Alerts that fail that test should be demoted to a dashboard nobody is paged for. Beyond that, the single highest-value change is usually to monitor the model's OUTPUT distribution and its inputs separately, and to alert on the output only when it moves in a way the input distribution does not explain — that combination catches a class of problems neither catches alone. And I would push for a labelling budget in the same conversation, since a few hundred randomly-sampled production cases labelled per week bounds accuracy to a couple of points, costs less than the monitoring infrastructure, and answers the question everyone actually has. That recommendation is the same shape as the causal module's advice to calibrate observational estimates against experimental truth: a small amount of ground truth, collected continuously, beats a large amount of inference about ground truth."
        },
        {
          "q": "How would you detect that a model's performance has degraded without labels?",
          "a": "YOU LARGELY CANNOT, AND THE HONEST ANSWER IS TO SAY SO AND THEN DESCRIBE THE PARTIAL MEASURES. I tested four monitors people deploy against a concept shift that took accuracy from 0.7460 to 0.3375. Mean confidence: 0.7473 against a control's 0.7466. Prediction rate: 0.5031 against 0.4938. A KS test on the predicted score distribution: p = 0.911. A domain classifier trying to separate training from production inputs: AUC 0.5223, chance. ALL FOUR AT CONTROL VALUES while the model was wrong on two-thirds of inputs — because the model saw exactly the inputs it was trained on and responded to them exactly as before. Only the labels moved. That is information-theoretic rather than a gap in the tooling. WHAT DOES PARTIALLY WORK: confidence and score-distribution monitoring catch some covariate shifts that DO hurt, particularly where the model is pushed into regions it is uncertain in, so they are worth having. Conformal set sizes are a better version of the same signal. Proxy metrics tied to downstream behaviour — click-through, escalation rate, user correction rate, appeal rate — are often the earliest real signal, because they are weak labels arriving for free. AND THE ANSWER THAT WORKS IS A LABELLING BUDGET, planned at design time.",
          "deepDive": "The proxy-metric point deserves elaboration because it is the most useful practical move and it is underused. Many systems have implicit labels arriving continuously: a user who edits the model's suggestion, a reviewer who overturns a decision, a customer who calls to complain, a retry, an abandonment. None is a clean label and all are cheap and high-volume, and their RATE is often a sharper degradation signal than any input statistic. The caution is that they are themselves subject to shift — a change in the UI changes the correction rate without any model change — so they need their own baseline. On the labelling side, the design detail that matters most is that the sample must be RANDOM. Labelling the cases the model was least confident about gives a biased and usually pessimistic estimate, and labelling the ones a human happened to review gives a selection-biased one, which is module 23's collider problem in a monitoring costume. A small uniform random sample beats a large convenience sample, and stratifying it by segment lets you catch the subgroup degradation that an aggregate number hides — which is this module's thesis applied to monitoring."
        },
        {
          "q": "How do you decide when to retrain?",
          "a": "ON A LABELLED PERFORMANCE ESTIMATE CROSSING A THRESHOLD TIED TO A BUSINESS DECISION, not on a drift signal. The reason is the measurement above: drift and performance are different quantities that move independently, so a drift-triggered retrain fires on harmless covariate shift and misses concept shift entirely. IF LABELS ARE GENUINELY UNAVAILABLE, scheduled retraining on a fixed cadence is usually better than drift-triggered retraining, because it is predictable, it can be tested, and it does not create a feedback loop where noisy alarms drive model churn. The cadence should come from measured decay: retrain, hold out a time-forward window, and see how fast performance falls — that curve is the input, and it is worth measuring once properly. THERE ARE COSTS TO RETRAINING that get ignored in this conversation. Every retrain invalidates a calibration, a conformal calibration set, any fairness thresholds, and any monitoring baselines, so the retrain pipeline has to re-derive all of them or they silently become wrong. A retrained model can also be worse in a segment while better on average, which is the aggregation failure this module keeps returning to, so segment-level comparison should be a gate rather than a post-hoc check.",
          "deepDive": "The feedback-loop risk is worth a specific mention because it is a genuine hazard in production systems and it is invisible in offline evaluation. If the model's predictions influence which data you collect — who gets shown what, whose application gets reviewed, which transactions are approved — then retraining on production logs trains on a distribution the previous model created, and small biases compound across generations. That is a causal problem, not a drift problem: the logged data is confounded by the policy that generated it, which is exactly module 23's setting and the reason logged propensities and a permanent random holdout matter. The holdout serves double duty here — it gives unbiased training data and an unbiased performance estimate — which makes it easier to justify than either alone. The other practical guard is to compare a retrained model against the incumbent on a fixed frozen benchmark AND on fresh labelled production data, since the first catches regressions and the second catches the case where both models are fine on the old distribution and only one handles the new one."
        },
        {
          "q": "How does this lesson fit the module's thesis?",
          "a": "IT IS THE THESIS AT ITS MOST OPERATIONALLY EXPENSIVE, because this is the guarantee most teams have actually deployed. A drift detector reports, correctly and honestly, that the input distribution has changed. That statement is true. The alert routes to a page that says the model may be degraded, which is a different statement, and the two came apart in both directions in the same experiment: a maximal alarm at 0.7446 accuracy against a 0.7506 baseline, and total silence at 0.3375. OVER WHAT SET DOES THE GUARANTEE HOLD? Over P(x). Is that the set you care about? Almost never — you care about P(y|x) and about accuracy. WHAT MAKES THIS LESSON DIFFERENT from the others is that the gap is not closable. Conformal's marginal coverage can be made conditional with Mondrian partitioning. Calibration's aggregate can be split by subgroup. An attribution's baseline can be stated. Here, no unlabelled statistic can see concept shift, and I checked four of them. THE ONLY ANSWER IS TO BUY THE MISSING INFORMATION — a labelling budget — which makes this the module's clearest case of a limit you plan around rather than engineer away.",
          "deepDive": "That distinction between closable and unclosable gaps is worth carrying, because it changes what the right response is. A closable gap — marginal versus conditional coverage, aggregate versus subgroup calibration — is a reporting failure, and the fix is discipline: compute the conditional version and state it. An unclosable gap is an information limit, and the fix is a different kind of investment: acquire the information, or accept and document the exposure. Confusing the two produces two characteristic errors. The first is building ever-more-elaborate unlabelled monitoring in the hope of catching concept shift, which cannot work and consumes the budget that labels would have used. The second is treating a closable gap as a fact of life and shipping the aggregate number when the per-slice number was three lines away. Sorting your guarantees into these two categories is a short exercise and it tends to reallocate effort immediately — in most monitoring stacks I would expect it to move money from dashboards to labelling, which is the least glamorous and highest-value change available."
        },
        {
          "q": "What would you actually build for a production monitoring stack?",
          "a": "FOUR THINGS, IN THIS PRIORITY ORDER. FIRST, A CONTINUOUS RANDOM LABELLED SAMPLE. A few hundred uniformly-sampled production cases labelled per week bounds accuracy to a couple of points, catches concept shift, and is the only thing here that can. Stratify it by the segments your decisions partition on so subgroup degradation is visible, since an aggregate hides it. SECOND, PIPELINE INTEGRITY MONITORING, which is what input monitoring is genuinely excellent at: null rates, cardinality, range violations, schema changes, unit changes, freshness. These fire on real bugs, they have low false-positive rates when written as invariants rather than as statistical tests, and they catch the failures that do the most damage fastest. THIRD, OUTPUT AND CONFIDENCE MONITORING with effect-size thresholds and multiplicity control — score distribution, prediction rate, conformal set size — as a cheap early hint that is explicitly not a performance metric. FOURTH, PROXY OUTCOME METRICS: correction rate, escalation rate, appeal rate, retry rate. These are weak labels arriving free and continuously, and they are frequently the earliest real signal of degradation.",
          "deepDive": "The thing I would deliberately NOT build first is a per-feature statistical drift dashboard over a wide table, which is what most stacks start with. On identical distributions with a thousand features, six flagged at alpha 0.01, so it generates a steady stream of true nulls, and the organisational cost is that people learn the dashboard is noise. If it exists, it needs multiplicity correction, effect-size thresholds rather than p-values, restriction to features the model actually uses, and an owner for each alert with a documented action. The other thing worth building early and cheaply is a re-derivation step in the retrain pipeline: every retrain must recompute the temperature, the conformal calibration set, any fairness thresholds, and the monitoring baselines, because all four are properties of the model-plus-distribution pair and all four silently become wrong otherwise. That is a half-day of work that prevents a category of failure which is very hard to diagnose later, since the symptom appears weeks after the cause and looks like drift."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "The three shifts",
        "back": "P(x,y) = P(y|x)P(x). COVARIATE: P(x) moves. LABEL: P(y) moves. CONCEPT: P(y|x) moves. Only covariate shift is visible without labels — and it's the one least likely to hurt."
      },
      {
        "type": "pitfall",
        "front": "★ The detector fires when nothing is wrong",
        "back": "Ten of 20 features shifted 1σ → Bonferroni p underflowed to **0**, 10 features flagged. Accuracy: **0.7446** vs a 0.7506 baseline. A maximal alarm about a six-tenths-of-a-point change."
      },
      {
        "type": "pitfall",
        "front": "★ …and is silent when everything is",
        "back": "Concept shift, P(x) held IDENTICAL: accuracy 0.7453 → 0.6642 → 0.5448 → **0.3375** (below chance). Detector p-value **3.8e-01 in every row** — same as the no-shift control."
      },
      {
        "type": "pitfall",
        "front": "★ No unlabelled monitor sees concept shift",
        "back": "At accuracy 0.3375: mean confidence 0.7473 (control 0.7466), pred rate 0.5031 (0.4938), KS on scores p=0.911, domain-clf AUC 0.5223. All at control. The model saw its training inputs and responded identically."
      },
      {
        "type": "intuition",
        "front": "Why is that not a tooling gap?",
        "back": "It's information-theoretic. Nothing computed from x and f(x) can detect a change in P(y|x). A labelling budget is the only answer — plan it at design time."
      },
      {
        "type": "intuition",
        "front": "Why is pure covariate shift often harmless?",
        "back": "With a well-specified model P(y|x) is unchanged, so the OPTIMAL predictor is unchanged. Performance only degrades if the model was already wrong in the newly-visited region."
      },
      {
        "type": "definition",
        "front": "Label shift — the one free lunch",
        "back": "If P(y) moves but P(x|y) doesn't, you can correct outputs from UNLABELLED data plus the original confusion matrix (BBSE). Covariate shift has importance weighting (needs support overlap; n_eff collapses). Concept shift has nothing."
      },
      {
        "type": "pitfall",
        "front": "Drift dashboards as alarm generators",
        "back": "A/A comparisons, IDENTICAL distributions, α=0.01: 1000 features → **6 flagged**. Teams learn the dashboard is noise — so the one alarm that matters gets ignored too."
      },
      {
        "type": "intuition",
        "front": "P-value or effect size?",
        "back": "Effect size. At production n everything is statistically significant and almost nothing is important. And prune features the model doesn't use — that's half of most dashboards."
      },
      {
        "type": "intuition",
        "front": "What input monitoring IS good for",
        "back": "Pipeline breaks: a feature silently null, cents→dollars, a schema migration, a new client default. Write them as INVARIANTS, not statistical tests — low false-positive rate, fastest-damaging failures."
      },
      {
        "type": "pitfall",
        "front": "The labelled sample must be RANDOM",
        "back": "Labelling low-confidence cases gives a biased (pessimistic) estimate; labelling human-reviewed cases is selection-biased — module 23's collider problem in monitoring costume. Small uniform sample > large convenience sample."
      },
      {
        "type": "intuition",
        "front": "★ Closable vs unclosable gaps",
        "back": "Marginal→conditional coverage, aggregate→subgroup calibration: CLOSABLE, so it's a reporting failure, fix with discipline. Concept shift: UNCLOSABLE, an information limit — buy the information or document the exposure. Confusing them misallocates the whole budget."
      }
    ],
    "refs": [
      {
        "title": "Quinonero-Candela, Sugiyama, Schwaighofer & Lawrence (2009), Dataset Shift in Machine Learning",
        "url": "https://mitpress.mit.edu/9780262170055/dataset-shift-in-machine-learning/"
      },
      {
        "title": "Lipton, Wang & Smola (2018), Detecting and Correcting for Label Shift with Black Box Predictors (BBSE)",
        "url": "https://arxiv.org/abs/1802.03916"
      },
      {
        "title": "Rabanser, Gunnemann & Lipton (2019), Failing Loudly: An Empirical Study of Methods for Detecting Dataset Shift",
        "url": "https://arxiv.org/abs/1810.11953"
      },
      {
        "title": "Koh et al. (2021), WILDS: A Benchmark of in-the-Wild Distribution Shifts",
        "url": "https://arxiv.org/abs/2012.07421"
      },
      {
        "title": "Garg, Balakrishnan, Lipton, Neyshabur & Sedghi (2022), Leveraging Unlabeled Data to Predict Out-of-Distribution Performance",
        "url": "https://arxiv.org/abs/2201.04234"
      }
    ],
    "demos": [
      "drift-detection",
      "calibration",
      "conformal",
      "active-learning"
    ]
  },
  "red-teaming": {
    "level": "core",
    "body": {
      "intuition": [
        "Red-teaming is sampling from an attack space you cannot enumerate, and the number that matters is the one nobody reports: COVERAGE. A report listing what was found is compatible with two very different worlds - a model with few vulnerabilities, and a team that stopped looking. Without a coverage estimate those produce identical documents.",
        "Simulating a model with 300 latent vulnerability classes and a heavy-tailed discovery distribution: 1,000 probes found 138 of them, 46%. Twenty thousand probes found 280, 93%. The Chao1 estimator, computed from the singleton and doubleton counts alone, estimated 209 and 290 against the true 300 - so an estimate of what you MISSED is available from the data you already have, and it is a lower bound.",
        "The sharpest result is that the same red-team suite supports opposite conclusions depending on your threat model. Patching every one of the 214 classes found by a 3,000-probe campaign takes failure on NATURAL traffic from 1.0000 to 0.0153 - a genuine 98% reduction. It takes failure against an ADVERSARY from 100% to 100%, because 86 classes remain and an attacker SEARCHES rather than samples. The residual 1.5% of natural mass is essentially all of what a motivated attacker will use."
      ],
      "math": [
        {
          "h": "Coverage estimation from the discovery curve",
          "paras": [
            "Chao1 estimates unseen richness from the counts of classes seen exactly once and exactly twice. Many singletons relative to doubletons means a large unsampled tail.",
            "It is a LOWER bound on the number of classes, which is exactly the right direction for a safety claim."
          ],
          "tex": "\\hat{S}_{\\text{Chao1}} = S_{\\text{obs}} + \\frac{f_1(f_1-1)}{2(f_2+1)}: \\quad n{=}1000 \\to 138\\ \\text{found},\\ \\hat{S}=209; \\quad n{=}20000 \\to 280,\\ \\hat{S}=290 \\quad (\\text{true } 300)",
          "texNote": "At n = 200 it estimated 109 against a true 300 - badly low, because at low coverage there is little information about the tail. The honest reading is 'at least this many remain', which is still infinitely more than a report with no estimate."
        },
        {
          "h": "Capture-recapture: overlap between independent teams is the signal",
          "paras": [
            "Two teams working independently give an estimate from their overlap. High overlap means saturation; low overlap means the space is far larger than either found.",
            "It is the cheapest coverage estimate available and almost nobody computes it."
          ],
          "tex": "\\hat{N}_{LP} = \\frac{|A|\\cdot|B|}{|A\\cap B|} = \\frac{183\\times179}{147} = 223 \\quad (\\text{true } 300)",
          "texNote": "The estimate is LOW, and the reason is instructive: the teams are not independent, because both sample easy classes first. Heterogeneity biases capture-recapture downward, so every estimate here is a floor."
        },
        {
          "h": "★ The same patch, two threat models",
          "paras": [
            "A 3,000-probe campaign found 214 of 300 classes, carrying 98.47% of natural traffic mass. Patching all of them:"
          ],
          "tex": "\\begin{array}{lrrr} \\text{patched} & \\text{suite pass} & \\text{NATURAL failure} & \\text{ADVERSARIAL failure}\\\\ 0\\% & 0.0\\% & 1.0000 & 100\\%\\\\ 50\\% & 50.0\\% & 0.7453 & 100\\%\\\\ 100\\% & 100.0\\% & \\mathbf{0.0153} & \\mathbf{100\\%} \\end{array}",
          "texNote": "A 98% reduction and no reduction at all, from the same work, because an accidental user samples traffic and an adversary searches. State which threat model your number describes."
        }
      ],
      "code": [
        {
          "h": "The discovery curve flattens for two different reasons",
          "paras": [
            "A raw 'issues found per week' chart cannot distinguish saturation from exhaustion of the tester's imagination. The singleton count can."
          ],
          "code": "#  probes   distinct found   % of true   singletons   doubletons   Chao1\n#      50         23            7.7%          16            5          43\n#     200         61           20.3%          37           13         109\n#   1,000        138           46.0%          60           24         209\n#   5,000        232           77.3%          43           39         255\n#  20,000        280           93.3%          21           21         290\n\n# ★ flattening curve + MANY singletons -> a long tail remains, keep going\n# ★ flattening curve + FEW singletons  -> genuinely approaching saturation\n\n# The singleton count is the diagnostic. Notice it PEAKS mid-campaign (60 at\n# n=1000) and falls as coverage grows - a rising singleton count means you are\n# still on the steep part of the curve no matter what the headline says.",
          "caption": "Report the discovery curve and the singleton count, not just the issue list. Both are free, and together they say whether stopping is justified."
        },
        {
          "h": "What a red-team report should contain",
          "paras": [
            "Structured so a reader can tell what was NOT tested, which is the part that determines residual risk."
          ],
          "code": "# THE FINDINGS                what broke, severity, reproduction\n# THE THREAT MODEL            who is the adversary, what can they do,\n#                             what do they know, what does success mean\n# THE ATTACK SPACE SAMPLED    categories attempted, categories NOT attempted,\n#                             and how prompts/inputs were generated\n# COVERAGE ESTIMATE           discovery curve, singleton count, Chao1, and\n#                             overlap with any independent effort\n# EFFORT                      probes run, person-hours, wall-clock, budget\n# WHAT WOULD CHANGE THE ANSWER  which unexplored category worries you most\n\n# ★ 'We found no further issues' and 'we ran out of time' produce IDENTICAL\n#   reports without the effort and coverage sections. Those two sentences\n#   should never be indistinguishable in a safety document.",
          "caption": "The findings section is the part everyone writes and the least informative about residual risk. The coverage and effort sections are where the decision actually lives."
        }
      ],
      "useCases": [
        "Pre-launch safety assessment for a generative system, where the deliverable is a residual-risk statement rather than a list of fixed prompts.",
        "Continuous adversarial evaluation in production, where the attack distribution moves and a frozen suite decays into a regression test within weeks.",
        "Auditing a third-party model you cannot inspect, where behavioural probing is the only access and coverage estimation is the only honest way to bound what you learned.",
        "Deciding whether to ship, by converting a discovery curve and a threat model into a statement about what an attacker is likely to find in the first month."
      ],
      "pitfalls": [
        "Reporting findings without coverage. 'We found no further issues' and 'we ran out of time' are the same document unless effort and a coverage estimate are stated.",
        "Treating a patched suite as safety. Patching all 214 found classes took natural-traffic failure to 0.0153 and adversarial failure from 100% to 100%, with 86 classes untouched.",
        "Using a frozen red-team suite as a safety metric. It becomes a regression test the moment it is patched against, and pass rate then measures regression, not risk.",
        "Reading a flattening discovery curve as saturation. With a high singleton count it means the opposite - a long tail remains and you are still on the steep part.",
        "Trusting capture-recapture as an unbiased estimate. Two teams gave 223 against a true 300 because they are not independent; heterogeneity biases these estimators downward, so treat them as floors.",
        "Letting the red team's findings become training data without keeping some held out. Training on everything you found leaves nothing to measure with, and the model learns the suite.",
        "Assuming natural-traffic statistics describe an adversary. The classes nobody sampled carried 1.53% of natural mass and are approximately 100% of what a searching attacker will use."
      ],
      "connections": [
        {
          "ref": "trustworthy-ai/adversarial-robustness",
          "text": "The bounded version of the same problem - there the threat model is a norm ball, here there is no budget at all and coverage replaces the certificate."
        },
        {
          "ref": "rag-agents/guardrails",
          "text": "The mitigations being tested, and why a guardrail's own false-negative rate is the number that carries a red-team finding into production."
        },
        {
          "ref": "agentic-ai/agent-security",
          "text": "Where the attack space is largest - an agent with tools has an action space, not just an output space, and coverage is correspondingly harder to claim."
        },
        {
          "ref": "trustworthy-ai/alignment-governance",
          "text": "Who owns the residual-risk decision, and why a coverage estimate is what makes that decision reviewable rather than a matter of confidence."
        },
        {
          "ref": "llm-systems/llm-eval",
          "text": "The measurement discipline underneath - a red-team suite is an eval, and inherits every problem with scorers, contamination and sample size."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is the number missing from most red-team reports?",
          "a": "Coverage. A findings list is compatible with 'few vulnerabilities' and 'we stopped looking' — without effort and coverage those are the same document."
        },
        {
          "q": "What is Chao1?",
          "a": "Ŝ = S_obs + f₁(f₁−1)/(2(f₂+1)) — estimates unseen richness from singleton and doubleton counts. A LOWER bound, which is the right direction for a safety claim."
        },
        {
          "q": "Give the measured discovery curve.",
          "a": "Of 300 true classes: 1,000 probes → 138 found (46%), Chao1 209. 20,000 probes → 280 (93%), Chao1 290."
        },
        {
          "q": "When is Chao1 unreliable?",
          "a": "At low coverage. n=200 gave 109 against a true 300 — badly low, because there's little information about the tail yet."
        },
        {
          "q": "What does capture-recapture add?",
          "a": "Overlap between two independent teams estimates the total. 183 and 179 found with 147 overlap → 223 (true 300)."
        },
        {
          "q": "Why was that estimate low?",
          "a": "The teams aren't independent — both sample easy classes first. Heterogeneity biases capture-recapture DOWNWARD, so treat every estimate as a floor."
        },
        {
          "q": "★ Give the two-threat-model result.",
          "a": "Patching all 214 found classes: NATURAL traffic failure 1.0000 → **0.0153** (a real 98% win). ADVERSARIAL failure 100% → **100%**, with 86 classes left."
        },
        {
          "q": "Why the difference?",
          "a": "An accidental user SAMPLES traffic; an adversary SEARCHES. The missed classes carried 1.53% of natural mass and ~100% of what an attacker will use."
        },
        {
          "q": "What does a flattening discovery curve mean?",
          "a": "Ambiguous. With MANY singletons, a long tail remains and you're still on the steep part. With FEW singletons, genuine saturation. The singleton count distinguishes them."
        },
        {
          "q": "Why does a frozen red-team suite decay?",
          "a": "Once patched against, its pass rate measures REGRESSION, not risk — and the attack distribution moves. It becomes a regression test within weeks."
        },
        {
          "q": "Should red-team findings become training data?",
          "a": "Some, not all. Train on everything you found and you have nothing left to measure with, and the model learns the suite rather than the property."
        },
        {
          "q": "Name the sections a red-team report needs.",
          "a": "Findings, threat model, attack space sampled (and NOT sampled), coverage estimate, effort spent, and what unexplored category worries you most."
        }
      ],
      "standard": [
        {
          "q": "How would you assess whether a red-team exercise was thorough?",
          "a": "BY ASKING FOR COVERAGE AND EFFORT, WHICH IS WHERE THE INFORMATION IS. A findings list tells you what broke and nothing about what remains, and those are the same document whether the model is genuinely clean or the team ran out of time — that is the single most important structural fact about red-team reporting. THE ESTIMATES ARE CHEAP AND AVAILABLE FROM DATA YOU ALREADY HAVE. The discovery curve — distinct issue classes found against probes run — plus the singleton count gives you Chao1, which estimates unseen richness from the ratio of classes seen once to classes seen twice. In simulation with 300 true vulnerability classes: 1,000 probes found 138 and Chao1 estimated 209; 20,000 probes found 280 and it estimated 290. So even mid-campaign, an estimate of what you are missing is derivable, and it is a LOWER bound, which is the correct direction for a safety claim. THE SECOND ESTIMATOR IS OVERLAP: run two independent efforts and use capture-recapture. Teams finding 183 and 179 with 147 in common gave an estimate of 223 against a true 300. THE DIAGNOSTIC THAT MATTERS MOST is the singleton count, because a flattening discovery curve is ambiguous — many singletons means a long tail remains, few means genuine saturation, and the raw curve cannot tell them apart.",
          "deepDive": "The capture-recapture underestimate is worth understanding rather than dismissing, because it generalizes. Lincoln-Petersen assumes the two efforts are independent and that all classes are equally catchable; here both teams sampled from the same heavy-tailed discovery distribution, so both found the easy classes and the overlap was inflated, which drives the estimate down. Heterogeneity always biases these estimators downward, which is convenient — every number is a floor, so 'at least this many remain' is a safe reading. You can reduce the bias by making the teams genuinely different: different backgrounds, different tooling, different attack philosophies, one automated and one manual. That is a real argument for diversity in red-teaming that is about measurement rather than about sentiment — the more the two efforts' catchability profiles differ, the more informative their overlap. It also argues for keeping the teams from sharing findings during the exercise, which teams naturally want to do, and which destroys the estimator."
        },
        {
          "q": "A team patched everything the red team found. Are they safe now?",
          "a": "THAT DEPENDS ENTIRELY ON THE THREAT MODEL, AND THE SAME WORK SUPPORTS OPPOSITE ANSWERS. In simulation a 3,000-probe campaign found 214 of 300 vulnerability classes, and those 214 carried 98.47% of natural traffic mass. Patching all of them took failure on NATURAL traffic from 1.0000 to 0.0153 — a genuine 98% reduction, and exactly the right number to report if the concern is ordinary users hitting problems by accident. It took failure against an ADVERSARY from 100% to 100%, because 86 classes remain and an attacker does not sample traffic, they SEARCH. The 1.53% of natural mass that nobody found is approximately 100% of what a motivated attacker will use, because they will keep trying until they land in it. SO THE HONEST STATEMENT IS TWO NUMBERS, not one, and the report has to say which threat model each describes. THERE IS A SECOND PROBLEM with 'we patched everything found': the suite's pass rate went from 0% to 100%, and that number now measures regression rather than risk. A suite you have optimized against is a regression test, and treating its pass rate as a safety metric is Goodhart with extra steps.",
          "deepDive": "The practical consequence is that some findings must be held out. If every discovered vulnerability goes into the training or patching set, you have no measurement left — the same reason you do not train on the test set — and the model learns the specific prompts rather than the underlying property. The standard split is to patch most and hold back a stratified sample across severity and category, then measure on the holdout. It feels wrong to leave a known vulnerability unpatched, and the counterargument is that without a holdout you cannot tell whether patching generalized at all, which is the thing you most need to know. The related question is whether patching produced a real fix or a narrow one: the test is whether a paraphrase or a nearby variant of a patched attack still works, and it very often does. A patch that fails paraphrase testing has taught the model a surface pattern, and the correct interpretation of a 100% suite pass rate in that case is that you have measured memorization."
        },
        {
          "q": "How is red-teaming different from adversarial robustness as covered earlier?",
          "a": "THE THREAT MODEL HAS NO BUDGET, AND THAT CHANGES EVERYTHING. Adversarial robustness assumes a perturbation set — an L-p ball of radius epsilon — which makes the problem mathematically tractable, allows certification, and lets you state a guarantee that covers perturbations nobody has invented. Red-teaming has no such constraint: an attacker rewriting a prompt is not bounded by any norm, so there is no ball to certify over, no min-max to solve, and no certificate available in principle. WHAT REPLACES THE CERTIFICATE IS COVERAGE, and coverage is a statistical estimate rather than a proof. That is a genuine downgrade in guarantee strength and it should be stated as one: the strongest honest claim from a red-team exercise is 'we sampled this much of an attack space we cannot enumerate, and estimate at least this many classes remain', which is much weaker than 'no perturbation within radius r changes the output'. THE SECOND DIFFERENCE IS THAT THE ATTACK SPACE IS NOT STATIC. New jailbreak families appear, so a suite frozen at launch decays; whereas an L-infinity ball at epsilon 0.08 is the same set forever. THE THIRD is that success is not binary or even well defined — 'harmful output' is a judgment call, which means the scorer is part of the measurement.",
          "deepDive": "That last point connects to the eval problems from the LLM systems module and deserves weight, because it is where red-team numbers are least comparable across organisations. If success is adjudicated by a human panel, you inherit inter-rater disagreement; if by a model judge, you inherit its biases, including the length and position biases measured earlier in the curriculum; and if by a keyword rule, you inherit a brittle proxy that both misses paraphrases and fires on discussion of the topic. The severity scale is equally load-bearing and equally unstandardized, so 'we found 12 critical issues' means whatever that team's rubric meant. The practical recommendation is to publish the rubric and a sample of adjudicated cases alongside the counts, and to measure the scorer's own agreement rate, because a red-team report without those is not comparable to any other red-team report — including your own from last quarter, if the rubric drifted. That is the same discipline as reporting the binning with an ECE or the variant with a SHAP plot: the number is meaningless without its reference."
        },
        {
          "q": "How would you structure continuous red-teaming for a deployed system?",
          "a": "AS A SAMPLING PROGRAM WITH A MOVING TARGET, NOT AS A GATE. Four components. FIRST, AUTOMATED GENERATION at volume — model-generated attacks, mutation of known families, fuzzing over templates — because that is what makes coverage estimation statistically meaningful; hand-written suites are too small for a discovery curve to say anything. SECOND, HUMAN RED-TEAMING for novelty, because automated generation explores the neighbourhood of what it already knows and humans supply the genuinely new families that shift the distribution. THIRD, PRODUCTION MINING: real users find things no red team does, so misuse reports, unusual refusal patterns, and outlier conversations are a discovery channel and usually the highest-yield one. FOURTH, MEASUREMENT — the discovery curve, singleton counts, and overlap between the automated and human channels, tracked over time. THE STRUCTURAL POINT is that the suite must keep growing and some of it must stay unpatched, or you lose the ability to measure. And the reporting cadence should include the coverage estimate, not just the issue count, because an issue count falling is ambiguous in exactly the way a flattening discovery curve is.",
          "deepDive": "The overlap between channels is the most useful and least used metric in that list. If your automated generator and your human team find largely the same classes, you are near saturation of the space they can both reach — which is not the same as saturation of the attack space, but it does tell you the marginal value of more of the same is low and you need a genuinely different generator. If they overlap barely at all, the space is much larger than either has explored and the total estimate should be revised upward sharply. Tracking that ratio over time is the cheapest early warning that your program has stopped learning. One more organisational hazard worth naming: red-teaming that reports to the team shipping the model has an incentive problem, and the failure is subtle — not suppressed findings so much as a drift toward testing what is likely to pass, and toward severity rubrics that classify generously. Independent reporting lines and a rubric fixed in advance are the standard mitigations, and both are cheap relative to the cost of a report that everyone believes and that measured the wrong thing."
        },
        {
          "q": "What would you put in a red-team report that most reports omit?",
          "a": "THREE SECTIONS, AND ALL THREE ARE ABOUT WHAT WAS NOT FOUND. FIRST, EFFORT: probes run, person-hours, wall-clock, budget. Without it, 'we found no further issues' and 'we ran out of time' are indistinguishable, and in a safety document those two sentences should never look the same. SECOND, THE ATTACK SPACE SAMPLED AND NOT SAMPLED: which categories were attempted, how inputs were generated, and — the part that carries the most information — which categories were deliberately or accidentally skipped. A reader can reason about an unexplored category; they cannot reason about one they do not know was unexplored. THIRD, A COVERAGE ESTIMATE: the discovery curve, the singleton count, Chao1, and the overlap with any independent effort. Those are computed from data the exercise already generated and they turn a list into a bounded claim. I WOULD ALSO ADD 'WHAT WOULD CHANGE THE ANSWER' — the unexplored category the team is most worried about — because it is the single most decision-relevant sentence in the document and it never appears. AND THE THREAT MODEL, explicitly, because the same findings support a 98% risk reduction or none at all depending on whether the adversary samples or searches.",
          "deepDive": "It is worth being clear about what these additions cost, since the argument for them has to survive contact with a deadline. The discovery curve and singleton count are a groupby over data already logged — under an hour. Chao1 is one line. Capture-recapture requires running two efforts, which is the only genuinely expensive item, and it can be approximated by splitting one team's effort in half by time or by tester and treating those as pseudo-independent, which biases the estimate but still bounds it. Effort tracking is free if logged during the exercise and painful to reconstruct after. So the marginal cost of a substantially more informative report is small, and the reason it is not standard is convention rather than economics. The framing that tends to work with leadership is that the current report answers 'what did we find' and the decision they have to make requires 'what is left', and those are different questions — which is the same argument this module has made about every other guarantee in it."
        },
        {
          "q": "How does this lesson fit the module's thesis?",
          "a": "IT IS THE THESIS WITH THE WEAKEST STARTING GUARANTEE, WHICH MAKES THE REFERENCE CLASS MATTER MOST. A red-team report says: these attacks succeeded, these did not. Both halves are true. What gets read from it is 'the model is safe', which is a claim about an attack space that was sampled, not enumerated. OVER WHAT SET DOES THE FINDING HOLD? Over the attacks you ran. Is that the set you care about? No — you care about the attacks that exist, and in simulation a campaign covering 71.3% of classes left 86 unfound. WHAT MAKES THIS LESSON DISTINCTIVE is that the gap is PARTIALLY closable and the tools are unusually cheap: Chao1 from singleton counts, capture-recapture from overlap, the discovery curve from logs already collected. That puts it between the closable gaps like subgroup calibration and the unclosable one from the drift lesson — you cannot enumerate the space, and you can bound how much of it you have seen. THE OTHER DISTINCTIVE FEATURE is that the same measurement supports opposite conclusions: 0.0153 natural failure and 100% adversarial failure from identical work, which makes the threat model, not the findings, the load-bearing part of the document.",
          "deepDive": "Reading this alongside the adversarial robustness lesson gives the full spectrum of guarantee strength in this module, and it is worth holding as a ladder. A certified radius is a proof over a set you defined, and it holds against attacks nobody has invented. Empirical robust accuracy is a measurement over attacks you ran, and it is an upper bound that tomorrow's attack lowers. A red-team finding is a sample from a space you cannot define, and coverage estimation is the only bound available. Strength decreases and applicability increases as you go down, which is not a coincidence — the tractable threat models are tractable because they are narrow. The mistake is to use the language of the top of the ladder while standing at the bottom, and the word 'safe' does that every time it appears without a threat model attached. If this module leaves one habit, it should be reading the quantifier out loud: 'no perturbation within L2 radius 0.5 for the smoothed classifier on non-abstained inputs' versus 'none of the 3,000 attacks we tried', and then asking which one the decision needs."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "★ The number missing from red-team reports",
        "back": "COVERAGE. A findings list is identical whether the model is clean or the team stopped looking. \"We found no further issues\" and \"we ran out of time\" must never produce the same document."
      },
      {
        "type": "formula",
        "front": "Chao1",
        "back": "Ŝ = S_obs + f₁(f₁−1)/(2(f₂+1)) — unseen richness from singletons and doubletons. Measured (true 300): n=1,000 → 138 found, Ŝ=209. n=20,000 → 280 found, Ŝ=290. A LOWER bound."
      },
      {
        "type": "pitfall",
        "front": "When Chao1 fails",
        "back": "At low coverage. n=200 → 109 against a true 300. Little information about the tail yet. Reading: \"at least this many remain\" — still infinitely more than no estimate."
      },
      {
        "type": "formula",
        "front": "Capture-recapture",
        "back": "N̂ = |A|·|B|/|A∩B|. Teams found 183 and 179, overlap 147 → **223** (true 300). LOW because the teams aren't independent — both sample easy classes first. Heterogeneity biases DOWNWARD, so it's a floor."
      },
      {
        "type": "pitfall",
        "front": "★ The same patch, two threat models",
        "back": "Patched all 214 found classes (98.47% of natural mass): NATURAL failure 1.0000 → **0.0153** (real 98% win). ADVERSARIAL failure 100% → **100%** (86 classes left). Users SAMPLE; attackers SEARCH."
      },
      {
        "type": "intuition",
        "front": "A flattening discovery curve means…",
        "back": "Ambiguous. MANY singletons → long tail remains, still on the steep part. FEW singletons → genuine saturation. The singleton count is the diagnostic; it PEAKED mid-campaign (60 at n=1,000)."
      },
      {
        "type": "pitfall",
        "front": "A patched suite is a regression test",
        "back": "Suite pass rate went 0% → 100% while 86 classes stayed live. Once you optimize against a suite its pass rate measures REGRESSION, not risk — Goodhart with extra steps."
      },
      {
        "type": "intuition",
        "front": "Hold back some findings",
        "back": "Train/patch on everything you found and there's nothing left to measure with. Patch most, hold a stratified sample by severity and category. Then test PARAPHRASES — if a nearby variant still works, you measured memorization."
      },
      {
        "type": "definition",
        "front": "The report sections that matter",
        "back": "Findings · THREAT MODEL · attack space sampled AND NOT sampled · coverage estimate (curve, singletons, Chao1, overlap) · EFFORT (probes, hours, budget) · what unexplored category worries you most."
      },
      {
        "type": "intuition",
        "front": "Red-teaming vs adversarial robustness",
        "back": "No perturbation budget ⇒ no ball to certify over, no min-max, no certificate in principle. COVERAGE replaces the certificate — a statistical estimate, not a proof. And the attack space MOVES; an L∞ ball doesn't."
      },
      {
        "type": "pitfall",
        "front": "The scorer is part of the measurement",
        "back": "\"Harmful output\" is a judgment call. Human panels bring rater disagreement; model judges bring length/position bias; keyword rules miss paraphrases and fire on discussion. Publish the rubric and the scorer's agreement rate."
      },
      {
        "type": "intuition",
        "front": "★ The guarantee-strength ladder",
        "back": "Certified radius (proof over a set you defined, covers uninvented attacks) → empirical robust accuracy (upper bound, attacks you ran) → red-team finding (sample of a space you can't define). Strength falls, applicability rises. Don't use top-of-ladder language at the bottom."
      }
    ],
    "refs": [
      {
        "title": "Ganguli et al. (2022), Red Teaming Language Models to Reduce Harms",
        "url": "https://arxiv.org/abs/2209.07858"
      },
      {
        "title": "Perez et al. (2022), Red Teaming Language Models with Language Models",
        "url": "https://arxiv.org/abs/2202.03286"
      },
      {
        "title": "Chao (1984), Nonparametric Estimation of the Number of Classes in a Population",
        "url": "https://www.jstor.org/stable/4615964"
      },
      {
        "title": "Raji et al. (2020), Closing the AI Accountability Gap: Defining an End-to-End Framework for Internal Algorithmic Auditing",
        "url": "https://arxiv.org/abs/2001.00973"
      },
      {
        "title": "Zou, Wang, Kolter & Fredrikson (2023), Universal and Transferable Adversarial Attacks on Aligned Language Models",
        "url": "https://arxiv.org/abs/2307.15043"
      }
    ],
    "demos": [
      "prompt-injection",
      "guardrails",
      "adversarial-examples",
      "classification-metrics"
    ]
  },
  "alignment-governance": {
    "level": "core",
    "body": {
      "intuition": [
        "Alignment is the engineering problem of optimizing a system against a measurement of what you want, when the measurement is not what you want. Every technique in this module is a measurement, and this lesson is about what happens when something OPTIMIZES against one - which is the moment a good measurement stops being one.",
        "The measured version of Goodhart's law: a reward model that scores 'longer and more substantive is better' tracks true quality across the range it was trained on - true quality rises from 0.593 to 2.536 as policy length goes from 150 to 350 tokens, and the proxy rises with it. Push past the training range and they invert. THE PROXY IS MAXIMIZED AT 2,500 TOKENS, WHERE TRUE QUALITY IS -49.319, against a peak of 2.536 at 350. The proxy reports +9.017 MORE reward for the catastrophically worse policy, and rises monotonically the entire way.",
        "That is why governance is not paperwork bolted onto the engineering. The KL penalty in RLHF is a budget on how far you may trust a proxy off-distribution; a held-out evaluation is the only thing that can find the turn; and a named owner for the metric choice is what stops the budget being tuned on the proxy itself. Governance IS the mechanism that keeps a measurement a measurement."
      ],
      "math": [
        {
          "h": "★ Goodhart, measured",
          "paras": [
            "A policy parameterized by its output length. The reward model was fitted where responses are 150-450 tokens and is excellent there.",
            "Optimization moves the policy out of that range, and the proxy has no way to report that it has left the region it was fitted on."
          ],
          "tex": "\\begin{array}{rrr} \\text{policy length} & \\text{PROXY (optimized)} & \\text{TRUE (wanted)}\\\\ 250 & 1.054 & 2.010\\\\ 350 & 1.474 & \\mathbf{2.536}\\\\ 600 & 2.523 & 1.292\\\\ 1200 & 5.041 & -8.705\\\\ 2500 & \\mathbf{10.491} & \\mathbf{-49.319} \\end{array}",
          "texNote": "Correlation between proxy and true is +0.27 across the deployed range and -0.96 across the full range. The reward model is not broken; it is being evaluated outside the distribution it was fitted on, and nothing in its output says so."
        },
        {
          "h": "The KL budget is the control, and it cannot be tuned on the proxy",
          "paras": [
            "RLHF's KL penalty against the reference policy is exactly a budget on optimization pressure - how far you may move before the proxy stops being trustworthy.",
            "Choosing the budget requires measuring the TRUE objective on held-out data, because the proxy is monotone in the wrong direction."
          ],
          "tex": "\\max_\\pi\\ \\mathbb{E}_{\\pi}[r_\\phi(x,y)] - \\beta\\,\\mathrm{KL}\\big(\\pi\\,\\|\\,\\pi_{\\text{ref}}\\big)",
          "texNote": "Beta is not a hyperparameter to sweep on reward. Sweeping it on reward selects the smallest beta, which is the most misaligned policy. It must be selected on a held-out measurement of the thing you actually want."
        },
        {
          "h": "★ Best-of-n and policy optimization are not the same pressure",
          "paras": [
            "Selecting the top fraction from a FIXED pool cannot leave the pool's support. Optimizing a policy moves the distribution, and only the second produces the turn.",
            "This was not obvious to me until the first two versions of the experiment failed to reproduce Goodhart at all."
          ],
          "tex": "\\text{best-of-}n: \\ \\text{true} \\nearrow \\text{monotonically } 1.491 \\to 8.018 \\ \\text{at top } 0.1\\% \\qquad \\text{policy shift: true} \\nearrow \\text{then} \\searrow \\text{to } -49.3",
          "texNote": "Best-of-n reranking is meaningfully safer than RL at the same nominal optimization pressure, because it is bounded by what the base policy can already produce. That is a real argument for inference-time selection over weight updates when the reward model is weakly trusted."
        }
      ],
      "code": [
        {
          "h": "Ensembling the reward model delays the turn and does not remove it",
          "paras": [
            "Averaging removes independent error. Shared bias is not independent error."
          ],
          "code": "#  reward models averaged   TRUE quality at the top 0.2%\n#          1                        7.467\n#          4                        7.643\n#         16                        7.714\n\n# ★ Diminishing, and it converges to the ensemble's SHARED bias, not to the\n#   true objective. Every model in the ensemble learned 'longer is better'\n#   from the same annotators on the same distribution.\n\n# WHAT ACTUALLY HELPS\n#   * a KL budget selected on a HELD-OUT measure of the true objective\n#   * reward models trained on DIFFERENT annotator pools / rubrics\n#   * held-out evaluations the optimizer never sees\n#   * inference-time selection (bounded) rather than weight updates (unbounded)",
          "caption": "Ensembling is a variance fix applied to a bias problem. It buys a little and the shape of the failure is unchanged."
        },
        {
          "h": "★ The module in one table: every guarantee and its reference class",
          "paras": [
            "The deliverable of this module. The left column is what people say; the right column is what was measured."
          ],
          "code": "# CLAIM                      HOLDS OVER                        MEASURED GAP\n# 'calibrated' (ECE 0.011)   a population you chose            minority ECE 0.153\n# '90% coverage'             MARGINALLY, over exchangeable     per-class 0.727-0.990\n#                            draws                             minority 0.773\n# 'fair' (equal opportunity) ONE column of the confusion        PPV gap -0.231\n#                            matrix                            (impossibility)\n# 'feature importance'       a baseline + a parameterization    2.371 -> 1.186 on a\n#                                                              rewrite; 0.000 vs 2.344\n# 'the SAE found N features' your dictionary size               5/24 at the best fit\n# 'the model represents X'   DECODABILITY, not use             probe 1.000, effect 3e-6\n# 'robust'                   ONE norm ball, one radius          0.806 / 0.671 / 0.719\n#                                                              / 0.850 across four\n# 'no drift detected'        P(x), not accuracy                 acc 0.338, detector quiet\n# 'red team found nothing'   the attacks you ran                86 of 300 classes left\n# 'reward went up'           the proxy, off-distribution        true -49.3 at proxy max\n\n# ★ Not one of these numbers is wrong. Every one is quoted about a wider set\n#   than the one it was computed on.",
          "caption": "Ten lessons, one failure mode. The fix in every row is to state the reference class in the same sentence as the number."
        }
      ],
      "useCases": [
        "Setting a KL budget or an optimization-pressure limit for any RLHF or preference-optimization run, using a held-out measurement rather than the reward curve.",
        "Writing a model card or system card that a reader can act on, by stating each guarantee's reference class rather than its headline number.",
        "Structuring an internal review so the unresolvable choices - which fairness metric, which threat model, which residual risk is acceptable - have named owners and documented rationales.",
        "Choosing between inference-time selection and weight updates when the reward signal is weakly trusted, where boundedness is the deciding property."
      ],
      "pitfalls": [
        "Tuning the KL coefficient on reward. Sweeping beta against the proxy selects the smallest beta, which is the most misaligned policy - the proxy rose monotonically to 10.491 while true quality fell to -49.319.",
        "Reading a high proxy-true correlation as safety. Correlation was positive across the deployed range and -0.96 across the full range, and optimization is what moves you between them.",
        "Trusting reward-model ensembles to solve reward hacking. Sixteen models averaged moved true quality from 7.467 to 7.714 and converged toward the shared bias, not the true objective.",
        "Treating best-of-n and policy optimization as the same optimization pressure. Best-of-n rose monotonically to 8.018 because it cannot leave the base policy's support; policy shift turned over completely.",
        "Letting every evaluation become a training target. An eval the optimizer sees stops being a measurement, which is this module's thesis applied to the process rather than to a metric.",
        "Treating governance as documentation. The KL budget, the held-out eval, and the named owner are load-bearing engineering controls, and removing them changes the model's behaviour.",
        "Publishing a model card of headline numbers with no reference classes, which is the artefact this whole module argues against."
      ],
      "connections": [
        {
          "ref": "fine-tuning/rlhf-ppo",
          "text": "The mechanics being governed - PPO, the KL term, and reward-model training - where beta is presented as a hyperparameter and this lesson explains why it is a policy control."
        },
        {
          "ref": "fine-tuning/reward-modeling",
          "text": "Where the proxy comes from, and why annotator pool and rubric design determine the bias that ensembling cannot remove."
        },
        {
          "ref": "trustworthy-ai/red-teaming",
          "text": "The other place a measurement becomes a target: a patched suite's pass rate measures regression, exactly as an optimized reward measures the proxy."
        },
        {
          "ref": "causal-inference/ab-testing",
          "text": "The same discipline arriving from the other direction - pre-registration, held-out measurement, and a decision rule fixed before the data is seen."
        },
        {
          "ref": "mlops/ml-strategy",
          "text": "Where these controls live organizationally, and how a review process turns an unresolvable trade-off into a documented, owned decision."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "State Goodhart's law for ML.",
          "a": "When a measure becomes a target it ceases to be a good measure. Operationally: optimizing a proxy moves you off the distribution where the proxy was validated."
        },
        {
          "q": "★ Give the measured version.",
          "a": "True quality peaks at 2.536 (350 tokens). The proxy is maximized at 2,500 tokens where true quality is **−49.319** — and reports +9.017 MORE reward there."
        },
        {
          "q": "What was the proxy–true correlation?",
          "a": "+0.27 across the deployed range, **−0.96** across the full range. Optimization is what moves you from the first to the second."
        },
        {
          "q": "Can the proxy signal the turn?",
          "a": "No — it rises monotonically the whole way. Only a held-out measurement of the TRUE objective shows it."
        },
        {
          "q": "What is the KL penalty in RLHF really doing?",
          "a": "Budgeting how far you may trust a proxy off-distribution: max_π E[r_φ] − β·KL(π‖π_ref)."
        },
        {
          "q": "How should β be selected?",
          "a": "On a held-out measurement of the true objective. Sweeping β on REWARD selects the smallest β — the most misaligned policy."
        },
        {
          "q": "★ Why is best-of-n safer than RL at the same pressure?",
          "a": "It cannot leave the base policy's support. Best-of-n rose monotonically to 8.018; policy shift turned over to −49.3. Bounded vs unbounded."
        },
        {
          "q": "Do reward-model ensembles fix reward hacking?",
          "a": "Barely. 1 → 4 → 16 models gave true quality 7.467 → 7.643 → 7.714, converging to the SHARED bias. Averaging removes independent error, not shared bias."
        },
        {
          "q": "Why is shared bias shared?",
          "a": "Every model in the ensemble learned from the same annotators, the same rubric, and the same distribution."
        },
        {
          "q": "What happens to an eval the optimizer can see?",
          "a": "It stops being a measurement. Some evals must be held out and never trained against — the same reason some red-team findings must stay unpatched."
        },
        {
          "q": "Is governance documentation?",
          "a": "No. The KL budget, the held-out eval and the named owner are load-bearing engineering controls — remove them and the model's behaviour changes."
        },
        {
          "q": "★ What is the module's transferable question?",
          "a": "Over what set does this hold, and is that the set I care about? State the reference class in the same sentence as the number."
        }
      ],
      "standard": [
        {
          "q": "Explain Goodhart's law with a concrete measurement, and what follows for RLHF.",
          "a": "OPTIMIZING A PROXY MOVES YOU OFF THE DISTRIBUTION WHERE THE PROXY WAS VALIDATED, AND THE PROXY CANNOT REPORT THAT. I built the canonical version: a reward model that has learned 'longer and more substantive is better', scoring policies parameterized by output length. Across the range where it was fitted — 150 to 450 tokens — it tracks true quality closely, with true quality rising from 0.593 to a peak of 2.536 at 350 tokens and the proxy rising alongside. Past that range they invert. THE PROXY IS MAXIMIZED AT 2,500 TOKENS, WHERE TRUE QUALITY IS −49.319, and it reports +9.017 more reward there than at the true optimum. Correlation between proxy and true is positive across the deployed range and −0.96 across the full range. The reward model is not broken and was never wrong about anything it was asked in training; it is being evaluated outside its fitting distribution, and optimization is precisely the process that takes it there. WHAT FOLLOWS FOR RLHF IS THAT THE KL PENALTY IS NOT A REGULARIZATION HYPERPARAMETER — it is a budget on how far you may trust the proxy, and it is the primary safety control in the objective. And it cannot be tuned on reward, because sweeping beta against the proxy selects the smallest beta, which is the most misaligned policy.",
          "deepDive": "That last point is the practical trap and it is easy to fall into with standard tooling, because reward curves are what the training loop plots. A beta sweep with model selection on final reward is a procedure that reliably chooses the worst model, and it looks like ordinary hyperparameter tuning while doing so. The correct procedure requires a held-out measurement of the thing you actually want — human evaluation, a genuinely independent judge, or a downstream task metric — evaluated at several betas, with the selection made there. In practice teams also monitor the KL itself as a live signal, since a run whose KL is climbing steeply is spending its budget, and the characteristic reward-hacking trajectory is reward rising while KL rises faster. Worth adding that reward-model overoptimization has a measured scaling shape in the literature: Gao, Schulman and Hilton fit true-reward curves against KL and find the familiar rise-then-fall, with the peak moving further out for larger reward models. That is the useful practical summary — a bigger reward model buys you more optimization budget, and it does not remove the turn."
        },
        {
          "q": "Why is best-of-n sampling safer than policy optimization, and how confident are you?",
          "a": "BECAUSE IT IS BOUNDED BY THE BASE POLICY'S SUPPORT. Best-of-n generates from the unmodified policy and selects the highest-scoring sample, so it can only ever return something the base policy would have produced anyway — it reweights within a distribution rather than moving it. Policy optimization changes the weights, so it can reach regions the base policy would essentially never sample, which is exactly where a reward model has no training signal. I MEASURED BOTH. Under best-of-n selection from a fixed pool, true quality rose monotonically all the way to the top 0.1%, from a baseline of 1.491 to 8.018 — no turn at any selection pressure I tested. Under policy shift, true quality peaked at 2.536 and fell to −49.319. Same reward model, same true objective, completely different failure profile. I AM FAIRLY CONFIDENT IN THE MECHANISM and I would state the limit honestly: best-of-n is bounded, not safe. If the base policy already produces bad-but-high-reward outputs at some rate, best-of-n will find them, and its effective KL grows like log n so at very large n it approaches the same regime. The practical reading is that inference-time selection is the right default when the reward model is weakly trusted, and it costs n times the inference.",
          "deepDive": "I should say plainly that this distinction was not obvious to me — it emerged because my first two attempts to reproduce Goodhart failed. Selecting the top fraction from a fixed sample produced monotone improvement no matter how hard I selected, and I initially read that as a failed simulation. It was not: it was the correct behaviour of best-of-n, and the turn only appeared once I modelled the policy as MOVING the distribution rather than selecting within it. That reframed the result from 'my simulation is broken' into the actual finding, which is that the two forms of optimization pressure are qualitatively different and only one of them produces the classic turnover. The generalizable lesson is the same one from the certification bug earlier in this module: an experiment that refuses to reproduce a textbook effect is usually telling you the setup differs from the textbook's in a way that matters, and identifying that difference is worth more than the reproduction would have been. The practical corollary for a team is that 'we use best-of-n' and 'we use RLHF' should not be treated as the same risk posture even at matched reward improvements."
        },
        {
          "q": "What would you put in a system card, given everything in this module?",
          "a": "EVERY NUMBER WITH ITS REFERENCE CLASS IN THE SAME SENTENCE. That single rule generates most of the content. Not 'calibrated, ECE 0.011' but 'ECE 0.011 over the evaluation population; 0.153 for the smallest subgroup, which is 12% of users'. Not '90% coverage' but '90% marginal coverage over exchangeable draws; per-class coverage 0.73 to 0.99; minority-group coverage 0.77'. Not 'fair' but 'equal opportunity holds; PPV gap is −0.231 by construction, because the base rates differ and the three parities are mutually incompatible'. Not 'robust' but 'robust to L∞ perturbations at ε = 0.08, with accuracy 0.81 there, 0.67 at twice the budget, and 0.72 under an L2 attack'. Not 'no drift detected' but 'input-distribution monitoring is green; performance is estimated from N labelled samples per week with a confidence interval of X'. Not 'red-teamed' but 'we ran N probes across these categories, found M distinct issue classes, and estimate at least K remain'. SECOND, THE UNRESOLVABLE CHOICES WITH OWNERS: which fairness criterion and why, which threat model, what residual risk was accepted and by whom. THIRD, WHAT WOULD CHANGE THE ASSESSMENT — the specific finding that would make you withdraw the model.",
          "deepDive": "The reason to insist on the reference class rather than more numbers is that it changes what a reader can do. A headline number invites trust or distrust; a number with its reference class invites the reader to ask whether their situation is inside it, which is the only question that matters for their decision. It also makes the document falsifiable in a useful way — a claim about a stated population can be checked by someone with access to a different population, and that is how these documents improve. The failure mode to design against is a card that is comprehensive and unreadable, since a fifty-page appendix nobody reads is not better than a headline. My preference is a short front page of decisions and their owners, with a table of guarantees and reference classes, and depth in appendices. And the section that is almost always missing and most valuable is 'what we did not test', which is the same omission as the red-team report's effort section, and it is the one that lets a reader reason about residual risk rather than take it on faith."
        },
        {
          "q": "How do you keep evaluations honest inside an organization that is optimizing?",
          "a": "BY MAKING SOME MEASUREMENTS STRUCTURALLY UNAVAILABLE TO THE OPTIMIZER. This module's thesis applies to the process as much as to any metric: an evaluation the optimizer can see becomes a training target and stops being a measurement. So the controls are organizational rather than statistical. HOLD OUT EVALUATIONS COMPLETELY — sets that are never used for model selection, never reported per-checkpoint, and rotated when they leak. HOLD OUT RED-TEAM FINDINGS, patching most and reserving a stratified sample, for the identical reason: patch everything and the suite's pass rate measures regression, not risk. SEPARATE REPORTING LINES, so the team measuring is not the team shipping, which matters less because of suppressed findings than because of a slow drift toward testing what is likely to pass. PRE-REGISTER the decision rule — which metric, which threshold, which population — before the run, since choosing the primary metric after seeing results is the peeking failure from the experimentation lesson and leaves no trace in the logs. AND ROTATE the held-out sets, because any fixed set eventually leaks through repeated decisions even when nobody trains on it directly.",
          "deepDive": "The subtle version of leakage is worth naming because it defeats naive holdout discipline. Even if nobody trains on the held-out set, running it after every checkpoint and choosing which checkpoint to ship is selection ON that set, and with enough checkpoints you have effectively fitted to it — the same mechanism as multiple comparisons in the experimentation lesson, arriving through model selection rather than through metrics. The mitigations are to limit the number of times the holdout is consulted, to budget those consultations explicitly like an alpha budget, and to rotate. The broader point is that these are all instances of one pattern: any measurement that participates in a feedback loop with the thing it measures degrades, and the rate depends on how tight the loop is. Governance, in the sense worth defending, is the design of those loops — which measurements feed back, how fast, and which are deliberately isolated. That framing makes it an engineering activity with observable consequences rather than a compliance artefact, which is the only version that survives contact with a shipping deadline."
        },
        {
          "q": "Summarize what this module establishes.",
          "a": "TEN LESSONS, ONE FAILURE MODE: EVERY GUARANTEE IS TRUE, AND NARROWER THAN ITS NAME. Calibration's ECE of 0.011 was an average over a population I chose, hiding a minority ECE of 0.153. Conformal's 90% coverage was marginal, with per-class coverage from 0.727 to 0.990. A fairness metric equalizes exactly one column of the confusion matrix and the impossibility theorem forces the others apart. An attribution depends on a baseline and a parameterization — 2.371 became 1.186 from a rewrite that changed no predictions. An SAE's near-perfect reconstruction recovered 5 of 24 true features. A probe at 1.0000 accuracy accompanied a causal effect of 0.000003. 'Robust' meant four different numbers across four threat models. A drift detector was quiet at 0.338 accuracy. A red team covering 71% left 86 classes. And a reward that rose monotonically to its maximum sat at true quality −49.319. NOT ONE OF THOSE NUMBERS IS WRONG. Every one is quoted about a wider set than the one it was computed on. THE TRANSFERABLE QUESTION IS: over what set does this hold, and is that the set I care about — and the discipline is to state the reference class in the same sentence as the number.",
          "deepDive": "The one distinction worth carrying beyond the module is between CLOSABLE and UNCLOSABLE gaps, because it determines what to do. Most of these are closable and the fix is reporting discipline: per-subgroup calibration is three lines, Mondrian conformal moves coverage to a partition you choose, the SHAP variant and baseline can be stated, the threat model can be named, the coverage estimate is a groupby over data you already logged. Those are failures of convention, not of possibility. One is genuinely unclosable: no unlabelled statistic can detect concept shift, which I verified against four monitors while accuracy fell to 0.338, and the only response is to buy the missing information with a labelling budget. Confusing the two misallocates effort in a specific and common way — teams build elaborate unlabelled monitoring that cannot work while shipping aggregate numbers whose per-slice version was three lines away. Sorting your own guarantees into those two buckets is a short exercise and it tends to reallocate the budget immediately, usually from dashboards toward labels and toward the reference classes you were not printing."
        },
        {
          "q": "What is the honest state of alignment as an engineering discipline?",
          "a": "IT HAS REAL CONTROLS AND NO SOLUTION, AND THE CONTROLS ARE WORTH TAKING SERIOUSLY. What genuinely works: a KL budget selected on a held-out measurement, which bounds how far a proxy is trusted; inference-time selection instead of weight updates when the reward model is weakly trusted, because best-of-n is bounded by the base policy's support while RL is not; held-out evaluations the optimizer never sees; annotator and rubric diversity, since ensembling removes independent error and leaves shared bias, moving true quality only 7.467 to 7.714 from 1 to 16 models; and red-teaming with a coverage estimate rather than a findings list. WHAT DOES NOT WORK: assuming a high proxy-true correlation survives optimization, when it was +0.27 in-range and −0.96 overall; assuming ensembles solve reward hacking; treating any of this as solved. THE HONEST FRAMING is that alignment as practiced today is the discipline of optimizing against imperfect measurements with explicit budgets on how far you trust them — which is a real engineering activity with measurable controls, and is not the same as having a specification of what you want. The gap between those two is the open problem, and it is not closed by any technique in this module.",
          "deepDive": "It is worth being clear about what this module does and does not cover, since the field's public conversation ranges much wider. Everything here concerns systems you can measure, optimize and intervene on, and the controls all depend on having a true-objective measurement that is at least sometimes available — human evaluation, a downstream metric, a held-out judgment. Arguments about systems capable enough to make that measurement unreliable, whether through deception, situational awareness, or optimization pressure applied to the evaluators themselves, are outside what any experiment I can run addresses, and I would not extrapolate these results to them. What I would carry forward is the methodological posture rather than the specific numbers: name the measurement, name what it is a proxy for, bound the optimization pressure applied against it, hold something out, and state the reference class. That posture is what makes the difference between a system whose failures are surprising and one whose failures are the ones you wrote down in advance — which is a lower bar than alignment and a much better position than most deployed systems occupy."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "★ Goodhart, measured",
        "back": "TRUE quality peaks at **2.536** (350 tokens). The PROXY is maximized at 2,500 tokens where TRUE is **−49.319** — and reports **+9.017 more reward** there. Proxy rises monotonically the entire way."
      },
      {
        "type": "intuition",
        "front": "Was the reward model broken?",
        "back": "No. It was excellent where fitted (corr +0.27 in-range) and inverted outside it (−0.96 overall). OPTIMIZATION is the process that takes you there, and nothing in the proxy's output says you've left."
      },
      {
        "type": "formula",
        "front": "The KL budget",
        "back": "max_π E_π[r_φ] − β·KL(π‖π_ref). β is not a regularization hyperparameter — it's a BUDGET on how far you trust the proxy off-distribution, and the primary safety control in the objective."
      },
      {
        "type": "pitfall",
        "front": "★ Never tune β on reward",
        "back": "Sweeping β against the proxy selects the SMALLEST β — the most misaligned policy — and it looks exactly like ordinary hyperparameter tuning. Select on a held-out measure of the TRUE objective."
      },
      {
        "type": "intuition",
        "front": "★ Best-of-n vs policy optimization",
        "back": "Best-of-n is BOUNDED by the base policy's support: true quality rose monotonically 1.491 → 8.018. Policy shift is unbounded: peaked then fell to −49.3. Different risk postures at matched reward gains."
      },
      {
        "type": "pitfall",
        "front": "Is best-of-n safe?",
        "back": "Bounded, not safe. If the base policy already emits bad-but-high-reward outputs at some rate, best-of-n finds them — and its effective KL grows like log n, so very large n approaches the same regime."
      },
      {
        "type": "pitfall",
        "front": "Do reward-model ensembles fix reward hacking?",
        "back": "Barely. 1 → 4 → 16 models: true quality 7.467 → 7.643 → 7.714, converging to the SHARED bias. Averaging removes INDEPENDENT error; every model learned 'longer is better' from the same annotators."
      },
      {
        "type": "pitfall",
        "front": "The subtle holdout leak",
        "back": "Even without training on it, running a holdout every checkpoint and choosing which to ship IS selection on it. Budget the consultations like an alpha budget, and rotate the set."
      },
      {
        "type": "definition",
        "front": "What governance actually is",
        "back": "The design of feedback loops: which measurements feed back, how fast, and which are deliberately isolated. The KL budget, the held-out eval and the named owner are load-bearing engineering controls, not paperwork."
      },
      {
        "type": "intuition",
        "front": "★ The system-card rule",
        "back": "Every number with its reference class IN THE SAME SENTENCE. Not \"ECE 0.011\" but \"ECE 0.011 over the eval population; 0.153 for the smallest subgroup (12% of users)\". Plus: what we did NOT test."
      },
      {
        "type": "intuition",
        "front": "★ The module in one line",
        "back": "EVERY GUARANTEE IS TRUE AND NARROWER THAN ITS NAME. ECE 0.011/0.153 · coverage 0.902/0.727 · PPV gap −0.231 · SHAP 2.371→1.186 · SAE 5/24 · probe 1.000 vs effect 3e−6 · robust ×4 · drift quiet at acc 0.338 · 86 of 300 classes left · reward max at true −49.3."
      },
      {
        "type": "intuition",
        "front": "★ Closable vs unclosable — the whole module's action",
        "back": "CLOSABLE (a reporting failure — fix with discipline): subgroup calibration, Mondrian coverage, SHAP variant, threat model, red-team coverage. UNCLOSABLE (an information limit — buy it or document it): concept shift. Confusing them misallocates the entire budget."
      }
    ],
    "refs": [
      {
        "title": "Gao, Schulman & Hilton (2023), Scaling Laws for Reward Model Overoptimization",
        "url": "https://arxiv.org/abs/2210.10760"
      },
      {
        "title": "Amodei et al. (2016), Concrete Problems in AI Safety",
        "url": "https://arxiv.org/abs/1606.06565"
      },
      {
        "title": "Bai et al. (2022), Constitutional AI: Harmlessness from AI Feedback",
        "url": "https://arxiv.org/abs/2212.08073"
      },
      {
        "title": "Mitchell et al. (2019), Model Cards for Model Reporting",
        "url": "https://arxiv.org/abs/1810.03993"
      },
      {
        "title": "NIST (2023), AI Risk Management Framework (AI RMF 1.0)",
        "url": "https://www.nist.gov/itl/ai-risk-management-framework"
      }
    ],
    "demos": [
      "reward-model",
      "dpo",
      "fairness",
      "guardrails"
    ]
  }
};
