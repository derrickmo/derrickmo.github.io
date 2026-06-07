// concepts-index.js — the canonical "concepts" taxonomy.
// One object per atomic ML/DL idea; sites tag their lessons / demos / games /
// animations against these ids and the Connections panel + the /concepts/ hub
// pages assemble the cross-links automatically.
//
// Add a new concept by appending an entry. Tag content from a registry
// (play-demos.js, play-games.js, curriculum.js, hf-lectures.js) by giving the
// entry a `concepts: ["id-1", "id-2"]` field.
//
// FIELDS
//   id      — kebab-case slug (used in URLs: /concepts/<id>/)
//   name    — display name
//   area    — coarse grouping (used to filter the concept hub page)
//   summary — one-sentence plain-language hook
//   tex     — optional KaTeX formula (string, no $)
//   prereqs — optional [id...] of concepts that build into this one
//   leadsTo — optional [id...] of concepts that build on this one
//   refs    — optional [{ label, href }] canonical references
//   animation — optional path to a sandboxed SVG/CSS loop (public/viz/*.html);
//               embedded as the hero of the concept page via <iframe>.

const CONCEPTS_INDEX = {
  // ── Foundations & math ────────────────────────────────────────
  "gradient-descent": {
    id: "gradient-descent", name: "Gradient Descent", area: "Foundations",
    summary: "Follow the negative loss gradient downhill — the engine of essentially all neural-network training.",
    tex: "\\theta_{t+1} = \\theta_t - \\eta\\, \\nabla_\\theta \\mathcal{L}(\\theta_t)",
    prereqs: ["chain-rule"], leadsTo: ["backprop", "lr-schedule", "adam"],
    animation: "viz/gradient.html",
  },
  "newtons-method": {
    id: "newtons-method", name: "Newton's Method (Second-Order Optimization)", area: "Foundations",
    summary: "Use curvature (the Hessian) to jump to the minimum of the local quadratic model — one step on a true quadratic, but attracted to any stationary point, including saddles. The conceptual root of L-BFGS and natural-gradient methods.",
    tex: "\\theta_{t+1} = \\theta_t - H^{-1}\\nabla f(\\theta_t)",
    prereqs: ["gradient-descent"], leadsTo: [],
  },
  "coordinate-descent": {
    id: "coordinate-descent", name: "Coordinate Descent", area: "Foundations",
    summary: "Minimize one coordinate at a time, holding the rest fixed — cheap closed-form updates that power Lasso/glmnet, but slow to converge when features are correlated.",
    tex: "x_i \\leftarrow \\arg\\min_{u}\\ f(x_1,\\dots,u,\\dots,x_n)",
    prereqs: ["gradient-descent"], leadsTo: [],
  },
  "proximal-gradient": {
    id: "proximal-gradient", name: "Proximal Gradient & Soft-Thresholding (ISTA/FISTA)", area: "Foundations",
    summary: "Optimize smooth-plus-nonsmooth objectives by a gradient step followed by a proximal operator. For L1 the prox is soft-thresholding, which yields exact sparsity — the basis of Lasso and compressed sensing. FISTA adds momentum for O(1/k²).",
    tex: "x_{t+1} = \\mathrm{prox}_{t\\lambda}\\!\\big(x_t - t\\,\\nabla g(x_t)\\big)",
    prereqs: ["gradient-descent", "regularization"], leadsTo: [],
  },
  "quasi-newton": {
    id: "quasi-newton", name: "Quasi-Newton Methods (BFGS / L-BFGS)", area: "Foundations",
    summary: "Approximate the inverse Hessian from successive gradient differences instead of computing it. L-BFGS keeps only the last m pairs (O(mn) memory) and rebuilds the search direction with the two-loop recursion — the default optimizer for smooth, deterministic, mid-scale problems.",
    tex: "d_k = -H_k\\,\\nabla f(x_k),\\quad H_k \\approx (\\nabla^2 f)^{-1}\\ \\text{from } \\{s_i,y_i\\}",
    prereqs: ["newtons-method", "gradient-descent"], leadsTo: [],
  },
  "bayesian-linear-regression": {
    id: "bayesian-linear-regression", name: "Bayesian Linear Regression", area: "Foundations",
    summary: "Place a Gaussian prior on the weights and infer a Gaussian posterior in closed form, yielding a full predictive distribution with calibrated error bars. The MAP estimate is exactly ridge regression; the infinite-basis limit is a Gaussian process.",
    tex: "S_N^{-1} = \\alpha I + \\beta\\Phi^{\\top}\\Phi,\\quad m_N = \\beta S_N \\Phi^{\\top} t",
    prereqs: ["linear-regression", "bayes"], leadsTo: ["gaussian-process"],
  },
  "variational-inference": {
    id: "variational-inference", name: "Variational Inference (ELBO)", area: "Foundations",
    summary: "Approximate an intractable posterior by optimization: pick a tractable family q and maximize the ELBO (minimize reverse KL). Fast but biased — mean-field q underestimates variance and is mode-seeking. The training objective behind the VAE.",
    tex: "\\mathcal{L}(q) = \\mathbb{E}_q[\\log p(x,z)] - \\mathbb{E}_q[\\log q(z)] \\le \\log p(x)",
    prereqs: ["bayes", "gradient-descent"], leadsTo: ["vae"],
  },
  "backprop": {
    id: "backprop", name: "Backpropagation", area: "Foundations",
    summary: "Apply the chain rule through a computational graph to get gradients for every parameter at once.",
    prereqs: ["chain-rule", "gradient-descent"], leadsTo: ["activations"],
  },
  "rnn": {
    id: "rnn", name: "Recurrent Neural Network", area: "NLP",
    summary: "A neural net with a hidden state that carries information across a sequence — the pre-transformer way to model order.",
    prereqs: ["mlp"], leadsTo: ["attention"],
    animation: "viz/recurrence.html",
  },
  "chain-rule": {
    id: "chain-rule", name: "Chain Rule", area: "Foundations",
    summary: "Compose derivatives through a graph — the calculus identity that makes backprop possible.",
    tex: "\\frac{\\partial L}{\\partial x} = \\frac{\\partial L}{\\partial y}\\, \\frac{\\partial y}{\\partial x}",
  },
  "lr-schedule": {
    id: "lr-schedule", name: "Learning-Rate Schedule", area: "Foundations",
    summary: "Vary the step size over training — warmup then decay — to balance stability and convergence.",
    prereqs: ["gradient-descent"],
  },
  "adam": {
    id: "adam", name: "Adam Optimizer", area: "Foundations",
    summary: "Per-parameter adaptive step sizes via running estimates of the gradient and its square.",
    prereqs: ["gradient-descent"],
  },
  "activations": {
    id: "activations", name: "Activation Functions", area: "Foundations",
    summary: "The per-neuron nonlinearity that lets a stack of linear maps approximate any function.",
    tex: "\\mathrm{ReLU}(x) = \\max(0, x)",
  },
  "batch-norm": {
    id: "batch-norm", name: "Batch Normalization", area: "Neural Networks",
    summary: "Re-standardizes each feature across the mini-batch before the nonlinearity, then rescales/shifts with learnable γ, β. Keeps activation distributions stable across depth regardless of the weights above, which smooths the loss landscape and lets you train deeper nets at higher learning rates. Behaves differently at train (batch stats) vs inference (running averages) and degrades with small batches — motivating LayerNorm/RMSNorm in sequence models and large transformers.",
    tex: "\\hat z = \\frac{z - \\mu_B}{\\sqrt{\\sigma_B^2 + \\epsilon}}, \\quad y = \\gamma\\hat z + \\beta",
    prereqs: ["activations", "mlp"],
  },
  "weight-init": {
    id: "weight-init", name: "Weight Initialization", area: "Neural Networks",
    summary: "The variance weights are drawn from controls whether the forward signal (and backward gradient) stays at unit scale through depth or diverges exponentially. Xavier/Glorot uses Var(W)=1/fan_in (correct for linear/tanh); He/Kaiming uses 2/fan_in to compensate for ReLU zeroing half the variance. Wrong scale → exploding (saturation/NaN) or vanishing (dead) signal. The matching scheme keeps std≈1 across all layers, which is what makes deep nets trainable from scratch.",
    tex: "\\mathrm{Var}(W) = \\frac{1}{\\text{fan\\_in}}\\ (\\text{Xavier}), \\quad \\frac{2}{\\text{fan\\_in}}\\ (\\text{He})",
    prereqs: ["activations", "mlp"],
  },
  "contrastive-learning": {
    id: "contrastive-learning", name: "Contrastive Learning", area: "Neural Networks",
    summary: "Self-supervised representation learning: make two augmented views of the same item agree in embedding space (positives) while separating all other items (negatives), via the NT-Xent/InfoNCE loss with temperature τ. Minimizing it yields alignment (positives collapse) + uniformity (items spread evenly), the basis of SimCLR, MoCo, and CLIP. Needs many negatives (large batches/queues) and good augmentations; non-contrastive variants (BYOL, VICReg) avoid the collapse problem differently.",
    tex: "\\ell_i = -\\log\\frac{\\exp(\\mathrm{sim}(z_i,z_i^+)/\\tau)}{\\sum_{k\\neq i}\\exp(\\mathrm{sim}(z_i,z_k)/\\tau)}",
    prereqs: ["embeddings", "softmax"],
  },
  "softmax": {
    id: "softmax", name: "Softmax", area: "Foundations",
    summary: "Turn a vector of logits into a probability distribution; the workhorse output and attention nonlinearity.",
    tex: "\\mathrm{softmax}(z)_i = \\frac{e^{z_i}}{\\sum_j e^{z_j}}",
  },
  "cross-entropy": {
    id: "cross-entropy", name: "Cross-Entropy", area: "Foundations",
    summary: "The loss that measures how much a predicted distribution disagrees with the true labels.",
    tex: "H(p, q) = -\\sum_i p_i \\log q_i", prereqs: ["softmax"],
  },
  "bias-variance": {
    id: "bias-variance", name: "Bias-Variance Tradeoff", area: "Foundations",
    summary: "Generalization error decomposes into rigid-model bias plus over-fitting variance — the central tension of ML.",
    leadsTo: ["regularization", "double-descent", "cross-validation"],
  },
  "cross-validation": {
    id: "cross-validation", name: "Cross-Validation", area: "Foundations",
    summary: "Estimate out-of-sample error and select hyperparameters by rotating a held-out fold through the data: split into k folds, train on k−1 and score on the held-out one, average over all k. Train error falls monotonically with capacity and can't pick a model; the CV error is U-shaped and its minimum is the bias/variance sweet spot. k=5/10 are typical (k=N is leave-one-out). Watch for leakage — use grouped/stratified/time-series splits, and nested CV when selecting AND scoring.",
    tex: "\\mathrm{CV} = \\tfrac{1}{k}\\sum_{f=1}^{k} \\mathrm{err}\\big(\\text{model}_{-f},\\, \\text{fold}_f\\big)",
    prereqs: ["bias-variance"],
  },
  "double-descent": {
    id: "double-descent", name: "Double Descent", area: "Foundations",
    summary: "Test error is NOT a simple U in model capacity. As you add parameters it falls, then spikes at the interpolation threshold (#params ≈ #train points, where the model can just barely fit the data), then falls AGAIN in the over-parameterized regime. The peak is noise-driven and tied to ill-conditioning at P≈N; the second descent relies on a benign implicit bias (minimum-norm / SGD). Optimal regularization or early stopping removes the peak. Reconciles classical bias-variance with why huge networks generalize.",
    tex: "\\text{risk}(P) \\text{ peaks at } P/N = 1, \\text{ then decreases for } P \\gg N",
    prereqs: ["bias-variance", "regularization"],
  },
  "regularization": {
    id: "regularization", name: "Regularization (L2 / weight decay)", area: "Foundations",
    summary: "Penalize large weights to fight overfitting — the same dial whether it's ridge, weight decay, or dropout.",
    tex: "\\mathcal{L} + \\lambda \\lVert \\theta \\rVert^2",
  },
  "clt": {
    id: "clt", name: "Central Limit Theorem", area: "Foundations",
    summary: "Averages of many independent samples converge to a Gaussian — why the bell curve is everywhere.",
  },
  "fourier": {
    id: "fourier", name: "Fourier Series", area: "Foundations",
    summary: "Any periodic signal decomposes into a sum of sines and cosines — the backbone of signal processing and positional encodings.",
  },
  "search-astar": {
    id: "search-astar", name: "A* / Informed Search", area: "Foundations",
    summary: "Rank candidate states by cost-so-far plus an admissible estimate of cost-to-go (f = g + h).",
    tex: "f(n) = g(n) + h(n)",
    leadsTo: ["minimax", "mcts"],
  },

  // ── Classical ML ──────────────────────────────────────────────
  "kmeans": {
    id: "kmeans", name: "K-Means Clustering", area: "Classical ML",
    summary: "Alternate-assign-then-update centroids until clusters stabilize (Lloyd's algorithm).",
  },
  "knn": {
    id: "knn", name: "k-Nearest Neighbors", area: "Classical ML",
    summary: "Label by majority vote of the k closest training points — no training, the data is the model.",
    leadsTo: ["vector-search"],
  },
  "naive-bayes": {
    id: "naive-bayes", name: "Naive Bayes", area: "Classical ML",
    summary: "A generative classifier applying Bayes' rule with a deliberately naive twist: features are assumed conditionally independent given the class, so the class-conditional likelihood factorizes into per-feature terms (a diagonal-covariance Gaussian, or word counts for text). Fast, low-data, high-dimensional-friendly — the classic spam filter and a perennial baseline. Relaxing the diagonal constraint gives QDA (full per-class covariance) or LDA (shared); the independence assumption is usually wrong yet the argmax is often still right, though predicted probabilities end up overconfident/poorly calibrated.",
    tex: "\\hat y = \\arg\\max_c\\; P(c)\\prod_{j} P(x_j \\mid c)",
    prereqs: ["bayes"], leadsTo: ["svm"],
  },
  "decision-tree": {
    id: "decision-tree", name: "Decision Tree", area: "Classical ML",
    summary: "Split feature space greedily by the cut that most reduces impurity; the building block of forests and boosting.",
    leadsTo: ["entropy", "ensembles"],
  },
  "ensembles": {
    id: "ensembles", name: "Ensembles (Bagging & Boosting)", area: "Classical ML",
    summary: "Combine many trees to beat any single one. Bagging trains each tree on a bootstrap resample and averages them, cutting VARIANCE (random forests add per-split feature randomness) — wants deep, high-variance learners and is order-independent. Boosting fits trees sequentially to the residual error, adding a shrunken step ν·tree, cutting BIAS — wants shallow weak learners and generalizes residual-fitting to any differentiable loss (gradient boosting: XGBoost/LightGBM). The dominant approach for tabular data.",
    tex: "\\text{bagging: } \\bar f = \\tfrac1M\\sum_m f_m, \\quad \\text{boosting: } F_M = F_0 + \\nu\\sum_m h_m",
    prereqs: ["decision-tree", "bias-variance"],
  },
  "svm": {
    id: "svm", name: "SVM (Max-Margin + Kernels)", area: "Classical ML",
    summary: "Find the widest-margin separating boundary; bend it nonlinearly with the kernel trick.",
    tex: "\\min_w \\tfrac{1}{2}\\lVert w \\rVert^2 + C \\sum_i \\xi_i",
    leadsTo: ["attention", "gaussian-process"],
  },
  "gaussian-process": {
    id: "gaussian-process", name: "Gaussian Processes", area: "Classical ML",
    summary: "A distribution over functions defined by a kernel: any finite set of points is jointly Gaussian. Conditioning on observations gives a closed-form posterior — mean k*ᵀ(K+σ²I)⁻¹y and variance that shrinks at data and grows away from it, so predictions come with honest, calibrated uncertainty. The kernel (lengthscale, amplitude) is the entire inductive bias. Exact inference is O(n³) (matrix inverse), the basis of Bayesian optimization and kriging; sparse/inducing-point methods scale it up.",
    tex: "\\mu(x_*)=k_*^\\top(K+\\sigma_n^2 I)^{-1}y,\\quad \\sigma^2(x_*)=k_{**}-k_*^\\top(K+\\sigma_n^2 I)^{-1}k_*",
    prereqs: ["bayes", "svm"],
  },
  "pca": {
    id: "pca", name: "PCA / SVD", area: "Classical ML",
    summary: "Project data onto the eigenvectors of its covariance — the basic linear dimensionality reduction.",
    leadsTo: ["embeddings", "lora", "tsne", "ica"],
  },
  "ica": {
    id: "ica", name: "Independent Component Analysis", area: "Classical ML",
    summary: "Blind source separation: recover independent source signals from linear mixtures using only the mixtures. Where PCA decorrelates (second-order, orthogonal directions), ICA seeks statistical independence (all orders), found by maximizing non-Gaussianity — justified by the CLT, since mixtures look more Gaussian than their parts. FastICA whitens with PCA then runs a fixed-point iteration with a contrast like tanh. Recovers sources up to scale, sign, and permutation; at most one source may be Gaussian. Used for the cocktail-party problem and EEG/MEG/fMRI artifact removal.",
    tex: "s = W x,\\quad W = \\arg\\max\\ \\text{nonGaussianity}(Wx)",
    prereqs: ["pca", "clt"],
  },
  "tsne": {
    id: "tsne", name: "t-SNE / UMAP", area: "Classical ML",
    summary: "Nonlinear dimensionality reduction for visualization that preserves local NEIGHBORHOODS, not distances. Converts high-D distances to neighbor probabilities (Gaussian, width set by perplexity), matches them in 2D with a heavy-tailed Student-t, and minimizes KL(P‖Q) by gradient descent — the fat tail lets clusters separate without crowding. Unlike PCA it separates nonlinearly-tangled clusters, but cluster sizes and inter-cluster gaps are NOT meaningful and results depend on perplexity/seed. UMAP is the faster modern alternative.",
    tex: "q_{ij} = \\frac{(1+\\lVert y_i-y_j\\rVert^2)^{-1}}{\\sum_{k\\neq l}(1+\\lVert y_k-y_l\\rVert^2)^{-1}}",
    prereqs: ["pca", "embeddings"],
  },
  "manifold-learning": {
    id: "manifold-learning", name: "Manifold Learning (Isomap)", area: "Classical ML",
    summary: "Nonlinear dimensionality reduction that assumes data lies on a low-dimensional manifold curved through a high-D space. Isomap measures GEODESIC distance (shortest path through a k-NN graph) instead of straight-line distance, then runs classical MDS (double-center the squared-distance matrix, take top eigenvectors) to embed while preserving global geometry. Unrolls swiss-roll-like structure that PCA folds. Hinges on the neighborhood graph: too-large k or noise creates short-circuit edges, too-small k disconnects it. Cousin of LLE, Laplacian eigenmaps, and spectral methods; t-SNE/UMAP instead preserve local neighborhoods.",
    tex: "B = -\\tfrac{1}{2} J D_{geo}^2 J,\\quad Y = \\text{top eigenvectors}(B)",
    prereqs: ["pca", "spectral-clustering"],
  },
  "gmm-em": {
    id: "gmm-em", name: "Gaussian Mixtures & EM", area: "Classical ML",
    summary: "Soft clustering by alternating responsibilities (E-step) and Gaussian re-fits (M-step) — the ancestor of variational inference.",
    leadsTo: ["vae"],
  },
  "roc": {
    id: "roc", name: "ROC / PR Curves", area: "Classical ML",
    summary: "Slide a threshold across a score model to read off recall, precision, and the threshold-free AUC.",
  },

  // ── Neural networks ───────────────────────────────────────────
  "mlp": {
    id: "mlp", name: "Multilayer Perceptron", area: "Neural Networks",
    summary: "Stack linear layers and nonlinearities — the universal approximator that backprop trains.",
    prereqs: ["perceptron", "activations", "backprop"], leadsTo: ["cnn", "rnn", "transformer-block"],
    animation: "viz/feedforward.html",
  },
  "perceptron": {
    id: "perceptron", name: "The Perceptron", area: "Neural Networks",
    summary: "A single linear threshold unit, ŷ=sign(w·x+b), trained online by the first mistake-driven learning rule: do nothing when right, nudge w←w+η·y·x when wrong. The Perceptron Convergence Theorem guarantees a separating hyperplane in finite updates IF the data is linearly separable; on non-separable data it never halts (Minsky & Papert's XOR critique). The historical seed of neural nets — smooth the step activation and train by gradient descent to get the MLP; add a max margin to get the SVM.",
    tex: "\\text{if } y(w\\cdot x + b) \\le 0:\\; w \\leftarrow w + \\eta\\, y\\, x",
    prereqs: ["linear-regression"], leadsTo: ["mlp", "svm"],
  },
  "convolution": {
    id: "convolution", name: "Convolution (CNN)", area: "Computer Vision",
    summary: "Slide a small learned kernel across an image — weight sharing + translation invariance.",
    animation: "viz/convolution.html",
  },
  "cnn": {
    id: "cnn", name: "Convolutional Neural Network", area: "Computer Vision",
    summary: "Stacks of convolutions and pooling that build a feature hierarchy from edges to objects.",
    prereqs: ["convolution"],
  },
  "edge-detection": {
    id: "edge-detection", name: "Edge Detection (Canny)", area: "Computer Vision",
    summary: "Find where image brightness changes sharply. The Canny pipeline: Gaussian blur (denoise) -> Sobel gradient (magnitude + direction) -> non-maximum suppression (thin ridges to 1px along the gradient) -> double threshold (strong vs weak pixels) -> hysteresis (keep weak pixels connected to strong ones). The high-bar-to-start / low-bar-to-continue hysteresis rule links broken contours while rejecting isolated noise. Still a standard preprocessor before Hough line/circle detection and a building block of HOG/SIFT-style features.",
    prereqs: ["convolution"],
  },
  "iou-nms": {
    id: "iou-nms", name: "IoU & Non-Max Suppression", area: "Computer Vision",
    summary: "Score box overlap with IoU; greedily suppress duplicates — the cleanup step every detector ends with.",
  },
  "hough-transform": {
    id: "hough-transform", name: "Hough Transform", area: "Computer Vision",
    summary: "Detect parametric shapes (lines, circles) by voting in parameter space. Each edge point votes for every shape that could pass through it — a line point traces a sinusoid in (rho, theta) space via rho = x*cos(theta) + y*sin(theta). Collinear points vote for the same cell, so a real line is a bright accumulator peak; reading peaks back out recovers the lines. Robust to noise and gaps because scattered points rarely conspire into a false peak. Generalizes to circles (a,b,r) and arbitrary shapes; the voting-for-consensus idea is shared with RANSAC.",
    prereqs: ["edge-detection"],
  },
  "harris-corners": {
    id: "harris-corners", name: "Harris Corner Detector", area: "Computer Vision",
    summary: "Find corner keypoints — points where image intensity changes in two directions at once. Build the structure tensor M by summing gradient products (Ix^2, Iy^2, IxIy) over a Gaussian window; its two eigenvalues describe how intensity varies in the two principal directions. Flat = both small, edge = one large, corner = both large. The response R = det(M) - k*trace(M)^2 detects the both-large case cheaply (positive at corners, negative at edges), then threshold + non-max suppression localize them. Foundation of feature tracking, image matching, panorama stitching, camera calibration, and SLAM.",
    prereqs: ["edge-detection", "pca"],
  },
  "optical-flow": {
    id: "optical-flow", name: "Optical Flow (Lucas-Kanade)", area: "Computer Vision",
    summary: "Estimate the per-pixel motion field between two frames. Assume brightness constancy — a moving point keeps its intensity — and linearize to the optical-flow constraint Ix*u + Iy*v + It = 0: one equation, two unknowns, so a single pixel is ambiguous (the aperture problem, where you only recover motion normal to an edge). Lucas-Kanade assumes a small window shares one motion, stacks the constraints, and solves the 2x2 least-squares system (the same structure-tensor matrix as Harris, now with a temporal term). Only valid for small motion because brightness is linearized; coarse-to-fine image pyramids extend the range. Powers video stabilization, frame interpolation, visual odometry/SLAM, and action recognition.",
    prereqs: ["harris-corners", "edge-detection"],
  },
  "hog": {
    id: "hog", name: "Histogram of Oriented Gradients", area: "Computer Vision",
    summary: "A hand-designed image descriptor that keeps where edges point and discards exact intensities. Compute gradient magnitude + orientation per pixel, split the image into small cells, and build a magnitude-weighted histogram of unsigned orientations (0-180, typically 9 bins) in each cell. Then block-normalize (L2 over overlapping cell blocks) so only the SHAPE of the orientation distribution survives — giving robustness to lighting and contrast. The concatenated cell histograms form a fixed-length feature vector. HOG + a linear SVM (Dalal-Triggs 2005) was the leading pedestrian/object detector before deep learning, and is the explicit ancestor of the oriented-edge filters a CNN learns in its first layers.",
    prereqs: ["edge-detection", "convolution"],
  },
  "data-augmentation": {
    id: "data-augmentation", name: "Data Augmentation", area: "Computer Vision",
    summary: "Synthesize new training examples by applying random transforms that change the input but not the label — horizontal flip, rotation, random-resized-crop, color/brightness jitter, and cutout/random-erasing for images. This enlarges and diversifies a finite dataset for free and bakes in known invariances, so the model learns features that survive the nuisances rather than memorizing exact pixels — one of the most reliable regularizers in deep learning. Each transform encodes a domain assumption (flipping a digit can change its label), so the augmentation set is task-specific. The idea generalizes to token masking/synonym swaps in NLP and time/frequency masking on audio, and the two-view scheme is the engine of contrastive self-supervised learning.",
    prereqs: ["convolution", "regularization"],
  },
  "image-segmentation": {
    id: "image-segmentation", name: "Image Segmentation (Watershed)", area: "Computer Vision",
    summary: "Partition an image into regions. Watershed treats intensity (or the distance transform) as a topographic surface and floods it from markers: water rises from each seed basin and a dam — the watershed line — is built where two basins meet, giving the boundary between touching objects that a plain threshold would merge. Marker-controlled watershed seeds the basins at the regional maxima of the distance map to avoid the method's notorious over-segmentation from noisy gradients; too few markers under-segments (objects fuse), too many over-segments (objects shatter). The grow-from-seeds-and-cut-on-collision idea connects to region growing, graph cuts, and superpixels, and prefigures the object-vs-object boundaries learned by modern instance-segmentation networks.",
    prereqs: ["edge-detection"],
  },

  // ── NLP & Transformers ────────────────────────────────────────
  "tokenization": {
    id: "tokenization", name: "Tokenization (BPE)", area: "NLP",
    summary: "Subword units learned by merging frequent character pairs — every LLM's first step.",
  },
  "markov": {
    id: "markov", name: "Markov / n-gram Models", area: "NLP",
    summary: "Predict the next token from the last n — the lookup-table ancestor of every LLM.",
    leadsTo: ["transformer-block"],
  },
  "embeddings": {
    id: "embeddings", name: "Embeddings", area: "NLP",
    summary: "Map tokens (or items) to vectors so that distance and direction encode meaning.",
    leadsTo: ["vector-search", "attention", "word2vec"],
    animation: "viz/embeddings.html",
  },
  "word2vec": {
    id: "word2vec", name: "word2vec (Skip-gram)", area: "NLP",
    summary: "Learn a dense vector per word by predicting its context (skip-gram) or the word from its context (CBOW), trained by SGD on softmax / negative sampling over co-occurrences. Embodies the distributional hypothesis — words in similar contexts get similar vectors — and yields the famous linear analogy structure (king−man+woman≈queen). The static-embedding ancestor of contextual transformer embeddings; one vector per word, so it can't disambiguate senses and inherits corpus bias.",
    tex: "P(o\\mid c) = \\frac{\\exp(u_o^\\top v_c)}{\\sum_w \\exp(u_w^\\top v_c)}",
    prereqs: ["embeddings", "softmax"],
  },
  "attention": {
    id: "attention", name: "Self-Attention", area: "Transformers",
    summary: "Score every pair of tokens by a softmax over scaled dot products; the core op of every transformer.",
    tex: "\\mathrm{Attn}(Q,K,V) = \\mathrm{softmax}\\!\\left(\\tfrac{QK^\\top}{\\sqrt{d_k}}\\right) V",
    prereqs: ["softmax", "embeddings"], leadsTo: ["multi-head", "positional-encoding"],
  },
  "multi-head": {
    id: "multi-head", name: "Multi-Head Attention", area: "Transformers",
    summary: "Run several attention heads in parallel so one layer can track multiple relationships at once.",
    prereqs: ["attention"],
  },
  "positional-encoding": {
    id: "positional-encoding", name: "Positional Encoding (sinusoidal / RoPE)", area: "Transformers",
    summary: "Inject order into attention — sinusoidal vectors or RoPE rotations that encode relative position.",
    prereqs: ["attention", "fourier"],
  },
  "transformer-block": {
    id: "transformer-block", name: "Transformer Block", area: "Transformers",
    summary: "Attention + feed-forward + residual + layer-norm — the basic stacked unit of GPT/BERT/Llama.",
    prereqs: ["attention", "multi-head"],
    animation: "viz/transformer.html",
  },
  "decoding": {
    id: "decoding", name: "Decoding Strategies", area: "NLP",
    summary: "Pick the next token from the model's distribution — greedy, beam, top-k, nucleus, temperature.",
    prereqs: ["softmax"],
  },

  // ── Generative ────────────────────────────────────────────────
  "vae": {
    id: "vae", name: "Variational Autoencoder", area: "Generative",
    summary: "Encode to a Gaussian latent, sample via the reparameterization trick, decode — KL pulls the latent to a usable prior.",
    prereqs: ["gmm-em"], leadsTo: ["diffusion"],
  },
  "diffusion": {
    id: "diffusion", name: "Diffusion Models", area: "Generative",
    summary: "Add noise to data step by step, then learn to reverse it — the engine behind modern image/video generators.",
    prereqs: ["mlp", "vae"],
  },

  // ── Fine-tuning & alignment ──────────────────────────────────
  "lora": {
    id: "lora", name: "LoRA (Low-Rank Adaptation)", area: "Fine-Tuning",
    summary: "Freeze the base model and learn a thin rank-r product B·A per layer — adapt big models on a budget.",
    prereqs: ["pca"],
  },
  "scaling-laws": {
    id: "scaling-laws", name: "Neural Scaling Laws", area: "Training Systems",
    summary: "Test loss falls as a power law in parameters, data, and compute — letting you plan large training runs.",
  },

  // ── Reinforcement learning ───────────────────────────────────
  "mdp-bellman": {
    id: "mdp-bellman", name: "MDPs & Bellman Backup", area: "Reinforcement Learning",
    summary: "Sequential decision-making under uncertainty; the Bellman equation defines optimal value recursively.",
    tex: "V^*(s) = \\max_a \\bigl[ R(s,a) + \\gamma\\, \\mathbb{E}_{s'} V^*(s') \\bigr]",
    leadsTo: ["q-learning"],
  },
  "q-learning": {
    id: "q-learning", name: "Q-Learning / TD", area: "Reinforcement Learning",
    summary: "Sample the Bellman backup from experience — model-free RL's foundational update.",
    prereqs: ["mdp-bellman"],
  },
  "bandit": {
    id: "bandit", name: "Multi-Armed Bandit (Explore/Exploit)", area: "Reinforcement Learning",
    summary: "Choose between uncertain options to minimize cumulative regret — RL's simplest, omnipresent problem.",
    leadsTo: ["mcts"],
  },
  "minimax": {
    id: "minimax", name: "Minimax + Alpha-Beta", area: "Game AI",
    summary: "Search the game tree assuming the opponent plays optimally; prune branches that can't improve the result.",
    prereqs: ["search-astar"],
  },
  "mcts": {
    id: "mcts", name: "Monte-Carlo Tree Search", area: "Game AI",
    summary: "Build a search tree biased by UCB and random rollouts — the engine behind AlphaGo and AlphaZero.",
    prereqs: ["bandit", "minimax"],
  },
  "cfr": {
    id: "cfr", name: "Counterfactual Regret Minimization", area: "Game AI",
    summary: "Self-play with regret matching — converges to a Nash equilibrium for imperfect-information games like poker.",
  },
  "neuroevolution": {
    id: "neuroevolution", name: "Neuroevolution", area: "Reinforcement Learning",
    summary: "Improve a neural-net policy by selection + crossover + mutation, no gradients required.",
  },

  // ── Retrieval & RAG ──────────────────────────────────────────
  "vector-search": {
    id: "vector-search", name: "Vector Search / ANN", area: "Retrieval",
    summary: "Embed items, then fetch the k nearest by cosine or Euclidean — the engine under semantic search and RAG.",
    prereqs: ["embeddings", "knn"],
  },

  // ── Applications / forecasting ───────────────────────────────
  "forecasting": {
    id: "forecasting", name: "Exponential Smoothing & ARIMA", area: "Time Series",
    summary: "Track a series' level, trend, and seasonality with classical smoothers — strong baselines for any deep forecaster.",
  },
  "simulated-annealing": {
    id: "simulated-annealing", name: "Simulated Annealing", area: "Foundations",
    summary: "Local search with a Metropolis acceptance rule — accept worse moves with probability e^{-ΔE/T}, then cool. The general-purpose escape from local minima.",
    tex: "P(\\text{accept}) = \\exp\\!\\left(-\\frac{\\Delta E}{T}\\right)",
    prereqs: ["search-astar"], leadsTo: ["neuroevolution"],
  },
  "entropy": {
    id: "entropy", name: "Entropy & Information Gain", area: "Foundations",
    summary: "Measure uncertainty in bits — the criterion behind decision-tree splits, cross-entropy, and information-greedy strategies.",
    tex: "H(p) = -\\sum_i p_i \\log p_i",
  },
  "bayes": {
    id: "bayes", name: "Bayes' Rule (Conjugate Updating)", area: "Foundations",
    summary: "Update a prior belief into a posterior with new evidence — Beta-Bernoulli is the closed-form case behind A/B tests, Thompson sampling, and uncertainty estimation.",
    tex: "P(\\theta \\mid D) = \\frac{P(D \\mid \\theta)\\, P(\\theta)}{P(D)}",
    prereqs: ["cross-entropy"], leadsTo: ["bandit", "vae", "kalman-filter", "mcmc"],
  },
  "mcmc": {
    id: "mcmc", name: "MCMC (Metropolis-Hastings)", area: "Foundations",
    summary: "Sample from a distribution known only up to a constant by simulating a Markov chain whose stationary distribution is the target. Random-walk Metropolis proposes x'=x+N(0,σ²I) and accepts with prob min(1, p(x')/p(x)); the visited points (after burn-in) are correlated samples from p. The engine of practical Bayesian inference (Stan, PyMC) when the posterior has no closed form. Proposal scale trades acceptance against mixing; high dimensions and separated modes need gradient-based samplers (HMC/NUTS).",
    tex: "\\alpha = \\min\\!\\left(1, \\dfrac{p(x')}{p(x)}\\right)",
    prereqs: ["bayes", "clt"],
  },
  "importance-sampling": {
    id: "importance-sampling", name: "Importance Sampling", area: "Foundations",
    summary: "Estimate an expectation under a target p by sampling an easier proposal q and reweighting by w=p/q: E_p[f]=E_q[w·f]. Lets you hit rare events (tail probabilities) that naive Monte Carlo misses, and underlies off-policy RL evaluation and particle-filter resampling. Quality lives and dies by the proposal — if q has lighter tails than p the weights have infinite variance, so monitor the Effective Sample Size ESS=(Σw)²/Σw². Self-normalized IS needs the target only up to a constant. Degrades in high dimensions; fixes are adaptive/annealed IS and SMC.",
    tex: "\\mathbb{E}_p[f] = \\mathbb{E}_q\\!\\left[\\tfrac{p(x)}{q(x)} f(x)\\right],\\quad \\mathrm{ESS}=\\tfrac{(\\sum w_i)^2}{\\sum w_i^2}",
    prereqs: ["mcmc", "clt"],
  },
  "reservoir-sampling": {
    id: "reservoir-sampling", name: "Reservoir Sampling", area: "Foundations",
    summary: "Draw a uniform random sample of fixed size k from a stream of unknown/unbounded length in a single pass with O(k) memory. Vitter's Algorithm R: keep the first k, then accept item i (i>k) with probability k/i, evicting a uniformly random slot — so when the stream ends every item has probability k/n of being kept, independent of arrival order. The standard tool for sampling logs, events, and rows too big to store; Algorithm L skips faster, and A-Res/A-ExpJ handle weighted sampling. Unweighted, without replacement, fixed size.",
    tex: "\\Pr[\\text{keep item } i] = \\frac{k}{i}\\ (i>k); \\quad \\Pr[\\text{in final sample}]=\\frac{k}{n}",
    prereqs: ["clt"],
  },
  "count-min-sketch": {
    id: "count-min-sketch", name: "Count-Min Sketch", area: "Foundations",
    summary: "A probabilistic data structure for approximate frequency counts over a stream in sublinear memory: a d×w table of counters with d independent hash functions. Each item increments one counter per row; a query returns the MINIMUM of its d counters. Collisions only add, so it never underestimates — error ≤ ε·N with prob 1−δ for w≈e/ε, d≈ln(1/δ). Heavy hitters are estimated accurately; rare keys are noisy. Used for traffic monitoring, top-k/trending, frequency capping. Siblings: reservoir sampling (samples), Bloom filters (membership), HyperLogLog (distinct counts).",
    tex: "\\hat f(x) = \\min_{r} \\; \\mathrm{CMS}[r][h_r(x)] \\;\\ge\\; f(x)",
    prereqs: ["reservoir-sampling"],
  },
  "bloom-filter": {
    id: "bloom-filter", name: "Bloom Filter", area: "Foundations",
    summary: "A space-efficient probabilistic set: an m-bit array and k hash functions. Insert sets the k hashed bits; query passes only if all k are set. No false negatives ever (insertion only sets bits), but false positives occur when other keys happened to set a query's bits, at rate ≈(1−e^{−kn/m})^k, minimized at k=(m/n)·ln2. Used as a 'definitely-not-here' gate in databases, caches, crawlers, and CDNs to skip expensive lookups. Can't delete or enumerate (counting/cuckoo variants fix that); must be sized for the expected load.",
    tex: "\\Pr[\\text{false positive}] \\approx \\left(1 - e^{-kn/m}\\right)^k",
    prereqs: ["count-min-sketch"],
  },
  "kalman-filter": {
    id: "kalman-filter", name: "Kalman Filter", area: "Foundations",
    summary: "Optimal recursive state estimation for a linear-Gaussian system: keep a Gaussian belief (mean + covariance) over hidden state and alternately predict it forward through a motion model and update it toward each noisy measurement. The Kalman gain optimally blends model trust (process noise Q) against sensor trust (measurement noise R). It's exact recursive Bayesian filtering, the workhorse behind GPS/IMU sensor fusion, robotics/SLAM, and object tracking; nonlinear systems use the Extended/Unscented variants or particle filters.",
    tex: "K = P^- H^\\top (H P^- H^\\top + R)^{-1}",
    prereqs: ["bayes", "clt"],
  },
  "hmm-viterbi": {
    id: "hmm-viterbi", name: "HMM & the Viterbi Algorithm", area: "Foundations",
    summary: "A hidden Markov model has latent states that transition over time (Markov) and emit observations; Viterbi is the dynamic program that finds the single most-likely hidden state path in O(TK^2), working in log space to avoid underflow. It's exact MAP sequence decoding — the discrete-state sibling of the Kalman filter — and powered classical speech recognition, POS tagging, gene finding, and regime detection. Forward-backward gives per-step marginals; Baum-Welch (EM) learns the parameters.",
    tex: "\\delta_t(k) = \\max_j\\,[\\delta_{t-1}(j) + \\log A_{j,k}] + \\log B_k(o_t)",
    prereqs: ["markov", "bayes"],
  },
  "optimizers": {
    id: "optimizers", name: "Adaptive Optimizers (Momentum / RMSProp / Adam)", area: "Foundations",
    summary: "Practical generalizations of SGD: momentum builds velocity, adaptive methods rescale per-parameter step sizes — Adam combines both and dominates in practice.",
    tex: "m_t = \\beta_1 m_{t-1} + (1{-}\\beta_1)\\,g_t,\\quad v_t = \\beta_2 v_{t-1} + (1{-}\\beta_2)\\,g_t^{\\,2}",
    prereqs: ["gradient-descent"], leadsTo: ["lr-schedule"],
  },
  "gradient-clipping": {
    id: "gradient-clipping", name: "Gradient Clipping", area: "Training Systems",
    summary: "Bounds the update when a sharp region of the loss (a 'cliff', common in RNNs and deep transformers) produces an exploding gradient. Clip-by-norm rescales the whole gradient to a maximum length τ, preserving direction; clip-by-value caps each coordinate. A standard stability rail (often global-norm 1.0) paired with warmup. Biases the step when active, so it's tuned as a safety mechanism, not a primary regularizer.",
    tex: "g \\leftarrow g\\cdot\\min\\!\\Bigl(1,\\ \\tfrac{\\tau}{\\lVert g\\rVert}\\Bigr)",
    prereqs: ["gradient-descent", "rnn"],
  },
  "gan": {
    id: "gan", name: "Generative Adversarial Network", area: "Generative",
    summary: "Two networks duel — a generator fabricates samples, a discriminator scores them as real or fake. The game's equilibrium is a generator that matches the real distribution.",
    tex: "\\min_G \\max_D \\; \\mathbb{E}_x[\\log D(x)] + \\mathbb{E}_z[\\log(1 - D(G(z)))]",
    prereqs: ["mlp", "cross-entropy"], leadsTo: ["diffusion"],
  },
  "linear-regression": {
    id: "linear-regression", name: "Linear Regression", area: "Classical ML",
    summary: "Fit a line by minimizing squared error — convex, with a closed-form OLS solution. The simplest supervised model and the algebraic backbone of half of statistics.",
    tex: "\\hat{w} = (X^\\top X)^{-1} X^\\top y",
    leadsTo: ["logistic-regression", "pca"],
  },
  "logistic-regression": {
    id: "logistic-regression", name: "Logistic Regression", area: "Classical ML",
    summary: "Sigmoid over a linear score, trained with binary cross-entropy. The last layer of every neural classifier — and the multi-class generalization is softmax.",
    tex: "P(y{=}1 \\mid x) = \\sigma(w^\\top x + b)",
    prereqs: ["linear-regression", "cross-entropy"], leadsTo: ["mlp"],
  },
  "lstm-gates": {
    id: "lstm-gates", name: "LSTM Gates", area: "NLP",
    summary: "Gated recurrent cell with input/forget/output gates over a cell state — the additive memory channel that beat plain RNNs and inspired ResNet skip connections.",
    tex: "c_t = f_t \\odot c_{t-1} + i_t \\odot g_t",
    prereqs: ["rnn"], leadsTo: ["attention"],
  },
  "beam-search": {
    id: "beam-search", name: "Beam Search", area: "NLP",
    summary: "Keep the top-K partial sequences by total log-probability at every decoding step. Greedy is K=1; bigger K finds higher-probability sentences at multiplied cost.",
    prereqs: ["decoding"],
  },
  "kv-cache": {
    id: "kv-cache", name: "KV Cache", area: "Transformers",
    summary: "Cache the keys and values for every prefix token during autoregressive generation so each new step only computes one new K/V — the trick behind tractable LLM inference.",
    prereqs: ["attention"],
  },
  "gnn": {
    id: "gnn", name: "Graph Neural Network", area: "Applications",
    summary: "Update each node's feature by aggregating from its neighbors. Stack a few layers and the network smooths cluster structure; stack too many and features over-smooth.",
    tex: "h_v^{(\\ell+1)} = \\sigma\\!\\left(W \\cdot \\mathrm{mean}_{u \\in N(v) \\cup \\{v\\}} h_u^{(\\ell)}\\right)",
    prereqs: ["mlp"],
  },
  "rope": {
    id: "rope", name: "Rotary Position Embedding (RoPE)", area: "Transformers",
    summary: "Encode position by rotating Q and K in 2-D pair-blocks by an angle that grows linearly with position; the attention score then depends only on the relative offset (m-n).",
    tex: "\\theta_i(m) = m \\cdot 10000^{-2i/d}",
    prereqs: ["positional-encoding", "attention"],
  },
  "dbscan": {
    id: "dbscan", name: "DBSCAN", area: "Classical ML",
    summary: "Density-based clustering: declare any point with at least MIN_PTS neighbors within EPS a core point, link cores into clusters, sweep up reachable borders, label the rest as noise.",
    prereqs: ["knn"],
  },
  "hierarchical-clustering": {
    id: "hierarchical-clustering", name: "Hierarchical Clustering", area: "Classical ML",
    summary: "Agglomerative clustering builds a tree (dendrogram) by repeatedly merging the two closest clusters; cut the tree at any height to get that many clusters — no k chosen up front, and you get a full multi-resolution hierarchy. The linkage defines cluster distance: single (min pair, chains, ~MST), complete (max pair, compact), average (mean), or Ward (least within-cluster variance increase, k-means-like). Greedy and irreversible, O(n²) memory / O(n³) time, and sensitive to linkage + metric; the cut height is still a judgment call (gap statistic, silhouette).",
    tex: "d_{\\text{Ward}}(A,B) = \\sqrt{\\tfrac{2|A||B|}{|A|+|B|}}\\,\\lVert \\bar{A}-\\bar{B}\\rVert",
    prereqs: ["kmeans"],
  },
  "spectral-clustering": {
    id: "spectral-clustering", name: "Spectral Clustering", area: "Classical ML",
    summary: "Cluster by graph connectivity rather than Euclidean distance. Build a similarity graph (RBF or k-NN weights W), form the normalized Laplacian L = I − D^{−1/2}WD^{−1/2}, take its K smallest eigenvectors as an embedding, and run k-means there. A relaxation of the normalized-cut objective; the eigenvectors separate connected components, so it clusters non-convex shapes (rings, moons) that centroid methods cut through. Needs K and a good similarity graph; exact eigendecomposition is O(n³).",
    tex: "L = I - D^{-1/2} W D^{-1/2}, \\quad \\text{cluster on bottom-}K\\text{ eigenvectors}",
    prereqs: ["kmeans", "pca"],
  },
  "label-propagation": {
    id: "label-propagation", name: "Label Propagation", area: "Classical ML",
    summary: "Graph-based semi-supervised learning: build a similarity graph over labeled + unlabeled points, seed the labeled nodes, and iterate F←D⁻¹W·F while re-clamping seeds so label mass diffuses along dense regions. A handful of labels can classify a whole manifold via the cluster assumption — points linked through high-density regions share a label. Same random-walk/graph-Laplacian machinery as spectral clustering and PageRank. Transductive (labels this set, not a reusable model) and very sensitive to graph construction; a bad graph confidently spreads errors.",
    tex: "F \\leftarrow D^{-1} W\\, F, \\quad \\text{clamp labeled rows}",
    prereqs: ["knn", "spectral-clustering"],
  },
  "kernel-density": {
    id: "kernel-density", name: "Kernel Density Estimation", area: "Classical ML",
    summary: "Nonparametric density estimation: place a kernel K (Gaussian, Epanechnikov, box) on every sample and average them, f̂(x)=1/(Nh)·ΣK((x−x_i)/h). The bandwidth h is a pure bias/variance knob — too small overfits into spikes, too large oversmooths and merges modes. The smooth upgrade to a histogram; underlies kernel regression (Nadaraya-Watson), mean-shift clustering, anomaly detection, and violin plots. Suffers the curse of dimensionality and leaks mass past hard boundaries; bandwidth choice (CV / Silverman's rule) is the whole game.",
    tex: "\\hat f(x) = \\frac{1}{Nh}\\sum_{i=1}^{N} K\\!\\left(\\frac{x - x_i}{h}\\right)",
    prereqs: ["clt", "knn"],
  },
  "policy-gradient": {
    id: "policy-gradient", name: "Policy Gradient (REINFORCE)", area: "Reinforcement Learning",
    summary: "Push up the log-probability of high-reward actions, push down low-reward ones — the foundation of every modern policy-based RL method, including PPO, GRPO, and RLHF.",
    tex: "\\nabla_\\theta J = \\mathbb{E}_{\\pi_\\theta}\\bigl[ \\nabla_\\theta \\log \\pi_\\theta(a \\mid s) \\cdot (R - b) \\bigr]",
    prereqs: ["mdp-bellman", "gradient-descent"],
  },
  "actor-critic": {
    id: "actor-critic", name: "Actor-Critic", area: "Reinforcement Learning",
    summary: "Train a value function (critic) and a policy (actor) together: the critic's bootstrapped TD error is the low-variance advantage that drives the policy gradient. The workhorse behind A2C, A3C, PPO, and RLHF.",
    tex: "\\delta_t = r_t + \\gamma V(s_{t+1}) - V(s_t); \\quad \\theta \\leftarrow \\theta + \\alpha\\, \\delta_t\\, \\nabla_\\theta \\log \\pi_\\theta(a_t \\mid s_t)",
    prereqs: ["policy-gradient", "mdp-bellman"],
  },
  "dqn": {
    id: "dqn", name: "Deep Q-Network (DQN)", area: "Reinforcement Learning",
    summary: "Approximate Q(s,a) with a neural network and stabilize the bootstrapped training with two tricks — an experience replay buffer (decorrelate samples) and a periodically synced target network (a fixed bootstrap target). The algorithm that learned Atari from pixels.",
    tex: "L(\\theta) = \\mathbb{E}\\Bigl[ \\bigl( r + \\gamma \\max_{a'} Q_{\\theta^-}(s',a') - Q_\\theta(s,a) \\bigr)^2 \\Bigr]",
    prereqs: ["mdp-bellman", "backprop"],
  },
  "reward-model": {
    id: "reward-model", name: "Reward Model (RLHF)", area: "Reinforcement Learning",
    summary: "Turn pairwise human preferences into a scalar reward with the Bradley-Terry model: P(a≻b)=σ(r(a)−r(b)). The learned reward is the signal a policy method (PPO) then maximizes — step two of RLHF, and the objective DPO optimizes directly.",
    tex: "L = -\\mathbb{E}_{(w,l)}\\bigl[ \\log \\sigma\\bigl( r_\\theta(w) - r_\\theta(l) \\bigr) \\bigr]",
    prereqs: ["logistic-regression", "policy-gradient"],
  },
  "dpo": {
    id: "dpo", name: "Direct Preference Optimization (DPO)", area: "Reinforcement Learning",
    summary: "Align a policy directly from preference pairs without a separate reward model or RL loop: the policy implicitly defines the reward r(y)=β·log(π(y)/π_ref(y)), turning the RLHF objective into one supervised-style loss. Reaches the same KL-regularized optimum as RLHF.",
    tex: "L = -\\log \\sigma\\Bigl( \\beta \\log \\tfrac{\\pi_\\theta(y_w)}{\\pi_{ref}(y_w)} - \\beta \\log \\tfrac{\\pi_\\theta(y_l)}{\\pi_{ref}(y_l)} \\Bigr)",
    prereqs: ["reward-model", "policy-gradient"],
  },
  "sarsa": {
    id: "sarsa", name: "SARSA & On-policy vs Off-policy TD", area: "Reinforcement Learning",
    summary: "Temporal-difference control comes in two flavors that differ only in the bootstrap target. SARSA is on-policy — it updates toward Q(s',a') for the action it will actually take, so it accounts for its own exploration and learns safer policies. Q-learning is off-policy — it updates toward max_a' Q(s',a'), learning the optimal greedy policy from any behavior, which is what makes replay and DQN possible. On Cliff Walking, SARSA takes the safe path and Q-learning the optimal cliff-edge path.",
    tex: "Q(s,a) \\leftarrow Q(s,a) + \\alpha\\,[\\,r + \\gamma\\,Q(s',a') - Q(s,a)\\,]",
    prereqs: ["q-learning", "mdp-bellman"],
  },
  "td-lambda": {
    id: "td-lambda", name: "TD(λ) & Eligibility Traces", area: "Reinforcement Learning",
    summary: "A single mechanism that interpolates between one-step TD(0) and Monte-Carlo returns. An eligibility trace marks recently visited states (e(s) += 1, decaying by γλ each step); when a TD error δ occurs, every marked state is updated in proportion to its trace, spreading credit backward along the trajectory in one online pass. λ=0 is TD(0), λ=1 is Monte Carlo; intermediate λ usually learns fastest. The backward view equals the forward λ-return; GAE is its modern advantage-estimation descendant.",
    tex: "\\delta_t = r_{t+1} + \\gamma V(s_{t+1}) - V(s_t);\\quad V(s) \\mathrel{+}= \\alpha\\,\\delta_t\\, e(s)",
    prereqs: ["q-learning", "mdp-bellman"],
  },
  "ppo": {
    id: "ppo", name: "Proximal Policy Optimization (PPO)", area: "Reinforcement Learning",
    summary: "A stable, first-order policy-gradient method: maximize a clipped surrogate of the importance-weighted advantage, min(r·A, clip(r,1-ε,1+ε)·A) where r=π_θ/π_old. The clip flattens the objective outside a trust region [1-ε,1+ε], zeroing the gradient so an update can't push the policy too far off-policy — which lets PPO safely reuse one batch for several epochs. A cheap stand-in for TRPO's hard KL constraint; the workhorse of RLHF.",
    tex: "L^{CLIP} = \\mathbb{E}\\big[\\min(r_t A_t,\\ \\mathrm{clip}(r_t,1-\\epsilon,1+\\epsilon) A_t)\\big]",
    prereqs: ["policy-gradient", "actor-critic"],
  },
  "dyna-q": {
    id: "dyna-q", name: "Dyna-Q & Model-Based RL", area: "Reinforcement Learning",
    summary: "Integrates learning, planning, and acting: the agent does ordinary Q-learning from real steps AND learns a one-step model (remembering (s,a)->(r,s')), then performs n planning updates per real step by replaying remembered transitions through the model. Planning propagates value across the state space without extra real experience, so Dyna-Q is far more sample-efficient than model-free Q-learning. The bridge between learning from experience and planning with a known model; experience replay is the same idea, and World Models / MuZero / Dreamer are its modern descendants. Risk: planning inside a wrong model learns the wrong thing.",
    prereqs: ["q-learning", "mdp-bellman"],
  },
  "double-q-learning": {
    id: "double-q-learning", name: "Double Q-Learning & Maximization Bias", area: "Reinforcement Learning",
    summary: "Q-learning bootstraps off max_a Q(s',a); because the estimates are noisy and you both SELECT and EVALUATE with the same max, E[max] is biased high — it systematically overestimates action values and can prefer a worse action. Double Q-learning keeps two value tables and uses one to pick the maximizing action and the other to evaluate it; since their noise is independent, the bias cancels. The deep-RL version is Double DQN (online net selects, target net evaluates). A specific case of the 'optimizer's curse' that also haunts model selection.",
    prereqs: ["q-learning", "sarsa"],
  },
  "gae": {
    id: "gae", name: "Generalized Advantage Estimation", area: "Reinforcement Learning",
    summary: "The advantage estimator in modern policy-gradient methods: an exponentially-weighted sum of TD residuals, Â_t = Σ_l (γλ)^l δ_{t+l}. λ is a bias/variance dial — λ=0 is the one-step TD advantage (low variance, biased through an imperfect critic), λ=1 is the Monte-Carlo advantage (unbiased, high variance). A worse critic pushes the optimal λ toward 1; more reward noise pushes it toward 0. It is eligibility traces applied to advantages, and the default (λ≈0.95) inside PPO.",
    tex: "\\hat{A}_t = \\sum_{l\\ge 0} (\\gamma\\lambda)^l\\, \\delta_{t+l},\\quad \\delta_l = r_l + \\gamma V(s_{l+1}) - V(s_l)",
    prereqs: ["td-lambda", "actor-critic"],
  },
  "prioritized-replay": {
    id: "prioritized-replay", name: "Prioritized Experience Replay", area: "Reinforcement Learning",
    summary: "Replace uniform sampling from the replay buffer with sampling ∝ |TD error|^α, so surprising transitions are revisited more often. On sparse-reward tasks this produces a backward sweep of value from the goal and learns in far fewer updates. Because non-uniform sampling biases the expected update, correct it with importance-sampling weights w=(N·P)^(-β), annealing β toward 1. A standard upgrade to DQN; the data-side counterpart to Dyna-Q's planning.",
    prereqs: ["dqn", "importance-sampling"],
  },
  "distributional-rl": {
    id: "distributional-rl", name: "Distributional RL (C51)", area: "Reinforcement Learning",
    summary: "Learn the full distribution of returns Z(s,a) instead of just its expectation. C51 represents Z as a categorical distribution over a fixed set of atoms and applies the distributional Bellman backup TZ = R + γZ(s'), projecting the shifted/scaled target back onto the atom support. Stochastic rewards make returns multimodal — a shape the scalar value (the mean) hides — enabling more stable learning and risk-aware decisions. Successors QR-DQN and IQN learn quantiles instead of fixed atoms.",
    prereqs: ["q-learning", "mdp-bellman"],
  },
  "successor-representation": {
    id: "successor-representation", name: "Successor Representation", area: "Reinforcement Learning",
    summary: "M(s,s') is the expected discounted number of future visits to s' starting from s under a policy — equal to (I−γP)⁻¹. It factorizes value into dynamics and reward, V(s)=Σ_s' M(s,s')R(s'), so when the reward changes you recompute V instantly as M·R with no relearning of dynamics. Learned by TD just like a value function but bootstrapping one-hot occupancy. Sits between model-free and model-based RL; the deep version (successor features) enables transfer across reward functions, and predictive maps like it appear in hippocampal place/grid cells.",
    tex: "M = (I - \\gamma P)^{-1},\\qquad V = M R",
    prereqs: ["mdp-bellman", "markov"],
  },
  "max-entropy-rl": {
    id: "max-entropy-rl", name: "Maximum-Entropy RL (Soft Value Iteration)", area: "Reinforcement Learning",
    summary: "Maximize expected reward PLUS policy entropy, weighted by a temperature α. This replaces the hard max in the Bellman equation with a soft log-sum-exp, V(s)=α·logΣ exp(Q(s,a)/α), and makes the optimal policy a Boltzmann distribution π(a|s)=softmax(Q(s,a)/α). The entropy bonus keeps exploration alive and yields robust policies; α→0 recovers ordinary value iteration and a greedy policy. The framework behind Soft Actor-Critic (SAC) and soft Q-learning, and kin to the KL-regularized objective of PPO/RLHF.",
    tex: "V(s) = \\alpha \\log \\textstyle\\sum_a \\exp\\!\\big(Q(s,a)/\\alpha\\big)",
    prereqs: ["mdp-bellman", "policy-gradient"],
  },
  "spectrogram": {
    id: "spectrogram", name: "Spectrogram (STFT)", area: "Signal",
    summary: "The Short-Time Fourier Transform slides a window along a signal and FFTs each chunk, producing a time-frequency image — the spectrogram. The window length sets a hard tradeoff: short windows resolve time but smear frequency, long windows resolve frequency but smear time (the time-frequency uncertainty principle). It is the standard front end for speech and audio models, usually feeding a mel/MFCC stage or a CNN.",
    prereqs: ["fourier"],
  },
  "mfcc": {
    id: "mfcc", name: "Mel Filterbank & MFCC", area: "Signal",
    summary: "The classic speech feature: take a frame's power spectrum, pool it through triangular filters spaced on the perceptual mel scale, take the log (loudness compression), then a DCT to decorrelate the bands into a handful of cepstral coefficients. The first ~13 capture the spectral envelope (the phoneme / vocal-tract shape) while discarding pitch and noise. Dominated speech recognition (with GMM-HMMs) for decades; modern systems often feed log-mel spectrograms straight to a CNN/transformer instead.",
    prereqs: ["spectrogram", "fourier"],
  },
  "pitch-detection": {
    id: "pitch-detection", name: "Pitch Detection (Autocorrelation)", area: "Signal",
    summary: "Estimate the fundamental frequency f0 of a periodic sound by autocorrelation: r(lag) peaks when the signal is shifted by a whole period, so f0 = sample_rate / first_strong_peak_lag. Timbre-independent (works on sines or rich tones); the main failure is octave error, picking 2x or 1/2 the true lag, which noise worsens. Basis of music tuners and the YIN/pYIN trackers. By Wiener-Khinchin, autocorrelation is the inverse transform of the power spectrum — the time-domain twin of reading f0 off the Fourier spectrum.",
    prereqs: ["fourier"],
  },
  "dtw": {
    id: "dtw", name: "Dynamic Time Warping", area: "Signal",
    summary: "An elastic distance between two sequences that may run at different speeds. DTW finds the cheapest monotonic alignment via a DP cost matrix, D[i][j] = (A_i-B_j)² + min(D[i-1][j], D[i][j-1], D[i-1][j-1]), then backtracks the warping path; a Sakoe-Chiba band limits how far the path strays from the diagonal. Unlike point-by-point Euclidean distance, a small time shift doesn't wreck the comparison. The standard elastic metric for speech, gesture, ECG, and signature matching, and the continuous sibling of edit distance.",
    prereqs: ["dynamic-programming"],
  },
  "aliasing": {
    id: "aliasing", name: "Aliasing & the Nyquist Limit", area: "Signal",
    summary: "The Nyquist-Shannon theorem: a signal is captured faithfully only if sampled faster than twice its highest frequency (the Nyquist rate). Sample too slowly and high frequencies FOLD back as lower-frequency aliases, f_alias = |f - fs·round(f/fs)|, indistinguishable from real low frequencies in the samples. The fix is always to band-limit (anti-alias low-pass filter) before sampling. Shows up as the wagon-wheel effect, image moire, and downsampling artifacts in CNNs.",
    prereqs: ["fourier"],
  },
  "pagerank": {
    id: "pagerank", name: "PageRank", area: "Graphs",
    summary: "Rank nodes by the importance of the nodes linking to them, resolved by power iteration: PR_i = (1-d)/N + d·Σ_{j→i} PR_j/outdeg_j (plus dangling mass). It is the stationary distribution of a random surfer who follows a link with probability d and teleports otherwise — the teleport makes the chain ergodic so a unique answer exists. Mathematically the dominant eigenvector of the damped transition matrix. Launched Google; reused for citation ranking, recommendation, spam detection, and TextRank.",
    tex: "PR_i = \\frac{1-d}{N} + d \\sum_{j \\to i} \\frac{PR_j}{\\mathrm{outdeg}(j)}",
    prereqs: ["markov"],
  },
  "dijkstra": {
    id: "dijkstra", name: "Dijkstra's Shortest Path", area: "Graphs",
    summary: "Single-source shortest paths on a graph with non-negative edge weights. Repeatedly settle the unsettled node with the smallest tentative distance and relax its edges (dist[v] = min(dist[v], dist[u]+w)); because weights are non-negative, a settled node's distance is final, so the greedy order is optimal. O(E log V) with a binary heap. The weighted generalization of BFS and the parent of A* (Dijkstra plus an admissible heuristic). Negative edges require Bellman-Ford instead.",
    prereqs: ["graph-search"],
  },
  "mst": {
    id: "mst", name: "Minimum Spanning Tree", area: "Graphs",
    summary: "The cheapest set of edges that connects every node without cycles. Prim's grows one tree, repeatedly adding the lightest edge crossing from the tree to the outside; Kruskal's adds globally-cheapest edges that don't create a cycle (using union-find). Both are greedy and correct by the cut property: the lightest edge across any cut of the nodes belongs to some MST. Used for network/circuit layout, single-link clustering, and TSP approximation.",
    prereqs: ["dijkstra"],
  },
  "community-detection": {
    id: "community-detection", name: "Community Detection (Louvain)", area: "Graphs",
    summary: "Partition a network into densely-connected groups by maximizing modularity Q = Σ_c [ in_c/2m − (tot_c/2m)² ] — how many more edges fall inside communities than chance predicts. Louvain's local-moving phase greedily relocates each node to the neighbor community that most raises Q, then collapses communities into super-nodes and repeats. Fast and widely used (Leiden is the improved successor), but Q has many near-equal optima and a resolution limit that can merge small real communities. The graph analogue of clustering.",
    prereqs: ["pagerank"],
  },
  "max-flow": {
    id: "max-flow", name: "Max Flow / Min Cut", area: "Graphs",
    summary: "The most flow that can be pushed from a source to a sink through capacitated edges. Ford-Fulkerson repeatedly sends the bottleneck capacity along an augmenting path in the residual graph (whose reverse edges allow rerouting earlier flow); Edmonds-Karp uses BFS shortest augmenting paths for a polynomial bound. At termination the nodes reachable from the source define the minimum cut, whose capacity equals the max flow (max-flow min-cut theorem) — a concrete case of LP duality. Solves bipartite matching, image graph-cuts, scheduling, and more.",
    prereqs: ["graph-search"],
  },
  "rag-chunking": {
    id: "rag-chunking", name: "RAG Chunking", area: "NLP",
    summary: "How a corpus is split into chunks before embedding decides what retrieval can find. Chunk size trades dilution (too large) against splitting a fact across boundaries (too small); overlap and sentence-aware splitting keep answer spans intact. The cheapest lever on retrieval recall.",
    prereqs: ["embeddings", "vector-search"],
  },
  "self-consistency": {
    id: "self-consistency", name: "Self-Consistency", area: "NLP",
    summary: "Sample several chains of thought at nonzero temperature and majority-vote the final answer. When errors are independent, voting concentrates on the single correct answer (a Condorcet effect) and lifts accuracy for the cost of N samples; correlated errors form a false consensus it can't fix.",
    tex: "\\hat{y} = \\arg\\max_{y} \\sum_{i=1}^{N} \\mathbb{1}\\!\\left[ y_i = y \\right]",
    prereqs: ["decoding", "clt"],
  },
  "constrained-decoding": {
    id: "constrained-decoding", name: "Constrained Decoding", area: "NLP",
    summary: "Guarantee structured output (JSON mode, function calling) by intersecting the model's next-token distribution with the tokens a grammar permits at each step, then sampling from the survivors. A schema/regex/CFG compiled to a finite-state machine supplies the per-step token mask.",
    tex: "\\tilde{p}(t) \\propto p_\\theta(t) \\cdot \\mathbb{1}\\!\\left[ t \\in \\mathrm{valid}(\\text{state}) \\right]",
    prereqs: ["decoding", "tokenizer"],
  },
  "guardrails": {
    id: "guardrails", name: "Guardrails", area: "NLP",
    summary: "The layered input/output safety pipeline wrapped around an LLM: redact PII, catch prompt injection and disallowed topics on the way in, and validate/filter the response (PII leakage, toxicity, schema, grounding) on the way out. Fail-closed defense-in-depth for production LLM systems.",
    prereqs: ["constrained-decoding"],
  },
  "prompt-injection": {
    id: "prompt-injection", name: "Prompt Injection", area: "NLP",
    summary: "The defining LLM security flaw: instructions and untrusted data share one token channel, so attacker-controlled content (a user turn, a retrieved page, a tool result) can pose as a new instruction. Attack shapes include direct override, INDIRECT injection (payload hidden in fetched content), jailbreaks, and data exfiltration. Defenses — delimiting/spotlighting, the trained instruction hierarchy, input classifiers, output exfil filters — are layered and partial; none reaches zero.",
    prereqs: ["guardrails"],
  },
  "semantic-caching": {
    id: "semantic-caching", name: "Semantic Caching", area: "NLP",
    summary: "Cache LLM responses by embedding similarity rather than exact string match: embed the query, and if the nearest cached query is within a cosine-similarity threshold, serve its stored answer instead of calling the model. Collapses paraphrases of one intent into a single call. The threshold trades hit rate / cost savings against FALSE HITS — serving a stale or wrong answer for a query that was close in embedding space but semantically different.",
    prereqs: ["embeddings", "vector-search"],
  },
  "kv-cache-eviction": {
    id: "kv-cache-eviction", name: "KV-Cache Eviction", area: "NLP",
    summary: "The KV cache grows linearly with sequence length, so long-context serving must evict past tokens to bound memory — and which tokens you drop decides whether quality survives. Sliding-window discards the early 'attention sink' tokens that carry disproportionate mass (StreamingLLM) and perplexity spikes; keeping a few sinks + a recent window recovers it; H2O additionally retains the heavy-hitter tokens by accumulated attention. It is the OS eviction-policy problem (LRU/LFU) transplanted into attention.",
    prereqs: ["kv-cache", "attention"],
  },
  "mixture-of-depths": {
    id: "mixture-of-depths", name: "Mixture-of-Depths", area: "NLP",
    summary: "Conditional computation along the depth axis: a per-block router selects, under a fixed capacity (top-k tokens), which tokens get full compute while the rest take the residual skip. Fixes the FLOPs (lower than dense) and keeps the compute graph static so it still batches — unlike ragged early-exit. Works because token difficulty is uneven; a well-trained router spends the budget on the tokens that need depth. Width-axis cousin of mixture-of-experts.",
    prereqs: ["moe", "transformer-block"],
  },
  "context-extension": {
    id: "context-extension", name: "Context-Length Extension", area: "NLP",
    summary: "Running a RoPE model beyond its training length puts far tokens at unseen rotation angles, so naive extrapolation makes perplexity explode just past L_train. Fixes rescale how inference positions map onto the trained rotary range: Position Interpolation linearly compresses positions (bounded, uniform cost), NTK-aware scaling rescales the RoPE base by frequency (keeps local resolution), and YaRN combines per-frequency NTK with attention scaling (best). How 4k/8k models become 128k+ without retraining.",
    prereqs: ["rope", "positional-encoding"],
  },
  "lost-in-the-middle": {
    id: "lost-in-the-middle", name: "Lost in the Middle", area: "NLP",
    summary: "Transformers use information at the start and end of a long context far more reliably than the middle, so accuracy vs the position of the relevant passage is U-shaped — and the dip deepens with context length. Motivates reranking the most relevant chunks to the prompt's edges and keeping contexts tight.",
    prereqs: ["attention", "rag-chunking"],
  },
  "hyde": {
    id: "hyde", name: "HyDE (Hypothetical Document Embeddings)", area: "NLP",
    summary: "A query-transformation trick for dense retrieval: questions and answers embed to different regions, so first have the model draft a hypothetical answer and retrieve by ITS embedding — even a factually wrong draft lands near the real answer passages. Averaging several drafts cancels noise.",
    prereqs: ["embeddings", "vector-search"],
  },
  "reflection": {
    id: "reflection", name: "Self-Correction (Reflection)", area: "NLP",
    summary: "The agentic generate–critique–revise loop (Reflexion / self-refine): a critic scores an answer and the model revises until the bar is met or a budget runs out. Bounded by the verifier — informative, accurate critics (tests, tools, a reward model) make it work; self-grading with no external signal stalls or false-passes.",
    prereqs: ["reward-model", "self-consistency"],
  },
  "react-agent": {
    id: "react-agent", name: "ReAct (Reason + Act)", area: "NLP",
    summary: "The tool-using agent loop: interleave Thought → Action (a tool call) → Observation until the model can answer, grounding it in facts and computation it can't do from weights alone. Because steps chain, per-step error compounds — the core reliability problem of agent engineering.",
    prereqs: ["reflection", "rag-chunking"],
  },
  "calibration": {
    id: "calibration", name: "Model Calibration", area: "Foundations",
    summary: "Whether a model's confidence scores are honest: a calibrated classifier that says 90% is right 90% of the time. Measured by the reliability diagram and Expected Calibration Error (ECE); modern nets are overconfident, and temperature scaling (divide logits by T) is the standard one-parameter post-hoc fix that leaves predictions unchanged.",
    tex: "\\mathrm{ECE} = \\sum_{b} \\frac{n_b}{N} \\,\\bigl| \\mathrm{acc}(b) - \\mathrm{conf}(b) \\bigr|",
    prereqs: ["logistic-regression", "roc"],
  },
  "shap": {
    id: "shap", name: "Feature Attribution (SHAP)", area: "Foundations",
    summary: "Explain a single prediction by crediting each feature its Shapley value — its average marginal contribution over all orderings of adding features in. The unique attribution satisfying efficiency, symmetry, and dummy; the contributions sum exactly to the gap between the base value and the prediction, and split interactions fairly.",
    tex: "\\phi_i = \\sum_{S \\subseteq F \\setminus \\{i\\}} \\frac{|S|!\\,(k-|S|-1)!}{k!}\\,\\bigl( f(S \\cup \\{i\\}) - f(S) \\bigr)",
    prereqs: ["logistic-regression"],
  },
  "conformal": {
    id: "conformal", name: "Conformal Prediction", area: "Foundations",
    summary: "Wrap any model to output a prediction SET with a finite-sample, distribution-free coverage guarantee: P(y ∈ set) ≥ 1−α. Calibrate a nonconformity-score quantile q̂ on held-out data; the guarantee holds regardless of model quality (a worse model just yields larger sets). Assumes exchangeability; coverage is marginal, not conditional.",
    tex: "\\hat q = \\mathrm{Quantile}\\bigl( \\{s_i\\}, \\tfrac{\\lceil (n+1)(1-\\alpha) \\rceil}{n} \\bigr)",
    prereqs: ["calibration", "roc"],
  },
  "conformal-regression": {
    id: "conformal-regression", name: "Conformal Regression", area: "Foundations",
    summary: "Split conformal applied to regression: calibrate a residual score on held-out data, take its (1−α) quantile q̂, and emit the interval f̂(x) ± q̂. Coverage P(y ∈ [lo,hi]) ≥ 1−α holds for any regressor — underfitting just widens the band. Normalizing the score by a local spread estimate σ̂(x) gives locally-adaptive widths (the idea behind Conformalized Quantile Regression, CQR).",
    tex: "C(x) = \\hat f(x) \\pm \\hat q\\,\\hat\\sigma(x), \\quad \\hat q = \\mathrm{Quantile}\\bigl(\\{|y_i-\\hat f(x_i)|/\\hat\\sigma(x_i)\\}, \\tfrac{\\lceil (n+1)(1-\\alpha)\\rceil}{n}\\bigr)",
    prereqs: ["conformal", "linear-regression"],
  },
  "active-learning": {
    id: "active-learning", name: "Active Learning", area: "Foundations",
    summary: "Cut labeling cost by letting the model choose what to label next. Uncertainty sampling queries the unlabeled point nearest the decision boundary (most uncertain); refitting on those informative points reaches high accuracy with far fewer labels than random. The core loop of data-centric ML and human-in-the-loop annotation.",
    prereqs: ["logistic-regression", "calibration"],
  },
  "coreset": {
    id: "coreset", name: "Coresets", area: "Foundations",
    summary: "A small, weighted subset S of the data on which the objective (e.g. k-means cost) for ANY candidate solution approximates the full-data objective within (1±ε). Train on S to get nearly the full answer at a fraction of the cost. Importance/sensitivity sampling picks points proportional to how much they can influence the cost and reweights by 1/(m·q) to stay unbiased — far better than uniform at tiny sizes. Foundational to scalable ML and data selection/pruning.",
    tex: "q_i = \\tfrac{1}{2N} + \\tfrac{1}{2}\\,\\frac{d(x_i,\\mu)^2}{\\sum_j d(x_j,\\mu)^2}, \\quad w_i = \\tfrac{1}{m\\,q_i}",
    prereqs: ["kmeans", "active-learning"],
  },
  "dataset-distillation": {
    id: "dataset-distillation", name: "Dataset Distillation", area: "Foundations",
    summary: "Synthesize a tiny set of training examples on which a model trained from scratch generalizes almost as well as on the full data. Unlike coresets (which select real points), the synthetic points are learned by differentiating the downstream loss back into the data — via a closed-form inner learner (KIP / kernel ridge), unrolled training, or gradient/trajectory matching. The learned points rarely look realistic; they're optimized to teach. Used for fast NAS, continual-learning replay, and privacy-preserving release.",
    tex: "S^\\star = \\arg\\min_S \\; \\mathcal{L}_{\\text{real}}\\bigl(\\theta^\\star(S)\\bigr), \\quad \\theta^\\star(S) = \\arg\\min_\\theta \\mathcal{L}(\\theta; S)",
    prereqs: ["coreset", "distillation"],
  },
  "fairness": {
    id: "fairness", name: "Fairness & Group Metrics", area: "Foundations",
    summary: "Equitable treatment formalized into competing statistical criteria — demographic parity (equal selection rate), equal opportunity (equal TPR), equalized odds (equal TPR+FPR) — which are provably incompatible when groups differ in base rate or score distribution. Bias often sits upstream in the data, so picking a metric is a value judgment, not a checkbox.",
    prereqs: ["roc", "calibration"],
  },
  "backtracking": {
    id: "backtracking", name: "Backtracking & CSP", area: "Foundations",
    summary: "Solve constraint-satisfaction problems by depth-first search: assign variables one at a time, and the moment a constraint is violated with no legal value left, undo (backtrack) and try the previous variable differently. Constraint propagation (forward checking, AC-3) and ordering heuristics prune the exponential tree to make it practical. A complete method — finds a solution if one exists.",
    prereqs: ["pathfinding"],
  },
  "arc-consistency": {
    id: "arc-consistency", name: "Arc Consistency (AC-3)", area: "Foundations",
    summary: "The standard constraint-propagation algorithm for CSPs: repeatedly enforce that for every value in a variable's domain there exists a compatible value in each neighbor's domain, deleting unsupported values and cascading until a fixpoint. Run after each assignment in backtracking, it prunes doomed branches early; with MRV/LCV ordering it's the textbook recipe for practical CSP solving.",
    prereqs: ["backtracking"],
  },
  "quantization": {
    id: "quantization", name: "Quantization", area: "Training Systems",
    summary: "Shrink a model by storing weights (and activations) in low-bit integers instead of 32-bit floats. A scale maps floats to a small grid of levels; fewer bits = smaller/faster but coarser. Outliers stretch the scale and dominate the error, which is why LLM quantization (GPTQ, AWQ, QLoRA's NF4) is outlier-aware and often per-channel.",
    tex: "q = \\mathrm{clamp}\\!\\left( \\mathrm{round}\\!\\left( \\tfrac{w}{s} \\right),\\, -2^{b-1},\\, 2^{b-1}-1 \\right),\\quad s = \\tfrac{\\max|w|}{2^{b-1}-1}",
    prereqs: ["lora"],
  },
  "pruning": {
    id: "pruning", name: "Pruning & Sparsity", area: "Training Systems",
    summary: "Compress a network by removing weights. Magnitude pruning zeros the smallest weights; accuracy is nearly flat until a sparsity cliff because trained nets are heavily over-parameterized. Unstructured pruning needs sparse kernels to speed up; structured pruning (whole neurons/channels/heads) gives real speedups. Iterative prune-then-finetune pushes the cliff far right; lottery-ticket sub-networks can retrain from scratch.",
    prereqs: ["backprop", "quantization"],
  },
  "distillation": {
    id: "distillation", name: "Knowledge Distillation", area: "Training Systems",
    summary: "Train a small student to reproduce a large teacher's softened output distribution, not just its hard labels. The teacher's 'dark knowledge' — the relative probabilities of runner-up classes, exposed by a temperature on the softmax — is a richer training signal that lets the student generalize beyond its size. Powers DistilBERT, on-device LLMs, and training on a big model's generated data.",
    tex: "L = (1-\\alpha)\\,\\mathrm{CE}(p, y) + \\alpha\\,T^2\\,\\mathrm{KL}\\!\\left( p^{(T)}_{\\text{teacher}} \\,\\|\\, p^{(T)}_{\\text{student}} \\right)",
    prereqs: ["calibration", "quantization"],
  },
  "moe": {
    id: "moe", name: "Mixture of Experts (MoE)", area: "Training Systems",
    summary: "Conditional computation: a router sends each token to only the top-k of N expert sub-networks, so total parameters scale while active compute per token stays at k/N. Enables sparse trillion-parameter models (Switch Transformer, Mixtral), at the cost of routing complexity and a constant fight against load imbalance — handled with an auxiliary balancing loss and per-expert capacity limits.",
    tex: "y = \\sum_{i \\in \\mathrm{top\\text{-}k}(g(x))} g_i(x)\\, E_i(x)",
    prereqs: ["attention", "scaling-laws"],
  },
  "simpsons-paradox": {
    id: "simpsons-paradox", name: "Simpson's Paradox & Confounding", area: "Foundations",
    summary: "A trend present in every subgroup can reverse when the groups are pooled, because a confounder correlates with both X and Y. The most vivid demonstration that correlation is not causation: the correct estimate depends on which variables you condition on, which is decided by the causal structure, not the data alone. Motivates stratification, regression controls, and randomization.",
    prereqs: ["linear-regression", "bayes"],
  },
  "dynamic-programming": {
    id: "dynamic-programming", name: "Dynamic Programming", area: "Foundations",
    summary: "Solve a problem by combining optimal answers to overlapping subproblems, computed once and reused (memoized). Requires optimal substructure; turns exponential brute force into polynomial table-filling. The 0/1 knapsack table is canonical; the same idea drives edit distance, shortest paths, the Bellman equation, and Viterbi/CTC decoding.",
    tex: "\\mathrm{dp}[i][c] = \\max\\bigl( \\mathrm{dp}[i{-}1][c],\\; \\mathrm{dp}[i{-}1][c - w_i] + v_i \\bigr)",
    prereqs: ["mdp-bellman"],
  },
  "branch-and-bound": {
    id: "branch-and-bound", name: "Branch & Bound", area: "Foundations",
    summary: "Exact search over a combinatorial decision tree that prunes provably-hopeless subtrees. At each node compute an optimistic bound (e.g. the LP / fractional relaxation for knapsack); if it can't beat the best complete solution found so far (the incumbent), discard the subtree unopened. Still worst-case exponential, but bound tightness and branching order decide how much it prunes in practice. The engine inside integer-programming solvers (branch-and-cut) and game-tree alpha-beta.",
    tex: "\\text{prune if } \\mathrm{bound}(node) \\le \\text{incumbent}",
    prereqs: ["dynamic-programming", "graph-search"],
  },
  "drift-detection": {
    id: "drift-detection", name: "Data Drift Detection", area: "Training Systems",
    summary: "Monitor a deployed model for distribution shift, since accuracy silently decays as the world moves away from training data. Compare a live window to a reference with the Population Stability Index (PSI=Σ(cur−ref)·ln(cur/ref)), KL divergence, or two-sample tests, and alarm past a threshold. Covers covariate shift P(X), label shift P(Y), and concept drift P(Y|X).",
    tex: "\\mathrm{PSI} = \\sum_b (c_b - r_b)\\,\\ln\\!\\frac{c_b}{r_b}",
    prereqs: ["clt", "calibration"],
  },
  "saliency": {
    id: "saliency", name: "Saliency Maps", area: "Computer Vision",
    summary: "Explain a prediction by the gradient of the output with respect to each input pixel: bright = the model is most sensitive there. One backward pass; the image-space, gradient-based branch of explainability (vs SHAP's game-theoretic attributions). Refined by Grad-CAM, Integrated Gradients, and SmoothGrad — but raw gradients are noisy and show sensitivity, not correctness.",
    tex: "\\mathrm{saliency}_k = \\left| \\frac{\\partial\\, z}{\\partial\\, x_k} \\right|",
    prereqs: ["backprop", "shap"],
  },
  "mc-dropout": {
    id: "mc-dropout", name: "MC Dropout (Bayesian uncertainty)", area: "Foundations",
    summary: "Estimate predictive uncertainty by keeping dropout on at inference and averaging many stochastic forward passes — each mask is a thinned sub-network, and their spread approximates Bayesian posterior uncertainty (Gal & Ghahramani, 2016). Uncertainty grows where data is sparse; the cheap cousin of Bayesian nets and deep ensembles. Powers selective prediction, active learning, and OOD detection.",
    prereqs: ["calibration"],
  },
  "attention-rollout": {
    id: "attention-rollout", name: "Attention Rollout", area: "NLP",
    summary: "Turn a stack of attention maps into one input-token attribution by composing them across layers, accounting for residual connections: Â=0.5A+0.5I, R=Â_L···Â_1. Row i is token i's rolled-up attention back to the input. A training-free transformer-interpretability tool (Abnar & Zuidema, 2020) — but attention isn't a faithful explanation by itself; it ignores values/MLPs and averages heads.",
    tex: "R = \\prod_{l=L}^{1} \\bigl( 0.5\\,A_l + 0.5\\,I \\bigr)",
    prereqs: ["attention", "multi-head-attention"],
  },
  "tool-routing": {
    id: "tool-routing", name: "Tool Routing & Dispatch", area: "NLP",
    summary: "The dispatch decision in front of an agent: classify a query and send it to the right tool (or expert/model), routing to the top match only above a confidence threshold and otherwise falling back to the general model. Implemented as the model's function-calling, an intent classifier over embeddings, or a cheap LLM selector. Precision (don't fire the wrong tool) vs coverage (handle more) is the core tradeoff.",
    prereqs: ["react-agent"],
  },
  "reranking": {
    id: "reranking", name: "Reranking (cross-encoder)", area: "NLP",
    summary: "The second stage of retrieval. A cheap bi-encoder/BM25 first stage maximizes recall over the whole corpus by scoring queries and docs independently; a slow cross-encoder then reads each (query, doc) pair jointly to score true relevance precisely and reorders the shortlist. Splits recall (stage 1) from precision (stage 2); the reranker is bounded by what the pool retrieved.",
    prereqs: ["vector-search", "rag-chunking"],
  },
  "rag-fusion": {
    id: "rag-fusion", name: "Multi-Query & RAG-Fusion", area: "NLP",
    summary: "Query transformation for retrieval: rewrite a question into several variants, retrieve a ranked list for each, and fuse them with Reciprocal Rank Fusion — RRF(d)=Σ 1/(K+rank). Score-agnostic, so it combines dense, sparse, and multi-phrasing rankings; surfaces relevant docs any single phrasing misses, raising recall at the cost of extra LLM calls + a reranker.",
    tex: "\\mathrm{RRF}(d) = \\sum_{v} \\frac{1}{K + \\mathrm{rank}_v(d)}",
    prereqs: ["rag-chunking", "vector-search"],
  },
  "causal-inference": {
    id: "causal-inference", name: "Causal Inference (do-operator)", area: "Foundations",
    summary: "P(Y|X) — what you observe — is not P(Y|do(X)) — what happens if you intervene. The do-operator models intervention as cutting the incoming arrows to the variable you set, removing confounding bias. When you can't experiment, the back-door criterion says which variables to condition on to recover the causal effect from observational data; condition on the wrong one (collider/mediator) and you add bias.",
    tex: "P(Y \\mid do(X)) = \\sum_{z} P(Y \\mid X, z)\\, P(z)",
    prereqs: ["simpsons-paradox"],
  },
  "instrumental-variables": {
    id: "instrumental-variables", name: "Instrumental Variables", area: "Foundations",
    summary: "When a confounder is unobserved so back-door adjustment fails, an instrument Z recovers the causal effect of X on Y. Z must satisfy relevance (it moves X) and exclusion (it affects Y only through X). Two-stage least squares regresses X on Z, then Y on the fitted X̂; equivalently β̂ = Cov(Z,Y)/Cov(Z,X). Weak instruments (low first-stage F) inflate variance; exclusion violations reintroduce bias. Under heterogeneity it estimates a local effect (LATE).",
    tex: "\\hat\\beta_{IV} = \\frac{\\mathrm{Cov}(Z,Y)}{\\mathrm{Cov}(Z,X)}",
    prereqs: ["causal-inference", "linear-regression"],
  },
  "label-noise": {
    id: "label-noise", name: "Label Noise & Memorization", area: "Foundations",
    summary: "Learning when training labels are wrong. A flexible model first fits the genuine structure (good test accuracy) but, given enough capacity and epochs, memorizes the mislabeled points — train accuracy on noisy labels rises while true test accuracy falls. Motivates early stopping, robust losses, label smoothing, sample selection, and confident-learning data cleaning.",
    prereqs: ["overfitting"],
  },
  "model-serving": {
    id: "model-serving", name: "Model Serving & Batching", area: "Training Systems",
    summary: "Deploying a trained model as a service is a queueing problem before it is a math problem. A GPU runs a batch in time base + slope*size, so batching many requests amortizes the fixed overhead and raises throughput — but each request then waits for the batch to form (a max batch-window) and to finish, inflating mean and especially tail (p99) latency: the central throughput-vs-latency tradeoff. Capacity = batch / batch-time requests per second; when the arrival rate pushes utilization toward 100% the queue and latency blow up (Little's law: average queue length = arrival rate * wait time), which is why autoscaling, admission control, and load shedding exist. Continuous/in-flight batching (vLLM) refines this by swapping finished sequences out of the running batch instead of waiting.",
    tex: "L = \\lambda W,\\quad \\text{capacity} = \\frac{B}{\\text{base} + \\text{slope}\\cdot B}",
    prereqs: ["paged-attention"],
  },
  "canary-rollout": {
    id: "canary-rollout", name: "Canary Rollout & Progressive Delivery", area: "Training Systems",
    summary: "Deploy a new model (or code) safely by exposing it to a small slice of live traffic first and widening only if a health metric stays good: 5% -> 25% -> 50% -> 100%, with an automated guard at each stage. The guard is a statistical test (here a one-sided two-proportion z-test of the canary's error vs the stable baseline) — significantly worse triggers an automatic rollback, capping the blast radius to the few users the canary touched versus a full deploy. Guard sensitivity is a detection tradeoff: too tight rolls back good releases on noise (false alarms), too loose lets a worse model through; and at low canary traffic, small regressions are hard to distinguish from noise (low statistical power). Generalizes to blue/green, feature flags, shadow traffic, and A/B + bandit rollouts.",
    prereqs: ["model-serving"],
  },
  "autoscaling": {
    id: "autoscaling", name: "Autoscaling", area: "Training Systems",
    summary: "Match serving capacity to a time-varying load by adjusting the replica pool. A reactive controller (Kubernetes HPA style) sizes the fleet to keep utilization near a target: desired = ceil(load / (target * per-replica capacity)). The hard part is the cold-start lag — a new replica must pull an image and load weights before it serves, so on a demand spike capacity can't rise fast enough and the SLO breaches until warming replicas come online. Lower target utilization carries spare headroom that absorbs spikes (fewer breaches) at higher idle cost; this headroom-vs-cost dial plus the cold-start tax is the core of capacity management. Refinements: predictive scaling, scale-in cooldowns to avoid flapping, warm pools / provisioned concurrency (why scale-to-zero is hard for big models), and load shedding when even max replicas aren't enough.",
    prereqs: ["model-serving"],
  },
  "model-cascade": {
    id: "model-cascade", name: "Model Cascade & Early-Exit", area: "Training Systems",
    summary: "Spend big compute only where it changes the answer: a cheap fast model handles every input and the uncertain ones (low confidence) are escalated to an expensive accurate model. Because most inputs are easy, you approach the expensive model's accuracy while paying its cost on only a slice of traffic — a steep cost/accuracy curve early on. The router is confidence, so it only works if that confidence is trustworthy (ties to calibration and conformal uncertainty); a confidently-wrong cheap model defers the wrong inputs. The pattern recurs as early-exit/anytime networks (stop at a shallow layer when confident), the Viola-Jones detector cascade, retrieval-then-LLM fallback, and is the model-level cousin of mixture-of-experts routing and speculative decoding.",
    prereqs: ["calibration", "model-serving"],
  },
  "paged-attention": {
    id: "paged-attention", name: "PagedAttention", area: "Training Systems",
    summary: "KV-cache memory management for LLM serving (vLLM). Contiguous per-sequence reservation of the max length wastes memory to internal fragmentation; PagedAttention stores the cache in fixed-size blocks allocated on demand (OS-paging style, via a block table), so memory tracks generated tokens and many more sequences fit — multiplying throughput, and enabling prefix-sharing via copy-on-write blocks.",
    prereqs: ["kv-cache"],
  },
  "mixed-precision": {
    id: "mixed-precision", name: "Mixed-Precision Training", area: "Training Systems",
    summary: "Train in 16-bit (fp16/bf16) for speed and memory while keeping an fp32 master copy of weights. fp16's narrow exponent range makes small gradients underflow and large ones overflow, so loss scaling multiplies the loss (and gradients) into the representable window and unscales before the step. bf16 keeps fp32's range (no scaling) at the cost of mantissa bits.",
    prereqs: ["backprop", "quantization"],
  },
  "speculative-decoding": {
    id: "speculative-decoding", name: "Speculative Decoding", area: "Training Systems",
    summary: "Speed up LLM generation losslessly: a small draft model proposes k tokens, the big target verifies them in one parallel pass, accepting the longest prefix it agrees with and resampling the first miss from its own distribution. Emits accepted+1 tokens per expensive pass; speedup ≈ (1−p^{k+1})/(1−p) for acceptance p. Output distribution is identical to the target alone.",
    tex: "\\mathbb{E}[\\text{tokens/pass}] = \\frac{1 - p^{\\,k+1}}{1 - p}",
    prereqs: ["decoding", "kv-cache"],
  },
  "graph-search": {
    id: "graph-search", name: "Graph Search (BFS / DFS / A*)", area: "Foundations",
    summary: "Systematically explore a state graph from a start to a goal. Uninformed methods order the frontier without domain knowledge — BFS (queue, shortest path on unit edges), DFS (stack, low memory, not optimal); informed A* orders by g + h, an admissible heuristic that focuses search toward the goal and stays optimal. The frontier data structure is the whole difference.",
    prereqs: ["pathfinding"],
  },
};

// ── Side-table: which surfaces cover each concept ─────────────
// Keyed by registry, then by slug. Each value is the array of concept ids the
// item covers. Kept here (instead of inside each registry file) so the
// taxonomy can grow in one place without touching unrelated code.
const CONCEPT_TAGS = {
  // Visualize demos — slugs match play-demos.js
  demos: {
    "pathfinding":          ["search-astar"],
    "kmeans":               ["kmeans", "gmm-em"],
    "gradient-descent":     ["gradient-descent", "adam", "lr-schedule"],
    "newton-vs-gradient":   ["newtons-method", "gradient-descent"],
    "coordinate-descent":   ["coordinate-descent", "gradient-descent"],
    "ista":                 ["proximal-gradient", "regularization", "linear-regression"],
    "l-bfgs":               ["quasi-newton", "newtons-method", "gradient-descent"],
    "bayesian-linear-regression": ["bayesian-linear-regression", "bayes", "linear-regression", "gaussian-process"],
    "variational-inference": ["variational-inference", "bayes", "vae"],
    "overfitting":          ["bias-variance", "regularization"],
    "cross-validation":     ["cross-validation", "bias-variance", "regularization"],
    "double-descent":       ["double-descent", "bias-variance", "regularization"],
    "bias-variance-decomp": ["bias-variance", "regularization", "double-descent"],
    "bagging-boosting":     ["ensembles", "decision-tree", "bias-variance"],
    "gaussian-process":     ["gaussian-process", "bayes", "svm"],
    "roc":                  ["roc", "cross-entropy"],
    "decision-tree":        ["decision-tree", "entropy"],
    "knn":                  ["knn", "bias-variance"],
    "svm":                  ["svm", "regularization", "attention"],
    "pca":                  ["pca", "embeddings"],
    "ica":                  ["ica", "pca", "clt"],
    "tsne":                 ["tsne", "pca", "embeddings"],
    "isomap":               ["manifold-learning", "pca", "spectral-clustering"],
    "word2vec":             ["word2vec", "embeddings", "softmax"],
    "gmm":                  ["gmm-em", "kmeans"],
    "clt":                  ["clt"],
    "bayes":                ["bayes", "cross-entropy"],
    "mcmc":                 ["mcmc", "bayes", "clt"],
    "importance-sampling":  ["importance-sampling", "mcmc", "clt"],
    "reservoir-sampling":   ["reservoir-sampling", "clt"],
    "count-min-sketch":     ["count-min-sketch", "reservoir-sampling"],
    "bloom-filter":         ["bloom-filter", "count-min-sketch"],
    "kalman-filter":        ["kalman-filter", "bayes", "clt"],
    "hmm-viterbi":          ["hmm-viterbi", "markov", "bayes"],
    "optimizers":           ["optimizers", "gradient-descent", "adam"],
    "gan":                  ["gan", "mlp", "cross-entropy"],
    "backprop":             ["backprop", "chain-rule"],
    "mcts":                 ["mcts", "bandit", "minimax"],
    "simulated-annealing":  ["simulated-annealing", "search-astar"],
    "attention":            ["attention", "softmax", "embeddings"],
    "positional-encoding":  ["positional-encoding", "fourier", "attention"],
    "multi-head-attention": ["multi-head", "attention", "transformer-block"],
    "tokenizer":            ["tokenization"],
    "markov":               ["markov", "decoding"],
    "decoding":             ["decoding", "softmax"],
    "embeddings":           ["embeddings", "vector-search"],
    "activations":          ["activations", "backprop"],
    "batch-norm":           ["batch-norm", "activations", "mlp"],
    "weight-init":          ["weight-init", "activations", "mlp"],
    "contrastive-learning": ["contrastive-learning", "embeddings", "softmax"],
    "convolution":          ["convolution", "cnn"],
    "edge-detection":       ["edge-detection", "convolution"],
    "hough-transform":      ["hough-transform", "edge-detection"],
    "harris-corners":       ["harris-corners", "edge-detection"],
    "optical-flow":         ["optical-flow", "harris-corners"],
    "hog":                  ["hog", "edge-detection"],
    "image-augmentation":   ["data-augmentation", "regularization", "convolution"],
    "watershed":            ["image-segmentation", "edge-detection"],
    "batching":             ["model-serving", "paged-attention"],
    "model-cascade":        ["model-cascade", "calibration", "moe"],
    "autoscaling":          ["autoscaling", "model-serving"],
    "canary-rollout":       ["canary-rollout", "model-serving", "drift-detection"],
    "perceptron":           ["perceptron", "linear-regression", "svm"],
    "neural-playground":    ["mlp", "backprop", "activations"],
    "lr-schedule":          ["lr-schedule", "gradient-descent"],
    "gradient-clipping":    ["gradient-clipping", "gradient-descent", "rnn"],
    "lora":                 ["lora", "pca"],
    "scaling-laws":         ["scaling-laws"],
    "nms":                  ["iou-nms", "cnn"],
    "vector-search":        ["vector-search", "embeddings", "knn"],
    "forecasting":          ["forecasting"],
    "vae":                  ["vae", "gmm-em"],
    "diffusion":            ["diffusion", "vae"],
    "bandit":               ["bandit"],
    "gridworld-rl":         ["q-learning", "mdp-bellman"],
    "value-iteration":      ["mdp-bellman", "q-learning"],
    "fourier":              ["fourier", "positional-encoding"],
    "regression":           ["linear-regression", "logistic-regression", "cross-entropy", "gradient-descent"],
    "rnn-gates":            ["lstm-gates", "rnn"],
    "beam-search":          ["beam-search", "decoding"],
    "kv-cache":             ["kv-cache", "attention"],
    "gnn":                  ["gnn", "mlp"],
    "rope":                 ["rope", "positional-encoding", "attention"],
    "dbscan":               ["dbscan", "knn"],
    "hierarchical-clustering": ["hierarchical-clustering", "kmeans"],
    "label-propagation":    ["label-propagation", "spectral-clustering", "knn"],
    "kernel-density":       ["kernel-density", "clt", "knn"],
    "naive-bayes":          ["naive-bayes", "bayes", "gmm-em"],
    "spectral-clustering":  ["spectral-clustering", "kmeans", "pca"],
    "policy-gradient":      ["policy-gradient", "mdp-bellman", "gradient-descent"],
    "actor-critic":         ["actor-critic", "policy-gradient", "mdp-bellman"],
    "dqn":                  ["dqn", "mdp-bellman", "mlp"],
    "reward-model":         ["reward-model", "logistic-regression", "policy-gradient"],
    "dpo":                  ["dpo", "reward-model", "policy-gradient"],
    "sarsa-vs-qlearning":   ["sarsa", "q-learning", "mdp-bellman"],
    "td-lambda":            ["td-lambda", "q-learning", "mdp-bellman"],
    "ppo":                  ["ppo", "policy-gradient", "actor-critic"],
    "dyna-q":               ["dyna-q", "q-learning", "mdp-bellman"],
    "double-q-learning":    ["double-q-learning", "q-learning", "sarsa"],
    "gae":                  ["gae", "td-lambda", "actor-critic"],
    "prioritized-replay":   ["prioritized-replay", "dqn", "importance-sampling"],
    "distributional-rl":    ["distributional-rl", "q-learning", "mdp-bellman"],
    "successor-representation": ["successor-representation", "mdp-bellman", "markov"],
    "max-entropy-rl":       ["max-entropy-rl", "mdp-bellman", "policy-gradient"],
    "spectrogram":          ["spectrogram", "fourier"],
    "mfcc":                 ["mfcc", "spectrogram", "fourier"],
    "pitch-detection":      ["pitch-detection", "fourier", "forecasting"],
    "dtw":                  ["dtw", "dynamic-programming"],
    "aliasing":             ["aliasing", "fourier"],
    "pagerank":             ["pagerank", "markov", "pca"],
    "dijkstra":             ["dijkstra", "graph-search"],
    "mst":                  ["mst", "dijkstra", "hierarchical-clustering"],
    "louvain":              ["community-detection", "pagerank", "spectral-clustering"],
    "max-flow":             ["max-flow", "graph-search", "spectral-clustering"],
    "rag-chunking":         ["rag-chunking", "embeddings", "vector-search"],
    "self-consistency":     ["self-consistency", "decoding"],
    "constrained-decoding": ["constrained-decoding", "decoding", "tokenizer"],
    "guardrails":           ["guardrails", "constrained-decoding"],
    "prompt-injection":     ["prompt-injection", "guardrails", "react-agent"],
    "semantic-caching":     ["semantic-caching", "embeddings", "vector-search"],
    "kv-cache-eviction":    ["kv-cache-eviction", "kv-cache", "paged-attention"],
    "mixture-of-depths":    ["mixture-of-depths", "moe", "transformer-block"],
    "context-extension":    ["context-extension", "rope", "positional-encoding"],
    "lost-in-the-middle":   ["lost-in-the-middle", "attention", "rag-chunking"],
    "hyde":                 ["hyde", "embeddings", "vector-search"],
    "reflection":           ["reflection", "reward-model", "self-consistency"],
    "react-agent":          ["react-agent", "reflection", "rag-chunking"],
    "multi-query":          ["rag-fusion", "rag-chunking", "vector-search"],
    "rag-reranker":         ["reranking", "vector-search", "rag-chunking"],
    "agent-router":         ["tool-routing", "react-agent"],
    "attention-rollout":    ["attention-rollout", "attention", "multi-head-attention"],
    "calibration":          ["calibration", "logistic-regression", "roc"],
    "shap":                 ["shap", "logistic-regression"],
    "conformal":            ["conformal", "calibration", "roc"],
    "conformal-regression": ["conformal-regression", "conformal", "linear-regression"],
    "active-learning":      ["active-learning", "logistic-regression"],
    "coreset":              ["coreset", "kmeans", "active-learning"],
    "dataset-distillation": ["dataset-distillation", "coreset", "distillation"],
    "fairness":             ["fairness", "roc", "calibration"],
    "n-queens":             ["backtracking", "pathfinding"],
    "graph-coloring":       ["arc-consistency", "backtracking"],
    "sudoku":               ["backtracking", "arc-consistency"],
    "quantization":         ["quantization", "lora"],
    "pruning":              ["pruning", "backprop"],
    "distillation":         ["distillation", "calibration"],
    "moe":                  ["moe", "attention", "scaling-laws"],
    "simpsons-paradox":     ["simpsons-paradox", "linear-regression"],
    "do-intervention":      ["causal-inference", "simpsons-paradox"],
    "instrumental-variables": ["instrumental-variables", "causal-inference", "linear-regression"],
    "knapsack":             ["dynamic-programming", "mdp-bellman"],
    "branch-and-bound":     ["branch-and-bound", "dynamic-programming", "graph-search"],
    "bfs-dfs-astar":        ["graph-search", "pathfinding"],
    "edit-distance":        ["dynamic-programming"],
    "mixed-precision":      ["mixed-precision", "quantization"],
    "speculative-decoding": ["speculative-decoding", "decoding", "kv-cache"],
    "paged-attention":      ["paged-attention", "kv-cache"],
    "label-noise":          ["label-noise", "overfitting"],
    "mc-dropout":           ["mc-dropout", "calibration"],
    "saliency":             ["saliency", "shap", "backprop"],
    "drift-detection":      ["drift-detection", "clt"],
  },
  // Play games — slugs match play-games.js
  games: {
    "neuroevolution":  ["neuroevolution", "mlp"],
    "snake-dqn":       ["q-learning", "mdp-bellman"],
    "self-driving":    ["neuroevolution"],
    "tic-tac-toe":     ["minimax"],
    "connect-four":    ["minimax", "search-astar"],
    "chess":           ["minimax", "search-astar"],
    "go":              ["mcts", "bandit", "minimax"],
    "poker":           ["cfr"],
    "rps":             ["markov"],
    "twenty48":        ["minimax", "mdp-bellman"],
    "wordle":          ["entropy"],
    "minesweeper":     ["entropy"],
  },
  // ML-from-scratch curriculum modules — slugs match curriculum.js
  modules: {
    "neural-nets":           ["mlp", "backprop", "activations", "optimizers"],
    "cnn":                   ["cnn", "convolution"],
    "rnn-nlp":               ["rnn", "markov", "embeddings", "tokenization"],
    "transformers":          ["attention", "multi-head", "transformer-block", "positional-encoding"],
    "advanced-nlp":          ["decoding", "transformer-block"],
    "generative":            ["vae", "gan", "diffusion"],
    "fine-tuning":           ["lora"],
    "reinforcement-learning":["q-learning", "mdp-bellman", "bandit"],
    "training-systems":      ["lr-schedule", "scaling-laws", "adam"],
    "llm-systems":           ["scaling-laws"],
    "rag-agents":            ["vector-search", "embeddings"],
    "ml-applications":       ["forecasting"],
    "supervised-learning":   ["svm", "knn", "decision-tree", "roc"],
    "unsupervised-learning": ["kmeans", "gmm-em", "pca"],
    "foundations":           ["clt", "gradient-descent", "chain-rule", "entropy", "bayes"],
    "ml-theory":             ["bias-variance", "regularization"],
    "advanced-cv":           ["iou-nms"],
  },
  // HuggingFace tutorial sections — slugs match hf-lectures.js
  hf: {
    "nlp":        ["tokenization", "attention", "transformer-block"],
    "vision":     ["cnn", "convolution"],
    "audio":      ["fourier", "transformer-block"],
    "multimodal": ["embeddings", "vector-search"],
    "agentic":    ["vector-search", "embeddings"],
    "production": ["scaling-laws"],
    "advanced":   ["lora"],
  },
};

// Reverse index: concept_id -> [{ kind: "demo"|"game"|"module"|"hf", slug }]
function __buildReverseIndex() {
  const out = {};
  const push = (id, kind, slug) => {
    if (!out[id]) out[id] = [];
    out[id].push({ kind, slug });
  };
  for (const kind of ["demos", "games", "modules", "hf"]) {
    const single = kind === "demos" ? "demo" : kind === "games" ? "game" : kind === "modules" ? "module" : "hf";
    for (const slug of Object.keys(CONCEPT_TAGS[kind] || {})) {
      for (const id of CONCEPT_TAGS[kind][slug]) push(id, single, slug);
    }
  }
  return out;
}
const CONCEPT_REVERSE = __buildReverseIndex();

Object.assign(window, { CONCEPTS_INDEX, CONCEPT_TAGS, CONCEPT_REVERSE });
