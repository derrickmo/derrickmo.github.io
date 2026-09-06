// GENERATED from content/lessons/supervised-learning/boosting.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/supervised-learning/boosting/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "boosting": {
    "interview": {
      "quickGrind": [
        {
          "q": "Bagging vs boosting in one line?",
          "a": "Bagging trains independent models in parallel to reduce variance; boosting trains models sequentially, each fixing the previous ensemble's errors, primarily reducing bias."
        },
        {
          "q": "What does gradient boosting actually fit at each step?",
          "a": "A weak learner to the negative gradient of the loss with respect to the current predictions — the pseudo-residuals. For squared loss those are ordinary residuals."
        },
        {
          "q": "Why are the base learners deliberately weak?",
          "a": "Because the ensemble adds capacity. Strong base learners overfit the residuals immediately and leave nothing for later trees to correct."
        },
        {
          "q": "What does the learning rate do in boosting?",
          "a": "Shrinks each tree's contribution, so more trees are needed but each commits less. Learning rate and number of trees trade off directly."
        },
        {
          "q": "Why does boosting usually beat a single deep tree?",
          "a": "Many shallow trees each capture a different piece of structure additively, whereas one deep tree partitions the space greedily and fragments the data."
        },
        {
          "q": "AdaBoost vs gradient boosting?",
          "a": "AdaBoost reweights misclassified examples; gradient boosting fits the gradient of an arbitrary differentiable loss. AdaBoost is the special case of exponential loss."
        },
        {
          "q": "Why does XGBoost use second-order information?",
          "a": "It expands the loss to second order, so the split gain uses both gradient and Hessian. That gives better splits and a principled leaf value in closed form."
        },
        {
          "q": "What is the main practical weakness of boosting?",
          "a": "It is sequential, so it cannot be parallelized across trees, and it is sensitive to noisy labels because it keeps focusing on the examples it gets wrong."
        },
        {
          "q": "Why is boosting strong on tabular data but not images?",
          "a": "Trees split on individual features, which suits heterogeneous, meaningful columns. They cannot exploit spatial or translational structure the way convolution does."
        },
        {
          "q": "How do you regularize a boosted ensemble?",
          "a": "Shrinkage, tree depth or leaf count, subsampling of rows and columns, minimum child weight, and L1/L2 penalties on leaf values — plus early stopping on a validation set."
        },
        {
          "q": "Does boosting overfit as you add trees?",
          "a": "Eventually yes, unlike bagging. Training loss keeps falling while validation loss turns up, which is why early stopping is standard rather than optional."
        },
        {
          "q": "How does a boosted model handle missing values?",
          "a": "Modern implementations learn a default direction per split from the data, so missingness becomes a signal rather than something to impute away."
        }
      ],
      "standard": [
        {
          "q": "Derive gradient boosting as gradient descent in function space.",
          "a": "Ordinary gradient descent updates parameters against the gradient of the loss. Gradient boosting does the same thing but treats the MODEL itself as the variable being optimized. At stage m the ensemble is F_{m-1}, and we want to reduce sum of L(y_i, F(x_i)). The direction of steepest descent evaluated at each training point is the negative derivative of the loss with respect to the prediction, g_i = -dL/dF at F_{m-1}(x_i). Those values are only defined at the training points, so they cannot be added to the model directly; instead we fit a weak learner h_m to approximate them, which projects that steepest-descent direction onto the space of functions the base learner can represent. The update is F_m = F_{m-1} + eta * h_m, with eta a step size. With squared loss the negative gradient is exactly the residual y - F(x), which is why the algorithm is usually first taught as fitting residuals, but that is the special case, not the definition. The general form is what allows boosting for logistic loss, Poisson, ranking objectives or quantile regression by swapping the loss.",
          "deepDive": {
            "q": "Where does the second-order version differ?",
            "a": "XGBoost expands the loss to second order around the current prediction, giving a per-leaf objective in terms of summed gradients G and Hessians H. The optimal leaf value is -G/(H + lambda) and the split gain follows in closed form. This both improves split selection and makes the L2 penalty lambda enter naturally, rather than being bolted on."
          }
        },
        {
          "q": "Why is boosting still the default for tabular data?",
          "a": "Several properties line up with what tabular data actually looks like. Features are heterogeneous — different units, scales and meanings — and trees are invariant to monotone transformations of any individual feature, so no scaling or normalization is needed and skewed distributions cause no trouble. Interactions are captured automatically by successive splits without being specified. Categorical and missing values can be handled natively, with a learned default direction for missingness. The additive form with shrinkage gives fine-grained control over capacity, and early stopping on a validation set is straightforward. Meanwhile the inductive biases that make deep networks powerful — weight sharing, locality, smoothness over a continuous input space — correspond to structure that tabular data does not have. Empirically the benchmark record is consistent: on medium-sized tabular problems, gradient-boosted trees match or beat neural approaches at a fraction of the tuning effort, and papers claiming otherwise have repeatedly failed to replicate under equal tuning budgets.",
          "deepDive": {
            "q": "When SHOULD you reach for a neural network on tabular data?",
            "a": "When there is structure trees cannot exploit: very high-cardinality categoricals that benefit from learned embeddings, multi-modal inputs where a text or image column must be encoded jointly, transfer from a related pretrained model, or when the tabular model must be one differentiable component of a larger end-to-end system."
          }
        },
        {
          "q": "Boosting is sensitive to label noise. Explain the mechanism and the remedies.",
          "a": "The algorithm concentrates on examples with large loss, and a mislabeled example is by construction an example with large loss that cannot be fixed. Each round it receives more attention, so the ensemble spends increasing capacity fitting a wrong answer, and the effect compounds because later trees see the residual that earlier trees failed to remove. AdaBoost's exponential loss makes this worst, since weights grow exponentially in the margin, which is why AdaBoost is notably fragile on noisy data. The remedies follow the mechanism. Use a loss with bounded influence — Huber for regression, or logistic rather than exponential for classification — so a single bad point cannot dominate. Reduce the learning rate so no round commits hard. Subsample rows per tree, which means a noisy point is absent from many trees. Cap depth so no single tree can isolate individual points. And early-stop on validation, since the divergence between training and validation loss is exactly where noise-fitting begins."
        },
        {
          "q": "How do the main implementations differ, and does it matter in practice?",
          "a": "XGBoost grows trees level-wise (depth-first to a uniform depth) with second-order gains and strong regularization, which makes it predictable and well-behaved. LightGBM grows leaf-wise, always splitting the leaf with the highest gain, which reaches lower loss with fewer leaves and is faster on large data, but overfits more readily on small data unless the number of leaves is constrained — the different growth policy is the main behavioural difference to know. LightGBM also bins features into histograms, which is where much of its speed comes from. CatBoost targets categorical features with ordered target statistics and uses ordered boosting to avoid the target leakage that naive target encoding introduces, and it tends to need less tuning. In practice all three land in a similar accuracy band with proper tuning, so the choice is usually driven by data shape and by categorical handling rather than by a real accuracy gap."
        },
        {
          "q": "How would you tune a gradient boosting model efficiently?",
          "a": "Exploit the structure of the hyperparameters instead of searching blindly. Fix a low learning rate — 0.05 or 0.1 — and set the number of trees by early stopping rather than tuning it, since the two are coupled and early stopping resolves the coupling for free. Then tune capacity first, because it matters most: max depth or number of leaves, and minimum child weight. Then tune the stochastic regularizers, subsample and colsample, which typically want values around 0.7 to 0.9. Then the explicit penalties lambda and alpha, which usually matter least. Only at the end, if the budget allows, lower the learning rate further and let the tree count rise, which reliably buys a small improvement at proportional cost. Use a validation split that respects the data's structure — grouped or time-based if applicable — otherwise every number above is measured against a leak."
        },
        {
          "q": "How do you interpret a boosted model responsibly?",
          "a": "Start by knowing what the built-in importances mean, because they are frequently misread. Gain-based importance measures total loss reduction attributed to a feature, and it is biased toward high-cardinality and continuous features, which offer more possible split points. Split-count importance is worse for the same reason. Both are global and cannot tell you the direction of an effect. SHAP values are the usual improvement: they are per-prediction, signed, and additive, and the TreeSHAP algorithm computes them exactly in polynomial time for tree ensembles, which is why they are practical here and not elsewhere. Even then, correlated features share credit arbitrarily, so an unimportant-looking feature may be a perfect substitute for an important one. For causal questions none of this suffices — an importance is a statement about the model, not about the world, and the honest move is to say so and reach for an interventional design."
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "Gradient boosting",
        "back": "Gradient descent in function space: fit each weak learner to the negative gradient of the loss w.r.t. current predictions."
      },
      {
        "type": "formula",
        "front": "XGBoost leaf value",
        "back": "-G/(H + lambda) from a second-order expansion, with the split gain following in closed form. L2 enters naturally."
      },
      {
        "type": "definition",
        "front": "Pseudo-residual",
        "back": "The negative gradient at each training point. Equals the plain residual y - F(x) only for squared loss."
      },
      {
        "type": "definition",
        "front": "Shrinkage",
        "back": "Scaling each tree's contribution by eta so no round commits hard. Trades directly against the number of trees."
      },
      {
        "type": "intuition",
        "front": "Bagging vs boosting",
        "back": "Bagging: parallel, independent, attacks variance. Boosting: sequential, error-correcting, attacks bias — and can overfit with more rounds."
      },
      {
        "type": "intuition",
        "front": "Why weak learners",
        "back": "The ensemble supplies capacity. Strong base learners fit the residuals immediately and leave later trees nothing to correct."
      },
      {
        "type": "intuition",
        "front": "Why trees win on tabular data",
        "back": "Monotone-invariant per feature, automatic interactions, native categoricals and missingness — and no spatial structure for a CNN to exploit."
      },
      {
        "type": "intuition",
        "front": "Level-wise vs leaf-wise",
        "back": "XGBoost grows to uniform depth (predictable); LightGBM splits the highest-gain leaf (faster, lower loss, overfits small data)."
      },
      {
        "type": "pitfall",
        "front": "Boosting with noisy labels",
        "back": "A mislabeled point is a permanently high-loss point, so it attracts ever more capacity. Bound the loss, subsample, early-stop."
      },
      {
        "type": "pitfall",
        "front": "Adding trees indefinitely",
        "back": "Unlike bagging, boosting does overfit with rounds. Training loss keeps falling while validation turns up — early stopping is mandatory."
      },
      {
        "type": "pitfall",
        "front": "Gain importance as truth",
        "back": "Biased toward high-cardinality and continuous features, gives no direction, and is a fact about the model, not the world."
      },
      {
        "type": "pitfall",
        "front": "Naive target encoding",
        "back": "Encoding a categorical by its target mean leaks the label. CatBoost's ordered statistics exist precisely to avoid this."
      }
    ],
    "refs": [
      {
        "title": "Friedman (2001) — Greedy Function Approximation: A Gradient Boosting Machine",
        "url": "https://projecteuclid.org/euclid.aos/1013203451"
      },
      {
        "title": "Chen & Guestrin (2016) — XGBoost: A Scalable Tree Boosting System",
        "url": "https://arxiv.org/abs/1603.02754"
      },
      {
        "title": "Ke et al. (2017) — LightGBM: A Highly Efficient Gradient Boosting Decision Tree",
        "url": "https://papers.nips.cc/paper/6907-lightgbm-a-highly-efficient-gradient-boosting-decision-tree"
      },
      {
        "title": "Prokhorenkova et al. (2018) — CatBoost: Unbiased Boosting with Categorical Features",
        "url": "https://arxiv.org/abs/1706.09516"
      },
      {
        "title": "Grinsztajn et al. (2022) — Why Do Tree-Based Models Still Outperform Deep Learning on Tabular Data?",
        "url": "https://arxiv.org/abs/2207.08815"
      }
    ],
    "demos": [],
    "demoTitles": {}
  }
};
