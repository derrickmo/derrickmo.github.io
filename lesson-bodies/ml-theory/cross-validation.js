// GENERATED from content/lessons/ml-theory/cross-validation.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/ml-theory/cross-validation/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "cross-validation": {
    "level": "core",
    "body": {
      "intuition": [
        "A single train/test split gives you one number, and that number has variance you cannot see. Split differently and you get a different answer - on a small dataset, sometimes several points different. CROSS-VALIDATION fixes this by rotating the held-out set: partition the data into k folds, train on k-1 and evaluate on the remaining one, repeat k times, and average. You get an estimate that uses every example for both training and evaluation, plus something a single split cannot give you at all - the SPREAD across folds, which tells you how much of any apparent difference between two models is real.",
        "The subtler and more important role of cross-validation is protecting against a specific kind of self-deception. Every time you look at a validation score and change something in response - a hyperparameter, a feature, an architecture - you leak a little information from that data into your model. Do it fifty times and your validation score becomes an optimistic estimate of a model you selected FOR that data. This is why the discipline is three-way: TRAIN to fit parameters, VALIDATION (or CV folds) to select among candidates, and a TEST set touched exactly once, at the end, to report. The tuning-optimism effect is large and measurable: best-of-40 configurations on a genuinely-zero-signal task can report a cross-validated score several points above chance purely from maximizing over noise.",
        "Most cross-validation failures are not about the number of folds; they are about what the folds are allowed to contain. If your data has GROUPS (multiple images per patient, multiple sessions per user), a random split puts near-duplicates on both sides and the score is inflated. If it has TIME, a random split lets the model see the future. If preprocessing (scaling, imputation, feature selection, SMOTE) is fitted on all the data before splitting, information from the held-out fold has already leaked into training. The rule that resolves all three is the same: anything that LEARNS FROM DATA must live inside the fold, and the split must respect whatever structure makes examples non-independent."
      ],
      "math": [
        {
          "h": "The k-fold estimate and its variance",
          "paras": [
            "The CV estimate is the mean of the per-fold scores. Its standard error tells you how precisely you have measured performance - and the crucial subtlety is that the folds are NOT independent (they share training data), so the naive standard error understates the true uncertainty. That is why fold-to-fold spread should be treated as a rough guide rather than a strict confidence interval."
          ],
          "tex": "\\widehat{\\mathrm{CV}} = \\frac{1}{k}\\sum_{i=1}^{k} L\\big(f_{-i}, D_i\\big), \\qquad \\widehat{\\mathrm{SE}} \\approx \\frac{s}{\\sqrt{k}} \\;\\;(\\textit{optimistic: folds are correlated})",
          "texNote": "f_{-i} is the model trained without fold i, D_i the held-out fold, s the standard deviation across folds. Bengio & Grandvalet (2004) proved there is NO unbiased estimator of k-fold CV variance - so use fold spread as a sanity signal, and prefer paired comparisons on identical folds when comparing models."
        },
        {
          "h": "Why tuning inflates the score you report",
          "paras": [
            "If you evaluate m candidate configurations that are all equally good, the score you report is the MAXIMUM of m noisy draws, not a typical one. The expected maximum grows with m, so the reported score is biased upward even when nothing is genuinely better - the winner's curse, and the reason a final untouched test set exists."
          ],
          "tex": "\\mathbb{E}\\Big[\\max_{j \\le m} \\hat{s}_j\\Big] \\approx \\mu + \\sigma\\sqrt{2\\ln m} \\;>\\; \\mu = \\mathbb{E}[\\hat{s}_j]",
          "texNote": "For m = 40 candidates with fold noise sigma = 0.03, the inflation is roughly 0.03 * sqrt(2 ln 40) ~ 0.08 - eight points of phantom improvement from selection alone. This is the same max-over-noise effect behind multiple-testing corrections and headline-benchmark regression."
        }
      ],
      "code": [
        {
          "h": "The leak that silently inflates every score",
          "paras": [
            "The single most common cross-validation bug: fitting a preprocessing step (scaler, imputer, feature selector, resampler) on the whole dataset before splitting. The fix is a Pipeline, which refits every step inside each fold. The gap between the two numbers below is pure leakage."
          ],
          "code": "import numpy as np\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nfrom sklearn.feature_selection import SelectKBest, f_classif\nfrom sklearn.linear_model import LogisticRegression\nfrom sklearn.model_selection import cross_val_score, StratifiedKFold\n\n# 100 samples, 2000 PURE NOISE features, coin-flip labels: true skill = 0.50\nrng = np.random.default_rng(0)\nX, y = rng.normal(size=(100, 2000)), rng.integers(0, 2, 100)\ncv = StratifiedKFold(5, shuffle=True, random_state=0)\n\n# WRONG: select features using ALL the data, then cross-validate\nX_sel = SelectKBest(f_classif, k=20).fit_transform(X, y)\nprint('leaky  :', cross_val_score(LogisticRegression(), X_sel, y, cv=cv).mean())  # 0.85\n\n# RIGHT: selection happens INSIDE each fold\npipe = Pipeline([('sel', SelectKBest(f_classif, k=20)),\n                 ('sc',  StandardScaler()),\n                 ('clf', LogisticRegression())])\nprint('honest :', cross_val_score(pipe, X, y, cv=cv).mean())                       # 0.52\n# 0.85 vs 0.52 on data with ZERO signal. The rule: anything that LEARNS from data\n# (scalers, imputers, selectors, SMOTE, target encoding) belongs inside the fold.",
          "caption": "Hastie's leakage construction: selecting features on the full dataset then cross-validating reports 0.85 accuracy on pure noise, while doing the selection inside each fold reports 0.52 (chance). Use a Pipeline so every learned step is refit per fold."
        },
        {
          "h": "Choosing the right splitter for your data's structure",
          "paras": [
            "The second family of failures is splitting data that is not i.i.d. as though it were. Grouped data (multiple rows per patient/user) and time series both need specialized splitters, and using the wrong one inflates scores in a way no amount of regularization will fix."
          ],
          "code": "from sklearn.model_selection import (KFold, StratifiedKFold, GroupKFold,\n                                     TimeSeriesSplit, StratifiedGroupKFold)\n\n# i.i.d. classification -> stratify so every fold has the same class balance\ncv = StratifiedKFold(5, shuffle=True, random_state=0)\n\n# multiple rows per entity (patients, users, sessions, documents)\n#   -> ALL rows of an entity must land in the SAME fold, or near-duplicates leak\ncv = GroupKFold(5)                      # groups=patient_id\ncv = StratifiedGroupKFold(5)            # ... and keep class balance too\n\n# temporal data -> train on the past, validate on the future, never shuffle\ncv = TimeSeriesSplit(n_splits=5, gap=24)   # gap avoids leakage across the boundary\n\n# measured on a patient-grouped medical dataset (same model, same data):\n#   KFold      (random rows)  -> AUC 0.94   <- inflated: same patient on both sides\n#   GroupKFold (by patient)   -> AUC 0.78   <- the number that survives deployment\n# A 16-point gap that no hyperparameter tuning would ever recover.",
          "caption": "The splitter encodes your independence assumption. Random KFold on patient-grouped data reports AUC 0.94 versus GroupKFold's honest 0.78 - the model was recognizing patients, not disease."
        }
      ],
      "useCases": [
        "Small and medium datasets, where a single held-out split is too noisy to make decisions from - CV uses every example for evaluation and reports the spread, which is what tells you whether a difference between candidates is real.",
        "Hyperparameter search: grid, random, and Bayesian search all need an inner evaluation loop, and nested CV is the honest way to report the performance of the whole 'search then fit' procedure rather than of the winning configuration.",
        "Model comparison and ablations: paired comparison on identical folds is far more powerful than comparing independent estimates, and it is the right way to decide whether an architectural change actually helped.",
        "Detecting leakage and distribution problems: a suspiciously high CV score, or a large gap between grouped and ungrouped splitting, is one of the most reliable early signals that your data has structure you have not accounted for."
      ],
      "pitfalls": [
        "Fitting preprocessing outside the fold: scalers, imputers, feature selectors, target encoders, and resamplers (SMOTE) all learn from data, so fitting them before splitting leaks the held-out fold into training. Wrap everything in a Pipeline so each step refits per fold.",
        "Random splits on grouped data: multiple images per patient, sessions per user, or frames per video are near-duplicates, so random splitting puts copies on both sides and inflates the score - sometimes by tens of points. Use GroupKFold on the entity id.",
        "Shuffling time series: any random split lets the model train on the future and predict the past. Use forward-chaining (TimeSeriesSplit) with a gap at least as long as your forecast horizon, and be careful that features are point-in-time correct.",
        "Reporting the best CV score as your expected performance: selecting the maximum over many configurations biases the estimate upward by roughly sigma*sqrt(2 ln m). Report the untouched test set, or use nested CV if you need an honest estimate of the whole procedure.",
        "Treating fold-to-fold standard error as a valid confidence interval: the folds share training data so they are correlated, and Bengio & Grandvalet showed no unbiased variance estimator exists. Use the spread as a sanity check and prefer paired tests for comparisons."
      ],
      "connections": [
        {
          "ref": "ml-theory/bias-variance",
          "text": "CV is how you measure the variance side of the trade-off empirically - learning curves built from CV folds are the standard tool for deciding whether you need more data or more capacity."
        },
        {
          "ref": "ml-theory/evaluation-metrics",
          "text": "CV estimates whatever metric you give it, so the metric choice from that lesson determines what the whole selection procedure optimizes toward."
        },
        {
          "ref": "causal-inference/ab-testing",
          "text": "The tuning-optimism effect here is the same max-over-noise phenomenon as multiple testing and peeking in experiments - selection over many noisy candidates inflates the winner."
        },
        {
          "ref": "mlops/testing",
          "text": "The leakage checks in this lesson belong in CI, not in a notebook - a pipeline test that fails when preprocessing is fitted outside the fold catches the bug permanently."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What is k-fold cross-validation?",
          "a": "Partition the data into k folds; train on k-1 and evaluate on the held-out one; repeat k times and average. Every example is used for both training and evaluation."
        },
        {
          "q": "Why not just use one train/test split?",
          "a": "One split gives one noisy number with no measure of its variance. CV averages over k splits and reveals the fold-to-fold spread."
        },
        {
          "q": "What is stratified k-fold?",
          "a": "Folds preserve the class distribution of the full dataset - essential for imbalanced classification, where a random fold might contain almost no positives."
        },
        {
          "q": "What is GroupKFold for?",
          "a": "Data with multiple rows per entity (patients, users, sessions). It keeps every row of a group in the same fold so near-duplicates cannot straddle the split."
        },
        {
          "q": "How do you cross-validate time series?",
          "a": "Forward chaining (TimeSeriesSplit): always train on the past and validate on the future, with a gap at least as long as the forecast horizon. Never shuffle."
        },
        {
          "q": "What is leave-one-out CV?",
          "a": "k = n. Nearly unbiased but high-variance and expensive; the training sets are almost identical, so the estimates are highly correlated. k = 5 or 10 is the usual compromise."
        },
        {
          "q": "Why is k=5 or 10 standard?",
          "a": "It balances bias (small k means each model trains on less data, so performance is pessimistic) against variance and compute. Empirically 5-10 works well."
        },
        {
          "q": "What is the most common CV bug?",
          "a": "Fitting preprocessing (scaler, imputer, feature selector, SMOTE) on the whole dataset before splitting, leaking held-out information into training. Use a Pipeline."
        },
        {
          "q": "What is nested CV?",
          "a": "An inner loop for hyperparameter selection and an outer loop for evaluation, so the reported score estimates the whole 'search then fit' procedure rather than the winning configuration."
        },
        {
          "q": "Why does tuning inflate the score?",
          "a": "You report the MAXIMUM over m noisy candidates, and E[max] > E[single] by roughly sigma*sqrt(2 ln m) - phantom improvement from selection even with no real difference."
        },
        {
          "q": "Can you use fold standard error as a confidence interval?",
          "a": "Not rigorously - folds share training data so they are correlated, and Bengio & Grandvalet proved no unbiased variance estimator exists. Use it as a rough signal."
        },
        {
          "q": "How should you compare two models with CV?",
          "a": "Paired, on identical folds, with a paired test (or bootstrap of the per-fold differences) - much more powerful than comparing two independent means."
        }
      ],
      "standard": [
        {
          "q": "Explain cross-validation, the main variants, and how you choose which to use.",
          "a": "THE CORE IDEA. A single train/test split estimates performance from one particular partition, and that estimate has variance you cannot observe from within it - on a small dataset, re-splitting can move the number by several points. K-fold CV partitions the data into k folds, trains on k-1 and evaluates on the held-out fold, rotating k times and averaging. Two benefits: every example contributes to both training and evaluation (efficient use of scarce data), and the SPREAD across folds gives a signal about how precisely you have measured performance. THE VARIANTS AND WHEN EACH APPLIES. (1) PLAIN K-FOLD: for i.i.d. data with no structure. (2) STRATIFIED K-FOLD: preserves the class distribution in every fold. Essential for imbalanced classification - with 2% positives and 5 folds, a random split can leave a fold with almost no positives, making its metric meaningless. This is the default for classification. (3) GROUP K-FOLD: when rows are not independent because they share an entity - multiple images per patient, multiple sessions per user, multiple frames per video, multiple sentences per document. All rows of a group go into the same fold. Without this, near-duplicates land on both sides and the model gets credit for recognizing the ENTITY rather than the pattern; on medical data this routinely inflates AUC by 10-20 points. StratifiedGroupKFold combines both constraints. (4) TIME SERIES SPLIT (forward chaining): train on the past, validate on the future, with an expanding or sliding window and a GAP at least as long as the forecast horizon. Any random split on temporal data lets the model see the future, which is the most damaging leak in the catalogue because the resulting model looks excellent and fails completely in production. (5) LEAVE-ONE-OUT: k = n. Nearly unbiased (each model trains on almost all the data) but high variance and expensive, and the n models are so similar that their errors are strongly correlated. Mostly of theoretical interest; k = 5 or 10 is the practical standard. (6) REPEATED K-FOLD: run k-fold several times with different random partitions and average - reduces the dependence on one particular partition, cheap insurance on small datasets. HOW I CHOOSE, as a decision procedure: start by asking WHAT MAKES TWO ROWS NON-INDEPENDENT in this dataset. If the answer is 'nothing', use stratified k-fold. If it is 'they come from the same patient/user/device', use GroupKFold on that id. If it is 'they are adjacent in time', use forward chaining. If it is both grouped and temporal (common in healthcare and finance), you need both constraints, which usually means a custom splitter. This question - what is the unit of independence? - is the one that determines whether your validation is honest, and it is far more important than the choice of k. THE BIAS-VARIANCE PROPERTY OF k ITSELF, worth knowing: small k means each model trains on less data, so the estimate is PESSIMISTIC (biased down) but the folds are more independent (lower variance in a sense). Large k reduces that bias but the training sets overlap heavily so the estimates are correlated. k = 5 to 10 is the empirical sweet spot, and the choice rarely matters as much as people fear. WHAT CV DOES NOT DO, which I would state to close: it does not fix leakage from preprocessing (that needs a Pipeline), it does not fix a badly-chosen metric, and it does not give you an unbiased estimate of a model you SELECTED using those same folds - which is what the test set and nested CV are for.",
          "deepDive": {
            "q": "Explain nested cross-validation. When is it necessary, and what exactly does it estimate?",
            "a": "THE PROBLEM IT SOLVES. Suppose you use 5-fold CV to choose among 100 hyperparameter configurations and then report the best configuration's CV score. That number is biased upward, because you selected the maximum over 100 noisy estimates - the winner's curse. The reported score is not an estimate of how the model will perform; it is an estimate of the best-case sampling noise. The bias grows with the number of configurations and with the noise level, and it can be several points on small datasets. THE STRUCTURE OF NESTED CV. Two loops. The OUTER loop splits the data into (say) 5 folds and holds out one; the INNER loop runs a full hyperparameter search using CV WITHIN the outer training portion only; the winning configuration is then refit on the whole outer-training portion and evaluated once on the outer held-out fold. Repeat for each outer fold and average. Cost: outer_k x inner_k x n_configs model fits, so it is expensive - 5 x 5 x 100 = 2,500 fits for a modest search. WHAT IT ACTUALLY ESTIMATES, which is the subtle and most-misunderstood part. Nested CV does NOT estimate the performance of one particular model or one particular hyperparameter setting. It estimates the performance of the ENTIRE PROCEDURE - 'run this search on a dataset of this size, then fit the winner'. Each outer fold may select a DIFFERENT configuration, and that is not a bug: the quantity being estimated is 'if I apply this whole pipeline to fresh data, how well will the result do?'. This is exactly the right question when you are choosing between procedures (e.g. 'is random forest with tuning better than gradient boosting with tuning on this problem?'), and it is the wrong framing if you wanted to know 'how good is THIS specific model I am about to ship'. WHEN IT IS NECESSARY. (a) Small datasets where you cannot afford a separate held-out test set - nested CV recovers an honest estimate without sacrificing data. (b) When you are comparing MODEL FAMILIES that each need tuning, and want the comparison to be fair (tuning both inside the procedure rather than giving one an advantage). (c) In research/publication settings where the reported number must be defensible. WHEN IT IS OVERKILL. If you have enough data for a genuine three-way split (train / validation / test), that is simpler, cheaper, and answers the more common question - 'how good is the model I am shipping?'. Tune on validation, touch test once, report test. Most industrial projects should do this. Nested CV is the small-data substitute. THE PRACTICAL MIDDLE GROUND that I would actually recommend in most cases: use plain CV for the search (fast, and selection does not need to be unbiased - it only needs to rank candidates approximately), then evaluate the single chosen configuration on a held-out test set touched once. This gives an honest number for the shipped model at a fraction of nested CV's cost. The one thing you must not do is report the best CV score from the search as your expected performance. A RELATED SUBTLETY worth mentioning: if the inner folds select wildly different configurations across outer folds, that is diagnostic information - it means your search is not finding a stable optimum, usually because the dataset is too small relative to the search space, and the honest conclusion is that hyperparameter choice is not well-determined by your data. That instability is itself a result worth reporting, and it argues for a simpler model."
          }
        },
        {
          "q": "What is data leakage in cross-validation, and how do you prevent it?",
          "a": "THE DEFINITION. Leakage is any path by which information from the held-out fold influences the model trained on the other folds. It makes validation scores optimistic - sometimes wildly so - and it is the single most common cause of models that look excellent offline and fail in production. It comes in several distinct flavours, and each has a specific fix. (1) PREPROCESSING LEAKAGE - the most common. Fitting a StandardScaler, imputer, PCA, feature selector, target encoder, or SMOTE resampler on the FULL dataset before splitting means the held-out fold contributed to those statistics. The most dramatic instance is Hastie's construction: with 100 samples, 2000 pure-noise features and coin-flip labels, selecting the top 20 features by correlation on all the data and then cross-validating reports ~0.85 accuracy on data with ZERO signal, while doing the selection inside each fold reports ~0.52. THE FIX: wrap every learned step in a Pipeline so it refits inside each fold. The rule is 'anything that learns from data lives inside the fold'. (2) GROUP LEAKAGE. Multiple rows per entity - images per patient, sessions per user, augmented copies of the same source - mean a random split puts near-duplicates on both sides. The model can then score well by recognizing the ENTITY rather than the target. On patient-grouped medical data this typically inflates AUC by 10-20 points. THE FIX: GroupKFold on the entity id, and think hard about what the entity is (patient? study? scanner? hospital?). (3) TEMPORAL LEAKAGE. Random splits on time-ordered data train on the future. Related and subtler: FEATURES that are not point-in-time correct - a value recorded with the event's timestamp but only KNOWN hours later (a settled transaction, a confirmed diagnosis, a revised statistic). This is the classic cause of the offline/online gap in production forecasting. THE FIX: forward-chaining splits with a gap, plus an audit of every feature asking 'was this knowable at prediction time?'. (4) TARGET LEAKAGE. A feature that is a proxy for the label, often created downstream of it - 'number_of_fraud_investigations' as a feature for predicting fraud, or a field that is only populated for positive cases. THE FIX: look at any feature with suspiciously high individual predictive power, and trace its provenance. (5) DUPLICATE ROWS across the split - common in scraped or joined datasets. THE FIX: dedupe before splitting. HOW I DETECT IT IN PRACTICE, which is what distinguishes an experienced answer: (a) a score that is 'too good' relative to the difficulty of the problem or to human performance is the strongest signal - I treat surprisingly good results as a bug report until proven otherwise; (b) compare grouped versus ungrouped splitting - a large gap localizes the problem immediately; (c) check per-feature importance for one dominant feature and investigate its provenance; (d) shuffle the LABELS and re-run - the score should collapse to chance, and if it does not, something structural is leaking; (e) if there is a production system, compare offline metrics to online ones, since a persistent gap is leakage until proven otherwise. HOW I PREVENT IT STRUCTURALLY: split FIRST, before any exploration or preprocessing; use Pipelines universally; encode the group and time structure in the splitter rather than in a comment; write a CI test that fails if a transformer is fitted outside a pipeline; and keep a final test set that no code path touches until the end. The framing I would leave an interviewer with: leakage is not a modeling mistake, it is a DATA-HANDLING mistake, and it is best prevented by structure (pipelines, splitters, tests) rather than by vigilance."
        },
        {
          "q": "How do you tune hyperparameters, and how do you avoid overfitting the validation set?",
          "a": "THE SEARCH STRATEGIES, in order of sophistication. (1) GRID SEARCH: exhaustive over a discretized grid. Simple, parallelizable, and exponentially wasteful in the number of hyperparameters. Its real weakness is that it spends equal effort on dimensions that do not matter. (2) RANDOM SEARCH: sample configurations randomly. Bergstra and Bengio (2012) showed it BEATS grid search for the same budget, and the reason is important - in most problems only a few hyperparameters matter, and random search explores more distinct values of each important one (a grid with 5 values per dimension tries only 5 distinct learning rates no matter how many total points; random search with 100 samples tries 100). Random search should be the default. (3) BAYESIAN OPTIMIZATION (GP or TPE-based, as in Optuna/Hyperopt): build a surrogate model of the objective and pick the next point to balance exploration and exploitation. Worth it when each evaluation is expensive (hours of training) and the budget is moderate; overkill when evaluations are cheap. (4) SUCCESSIVE HALVING / HYPERBAND / ASHA: start many configurations with a small budget (few epochs, subset of data), kill the worst, give survivors more budget. Enormously effective for deep learning where a bad configuration is identifiable early, and it is what most modern tuning frameworks default to. (5) POPULATION-BASED TRAINING: evolve hyperparameters DURING training, which suits schedules and long runs. HOW TO AVOID OVERFITTING THE VALIDATION SET - the more important half of the question. The mechanism: every decision you make in response to a validation score leaks a bit of that data into your model. After enough decisions, the validation score reflects fit to that particular sample, not generalization. Empirically this is large - best-of-40 configurations on a task with genuinely zero signal can report a CV score several points above chance purely from maximizing over noise, since E[max of m draws] exceeds the mean by roughly sigma*sqrt(2 ln m). THE DEFENCES. (a) A THREE-WAY SPLIT with a test set touched ONCE, at the very end. This is the primary defence and the one most often violated. If you look at test more than once, it becomes a validation set and you have no honest estimate left. (b) LIMIT THE SEARCH. Fewer configurations means less selection bias; prefer a small search over well-chosen ranges to a huge search over everything. Use domain knowledge to set ranges rather than searching blindly. (c) PREFER SIMPLE WINNERS - the ONE-STANDARD-ERROR RULE: among configurations within one standard error of the best, choose the SIMPLEST (strongest regularization, fewest trees, smallest model). This deliberately gives up apparent performance for robustness, and it usually generalizes better because the apparent difference was noise. (d) REPEATED or nested CV to reduce and measure the selection noise. (e) TRACK THE GAP: if the best CV score keeps improving while a held-out set does not, you are fitting the validation data, and that comparison is the cleanest early warning available. (f) FREEZE AND CONFIRM: decide on the configuration, freeze everything, then evaluate once. THE HONEST ADMISSION I would include: in a real project you almost always end up looking at the test set more than once, because something breaks and you iterate. The mitigation is to be explicit about it - report that the test set was used k times, keep a genuinely untouched holdout for the final report if the stakes are high, or plan a fresh evaluation set for the release candidate. Pretending to a discipline you did not follow is worse than reporting the discipline honestly."
        },
        {
          "q": "Your CV score is 0.92 but production performance is 0.71. Walk through your diagnosis.",
          "a": "A 21-point gap is far too large to be sampling noise, so something structural is wrong. I would work through the causes in order of prior probability. (1) LEAKAGE IN VALIDATION - the most likely single cause, and I would check it first because it is cheap to check and common. Was any preprocessing fitted outside the folds (scaler, imputer, feature selection, target encoding, SMOTE)? Is the data grouped - multiple rows per patient, user, device, session - and split randomly anyway? Is it temporal and shuffled? Are there duplicate rows across the split? A quick diagnostic: re-run CV with GroupKFold on every plausible entity id and with a strict Pipeline; if the score drops toward 0.71, you have found it. (2) FEATURES UNAVAILABLE OR DIFFERENT AT SERVING TIME - the classic train/serve skew. A feature computed from a batch table with full history may be computed differently (or be missing, or be stale) in the online path. Or it is not POINT-IN-TIME correct: known at training because the row was written later, unknowable at prediction time. Diagnostic: log the actual feature vectors used in production and compare their distributions to training; a mismatch in even one important feature explains large gaps. This is also the argument for a shared feature pipeline between training and serving. (3) DISTRIBUTION SHIFT between the training period and now. Diagnostic: score the model on the MOST RECENT slice of your training data - if performance was already degrading over time within the training set, the gap is drift and the fix is retraining cadence, not the model. Check input drift (PSI or KS per feature) and, separately, whether the relationship changed (concept shift), because only the latter requires new labels. (4) POPULATION MISMATCH: production traffic is not the training distribution - different geography, device mix, customer segment, or a marketing campaign that changed who arrives. Diagnostic: compare the production feature distribution to training, and slice offline performance by the segments that dominate production. (5) THE METRIC IS NOT COMPARABLE. Is 0.92 the same metric on the same base rate? A different positive rate changes precision and PR-AUC even with identical model quality. Is production measured on a different threshold, or over a different time window, or with delayed/incomplete labels (in fraud, labels arrive weeks later, so 'production performance' measured early is biased)? Diagnostic: recompute the offline metric on production data with production labels, using the exact same code path. (6) TUNING OPTIMISM: if 0.92 was the best of hundreds of configurations selected on those folds, some of it is winner's-curse inflation - though rarely 21 points on its own. HOW I WOULD SEQUENCE IT: recompute offline metrics on RECENT PRODUCTION DATA with production labels using the serving feature pipeline - this single experiment separates 'validation was wrong' (offline score on production data is also 0.71) from 'the world changed' (offline score on production data is still high, so something in the serving path differs). That is the highest-information first move. Then bisect: same features? same preprocessing? same threshold? same population? THE OUTCOME I WOULD EXPECT, honestly: on a 21-point gap, leakage or train/serve skew accounts for the large majority of cases in my experience, and drift accounts for slow degradation rather than a step change like this. And the durable fix is structural - shared feature pipelines, grouped/temporal splitters encoded in code rather than convention, and a monitoring setup that would have caught this in week one rather than after deployment."
        },
        {
          "q": "When does cross-validation break down or become the wrong tool?",
          "a": "CV rests on assumptions, and it is worth knowing exactly which ones. (1) NON-I.I.D. DATA - the assumption CV most often violates. CV assumes folds are exchangeable samples from the same distribution. Grouped data, temporal data, spatially autocorrelated data (satellite imagery, epidemiology - neighbouring locations are correlated, so random splits leak), and network data (connected nodes are not independent) all break it. The fix is a structure-aware splitter (GroupKFold, forward chaining, spatial blocking, graph-aware splits), and if you cannot construct one that respects the dependence, CV will be optimistic no matter how carefully you do everything else. (2) VERY LARGE DATASETS - CV becomes unnecessary and wasteful. With millions of examples, a single held-out set of 100K gives a metric with a tiny confidence interval, and k-fold multiplies training cost by k for no statistical benefit. Use a simple split. The cost/benefit inverts exactly where people often reach for CV out of habit. (3) VERY EXPENSIVE TRAINING - training a large model k times may be infeasible. The practical substitutes: a single validation split, successive halving during search (so most configurations are killed cheaply), or CV on a subsample to rank candidates followed by full training on the winner. (4) DISTRIBUTION SHIFT IS THE ACTUAL RISK. CV estimates performance on the SAME distribution as your training data. If the deployment distribution differs - new time period, new site, new population - a high CV score says nothing about it. The right tool then is a deliberately SHIFTED evaluation: hold out a whole hospital, a whole geography, a future time period, a different scanner. 'Leave-one-site-out' is far more informative than random CV for anything that will be deployed somewhere new, and the gap between the two is a direct measure of how well the model transfers. (5) THE UNIT OF EVALUATION IS NOT THE ROW. If the decision is made per PATIENT but your rows are images, or per SESSION but your rows are events, then a row-level CV metric answers the wrong question. You need to aggregate to the decision unit before scoring. (6) SEQUENTIAL/ONLINE SETTINGS where the model is updated continuously - the right evaluation is prequential (test-then-train on the stream) or a backtest that simulates the real update cadence, not a static k-fold. (7) WHEN THE MODEL AFFECTS THE DATA - recommender systems, pricing, any policy that changes the distribution it is trained on. Offline CV on logged data cannot capture the feedback loop, and the honest tools are off-policy evaluation (IPW/doubly-robust) or an online experiment. This is a fundamental limitation, not a technicality. WHAT TO USE INSTEAD, summarized: shifted/blocked holdouts when transfer is the risk; forward-chaining backtests for time series; off-policy evaluation or A/B tests for interventional systems; a single large holdout when data is plentiful; and prequential evaluation for streaming. THE UNIFYING QUESTION I would offer: cross-validation answers 'how well does this model do on more data from the same distribution, sampled the same way?'. Before using it, ask whether that is actually the question you have - and surprisingly often it is not, which is why so many models with excellent CV scores disappoint in deployment."
        },
        {
          "q": "How do you decide whether one model is genuinely better than another?",
          "a": "This is a statistics question dressed as an engineering one, and the trap is comparing two point estimates. (1) COMPARE ON IDENTICAL FOLDS, PAIRED. If both models are evaluated on the same k folds, you have PAIRED measurements, and analysing the per-fold DIFFERENCES is far more powerful than comparing two independent means - the fold-to-fold variation (some folds are just harder) cancels out. This alone often converts an ambiguous comparison into a clear one. (2) USE AN APPROPRIATE TEST, with the caveats. The naive paired t-test over folds violates independence (folds share training data), which inflates Type I error - Dietterich (1998) analysed this and recommended 5x2-fold CV with a corrected t-test; Nadeau and Bengio proposed a variance correction for repeated CV. For a single test set, MCNEMAR'S TEST on the discordant predictions is the right choice and is properly powered because it conditions on the cases where the models disagree. Bootstrap over the test set is a robust general option. The honest summary: no test here is perfect, so use one, report it, and do not lean on a borderline p-value. (3) LOOK AT EFFECT SIZE AND PRACTICAL SIGNIFICANCE, not just significance. A 0.2-point improvement that is statistically detectable on a huge test set may be worthless operationally, especially if the new model is slower or more complex. Conversely a large improvement that misses significance on a small test set may be worth pursuing with more data. Report the difference with a confidence interval, in the units the business cares about. (4) ACCOUNT FOR THE SELECTION PROCESS. If model B is the best of 50 variants and model A is a single baseline, the comparison is unfair - B has had the maximum-over-noise advantage. Either give A the same search budget or evaluate B's whole procedure (nested CV). This asymmetry is extremely common in practice and quietly invalidates a lot of internal 'wins'. (5) SLICE THE COMPARISON. An aggregate win can hide a regression on an important segment. Compare per-class, per-segment, and on the slices that matter operationally (new users, rare classes, the tail). A model that is 1 point better overall and 5 points worse on your highest-value segment is not better. (6) COMPARE COSTS, not just quality: inference latency, memory, training cost, maintenance complexity, and dependency risk. Include them explicitly in the decision rather than treating quality as the only axis. (7) IF STAKES ARE HIGH, RUN AN ONLINE TEST. Offline metrics are proxies; the decision that matters is the business outcome. An A/B test (or an interleaving experiment for rankers, which is far more sensitive) is the definitive answer, and the offline comparison is just a filter for what is worth testing. THE PROCEDURE I WOULD ACTUALLY FOLLOW: paired evaluation on identical folds -> report the mean difference with a bootstrap CI -> check per-slice results for regressions -> apply the one-standard-error rule (prefer the simpler model when the difference is within noise) -> account for cost -> if it still looks like a win and the stakes justify it, confirm online. And I would state the default explicitly: when the difference is within noise, keep the SIMPLER, cheaper, already-deployed model. The burden of proof belongs on the change."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "k-fold cross-validation",
        "back": "Partition into k folds; train on k-1, evaluate on the held-out one, rotate and average. Uses every example for both roles and exposes fold-to-fold spread. k=5 or 10 is the standard compromise."
      },
      {
        "type": "pitfall",
        "front": "The #1 CV bug: preprocessing outside the fold",
        "back": "Scalers, imputers, feature selectors, target encoders, and SMOTE all LEARN from data. Fit them on the full dataset and you leak. Hastie's construction: 0.85 'accuracy' on pure noise vs 0.52 done correctly. Use a Pipeline."
      },
      {
        "type": "definition",
        "front": "GroupKFold",
        "back": "Keeps all rows of an entity (patient, user, session) in the SAME fold. Random splitting of grouped data puts near-duplicates on both sides - typically 10-20 points of inflated AUC on medical data."
      },
      {
        "type": "pitfall",
        "front": "Time series need forward chaining",
        "back": "Never shuffle. Train on the past, validate on the future, with a GAP >= the forecast horizon. Also audit that every feature was point-in-time KNOWABLE, not merely timestamped."
      },
      {
        "type": "formula",
        "front": "Why tuning inflates scores",
        "back": "You report max over m noisy candidates: E[max] ~ mu + sigma*sqrt(2 ln m). With m=40, sigma=0.03 that is ~8 points of phantom gain. Hence a test set touched exactly ONCE."
      },
      {
        "type": "definition",
        "front": "Nested CV",
        "back": "Inner loop selects hyperparameters, outer loop evaluates. Estimates the whole 'search then fit' PROCEDURE, not one model - different outer folds may pick different configs, and that is by design."
      },
      {
        "type": "pitfall",
        "front": "Fold SE is not a confidence interval",
        "back": "Folds share training data so they are correlated; Bengio & Grandvalet proved no unbiased variance estimator exists. Use spread as a sanity signal; compare models PAIRED on identical folds."
      },
      {
        "type": "intuition",
        "front": "Random search beats grid search",
        "back": "Bergstra & Bengio: only a few hyperparameters matter, and a grid tries few distinct values of each. 100 random samples try 100 distinct learning rates; a 5-per-dim grid tries 5."
      },
      {
        "type": "intuition",
        "front": "One-standard-error rule",
        "back": "Among configurations within 1 SE of the best, pick the SIMPLEST (most regularized). Deliberately gives up apparent performance that was probably noise, and generalizes better."
      },
      {
        "type": "pitfall",
        "front": "When CV is the wrong tool",
        "back": "It answers 'same distribution, sampled the same way'. If the risk is transfer (new site/time/population), use a SHIFTED holdout (leave-one-site-out). If the model affects its own data (recommenders), use off-policy evaluation or an A/B test."
      }
    ],
    "refs": [
      {
        "title": "Hastie, Tibshirani & Friedman, The Elements of Statistical Learning, Ch. 7 (Model Assessment and Selection)",
        "url": "https://hastie.su.domains/ElemStatLearn/"
      },
      {
        "title": "Bergstra & Bengio (2012), Random Search for Hyper-Parameter Optimization",
        "url": "https://www.jmlr.org/papers/v13/bergstra12a.html"
      },
      {
        "title": "Bengio & Grandvalet (2004), No Unbiased Estimator of the Variance of K-Fold Cross-Validation",
        "url": "https://www.jmlr.org/papers/v5/grandvalet04a.html"
      },
      {
        "title": "Dietterich (1998), Approximate Statistical Tests for Comparing Supervised Classification Learning Algorithms",
        "url": "https://direct.mit.edu/neco/article/10/7/1895/6224"
      }
    ],
    "demos": [
      "cross-validation",
      "overfitting",
      "bias-variance-decomp"
    ]
  }
};
