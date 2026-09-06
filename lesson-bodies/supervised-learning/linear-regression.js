// GENERATED from content/lessons/supervised-learning/linear-regression.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/supervised-learning/linear-regression/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "linear-regression": {
    "level": "intro",
    "body": {
      "intuition": [
        "Linear regression fits the simplest useful model: predict a continuous target as a weighted sum of features plus a bias. It is worth studying far beyond its own usefulness, because almost every idea in the rest of machine learning is visible here in its cleanest form - a hypothesis class, a loss function, an optimization method, and the bias-variance tension - with none of the complexity that a neural network layers on top.",
        "There are two ways to find the best weights, and understanding why they give the same answer is the whole lesson. The normal equation solves for the optimum in one shot by setting the gradient of squared error to zero - a closed-form linear-algebra solution. Gradient descent instead walks downhill on the same loss surface. For linear regression the loss is a convex bowl (a quadratic in the weights), so both roads lead to the identical global minimum; the choice between them is purely about computational cost as the data grows.",
        "The least-squares objective is not an arbitrary choice of 'squared' over 'absolute' error - it falls out of a probabilistic assumption. If you assume the target equals the linear prediction plus Gaussian noise, then maximizing the likelihood of the data is exactly minimizing squared error. That single insight (least squares = maximum likelihood under Gaussian noise) is the template for every loss function you'll meet later, and it's why the same math reappears when we get to logistic regression and generalized linear models."
      ],
      "math": [
        {
          "h": "The normal equation: setting the gradient to zero",
          "paras": [
            "Stack the training inputs into a design matrix X (each row an example, plus a column of ones for the bias) and targets into a vector y. The squared-error loss is a quadratic in the weight vector w; its gradient is linear in w, so setting it to zero gives a single linear system whose solution is the closed-form least-squares estimate. This is exact - no iteration, no learning rate - but forming and inverting X^T X costs O(d^3) in the number of features, which is why it's used for modest d and gradient descent takes over when d or n is large."
          ],
          "tex": "\\mathcal{L}(w) = \\lVert Xw - y \\rVert^2 \\;\\Rightarrow\\; \\nabla_w \\mathcal{L} = 2X^\\top(Xw - y) = 0 \\;\\Rightarrow\\; \\hat{w} = (X^\\top X)^{-1} X^\\top y",
          "texNote": "The optimum is where the residual (Xw - y) is orthogonal to every column of X - geometrically, the prediction is the projection of y onto the column space of X."
        },
        {
          "h": "Why squared error = maximum likelihood under Gaussian noise",
          "paras": [
            "Assume each target is the linear prediction corrupted by independent Gaussian noise of constant variance. The log-likelihood of the whole dataset is then a sum of squared residuals (up to constants that don't depend on w), so maximizing likelihood over w is identical to minimizing squared error. Change the noise assumption and you change the loss: heavy-tailed (Laplace) noise gives absolute error, and a different response distribution entirely gives the generalized linear models of a later lesson."
          ],
          "tex": "y_i = w^\\top x_i + \\varepsilon_i,\\; \\varepsilon_i \\sim \\mathcal{N}(0, \\sigma^2) \\;\\Rightarrow\\; \\arg\\max_w \\prod_i p(y_i \\mid x_i) = \\arg\\min_w \\sum_i (y_i - w^\\top x_i)^2",
          "texNote": "The Gaussian's exponent is a negative squared term - taking the log turns the product of likelihoods into the negative sum of squared errors."
        }
      ],
      "code": [
        {
          "h": "Both roads to the same weights, from scratch",
          "paras": [
            "The normal equation in one line, and gradient descent converging to the same answer on the California Housing data - a concrete demonstration that on a convex loss they agree."
          ],
          "code": "import numpy as np\nfrom sklearn.datasets import fetch_california_housing\nfrom sklearn.preprocessing import StandardScaler\n\nX, y = fetch_california_housing(return_X_y=True)\nX = StandardScaler().fit_transform(X)          # scaling matters for gradient descent\nX = np.c_[np.ones(len(X)), X]                   # prepend a bias column\n\n# 1) normal equation: closed form\nw_closed = np.linalg.solve(X.T @ X, X.T @ y)     # solve, don't invert explicitly\n\n# 2) gradient descent on the same MSE loss\nw = np.zeros(X.shape[1])\nlr, n = 0.1, len(y)\nfor _ in range(500):\n    grad = (2/n) * X.T @ (X @ w - y)             # gradient of mean squared error\n    w -= lr * grad\n\nprint('max |w_gd - w_closed|:', np.abs(w - w_closed).max())  # ~1e-3, converging to the same optimum",
          "caption": "np.linalg.solve is preferred over forming (X^T X)^-1 explicitly - it's faster and numerically more stable."
        },
        {
          "h": "Ridge regularization: trading a little bias for less variance",
          "paras": [
            "Adding an L2 penalty on the weights shrinks them toward zero, which stabilizes the solution when features are correlated or n is small - the closed form just adds lambda to the diagonal, guaranteeing the matrix is invertible."
          ],
          "code": "import numpy as np\n\ndef ridge_closed_form(X, y, lam):\n    d = X.shape[1]\n    A = X.T @ X + lam * np.eye(d)          # lambda on the diagonal\n    return np.linalg.solve(A, X.T @ y)\n\n# lambda = 0 recovers ordinary least squares; larger lambda shrinks weights toward 0\nw0   = ridge_closed_form(X, y, lam=0.0)\nw100 = ridge_closed_form(X, y, lam=100.0)\nprint('||w|| ols :', np.linalg.norm(w0))\nprint('||w|| ridge:', np.linalg.norm(w100))   # smaller - shrinkage in action",
          "caption": "The +lambda*I term is what makes ridge always solvable even when X^T X is singular (perfectly correlated features)."
        }
      ],
      "useCases": [
        "A baseline for every regression problem - if a linear model already does well, a heavier model needs to justify its cost; if it does poorly, that itself is information about nonlinearity.",
        "Interpretable coefficient analysis - the sign and magnitude of each standardized weight is a first read on which features drive the target (with the correlation caveats below).",
        "The final layer of most neural networks IS a linear regression/classification head on top of learned features - this lesson is that head in isolation.",
        "Ridge and Lasso (L2/L1 regularized linear regression) remain strong, fast, hard-to-beat baselines on tabular data, especially when n is not much larger than d."
      ],
      "pitfalls": [
        "Correlated features make individual coefficients unstable and uninterpretable (multicollinearity): the model's predictions can be fine while any single weight swings wildly, because the features can substitute for each other - never read a single coefficient as 'the effect of this feature' without checking correlations.",
        "Forgetting to scale features before gradient descent: features on very different scales create an ill-conditioned loss surface (the elongated-bowl zig-zag from the calculus lesson), so gradient descent crawls - standardize first.",
        "The normal equation's O(d^3) cost and numerical instability when X^T X is near-singular (correlated features) - use np.linalg.solve or a QR/SVD-based least-squares solver, not an explicit matrix inverse.",
        "Extrapolation: a linear fit says nothing reliable outside the range of the training inputs, yet the formula will happily return a confident-looking number for any input.",
        "R^2 is not a goodness certificate - it can be high for a badly mis-specified model and always increases as you add features, which is why adjusted R^2 or a held-out validation score is the honest metric."
      ],
      "connections": [
        {
          "ref": "foundations/calculus",
          "text": "Gradient descent on the MSE loss is the calculus lesson's update rule applied to a convex quadratic - the one case where it provably reaches the global optimum."
        },
        {
          "ref": "foundations/linear-algebra",
          "text": "The normal equation is a projection onto a column space; the least-squares solution is exactly the linear-algebra idea of orthogonal projection."
        },
        {
          "ref": "supervised-learning/logistic-regression",
          "text": "Logistic regression is this same linear predictor passed through a sigmoid and trained by maximum likelihood under a Bernoulli (not Gaussian) noise model."
        },
        {
          "ref": "supervised-learning/glm",
          "text": "Generalized linear models generalize exactly the 'least squares = MLE under Gaussian noise' argument to other response distributions via a link function."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "Write the normal equation for least squares.",
          "a": "w = (X^T X)^-1 X^T y - the closed-form minimizer of squared error."
        },
        {
          "q": "Why is least-squares loss squared error and not absolute error?",
          "a": "Squared error is the maximum-likelihood objective under an assumption of Gaussian noise on the target; absolute error corresponds to Laplace noise."
        },
        {
          "q": "Is the linear-regression loss surface convex?",
          "a": "Yes - it's a quadratic (positive semi-definite Hessian X^T X), so it has a single global minimum and gradient descent can't get stuck."
        },
        {
          "q": "Normal equation vs gradient descent - when do you pick each?",
          "a": "Normal equation for modest feature counts (its O(d^3) cost is fine); gradient descent when d or n is large, or the data streams."
        },
        {
          "q": "What does ridge (L2) regularization do to the weights?",
          "a": "Shrinks them toward zero - trades a little bias for reduced variance, and makes X^T X + lambda*I always invertible."
        },
        {
          "q": "Why standardize features before gradient descent?",
          "a": "Different feature scales make the loss surface ill-conditioned, so gradient descent zig-zags and converges slowly; scaling makes the bowl round."
        },
        {
          "q": "What is multicollinearity and why does it matter?",
          "a": "Correlated features make individual coefficients unstable/uninterpretable, though predictions can remain fine - the features substitute for each other."
        },
        {
          "q": "Geometric interpretation of the least-squares solution?",
          "a": "The prediction Xw is the orthogonal projection of y onto the column space of X; the residual is perpendicular to every feature column."
        },
        {
          "q": "Does R^2 always increase when you add a feature?",
          "a": "Yes - which is why it's not a model-selection metric; use adjusted R^2 or held-out validation error instead."
        },
        {
          "q": "Why prefer np.linalg.solve over inverting X^T X directly?",
          "a": "It's faster and numerically more stable - explicitly forming a matrix inverse amplifies rounding error, especially when X^T X is near-singular."
        }
      ],
      "standard": [
        {
          "q": "Derive the normal equation by minimizing squared error, and explain the geometric meaning of the solution.",
          "a": "The loss is L(w) = ||Xw - y||^2 = (Xw-y)^T(Xw-y). Expanding and differentiating with respect to w gives the gradient 2X^T(Xw - y); setting it to zero yields the normal equations X^T X w = X^T y, so w = (X^T X)^-1 X^T y when X^T X is invertible. Geometrically, the condition X^T(Xw - y) = 0 says the residual vector (Xw - y) is orthogonal to every column of X - i.e., to the entire column space that Xw lives in. That's exactly the definition of an orthogonal projection: the least-squares prediction Xw is the point in the column space of X closest to y, and the residual is the component of y perpendicular to that space. This is why least squares is sometimes called 'projecting y onto the feature space'.",
          "deepDive": {
            "q": "What happens to this solution when X^T X is singular, and how do ridge regression and the pseudoinverse each handle it?",
            "a": "X^T X is singular when features are linearly dependent (perfect multicollinearity) or when d > n - there are then infinitely many weight vectors achieving the same minimal loss, so the inverse doesn't exist. The Moore-Penrose pseudoinverse resolves this by picking the minimum-norm solution among all minimizers (via the SVD), while ridge regression adds lambda*I to X^T X, which makes it strictly positive-definite hence invertible and, as lambda -> 0, the ridge solution approaches that same minimum-norm pseudoinverse solution - so ridge is both a regularizer and a numerical stabilizer for the degenerate case."
          }
        },
        {
          "q": "Show that minimizing squared error is equivalent to maximum likelihood estimation under a Gaussian noise model, and explain why that framing matters.",
          "a": "Assume y_i = w^T x_i + eps_i with eps_i ~ N(0, sigma^2) i.i.d. Then p(y_i | x_i, w) = (1/sqrt(2*pi*sigma^2)) * exp(-(y_i - w^T x_i)^2 / (2 sigma^2)). The log-likelihood of the dataset is sum_i log p(y_i|x_i,w) = -1/(2 sigma^2) * sum_i (y_i - w^T x_i)^2 + constant. Maximizing this over w drops the constant and the positive 1/(2 sigma^2) factor, leaving arg min_w sum_i (y_i - w^T x_i)^2 - exactly the least-squares objective. This framing matters because it turns 'why squared error?' from an arbitrary aesthetic choice into a consequence of an explicit modeling assumption you can inspect and change: if the noise is heavy-tailed, a Laplace assumption gives absolute-error (L1) loss which is more robust to outliers; if the target is a count or a probability, a different exponential-family distribution gives the losses used in Poisson/logistic regression. Every loss function is a likelihood in disguise.",
          "deepDive": {
            "q": "How does adding a Gaussian prior on the weights connect this to ridge regression?",
            "a": "Placing a zero-mean Gaussian prior w ~ N(0, tau^2 I) and doing maximum a posteriori (MAP) estimation adds the log-prior -||w||^2/(2 tau^2) to the log-likelihood; maximizing the posterior then minimizes sum_i (y_i - w^T x_i)^2 + (sigma^2/tau^2)||w||^2, which is ridge regression with lambda = sigma^2/tau^2. So L2 regularization is a Gaussian prior on the weights, and the regularization strength is the ratio of noise variance to prior variance - a stronger belief that weights are small (smaller tau) means more shrinkage (this is the same MLE / MAP=regularization identity that 25-09 proves numerically)."
          }
        },
        {
          "q": "A colleague reports their linear model has R^2 = 0.95 on the training data and concludes it's an excellent model. What questions do you ask, and what could be going wrong?",
          "a": "First: is that R^2 on training or held-out data? Training R^2 is nearly meaningless for model quality because it only ever increases as you add features - a model with as many parameters as data points can hit R^2 = 1.0 while generalizing terribly (overfitting). I'd ask for the R^2 (or better, RMSE) on a held-out validation/test set, and how many features vs how many training examples there are. Second: even a high held-out R^2 doesn't validate the model's assumptions - I'd want to see a residual plot, because a linear model can have high R^2 while systematically mis-fitting (residuals showing curvature means a linear form is wrong even if it 'explains 95% of variance'), and heteroscedastic residuals (fanning out) violate the constant-variance assumption behind the least-squares/Gaussian derivation. Third: is there leakage - a feature that's a proxy for the target, or normalization statistics computed on the full dataset before splitting - which can inflate R^2 spuriously.",
          "deepDive": {
            "q": "Why can a model have a high R^2 but still be useless for the decision it's meant to support?",
            "a": "R^2 measures fraction of variance explained on the data distribution you trained on, but the decision might depend on a specific regime (e.g., the tails, or a subgroup) where the model is weak - averaging hides concentrated failure, exactly the aggregate-vs-slice lesson from 24-09/25-10. It also says nothing about calibration of uncertainty, about performance under distribution shift at deployment, or about whether the explained variance comes from a feature that won't be available (or will have changed meaning) at prediction time - so a high aggregate R^2 is necessary-ish but nowhere near sufficient for 'this model is good for its purpose'."
          }
        },
        {
          "q": "Explain the bias-variance tradeoff in the concrete setting of choosing polynomial degree for a regression, and how regularization gives you a continuous knob on it.",
          "a": "Fitting a degree-d polynomial is still linear regression - it's linear in the coefficients of the basis functions [1, x, x^2, ..., x^d]. A low degree (say 1) has high bias: it's too rigid to capture curvature, underfits, and has large error on both train and test. A high degree has high variance: it's flexible enough to chase the noise in the training sample, so it fits training data almost perfectly but its predictions swing wildly with different training draws, giving large test error. The total expected test error decomposes as bias^2 + variance + irreducible noise, and it's U-shaped in degree - it bottoms out at the degree that balances the two. Regularization (ridge) turns this discrete degree choice into a continuous dial: with a high degree but a nonzero lambda, the penalty shrinks the high-order coefficients toward zero, effectively reducing the model's variance without forcing you to pick an integer degree - increasing lambda moves you smoothly from the high-variance end toward the high-bias end, and you pick the lambda that minimizes held-out error.",
          "deepDive": {
            "q": "Why does the bias-variance decomposition assume you could resample the training set, and what does that imply about a single fixed dataset?",
            "a": "The decomposition is an expectation over random training sets drawn from the data distribution: 'variance' literally means how much the fitted model changes if you'd gotten a different training sample of the same size, and 'bias' is the error of the average-over-training-sets model. On a single fixed dataset you can't observe this directly - which is why we estimate it empirically by resampling (bootstrap / cross-validation), as the bias-variance-decomp demo does by refitting on many resampled training sets and measuring how predictions at a fixed test point spread out; the spread is the variance, the offset of their mean from truth is the bias."
          }
        },
        {
          "q": "Walk through why gradient descent converges to the same solution as the normal equation for linear regression, but not necessarily for a neural network with the same final linear layer.",
          "a": "For linear regression the loss L(w) = ||Xw - y||^2 is convex in w - specifically a quadratic with Hessian 2 X^T X, which is positive semi-definite - so it has no local minima other than the global one(s); every point where the gradient is zero is a global minimum. Gradient descent with a small enough learning rate on a convex function is guaranteed to converge to that global minimum, which is exactly what the normal equation computes in closed form, so the two must agree (up to the iterative method's tolerance). A neural network breaks the convexity: even though its final layer is a linear map, the composition of that layer with the nonlinear hidden layers makes the loss a non-convex function of all the parameters jointly - there are many local minima and saddle points, the loss surface depends on the earlier layers' weights, and gradient descent converges to one of many critical points depending on initialization and the optimization path. So the clean 'both roads reach the same place' property is special to the convex case; it's the reason linear regression is the one model where we can fully characterize the optimum.",
          "deepDive": {
            "q": "If you froze all of a neural network's layers except the final linear one, would training that last layer alone be convex again?",
            "a": "Yes - with all earlier layers frozen, the hidden layers just produce a fixed feature representation phi(x), and training only the final linear layer is ordinary linear (or logistic) regression on those fixed features phi(x), which is convex and has the same 'gradient descent = closed form' guarantee; this is precisely why linear-probing a frozen pretrained backbone (as in the self-supervised lessons 09-06/12-04) is a stable, well-behaved way to evaluate a representation - the only non-convexity in a deep net comes from jointly optimizing the feature extractor and the head together."
          }
        },
        {
          "q": "Compare Lasso (L1) and Ridge (L2) regularization for linear regression: what does each do geometrically, and when would you reach for one over the other?",
          "a": "Both add a penalty on the weights to the squared-error loss, but the penalty's shape differs: Ridge penalizes sum of squared weights (L2 norm), Lasso penalizes sum of absolute weights (L1 norm). Geometrically, minimizing the loss subject to a weight-norm budget means the elliptical contours of the squared-error loss expand until they touch the constraint region - for Ridge that region is a ball (smooth, no corners), so the touch point almost never has any coordinate exactly zero, giving small-but-nonzero weights; for Lasso the region is a diamond (corners on the axes), and the loss contour very often first touches at a corner, which sets some weights to exactly zero. So Lasso performs automatic feature selection (a sparse solution, useful when you believe only a few features matter and want an interpretable subset), while Ridge shrinks all weights smoothly (better when many features each contribute a little, or when correlated features should be kept together rather than arbitrarily dropped). In practice you reach for Lasso when sparsity/selection is the goal, Ridge when you want stable shrinkage under multicollinearity, and Elastic Net (a weighted mix) when you want some of both.",
          "deepDive": {
            "q": "Why does Lasso produce exactly-zero weights while Ridge only shrinks toward zero, in terms of the penalty's gradient?",
            "a": "The L1 penalty |w| has a constant-magnitude gradient (sign(w)) that doesn't vanish as w approaches zero, so it keeps pushing a weight all the way to exactly zero and holds it there (there's a 'kink' at zero where the subgradient spans a range that can balance the data gradient) - this is the soft-thresholding operation that 25-08's from-scratch coordinate-descent lasso makes explicit. The L2 penalty w^2 has gradient 2w, which shrinks proportionally to the current weight and thus vanishes as w -> 0, so it asymptotically approaches but never forces exactly zero - the shrinkage gets weaker the smaller the weight already is, leaving every weight nonzero."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "Normal equation",
        "back": "w = (X^T X)^-1 X^T y - closed-form least-squares minimizer; geometrically, project y onto the column space of X."
      },
      {
        "type": "intuition",
        "front": "Least squares = MLE under what noise?",
        "back": "Gaussian (constant-variance) noise on the target - the Gaussian's squared exponent becomes the squared-error loss after taking logs."
      },
      {
        "type": "definition",
        "front": "Ridge (L2) regularization",
        "back": "Add lambda*||w||^2 to the loss; closed form adds lambda*I to X^T X. Shrinks weights, trades bias for variance, guarantees invertibility."
      },
      {
        "type": "intuition",
        "front": "Why is linear regression's loss easy to optimize?",
        "back": "It's convex (quadratic, PSD Hessian X^T X) - one global minimum, so gradient descent and the normal equation reach the same answer."
      },
      {
        "type": "pitfall",
        "front": "Multicollinearity",
        "back": "Correlated features make individual coefficients unstable/uninterpretable even when predictions are fine - features substitute for each other."
      },
      {
        "type": "pitfall",
        "front": "Scaling before gradient descent",
        "back": "Unscaled features give an ill-conditioned (elongated) loss bowl - gradient descent zig-zags. Standardize first."
      },
      {
        "type": "pitfall",
        "front": "R^2 as a model-selection metric",
        "back": "Always increases with more features and can be high for a mis-specified model - use adjusted R^2 or held-out error instead."
      },
      {
        "type": "formula",
        "front": "Bias-variance decomposition",
        "back": "Expected test error = bias^2 + variance + irreducible noise; U-shaped in model flexibility, minimized at the sweet spot (dial it with lambda)."
      }
    ],
    "refs": [
      {
        "title": "Hastie, Tibshirani, Friedman - Elements of Statistical Learning (Ch. 3)",
        "url": "https://hastie.su.domains/ElemStatLearn/"
      },
      {
        "title": "scikit-learn: Linear Models user guide",
        "url": "https://scikit-learn.org/stable/modules/linear_model.html"
      },
      {
        "title": "scikit-learn: California Housing dataset",
        "url": "https://scikit-learn.org/stable/datasets/real_world.html#california-housing-dataset"
      },
      {
        "title": "The bias-variance tradeoff (StatQuest)",
        "url": "https://statquest.org/the-bias-variance-tradeoff/"
      }
    ],
    "demos": [
      "regression",
      "gradient-descent",
      "bias-variance-decomp"
    ],
    "demoTitles": {
      "regression": "Linear & Logistic Regression",
      "gradient-descent": "Gradient Descent",
      "bias-variance-decomp": "Bias-Variance Decomposition"
    }
  }
};
