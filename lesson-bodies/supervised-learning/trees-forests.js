// GENERATED from content/lessons/supervised-learning/trees-forests.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/supervised-learning/trees-forests/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "trees-forests": {
    "level": "core",
    "body": {
      "intuition": [
        "A decision tree is a flowchart of yes/no questions about features that recursively partitions the input space into axis-aligned boxes, assigning each box a prediction (a class or an average value). It's the opposite of the linear models: instead of one global weighted sum, it makes local, hierarchical decisions, which lets it capture nonlinearities and feature interactions automatically - but also makes it a high-variance learner that will happily memorize the training set if you let it grow deep enough.",
        "The whole training algorithm is greedy: at each node, try every feature and every possible split threshold, score each candidate by how much it *purifies* the two resulting groups (making each side more homogeneous in the target), and take the best one - then recurse on each child. 'Purity' is measured by Gini impurity or entropy for classification, or variance reduction for regression. There's no global optimization and no backtracking; the tree is built one locally-optimal split at a time, which is fast but means a single tree is neither optimal nor stable.",
        "That instability is exactly what random forests exploit. A single deep tree overfits (high variance, low bias); averaging many trees would cancel that variance - but only if the trees are different from each other. Random forests force diversity two ways: each tree trains on a bootstrap resample of the data (bagging), and at each split only a random subset of features is considered. Averaging these decorrelated high-variance trees keeps the low bias while collapsing the variance, which is why a random forest is one of the strongest, most forgiving off-the-shelf models for tabular data."
      ],
      "math": [
        {
          "h": "Split criteria: impurity and information gain",
          "paras": [
            "A split is scored by how much it reduces impurity. Gini impurity is the probability of misclassifying a randomly-labeled sample drawn from the node's class distribution; entropy is the information-theoretic uncertainty of that distribution. The chosen split maximizes the weighted impurity drop (information gain) - the parent's impurity minus the size-weighted average impurity of the children."
          ],
          "tex": "\\text{Gini}(S) = 1 - \\sum_c p_c^2 \\qquad H(S) = -\\sum_c p_c \\log p_c \\qquad \\text{Gain} = I(S) - \\sum_{k}\\frac{|S_k|}{|S|} I(S_k)",
          "texNote": "p_c is the fraction of class c in the node; the split that maximizes Gain (parent impurity minus weighted child impurity) is chosen greedily at each node."
        },
        {
          "h": "Why averaging decorrelated trees kills variance",
          "paras": [
            "Averaging M estimators each with variance v reduces the variance of the average toward v/M only if they're independent; if they're correlated with average correlation rho, the variance floor is rho*v. Bagging and random feature selection lower rho, which is why they matter more than just averaging more identical trees - and why bias is left essentially unchanged (averaging same-bias models keeps that bias)."
          ],
          "tex": "\\text{Var}\\Big(\\tfrac{1}{M}\\sum_i T_i\\Big) = \\rho\\, v + \\frac{1-\\rho}{M}\\, v \\;\\xrightarrow{M \\to \\infty}\\; \\rho\\, v",
          "texNote": "More trees drive the second term to zero, but the irreducible floor is rho*v - so reducing tree-to-tree correlation rho (via bagging + random features) is what actually helps."
        }
      ],
      "code": [
        {
          "h": "The greedy best-split search, from scratch",
          "paras": [
            "The core of tree training: for one node, scan every feature and threshold and return the split with the largest weighted Gini decrease. This single function, applied recursively, is the whole learner."
          ],
          "code": "import numpy as np\n\ndef gini(y):\n    if len(y) == 0: return 0.0\n    p = np.bincount(y) / len(y)\n    return 1 - (p ** 2).sum()\n\ndef best_split(X, y):\n    n, d = X.shape\n    parent = gini(y)\n    best = (0.0, None, None)                     # (gain, feature, threshold)\n    for f in range(d):\n        for thr in np.unique(X[:, f]):\n            left = X[:, f] <= thr\n            if left.sum() == 0 or left.sum() == n: continue\n            child = (left.sum()*gini(y[left]) + (~left).sum()*gini(y[~left])) / n\n            gain = parent - child\n            if gain > best[0]:\n                best = (gain, f, thr)\n    return best                                   # recurse on each side with this split\n\n# a real implementation recurses until a stopping rule (max_depth, min_samples, zero gain)",
          "caption": "Greedy and local: pick the single best split now, recurse, never reconsider - fast, but neither globally optimal nor stable."
        },
        {
          "h": "A random forest vs a single tree - variance in action",
          "paras": [
            "The same data, one deep tree vs a forest: the forest's averaged predictions generalize better precisely because bagging + random features decorrelate the trees."
          ],
          "code": "from sklearn.datasets import make_classification\nfrom sklearn.tree import DecisionTreeClassifier\nfrom sklearn.ensemble import RandomForestClassifier\nfrom sklearn.model_selection import cross_val_score\n\nX, y = make_classification(n_samples=1000, n_features=20, n_informative=8, random_state=0)\n\ntree = DecisionTreeClassifier(random_state=0)                 # unbounded: overfits\nforest = RandomForestClassifier(n_estimators=200, max_features='sqrt', random_state=0)\n\nprint('single tree CV acc:', cross_val_score(tree, X, y, cv=5).mean())\nprint('random forest CV acc:', cross_val_score(forest, X, y, cv=5).mean())\n# the forest wins by averaging away the single tree's variance without adding bias",
          "caption": "max_features='sqrt' considers only a random sqrt(d) features per split - the decorrelation knob that makes averaging pay off."
        }
      ],
      "useCases": [
        "Random forests and gradient boosting are the default strong baselines for tabular data - they routinely beat neural nets on structured/heterogeneous features with far less tuning.",
        "Feature importance from trees (impurity decrease or permutation importance) is a fast, model-based read on which features matter, including nonlinear and interaction effects a linear coefficient would miss.",
        "Handling mixed types and missing values gracefully: trees split on thresholds without needing scaling or one-hot encoding, and can route missing values down a learned default branch.",
        "A single shallow tree is a highly interpretable model (a readable set of rules) for settings where an auditable decision path matters more than a few points of accuracy."
      ],
      "pitfalls": [
        "An unbounded single tree overfits almost completely - it can memorize the training set to zero error - so a lone tree needs depth/leaf-size limits or pruning; forests tolerate deep trees because averaging handles the variance.",
        "Impurity-based feature importance is biased toward high-cardinality and continuous features (they offer more split points), which can rank a noise feature above a real one - prefer permutation importance for honest rankings.",
        "Trees make axis-aligned splits, so a boundary that's diagonal in feature space needs a staircase of many splits to approximate - a place where a linear model or an engineered feature can be far more efficient.",
        "Random forests are strong but not magic on extrapolation: a tree can never predict outside the range of target values it saw in training (it averages leaf values), so they extrapolate poorly compared to a linear model.",
        "Confusing the two ensembling directions: random forests reduce variance by averaging independent deep trees (bagging), while boosting reduces bias by sequentially fitting shallow trees to residuals - they attack opposite ends of the bias-variance decomposition."
      ],
      "connections": [
        {
          "ref": "foundations/information-theory",
          "text": "Entropy as a split criterion is the same entropy from information theory; information gain is the reduction in label uncertainty from the split."
        },
        {
          "ref": "supervised-learning/boosting",
          "text": "Boosting is the other tree ensemble - sequential shallow trees fitting residuals to reduce bias, the complement to a forest's variance reduction."
        },
        {
          "ref": "supervised-learning/ensembles",
          "text": "Bagging (the forest's mechanism) is one ensembling strategy; stacking and voting combine heterogeneous models in different ways."
        },
        {
          "ref": "foundations/linear-algebra",
          "text": "Trees are the nonlinear, axis-aligned counterpoint to the linear models - useful to contrast where each wins on the same tabular data."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "How is a decision tree trained?",
          "a": "Greedily: at each node pick the feature+threshold split that most reduces impurity (Gini/entropy/variance), then recurse on each child until a stopping rule."
        },
        {
          "q": "What is Gini impurity?",
          "a": "1 - sum_c p_c^2 - the probability of misclassifying a sample labeled by the node's class distribution; 0 = pure node."
        },
        {
          "q": "Gini vs entropy - do they give very different trees?",
          "a": "Rarely - both measure node impurity and usually pick similar splits; Gini is slightly cheaper (no log), entropy is the information-theoretic version."
        },
        {
          "q": "Why does a single decision tree overfit?",
          "a": "Grown unbounded, it's a high-variance learner that can memorize the training set to zero error - it needs depth/leaf limits or pruning."
        },
        {
          "q": "What two sources of randomness does a random forest use?",
          "a": "Bootstrap resampling of the data (bagging) and a random feature subset considered at each split - both to decorrelate the trees."
        },
        {
          "q": "Why does averaging trees reduce variance but not bias?",
          "a": "Averaging same-bias estimators keeps the bias but shrinks variance toward rho*v; decorrelating (lowering rho) is what makes it work."
        },
        {
          "q": "Bagging vs boosting in one line each?",
          "a": "Bagging: average independent deep trees to cut variance. Boosting: sequentially fit shallow trees to residuals to cut bias."
        },
        {
          "q": "What's the bias in impurity-based feature importance?",
          "a": "It favors high-cardinality/continuous features (more split points) - prefer permutation importance for honest rankings."
        },
        {
          "q": "Can a random forest predict a value outside the training target range?",
          "a": "No - it averages leaf values it saw, so it extrapolates poorly compared to a linear model."
        },
        {
          "q": "Do trees need feature scaling?",
          "a": "No - splits are threshold comparisons per feature, invariant to monotone rescaling; they also handle mixed types without one-hot encoding."
        }
      ],
      "standard": [
        {
          "q": "Walk through how a decision tree decides which split to make at a node, and why the algorithm is called greedy.",
          "a": "At a node holding a subset S of the training data, the algorithm evaluates every candidate split - for each feature, every threshold that separates the sorted values - and scores it by information gain: the node's impurity minus the size-weighted average impurity of the two children it would create (impurity measured by Gini or entropy for classification, variance for regression). It picks the single split with the largest gain, partitions the data, and recurses independently on each child, stopping when a rule triggers (max depth reached, too few samples to split, or no split yields positive gain). It's 'greedy' because at each node it commits to the locally-best split without any lookahead or backtracking - it never reconsiders an earlier split in light of what happens deeper down, so the resulting tree is locally optimal at each node but not globally optimal overall. Finding the globally optimal tree is NP-hard, which is why the greedy heuristic is universal.",
          "deepDive": {
            "q": "Give a concrete example where the greedy choice is provably suboptimal.",
            "a": "The XOR problem: two binary features where the label is their XOR (class 1 iff exactly one feature is on). Neither feature alone reduces impurity at all - each split leaves both children at 50/50, so greedy information gain is zero for both features at the root, and a purely greedy criterion sees no reason to split on either. Yet splitting on feature A first and then B (or vice versa) perfectly separates the classes in two levels. A greedy tree can still stumble into this if it splits despite zero first-level gain (many implementations do try), but it illustrates the core weakness: interactions where individual features are uninformative but their combination is fully informative are exactly where one-step-lookahead greediness is blind, and it's part of why ensembles and gradient boosting (which combine many trees) recover interactions a single greedy tree may miss."
          }
        },
        {
          "q": "Explain precisely why a random forest generalizes better than a single deep tree, using the variance decomposition of an average.",
          "a": "A single deep tree has low bias (flexible enough to fit the true function) but high variance (its predictions swing a lot with the particular training sample - it partly memorizes noise). Averaging M trees produces an ensemble whose bias equals the individual trees' bias (averaging same-bias models doesn't change bias) but whose variance is rho*v + (1-rho)/M * v, where v is a single tree's variance and rho is the average pairwise correlation between tree predictions. As M grows, the second term vanishes, leaving a variance floor of rho*v. So the ensemble keeps the low bias of deep trees while cutting variance - but only to the extent the trees are decorrelated (small rho). That's the whole reason random forests inject two independent sources of randomness: bootstrap resampling means each tree sees a different data sample, and considering only a random feature subset at each split prevents all trees from keying on the same one or two dominant features - both actively lower rho, pushing the variance floor down further than simply averaging more identical trees ever could.",
          "deepDive": {
            "q": "Why does considering only sqrt(d) features per split help, even though it makes each individual tree slightly worse?",
            "a": "Restricting each split to a random sqrt(d)-feature subset forces different trees to rely on different features, which lowers the pairwise correlation rho far more than it raises each tree's individual variance v - and since the ensemble's variance floor is rho*v, the net effect on the average is a reduction. Each tree becomes a slightly weaker, more idiosyncratic learner (higher individual error), but the ensemble is stronger because the errors are now less correlated and average out more completely; it's the counterintuitive lesson that deliberately weakening and diversifying the base learners improves the whole - the same principle behind why bagging wants high-variance base learners in the first place."
          }
        },
        {
          "q": "Your random forest's feature importances rank a random ID-like column near the top. What's going on and how do you get a trustworthy ranking?",
          "a": "This is the classic bias of impurity-based (mean-decrease-in-impurity) feature importance toward high-cardinality features. A column with many distinct values (an ID, a continuous variable, a timestamp) offers many candidate split points, so purely by chance some of those splits will reduce impurity on the training sample even if the feature is pure noise - the greedy split search can always find a threshold that carves the training data slightly better, and that spurious gain gets credited as importance. The fix is permutation importance: after training, measure the model's accuracy on held-out data, then randomly shuffle one feature's values (breaking its relationship with the target) and measure how much accuracy drops - a genuinely important feature causes a large drop, a noise feature causes ~none, and crucially this is computed on data the model didn't train on, so a high-cardinality noise column that only helped by memorizing the training sample shows near-zero permutation importance. SHAP values (19-05) are another principled, though costlier, alternative.",
          "deepDive": {
            "q": "Why can permutation importance itself be misleading when features are correlated?",
            "a": "When two features are highly correlated, permuting one alone creates unrealistic feature combinations (the model is evaluated on inputs off the data manifold) and the model can still recover the shuffled feature's information from its correlated partner, so each of the two correlated-but-important features can show deflated importance (the credit is split or the model routes around the permutation) - the same correlated-feature attribution pitfall 19-05 and 24-04 flag. Remedies include permuting correlated groups together, using conditional permutation schemes, or SHAP with a correlation-aware background - the general lesson being that any single-feature importance measure is fragile under correlation and should be read as a group-level or directional signal, not a precise per-feature ranking."
          }
        },
        {
          "q": "Contrast how random forests and gradient boosting each use trees, and when you'd prefer one over the other.",
          "a": "Both are tree ensembles but attack opposite ends of the bias-variance decomposition. A random forest trains many deep (low-bias, high-variance) trees independently and in parallel on bootstrap samples with random features, then averages them - the averaging cancels variance, and because the trees are independent it's robust and hard to overfit by adding more trees (more trees only reduce variance further). Gradient boosting trains many shallow (high-bias, low-variance) trees sequentially, where each new tree fits the residual errors of the current ensemble - this progressively reduces bias, building a strong learner from weak ones, but because it keeps fitting the training signal it can overfit if you add too many trees or set the learning rate too high, so it needs early stopping and careful regularization. In practice: reach for a random forest when you want a strong, low-tuning, robust baseline that's hard to break; reach for gradient boosting (XGBoost/LightGBM) when you want maximum accuracy and are willing to tune learning rate, tree depth, and number of trees - it usually wins on tabular leaderboards but is more sensitive to its hyperparameters.",
          "deepDive": {
            "q": "Why does a random forest not overfit much as you add trees, while boosting does?",
            "a": "Adding trees to a random forest only ever reduces the variance term of the averaged prediction (more independent draws averaged) - it doesn't change the bias and doesn't fit the training signal any harder, so test error monotonically decreases then plateaus; you essentially can't overfit by adding trees (though individual trees being too deep is a separate matter). Boosting is fundamentally different: each added tree fits the current residuals, so the ensemble keeps reducing training error and increasing model complexity with every tree - past the optimal count it starts fitting noise in the residuals, and test error turns back up. That's why the number of trees is a regularization hyperparameter to be tuned (with early stopping) in boosting, but essentially just 'more is fine, with diminishing returns' in a random forest."
          }
        },
        {
          "q": "A single decision tree gives you a clean, interpretable set of rules but mediocre accuracy; a random forest is far more accurate but a black box. How do you think about this tradeoff, and can you recover some interpretability from the forest?",
          "a": "This is the interpretability-accuracy tradeoff in its clearest form. A single shallow tree is directly readable - you can trace the exact rule path for any prediction and hand it to a domain expert or a regulator - but it pays for that with the high variance and limited accuracy of a single greedy partition. A forest recovers accuracy by averaging hundreds of trees, but no single readable rule path exists anymore. You don't have to treat it as fully opaque, though: you can extract global feature importances (permutation-based for honesty), partial dependence / ICE plots to see the average and per-instance effect of a feature on predictions (19-05), and per-prediction attributions via SHAP to explain individual decisions. The practical stance depends on the stakes: in a high-regulation setting where the decision path itself must be auditable (credit adjudication), a slightly-worse-but-transparent single tree or a monotonic GAM may be required by policy; where accuracy dominates and post-hoc explanation suffices, the forest plus SHAP is usually the better package. The key honesty point (24-04) is that these post-hoc explanations approximate the model's behavior - they're not the same as the model being inherently interpretable.",
          "deepDive": {
            "q": "Why is a post-hoc explanation of a forest fundamentally weaker than the transparency of a single tree?",
            "a": "A single tree's rule path IS the computation - the explanation and the model are identical, so it's faithful by construction. A post-hoc method (SHAP, permutation importance, surrogate trees) is a separate, simpler approximation of a complex model's input-output behavior, so it can be locally inaccurate, unstable across similar inputs, or plausible-looking while not reflecting the true reason for a prediction - the plausibility-vs-faithfulness gap 24-04 measures. It's a real, useful lens, but it introduces a second model whose fidelity to the first must itself be checked, whereas the single tree needs no such check."
          }
        },
        {
          "q": "What is out-of-bag (OOB) error in a random forest, and why is it a useful and nearly free validation estimate?",
          "a": "Each tree in a random forest is trained on a bootstrap sample - drawn with replacement, so on average about 63% of the original examples appear in a given tree's training set and the remaining ~37% are 'out of bag' for that tree. The OOB prediction for an example is formed by averaging (or voting) only over the trees for which that example was out of bag - i.e., trees that never saw it in training - and the OOB error aggregates these across all examples. This gives an unbiased-ish estimate of generalization error essentially for free, without a separate held-out set or a cross-validation loop, because every example is being predicted only by trees that didn't train on it. It's especially handy when data is limited (no need to sacrifice a validation split) or when you want a quick generalization check while tuning the number of trees.",
          "deepDive": {
            "q": "Where does the ~63% / ~37% split come from, and when is OOB error a poor substitute for cross-validation?",
            "a": "Drawing n samples with replacement from n items, the probability a specific item is never picked is (1 - 1/n)^n, which converges to 1/e ~ 0.368 as n grows - so ~37% are out of bag and ~63% in bag per tree. OOB error is a good, cheap proxy in most cases, but it becomes unreliable when the number of trees is small (each example is then averaged over few OOB trees, so the estimate is noisy), and it doesn't respect grouped or time-ordered structure - if your data has correlated groups (multiple rows per user) or temporal ordering, OOB (like plain k-fold) can leak information across the bootstrap boundary, and you'd need grouped or time-series cross-validation to get an honest estimate, exactly the leakage concern 25-10 raises for any validation scheme."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Decision tree training",
        "back": "Greedy recursive partitioning: at each node pick the split that most reduces impurity (Gini/entropy/variance), recurse until a stopping rule."
      },
      {
        "type": "formula",
        "front": "Gini impurity",
        "back": "1 - sum_c p_c^2 - probability of misclassifying a sample drawn from the node's class distribution; 0 = pure."
      },
      {
        "type": "formula",
        "front": "Variance of an average of M trees",
        "back": "rho*v + (1-rho)/M * v -> rho*v as M grows. Floor is set by tree-to-tree correlation rho, so decorrelation matters most."
      },
      {
        "type": "definition",
        "front": "Random forest = two randomizations",
        "back": "Bootstrap resampling (bagging) + random feature subset per split - both decorrelate deep trees so averaging cancels variance without adding bias."
      },
      {
        "type": "intuition",
        "front": "Bagging vs boosting",
        "back": "Bagging (forests): average independent deep trees to cut variance. Boosting: sequential shallow trees on residuals to cut bias. Opposite ends of bias-variance."
      },
      {
        "type": "pitfall",
        "front": "Impurity importance bias",
        "back": "Favors high-cardinality/continuous features (more split points) - can rank noise above signal. Use permutation importance instead."
      },
      {
        "type": "pitfall",
        "front": "Trees can't extrapolate",
        "back": "A tree averages leaf values it saw, so it never predicts outside the training target range - poor extrapolation vs a linear model."
      },
      {
        "type": "definition",
        "front": "Out-of-bag (OOB) error",
        "back": "Predict each example using only the ~37% of trees that didn't train on it - a near-free unbiased generalization estimate, no separate validation split."
      }
    ],
    "refs": [
      {
        "title": "Breiman, Random Forests (2001)",
        "url": "https://link.springer.com/article/10.1023/A:1010933404324"
      },
      {
        "title": "Hastie, Tibshirani, Friedman - Elements of Statistical Learning (Ch. 9, 15)",
        "url": "https://hastie.su.domains/ElemStatLearn/"
      },
      {
        "title": "scikit-learn: Decision Trees & Ensembles",
        "url": "https://scikit-learn.org/stable/modules/tree.html"
      },
      {
        "title": "scikit-learn: Permutation feature importance",
        "url": "https://scikit-learn.org/stable/modules/permutation_importance.html"
      }
    ],
    "demos": [
      "decision-tree",
      "bagging-boosting"
    ],
    "demoTitles": {
      "decision-tree": "Decision Tree",
      "bagging-boosting": "Bagging vs Boosting"
    }
  }
};
