// build-pitfalls-index.mjs — compiles the /pitfalls/ failure-mode index.
//
// The 250 lessons document 1,429 concrete failure modes, usually naming the symptom
// and the reason in the same sentence, plus 817 flashcards already typed "pitfall".
// Every other surface on the site answers "teach me X". This corpus answers "why is
// my thing broken", which is the question a working practitioner actually types.
//
// ── WHY THERE IS NO SYMPTOM TAXONOMY HERE, which is the design decision ─────────
// The obvious shape is symptom buckets: "loss is NaN", "out of memory", "train good
// / test bad". It was tried twice and does not survive contact with the prose.
//
//   1. A loose keyword router covered 62% and misrouted visibly - "Ignoring index
//      maintenance" filed under loss-is-NaN, because `nan` matched inside
//      `maintenance`.
//   2. A tightened phrase router was honest about coverage (31%) but still wrong at
//      the edges: `\binf\b` matched the `L-inf` in a threat-model pitfall, and
//      "Permuting the same few examples" landed under shape-and-axis mistakes.
//
// The deeper reason is that the corpus is not shaped like a symptom list. Most of it
// is method-specific - "use the CIFAR stem on 32x32", "expecting DINO to work
// without both centering AND sharpening" - and belongs to no generic symptom at all.
// A taxonomy that only fits a third of the corpus, with visible false positives in
// the third it does fit, is worse than none: it invites trust it has not earned.
//
// So this ships only facets that are EXACT, all derived from the store: full-text
// search, module, category, and source. Symptom grouping is a curation task for a
// human, and is on the backlog as one. Do not re-attempt it with regexes.
//
// Output: public/pitfalls-index.json (generated, gitignored, built in CI)
//
//   node scripts/build-pitfalls-index.mjs
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (p) => join(ROOT, p);

function loadCurriculum() {
  const w = {};
  new Function("window", "self", "document", readFileSync(R("curriculum.js"), "utf8"))(w, w, {});
  return w.CURRICULUM;
}

function hashId(...parts) {
  const s = parts.join(" ");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

// Many pitfalls are written "Short name: the explanation". Splitting on the first
// colon gives a scannable heading, which is what makes a 2,000-row list usable.
// Roughly half do not have that shape and keep their full text as the heading -
// that is fine, the list just has some longer rows.
function split(text) {
  const i = text.indexOf(": ");
  if (i > 8 && i < 110) return [text.slice(0, i), text.slice(i + 2)];
  return [text, ""];
}

const C = loadCurriculum();
const meta = {};
C.modules.forEach((m) => { meta[m.slug] = m; });

const rows = [];
for (const mod of readdirSync(R("content/lessons"))) {
  for (const f of readdirSync(R(`content/lessons/${mod}`))) {
    const j = JSON.parse(readFileSync(R(`content/lessons/${mod}/${f}`), "utf8"));
    const add = (text, kind, i) => {
      if (!text || typeof text !== "string") return;
      const [title, detail] = split(text);
      rows.push({ id: hashId(mod, j.slug, kind, String(i)), m: mod, lesson: j.slug, kind, title, detail });
    };
    ((j.body || {}).pitfalls || []).forEach((p, i) => add(p, "pitfall", i));
    (j.flashcards || []).filter((c) => c.type === "pitfall")
      .forEach((c, i) => add(`${c.front}: ${c.back}`, "card", i));
  }
}

// Lesson titles live once in a lookup rather than on all 2,246 rows.
const lessonTitles = {};
for (const mod of readdirSync(R("content/lessons"))) {
  for (const f of readdirSync(R(`content/lessons/${mod}`))) {
    const j = JSON.parse(readFileSync(R(`content/lessons/${mod}/${f}`), "utf8"));
    lessonTitles[`${mod}/${j.slug}`] = j.title;
  }
}

const categories = [...new Set(C.modules.map((m) => m.category))];
const out = {
  schemaVersion: 1,
  counts: {
    total: rows.length,
    pitfalls: rows.filter((r) => r.kind === "pitfall").length,
    cards: rows.filter((r) => r.kind === "card").length,
  },
  categories,
  modules: C.modules.map((m) => ({
    slug: m.slug, n: m.n, title: m.title, category: m.category,
    count: rows.filter((r) => r.m === m.slug).length,
  })),
  lessonTitles,
  rows,
};

const p = R("public/pitfalls-index.json");
writeFileSync(p, JSON.stringify(out));
const raw = statSync(p).size, gz = gzipSync(readFileSync(p)).length;

const problems = [];
if (!rows.length) problems.push("no pitfalls found — the store layout probably changed");
for (const r of rows) {
  if (!r.title) problems.push(`empty title in ${r.m}/${r.lesson}`);
  if (!lessonTitles[`${r.m}/${r.lesson}`]) problems.push(`no lesson title for ${r.m}/${r.lesson}`);
}
const empty = out.modules.filter((m) => !m.count);

console.log(`pitfalls index: ${out.counts.total} entries (${out.counts.pitfalls} lesson pitfalls + ${out.counts.cards} pitfall flashcards)`);
console.log(`across ${out.modules.length - empty.length} of ${out.modules.length} modules, ${categories.length} categories`);
console.log(`payload: ${(raw / 1024).toFixed(0)} KB raw, ${(gz / 1024).toFixed(0)} KB gzip`);
if (empty.length) console.log(`modules with none: ${empty.map((m) => m.slug).join(", ")}`);
if (problems.length) {
  console.error(`\n!! ${problems.length} problem(s):`);
  problems.slice(0, 8).forEach((x) => console.error("   " + x));
  process.exit(1);
}
console.log("integrity: clean");
