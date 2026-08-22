// scripts/generate-concept-pages.mjs
// Generate:
//   concepts/index.html          → the concept-graph hub
//   concepts/<id>/index.html     → one page per concept in CONCEPTS_INDEX
// Also patches vite.config.mjs to add inputs for every page.
//
// The concept registry is concepts-index.js. We exec it in a tiny vm with a
// stub `window` so we don't need to re-list ids here.

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

// Meta descriptions are what a searcher sees in Google and what a colleague sees when
// the link is pasted into Slack, so a half-word ending reads as broken (MT-0001).
// Cut on a word boundary near the ~155 chars Google renders, and end with an ellipsis.
function metaDescription(text, max = 155) {
  const flat = String(text || "").replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  // Only fall back to a hard cut if there is no space in the last third.
  const base = sp > max * 0.6 ? cut.slice(0, sp) : cut;
  // ASCII "..." not U+2026: esc()/htmlEscape() ASCII-fold these metas (the site keeps
  // HTML head content ASCII-only), so a real ellipsis is silently stripped and the
  // description ends mid-word again - which is the bug this function exists to fix.
  return base.replace(/[\s,;:.\-]+$/, "") + "...";
}


const src = fs.readFileSync(path.join(root, "concepts-index.js"), "utf8");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(src, sandbox);
const INDEX = sandbox.window.CONCEPTS_INDEX;
const ids = Object.keys(INDEX);

function htmlEscape(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const hubHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <title>The Concept Graph | Derrick Mo</title>
  <meta name="description" content="Every core ML/DL concept on the site - its equation, prerequisites, and every interactive demo, game, lesson, and animation that touches it." />
  <link rel="canonical" href="https://derrickmo.github.io/concepts/" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Derrick Mo" />
  <meta property="og:title" content="The Concept Graph | Derrick Mo" />
  <meta property="og:description" content="Every core ML/DL concept on the site - its equation, prerequisites, and every interactive demo, game, lesson, and animation that touches it." />
  <meta property="og:url" content="https://derrickmo.github.io/concepts/" />
  <meta property="og:image" content="https://derrickmo.github.io/og-default.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="The Concept Graph | Derrick Mo" />
  <meta name="twitter:description" content="Every core ML/DL concept on the site - its equation, prerequisites, and every interactive demo, game, lesson, and animation that touches it." />
  <meta name="twitter:image" content="https://derrickmo.github.io/og-default.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />

  <link rel="stylesheet" href="../tokens.css" />
  <style>
    html { scroll-behavior: smooth; }
    body { margin: 0; padding: 0; background: var(--bg-deep); color: var(--white); font-family: var(--f-body); -webkit-font-smoothing: antialiased; overflow-x: hidden; }
    ::selection { background: rgba(168, 85, 247, 0.5); color: var(--white); }
    section[id] { scroll-margin-top: 84px; }
    @keyframes dm-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
    @media (max-width: 900px) { section { padding: 48px 0 !important; } }
  </style>

  <script>window.__DM_BASE = "../"; window.__DM_PAGE = "learn";</script>

  <script src="https://unpkg.com/react@18.3.1/umd/react.development.js" integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L" crossorigin="anonymous"></script>
  <script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm" crossorigin="anonymous"></script>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="../concepts-index.js"></script>
  <script type="module" src="../play-demos.js"></script>
  <script type="module" src="../play-games.js"></script>
  <script type="module" src="../curriculum.js"></script>
  <script type="module" src="../hf-lectures.js"></script>
  <script type="module" src="../components/HUD.jsx"></script>
  <script type="module" src="../components/Monogram.jsx"></script>
  <script type="module" src="../chrome.jsx"></script>
  <script type="module" src="../concepts-app.jsx"></script>
</body>
</html>
`;

function pageHtml(id, c) {
  const title = `${c.name} - Concept | Derrick Mo`;
  const desc = metaDescription(c.summary || `The ${c.name} concept on Derrick Mo's ML/DL site - every demo, game, lesson, and animation that touches it.`);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <title>${htmlEscape(title)}</title>
  <meta name="description" content="${htmlEscape(desc)}" />
  <link rel="canonical" href="https://derrickmo.github.io/concepts/${id}/" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Derrick Mo" />
  <meta property="og:title" content="${htmlEscape(title)}" />
  <meta property="og:description" content="${htmlEscape(desc)}" />
  <meta property="og:url" content="https://derrickmo.github.io/concepts/${id}/" />
  <meta property="og:image" content="https://derrickmo.github.io/og-default.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${htmlEscape(title)}" />
  <meta name="twitter:description" content="${htmlEscape(desc)}" />
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
    @keyframes dm-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
    @media (max-width: 900px) { section { padding: 48px 0 !important; } }
  </style>

  <script>window.__DM_BASE = "../../"; window.__DM_PAGE = "learn"; window.__DM_CONCEPT_ID = "${id}";</script>

  <script src="https://unpkg.com/react@18.3.1/umd/react.development.js" integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L" crossorigin="anonymous"></script>
  <script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm" crossorigin="anonymous"></script>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="../../concepts-index.js"></script>
  <script type="module" src="../../play-demos.js"></script>
  <script type="module" src="../../play-games.js"></script>
  <script type="module" src="../../curriculum.js"></script>
  <script type="module" src="../../hf-lectures.js"></script>
  <script type="module" src="../../components/HUD.jsx"></script>
  <script type="module" src="../../components/Monogram.jsx"></script>
  <script type="module" src="../../chrome.jsx"></script>
  <script type="module" src="../../concept-app.jsx"></script>
</body>
</html>
`;
}

// ── write hub ──
const conceptsDir = path.join(root, "concepts");
fs.mkdirSync(conceptsDir, { recursive: true });
fs.writeFileSync(path.join(conceptsDir, "index.html"), hubHtml, "utf8");
console.log("  wrote concepts/index.html");

// ── write each concept page ──
for (const id of ids) {
  const dir = path.join(conceptsDir, id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), pageHtml(id, INDEX[id]), "utf8");
  console.log(`  wrote concepts/${id}/index.html`);
}

// ── patch vite.config.mjs ──
const vitePath = path.join(root, "vite.config.mjs");
let vite = fs.readFileSync(vitePath, "utf8");
const markerStart = "// >>> generated:concepts";
const markerEnd = "// <<< generated:concepts";
const generated = [
  markerStart,
  `        'concepts': 'concepts/index.html',`,
  ...ids.map(id => `        'concept-${id}': 'concepts/${id}/index.html',`),
  `        ${markerEnd}`,
].join("\n");

if (vite.includes(markerStart)) {
  const re = new RegExp(`${markerStart}[\\s\\S]*?${markerEnd}`);
  vite = vite.replace(re, generated.trim());
} else {
  // Insert just before the closing }, of rollupOptions.input
  vite = vite.replace(
    /(\s*'hf-agentic': 'learn\/huggingface\/agentic\/index\.html',)/,
    `$1\n${generated}`
  );
}
fs.writeFileSync(vitePath, vite, "utf8");
console.log(`  patched vite.config.mjs with ${ids.length + 1} inputs`);

console.log(`\nDone. ${ids.length} concept pages + hub.`);
