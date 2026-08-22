// GENERATED from content/lessons/unsupervised-learning/anomaly-detection.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/unsupervised-learning/anomaly-detection/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "anomaly-detection": {
    "level": "core",
    "body": {
      "intuition": [
        "Anomaly detection asks a deceptively simple question: which points don't look like the rest? It's mostly an unsupervised problem because anomalies are, by definition, rare and varied - you usually can't collect a representative labeled set of 'all the ways things can go wrong', so instead of learning to classify anomalies you learn what NORMAL looks like and flag whatever deviates. That reframing - model the normal, measure the deviation - is the unifying idea behind every method in this lesson.",
        "The methods differ in how they define 'normal'. Density-based methods (a fitted GMM, kernel density estimation, or local outlier factor) say normal points live in high-density regions and anomalies in low-density ones - a point with low probability under the density model is an outlier. Distance/isolation methods take a more operational view: Isolation Forest isolates a point by random splits and calls it anomalous if it's easy to isolate (few splits needed), and one-class SVM learns a boundary enclosing the normal data. These are different lenses on the same target, and which one works depends on the geometry of your normal data.",
        "The hard part of anomaly detection isn't the algorithm - it's everything around it. The extreme class imbalance makes accuracy a useless metric (a detector that flags nothing is 99.9% accurate); the threshold that converts an anomaly SCORE into a yes/no decision is a business/cost trade-off, not a statistical constant; and the definition of 'anomaly' is contextual (a temperature that's normal in summer is an anomaly in winter). Getting these right - the right metric (precision/recall at a review budget), the right threshold (from the cost of misses vs false alarms), and the right notion of context - is what separates a useful detector from a nuisance."
      ],
      "math": [
        {
          "h": "Density-based anomaly scoring",
          "paras": [
            "If you have a density model p(x) of normal data (a GMM, or a kernel density estimate), the anomaly score is simply low likelihood: points where p(x) is small are in regions the normal data rarely occupies. A threshold on the (log) density separates normal from anomalous."
          ],
          "tex": "\\text{score}(x) = -\\log p(x), \\qquad \\text{flag anomaly if } p(x) < \\tau \\;\\Leftrightarrow\\; \\text{score}(x) > -\\log\\tau",
          "texNote": "Model normal density p(x); anomalies are low-probability points. The threshold tau is chosen from the cost trade-off / a target flag rate, not from the model alone."
        },
        {
          "h": "Isolation: anomalies are easy to separate",
          "paras": [
            "Isolation Forest builds random binary trees by picking a random feature and a random split value. Anomalies, being few and different, get isolated into their own leaf in very few splits, so their average path length across trees is short - the anomaly score is the inverse of that path length."
          ],
          "tex": "s(x) = 2^{-\\, \\mathbb{E}[h(x)] / c(n)}, \\qquad \\text{short expected path } h(x) \\Rightarrow s(x) \\to 1 \\text{ (anomaly)}",
          "texNote": "h(x) is the path length to isolate x; c(n) normalizes by the average path length of an unsuccessful BST search. No density estimate needed - a fast, scalable score that works well in high dimensions."
        }
      ],
      "code": [
        {
          "h": "Isolation Forest and a density model on imbalanced data",
          "paras": [
            "Two unsupervised detectors on data with rare injected outliers, scored by PR-AUC and precision@k - the honest metrics for extreme imbalance, not accuracy."
          ],
          "code": "import numpy as np\nfrom sklearn.ensemble import IsolationForest\nfrom sklearn.mixture import GaussianMixture\nfrom sklearn.metrics import average_precision_score\n\nrng = np.random.default_rng(0)\nnormal = rng.normal(0, 1, (2000, 6))\nanoms  = rng.uniform(-6, 6, (20, 6))          # 1% rare, spread-out anomalies\nX = np.vstack([normal, anoms]); y = np.r_[np.zeros(2000), np.ones(20)]\n\niso = IsolationForest(contamination='auto', random_state=0).fit(X)\ns_iso = -iso.score_samples(X)                 # higher = more anomalous\n\ngm = GaussianMixture(3, random_state=0).fit(normal)   # fit NORMAL only, ideally\ns_gmm = -gm.score_samples(X)                  # negative log-likelihood as score\n\nprint('IsolationForest PR-AUC:', round(average_precision_score(y, s_iso), 3))\nprint('GMM density     PR-AUC:', round(average_precision_score(y, s_gmm), 3))\n# accuracy would be ~0.99 for a do-nothing detector - PR-AUC is the honest metric",
          "caption": "Score points, evaluate with PR-AUC / precision@k (not accuracy). Fit the density on clean normal data when you can; Isolation Forest needs no density estimate."
        },
        {
          "h": "The threshold is a cost decision, not 0.5",
          "paras": [
            "Turning a score into a yes/no flag depends on the cost of a missed anomaly vs a false alarm, and often on a fixed review capacity (precision@k) - never a default threshold."
          ],
          "code": "import numpy as np\n\n# suppose reviewers can inspect the top 30 flagged items per day (a capacity budget)\nk = 30\ntop_k = np.argsort(s_iso)[::-1][:k]\nprecision_at_k = y[top_k].mean()\nprint(f'precision@{k}: {precision_at_k:.2f}  ({int(y[top_k].sum())} true anomalies in the top {k})')\n\n# cost-based threshold: minimize cost = cost_FN*misses + cost_FP*false_alarms over the score cutoff\n# cost_FN (missed fraud/failure) usually >> cost_FP (a wasted review) -> threshold well below the 'obvious' one",
          "caption": "In production the threshold comes from a review budget (precision@k) or an explicit miss-vs-false-alarm cost, tuned on the score distribution - not a statistical default."
        }
      ],
      "useCases": [
        "Fraud and intrusion detection - flagging transactions, logins, or network traffic that deviate from learned normal behavior, where labeled fraud is scarce and adversaries invent new patterns.",
        "Predictive maintenance and monitoring - detecting sensor readings, machine vibrations, or system metrics that drift from the normal operating envelope before a failure.",
        "Data quality and preprocessing - finding corrupted records, entry errors, or out-of-distribution inputs before they poison a downstream model (an anomaly at input time is a reliability guardrail).",
        "Novelty detection for deployed models - flagging inputs far from the training distribution so the model can abstain or route to a human (connecting to distribution-shift monitoring)."
      ],
      "pitfalls": [
        "Accuracy is a useless metric under extreme imbalance - a detector that flags nothing scores ~99.9% accuracy while catching zero anomalies; use PR-AUC, precision/recall, and precision@k (at your review capacity) instead.",
        "The score-to-decision threshold is a cost trade-off, not a default - it depends on the cost of a missed anomaly versus a false alarm and often on a fixed review budget; a 0.5 or 3-sigma default is rarely right.",
        "Contaminated training data: many methods assume the fitting data is (mostly) normal, so anomalies present during training pull the model toward accepting them - fit on clean data when possible, or use robust/contamination-aware methods.",
        "The definition of 'anomaly' is contextual and can drift - a value normal in one context (season, user, regime) is anomalous in another, and normal itself shifts over time (concept drift), so a static detector degrades and needs monitoring/retraining.",
        "High dimensionality breaks distance/density-based scores (curse of dimensionality - everything looks equidistant and sparse, so density and nearest-neighbor notions blur); isolation-based and subspace methods, or dimensionality reduction first, cope better."
      ],
      "connections": [
        {
          "ref": "unsupervised-learning/gmm-em",
          "text": "A fitted GMM is a density model, so low likelihood under it is an anomaly score - density-based detection is a direct application of the previous lesson."
        },
        {
          "ref": "unsupervised-learning/hierarchical-density-clustering",
          "text": "DBSCAN's noise label IS a density-based anomaly detector; the density-connectivity idea underlies local outlier factor and related methods."
        },
        {
          "ref": "supervised-learning/logistic-regression",
          "text": "The imbalance metrics (PR-AUC, precision@k) and the cost-based threshold choice are the same tools from the classification-metrics/threshold discussion."
        },
        {
          "ref": "unsupervised-learning/bayesian-inference",
          "text": "Density estimation and 'how surprising is this point under my model' are probabilistic questions - the Bayesian view gives principled uncertainty on the normal model."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Why is anomaly detection usually unsupervised?",
          "a": "Anomalies are rare and varied, so you can't collect a representative labeled set - instead you model what NORMAL looks like and flag deviations."
        },
        {
          "q": "What's the unifying idea across anomaly methods?",
          "a": "Model the normal, measure the deviation - density (low probability), isolation (easy to separate), or distance/boundary (far from normal)."
        },
        {
          "q": "How does density-based anomaly detection score points?",
          "a": "Fit a density p(x) of normal data (GMM/KDE); the anomaly score is low likelihood - points where p(x) is small are outliers."
        },
        {
          "q": "How does Isolation Forest work?",
          "a": "Random binary splits isolate points; anomalies are isolated in few splits (short average path length), so short path = high anomaly score."
        },
        {
          "q": "Why is accuracy useless for anomaly detection?",
          "a": "Extreme imbalance - a do-nothing detector that flags nothing scores ~99.9% accuracy while catching zero anomalies. Use PR-AUC/precision-recall instead."
        },
        {
          "q": "What determines the anomaly-flag threshold?",
          "a": "A cost trade-off (cost of a miss vs a false alarm) and often a fixed review capacity (precision@k) - not a statistical default like 0.5 or 3-sigma."
        },
        {
          "q": "What is a one-class SVM?",
          "a": "A method that learns a boundary enclosing the normal data in feature space; points outside the boundary are flagged as anomalies."
        },
        {
          "q": "What's the risk of contaminated training data?",
          "a": "If anomalies are present while fitting the 'normal' model, they pull the model toward accepting them - fit on clean data or use contamination-aware methods."
        },
        {
          "q": "Why do density/distance methods struggle in high dimensions?",
          "a": "The curse of dimensionality makes points nearly equidistant and space sparse, blurring density and nearest-neighbor notions - use isolation/subspace methods or reduce dimensions."
        },
        {
          "q": "What is precision@k and why use it here?",
          "a": "The fraction of true anomalies among the top-k flagged items - it matches a fixed review budget (reviewers can only inspect k items), the real operating constraint."
        }
      ],
      "standard": [
        {
          "q": "Compare density-based, isolation-based, and boundary-based (one-class SVM) anomaly detection - the assumption each makes and when each is appropriate.",
          "a": "Density-based methods (fitted GMM, kernel density estimation, Local Outlier Factor) assume normal data lives in high-density regions and anomalies in low-density ones, scoring anomalies by low probability / low local density. They work well when normal data has a clear density structure and dimensionality is moderate, give an interpretable probabilistic score, but degrade in high dimensions (density estimation gets hard) and require choosing a density model or bandwidth. Isolation-based methods (Isolation Forest) take the opposite, operational view: anomalies are 'few and different', so they're easy to isolate with random splits - the score is how quickly a point gets isolated (short path length). They make almost no distributional assumption, scale to large and high-dimensional data efficiently (linear time, low memory), and handle the case where anomalies are far from the bulk in some feature - but they can miss anomalies that are only anomalous in a local or combined sense and are less interpretable as probabilities. Boundary-based methods (one-class SVM) assume normal data can be enclosed by a boundary in some (kernel) feature space and flag points outside it; they work when normal data forms a compact region (possibly nonlinear via the kernel), but are sensitive to their parameters (the nu parameter and kernel bandwidth), scale poorly (kernel O(n^2)+), and can be thrown off by contamination. So: density-based for interpretable probabilistic scores on moderate-dimensional structured data; Isolation Forest as the fast, robust, high-dimensional default that needs little tuning; one-class SVM when normal data is a compact (possibly nonlinear) region and the data isn't too large - and in practice, trying Isolation Forest first plus a density model, comparing on PR-AUC, is a sensible workflow.",
          "deepDive": {
            "q": "How does Local Outlier Factor (LOF) detect anomalies that global density methods miss?",
            "a": "LOF is a LOCAL density method, and its key advantage is detecting anomalies relative to their neighborhood rather than relative to the global density - which matters when the data has clusters of different densities. A global density model (or a single global threshold) would flag every point in a genuinely sparse-but-normal cluster as anomalous while missing a point that's moderately dense in absolute terms but far sparser than its immediate surroundings. LOF fixes this by computing, for each point, the ratio of the local density of its k nearest neighbors to its own local density (via 'reachability distances'): a point whose neighbors are all much denser than it is - i.e., it sits in a relative void compared to where its neighbors live - gets an LOF score well above 1 (anomaly), while a point whose density matches its neighborhood gets LOF near 1 (normal), regardless of the absolute density level. So a point on the fringe of a dense cluster can be flagged even if its absolute density exceeds that of a distant sparse-but-normal cluster, because LOF judges each point against its own local context. This makes LOF well-suited to data with varying-density regions (the same varying-density challenge DBSCAN's global epsilon faces), at the cost of being O(n^2) for the neighbor computations and sensitive to the choice of k."
          }
        },
        {
          "q": "A fraud-detection model reports 99.9% accuracy. Explain why this is meaningless and how you'd actually evaluate and operate the detector.",
          "a": "It's meaningless because fraud is extremely rare - if 0.1% of transactions are fraudulent, a trivial detector that flags NOTHING is correct on all 99.9% of legitimate transactions and gets 99.9% accuracy while catching zero fraud. Accuracy is dominated by the majority (normal) class, so it measures the base rate, not the detector's skill at the thing you care about. Proper evaluation focuses on the positive (anomaly) class: compute precision (of the flagged items, how many are truly fraud) and recall (of all fraud, how much you caught), summarize threshold-independently with PR-AUC (which, unlike ROC-AUC, stays honest under heavy imbalance because precision's denominator reflects false positives against the small positive class), and report precision@k at your actual review capacity. For operation: (1) The score-to-flag threshold is a cost decision - assign a dollar cost to a missed fraud (FN) and to a false alarm (FP, e.g., analyst time or a blocked legitimate customer), then choose the threshold minimizing expected cost = cost_FN * misses + cost_FP * false_alarms; since a missed fraud usually costs far more than a false alarm, the optimal threshold flags aggressively (lower cutoff) and typically routes flags to a review queue rather than auto-blocking. (2) If reviewers can only inspect k items per day, operate at precision@k - set the threshold to surface the k most-anomalous items and maximize how many are real. (3) Monitor precision/recall over time because fraud patterns drift (concept shift), and retrain/re-threshold as the fraud rate and tactics change. This is exactly the imbalance-and-cost framing from the fraud/classification-metrics lessons applied to an unsupervised detector.",
          "deepDive": {
            "q": "Why is PR-AUC preferred over ROC-AUC specifically for anomaly detection, with a concrete illustration?",
            "a": "ROC-AUC plots true-positive rate against false-positive rate, and the false-positive rate has the large negative-class count in its denominator - so under extreme imbalance, even a large NUMBER of false positives barely moves the FPR, and ROC-AUC can look reassuringly high (say 0.95) while the detector is actually poor at the practical task. PR-AUC uses precision (true positives / all flagged positives), whose denominator is dominated by false positives, so it directly reflects how many of your alarms are wrong - the thing that determines whether the detector is usable. Concretely: suppose 1,000,000 transactions with 100 frauds, and a detector flags 10,000 transactions to catch 90 frauds. Recall is 90%, and the false-positive rate is 9,910 / 999,900 ~ 0.01, so ROC looks excellent (high TPR, tiny FPR). But precision is 90 / 10,000 = 0.9% - 99.1% of the alarms are false, so a review team would drown in noise; PR-AUC captures this disaster while ROC-AUC hides it. Because anomaly detection lives in exactly this rare-positive regime and the operational cost is driven by false-alarm volume relative to the tiny positive class, PR-AUC (and precision@k) is the metric that tracks real usefulness, which is why it's preferred over ROC-AUC here - the same distinction the fraud lesson (25-05) quantifies as ROC-AUC 0.99 optimistic vs PR-AUC 0.61 honest."
          }
        },
        {
          "q": "Explain the difference between novelty detection and outlier detection, and why the distinction matters for how you train.",
          "a": "The distinction is about whether the training data is assumed clean. Outlier detection (unsupervised) assumes the training set itself is contaminated - it contains both normal points and some anomalies mixed in, unlabeled - and the goal is to identify which of THOSE training points are the outliers. Methods like Isolation Forest and LOF are typically used this way, with a 'contamination' parameter estimating the anomaly fraction; they must be robust to the anomalies present during fitting. Novelty detection (semi-supervised) assumes the training data is CLEAN - all normal, no anomalies - and the goal is to decide whether NEW, unseen points conform to that learned normal or are novel. One-class SVM and fitting a density model on known-good data are the classic novelty-detection setups. The distinction matters for training because contamination breaks methods that assume clean data: if you fit a 'normal' density model or a one-class boundary on data that secretly contains anomalies, the model widens to accommodate them, learns to consider them normal, and then fails to flag similar points at test time - so for novelty detection you must curate a clean normal training set (or use a robust method), while for outlier detection you accept contamination and choose methods designed to tolerate it. Practically, it also changes evaluation and deployment: novelty detection can be validated by holding out known-normal data and injecting known anomalies at test time, whereas outlier detection is judged on how well it separates the (unlabeled) contamination in-sample, often needing some labeled anomalies for tuning.",
          "deepDive": {
            "q": "If you only have a clean sample of normal data and no anomaly examples at all, how do you set the detection threshold?",
            "a": "With only clean normal data and no anomalies, you can't optimize a threshold against a miss/false-alarm cost directly (you have no misses to observe), so you set it from the normal data's own score distribution to control the false-positive rate. The standard approach: compute the anomaly score for every point in a held-out clean normal set, then choose the threshold at a chosen quantile of that distribution - e.g., set it at the 99th percentile so that only 1% of genuinely-normal points would be flagged, giving you an expected false-alarm rate of 1% by construction. This turns the threshold choice into 'how many false alarms can I tolerate?', which you CAN answer from business constraints (review capacity, tolerance for disruption) even without anomaly examples. You'd validate that the score distribution is stable (the 99th percentile on one clean sample matches another) and, once the system is live and some flagged items get labeled by reviewers, you can start estimating recall and shift to a cost-based threshold. This quantile-on-normal-scores method is exactly how novelty detectors are thresholded in the common real-world case where you know what normal looks like but can't enumerate the anomalies - you control the one error rate you can measure (false positives on normal data) and accept that recall is unknown until anomalies actually occur and get labeled."
          }
        },
        {
          "q": "Why does high dimensionality make anomaly detection hard, and what strategies address it?",
          "a": "High dimensionality attacks the core notions most anomaly detectors rely on. Distance and density-based methods depend on meaningful distances, but the curse of dimensionality makes distances concentrate - the nearest and farthest points become nearly equidistant - so 'this point is far from normal' or 'this point is in a low-density region' loses discriminative power; density estimation itself becomes statistically infeasible (you'd need exponentially more data to estimate a density in high dimensions). Additionally, anomalies in high-dimensional data are often anomalous only in a SUBSET of the features (a subspace) while looking normal in the full space, where the many irrelevant dimensions dilute the anomalous signal - a point slightly odd in 3 of 100 features is swamped by the 97 normal ones in a global distance/density score. Strategies: (1) Isolation Forest and other isolation/tree-based methods degrade more gracefully than distance/density methods because they use axis-aligned random splits rather than full-space distances, so they can pick up single-feature anomalies. (2) Dimensionality reduction first - PCA to project onto meaningful directions, then detect in the reduced space (and reconstruction error from PCA/autoencoders is itself an anomaly score: points that reconstruct poorly are off the normal manifold). (3) Subspace / feature-bagging methods that look for anomalies in many feature subsets and aggregate, catching subspace anomalies the full-space view misses. (4) Autoencoder-based detection - train an autoencoder on normal data and use reconstruction error as the score, which learns a nonlinear normal manifold and flags points it can't reconstruct, scaling to high dimensions. (5) Feature selection to drop noise dimensions. The general theme mirrors clustering: restore meaningful structure (via reduction, a learned manifold, or subspace methods) before or instead of relying on raw high-dimensional distances.",
          "deepDive": {
            "q": "How does an autoencoder's reconstruction error work as an anomaly score, and what's its key assumption/failure mode?",
            "a": "An autoencoder is trained to compress inputs to a low-dimensional bottleneck and reconstruct them, using only NORMAL data; it thereby learns the low-dimensional manifold that normal data lives on. At test time, a normal point lies near that learned manifold and reconstructs well (low reconstruction error), while an anomaly - which the autoencoder never learned to represent - falls off the manifold and reconstructs poorly (high error), so the reconstruction error (e.g., squared difference between input and output) serves directly as the anomaly score, thresholded like any other. Its strength is handling high-dimensional, nonlinear normal structure (images, sensor arrays) where explicit density estimation fails. The key assumption is that the autoencoder generalizes to reconstruct normal data well but does NOT generalize to reconstruct anomalies - and the key failure mode is exactly when that breaks: if the autoencoder is too high-capacity (bottleneck too large, or trained too long), it can learn to reconstruct ANYTHING well, including anomalies, collapsing the error gap and destroying detection power; conversely, if it's too weak it reconstructs even normal data poorly, causing false alarms. So the bottleneck size and regularization are critical (you want it just tight enough to capture normal structure but not anomalies), and contamination of the training set with anomalies is also dangerous because the autoencoder would then learn to reconstruct them. This capacity-control tension is the autoencoder-anomaly-detection analogue of choosing the right flexibility everywhere else - too much and it memorizes anomalies as normal, too little and normal looks anomalous."
          }
        },
        {
          "q": "The definition of 'anomaly' is contextual and changes over time. How do you design an anomaly-detection system that stays useful, rather than a static model that degrades?",
          "a": "You design for context and drift explicitly, because a static 'normal' model becomes wrong as the world changes. (1) Context-aware normal: what's normal often depends on covariates - time of day, season, user, device, operating regime - so instead of one global normal, condition on context (separate models or features per segment, or include the context as input) so that a value normal in summer isn't flagged in winter and vice versa; this turns 'anomaly' into 'anomalous GIVEN the context', which is usually what you actually mean. (2) Continuous monitoring and retraining: normal itself drifts (user behavior evolves, systems get upgraded, fraud tactics adapt - concept shift), so monitor the score distribution and the detector's precision/recall over time, detect when the normal distribution has shifted (using the distribution-shift tests - PSI, KS - on the input features and scores), and retrain the normal model on recent clean data on a schedule or when drift is detected. (3) Feedback loop: route flagged items to human review, capture the labels (was it a true anomaly?), and feed them back to tune the threshold and, where enough labels accumulate, move toward a semi-supervised or supervised refinement - while guarding against the feedback loop biasing the training data (you only get labels on what you flagged). (4) Adaptive/streaming methods: for high-velocity data, use detectors that update online (streaming density estimates, sliding-window models) so the notion of normal tracks the recent past rather than a stale training snapshot. (5) Separate the score from the decision: keep the anomaly score stable but revisit the THRESHOLD regularly as costs, capacity, and base rates change. The overarching principle is that anomaly detection is not a train-once model but a monitored, retrained, context-conditioned system - the same lifecycle discipline as any deployed model facing distribution shift, applied to the specific challenge that 'normal' is a moving, context-dependent target.",
          "deepDive": {
            "q": "What is the danger of the feedback loop in a deployed anomaly detector, and how do you mitigate it?",
            "a": "The danger is a self-reinforcing bias: you only ever get ground-truth labels on the items the detector FLAGGED (those go to review), so the labeled data you accumulate is systematically drawn from the region of feature space the current detector already considers suspicious - you never learn about anomalies the detector silently misses, because they're never reviewed and never labeled. If you then retrain or tune the detector on this flagged-only labeled data, it gets better and better at the kinds of anomalies it already catches while remaining blind to the ones it never surfaced, and an adaptive adversary (in fraud/security) can exploit exactly the unflagged region. This is the same exploration-vs-exploitation / biased-feedback problem that shows up in recommenders and bandits (25-02): pure exploitation of the current model's beliefs stops you from discovering what you're missing. Mitigations: (1) Explore - deliberately sample and review some items OUTSIDE the flagged set (random audits of 'normal'-scored items), so you get unbiased labels on the whole distribution and can measure recall/false negatives, not just precision on flags. (2) Maintain a held-out labeled benchmark that isn't chosen by the detector, refreshed periodically, to measure true performance. (3) Use the unbiased audit labels (with appropriate weighting) when retraining, rather than only the flagged items, to avoid amplifying the existing blind spots. (4) Monitor for the tell-tale signature of blind-spot exploitation (e.g., a sudden drop in caught anomalies of a certain type). So you spend a controlled amount of review budget on exploration to keep the feedback loop honest, trading a little immediate precision for the ability to discover and correct what the detector is missing."
          }
        },
        {
          "q": "You're asked to detect anomalies but you also have a small number of labeled anomaly examples. How does that change your approach versus purely unsupervised detection?",
          "a": "Even a few labels change the approach substantially, moving you from purely unsupervised toward semi-supervised, though you rarely have enough anomalies to treat it as a standard balanced classification problem. Uses for the labeled anomalies: (1) Threshold and model selection - the single most valuable use of scarce labels is to TUNE and EVALUATE unsupervised detectors: use the labeled anomalies (plus known normals) to estimate precision/recall and PR-AUC for candidate methods and to set the operating threshold to the right point on the precision-recall trade-off, rather than guessing. Even a handful of labeled anomalies turns 'I hope this threshold is reasonable' into a measured choice. (2) Semi-supervised methods - approaches like a PU-learning (positive-unlabeled) framing, or training a classifier with the labeled anomalies as positives and a sample of unlabeled data as negatives, can sharpen detection of anomalies resembling the labeled ones. (3) Feature guidance - the labeled examples reveal which features distinguish anomalies, informing feature engineering and which subspaces to focus on. The crucial caveats: the labeled anomalies are almost certainly NOT representative of all anomaly types (anomalies are diverse and novel by nature), so a supervised classifier trained only to recognize the labeled patterns will overfit to them and miss NEW kinds of anomalies - which is exactly what unsupervised detection is good at. So the best practice is usually a hybrid: keep an unsupervised 'model the normal, flag deviations' detector as the backbone (to catch novel anomalies), and use the scarce labels to tune its threshold, evaluate it honestly, and optionally add a supervised component for the known anomaly types - never to replace the unsupervised detector entirely, because that would trade away the ability to catch the unknown-unknowns that are the whole point of anomaly detection.",
          "deepDive": {
            "q": "What is PU (positive-unlabeled) learning and why is it a natural fit when you have a few labeled anomalies and lots of unlabeled data?",
            "a": "PU learning addresses the exact situation of anomaly detection with partial labels: you have a small set of confirmed POSITIVES (labeled anomalies) and a large pool of UNLABELED data that is mostly negative (normal) but may contain some unlabeled positives (undiscovered anomalies) - and crucially you have NO confirmed negatives, because 'not flagged' doesn't mean 'confirmed normal'. Standard supervised classification can't be applied directly because it needs labeled negatives, and naively treating all unlabeled data as negative mislabels the hidden anomalies. PU learning provides principled ways to learn a classifier from just positives and unlabeled data: for example, treating the unlabeled set as noisy negatives and correcting for the known/estimated fraction of positives among them, or the two-step approach of first identifying 'reliable negatives' (unlabeled points very unlike the known positives) and then training on positives vs reliable negatives. It's a natural fit because it matches the real label structure of anomaly detection - a few known anomalies, a big unlabeled pool, no trustworthy 'this is definitely normal' labels - and it lets you extract more value from the scarce positives than pure unsupervised methods (leveraging what the labeled anomalies look like) without the fatal assumption that unlabeled = normal. Its limitation is the same as any label-leveraging method here: it sharpens detection of anomalies resembling the known positives but can't invent detection of entirely novel anomaly types, so it's best combined with an unsupervised backbone."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "intuition",
        "front": "Core idea of anomaly detection",
        "back": "Anomalies are rare/varied, so model what NORMAL looks like (usually unsupervised) and flag deviations - don't try to classify anomalies directly."
      },
      {
        "type": "definition",
        "front": "Three families of methods",
        "back": "Density (low p(x) = anomaly: GMM/KDE/LOF), isolation (easy to isolate = anomaly: Isolation Forest), boundary (outside a learned enclosure: one-class SVM)."
      },
      {
        "type": "intuition",
        "front": "How Isolation Forest scores",
        "back": "Random splits isolate anomalies in few steps (short path length) since they're 'few and different' - short average path = high anomaly score. Fast, high-dim friendly."
      },
      {
        "type": "pitfall",
        "front": "Accuracy is useless here",
        "back": "Extreme imbalance - flag nothing = ~99.9% accuracy, zero anomalies caught. Use PR-AUC, precision/recall, and precision@k (your review budget)."
      },
      {
        "type": "pitfall",
        "front": "The threshold is a cost decision",
        "back": "Score-to-flag cutoff depends on cost of a miss vs false alarm and review capacity - not 0.5 or 3-sigma. With only normal data, set it at a quantile of the normal scores."
      },
      {
        "type": "definition",
        "front": "Novelty vs outlier detection",
        "back": "Novelty: train on CLEAN normal, flag novel test points (one-class SVM). Outlier: training set is CONTAMINATED, find the outliers in it (Isolation Forest + contamination)."
      },
      {
        "type": "pitfall",
        "front": "High-dim anomaly detection",
        "back": "Curse of dimensionality blurs distance/density; anomalies often live in a subspace. Use Isolation Forest, subspace methods, PCA/autoencoder reconstruction error."
      },
      {
        "type": "intuition",
        "front": "Autoencoder reconstruction error as a score",
        "back": "Train on normal only; anomalies fall off the learned manifold and reconstruct poorly (high error = anomaly). Fails if capacity is high enough to reconstruct anything."
      }
    ],
    "refs": [
      {
        "title": "Liu, Ting, Zhou - Isolation Forest (2008)",
        "url": "https://ieeexplore.ieee.org/document/4781136"
      },
      {
        "title": "Breunig et al., LOF: Identifying Density-Based Local Outliers (2000)",
        "url": "https://dl.acm.org/doi/10.1145/342009.335388"
      },
      {
        "title": "scikit-learn: Novelty and Outlier Detection",
        "url": "https://scikit-learn.org/stable/modules/outlier_detection.html"
      },
      {
        "title": "Chandola, Banerjee, Kumar - Anomaly Detection: A Survey (2009)",
        "url": "https://dl.acm.org/doi/10.1145/1541880.1541882"
      }
    ],
    "demos": [
      "dbscan",
      "kernel-density"
    ]
  }
};
