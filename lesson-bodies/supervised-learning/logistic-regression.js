// GENERATED from content/lessons/supervised-learning/logistic-regression.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/supervised-learning/logistic-regression/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "logistic-regression": {
    "level": "intro",
    "body": {
      "intuition": [
        "Logistic regression is linear regression's classification cousin, and the two lessons deliberately rhyme. Take the same linear score w^T x, but instead of using it directly as a prediction, squash it through the sigmoid function into a number between 0 and 1 that you interpret as P(class = 1). The decision boundary - where the model is 50/50 - is exactly the linear surface w^T x = 0, so logistic regression is a linear classifier: it can only separate classes with a straight line (or hyperplane), and its power comes from what features you feed it.",
        "The name is a historical trap: logistic regression is a classification algorithm, not a regression one. What it 'regresses' is the log-odds - the logit - which is linear in the features. That's the cleanest way to think about it: the model asserts that the log-odds of the positive class is a linear function of the inputs, and the sigmoid is just the inverse transformation that turns those unbounded log-odds back into a probability in [0,1].",
        "Why train it with log-loss (cross-entropy) rather than squared error? The same maximum-likelihood logic from linear regression, but with a Bernoulli instead of a Gaussian: each label is a coin flip whose bias is the model's predicted probability, and maximizing the likelihood of the observed labels is exactly minimizing cross-entropy. Unlike squared error on top of a sigmoid (which is non-convex and has vanishing gradients when the model is confidently wrong), the log-loss is convex in the weights and has a clean gradient - the same 'prediction minus target' form that makes the whole thing trainable."
      ],
      "math": [
        {
          "h": "The model: a linear log-odds passed through a sigmoid",
          "paras": [
            "The sigmoid maps any real number to (0,1). Setting the predicted probability equal to sigmoid(w^T x) is equivalent to asserting the log-odds (logit) is the linear score w^T x. The decision boundary at probability 0.5 is where the logit is zero, i.e. the hyperplane w^T x = 0 - which is why logistic regression is a linear classifier."
          ],
          "tex": "p = \\sigma(w^\\top x) = \\frac{1}{1 + e^{-w^\\top x}} \\quad\\Longleftrightarrow\\quad \\log\\frac{p}{1-p} = w^\\top x",
          "texNote": "The left form is a probability; the right form says the log-odds is linear in x. They are the same statement - sigmoid and logit are inverses."
        },
        {
          "h": "Cross-entropy loss and its remarkably clean gradient",
          "paras": [
            "Maximizing the Bernoulli likelihood of the labels gives the cross-entropy (log) loss. Differentiating it with respect to the weights collapses to the same form as linear regression's gradient: the feature vector weighted by the prediction error (p - y), summed over examples. This is not a coincidence - it's a property of the whole exponential family (the GLM lesson), and it's why the loss is convex with well-behaved gradients."
          ],
          "tex": "\\mathcal{L}(w) = -\\sum_i \\big[y_i \\log p_i + (1-y_i)\\log(1-p_i)\\big] \\quad\\Rightarrow\\quad \\nabla_w \\mathcal{L} = \\sum_i (p_i - y_i)\\, x_i",
          "texNote": "The gradient is (prediction - target) times the input - identical in form to linear regression, which is why both train the same way despite different losses."
        }
      ],
      "code": [
        {
          "h": "Logistic regression from scratch by gradient descent",
          "paras": [
            "The full model in a few lines: sigmoid, cross-entropy gradient, gradient-descent loop - then a check against sklearn on make_moons/make_blobs style data."
          ],
          "code": "import numpy as np\nfrom sklearn.datasets import make_blobs\nfrom sklearn.linear_model import LogisticRegression\n\nX, y = make_blobs(n_samples=400, centers=2, cluster_std=2.0, random_state=0)\nX = np.c_[np.ones(len(X)), X]                      # bias column\n\ndef sigmoid(z): return 1 / (1 + np.exp(-np.clip(z, -30, 30)))  # clip avoids overflow\n\nw = np.zeros(X.shape[1])\nlr, n = 0.1, len(y)\nfor _ in range(2000):\n    p = sigmoid(X @ w)\n    grad = X.T @ (p - y) / n                        # (prediction - target) * input\n    w -= lr * grad\n\n# compare to sklearn (no penalty, to match the from-scratch MLE)\nskl = LogisticRegression(penalty=None).fit(X[:, 1:], y)\nprint('scratch acc:', ((sigmoid(X @ w) > 0.5) == y).mean())\nprint('sklearn acc:', skl.score(X[:, 1:], y))       # essentially identical",
          "caption": "Clip the sigmoid argument to avoid exp overflow; the gradient (p - y)*x is the same shape as linear regression's."
        },
        {
          "h": "The threshold is a separate decision from the model",
          "paras": [
            "The model outputs probabilities; turning them into a yes/no decision requires a threshold, and 0.5 is rarely the right one when errors have different costs or classes are imbalanced."
          ],
          "code": "import numpy as np\n\ndef metrics_at(p, y, thr):\n    pred = (p >= thr).astype(int)\n    tp = ((pred == 1) & (y == 1)).sum(); fp = ((pred == 1) & (y == 0)).sum()\n    fn = ((pred == 0) & (y == 1)).sum()\n    prec = tp / (tp + fp + 1e-9); rec = tp / (tp + fn + 1e-9)\n    return prec, rec\n\n# scanning the threshold traces out the precision/recall tradeoff (the ROC/PR curve)\nfor thr in [0.3, 0.5, 0.7]:\n    prec, rec = metrics_at(p, y, thr)\n    print(f'thr={thr}: precision={prec:.2f} recall={rec:.2f}')\n# lowering the threshold raises recall and lowers precision, and vice versa",
          "caption": "Changing the threshold moves you along the precision-recall curve - a business/cost decision the model itself doesn't make."
        }
      ],
      "useCases": [
        "The default baseline for any binary (or, via softmax, multiclass) classification problem - fast, calibrated-ish out of the box, and interpretable via log-odds coefficients.",
        "Click-through-rate and conversion prediction in ads/recommenders, where a well-calibrated probability (not just a ranking) feeds directly into an expected-value calculation (25-04).",
        "Credit scoring, medical risk, and other regulated settings where the linear log-odds structure gives directly auditable, monotonic feature effects.",
        "The softmax classification head on top of a neural network is multiclass logistic regression on learned features - this lesson is that head, trained the same way."
      ],
      "pitfalls": [
        "Using accuracy on imbalanced data: a 99%-negative dataset gives 99% accuracy to a model that predicts 'negative' always - use precision/recall, ROC-AUC, or PR-AUC and pick a threshold from the cost structure (the fraud lesson 25-05 makes this concrete).",
        "Treating 0.5 as a sacred threshold: the optimal threshold depends on the relative cost of false positives vs false negatives and the class base rate, and is often far from 0.5.",
        "Perfect separation: if a feature (or combination) perfectly separates the classes, the unregularized MLE weights diverge to infinity trying to make the sigmoid a hard step - add L2 regularization to keep weights finite.",
        "Confusing 'logistic regression is a linear classifier' with 'it can only handle linearly separable data' - it draws a linear boundary in feature space, but engineered/nonlinear features (or a kernel) let it separate nonlinear patterns.",
        "Assuming the output probabilities are automatically well-calibrated - they often are for logistic regression, but regularization, class-reweighting, and distribution shift can all break calibration, which is why 24-01's temperature scaling exists."
      ],
      "connections": [
        {
          "ref": "supervised-learning/linear-regression",
          "text": "Same linear predictor w^T x and same maximum-likelihood recipe - only the noise model (Bernoulli vs Gaussian) and link (sigmoid vs identity) change."
        },
        {
          "ref": "foundations/information-theory",
          "text": "The log-loss IS cross-entropy between the true labels and predicted probabilities - minimizing it is minimizing KL divergence to the label distribution."
        },
        {
          "ref": "supervised-learning/glm",
          "text": "Logistic regression is the Bernoulli member of the generalized-linear-model family; its clean (p - y)x gradient is the exponential-family gradient in general."
        },
        {
          "ref": "supervised-learning/svm",
          "text": "SVMs also draw a linear boundary but optimize a margin with hinge loss instead of maximizing likelihood - a useful contrast in what 'best boundary' means."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Is logistic regression a regression or classification algorithm?",
          "a": "Classification - it 'regresses' the log-odds (a linear function of x), then the sigmoid turns that into a class probability."
        },
        {
          "q": "What does logistic regression assume is linear in the features?",
          "a": "The log-odds (logit) log(p/(1-p)) = w^T x - the probability itself is a nonlinear (sigmoid) function of x."
        },
        {
          "q": "What is the decision boundary of logistic regression?",
          "a": "The hyperplane w^T x = 0 (probability 0.5) - a linear boundary, which is why it's a linear classifier."
        },
        {
          "q": "Why train with cross-entropy instead of squared error?",
          "a": "It's the Bernoulli maximum-likelihood loss, convex in the weights, with a clean gradient - squared-error-on-sigmoid is non-convex with vanishing gradients when confidently wrong."
        },
        {
          "q": "What's the gradient of the cross-entropy loss w.r.t. the weights?",
          "a": "sum_i (p_i - y_i) x_i - prediction error times the input, the same form as linear regression's gradient."
        },
        {
          "q": "Why is accuracy a bad metric on imbalanced data?",
          "a": "A trivial majority-class predictor scores high accuracy while catching zero minority cases - use precision/recall, ROC-AUC, or PR-AUC instead."
        },
        {
          "q": "Is 0.5 always the right classification threshold?",
          "a": "No - the optimal threshold depends on the cost of false positives vs false negatives and the base rate; scan the PR/ROC curve."
        },
        {
          "q": "What is perfect separation and why is it a problem?",
          "a": "When a feature perfectly splits the classes, unregularized MLE weights diverge to infinity - fix with L2 regularization."
        },
        {
          "q": "How does logistic regression extend to more than two classes?",
          "a": "Softmax (multinomial) regression - a linear score per class, normalized by softmax into a probability distribution; cross-entropy loss generalizes directly."
        },
        {
          "q": "What does ROC-AUC measure?",
          "a": "The probability the model ranks a random positive above a random negative - a threshold-independent measure of ranking quality."
        }
      ],
      "standard": [
        {
          "q": "Derive the cross-entropy gradient for logistic regression and explain why it has the same form as linear regression's gradient.",
          "a": "The per-example loss is -[y log p + (1-y) log(1-p)] with p = sigmoid(z), z = w^T x. Using dp/dz = p(1-p) (the sigmoid derivative) and the chain rule: dL/dz = dL/dp * dp/dz. dL/dp = -(y/p) + (1-y)/(1-p) = (p - y)/(p(1-p)). Multiplying by dp/dz = p(1-p) cancels the denominator, leaving dL/dz = p - y. Then dL/dw = (dL/dz)(dz/dw) = (p - y)x. Summed over examples, the gradient is sum_i (p_i - y_i) x_i - identical in form to linear regression's sum_i (pred_i - y_i) x_i. This is not a coincidence: both are members of the exponential family where the natural gradient of the negative log-likelihood is always (predicted mean - observed) times the input, a fact the GLM lesson generalizes. The clean cancellation is also why cross-entropy is the right loss - squaring the error on top of the sigmoid would leave a p(1-p) factor in the gradient that vanishes exactly when the model is most confidently wrong, stalling learning.",
          "deepDive": {
            "q": "Why is cross-entropy convex in w while squared-error-on-sigmoid is not?",
            "a": "Cross-entropy composed with the sigmoid and a linear score is a convex function of w - its Hessian is X^T diag(p_i(1-p_i)) X, which is positive semi-definite since p(1-p) >= 0, so there are no local minima. Squared error on the sigmoid, (sigmoid(w^T x) - y)^2, is non-convex in w because the sigmoid's saturation creates flat regions and multiple critical points; near a confidently-wrong prediction (p near 0 or 1) both the squared-error gradient and its curvature vanish, so gradient descent barely moves. That's why we pick the loss that matches the likelihood: it's the one that's convex and has non-vanishing gradients where you most need them."
          }
        },
        {
          "q": "Explain the difference between ROC-AUC and PR-AUC, and when you'd strongly prefer one over the other.",
          "a": "Both summarize classifier performance across all thresholds, but they plot different axes. The ROC curve plots true-positive rate (recall) against false-positive rate as the threshold varies; its area (AUC) equals the probability that a random positive is scored above a random negative - a pure ranking measure. The PR curve plots precision against recall; its area emphasizes performance on the positive class specifically. The crucial difference is behavior under class imbalance: the false-positive rate in ROC has the (large) negative count in its denominator, so even many false positives barely move it when negatives vastly outnumber positives - ROC-AUC can look reassuringly high (say 0.95) on a heavily imbalanced problem where the model is actually poor at the thing you care about. PR-AUC uses precision, whose denominator is (true + false positives), so it directly reflects how many of your positive predictions are wrong - it stays honest under imbalance. So on balanced data or when you care about ranking overall, ROC-AUC is fine; on rare-positive problems (fraud, disease, click prediction) where the positive class is what matters, prefer PR-AUC, exactly the contrast 25-05 measures (ROC-AUC 0.990 optimistic vs PR-AUC 0.607 honest).",
          "deepDive": {
            "q": "Two models have the same ROC-AUC but different PR-AUC on an imbalanced dataset. What does that tell you?",
            "a": "It tells you they rank the overall population equally well (same probability of ordering a random positive above a random negative) but differ in how cleanly they concentrate the true positives at the very top of the ranked list - PR-AUC is dominated by the high-precision, low-recall region (the top of the ranking), so the model with higher PR-AUC puts more genuine positives among its most-confident predictions. For a system that only acts on the top-K scored items (a review queue, top ads), that model is better even though ROC-AUC calls them equal - which is why precision@K is often the metric that actually matches the deployment decision."
          }
        },
        {
          "q": "A fraud model has 99.9% accuracy but the business says it's useless. Diagnose what's happening and lay out how you'd choose an operating threshold instead.",
          "a": "The dataset is almost certainly heavily imbalanced - if fraud is 0.1% of transactions, a model that predicts 'not fraud' for everything achieves 99.9% accuracy while catching zero fraud, so accuracy is measuring the base rate, not skill. The fix on the metric side is to look at precision, recall, and PR-AUC on the positive (fraud) class, not accuracy. To choose an operating threshold, I'd turn it into an explicit cost decision: assign a dollar cost to a false negative (a missed fraud) and to a false positive (a legitimate transaction wrongly blocked / a review analyst's time), then sweep the threshold and pick the one minimizing total expected cost = cost_FN * (missed frauds) + cost_FP * (false alarms). Because a missed fraud typically costs far more than a false alarm, the cost-optimal threshold is usually well below 0.5 (accept more false positives to catch more fraud), and the model's raw probability feeds a review queue rather than an automatic block - precisely the framing 25-05 quantifies (a cost-optimal threshold ~0.066 vs the 0.5 default being ~10x cheaper).",
          "deepDive": {
            "q": "Why might you deploy with a threshold that isn't cost-optimal on the offline data?",
            "a": "Offline cost-optimality assumes the offline class balance, cost estimates, and score calibration all hold at deployment - each can drift: the fraud rate changes as attackers adapt (concept shift, 24-08), the operational capacity of the review team caps how many alerts can actually be actioned (so you threshold to a fixed alert budget / precision@K rather than pure cost), and the model's probabilities may be miscalibrated on live traffic. So teams often set the threshold to hit a target review volume or a target precision, monitor realized costs, and re-tune - treating the threshold as a controlled operating point rather than a one-time offline optimum."
          }
        },
        {
          "q": "Why is logistic regression called a 'linear classifier' if it can be used to separate clearly nonlinear data? Reconcile these.",
          "a": "'Linear classifier' refers to the shape of its decision boundary in the space of features it's actually given: the boundary is the set where w^T x = 0, which is a hyperplane - linear in those features. It cannot bend that boundary. But 'the features it's given' is the escape hatch: if you engineer nonlinear features (add x1^2, x1*x2, sqrt, log, one-hot bins, or map into a higher-dimensional space via a kernel), then a boundary that's linear in the expanded feature space corresponds to a curved boundary in the original input space. So logistic regression on [x1, x2, x1^2, x2^2, x1*x2] can carve out an ellipse in the original (x1, x2) plane, even though it's still 'linear' in the five features it sees. The reconciliation: linearity is a property of the model's boundary in its own feature space, not a limit on the geometry it can represent once you choose the right features - which is exactly the job that representation learning (later modules) automates.",
          "deepDive": {
            "q": "How does this connect to what the kernel trick does for SVMs?",
            "a": "The kernel trick (SVM lesson) is the same idea made implicit and efficient: instead of manually constructing nonlinear features and paying to compute them, a kernel computes inner products in a (possibly infinite-dimensional) feature space directly, so an SVM can fit a linear boundary in that implicit space - a nonlinear boundary in the original one - without ever materializing the features. Logistic regression can be kernelized the same way; the difference from an SVM is the loss (cross-entropy vs hinge) and that SVMs' margin formulation and sparsity in support vectors make the kernelized version especially natural."
          }
        },
        {
          "q": "You train logistic regression and one weight comes back as +45 with a huge standard error, and training loss went essentially to zero. What happened and how do you fix it?",
          "a": "This is the signature of (quasi-)perfect separation: some feature or linear combination separates the two classes almost perfectly on the training data, so the maximum-likelihood optimizer keeps increasing that weight's magnitude to push the sigmoid toward a hard 0/1 step - the likelihood strictly increases as the weight grows without bound, so there's no finite optimum, the weight runs off to a huge value, its standard error explodes (the likelihood is nearly flat along that direction at large magnitude), and training loss approaches zero. It's a symptom of overfitting to a separating quirk of the sample, and the model will be wildly overconfident. The fix is regularization: adding an L2 penalty gives the objective a finite optimum (it balances likelihood gain against weight-magnitude cost), pulling the weight back to a sensible finite value and restoring stable, less-overconfident probabilities; L1 or a Bayesian prior work similarly. It's also worth checking whether the separating feature is leakage - a feature that encodes the label - which would explain 'too good' separation.",
          "deepDive": {
            "q": "Why does regularization guarantee a finite solution even under perfect separation?",
            "a": "Under perfect separation the log-likelihood is monotonically increasing but bounded above (it approaches, never reaches, zero loss) as ||w|| -> infinity in the separating direction, so no finite maximizer exists. Adding lambda*||w||^2 makes the regularized objective the sum of that bounded-above likelihood term and a term that decreases without bound as ||w|| grows - the combined objective therefore has a finite maximum where the marginal likelihood gain from growing the weight exactly balances the marginal penalty cost, guaranteeing a unique finite solution (the penalty makes the objective strictly concave). This is the same mechanism by which ridge stabilizes a singular linear regression - regularization supplies the missing curvature that pins down an otherwise-degenerate optimum."
          }
        },
        {
          "q": "When are logistic regression's output probabilities trustworthy as calibrated probabilities, and how would you check and fix calibration?",
          "a": "Unregularized logistic regression trained by maximum likelihood tends to be reasonably calibrated on the training distribution, because the MLE objective is a proper scoring rule that's minimized (in expectation) by the true conditional probabilities - so if the linear-log-odds assumption roughly holds, the outputs mean what they say. Calibration degrades when: you add strong regularization (which shrinks probabilities toward 0.5), you rebalance classes by reweighting or resampling (which shifts the implied base rate), the model is misspecified (the true log-odds isn't linear), or the deployment distribution shifts from training. To check calibration, bin predictions by confidence and plot empirical accuracy per bin against the bin's mean predicted probability (a reliability diagram) and compute Expected Calibration Error - a well-calibrated model hugs the diagonal. To fix miscalibration post-hoc, fit a one-parameter temperature (or a Platt sigmoid) on a held-out set to rescale the logits without changing the ranking, or use isotonic regression for non-monotone miscalibration - exactly the toolkit 24-01 builds from scratch.",
          "deepDive": {
            "q": "Why can a model be a perfect ranker (AUC = 1.0) yet be badly calibrated?",
            "a": "AUC depends only on the ordering of scores, not their absolute values, so a model that ranks every positive above every negative has AUC 1.0 regardless of whether its predicted probabilities are 0.51/0.49 or 0.99/0.01 - calibration is about the absolute probability level matching empirical frequency, a completely separate axis. A model can perfectly separate the classes in ranking while systematically outputting, say, 0.7 for cases that are actually right 95% of the time (underconfident) - AUC won't notice, but a reliability diagram and ECE will, and temperature scaling would sharpen the probabilities to match without touching the (already perfect) ranking."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "Logistic regression model",
        "back": "p = sigmoid(w^T x); equivalently log(p/(1-p)) = w^T x. The log-odds is linear in x; the boundary w^T x = 0 is a hyperplane."
      },
      {
        "type": "formula",
        "front": "Cross-entropy gradient",
        "back": "grad = sum_i (p_i - y_i) x_i - (prediction - target) * input, the same form as linear regression's gradient."
      },
      {
        "type": "intuition",
        "front": "Why cross-entropy, not squared error?",
        "back": "It's the Bernoulli MLE loss: convex in w, clean gradient. Squared-error-on-sigmoid is non-convex with gradients that vanish when confidently wrong."
      },
      {
        "type": "pitfall",
        "front": "Accuracy on imbalanced data",
        "back": "A majority-class predictor scores high accuracy but catches zero minority cases - use precision/recall, ROC-AUC, or PR-AUC."
      },
      {
        "type": "definition",
        "front": "ROC-AUC vs PR-AUC",
        "back": "ROC-AUC = P(rank random positive above random negative), can look high under imbalance; PR-AUC uses precision, stays honest on rare positives."
      },
      {
        "type": "pitfall",
        "front": "Perfect separation",
        "back": "A perfectly-separating feature drives unregularized MLE weights to infinity - add L2 regularization for a finite solution."
      },
      {
        "type": "pitfall",
        "front": "The 0.5 threshold",
        "back": "Not sacred - the optimal threshold depends on false-positive vs false-negative costs and the base rate; scan the PR/ROC curve."
      },
      {
        "type": "intuition",
        "front": "Linear classifier but nonlinear data?",
        "back": "The boundary is linear in the features it's given - engineered/kernel features let a linear boundary become a curve in the original input space."
      }
    ],
    "refs": [
      {
        "title": "Hastie, Tibshirani, Friedman - Elements of Statistical Learning (Ch. 4)",
        "url": "https://hastie.su.domains/ElemStatLearn/"
      },
      {
        "title": "scikit-learn: Logistic Regression",
        "url": "https://scikit-learn.org/stable/modules/linear_model.html#logistic-regression"
      },
      {
        "title": "scikit-learn: Precision-Recall and ROC",
        "url": "https://scikit-learn.org/stable/modules/model_evaluation.html#precision-recall-f-measure-metrics"
      },
      {
        "title": "Google ML Crash Course: Classification & thresholds",
        "url": "https://developers.google.com/machine-learning/crash-course/classification/thresholding"
      }
    ],
    "demos": [
      "regression",
      "classification-metrics",
      "roc"
    ],
    "demoTitles": {
      "regression": "Linear & Logistic Regression",
      "classification-metrics": "Classification Metrics",
      "roc": "ROC, PR & Thresholds"
    }
  }
};
