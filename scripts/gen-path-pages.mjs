// gen-path-pages.mjs — idempotent generator for /paths/<id>/index.html pages.
// One HTML shell per learning path; the React app (path-app.jsx) reads
// window.__DM_PATH_ID and renders from window.LEARNING_PATHS. Re-run after adding
// a path to the PATHS list below (and to paths.js). Run from repo root:
//   node scripts/gen-path-pages.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Keep in sync with paths.js (id + ASCII title + one-line description).
const PATHS = [
  { id: "ml-foundations", title: "ML Foundations", desc: "The handful of ideas the rest of machine learning quietly assumes - learn it step by step with saved progress." },
  { id: "zero-to-transformer", title: "Zero to Transformer", desc: "From turning words into vectors to a working attention block - a guided path through the demos and lessons." },
  { id: "rl-from-scratch", title: "Reinforcement Learning from Scratch", desc: "Learning from reward, from bandits to deep RL and RLHF - a guided, step-by-step path." },
  { id: "rag-and-agents", title: "LLM Systems - RAG and Agents", desc: "Turn a raw model into a grounded, reliable, safe system - retrieval, agents, guardrails, serving." },
  { id: "computer-vision", title: "Computer Vision", desc: "From raw pixels to edges, features, motion, and detections - a guided path through the CV demos." },
  { id: "classic-cs", title: "Classic CS Algorithms", desc: "Search, dynamic programming, constraints, and graph algorithms under AI - a guided path." },
  { id: "trustworthy-ml", title: "Trustworthy and Responsible ML", desc: "Models you can actually deploy - honest, explainable, robust, and fair - a guided path." },
  { id: "generative-models", title: "Generative Models", desc: "Three ways to learn to create data - latent, adversarial, and iterative - a guided path." },
  { id: "audio-ml", title: "Audio ML", desc: "How a waveform becomes something a model can learn from - sampling, spectra, features, alignment." },
  { id: "efficiency-and-serving", title: "Efficiency and Serving", desc: "Make a trained model cheap and reliable enough to ship - compression, fast inference, serving." },
  { id: "llm-internals", title: "Modern LLM Internals", desc: "What makes large language models scale, stretch, and stay fast - a guided advanced path." },
];

const shell = (id, title, desc) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <title>${title} | Guided Paths - Derrick Mo</title>
  <meta name="description" content="${desc}" />
  <link rel="canonical" href="https://derrickmo.github.io/paths/${id}/" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Derrick Mo" />
  <meta property="og:title" content="${title} | Guided Paths - Derrick Mo" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:url" content="https://derrickmo.github.io/paths/${id}/" />
  <meta property="og:image" content="https://derrickmo.github.io/og-default.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title} | Guided Paths - Derrick Mo" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="https://derrickmo.github.io/og-default.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />

  <link rel="stylesheet" href="../../tokens.css" />
  <style>
    html { scroll-behavior: smooth; }
    body { margin: 0; padding: 0; background: var(--bg-deep); color: var(--white); font-family: var(--f-body); -webkit-font-smoothing: antialiased; overflow-x: hidden; }
    ::selection { background: rgba(168, 85, 247, 0.5); color: var(--white); }
    section[id] { scroll-margin-top: 84px; }
    @media (max-width: 900px) { section { padding: 48px 0 !important; } }
  </style>

  <script>window.__DM_BASE = "../../"; window.__DM_PAGE = "paths"; window.__DM_PATH_ID = "${id}";</script>

  <script src="https://unpkg.com/react@18.3.1/umd/react.development.js" integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L" crossorigin="anonymous"></script>
  <script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm" crossorigin="anonymous"></script>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="../../concepts-index.js"></script>
  <script type="module" src="../../play-demos.js"></script>
  <script type="module" src="../../play-games.js"></script>
  <script type="module" src="../../curriculum.js"></script>
  <script type="module" src="../../lectures.js"></script>
  <script type="module" src="../../hf-lectures.js"></script>
  <script type="module" src="../../paths.js"></script>
  <script type="module" src="../../components/HUD.jsx"></script>
  <script type="module" src="../../components/Monogram.jsx"></script>
  <script type="module" src="../../chrome.jsx"></script>
  <script type="module" src="../../path-app.jsx"></script>
</body>
</html>
`;

let n = 0;
for (const p of PATHS) {
  const dir = resolve(ROOT, "paths", p.id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, "index.html"), shell(p.id, p.title, p.desc), "utf8");
  console.log("  wrote paths/" + p.id + "/index.html");
  n++;
}
console.log("Done. " + n + " path pages.");
