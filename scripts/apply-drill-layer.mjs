// apply-drill-layer.mjs — add the drill layer (interview + flashcards + refs) to a
// flagship-jsx lesson, without touching its hand-built body.
//
// The 25 flagship lessons keep bodySource "jsx", so their bespoke .jsx body still
// renders; gen-lesson-pages emits a drill-only bundle entry for them and lesson-app
// appends the Interview and Flashcards sections after it. This script only writes the
// three fields that layer needs.
//
// Run:  node scripts/apply-drill-layer.mjs <module>/<slug> <payload.json> [--force]
//   payload.json = { interview: {quickGrind[], standard[]}, flashcards[], refs[] }
//
// Refuses to overwrite an existing drill layer unless --force, so a re-run cannot
// silently clobber authored content. Checks the C2 minimums before writing, since the
// validator's jsx path only enforces them once a drill layer is present.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [ref, payloadPath] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const FORCE = process.argv.includes("--force");

if (!ref || !payloadPath) {
  console.error("usage: node scripts/apply-drill-layer.mjs <module>/<slug> <payload.json> [--force]");
  process.exit(1);
}

const [mod, slug] = ref.split("/");
const file = join(ROOT, "content", "lessons", mod, `${slug}.json`);
if (!existsSync(file)) { console.error(`no such lesson: ${file}`); process.exit(1); }
if (!existsSync(payloadPath)) { console.error(`no such payload: ${payloadPath}`); process.exit(1); }

const lesson = JSON.parse(readFileSync(file, "utf8"));
const p = JSON.parse(readFileSync(payloadPath, "utf8"));

if (lesson.interview && !FORCE) {
  console.error(`${ref} already has a drill layer — pass --force to replace it`);
  process.exit(1);
}

// C2 minimums, checked here so a shortfall is caught before it reaches the validator.
const qg = ((p.interview || {}).quickGrind || []).length;
const std = ((p.interview || {}).standard || []).length;
const deep = ((p.interview || {}).standard || []).filter((s) => s.deepDive && s.deepDive.q && s.deepDive.a).length;
const fc = (p.flashcards || []).length;
const refs = (p.refs || []).length;
const CARD_TYPES = new Set(["definition", "formula", "intuition", "pitfall"]);
const badType = (p.flashcards || []).find((c) => !CARD_TYPES.has(c.type));

const problems = [];
if (qg < 10) problems.push(`quickGrind ${qg} < 10`);
if (std < 6) problems.push(`standard ${std} < 6`);
if (deep < 2) problems.push(`standard entries with a full {q,a} deepDive: ${deep} < 2`);
if (fc < 8) problems.push(`flashcards ${fc} < 8`);
if (refs < 4) problems.push(`refs ${refs} < 4`);
if (badType) problems.push(`flashcard type "${badType.type}" is not one of ${[...CARD_TYPES].join("|")}`);
if (problems.length) { problems.forEach((x) => console.error(`  !! ${x}`)); process.exit(1); }

lesson.interview = p.interview;
lesson.flashcards = p.flashcards;
lesson.refs = p.refs;
lesson.updatedAt = p.updatedAt || new Date().toISOString().slice(0, 10);

writeFileSync(file, JSON.stringify(lesson, null, 2) + "\n", "utf8");
console.log(`${ref}: ${qg} quickGrind / ${std} standard (${deep} deep dives) / ${fc} flashcards / ${refs} refs`);
