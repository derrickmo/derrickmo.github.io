// build-pitfalls-index.mjs — compiles the /pitfalls/ failure-mode index.
//
// The 250 lessons document 1,429 concrete failure modes, usually naming the symptom
// and the reason in the same sentence, plus 817 flashcards already typed "pitfall".
// Every other surface on the site answers "teach me X". This corpus answers "why is
// my thing broken", which is the question a working practitioner actually types.
//
// ── THE SYMPTOM TAGS, and why they look nothing like the original plan ──────────
// The obvious shape is 18 symptom buckets covering everything. Two attempts at that
// failed, both by trusting a pattern instead of reading its output:
//
//   1. A loose keyword router covered 62% and misrouted visibly - "Ignoring index
//      maintenance" filed under loss-is-NaN, because `nan` matched inside
//      `maintenance`.
//   2. A tightened phrase router was honest at 31% but still wrong at the edges:
//      `\binf\b` matched the `L-inf` in a threat-model pitfall, and "Permuting the
//      same few examples" landed under shape-and-axis mistakes.
//
// What ships is the third attempt, and the difference is method, not cleverness:
// EVERY MATCH OF EVERY RULE WAS READ, and rules were cut until what came back was
// right. That loop is what produced the fixes below, none of which were predictable
// from the outside:
//   - bare `diverg` is a trap: KL divergence, contrastive divergence and HMC
//     divergences are measures and diagnostics, not training blowing up;
//   - `not a number` matched the English phrase in "report a curve, not a number";
//   - bare `drift` is two different symptoms - "logits drift but decisions do not"
//     is numeric drift, not distribution drift, and it was half the matches;
//   - bare `reproduc` matches a finding BEING replicated, not a repro problem;
//   - two buckets were RELABELLED rather than pruned, because the matches were
//     honest and the label was too narrow.
//
// Coverage is 11%, and that is the finding, not a shortfall: the corpus is mostly
// method-specific ("use the CIFAR stem on 32x32", "expecting DINO to work without
// both centering AND sharpening") and belongs to no generic symptom. So symptoms are
// a FILTER over the tenth of the corpus that has one, never a classification of the
// whole thing - the UI says so, and an untagged row is still fully searchable.
//
// ⚠ If you add a rule, read every row it matches before shipping it. That is the
// entire difference between this version and the two that failed.
// `node scratchpad/symptoms.mjs <bucketId>` was the harness; keep the habit.
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

// Every pattern below was pruned by reading its matches. Order is display order.
const SYMPTOMS = [
  { id: "leak", label: "Leakage or contaminated evaluation",
    re: /\b(leak(s|age|ed|ing)?\b|contaminat\w+|peek(ing)? at|test set (into|in) train|fit\w* (the )?(scaler|encoder|imputer|transform\w*) (on|before)|target encod\w+|split(ting)? by (frame|clip|row) instead|near.duplicate)/i },
  { id: "calib", label: "Confidence does not mean what you think",
    re: /\b(calibrat\w+|overconfiden\w+|underconfiden\w+|softmax (score|probabilit\w+)|confidence .{0,30}(unreliable|meaningless|not a probabilit)|treating .{0,24}(score|logit)s? as (a )?probabilit)/i },
  { id: "nan", label: "NaN, overflow and numerical blow-ups",
    re: /\b(nan\b|(loss|run|training|optimi[sz]ation|parameters?|weights?|mle|estimates?|iterates?)\b[^.]{0,30}\bdiverg|diverg\w*\s+(run|training|loss)|explod(e|es|ing)\s+gradient|gradient\s+explosion|vanishing[^.]{0,14}gradient|overflow|underflow|log\(0\)|divide by zero|numerical(ly)? (unstable|instability)|too large[^.]{0,40}(divergence|blow))/i },
  { id: "oom", label: "Slow, out of memory, or accidentally quadratic",
    re: /\b(out of memory|\boom\b|memory (blow|explod|footprint|pressure|complexity)|quadratic in|o\(n\^?2\)|too slow|latency (budget|blow|balloon)|throughput|underestimat\w+ the (memory|cost|resolution) cost|recompute cost)/i },
  { id: "drift", label: "It worked, and now it does not",
    re: /\b(data drift|model drift|feature drift|drift detect\w+|distribution shift|covariate shift|concept shift|label shift|stale (model|data|feature|index)|degrad\w+ over time|retrain\w* (cadence|schedule|trigger)|monitor\w* for (drift|shift))/i },
  { id: "repro", label: "Cannot reproduce the result",
    re: /\b(reproducib\w+|(cannot|could not|failed to|without) reproduc\w+|reproduc\w+ (the|a) (result|number|baseline|run)|instead of reproducing|non.determinis\w+|run.to.run|dirty (tree|working)|unpinned|version (skew|mismatch)|single.seed|seed variance|forgetting to (set|log) the seed)/i },
  { id: "evalproto", label: "The evaluation protocol is wrong",
    re: /\b(random (k.fold|split|shuffle) .{0,40}(group|time|user|patient|speaker)|forward chaining|no (control|baseline)|reporting a single (run|number)|without (a )?confidence interval|too small to (detect|distinguish)|best.of.\w+ (config|run)|multiple (comparison|testing))/i },
  { id: "skew", label: "Works in training, breaks in production",
    re: /\b(train.(serve|serving|test) skew|(differs|different|mismatch\w*) (at|in) (serving|inference|production)|refit\w* (the )?scaler|preprocessing (differs|mismatch|skipp)|only (shows|appears|breaks) (at|in) (serving|production)|silently (different|wrong) in production)/i },
];

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
      // A row can carry several symptoms, because real failures do - a leak is also
      // a metric lie. Most carry none, which is expected and not a hole.
      const sy = SYMPTOMS.filter((x) => x.re.test(title) || x.re.test(detail)).map((x) => x.id);
      rows.push({ id: hashId(mod, j.slug, kind, String(i)), m: mod, lesson: j.slug, kind, title, detail, sy });
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
  symptoms: SYMPTOMS.map((x) => ({ id: x.id, label: x.label, count: rows.filter((r) => r.sy.includes(x.id)).length })),
  symptomTagged: rows.filter((r) => r.sy.length).length,
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
const tagged = rows.filter((r) => r.sy.length).length;
console.log(`symptom-tagged: ${tagged} (${(tagged / rows.length * 100).toFixed(0)}%) across ${SYMPTOMS.length} buckets - a filter, not a classification`);
for (const x of out.symptoms) console.log(`   ${String(x.count).padStart(4)} ${x.label}`);
if (empty.length) console.log(`modules with none: ${empty.map((m) => m.slug).join(", ")}`);
if (problems.length) {
  console.error(`\n!! ${problems.length} problem(s):`);
  problems.slice(0, 8).forEach((x) => console.error("   " + x));
  process.exit(1);
}
console.log("integrity: clean");
