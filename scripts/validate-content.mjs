// validate-content.mjs — validate the canonical content store (content/) against
// schema v1 (content/SCHEMA.md) and the live site registries.
// Run: node scripts/validate-content.mjs        (exit 0 = green)
// Green validator = shippable. Required before generation (A5) or any release.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { resolve, dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STORE = join(ROOT, "content");
// Local notebooks repo. Not present on CI or a fresh clone, so every check against it
// is best-effort; override with DM_NOTEBOOKS_REPO when it lives elsewhere.
const NB_REPO = process.env.DM_NOTEBOOKS_REPO || "C:/Users/Derrick/Desktop/Github/Machine Learning Tutorial";

// ── load the live registries (same trick as validate-paths.mjs) ─────────────
const win = {};
const fakeLS = { getItem: () => null, setItem: () => {} };
const load = (f) => { const txt = readFileSync(resolve(ROOT, f), "utf8"); new Function("window", "localStorage", txt)(win, fakeLS); };
["concepts-index.js", "play-demos.js", "curriculum.js", "lectures.js", "sub-lessons.js"].forEach(load);

const CURR = win.CURRICULUM;
const DEMO_SLUGS = new Set(win.PLAY_DEMOS.demos.map(d => d.slug));
const CONCEPT_IDS = new Set(Object.keys(win.CONCEPTS_INDEX));
const SUB = win.SUB_LESSONS || {};
const MOD_BY_SLUG = Object.fromEntries(CURR.modules.map(m => [m.slug, m]));
const TRACKS = new Set(CURR.modules.map(m => m.category));

const STATUSES = new Set(["PENDING", "DRAFT", "LIVE"]);
const LEVELS = new Set(["intro", "core", "advanced"]);
const CARD_TYPES = new Set(["definition", "formula", "intuition", "pitfall"]);

let errors = 0, warnings = 0, files = 0;
// CA-0005: deepDive must be {q,a}. 288 entries in five modules still ship a bare
// string, which the renderer now tolerates but which is off-schema. Counted as a
// tracked debt rather than a warning so the warning channel stays empty and any
// real warning is signal; pass --strict-deepdive (or set it as the default once the
// data migration lands) to make it an error.
const STRICT_DEEPDIVE = process.argv.includes("--strict-deepdive");
let legacyDeepDive = 0;
const err = (f, msg) => { console.log(`  ✗ ${f}: ${msg}`); errors++; };
const warn = (f, msg) => { console.log(`  ⚠ ${f}: ${msg}`); warnings++; };

const isStr = (v) => typeof v === "string" && v.length > 0;
const isArr = (v) => Array.isArray(v);
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || "");
const kebab = (v) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v || "");

function readJson(path, rel) {
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch (e) { err(rel, `invalid JSON — ${e.message}`); return null; }
}
function listJson(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...listJson(p));
    else if (e.endsWith(".json")) out.push(p);
  }
  return out;
}
const relOf = (p) => p.slice(STORE.length + 1).replace(/\\/g, "/");

function common(o, f, kind) {
  if (o.kind !== kind) err(f, `kind must be "${kind}", got "${o.kind}"`);
  if (o.schemaVersion !== 1) err(f, `schemaVersion must be 1`);
  if (!isDate(o.updatedAt)) err(f, `updatedAt must be YYYY-MM-DD`);
  if (o.status !== undefined && !STATUSES.has(o.status)) err(f, `bad status "${o.status}"`);
}

// ── meta.json ────────────────────────────────────────────────────────────────
if (!existsSync(STORE)) { console.log("content/ does not exist — nothing to validate."); process.exit(1); }
{
  const f = "meta.json";
  const meta = existsSync(join(STORE, f)) ? readJson(join(STORE, f), f) : (err(f, "missing"), null);
  if (meta) {
    files++;
    if (meta.schemaVersion !== 1) err(f, "schemaVersion must be 1");
    if (!isStr(meta.contentVersion)) err(f, "contentVersion required");
    if (!isDate(meta.updatedAt)) err(f, "updatedAt must be YYYY-MM-DD");
  }
}

// ── modules/*.json ───────────────────────────────────────────────────────────
const seenModules = new Map();
for (const p of listJson(join(STORE, "modules"))) {
  const f = relOf(p); files++;
  const o = readJson(p, f); if (!o) continue;
  common(o, f, "module");
  if (!isStr(o.slug) || !kebab(o.slug)) err(f, `bad slug "${o.slug}"`);
  if (basename(p, ".json") !== o.slug) err(f, `filename must equal slug "${o.slug}"`);
  if (seenModules.has(o.slug)) err(f, `duplicate module slug`);
  seenModules.set(o.slug, o);
  if (!/^\d{2}$/.test(o.n || "")) err(f, `n must be "NN"`);
  for (const k of ["title", "category", "blurb"]) if (!isStr(o[k])) err(f, `${k} required`);
  if (!STATUSES.has(o.status)) err(f, `status required`);
  // agreement with curriculum.js
  const cm = MOD_BY_SLUG[o.slug];
  if (!cm) err(f, `module slug not in curriculum.js`);
  else {
    if (cm.n !== o.n) err(f, `n "${o.n}" != curriculum.js "${cm.n}"`);
    if (cm.title !== o.title) err(f, `title differs from curriculum.js`);
    if (cm.category !== o.category) err(f, `category differs from curriculum.js`);
  }
  if (!TRACKS.has(o.category)) warn(f, `category "${o.category}" not among current tracks`);
  // lecture block
  const L = o.lecture;
  if (!L) err(f, "lecture block required");
  else {
    if (!isStr(L.summary)) err(f, "lecture.summary required");
    if (!isStr(L.prereqs)) err(f, "lecture.prereqs required");
    if (!isArr(L.takeaways) || L.takeaways.length < 3) err(f, "lecture.takeaways >= 3 required");
    if (!isArr(L.notebooks) || L.notebooks.length !== 10) err(f, "lecture.notebooks must have exactly 10 rows");
    else L.notebooks.forEach((nb, i) => {
      for (const k of ["n", "t", "d", "m"]) if (!isStr(nb[k])) err(f, `notebooks[${i}].${k} required`);
      const exp = `${o.n}-${String(i + 1).padStart(2, "0")}`;
      if (nb.n !== exp) err(f, `notebooks[${i}].n "${nb.n}" should be "${exp}"`);
    });
    if (L.flagships) L.flagships.forEach((fl, i) => {
      for (const k of ["n", "label", "href"]) if (!isStr(fl[k])) err(f, `flagships[${i}].${k} required`);
      if (fl.href && !existsSync(join(ROOT, fl.href, "index.html"))) err(f, `flagships[${i}].href "${fl.href}" does not resolve to a page`);
    });
  }
  if (!o.snippet || !isStr(o.snippet.caption) || !isStr(o.snippet.code)) err(f, "snippet {caption, code} required");
  // v1.1: per-module deep-link gate
  if (o.notebooksSynced !== undefined && typeof o.notebooksSynced !== "boolean") err(f, "notebooksSynced must be boolean when present");
  // subLessons wrapper
  if (o.subLessons) {
    const s = o.subLessons;
    if (!isStr(s.title) || !isStr(s.intro) || !isArr(s.order)) err(f, "subLessons {title, intro, order[]} malformed");
  }
}

// ── lessons/<module>/<slug>.json ────────────────────────────────────────────
const seenLessons = new Map(); // ref -> file
const lessonFiles = listJson(join(STORE, "lessons"));
const allRefs = new Set();
const parsedLessons = [];
for (const p of lessonFiles) {
  const f = relOf(p); files++;
  const o = readJson(p, f); if (!o) continue;
  parsedLessons.push([f, o]);
  if (isStr(o.module) && isStr(o.slug)) allRefs.add(`${o.module}/${o.slug}`);
}
for (const [f, o] of parsedLessons) {
  common(o, f, "lesson");
  if (!isStr(o.slug) || !kebab(o.slug)) err(f, `bad slug "${o.slug}"`);
  if (!/^\d{2}-\d{2}$/.test(o.id || "")) err(f, `id must be "NN-MM"`);
  if (!isStr(o.title)) err(f, "title required");
  if (!STATUSES.has(o.status)) err(f, "status required");
  const ref = `${o.module}/${o.slug}`;
  if (seenLessons.has(ref)) err(f, `duplicate lesson ref ${ref}`);
  seenLessons.set(ref, f);
  // path agreement: lessons/<module>/<slug>.json
  const parts = f.split("/");
  if (parts[1] !== o.module || parts[2] !== `${o.slug}.json`) err(f, `path must be lessons/${o.module}/${o.slug}.json`);
  // agreement with curriculum.js
  const cm = MOD_BY_SLUG[o.module];
  if (!cm) err(f, `module "${o.module}" not in curriculum.js`);
  else {
    const cl = cm.lessons.find(l => l.slug === o.slug);
    if (!cl) err(f, `lesson slug not in curriculum.js module "${o.module}"`);
    else {
      if (cl.n !== o.id) err(f, `id "${o.id}" != curriculum.js "${cl.n}"`);
      if (cl.title !== o.title) err(f, `title differs from curriculum.js`);
      if (cl.status !== o.status) warn(f, `status "${o.status}" differs from curriculum.js "${cl.status}" (curriculum.js wins until generators land)`);
    }
  }
  // surfaces
  const s = o.surfaces;
  if (!s) err(f, "surfaces block required");
  else {
    if (typeof s.notebook !== "boolean") err(f, "surfaces.notebook must be boolean");
    if (s.flagship !== null && s.flagship !== undefined && !existsSync(join(ROOT, s.flagship, "index.html"))) err(f, `surfaces.flagship "${s.flagship}" does not resolve to a page`);
    (s.demos || []).forEach(d => { if (!DEMO_SLUGS.has(d)) err(f, `surfaces.demos "${d}" not in play-demos.js`); });
    (s.concepts || []).forEach(c => { if (!CONCEPT_IDS.has(c)) warn(f, `surfaces.concepts "${c}" not in concepts-index.js`); });
    // v1.1: canonical notebook filename (optional; enables per-lesson deep links once the module is synced)
    if (s.notebookFile !== undefined) {
      if (!isStr(s.notebookFile) || !/^\d{2}-\d{2}_[a-z0-9_]+\.ipynb$/.test(s.notebookFile))
        err(f, `surfaces.notebookFile "${s.notebookFile}" must match NN-MM_snake_case.ipynb`);
      else if (!s.notebookFile.startsWith(o.id + "_"))
        err(f, `surfaces.notebookFile "${s.notebookFile}" prefix does not match lesson id "${o.id}"`);
      else if (existsSync(NB_REPO)) {
        const modDir = "module_" + o.id.slice(0, 2);
        if (!existsSync(join(NB_REPO, "modules", modDir, s.notebookFile)))
          warn(f, `surfaces.notebookFile "${s.notebookFile}" not found in local notebooks repo (${modDir})`);
      }
    }
  }
  // prereqs / leadsTo resolve (against store refs OR curriculum at large)
  const refOk = (r) => {
    if (allRefs.has(r)) return true;
    const [ms, ls] = (r || "").split("/");
    const m = MOD_BY_SLUG[ms];
    return !!(m && m.lessons.find(l => l.slug === ls));
  };
  (o.prereqs || []).forEach(r => { if (!refOk(r)) err(f, `prereq "${r}" does not resolve`); });
  (o.leadsTo || []).forEach(r => { if (!refOk(r)) err(f, `leadsTo "${r}" does not resolve`); });
  // bodySource transitional rule
  if (o.bodySource !== undefined && !["store", "jsx"].includes(o.bodySource)) err(f, `bad bodySource "${o.bodySource}"`);
  const legacyJsx = o.bodySource === "jsx";
  if (legacyJsx && !(s && isStr(s.flagship))) err(f, `bodySource "jsx" requires surfaces.flagship`);
  // LIVE minimums (waived for legacy-jsx flagship lessons until Phase C)
  if (o.status === "LIVE" && !legacyJsx) {
    if (!LEVELS.has(o.level)) err(f, `level required at LIVE`);
    const b = o.body;
    if (!b) err(f, "body required at LIVE");
    else {
      for (const k of ["intuition", "math", "code", "useCases", "pitfalls", "connections"])
        if (!isArr(b[k]) || b[k].length === 0) err(f, `body.${k} required (non-empty) at LIVE`);
      (b.math || []).forEach((m, i) => { if (!isStr(m.tex)) err(f, `body.math[${i}].tex required`); });
      (b.code || []).forEach((c, i) => { if (!isStr(c.code)) err(f, `body.code[${i}].code required`); });
      (b.connections || []).forEach((c, i) => { if (c.ref && !refOk(c.ref) && !CONCEPT_IDS.has(c.ref)) err(f, `body.connections[${i}].ref "${c.ref}" does not resolve`); });
    }
    const iv = o.interview;
    if (!iv) err(f, "interview required at LIVE");
    else {
      if (!isArr(iv.quickGrind) || iv.quickGrind.length < 10) err(f, "interview.quickGrind >= 10 at LIVE");
      if (!isArr(iv.standard) || iv.standard.length < 6) err(f, "interview.standard >= 6 at LIVE");
      [...(iv.quickGrind || []), ...(iv.standard || [])].forEach((qa, i) => { if (!isStr(qa.q) || !isStr(qa.a)) err(f, `interview entry ${i} needs {q, a}`); });
      (iv.standard || []).forEach((qa, i) => {
        if (qa.deepDive === undefined) return;
        if (isStr(qa.deepDive)) {
          legacyDeepDive++;
          if (STRICT_DEEPDIVE) err(f, `interview.standard[${i}].deepDive is a bare string, needs {q, a}`);
        } else if (!isStr(qa.deepDive.a)) err(f, `interview.standard[${i}].deepDive needs {q, a}`);
      });
    }
    if (!isArr(o.flashcards) || o.flashcards.length < 8) err(f, "flashcards >= 8 at LIVE");
    else o.flashcards.forEach((c, i) => {
      if (!CARD_TYPES.has(c.type)) err(f, `flashcards[${i}].type bad`);
      if (!isStr(c.front) || !isStr(c.back)) err(f, `flashcards[${i}] needs {front, back}`);
    });
    if (!isArr(o.refs) || o.refs.length === 0) warn(f, "refs empty at LIVE");
  }
  // Legacy-jsx lessons: the BODY is waived above (the flagship page owns it), but the
  // store may still supply a DRILL LAYER (interview + flashcards + refs) that the page
  // renders after the flagship's own parts. If one is present it must clear the SAME
  // bar as any other lesson — without this, a drill layer would be authored with
  // nothing checking it at all, which is exactly how 11 bad notebookFile values
  // survived for weeks (2026-08-15). Absent drill layer = still waived, no error.
  if (o.status === "LIVE" && legacyJsx) {
    const iv = o.interview || {};
    const cards = isArr(o.flashcards) ? o.flashcards : [];
    const drilled = !!((iv.quickGrind || []).length || (iv.standard || []).length || cards.length);
    if (drilled) {
      if (!isArr(iv.quickGrind) || iv.quickGrind.length < 10) err(f, "[drill] interview.quickGrind >= 10");
      if (!isArr(iv.standard) || iv.standard.length < 6) err(f, "[drill] interview.standard >= 6");
      [...(iv.quickGrind || []), ...(iv.standard || [])].forEach((qa, i) => {
        if (!isStr(qa.q) || !isStr(qa.a)) err(f, `[drill] interview entry ${i} needs {q, a}`);
      });
      if (cards.length < 8) err(f, "[drill] flashcards >= 8");
      cards.forEach((c, i) => {
        if (!CARD_TYPES.has(c.type)) err(f, `[drill] flashcards[${i}].type bad`);
        if (!isStr(c.front) || !isStr(c.back)) err(f, `[drill] flashcards[${i}] needs {front, back}`);
      });
      if (!isArr(o.refs) || o.refs.length === 0) warn(f, "[drill] refs empty");
    }
  }
}

// ── concepts/<module>/<id>.json ─────────────────────────────────────────────
const seenConcepts = new Set();
let supersededConcepts = 0;
for (const p of listJson(join(STORE, "concepts"))) {
  const f = relOf(p); files++;
  const o = readJson(p, f); if (!o) continue;
  common(o, f, "concept");
  if (!isStr(o.id) || !kebab(o.id)) err(f, `bad id "${o.id}"`);
  if (!isStr(o.module) || !MOD_BY_SLUG[o.module]) err(f, `module "${o.module}" not in curriculum.js`);
  const key = `${o.module}/${o.id}`;
  if (seenConcepts.has(key)) err(f, `duplicate concept ${key}`);
  seenConcepts.add(key);
  const parts = f.split("/");
  if (parts[1] !== o.module || parts[2] !== `${o.id}.json`) err(f, `path must be concepts/${o.module}/${o.id}.json`);
  for (const k of ["title", "oneLine"]) if (!isStr(o[k])) err(f, `${k} required`);
  if (!isArr(o.sections) || o.sections.length === 0) err(f, "sections required");
  else o.sections.forEach((s, i) => { if (!isStr(s.h)) err(f, `sections[${i}].h required`); });
  if (!isArr(o.takeaways) || o.takeaways.length === 0) err(f, "takeaways required");
  if (o.demo && !DEMO_SLUGS.has(o.demo)) err(f, `demo "${o.demo}" not in play-demos.js`);
  if (!CONCEPT_IDS.has(o.id)) warn(f, `id not in concepts-index.js (page may still exist via sub-lessons)`);
  // agreement with live sub-lessons.js while it is still hand-authored
  const sl = SUB[o.module] && SUB[o.module].lessons && SUB[o.module].lessons[o.id];
  if (!sl) {
    // A concept with no sub-lesson entry is NOT necessarily orphaned: under the
    // collision policy, a store lesson at the same module/slug supersedes the
    // taught sub-lesson at the shared learn/<module>/<slug>/ URL, and retiring the
    // collision is exactly what removes it from subLessons.order. Warning "new
    // content?" there is a wrong diagnosis, and 31 such warnings formed a noise
    // floor that hid 11 real notebookFile defects for weeks (see 2026-08-15).
    // Classify instead: superseded = intended and silent, no lesson = real orphan.
    if (seenLessons.has(`${o.module}/${o.id}`)) supersededConcepts++;
    else warn(f, `ORPHANED — no sub-lessons.js entry and no store lesson superseding it`);
  }
}

// ── coverage report (informational until A4 completes) ─────────────────────
const totalLessons = CURR.modules.reduce((a, m) => a + m.lessons.length, 0);
console.log(`\ncontent store: ${files} files checked`);
console.log(`  modules:  ${seenModules.size}/${CURR.modules.length} migrated`);
console.log(`  lessons:  ${seenLessons.size}/${totalLessons} migrated`);
const jsxDebt = parsedLessons.filter(([, o]) => o.bodySource === "jsx").length;
if (jsxDebt) console.log(`  legacy-jsx lessons (Phase-C debt): ${jsxDebt}`);
const subCount = Object.values(SUB).reduce((a, m) => a + Object.keys(m.lessons).length, 0);
console.log(`  concepts: ${seenConcepts.size}/${subCount} migrated` +
  (supersededConcepts ? ` (+${supersededConcepts} superseded by a store lesson — retired collisions, intended)` : ""));
if (legacyDeepDive) console.log(`  legacy string deepDive (CA-0005 debt, renders but off-schema): ${legacyDeepDive}`);
console.log(`errors: ${errors}   warnings: ${warnings}`);
process.exit(errors ? 1 : 0);
