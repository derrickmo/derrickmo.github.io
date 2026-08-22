// apply-concept-sublessons.mjs — add taught concept sub-lessons to a module.
//
// Writes content/concepts/<module>/<id>.json for each concept in the payload and
// adds its id to that module's subLessons.order, creating the subLessons block if the
// module has none (modules 21-25 shipped without one).
//
// ⚠ COLLISION RULE: a concept id must not equal a LESSON slug in the same module, or
// both would generate a page at learn/<module>/<slug>/ and gen-lesson-pages hard-errors.
// Checked here so the clash is caught before anything is written.
//
// Payload: { "<module>/<concept-id>": { title, oneLine, sections[], takeaways[], demo? },
//            "_subLessons": { "<module>": { title, intro } } }   // only for new blocks
//
// Run:  node scripts/apply-concept-sublessons.mjs <payload.json> [--force]
// Then: npm run content && node scripts/gen-sublesson-pages.mjs && npm run build

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const payloadPath = process.argv[2];
const FORCE = process.argv.includes("--force");

if (!payloadPath || !existsSync(payloadPath)) {
  console.error("usage: node scripts/apply-concept-sublessons.mjs <payload.json> [--force]");
  process.exit(1);
}

const payload = JSON.parse(readFileSync(payloadPath, "utf8"));
const wrappers = payload._subLessons || {};
const entries = Object.entries(payload).filter(([k]) => k !== "_subLessons");

// The graph is the authority on which ids exist; a sub-lesson for an unknown concept
// would render a page nothing links to.
const win = {};
new Function("window", readFileSync(join(ROOT, "concepts-index.js"), "utf8"))(win);
const CONCEPT_IDS = new Set(Object.keys(win.CONCEPTS_INDEX));

let problems = 0;
const byModule = {};
for (const [ref, c] of entries) {
  const [mod, id] = ref.split("/");
  if (!CONCEPT_IDS.has(id)) { console.error(`  !! ${ref}: "${id}" is not in concepts-index.js`); problems++; continue; }
  const lessonDir = join(ROOT, "content", "lessons", mod);
  if (!existsSync(lessonDir)) { console.error(`  !! ${ref}: no such module`); problems++; continue; }
  if (readdirSync(lessonDir).includes(`${id}.json`)) {
    console.error(`  !! ${ref}: COLLIDES with the lesson of the same slug — pick another id`);
    problems++; continue;
  }
  for (const k of ["title", "oneLine", "sections", "takeaways"]) {
    if (!c[k] || (Array.isArray(c[k]) && !c[k].length)) { console.error(`  !! ${ref}: ${k} required`); problems++; }
  }
  (byModule[mod] = byModule[mod] || []).push([id, c]);
}
if (problems) { console.error(`\nrefusing to write — ${problems} problem(s)`); process.exit(1); }

let written = 0;
for (const [mod, list] of Object.entries(byModule)) {
  const dir = join(ROOT, "content", "concepts", mod);
  mkdirSync(dir, { recursive: true });

  for (const [id, c] of list) {
    const file = join(dir, `${id}.json`);
    if (existsSync(file) && !FORCE) { console.error(`  !! ${mod}/${id} already exists — --force to replace`); process.exit(1); }
    const out = {
      kind: "concept", schemaVersion: 1, id, module: mod,
      title: c.title, oneLine: c.oneLine, sections: c.sections, takeaways: c.takeaways,
    };
    if (c.demo) out.demo = c.demo;
    out.updatedAt = c.updatedAt || "2026-08-22";
    writeFileSync(file, JSON.stringify(out, null, 2) + "\n", "utf8");
    written++;
  }

  // wire them into the module's syllabus
  const mf = join(ROOT, "content", "modules", `${mod}.json`);
  const m = JSON.parse(readFileSync(mf, "utf8"));
  if (!m.subLessons) {
    const w = wrappers[mod];
    if (!w || !w.title || !w.intro) { console.error(`  !! ${mod} has no subLessons block and no _subLessons wrapper supplied`); process.exit(1); }
    m.subLessons = { title: w.title, intro: w.intro, order: [] };
  }
  for (const [id] of list) if (!m.subLessons.order.includes(id)) m.subLessons.order.push(id);
  writeFileSync(mf, JSON.stringify(m, null, 2) + "\n", "utf8");
  console.log(`${mod}: +${list.length} concepts (order now ${m.subLessons.order.length})`);
}

console.log(`\nwrote ${written} concept files. Next: npm run content && node scripts/gen-sublesson-pages.mjs && npm run build`);
