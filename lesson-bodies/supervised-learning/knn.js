// GENERATED from content/lessons/supervised-learning/knn.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/supervised-learning/knn/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "knn": {
    "level": "intro",
    "body": {
      "intuition": [
        "k-Nearest Neighbors is the most literal machine learning algorithm there is: to classify a new point, find the k training points closest to it and let them vote; to predict a number, average their values. There is no training phase in the usual sense - the model IS the training data. That makes kNN the canonical 'lazy' or instance-based learner: all the work happens at prediction time, when it searches the stored dataset for neighbors.",
        "The appeal is that kNN makes almost no assumptions about the shape of the decision boundary - it's non-parametric, so it can carve out arbitrarily complex regions if the data supports it. The single most important knob is k: with k=1 the model is maximally flexible (every training point owns a little territory, high variance, will fit noise), and as k grows the prediction averages over more neighbors, smoothing the boundary (higher bias, lower variance). k is a direct, visible dial on the bias-variance tradeoff.",
        "kNN's simplicity hides three real costs that make it a teaching tool more than a production default. It's expensive at prediction time (a naive search compares the query to every stored point), it's exquisitely sensitive to feature scaling and irrelevant features (distance is only as meaningful as the space it's measured in), and it degrades badly in high dimensions - the curse of dimensionality makes 'nearest' nearly meaningless when everything is roughly equidistant. Understanding why kNN breaks is as valuable as understanding why it works, because the failure modes recur throughout ML."
      ],
      "math": [
        {
          "h": "The prediction rule and distance metric",
          "paras": [
            "kNN finds the k stored points minimizing a distance to the query, then aggregates their labels (majority vote for classification, mean for regression). Euclidean distance is the default, but the metric is a modeling choice - and because distance mixes all features, their scales and relevance directly determine what 'near' means."
          ],
          "tex": "\\hat{y}(x) = \\text{vote}\\big(\\{\\, y_i : x_i \\in \\mathcal{N}_k(x) \\,\\}\\big) \\qquad d(x, x') = \\Big(\\sum_j |x_j - x'_j|^p\\Big)^{1/p}",
          "texNote": "N_k(x) is the set of k nearest training points; p=2 is Euclidean, p=1 is Manhattan. Unscaled features let one dimension dominate the distance."
        },
        {
          "h": "The curse of dimensionality: why 'nearest' loses meaning",
          "paras": [
            "As dimension d grows, points drawn from a distribution become nearly equidistant: the ratio of the gap between the farthest and nearest neighbor to the nearest distance shrinks toward zero. When every point is about as far as every other, 'the k nearest' is barely distinguishable from a random subset, and distance-based methods lose their footing."
          ],
          "tex": "\\lim_{d \\to \\infty} \\frac{\\text{dist}_{\\max}(x) - \\text{dist}_{\\min}(x)}{\\text{dist}_{\\min}(x)} \\to 0",
          "texNote": "In high dimensions the nearest and farthest neighbors are almost the same distance away - the contrast that kNN relies on vanishes."
        }
      ],
      "code": [
        {
          "h": "kNN from scratch, vectorized",
          "paras": [
            "The whole classifier: compute distances from the query to every training point, take the k smallest, vote. The vectorized distance computation is the broadcasting idea from the foundations lessons."
          ],
          "code": "import numpy as np\nfrom sklearn.datasets import load_digits\nfrom sklearn.model_selection import train_test_split\n\nX, y = load_digits(return_X_y=True)\nXtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, random_state=0)\n\ndef knn_predict(Xtr, ytr, Xq, k=5):\n    # squared distances from each query to every training point (vectorized)\n    d2 = ((Xq[:, None, :] - Xtr[None, :, :]) ** 2).sum(-1)   # (n_query, n_train)\n    nn = np.argsort(d2, axis=1)[:, :k]                       # k nearest per query\n    votes = ytr[nn]                                          # their labels\n    return np.array([np.bincount(v).argmax() for v in votes])\n\npred = knn_predict(Xtr, ytr, Xte, k=5)\nprint('kNN accuracy:', (pred == yte).mean())    # strong on digits - low-dim, scaled pixels",
          "caption": "There is no 'fit' - prediction searches the stored data. The distance step is one broadcast; the cost is O(n_train) per query."
        },
        {
          "h": "k is the bias-variance dial; scaling is mandatory",
          "paras": [
            "Sweeping k traces the bias-variance tradeoff; and putting features on different scales silently breaks the distance unless you standardize."
          ],
          "code": "import numpy as np\nfrom sklearn.neighbors import KNeighborsClassifier\nfrom sklearn.preprocessing import StandardScaler\nfrom sklearn.model_selection import cross_val_score\n\n# k sweep: k=1 overfits (high variance), large k oversmooths (high bias)\nfor k in [1, 5, 25, 101]:\n    acc = cross_val_score(KNeighborsClassifier(k), Xtr, ytr, cv=5).mean()\n    print(f'k={k:>3}: CV acc={acc:.3f}')\n\n# scaling: without it, a large-range feature dominates the distance\nX_bad = Xtr.copy(); X_bad[:, 0] *= 1000                # one feature blown up\nX_good = StandardScaler().fit_transform(X_bad)\nprint('unscaled:', cross_val_score(KNeighborsClassifier(5), X_bad, ytr, cv=5).mean())\nprint('scaled:  ', cross_val_score(KNeighborsClassifier(5), X_good, ytr, cv=5).mean())",
          "caption": "Small k = flexible/high-variance, large k = smooth/high-bias. A single unscaled large-range feature can dominate the distance and wreck accuracy."
        }
      ],
      "useCases": [
        "A strong non-parametric baseline on low-dimensional, well-scaled data - if kNN does well, the problem has clean local structure; if it fails, that's diagnostic.",
        "Recommendation and retrieval by similarity - 'users/items like this one' is a nearest-neighbor query, and the approximate-nearest-neighbor structures that scale it up (HNSW, IVF) power modern vector search (Module 12/RAG).",
        "Few-shot and prototype-based classification - averaging the nearest labeled examples is exactly the prototype/metric-learning idea in 12-03/12-04, just on learned embeddings instead of raw features.",
        "Anomaly detection - a point whose nearest neighbors are all far away is, by distance, an outlier; kNN distance is a simple, effective novelty score."
      ],
      "pitfalls": [
        "Forgetting to scale features: distance sums over all dimensions, so a feature measured in thousands dominates one measured in fractions - always standardize (or use a scale-aware metric) before kNN.",
        "The curse of dimensionality: in high dimensions all points become roughly equidistant, so 'nearest' loses meaning and kNN degrades toward random - reduce dimensions (PCA/embeddings) or use a different model.",
        "Prediction cost: a naive kNN compares each query to all n training points (O(n*d) per query), which is slow at scale - use KD-trees/ball-trees for low dimensions or approximate-nearest-neighbor indexes for high dimensions.",
        "Irrelevant features are actively harmful: unlike a tree or a regularized linear model that can down-weight them, every feature contributes equally to the distance, so noise dimensions dilute the signal - feature selection matters more for kNN than for most models.",
        "Class imbalance skews the vote: with a majority class dominating the neighborhood, minority points get outvoted - use distance-weighted voting, resampling, or adjust k, and never rely on a single even k that can tie."
      ],
      "connections": [
        {
          "ref": "foundations/python-numpy-tensor-speed",
          "text": "The vectorized pairwise-distance computation is the broadcasting-and-matmul trick from the very first foundations lesson."
        },
        {
          "ref": "foundations/complexity",
          "text": "kNN's O(n) per-query cost and the sub-linear ANN structures that fix it are a direct application of the complexity lesson's retrieval discussion."
        },
        {
          "ref": "supervised-learning/svm",
          "text": "The SVM is the sparse, margin-based classifier that keeps only borderline points; kNN is its dense, all-points, local counterpart."
        },
        {
          "ref": "supervised-learning/model-comparison",
          "text": "kNN's k is a clean example of a bias-variance hyperparameter tuned by cross-validation - the model-comparison lesson's central tool."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "How does kNN make a prediction?",
          "a": "Find the k training points nearest the query; classification votes their labels, regression averages their values. No training - the data is the model."
        },
        {
          "q": "Why is kNN called a 'lazy' learner?",
          "a": "It does no work at training time (just stores the data); all computation - the neighbor search - happens at prediction time."
        },
        {
          "q": "What does the k hyperparameter control?",
          "a": "The bias-variance tradeoff: k=1 is high-variance (flexible, fits noise), large k is high-bias (smooth, averages over more neighbors)."
        },
        {
          "q": "Why must you scale features before kNN?",
          "a": "Distance sums over all features, so an unscaled large-range feature dominates - standardize so each dimension contributes comparably."
        },
        {
          "q": "What is the curse of dimensionality for kNN?",
          "a": "In high dimensions all points become nearly equidistant, so 'nearest' loses meaning and kNN degrades toward random guessing."
        },
        {
          "q": "What's the prediction-time cost of naive kNN?",
          "a": "O(n*d) per query - it compares to all n training points; KD/ball-trees help in low dimensions, ANN indexes in high dimensions."
        },
        {
          "q": "Euclidean vs Manhattan distance - what's the difference?",
          "a": "Euclidean (L2) is straight-line distance; Manhattan (L1) sums absolute per-axis differences. L1 is less sensitive to outliers and sometimes better in high dimensions."
        },
        {
          "q": "Why are irrelevant features especially bad for kNN?",
          "a": "Every feature contributes equally to the distance, so noise dimensions dilute the signal - kNN can't down-weight them like a tree or regularized model can."
        },
        {
          "q": "Why choose an odd k for binary classification?",
          "a": "To avoid tie votes between the two classes - an odd k always has a majority."
        },
        {
          "q": "How does distance-weighted voting help?",
          "a": "It weights each neighbor's vote by inverse distance, so closer neighbors count more - reducing the influence of borderline far neighbors and ties."
        }
      ],
      "standard": [
        {
          "q": "Explain how k controls the bias-variance tradeoff in kNN, and how you'd choose it in practice.",
          "a": "k sets how many neighbors vote, which directly controls model flexibility. With k=1, each query is classified by its single nearest training point, so the decision boundary is maximally jagged - it wraps tightly around individual points, achieves zero training error, and has high variance (change the training sample and the boundary shifts a lot; it fits noise). As k increases, the prediction averages over more neighbors, smoothing the boundary: variance drops (predictions are more stable) but bias rises (the model can no longer represent fine local structure, and at the extreme k = n it just predicts the global majority class regardless of input). So k is a direct dial from the high-variance end (small k) to the high-bias end (large k). In practice you choose k by cross-validation - sweep a range of k values, evaluate held-out accuracy for each, and pick the k minimizing validation error (typically an intermediate value where the U-shaped error curve bottoms out). Use an odd k for binary problems to avoid ties, and consider distance-weighted voting to soften the discrete jumps as k changes.",
          "deepDive": {
            "q": "Why does k=1 achieve zero training error yet often generalize worse than a larger k?",
            "a": "With k=1, every training point's nearest neighbor is itself (distance zero), so it's always classified as its own label - training error is exactly zero by construction. But that perfect training fit is memorization, not generalization: the 1-NN boundary is pinned to the exact positions of the training points including any that are mislabeled or noisy, so a query landing near a noisy point inherits that noise. A larger k averages over several neighbors, so a single mislabeled or atypical neighbor gets outvoted - the model becomes robust to individual-point noise at the cost of some local resolution. This is the same reason a decision tree grown to one leaf per example, or an SVM where every point is a support vector, overfits: zero training error via memorization is a warning sign, not a success, and the honest metric is always held-out error."
          }
        },
        {
          "q": "Explain the curse of dimensionality concretely and why it's especially damaging to kNN.",
          "a": "The curse of dimensionality is the collection of counterintuitive effects that appear as the number of features grows. For kNN the critical one is distance concentration: as dimension d increases, the distances from a query to all training points become increasingly similar - specifically, the ratio (farthest distance - nearest distance) / nearest distance shrinks toward zero, so the nearest neighbor is barely closer than the farthest. When every point is roughly equidistant, the notion of 'the k nearest' carries almost no information - it's nearly a random subset - and since kNN's entire predictive power comes from the assumption that nearby points share labels, that assumption collapses. Compounding this, in high dimensions the data becomes sparse (to maintain the same density you'd need exponentially more points), so the k 'nearest' neighbors are actually far away in absolute terms and may not be locally similar at all. This hits kNN harder than parametric models because kNN makes no assumptions to fall back on: a linear or tree model imposes structure that can ignore irrelevant dimensions, while kNN weights every dimension equally in the distance and has nothing to compensate when most of them are noise.",
          "deepDive": {
            "q": "If kNN struggles in high dimensions, why does nearest-neighbor search work so well on high-dimensional embeddings in modern retrieval/RAG systems?",
            "a": "The key is that those embeddings aren't high-dimensional noise - they're learned representations where the intrinsic dimensionality (the number of dimensions along which the data actually varies) is much lower than the nominal dimension, and where semantic similarity is deliberately aligned with geometric proximity by the training objective (contrastive/metric learning, 12-03/12-04). The curse of dimensionality is really about the intrinsic dimensionality and whether distance carries signal, not the raw coordinate count - a 768-dimensional embedding where similar items are trained to be close behaves far better than 768 independent noise features. So the fix for kNN's high-dimensional failure isn't fewer nominal dimensions per se, it's a representation where distance is meaningful, which is exactly what representation learning provides and why kNN-over-learned-embeddings powers retrieval while kNN-over-raw-high-dimensional-features fails."
          }
        },
        {
          "q": "A kNN classifier that worked great in your prototype is far too slow at serving time on millions of stored examples. What's happening and what are your options?",
          "a": "The problem is kNN's lazy nature: because there's no trained model, every prediction requires searching the entire stored dataset for the nearest neighbors, which costs O(n*d) per query for a naive brute-force scan - at millions of examples and every incoming query, that's prohibitively slow. Options, depending on dimensionality: (1) For low-dimensional data (say < ~20 features), use a spatial index like a KD-tree or ball-tree, which partition space so a query only examines a small fraction of points, giving roughly O(log n) lookups. (2) For high-dimensional data (where KD-trees degrade back to near-brute-force because of the curse of dimensionality), use approximate nearest neighbor (ANN) indexes - HNSW graphs, IVF, or product quantization (as in FAISS/ScaNN) - which trade a small, controllable amount of recall for orders-of-magnitude faster sub-linear search, the same structures that power production vector search. (3) Reduce the dataset - prototype selection / condensing keeps only the boundary-relevant points, or cluster and store centroids. (4) Reduce dimensions first (PCA / a learned embedding), which both speeds search and can improve accuracy. In many production settings the right answer is an ANN index over embeddings rather than exact kNN over raw features.",
          "deepDive": {
            "q": "What's the tradeoff an approximate nearest neighbor index makes, and how do you control it?",
            "a": "An ANN index gives up the guarantee of returning the exact k nearest neighbors in exchange for dramatically faster (sub-linear) search - it returns neighbors that are very likely but not certainly the true nearest ones. The quality is measured by recall (the fraction of true nearest neighbors the approximate search actually returns), and every ANN method exposes knobs that trade recall against speed/memory: for HNSW it's the graph connectivity and the search-time exploration breadth (efSearch); for IVF it's how many clusters (nprobe) you scan; for product quantization it's the codebook size (which also trades memory and accuracy). You tune these to hit a target recall (say 0.95) at the lowest latency, accepting that a small fraction of queries get a slightly-suboptimal neighbor - usually a negligible cost for classification/retrieval accuracy but an enormous latency win, which is why exact kNN is rarely used at scale."
          }
        },
        {
          "q": "Compare kNN with a parametric model like logistic regression along the axes of assumptions, training/prediction cost, and data requirements.",
          "a": "Assumptions: kNN is non-parametric and makes essentially no global assumption about the boundary's shape - it assumes only local smoothness (nearby points share labels), so it can fit arbitrarily complex boundaries given enough data. Logistic regression is parametric and assumes the log-odds is linear in the features - a strong global assumption that's a limitation if false but a helpful prior if roughly true. Cost: they're mirror images. kNN has zero training cost (just store data) but expensive prediction (search all points per query). Logistic regression pays an upfront training cost to fit d+1 weights but then predicts in O(d) - a single dot product - making it cheap and constant-time at serving. Data requirements: kNN, being assumption-light, needs a lot of data to fill the feature space densely enough for neighbors to be genuinely similar, and that requirement grows exponentially with dimension (the curse); logistic regression, with its strong linear assumption, generalizes from far less data (its bias substitutes for data) but caps out at whatever a linear boundary can achieve. So kNN shines with abundant, low-dimensional, well-scaled data and clean local structure; logistic regression shines when data is limited, dimensionality is high, you need fast/interpretable serving, or a linear boundary is adequate.",
          "deepDive": {
            "q": "kNN has no parameters to fit - does that mean it has no 'model complexity' to control?",
            "a": "It has no parameters in the weight-vector sense, but it absolutely has model complexity, controlled by k (and the distance metric and feature set). Complexity here means effective flexibility: k=1 is an extremely high-complexity model (it can represent a boundary with as many wiggles as there are training points), while large k is low-complexity (smooth, few effective degrees of freedom) - so the effective number of parameters of kNN is often described as roughly n/k. This is why 'non-parametric' doesn't mean 'no complexity control': it means the number of effective parameters grows with the data rather than being fixed in advance, and you still regularize it - by increasing k, selecting features, or reducing dimensions - exactly as you'd tune a parametric model's complexity, just through different knobs."
          }
        },
        {
          "q": "How does kNN extend to regression, and what characteristic artifacts does kNN regression produce?",
          "a": "For regression, kNN replaces the majority vote with an average (or a distance-weighted average) of the target values of the k nearest neighbors: the prediction at a query is the mean of its neighbors' y-values. This makes kNN regression a local averaging method - it's essentially a piecewise-constant (or, with weighting, piecewise-smooth) estimator. The characteristic artifacts follow directly: (1) The prediction surface is locally flat/blocky - within a region whose k nearest neighbors are the same set of points, the prediction is constant, so the fitted function looks like a staircase rather than a smooth curve (distance weighting softens but doesn't eliminate this). (2) It cannot extrapolate: for a query beyond the range of the training inputs, the k nearest neighbors are all on the boundary of the data, so the prediction flatlines at the average of those edge points - kNN regression never predicts a value outside the range of training targets, just like a tree. (3) It's sensitive to k in the same bias-variance way: small k gives a noisy, spiky fit, large k oversmooths toward the global mean. These artifacts make kNN regression a useful conceptual and baseline tool but rarely the choice when you need smooth or extrapolating predictions.",
          "deepDive": {
            "q": "How does distance-weighted kNN regression relate to kernel regression (e.g., Nadaraya-Watson)?",
            "a": "They're on a continuum of local averaging. Distance-weighted kNN regression predicts a weighted average of the k nearest neighbors' targets, with weights decreasing in distance - it uses a hard cutoff (only the k nearest count) plus a weighting inside that set. Kernel (Nadaraya-Watson) regression generalizes this by replacing the hard k-cutoff with a smooth kernel function (e.g., Gaussian) that weights ALL training points by their distance to the query, with weight smoothly decaying to near-zero far away - so it's a soft, infinitely-supported version of the same local-averaging idea. The kernel bandwidth plays the role of k (larger bandwidth = smoother, more bias, like larger k). Both are non-parametric local averagers; kernel regression's smooth weighting removes kNN's blocky staircase artifact at the cost of summing over all points, which is why the RBF/kernel view (also seen in the SVM lesson) is the smooth cousin of nearest-neighbor averaging."
          }
        },
        {
          "q": "Your dataset is imbalanced (95% class A) and kNN predicts class A almost everywhere. Explain why and how you'd address it.",
          "a": "The issue is that kNN's vote reflects the local density of each class, and when one class massively outnumbers another, that class dominates the neighborhood of almost every query - even a genuine class-B query is likely to have several class-A points among its k nearest neighbors simply because there are 19x more of them, so the majority vote goes to A. The model isn't broken; it's faithfully reporting that A is locally denser everywhere, which is exactly what you don't want when B is the class of interest. Remedies: (1) Distance-weighted voting helps a little - a very close B neighbor can outweigh several distant A neighbors - but doesn't fix a severe imbalance alone. (2) Resample to balance the training set: undersample A or oversample B (e.g., SMOTE, which synthesizes new B points between existing ones) so the neighborhoods aren't dominated by A. (3) Adjust the decision rule rather than the raw vote - compute the class proportions among neighbors and compare against a threshold tuned for the cost tradeoff (predict B if, say, >20% of neighbors are B), which is the same threshold-is-a-cost-decision idea from logistic regression. (4) Evaluate with precision/recall/PR-AUC on class B, not accuracy, so you can actually see and optimize the minority-class performance. (5) If none suffice, a model that can weight the classes or the loss directly (weighted logistic regression, cost-sensitive trees) may simply fit imbalance better than distance voting.",
          "deepDive": {
            "q": "Why can distance-weighted voting alone be insufficient for severe imbalance, but resampling helps more directly?",
            "a": "Distance weighting rescales each neighbor's vote by proximity, but it doesn't change the fundamental fact that the k nearest neighbors are drawn from a pool that's 95% class A - if B is rare, even a B query's closest points are often A simply due to A's density, so the weighted vote still tilts toward A unless a B point happens to be extremely close. Resampling attacks the cause rather than the symptom: by balancing the training pool (removing A points or synthesizing B points), it changes which points are available to be neighbors in the first place, so a B query's neighborhood actually contains B points at a comparable rate - restoring the local class contrast that the vote depends on. In short, weighting adjusts how you count the neighbors you have; resampling adjusts which neighbors exist, and for severe imbalance you usually need the latter (or an explicit cost-adjusted threshold) rather than relying on weighting to overcome a 19-to-1 density gap."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "kNN prediction rule",
        "back": "Find the k nearest training points; vote their labels (classification) or average their values (regression). No training - the data is the model."
      },
      {
        "type": "intuition",
        "front": "k as the bias-variance dial",
        "back": "k=1: high variance (flexible, fits noise, jagged boundary). Large k: high bias (smooth, averages more). Effective params ~ n/k. Tune by CV."
      },
      {
        "type": "pitfall",
        "front": "Feature scaling for kNN",
        "back": "Distance sums over all features - an unscaled large-range feature dominates. Always standardize before kNN."
      },
      {
        "type": "formula",
        "front": "Curse of dimensionality",
        "back": "(dist_max - dist_min)/dist_min -> 0 as d grows - all points become nearly equidistant, so 'nearest' loses meaning and kNN degrades."
      },
      {
        "type": "pitfall",
        "front": "kNN prediction cost",
        "back": "O(n*d) per query (naive) - it searches all training points. KD/ball-trees for low-dim, ANN indexes (HNSW/IVF) for high-dim."
      },
      {
        "type": "pitfall",
        "front": "Irrelevant features hurt kNN",
        "back": "Every feature contributes equally to the distance, so noise dimensions dilute signal - kNN can't down-weight them like trees/regularized models can."
      },
      {
        "type": "intuition",
        "front": "Why kNN can't extrapolate",
        "back": "Beyond the training range, the k nearest neighbors are all edge points - the prediction flatlines at their average, never outside the seen target range."
      },
      {
        "type": "definition",
        "front": "Lazy (instance-based) learning",
        "back": "No training-time work - just store data; all computation (the neighbor search) happens at prediction time. kNN is the canonical example."
      }
    ],
    "refs": [
      {
        "title": "Cover & Hart, Nearest Neighbor Pattern Classification (1967)",
        "url": "https://ieeexplore.ieee.org/document/1053964"
      },
      {
        "title": "scikit-learn: Nearest Neighbors",
        "url": "https://scikit-learn.org/stable/modules/neighbors.html"
      },
      {
        "title": "Malkov & Yashunin, HNSW for approximate nearest neighbor search (2016)",
        "url": "https://arxiv.org/abs/1603.09320"
      },
      {
        "title": "Hastie, Tibshirani, Friedman - Elements of Statistical Learning (Ch. 13)",
        "url": "https://hastie.su.domains/ElemStatLearn/"
      }
    ],
    "demos": [
      "knn"
    ]
  }
};
