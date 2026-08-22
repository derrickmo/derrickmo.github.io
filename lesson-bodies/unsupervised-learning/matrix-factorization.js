// GENERATED from content/lessons/unsupervised-learning/matrix-factorization.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/unsupervised-learning/matrix-factorization/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "matrix-factorization": {
    "interview": {
      "quickGrind": [
        {
          "q": "What does the SVD decompose a matrix into?",
          "a": "A rotation, a non-negative scaling, and another rotation: A = U S V^T, with U and V orthonormal and S diagonal. Every real matrix has one, square or not."
        },
        {
          "q": "What do the singular values actually measure?",
          "a": "How much the matrix stretches along each of its principal directions. Their squares are the eigenvalues of A^T A, and their decay tells you how close the matrix is to low rank."
        },
        {
          "q": "State the Eckart-Young theorem.",
          "a": "Truncating the SVD to the k largest singular values gives the best rank-k approximation in Frobenius and spectral norm. Greedy is optimal here, which is unusual."
        },
        {
          "q": "How is PCA related to SVD?",
          "a": "PCA is the SVD of the mean-centred data matrix. The right singular vectors are the principal directions; the singular values give the explained variance. Centring is what makes it PCA rather than plain SVD."
        },
        {
          "q": "Why can't you run plain SVD on a ratings matrix?",
          "a": "Because it is mostly missing, and SVD has no notion of missing — filling holes with zeros asserts that unrated means disliked, which is false and dominates the fit since most entries are missing."
        },
        {
          "q": "So what do you fit instead?",
          "a": "The same bilinear model, but the loss sums only over observed entries, with regularization. That is no longer an SVD and has no closed form, so you solve it with ALS or SGD."
        },
        {
          "q": "ALS or SGD for that fit?",
          "a": "ALS fixes one factor and solves the other in closed form, alternating; it parallelizes cleanly and suits implicit feedback where every cell is observed. SGD is cheaper per step on sparse explicit data and easier to extend with extra terms."
        },
        {
          "q": "What do the latent factors mean?",
          "a": "Nothing by construction — the factorization is only identified up to an invertible transform, since UV^T = (UM)(M^-1 V^T). Any interpretation is read in after the fact, and rotations of the solution fit equally well."
        },
        {
          "q": "Why add bias terms to a recommender?",
          "a": "Because most of the signal is not interaction. Some users rate high, some items are widely liked, and a global-plus-user-plus-item bias captures that before any factor does work. Skipping it makes the factors spend capacity on offsets."
        },
        {
          "q": "NMF versus SVD?",
          "a": "NMF constrains factors to be non-negative, which forbids cancellation and tends to give parts-based, more readable components. It gives up orthogonality, optimality and uniqueness, and the fit is non-convex."
        },
        {
          "q": "What is the connection to LoRA?",
          "a": "LoRA is the same low-rank hypothesis applied to a weight update: assume delta-W is approximately rank-r and train BA instead of the full matrix. The bet is identical — that the interesting structure is low-dimensional."
        },
        {
          "q": "How do you choose k?",
          "a": "Cross-validate on held-out entries for a recommender. For compression, look at the singular-value spectrum for an elbow or fix a fraction of retained energy. There is rarely a true rank; k is a bias-variance knob."
        }
      ],
      "standard": [
        {
          "q": "Derive why the truncated SVD is the best rank-k approximation, and say where that guarantee stops applying.",
          "a": "Write A = sum_i sigma_i u_i v_i^T with sigma_1 >= sigma_2 >= ... The rank-k truncation A_k keeps the first k terms, and the residual A - A_k has Frobenius norm sqrt(sum_{i>k} sigma_i^2) and spectral norm sigma_{k+1}. Eckart-Young says no rank-k matrix does better in either norm. The reason is that the singular vectors form an orthonormal basis in which the matrix is diagonal, so the approximation problem decouples into independent scalar problems and the optimal move is simply to keep the largest coefficients — the same argument that makes hard-thresholding optimal in an orthonormal basis. What is genuinely surprising is that the greedy choice is globally optimal, because for most matrix problems it is not. The guarantee is norm-specific and that is where it stops. It is optimal for unweighted squared error over ALL entries, which is exactly the assumption that fails on a ratings matrix, where most entries are unobserved and treating them as zero is a strong and wrong claim. It also has no notion of per-entry importance, so if some observations are more reliable than others, or the error you care about is relative rather than absolute, or the loss is Poisson or logistic rather than Gaussian, the truncated SVD is no longer the right answer and you are back to an iterative fit with no closed form.",
          "deepDive": {
            "q": "When is the Frobenius-optimal answer the wrong thing to want?",
            "a": "Whenever the entries are not exchangeable. Weighted low-rank approximation, where each cell has its own confidence, is NP-hard in general and has no SVD-style solution — which is why recommender systems and any missing-data problem use alternating or gradient methods instead. The same applies when the noise model is not Gaussian: count data wants a Poisson loss and binary data a logistic one, and squared error on those systematically distorts the fit toward large-magnitude entries."
          }
        },
        {
          "q": "Walk through how you would actually build a matrix-factorization recommender.",
          "a": "Start with the model rather than the algorithm. Predict r_ui = mu + b_u + b_i + p_u . q_i, with mu the global mean and the two bias terms absorbing rater and item offsets. Fit by minimizing squared error over OBSERVED entries only, plus L2 on all free parameters — the regularization is not optional here, because with most of the matrix missing the model can fit the observed cells arbitrarily well and generalize nowhere. Choose ALS or SGD by data shape: ALS solves each factor in closed form given the other and parallelizes across users and items, which suits implicit feedback where the matrix is dense in the sense that every cell carries a signal; SGD touches only observed cells and is cheaper on sparse explicit ratings, and it extends easily when you want time terms or side features. Then the parts that decide whether it works. Split by TIME, not at random, because a random split lets the model see a user's future ratings while predicting their past, and that is a leak that flatters every offline number. Evaluate on ranking rather than RMSE if the product is a ranked list, since a model can improve RMSE on the ratings people actually gave while getting the top-k worse. And handle cold start out of band — a pure factorization has nothing to say about a user or item with no interactions, so you need content features or a popularity fallback for that population.",
          "deepDive": {
            "q": "What changes for implicit feedback?",
            "a": "Everything about what the missing entries mean. With explicit ratings, an unobserved cell is genuinely unknown. With implicit signals — plays, clicks, purchases — an absent event is weak evidence of disinterest, not missingness, so you fit over ALL cells with a binary preference and a confidence weight that grows with the observed count, which is Hu, Koren and Volinsky's formulation. That makes the problem dense, which is why ALS with its closed-form updates and clever Gram-matrix trick is the standard solver there."
          }
        },
        {
          "q": "The latent factors are not identified. Does that matter, and what do you do about it?",
          "a": "It matters exactly as much as your use of them. The factorization is invariant to any invertible M, since PQ^T = (PM)(M^-1 Q^T)^T, and if you only add L2 the invariance narrows to rotations rather than disappearing. So the SUBSPACE is identified and the individual axes are not. For prediction that is irrelevant — the dot products, and therefore the recommendations, are unchanged by the ambiguity. It becomes a real problem the moment anyone reads the axes: labelling factor 3 as 'action films' is a statement about one arbitrary basis of a subspace, and refitting with a different seed can produce an equally good model where that direction does not exist. The honest options are to accept that factors are machinery rather than findings, or to add a constraint that pins the basis down and pay for it. Non-negativity does this and buys real interpretability, which is why NMF is preferred for topic-style analysis. Sparsity constraints do it too. Both cost you the closed form and the optimality guarantee, and both make the fit non-convex, so you are trading a provably best answer for one you can talk about."
        },
        {
          "q": "How would you factor a matrix that does not fit in memory?",
          "a": "The classical algorithms are the wrong shape: a dense SVD is O(mn min(m,n)) and needs the matrix resident, which rules it out early. Three practical routes. Randomized SVD is usually the right default when you want the top k of a large but sparse or structured matrix: sketch the range with a random Gaussian projection to about k plus a small oversample, orthonormalize, project the matrix into that small basis and take the exact SVD there. It costs a couple of passes over the data, is trivially parallel, and comes with probabilistic error bounds that are tight in practice — with a power iteration or two when the spectrum decays slowly. Krylov methods such as Lanczos give higher accuracy for very few components and only need matrix-vector products, which suits a sparse operator you never materialize. And for the recommender case you generally do not want an SVD at all: fit the biased regularized model directly with ALS or SGD, since both touch only observed entries and shard naturally by user or item. The practical constraint is usually the factors rather than the matrix — with a hundred million items at rank 128 the item factors alone are tens of gigabytes, and that governs the serving architecture more than the training does."
        },
        {
          "q": "Where else does this same idea show up in machine learning?",
          "a": "It is one of the most reused ideas in the field, and the reuse is literal rather than by analogy. PCA is the SVD of centred data. Latent semantic analysis is the truncated SVD of a term-document matrix, and the low-rank projection is what lets 'car' and 'automobile' land near each other despite sharing no term. Word embeddings connect back too — Levy and Goldberg showed that skip-gram with negative sampling is implicitly factorizing a shifted pointwise-mutual-information matrix, which reframes a neural method as matrix factorization. Spectral clustering is an eigendecomposition of a graph Laplacian, which is the same machinery on a similarity matrix. Model compression truncates weight matrices directly. And LoRA takes the hypothesis to fine-tuning: assume the weight UPDATE is approximately low rank and train two thin matrices instead of the full one. The common thread is a bet that a large object is generated by a few underlying factors, which is a claim about the data, not about the algorithm — and when it is false, all of these degrade in the same way, by throwing away the very structure that was spread across many small singular values."
        },
        {
          "q": "Your recommender's RMSE improved but engagement did not move. What do you check?",
          "a": "First, whether RMSE is even the right target. It is an average over the ratings people chose to give, and it weights every observation equally; the product usually cares about the top few items shown to each user, which RMSE barely measures. A model can get better at predicting the many mediocre ratings and worse at the head of the list. So recompute on a ranking metric — NDCG or recall at the k you actually display — before concluding anything. Second, the split. If the offline evaluation used a random split rather than a temporal one, the number is inflated by leakage and the improvement may be entirely in the leaked component. Third, popularity bias: RMSE improvements often come from predicting popular items better, and if the ranking is already dominated by popular items, the recommendations barely change — check the actual overlap between the old and new top-k, because if it is 95% then no user experience changed regardless of the metric. Fourth, the same possibility that closes every one of these investigations honestly: the improvement may be real and the experiment underpowered. Engagement effects are small and noisy, so an RMSE gain that corresponds to a fraction of a percent of engagement can be genuinely invisible in a two-week test, and the correct report states the detectable effect size rather than claiming no effect."
        }
      ]
    },
    "flashcards": [
      {
        "type": "formula",
        "front": "Singular value decomposition",
        "back": "A = U S V^T with U, V orthonormal and S diagonal non-negative. Equivalently a sum of rank-1 terms sigma_i u_i v_i^T ordered by sigma."
      },
      {
        "type": "formula",
        "front": "Eckart-Young",
        "back": "The rank-k truncation minimizes ||A - B|| over all rank-k B, in both Frobenius and spectral norm. Residual Frobenius norm is sqrt(sum of the dropped sigma^2)."
      },
      {
        "type": "definition",
        "front": "PCA via SVD",
        "back": "PCA is the SVD of the mean-centred data matrix. Right singular vectors are the principal directions; sigma^2/(n-1) are the explained variances."
      },
      {
        "type": "formula",
        "front": "Biased MF prediction",
        "back": "r_ui = mu + b_u + b_i + p_u . q_i. The biases carry most of the signal; the dot product carries the interaction."
      },
      {
        "type": "intuition",
        "front": "What low rank means",
        "back": "A few latent factors generated the matrix. Rank is a statement about the data, not the algorithm — and when it is false, truncation destroys the structure."
      },
      {
        "type": "intuition",
        "front": "Why greedy is optimal here",
        "back": "In the singular basis the matrix is diagonal, so the approximation decouples into independent scalars and keeping the largest is best. Rare — greedy usually is not optimal."
      },
      {
        "type": "intuition",
        "front": "Rotation invariance",
        "back": "PQ^T = (PM)(M^-1 Q^T)^T, so the subspace is identified and the individual axes are not. Predictions are unaffected; interpretations are not."
      },
      {
        "type": "definition",
        "front": "Randomized SVD",
        "back": "Sketch the range with a random projection to k + oversample, orthonormalize, then take the exact SVD of the small projected matrix. Two passes, parallel, with probabilistic bounds."
      },
      {
        "type": "pitfall",
        "front": "Zero-filling a ratings matrix",
        "back": "Asserts that unrated means rated zero. Most entries are missing, so that assertion dominates the fit. Sum the loss over observed entries instead."
      },
      {
        "type": "pitfall",
        "front": "Random split on interaction data",
        "back": "Lets the model see a user's future while predicting their past. Split by time; a random split flatters every offline number."
      },
      {
        "type": "pitfall",
        "front": "Naming the factors",
        "back": "Factor 3 is 'action films' only in one arbitrary basis of an identified subspace. Refit with another seed and the axis may not exist. Constrain the basis or do not interpret it."
      },
      {
        "type": "pitfall",
        "front": "Optimizing RMSE for a ranked product",
        "back": "RMSE averages over ratings people gave; the product shows a top-k. A model can improve RMSE and make the head of the list worse."
      }
    ],
    "refs": [
      {
        "title": "Eckart & Young (1936) — The Approximation of One Matrix by Another of Lower Rank",
        "url": "https://link.springer.com/article/10.1007/BF02288367"
      },
      {
        "title": "Koren, Bell & Volinsky (2009) — Matrix Factorization Techniques for Recommender Systems",
        "url": "https://ieeexplore.ieee.org/document/5197422"
      },
      {
        "title": "Hu, Koren & Volinsky (2008) — Collaborative Filtering for Implicit Feedback Datasets",
        "url": "https://ieeexplore.ieee.org/document/4781121"
      },
      {
        "title": "Halko, Martinsson & Tropp (2011) — Finding Structure with Randomness (randomized SVD)",
        "url": "https://arxiv.org/abs/0909.4061"
      },
      {
        "title": "Levy & Goldberg (2014) — Neural Word Embedding as Implicit Matrix Factorization",
        "url": "https://papers.nips.cc/paper/5477-neural-word-embedding-as-implicit-matrix-factorization"
      }
    ],
    "demos": []
  }
};
