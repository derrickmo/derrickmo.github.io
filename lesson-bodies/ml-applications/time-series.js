// GENERATED from content/lessons/ml-applications/time-series.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/ml-applications/time-series/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "time-series": {
    "level": "core",
    "body": {
      "intuition": [
        "Forecasting is the domain where the structure is most obvious and most often violated. Time gives you ordering, seasonality and autocorrelation to exploit; it also means rows are not exchangeable, so every default in the standard toolkit - random k-fold, fitting a scaler on the full series, a centred rolling window - is wrong in a way that produces a better number.",
        "The first thing to establish is the baseline, because forecasting is the field with the most published models that do not beat last-value. On a trend-plus-seasonal series, a lag model scored RMSE 0.2148 on an honest forward split against 0.3115 for predicting the previous value - a genuine 31% improvement. Quote both numbers or the first one means nothing.",
        "And the leak is subtler than the split. On a pure random walk, random k-fold and forward chaining agreed almost exactly, 0.9994 against 0.9972, because a leak needs a FEATURE that carries information across the boundary. Add one centred rolling mean - a window spanning the future rather than trailing - and forward chaining reports 1.4930 against a naive 0.9961, revealing a feature that makes the model 50% WORSE out of sample while the random split says it is harmless."
      ],
      "math": [
        {
          "h": "The baselines that must be beaten",
          "paras": [
            "Each is one line and each is genuinely hard to beat on the series it suits. A forecasting result without one of these alongside it is not a result.",
            "The seasonal naive baseline in particular is the one that eliminates most published gains on seasonal data."
          ],
          "tex": "\\hat{y}_{t+1}=y_t \\ \\text{(naive)}, \\qquad \\hat{y}_{t+h}=y_{t+h-m} \\ \\text{(seasonal naive, period } m), \\qquad \\hat{y}_{t+1}=\\bar{y} \\ \\text{(mean)}",
          "texNote": "Measured on a trend-plus-seasonal series: naive last-value RMSE 0.3115, and a lag-feature ridge model 0.2148 on a forward split - a 31.1% improvement, which is a real result precisely because the baseline is stated."
        },
        {
          "h": "★ The split gap, and why it is sometimes zero",
          "paras": [
            "Random k-fold is optimistic when a feature spans the boundary and honest when nothing does. The gap is a property of the FEATURES, not of the split alone, which is why 'I used a temporal split' is necessary and not sufficient.",
            "Pure random walk, lag features only, nothing crossing the boundary."
          ],
          "tex": "\\text{random walk, lags only}: \\ \\text{k-fold } 0.9994 \\ \\text{vs forward } 0.9972 \\ \\text{vs naive } 0.9961 \\quad \\text{(no gap)}",
          "texNote": "A useful negative result: the leak is not automatic. It requires a feature computed from information the model will not have at prediction time, and lag features by construction do not qualify."
        },
        {
          "h": "★ One centred window is enough",
          "paras": [
            "A rolling mean with a centred window uses values from after the timestamp. It is a one-character difference in most APIs and it inverts the conclusion."
          ],
          "tex": "\\text{+ centred rolling mean}: \\ \\text{k-fold } 0.9947 \\ (\\approx \\text{naive}) \\quad \\text{vs} \\quad \\text{forward } \\mathbf{1.4930} \\ (\\mathbf{50\\%\\ worse\\ than\\ naive})",
          "texNote": "Note the direction: the random split does not manufacture a gain here, it HIDES a harm. The feature is actively damaging out of sample and only the honest split shows it, which is the more dangerous version of the failure."
        }
      ],
      "code": [
        {
          "h": "The validation scheme, and the two things it must respect",
          "paras": [
            "Forward chaining, plus a gap when the forecast horizon exceeds one step."
          ],
          "code": "# FORWARD CHAINING (expanding or rolling origin)\n#   train [0:t)          test [t:t+h)\n#   train [0:t+h)        test [t+h:t+2h)   ...\n#   report the mean and SPREAD across folds - a single fold is one sample\n\n# ★ THE GAP nobody inserts: if you forecast h steps ahead, the last h\n#   training points overlap the test window's information horizon. Leave\n#   an h-step gap between train and test, or you are training on data\n#   that would not exist when the forecast is made.\n\n# ALSO WRONG BY DEFAULT\n#   * fitting a scaler / imputer on the full series      -> refit per fold\n#   * a CENTRED rolling window                           -> use trailing\n#   * interpolating missing values across the split      -> forward-fill only\n#   * de-seasonalizing with parameters from all the data -> estimate on train\n\n# Each is a one-line default that spans the boundary.",
          "caption": "Every item is a library default that is correct for cross-sectional data and wrong here, which is why the domain needs its own checklist rather than general care."
        },
        {
          "h": "What to reach for, in order",
          "paras": [
            "The honest ordering by return on effort, which is close to the reverse of the order these get attention."
          ],
          "code": "# 1 BASELINES              naive, seasonal naive, mean. Free, and they end\n#                          a surprising number of projects.\n# 2 CLASSICAL              ETS / ARIMA / Theta. Strong on short univariate\n#                          series, well-calibrated intervals, few knobs.\n# 3 GBDT ON LAG FEATURES   the workhorse for many related series. Handles\n#                          covariates and calendar effects naturally.\n#                          ★ lags, rolling stats (TRAILING), calendar,\n#                            holiday flags, and the series ID itself\n# 4 GLOBAL NEURAL MODELS   one model across many series - N-BEATS, DeepAR,\n#                          temporal fusion. Wins when series are numerous\n#                          and individually short, which is the common case.\n\n# ★ The M-competitions' repeated finding: simple statistical methods and\n#   ENSEMBLES of them are extremely hard to beat, and the winning entries\n#   are usually combinations rather than a single clever model.",
          "caption": "The ordering matters because effort spent on step 4 before step 1 is how a forecasting project produces a model that loses to last-value."
        }
      ],
      "useCases": [
        "Demand, capacity and traffic forecasting, where the decision is a quantity to provision and the loss is asymmetric between over and under.",
        "Anomaly detection built on a forecast residual, where the forecast defines what normal looks like and the residual defines the alarm.",
        "Any panel of related series - stores, SKUs, regions, users - where a global model across series beats per-series fitting because each series is short.",
        "Capacity planning against a quantile rather than a mean, which is what most operational forecasts are actually for."
      ],
      "pitfalls": [
        "Reporting a forecast metric with no baseline. A lag model at RMSE 0.2148 is only a result next to the naive 0.3115 it beat by 31.1%.",
        "Random k-fold on a time series. It is optimistic whenever any feature spans the boundary, and the gap is a property of the features rather than of the split alone.",
        "A centred rolling window. One character in most APIs, and it took forward-chained RMSE to 1.4930 against a naive 0.9961 - a feature that actively harms, hidden entirely by the random split.",
        "Fitting scalers, imputers or de-seasonalizing parameters on the full series. Each is an aggregate spanning the split, which is the same leak as any other pre-split statistic.",
        "Omitting the gap between train and test when forecasting h steps ahead. The last h training points carry information the forecast would not have.",
        "Reporting a single fold. Forward chaining gives several origins, and the spread across them is the number that says whether the improvement is real.",
        "Optimizing the mean when the decision needs a quantile. Provisioning to a mean forecast is wrong whenever the cost of under- and over-provisioning differ, which is nearly always."
      ],
      "connections": [
        {
          "ref": "ml-theory/cross-validation",
          "text": "The general scheme this specializes, and the reason the unit of splitting has to match the unit of generalization."
        },
        {
          "ref": "causal-inference/time-series-causality",
          "text": "The causal counterpart - Granger's predictive precedence is not causation, and a common driver at staggered lags manufactures the pattern."
        },
        {
          "ref": "unsupervised-learning/anomaly-detection",
          "text": "The most common downstream use, where the forecast defines normal and the residual defines the alarm."
        },
        {
          "ref": "trustworthy-ai/conformal-prediction",
          "text": "Distribution-free prediction intervals for forecasts, and the exchangeability caveat that time series violate by construction."
        },
        {
          "ref": "ml-applications/multi-task",
          "text": "Global models across a panel of series, which is multi-task learning with the series as the task."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Name the baselines a forecast must beat.",
          "a": "Naive (ŷ = y_t), seasonal naive (ŷ = y_{t+h−m}), and the mean. A forecasting metric without one alongside it is not a result."
        },
        {
          "q": "Give the measured improvement.",
          "a": "Trend-plus-seasonal series: lag-feature ridge RMSE **0.2148** on a forward split against a naive **0.3115** — a genuine 31.1% gain, meaningful because the baseline is stated."
        },
        {
          "q": "Why not random k-fold?",
          "a": "Rows are not exchangeable. It lets future values train a model evaluated on the past — information the forecast will never have."
        },
        {
          "q": "★ When is the k-fold gap zero?",
          "a": "When no feature spans the boundary. On a random walk with lag features only: k-fold 0.9994 vs forward 0.9972 vs naive 0.9961 — no gap. The leak needs a FEATURE, not just a split."
        },
        {
          "q": "★ What does one centred rolling window do?",
          "a": "k-fold 0.9947 (≈ naive) but forward chaining **1.4930** — 50% WORSE than naive. The random split HIDES a harm rather than manufacturing a gain."
        },
        {
          "q": "Name four defaults that are wrong here.",
          "a": "Fitting a scaler/imputer on the full series · centred rolling windows · interpolating across the split · de-seasonalizing with parameters from all the data."
        },
        {
          "q": "What is forward chaining?",
          "a": "Train [0:t), test [t:t+h); then train [0:t+h), test [t+h:t+2h); expanding or rolling origin. Report the mean AND spread across folds."
        },
        {
          "q": "Why insert a gap between train and test?",
          "a": "If you forecast h steps ahead, the last h training points carry information the forecast wouldn't have. Leave an h-step gap."
        },
        {
          "q": "What's the M-competition finding?",
          "a": "Simple statistical methods and ENSEMBLES of them are extremely hard to beat, and winning entries are usually combinations rather than one clever model."
        },
        {
          "q": "When does a global neural model win?",
          "a": "Many related series that are individually short — the common case. One model across the panel beats per-series fitting."
        },
        {
          "q": "Mean or quantile?",
          "a": "Quantile, whenever the costs of over- and under-provisioning differ — which is nearly always for operational forecasts."
        },
        {
          "q": "Why report several folds?",
          "a": "A single origin is one sample. The spread across forward-chained folds is what says whether the improvement is real."
        }
      ],
      "standard": [
        {
          "q": "How do you validate a forecasting model?",
          "a": "FORWARD CHAINING, WITH A GAP, REPORTED ACROSS SEVERAL ORIGINS. Train on [0, t), test on [t, t+h); then expand or roll the origin and repeat. THE GAP IS THE PART PEOPLE OMIT: if the forecast horizon is h steps, the last h training points carry information that would not exist at the moment the forecast is made, so train and test need an h-step separation. And a single fold is a single sample — the spread across origins is what tells you whether an improvement is real, and forecasting metrics are noisy enough that a one-fold comparison routinely reverses. THE DEEPER POINT IS THAT THE SPLIT ALONE IS NOT THE PROTECTION. I measured a random walk with lag features only, and random k-fold and forward chaining agreed almost exactly — 0.9994 against 0.9972, with naive at 0.9961. No gap at all, because a leak requires a FEATURE that carries information across the boundary and lag features by construction do not. THEN ADDING ONE CENTRED ROLLING MEAN, a window spanning the future rather than trailing, forward chaining reported 1.4930 against the naive 0.9961 — the feature makes the model 50% worse out of sample, and the random split reported it as harmless at 0.9947.",
          "deepDive": {
            "q": "Why is that direction the more dangerous one?",
            "a": "That direction is worth dwelling on because it is the more dangerous version of leakage. The familiar story is that a leak manufactures a gain you cannot reproduce; here the random split HID a harm. A feature that is actively damaging out of sample looked neutral, so a practitioner using k-fold would have kept it and shipped a model worse than last-value. The general lesson is that the random split does not systematically inflate — it makes the estimate uninformative, and which direction the error goes depends on the feature. The checklist that follows is mechanical: every transformation with a window must be trailing; every fitted parameter — scaler, imputer, de-seasonalizer, target encoder — must be estimated inside the training fold and applied to the test fold, not fitted once on the series; and interpolation of missing values must be forward-fill rather than any method that looks ahead. Each is a one-line default that is correct for cross-sectional data and wrong here, which is why time series need their own checklist rather than general carefulness."
          }
        },
        {
          "q": "What would you try first on a new forecasting problem?",
          "a": "BASELINES, AND I WOULD NOT SKIP THEM EVEN UNDER TIME PRESSURE, because forecasting is the field with the largest gap between published gains and gains over last-value. Naive, seasonal naive at the dominant period, and the mean — three lines, and they end a surprising number of projects by revealing that the series is close to a random walk and nothing will beat persistence. THEN CLASSICAL METHODS: ETS, ARIMA or Theta, which are strong on short univariate series, produce well-calibrated intervals, and have few knobs to overfit. THEN GBDT ON LAG FEATURES, which is the workhorse when there are covariates, calendar effects and many related series — lags, TRAILING rolling statistics, calendar and holiday flags, and the series identifier itself, which lets one model specialize across a panel. THEN GLOBAL NEURAL MODELS such as N-BEATS, DeepAR or temporal fusion transformers, which win when series are numerous and individually short, since each series alone has too little data and the panel together has plenty. THE ORDERING MATTERS because effort spent at step four before step one is exactly how a project produces a model that loses to last-value with a good-looking validation number.",
          "deepDive": {
            "q": "What is the empirical backbone for that ordering?",
            "a": "The M-competitions are the empirical backbone of that ordering and worth citing accurately: across M3, M4 and M5 the repeated finding is that simple statistical methods are extremely hard to beat, that ENSEMBLES of simple methods beat individual sophisticated ones, and that the winning entries have generally been combinations. M4's winner was a hybrid of exponential smoothing and a recurrent network, and M5 was dominated by gradient-boosted trees on engineered features. That is not an argument against neural forecasting — it is an argument for the ordering, since the neural methods win in a specific regime (many short related series with covariates) and lose outside it. The practical consequence is to establish where you are before choosing: count the series, count the observations per series, and check whether there are exogenous covariates worth conditioning on. Those three numbers determine the method more reliably than any benchmark leaderboard, which is the same 'do the arithmetic first' discipline as the design lessons."
          }
        },
        {
          "q": "Your forecast has good RMSE but operations complain. What is likely wrong?",
          "a": "YOU OPTIMIZED THE MEAN AND THEY NEED A QUANTILE. Almost every operational forecast feeds a provisioning decision — inventory, staffing, capacity, budget — where the cost of under-forecasting differs from the cost of over-forecasting, often by a large factor. Minimizing squared error targets the conditional mean, and the optimal provisioning level is the quantile at C_under/(C_under + C_over), which for a 5-to-1 cost asymmetry is the 83rd percentile rather than the 50th. So a model with excellent RMSE can stock out constantly and be exactly as designed. THE FIX IS PINBALL LOSS at the required quantile, or a distributional forecast from which any quantile can be read — and that reframes the deliverable from a number to a distribution, which is usually what the downstream system wanted anyway. THE SECOND COMMON COMPLAINT is that the metric is aggregate and the pain is concentrated: RMSE over a thousand SKUs is dominated by the high-volume ones, while the operational damage lives in the intermittent ones where the series is mostly zeros and RMSE is nearly meaningless. Slice by volume band, and use a metric appropriate for intermittent demand rather than one that is dominated by scale.",
          "deepDive": {
            "q": "How do the standard metrics misbehave?",
            "a": "The metric choice deserves more attention than it usually gets because the standard ones misbehave in specific, known ways. MAPE is undefined at zero and asymmetric — it penalizes over-forecasting more than under-forecasting — which silently biases models toward under-forecasting on exactly the intermittent series where that hurts most. sMAPE fixes the asymmetry partially and remains unstable near zero. MASE, scaling error by the in-sample naive error, is scale-free and well-behaved and is the M-competition default for good reason. For intermittent demand, aggregate error over a period is more meaningful than per-period error. The general habit is the one from the trustworthy-AI module: state what the metric is an average over and check whether that population matches the decision, because a forecast metric aggregated over a heterogeneous panel is a weighted average dominated by the largest series, and the operational failures are usually elsewhere."
          }
        },
        {
          "q": "How do you produce prediction intervals you can trust?",
          "a": "THREE OPTIONS WITH DIFFERENT ASSUMPTIONS, AND ALL OF THEM NEED CHECKING AGAINST REALIZED COVERAGE. CLASSICAL MODELS give analytic intervals from their error model — ETS and ARIMA both do — and those intervals are well-calibrated when the model's assumptions hold and systematically too narrow when they do not, because they account for parameter and innovation uncertainty but not for model misspecification. QUANTILE REGRESSION targets the quantiles directly with pinball loss, which makes no distributional assumption and gives you exactly the levels you asked for, at the cost of fitting one model per quantile or a model with a quantile output head. CONFORMAL METHODS give a distribution-free coverage guarantee, and this is where the module's caveat bites hardest: conformal assumes exchangeability, and a time series violates it by construction. The adaptations — blocked or weighted conformal, and adaptive conformal that updates the level from observed miscoverage — restore something usable and are not free. WHATEVER YOU USE, MEASURE REALIZED COVERAGE on forward-chained folds: if your 90% intervals cover 72% of the time, that is the number that matters and no derivation overrides it.",
          "deepDive": {
            "q": "Why automate the coverage check specifically?",
            "a": "The coverage check is worth automating because interval calibration decays faster than point accuracy and is invisible in RMSE. In practice the most common failure is intervals that are far too narrow at long horizons, because uncertainty compounds with the horizon and many implementations propagate it incorrectly or not at all — so the h=1 interval is fine and the h=12 interval is fiction. Reporting coverage BY HORIZON rather than pooled is the diagnostic, and it is one groupby. The second common failure is that intervals are conditioned on the model being right about the regime, so they widen appropriately for noise and not at all for a structural break — which is the distribution-shift problem from module 24, and the honest response is the same: no unlabelled statistic anticipates a regime change, so you monitor realized coverage continuously and treat a sustained drop as the alarm rather than trying to predict the break."
          }
        },
        {
          "q": "When is a time series problem not a forecasting problem?",
          "a": "MORE OFTEN THAN THE FRAMING SUGGESTS, AND MISCLASSIFYING IT IS EXPENSIVE. If the question is 'what will happen', it is forecasting. If the question is 'what happens if we DO something' — change a price, run a campaign, add capacity — that is a causal question, and a forecasting model answers it only under an assumption it cannot check. Module 23's material applies directly: Granger causality reported F = 2119.66 with p = 1.1e-16 between two series with NO causal arrow between them, because a hidden common driver at staggered lags manufactures predictive precedence. So a model that forecasts well is not evidence about an intervention. IF THE QUESTION IS 'IS THIS NORMAL', that is anomaly detection, and a forecast is a component rather than the answer — the residual defines the alarm and the threshold comes from a cost ratio, not from a round number of standard deviations. IF THE QUESTION IS 'WHAT DROVE THIS CHANGE', that is decomposition or attribution, and the honest tools are difference-in-differences or synthetic control with their untestable assumptions stated. THE HABIT IS TO ASK WHAT DECISION THE NUMBER FEEDS before choosing the model, because all four questions look identical when the input is a series.",
          "deepDive": {
            "q": "Which case causes the real damage?",
            "a": "The intervention case is the one that causes real damage because it is so easy to answer badly with a good model. A demand forecast trained on historical data where price moved for business reasons will happily report the association between price and demand, and using it to choose a price is exactly the confounded-observational-estimate problem — the historical price changes were not random, so the elasticity it implies is a mixture of the causal effect and whatever drove the pricing decisions. The correct instruments are a randomized price test, a staggered rollout with a synthetic control, or an explicit causal model with the assumption stated. Saying that in an applied setting is often unwelcome and is the difference between a forecast that informs a decision and one that launders a correlation into a policy. The tell to watch for is a stakeholder asking a forecasting model a 'what if' question, which happens constantly and is usually answered without anyone noticing the frame changed."
          }
        },
        {
          "q": "How does this lesson instantiate the module's theme?",
          "a": "TIME IS THE CLEAREST CASE OF THE STRUCTURE BEING BOTH THE PRIOR AND THE TRAP. Ordering, autocorrelation and seasonality are exactly what makes a series forecastable — without them the best you can do is the mean — and they are exactly what makes rows non-exchangeable, so every validation default built for cross-sectional data is wrong here. The same property you exploit is the property that breaks the evaluation. WHAT THIS LESSON ADDS TO THE MODULE'S SPINE is that the split is only half the surface. On a random walk with lag features, random k-fold and forward chaining agreed to within 0.002, because nothing crossed the boundary; add one centred rolling window and forward chaining revealed a feature 50% worse than naive that k-fold called harmless. SO THE QUESTION IS NOT 'DID I SPLIT CORRECTLY' BUT 'DOES ANY FEATURE, TRANSFORMATION OR FITTED PARAMETER CROSS THE BOUNDARY', and the answer is a checklist rather than a single decision. That generalizes to every remaining domain in the module — the boundary is different, and the question is identical.",
          "deepDive": {
            "q": "What is the general form the remaining lessons will instantiate?",
            "a": "It is worth stating the general form once, since the remaining lessons will each instantiate it. Validation estimates generalization by holding out data that stands in for the future or for unseen units, and that estimate is valid only if the held-out data is genuinely independent of the training data in the way deployment will be. Every domain has a dependency structure — time here, edges in graphs, speakers in audio, patients in medical data, queries in search, users in recommenders — and the dependency has TWO channels: the split, which decides which rows are held out, and the FEATURES, which decide what information those rows carry. Practitioners attend to the first and forget the second, which is why leakage survives correct splits so reliably. The one-sentence habit worth carrying: name the unit of generalization, split on it, and then check that no computed quantity was estimated across the boundary — and state both next to the metric, because a number without them does not have a defined meaning."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "The baselines a forecast must beat",
        "back": "Naive (ŷ=y_t), seasonal naive (ŷ=y_{t+h−m}), mean. Three lines, and they end a surprising number of projects. Measured: lag ridge **0.2148** vs naive **0.3115** = a real 31.1% gain."
      },
      {
        "type": "formula",
        "front": "★ When is the k-fold gap ZERO?",
        "back": "When no feature spans the boundary. Random walk, lag features only: k-fold 0.9994 vs forward 0.9972 vs naive 0.9961. **The leak needs a FEATURE, not just a split.**"
      },
      {
        "type": "pitfall",
        "front": "★ One centred rolling window",
        "back": "k-fold 0.9947 (≈ naive) but forward chaining **1.4930** — 50% WORSE than naive. The random split HID a harm rather than manufacturing a gain, which is the more dangerous direction."
      },
      {
        "type": "definition",
        "front": "Forward chaining, with the gap",
        "back": "Train [0:t) → test [t:t+h); expand or roll the origin. **Leave an h-step GAP** — the last h training points carry information the forecast wouldn't have. Report mean AND spread across origins."
      },
      {
        "type": "pitfall",
        "front": "Four defaults that are wrong on a series",
        "back": "Fitting a scaler/imputer on the FULL series · CENTRED rolling windows · interpolating across the split · de-seasonalizing with parameters from all the data. Each is correct for cross-sectional data."
      },
      {
        "type": "intuition",
        "front": "What to try, in order",
        "back": "Baselines → classical (ETS/ARIMA/Theta: strong on short univariate, calibrated intervals) → GBDT on TRAILING lag features → global neural (many short related series). Effort at step 4 before step 1 is how you lose to last-value."
      },
      {
        "type": "intuition",
        "front": "The M-competition finding",
        "back": "Simple statistical methods and ENSEMBLES of them are extremely hard to beat; winners are usually combinations. M4 = ETS+RNN hybrid; M5 = gradient-boosted trees on engineered features."
      },
      {
        "type": "formula",
        "front": "★ Good RMSE, operations complain",
        "back": "You optimized the MEAN and they need a QUANTILE. Optimal provisioning is at C_under/(C_under+C_over) — a 5:1 asymmetry means the **83rd percentile**, not the 50th. Fix with pinball loss or a distributional forecast."
      },
      {
        "type": "pitfall",
        "front": "Forecast metric pathologies",
        "back": "MAPE: undefined at zero and ASYMMETRIC (penalizes over-forecasting more → biases toward under-forecasting on intermittent series). sMAPE: unstable near zero. **MASE** is scale-free and well-behaved — the M-competition default."
      },
      {
        "type": "pitfall",
        "front": "Interval calibration decays invisibly",
        "back": "Intervals are usually far too narrow at LONG horizons — uncertainty compounds and implementations propagate it badly. Report realized coverage BY HORIZON, not pooled. If your 90% intervals cover 72%, that's the number."
      },
      {
        "type": "intuition",
        "front": "When it isn't a forecasting problem",
        "back": "\"What WILL happen\" = forecast. \"What if we DO x\" = causal (Granger gave F=2119, p=1e−16 with NO arrow). \"Is this normal\" = anomaly detection. \"What drove this\" = attribution. All four look identical when the input is a series."
      },
      {
        "type": "intuition",
        "front": "★ The module's spine, generalized",
        "back": "Dependency has TWO channels: the SPLIT (which rows are held out) and the FEATURES (what information those rows carry). People attend to the first and forget the second — which is why leakage survives correct splits so reliably."
      }
    ],
    "refs": [
      {
        "title": "Hyndman & Athanasopoulos, Forecasting: Principles and Practice (3rd ed.)",
        "url": "https://otexts.com/fpp3/"
      },
      {
        "title": "Makridakis, Spiliotis & Assimakopoulos (2020), The M4 Competition: 100,000 Time Series and 61 Forecasting Methods",
        "url": "https://www.sciencedirect.com/science/article/pii/S0169207019301128"
      },
      {
        "title": "Bergmeir & Benitez (2012), On the Use of Cross-Validation for Time Series Predictor Evaluation",
        "url": "https://www.sciencedirect.com/science/article/abs/pii/S0020025511006773"
      },
      {
        "title": "Salinas, Flunkert, Gasthaus & Januschowski (2020), DeepAR: Probabilistic Forecasting with Autoregressive Recurrent Networks",
        "url": "https://www.sciencedirect.com/science/article/pii/S0169207019301888"
      },
      {
        "title": "Hyndman & Koehler (2006), Another Look at Measures of Forecast Accuracy (MASE)",
        "url": "https://www.sciencedirect.com/science/article/abs/pii/S0169207006000239"
      }
    ],
    "demos": [
      "forecasting",
      "kalman-filter",
      "dtw",
      "aliasing"
    ]
  }
};
