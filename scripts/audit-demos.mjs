#!/usr/bin/env node
// Same question, applied to the demo/game surface: what do the checks SKIP?
// check-page-assets verifies asset tracking. verify-build-output checks route counts.
// Neither asks whether the registry, the .jsx files, the pages, the vite inputs and the
// search index agree with each other — five lists that must stay in sync by hand.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (p) => join(ROOT, p);

const load = (file, key) => { const w = {}; new Function("window", readFileSync(R(file), "utf8"))(w); return w[key]; };
const DEMOS = load("play-demos.js", "PLAY_DEMOS");
const GAMES = load("play-games.js", "PLAY_GAMES");
const CI = (() => { const w = {}; new Function("window", readFileSync(R("concepts-index.js"), "utf8"))(w); return w; })();
const TAGS = CI.CONCEPT_TAGS || {};
const INDEX = CI.CONCEPTS_INDEX || {};

const vite = readFileSync(R("vite.config.mjs"), "utf8");
const search = readFileSync(R("public/search-index.js"), "utf8");

let problems = 0;
const bad = (m) => { console.log("  ✗ " + m); problems++; };

function audit(name, reg, dir, pageDir, listKey) {
  console.log(`\n=== ${name} ===`);
  const entries = reg[listKey];
  const slugs = entries.map((d) => d.slug);
  console.log(`registry entries: ${entries.length}`);

  // 1. duplicate slugs in the registry
  const seen = new Set();
  for (const s of slugs) { if (seen.has(s)) bad(`duplicate registry slug: ${s}`); seen.add(s); }

  // 2. every registry entry needs a .jsx, a page, a vite input, a search entry
  for (const d of entries) {
    if (!existsSync(R(`${dir}/${d.slug}.jsx`))) bad(`${d.slug}: registry entry but no ${dir}/${d.slug}.jsx`);
    if (!existsSync(R(`${pageDir}/${d.slug}/index.html`))) bad(`${d.slug}: no page at ${pageDir}/${d.slug}/`);
    if (!vite.includes(`${pageDir}/${d.slug}/index.html`)) bad(`${d.slug}: not a vite rollup input`);
    if (!search.includes(`${pageDir}/${d.slug}/`)) bad(`${d.slug}: not in search-index.js (unreachable from Ctrl-K)`);
  }

  // 3. the reverse — orphans on disk that the registry does not know about
  for (const f of readdirSync(R(dir))) {
    if (!f.endsWith(".jsx")) continue;
    const s = f.replace(/\.jsx$/, "");
    if (!seen.has(s)) bad(`${dir}/${f} exists but is NOT in the registry (orphan, unreachable)`);
  }
  for (const f of readdirSync(R(pageDir), { withFileTypes: true })) {
    if (!f.isDirectory()) continue;
    if (!seen.has(f.name)) bad(`${pageDir}/${f.name}/ exists but is NOT in the registry`);
  }

  // 4. every slug must appear in exactly one category's slug list
  const cats = reg.categories || [];
  const inCat = {};
  for (const c of cats) for (const s of (c.slugs || [])) inCat[s] = (inCat[s] || 0) + 1;
  for (const s of slugs) {
    if (!inCat[s]) bad(`${s}: in the registry but in NO category (invisible on the hub)`);
    else if (inCat[s] > 1) bad(`${s}: listed in ${inCat[s]} categories`);
  }
  for (const s of Object.keys(inCat)) if (!seen.has(s)) bad(`category lists "${s}" which is not a registry entry`);

  // 5. required registry fields
  for (const d of entries) {
    for (const k of ["slug", "title", "blurb", "status"]) if (!d[k]) bad(`${d.slug}: missing registry field "${k}"`);
    if (d.title && d.title.length > 60) bad(`${d.slug}: title ${d.title.length} chars (hub cards truncate)`);
  }

  // 6. duplicate titles / blurbs
  const t = new Map(), b = new Map();
  for (const d of entries) {
    if (t.has(d.title)) bad(`duplicate title "${d.title}": ${d.slug} and ${t.get(d.title)}`); else t.set(d.title, d.slug);
    if (b.has(d.blurb)) bad(`duplicate blurb: ${d.slug} and ${b.get(d.blurb)}`); else b.set(d.blurb, d.slug);
  }

  // 7. every `lesson` path must point at a page that exists. This is the "READ THE LESSON"
  //    destination; a demo without one falls back to the 25-module hub, which is fine and
  //    deliberate for a demo that several lessons share. A lesson path that no longer resolves
  //    is NOT fine — it is a dead link, and 174 of these are now set, so a single renamed
  //    lesson would break a lot of them silently. Checked against source, so it runs before
  //    a build too: a concept page lives at learn/<module>/<slug>/.
  let linked = 0;
  for (const d of entries) {
    if (!d.lesson) continue;
    linked++;
    const rel = String(d.lesson).replace(/^\/+/, "").replace(/\/+$/, "");
    const parts = rel.split("/");
    const built = existsSync(join(ROOT, "dist", rel, "index.html"));
    const authored = existsSync(join(ROOT, rel, "index.html"));
    if (!built && !authored) bad(`${d.slug}: lesson "${d.lesson}" has no page (READ THE LESSON would 404)`);
    else if (parts[0] !== "learn") bad(`${d.slug}: lesson "${d.lesson}" is not under learn/`);
  }

  // 8. the concept slice each page loads instead of the whole 119 kB index.
  //    demo-slices/<kind>/<slug>.js is GENERATED, but the page that loads it is
  //    hand-authored, so nothing else would notice a page reverting to the full index,
  //    a slice going stale, or -- the defect that prompted this check -- a demo shipping
  //    with NO concept tags at all, which renders an empty Connections panel silently.
  let sliced = 0, tagged = 0;
  for (const d of entries) {
    const ids = (TAGS[listKey] || {})[d.slug];
    if (!ids || !ids.length) { bad(`${d.slug}: no CONCEPT_TAGS.${listKey} entry (Connections panel renders empty)`); }
    else {
      tagged++;
      for (const id of ids) if (!INDEX[id]) bad(`${d.slug}: CONCEPT_TAGS id "${id}" is not a concept`);
    }
    const sp = `demo-slices/${listKey}/${d.slug}.js`;
    if (!existsSync(R(sp))) { bad(`${d.slug}: no ${sp} (run scripts/gen-demo-slices.mjs)`); continue; }
    sliced++;
    const page = readFileSync(R(`${pageDir}/${d.slug}/index.html`), "utf8");
    if (page.includes("concepts-index.js")) bad(`${d.slug}: page still loads the FULL concepts-index.js`);
    if (!page.includes(sp.split("/").slice(-3).join("/"))) bad(`${d.slug}: page does not load ${sp}`);
    const w = {}; new Function("window", readFileSync(R(sp), "utf8"))(w);
    const got = ((w.CONCEPT_TAGS || {})[listKey] || {})[d.slug] || [];
    if (JSON.stringify(got) !== JSON.stringify(ids || [])) bad(`${d.slug}: slice tags stale -- regenerate`);
    for (const id of ids || []) if (!(w.CONCEPTS_INDEX || {})[id]) bad(`${d.slug}: slice missing concept "${id}"`);
  }
  console.log(`  concept slices: ${sliced}/${entries.length}   tagged: ${tagged}/${entries.length}`);

  const statuses = {};
  for (const d of entries) statuses[d.status] = (statuses[d.status] || 0) + 1;
  console.log(`  status: ${Object.entries(statuses).map(([k, v]) => `${k} ${v}`).join(", ")}`);
  console.log(`  categories: ${cats.length}   lesson links: ${linked}/${entries.length}`);
}

audit("VISUALIZE demos", DEMOS, "demos", "visualize", "demos");
audit("PLAY games", GAMES, "games", "play", "games");

if (problems) { console.log(`\nISSUES: ${problems}`); process.exit(1); }
console.log("\nOK — registry, .jsx, page, vite input and search index all agree.");
