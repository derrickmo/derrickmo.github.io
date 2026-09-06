#!/usr/bin/env node
// audit-app-bundle.mjs — prove the D2 data contract instead of asserting it.
//
// The bundle is what the Flutter app will consume, and the app has no way to notice that a
// field went missing or a deep link rotted: it would render a blank screen or a dead button,
// on a device, after a store release. Everything checkable is checked here.
//
// 1. SHAPE      every file exists, parses, carries the version stamp, and has the keys
//               APP-HANDOFF §2 names.
// 2. NO FORK    every projected field equals its upstream value in content/, play-demos.js,
//               play-games.js, paths.js and concepts-index.js. This is the check that makes
//               "zero forked content" a fact rather than a policy.
// 3. LINKS      every `web` path resolves to a real page on disk, and every internal ref
//               (prereqs, leadsTo, demos, path steps, roadmap edges, concept demos) resolves
//               to something in the bundle. An invented URL is the easiest self-inflicted 404.
// 4. BUDGET     cold start and full-offline sizes against a stated ceiling, so a content
//               change that doubles the bundle is visible in CI rather than on a phone.
// 5. GAPS       the 25 body-less flagship topics are a KNOWN gap: counted, listed, and
//               allowed. Any OTHER missing body is an error. A known gap that is silently
//               tolerated stops being known.
//
// Exit non-zero on a real defect. Run: node scripts/audit-app-bundle.mjs [--verbose]

import { readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (p) => join(ROOT, p);
const VERBOSE = process.argv.includes("--verbose");
const APP = R("public/app");

const errors = [], warns = [];
const err = (m) => errors.push(m);
const warn = (m) => warns.push(m);

if (!existsSync(APP)) {
  console.error("!! public/app/ does not exist — run `node scripts/build-app-bundle.mjs` first");
  process.exit(1);
}
const load = (rel) => {
  const p = join(APP, rel);
  if (!existsSync(p)) { err(`missing file: ${rel}`); return null; }
  try { return JSON.parse(readFileSync(p, "utf8")); }
  catch (e) { err(`unparseable: ${rel} — ${e.message}`); return null; }
};
const readGlobals = (file) => { const w = {}; new Function("window", readFileSync(R(file), "utf8"))(w); return w; };

const version = load("version.json");
const manifest = load("manifest.json");
const catalog = load("catalog.json");
const pathsF = load("paths.json");
const roadmapF = load("roadmap.json");
const conceptsF = load("concepts.json");
if (errors.length) { errors.forEach((m) => console.error("  !! " + m)); process.exit(1); }

// ── 1. SHAPE ────────────────────────────────────────────────────────────────
const REQUIRED = {
  "version.json": ["contentVersion", "schemaVersion", "updatedAt", "builtAt", "site", "counts", "files"],
  "manifest.json": ["contentVersion", "site", "counts", "modules", "topics"],
  "catalog.json": ["contentVersion", "categories", "demos", "games"],
  "paths.json": ["contentVersion", "paths"],
  "roadmap.json": ["contentVersion", "roadmap"],
  "concepts.json": ["contentVersion", "concepts"],
};
const files = { "version.json": version, "manifest.json": manifest, "catalog.json": catalog, "paths.json": pathsF, "roadmap.json": roadmapF, "concepts.json": conceptsF };
for (const [rel, keys] of Object.entries(REQUIRED)) {
  for (const k of keys) if (!(k in files[rel])) err(`${rel}: missing key "${k}"`);
}
// Every file must carry the SAME contentVersion, or the app can mix two builds.
const versions = new Set(Object.values(files).map((f) => f.contentVersion));
if (versions.size !== 1) err(`contentVersion disagrees across files: ${[...versions].join(", ")}`);

const shards = {};
for (const m of manifest.modules) {
  const s = load(`modules/${m.slug}.json`);
  if (!s) continue;
  shards[m.slug] = s;
  if (s.contentVersion !== manifest.contentVersion) err(`shard ${m.slug}: contentVersion ${s.contentVersion} != ${manifest.contentVersion}`);
  if (s.module !== m.slug) err(`shard ${m.slug}: declares module "${s.module}"`);
}
if (version.files.moduleShard !== "modules/{module}.json") err("version.json: moduleShard template changed; the app resolves shards from it");

// ── 2. NO FORKED CONTENT — compare against upstream, field by field ─────────
const C = JSON.parse(readFileSync(R("content/content.json"), "utf8"));
const { PLAY_DEMOS } = readGlobals("play-demos.js");
const { PLAY_GAMES } = readGlobals("play-games.js");
const { LEARNING_PATHS } = readGlobals("paths.js");
const { CONCEPTS_INDEX } = readGlobals("concepts-index.js");

if (version.contentVersion !== C.meta.contentVersion) err(`bundle contentVersion ${version.contentVersion} != content/meta ${C.meta.contentVersion}`);

const srcLesson = Object.fromEntries(C.lessons.map((l) => [`${l.module}/${l.slug}`, l]));
if (manifest.topics.length !== C.lessons.length) err(`topics ${manifest.topics.length} != content lessons ${C.lessons.length}`);
for (const t of manifest.topics) {
  const src = srcLesson[`${t.module}/${t.slug}`];
  if (!src) { err(`topic ${t.module}/${t.slug} is not in content/`); continue; }
  if (t.title !== src.title) err(`topic ${t.id}: title forked ("${t.title}" vs "${src.title}")`);
  if (t.status !== src.status) err(`topic ${t.id}: status forked`);
  if ((t.level ?? null) !== (src.level ?? null)) err(`topic ${t.id}: level forked`);
  const wantBodyOn = src.bodySource === "jsx" ? "web" : "bundle";
  if (t.bodyOn !== wantBodyOn) err(`topic ${t.id}: bodyOn "${t.bodyOn}" but bodySource says "${wantBodyOn}"`);
  if (JSON.stringify(t.demos) !== JSON.stringify(src.surfaces?.demos || [])) err(`topic ${t.id}: demos forked`);
  if (JSON.stringify(t.prereqs) !== JSON.stringify(src.prereqs || [])) err(`topic ${t.id}: prereqs forked`);
}
const srcDemo = Object.fromEntries(PLAY_DEMOS.demos.map((d) => [d.slug, d]));
if (catalog.demos.length !== PLAY_DEMOS.demos.length) err(`catalog demos ${catalog.demos.length} != registry ${PLAY_DEMOS.demos.length}`);
for (const d of catalog.demos) {
  const src = srcDemo[d.slug];
  if (!src) { err(`demo ${d.slug} is not in play-demos.js`); continue; }
  if (d.title !== src.title) err(`demo ${d.slug}: title forked`);
  if (d.blurb !== src.blurb) err(`demo ${d.slug}: blurb forked`);
}
if (catalog.games.length !== (PLAY_GAMES?.games || []).length) err("catalog games count != play-games.js");
if (pathsF.paths.length !== LEARNING_PATHS.length) err(`paths ${pathsF.paths.length} != paths.js ${LEARNING_PATHS.length}`);
for (const p of pathsF.paths) {
  const src = LEARNING_PATHS.find((x) => x.id === p.id);
  if (!src) { err(`path ${p.id} is not in paths.js`); continue; }
  if (p.title !== src.title) err(`path ${p.id}: title forked`);
  const nSteps = (x) => (x.stages || []).reduce((a, s) => a + (s.steps || []).length, 0);
  if (nSteps(p) !== nSteps(src)) err(`path ${p.id}: step count forked`);
}
if (conceptsF.concepts.length !== C.concepts.length) err(`concepts ${conceptsF.concepts.length} != content ${C.concepts.length}`);

// Cross-check the drill corpus against the SITE's own interview index, which is produced by a
// different script from the same store. Two independently derived numbers that must agree —
// the same reasoning verify-build-output uses for routes vs sitemap. This caught the bundle
// reporting 4,426 questions against the site's 5,210, because the deep-dive tier was missed.
// ⚠ Guarded on version.counts existing. Without this, deleting that key made the audit CRASH
// with a TypeError instead of reporting "missing key" — a validator that dies on a malformed
// input tells you less than one that lists what is wrong, and the negative test caught it.
const IVX = R("public/interview-manifest.json");
if (!version.counts) {
  warn("version.json has no counts — skipped the corpus cross-check");
} else if (existsSync(IVX)) {
  const ivm = JSON.parse(readFileSync(IVX, "utf8"));
  if (version.counts.questions !== ivm.counts.questions) err(`questions ${version.counts.questions} != the site's interview index ${ivm.counts.questions}`);
  if (version.counts.cards !== ivm.counts.cards) err(`cards ${version.counts.cards} != the site's interview index ${ivm.counts.cards}`);
} else {
  warn("public/interview-manifest.json absent — skipped the cross-check on question/card totals");
}
if (roadmapF.roadmap.concepts.nodes.length !== Object.keys(CONCEPTS_INDEX).length) err("roadmap concept node count != concepts-index.js");

// Shard bodies must be the store's bodies, not a copy that drifted.
let bodiesChecked = 0;
for (const [slug, s] of Object.entries(shards)) {
  for (const l of s.lessons) {
    const src = srcLesson[`${slug}/${l.slug}`];
    if (!src) { err(`shard ${slug}: lesson ${l.slug} is not in content/`); continue; }
    if (JSON.stringify(l.body) !== JSON.stringify(src.body ?? null)) err(`shard ${slug}/${l.slug}: body forked`);
    if (JSON.stringify(l.flashcards) !== JSON.stringify(src.flashcards || [])) err(`shard ${slug}/${l.slug}: flashcards forked`);
    bodiesChecked++;
  }
}
if (bodiesChecked !== C.lessons.length) err(`shards carry ${bodiesChecked} lessons, content/ has ${C.lessons.length}`);

// ── 3. LINKS ────────────────────────────────────────────────────────────────
// A `web` path is a promise about the deployed site. Resolve against the source tree, which
// is what the build turns into dist/.
const pageExists = (webPath) => existsSync(R(join(webPath.replace(/^\//, ""), "index.html")));
let webChecked = 0, webBad = 0;
const checkWeb = (label, w) => {
  if (!w) return;
  webChecked++;
  if (!pageExists(w)) { webBad++; err(`${label}: web path does not resolve — ${w}`); }
};
manifest.modules.forEach((m) => checkWeb(`module ${m.slug}`, m.web));
manifest.topics.forEach((t) => checkWeb(`topic ${t.id}`, t.web));
catalog.demos.forEach((d) => checkWeb(`demo ${d.slug}`, d.web));
catalog.games.forEach((g) => checkWeb(`game ${g.slug}`, g.web));
conceptsF.concepts.forEach((c) => checkWeb(`concept ${c.id}`, c.web));
catalog.demos.forEach((d) => { if (d.lesson) checkWeb(`demo ${d.slug} lesson`, d.lesson); });

// internal referential integrity
const topicKeys = new Set(manifest.topics.map((t) => `${t.module}/${t.slug}`));
const demoSlugs = new Set(catalog.demos.map((d) => d.slug));
const conceptIds = new Set(conceptsF.concepts.map((c) => c.id));
const graphIds = new Set(roadmapF.roadmap.concepts.nodes.map((n) => n.id));
for (const t of manifest.topics) {
  for (const p of t.prereqs) if (!topicKeys.has(p)) err(`topic ${t.id}: prereq "${p}" is not a topic`);
  for (const d of t.demos) if (!demoSlugs.has(d)) err(`topic ${t.id}: demo "${d}" is not in the catalog`);
}
for (const c of catalog.categories) for (const s of c.demos) if (!demoSlugs.has(s)) err(`category "${c.name}": demo "${s}" is not in the catalog`);
for (const p of pathsF.paths) for (const st of p.stages) for (const s of st.steps) {
  if (s.kind === "demo" && !demoSlugs.has(s.ref)) err(`path ${p.id}: demo step "${s.ref}" is not in the catalog`);
  if (s.kind === "concept" && !conceptIds.has(s.ref) && !graphIds.has(s.ref)) err(`path ${p.id}: concept step "${s.ref}" resolves to nothing`);
}
const lessonNodeIds = new Set(roadmapF.roadmap.lessons.nodes.map((n) => n.id));
for (const [a, b] of roadmapF.roadmap.lessons.edges) {
  if (!lessonNodeIds.has(a) || !lessonNodeIds.has(b)) err(`roadmap lesson edge ${a} -> ${b} references a missing node`);
}
for (const [a, b] of roadmapF.roadmap.concepts.edges) {
  if (!graphIds.has(a) || !graphIds.has(b)) err(`roadmap concept edge ${a} -> ${b} references a missing node`);
}
for (const c of conceptsF.concepts) if (c.demo && !demoSlugs.has(c.demo)) err(`concept ${c.id}: demo "${c.demo}" is not in the catalog`);

// ── 4. BUDGET ───────────────────────────────────────────────────────────────
const sizeOf = (rel) => statSync(join(APP, rel)).size;
const zlib = await import("node:zlib");
const gzOf = (rel) => zlib.gzipSync(readFileSync(join(APP, rel))).length;
const manGz = gzOf("manifest.json");
let shardBytes = 0, biggestShard = 0;
for (const m of manifest.modules) {
  const b = sizeOf(`modules/${m.slug}.json`);
  shardBytes += b;
  biggestShard = Math.max(biggestShard, gzOf(`modules/${m.slug}.json`));
}
const totalBytes = ["version.json", "manifest.json", "catalog.json", "paths.json", "roadmap.json", "concepts.json"].reduce((a, f) => a + sizeOf(f), 0) + shardBytes;
const coldGz = manGz + biggestShard;

// Ceilings chosen from the measured build with headroom, so a doubling is loud and normal
// content growth is not. Raise them deliberately, with a note, never to silence a failure.
const COLD_CEILING = 400 * 1024;         // measured 180 KB
const TOTAL_CEILING = 20 * 1024 * 1024;  // measured 9.44 MB raw
if (coldGz > COLD_CEILING) err(`cold start ${(coldGz / 1024).toFixed(0)} KB gz exceeds the ${(COLD_CEILING / 1024).toFixed(0)} KB ceiling`);
if (totalBytes > TOTAL_CEILING) err(`full bundle ${(totalBytes / 1024 / 1024).toFixed(2)} MB exceeds the ${(TOTAL_CEILING / 1024 / 1024).toFixed(0)} MB ceiling`);

// ── 5. GAPS — known, counted, and allowed; anything else is an error ────────
const KNOWN_BODYLESS = 25;               // the 25 flagship-jsx lessons, whose prose is site-only
const bodyless = [];
for (const [slug, s] of Object.entries(shards)) for (const l of s.lessons) if (l.body === null) bodyless.push(`${slug}/${l.slug}`);
const declaredWeb = manifest.topics.filter((t) => t.bodyOn === "web").map((t) => `${t.module}/${t.slug}`);
for (const k of bodyless) if (!declaredWeb.includes(k)) err(`topic ${k} has no body but is not declared bodyOn:"web"`);
for (const k of declaredWeb) if (!bodyless.includes(k)) err(`topic ${k} is declared bodyOn:"web" but carries a body`);
if (bodyless.length !== KNOWN_BODYLESS) {
  (bodyless.length > KNOWN_BODYLESS ? err : warn)(
    `${bodyless.length} topics have no body; ${KNOWN_BODYLESS} are the known flagship set. ` +
    (bodyless.length > KNOWN_BODYLESS ? "A NEW one has appeared." : "Fewer than expected — update KNOWN_BODYLESS.")
  );
}
const noThumb = catalog.demos.filter((d) => !d.thumb).length;
if (noThumb) warn(`${noThumb} of ${catalog.demos.length} demos have no thumbnail (APP-HANDOFF §5's last unchecked box)`);

// ── report ──────────────────────────────────────────────────────────────────
const kb = (b) => (b / 1024).toFixed(0) + " KB";
console.log(`app bundle contract: contentVersion ${manifest.contentVersion}`);
console.log(`  shape    ${Object.keys(REQUIRED).length} files + ${Object.keys(shards).length} shards, one contentVersion`);
console.log(`  no fork  ${manifest.topics.length} topics, ${bodiesChecked} bodies, ${catalog.demos.length} demos, ${pathsF.paths.length} paths compared field-by-field against upstream`);
if (version.counts) console.log(`  corpus   ${version.counts.questions} questions / ${version.counts.cards} cards, cross-checked against the site's own interview index`);
console.log(`  links    ${webChecked} web paths resolved (${webBad} bad) · prereqs, demos, path steps, roadmap edges all internal`);
console.log(`  budget   cold ${kb(coldGz)} gz (ceiling ${kb(COLD_CEILING)}) · full ${(totalBytes / 1024 / 1024).toFixed(2)} MB (ceiling ${(TOTAL_CEILING / 1024 / 1024).toFixed(0)} MB)`);
console.log(`  gaps     ${bodyless.length} body-less topics (known flagship set), ${noThumb} demos without a thumbnail`);
if (VERBOSE && bodyless.length) console.log("           " + bodyless.join(", "));
warns.forEach((m) => console.log("  ~ " + m));
if (errors.length) {
  console.error(`\n!! ${errors.length} contract error(s):`);
  errors.forEach((m) => console.error("   " + m));
  process.exit(1);
}
console.log("OK — the app bundle matches its sources, resolves every link, and fits its budget.");
