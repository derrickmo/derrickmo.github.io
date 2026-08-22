// GENERATED from content/lessons/ml-applications/tabular-dl.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/ml-applications/tabular-dl/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "tabular-dl": {
    "level": "core",
    "body": {
      "intuition": [
        "Tabular data is the domain where deep learning has not won, and the reason is structural rather than a matter of effort. Tables have heterogeneous columns on incomparable scales, skewed marginals, high-cardinality categoricals, threshold effects, and a large fraction of irrelevant features - and axis-aligned splits handle all five natively while a dense network handles none of them without help.",
        "The measurement is stark. On synthetic data built with exactly those five properties: histogram gradient boosting reached AUC 0.7790 in 0.7 seconds, random forest 0.7270 in 0.8 seconds, and an MLP 0.5911 in 71 seconds - a hundred times the fit time for a model barely above chance. Adding a log transform and a smoothed target encoding took the MLP to 0.6802, which closes most of the gap and is still well short.",
        "THE PREPROCESSING IS THE MODEL. Every step that lifted the MLP - log-transforming skewed columns, encoding a high-cardinality categorical, scaling - is something the tree did for free, and that is the honest reason trees still win here rather than any claim about capacity. It also sets up this module's spine, because the most effective of those preprocessing steps, target encoding, is a function of the label and therefore the most direct leak available."
      ],
      "math": [
        {
          "h": "★ The five properties, and why trees handle them free",
          "paras": [
            "Each is a property of real tables and each is something a dense network must be given help with.",
            "Together they explain the result without appealing to capacity, data volume or tuning effort."
          ],
          "tex": "\\begin{array}{ll} \\text{skewed marginals} & \\text{splits are scale-invariant; a net needs transforms}\\\\ \\text{threshold effects} & \\text{axis-aligned splits find them EXACTLY}\\\\ \\text{high-cardinality categoricals} & \\text{native; a net needs an embedding or an encoding}\\\\ \\text{irrelevant columns} & \\text{never selected; a net must learn to ignore them}\\\\ \\text{heterogeneous scales} & \\text{irrelevant to a split; fatal to an unscaled net}\\end{array}",
          "texNote": "Measured on data with all five: HistGradientBoosting 0.7790, RandomForest 0.7270, MLP 0.5911. The MLP's deficit is not capacity - it is that the inductive bias of a smooth dense function is wrong for a piecewise-constant, axis-aligned target."
        },
        {
          "h": "What closes the gap, and what it costs",
          "paras": [
            "Give the network the preprocessing the tree performs implicitly and it improves substantially. The remaining gap is the inductive bias itself."
          ],
          "tex": "\\text{MLP raw } 0.5911 \\;\\xrightarrow{\\ \\log\\ +\\ \\text{target encoding}\\ +\\ \\text{scaling}\\ }\\; 0.6802 \\quad\\text{vs}\\quad \\text{GBDT } 0.7790\\ \\text{with none of it}",
          "texNote": "Fit time: 0.7 seconds for the GBDT against 71 seconds for the MLP, a factor of a hundred, before counting the engineering time for the preprocessing itself. On a problem where you will fit hundreds of models during development, that ratio is the decision."
        },
        {
          "h": "★ Target-encoding leakage scales with rarity",
          "paras": [
            "Target encoding replaces a category with its mean outcome, which is a function OF THE LABEL - the most direct leak available. Its severity is not fixed; it depends on how much the test rows contribute to each category's estimate.",
            "Same setup, varying only the number of categories at a fixed sample size."
          ],
          "tex": "\\begin{array}{rrrr} \\text{categories} & \\text{rows/cat} & \\text{train-only AUC} & \\text{train+test AUC}\\\\ 20 & 1000 & 0.7680 & 0.7680\\ (+0.0000)\\\\ 200 & 100 & 0.7489 & 0.7585\\ (+0.0096)\\\\ 2{,}000 & 10 & 0.7244 & 0.7964\\ (+0.0721)\\\\ 8{,}000 & 2.5 & 0.6644 & \\mathbf{0.8657\\ (+0.2013)} \\end{array}",
          "texNote": "Well-populated categories barely move when test rows are added; RARE categories are estimated almost entirely from the test rows themselves, which is a direct label lookup. So the leak is invisible on a low-cardinality demo and catastrophic on the high-cardinality columns you actually want to encode."
        }
      ],
      "code": [
        {
          "h": "The workflow that reflects the evidence",
          "paras": [
            "Order matters, and it is roughly the reverse of how tabular projects usually start."
          ],
          "code": "# 1 GBDT BASELINE, minimal tuning\n#     LightGBM / XGBoost / HistGradientBoosting. Handles skew, thresholds,\n#     missing values and categoricals natively. 0.7s in the measurement above.\n# 2 FEATURE WORK, which is where the returns actually are\n#     domain aggregates, ratios, time-since features, interaction terms\n#     ★ and every one of them checked for as-of correctness\n# 3 TUNING, modest - GBDTs are forgiving and the defaults are strong\n# 4 DEEP LEARNING, only if one of these holds:\n#     * genuinely huge data (tens of millions of rows and growing)\n#     * multimodal inputs - text or images alongside the table\n#     * MULTI-TASK or transfer across related problems, where a shared\n#       representation is the point\n#     * an embedding needed downstream (retrieval, similarity)\n\n# ★ Case 4's exceptions are all cases where you want something a tree cannot\n#   give you - a REPRESENTATION - rather than better accuracy on one table.",
          "caption": "The honest reading of the benchmark literature is that on a single tabular task, a tuned GBDT is the thing to beat and usually is not beaten."
        },
        {
          "h": "The encodings, in order of leak risk",
          "paras": [
            "The most effective encoding for high-cardinality columns is also the most dangerous, and its danger is a function of cardinality."
          ],
          "code": "# ONE-HOT             safe, explodes with cardinality, fine below ~50 levels\n# ORDINAL / NATIVE    what LightGBM and CatBoost do internally; no leak\n# HASHING             fixed width, collisions, no leak, no label involved\n# TARGET ENCODING     replace a category with its mean outcome\n#   ★ a function OF THE LABEL -> the most direct leak available\n#   ★ and the severity scales with RARITY:\n#       1000 rows/cat  -> leak +0.0000\n#        100 rows/cat  -> leak +0.0096\n#         10 rows/cat  -> leak +0.0721\n#        2.5 rows/cat  -> leak +0.2013\n#   Fix: compute INSIDE the training fold only, with smoothing toward the\n#        prior, and use out-of-fold encoding for the training rows themselves\n#        (CatBoost's ordered target statistics do this by construction)\n\n# ★ The trap is that it looks harmless when you test it on a low-cardinality\n#   column and is catastrophic on the high-cardinality ones you wanted it for.",
          "caption": "The dose-response table is the point: a leak with no measured effect on 20 categories is worth 0.20 of AUC on 8,000, so a demo cannot tell you whether yours is safe."
        }
      ],
      "useCases": [
        "Essentially all of applied ML in finance, insurance, healthcare operations, logistics and enterprise software, where the data is a table and a GBDT is the correct default.",
        "Fraud, risk and credit scoring, where GBDTs plus SHAP for explanation is the standard stack and the regulatory requirement makes explainability non-optional.",
        "Multimodal problems where a table sits alongside text or images, which is one of the genuine cases for a neural approach because the fusion needs a shared representation.",
        "Deciding NOT to use deep learning, which the benchmark evidence supports and which saves substantial engineering time on most tabular problems."
      ],
      "pitfalls": [
        "Reaching for deep learning on a single tabular task. Measured: GBDT 0.7790 in 0.7 seconds against an MLP at 0.5911 in 71 seconds, and the MLP reached only 0.6802 after the preprocessing the tree did for free.",
        "Target encoding computed across the split. The severity scales with rarity - +0.0000 at 1000 rows per category and +0.2013 at 2.5 - so it is invisible on a low-cardinality test and catastrophic where you actually want it.",
        "Testing a leak-prone encoding on a low-cardinality column and concluding it is safe. The dose-response is the whole point, and cardinality relative to sample size is the variable.",
        "Scaling, imputing or fitting any transform before splitting. The same pre-split aggregate leak as every other domain in this module, and tabular pipelines have the most of these steps.",
        "Tuning a GBDT extensively before doing feature work. The returns are in the features; GBDT defaults are strong and the model is forgiving.",
        "Comparing a heavily-tuned neural model against a default GBDT. That is the realistic-evaluation flaw from the semi-supervised lesson in a different domain.",
        "Assuming the benchmark result transfers. If your table is genuinely huge, multimodal, or feeding a downstream representation, the exceptions apply and the default reverses."
      ],
      "connections": [
        {
          "ref": "supervised-learning/boosting",
          "text": "The model that wins here, and why axis-aligned splits are the right inductive bias for piecewise-constant, threshold-driven targets."
        },
        {
          "ref": "ml-applications/shap",
          "text": "The explanation layer that pairs with GBDTs, including why correlated tabular features split SHAP credit and make the ranking fragile."
        },
        {
          "ref": "ml-theory/feature-engineering",
          "text": "Where the returns actually are on tabular problems, and the as-of discipline every engineered aggregate must satisfy."
        },
        {
          "ref": "interview-capstone/design-fraud-llm",
          "text": "The design case built on this stack, where the operating point comes from a cost ratio and the model is downstream of it."
        },
        {
          "ref": "ml-theory/cross-validation",
          "text": "The split discipline this domain has the most opportunities to violate, since tabular pipelines contain the most fitted transforms."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "★ Give the tabular comparison.",
          "a": "On data with tabular structure: HistGradientBoosting AUC **0.7790** in 0.7 s, RandomForest 0.7270 in 0.8 s, MLP **0.5911** in **71 s** — a hundred times the fit time, barely above chance."
        },
        {
          "q": "Why do trees win?",
          "a": "Five properties of real tables: skewed marginals, threshold effects, high-cardinality categoricals, many irrelevant columns, heterogeneous scales. Axis-aligned splits handle all five natively."
        },
        {
          "q": "How much does preprocessing close?",
          "a": "MLP 0.5911 → **0.6802** with log transforms, target encoding and scaling. Most of the gap, still well short of 0.7790. **The preprocessing IS the model.**"
        },
        {
          "q": "Is the deficit capacity?",
          "a": "No — it's inductive bias. A smooth dense function is the wrong prior for a piecewise-constant, axis-aligned target."
        },
        {
          "q": "★ Why is target encoding dangerous?",
          "a": "It replaces a category with its mean OUTCOME — a function of the label, so computing it across the split is the most direct leak available."
        },
        {
          "q": "Give the dose-response.",
          "a": "Leak by rows per category: 1000 → **+0.0000**, 100 → +0.0096, 10 → +0.0721, 2.5 → **+0.2013**."
        },
        {
          "q": "Why does it scale with rarity?",
          "a": "Well-populated categories barely move when test rows are added. RARE categories are estimated almost entirely FROM the test rows — a direct label lookup."
        },
        {
          "q": "So what's the trap?",
          "a": "It looks harmless tested on a low-cardinality column and is catastrophic on the high-cardinality ones you wanted it for. A demo can't tell you whether yours is safe."
        },
        {
          "q": "How do you do target encoding safely?",
          "a": "Compute inside the training fold only, smooth toward the prior, and use OUT-OF-FOLD encoding for the training rows themselves. CatBoost's ordered target statistics do this by construction."
        },
        {
          "q": "Rank the encodings by leak risk.",
          "a": "One-hot (safe, explodes past ~50 levels) · ordinal/native (LightGBM, CatBoost — no leak) · hashing (no label involved) · TARGET encoding (most effective, most dangerous)."
        },
        {
          "q": "When IS deep learning right on tabular data?",
          "a": "Genuinely huge data · multimodal inputs (text/images alongside the table) · multi-task or transfer · an embedding needed downstream. All cases where you want a REPRESENTATION, not accuracy on one table."
        },
        {
          "q": "Where are the returns on a tabular project?",
          "a": "Feature work — domain aggregates, ratios, time-since features, interactions — not tuning. GBDT defaults are strong and the model is forgiving."
        }
      ],
      "standard": [
        {
          "q": "Why does gradient boosting still beat deep learning on tabular data?",
          "a": "BECAUSE OF FIVE PROPERTIES OF REAL TABLES, AND AXIS-ALIGNED SPLITS HANDLE ALL FIVE NATIVELY. Skewed marginals: a split is scale-invariant, and a network needs transforms. Threshold effects: a split finds a threshold exactly, and a smooth dense function approximates it with a sigmoid that never quite gets there. High-cardinality categoricals: trees handle them natively, and a network needs an embedding or an encoding. Many irrelevant columns: a tree simply never selects them, and a network must learn to ignore them, which costs capacity and data. Heterogeneous scales: irrelevant to a split and fatal to an unscaled network. MEASURED ON DATA BUILT WITH ALL FIVE: histogram gradient boosting reached AUC 0.7790 in 0.7 seconds, random forest 0.7270 in 0.8, and an MLP 0.5911 in 71 seconds — a hundred times the fit time for a model barely above chance. GIVING THE NETWORK THE PREPROCESSING THE TREE PERFORMS IMPLICITLY — log transforms on the skewed columns, a smoothed target encoding for the categorical, scaling — took it to 0.6802, which closes most of the gap and is still well short. THE PREPROCESSING IS THE MODEL, and that is the honest reason rather than any claim about capacity or tuning effort.",
          "deepDive": {
            "q": "Why don't more data and more tuning reverse it?",
            "a": "The framing worth carrying is that this is an inductive-bias argument, not a capacity argument, which is why more data and more tuning do not reliably reverse it — Grinsztajn et al. found the gap persists across dataset sizes and holds after extensive tuning of both families. The specific bias mismatch is that tabular targets are frequently piecewise-constant and axis-aligned — a rule like 'approve if income above X and tenure above Y' is exactly two splits and is an awkward function for a smooth network — while networks excel where the input has a spatial, sequential or compositional structure that weight sharing can exploit, and a table has none. That also predicts the exceptions correctly: neural approaches become competitive when the table is huge enough that the network can learn the preprocessing itself, when there is genuine structure across columns as in high-cardinality interaction-heavy recommendation data, or when the tabular part is one modality among several. Those are the cases where you want a representation, and a tree cannot give you one — which is the real dividing line rather than accuracy on a single table."
          }
        },
        {
          "q": "Explain target encoding and how you would use it safely.",
          "a": "IT REPLACES A CATEGORY WITH ITS MEAN OUTCOME, which makes it enormously effective for high-cardinality columns — one column instead of thousands of one-hot dimensions, carrying exactly the signal you want — AND MAKES IT A FUNCTION OF THE LABEL, which is the most direct leak available. If you compute it before splitting, every test row's label contributed to the feature the model was trained on. THE SEVERITY IS NOT FIXED, AND THAT IS THE PART PEOPLE MISS. Measured at a constant sample size, varying only the number of categories: at 1,000 rows per category the leak was +0.0000 of AUC, at 100 rows +0.0096, at 10 rows +0.0721, and at 2.5 rows +0.2013. THE MECHANISM IS THAT WELL-POPULATED CATEGORIES BARELY MOVE when test rows are added to their estimate, while rare categories are estimated almost entirely from the test rows themselves — which is a direct label lookup for those rows. SO THE TRAP IS PRECISE: it looks harmless when you test it on a low-cardinality column and is catastrophic on the high-cardinality ones you wanted it for in the first place. THE SAFE RECIPE is to compute inside the training fold only, smooth toward the global prior with a pseudo-count, and use out-of-fold encoding for the training rows themselves so a row's own label does not contribute to its own feature.",
          "deepDive": {
            "q": "Which part of that is genuinely subtle?",
            "a": "That last point — out-of-fold encoding for the training rows — is the part that is genuinely subtle and is what CatBoost's ordered target statistics implement by construction, using only rows that precede the current one in a random permutation. Without it, even a correctly-split pipeline has each training row's label leaking into its own feature, which causes the model to over-rely on the encoding and generalize worse; the symptom is a training-validation gap that widens with cardinality. The smoothing parameter is the other lever and it has a clean interpretation as a Bayesian shrinkage toward the prior, with the pseudo-count being how many observations of the prior you are worth: small categories shrink to the base rate and large ones keep their own estimate. Setting it from the cardinality distribution rather than by tuning is both more principled and more robust. The general lesson is the module's: this is a feature whose leak severity is a function of a data property — cardinality relative to sample size — so the safety of the technique cannot be established once and reused, it has to be checked per dataset."
          }
        },
        {
          "q": "How would you approach a new tabular problem?",
          "a": "IN ROUGHLY THE REVERSE ORDER OF HOW TABULAR PROJECTS USUALLY START. FIRST, A GBDT BASELINE WITH MINIMAL TUNING — LightGBM, XGBoost or HistGradientBoosting — which handles skew, thresholds, missing values and categoricals natively and takes under a second on a moderate dataset. That establishes what the data supports before any engineering. SECOND, FEATURE WORK, which is where the returns actually are: domain aggregates, ratios, time-since features, interaction terms — and every one of them checked for as-of correctness, because tabular pipelines contain more fitted transforms than any other domain in this module and therefore more opportunities to compute an aggregate across the split. THIRD, MODEST TUNING, because GBDTs are forgiving and the defaults are strong, so an extensive sweep before feature work is effort in the wrong place. FOURTH, DEEP LEARNING ONLY IF ONE OF FOUR CONDITIONS HOLDS: genuinely huge and growing data, multimodal inputs where text or images sit alongside the table, multi-task or transfer across related problems, or a downstream need for an embedding. NOTE WHAT THOSE FOUR HAVE IN COMMON — each is a case where you want a REPRESENTATION, which a tree cannot produce, rather than better accuracy on one table.",
          "deepDive": {
            "q": "Why is the leak surface larger here than anywhere else in the module?",
            "a": "The as-of discipline deserves emphasis in this domain specifically because the leak surface is larger than anywhere else in the module. A typical tabular pipeline scales, imputes, encodes, bins, winsorizes and aggregates — six fitted transforms, each of which is a pre-split aggregate if implemented naively, and most library APIs make the naive version the shorter code. The structural fix is to express the whole pipeline as an object fitted inside each fold rather than as a sequence of dataframe operations, which is exactly what scikit-learn's Pipeline exists for and which is routinely bypassed because it is less convenient during exploration. The habit that catches the rest is to ask, of every column, what timestamp it could have been computed at and whether that precedes the prediction — and for any aggregate over a group, whether the group's other rows include held-out ones. Those two questions find essentially all of it, and they take a minute per feature, which is affordable because tabular models have tens of features rather than thousands."
          }
        },
        {
          "q": "What are the neural architectures for tabular data and are they worth it?",
          "a": "THERE ARE THREE FAMILIES AND THE HONEST ANSWER IS THAT NONE HAS DISPLACED GBDTS ON SINGLE-TABLE TASKS. ATTENTION-BASED models such as TabNet and TabTransformer apply feature-level attention, aiming to learn which columns matter and how they interact; they are competitive on some benchmarks and have not shown a consistent advantage. EMBEDDING-BASED approaches — entity embeddings for categoricals feeding an MLP — are the oldest and the most practically useful, because the embeddings themselves are the deliverable when something downstream needs them. TREE-INSPIRED DIFFERENTIABLE models such as NODE try to give a network the axis-aligned bias directly, which is a principled response to the diagnosis and has not translated into a decisive win. THE FAIR-COMPARISON PROBLEM APPLIES HERE exactly as it did in the semi-supervised lesson: many reported advantages come from comparing a heavily-tuned neural model against a lightly-tuned GBDT, and Grinsztajn et al.'s benchmark, which equalized the tuning budget, found the gap persists in the trees' favour. SO MY POSITION is that neural tabular models are worth it when you need what they uniquely provide — a shared representation for multi-task, multimodal fusion, or a downstream embedding — and not as a general upgrade.",
          "deepDive": {
            "q": "Where does the dividing line genuinely move?",
            "a": "The multimodal case is the one growing fastest and it is worth being concrete about, because it is where the dividing line genuinely moves. If a record has structured columns plus a free-text description plus an image, then a GBDT can only consume the text and image through hand-built features — embeddings computed separately and appended — whereas a single network can learn the fusion end to end and let the tabular part inform how the text is read. That is a real advantage and it is about JOINT representation rather than about tabular modelling. The pragmatic middle ground that works well and is under-used is a hybrid: compute text and image embeddings with a pretrained model, append them as columns, and feed the whole thing to a GBDT. That captures most of the multimodal signal, keeps the tabular strengths, and avoids training a large network — and it should be the baseline any end-to-end multimodal architecture has to beat. Skipping that comparison is the same error as skipping the GBDT baseline in the first place, one level up."
          }
        },
        {
          "q": "How does this lesson fit the module's theme?",
          "a": "TABULAR DATA'S STRUCTURE IS HETEROGENEITY — columns that mean different things, on different scales, with different cardinalities — and it is both the prior and the trap in the module's usual way. IT IS THE PRIOR because that heterogeneity is exactly what axis-aligned splits exploit, which is why a GBDT reached 0.7790 where an MLP reached 0.5911 with a hundred times the fit time. IT IS THE TRAP because the most effective response to one part of that heterogeneity — target encoding for high-cardinality categoricals — is a function of the label, and therefore the most direct leak available. WHAT THIS LESSON ADDS TO THE MODULE IS A DOSE-RESPONSE CURVE, which none of the others has. The leak is worth +0.0000 at 1,000 rows per category and +0.2013 at 2.5, so its severity is a continuous function of a data property rather than a binary fact about the technique. THAT MEANS THE SAFETY OF A METHOD CANNOT BE ESTABLISHED ONCE AND REUSED — it has to be checked against the cardinality of your columns and the size of your data, which is a more demanding standard than 'is this technique safe' and a more accurate one.",
          "deepDive": {
            "q": "How does the dose-response framing generalize?",
            "a": "That dose-response framing generalizes to the rest of the module more than it first appears. The grouped-split leak was worth +0.4192 with a strong per-group signature and a weak label signal, and it would be worth almost nothing if the group signature were weak — so it too is a function of a data property rather than a property of the split scheme. The time-series leak was zero with lag features and large with a centred window, so it is a function of the feature set. In every case the question 'how bad is this leak' has the answer 'it depends on a measurable property of your data', and the measurement is usually cheap: fit with and without the suspect step, on an honest split, and read the difference. That is the single most useful habit this module can leave — not a list of forbidden operations, but the practice of measuring the optimism your pipeline produces, which is one extra experiment and turns a rule of thumb into a number you can act on."
          }
        },
        {
          "q": "Your GBDT scores 0.95 AUC on validation and 0.71 in production. Where do you look?",
          "a": "LEAKAGE FIRST, AND THIS DOMAIN HAS THE MOST SURFACES FOR IT. In order of prior probability. ONE, TARGET ENCODING computed across the split — measured at +0.2013 of AUC on a high-cardinality column, which alone can produce a gap of this size, and it is the single most likely cause on a tabular problem with categorical features. TWO, ANY OTHER FITTED TRANSFORM applied before splitting: scaler, imputer, binner, winsorizer, or a group aggregate. Tabular pipelines contain six or more of these and the naive implementation of each is a leak. THREE, THE SPLIT UNIT — if rows are grouped by customer, account or session and the split was by row, the group signature is a lookup table, which the module measured at +0.4192 in its general form. FOUR, A FEATURE THAT ENCODES THE FUTURE, such as an aggregate computed over a window that extends past the prediction timestamp, which is the time-series lesson's centred window in tabular clothing. FIVE, ONLY THEN, distribution shift — which is real and is the least likely explanation for a gap this large appearing immediately at launch rather than degrading over weeks.",
          "deepDive": {
            "q": "Which diagnostic separates leakage from shift quickest?",
            "a": "The diagnostic that separates leakage from shift quickly is the shape of the gap over time. Leakage produces a gap that is present from the first day of production and does not change; shift produces a gap that starts small and widens. That single plot resolves most investigations in an hour. If it is leakage, the fastest localization is ablation: drop the suspect feature group and re-run the honest evaluation, and the feature carrying most of the disappearing lift is the culprit — a single feature accounting for a large share of performance is a leakage hypothesis before it is a modelling success, which is also how SHAP serves as a leak detector. If it is shift, the drift lesson's conclusion applies and the honest response is a labelled sample, since no unlabelled monitor sees a concept change. Either way, the number worth institutionalizing is the offline-online gap itself, tracked over releases, because it is the only calibration you have for how much to trust the next offline result — and teams that maintain it stop being surprised."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "★ The tabular comparison",
        "back": "HistGradientBoosting AUC **0.7790** (0.7 s) · RandomForest 0.7270 (0.8 s) · MLP **0.5911** (**71 s**). A hundred times the fit time for a model barely above chance."
      },
      {
        "type": "definition",
        "front": "The five properties trees handle free",
        "back": "Skewed marginals (splits are scale-invariant) · THRESHOLD effects (found exactly) · high-cardinality categoricals · many irrelevant columns (never selected) · heterogeneous scales (irrelevant to a split)."
      },
      {
        "type": "intuition",
        "front": "★ The preprocessing IS the model",
        "back": "MLP 0.5911 → **0.6802** with log transforms + target encoding + scaling — most of the gap, still short of 0.7790. Every step is something the tree did for free. It's an INDUCTIVE-BIAS argument, not a capacity one."
      },
      {
        "type": "formula",
        "front": "★ Target-encoding leak, dose-response",
        "back": "By rows per category: 1000 → **+0.0000** · 100 → +0.0096 · 10 → +0.0721 · **2.5 → +0.2013**. Well-populated categories barely move; rare ones are estimated from the TEST rows — a direct label lookup."
      },
      {
        "type": "pitfall",
        "front": "The target-encoding trap",
        "back": "It looks harmless tested on a LOW-cardinality column and is catastrophic on the HIGH-cardinality ones you wanted it for. A demo cannot tell you whether yours is safe."
      },
      {
        "type": "definition",
        "front": "Safe target encoding",
        "back": "Compute inside the training fold only · smooth toward the prior with a pseudo-count (Bayesian shrinkage) · **out-of-fold encoding for the training rows themselves**, so a row's own label doesn't feed its own feature. CatBoost's ordered statistics do this by construction."
      },
      {
        "type": "intuition",
        "front": "Encodings by leak risk",
        "back": "One-hot (safe, explodes past ~50 levels) · ordinal/native (LightGBM, CatBoost — no leak) · hashing (no label involved) · TARGET encoding (most effective, most dangerous)."
      },
      {
        "type": "intuition",
        "front": "The workflow, in order",
        "back": "GBDT baseline, minimal tuning → **FEATURE WORK** (where the returns are, each checked as-of) → modest tuning → deep learning only under four conditions. Roughly the reverse of how projects usually start."
      },
      {
        "type": "intuition",
        "front": "★ When deep learning IS right here",
        "back": "Genuinely huge data · multimodal inputs · multi-task/transfer · a downstream embedding. All four are cases where you want a **REPRESENTATION**, which a tree cannot produce — not better accuracy on one table."
      },
      {
        "type": "intuition",
        "front": "The multimodal middle ground",
        "back": "Compute text/image embeddings with a pretrained model, APPEND them as columns, feed to a GBDT. Captures most of the signal, keeps the tabular strengths — and it's the baseline an end-to-end architecture must beat."
      },
      {
        "type": "pitfall",
        "front": "0.95 validation, 0.71 production — where to look",
        "back": "Target encoding across the split (+0.2013 alone) → other pre-split fitted transforms (a pipeline has six) → wrong split UNIT (+0.4192) → a future-spanning window → and only then shift."
      },
      {
        "type": "intuition",
        "front": "★ Leakage vs shift, in one plot",
        "back": "LEAKAGE: the gap is present from day one and constant. SHIFT: it starts small and widens. That plot resolves most investigations in an hour — then localize by ablation, since a single feature carrying most of the lift is a leak hypothesis."
      }
    ],
    "refs": [
      {
        "title": "Grinsztajn, Oyallon & Varoquaux (2022), Why Do Tree-Based Models Still Outperform Deep Learning on Tabular Data?",
        "url": "https://arxiv.org/abs/2207.08815"
      },
      {
        "title": "Shwartz-Ziv & Armon (2022), Tabular Data: Deep Learning is Not All You Need",
        "url": "https://arxiv.org/abs/2106.03253"
      },
      {
        "title": "Prokhorenkova et al. (2018), CatBoost: Unbiased Boosting with Categorical Features",
        "url": "https://arxiv.org/abs/1706.09516"
      },
      {
        "title": "Ke et al. (2017), LightGBM: A Highly Efficient Gradient Boosting Decision Tree",
        "url": "https://papers.nips.cc/paper/2017/hash/6449f44a102fde848669bdd9eb6b76fa-Abstract.html"
      },
      {
        "title": "Guo & Berkhahn (2016), Entity Embeddings of Categorical Variables",
        "url": "https://arxiv.org/abs/1604.06737"
      }
    ],
    "demos": [
      "decision-tree",
      "bagging-boosting",
      "overfitting",
      "cross-validation"
    ]
  }
};
