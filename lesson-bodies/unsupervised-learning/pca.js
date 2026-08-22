// GENERATED from content/lessons/unsupervised-learning/pca.json by scripts/gen-lesson-pages.mjs — DO NOT EDIT.
// One lesson's body, loaded only by learn/unsupervised-learning/pca/ BEFORE lesson-app.jsx,
// which renders window.DM_LESSON_BODIES[lessonSlug].

window.DM_LESSON_BODIES = {
  "pca": {
    "level": "core",
    "body": {
      "intuition": [
        "PCA is the workhorse of dimensionality reduction: it finds the directions along which your data varies the most, and lets you keep just a few of them while throwing away the rest. The insight is that most high-dimensional data doesn't really fill its space - it clusters near a lower-dimensional subspace - and PCA finds the best-fitting such subspace. Projecting onto the top few principal components compresses the data with minimal loss, denoises it, and makes it visualizable, all with one eigendecomposition.",
        "There are two equivalent ways to think about what PCA optimizes, and holding both is the key to understanding it. The variance view: find the direction that captures the most variance in the data, then the next orthogonal direction capturing the most remaining variance, and so on - the principal components are these directions of maximal spread. The reconstruction view: find the low-dimensional subspace onto which projecting the data loses the least (minimizes squared reconstruction error). These aren't two different goals - maximizing captured variance is exactly minimizing discarded variance, so they give the identical answer.",
        "Mechanically, PCA is an eigendecomposition of the covariance matrix (or, more stably, an SVD of the centered data). The eigenvectors are the principal component directions and the eigenvalues are the variance captured along each - so ranking eigenvectors by eigenvalue and keeping the top k gives you the k-dimensional projection that preserves the most variance. Because it's a single linear-algebra operation with a closed-form answer, PCA is fast, deterministic, and the default first thing to try - but linear, which is exactly the limitation that motivates the nonlinear methods next."
      ],
      "math": [
        {
          "h": "Two equivalent objectives: max variance = min reconstruction error",
          "paras": [
            "The first principal component is the unit direction maximizing the variance of the projected data. Equivalently, it's the direction whose subspace minimizes the squared reconstruction error. Both reduce to the same eigenproblem on the covariance matrix C: the top eigenvector maximizes u^T C u subject to ||u||=1."
          ],
          "tex": "\\max_{\\lVert u\\rVert = 1} \\; u^\\top C\\, u \\quad\\Longleftrightarrow\\quad \\min_{U} \\sum_i \\lVert x_i - U U^\\top x_i \\rVert^2, \\qquad C = \\tfrac{1}{n} X_c^\\top X_c",
          "texNote": "C is the covariance of the centered data X_c. Maximizing projected variance (left) and minimizing reconstruction error (right) are the same problem - both solved by the top eigenvectors of C."
        },
        {
          "h": "The solution: eigenvectors of the covariance, or the SVD",
          "paras": [
            "The principal components are the eigenvectors of the covariance matrix, ordered by their eigenvalues (the variance captured along each). Equivalently, the SVD of the centered data matrix gives the same directions more stably - the right singular vectors are the principal components and the squared singular values are proportional to the eigenvalues."
          ],
          "tex": "C u_j = \\lambda_j u_j, \\quad \\lambda_1 \\ge \\lambda_2 \\ge \\dots \\qquad X_c = U\\Sigma V^\\top \\Rightarrow \\text{PCs} = \\text{columns of } V,\\; \\lambda_j = \\sigma_j^2 / n",
          "texNote": "Eigenvalues ARE the variance captured, so the fraction of variance explained by the top k is (sum of top-k lambdas)/(sum of all lambdas). SVD avoids forming C explicitly (better numerics)."
        }
      ],
      "code": [
        {
          "h": "PCA from scratch via SVD, checked against sklearn",
          "paras": [
            "Center the data, take the SVD, and the right singular vectors are the principal components. The variance-explained ratio comes straight from the singular values."
          ],
          "code": "import numpy as np\nfrom sklearn.datasets import load_digits\nfrom sklearn.decomposition import PCA\n\nX, _ = load_digits(return_X_y=True)         # 64-dim (8x8 images)\nXc = X - X.mean(0)                            # center - REQUIRED before PCA\n\nU, S, Vt = np.linalg.svd(Xc, full_matrices=False)\nvar_explained = S**2 / (S**2).sum()           # fraction of variance per component\nk = 10\nZ = Xc @ Vt[:k].T                             # project onto top-k PCs -> (n, 10)\n\nprint('top-10 variance explained:', round(var_explained[:k].sum(), 3))\nskl = PCA(n_components=k).fit(X)\nprint('sklearn top-10 var:', round(skl.explained_variance_ratio_.sum(), 3))  # matches",
          "caption": "SVD of the CENTERED data gives the PCs (right singular vectors); squared singular values are the variance captured. Always center first."
        },
        {
          "h": "The scree plot: how many components to keep",
          "paras": [
            "Plot the variance explained per component (or its cumulative sum) and keep enough components to reach a target (e.g., 95%) or to the 'elbow' where extra components add little."
          ],
          "code": "import numpy as np\nfrom sklearn.decomposition import PCA\n\npca = PCA().fit(X)                                     # all components\ncum = np.cumsum(pca.explained_variance_ratio_)\nk95 = np.searchsorted(cum, 0.95) + 1                   # components to reach 95% variance\nprint(f'{k95} of {X.shape[1]} components capture 95% of the variance')\n# a scree plot of pca.explained_variance_ratio_ shows the elbow; cum shows the 95% cut",
          "caption": "Keep components until cumulative variance hits a threshold (95%) or an elbow - a huge dimensionality cut with little information lost when data is low-rank."
        }
      ],
      "useCases": [
        "Dimensionality reduction before a distance-based model - 'PCA then k-means/kNN' restores meaningful distances by stripping low-variance noise dimensions (the curse-of-dimensionality fix from earlier lessons).",
        "Compression and denoising - reconstructing from the top components discards small-variance directions that are often noise, cleaning signals and images.",
        "2-D/3-D visualization of high-dimensional data as a fast, deterministic first look (before reaching for t-SNE/UMAP), and as a preprocessing step feeding those nonlinear methods.",
        "Decorrelating and whitening features (PCA rotates to uncorrelated axes; whitening also scales them to unit variance), useful as preprocessing for algorithms that assume uncorrelated inputs (including ICA)."
      ],
      "pitfalls": [
        "Forgetting to center the data (subtract the mean) - PCA on uncentered data finds directions dominated by the mean offset, not the variance structure; centering is mandatory, and standardizing (unit variance per feature) is usually needed too.",
        "Scale sensitivity: PCA maximizes variance, so a feature measured on a large numeric range dominates the components purely because of its units - standardize features first unless the scales are genuinely comparable.",
        "Interpreting principal components as meaningful individual features: PCs are linear combinations of all original features chosen for variance, not for interpretability or predictive relevance - a high-variance direction need not be the useful one.",
        "Assuming high variance = useful signal: PCA keeps high-variance directions, but the discriminative signal for a downstream task can lie in a low-variance direction PCA discards (supervised alternatives like LDA or PLS target class-relevant directions instead).",
        "Using PCA on strongly nonlinear structure: PCA can only find a linear subspace, so data on a curved manifold (a swiss roll) is poorly captured - kernel PCA or the nonlinear manifold methods (t-SNE/UMAP/Isomap) are needed there."
      ],
      "connections": [
        {
          "ref": "foundations/linear-algebra",
          "text": "PCA is eigendecomposition/SVD applied to the covariance matrix - the central linear-algebra tool, here turned into a dimensionality-reduction method."
        },
        {
          "ref": "unsupervised-learning/matrix-factorization",
          "text": "PCA is a matrix factorization (the SVD); the flagship lesson generalizes low-rank factorization to recommenders and beyond."
        },
        {
          "ref": "unsupervised-learning/tsne-umap",
          "text": "PCA is the linear baseline; when structure is nonlinear (curved manifolds), t-SNE/UMAP/Isomap capture what PCA's linear projection misses."
        },
        {
          "ref": "unsupervised-learning/ica",
          "text": "ICA also finds a linear transform of the data but seeks statistically independent (non-Gaussian) components rather than PCA's uncorrelated, max-variance ones - PCA whitening is a common ICA preprocessing step."
        }
      ]
    },
    "interview": {
      "quickGrind": [
        {
          "q": "What does PCA find?",
          "a": "The orthogonal directions (principal components) of maximum variance in the data; keeping the top k gives the best k-dimensional linear projection."
        },
        {
          "q": "State the two equivalent objectives of PCA.",
          "a": "Maximize the variance of the projected data, OR minimize the squared reconstruction error - they're the same problem and give the same components."
        },
        {
          "q": "How is PCA computed?",
          "a": "Eigendecomposition of the covariance matrix (eigenvectors = PCs, eigenvalues = variance captured), or equivalently the SVD of the centered data (more stable)."
        },
        {
          "q": "Why must you center the data before PCA?",
          "a": "PCA finds directions of variance about the mean; on uncentered data the top component just points at the mean offset, not the variance structure."
        },
        {
          "q": "What do the eigenvalues represent?",
          "a": "The variance captured along each principal component - the fraction explained by the top k is their sum over the total."
        },
        {
          "q": "Why prefer SVD over forming the covariance matrix?",
          "a": "SVD of the centered data is numerically more stable and avoids explicitly forming C = X^T X, which squares the condition number."
        },
        {
          "q": "Why standardize features before PCA?",
          "a": "PCA maximizes variance, so a large-range feature dominates the components purely by its units - standardize so variance reflects structure, not scale."
        },
        {
          "q": "Does the highest-variance direction always carry the useful signal?",
          "a": "No - discriminative signal can lie in a low-variance direction PCA discards; supervised methods (LDA, PLS) target task-relevant directions."
        },
        {
          "q": "How do you choose the number of components?",
          "a": "Cumulative variance to a threshold (e.g., 95%), the scree-plot elbow, or a downstream validation metric."
        },
        {
          "q": "What is whitening?",
          "a": "Projecting onto the PCs AND scaling each to unit variance, producing uncorrelated, unit-variance features - a common preprocessing (e.g., before ICA)."
        }
      ],
      "standard": [
        {
          "q": "Prove that maximizing projected variance and minimizing reconstruction error give the same principal components.",
          "a": "Center the data so it has zero mean. For a unit direction u, the projected data is (u^T x_i) and its variance is (1/n) sum_i (u^T x_i)^2 = u^T C u, where C is the covariance matrix. The reconstruction of x_i using the subspace spanned by u is (u^T x_i) u, and the reconstruction error is ||x_i - (u^T x_i)u||^2. Expanding: ||x_i||^2 - (u^T x_i)^2 (since u is unit-norm and the projection is orthogonal, by the Pythagorean theorem the squared original length equals the squared projection plus the squared residual). Summing over i, the total reconstruction error = sum_i ||x_i||^2 - sum_i (u^T x_i)^2 = (total variance) - n*(u^T C u). The first term is a constant independent of u, so minimizing the reconstruction error is exactly maximizing u^T C u - the projected variance. Both objectives are therefore the same optimization, max_{||u||=1} u^T C u, whose solution (by the Rayleigh quotient / Lagrange multipliers) is the top eigenvector of C. The argument extends to a k-dimensional subspace by the same decomposition (captured variance + residual = constant), so the best k-dimensional subspace under either criterion is spanned by the top k eigenvectors.",
          "deepDive": {
            "q": "Where does the eigenvector solution come from - why is the max-variance direction an eigenvector of the covariance?",
            "a": "Maximize u^T C u subject to the constraint u^T u = 1. Form the Lagrangian L = u^T C u - lambda(u^T u - 1) and set its gradient to zero: dL/du = 2Cu - 2*lambda*u = 0, i.e., Cu = lambda*u. That's precisely the eigenvalue equation - so any stationary point of the constrained variance objective is an eigenvector of C, with lambda its eigenvalue. Substituting back, the objective value at such a point is u^T C u = u^T (lambda u) = lambda, so the variance captured by direction u equals its eigenvalue - meaning the maximum is achieved by the eigenvector with the largest eigenvalue. This is why the principal components are the eigenvectors ranked by eigenvalue, and why the eigenvalues literally are the variances captured: the constrained-optimization structure forces the answer to be an eigenproblem."
          }
        },
        {
          "q": "Explain the difference between PCA on the covariance matrix and PCA on the correlation matrix, and when each is appropriate.",
          "a": "PCA on the covariance matrix uses the raw (mean-centered) feature variances and covariances, so features with larger numeric ranges contribute proportionally more to the total variance and therefore dominate the principal components. PCA on the correlation matrix is equivalent to standardizing each feature to unit variance first (z-scoring) and then doing covariance PCA - it removes the scale differences, so every feature contributes equally regardless of its units. Which to use depends on whether the feature scales are meaningful. Use covariance PCA when all features are in the same units and their relative variances are genuinely comparable and meaningful (e.g., pixel intensities, or measurements all in the same physical unit) - there you want a naturally high-variance feature to matter more. Use correlation PCA (standardize first) when features are in different units or wildly different ranges (e.g., age in years vs income in dollars vs a count) - otherwise the income feature would dominate the components purely because dollars are numerically large, drowning out the structure in the other features. In practice, standardizing (correlation PCA) is the safer default for heterogeneous tabular data, and covariance PCA is reserved for homogeneous, same-unit data.",
          "deepDive": {
            "q": "Give a concrete example where covariance PCA and correlation PCA give qualitatively different, and one clearly wrong, results.",
            "a": "Suppose you have two features: a person's height in millimeters (values ~1,500-2,000, variance in the millions) and their number of years of education (values ~8-20, variance ~10). Covariance PCA would find that essentially all the variance is along the height axis (millions vs tens), so the first principal component points almost entirely in the height direction and the education variation is treated as negligible noise - even if education is the more informative variable for whatever you care about. That's the 'wrong' result driven purely by units: measure height in meters instead of millimeters and the first component would flip, because the answer depended on an arbitrary unit choice. Correlation PCA (standardizing both to unit variance first) would treat the two features symmetrically, letting the first component reflect the actual correlation structure between height and education rather than the accident that millimeters produce big numbers. This is exactly why standardizing is the default for features in different units - covariance PCA's scale-dependence makes it meaningful only when the scales themselves are meaningful and comparable."
          }
        },
        {
          "q": "A colleague reduces their data to the top principal components and their downstream classifier gets worse. How is this possible if PCA 'keeps the most information'?",
          "a": "PCA keeps the most VARIANCE, which is not the same as the most information for a supervised task - and that gap is exactly the failure here. PCA is unsupervised: it never sees the labels, so it selects directions purely by how much the inputs spread along them. But the direction that best separates the classes (the discriminative signal) can be a low-variance direction that PCA ranks near the bottom and discards. The classic picture: two elongated, parallel class clusters where the big variance is along the length of both clusters (a direction that doesn't separate them at all) while the small variance is across them (the direction that DOES separate the classes) - keep the top PC and you throw away the only useful direction. So reducing to top PCs can delete precisely the feature the classifier needed. Remedies: use a supervised dimensionality reduction that targets class-relevant directions - Linear Discriminant Analysis (LDA) maximizes between-class over within-class variance, and Partial Least Squares (PLS) finds components correlated with the target; or don't reduce at all and instead regularize the classifier; or choose the number/selection of PCs by downstream validation accuracy rather than by variance explained, which at least catches the cases where a discarded low-variance PC mattered.",
          "deepDive": {
            "q": "How does LDA differ from PCA in what it optimizes, and why does that make it better for classification-oriented reduction?",
            "a": "PCA maximizes total variance of the (unlabeled) data and is blind to class structure. LDA (Linear Discriminant Analysis) is supervised: it finds the projection directions that maximize the ratio of between-class scatter to within-class scatter - i.e., directions that push the class means far apart while keeping each class tight. So LDA explicitly seeks the directions that best SEPARATE the classes, which is what a downstream classifier needs, whereas PCA seeks directions of most spread regardless of whether that spread distinguishes the classes. In the parallel-elongated-clusters example, LDA would pick the across-clusters direction (high class separation, even though it's low total variance) that PCA discards. The trade-offs: LDA can produce at most (number of classes - 1) components (it's limited by class-mean geometry), assumes roughly Gaussian classes with similar covariances, and needs labels; PCA has no such limits and is unsupervised. So use LDA when the goal is class separation and you have labels, PCA when the goal is general-purpose variance-preserving compression or you have no labels - and recognize they can point in very different directions on the same data."
          }
        },
        {
          "q": "Explain how PCA relates to the SVD, and why implementations use SVD of the data rather than eigendecomposition of the covariance matrix.",
          "a": "PCA is mathematically an eigendecomposition of the covariance matrix C = (1/n) X_c^T X_c (where X_c is the centered data): the eigenvectors of C are the principal components and its eigenvalues are the variances captured. The SVD provides the same result directly from the data: if X_c = U Sigma V^T is the SVD of the centered data matrix, then the right singular vectors (columns of V) are exactly the eigenvectors of X_c^T X_c (hence the principal components), and the squared singular values (sigma_j^2) are proportional to the eigenvalues (lambda_j = sigma_j^2 / n). So you can get the PCs and variances without ever forming C. Implementations prefer the SVD route for numerical stability: forming C = X_c^T X_c explicitly squares the condition number of X_c, which amplifies rounding errors and can make small singular values (small-variance directions) inaccurate or lost to floating-point error - a serious problem when the data is nearly low-rank or ill-conditioned. The SVD operates on X_c directly, so it retains full precision on the small components. It's also often more efficient (especially the 'thin' SVD or randomized SVD for keeping only the top k components) and handles the case where the number of features exceeds the number of samples gracefully.",
          "deepDive": {
            "q": "How does randomized SVD let PCA scale to very large or high-dimensional data when you only need the top k components?",
            "a": "A full SVD computes all singular values/vectors at cost roughly O(min(n*d^2, n^2*d)), which is prohibitive when both n (samples) and d (features) are large - but PCA usually only needs the top k components (k << d). Randomized SVD exploits this: it multiplies the data matrix by a small random projection matrix to cheaply produce a low-dimensional sketch that, with high probability, captures the range of the dominant singular directions, then computes an exact SVD on that small sketch and projects back. This reduces the cost to roughly O(n*d*k) - linear in the data size and in k - while giving an accurate approximation of the top k singular vectors/values (with a small, controllable error that shrinks with a few power iterations). It's the algorithm behind scikit-learn's svd_solver='randomized' and is what makes truncated PCA feasible on large document-term matrices, high-resolution images, or big embedding sets where a full decomposition would be impossible - trading a tiny, bounded approximation error for a massive speedup, the same accuracy-for-scale bargain that approximate nearest-neighbor search makes for retrieval."
          }
        },
        {
          "q": "When does PCA fail, and what nonlinear alternatives address those failures?",
          "a": "PCA fails whenever the important structure in the data is not a linear subspace, because PCA can only find and project onto flat (linear) subspaces. Concretely: (1) Data on a curved manifold - the canonical 'swiss roll' where points lie on a rolled-up 2-D sheet embedded in 3-D - has its intrinsic structure along the curled surface, but PCA's linear projection flattens the roll and collapses distant parts of the sheet onto each other, destroying the structure. (2) Clusters separated along nonlinear boundaries, or variance that's genuinely nonlinear (e.g., points on concentric circles) - PCA sees roughly equal variance in all directions and finds nothing useful. (3) Cases where the discriminative signal is nonlinear in the features. The nonlinear alternatives each address this differently: kernel PCA applies PCA in a high-dimensional feature space via the kernel trick, so a linear subspace there corresponds to a nonlinear one in the original space (good for smooth nonlinearities); Isomap preserves geodesic (along-the-manifold) distances rather than straight-line distances, unrolling manifolds like the swiss roll; and t-SNE/UMAP preserve local neighborhood structure to produce low-dimensional embeddings that reveal nonlinear cluster structure (primarily for visualization). The trade-off is that these are slower, often non-deterministic, harder to interpret, and (for t-SNE/UMAP) distort global distances - so PCA remains the fast linear default, and the nonlinear methods are reached for specifically when linearity is the demonstrated bottleneck.",
          "deepDive": {
            "q": "How does kernel PCA extend PCA to nonlinear structure using the same idea as the SVM kernel trick?",
            "a": "Kernel PCA applies the exact kernel-trick logic from SVMs to PCA. Standard PCA depends on the data only through inner products (the covariance/Gram matrix is built from x_i^T x_j), so you can replace every inner product with a kernel function K(x_i, x_j) = phi(x_i)^T phi(x_j) that computes the inner product in some high-dimensional (possibly infinite-dimensional) feature space defined by a nonlinear map phi - without ever computing phi explicitly. Doing PCA in that implicit feature space finds directions of maximum variance there, which correspond to nonlinear directions in the original input space, so a linear subspace in feature space becomes a curved manifold in the original space. Mechanically, you build the n-by-n kernel matrix, center it in feature space, and eigendecompose it (rather than eigendecomposing a d-by-d covariance), then project new points via their kernel evaluations against the training points. With an RBF kernel this can unroll smooth nonlinear structure that linear PCA misses. The costs mirror kernel SVMs: it's O(n^2) in the number of samples (the kernel matrix), you must choose the kernel and its parameters, and out-of-sample projection requires kernel evaluations against all training points - so it's powerful for moderate-sized data with smooth nonlinearity but doesn't scale to huge n the way linear PCA (via randomized SVD) does."
          }
        },
        {
          "q": "Interpret what the principal components actually are for a real dataset, and explain the limits of reading meaning into them.",
          "a": "Each principal component is a specific linear combination of ALL the original features - a weight vector (the eigenvector) saying how much each original feature contributes to that direction of variance. So for, say, a dataset of physical measurements, the first PC might have large positive weights on height, weight, and arm length simultaneously, which you could interpret as an overall 'body size' axis; a second PC might contrast some features against others (positive on some, negative on others), suggesting a 'shape' axis. The variance explained tells you how dominant each axis is. The limits on this interpretation are important: (1) PCs are chosen for variance, not meaning - the mathematical direction of maximum spread need not correspond to any natural or nameable concept, and often doesn't. (2) PCs are constrained to be orthogonal to each other, which is a mathematical convenience with no reason to align with real, possibly-correlated underlying factors - so a 'true' latent factor can be split across several PCs or mixed with others. (3) The signs and exact loadings are only identified up to sign and can be unstable under resampling, especially for components with similar eigenvalues. (4) A PC mixing many features is hard to act on. So loadings are a useful exploratory hint about what drives variance, but you should resist treating a principal component as a validated, interpretable factor - if interpretable factors are the goal, factor analysis or sparse PCA (which encourages each component to load on few features) are better-suited than vanilla PCA.",
          "deepDive": {
            "q": "How does sparse PCA improve interpretability, and what does it trade away to get it?",
            "a": "Sparse PCA adds a sparsity penalty (an L1/lasso-style penalty on the component loadings) to the PCA objective, which forces most of each component's weights to be exactly zero - so instead of a dense combination of all features, each sparse component loads on only a handful of original features, making it far easier to name and interpret ('this component is basically features 3, 7, and 12'). This directly addresses vanilla PCA's interpretability problem where every PC mixes all features. The trade-offs: (1) The sparse components generally capture less variance than the true top PCs (you're constraining the solution, so it's suboptimal for pure variance), and (2) they're no longer guaranteed to be exactly orthogonal, so the clean geometric decomposition of PCA is relaxed. There's also an extra hyperparameter (the sparsity strength) to tune, and the optimization is no longer a simple eigendecomposition (it's a harder, iterative problem). So sparse PCA buys interpretability and feature-selection-like behavior at the cost of some variance captured and PCA's mathematical tidiness - a worthwhile trade when the goal is to understand which original features drive the structure, rather than to maximally compress."
          }
        }
      ]
    },
    "flashcards": [
      {
        "type": "definition",
        "front": "What PCA finds",
        "back": "Orthogonal directions (principal components) of maximum variance; keep the top k for the best k-dim linear projection."
      },
      {
        "type": "intuition",
        "front": "Two equivalent PCA objectives",
        "back": "Max projected variance = min squared reconstruction error - the same problem, solved by the top eigenvectors of the covariance."
      },
      {
        "type": "formula",
        "front": "How PCA is computed",
        "back": "Eigendecomposition of covariance C (eigenvectors=PCs, eigenvalues=variance), or SVD of centered data X_c=U S V^T (PCs=V, lambda=sigma^2/n)."
      },
      {
        "type": "pitfall",
        "front": "Center (and usually standardize) before PCA",
        "back": "Uncentered -> top PC points at the mean offset. Unstandardized -> a large-range feature dominates by its units, not its structure."
      },
      {
        "type": "formula",
        "front": "Variance explained",
        "back": "Fraction by top k = (sum of top-k eigenvalues)/(sum of all). Choose k by cumulative variance (95%) or the scree elbow."
      },
      {
        "type": "pitfall",
        "front": "High variance != useful signal",
        "back": "PCA is unsupervised; discriminative signal can lie in a low-variance PC it discards. Use LDA/PLS for class-relevant directions."
      },
      {
        "type": "intuition",
        "front": "Why SVD over covariance eigendecomposition",
        "back": "SVD of X_c is more numerically stable (forming X^T X squares the condition number, losing small components) and enables randomized top-k SVD."
      },
      {
        "type": "pitfall",
        "front": "PCA is linear",
        "back": "Only finds flat subspaces - fails on curved manifolds (swiss roll). Use kernel PCA, Isomap, or t-SNE/UMAP for nonlinear structure."
      }
    ],
    "refs": [
      {
        "title": "Jolliffe & Cadima, Principal component analysis: a review (2016)",
        "url": "https://royalsocietypublishing.org/doi/10.1098/rsta.2015.0202"
      },
      {
        "title": "scikit-learn: PCA & decomposition",
        "url": "https://scikit-learn.org/stable/modules/decomposition.html#pca"
      },
      {
        "title": "Halko, Martinsson, Tropp - Randomized SVD (2011)",
        "url": "https://arxiv.org/abs/0909.4061"
      },
      {
        "title": "Hastie, Tibshirani, Friedman - Elements of Statistical Learning (Ch. 14)",
        "url": "https://hastie.su.domains/ElemStatLearn/"
      }
    ],
    "demos": [
      "pca",
      "isomap"
    ]
  }
};
