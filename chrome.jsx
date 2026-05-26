// chrome.jsx — shared chrome (TopNav, Footer, helpers) for every page.
// Each page sets `window.__DM_PAGE` ("home" | "learn" | "play" | "cases")
// and `window.__DM_BASE` ("" for landing, "../" for subdirectory pages)
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
  { label: "Decision Tree", group: "Demo", href: "/visualize/decision-tree/", kw: "cart gini splits classical ml" },
  { label: "k-Nearest Neighbors", group: "Demo", href: "/visualize/knn/", kw: "knn classifier classical ml" },
  { label: "SVM - Margins & Kernels", group: "Demo", href: "/visualize/svm/", kw: "support vector machine margin kernel rbf classical ml" },
  { label: "Principal Component Analysis", group: "Demo", href: "/visualize/pca/", kw: "pca projection dimensionality reduction eigenvectors unsupervised" },
  { label: "Gaussian Mixtures & EM", group: "Demo", href: "/visualize/gmm/", kw: "gmm expectation maximization soft clustering unsupervised mixture" },
  { label: "ROC, PR & Thresholds", group: "Demo", href: "/visualize/roc/", kw: "roc auc precision recall confusion matrix evaluation threshold theory" },
  { label: "MDP Value Iteration", group: "Demo", href: "/visualize/value-iteration/", kw: "mdp bellman dynamic programming policy gridworld reinforcement rl" },
  { label: "Markov Text Generator", group: "Demo", href: "/visualize/markov/", kw: "ngram language model nlp text" },
  { label: "Decoding Strategies", group: "Demo", href: "/visualize/decoding/", kw: "temperature top-k top-p nucleus sampling llm nlp" },
  { label: "Activation Functions", group: "Demo", href: "/visualize/activations/", kw: "relu sigmoid tanh gelu gradient neural" },
  { label: "Central Limit Theorem", group: "Demo", href: "/visualize/clt/", kw: "probability gaussian sampling statistics" },
  { label: "Fourier Series", group: "Demo", href: "/visualize/fourier/", kw: "signal epicycles sine wave dsp" },
  { label: "Attention Heatmap", group: "Demo", href: "/visualize/attention/", kw: "transformer softmax qkv" },
  { label: "Multi-Head Attention", group: "Demo", href: "/visualize/multi-head-attention/", kw: "transformer heads parallel attention qkv specialize" },
  { label: "Positional Encoding", group: "Demo", href: "/visualize/positional-encoding/", kw: "rope sinusoidal" },
  { label: "Tokenizer Lab", group: "Demo", href: "/visualize/tokenizer/", kw: "bpe subword nlp" },
  { label: "Q-Learning Gridworld", group: "Demo", href: "/visualize/gridworld-rl/", kw: "reinforcement rl" },
  { label: "Multi-Armed Bandit", group: "Demo", href: "/visualize/bandit/", kw: "explore exploit ucb thompson rl" },
  { label: "Neural Playground", group: "Demo", href: "/visualize/neural-playground/", kw: "mlp backprop boundary" },
  { label: "Convolution Lab", group: "Demo", href: "/visualize/convolution/", kw: "cnn kernel filter vision" },
  { label: "IoU & Non-Max Suppression", group: "Demo", href: "/visualize/nms/", kw: "nms iou object detection bounding box vision map" },
  { label: "Diffusion Sampler", group: "Demo", href: "/visualize/diffusion/", kw: "ddpm generative denoise" },
  { label: "Variational Autoencoder", group: "Demo", href: "/visualize/vae/", kw: "vae latent reparameterization kl generative encoder decoder" },
  { label: "Embedding Atlas", group: "Demo", href: "/visualize/embeddings/", kw: "word vectors analogy" },
  { label: "Vector Search", group: "Demo", href: "/visualize/vector-search/", kw: "nearest neighbor retrieval rag semantic search cosine embedding knn" },
  { label: "Time-Series Forecasting", group: "Demo", href: "/visualize/forecasting/", kw: "forecast exponential smoothing holt winters seasonality arima time series" },
  { label: "Learning-Rate Schedules", group: "Demo", href: "/visualize/lr-schedule/", kw: "warmup cosine decay training optimization sgd schedule" },
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
  { label: "Optimizer Shootout", group: "Demo", href: "/visualize/optimizers/", kw: "sgd momentum rmsprop adam optimizer training loss landscape" },
  { label: "GAN 2-D", group: "Demo", href: "/visualize/gan/", kw: "gan generative adversarial network generator discriminator duel" },
  { label: "Backprop Graph", group: "Demo", href: "/visualize/backprop/", kw: "backprop backpropagation chain rule computation graph gradient" },
  { label: "MCTS Tree Search", group: "Demo", href: "/visualize/mcts/", kw: "mcts monte carlo tree search ucb ucb1 alphago rollout backup planning" },
  { label: "Simulated Annealing", group: "Demo", href: "/visualize/simulated-annealing/", kw: "simulated annealing tsp traveling salesman 2-opt metropolis local search optimization" },
  { label: "Concept Graph (hub)", group: "Page", href: "/concepts/", kw: "concepts graph index hub taxonomy map of ml ideas connections" },
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
