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
    leadsTo: ["regularization"],
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
  "decision-tree": {
    id: "decision-tree", name: "Decision Tree", area: "Classical ML",
    summary: "Split feature space greedily by the cut that most reduces impurity; the building block of forests and boosting.",
    leadsTo: ["entropy"],
  },
  "svm": {
    id: "svm", name: "SVM (Max-Margin + Kernels)", area: "Classical ML",
    summary: "Find the widest-margin separating boundary; bend it nonlinearly with the kernel trick.",
    tex: "\\min_w \\tfrac{1}{2}\\lVert w \\rVert^2 + C \\sum_i \\xi_i",
    leadsTo: ["attention"],
  },
  "pca": {
    id: "pca", name: "PCA / SVD", area: "Classical ML",
    summary: "Project data onto the eigenvectors of its covariance — the basic linear dimensionality reduction.",
    leadsTo: ["embeddings", "lora"],
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
    prereqs: ["activations", "backprop"], leadsTo: ["cnn", "rnn", "transformer-block"],
    animation: "viz/feedforward.html",
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
  "iou-nms": {
    id: "iou-nms", name: "IoU & Non-Max Suppression", area: "Computer Vision",
    summary: "Score box overlap with IoU; greedily suppress duplicates — the cleanup step every detector ends with.",
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
    leadsTo: ["vector-search", "attention"],
    animation: "viz/embeddings.html",
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
    prereqs: ["cross-entropy"], leadsTo: ["bandit", "vae"],
  },
  "optimizers": {
    id: "optimizers", name: "Adaptive Optimizers (Momentum / RMSProp / Adam)", area: "Foundations",
    summary: "Practical generalizations of SGD: momentum builds velocity, adaptive methods rescale per-parameter step sizes — Adam combines both and dominates in practice.",
    tex: "m_t = \\beta_1 m_{t-1} + (1{-}\\beta_1)\\,g_t,\\quad v_t = \\beta_2 v_{t-1} + (1{-}\\beta_2)\\,g_t^{\\,2}",
    prereqs: ["gradient-descent"], leadsTo: ["lr-schedule"],
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
    "overfitting":          ["bias-variance", "regularization"],
    "roc":                  ["roc", "cross-entropy"],
    "decision-tree":        ["decision-tree", "entropy"],
    "knn":                  ["knn", "bias-variance"],
    "svm":                  ["svm", "regularization", "attention"],
    "pca":                  ["pca", "embeddings"],
    "gmm":                  ["gmm-em", "kmeans"],
    "clt":                  ["clt"],
    "bayes":                ["bayes", "cross-entropy"],
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
    "convolution":          ["convolution", "cnn"],
    "neural-playground":    ["mlp", "backprop", "activations"],
    "lr-schedule":          ["lr-schedule", "gradient-descent"],
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
