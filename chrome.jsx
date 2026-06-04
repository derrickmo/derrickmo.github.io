// chrome.jsx — shared chrome (TopNav, Footer, helpers) for every page.
// Each page sets `window.__DM_PAGE` ("home" | "research" | "learn" |
// "weekly-insights" | "visualize" | "play" | "cases" | "about") and
// `window.__DM_BASE` ("" for landing, "../" for subdirectory pages)
// BEFORE this script runs, so the nav can highlight the active page and
// emit correct relative links.

const { useState: __useState, useEffect: __useEffect, useRef: __useRef } = React;
const { Monogram: __Monogram } = window;

const __DM_BASE = window.__DM_BASE || "";
const __DM_PAGE = window.__DM_PAGE || "home";

// ─── Email: copy to clipboard + toast (no mailto, so it never opens a blank tab) ──
const DM_EMAIL = "investdmo@gmail.com";
window.__dmCopyEmail = function () {
  try { if (navigator.clipboard) navigator.clipboard.writeText(DM_EMAIL); } catch (e) {}
  let t = document.getElementById("dm-toast");
  if (!t) {
    t = document.createElement("div"); t.id = "dm-toast"; document.body.appendChild(t);
    t.style.cssText = "position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:9999;background:rgba(13,24,52,0.96);border:1px solid #60a5fa;color:#e0e7ff;font-family:'JetBrains Mono',monospace;font-size:13px;letter-spacing:0.04em;padding:11px 18px;border-radius:6px;box-shadow:0 8px 30px rgba(0,0,0,0.4);transition:opacity .3s;pointer-events:none;";
  }
  t.textContent = "Email copied — " + DM_EMAIL;
  t.style.opacity = "1";
  clearTimeout(window.__dmToastT); window.__dmToastT = setTimeout(() => { t.style.opacity = "0"; }, 2000);
};

// ─── Responsive hook ──────────────────────────────────────────
function useIsMobile(bp = 760) {
  const [m, setM] = __useState(false);
  __useEffect(() => {
    const mq = window.matchMedia(`(max-width:${bp}px)`);
    const h = () => setM(mq.matches);
    h(); mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, [bp]);
  return m;
}

// ─── KaTeX loader (CDN, static — GitHub-Pages-safe) ──────────────────────────
// Loaded lazily on the first <TeX/> render so non-math pages pay nothing.
const __KATEX_VER = "0.16.11";
const __KATEX_CSS = `https://cdn.jsdelivr.net/npm/katex@${__KATEX_VER}/dist/katex.min.css`;
const __KATEX_JS  = `https://cdn.jsdelivr.net/npm/katex@${__KATEX_VER}/dist/katex.min.js`;
let __katexReady = null;
function __ensureKatex() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.katex) return Promise.resolve();
  if (__katexReady) return __katexReady;
  __katexReady = new Promise((resolve) => {
    if (!document.querySelector('link[data-katex="1"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet"; link.href = __KATEX_CSS; link.dataset.katex = "1";
      document.head.appendChild(link);
    }
    const existing = document.querySelector('script[data-katex="1"]');
    if (existing) { const t = () => window.katex ? resolve() : setTimeout(t, 60); t(); return; }
    const s = document.createElement("script");
    s.src = __KATEX_JS; s.async = true; s.dataset.katex = "1";
    s.onload = () => resolve();
    s.onerror = () => resolve(); // fall back to plaintext on network failure
    document.head.appendChild(s);
  });
  return __katexReady;
}

// <TeX> — inline math by default, <TeX display>...</TeX> for centered block.
// Children may be a string OR a fragment of strings (JSX trims/joins them).
function TeX({ children, display = false, ariaLabel }) {
  const formula = Array.isArray(children) ? children.join("") : (children == null ? "" : String(children));
  const [html, setHtml] = __useState(null);
  __useEffect(() => {
    let alive = true;
    __ensureKatex().then(() => {
      if (!alive || !window.katex) return;
      try {
        const out = window.katex.renderToString(formula, {
          displayMode: !!display, throwOnError: false, output: "html",
          strict: "ignore",
        });
        setHtml(out);
      } catch (_) { setHtml(null); }
    });
    return () => { alive = false; };
  }, [formula, display]);
  if (html) {
    return (
      <span aria-label={ariaLabel || formula}
        dangerouslySetInnerHTML={{ __html: html }}
        style={display
          ? { display: "block", margin: "12px 0", textAlign: "center", color: "var(--white)" }
          : { display: "inline-block", color: "var(--white)" }} />
    );
  }
  // Pre-load fallback: render the source so the page is readable even offline.
  return (
    <code className="t-mono" style={{
      color: "var(--blue-lt)", fontSize: 13,
      ...(display ? { display: "block", margin: "10px 0", textAlign: "center" } : {}),
    }}>{formula}</code>
  );
}

// ─── Concept connections panel ───────────────────────────────────────────────
// Given an array of concept ids (slugs), looks them up in window.CONCEPTS_INDEX
// (if present) and scans the demo / game / curriculum / HF registries for every
// item tagged with one of those ids. Renders a compact "CONNECTIONS" block:
// the concept summary, then linked chips grouped by surface (Demo / Game /
// Lesson / Animation). Safe if any registry isn't loaded — those rows just hide.
function Connections({ ids }) {
  if (!ids || !ids.length) return null;
  const BASE = window.__DM_BASE || "";
  const INDEX = window.CONCEPTS_INDEX || {};
  const concepts = ids.map(id => INDEX[id]).filter(Boolean);
  if (!concepts.length) return null;

  // Pull what's available from each registry without exploding if absent.
  const demos = (window.PLAY_DEMOS && window.PLAY_DEMOS.demos) || [];
  const games = (window.PLAY_GAMES && window.PLAY_GAMES.games) || [];
  const modules = (window.CURRICULUM && window.CURRICULUM.modules) || [];
  const hfSections = (window.HF && window.HF.sections) || [];
  const findBy = (arr, slug) => arr.find(x => x.slug === slug);

  // Look up tags via the side-table (concepts-index.js), de-dup, exclude self.
  const REV = window.CONCEPT_REVERSE || {};
  const selfSlug = (typeof window.__DM_DEMO_SLUG === "string") ? window.__DM_DEMO_SLUG : null;
  const collect = (kind) => {
    const seen = new Set();
    const out = [];
    for (const id of ids) for (const hit of (REV[id] || [])) {
      if (hit.kind !== kind) continue;
      if (selfSlug && hit.slug === selfSlug) continue;
      if (seen.has(hit.slug)) continue;
      seen.add(hit.slug); out.push(hit.slug);
    }
    return out;
  };
  const demoLinks = collect("demo").map(slug => {
    const e = findBy(demos, slug);
    return { label: (e && e.title) || slug, href: `${BASE}visualize/${slug}/` };
  });
  const gameLinks = collect("game").map(slug => {
    const e = findBy(games, slug);
    return { label: (e && e.title) || slug, href: `${BASE}play/${slug}/` };
  });
  const lessonLinks = collect("module").map(slug => {
    const e = findBy(modules, slug);
    return { label: (e && e.title) || slug, href: `${BASE}learn/${slug}/` };
  });
  const hfLinks = collect("hf").map(slug => {
    const e = findBy(hfSections, slug);
    return { label: "HF · " + ((e && e.title) || slug), href: `${BASE}learn/huggingface/${slug}/` };
  });
  const groups = [
    { tone: "violet", title: "INTERACTIVE DEMOS", items: demoLinks },
    { tone: "blue",   title: "GAMES",             items: gameLinks  },
    { tone: "blue",   title: "LESSONS",           items: lessonLinks.concat(hfLinks) },
  ].filter(g => g.items.length);

  // Hub chip for each concept.
  const hubs = concepts.map(c => ({
    label: c.name, href: `${BASE}concepts/${c.id}/`,
  }));

  return (
    <div style={{ marginTop: 30, paddingTop: 26, borderTop: "1px solid var(--border)" }}>
      <span className="t-mono-s" style={{ color: "var(--violet-lt)", letterSpacing: "0.14em" }}>
        // CONNECTIONS · CONCEPT GRAPH
      </span>
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 16 }}>
        {concepts.map(c => (
          <div key={c.id} className="t-body" style={{ color: "var(--white)", opacity: 0.85, fontSize: 15, lineHeight: 1.6 }}>
            <a href={`${BASE}concepts/${c.id}/`} style={{ color: "var(--blue-br)", textDecoration: "none", fontWeight: 600 }}>{c.name}</a>
            <span style={{ color: "var(--dim)" }}> · {c.area}</span>
            {c.summary ? <span style={{ color: "var(--muted)" }}> — {c.summary}</span> : null}
          </div>
        ))}
        {groups.map(g => (
          <div key={g.title}>
            <span className="t-mono-s" style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.1em" }}>{g.title}</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {g.items.map(it => {
                const accent = g.tone === "violet" ? "var(--violet-lt)" : "var(--blue-lt)";
                return (
                  <a key={it.href} href={it.href} className="t-mono-s" style={{
                    padding: "6px 11px", borderRadius: 999, border: "1px solid var(--border)",
                    color: accent, background: "rgba(13,24,52,0.5)",
                    textDecoration: "none", fontSize: 11, letterSpacing: "0.06em",
                  }}>{it.label}</a>
                );
              })}
            </div>
          </div>
        ))}
        <div>
          <span className="t-mono-s" style={{ color: "var(--muted)", fontSize: 10, letterSpacing: "0.1em" }}>CONCEPT HUBS</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {hubs.map(it => (
              <a key={it.href} href={it.href} className="t-mono-s" style={{
                padding: "6px 11px", borderRadius: 4, border: "1px solid var(--violet)",
                color: "var(--white)", background: "rgba(168,85,247,0.08)",
                textDecoration: "none", fontSize: 11, letterSpacing: "0.06em",
              }}>{it.label} →</a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Command palette index (absolute paths; site is served from root) ─────────
const DM_NAV_INDEX = [
  { label: "Home", group: "Page", href: "/", kw: "start landing" },
  { label: "About", group: "Page", href: "/about/", kw: "bio experience education" },
  { label: "Selected Work (on home)", group: "Page", href: "/#work", kw: "projects portfolio selected research teaching learning slm mentalnet huggingface" },
  { label: "Research", group: "Page", href: "/research/", kw: "papers patents slm survey publications" },
  { label: "Build", group: "Page", href: "/cases/", kw: "consulting build how i work hire engagement collaborate" },
  { label: "Learn", group: "Page", href: "/learn/", kw: "curriculum teaching courses ml dl" },
  { label: "ML from Scratch (course)", group: "Page", href: "/learn/ml-from-scratch/", kw: "numpy pytorch 20 modules curriculum first principles" },
  { label: "Building with GenAI (short course)", group: "Page", href: "/learn/building-with-genai/", kw: "claude code cowork design making of this site genai workflow" },
  { label: "Notes", group: "Page", href: "/learn/notes/", kw: "concepts intro short writing blog attention gradient overfitting embeddings" },
  { label: "Visualize", group: "Page", href: "/visualize/", kw: "demos interactive ml libraries visualizations touch the math" },
  { label: "Play", group: "Page", href: "/play/", kw: "ai games connect four 2048 neuroevolution rock paper scissors" },
  { label: "Neuroevolution: Flappy", group: "Game", href: "/play/neuroevolution/", kw: "genetic algorithm neural network evolution flappy game ai learns play human versus" },
  { label: "Tic-Tac-Toe", group: "Game", href: "/play/tic-tac-toe/", kw: "minimax game tree perfect ai unbeatable" },
  { label: "Rock-Paper-Scissors Mind-Reader", group: "Game", href: "/play/rps/", kw: "markov sequence model predict pattern rps" },
  { label: "Connect Four vs AI", group: "Game", href: "/play/connect-four/", kw: "minimax alpha-beta connect four game tree" },
  { label: "2048 + AI Assist", group: "Game", href: "/play/twenty48/", kw: "2048 expectimax tiles puzzle ai autoplay" },
  { label: "Wordle Solver Duel", group: "Game", href: "/play/wordle/", kw: "wordle entropy information solver words" },
  { label: "Minesweeper Oracle", group: "Game", href: "/play/minesweeper/", kw: "minesweeper probability constraint solver mines" },
  { label: "Chess", group: "Game", href: "/play/chess/", kw: "chess negamax alpha-beta engine board game" },
  { label: "Snake: Self-Taught", group: "Game", href: "/play/snake-dqn/", kw: "snake reinforcement learning q-learning self-taught rl agent" },
  { label: "Evolving Drivers", group: "Game", href: "/play/self-driving/", kw: "self driving car neuroevolution genetic ray sensors track" },
  { label: "Heads-Up Poker", group: "Game", href: "/play/poker/", kw: "poker kuhn cfr counterfactual regret nash equilibrium bluff game theory" },
  { label: "Go 7x7", group: "Game", href: "/play/go/", kw: "go baduk weiqi monte carlo mcts alphago board game" },
  { label: "HuggingFace Tutorial", group: "Page", href: "/learn/huggingface/", kw: "hf transformers course" },
  { label: "Key Concepts (animated)", group: "Page", href: "/learn/key-concepts/", kw: "visualizations animations core deep learning concepts" },
  { label: "Key Concepts: Agentic & LLM", group: "Page", href: "/learn/key-concepts/agentic/", kw: "rag mcp react chain of thought lora moe agents animations" },
  { label: "Key Concepts: Applications", group: "Page", href: "/learn/key-concepts/applications/", kw: "classification segmentation detection gan diffusion robotics animations" },

  { label: "A* Pathfinding", group: "Demo", href: "/visualize/pathfinding/", kw: "search dijkstra bfs astar" },
  { label: "K-Means Clustering", group: "Demo", href: "/visualize/kmeans/", kw: "unsupervised clusters" },
  { label: "Gradient Descent", group: "Demo", href: "/visualize/gradient-descent/", kw: "optimizer sgd adam" },
  { label: "Overfitting Lab", group: "Demo", href: "/visualize/overfitting/", kw: "bias variance polynomial regression ridge theory" },
  { label: "Cross-Validation", group: "Demo", href: "/visualize/cross-validation/", kw: "cross validation k-fold model selection hyperparameter tuning held-out validation generalization leave one out train test split bias variance overfitting" },
  { label: "Double Descent", group: "Demo", href: "/visualize/double-descent/", kw: "double descent interpolation threshold over-parameterization bias variance test error peak random features min-norm benign overfitting belkin nakkiran capacity generalization" },
  { label: "Bias-Variance Decomposition", group: "Demo", href: "/visualize/bias-variance-decomp/", kw: "bias variance decomposition tradeoff irreducible noise ensemble resampling polynomial complexity u-curve generalization error expected" },
  { label: "Decision Tree", group: "Demo", href: "/visualize/decision-tree/", kw: "cart gini splits classical ml" },
  { label: "Bagging vs Boosting", group: "Demo", href: "/visualize/bagging-boosting/", kw: "bagging boosting ensemble random forest gradient boosting xgboost lightgbm bootstrap aggregating variance bias residual weak learner adaboost trees tabular" },
  { label: "Gaussian Processes", group: "Demo", href: "/visualize/gaussian-process/", kw: "gaussian process gp regression kernel rbf posterior uncertainty bayesian optimization kriging surrogate lengthscale covariance bands nonparametric" },
  { label: "k-Nearest Neighbors", group: "Demo", href: "/visualize/knn/", kw: "knn classifier classical ml" },
  { label: "Gaussian Naive Bayes", group: "Demo", href: "/visualize/naive-bayes/", kw: "naive bayes gaussian classifier generative conditional independence qda lda discriminant spam posterior prior likelihood classical ml" },
  { label: "SVM - Margins & Kernels", group: "Demo", href: "/visualize/svm/", kw: "support vector machine margin kernel rbf classical ml" },
  { label: "Principal Component Analysis", group: "Demo", href: "/visualize/pca/", kw: "pca projection dimensionality reduction eigenvectors unsupervised" },
  { label: "t-SNE", group: "Demo", href: "/visualize/tsne/", kw: "t-sne tsne umap dimensionality reduction visualization perplexity kl divergence student-t neighbor embedding high-dimensional manifold van der maaten hinton" },
  { label: "Isomap", group: "Demo", href: "/visualize/isomap/", kw: "isomap manifold learning geodesic distance nonlinear dimensionality reduction mds multidimensional scaling swiss roll knn graph shortest path tenenbaum lle unroll" },
  { label: "Gaussian Mixtures & EM", group: "Demo", href: "/visualize/gmm/", kw: "gmm expectation maximization soft clustering unsupervised mixture" },
  { label: "Spectral Clustering", group: "Demo", href: "/visualize/spectral-clustering/", kw: "spectral clustering graph laplacian eigenvectors normalized cut fiedler vector affinity similarity rings moons non-convex connectivity ng jordan weiss manifold" },
  { label: "Label Propagation", group: "Demo", href: "/visualize/label-propagation/", kw: "label propagation spreading semi-supervised learning graph transductive few labels unlabeled rbf affinity manifold cluster assumption pseudo-label pagerank" },
  { label: "ROC, PR & Thresholds", group: "Demo", href: "/visualize/roc/", kw: "roc auc precision recall confusion matrix evaluation threshold theory" },
  { label: "MDP Value Iteration", group: "Demo", href: "/visualize/value-iteration/", kw: "mdp bellman dynamic programming policy gridworld reinforcement rl" },
  { label: "Markov Text Generator", group: "Demo", href: "/visualize/markov/", kw: "ngram language model nlp text" },
  { label: "Decoding Strategies", group: "Demo", href: "/visualize/decoding/", kw: "temperature top-k top-p nucleus sampling llm nlp" },
  { label: "Activation Functions", group: "Demo", href: "/visualize/activations/", kw: "relu sigmoid tanh gelu gradient neural" },
  { label: "Batch Normalization", group: "Demo", href: "/visualize/batch-norm/", kw: "batch normalization batchnorm layernorm rmsnorm internal covariate shift activation distribution variance saturation exploding ioffe szegedy gamma beta deep training stability" },
  { label: "Weight Initialization", group: "Demo", href: "/visualize/weight-init/", kw: "weight initialization xavier glorot he kaiming init variance fan-in fan-out exploding vanishing activation deep network scale gain relu tanh" },
  { label: "Contrastive Learning", group: "Demo", href: "/visualize/contrastive-learning/", kw: "contrastive learning simclr moco clip nt-xent infonce self-supervised representation embedding alignment uniformity positive negative temperature augmentation byol" },
  { label: "Central Limit Theorem", group: "Demo", href: "/visualize/clt/", kw: "probability gaussian sampling statistics" },
  { label: "Fourier Series", group: "Demo", href: "/visualize/fourier/", kw: "signal epicycles sine wave dsp" },
  { label: "ICA (Cocktail Party)", group: "Demo", href: "/visualize/ica/", kw: "ica independent component analysis blind source separation cocktail party fastica unmixing non-gaussian whitening eeg signal demixing kurtosis negentropy" },
  { label: "Attention Heatmap", group: "Demo", href: "/visualize/attention/", kw: "transformer softmax qkv" },
  { label: "Multi-Head Attention", group: "Demo", href: "/visualize/multi-head-attention/", kw: "transformer heads parallel attention qkv specialize" },
  { label: "Positional Encoding", group: "Demo", href: "/visualize/positional-encoding/", kw: "rope sinusoidal" },
  { label: "Tokenizer Lab", group: "Demo", href: "/visualize/tokenizer/", kw: "bpe subword nlp" },
  { label: "Q-Learning Gridworld", group: "Demo", href: "/visualize/gridworld-rl/", kw: "reinforcement rl" },
  { label: "Multi-Armed Bandit", group: "Demo", href: "/visualize/bandit/", kw: "explore exploit ucb thompson rl" },
  { label: "The Perceptron", group: "Demo", href: "/visualize/perceptron/", kw: "perceptron rosenblatt linear classifier online learning mistake bound convergence theorem weight update decision boundary single neuron threshold xor minsky" },
  { label: "Neural Playground", group: "Demo", href: "/visualize/neural-playground/", kw: "mlp backprop boundary" },
  { label: "Convolution Lab", group: "Demo", href: "/visualize/convolution/", kw: "cnn kernel filter vision" },
  { label: "Canny Edge Detection", group: "Demo", href: "/visualize/edge-detection/", kw: "canny sobel gradient edges vision hysteresis" },
  { label: "Hough Transform", group: "Demo", href: "/visualize/hough-transform/", kw: "hough line detection accumulator voting vision ransac" },
  { label: "Harris Corner Detector", group: "Demo", href: "/visualize/harris-corners/", kw: "harris corner keypoint structure tensor feature vision slam tracking" },
  { label: "Optical Flow (Lucas-Kanade)", group: "Demo", href: "/visualize/optical-flow/", kw: "optical flow lucas kanade motion aperture tracking vision brightness constancy" },
  { label: "Histogram of Oriented Gradients", group: "Demo", href: "/visualize/hog/", kw: "hog histogram oriented gradients descriptor feature pedestrian detection vision svm" },
  { label: "Data Augmentation", group: "Demo", href: "/visualize/image-augmentation/", kw: "data augmentation flip rotate crop color jitter cutout regularization vision invariance training mixup" },
  { label: "Watershed Segmentation", group: "Demo", href: "/visualize/watershed/", kw: "watershed segmentation distance transform markers flooding regions touching objects vision instance" },
  { label: "IoU & Non-Max Suppression", group: "Demo", href: "/visualize/nms/", kw: "nms iou object detection bounding box vision map" },
  { label: "Diffusion Sampler", group: "Demo", href: "/visualize/diffusion/", kw: "ddpm generative denoise" },
  { label: "Variational Autoencoder", group: "Demo", href: "/visualize/vae/", kw: "vae latent reparameterization kl generative encoder decoder" },
  { label: "Embedding Atlas", group: "Demo", href: "/visualize/embeddings/", kw: "word vectors analogy" },
  { label: "word2vec (Skip-gram)", group: "Demo", href: "/visualize/word2vec/", kw: "word2vec skip-gram cbow negative sampling glove word embeddings distributional semantics co-occurrence mikolov softmax context nlp vectors analogy" },
  { label: "Vector Search", group: "Demo", href: "/visualize/vector-search/", kw: "nearest neighbor retrieval rag semantic search cosine embedding knn" },
  { label: "Time-Series Forecasting", group: "Demo", href: "/visualize/forecasting/", kw: "forecast exponential smoothing holt winters seasonality arima time series" },
  { label: "Learning-Rate Schedules", group: "Demo", href: "/visualize/lr-schedule/", kw: "warmup cosine decay training optimization sgd schedule" },
  { label: "Gradient Clipping", group: "Demo", href: "/visualize/gradient-clipping/", kw: "gradient clipping exploding gradients clip by norm value cliff pascanu rnn lstm transformer training stability global norm threshold" },
  { label: "LoRA - Low-Rank Adaptation", group: "Demo", href: "/visualize/lora/", kw: "lora low rank fine-tuning svd peft adapter parameter efficient" },
  { label: "Neural Scaling Laws", group: "Demo", href: "/visualize/scaling-laws/", kw: "scaling laws chinchilla compute optimal power law llm training" },

  { label: "Self-Attention (full lesson)", group: "Lesson", href: "/learn/transformers/self-attention/", kw: "attention notebook" },

  { label: "Mathematical & Programming Foundations", group: "ML Module", href: "/learn/foundations/", kw: "numpy math 01" },
  { label: "Supervised Learning", group: "ML Module", href: "/learn/supervised-learning/", kw: "regression trees 02" },
  { label: "Unsupervised & Statistical Learning", group: "ML Module", href: "/learn/unsupervised-learning/", kw: "clustering pca 03" },
  { label: "ML Theory & Evaluation", group: "ML Module", href: "/learn/ml-theory/", kw: "metrics cross validation 04" },
  { label: "Neural Network Foundations", group: "ML Module", href: "/learn/neural-nets/", kw: "mlp backprop 05" },
  { label: "Convolutional Neural Networks", group: "ML Module", href: "/learn/cnn/", kw: "cnn vision resnet 06" },
  { label: "Recurrent Networks & NLP", group: "ML Module", href: "/learn/rnn-nlp/", kw: "rnn lstm 07" },
  { label: "Transformers", group: "ML Module", href: "/learn/transformers/", kw: "attention gpt bert 08" },
  { label: "Advanced Computer Vision", group: "ML Module", href: "/learn/advanced-cv/", kw: "detection segmentation vit 09" },
  { label: "Advanced NLP", group: "ML Module", href: "/learn/advanced-nlp/", kw: "fine-tuning lora 10" },
  { label: "Generative Deep Learning", group: "ML Module", href: "/learn/generative/", kw: "vae gan diffusion 11" },
  { label: "Multimodal Learning", group: "ML Module", href: "/learn/multimodal/", kw: "clip vqa 12" },
  { label: "Fine-Tuning & Alignment", group: "ML Module", href: "/learn/fine-tuning/", kw: "rlhf dpo lora 13" },
  { label: "Reinforcement Learning", group: "ML Module", href: "/learn/reinforcement-learning/", kw: "dqn ppo q-learning 14" },
  { label: "Advanced PyTorch Internals", group: "ML Module", href: "/learn/pytorch-internals/", kw: "autograd jit 15" },
  { label: "Training Optimization & Distributed", group: "ML Module", href: "/learn/training-systems/", kw: "ddp fsdp amp 16" },
  { label: "LLMs: Systems & Scaling", group: "ML Module", href: "/learn/llm-systems/", kw: "quantization moe kv cache 17" },
  { label: "RAG & Agentic AI", group: "ML Module", href: "/learn/rag-agents/", kw: "retrieval agents react 18" },
  { label: "ML Applications", group: "ML Module", href: "/learn/ml-applications/", kw: "time series gnn 19" },
  { label: "MLOps & Production", group: "ML Module", href: "/learn/mlops/", kw: "deploy docker mlflow 20" },

  { label: "HF: Transformer Fundamentals", group: "HF Section", href: "/learn/huggingface/fundamentals/", kw: "tokenization ecosystem" },
  { label: "HF: NLP", group: "HF Section", href: "/learn/huggingface/nlp/", kw: "generation classification" },
  { label: "HF: Computer Vision", group: "HF Section", href: "/learn/huggingface/computer-vision/", kw: "vit detection ocr" },
  { label: "HF: Audio", group: "HF Section", href: "/learn/huggingface/audio/", kw: "whisper speech" },
  { label: "HF: Multimodal", group: "HF Section", href: "/learn/huggingface/multimodal/", kw: "blip diffusion captioning" },
  { label: "HF: Best Practices", group: "HF Section", href: "/learn/huggingface/best-practices/", kw: "quantization gradio trainer" },
  { label: "HF: Agentic Workflows", group: "HF Section", href: "/learn/huggingface/agentic/", kw: "mcp rag agents" },
  { label: "Bayes Updater", group: "Demo", href: "/visualize/bayes/", kw: "bayes beta bernoulli prior posterior thompson sampling conjugate foundations probability" },
  { label: "MCMC (Metropolis)", group: "Demo", href: "/visualize/mcmc/", kw: "mcmc markov chain monte carlo metropolis hastings sampling posterior bayesian inference proposal acceptance burn-in mixing autocorrelation stan pymc hamiltonian nuts" },
  { label: "Importance Sampling", group: "Demo", href: "/visualize/importance-sampling/", kw: "importance sampling monte carlo rare event tail probability proposal weights effective sample size ess variance reduction off-policy particle filter reweighting" },
  { label: "Reservoir Sampling", group: "Demo", href: "/visualize/reservoir-sampling/", kw: "reservoir sampling algorithm r vitter streaming online one pass uniform random sample unbounded stream big data constant memory k/n" },
  { label: "Count-Min Sketch", group: "Demo", href: "/visualize/count-min-sketch/", kw: "count-min sketch frequency estimation streaming heavy hitters hashing probabilistic data structure sublinear memory top-k bloom hyperloglog overestimate cormode" },
  { label: "Bloom Filter", group: "Demo", href: "/visualize/bloom-filter/", kw: "bloom filter set membership probabilistic data structure bit array hashing false positive false negative cache database streaming cuckoo counting space efficient" },
  { label: "Kalman Filter", group: "Demo", href: "/visualize/kalman-filter/", kw: "kalman filter state estimation predict update sensor fusion tracking covariance gain process noise measurement recursive bayes gaussian denoise" },
  { label: "HMM & Viterbi", group: "Demo", href: "/visualize/hmm-viterbi/", kw: "hmm hidden markov model viterbi algorithm dynamic programming trellis decode sequence regime pos tagging speech forward backward baum welch dna" },
  { label: "Optimizer Shootout", group: "Demo", href: "/visualize/optimizers/", kw: "sgd momentum rmsprop adam optimizer training loss landscape" },
  { label: "GAN 2-D", group: "Demo", href: "/visualize/gan/", kw: "gan generative adversarial network generator discriminator duel" },
  { label: "Backprop Graph", group: "Demo", href: "/visualize/backprop/", kw: "backprop backpropagation chain rule computation graph gradient" },
  { label: "MCTS Tree Search", group: "Demo", href: "/visualize/mcts/", kw: "mcts monte carlo tree search ucb ucb1 alphago rollout backup planning" },
  { label: "Simulated Annealing", group: "Demo", href: "/visualize/simulated-annealing/", kw: "simulated annealing tsp traveling salesman 2-opt metropolis local search optimization" },
  { label: "Concept Graph (hub)", group: "Page", href: "/concepts/", kw: "concepts graph index hub taxonomy map of ml ideas connections" },
  { label: "Weekly Insights", group: "Page", href: "/weekly-insights/", kw: "weekly insights digest news ml field notes practitioner rl quantization agents inference" },
  { label: "Linear & Logistic Regression", group: "Demo", href: "/visualize/regression/", kw: "linear logistic regression least squares ols sigmoid bce supervised classical" },
  { label: "LSTM Gates", group: "Demo", href: "/visualize/rnn-gates/", kw: "lstm rnn gru gates forget input output cell recurrent memory" },
  { label: "Beam Search Tree", group: "Demo", href: "/visualize/beam-search/", kw: "beam search greedy sampling decoding language model tree frontier" },
  { label: "KV Cache", group: "Demo", href: "/visualize/kv-cache/", kw: "kv cache key value autoregressive transformer inference attention prefix" },
  { label: "GNN Message Passing", group: "Demo", href: "/visualize/gnn/", kw: "gnn graph neural network gcn message passing over-smoothing graphsage gat" },
  { label: "RoPE Explorer", group: "Demo", href: "/visualize/rope/", kw: "rope rotary position embedding transformer attention long context llama" },
  { label: "DBSCAN", group: "Demo", href: "/visualize/dbscan/", kw: "dbscan density clustering eps min_pts moons rings noise unsupervised" },
  { label: "Hierarchical Clustering", group: "Demo", href: "/visualize/hierarchical-clustering/", kw: "hierarchical agglomerative clustering dendrogram linkage single complete average ward cut tree merge unsupervised cophenetic" },
  { label: "Kernel Density Estimation", group: "Demo", href: "/visualize/kernel-density/", kw: "kde kernel density estimation bandwidth nonparametric histogram smoothing silverman gaussian epanechnikov bias variance distribution" },
  { label: "Policy Gradient — REINFORCE", group: "Demo", href: "/visualize/policy-gradient/", kw: "policy gradient reinforce ppo grpo rlhf continuous action gaussian rl baseline" },
  { label: "Actor-Critic", group: "Demo", href: "/visualize/actor-critic/", kw: "actor critic a2c a3c ppo td error value function advantage baseline gridworld rl" },
  { label: "Deep Q-Network (DQN)", group: "Demo", href: "/visualize/dqn/", kw: "dqn deep q network replay buffer target network atari mnih value rl bootstrapping" },
  { label: "Reward Model (RLHF)", group: "Demo", href: "/visualize/reward-model/", kw: "reward model rlhf bradley terry preference pairs dpo ppo human feedback alignment reward hacking" },
  { label: "DPO vs RLHF", group: "Demo", href: "/visualize/dpo/", kw: "dpo direct preference optimization rlhf ppo kl reference policy alignment ipo kto orpo bradley terry" },
  { label: "RAG Chunking", group: "Demo", href: "/visualize/rag-chunking/", kw: "rag chunking retrieval augmented generation chunk size overlap tf-idf cosine context window vector search recall" },
  { label: "Self-Consistency", group: "Demo", href: "/visualize/self-consistency/", kw: "self consistency sample vote majority chain of thought reasoning best-of-n condorcet test time compute reliability llm ops" },
  { label: "Constrained Decoding", group: "Demo", href: "/visualize/constrained-decoding/", kw: "constrained decoding json mode function calling structured output grammar regex fsm outlines guidance xgrammar tool use mask" },
  { label: "Guardrails", group: "Demo", href: "/visualize/guardrails/", kw: "guardrails pii redaction prompt injection jailbreak toxicity moderation llama guard nemo safety pipeline input output filter llm ops" },
  { label: "Lost in the Middle", group: "Demo", href: "/visualize/lost-in-the-middle/", kw: "lost in the middle context window position bias long context reranking rag ordering recency primacy attention liu" },
  { label: "HyDE — Hypothetical Embeddings", group: "Demo", href: "/visualize/hyde/", kw: "hyde hypothetical document embeddings retrieval query transformation rag dense asymmetry gao multi-query rag-fusion" },
  { label: "Self-Correction (Reflection)", group: "Demo", href: "/visualize/reflection/", kw: "reflection reflexion self correction critique revise verifier critic agent loop self-refine iterate test-time compute" },
  { label: "ReAct — Reason + Act", group: "Demo", href: "/visualize/react-agent/", kw: "react agent reason act tool use function calling thought action observation langchain yao tool routing reasoning trace" },
  { label: "Model Calibration", group: "Demo", href: "/visualize/calibration/", kw: "calibration reliability diagram ece expected calibration error temperature scaling overconfidence guo trustworthy confidence brier platt" },
  { label: "Feature Attribution (SHAP)", group: "Demo", href: "/visualize/shap/", kw: "shap shapley values feature attribution explainability xai interpretability waterfall lundberg lime credit decision" },
  { label: "Conformal Prediction", group: "Demo", href: "/visualize/conformal/", kw: "conformal prediction uncertainty coverage guarantee prediction sets distribution-free quantile angelopoulos vovk aps trustworthy" },
  { label: "Conformal Regression", group: "Demo", href: "/visualize/conformal-regression/", kw: "conformal regression prediction interval coverage guarantee quantile cqr conformalized adaptive heteroscedastic distribution-free uncertainty band trustworthy" },
  { label: "Active Learning", group: "Demo", href: "/visualize/active-learning/", kw: "active learning uncertainty sampling query labeling data-centric annotation human-in-the-loop margin entropy pool" },
  { label: "Coresets", group: "Demo", href: "/visualize/coreset/", kw: "coreset coresets data selection importance sampling sensitivity lightweight weighted subset k-means clustering scalable data-centric dataset pruning summarization sketch" },
  { label: "Dataset Distillation", group: "Demo", href: "/visualize/dataset-distillation/", kw: "dataset distillation condensation synthetic data kip kernel inducing points gradient matching data-centric compress training set continual learning meta-learning" },
  { label: "Fairness & Group Metrics", group: "Demo", href: "/visualize/fairness/", kw: "fairness bias demographic parity equal opportunity equalized odds group threshold impossibility responsible ml disparate impact" },
  { label: "N-Queens (Backtracking)", group: "Demo", href: "/visualize/n-queens/", kw: "n-queens backtracking constraint satisfaction csp forward checking search ac-3 chessboard pruning depth-first" },
  { label: "Graph Coloring (AC-3)", group: "Demo", href: "/visualize/graph-coloring/", kw: "graph coloring map csp ac-3 arc consistency backtracking mrv australia register allocation scheduling propagation" },
  { label: "Sudoku Solver", group: "Demo", href: "/visualize/sudoku/", kw: "sudoku solver backtracking constraint propagation naked singles csp mrv puzzle 9x9 search" },
  { label: "Quantization", group: "Demo", href: "/visualize/quantization/", kw: "quantization int8 int4 weights efficiency compression gptq awq qlora nf4 outliers post-training bits scale model size" },
  { label: "Pruning & Sparsity", group: "Demo", href: "/visualize/pruning/", kw: "pruning sparsity magnitude lottery ticket compression structured unstructured weights accuracy efficiency model size" },
  { label: "Knowledge Distillation", group: "Demo", href: "/visualize/distillation/", kw: "knowledge distillation teacher student soft labels dark knowledge temperature hinton distilbert compression efficiency" },
  { label: "Mixture of Experts (MoE)", group: "Demo", href: "/visualize/moe/", kw: "mixture of experts moe routing gating top-k sparse switch transformer mixtral conditional computation load balancing experts" },
  { label: "Simpson's Paradox", group: "Demo", href: "/visualize/simpsons-paradox/", kw: "simpsons paradox confounding causal inference correlation causation subgroup aggregation berkeley reversal statistics" },
  { label: "Knapsack (DP)", group: "Demo", href: "/visualize/knapsack/", kw: "knapsack dynamic programming dp table memoization optimal substructure backtrack items weight value np-hard pseudo-polynomial" },
  { label: "Branch & Bound", group: "Demo", href: "/visualize/branch-and-bound/", kw: "branch and bound pruning optimistic upper bound lp relaxation knapsack integer programming exact search decision tree incumbent alpha-beta combinatorial optimization" },
  { label: "BFS vs DFS vs A*", group: "Demo", href: "/visualize/bfs-dfs-astar/", kw: "bfs dfs a-star astar search maze graph uninformed informed heuristic dijkstra frontier shortest path optimal" },
  { label: "Edit Distance", group: "Demo", href: "/visualize/edit-distance/", kw: "edit distance levenshtein dynamic programming string alignment diff spellcheck needleman wunsch sequence dp table" },
  { label: "Mixed Precision", group: "Demo", href: "/visualize/mixed-precision/", kw: "mixed precision fp16 bf16 fp32 loss scaling underflow overflow dynamic range amp training efficiency tensor core fp8" },
  { label: "Speculative Decoding", group: "Demo", href: "/visualize/speculative-decoding/", kw: "speculative decoding draft target verify accept reject lookahead llm inference latency leviathan medusa eagle lossless speedup" },
  { label: "PagedAttention", group: "Demo", href: "/visualize/paged-attention/", kw: "pagedattention vllm kv cache paging memory fragmentation blocks throughput serving inference continuous batching block table" },
  { label: "Label Noise", group: "Demo", href: "/visualize/label-noise/", kw: "label noise mislabeled memorization robust loss early stopping data-centric flipped labels generalization trustworthy" },
  { label: "MC Dropout", group: "Demo", href: "/visualize/mc-dropout/", kw: "mc dropout monte carlo uncertainty bayesian epistemic gal ghahramani ensemble predictive variance out-of-distribution trustworthy" },
  { label: "do() & Backdoor Adjustment", group: "Demo", href: "/visualize/do-intervention/", kw: "do operator causal inference backdoor adjustment confounder intervention pearl correlation causation randomized control" },
  { label: "Instrumental Variables", group: "Demo", href: "/visualize/instrumental-variables/", kw: "instrumental variables iv 2sls two stage least squares causal effect confounder exclusion relevance weak instrument wald estimator late mendelian randomization econometrics" },
  { label: "Multi-Query & RAG-Fusion", group: "Demo", href: "/visualize/multi-query/", kw: "multi-query rag fusion reciprocal rank fusion rrf query expansion retrieval hybrid search recall variants" },
  { label: "RAG Reranker", group: "Demo", href: "/visualize/rag-reranker/", kw: "reranker cross-encoder bi-encoder two-stage retrieval ndcg precision recall rag colbert cohere rerank shortlist" },
  { label: "Agent Tool Router", group: "Demo", href: "/visualize/agent-router/", kw: "agent router tool routing dispatch function calling intent classifier fallback confidence plan execute model routing skill" },
  { label: "Attention Rollout", group: "Demo", href: "/visualize/attention-rollout/", kw: "attention rollout interpretability transformer abnar zuidema attribution attention flow vit bert explainability residual" },
  { label: "Saliency Maps", group: "Demo", href: "/visualize/saliency/", kw: "saliency map input gradient explainability xai grad-cam integrated gradients smoothgrad attribution pixels vision interpretability" },
  { label: "Data Drift Detection", group: "Demo", href: "/visualize/drift-detection/", kw: "data drift covariate shift psi population stability index monitoring mlops kl divergence retrain alarm concept drift" },
];

// Lazy: derive a palette entry per concept from window.CONCEPTS_INDEX if loaded
// on the current page. Concept pages aren't loaded on most pages, so this stays
// empty until you're on a page that includes concepts-index.js.
function __conceptEntries() {
  const idx = (typeof window !== "undefined") ? window.CONCEPTS_INDEX : null;
  if (!idx) return [];
  return Object.keys(idx).map(id => {
    const c = idx[id];
    return {
      label: c.name, group: "Concept", href: `/concepts/${id}/`,
      kw: `${id} ${c.area || ""} ${c.summary || ""}`.toLowerCase(),
    };
  });
}

function paletteFilter(q) {
  const all = DM_NAV_INDEX.concat(__conceptEntries());
  const s = q.trim().toLowerCase();
  if (!s) return all;
  const scored = [];
  for (const it of all) {
    const hay = (it.label + " " + it.group + " " + (it.kw || "")).toLowerCase();
    const i = hay.indexOf(s);
    if (i >= 0) scored.push({ it, score: (it.label.toLowerCase().startsWith(s) ? 0 : 1000) + i });
  }
  scored.sort((a, b) => a.score - b.score);
  return scored.map(x => x.it);
}

// ─── Command palette (⌘K / Ctrl-K) ────────────────────────────
function CommandPalette({ open, setOpen }) {
  const [q, setQ] = __useState("");
  const [sel, setSel] = __useState(0);
  const inputRef = __useRef(null);

  __useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); setOpen(o => !o); }
      else if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  __useEffect(() => {
    if (open) { setQ(""); setSel(0); const t = setTimeout(() => inputRef.current && inputRef.current.focus(), 30); return () => clearTimeout(t); }
  }, [open]);

  const results = paletteFilter(q);
  __useEffect(() => { setSel(0); }, [q]);
  if (!open) return null;

  const go = (it) => { if (it) { setOpen(false); window.location.href = it.href; } };
  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel(s => Math.min(results.length - 1, s + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel(s => Math.max(0, s - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); go(results[sel]); }
  };

  return (
    <div role="dialog" aria-label="Command palette" onClick={() => setOpen(false)}
      style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(5,8,22,0.7)", backdropFilter: "blur(6px)", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "14vh 20px 20px" }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 580, background: "var(--bg-card)", border: "1px solid var(--border-strong)",
        borderRadius: 10, boxShadow: "0 24px 80px rgba(0,0,0,0.5)", overflow: "hidden", display: "flex", flexDirection: "column",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
          <span className="t-mono-s" style={{ color: "var(--blue-lt)" }}>&gt;</span>
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKey}
            placeholder="Jump to a page, demo, or module…" aria-label="Search"
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--white)", fontFamily: "var(--f-body)", fontSize: 16 }} />
          <span className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>ESC</span>
        </div>
        <div style={{ maxHeight: "52vh", overflowY: "auto", padding: 6 }}>
          {results.length === 0 && <div className="t-body" style={{ color: "var(--muted)", padding: "20px 14px", fontSize: 14 }}>No matches.</div>}
          {results.map((it, i) => (
            <a key={it.href} href={it.href}
              ref={i === sel ? (el => el && el.scrollIntoView({ block: "nearest" })) : null}
              onClick={(e) => { e.preventDefault(); go(it); }}
              onMouseEnter={() => setSel(i)}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
                padding: "11px 14px", borderRadius: 6, textDecoration: "none",
                background: i === sel ? "rgba(59,130,246,0.14)" : "transparent",
                border: `1px solid ${i === sel ? "var(--border-strong)" : "transparent"}`,
              }}>
              <span style={{ color: "var(--white)", fontSize: 15 }}>{it.label}</span>
              <span className="t-mono-s" style={{ color: "var(--muted)", fontSize: 10, whiteSpace: "nowrap" }}>{it.group}</span>
            </a>
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, padding: "10px 16px", borderTop: "1px solid var(--border)" }}>
          <span className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>↑↓ NAVIGATE</span>
          <span className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10 }}>↵ OPEN</span>
          <span className="t-mono-s" style={{ color: "var(--dim)", fontSize: 10, marginLeft: "auto" }}>{results.length} RESULTS</span>
        </div>
      </div>
    </div>
  );
}

// ─── Section + Container ──────────────────────────────────────
function Section({ id, children, padded = true, style }) {
  return (
    <section id={id} data-screen-label={id}
      style={{
        position: "relative", width: "100%",
        padding: padded ? "76px 0" : 0, ...style,
      }}>
      {children}
    </section>
  );
}

function Container({ children, style }) {
  const mobile = useIsMobile();
  return (
    <div style={{
      maxWidth: 1280, margin: "0 auto", padding: mobile ? "0 20px" : "0 48px",
      position: "relative", ...style,
    }}>
      {children}
    </div>
  );
}

// ─── Nav icon button + glyphs ─────────────────────────────────
function NavIcon({ href, label, children, copy }) {
  const sharedStyle = {
    width: 32, height: 32, display: "inline-flex",
    alignItems: "center", justifyContent: "center",
    border: "1px solid var(--border)", borderRadius: 4,
    color: "var(--muted)", textDecoration: "none", background: "transparent", cursor: "pointer",
    transition: "color .15s, border-color .15s, background .15s, box-shadow .15s",
  };
  const onEnter = e => { e.currentTarget.style.color = "var(--blue-br)"; e.currentTarget.style.borderColor = "var(--blue-lt)"; e.currentTarget.style.background = "rgba(59,130,246,0.08)"; e.currentTarget.style.boxShadow = "0 0 16px rgba(59,130,246,0.22)"; };
  const onLeave = e => { e.currentTarget.style.color = "var(--muted)"; e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "transparent"; e.currentTarget.style.boxShadow = "none"; };
  if (copy) return <button type="button" aria-label={label} title="Copy email" onClick={() => window.__dmCopyEmail()} style={sharedStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>{children}</button>;
  return <a href={href} aria-label={label} target={href.startsWith("mailto") ? "_self" : "_blank"} rel="noopener" style={sharedStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>{children}</a>;
}

const IconMail = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="3" width="13" height="10" rx="1" stroke="currentColor" strokeWidth="1.2" />
    <path d="M2 4 L8 9 L14 4" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
  </svg>
);
const IconGit = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <circle cx="4" cy="3.5" r="1.6" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="4" cy="12.5" r="1.6" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="12" cy="8" r="1.6" stroke="currentColor" strokeWidth="1.2" />
    <path d="M4 5 L4 11" stroke="currentColor" strokeWidth="1.2" />
    <path d="M4 8 Q 4 8, 10.4 8" stroke="currentColor" strokeWidth="1.2" fill="none" />
  </svg>
);
const IconProfile = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="5.5" r="2.4" stroke="currentColor" strokeWidth="1.2" />
    <path d="M2.5 13 Q 8 8, 13.5 13" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
  </svg>
);

// ─── Mono label (also exported for page apps) ─────────────────
function MonoLabel({ children, color, style }) {
  return (
    <span className="t-mono-s"
      style={{ color: color || "var(--blue-lt)", ...style }}>
      {children}
    </span>
  );
}

// ─── Top nav ──────────────────────────────────────────────────
// Links know about cross-page anchors. From subpages, in-page anchors on
// the landing (#about, #services, #work) become "../#about" etc.
function TopNav() {
  const [scrolled, setScrolled] = __useState(false);
  const [open, setOpen] = __useState(false);
  const [cmdOpen, setCmdOpen] = __useState(false);
  const mobile = useIsMobile();
  const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform || navigator.userAgent || "");
  __useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  __useEffect(() => { if (!mobile) setOpen(false); }, [mobile]);

  const homeHref = __DM_BASE || "./";
  const homeAnchor = (id) => `${__DM_BASE}#${id}`;

  const links = [
    { key: "home",      label: "Main",       href: homeHref },
    { key: "weekly-insights", label: "Insights", href: `${__DM_BASE}weekly-insights/` },
    { key: "research",  label: "Research",   href: `${__DM_BASE}research/` },
    { key: "learn",     label: "Learn",      href: `${__DM_BASE}learn/` },
    { key: "visualize", label: "Visualize",  href: `${__DM_BASE}visualize/` },
    { key: "play",      label: "Play",       href: `${__DM_BASE}play/` },
    { key: "cases",     label: "Build",      href: `${__DM_BASE}cases/` },
    { key: "about",     label: "About",      href: `${__DM_BASE}about/` },
  ];

  const navLink = (l, big) => {
    const active = __DM_PAGE === l.key;
    return (
      <a key={l.key} href={l.href} className="t-mono-s" onClick={() => setOpen(false)}
        style={{
          color: active ? "var(--blue-br)" : (big ? "var(--white)" : "var(--muted)"),
          padding: big ? "12px 4px" : "8px 12px", borderRadius: 4,
          textDecoration: "none", letterSpacing: "0.12em",
          fontSize: big ? 18 : undefined,
          background: active ? "rgba(59,130,246,0.08)" : "transparent",
          transition: "color .15s, background .15s",
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.color = "var(--blue-br)"; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.color = big ? "var(--white)" : "var(--muted)"; }}>
        {l.label}
      </a>
    );
  };
  const icons = (
    <>
      <NavIcon copy label="Copy email address"><IconMail /></NavIcon>
      <NavIcon href="https://github.com/derrickmo" label="GitHub"><IconGit /></NavIcon>
      <NavIcon href="https://linkedin.com/in/derrickmo" label="LinkedIn"><IconProfile /></NavIcon>
    </>
  );

  return (
    <>
      <a href="#top" className="dm-skip">Skip to content</a>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        backdropFilter: scrolled ? "blur(12px)" : "none",
        background: scrolled ? "rgba(5, 8, 22, 0.78)" : "transparent",
        borderBottom: scrolled ? "1px solid rgba(96,165,250,0.16)" : "1px solid transparent",
        transition: "background .25s, border-color .25s, backdrop-filter .25s",
      }}>
        <Container style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: mobile ? "10px 20px" : "14px 48px", gap: 18 }}>
          <a href={homeHref} aria-label="Home" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
            <__Monogram variant="bracket" size={mobile ? 64 : 84} mode="dark" />
          </a>
          {mobile ? (
            <button aria-label="Menu" aria-expanded={open} onClick={() => setOpen(o => !o)}
              style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", width: 40, height: 36, display: "flex", flexDirection: "column", gap: 4, justifyContent: "center", alignItems: "center" }}>
              {[0, 1, 2].map(i => <span key={i} style={{ width: 18, height: 2, background: "var(--blue-lt)", display: "block" }} />)}
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {links.map(l => navLink(l, false))}
              <button onClick={() => setCmdOpen(true)} aria-label="Search" className="t-mono-s"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", marginLeft: 4,
                  border: "1px solid var(--border)", borderRadius: 4, background: "transparent", color: "var(--muted)", cursor: "pointer", letterSpacing: "0.08em" }}
                onMouseEnter={e => { e.currentTarget.style.color = "var(--blue-br)"; e.currentTarget.style.borderColor = "var(--blue-lt)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "var(--muted)"; e.currentTarget.style.borderColor = "var(--border)"; }}>
                <span aria-hidden="true" style={{ fontSize: 12 }}>⌕</span> SEARCH
                <span style={{ opacity: 0.5, fontSize: 10, marginLeft: 2 }}>{isMac ? "⌘K" : "Ctrl K"}</span>
              </button>
              <div style={{ width: 1, height: 18, background: "var(--border)", margin: "0 8px" }} />
              {icons}
            </div>
          )}
        </Container>
      </nav>
      {mobile && open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(5,8,22,0.97)", backdropFilter: "blur(8px)", display: "flex", flexDirection: "column", padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button aria-label="Close menu" onClick={() => setOpen(false)}
              style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 6, color: "var(--white)", fontSize: 22, lineHeight: 1, width: 40, height: 40, cursor: "pointer" }}>×</button>
          </div>
          <button onClick={() => { setOpen(false); setCmdOpen(true); }} className="t-mono-s"
            style={{ marginTop: 24, padding: "12px 16px", textAlign: "left", border: "1px solid var(--border)", borderRadius: 6, background: "rgba(13,24,52,0.5)", color: "var(--muted)", cursor: "pointer", width: "100%" }}>
            SEARCH EVERYTHING →
          </button>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 18, alignItems: "flex-start" }}>
            {links.map(l => navLink(l, true))}
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 36 }}>{icons}</div>
        </div>
      )}
      <CommandPalette open={cmdOpen} setOpen={setCmdOpen} />
    </>
  );
}

// ─── Construction badge ───────────────────────────────────────
function ConstructionBadge({ children = "UNDER CONSTRUCTION" }) {
  return (
    <span className="t-mono-s"
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "5px 12px",
        border: "1px dashed var(--violet-lt)",
        borderRadius: 999,
        color: "var(--violet-lt)",
        background: "rgba(168, 85, 247, 0.06)",
      }}>
      <span style={{
        display: "inline-block", width: 6, height: 6, borderRadius: 999,
        background: "var(--violet-lt)",
        boxShadow: "0 0 8px var(--violet-lt)",
        animation: "dm-pulse 1.6s ease-in-out infinite",
      }} />
      {children}
    </span>
  );
}

// ─── Footer ───────────────────────────────────────────────────
function Footer() {
  const homeHref = __DM_BASE || "./";
  const mobile = useIsMobile();
  return (
    <Section id="contact" style={{ paddingBottom: 80 }}>
      <Container>
        <div style={{ position: "relative", height: 1, background: "var(--border)", marginBottom: 60 }}>
          <div style={{
            position: "absolute", top: -3, left: "50%", transform: "translateX(-50%)",
            width: 7, height: 7, border: "1px solid var(--blue-lt)", borderRadius: 999,
            background: "var(--bg-deep)",
          }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: mobile ? 36 : 56, alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <MonoLabel>// END_OF_TRANSMISSION</MonoLabel>
            <h2 style={{
              fontFamily: "var(--f-display)", fontWeight: 700,
              fontSize: "clamp(40px, 5vw, 64px)", letterSpacing: "-0.025em",
              color: "var(--white)", margin: 0, lineHeight: 1.0,
            }}>
              Let's build<br />something.
            </h2>
            <div className="t-body" style={{ color: "var(--muted)", maxWidth: 460, fontSize: 16 }}>
              Always glad to talk shop — research collaborations, teaching, or a hard machine-learning problem worth chasing. If you've got a challenging one, I'd love to hear it.
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "MAIL", value: "investdmo@gmail.com", copy: true, tone: "blue" },
              { label: "GIT",  value: "github.com/derrickmo", href: "https://github.com/derrickmo", tone: "violet" },
              { label: "PROF", value: "linkedin.com/in/derrickmo", href: "https://linkedin.com/in/derrickmo", tone: "blue" },
            ].map(t => {
              const accent = t.tone === "violet" ? "var(--violet-lt)" : "var(--blue-lt)";
              const border = t.tone === "violet" ? "var(--border-violet)" : "var(--border)";
              const Tag = t.copy ? "button" : "a";
              const tagProps = t.copy ? { type: "button", onClick: () => window.__dmCopyEmail(), title: "Copy email address" } : { href: t.href, target: "_blank", rel: "noopener" };
              return (
                <Tag key={t.label} {...tagProps}
                  style={{
                    border: `1px solid ${border}`, borderRadius: 4,
                    background: "rgba(13, 24, 52, 0.6)",
                    padding: "20px 22px", display: "flex", flexDirection: "column", gap: 10,
                    textDecoration: "none", textAlign: "left", font: "inherit", width: "100%", cursor: "pointer",
                    transition: "transform .2s, border-color .2s, box-shadow .2s",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.borderColor = accent;
                    e.currentTarget.style.boxShadow = `0 0 24px ${t.tone === "violet" ? "rgba(192,132,252,0.22)" : "rgba(96,165,250,0.22)"}`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.borderColor = border;
                    e.currentTarget.style.boxShadow = "none";
                  }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="t-mono-s" style={{ color: accent }}>{t.label}</span>
                    <span style={{ color: accent, fontFamily: "var(--f-mono)", fontSize: 16 }}>›</span>
                  </div>
                  <div className="t-mono" style={{ color: "var(--white)", fontSize: 14, fontWeight: 500, wordBreak: "break-all" }}>
                    {t.value}
                  </div>
                </Tag>
              );
            })}
          </div>
        </div>

        <div style={{
          marginTop: 72, paddingTop: 26, borderTop: "1px solid var(--border)",
          display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16,
        }}>
          <a href={homeHref} style={{ display: "flex", alignItems: "center", gap: 16, textDecoration: "none" }}>
            <__Monogram variant="bracket" size={68} mode="dark" />
            <MonoLabel color="var(--muted)">© DERRICK MO · ALL SYSTEMS NOMINAL</MonoLabel>
          </a>
          <MonoLabel color="var(--muted)">derrickmo.github.io</MonoLabel>
        </div>
      </Container>
    </Section>
  );
}

Object.assign(window, {
  Section, Container, TopNav, Footer, MonoLabel, ConstructionBadge,
  NavIcon, IconMail, IconGit, IconProfile, useIsMobile,
  TeX, Connections,
});
