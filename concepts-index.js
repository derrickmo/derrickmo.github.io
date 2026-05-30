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
  "active-learning": {
    id: "active-learning", name: "Active Learning", area: "Foundations",
    summary: "Cut labeling cost by letting the model choose what to label next. Uncertainty sampling queries the unlabeled point nearest the decision boundary (most uncertain); refitting on those informative points reaches high accuracy with far fewer labels than random. The core loop of data-centric ML and human-in-the-loop annotation.",
    prereqs: ["logistic-regression", "calibration"],
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
    "rnn-gates":            ["lstm-gates", "rnn"],
    "beam-search":          ["beam-search", "decoding"],
    "kv-cache":             ["kv-cache", "attention"],
    "gnn":                  ["gnn", "mlp"],
    "rope":                 ["rope", "positional-encoding", "attention"],
    "dbscan":               ["dbscan", "knn"],
    "policy-gradient":      ["policy-gradient", "mdp-bellman", "gradient-descent"],
    "actor-critic":         ["actor-critic", "policy-gradient", "mdp-bellman"],
    "dqn":                  ["dqn", "mdp-bellman", "mlp"],
    "reward-model":         ["reward-model", "logistic-regression", "policy-gradient"],
    "dpo":                  ["dpo", "reward-model", "policy-gradient"],
    "rag-chunking":         ["rag-chunking", "embeddings", "vector-search"],
    "self-consistency":     ["self-consistency", "decoding"],
    "constrained-decoding": ["constrained-decoding", "decoding", "tokenizer"],
    "guardrails":           ["guardrails", "constrained-decoding"],
    "lost-in-the-middle":   ["lost-in-the-middle", "attention", "rag-chunking"],
    "hyde":                 ["hyde", "embeddings", "vector-search"],
    "reflection":           ["reflection", "reward-model", "self-consistency"],
    "react-agent":          ["react-agent", "reflection", "rag-chunking"],
    "calibration":          ["calibration", "logistic-regression", "roc"],
    "shap":                 ["shap", "logistic-regression"],
    "conformal":            ["conformal", "calibration", "roc"],
    "active-learning":      ["active-learning", "logistic-regression"],
    "fairness":             ["fairness", "roc", "calibration"],
    "n-queens":             ["backtracking", "pathfinding"],
    "graph-coloring":       ["arc-consistency", "backtracking"],
    "sudoku":               ["backtracking", "arc-consistency"],
    "quantization":         ["quantization", "lora"],
    "pruning":              ["pruning", "backprop"],
    "distillation":         ["distillation", "calibration"],
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
