#!/usr/bin/env node
// gen-tag-slices.mjs — one concept slice per CONCEPT_TAGS item.
//
// Why: a page that renders a Connections panel needs the handful of concepts tagged to
// THAT item, and was loading the whole of concepts-index.js (119 kB raw, ~40 kB gzip) to
// get them. CONCEPT_TAGS has exactly four kinds — demos, games, modules, hf — and all
// four page families had the same problem, so all four get the same fix.
//
// Not to be confused with concept-slices/<id>.js, which is one slice per CONCEPT for the
// /concepts/<id>/ hub pages. This is one slice per TAGGED ITEM.
//
// These pages are HAND-AUTHORED, so this patches them in place idempotently rather than
// rewriting them — the same approach ensureModuleScript() uses. audit-demos.mjs checks 8
// and 9 then police the result, so the artifact is generated and checked rather than
// hand-maintained.
//
// ⚠ CONCEPT_REVERSE is DERIVED from CONCEPT_TAGS and concept-slices/ embeds a row of it,
// so after any CONCEPT_TAGS edit run generate-concept-pages.mjs too, then build.
//
// Run: node scripts/gen-tag-slices.mjs

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

// kind -> the real page slugs, and where those pages live. The slug list comes from the
// same registry the rest of the site reads, so a slice cannot be emitted for a page that
// does not exist (and audit check 9 catches the reverse).
const KINDS = [
  { kind: "demos", pageDir: "visualize", slugs: () => (loadGlobals("play-demos.js").PLAY_DEMOS || { demos: [] }).demos.map((d) => d.slug) },
  { kind: "games", pageDir: "play", slugs: () => (loadGlobals("play-games.js").PLAY_GAMES || { games: [] }).games.map((d) => d.slug) },
  { kind: "modules", pageDir: "learn", slugs: () => (loadGlobals("curriculum.js").CURRICULUM || { modules: [] }).modules.map((m) => m.slug) },
  { kind: "hf", pageDir: "learn/huggingface", slugs: () => (loadGlobals("hf-lectures.js").HF || { sections: [] }).sections.map((s) => s.slug) },
];

// A Connections panel needs, for each concept tagged to this item: the concept itself
// (name/area/summary for the chip) and its CONCEPT_REVERSE row (the other surfaces that
// share it). Demo pages' __resolveAutoConcepts falls back between demos and games, so
// both of those are carried for a demo/game slug — one is almost always empty.
function sliceFor(kind, slug) {
  const carry = kind === "demos" || kind === "games" ? ["demos", "games"] : [kind];
  const ids = [...new Set(carry.flatMap((k) => (TAGS[k] || {})[slug] || []))].filter((id) => INDEX[id]);
  const tags = {};
  for (const k of carry) tags[k] = (TAGS[k] || {})[slug] ? { [slug]: TAGS[k][slug] } : {};
  const idx = {}, rev = {};
  for (const id of ids) { idx[id] = INDEX[id]; rev[id] = REVERSE[id] || []; }
  return { tags, idx, rev, count: ids.length };
}

function write(kind, slug) {
  const s = sliceFor(kind, slug);
  const js = `// GENERATED from concepts-index.js by scripts/gen-tag-slices.mjs -- DO NOT EDIT.
// Only the concepts tagged to ${kind} "${slug}" (${s.count}), for its Connections panel.
// Same global names as concepts-index.js, with ${Object.keys(INDEX).length - s.count} fewer concepts in them.

window.CONCEPT_TAGS = ${JSON.stringify(s.tags, null, 2)};
window.CONCEPTS_INDEX = ${JSON.stringify(s.idx, null, 2)};
window.CONCEPT_REVERSE = ${JSON.stringify(s.rev, null, 2)};
`;
  const dir = join(ROOT, "tag-slices", kind);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, slug + ".js"), js, "utf8");
  return js.length;
}

// Swap the full index for this page's slice. Idempotent: a page already pointing at its
// slice is left alone, and a page with neither tag is reported rather than guessed at.
function patchPage(pageDir, kind, slug) {
  const path = join(ROOT, pageDir, slug, "index.html");
  if (!existsSync(path)) return "missing";
  let src = readFileSync(path, "utf8");
  const up = "../".repeat(pageDir.split("/").length + 1);
  const want = `${up}tag-slices/${kind}/${slug}.js`;
  if (src.includes(want)) return "ok";
  const full = `<script type="module" src="${up}concepts-index.js"></script>`;
  if (!src.includes(full)) return "no-tag";
  src = src.replace(full, `<script type="module" src="${want}"></script>`);
  writeFileSync(path, src, "utf8");
  return "patched";
}

let bytes = 0, patched = 0, ok = 0, n = 0;
const problems = [];
const written = new Set();

for (const { kind, pageDir, slugs } of KINDS) {
  for (const slug of slugs()) {
    n++;
    bytes += write(kind, slug);
    written.add(`${kind}/${slug}.js`);
    const r = patchPage(pageDir, kind, slug);
    if (r === "patched") patched++;
    else if (r === "ok") ok++;
    else problems.push(`${pageDir}/${slug}: ${r}`);
  }
}

// remove slices for items that no longer exist
const root = join(ROOT, "tag-slices");
let stale = 0;
if (existsSync(root)) {
  for (const kind of readdirSync(root)) {
    const kd = join(root, kind);
    if (!statSync(kd).isDirectory()) continue;
    for (const f of readdirSync(kd)) {
      if (written.has(`${kind}/${f}`)) continue;
      rmSync(join(kd, f)); stale++;
      console.log(`  removed stale slice tag-slices/${kind}/${f}`);
    }
  }
}

console.log(`tag-slices: ${n} slice(s), ${(bytes / 1024).toFixed(1)} kB total, ${(bytes / n / 1024).toFixed(1)} kB average${stale ? `, ${stale} stale removed` : ""}`);
console.log(`  pages: ${patched} patched, ${ok} already pointing at their slice`);
if (problems.length) {
  console.error(`\n! ${problems.length} page(s) not patched:`);
  for (const p of problems.slice(0, 10)) console.error(`    ${p}`);
  process.exit(1);
}
