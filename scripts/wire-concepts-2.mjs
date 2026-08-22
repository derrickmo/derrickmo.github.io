// scripts/wire-concepts-2.mjs
// Wire concepts-index.js + the other registries into module pages and HF section
// pages so their <Connections /> blocks can resolve cross-surface titles.
//
// Module pages already load curriculum.js + lectures.js → add concepts-index,
//   play-demos, play-games, hf-lectures.
// HF section pages already load hf-lectures.js → add concepts-index,
//   play-demos, play-games, curriculum.
//
// Idempotent.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

function injectScripts(html, anchorLine, scripts, marker) {
  if (html.includes(marker)) return { html, changed: false };
  if (!html.includes(anchorLine)) return { html, changed: false, missing: true };
  const block = scripts.map(s => "  " + s).join("\n") + "\n  " + anchorLine;
  return { html: html.replace(anchorLine, block), changed: true };
}

// 20 ML-from-scratch module pages: learn/<slug>/index.html, depth ../../
const learnDir = path.join(root, "learn");
const skip = new Set(["index.html", "ml-from-scratch", "huggingface", "key-concepts",
  "building-with-genai", "notes", "transformers" /* needs special: also has lesson child */]);
// Actually transformers IS a module; its child self-attention is a lesson — keep both.
skip.delete("transformers");

let touched = 0, missing = 0;

for (const entry of fs.readdirSync(learnDir)) {
  const full = path.join(learnDir, entry);
  if (entry === "index.html") continue;
  if (!fs.statSync(full).isDirectory()) continue;
  // Skip the special learn subpages; modules are all the others.
  if (["ml-from-scratch", "huggingface", "key-concepts", "building-with-genai", "notes"].includes(entry)) continue;
  const html = path.join(full, "index.html");
  if (!fs.existsSync(html)) continue;
  let s = fs.readFileSync(html, "utf8");
  const r = injectScripts(s,
    `<script type="module" src="../../curriculum.js"></script>`,
    [
      `<script type="module" src="../../concepts-index.js"></script>`,
      `<script type="module" src="../../play-demos.js"></script>`,
      `<script type="module" src="../../play-games.js"></script>`,
      `<script type="module" src="../../hf-lectures.js"></script>`,
    ],
    `src="../../concepts-index.js"`);
  if (r.missing) { console.warn("!! missing anchor in", path.relative(root, html)); missing++; continue; }
  if (r.changed) { fs.writeFileSync(html, r.html, "utf8"); console.log("  wired", path.relative(root, html)); touched++; }
}

// 7 HF section pages: learn/huggingface/<slug>/index.html, depth ../../../
const hfDir = path.join(root, "learn", "huggingface");
for (const entry of fs.readdirSync(hfDir)) {
  const full = path.join(hfDir, entry);
  if (entry === "index.html") continue;
  if (!fs.statSync(full).isDirectory()) continue;
  const html = path.join(full, "index.html");
  if (!fs.existsSync(html)) continue;
  let s = fs.readFileSync(html, "utf8");
  const r = injectScripts(s,
    `<script type="module" src="../../../hf-lectures.js"></script>`,
    [
      `<script type="module" src="../../../concepts-index.js"></script>`,
      `<script type="module" src="../../../play-demos.js"></script>`,
      `<script type="module" src="../../../play-games.js"></script>`,
      `<script type="module" src="../../../curriculum.js"></script>`,
    ],
    `src="../../../concepts-index.js"`);
  if (r.missing) { console.warn("!! missing anchor in", path.relative(root, html)); missing++; continue; }
  if (r.changed) { fs.writeFileSync(html, r.html, "utf8"); console.log("  wired", path.relative(root, html)); touched++; }
}

console.log(`\nDone. ${touched} wired, ${missing} skipped.`);
