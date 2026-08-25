// gen-sublesson-pages.mjs — generate per-concept sub-lesson pages from sub-lessons.js.
// Idempotent: re-run after editing sub-lessons.js. For every module in SUB_LESSONS and
// every concept in its `order`, writes learn/<module>/<concept>/index.html, then patches:
//   - vite.config.mjs  rollupOptions.input  (between // >>> generated:sublessons markers)
//   - public/search-index.js  the palette index  (between // >>> generated:sublessons markers)
//
//   node scripts/gen-sublesson-pages.mjs
//
// No deps. Run npm run build + gen-sitemap.mjs afterward.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// load SUB_LESSONS the same dependency-free way validate-insights does
function loadSubLessons() {
  const src = readFileSync(join(ROOT, "sub-lessons.js"), "utf8");
  const win = {};
  new Function("window", src)(win);
  if (!win.SUB_LESSONS) throw new Error("window.SUB_LESSONS not defined");
  return win.SUB_LESSONS;
}

const ascii = s => String(s).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/[^\x00-\x7F]/g, "");
const esc = s => ascii(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ★ THIS GENERATOR WAS LEFT OUT OF THE MT-0001 FIX. gen-lesson-pages.mjs and
// generate-concept-pages.mjs both truncate on a word boundary at 155; this one emitted
// `esc(oneLine)` raw, so it had BOTH failure modes at once: 6 pages ran over 155 chars
// (up to 171, silently truncated by search engines mid-sentence) and 27 sat under 60,
// which is too thin to describe the page.
// Same helper as the other two, verbatim — including the ASCII "..." note, since esc()
// strips a real U+2026 ellipsis and would re-create the mid-word ending it exists to fix.
function metaDescription(text, max = 155) {
  const flat = String(text || "").replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  // Reserve room for the "..." itself: slice(0, max-1) plus a 3-char suffix returns up to
  // max+2, so this helper was overshooting its own cap by 2 on 65 pages.
  const cut = flat.slice(0, max - 3);
  const sp = cut.lastIndexOf(" ");
  const base = sp > max * 0.6 ? cut.slice(0, sp) : cut;
  return base.replace(/[\s,;:.\-]+$/, "") + "...";
}

// A page subtitle and a search-result description are different jobs. `oneLine` is the
// subtitle and some of the older seeded concepts keep it deliberately terse ("Update what
// you believe in light of new evidence." = 49 chars). Rather than rewrite that content,
// carry a takeaway into the DESCRIPTION only when the subtitle alone is too thin — a
// takeaway is already a one-sentence statement of what the page establishes.
//
// ⚠ NOT takeaways[0]. On these seeded concepts the first takeaway usually RESTATES the
// oneLine ("Estimate the per-pixel motion between two frames." + "Optical flow recovers
// per-pixel motion between frames."), which produces a description that says one thing
// twice. Pick the takeaway that shares the FEWEST content words with the subtitle: on the
// 76 pages this touches, 51 get a different and less redundant sentence that way.
const contentWords = (s) =>
  new Set(String(s).toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3));

function leastRedundant(one, takeaways) {
  const base = contentWords(one);
  let best = null, bestOverlap = Infinity;
  for (const t of takeaways) {
    const w = contentWords(t);
    if (!w.size) continue;
    let shared = 0;
    for (const x of w) if (base.has(x)) shared++;
    const overlap = shared / w.size;
    if (overlap < bestOverlap) { bestOverlap = overlap; best = t; }
  }
  return best;
}

function describe(lesson) {
  const one = String(lesson.oneLine || "").trim();
  if (one.length >= 90) return metaDescription(one);
  const extra = leastRedundant(one, lesson.takeaways || []);
  return metaDescription(extra ? `${one.replace(/[.\s]+$/, "")}. ${extra}` : one);
}

function pageHtml(moduleSlug, conceptId, moduleTitle, lesson) {
  const title = `${ascii(lesson.title)} - ${ascii(moduleTitle)} | ML from Scratch | Derrick Mo`;
  const desc = esc(describe(lesson));
  const url = `https://derrickmo.github.io/learn/${moduleSlug}/${conceptId}/`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <title>${esc(title)}</title>
  <meta name="description" content="${desc}" />
  <link rel="canonical" href="${url}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Derrick Mo" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="https://derrickmo.github.io/og-default.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="https://derrickmo.github.io/og-default.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />

  <link rel="stylesheet" href="../../../tokens.css" />
  <!-- Keep the version and integrity in step with scripts/add-cdn-sri.mjs, which
       verifies every page during npm run audit. A template without SRI silently
       reverts it on every page this generator rewrites (PF-0003). -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" crossorigin="anonymous" integrity="sha384-nB0miv6/jRmo5UMMR1wu3Gz6NLsoTkbqJghGIsx//Rlm+ZU03BU6SQNC66uf4l5+" />
  <style>
    html { scroll-behavior: smooth; }
    body { margin: 0; padding: 0; background: var(--bg-deep); color: var(--white); font-family: var(--f-body); -webkit-font-smoothing: antialiased; overflow-x: hidden; }
    ::selection { background: rgba(168, 85, 247, 0.5); color: var(--white); }
    section[id] { scroll-margin-top: 110px; }
    .katex { color: var(--blue-br); }
  </style>

  <script>window.__DM_BASE = "../../../"; window.__DM_PAGE = "learn"; window.__DM_MODULE_SLUG = "${moduleSlug}"; window.__DM_CONCEPT_SLUG = "${conceptId}";</script>

  <script src="https://unpkg.com/react@18.3.1/umd/react.development.js" integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L" crossorigin="anonymous"></script>
  <script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm" crossorigin="anonymous"></script>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="../../../curriculum.js"></script>
  <script type="module" src="../../../concepts-index.js"></script>
  <script type="module" src="../../../play-demos.js"></script>
  <script type="module" src="../../../components/HUD.jsx"></script>
  <script type="module" src="../../../components/Monogram.jsx"></script>
  <script type="module" src="../../../chrome.jsx"></script>
  <script type="module" src="../../../sub-lessons.js"></script>
  <script type="module" src="../../../concept-lesson-app.jsx"></script>
</body>
</html>
`;
}

function patchBlock(file, marker, lines) {
  const path = join(ROOT, file);
  let src = readFileSync(path, "utf8");
  const start = `// >>> ${marker}`, end = `// <<< ${marker}`;
  const re = new RegExp(`([ \\t]*)${start}[\\s\\S]*?${end}`);
  const m = src.match(re);
  if (!m) throw new Error(`markers ${marker} not found in ${file}`);
  const indent = m[1] || "";
  const body = lines.map(l => indent + l).join("\n");
  src = src.replace(re, `${indent}${start}\n${body}\n${indent}${end}`);
  writeFileSync(path, src);
}

// idempotently add the sub-lessons.js script tag to a module's index.html so its
// "Concept by concept" section can read window.SUB_LESSONS.
function ensureModuleScript(moduleSlug) {
  const path = join(ROOT, "learn", moduleSlug, "index.html");
  let src;
  try { src = readFileSync(path, "utf8"); } catch (e) { console.warn(`! no module page learn/${moduleSlug}/index.html`); return; }
  if (src.includes("sub-lessons.js")) return;
  const tag = `  <script type="module" src="../../sub-lessons.js"></script>\n  <script type="module" src="../../module-app.jsx"></script>`;
  if (!src.includes(`<script type="module" src="../../module-app.jsx"></script>`)) { console.warn(`! could not find module-app.jsx tag in ${moduleSlug}`); return; }
  src = src.replace(`  <script type="module" src="../../module-app.jsx"></script>`, tag);
  writeFileSync(path, src);
}

const SUB = loadSubLessons();
const viteLines = [], navLines = [];
let pages = 0;

for (const moduleSlug of Object.keys(SUB)) {
  const mod = SUB[moduleSlug];
  ensureModuleScript(moduleSlug);
  const order = mod.order || Object.keys(mod.lessons);
  for (const conceptId of order) {
    const lesson = mod.lessons[conceptId];
    if (!lesson) { console.warn(`! ${moduleSlug}/${conceptId} in order but no lesson body`); continue; }
    const dir = join(ROOT, "learn", moduleSlug, conceptId);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), pageHtml(moduleSlug, conceptId, mod.title, lesson));
    pages++;
    const key = `sublesson-${moduleSlug}-${conceptId}`;
    viteLines.push(`'${key}': 'learn/${moduleSlug}/${conceptId}/index.html',`);
    const kw = ascii(`${lesson.title} ${mod.title} ${conceptId} sub lesson concept ${lesson.oneLine}`).toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
    navLines.push(`{ label: ${JSON.stringify(ascii(lesson.title) + " - " + ascii(mod.title))}, group: "Lesson", href: "/learn/${moduleSlug}/${conceptId}/", kw: ${JSON.stringify(kw)} },`);
  }
}

patchBlock("vite.config.mjs", "generated:sublessons", viteLines);
patchBlock("public/search-index.js", "generated:sublessons", navLines);

console.log(`wrote ${pages} sub-lesson page(s) across ${Object.keys(SUB).length} module(s); patched vite.config.mjs + public/search-index.js`);
