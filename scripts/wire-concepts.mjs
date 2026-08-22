// scripts/wire-concepts.mjs
// One-shot wiring: inject window.__DM_DEMO_SLUG + the registry data scripts
// (concepts-index.js, play-demos.js / play-games.js, curriculum.js, hf-lectures.js)
// into every visualize/<slug>/index.html and play/<slug>/index.html so the
// existing Connections panel in demo-chrome.jsx can populate cross-surface links.
//
// Idempotent — runs cleanly multiple times.
//
// Usage:  node scripts/wire-concepts.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const targets = [
  { dir: "visualize", page: "visualize", registry: "play-demos.js" },
  { dir: "play",      page: "play",      registry: "play-games.js" },
];

let touched = 0, already = 0;

for (const t of targets) {
  const base = path.join(root, t.dir);
  if (!fs.existsSync(base)) continue;
  for (const slug of fs.readdirSync(base)) {
    const html = path.join(base, slug, "index.html");
    if (!fs.statSync(path.join(base, slug)).isDirectory()) continue;
    if (!fs.existsSync(html)) continue;
    let s = fs.readFileSync(html, "utf8");
    let changed = false;

    // 1) Inject __DM_DEMO_SLUG into the existing inline window.__DM_BASE line.
    const slugMarker = "window.__DM_DEMO_SLUG";
    if (!s.includes(slugMarker)) {
      const re = new RegExp(`(window\\.__DM_PAGE = "${t.page}";)`);
      const next = s.replace(re, `$1 window.__DM_DEMO_SLUG = "${slug}";`);
      if (next !== s) { s = next; changed = true; }
      else { console.warn(`!! Couldn't find __DM_PAGE line in ${html}`); continue; }
    }

    // 2) Inject the four registry module scripts before HUD.jsx.
    const scripts = [
      `<script type="module" src="../../concepts-index.js"></script>`,
      `<script type="module" src="../../${t.registry}"></script>`,
      `<script type="module" src="../../curriculum.js"></script>`,
      `<script type="module" src="../../hf-lectures.js"></script>`,
    ];
    const hudLine = `<script type="module" src="../../components/HUD.jsx"></script>`;
    if (!s.includes(`src="../../concepts-index.js"`)) {
      if (!s.includes(hudLine)) { console.warn(`!! Couldn't find HUD line in ${html}`); continue; }
      s = s.replace(hudLine, scripts.map(x => "  " + x).join("\n") + "\n  " + hudLine);
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(html, s, "utf8");
      console.log("  wired", path.relative(root, html));
      touched++;
    } else {
      already++;
    }
  }
}

console.log(`\nDone. ${touched} wired, ${already} already wired.`);
