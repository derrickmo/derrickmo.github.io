#!/usr/bin/env node
// set-og-images.mjs — point each page's og:image / twitter:image at its SECTION card.
//
// Every one of the 858 pages currently shares one social card, so sharing a specific lesson, the
// demo library or the interview hub all preview as just "Derrick Mo". This maps a route prefix to
// a section card and rewrites both meta tags in place.
//
// ⚠ A CARD THAT DOES NOT EXIST IS A NO-OP. The mapping below is aspirational: a page only gets a
// section card once that PNG is actually in public/. Until then every page keeps og-default.png,
// so this script is safe to run today and safe to run again after each new card lands. That is
// deliberate — the cards are commissioned one at a time (see _private/claude-design-handoff.md §2),
// and a missing file must never produce a 404 in a social card.
//
// Idempotent, same idiom as add-cdn-sri.mjs. Run:
//   node scripts/set-og-images.mjs            apply
//   node scripts/set-og-images.mjs --check    report only, non-zero if a page is out of date

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");
const ORIGIN = "https://derrickmo.github.io";
const DEFAULT = "og-default.png";

// route prefix -> card filename. First match wins, so order matters: the more specific
// prefixes must come before the broader ones.
const MAP = [
  ["interview/", "og-interview.png"],
  ["visualize/", "og-visualize.png"],
  ["weekly-insights/", "og-insights.png"],
  ["research/", "og-research.png"],
  ["learn/", "og-learn.png"],
];

const cardFor = (rel) => {
  for (const [prefix, file] of MAP) {
    if (rel.startsWith(prefix) && existsSync(join(ROOT, "public", file))) return file;
  }
  return DEFAULT;
};

const SKIP = new Set(["node_modules", "dist", ".git", ".gen-out", "_review", "_expansion",
                      "_private", "content", "scripts", "tools", "public"]);
const pages = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    if (SKIP.has(f)) continue;
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f === "index.html") pages.push(p);
  }
})(ROOT);

let changed = 0, stale = 0, bySection = {};
for (const page of pages) {
  const rel = relative(ROOT, page).split("\\").join("/").replace(/index\.html$/, "");
  const want = cardFor(rel);
  bySection[want] = (bySection[want] || 0) + 1;
  let src = readFileSync(page, "utf8");
  const before = src;
  // both tags, and only ones that currently point at THIS origin, so an intentional
  // per-page image (if one is ever hand-set to something else) is left alone
  src = src.replace(
    /(<meta (?:property="og:image"|name="twitter:image") content=")https:\/\/derrickmo\.github\.io\/[a-z0-9-]+\.png(")/g,
    `$1${ORIGIN}/${want}$2`
  );
  if (src === before) continue;
  stale++;
  if (!CHECK) { writeFileSync(page, src, "utf8"); changed++; }
}

const summary = Object.entries(bySection).sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `${k} ${v}`).join(", ");
console.log(`og images: ${pages.length} pages  ->  ${summary}`);
const missing = MAP.filter(([, f]) => !existsSync(join(ROOT, "public", f))).map(([, f]) => f);
if (missing.length) console.log(`  not yet commissioned (pages keep the default): ${missing.join(", ")}`);

if (CHECK) {
  if (stale) { console.log(`\n! ${stale} page(s) point at the wrong card — run scripts/set-og-images.mjs`); process.exit(1); }
  console.log("OK — every page points at the right social card.");
} else {
  console.log(`  ${changed} page(s) updated`);
}
