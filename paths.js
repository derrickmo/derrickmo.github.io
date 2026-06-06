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
