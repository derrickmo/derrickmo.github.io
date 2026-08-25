#!/usr/bin/env node
// audit-concepts.mjs — the concept sub-lessons, which nothing else covers.
//
// WHY THIS EXISTS. The repo's recurring defect shape is "a check added late, applied only
// going forward" — and its sibling, "a check that never existed". `validate-content.mjs`
// checks the concept STORE (shape, enum values, that a demo slug resolves).
// `audit-curriculum.mjs` is lesson-centric. `check-page-assets.mjs` checks asset tracking.
// `verify-build-output.mjs` checks route counts. **None of them look at concept prose, at
// the rendered page's identity, or at whether a concept page is reachable at all.**
//
// Run standalone or via `npm run audit`. Exits non-zero on a real defect.
//
//   node scripts/audit-concepts.mjs [--verbose]

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (p) => join(ROOT, p);
const VERBOSE = process.argv.includes("--verbose");

// House minimums for a concept page. A page below these is not worth a URL.
const MIN_TAKEAWAYS = 3;
const MIN_SECTIONS = 3;
const MIN_DESC = 60;   // shorter than this does not describe the page in a search result
const MAX_DESC = 155;  // longer than this is truncated in display

let problems = 0;
const bad = (msg) => { console.log(`  ✗ ${msg}`); problems++; };
const note = (msg) => { if (VERBOSE) console.log(`    ${msg}`); };

// An HTML entity is ONE character when rendered, so the raw attribute overstates the
// length a search engine sees. Measure decoded, or `&amp;` inflates every count by 4.
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'");

const concepts = [];
for (const mod of readdirSync(R("content/concepts")))
  for (const f of readdirSync(R(`content/concepts/${mod}`)))
    concepts.push({ mod, file: `content/concepts/${mod}/${f}`,
      ...JSON.parse(readFileSync(R(`content/concepts/${mod}/${f}`), "utf8")) });

// --- the graph is the authority on which ids exist ---
const win = {};
new Function("window", "self", "document", readFileSync(R("concepts-index.js"), "utf8"))(win, win, {});
const CI = win.CONCEPTS_INDEX || {};

// --- the demo registry is the authority on which demo slugs exist ---
// (CONCEPT_REVERSE is built from concept TAGS, not from play-demos.js, so it will happily
//  name a demo that does not exist. Read the registry.)
const dw = {};
new Function("window", readFileSync(R("play-demos.js"), "utf8"))(dw);
const demoSlugs = new Set((dw.PLAY_DEMOS?.demos || []).map((d) => d.slug));

const searchIndex = readFileSync(R("public/search-index.js"), "utf8");

const titles = new Map(), oneLines = new Map(), descs = new Map();

for (const c of concepts) {
  const ref = `${c.mod}/${c.id}`;

  // 1. every page must be a node in the graph, or nothing links to it
  if (!CI[c.id]) bad(`${ref}: has a page but is not in concepts-index.js`);

  // 2. house minimums
  if ((c.takeaways || []).length < MIN_TAKEAWAYS)
    bad(`${ref}: ${(c.takeaways || []).length} takeaways (minimum ${MIN_TAKEAWAYS})`);
  if ((c.sections || []).length < MIN_SECTIONS)
    bad(`${ref}: ${(c.sections || []).length} sections (minimum ${MIN_SECTIONS})`);
  // a concept page with neither math nor code is a glossary entry, not a lesson
  if (!(c.sections || []).some((s) => s.tex) && !(c.sections || []).some((s) => s.code))
    bad(`${ref}: no math and no code`);

  // 3. duplicates — plan.md's "zero duplicate titles or descriptions" invariant,
  //    which nothing enforced for concepts
  for (const [map, val, what] of [[titles, c.title, "title"], [oneLines, c.oneLine, "oneLine"]]) {
    if (map.has(val)) bad(`${what} duplicated: ${ref} and ${map.get(val)} -> "${String(val).slice(0, 60)}"`);
    else map.set(val, ref);
  }

  // 4. the demo must exist in the REGISTRY
  if (c.demo && !demoSlugs.has(c.demo)) bad(`${ref}: demo "${c.demo}" is not in play-demos.js`);

  // 5. the rendered page: exists, one identity, reachable, sane description
  const page = R(`learn/${c.mod}/${c.id}/index.html`);
  if (!existsSync(page)) { bad(`${ref}: no generated page at learn/${c.mod}/${c.id}/`); continue; }
  const html = readFileSync(page, "utf8");

  // the page-identity rule: a concept page carries __DM_CONCEPT_SLUG and a store-lesson
  // page carries __DM_LESSON_SLUG, and they must NEVER both appear
  if (!html.includes("__DM_CONCEPT_SLUG")) bad(`${ref}: page is missing __DM_CONCEPT_SLUG`);
  if (html.includes("__DM_LESSON_SLUG")) bad(`${ref}: page has BOTH identities (collision policy broken)`);

  if (!searchIndex.includes(`learn/${c.mod}/${c.id}/`)) bad(`${ref}: not in public/search-index.js (unreachable from Ctrl-K)`);

  const m = html.match(/<meta name="description" content="([^"]*)"/);
  if (!m) { bad(`${ref}: no meta description`); continue; }
  const d = decode(m[1]);
  if (d.length < MIN_DESC) bad(`${ref}: description ${d.length} chars (minimum ${MIN_DESC})`);
  if (d.length > MAX_DESC) bad(`${ref}: description ${d.length} chars (maximum ${MAX_DESC})`);
  if (descs.has(d)) bad(`description duplicated: ${ref} and ${descs.get(d)}`);
  else descs.set(d, ref);
  note(`${ref}: ${d.length} chars`);
}

const withDemo = concepts.filter((c) => c.demo).length;
const fourSection = concepts.filter((c) => (c.sections || []).length >= 4).length;
console.log(`concepts: ${concepts.length} · with a demo: ${withDemo} · 4-section house style: ${fourSection}` +
  ` · 3-section (older seed): ${concepts.length - fourSection}`);

if (problems) { console.log(`\nISSUES: ${problems}`); process.exit(1); }
console.log("OK — every concept page is reachable, unique, and within the description bounds.");
