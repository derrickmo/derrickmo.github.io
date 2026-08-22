// GENERATED from content/lessons/ml-theory/evaluation-metrics.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/ml-theory/evaluation-metrics/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "evaluation-metrics": {
    "level": "core",
    "body": {
      "intuition": [
        "Choosing a metric is the highest-leverage decision in an ML project and the one most often made by default. The metric is what the model is optimized toward, what determines which candidate you ship, and what the whole team argues about - so a metric that does not match the decision the model supports will reliably produce a model that is excellent at the wrong thing. The classic demonstration is a fraud detector on a 1%-fraud dataset: predicting 'never fraud' scores 99% ACCURACY and catches nothing. Accuracy is not a bad metric in general; it is a bad metric when class frequencies are skewed or when errors have different costs, which describes most real problems.",
        "Everything for classification starts from the CONFUSION MATRIX - true positives, false positives, true negatives, false negatives - and every scalar metric is a different summary of those four numbers. PRECISION asks 'of the things I flagged, how many were right?' (the cost of false alarms). RECALL asks 'of the things that were there, how many did I find?' (the cost of misses). They trade off against each other because both are controlled by the same THRESHOLD, and F1 is their harmonic mean - a reasonable default when you have no cost information, and a poor one when you do, since it implicitly declares false positives and false negatives equally bad.",
        "Above the threshold sit the RANKING metrics. ROC-AUC measures how well the model orders positives above negatives, and is threshold-free - which is useful when the operating point is not yet chosen, and misleading under heavy imbalance because the false-positive rate has a huge denominator that hides a flood of false alarms. PR-AUC (average precision) is the honest alternative there. And above the metric sits the actual question: what DECISION does this model support, and what does each kind of error cost? When you can write down a cost matrix, the right threshold is not 0.5 - it is derived from the costs, and that single change routinely beats months of model improvement."
      ],
      "math": [
        {
          "h": "The confusion matrix and its summaries",
          "paras": [
            "Precision and recall have the same numerator and different denominators - which is exactly why they trade off. F-beta generalizes F1 by weighting recall beta times as important as precision: beta = 2 favours recall (medical screening), beta = 0.5 favours precision (spam filtering)."
          ],
          "tex": "P = \\frac{TP}{TP+FP}, \\qquad R = \\frac{TP}{TP+FN}, \\qquad F_\\beta = (1+\\beta^2)\\,\\frac{P \\cdot R}{\\beta^2 P + R}",
          "texNote": "beta = 1 gives the harmonic mean (F1), which is dominated by the SMALLER of P and R - a model at P=1.0, R=0.01 scores F1 = 0.02, not 0.5. That intolerance of imbalance between the two is the point of using a harmonic rather than arithmetic mean."
        },
        {
          "h": "The cost-optimal threshold",
          "paras": [
            "If a false negative costs C_FN and a false positive costs C_FP, then flagging an example is worth it exactly when the expected cost of flagging is lower than the expected cost of not flagging. Rearranging gives a threshold that depends ONLY on the cost ratio - and note that 0.5 is correct only when the two costs are equal."
          ],
          "tex": "\\text{flag if } p(x) \\cdot C_{FN} > \\big(1-p(x)\\big) \\cdot C_{FP} \\;\\Longleftrightarrow\\; p(x) > t^{*} = \\frac{C_{FP}}{C_{FP} + C_{FN}}",
          "texNote": "With C_FN = $100 (a missed fraud) and C_FP = $2 (a wasted review), t* = 2/102 = 0.02 - not 0.5. This requires the probabilities to be CALIBRATED, which is why threshold selection and calibration are the same conversation."
        }
      ],
      "code": [
        {
          "h": "Accuracy's failure, and what to report instead",
          "paras": [
            "The demonstration worth doing once yourself. A trivial constant predictor beats a real model on accuracy while being worthless, and the metrics that expose it are precision, recall, and PR-AUC."
          ],
          "code": "import numpy as np\nfrom sklearn.metrics import (accuracy_score, precision_score, recall_score,\n                             f1_score, roc_auc_score, average_precision_score)\n\n# 1% positive class - a realistic fraud/defect/disease base rate\ny = np.zeros(10000, dtype=int); y[:100] = 1\nnp.random.shuffle(y)\n\ntrivial = np.zeros_like(y)                      # \"nothing is ever positive\"\nprint('trivial accuracy :', accuracy_score(y, trivial))        # 0.99\nprint('trivial recall   :', recall_score(y, trivial))          # 0.00  <- catches nothing\n\nscores = model.predict_proba(X)[:, 1]\npred = (scores > 0.5).astype(int)\nprint(f'accuracy  {accuracy_score(y, pred):.3f}')              # 0.991\nprint(f'precision {precision_score(y, pred):.3f}')             # 0.72\nprint(f'recall    {recall_score(y, pred):.3f}')                # 0.31   <- misses 69%\nprint(f'F1        {f1_score(y, pred):.3f}')                    # 0.43\nprint(f'ROC-AUC   {roc_auc_score(y, scores):.3f}')             # 0.94   <- flattering\nprint(f'PR-AUC    {average_precision_score(y, scores):.3f}')   # 0.51   <- honest\n# ROC-AUC 0.94 vs PR-AUC 0.51 on the same predictions is the signature of imbalance.",
          "caption": "A 1%-positive problem: accuracy 0.99 is achievable by predicting nothing, and ROC-AUC 0.94 looks excellent while PR-AUC 0.51 tells the truth. The ROC/PR gap on identical predictions is the standard diagnostic for class imbalance."
        },
        {
          "h": "Picking the threshold from costs, not from 0.5",
          "paras": [
            "The highest-value five lines in most classification projects. Sweep the threshold, score each one with the actual business cost, and take the minimum - which is almost never 0.5."
          ],
          "code": "C_FN, C_FP = 100.0, 2.0                          # missed fraud vs wasted review\n\ndef total_cost(y, scores, t):\n    pred = scores > t\n    fn = ((y == 1) & ~pred).sum()\n    fp = ((y == 0) &  pred).sum()\n    return fn * C_FN + fp * C_FP\n\nts = np.linspace(0.001, 0.999, 999)\ncosts = [total_cost(y, scores, t) for t in ts]\nt_best = ts[int(np.argmin(costs))]\n\nprint(f'default 0.5 -> cost ${total_cost(y, scores, 0.5):,.0f}')      # $7,166\nprint(f'optimal {t_best:.3f} -> cost ${min(costs):,.0f}')            # $2,918\nprint(f'theory says {C_FP/(C_FP+C_FN):.3f}')                          # 0.020\nprint(f'recall at optimum: {recall_score(y, scores > t_best):.2f}')   # 0.87 (was 0.31)\n# ~2.5x cheaper, from ONE line of code - and it needs calibrated probabilities\n# to match the theoretical t*, which is why calibration matters operationally.",
          "caption": "Threshold selection by expected cost rather than the 0.5 default: 2.5x lower total cost and recall from 0.31 to 0.87. The empirical optimum matches the theoretical C_FP/(C_FP+C_FN) when the model's probabilities are calibrated."
        }
      ],
      "useCases": [
        "Any classification system with asymmetric error costs - fraud, medical screening, content moderation, predictive maintenance, churn - where the metric choice and threshold determine the system's real-world value far more than the model architecture does.",
        "Model selection and leaderboards: the metric you optimize is the model you get, so a mismatch between the reported metric and the deployed decision silently selects the wrong candidate - this is the offline/online gap in miniature.",
        "Ranking and retrieval systems: NDCG, MAP, MRR, and precision@k evaluate ordering rather than classification, and are the right family when the product surfaces a ranked list rather than a binary decision.",
        "Communicating with stakeholders: a confusion matrix and a cost table are the artifacts non-ML colleagues can actually reason about, and translating 'AUC 0.94' into 'we would review 500 cases a day and catch 87% of fraud' is usually what unblocks a deployment decision."
      ],
      "pitfalls": [
        "Reporting accuracy on imbalanced data: with a 1% positive rate, predicting the majority class scores 99% and catches nothing. Report per-class precision/recall and PR-AUC, and always state the base rate alongside any accuracy number.",
        "Trusting ROC-AUC under heavy imbalance: the false-positive rate divides by a huge negative count, so a flood of false alarms barely moves the curve. PR-AUC is sensitive to exactly what you care about there - and note that ROC-AUC's baseline is 0.5 while PR-AUC's baseline is the base rate itself.",
        "Leaving the threshold at 0.5: 0.5 is optimal only when false positives and false negatives cost the same. Deriving it from a cost matrix is usually the single cheapest large improvement available, and it requires no retraining.",
        "Averaging over classes without saying how: macro-F1 treats every class equally (so a rare class dominates the mean), micro-F1 weights by frequency (so it is driven by the common classes), and weighted-F1 is in between. Reporting 'F1' without the averaging scheme is uninterpretable in a multi-class setting.",
        "Reporting a single number with no uncertainty: on a 500-example test set the 95% CI on accuracy is roughly +/- 4 points, so a 2-point 'improvement' is noise. Report confidence intervals or bootstrap the metric, and compare models on the same folds."
      ],
      "connections": [
        {
          "ref": "ml-theory/imbalanced-data",
          "text": "Imbalance is the condition under which most of these metrics mislead, and that lesson covers the sampling and loss-level responses to it."
        },
        {
          "ref": "ml-theory/calibration",
          "text": "Cost-optimal thresholding requires probabilities that mean what they say - a miscalibrated model can rank perfectly (great AUC) and still pick the wrong threshold."
        },
        {
          "ref": "ml-theory/cross-validation",
          "text": "A metric is an estimate with variance; cross-validation is how you find out whether a difference between two models is real or sampling noise."
        },
        {
          "ref": "mlops/monitoring",
          "text": "The metric you choose offline is the one you monitor online - and the gap between them is where most deployed-model disappointments live."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is precision?",
          "a": "TP/(TP+FP) - of the examples flagged positive, the fraction that really are. It is the metric that punishes false alarms."
        },
        {
          "q": "What is recall?",
          "a": "TP/(TP+FN) - of the actual positives, the fraction found. It is the metric that punishes misses. Also called sensitivity or the true-positive rate."
        },
        {
          "q": "What is F1?",
          "a": "The harmonic mean of precision and recall, 2PR/(P+R). Harmonic rather than arithmetic so it is dominated by the smaller of the two - P=1.0, R=0.01 gives F1 = 0.02."
        },
        {
          "q": "When is accuracy a bad metric?",
          "a": "Under class imbalance (a 1% positive rate makes 'always negative' score 99%) and whenever the two error types have different costs."
        },
        {
          "q": "What does ROC-AUC measure?",
          "a": "The probability that a randomly chosen positive is ranked above a randomly chosen negative - a threshold-free measure of ranking quality."
        },
        {
          "q": "Why can ROC-AUC mislead under imbalance?",
          "a": "FPR = FP/(FP+TN) has a huge denominator when negatives dominate, so thousands of false alarms barely move the curve. PR-AUC exposes them."
        },
        {
          "q": "What is PR-AUC's baseline?",
          "a": "The positive base rate (1% data -> 0.01), unlike ROC-AUC's fixed 0.5. So a PR-AUC of 0.5 on a 1% problem is a 50x lift, not mediocre."
        },
        {
          "q": "What is the cost-optimal threshold?",
          "a": "t* = C_FP/(C_FP + C_FN). With a $100 miss and a $2 false alarm, t* = 0.02 - not 0.5. Requires calibrated probabilities."
        },
        {
          "q": "Macro vs micro vs weighted averaging?",
          "a": "Macro: unweighted mean over classes (rare classes count fully). Micro: pooled counts (dominated by frequent classes; equals accuracy in single-label multi-class). Weighted: mean weighted by class support."
        },
        {
          "q": "What is specificity?",
          "a": "TN/(TN+FP) - the fraction of actual negatives correctly identified, i.e. 1 - FPR. Standard in medical testing, paired with sensitivity (recall)."
        },
        {
          "q": "What metrics are used for ranking?",
          "a": "NDCG (graded relevance with position discount), MAP, MRR (first relevant result), and precision@k - all evaluate ORDER, not a binary decision."
        },
        {
          "q": "How much test data do you need?",
          "a": "Enough that the metric's confidence interval is smaller than the differences you care about - at n=500, accuracy's 95% CI is roughly +/-4 points, so small gaps are noise."
        }
      ],
      "standard": [
        {
          "q": "Walk through the main classification metrics and explain how you would choose between them.",
          "a": "EVERYTHING STARTS FROM THE CONFUSION MATRIX - TP, FP, TN, FN - and every scalar metric is a different summary of those four numbers, so the real question is always which of the four errors matters and how much. THE METRICS. ACCURACY = (TP+TN)/total. Intuitive, and appropriate only when classes are roughly balanced AND the two error types cost the same. Under a 1% positive rate, 'always negative' scores 99%, which is why accuracy is the most over-used metric in the field. PRECISION = TP/(TP+FP): of what I flagged, how much was right. Use when FALSE POSITIVES are expensive - spam filtering (a lost legitimate email is worse than a spam that gets through), automated content removal, any action taken without human review. RECALL = TP/(TP+FN): of what was there, how much did I find. Use when FALSE NEGATIVES are expensive - disease screening, fraud detection, safety-critical defect detection. The two are controlled by the same threshold and trade off directly: lowering the threshold raises recall and lowers precision. F1 = harmonic mean of precision and recall. A reasonable default when you have no cost information; F-beta generalizes it (beta=2 weights recall 2x, beta=0.5 weights precision 2x). The key property is that the harmonic mean is dominated by the SMALLER value, so you cannot score well by maximizing one and abandoning the other. ROC-AUC: the probability a random positive outranks a random negative. Threshold-free, so it evaluates the model's RANKING independent of the operating point - useful when the threshold is not yet chosen, or when you want to compare models before making that decision. PR-AUC (average precision): the area under the precision-recall curve, and the right threshold-free metric under heavy imbalance. LOG LOSS / BRIER SCORE: proper scoring rules that evaluate the PROBABILITIES rather than the decisions - the right choice when downstream systems consume the probability itself (expected-value calculations, bidding, risk scoring). HOW I CHOOSE, as a procedure. (1) IDENTIFY THE DECISION the model supports and who or what acts on it. (2) WRITE DOWN THE COSTS of each error type, even approximately - 'a missed fraud costs $100, a wasted review costs $2' is enough to determine the threshold and to rank candidate models by expected cost, which is strictly better than any generic metric. (3) IF THE OPERATING POINT IS FIXED, report precision and recall AT that threshold (plus the cost). If it is not yet fixed, report a threshold-free metric - PR-AUC under imbalance, ROC-AUC when classes are balanced. (4) CHECK THE BASE RATE and report it: metrics are uninterpretable without it, since PR-AUC's baseline is the base rate itself. (5) REPORT UNCERTAINTY - bootstrap the metric or give a confidence interval, because on small test sets differences of a few points are noise. THE POINT I WOULD EMPHASIZE: the metric is not a scoring formality, it is the objective the whole project optimizes toward - through model selection, hyperparameter tuning, and every design argument. Choosing it badly means doing excellent work toward the wrong goal, and it is a failure that no amount of modeling skill recovers from. This is also why 'what metric are you using and why?' is such a revealing interview question.",
          "deepDive": {
            "q": "Explain precisely when ROC-AUC misleads and why PR-AUC is better under imbalance.",
            "a": "THE DEFINITIONS. The ROC curve plots TPR = TP/(TP+FN) against FPR = FP/(FP+TN) as the threshold varies. The PR curve plots precision = TP/(TP+FP) against recall (= TPR). The crucial structural difference: FPR's denominator is the number of NEGATIVES, while precision's denominator is the number of PREDICTED POSITIVES. THE FAILURE MODE, with numbers. Take 1,000,000 examples with 1,000 positives (0.1%). Suppose at some threshold the model catches 900 positives (TPR = 0.90) and produces 10,000 false positives. FPR = 10,000/999,000 = 0.01 - which looks excellent, and the ROC curve sits high. But precision = 900/10,900 = 0.083, meaning 92% of everything you flag is wrong. A human review team would be drowning. ROC-AUC reports something like 0.97 while the system is operationally unusable. The reason is that FPR normalizes by a huge negative population, so even a large ABSOLUTE number of false positives is a small RATE - and it is the absolute number that determines review cost. Precision normalizes by what you flagged, which is exactly the quantity the operator experiences. THE BASELINE DIFFERENCE, which is the second half of the story and is often missed. A random classifier has ROC-AUC 0.5 regardless of imbalance, so ROC-AUC's scale is stable and comparable across datasets. A random classifier has PR-AUC equal to the POSITIVE BASE RATE, so on a 1% problem, PR-AUC 0.5 represents a 50x lift over random and is genuinely strong, while on a balanced problem PR-AUC 0.5 is chance. This means PR-AUC values are NOT comparable across datasets with different base rates, and a PR-AUC must always be reported alongside the base rate. It also means people frequently misread a 'low' PR-AUC as a bad model when it is a hard, imbalanced problem. WHEN EACH IS RIGHT. Use ROC-AUC when: classes are roughly balanced; you care about ranking quality per se; you want a metric stable across datasets with different base rates (e.g. comparing a model across populations where prevalence differs); or the operating point will be set later and both error types matter comparably. Use PR-AUC when: positives are rare and are what you care about; the cost of false positives scales with their absolute number (human review capacity, user annoyance); you are comparing models on ONE dataset. Davis and Goadrich (2006) is the canonical reference for the deep connection - a curve dominating in ROC space dominates in PR space and vice versa, but the AREA summaries can rank models differently, which is precisely why the choice matters. WHAT I WOULD ACTUALLY REPORT for an imbalanced problem, because both are still summaries: PRECISION AT FIXED RECALL (or recall at fixed precision) at the operating point you will actually use, plus PRECISION@k where k is the real review capacity ('of the top 500 cases our team can review daily, how many are fraud?'), plus the total expected COST. Those numbers answer the operational question directly, and they are what a stakeholder can act on. AUC of either flavour is best treated as a model-development convenience, not as the thing you optimize for deployment."
          }
        },
        {
          "q": "How do you choose a classification threshold, and why is 0.5 usually wrong?",
          "a": "WHY 0.5 IS THE DEFAULT AND WHY IT IS ARBITRARY. Frameworks threshold at 0.5 because it is the point where the predicted probability of the positive class exceeds the negative - the Bayes-optimal rule for MINIMIZING ERROR COUNT under equal costs. That objective is almost never the real one: it declares a missed cancer and a false alarm equally bad, and it ignores that in an imbalanced setting most of the probability mass sits far below 0.5. THE PRINCIPLED DERIVATION. Flagging an example has expected cost (1 - p) * C_FP (you might be wrong and pay for a false alarm). Not flagging has expected cost p * C_FN (you might miss a real positive). Flag when p * C_FN > (1 - p) * C_FP, which rearranges to p > C_FP / (C_FP + C_FN). So the optimal threshold depends ONLY on the cost RATIO - not on the base rate, not on the model. With C_FN = $100 and C_FP = $2, t* = 0.02. With equal costs, t* = 0.5, which is the special case the default assumes. TWO IMPORTANT CAVEATS. (1) THIS REQUIRES CALIBRATED PROBABILITIES. The derivation treats p as a real probability; if the model is overconfident or systematically shifted, the theoretically-derived threshold will be wrong. That is why threshold selection and calibration are the same conversation, and why in practice you should EMPIRICALLY sweep the threshold on a validation set (minimizing measured cost) rather than trusting the formula on an uncalibrated model - the empirical optimum and the formula agree when the model is calibrated, and their disagreement is itself a calibration diagnostic. (2) YOU MUST TUNE IT ON VALIDATION DATA, not on the test set - picking the threshold on the test set leaks and inflates your estimate, the same optimism as any other hyperparameter. WHEN COSTS ARE UNKNOWN, which is common. Options in order of preference: (a) elicit them approximately from stakeholders - people can rarely name a dollar figure but can usually answer 'how many false alarms would you accept to catch one more fraud?', which IS the cost ratio; (b) fix a CAPACITY constraint instead - if the review team can handle 500 cases a day, set the threshold so you flag 500, which converts an unknown cost into a known operating point and is often the most practical framing; (c) fix a minimum acceptable recall (regulatory or safety floors often specify this) and maximize precision subject to it; (d) as a last resort, maximize F1 or F-beta, understanding that you are implicitly asserting a cost ratio. HOW I WOULD PRESENT IT to a stakeholder: not as a threshold but as a table of operating points - 'at threshold 0.02 we flag 4,000 cases/month and catch 87% of fraud; at 0.10 we flag 900 and catch 61%' - and let the business choose. That framing converts a modeling parameter into a business decision, which is where it belongs, and it usually resolves the discussion in one meeting. THE HEADLINE, worth saying explicitly: moving the threshold is free - no retraining, no new data, minutes of work - and it routinely improves realized value more than weeks of model tuning. It is the highest return-on-effort action available in most classification projects, and it is skipped surprisingly often."
        },
        {
          "q": "How do metrics change for multi-class and multi-label problems?",
          "a": "MULTI-CLASS (exactly one label per example). The confusion matrix becomes K x K, and precision/recall/F1 are computed PER CLASS in a one-vs-rest fashion: for class c, TP = predicted c and truly c, FP = predicted c but not truly c, FN = truly c but predicted otherwise. To get a single number you must AVERAGE, and how you average is a substantive choice that must be reported. MACRO: compute the metric per class, then take the unweighted mean. Every class counts equally regardless of frequency, so a rare class with terrible performance drags the average down - which is usually what you want when rare classes matter (this is the standard choice in imbalanced multi-class settings). MICRO: pool the TP/FP/FN counts across all classes, then compute the metric once. Dominated by frequent classes; note that in single-label multi-class, micro-precision = micro-recall = micro-F1 = ACCURACY, which is a useful thing to know because it means reporting 'micro-F1' in that setting is just reporting accuracy under a fancier name. WEIGHTED: per-class metrics averaged with weights proportional to class support - a compromise that avoids macro's sensitivity to tiny classes while still being per-class. The practical rule: report macro AND per-class numbers; use micro only when you genuinely want frequency-weighted performance and say so. Also note ROC-AUC extends via one-vs-rest or one-vs-one averaging, with the same macro/weighted choice. MULTI-LABEL (any number of labels per example). Now each example has a SET of labels, and there are additional metric families. SUBSET ACCURACY (exact match) requires the predicted set to equal the true set exactly - a brutally strict metric that is near zero for large label spaces, and rarely the right choice. HAMMING LOSS is the fraction of individual label predictions that are wrong, averaged over all example-label pairs - forgiving, and dominated by the (usually many) negative labels. SAMPLE-AVERAGED precision/recall/F1 compute the metric per EXAMPLE (over its predicted and true label sets) then average across examples - often the most intuitive for multi-label, since it reflects per-item quality. And the macro/micro/weighted label-averaged variants apply as before. THE THRESHOLD PROBLEM IS WORSE in multi-label: each label needs its own threshold (label frequencies and difficulties differ wildly), so a single global threshold is usually poor. Per-label threshold tuning on validation data is standard and often worth several points of F1. RANKING-STYLE METRICS often fit multi-label better: precision@k, coverage error, label-ranking average precision - appropriate when the system surfaces a ranked list of candidate labels for human confirmation. THE ISSUE THAT SPANS BOTH, and the thing I would raise: with many classes, the metric hides WHERE the errors are. A macro-F1 of 0.72 across 50 classes tells you almost nothing actionable. Always inspect the confusion matrix (or the top confused pairs) - in practice errors are highly structured, concentrated in a few confusable class pairs, and fixing one labeling ambiguity or adding data for two classes often moves the aggregate more than any model change. The aggregate metric is for tracking; the per-class breakdown is for deciding what to do next."
        },
        {
          "q": "What is a proper scoring rule, and when should you evaluate probabilities rather than decisions?",
          "a": "THE DEFINITION. A scoring rule evaluates a predicted PROBABILITY against the realized outcome. It is PROPER if the expected score is optimized by reporting your true belief - i.e. there is no way to score better by lying about your probability. It is STRICTLY proper if truth-telling is the unique optimum. This matters because an improper rule can be gamed: it rewards distorted predictions, and any model trained or selected on it will learn that distortion. THE TWO STANDARD ONES. LOG LOSS (cross-entropy) = -mean[y log p + (1-y) log(1-p)]. Strictly proper. It punishes confident errors extremely harshly (a confident wrong prediction with p near 0 sends the loss toward infinity), which is desirable when confident mistakes are dangerous and awkward when a single mislabeled example can dominate your metric. It is also the training objective for essentially every classifier, so evaluating with it is consistent with optimization. BRIER SCORE = mean[(p - y)^2]. Strictly proper, bounded in [0,1], and more forgiving of confident errors than log loss. It has a beautiful decomposition (Murphy): Brier = RELIABILITY - RESOLUTION + UNCERTAINTY, separating calibration quality (reliability), the model's ability to discriminate (resolution), and the irreducible base-rate variance (uncertainty). That decomposition is genuinely useful for diagnosing whether a model's weakness is calibration or discrimination. WHAT IS NOT PROPER, and why it matters: ACCURACY, precision, recall, F1, and AUC are all functions of DECISIONS or RANKINGS, not of probabilities. You can improve accuracy by shifting probabilities in ways that make them less truthful, and AUC is invariant to any monotone transformation of the scores - so a model with AUC 0.95 might output probabilities that are wildly miscalibrated, and AUC will never notice. That invariance is a feature when you only care about ranking and a serious bug when you care about the numbers. WHEN TO EVALUATE PROBABILITIES. (1) When a DOWNSTREAM SYSTEM CONSUMES the probability - expected-value calculations, ad bidding (pCTR x value), portfolio or risk aggregation, triage prioritization. Here the probability's LEVEL, not just its order, determines the decision, and a miscalibrated model leaves money on the table even with identical AUC. (2) When a HUMAN consumes it - a clinician told '80% probability' should be right about 80% of the time, or the number is worse than useless. (3) When you will SET THRESHOLDS from costs, since the derived threshold assumes calibrated probabilities. (4) When you need to COMBINE models or evidence, since averaging or multiplying uncalibrated probabilities compounds the distortion. WHEN DECISION METRICS SUFFICE: when the system's output is a hard decision at a fixed operating point and nothing downstream reads the number - then precision/recall at that threshold, plus the realized cost, is what matters and calibration is irrelevant. THE PRACTICAL RECOMMENDATION I would give: report BOTH families. A discrimination metric (AUC or PR-AUC) tells you whether the model can separate the classes; a proper scoring rule (log loss or Brier) plus a reliability diagram and ECE tells you whether the numbers can be trusted. They are independent failure modes - a model can rank perfectly and be badly calibrated, or be perfectly calibrated and useless (a model that always predicts the base rate is perfectly calibrated with zero resolution). Reporting only one hides half the picture."
        },
        {
          "q": "A colleague reports that their new model improved accuracy from 91.2% to 92.1%. What questions do you ask?",
          "a": "The number alone is nearly uninterpretable, so I would work through five questions in order. (1) IS THE DIFFERENCE STATISTICALLY MEANINGFUL? A 0.9-point difference needs a test set large enough to resolve it. At n = 1,000, the 95% CI on accuracy is roughly +/- 1.8 points, so the two models' intervals overlap heavily and the 'improvement' may be noise. I would ask for the test-set size, a confidence interval (or a bootstrap distribution of the difference), and ideally a PAIRED comparison - since the models are evaluated on the SAME examples, McNemar's test on the discordant pairs is far more powerful than comparing two independent intervals, and it is the right test here. Also: how many models were tried before this one? Best-of-20 on a noisy test set produces a phantom improvement from max-over-noise alone, which is the same selection effect that inflates tuned results generally. (2) WAS THE TEST SET TOUCHED? If the threshold, hyperparameters, or model selection used the test set, the number is optimistic. I want to hear that there was a separate validation set and that test was touched once. (3) WHAT IS THE BASE RATE, AND WHAT MOVED? Accuracy aggregates over classes, so I want the per-class breakdown and the confusion matrix. Common outcomes: the gain is entirely on the majority class while the rare class got worse - which is usually a REGRESSION for the actual use case; or the model became more conservative, trading recall for precision, which changes the operating point rather than improving the model. Reporting the same threshold for both models matters too - a 'better' model at a different threshold is not a like-for-like comparison. (4) IS ACCURACY THE RIGHT METRIC AT ALL? If the classes are imbalanced or the errors have different costs, accuracy is the wrong summary and the comparison should be on cost, PR-AUC, or recall at fixed precision. I would ask what decision this model supports and what each error costs, then re-evaluate both models on that. It is entirely possible for the higher-accuracy model to be the worse business choice. (5) WHAT ELSE CHANGED, AND WHAT DID IT COST? Is the new model bigger, slower, or more expensive to serve? A 0.9-point accuracy gain for 3x inference cost is often a bad trade. Is it more complex to maintain? Does it need new features that might not be available at serving time (which is also a leakage risk)? Was the comparison run on the same data split and the same preprocessing? THE FOLLOW-UPS I would want in a report: paired significance test on the same test set, per-class metrics, the metric that matches the decision, an error analysis of what the new model fixes and what it breaks, and the serving cost. HOW I WOULD FRAME IT SOCIALLY, because this matters in a real team: not as scepticism of their work but as making the result robust - 'if this holds up under a paired test and per-class breakdown, it is a solid win and we should ship it'. The failure mode I am guarding against is the team spending a quarter chasing 1-point accuracy gains that are within noise, which is extremely common and demoralizing when it eventually surfaces."
        },
        {
          "q": "How would you evaluate a ranking or recommendation system?",
          "a": "Classification metrics are the wrong family here because the output is an ORDERED LIST and users interact with the top of it. Four things change. (1) POSITION MATTERS. A relevant item at rank 1 is worth far more than the same item at rank 20, because attention decays sharply with position. So metrics must be position-weighted. NDCG (Normalized Discounted Cumulative Gain) is the standard: sum each item's relevance divided by log2(rank+1), normalized by the ideal ordering. It handles GRADED relevance (not just binary), has a principled discount, and normalizes so scores are comparable across queries with different numbers of relevant items. MAP (mean average precision) is the binary-relevance analogue. MRR (mean reciprocal rank) uses only the position of the FIRST relevant result - appropriate when the user needs exactly one answer (navigational search, question answering). (2) ONLY THE TOP MATTERS. Users see 10 results, not 10,000, so evaluate at a CUTOFF matched to the actual surface: NDCG@10, precision@5, recall@100 for a retrieval stage. Reporting a metric over the full list measures something no user experiences. In a two-stage system, evaluate the stages differently - RECALL@k for retrieval (did the candidate set contain the good items?) and NDCG@10 for ranking (did we order them well?) - because they have different jobs, and this is a standard system-design point. (3) THE LOGS ARE BIASED, which is the deep problem. Your training and evaluation data come from what the CURRENT system showed, so items never shown have no clicks and look irrelevant, and items shown at position 1 get clicks partly BECAUSE they were at position 1 (position bias). Naive offline evaluation on click logs therefore rewards models that reproduce the current system. The responses: inverse-propensity weighting (weight each observed click by 1/P(shown at that position)), interleaving experiments (mix two rankers' results in one list and see which side gets the clicks - much more sensitive than A/B testing and controls for position), and holding out a small randomized-traffic slice that gives unbiased data. (4) THE OFFLINE METRIC IS A PROXY FOR THE ONLINE OUTCOME. NDCG on logged relevance is not what the business cares about; engagement, conversion, retention, and long-term satisfaction are. The offline/online gap is real and often large, so the honest workflow is: offline metrics to filter candidates cheaply, then an ONLINE A/B TEST on business metrics for the final decision. And measure the offline-online correlation itself over time - if your offline metric does not predict online wins, it is the wrong offline metric. BEYOND ACCURACY, which serious systems all measure: DIVERSITY (are the top 10 all near-duplicates?), COVERAGE (what fraction of the catalog is ever recommended - a greedy system collapses onto a few popular items), NOVELTY/serendipity, FRESHNESS, and FAIRNESS across item providers or user groups. There is also the FEEDBACK LOOP problem - a deployed recommender shapes the data that trains its successor, so exploitation without exploration progressively narrows the catalog, which no single-shot offline metric detects. WHAT I WOULD REPORT for a recommender: NDCG@10 and recall@100 offline (with IPW correction), diversity and catalog coverage, and then an interleaving or A/B result on the primary business metric with a guardrail on the diversity and coverage numbers so that a short-term engagement win does not silently degrade the ecosystem."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "Precision vs recall",
        "back": "P = TP/(TP+FP) (punishes false alarms). R = TP/(TP+FN) (punishes misses). Same numerator, different denominators - which is why they trade off as the threshold moves."
      },
      {
        "type": "formula",
        "front": "F-beta",
        "back": "(1+b^2)PR/(b^2 P+R). b=1 is F1 (harmonic mean, dominated by the smaller value); b=2 favours recall (screening); b=0.5 favours precision (spam)."
      },
      {
        "type": "formula",
        "front": "Cost-optimal threshold",
        "back": "t* = C_FP/(C_FP+C_FN). $100 miss + $2 false alarm -> t* = 0.02, NOT 0.5. Free to change, no retraining - usually the highest return-on-effort action in a classification project."
      },
      {
        "type": "pitfall",
        "front": "Accuracy under imbalance",
        "back": "1% positive rate -> 'always negative' scores 99% and catches nothing. Always report the base rate alongside accuracy, plus per-class precision/recall."
      },
      {
        "type": "pitfall",
        "front": "ROC-AUC under imbalance",
        "back": "FPR = FP/(FP+TN) has a huge denominator, so thousands of false alarms barely move the curve. A model can score AUC 0.97 with 92% of flags wrong. Use PR-AUC."
      },
      {
        "type": "intuition",
        "front": "PR-AUC's baseline is the base rate",
        "back": "Random scores PR-AUC = positive rate (0.01 on a 1% problem), unlike ROC-AUC's fixed 0.5. So PR-AUC 0.5 there is a 50x lift - and PR-AUC is NOT comparable across datasets with different base rates."
      },
      {
        "type": "definition",
        "front": "Macro vs micro vs weighted",
        "back": "Macro: unweighted mean over classes (rare classes count fully). Micro: pooled counts - equals ACCURACY in single-label multi-class. Weighted: by class support. Never report 'F1' without saying which."
      },
      {
        "type": "definition",
        "front": "Proper scoring rule",
        "back": "A metric on PROBABILITIES that is optimized by reporting your true belief - log loss and Brier score. Accuracy/F1/AUC are not proper: AUC is invariant to any monotone transform, so it cannot see miscalibration."
      },
      {
        "type": "formula",
        "front": "Brier decomposition",
        "back": "Brier = reliability - resolution + uncertainty. Separates calibration quality from discriminative ability from irreducible base-rate variance - useful for diagnosing WHICH one is the weakness."
      },
      {
        "type": "pitfall",
        "front": "A metric is an estimate",
        "back": "At n=1000, accuracy's 95% CI is ~±1.8 points, so a 0.9-point 'win' can be noise. Use a PAIRED test (McNemar) on the same test set, and ask how many models were tried before this one."
      }
    ],
    "refs": [
      {
        "title": "Davis & Goadrich (2006), The Relationship Between Precision-Recall and ROC Curves",
        "url": "https://www.biostat.wisc.edu/~page/rocpr.pdf"
      },
      {
        "title": "Saito & Rehmsmeier (2015), The Precision-Recall Plot Is More Informative than the ROC Plot on Imbalanced Datasets",
        "url": "https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0118432"
      },
      {
        "title": "Gneiting & Raftery (2007), Strictly Proper Scoring Rules, Prediction, and Estimation",
        "url": "https://www.stat.washington.edu/raftery/Research/PDF/Gneiting2007jasa.pdf"
      },
      {
        "title": "scikit-learn User Guide, Metrics and scoring",
        "url": "https://scikit-learn.org/stable/modules/model_evaluation.html"
      }
    ],
    "demos": [
      "classification-metrics",
      "roc",
      "calibration"
    ]
  }
};
