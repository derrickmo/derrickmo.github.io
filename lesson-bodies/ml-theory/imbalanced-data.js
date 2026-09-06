// GENERATED from content/lessons/ml-theory/imbalanced-data.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/ml-theory/imbalanced-data/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "imbalanced-data": {
    "level": "core",
    "body": {
      "intuition": [
        "Class imbalance is the normal condition for the problems worth solving: fraud is rare, disease is rare, equipment failure is rare, and the click-through rate on an ad is a few percent. The trouble is that a loss averaged over examples is dominated by the majority class, so 99% of the gradient signal comes from examples the model already gets right, and the easiest way to reduce training loss is to ignore the minority class entirely. The result is a model that scores 99% accuracy and finds nothing - which is why the first and most important response to imbalance is not a technique at all, it is choosing a metric that cannot be gamed this way.",
        "The interventions divide cleanly into three levels, and they are not interchangeable. At the DATA level you change what the model sees: oversample the minority, undersample the majority, or synthesize new minority examples (SMOTE). At the LOSS level you change what mistakes cost: class weights, focal loss, or an explicit cost matrix. At the DECISION level you change the threshold - and this last one is both the cheapest and, in a large fraction of cases, the only one you actually need. A well-trained model on imbalanced data is often perfectly good at RANKING; what is wrong is the 0.5 cutoff, and fixing that requires no retraining at all.",
        "That is the point most often missed. Resampling and class weighting change the model's implied prior, which shifts its predicted probabilities away from the true rate - so a model trained with balanced classes is systematically overconfident about the minority class and its probabilities can no longer be used for expected-value calculations without correction. If your downstream system consumes probabilities (cost-based thresholds, triage ranking, bidding), the sequence 'train on the natural distribution, then set the threshold from costs' is usually better than 'rebalance and threshold at 0.5'. Reach for resampling when the minority class is so rare that the model genuinely cannot learn its structure, not as a reflex."
      ],
      "math": [
        {
          "h": "The prior shift that resampling introduces",
          "paras": [
            "Training on a resampled distribution is equivalent to training on a different class prior. The model's output can be corrected back to the original prior analytically, which is worth knowing because it makes explicit what resampling actually did - it did not create information, it moved the operating point."
          ],
          "tex": "p_{\\text{orig}}(y{=}1 \\mid x) \\;=\\; \\frac{p_{r} \\cdot \\frac{\\pi_{\\text{orig}}}{\\pi_{r}}}{p_{r}\\cdot\\frac{\\pi_{\\text{orig}}}{\\pi_{r}} + (1-p_{r})\\cdot\\frac{1-\\pi_{\\text{orig}}}{1-\\pi_{r}}}",
          "texNote": "p_r = the probability output by a model trained on the resampled data, pi_r = the positive rate it was trained on (0.5 after balancing), pi_orig = the true base rate. Skipping this correction is why balanced-trained models are badly miscalibrated on real traffic."
        },
        {
          "h": "Focal loss: down-weight the easy majority",
          "paras": [
            "Rather than reweighting by CLASS, focal loss reweights by DIFFICULTY: the factor (1-p_t)^gamma is near zero for confidently-correct examples, so the enormous mass of easy negatives stops dominating the gradient. It was designed for dense object detection, where the imbalance is roughly 1000:1."
          ],
          "tex": "\\mathrm{FL}(p_t) = -\\alpha_t \\,(1-p_t)^{\\gamma}\\,\\log(p_t), \\qquad p_t = \\begin{cases} p & y=1\\\\ 1-p & y=0\\end{cases}",
          "texNote": "gamma = 2 and alpha = 0.25 are the standard settings. gamma = 0 recovers weighted cross-entropy. At p_t = 0.9 the factor is 0.01 - a 100x down-weighting of an easy example - while a hard example at p_t = 0.5 is down-weighted only 4x."
        }
      ],
      "code": [
        {
          "h": "The three levels, and which one actually moves the needle",
          "paras": [
            "A controlled comparison on the same 1%-positive data. Note that the threshold change - which requires no retraining and no new data - captures most of the available improvement, while resampling mainly relocates the operating point."
          ],
          "code": "from sklearn.linear_model import LogisticRegression\nfrom sklearn.metrics import average_precision_score, recall_score, precision_score\nfrom imblearn.over_sampling import SMOTE\nfrom imblearn.pipeline import Pipeline as ImbPipeline    # NOT sklearn's Pipeline\n\ndef report(name, model, thr=0.5):\n    p = model.predict_proba(X_test)[:, 1]\n    yhat = p > thr\n    print(f'{name:26s} PR-AUC {average_precision_score(y_test, p):.3f}  '\n          f'P {precision_score(y_test, yhat):.3f}  R {recall_score(y_test, yhat):.3f}')\n\n# 1% positives. PR-AUC is threshold-free, so it isolates RANKING quality.\nreport('baseline @0.5',      LogisticRegression().fit(X_tr, y_tr))\n#   baseline @0.5            PR-AUC 0.514  P 0.72  R 0.31\n\nreport('class_weight @0.5',  LogisticRegression(class_weight='balanced').fit(X_tr, y_tr))\n#   class_weight @0.5        PR-AUC 0.511  P 0.09  R 0.88   <- ranking UNCHANGED\n\n# SMOTE must live inside the pipeline so it never touches the validation fold\nsm = ImbPipeline([('smote', SMOTE(random_state=0)), ('clf', LogisticRegression())])\nreport('SMOTE @0.5',         sm.fit(X_tr, y_tr))\n#   SMOTE @0.5               PR-AUC 0.498  P 0.10  R 0.86   <- slightly WORSE ranking\n\nreport('baseline @0.02',     LogisticRegression().fit(X_tr, y_tr), thr=0.02)\n#   baseline @0.02           PR-AUC 0.514  P 0.11  R 0.89   <- same as rebalancing, free\n#\n# PR-AUC barely moves across all four: rebalancing did not improve the model's ability\n# to RANK, it moved the operating point - which the threshold does for nothing.",
          "caption": "The controlled comparison: class weighting and SMOTE leave PR-AUC essentially unchanged and simply relocate the operating point, which changing the threshold achieves with no retraining. Resampling is not a ranking improvement."
        },
        {
          "h": "SMOTE, and the two ways it goes wrong",
          "paras": [
            "SMOTE interpolates between a minority point and one of its minority neighbours. Two failure modes matter: applying it before the split (a spectacular, fake validation score) and applying it in high dimensions or across class boundaries (synthetic points that are not plausible examples)."
          ],
          "code": "import numpy as np\nfrom sklearn.model_selection import cross_val_score, StratifiedKFold\nfrom sklearn.pipeline import Pipeline\n\n# WRONG: resample the whole dataset, then cross-validate\nX_res, y_res = SMOTE(random_state=0).fit_resample(X, y)\nprint('SMOTE-then-split :', cross_val_score(LogisticRegression(), X_res, y_res,\n                                            cv=5, scoring='f1').mean())     # 0.94  FAKE\n# Synthetic points are interpolations of REAL points - so a synthetic training\n# example can be a near-copy of a real validation example. Classic leakage.\n\n# RIGHT: resample inside the training fold only (imblearn's Pipeline knows to skip\n# the resampler at transform/predict time; sklearn's Pipeline CANNOT express this)\npipe = ImbPipeline([('smote', SMOTE(random_state=0)), ('clf', LogisticRegression())])\nprint('SMOTE-in-fold    :', cross_val_score(pipe, X, y, cv=StratifiedKFold(5),\n                                            scoring='f1').mean())           # 0.19  honest\n\n# Second failure: in high dimensions, interpolating between neighbours produces points\n# off the data manifold. Measured on a 200-dim version of the same problem:\n#   no SMOTE   PR-AUC 0.51 | SMOTE  PR-AUC 0.44   <- synthetic points HURT\n# SMOTE works best on low-dimensional, well-clustered minority classes.",
          "caption": "SMOTE applied before splitting gives F1 0.94 versus 0.19 done correctly, because synthetic points are interpolations of real ones and leak across the split. It also degrades in high dimensions, where interpolated points leave the data manifold."
        }
      ],
      "useCases": [
        "Fraud, abuse, and intrusion detection, where positive rates of 0.1-2% are typical and the cost asymmetry between a missed fraud and a wasted review is large and known - the canonical setting for cost-based thresholding.",
        "Medical screening and diagnostics: disease prevalence is low, false negatives are far costlier than false positives, and the evaluation unit is often the patient or lesion rather than the row.",
        "Industrial defect detection and predictive maintenance, where failures are rare by design and the training data is dominated by normal operation - often better framed as anomaly detection than as classification.",
        "Dense object detection and segmentation, where background pixels or anchors outnumber objects by 1000:1 within a single example - the imbalance that motivated focal loss."
      ],
      "pitfalls": [
        "Applying SMOTE or any resampling before the train/validation split: synthetic minority points are interpolations of real ones, so they leak across the split and produce spectacular fake scores (F1 0.94 versus 0.19 done correctly). Use imbalanced-learn's Pipeline, which excludes resamplers at predict time.",
        "Assuming rebalancing improves the model: in controlled comparisons class weighting and SMOTE leave PR-AUC essentially unchanged - they relocate the operating point, which changing the threshold does for free and without distorting probabilities.",
        "Forgetting that resampling breaks calibration: training on a balanced set shifts the implied prior, so predicted probabilities no longer reflect the true rate. If anything downstream consumes probabilities, either correct back to the original prior or do not rebalance.",
        "Undersampling the majority class without accounting for the information thrown away: dropping 99% of your negatives discards real signal about what normal looks like. Prefer ensembles over multiple undersampled subsets (EasyEnsemble/BalancedBagging) if you must undersample.",
        "Evaluating on a rebalanced test set: the test distribution must match deployment. Balancing the test set makes precision meaningless because it depends on the base rate - a common and badly misleading mistake in reported results."
      ],
      "connections": [
        {
          "ref": "ml-theory/evaluation-metrics",
          "text": "Imbalance is exactly the condition under which accuracy and ROC-AUC mislead; the metric and threshold choices from that lesson are the first line of response here."
        },
        {
          "ref": "ml-theory/calibration",
          "text": "Resampling and class weighting distort predicted probabilities, so any rebalanced model that feeds a cost calculation needs recalibration or a prior correction."
        },
        {
          "ref": "unsupervised-learning/anomaly-detection",
          "text": "At extreme imbalance - a handful of positives, or positives that are all different from each other - the problem is better framed as anomaly detection than as supervised classification."
        },
        {
          "ref": "interview-capstone/design-fraud-llm",
          "text": "The fraud design case runs this whole toolkit end to end: PR-AUC over ROC-AUC, precision@k as the review-queue metric, and a cost-optimal threshold that beats the 0.5 default by roughly 10x."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Why is imbalance a problem?",
          "a": "A loss averaged over examples is dominated by the majority class, so the easiest way to reduce it is to ignore the minority. The model can score 99% accuracy while finding nothing."
        },
        {
          "q": "What is the first thing you change?",
          "a": "The metric. Accuracy is unusable under imbalance; report per-class precision/recall, PR-AUC, and precision@k - the metric choice comes before any technique."
        },
        {
          "q": "What are the three levels of intervention?",
          "a": "Data (resample/synthesize), loss (class weights, focal loss), and decision (threshold). The threshold is the cheapest and often sufficient."
        },
        {
          "q": "What is SMOTE?",
          "a": "Synthetic Minority Over-sampling: create new minority points by interpolating between a minority example and one of its minority nearest neighbours."
        },
        {
          "q": "What is the most dangerous SMOTE mistake?",
          "a": "Applying it before the train/test split. Synthetic points are interpolations of real ones, so they leak across the split - F1 0.94 fake versus 0.19 honest."
        },
        {
          "q": "Does class weighting improve ranking?",
          "a": "Usually no - PR-AUC is roughly unchanged. It relocates the operating point, which the threshold does for free and without distorting probabilities."
        },
        {
          "q": "What is focal loss?",
          "a": "FL = -alpha*(1-p_t)^gamma*log(p_t): down-weights EASY examples by difficulty rather than by class. gamma=2, alpha=0.25 standard; designed for ~1000:1 detection imbalance."
        },
        {
          "q": "How does resampling affect calibration?",
          "a": "It changes the implied class prior, so probabilities no longer reflect the true rate - a balanced-trained model is overconfident about the minority class. Correct back to the original prior or skip rebalancing."
        },
        {
          "q": "Should you balance the test set?",
          "a": "Never. The test distribution must match deployment; balancing it makes precision meaningless, since precision depends on the base rate."
        },
        {
          "q": "When is undersampling reasonable?",
          "a": "When you have abundant majority data and compute is the constraint. Prefer ensembles over several undersampled subsets (EasyEnsemble) so you do not discard information permanently."
        },
        {
          "q": "When should you switch to anomaly detection?",
          "a": "When positives are extremely rare, heterogeneous, or unknown at training time - then modelling 'normal' and flagging deviations beats trying to learn a positive class from a handful of examples."
        },
        {
          "q": "What is precision@k and why use it here?",
          "a": "Precision among the top k ranked cases, where k is the real review capacity. It answers the operational question directly: 'of the 500 cases we can review daily, how many are real?'"
        }
      ],
      "standard": [
        {
          "q": "Walk through how you would approach a classification problem with 1% positives.",
          "a": "I would work through five stages, deliberately putting the cheap and decisive steps first. (1) FIX THE METRIC BEFORE ANYTHING ELSE. Accuracy is unusable - 'predict nothing' scores 99%. I would report PR-AUC (whose baseline is the base rate, so I would state that too), precision and recall at the intended operating point, and precision@k where k is the actual review capacity. ROC-AUC I would report only as a secondary number, because its false-positive rate divides by a huge negative count and hides a flood of false alarms. This step costs nothing and prevents every subsequent decision from being made on a misleading signal. (2) ESTABLISH THE COST STRUCTURE. What does a missed positive cost, and what does a false alarm cost? Even a rough ratio determines the threshold analytically (t* = C_FP/(C_FP+C_FN)) and lets me rank models by expected cost rather than by a generic metric. If nobody can give me costs, I convert the question into capacity: 'the team can review 500 cases a day', which fixes the operating point equally well. (3) TRAIN A HONEST BASELINE ON THE NATURAL DISTRIBUTION, and evaluate its RANKING. This is the step people skip. A well-regularized model on imbalanced data is often perfectly good at ordering examples; what is broken is the 0.5 cutoff. So I check PR-AUC first, then sweep the threshold. In controlled comparisons, moving the threshold recovers essentially the same precision/recall trade-off as class weighting or SMOTE - for free, with no retraining and no distortion of the probabilities. If the baseline ranks well, I may be done. (4) IF RANKING IS GENUINELY POOR, intervene, and in this order of preference. CLASS WEIGHTS (or a cost-sensitive loss) first - one argument, no data distortion. FOCAL LOSS if the imbalance is extreme and dominated by easy negatives (detection-style, 1000:1), since it reweights by difficulty rather than by class. RESAMPLING last: oversampling the minority (simple duplication or SMOTE) when the minority is so rare that the model cannot see its structure, undersampling the majority (preferably as an ensemble over subsets, EasyEnsemble-style, so information is not discarded) when majority data is abundant. Always inside the pipeline, never before the split. (5) RECONSIDER THE FRAMING if none of that works. If positives are extremely rare, heterogeneous, or if new kinds of positives keep appearing, supervised classification may be the wrong tool and ANOMALY DETECTION (model normal, flag deviations) is better. If labels are the constraint rather than the algorithm, ACTIVE LEARNING - having the model rank unlabelled cases by uncertainty so annotators see the informative ones - buys more than any technique. And often the highest-value move is collecting more positives, which is a data problem, not a modelling one. THE THINGS I WOULD BE CAREFUL ABOUT THROUGHOUT: stratify every split so folds contain positives; never balance the TEST set (its distribution must match deployment); watch calibration if anything downstream consumes probabilities, since rebalancing shifts the implied prior; and report per-slice performance, because with 1% positives an aggregate number is dominated by very few examples and its confidence interval is wide. THE SUMMARY I would give: imbalance is usually a METRIC and THRESHOLD problem before it is a training problem, and the discipline of proving that - by checking whether the model's ranking is actually poor before changing how it is trained - is what separates a considered approach from reflexively reaching for SMOTE.",
          "deepDive": {
            "q": "Explain SMOTE in detail: how it works, when it helps, and its failure modes.",
            "a": "HOW IT WORKS. SMOTE (Chawla et al., 2002) creates synthetic minority examples rather than duplicating existing ones. For a minority point x, find its k nearest MINORITY neighbours (k=5 typically), pick one at random, and generate a new point at a random position along the segment between them: x_new = x + u * (x_neighbour - x) with u ~ Uniform(0,1). Repeat until the desired balance is reached. The motivation over plain duplication is that duplicates give the model nothing new - they just reweight - and encourage overfitting to those exact points, whereas interpolated points expand the minority region and encourage broader decision boundaries. WHEN IT HELPS. Low-dimensional, continuous features; a minority class that is reasonably CLUSTERED (so the segment between two minority points is plausibly also minority); and moderate imbalance where the model has enough minority examples to learn structure but is being swamped. In those conditions it modestly improves recall and sometimes PR-AUC. THE FAILURE MODES, which matter more than the successes. (1) LEAKAGE ACROSS THE SPLIT - the most damaging and most common. Applying SMOTE to the whole dataset before splitting means a synthetic training point can be an interpolation involving a real VALIDATION point, so the model has effectively seen the validation data. The measured effect is dramatic: F1 0.94 when done wrong versus 0.19 done correctly on the same data. The fix is imbalanced-learn's Pipeline, which applies resamplers during fit only and skips them at predict/transform time - scikit-learn's own Pipeline cannot express this, which is precisely why the separate library exists. (2) THE CURSE OF DIMENSIONALITY. In high dimensions, nearest neighbours become nearly equidistant and the notion of 'between two minority points' loses meaning, so interpolated points land off the data manifold - they are not plausible examples of anything. Empirically SMOTE degrades or hurts as dimensionality grows (a measured example: PR-AUC 0.51 without, 0.44 with, on a 200-dimensional version of the same problem). This is why SMOTE is far more common in classical low-dimensional tabular work than in high-dimensional or deep-learning settings. (3) INTERPOLATING ACROSS A CLASS BOUNDARY or into majority territory: if a minority point sits near the boundary or is an outlier, its neighbours may be on the other side, and the synthetic points invade the majority region - creating label noise and blurring exactly the boundary you care about. Variants exist specifically for this: BORDERLINE-SMOTE (only generate from minority points near the boundary), ADASYN (generate more where the local density of majority points is higher, i.e. where learning is hard), and SMOTE-ENN or SMOTE-Tomek (generate, then CLEAN by removing points whose neighbours disagree). (4) NOISE AMPLIFICATION: SMOTE happily interpolates from a mislabelled minority point, manufacturing a cluster of wrong labels. (5) CATEGORICAL FEATURES: interpolation is undefined for them - SMOTE-NC handles this by taking the majority category among neighbours, which is a heuristic rather than a principled fix. (6) IT BREAKS CALIBRATION like any resampling, by changing the implied prior. THE HONEST VERDICT I would give: SMOTE is worth trying on low-dimensional tabular problems with a clustered minority, always inside a proper pipeline, and always compared against the much simpler baselines - class weights and threshold tuning - which frequently match or beat it. Several careful comparative studies have found that its advantage over simple reweighting is small or absent once the threshold is tuned, which fits the general principle that resampling relocates the operating point rather than improving the model's ranking. It is a reasonable tool, not the default response to imbalance that its popularity suggests."
          }
        },
        {
          "q": "Why does rebalancing break calibration, and when does that matter?",
          "a": "THE MECHANISM. A classifier trained by maximum likelihood learns to output P(y=1|x) for the distribution it was TRAINED on. If you resample so that the training set is 50/50 when reality is 1/99, the model is learning the posterior under a different PRIOR - it answers 'what is the probability this is positive, if positives were half of all cases?'. Those probabilities are systematically too high for real traffic; a model reporting 0.6 might correspond to a true probability of 0.015. Class weighting has the same effect through a different route: upweighting minority errors is (for many losses) equivalent to resampling, and it shifts the learned decision function identically. THE CORRECTION, which is worth knowing because it makes the effect concrete. If p_r is the model's output under a resampled positive rate pi_r, and the true base rate is pi, then the corrected probability is obtained by reweighting the odds: multiply the positive-class likelihood by pi/pi_r and the negative by (1-pi)/(1-pi_r), then renormalize. Applying this recovers usable probabilities without retraining, and knowing it exists is what lets you rebalance and still consume probabilities downstream. Alternatively, fit a calibrator (Platt scaling or isotonic regression) on a held-out set drawn from the TRUE distribution, which handles this and any other miscalibration at once and is what I would usually do in practice. WHEN IT MATTERS - the question that determines whether you should care. It matters whenever anything downstream consumes the NUMBER rather than the ordering: (a) COST-BASED THRESHOLDING, since the derived threshold C_FP/(C_FP+C_FN) assumes calibrated probabilities - a miscalibrated model will not sit at the cost optimum where the formula says; (b) EXPECTED-VALUE calculations - ad bidding (pCTR times value), portfolio risk, triage prioritization where you multiply probability by impact; (c) HUMAN CONSUMPTION - a clinician told '30% risk' should be right 30% of the time or the number is worse than useless; (d) COMBINING models or evidence, since averaging or multiplying distorted probabilities compounds the distortion; (e) any REGULATED context where the probability is a reported quantity. WHEN IT DOES NOT MATTER: if the system's output is a hard decision at a threshold you tuned empirically on validation data, then miscalibration is irrelevant - you are using the model as a ranker, and a monotone distortion of the scores changes nothing about the ranking or about the tuned threshold's behaviour. This is a genuinely common case and it is why plenty of production systems rebalance without consequence. THE PRACTICAL SEQUENCE I WOULD RECOMMEND: prefer to train on the NATURAL distribution and set the threshold from costs - this keeps probabilities meaningful and achieves the same operating point that rebalancing would. If you do rebalance (because the minority is too rare for the model to learn otherwise), then recalibrate on a held-out set with the true class distribution before using any probability quantitatively. And check calibration explicitly - a reliability diagram plus expected calibration error on the true distribution - rather than assuming. THE BROADER POINT worth making: rebalancing is often described as 'fixing' imbalance, but it does not add information. It moves the model's operating point and distorts its probabilities. Framing it that way makes the trade-off visible and usually leads to the simpler solution."
        },
        {
          "q": "How do you evaluate a model when only 1% of examples are positive?",
          "a": "The core difficulty is that with a 1% base rate, a 10,000-example test set contains only ~100 positives, so every minority-class metric is estimated from very few observations and is correspondingly noisy - a recall of 0.80 has a 95% confidence interval of roughly +/- 0.08. Evaluation design matters as much as metric choice. WHAT I WOULD REPORT. (1) PRECISION AND RECALL AT THE OPERATING POINT, not a threshold-free summary alone - because the deployed system runs at one threshold and that is where its behaviour matters. (2) PR-AUC (average precision) as the threshold-free summary, with the BASE RATE stated alongside it, since PR-AUC's baseline IS the base rate (0.01 here) and is not comparable across datasets with different prevalence. A PR-AUC of 0.5 on a 1% problem is a 50x lift, not a mediocre result. (3) PRECISION@k where k is the real review capacity. This is usually the most actionable number: 'of the top 500 cases our team can review daily, 42% are genuine' answers the operational question directly and needs no statistical translation for a stakeholder. (4) RECALL AT A FIXED PRECISION (or vice versa), which pins one axis and makes model comparisons interpretable. (5) TOTAL EXPECTED COST if you have a cost matrix - the single number that actually corresponds to the decision. (6) CONFIDENCE INTERVALS on all of these, ideally by bootstrapping the test set, because the small positive count makes point estimates unreliable. WHAT I WOULD AVOID. Accuracy (gameable by predicting nothing). ROC-AUC as the headline (its FPR denominator hides a flood of false alarms; report it as secondary if at all). And crucially, a REBALANCED TEST SET - the test distribution must match deployment, because precision depends on the base rate and balancing the test set inflates it in a way that does not transfer. This last mistake is common in published comparisons and completely invalidates them. EVALUATION DESIGN, which is where the real work is. (a) MAKE THE TEST SET BIG ENOUGH: you need enough POSITIVES, not enough examples. If you need to resolve a 5-point recall difference, work backwards from the binomial variance to the number of positives required - often this means a much larger test set than you assumed, or accepting wider intervals. (b) STRATIFY every split so folds contain positives; with 1% and 5 folds, a random split can leave a fold with almost none. (c) EVALUATE AT THE DECISION UNIT: if the decision is per account but rows are transactions, aggregate before scoring, or the metric answers the wrong question. (d) SLICE the results - by segment, by time, by positive subtype - because with rare positives the aggregate can hide that you catch one kind of fraud and miss another entirely. (e) For temporal problems, use a FORWARD-CHAINING split and be aware of LABEL DELAY: in fraud, labels arrive weeks later, so recent data has systematically incomplete positives and naive evaluation on it understates recall. THE COMPARISON DISCIPLINE: with so few positives, differences between models are easily noise. Compare on identical folds, paired, and report the distribution of the difference rather than two point estimates - and be sceptical of a 2-point improvement measured on 100 positives, since that is two or three examples changing."
        },
        {
          "q": "When should you treat an imbalanced problem as anomaly detection instead?",
          "a": "THE DISTINCTION. Supervised classification learns a boundary between two classes from labelled examples of both. Anomaly detection models what NORMAL looks like (from the abundant majority data) and flags deviations, using few or no positive labels. The choice is not about the imbalance ratio per se - it is about whether the positive class is LEARNABLE as a class. SWITCH TO ANOMALY DETECTION WHEN: (1) POSITIVES ARE EXTREMELY FEW - a few dozen, or a ratio beyond ~1:10,000 - so there is not enough signal to characterize the positive class, but there is plenty of data to characterize normal. (2) POSITIVES ARE HETEROGENEOUS: the anomalies do not share a structure. Fraud schemes, novel attacks, and equipment failure modes each look different from each other, so 'positive' is not a coherent class to model - it is just 'not normal'. A classifier trained on past fraud learns past fraud specifically. (3) NEW KINDS OF POSITIVES KEEP APPEARING, so the deployed model must catch things never seen in training - the decisive argument in security and fraud, where adversaries deliberately produce novel patterns. (4) LABELS ARE UNAVAILABLE OR UNRELIABLE for the positive class, which is common when positives are only discovered long after the fact. (5) The natural framing is 'this transaction is unlike this customer's normal behaviour', i.e. the reference distribution is per-entity rather than global. STAY WITH CLASSIFICATION WHEN: you have hundreds or thousands of positives; they share recognizable structure; the phenomenon is stable over time; and you have reliable labels. In that regime a supervised model will substantially outperform an unsupervised one, because it can use the label information that anomaly detection throws away. This is the more common situation than people assume - a 1% positive rate with 5,000 positives is a perfectly good supervised problem. THE METHODS, briefly, since the question invites them: density-based (Gaussian mixtures, KDE), distance/neighbour-based (LOF), boundary-based (one-class SVM), isolation-based (Isolation Forest - efficient and a strong default for tabular), and reconstruction-based (autoencoders, where high reconstruction error signals an anomaly - the standard deep approach). Each defines 'unusual' differently, and the choice matters more than the hyperparameters. THE HYBRID that is usually best in practice, and the answer I would actually give for a fraud system: use BOTH. An anomaly detector catches novel patterns and provides a feature; a supervised classifier catches known patterns with high precision; and the anomaly score becomes an input to the classifier, or the two run in parallel with different review queues. Add ACTIVE LEARNING so that human review of flagged cases generates new labels, feeding the supervised side - which is how these systems actually improve over time. This also handles the transition naturally: you start unsupervised because you have no labels, and become progressively more supervised as labelled positives accumulate. THE EVALUATION CAVEAT worth raising: anomaly detectors are notoriously hard to evaluate without labels, and their unsupervised metrics correlate poorly with usefulness. If you have any labelled positives at all, use them for evaluation even if you cannot use them for training - a held-out set of known positives lets you measure recall at a fixed alert budget, which is the number that matters operationally."
        },
        {
          "q": "Explain focal loss and why it was needed for object detection.",
          "a": "THE PROBLEM IT SOLVED. Single-stage object detectors (YOLO, SSD, RetinaNet) evaluate a dense grid of candidate locations - on the order of 100,000 anchors per image - of which perhaps a dozen contain objects. That is an imbalance of roughly 1000:1, and it is qualitatively worse than the tabular case in one specific way: the overwhelming majority of the negatives are EASY. They are patches of sky, road, or blank wall that the model classifies correctly with probability 0.99 almost immediately. Even though each contributes a tiny individual loss, there are so many of them that in aggregate they dominate the total gradient, swamping the contribution of the few hard, informative examples. Two-stage detectors (Faster R-CNN) avoided this by having a proposal stage filter candidates down to ~1,000 before classification, which is why they outperformed single-stage detectors on accuracy despite being slower. Focal loss (Lin et al., 2017) was designed to close that gap. THE MECHANISM. Standard cross-entropy is -log(p_t) where p_t is the probability assigned to the TRUE class. Focal loss multiplies it by a modulating factor: FL = -alpha_t * (1-p_t)^gamma * log(p_t). The factor (1-p_t)^gamma is near zero when the example is confidently correct and near one when it is not. With gamma = 2 (the standard setting): an easy example at p_t = 0.9 is down-weighted by (0.1)^2 = 0.01, a 100x reduction; a hard example at p_t = 0.5 is down-weighted by 0.25, only 4x. So the loss automatically concentrates on the examples the model is currently getting wrong, and the mass of easy negatives fades from the gradient. The alpha_t term is a conventional class weight, and the two are complementary: alpha addresses the class FREQUENCY imbalance, gamma addresses the EASY/HARD imbalance. Note that gamma = 0 recovers ordinary weighted cross-entropy. WHY IT MATTERED. RetinaNet with focal loss was the first single-stage detector to match two-stage accuracy while retaining single-stage speed, which reframed the field's understanding: the two-stage advantage was not the architecture, it was that the proposal stage happened to fix a loss-imbalance problem. Once the loss was fixed directly, the architectural complexity became unnecessary. That is a nice example of diagnosing the real cause rather than accepting the empirical ranking. WHERE ELSE IT APPLIES: dense prediction generally (segmentation with tiny foreground classes), extreme-imbalance tabular problems, and any setting where the negatives are numerous AND mostly trivial. It is often combined with Dice loss in medical segmentation. THE CAVEATS, which a complete answer should include. (a) gamma is a hyperparameter and its optimum is task-dependent; too large and the model over-focuses on hard examples, which in a noisy dataset means over-focusing on MISLABELLED ones - focal loss amplifies label noise, which is a real and under-discussed failure mode. (b) It changes the loss landscape and can affect calibration - down-weighting easy examples means their probabilities are less well fitted. (c) It is not a substitute for a sensible threshold; you still tune the operating point. (d) Alternatives exist and sometimes work better: hard-negative MINING (explicitly select the hardest negatives per batch, as SSD did) achieves a similar effect discretely rather than smoothly, and simple class weighting is often enough at moderate imbalance. THE CONCEPTUAL POINT I would end on: focal loss reweights by DIFFICULTY rather than by CLASS, which is a more precise diagnosis of the problem. The issue was never that negatives were numerous - it was that they were numerous AND uninformative. That distinction is what makes it a better tool than class weighting for this specific regime, and it is the reason to reach for it rather than a bigger alpha."
        },
        {
          "q": "Your fraud model has 95% recall in testing but the review team says most alerts are wrong. Diagnose.",
          "a": "The team is describing LOW PRECISION, and the fact that this surprised anyone means the evaluation reported the wrong thing. I would work through it in order. (1) CONFIRM THE ARITHMETIC, which usually explains it immediately. At a 1% base rate with 100,000 daily transactions, there are 1,000 frauds. At 95% recall the model catches 950. If precision is 10%, it flags 9,500 cases to find those 950 - so 8,550 alerts a day are false, and from the reviewers' seat 90% of their work is wasted, which matches their complaint exactly. High recall and low precision are entirely compatible, and reporting recall alone conceals it. This is not a bug; it is an operating-point choice that nobody surfaced. (2) CHECK WHETHER PRECISION WAS EVER REPORTED, and on what distribution. Two common causes of a rosy offline number: the test set was REBALANCED (precision computed at 50% prevalence is meaningless and will be wildly optimistic relative to 1% traffic), or the metric was ROC-AUC, which looks excellent while thousands of false positives barely move the FPR. Recomputing precision on a test set with the true base rate usually reproduces the team's experience precisely. (3) CHECK THE OPERATING POINT AGAINST CAPACITY. The real constraint is how many cases the team can review - say 500 a day. So the right question is not 'what recall can we achieve?' but 'of the top 500 cases by score, how many are fraud?' - precision@500. Raising the threshold to flag 500 instead of 9,500 will drop recall (perhaps to 60%) and raise precision substantially, and that trade may well be the right one: 60% of frauds caught with a functioning review process beats 95% caught in a queue nobody can work through. This reframing - capacity as the binding constraint - is usually what resolves the disagreement. (4) VERIFY THE OFFLINE/ONLINE COMPARISON IS LIKE FOR LIKE. Is the deployed threshold the one that was evaluated? Are production features identical to training features (train/serve skew)? Has the fraud distribution shifted since the training period - adversaries adapt, so fraud models decay faster than most? And critically, LABEL DELAY: in fraud, ground truth arrives weeks later via chargebacks, so 'the reviewers say these are wrong' may partly reflect cases not yet confirmed rather than true false positives. I would check how the reviewers' judgement is being recorded and whether it agrees with eventual chargeback data. (5) LOOK AT THE FALSE POSITIVES THEMSELVES - the highest-information step. Are they concentrated in one merchant category, one country, one device type, one customer segment? Concentrated false positives usually mean a spurious feature or a population the training data underrepresented, and they are fixable. Diffuse false positives mean the model is at the limit of its signal and the answer is better features or a different operating point, not tuning. WHAT I WOULD PROPOSE: recompute precision/recall at true prevalence, produce a table of operating points (threshold, alerts/day, recall, precision) and let the business choose the row that matches review capacity, add precision@capacity to the standard reporting, investigate concentrated false-positive segments, and set up monitoring that tracks alert volume and confirmed-fraud rate weekly so drift is caught early. THE LESSON I would state plainly: this is a metric-communication failure more than a modelling failure. Reporting recall without precision, at the wrong prevalence, and without reference to review capacity, guarantees this conversation - and the fix is to report the numbers the operator experiences."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "Why imbalance breaks training",
        "back": "The averaged loss is dominated by the majority class, so most of the gradient comes from examples already correct - the cheapest way to reduce loss is to ignore the minority. 99% accuracy, zero recall."
      },
      {
        "type": "definition",
        "front": "The three levels of intervention",
        "back": "DATA (resample/SMOTE), LOSS (class weights, focal), DECISION (threshold). The threshold is free, needs no retraining, and is often sufficient - try it before the others."
      },
      {
        "type": "intuition",
        "front": "Rebalancing does not improve ranking",
        "back": "In controlled comparisons, class weighting and SMOTE leave PR-AUC essentially unchanged - they relocate the operating point, which the threshold does for free and without distorting probabilities."
      },
      {
        "type": "pitfall",
        "front": "SMOTE before the split",
        "back": "Synthetic points are INTERPOLATIONS of real points, so they leak across the split: F1 0.94 fake vs 0.19 honest. Use imbalanced-learn's Pipeline (sklearn's cannot skip a resampler at predict time)."
      },
      {
        "type": "pitfall",
        "front": "SMOTE in high dimensions",
        "back": "Neighbours become equidistant, so interpolated points leave the data manifold. Measured: PR-AUC 0.51 without vs 0.44 with, at 200 dims. SMOTE suits low-dimensional, clustered minorities."
      },
      {
        "type": "formula",
        "front": "Focal loss",
        "back": "FL = -alpha_t (1-p_t)^gamma log(p_t), gamma=2, alpha=0.25. Reweights by DIFFICULTY not class: an easy example at p_t=0.9 is down-weighted 100x, a hard one at 0.5 only 4x. gamma=0 recovers weighted CE."
      },
      {
        "type": "intuition",
        "front": "Why detection needed focal loss",
        "back": "~100k anchors per image, ~12 with objects, and the negatives are EASY - individually tiny losses that dominate in aggregate. Two-stage detectors avoided this via proposal filtering; focal loss fixed it directly."
      },
      {
        "type": "pitfall",
        "front": "Resampling breaks calibration",
        "back": "It changes the implied PRIOR, so probabilities no longer reflect the true rate. Correct via the odds-reweighting formula or recalibrate on a true-distribution holdout - essential if anything downstream consumes probabilities."
      },
      {
        "type": "pitfall",
        "front": "Never balance the test set",
        "back": "Test distribution must match deployment. Precision depends on the base rate, so a balanced test set inflates it and the number does not transfer - a common way published comparisons become meaningless."
      },
      {
        "type": "intuition",
        "front": "When to switch to anomaly detection",
        "back": "When positives are very few, HETEROGENEOUS (no shared structure), or novel kinds keep appearing. Then model 'normal' and flag deviations. With thousands of structurally-similar positives, supervised wins."
      }
    ],
    "refs": [
      {
        "title": "Chawla et al. (2002), SMOTE: Synthetic Minority Over-sampling Technique",
        "url": "https://arxiv.org/abs/1106.1813"
      },
      {
        "title": "Lin et al. (2017), Focal Loss for Dense Object Detection",
        "url": "https://arxiv.org/abs/1708.02002"
      },
      {
        "title": "He & Garcia (2009), Learning from Imbalanced Data",
        "url": "https://ieeexplore.ieee.org/document/5128907"
      },
      {
        "title": "imbalanced-learn documentation (pipelines that resample only during fit)",
        "url": "https://imbalanced-learn.org/stable/"
      }
    ],
    "demos": [
      "classification-metrics",
      "roc",
      "active-learning"
    ],
    "demoTitles": {
      "classification-metrics": "Classification Metrics",
      "roc": "ROC, PR & Thresholds",
      "active-learning": "Active Learning"
    }
  }
};
