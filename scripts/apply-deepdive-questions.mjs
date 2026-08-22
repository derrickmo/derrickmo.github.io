// apply-deepdive-questions.mjs — migrate legacy bare-string `deepDive` values to the
// schema's { q, a } shape by pairing each with an authored follow-up question (CA-0005).
//
// The string form is an ANSWER CONTINUATION with no question, so the question has to be
// written from the paragraph's OWN argument — never derived from the parent question,
// which is a different question and would mislabel the content.
//
// Input: a JSON map  { "<module>/<lesson-slug>": ["q for standard[0]", null, ...] }
//   - one entry per `standard` index, in order
//   - null / "" / a missing trailing entry = leave that one alone
//   - an index whose deepDive is not a bare string is skipped (idempotent re-runs)
//
// Run:  node scripts/apply-deepdive-questions.mjs <map.json> [--dry]
// Exit: 0 on success, 1 if any lesson or index in the map does not line up.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mapPath = process.argv[2];
const DRY = process.argv.includes("--dry");

if (!mapPath || !existsSync(mapPath)) {
  console.error("usage: node scripts/apply-deepdive-questions.mjs <map.json> [--dry]");
  process.exit(1);
}

const map = JSON.parse(readFileSync(mapPath, "utf8"));
let applied = 0, skipped = 0, problems = 0;
const touched = new Set();

for (const [ref, questions] of Object.entries(map)) {
  const [mod, slug] = ref.split("/");
  const file = join(ROOT, "content", "lessons", mod, `${slug}.json`);
  if (!existsSync(file)) { console.error(`  !! no such lesson: ${ref}`); problems++; continue; }

  const j = JSON.parse(readFileSync(file, "utf8"));
  const std = (j.interview || {}).standard || [];
  let changedHere = 0;

  questions.forEach((q, i) => {
    if (!q) return;
    const entry = std[i];
    if (!entry) { console.error(`  !! ${ref}: no standard[${i}]`); problems++; return; }
    if (typeof entry.deepDive !== "string") { skipped++; return; }  // already migrated
    // Keep the written prose verbatim; it only gains the question it was always answering.
    entry.deepDive = { q: q.trim(), a: entry.deepDive };
    applied++; changedHere++;
  });

  if (changedHere && !DRY) {
    // 2-space indent + trailing newline, matching every other store file.
    writeFileSync(file, JSON.stringify(j, null, 2) + "\n", "utf8");
    touched.add(ref);
  }
}

console.log(`${DRY ? "[dry] " : ""}questions applied: ${applied}   already migrated: ${skipped}   files written: ${touched.size}`);
if (problems) console.error(`problems: ${problems}`);
process.exit(problems ? 1 : 0);
