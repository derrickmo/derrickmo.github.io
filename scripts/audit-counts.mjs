#!/usr/bin/env node
// audit-counts.mjs — the numbers in the prose must match the numbers in the store.
//
// WHY THIS EXISTS: every count a reader sees is hand-typed into marketing copy
// and page metadata, and nothing checked any of it. Two had already drifted
// before this script was written — README.md said 179 demos against a real 200,
// and content/SCHEMA.md said 91 concepts against a real 155 — and the 25→26
// module restructure is about to move several more at once.
//
// The source of truth is public/app/version.json, which is generated from the
// store on every build, so this compares prose against a derived number rather
// than against a second hand-typed one.
//
//   node scripts/audit-counts.mjs
//
// Adding a surface: put its file and the tokens it states in SURFACES below.
// A token is (regex, key) — the regex must capture the number in group 1.
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (p) => join(ROOT, p);

const VERSION = R("public/app/version.json");
if (!existsSync(VERSION)) {
  console.error("audit-counts: public/app/version.json is missing — run npm run validate first");
  process.exit(1);
}
const v = JSON.parse(readFileSync(VERSION, "utf8"));
// ⚠ TWO DIFFERENT TRUTHS, and conflating them is how this goes wrong.
// version.json counts what the site HAS (250 written topics in 25 content
// directories). content/migrations/ declares what the COURSE IS (26 modules,
// 282 slots) now that the notebooks lead. Copy describing the curriculum takes
// the v2 numbers; copy describing the corpus takes the site's.
const MAP = R("content/migrations/v1-to-v2.json");
const v2 = existsSync(MAP) ? JSON.parse(readFileSync(MAP, "utf8")) : null;

const truth = {
  v2modules: v2 ? v2.to.modules : null,
  v2slots: v2 ? v2.to.slots : null,
  modules: v.counts.modules,
  topics: v.counts.topics,
  concepts: v.counts.concepts,
  demos: v.counts.demos,
  games: v.counts.games,
  paths: v.counts.paths,
  questions: v.counts.questions,
  cards: v.counts.cards,
};

// A number may be written 5210 or 5,210. The FIRST # in a pattern captures the
// number being checked; any later # matches a number this token does not own.
//
// (Getting this wrong is silent: `String.replace` with a string needle swaps
// only the first occurrence, so a two-# pattern compiled to a regex that could
// never match — and a check that matches nothing looks exactly like a check
// that passes. That is why an unmatched token is an ERROR below, and it is how
// this bug was caught on the script's own first run.)
const T = (re, key) => {
  let first = true;
  const src = re.replace(/#/g, () => (first ? ((first = false), "([\\d,]+)") : "[\\d,]+"));
  return { re: new RegExp(src, "gi"), key };
};

const SURFACES = [
  ["README.md", [
    T("# hands-on demos", "demos"),
    // The site's own store: 25 module directories, 250 written lessons.
    T("#-module", "modules"),
    T("#-lesson", "topics"),
    T("# per-concept sub-lessons", "concepts"),
    // The curriculum those mirror, which is a different pair of numbers. Both
    // halves of each phrase get a token — a pattern only captures its first #,
    // and an uncovered number is exactly the drift this script exists to stop.
    T("notebooks' # modules", "v2modules"),
    T("and # slots", "v2slots"),
    T("\\(# notebooks across", "v2slots"),
    T("notebooks across # modules", "v2modules"),
  ]],
  ["learn-hub-app.jsx", [
    T("# modules · # notebooks", "v2modules"),
    // The second number in that same string needs its own token, because a
    // pattern only ever captures its first #.
    T("modules · # notebooks", "v2slots"),
    T("# questions · # flashcards", "questions"),
    T("into the # lessons", "topics"),
    T("from all # lessons", "topics"),
    T("A #-module program", "v2modules"),
  ]],
  // learn-app.jsx states no count as a literal any more — the hero strip and
  // the section label both read window.CURRICULUM_V2 at render, so there is
  // nothing here that can drift.
  ["landing-app.jsx", [T("# notebooks across", "topics")]],
  ["work-app.jsx", [T("# notebooks across", "topics")]],
  ["interview-app.jsx", [T("written into the # lessons", "topics")]],
  ["interview/index.html", [
    T("Drill # interview questions", "questions"),
    T("# flashcards", "cards"),
    T("from all # lessons", "topics"),
  ]],
  ["pitfalls/index.html", [T("from all # lessons", "topics")]],
  ["content/SCHEMA.md", [T("one per taught sub-lesson \\(#", "concepts")]],
];

const parse = (s) => Number(String(s).replace(/,/g, ""));
let checked = 0, bad = 0;

for (const [file, tokens] of SURFACES) {
  const p = R(file);
  if (!existsSync(p)) { console.log(`  ~ ${file} not found — skipped`); continue; }
  const text = readFileSync(p, "utf8");
  for (const { re, key } of tokens) {
    let m, found = false;
    re.lastIndex = 0;
    while ((m = re.exec(text))) {
      found = true; checked++;
      const said = parse(m[1]);
      // A token whose truth source is absent must FAIL, not quietly pass —
      // otherwise removing content/migrations/ turns this into a no-op.
      if (truth[key] == null) {
        bad++;
        console.error(`  ✗ ${file}: token "${key}" has no truth value — content/migrations/ is missing`);
        continue;
      }
      if (said !== truth[key]) {
        bad++;
        const line = text.slice(0, m.index).split("\n").length;
        console.error(`  ✗ ${file}:${line} says ${key} = ${said}, store says ${truth[key]}`);
        console.error(`      "${m[0].trim()}"`);
      }
    }
    // A token that matches nothing is the failure mode this whole script is
    // about: the prose was reworded, the check silently stopped checking.
    if (!found) {
      bad++;
      console.error(`  ✗ ${file}: no text matches /${re.source}/ — the copy changed, so this check went blind`);
    }
  }
}

console.log(
  `counts: ${checked} stated number(s) checked against version.json ` +
  `(${truth.modules} modules · ${truth.topics} topics · ${truth.concepts} concepts · ` +
  `${truth.demos} demos · ${truth.questions} questions · ${truth.cards} cards)`
);
if (bad) {
  console.error(`\n!! ${bad} count(s) in the prose disagree with the store.`);
  process.exit(1);
}
console.log("OK — every stated count matches the generated contract.");
