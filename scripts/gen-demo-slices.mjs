#!/usr/bin/env node
// gen-demo-slices.mjs — one concept slice per demo / game page.
//
// Why: a demo page renders a Connections panel for the handful of concepts tagged to
// that demo, and was loading the whole of concepts-index.js (119 kB raw, ~44 kB gzip
// across its three globals) to do it. A slice averages 1.9 kB. Same fix as
// sub-lesson-bodies/ and concept-slices/; this is the last surface carrying the full
// index for no reason.
//
// Demo pages are HAND-AUTHORED, not generated, so this script patches them in place
// idempotently rather than rewriting them — the same approach ensureModuleScript()
// uses for module pages. audit-demos.mjs then checks every slice exists and agrees
// with the registry, so the new artifact is policed rather than hand-maintained.
//
// Run: node scripts/gen-demo-slices.mjs      (part of `npm run content`-style regen;
//                                             re-run after adding a demo or retagging)

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const loadGlobals = (file) => {
  const win = {};
  new Function("window", readFileSync(join(ROOT, file), "utf8"))(win);
  return win;
};

const ci = loadGlobals("concepts-index.js");
const INDEX = ci.CONCEPTS_INDEX || {};
const TAGS = ci.CONCEPT_TAGS || {};
const REVERSE = ci.CONCEPT_REVERSE || {};

const demos = (loadGlobals("play-demos.js").PLAY_DEMOS || { demos: [] }).demos || [];
const games = (loadGlobals("play-games.js").PLAY_GAMES || { games: [] }).games || [];

// A demo's Connections panel needs, for each concept tagged to it: the concept itself
// (name/area/summary for the chip) and its CONCEPT_REVERSE row (the other surfaces that
// share it). __resolveAutoConcepts falls back from demos to games and vice versa, so
// both kinds are carried for this slug — one of them is almost always empty.
function sliceFor(kind, slug) {
  const ids = [...new Set([...(TAGS.demos?.[slug] || []), ...(TAGS.games?.[slug] || [])])]
    .filter((id) => INDEX[id]);
  const idx = {}, rev = {};
  for (const id of ids) { idx[id] = INDEX[id]; rev[id] = REVERSE[id] || []; }
  return {
    CONCEPT_TAGS: {
      demos: TAGS.demos?.[slug] ? { [slug]: TAGS.demos[slug] } : {},
      games: TAGS.games?.[slug] ? { [slug]: TAGS.games[slug] } : {},
    },
    CONCEPTS_INDEX: idx,
    CONCEPT_REVERSE: rev,
    count: ids.length,
  };
}

function write(kind, slug) {
  const s = sliceFor(kind, slug);
  const js = `// GENERATED from concepts-index.js by scripts/gen-demo-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to ${kind.slice(0, -1)} "${slug}" (${s.count}), for its Connections
// panel. Same global names as concepts-index.js, with ${Object.keys(INDEX).length - s.count} fewer concepts in them.

window.CONCEPT_TAGS = ${JSON.stringify(s.CONCEPT_TAGS, null, 2)};
window.CONCEPTS_INDEX = ${JSON.stringify(s.CONCEPTS_INDEX, null, 2)};
window.CONCEPT_REVERSE = ${JSON.stringify(s.CONCEPT_REVERSE, null, 2)};
`;
  const dir = join(ROOT, "demo-slices", kind);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, slug + ".js"), js, "utf8");
  return js.length;
}

// Swap the full index for this page's slice. Idempotent: a page already pointing at
// its slice is left alone, and a page with neither tag is reported rather than guessed at.
function patchPage(pageDir, kind, slug) {
  const path = join(ROOT, pageDir, slug, "index.html");
  if (!existsSync(path)) return "missing";
  let src = readFileSync(path, "utf8");
  const want = `../../demo-slices/${kind}/${slug}.js`;
  if (src.includes(want)) return "ok";
  const full = `  <script type="module" src="../../concepts-index.js"></script>`;
  if (!src.includes(full)) return "no-tag";
  src = src.replace(full, `  <script type="module" src="${want}"></script>`);
  writeFileSync(path, src, "utf8");
  return "patched";
}

let bytes = 0, patched = 0, ok = 0, problems = [];
const written = new Set();

for (const [kind, list, pageDir] of [["demos", demos, "visualize"], ["games", games, "play"]]) {
  for (const d of list) {
    bytes += write(kind, d.slug);
    written.add(`${kind}/${d.slug}.js`);
    const r = patchPage(pageDir, kind, d.slug);
    if (r === "patched") patched++;
    else if (r === "ok") ok++;
    else problems.push(`${pageDir}/${d.slug}: ${r}`);
  }
}

// remove slices for demos that no longer exist
const root = join(ROOT, "demo-slices");
let stale = 0;
if (existsSync(root)) {
  for (const kind of readdirSync(root)) {
    const kd = join(root, kind);
    if (!statSync(kd).isDirectory()) continue;
    for (const f of readdirSync(kd)) {
      if (written.has(`${kind}/${f}`)) continue;
      rmSync(join(kd, f)); stale++;
      console.log(`  removed stale slice demo-slices/${kind}/${f}`);
    }
  }
}

const n = demos.length + games.length;
console.log(`demo-slices: ${n} slice(s), ${(bytes / 1024).toFixed(1)} kB total, ${(bytes / n / 1024).toFixed(1)} kB average${stale ? `, ${stale} stale removed` : ""}`);
console.log(`  pages: ${patched} patched, ${ok} already pointing at their slice`);
if (problems.length) {
  console.error(`\n! ${problems.length} page(s) not patched:`);
  for (const p of problems.slice(0, 10)) console.error(`    ${p}`);
  process.exit(1);
}
