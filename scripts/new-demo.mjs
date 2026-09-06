#!/usr/bin/env node
// new-demo.mjs — do the mechanical wiring for a new Visualize demo.
//
// Adding a demo is a 9-touchpoint manual procedure whose five lists must agree, and
// audit-demos.mjs exists precisely because they drift. Doing it by hand 13 times to close C3
// is 13 chances to miss one, so this does the boring 8 and leaves the actual demo to a human:
// you write demos/<slug>.jsx yourself, then run this.
//
//   node scripts/new-demo.mjs --slug broadcasting --title "Broadcasting" \
//        --topic TENSORS --category "Tensors & Numerics" \
//        --lesson learn/foundations/advanced-numpy-pytorch/ \
//        --blurb "..." --kw "..." --tags "batch-norm,mlp" [--tone blue]
//
// Idempotent: re-running for an existing slug reports what is already wired and changes nothing.
// It refuses to invent a concept id or point at a lesson that does not exist — both are things
// audit-demos would catch later, and catching them here is cheaper.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (p) => join(ROOT, p);

const arg = (name, dflt) => {
  const i = process.argv.indexOf("--" + name);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
};
const slug = arg("slug"), title = arg("title"), topic = arg("topic");
const category = arg("category"), lesson = arg("lesson"), blurb = arg("blurb");
const kw = arg("kw", ""), tone = arg("tone", "blue");
const tags = arg("tags", "").split(",").map((s) => s.trim()).filter(Boolean);
const TEMPLATE = arg("from", "cross-entropy");

if (!slug || !title || !blurb || !category) {
  console.error("need --slug --title --blurb --category (see header for the full form)");
  process.exit(2);
}

const load = (f, k) => { const w = {}; new Function("window", readFileSync(R(f), "utf8"))(w); return w[k]; };

// ── refuse to wire something that would fail the audit later ─────────────────
const CI = (() => { const w = {}; new Function("window", readFileSync(R("concepts-index.js"), "utf8"))(w); return w; })();
const badTags = tags.filter((t) => !CI.CONCEPTS_INDEX[t]);
if (badTags.length) { console.error(`! not concept ids: ${badTags.join(", ")}`); process.exit(1); }
if (!tags.length) { console.error("! --tags is required: an untagged demo renders an empty Connections panel"); process.exit(1); }
if (lesson && !existsSync(R(lesson)) && !existsSync(R(join("dist", lesson)))) {
  console.error(`! lesson path does not exist: ${lesson}`); process.exit(1);
}
if (!existsSync(R(`demos/${slug}.jsx`))) {
  console.error(`! write demos/${slug}.jsx first — this script wires, it does not author`); process.exit(1);
}

const done = [], skipped = [];

// 1. the page, cloned from a sibling
const pagePath = R(`visualize/${slug}/index.html`);
if (existsSync(pagePath)) skipped.push("page");
else {
  let html = readFileSync(R(`visualize/${TEMPLATE}/index.html`), "utf8");
  const tpl = load("play-demos.js", "PLAY_DEMOS").demos.find((d) => d.slug === TEMPLATE);
  html = html.split(`${tpl.title} | Visualize - Derrick Mo`).join(`${title} | Visualize - Derrick Mo`);
  // ⚠ Take the description FROM THE PAGE, not from the registry blurb. They are allowed to
  // differ (cross-entropy's do), and matching on the blurb silently left the template's
  // description — and its slug inside that prose — in the new page. The survivor check caught it.
  const descMatch = html.match(/<meta name="description" content="([^"]*)"/);
  if (!descMatch) { console.error("! template page has no meta description"); process.exit(1); }
  html = html.split(descMatch[1]).join(blurb);
  html = html.split(`visualize/${TEMPLATE}/`).join(`visualize/${slug}/`);
  html = html.split(`__DM_DEMO_SLUG = "${TEMPLATE}"`).join(`__DM_DEMO_SLUG = "${slug}"`);
  html = html.split(`tag-slices/demos/${TEMPLATE}.js`).join(`tag-slices/demos/${slug}.js`);
  html = html.split(`demos/${TEMPLATE}.jsx`).join(`demos/${slug}.jsx`);
  if (html.includes(TEMPLATE)) { console.error(`! a '${TEMPLATE}' reference survived in the new page`); process.exit(1); }
  mkdirSync(dirname(pagePath), { recursive: true });
  writeFileSync(pagePath, html, "utf8"); done.push("page");
}

// 2. registry entry + 3. category slug list
let reg = readFileSync(R("play-demos.js"), "utf8");
if (reg.includes(`slug: "${slug}",`)) skipped.push("registry");
else {
  const anchor = `    { slug: "${TEMPLATE}",`;
  const entry = `    { slug: "${slug}", topic: "${topic}", title: "${title}", tone: "${tone}", status: "LIVE",\n` +
                `      blurb: "${blurb}", lesson: "${lesson}" },\n`;
  reg = reg.replace(anchor, entry + anchor); done.push("registry");
}
if (new RegExp(`name: "${category.replace(/[&]/g, "\\&")}"[^}]*"${slug}"`).test(reg)) skipped.push("category");
else {
  const m = reg.match(new RegExp(`(\\{ name: "${category.replace(/[&]/g, "\\&")}"[\\s\\S]*?slugs: \\[)`));
  if (!m) { console.error(`! category not found: ${category}`); process.exit(1); }
  reg = reg.replace(m[1], `${m[1]}"${slug}", `); done.push("category");
}
writeFileSync(R("play-demos.js"), reg, "utf8");

// 4. vite input
let vite = readFileSync(R("vite.config.mjs"), "utf8");
if (vite.includes(`'visualize-${slug}'`)) skipped.push("vite");
else {
  const line = vite.split("\n").find((l) => l.includes(`'visualize-${TEMPLATE}':`));
  vite = vite.replace(line, line.split(TEMPLATE).join(slug) + "\n" + line);
  writeFileSync(R("vite.config.mjs"), vite, "utf8"); done.push("vite");
}

// 5. search index
let si = readFileSync(R("public/search-index.js"), "utf8");
if (si.includes(`"/visualize/${slug}/"`)) skipped.push("search");
else {
  const line = si.split("\n").find((l) => l.includes(`"/visualize/${TEMPLATE}/"`));
  const fresh = `  { label: "${title}", group: "Demo", href: "/visualize/${slug}/", kw: "${kw}" },`;
  si = si.replace(line, fresh + "\n" + line);
  writeFileSync(R("public/search-index.js"), si, "utf8"); done.push("search");
}

// 6. CONCEPT_TAGS — the 9th touchpoint, added 2026-08-30 after 8 demos shipped untagged
let ci = readFileSync(R("concepts-index.js"), "utf8");
if (new RegExp(`^\\s*"${slug}":`, "m").test(ci)) skipped.push("tags");
else {
  const anchor = `    "${TEMPLATE}":`;
  const i = ci.indexOf(anchor);
  if (i < 0) { console.error("! could not find a CONCEPT_TAGS anchor"); process.exit(1); }
  const row = `    "${slug}": ${JSON.stringify(tags)},\n`;
  ci = ci.slice(0, i) + row + ci.slice(i);
  writeFileSync(R("concepts-index.js"), ci, "utf8"); done.push("tags");
}

console.log(`${slug}: wired [${done.join(", ") || "nothing new"}]${skipped.length ? `  already had [${skipped.join(", ")}]` : ""}`);
console.log("  next: node scripts/gen-tag-slices.mjs && npm run build && node scripts/gen-sitemap.mjs && npm run build");
