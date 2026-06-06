// paths.js — single source of truth for Guided Learning Paths ("Tracks").
// Loaded before paths-hub-app.jsx / path-app.jsx (and after the registries it
// resolves against: concepts-index, play-demos, play-games, curriculum, lectures,
// hf-lectures). Data-driven like weekly-insights.js.
//
// A path = ordered stages of steps. A step is { kind, ref, note } where the
// title/blurb/href are RESOLVED from the existing registries so nothing is
// duplicated. kind in: concept | demo | game | module | lesson | hf | page.
// Progress is saved in localStorage (key dm_paths_v1); nothing leaves the browser.

window.LEARNING_PATHS = [
  {
    id: "ml-foundations", title: "ML Foundations", level: "Beginner", accent: "blue", estMinutes: 110,
    tagline: "The handful of ideas the rest of machine learning quietly assumes.",
    outcomes: [
      "Explain how a model learns by following the gradient downhill",
      "Diagnose overfitting and pick models with cross-validation",
      "Read a decision boundary for kNN, trees, and SVMs",
      "Reduce and cluster data with PCA and k-means",
    ],
    stages: [
      { name: "Learn by descending", steps: [
        { kind: "demo", ref: "gradient-descent", note: "The optimizer under almost every model — roll downhill on a loss surface." },
        { kind: "demo", ref: "backprop", note: "How the gradient is actually computed through a network." },
      ] },
      { name: "Fit and generalize", steps: [
        { kind: "demo", ref: "overfitting", note: "The central tension: fit the data vs fit the world." },
        { kind: "demo", ref: "bias-variance-decomp", note: "Decompose error into bias and variance." },
        { kind: "demo", ref: "cross-validation", note: "Estimate true performance without touching the test set." },
        { kind: "demo", ref: "roc", note: "Score a classifier honestly across every threshold." },
      ] },
      { name: "Classic models", steps: [
        { kind: "demo", ref: "knn", note: "The simplest idea that works: vote with your neighbors." },
        { kind: "demo", ref: "decision-tree", note: "Carve the space with axis-aligned questions." },
        { kind: "demo", ref: "svm", note: "Find the widest margin between classes." },
        { kind: "demo", ref: "naive-bayes", note: "A probabilistic baseline that's hard to beat." },
      ] },
      { name: "See structure unsupervised", steps: [
        { kind: "demo", ref: "kmeans", note: "Group points with no labels at all." },
        { kind: "demo", ref: "pca", note: "Find the directions that carry the variance." },
      ] },
      { name: "Go deeper", steps: [
        { kind: "module", ref: "foundations", note: "The full from-scratch module: math + NumPy fluency." },
        { kind: "module", ref: "supervised-learning", note: "Every classic algorithm, built before it's trusted." },
      ] },
    ],
  },

  {
    id: "zero-to-transformer", title: "Zero to Transformer", level: "Intermediate", accent: "violet", estMinutes: 150,
    tagline: "From turning words into vectors all the way to a working attention block.",
    outcomes: [
      "Explain why tokens become vectors and how position is encoded",
      "Read a query-key-value attention map",
      "Describe what a transformer block stacks together",
      "Understand how text is generated token by token",
    ],
    stages: [
      { name: "Represent", steps: [
        { kind: "demo", ref: "tokenizer", note: "Split text into the tokens a model actually sees." },
        { kind: "demo", ref: "embeddings", note: "Turn tokens into vectors with geometry that means something." },
        { kind: "demo", ref: "word2vec", note: "Learn those vectors from context — king - man + woman." },
        { kind: "demo", ref: "positional-encoding", note: "Inject order into a set-based model." },
      ] },
      { name: "Attend", steps: [
        { kind: "demo", ref: "attention", note: "The core operation: weight every token by relevance." },
        { kind: "demo", ref: "multi-head-attention", note: "Several attention patterns in parallel." },
        { kind: "demo", ref: "rope", note: "Rotary position embeddings — relative position for free." },
      ] },
      { name: "Assemble", steps: [
        { kind: "concept", ref: "transformer-block", note: "What one block stacks: attention + MLP + residual + norm." },
        { kind: "lesson", ref: "transformers/self-attention", title: "Self-Attention, end to end", blurb: "The flagship on-site lesson: build self-attention from scratch.", note: "The deep-dive that ties the pieces together." },
        { kind: "module", ref: "transformers", note: "The full transformers module." },
      ] },
      { name: "Generate", steps: [
        { kind: "demo", ref: "decoding", note: "Greedy, temperature, top-k, top-p — how the next token is chosen." },
        { kind: "demo", ref: "beam-search", note: "Search several continuations instead of one." },
        { kind: "demo", ref: "kv-cache", note: "Why generation is fast: cache the keys and values." },
      ] },
    ],
  },

  {
    id: "rl-from-scratch", title: "Reinforcement Learning from Scratch", level: "Intermediate", accent: "violet", estMinutes: 170,
    tagline: "Learning from reward — from bandits to deep RL and RLHF.",
    outcomes: [
      "Balance exploration and exploitation",
      "Derive value and policy updates from the Bellman equation",
      "Tell on-policy from off-policy methods and why it matters",
      "Trace the path from tabular Q-learning to PPO and RLHF",
    ],
    stages: [
      { name: "Bandits and MDPs", steps: [
        { kind: "demo", ref: "bandit", note: "Explore vs exploit, the simplest RL problem." },
        { kind: "demo", ref: "gridworld-rl", note: "Tabular Q-learning: value propagates from the goal." },
        { kind: "demo", ref: "value-iteration", note: "Solve a known MDP with Bellman backups." },
      ] },
      { name: "Tabular control", steps: [
        { kind: "demo", ref: "sarsa-vs-qlearning", note: "On-policy vs off-policy in one term of the update." },
        { kind: "demo", ref: "td-lambda", note: "Eligibility traces: TD(0) to Monte Carlo on one dial." },
        { kind: "demo", ref: "double-q-learning", note: "Fix the maximization bias that fools Q-learning." },
      ] },
      { name: "Policy methods", steps: [
        { kind: "demo", ref: "policy-gradient", note: "Optimize the policy directly with REINFORCE." },
        { kind: "demo", ref: "actor-critic", note: "A critic's baseline tames the variance." },
        { kind: "demo", ref: "gae", note: "The advantage estimator's bias/variance dial." },
        { kind: "demo", ref: "ppo", note: "The clip that made policy gradients stable." },
      ] },
      { name: "Deep and model-based", steps: [
        { kind: "demo", ref: "dqn", note: "Replace the Q-table with a network — replay + target net." },
        { kind: "demo", ref: "prioritized-replay", note: "Replay surprising transitions first." },
        { kind: "demo", ref: "dyna-q", note: "Learn a model and plan inside it." },
      ] },
      { name: "Align with RLHF", steps: [
        { kind: "demo", ref: "reward-model", note: "Learn a reward from human preferences." },
        { kind: "demo", ref: "dpo", note: "Skip the RL loop — optimize preferences directly." },
        { kind: "module", ref: "reinforcement-learning", note: "The full RL module." },
      ] },
    ],
  },

  {
    id: "rag-and-agents", title: "LLM Systems: RAG & Agents", level: "Intermediate", accent: "violet", estMinutes: 150,
    tagline: "Turn a raw model into a grounded, reliable, safe system.",
    outcomes: [
      "Ground answers in retrieved context and rerank what matters",
      "Build a tool-using agent loop and make it reliable",
      "Defend against prompt injection and unsafe output",
      "Serve LLMs cheaply with caching and cache management",
    ],
    stages: [
      { name: "Retrieve", steps: [
        { kind: "demo", ref: "embeddings", note: "The vectors retrieval runs on." },
        { kind: "demo", ref: "vector-search", note: "Find nearest neighbors fast." },
        { kind: "demo", ref: "rag-chunking", note: "Split documents so the answer survives retrieval." },
        { kind: "demo", ref: "hyde", note: "Query a hypothetical answer, not the question." },
        { kind: "demo", ref: "rag-reranker", note: "Re-score the top hits with a cross-encoder." },
        { kind: "demo", ref: "lost-in-the-middle", note: "Why position in the context window matters." },
      ] },
      { name: "Act", steps: [
        { kind: "demo", ref: "react-agent", note: "Thought -> Action -> Observation tool loops." },
        { kind: "demo", ref: "agent-router", note: "Dispatch to the right tool, with fallback." },
        { kind: "demo", ref: "reflection", note: "Draft, critique, revise toward a quality bar." },
        { kind: "demo", ref: "self-consistency", note: "Sample and vote for reliability." },
      ] },
      { name: "Safeguard", steps: [
        { kind: "demo", ref: "guardrails", note: "The input/output safety pipeline." },
        { kind: "demo", ref: "prompt-injection", note: "The attacks, and the layered defenses." },
        { kind: "demo", ref: "constrained-decoding", note: "Guarantee valid structured output." },
      ] },
      { name: "Serve", steps: [
        { kind: "demo", ref: "semantic-caching", note: "Cache by meaning, not exact text." },
        { kind: "demo", ref: "kv-cache-eviction", note: "Bound the cache without wrecking quality." },
        { kind: "module", ref: "rag-agents", note: "The full RAG & agents module." },
      ] },
    ],
  },

  {
    id: "computer-vision", title: "Computer Vision", level: "Intermediate", accent: "blue", estMinutes: 120,
    tagline: "From raw pixels to edges, features, motion, and detections.",
    outcomes: [
      "Filter images with convolution and detect edges",
      "Find corners, lines, and gradient-based features",
      "Estimate motion between frames",
      "Segment regions and clean up overlapping detections",
    ],
    stages: [
      { name: "Filter", steps: [
        { kind: "demo", ref: "convolution", note: "The sliding kernel behind every vision model." },
        { kind: "demo", ref: "edge-detection", note: "The full Canny pipeline, stage by stage." },
      ] },
      { name: "Features", steps: [
        { kind: "demo", ref: "hough-transform", note: "Detect lines by voting in parameter space." },
        { kind: "demo", ref: "harris-corners", note: "Corner response from the structure tensor." },
        { kind: "demo", ref: "hog", note: "Histogram-of-gradients descriptor for shape." },
      ] },
      { name: "Motion and segment", steps: [
        { kind: "demo", ref: "optical-flow", note: "Estimate per-pixel motion with Lucas-Kanade." },
        { kind: "demo", ref: "watershed", note: "Marker-controlled region segmentation." },
      ] },
      { name: "Detect", steps: [
        { kind: "demo", ref: "image-augmentation", note: "Label-preserving transforms that regularize." },
        { kind: "demo", ref: "nms", note: "Collapse overlapping boxes into clean detections." },
        { kind: "module", ref: "cnn", note: "The full CNN / computer-vision module." },
      ] },
    ],
  },

  {
    id: "classic-cs", title: "Classic CS Algorithms", level: "Beginner", accent: "blue", estMinutes: 130,
    tagline: "The search, dynamic programming, constraints, and graph algorithms under AI.",
    outcomes: [
      "Compare uninformed search with heuristic A*",
      "Solve problems by dynamic programming over subproblems",
      "Prune enormous spaces with constraint propagation",
      "Run the core graph algorithms and know what they're for",
    ],
    stages: [
      { name: "Search", steps: [
        { kind: "demo", ref: "bfs-dfs-astar", note: "BFS vs DFS vs A* on one maze." },
        { kind: "demo", ref: "dijkstra", note: "Shortest paths on a weighted graph." },
      ] },
      { name: "Dynamic programming", steps: [
        { kind: "demo", ref: "knapsack", note: "Build the answer from sub-answers, then backtrack." },
        { kind: "demo", ref: "edit-distance", note: "The fewest edits between two strings." },
        { kind: "demo", ref: "dtw", note: "Elastic alignment of two series at different speeds." },
      ] },
      { name: "Constraints", steps: [
        { kind: "demo", ref: "n-queens", note: "Backtracking with forward checking." },
        { kind: "demo", ref: "graph-coloring", note: "Arc-consistency prunes the search." },
        { kind: "demo", ref: "sudoku", note: "Propagation makes a hard search easy." },
      ] },
      { name: "Graphs", steps: [
        { kind: "demo", ref: "mst", note: "The cheapest connecting backbone (Prim's)." },
        { kind: "demo", ref: "max-flow", note: "Max flow equals min cut." },
        { kind: "demo", ref: "pagerank", note: "Rank nodes by who points at them." },
      ] },
    ],
  },

  {
    id: "trustworthy-ml", title: "Trustworthy & Responsible ML", level: "Intermediate", accent: "blue", estMinutes: 140,
    tagline: "Models you can actually deploy — honest, explainable, robust, and fair.",
    outcomes: [
      "Tell whether a model's confidence scores are honest",
      "Explain a prediction and attribute it to features",
      "Give predictions with guaranteed coverage",
      "Spot bias, drift, and bad labels before they bite",
    ],
    stages: [
      { name: "Honest confidence", steps: [
        { kind: "demo", ref: "calibration", note: "Are 90%-confident predictions right 90% of the time?" },
        { kind: "demo", ref: "conformal", note: "Prediction sets with guaranteed coverage." },
        { kind: "demo", ref: "conformal-regression", note: "Calibrated intervals on a regression curve." },
        { kind: "demo", ref: "mc-dropout", note: "Turn dropout into an uncertainty estimate." },
      ] },
      { name: "Explain", steps: [
        { kind: "demo", ref: "shap", note: "Exact Shapley attribution of a prediction." },
        { kind: "demo", ref: "saliency", note: "Which inputs moved the output." },
      ] },
      { name: "Fair & robust", steps: [
        { kind: "demo", ref: "fairness", note: "Group fairness metrics and their tradeoffs." },
        { kind: "demo", ref: "drift-detection", note: "Catch covariate shift in production." },
      ] },
      { name: "Data quality", steps: [
        { kind: "demo", ref: "label-noise", note: "How flipped labels corrupt a model." },
        { kind: "demo", ref: "active-learning", note: "Label the points that matter most." },
        { kind: "demo", ref: "coreset", note: "A tiny subset that preserves the model." },
      ] },
    ],
  },

  {
    id: "generative-models", title: "Generative Models", level: "Intermediate", accent: "violet", estMinutes: 95,
    tagline: "Three ways to learn to create data — latent, adversarial, and iterative.",
    outcomes: [
      "Encode and sample data through a latent space",
      "Train a generator against a discriminator",
      "Understand diffusion's noise-and-denoise process",
    ],
    stages: [
      { name: "Latent variables", steps: [
        { kind: "demo", ref: "embeddings", note: "Representations to generate from." },
        { kind: "demo", ref: "vae", note: "Encode to a distribution, sample, decode." },
      ] },
      { name: "Adversarial", steps: [
        { kind: "demo", ref: "gan", note: "A generator and discriminator in a duel." },
      ] },
      { name: "Iterative refinement", steps: [
        { kind: "demo", ref: "diffusion", note: "Add noise, then learn to reverse it." },
      ] },
      { name: "Go deeper", steps: [
        { kind: "module", ref: "generative", note: "The full generative-models module." },
      ] },
    ],
  },

  {
    id: "audio-ml", title: "Audio ML", level: "Intermediate", accent: "violet", estMinutes: 90,
    tagline: "How a waveform becomes something a model can learn from.",
    outcomes: [
      "Avoid aliasing when you sample a signal",
      "Read a spectrogram and the time-frequency tradeoff",
      "Compute the classic speech feature (MFCC) and detect pitch",
      "Align two recordings at different speeds",
    ],
    stages: [
      { name: "Sampling & spectra", steps: [
        { kind: "demo", ref: "aliasing", note: "Sample too slowly and a phantom frequency appears." },
        { kind: "demo", ref: "fourier", note: "Decompose a signal into frequencies." },
      ] },
      { name: "Time-frequency & features", steps: [
        { kind: "demo", ref: "spectrogram", note: "Frequency over time, with a resolution tradeoff." },
        { kind: "demo", ref: "mfcc", note: "The mel/log/DCT speech feature." },
        { kind: "demo", ref: "pitch-detection", note: "Find the fundamental by autocorrelation." },
      ] },
      { name: "Alignment", steps: [
        { kind: "demo", ref: "dtw", note: "Elastic alignment of two series at different speeds." },
      ] },
    ],
  },

  {
    id: "efficiency-and-serving", title: "Efficiency & Serving", level: "Intermediate", accent: "blue", estMinutes: 150,
    tagline: "Make a trained model cheap and reliable enough to actually ship.",
    outcomes: [
      "Shrink a model with quantization, pruning, and distillation",
      "Speed up inference without losing accuracy",
      "Serve under real traffic with batching, scaling, and safe rollouts",
    ],
    stages: [
      { name: "Shrink the model", steps: [
        { kind: "demo", ref: "quantization", note: "Fewer bits per weight." },
        { kind: "demo", ref: "pruning", note: "Drop the weights that don't matter." },
        { kind: "demo", ref: "distillation", note: "A small student learns from a big teacher." },
        { kind: "demo", ref: "moe", note: "Route each token to a few experts." },
      ] },
      { name: "Faster inference", steps: [
        { kind: "demo", ref: "mixed-precision", note: "fp16/bf16 with loss scaling." },
        { kind: "demo", ref: "kv-cache", note: "Cache keys and values to skip recompute." },
        { kind: "demo", ref: "speculative-decoding", note: "Draft fast, verify exactly." },
        { kind: "demo", ref: "paged-attention", note: "Page the KV cache to kill fragmentation." },
      ] },
      { name: "Serve under load", steps: [
        { kind: "demo", ref: "batching", note: "Trade latency for throughput." },
        { kind: "demo", ref: "model-cascade", note: "Escalate only the hard inputs." },
        { kind: "demo", ref: "autoscaling", note: "Track demand without breaking the SLO." },
        { kind: "demo", ref: "canary-rollout", note: "Ship a new model safely." },
      ] },
    ],
  },

  {
    id: "llm-internals", title: "Modern LLM Internals", level: "Advanced", accent: "violet", estMinutes: 150,
    tagline: "What actually makes large language models scale, stretch, and stay fast.",
    outcomes: [
      "Reason about scaling laws and parameter-efficient tuning",
      "Extend context length and understand RoPE",
      "Manage the KV cache for long contexts",
      "Peek inside attention for interpretability",
    ],
    stages: [
      { name: "Scale & adapt", steps: [
        { kind: "demo", ref: "scaling-laws", note: "Loss vs compute, data, and parameters." },
        { kind: "demo", ref: "lora", note: "Fine-tune with a tiny low-rank update." },
      ] },
      { name: "Long context", steps: [
        { kind: "demo", ref: "rope", note: "Rotary position embeddings." },
        { kind: "demo", ref: "context-extension", note: "Stretch past the training length (PI/NTK/YaRN)." },
        { kind: "demo", ref: "lost-in-the-middle", note: "Position bias in long contexts." },
      ] },
      { name: "Efficient attention", steps: [
        { kind: "demo", ref: "kv-cache-eviction", note: "Bound the cache without wrecking quality." },
        { kind: "demo", ref: "mixture-of-depths", note: "Per-token dynamic compute." },
      ] },
      { name: "Look inside", steps: [
        { kind: "demo", ref: "attention-rollout", note: "Compose attention across layers." },
        { kind: "module", ref: "fine-tuning", note: "The full fine-tuning module." },
      ] },
    ],
  },
];

// ── step resolution against the existing registries ──────────────────
window.DM_PATH_RESOLVE = function (step) {
  const BASE = window.__DM_BASE || "../../";
  const r = step.ref;
  let title = step.title || r, blurb = step.blurb || "", href = step.href || "#";
  if (step.kind === "concept") { const c = (window.CONCEPTS_INDEX || {})[r]; if (c) { title = step.title || c.name; blurb = step.blurb || c.summary; } href = BASE + "concepts/" + r + "/"; }
  else if (step.kind === "demo") { const d = ((window.PLAY_DEMOS && window.PLAY_DEMOS.demos) || []).find(x => x.slug === r); if (d) { title = step.title || d.title; blurb = step.blurb || d.blurb; } href = BASE + "visualize/" + r + "/"; }
  else if (step.kind === "game") { const g = ((window.PLAY_GAMES && window.PLAY_GAMES.games) || []).find(x => x.slug === r); if (g) { title = step.title || g.title; blurb = step.blurb || g.blurb; } href = BASE + "play/" + r + "/"; }
  else if (step.kind === "module") { const m = ((window.CURRICULUM && window.CURRICULUM.modules) || []).find(x => x.slug === r); if (m) { title = step.title || m.title; blurb = step.blurb || m.blurb; } href = BASE + "learn/" + r + "/"; }
  else if (step.kind === "lesson") { href = BASE + "learn/" + r + "/"; }
  else if (step.kind === "hf") { const s = (window.HF && window.HF.find) ? window.HF.find(r) : null; if (s) { title = step.title || s.title; blurb = step.blurb || s.blurb; } href = BASE + "learn/huggingface/" + r + "/"; }
  else { href = step.href || r; }
  return { title, blurb, href, kind: step.kind };
};

window.DM_PATH_FIND = id => (window.LEARNING_PATHS || []).find(p => p.id === id);
window.DM_PATH_TOTAL = p => p.stages.reduce((a, s) => a + s.steps.length, 0);

// ── localStorage progress (graceful if storage is unavailable) ───────
(function () {
  const KEY = "dm_paths_v1";
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const write = (o) => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* private mode */ } };
  window.DM_PATHS = {
    get(id) { return read()[id] || { done: {}, last: null }; },
    isDone(id, key) { const d = read()[id]; return !!(d && d.done && d.done[key]); },
    toggle(id, key) { const o = read(); o[id] = o[id] || { done: {}, last: null }; o[id].done = o[id].done || {}; if (o[id].done[key]) delete o[id].done[key]; else { o[id].done[key] = true; o[id].last = key; } o[id].ts = Date.now(); write(o); },
    setLast(id, key) { const o = read(); o[id] = o[id] || { done: {}, last: null }; o[id].last = key; o[id].ts = Date.now(); write(o); },
    doneCount(id) { const d = read()[id]; return d && d.done ? Object.keys(d.done).length : 0; },
    started(id) { return this.doneCount(id) > 0; },
  };
})();
