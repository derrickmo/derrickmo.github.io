// build-interview-index.mjs — compiles the /interview/ drill corpus from the
// canonical content store.
//
// The hub needs no new content: every question, deep dive and flashcard already
// exists in content/lessons/**. This turns that store into something a drill UI
// can page through cheaply.
//
// WHY IT SHARDS. One flat index is ~8 MB, which is absurd to load so somebody can
// answer ten questions. So it emits a small MANIFEST (counts, module list, every
// lesson) that the page loads eagerly, plus ONE SHARD PER MODULE fetched on demand.
// A drill session touches one to three modules, so a typical session pulls the
// manifest and a shard or two rather than the whole corpus. Shards drop the fields
// they can inherit from the manifest (module title, category, lesson title), which
// is about 40% of the bytes.
//
// Output (both generated, both gitignored — built in CI so they cannot go stale
// the way content.json did):
//   public/interview-manifest.json
//   public/interview/<module>.json   x25
//
//   node scripts/build-interview-index.mjs
//
// Deterministic: ids are content-derived hashes and nothing calls Date.now(), so
// two builds of the same store are byte-identical and review scheduling saved in a
// reader's browser survives a rebuild.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (p) => join(ROOT, p);

// The curriculum is a window-global data file; evaluate it the way the site does.
function loadCurriculum() {
  const w = {};
  new Function("window", "self", "document", readFileSync(R("curriculum.js"), "utf8"))(w, w, {});
  return w.CURRICULUM;
}

// FNV-1a over the identifying parts. Content-derived so an id is stable across
// rebuilds; positional so re-ordering a lesson's questions does re-key them, which
// is the honest behaviour — a reordered question is a different question.
function hashId(...parts) {
  const s = parts.join(" ");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

const C = loadCurriculum();
const moduleMeta = {};
C.modules.forEach((m) => { moduleMeta[m.slug] = { n: m.n, title: m.title, category: m.category }; });

const questions = [];
const cards = [];
const lessons = [];
const problems = [];

for (const mod of readdirSync(R("content/lessons"))) {
  for (const f of readdirSync(R(`content/lessons/${mod}`))) {
    const j = JSON.parse(readFileSync(R(`content/lessons/${mod}/${f}`), "utf8"));
    const meta = moduleMeta[mod] || {};
    const base = {
      module: mod,
      moduleN: meta.n,
      moduleTitle: meta.title,
      category: meta.category,
      lesson: j.slug,
      lessonTitle: j.title,
      // The 25 hand-built flagship lessons carry no `level` — it is waived for them
      // because their body is bespoke. They do carry a drill layer, so they belong
      // in the corpus; `core` is the honest default for a flagship.
      level: j.level || "core",
      href: `learn/${mod}/${j.slug}/`,
    };
    lessons.push({
      module: mod, lesson: j.slug, title: j.title, level: base.level, href: base.href,
      questions: 0, cards: 0,
    });
    const L = lessons[lessons.length - 1];

    const iv = j.interview || {};
    (iv.quickGrind || []).forEach((q, i) => {
      questions.push({ id: hashId(mod, j.slug, "qg", String(i)), tier: "quick", q: q.q, a: q.a, ...base });
      L.questions++;
    });
    (iv.standard || []).forEach((q, i) => {
      questions.push({ id: hashId(mod, j.slug, "std", String(i)), tier: "standard", q: q.q, a: q.a, ...base });
      L.questions++;
      if (!q.deepDive) return;
      // A bare-string deepDive is the CA-0005 legacy shape: an answer with no
      // question. Those were all migrated, and validate-content.mjs now errors on
      // one, so finding one here means something regressed upstream. A question
      // with no question is useless in a drill, so this fails rather than shipping it.
      if (typeof q.deepDive === "string") {
        problems.push(`${mod}/${j.slug} standard[${i}]: deepDive is a bare string (CA-0005 shape)`);
        return;
      }
      if (!q.deepDive.a) return;
      questions.push({
        id: hashId(mod, j.slug, "dd", String(i)), tier: "deep",
        q: q.deepDive.q, a: q.deepDive.a,
        followsFrom: hashId(mod, j.slug, "std", String(i)), ...base,
      });
      L.questions++;
    });
    (j.flashcards || []).forEach((c, i) => {
      cards.push({ id: hashId(mod, j.slug, "fc", String(i)), type: c.type || "definition", front: c.front, back: c.back, ...base });
      L.cards++;
    });
  }
}

// ---- integrity: the drill is only as trustworthy as these ----
const seen = new Set();
for (const x of [...questions, ...cards]) {
  if (seen.has(x.id)) problems.push(`duplicate id ${x.id} in ${x.module}/${x.lesson}`);
  seen.add(x.id);
  if (!(x.q || x.front)) problems.push(`empty prompt in ${x.module}/${x.lesson}`);
  if (!(x.a || x.back)) problems.push(`empty answer in ${x.module}/${x.lesson}`);
}

const tally = (arr, key) => arr.reduce((o, x) => { o[x[key]] = (o[x[key]] || 0) + 1; return o; }, {});
const byTier = tally(questions, "tier");
const byLevel = tally(questions, "level");
const byCardType = tally(cards, "type");

const manifest = {
  schemaVersion: 1,
  counts: { questions: questions.length, cards: cards.length, lessons: lessons.length },
  byTier, byLevel, byCardType,
  modules: C.modules.map((m) => {
    const q = questions.filter((x) => x.module === m.slug);
    return {
      slug: m.slug, n: m.n, title: m.title, category: m.category,
      questions: q.length,
      cards: cards.filter((x) => x.module === m.slug).length,
      tiers: tally(q, "tier"),
      levels: [...new Set(q.map((x) => x.level))],
      shard: `interview/${m.slug}.json`,
    };
  }),
  // Every lesson, so lesson-level filtering renders before any shard is fetched.
  lessons,
};

const outDir = R("public/interview");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// Fields a shard can inherit from the manifest, dropped to save bytes.
const strip = ({ moduleN, moduleTitle, category, lessonTitle, ...rest }) => rest;
let shardBytes = 0, biggest = { slug: null, bytes: 0 };
for (const m of C.modules) {
  const p = join(outDir, m.slug + ".json");
  writeFileSync(p, JSON.stringify({
    module: m.slug,
    questions: questions.filter((x) => x.module === m.slug).map(strip),
    cards: cards.filter((x) => x.module === m.slug).map(strip),
  }));
  const b = statSync(p).size;
  shardBytes += b;
  if (b > biggest.bytes) biggest = { slug: m.slug, bytes: b };
}
const manPath = R("public/interview-manifest.json");
writeFileSync(manPath, JSON.stringify(manifest));
const manBytes = statSync(manPath).size;

const kb = (b) => (b / 1024).toFixed(0) + " KB";
console.log(`interview index: ${questions.length} questions ${JSON.stringify(byTier)}`);
console.log(`                 ${cards.length} cards ${JSON.stringify(byCardType)}`);
console.log(`                 ${lessons.length} lessons across ${C.modules.length} modules`);
console.log(`manifest ${kb(manBytes)} + ${C.modules.length} shards (avg ${kb(shardBytes / C.modules.length)}, largest ${biggest.slug} ${kb(biggest.bytes)})`);
console.log(`typical session: manifest + 1 shard = ${kb(manBytes + shardBytes / C.modules.length)} raw`);

if (problems.length) {
  console.error(`\n!! ${problems.length} integrity problem(s):`);
  problems.slice(0, 10).forEach((p) => console.error("   " + p));
  process.exit(1);
}
console.log("integrity: clean");
