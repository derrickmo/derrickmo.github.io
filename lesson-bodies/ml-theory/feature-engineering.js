// GENERATED from content/lessons/ml-theory/feature-engineering.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/ml-theory/feature-engineering/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "feature-engineering": {
    "level": "core",
    "body": {
      "intuition": [
        "Feature engineering is the work of turning raw records into inputs a model can actually use, and on tabular data it is usually where the performance is. The reason is that a model can only combine what you give it: a gradient-boosted tree can split on a value but cannot invent a RATIO, cannot know that two timestamps should be subtracted, and cannot know that a 'zip code' is geography rather than a number. Encoding that knowledge is what a domain expert contributes, and one well-chosen interaction feature routinely beats twenty hours of hyperparameter tuning - a value ladder worth measuring explicitly, because it tells you where to spend effort.",
        "The families are few and worth knowing cold. NUMERIC: scaling (needed by distance- and gradient-based models, irrelevant to trees), log or Box-Cox transforms for skew, binning, and clipping outliers. CATEGORICAL: one-hot for low cardinality, target/mean encoding for high cardinality (with the leakage caveat below), embeddings when a neural model is in play, and an explicit category for missing rather than silent imputation. TEMPORAL: differences between timestamps, cyclical encoding of hour/day/month via sine and cosine so 23:00 is adjacent to 01:00, and lag/rolling features for time series. INTERACTIONS: products, ratios, and group-level aggregates ('this transaction's amount divided by the user's 30-day median'), which is where domain knowledge pays best.",
        "The other half of the topic is PIPELINES, and it is not a software-hygiene footnote - it is a correctness requirement. Every transformation that LEARNS anything from data (a scaler's mean, an imputer's median, a target encoder's category means, a feature selector's choice) must be fitted inside the training fold only, or it leaks. Target encoding is the sharpest example: computed naively on the full training set, it embeds each row's own label into its feature and can produce a model that looks superb and predicts nothing. And a pipeline is also what makes training and serving compute features the SAME way - the mismatch between them, train/serve skew, is one of the most common causes of models that work offline and fail in production."
      ],
      "math": [
        {
          "h": "Cyclical encoding: why hour 23 must sit next to hour 0",
          "paras": [
            "Encoding an hour as the integer 0-23 tells the model that 23 and 0 are 23 units apart, when they are actually adjacent. Mapping the value onto a circle with a sine/cosine pair restores the true geometry - and you need BOTH components, because either alone is ambiguous (sin is equal at 1am and 11am)."
          ],
          "tex": "x_{\\sin} = \\sin\\!\\left(\\frac{2\\pi t}{T}\\right), \\qquad x_{\\cos} = \\cos\\!\\left(\\frac{2\\pi t}{T}\\right), \\qquad \\big\\lVert (x_{\\sin}, x_{\\cos}) \\big\\rVert = 1",
          "texNote": "T = the period (24 for hours, 7 for weekdays, 12 for months, 365 for day-of-year). The pair traces the unit circle, so Euclidean distance between two encoded times equals their true circular separation - which is exactly what a distance- or split-based model needs."
        },
        {
          "h": "Smoothed target encoding",
          "paras": [
            "Replacing a category with its mean target is powerful for high-cardinality features and dangerous for rare ones - a category seen once has a mean equal to that row's own label. Shrinking toward the global mean by a count-dependent weight fixes the variance problem; it does NOT fix the leakage problem, which needs out-of-fold computation."
          ],
          "tex": "\\hat{y}_c = \\frac{n_c \\bar{y}_c + m\\,\\bar{y}}{n_c + m}, \\qquad w_c = \\frac{n_c}{n_c + m}",
          "texNote": "n_c = rows in category c, ybar_c = its target mean, ybar = the global mean, m = smoothing strength (a prior count). Large n_c trusts the category; small n_c falls back to the global mean. Always compute the means OUT OF FOLD, or the encoding leaks the label."
        }
      ],
      "code": [
        {
          "h": "A pipeline that cannot leak",
          "paras": [
            "ColumnTransformer plus Pipeline is the structural fix, not a stylistic preference: every fitted statistic is recomputed inside each CV fold, and the same object is what you serialize for serving, so training and inference are guaranteed to transform identically."
          ],
          "code": "from sklearn.compose import ColumnTransformer\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.impute import SimpleImputer\nfrom sklearn.preprocessing import StandardScaler, OneHotEncoder\nfrom sklearn.ensemble import HistGradientBoostingClassifier\nfrom sklearn.model_selection import cross_val_score, StratifiedKFold\n\nnumeric = ['amount', 'account_age_days', 'n_prior_txns']\ncategorical = ['merchant_category', 'country', 'device_type']\n\npre = ColumnTransformer([\n    ('num', Pipeline([('imp', SimpleImputer(strategy='median')),\n                      ('sc',  StandardScaler())]), numeric),\n    ('cat', Pipeline([('imp', SimpleImputer(strategy='constant', fill_value='__MISSING__')),\n                      ('oh',  OneHotEncoder(handle_unknown='ignore',      # unseen at serving\n                                            min_frequency=20))]), categorical),\n], remainder='drop')                      # explicit: never silently pass columns through\n\nmodel = Pipeline([('pre', pre), ('clf', HistGradientBoostingClassifier())])\n\n# every statistic (medians, means/stds, category vocabularies) is refit PER FOLD\nscores = cross_val_score(model, X, y, cv=StratifiedKFold(5, shuffle=True, random_state=0))\nprint(f'{scores.mean():.3f} +/- {scores.std():.3f}')\n\nmodel.fit(X_train, y_train)\nimport joblib; joblib.dump(model, 'model.joblib')   # ONE artifact = no train/serve skew",
          "caption": "ColumnTransformer + Pipeline: per-column preprocessing whose learned statistics are refit inside every fold, handle_unknown='ignore' for categories unseen at serving, and a single serialized artifact so training and inference transform identically."
        },
        {
          "h": "Target encoding done wrong, then right",
          "paras": [
            "The most dangerous common feature transform. Naive target encoding embeds each row's own label; out-of-fold encoding removes the self-reference. The gap on a no-signal dataset is the whole lesson."
          ],
          "code": "import numpy as np, pandas as pd\nfrom sklearn.model_selection import KFold\n\n# high-cardinality category with NO relationship to the target\nrng = np.random.default_rng(0)\ndf = pd.DataFrame({'cat': rng.integers(0, 900, 3000)})     # ~3 rows per category\ny = pd.Series(rng.integers(0, 2, 3000))\n\n# WRONG: each row's own label is inside its category mean\ndf['te_leaky'] = df.groupby('cat')['cat'].transform(lambda s: y[s.index].mean())\nprint('leaky corr with y :', np.corrcoef(df.te_leaky, y)[0, 1].round(3))    # 0.577\n\n# RIGHT: compute each fold's encoding from the OTHER folds only, with smoothing\ndef oof_target_encode(cat, y, m=20, n_splits=5, seed=0):\n    out = np.full(len(cat), np.nan)\n    prior = y.mean()\n    for tr, va in KFold(n_splits, shuffle=True, random_state=seed).split(cat):\n        stats = y.iloc[tr].groupby(cat.iloc[tr]).agg(['sum', 'count'])\n        sm = (stats['sum'] + m * prior) / (stats['count'] + m)      # shrink to the prior\n        out[va] = cat.iloc[va].map(sm).fillna(prior).values\n    return out\n\ndf['te_oof'] = oof_target_encode(df.cat, y)\nprint('oof   corr with y :', np.corrcoef(df.te_oof, y)[0, 1].round(3))      # 0.013\n# 0.577 vs 0.013 on data with ZERO real signal - the leaky version would\n# dominate feature importance and produce a model that collapses in production.",
          "caption": "Naive target encoding on a no-signal categorical shows correlation 0.58 with the label because each row's own target is inside its category mean; out-of-fold encoding with smoothing gives 0.013. Always compute target statistics out of fold."
        }
      ],
      "useCases": [
        "Tabular problems generally - fraud, credit risk, churn, demand forecasting, ad response - where gradient-boosted trees on well-engineered features remain the state of the art and the feature work dominates the model choice.",
        "Any project with domain experts available: encoding their knowledge as ratios, aggregates, and interaction terms is the highest-bandwidth channel from expertise into the model, and it is usually faster than collecting more data.",
        "Production systems where the same transformations must run in training and serving: a single serialized pipeline (or a feature store with shared definitions) is what prevents train/serve skew, the most common cause of an offline/online performance gap.",
        "Deep learning preprocessing too, though the emphasis shifts: normalization, tokenization, and augmentation are learned-or-fixed transforms with exactly the same fold-discipline and train/serve requirements as tabular features."
      ],
      "pitfalls": [
        "Naive target encoding: computing category means on the full training set embeds each row's own label, which is severe for high-cardinality features - it can produce correlation with the target on data with no signal at all. Compute it out of fold, with smoothing toward the global mean.",
        "Fitting any transformer outside the fold: scalers, imputers, PCA, selectors, and encoders all learn statistics. Outside a Pipeline they leak, and the resulting CV score is optimistic in a way no later tuning can undo.",
        "Ignoring categories unseen at serving time: a one-hot encoder that errors (or silently produces a different column count) on a new category breaks inference. Set handle_unknown='ignore' and group rare categories with min_frequency.",
        "Imputing without an indicator: filling a missing value with the median discards the fact that it was missing, which is often predictive in itself (missingness is rarely random). Add a boolean was_missing column, or use a model that handles NaN natively.",
        "Treating identifiers as numbers: zip codes, product ids, and category codes have no ordinal meaning, so feeding them as integers invites nonsensical splits. And beware features that are proxies for the label or unavailable at prediction time - point-in-time correctness is a feature-engineering concern, not just a splitting one."
      ],
      "connections": [
        {
          "ref": "ml-theory/cross-validation",
          "text": "Pipelines exist because every learned transformation must be refit inside the fold - feature engineering is where most cross-validation leakage originates."
        },
        {
          "ref": "ml-applications/tabular-dl",
          "text": "The comparison between engineered features plus gradient boosting and end-to-end deep tabular models is exactly the question of how much of this work a model can learn for itself."
        },
        {
          "ref": "unsupervised-learning/pca",
          "text": "Dimensionality reduction is feature engineering done by an algorithm - useful when features are numerous and correlated, and it inherits the same fit-inside-the-fold rule."
        },
        {
          "ref": "mlops/project-structure",
          "text": "Shared feature definitions between training and serving (a pipeline artifact or a feature store) are the structural defence against train/serve skew."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Why does feature engineering matter if models are universal approximators?",
          "a": "A model can only combine what it is given. It cannot invent a ratio, subtract two timestamps, or know that a zip code is geography - encoding that structure is what turns raw records into learnable signal, especially on tabular data."
        },
        {
          "q": "Which models need feature scaling?",
          "a": "Distance-based (kNN, k-means, SVM with RBF) and gradient-based (linear models, neural nets) do. Tree-based models do not - they split on thresholds, so monotone rescaling changes nothing."
        },
        {
          "q": "How do you encode a cyclical feature like hour of day?",
          "a": "As a sine/cosine pair with period 24, so 23:00 sits adjacent to 01:00 on the unit circle. Both components are needed - either alone is ambiguous."
        },
        {
          "q": "What is one-hot encoding's weakness?",
          "a": "Cardinality: 10,000 categories become 10,000 sparse columns. Use target encoding, hashing, embeddings, or group rare levels together instead."
        },
        {
          "q": "What is target (mean) encoding?",
          "a": "Replace a category with the mean target for that category. Powerful for high cardinality - and leaky unless computed out of fold, since a rare category's mean is essentially the row's own label."
        },
        {
          "q": "What is smoothing in target encoding?",
          "a": "Shrink each category mean toward the global mean by weight n/(n+m), so rare categories fall back to the prior instead of trusting one or two observations."
        },
        {
          "q": "Why add a missingness indicator when imputing?",
          "a": "Missingness is rarely random and is often predictive in itself. Imputing without an indicator throws that signal away."
        },
        {
          "q": "What is train/serve skew?",
          "a": "Features computed differently (or unavailable, or stale) at inference than during training. A shared pipeline artifact or feature store prevents it; it is a top cause of offline/online gaps."
        },
        {
          "q": "What is point-in-time correctness?",
          "a": "Every feature must reflect only what was KNOWABLE at prediction time. A value timestamped with the event but recorded hours later is future information in disguise."
        },
        {
          "q": "Why is ColumnTransformer useful?",
          "a": "It applies different transformations to different column subsets while remaining a single fitted object - so preprocessing is refit per fold and serialized as one artifact."
        },
        {
          "q": "What does handle_unknown='ignore' do?",
          "a": "Makes a one-hot encoder emit all-zeros for a category not seen in training rather than raising - necessary because serving will encounter new categories."
        },
        {
          "q": "Do neural networks eliminate feature engineering?",
          "a": "On perceptual data (images, audio, text) largely yes - representation learning replaces it. On tabular data no: gradient-boosted trees on engineered features remain highly competitive."
        }
      ],
      "standard": [
        {
          "q": "Walk through the main families of feature engineering and when each applies.",
          "a": "The families are few, and knowing them as a checklist is what makes the work systematic rather than ad hoc. (1) NUMERIC TRANSFORMS. SCALING - standardization or min-max - is required by distance-based models (kNN, k-means, RBF SVM) and helps gradient-based ones converge; it is IRRELEVANT to trees, which split on thresholds and are invariant to any monotone rescaling. Knowing which models care is a common interview probe. SKEW CORRECTION - log, sqrt, Box-Cox, or Yeo-Johnson - for heavy-tailed variables like income or transaction amounts, which otherwise let a few extreme values dominate a linear model. BINNING converts a continuous variable into ordered buckets, which can capture non-monotone effects in a linear model (and is mostly unnecessary for trees, which bin implicitly). CLIPPING bounds outliers when they are measurement error rather than signal - and it is worth deciding which, because for fraud the outliers ARE the signal. (2) CATEGORICAL ENCODING. ONE-HOT for low cardinality (say under 50 levels). For HIGH cardinality: target/mean encoding (with out-of-fold computation and smoothing), hashing (fixed dimensionality, collisions accepted), frequency encoding, or learned EMBEDDINGS if a neural model is involved. ORDINAL encoding only when the categories genuinely have an order (small/medium/large), never for nominal ids. And always plan for categories UNSEEN at serving time. (3) TEMPORAL FEATURES. Differences between timestamps ('days since last purchase') are usually far more predictive than absolute times. CYCLICAL encoding (sine/cosine pairs) for hour, weekday, month, so the wraparound is represented correctly. For time series, LAGS and ROLLING aggregates (mean, std, min, max over trailing windows), which must respect point-in-time correctness. (4) INTERACTIONS AND AGGREGATES - where domain knowledge pays most. RATIOS ('amount / user's 30-day median amount', 'debt / income') encode relationships a tree would need many splits to approximate. GROUP AGGREGATES ('this merchant's average chargeback rate', 'this user's count of prior sessions') bring in context beyond the single row. Explicit PRODUCTS of two variables when you believe the effect is multiplicative. (5) TEXT AND HIGH-DIMENSIONAL: TF-IDF or embeddings; and dimensionality reduction (PCA) when features are numerous and correlated. HOW I DECIDE WHAT TO BUILD. Start from the DOMAIN QUESTION: what would a human expert look at to make this judgement? That usually names two or three ratios or aggregates directly, and those are worth more than a large automated search. Then look at the DATA: skewness suggests transforms, high cardinality suggests encoding choices, missingness patterns suggest indicators. Then MEASURE the value ladder - baseline, plus raw features, plus each engineered group - so you know what actually contributed rather than assuming. THE PART PEOPLE UNDERWEIGHT: most of the work is not inventing clever features, it is handling the mundane correctly - missingness, unseen categories, point-in-time correctness, and making sure the same code runs in training and serving. Clever features that leak or that cannot be computed at inference time are worth less than nothing, because they cost you a deployment.",
          "deepDive": {
            "q": "Explain target encoding in depth: why it is powerful, exactly how it leaks, and how to do it safely.",
            "a": "WHY IT IS POWERFUL. A high-cardinality categorical - merchant id, zip code, product sku, user id - can carry enormous signal, but one-hot encoding it produces thousands of sparse columns that a tree splits on inefficiently and a linear model overfits. Target encoding replaces the category with a single NUMERIC summary of its relationship to the label (typically the mean target for that category), compressing the information into one dense, immediately-usable column. On tabular competitions and industrial tabular problems it is frequently the single highest-value transform available. HOW IT LEAKS - two distinct mechanisms, and conflating them is a common error. (1) SELF-REFERENCE: if you compute a category's mean using ALL training rows including row i, then row i's own label is inside its own feature. For a category with 100 members this contributes 1% - a small distortion. For a category with ONE member, the feature IS the label, perfectly encoded. Since high-cardinality features are exactly the ones with many rare categories, the leak is worst precisely where the technique is most attractive. The empirical signature is stark: on a synthetic dataset where the category has NO relationship to the target, naive target encoding produces a feature correlating ~0.58 with the label, while an out-of-fold version gives ~0.01. A model trained on the leaky version will rank that feature as its most important and will collapse in production. (2) VALIDATION LEAKAGE: even if you avoid self-reference within training, computing the encoding using data from the validation fold contaminates your estimate - the ordinary fit-inside-the-fold rule. THE SAFE RECIPE, in layers. (a) OUT-OF-FOLD COMPUTATION: split the training data into folds; for each fold, compute category statistics from the OTHER folds only and apply them to this fold. Every row's encoding is then derived from data that excludes it. For the final model applied to test/serving data, use statistics computed on the entire training set (which is legitimate, since test rows contributed nothing). (b) SMOOTHING toward the prior: yhat_c = (n_c * ybar_c + m * ybar) / (n_c + m). This addresses the VARIANCE problem - a category with 2 observations should not be trusted as much as one with 2,000 - and m is a hyperparameter (a pseudo-count) worth tuning. Note that smoothing alone does NOT fix leakage; the two fixes are orthogonal and you need both. (c) NOISE INJECTION or LEAVE-ONE-OUT variants: some implementations subtract the row's own contribution (leave-one-out encoding) or add small Gaussian noise to break residual self-correlation. Leave-one-out is subtly dangerous on its own - it can create an inverse relationship a tree can exploit - so out-of-fold is the safer default. (d) HANDLE UNSEEN CATEGORIES at serving with the global prior. (e) For time series, compute the encoding only from the PAST, never from future rows of the same category. THE ALTERNATIVES worth knowing, since target encoding is not always the right answer: hashing (no leakage risk at all, fixed dimension, accepts collisions), frequency/count encoding (leak-free, often surprisingly strong), embeddings learned jointly with a neural model (no separate leakage path, learns the representation end-to-end), and CatBoost's ORDERED TARGET STATISTICS - a principled scheme that computes each row's encoding using only rows that came 'before' it in a random permutation, which is one of the reasons CatBoost handles categorical features so well out of the box. If I were advising someone starting out, I would say: use frequency encoding and one-hot first, reach for target encoding when cardinality demands it, and when you do, use a library implementation with out-of-fold computation rather than writing a groupby-mean yourself - because the groupby-mean version is the exact bug this whole answer is about."
          }
        },
        {
          "q": "Why are pipelines a correctness requirement rather than a style choice?",
          "a": "Three independent reasons, and each one is a real production failure mode. (1) THEY PREVENT LEAKAGE IN VALIDATION. Every transformation that learns a statistic - a scaler's mean and standard deviation, an imputer's median, PCA's components, a feature selector's chosen columns, a target encoder's category means, SMOTE's synthetic points - must be fitted on the training portion ONLY. Fitting before splitting means held-out data contributed to those statistics, and your cross-validation score becomes optimistic. The effect is not subtle: Hastie's classic construction shows feature selection performed outside the fold reporting 85% accuracy on data with literally zero signal, versus 52% (chance) when done inside. A Pipeline makes the correct behaviour automatic, because cross_val_score refits the whole pipeline per fold. Doing it manually requires you to be right every time; the pipeline requires you to be right once. (2) THEY ELIMINATE TRAIN/SERVE SKEW. If training preprocessing lives in a notebook and serving preprocessing is reimplemented in a service, the two WILL drift - a different imputation default, a different category ordering, a different scaling constant, a column added on one side only. The resulting bugs are miserable to find because nothing errors; the model just performs worse than expected. Serializing the entire pipeline as ONE artifact means the exact fitted transformations ship with the model and there is only one implementation. This is the same motivation behind feature stores at larger scale - shared feature definitions between training and serving. (3) THEY MAKE THE MODEL REPRODUCIBLE AND TUNABLE AS A UNIT. Hyperparameters of preprocessing steps (the imputation strategy, the number of PCA components, the target-encoding smoothing) can be searched jointly with model hyperparameters, which matters because they interact - the optimal regularization depends on how features were scaled. Outside a pipeline, this joint search is impossible to do correctly. And a single fitted object is a single thing to version, test, and roll back. THE SUBTLETIES worth mentioning to show depth. (a) NOT EVERYTHING BELONGS IN THE PIPELINE: transformations that do not learn from data (a log transform, a unit conversion, extracting hour-of-day from a timestamp) are deterministic and can live upstream safely - though putting them in the pipeline anyway keeps the artifact self-contained. The test is whether the transform has learned parameters. (b) RESAMPLING is special: SMOTE and undersampling must be applied to the training fold only and NOT to the validation fold - scikit-learn's Pipeline cannot express this, which is exactly why imbalanced-learn provides its own Pipeline class. Applying SMOTE before splitting is a well-known way to produce a fantastic and completely fake validation score. (c) STATEFUL FEATURES that depend on other rows (group aggregates, lags, target encoding) are the hardest case, because a row-wise transformer API does not naturally express them; these usually need custom transformers with careful fold-awareness, or a feature store that computes them point-in-time. THE FRAMING I would use: a pipeline is the executable statement of your assumption about what is learned from data and what is not. Writing it down makes the assumption checkable; leaving it implicit in notebook cell order makes it a bug waiting to happen - and it is the specific bug that produces models which validate at 0.92 and serve at 0.71."
        },
        {
          "q": "How do you handle missing data, and what are the trade-offs?",
          "a": "THE FIRST QUESTION IS WHY IT IS MISSING, because the mechanism determines what is safe. The standard taxonomy (Rubin): MCAR - missing completely at random, unrelated to anything (a sensor dropped a reading); MAR - missing at random, explainable by OTHER observed variables (income is missing more often for younger respondents, and you observe age); MNAR - missing not at random, where missingness depends on the unobserved value itself (high earners decline to report income). MCAR is benign and rare. MAR is the assumption most imputation methods require. MNAR is the dangerous case: no imputation method can recover the value, because the missingness itself carries information the data cannot supply, and any imputation will bias results in a direction you cannot easily bound. THE STRATEGIES. (1) SIMPLE IMPUTATION - mean/median for numeric (median for skewed), mode or an explicit '__MISSING__' category for categorical. Fast, robust, and the right default. Crucially: ALWAYS ADD A MISSINGNESS INDICATOR column. Missingness is rarely random and is frequently predictive - 'income not provided' may be one of your strongest features - and imputing without an indicator discards that signal entirely. This single practice recovers most of what naive imputation loses. (2) MODEL-BASED IMPUTATION - kNN imputation, or iterative/MICE approaches that regress each variable on the others. More accurate under MAR, more expensive, and they introduce their own uncertainty which is usually ignored (proper multiple imputation would propagate it, but in an ML pipeline people rarely do). Worth it when a key feature has substantial missingness and the relationships are strong. (3) NATIVE HANDLING - the option people forget. LightGBM, XGBoost, CatBoost, and HistGradientBoosting handle NaN directly, learning at each split which direction missing values should go. This is often BETTER than imputation because the model can use missingness differently in different regions of the feature space, and it requires no assumption about the mechanism. If you are using gradient boosting, 'do nothing' is frequently the best answer. (4) DELETION - dropping rows or columns. Dropping ROWS is fine under MCAR and biases the sample otherwise, and it is not available at serving time (you cannot refuse to score a request). Dropping COLUMNS is reasonable when missingness is extreme (say over 60-70%) and the feature is not critical. (5) DOMAIN-SPECIFIC ENCODING: sometimes 'missing' has a known meaning - a null 'last_purchase_date' means the customer has never purchased, which is a fact, not an absence, and should be encoded as such rather than imputed. Finding these is usually the highest-value part of the exercise. THE PIPELINE REQUIREMENTS: imputation statistics must be fitted on the training fold only (a median computed over all data leaks); the serving path must handle missingness identically; and you must handle features that are missing at SERVING time but were always present in training, which is a train/serve skew failure and a common production surprise. HOW I WOULD APPROACH IT ON A REAL DATASET: first tabulate missingness by column and look for structure (is it correlated with the target? with another column? with time?) - that tells you the mechanism. Then decide per column rather than globally, since different columns usually have different causes. Default to median/mode imputation plus indicators, or to native NaN handling if the model supports it, and reserve model-based imputation for the few columns where it matters. And report the missingness rates alongside your results, because a model trained on 40%-imputed data has a fragility that a single accuracy number does not communicate."
        },
        {
          "q": "How would you demonstrate that feature engineering was worth the effort?",
          "a": "By building a VALUE LADDER - an ordered sequence of models where each rung adds one thing and the improvement is attributed to it. This is both the honest way to know and the most persuasive thing to put in a report. THE LADDER. (1) A TRIVIAL BASELINE: majority class, or the global mean for regression. This calibrates what 'zero skill' looks like on your metric and is surprisingly often close to what a mediocre model achieves. (2) RAW FEATURES, simplest model: whatever columns exist, minimal preprocessing, logistic regression or a default gradient-boosted tree. This is the 'what does the data give you for free' rung. (3) BASIC PREPROCESSING: correct types, imputation with indicators, sensible categorical encoding, scaling if needed. Often a large jump, and it is not glamorous work. (4) DOMAIN FEATURES, added in GROUPS with a measurement after each: temporal differences, then ratios, then group aggregates. Grouping is important - adding forty features at once tells you nothing about which mattered. (5) MODEL TUNING: only now, so you can see how it compares to the feature work. THE RESULT THIS TYPICALLY SHOWS, and the reason the exercise is worth doing: on tabular problems the ladder is usually dominated by rungs 3 and 4, with tuning contributing very little at the end. A representative pattern from a controlled simulation with a planted interaction: majority baseline 0.540, raw logistic regression 0.612 (+0.072), ONE engineered interaction feature 0.718 (+0.106), then twenty-fold more tuning compute +0.000. When the ladder looks like that, it is direct evidence about where to spend the next week - and it is far more convincing to a stakeholder than 'feature engineering is important'. HOW TO MAKE THE ATTRIBUTION HONEST. (a) Use the SAME cross-validation folds at every rung, and compare paired per-fold differences rather than two means. (b) Report a confidence interval or fold spread on each increment - an increment smaller than the fold noise is not a result. (c) Beware ORDER EFFECTS: features added later look less valuable because earlier ones already captured the signal, so if two feature groups are correlated the ladder under-credits the second. If the ordering matters for the decision, test groups independently (each added to the base) as well as cumulatively. (d) Do the whole ladder inside a pipeline so that no rung leaks; a leaky rung will show a spectacular fake improvement. ADDITIONAL EVIDENCE beyond the ladder: ABLATION (remove one feature group from the full model and measure the drop) is the complement to addition and is more relevant when you want to know what you could safely delete; PERMUTATION IMPORTANCE on the held-out set tells you which features the final model actually relies on (with the caveat that correlated features share credit and can both look unimportant); and SLICE analysis showing that the new features specifically fixed the segment they were designed for is the most convincing evidence of all, because it confirms the mechanism rather than just the aggregate. WHAT I WOULD PUT IN THE WRITE-UP: the ladder as a table with per-rung deltas and CIs, one sentence on what each feature group encodes and why the domain suggests it, the ablation for the final model, and an explicit statement of what did NOT help. That last item matters - reporting the tuning rung as +0.000 is what makes the rest of the numbers credible."
        },
        {
          "q": "Do deep learning models make feature engineering obsolete?",
          "a": "On perceptual data largely yes; on tabular data no - and the reason for the difference is the interesting part. WHERE REPRESENTATION LEARNING WON. For images, audio, and text, hand-designed features (SIFT, HOG, MFCCs, n-gram templates) were comprehensively replaced by learned representations, and nobody engineers features for those modalities now. Why: (a) the raw data has strong local structure that a suitable architecture can exploit (convolution's locality and weight sharing, attention's content-based routing), so the right INDUCTIVE BIAS substitutes for hand-crafted features; (b) there is abundant data, and learned features scale with it while hand-crafted ones do not; (c) humans are bad at articulating what makes an image a cat - the knowledge is perceptual and not introspectable, so there was little to encode. WHERE IT DID NOT. On tabular data, gradient-boosted trees on engineered features remain highly competitive with and often better than deep tabular models - this has been tested repeatedly (Grinsztajn et al., 2022, 'Why do tree-based models still outperform deep learning on tabular data?' is the standard reference). The reasons are structural: (a) tabular features are HETEROGENEOUS and already semantic - each column means something specific, unlike pixels - so there is no low-level structure for a network to discover; (b) there is no natural invariance to exploit (permuting columns changes nothing semantically, so the convolutional/attention priors do not apply); (c) datasets are usually far smaller, favouring lower-variance methods; (d) trees handle mixed types, missing values, and irregular/non-smooth target functions natively, while neural networks are biased toward smooth functions; and (e) crucially, the DOMAIN KNOWLEDGE is articulable here - a human CAN say 'debt-to-income ratio matters' - so there is real information to inject that the data alone would need many examples to discover. WHAT CHANGES RATHER THAN DISAPPEARS, even in deep learning. Preprocessing does not vanish: normalization, tokenization choices, augmentation policy, and the handling of missing or unseen values are all feature-engineering decisions with the same fold-discipline and train/serve requirements. Tokenizer design in NLP is feature engineering by another name, and it materially affects model behaviour. Multimodal and structured inputs still need careful encoding of how the pieces are combined. And embeddings for high-cardinality categoricals in a neural tabular model are a learned version of the same choice target encoding addresses. THE HONEST SYNTHESIS I would offer: feature engineering is the injection of prior knowledge, and its value is highest when data is limited and knowledge is articulable, lowest when data is abundant and the structure is perceptual. That is the same trade-off as architectural inductive bias generally - CNNs versus ViTs, structure versus scale - which is a satisfying connection to draw. So the practical advice is: for images/audio/text, use pretrained representations and spend your effort on data and fine-tuning; for tabular problems, spend your effort on features and use gradient boosting; and in both cases, treat preprocessing as a correctness-critical part of the system rather than a preliminary."
        },
        {
          "q": "What would you check before trusting a feature that looks extremely predictive?",
          "a": "Extremely high individual predictive power is a RED FLAG before it is good news, and I would run through a specific checklist. (1) IS IT A PROXY FOR THE LABEL? The most common cause. Features created downstream of the outcome - 'number_of_fraud_investigations' when predicting fraud, 'discharge_disposition' when predicting mortality, a field populated only for positive cases - encode the answer. Diagnostic: trace the feature's PROVENANCE. Who writes this field, when, and as a result of what process? If the answer is 'after the event we are predicting', it is leakage. (2) IS IT POINT-IN-TIME CORRECT? A value may be legitimately related to the outcome but only KNOWABLE later - a settled transaction amount, a confirmed diagnosis code, a revised financial statistic, an updated address. The database timestamps it with the event, so it looks available; in production it is not. Diagnostic: for a sample of rows, ask what the value of this field WAS at prediction time versus what it is now. This is the single most common cause of the offline/online gap in production ML, and it requires understanding the data pipeline rather than the data. (3) IS IT AN IDENTIFIER IN DISGUISE? Row ids, timestamps of insertion, sequence numbers, or file paths often correlate with the label because of how the dataset was ASSEMBLED (positives collected in one batch, negatives in another). Diagnostic: check whether the feature separates the classes suspiciously cleanly and whether it has any semantic meaning at all. Sorting artifacts are a classic. (4) DOES IT SURVIVE A GROUPED SPLIT? If the feature encodes entity identity (patient, user, device), it will look powerful under random splitting and collapse under GroupKFold. Diagnostic: compare the feature's importance and the model's score under both splitters. (5) IS IT AVAILABLE AT SERVING, FOR EVERY REQUEST? A feature computed from a batch job that runs nightly is stale or missing for a real-time request; a feature requiring a join to a table the serving path cannot reach is unusable. Diagnostic: walk the serving code path explicitly. (6) DOES IT MAKE DOMAIN SENSE? Ask an expert why this would predict the outcome. If nobody can articulate a mechanism, be suspicious. A plausible mechanism is not proof, but the absence of one is a strong signal. (7) IS IT STABLE OVER TIME? Plot the feature's distribution and its relationship to the target by month. A feature whose predictive power appears suddenly usually reflects a process or logging change, not a real effect. THE CHEAPEST DIAGNOSTIC OF ALL, which I would run first: train the model WITHOUT the feature. If performance collapses to near-baseline, the model is doing nothing but reading that feature, which is characteristic of leakage. And conversely, if the model is fine without it, the feature may not be worth the operational risk of depending on it. THE POSTURE I would recommend and would want to hear from a candidate: treat a surprisingly good result as a bug report until proven otherwise. In my experience the base rate of 'suspiciously predictive feature turns out to be leakage' is high enough that the expected value of a two-hour investigation is very good - and the alternative is discovering it after deployment, which costs far more than two hours."
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "Why feature engineering matters",
        "back": "A model can only combine what it is given - it cannot invent a ratio, subtract two timestamps, or know a zip code is geography. On tabular data one good interaction feature routinely beats extensive hyperparameter tuning."
      },
      {
        "type": "formula",
        "front": "Cyclical encoding",
        "back": "sin(2*pi*t/T) AND cos(2*pi*t/T). Encoding hour as 0-23 says 23 and 0 are far apart; the sine/cosine pair puts them adjacent on the unit circle. Both components needed - either alone is ambiguous."
      },
      {
        "type": "formula",
        "front": "Smoothed target encoding",
        "back": "yhat_c = (n_c*ybar_c + m*ybar)/(n_c + m). Shrinks rare categories toward the global mean. Fixes VARIANCE - it does NOT fix leakage, which needs out-of-fold computation."
      },
      {
        "type": "pitfall",
        "front": "Naive target encoding leaks the label",
        "back": "A category's mean computed on all training rows contains that row's own label - and for a category of size 1 the feature IS the label. On a no-signal dataset: correlation 0.58 naive vs 0.01 out-of-fold."
      },
      {
        "type": "definition",
        "front": "Which models need scaling?",
        "back": "Distance-based (kNN, k-means, RBF SVM) and gradient-based (linear, neural) yes. Trees NO - they split on thresholds and are invariant to monotone rescaling."
      },
      {
        "type": "pitfall",
        "front": "Impute WITH an indicator",
        "back": "Missingness is rarely random and is often predictive in itself. Median-imputing without a was_missing column discards that signal. Or use a model with native NaN handling (LightGBM/XGBoost/CatBoost)."
      },
      {
        "type": "definition",
        "front": "MCAR / MAR / MNAR",
        "back": "MCAR: unrelated to anything (benign, rare). MAR: explained by other OBSERVED variables (what imputation assumes). MNAR: depends on the unobserved value itself - no imputation can recover it."
      },
      {
        "type": "intuition",
        "front": "Pipelines are correctness, not style",
        "back": "(1) Every learned statistic refits per fold, so no leakage. (2) One serialized artifact = no train/serve skew. (3) Preprocessing hyperparameters can be searched jointly with the model's."
      },
      {
        "type": "pitfall",
        "front": "SMOTE needs a special pipeline",
        "back": "Resampling must apply to the TRAIN fold only, never the validation fold - sklearn's Pipeline cannot express this, which is why imbalanced-learn ships its own. SMOTE before splitting gives a fantastic fake score."
      },
      {
        "type": "pitfall",
        "front": "A suspiciously predictive feature",
        "back": "Check: is it a downstream proxy for the label? Point-in-time knowable? An identifier in disguise? Does it survive GroupKFold? Available at serving? Does a domain expert have a mechanism? Treat surprising results as bug reports."
      }
    ],
    "refs": [
      {
        "title": "Kuhn & Johnson, Feature Engineering and Selection (free online)",
        "url": "http://www.feat.engineering/"
      },
      {
        "title": "Grinsztajn, Oyallon & Varoquaux (2022), Why do tree-based models still outperform deep learning on tabular data?",
        "url": "https://arxiv.org/abs/2207.08815"
      },
      {
        "title": "Prokhorenkova et al. (2018), CatBoost: unbiased boosting with categorical features (ordered target statistics)",
        "url": "https://arxiv.org/abs/1706.09516"
      },
      {
        "title": "scikit-learn User Guide, Pipelines and composite estimators",
        "url": "https://scikit-learn.org/stable/modules/compose.html"
      }
    ],
    "demos": [
      "pca",
      "embeddings",
      "regression"
    ]
  }
};
