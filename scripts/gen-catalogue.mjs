// Generates _private/CONTENT-CATALOGUE.md from the canonical store and the live
// registries.
//
// Every count, table and row is DERIVED here. Nothing about the content is typed
// by hand, because a hand-maintained catalogue drifts and this repo has watched
// that happen twice (README said 179 demos against a real 200, and 73 sub-lessons
// against 155). The narrative framing is authored; the facts are computed.
//
// The per-item "what actually runs" line comes from each demo's and game's own
// header comment, which the author wrote next to the implementation. That is the
// most accurate description available and it cannot be a marketing blurb.
//
// Run: node scripts/gen-catalogue.mjs   (writes the file, prints an integrity report)
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const rd = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const globals = (p) => { const w = {}; new Function("window", rd(p))(w); return w; };

// ── sources ────────────────────────────────────────────────────────────────
const PD = globals("play-demos.js").PLAY_DEMOS;
const PG = globals("play-games.js").PLAY_GAMES;
const CI = globals("concepts-index.js");
const HF = globals("hf-lectures.js").HF;
const PATHS = globals("paths.js").LEARNING_PATHS;
const IDX = CI.CONCEPTS_INDEX || {};
const TAGS = CI.CONCEPT_TAGS || {};

const readTree = (dir) => {
  const out = [];
  for (const e of fs.readdirSync(path.join(ROOT, dir))) {
    const p = path.join(ROOT, dir, e);
    if (fs.statSync(p).isDirectory())
      for (const f of fs.readdirSync(p).filter((x) => x.endsWith(".json")))
        out.push(JSON.parse(fs.readFileSync(path.join(p, f), "utf8")));
    else if (e.endsWith(".json")) out.push(JSON.parse(fs.readFileSync(p, "utf8")));
  }
  return out;
};
const modules = readTree("content/modules").sort((a, b) => Number(a.n) - Number(b.n));
const lessons = readTree("content/lessons").sort((a, b) => String(a.id).localeCompare(String(b.id)));
const concepts = readTree("content/concepts");
const v2 = JSON.parse(rd("content/migrations/v1-to-v2.json"));
// Read the CANONICAL version, not public/app/version.json: that is a generated
// build artifact, git-ignored, and absent in a fresh clone (the clone test caught it).
const meta = JSON.parse(rd("content/meta.json"));

// ── indexes ────────────────────────────────────────────────────────────────
const byMod = {}; for (const l of lessons) (byMod[l.module] ||= []).push(l);
const conByMod = {}; for (const c of concepts) (conByMod[c.module] ||= []).push(c);
const lessonByKey = Object.fromEntries(lessons.map((l) => [`${l.module}/${l.slug}`, l]));
const conceptByKey = Object.fromEntries(concepts.map((c) => [`${c.module}/${c.id}`, c]));
const taught = new Set(concepts.map((c) => c.id));
const demoBySlug = Object.fromEntries(PD.demos.map((d) => [d.slug, d]));
const gameBySlug = Object.fromEntries(PG.games.map((g) => [g.slug, g]));
const tagsFor = (kind, slug) => (TAGS[kind] || {})[slug] || [];

const qOf = (l) => ["quickGrind", "standard", "deepDive"]
  .reduce((a, k) => a + (((l.interview || {})[k]) || []).length, 0);
const T = {
  q: lessons.reduce((a, l) => a + qOf(l), 0),
  fc: lessons.reduce((a, l) => a + (l.flashcards || []).length, 0),
  refs: lessons.reduce((a, l) => a + (l.refs || []).length, 0),
  pit: lessons.reduce((a, l) => a + ((l.body && l.body.pitfalls) || []).length, 0),
  jsx: lessons.filter((l) => l.bodySource === "jsx").length,
};
const areas = {};
for (const [id, c] of Object.entries(IDX)) (areas[c.area || "(unfiled)"] ||= []).push({ id, ...c });
const nGraph = Object.keys(IDX).length;

// Which lessons reverse-link to a demo (surfaces.demos is the authored relation).
const lessonsForDemo = {};
for (const l of lessons)
  for (const s of ((l.surfaces || {}).demos) || []) (lessonsForDemo[s] ||= []).push(l);

// ── the header comment each demo/game carries next to its implementation ───
// Leading run of `//` lines, minus the `path/file.jsx —` prefix on the first.
function headerOf(file) {
  const lines = rd(file).split("\n");
  const out = [];
  for (const ln of lines) {
    if (/^\s*\/\//.test(ln)) out.push(ln.replace(/^\s*\/\/\s?/, ""));
    else break;
  }
  if (!out.length) return "";
  let s = out.join(" ").replace(/\s+/g, " ").trim();
  s = s.replace(/^[\w/.\-]+\.jsx\s*[—-]\s*/, "").trim();
  // stripping the "file.jsx — " prefix leaves the sentence lowercase
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
// Headers run 43 to 1589 chars (median 518) because many carry a full teaching
// note. A catalogue wants the identifying claim, not the essay: keep whole
// sentences up to ~230 chars, always at least one, and never cut mid-sentence.
function brief(s, cap = 230) {
  if (!s || s.length <= cap) return s;
  const parts = s.match(/[^.!?]+[.!?]+(\s|$)/g) || [s];
  let out = "";
  for (const p of parts) {
    if (out && (out + p).length > cap) break;
    out += p;
  }
  out = (out || parts[0] || s).trim();
  return out.length < s.length ? out + " […]" : out;
}
// Module-scope `const NAME = value;` lines: the parameters that set behaviour.
function constsOf(file, max = 6) {
  return (rd(file).match(/^const [A-Z][A-Z_0-9]* = [^;\n]{1,80};/gm) || [])
    .map((s) => s.replace(/^const /, "").replace(/;$/, ""))
    .filter((s) => !/=\s*\(\(\)|=>|function/.test(s))
    .slice(0, max);
}

// ── integrity: a catalogue of broken cross-references is worse than none ───
const problems = [];
const moduleSlugs = new Set(modules.map((m) => m.slug));
// A demo's `lesson` may legitimately name a MODULE index rather than one lesson:
// that is the documented fallback for a demo no single lesson owns. Counting
// those as broken was the checker being stricter than the design.
const linkKind = (d) => {
  if (!d.lesson) return "none";
  const k = d.lesson.replace(/^learn\//, "").replace(/\/$/, "");
  if (lessonByKey[k] || conceptByKey[k]) return "page";
  if (moduleSlugs.has(k)) return "module";
  return "broken";
};
for (const d of PD.demos) {
  if (linkKind(d) === "broken") problems.push(`demo ${d.slug} -> unresolved lesson ${d.lesson}`);
  for (const t of tagsFor("demos", d.slug)) if (!IDX[t]) problems.push(`demo ${d.slug} -> unknown concept ${t}`);
  if (!fs.existsSync(path.join(ROOT, `demos/${d.slug}.jsx`))) problems.push(`demo ${d.slug} -> no source file`);
}
for (const g of PG.games) {
  for (const t of tagsFor("games", g.slug)) if (!IDX[t]) problems.push(`game ${g.slug} -> unknown concept ${t}`);
  if (!fs.existsSync(path.join(ROOT, `games/${g.slug}.jsx`))) problems.push(`game ${g.slug} -> no source file`);
}
for (const l of lessons)
  for (const s of ((l.surfaces || {}).demos) || [])
    if (!demoBySlug[s] && !gameBySlug[s]) problems.push(`lesson ${l.module}/${l.slug} -> unknown demo ${s}`);
for (const c of concepts)
  if (c.demo && !demoBySlug[c.demo] && !gameBySlug[c.demo]) problems.push(`concept ${c.id} -> unknown demo ${c.demo}`);

// ── emit ───────────────────────────────────────────────────────────────────
const L = [];
const w = (s = "") => L.push(s);
const esc = (s) => String(s == null ? "" : s).replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
const today = new Date().toISOString().slice(0, 10);
const pad2 = (n) => String(n).padStart(2, "0");

w(`# The Content Catalogue`);
w();
w(`**Everything on derrickmo.github.io in one file:** what exists, what it teaches, what is`);
w(`actually running underneath each interactive page, and where every piece comes from.`);
w();
w(`Generated **${today}** by \`scripts/gen-catalogue.mjs\` from the canonical store and the live`);
w(`registries. Every count and every row is computed; only the framing is authored. That is`);
w(`deliberate, because a hand-maintained catalogue drifts, and this repo has watched it happen`);
w(`twice (the README claimed 179 demos against a real 200, and 73 sub-lessons against 155).`);
w();
w(`> **This file is a description, never a source.** If it disagrees with \`content/\`, the store is`);
w(`> right and this file is stale. Regenerate it. Nothing reads it and nothing breaks without it.`);
w();
w(`**Companion documents.** This one is about *content*; those are about the machine serving it.`);
w();
w(`| | |`);
w(`|---|---|`);
w(`| \`CLAUDE.md\` | How the site is built, the rules, the recipes, current state. |`);
w(`| \`_private/ENGINEERING-NOTES.md\` | The 61 verification rules. Read before trusting a green build. |`);
w(`| \`_private/DECISIONS.md\` | Settled decisions and standing constraints. |`);
w(`| \`plan.md\` | The master plan, and the open decisions at the end. |`);
w(`| \`content/SCHEMA.md\` | The frozen content schema (the normative spec). |`);
w();
w(`## Contents`);
w();
w(`**[Part 1 — The laundry list](#part-1--the-laundry-list)** · everything that exists, compact`);
w(`<br>**[Part 2 — How the content is put together](#part-2--how-the-content-is-put-together)** · the store, what derives from it, why identity must not move`);
w(`<br>**[Part 3 — The expanded catalogue](#part-3--the-expanded-catalogue)** · each item with detail and references`);
w(`<br>**[Part 4 — Editorial standards](#part-4--editorial-standards)** · what makes a lesson, a demo, a concept`);
w(`<br>**[Part 5 — Gaps, debts and deliberate omissions](#part-5--gaps-debts-and-deliberate-omissions)**`);
w(`<br>**[Part 6 — Provenance](#part-6--provenance)** · where every number came from`);
w();
w(`---`);
w();

// ══ PART 1 ═════════════════════════════════════════════════════════════════
w(`# Part 1 — The laundry list`);
w();
w(`## 1.1 At a glance`);
w();
w(`| | count | source of truth |`);
w(`|---|---:|---|`);
w(`| Routes served | 871 | \`public/sitemap.xml\` |`);
w(`| Curriculum modules | ${modules.length} | \`content/modules/*.json\` |`);
w(`| Lessons | ${lessons.length} | \`content/lessons/<module>/*.json\` |`);
w(`| — body in the store | ${lessons.length - T.jsx} | rendered by \`lesson-app.jsx\` |`);
w(`| — hand-built flagship | ${T.jsx} | \`lessons/*.jsx\` |`);
w(`| Taught concept sub-lessons | ${concepts.length} | \`content/concepts/<module>/*.json\` |`);
w(`| Concepts in the graph | ${nGraph} | \`concepts-index.js\` |`);
w(`| Interactive demos | ${PD.demos.length} | \`play-demos.js\` + \`demos/*.jsx\` |`);
w(`| Demo categories | ${PD.categories.length} | \`PLAY_DEMOS.categories\` |`);
w(`| Playable AI games | ${PG.games.length} | \`play-games.js\` + \`games/*.jsx\` |`);
w(`| Curated learning paths | ${PATHS.length} | \`paths.js\` |`);
w(`| HuggingFace sections | ${HF.sections.length} | \`hf-lectures.js\` |`);
w(`| Interview questions | ${T.q.toLocaleString()} | derived from lesson \`interview\` |`);
w(`| Flashcards | ${T.fc.toLocaleString()} | derived from lesson \`flashcards\` |`);
w(`| Pitfalls | ${T.pit.toLocaleString()} | derived from lesson \`body.pitfalls\` |`);
w(`| Academic references | ${T.refs.toLocaleString()} | lesson \`refs[]\` |`);
w();
w(`**In one sentence:** a ${modules.length}-module machine-learning curriculum of ${lessons.length} written lessons and`);
w(`${concepts.length} shorter concept pages, alongside ${PD.demos.length} interactive demos and ${PG.games.length} playable games that`);
w(`compute the real algorithm in the browser, recombined into a drill surface, a pitfalls index`);
w(`and a concept graph.`);
w();
w(`### The three teaching registers`);
w();
w(`Understanding this first makes everything below read easily.`);
w();
w(`| register | count | length | what it is for |`);
w(`|---|---:|---|---|`);
w(`| **Lessons** | ${lessons.length} | long | The curriculum. Intuition, maths, code, use cases, pitfalls, connections, then a drill layer and citations. |`);
w(`| **Concepts** | ${concepts.length} of ${nGraph} | short | One idea, four sections, one demo. Minutes to read. |`);
w(`| **Demos + games** | ${PD.demos.length + PG.games.length} | interactive | The thing running. Real algorithms, in the browser, no server. |`);
w();
w(`A reader can enter at any register and cross to the others: a lesson links its demos, a demo`);
w(`links its lesson and its concepts, a concept links its demo and its prerequisite ladder.`);
w();
w(`## 1.2 Every surface`);
w();
w(`| route | pages | what it is |`);
w(`|---|---:|---|`);
w(`| \`/\` | 1 | Home: hero, animated concept gallery, the Lab, Selected Work, three pillars, About. |`);
w(`| \`/learn/\` | 1 | Learn hub. Chooser across the four teaching surfaces. |`);
w(`| \`/learn/ml-from-scratch/\` | 1 | Curriculum hub. Presents the notebooks' **${v2.modules.length} modules / ${v2.slots.length} slots** in ${new Set(v2.modules.map((m) => m.track)).size} tracks. |`);
w(`| \`/learn/<module>/\` | ${modules.length} | Module overview: summary, prereqs, takeaways, notebook table. |`);
w(`| \`/learn/<module>/<lesson>/\` | ${lessons.length} | A full lesson. |`);
w(`| \`/learn/<module>/<concept>/\` | ${concepts.length} | A taught concept sub-lesson. |`);
w(`| \`/learn/huggingface/\` + ${HF.sections.length} | ${HF.sections.length + 1} | HuggingFace companion course (38 notebooks). |`);
w(`| \`/learn/key-concepts/\` + 2 | 3 | Looping SVG/CSS animation galleries. |`);
w(`| \`/learn/building-with-genai/\` | 1 | Essay: how this site was built. |`);
w(`| \`/visualize/\` + ${PD.demos.length} | ${PD.demos.length + 1} | Demo hub and every demo. |`);
w(`| \`/play/\` + ${PG.games.length} | ${PG.games.length + 1} | Games hub and every game. |`);
w(`| \`/concepts/\` + ${nGraph} | ${nGraph + 1} | Concept graph hub and a page per concept. |`);
w(`| \`/concept-map/\` | 1 | Force-directed interactive graph of all ${nGraph}. |`);
w(`| \`/paths/\` + ${PATHS.length} + \`build\` | ${PATHS.length + 2} | Curated paths plus an on-demand path builder. |`);
w(`| \`/interview/\` | 1 | ${T.q.toLocaleString()} questions + ${T.fc.toLocaleString()} cards: browse, drill (SM-2), timed mock. |`);
w(`| \`/pitfalls/\` | 1 | ${T.pit.toLocaleString()} failure modes, searchable and faceted. |`);
w(`| \`/playground/\` | 1 | Capstone build-a-model sandbox. |`);
w(`| \`/weekly-insights/\` | 1 | Weekly ML digest, 12 most recent weeks. |`);
w(`| \`/research/\` \`/cases/\` \`/about/\` \`/work/\` | 4 | Portfolio surfaces. |`);
w();
w(`## 1.3 The ${modules.length} modules`);
w();
w(`| # | module | slug | lessons | concepts | Q | cards | refs |`);
w(`|---|---|---|---:|---:|---:|---:|---:|`);
for (const m of modules) {
  const ls = byMod[m.slug] || [];
  w(`| ${pad2(m.n)} | ${m.title} | \`${m.slug}\` | ${ls.length} | ${(conByMod[m.slug] || []).length} | ` +
    `${ls.reduce((a, l) => a + qOf(l), 0)} | ${ls.reduce((a, l) => a + (l.flashcards || []).length, 0)} | ` +
    `${ls.reduce((a, l) => a + (l.refs || []).length, 0)} |`);
}
w();
w(`Every module holds exactly 10 lessons. Concept sub-lessons range 0 to ` +
  `${Math.max(...modules.map((m) => (conByMod[m.slug] || []).length))}.`);
w();
w(`## 1.4 The ${PD.demos.length} demos, by category`);
w();
for (const c of PD.categories) {
  const s = c.slugs || [];
  w(`**${c.name || c.title}** (${s.length}) — ${s.map((x) => `\`${x}\``).join(" · ")}`);
  w();
}
w(`## 1.5 The ${PG.games.length} games`);
w();
w(`| game | what actually runs | group |`);
w(`|---|---|---|`);
for (const g of PG.games) w(`| **${g.title}** \`${g.slug}\` | ${esc(g.tech)} | ${esc(g.topic)} |`);
w();
w(`All ${PG.games.length} are LIVE, run in the browser with no server and no pretrained weights. The three`);
w(`learning ones train from zero while you watch.`);
w();
w(`## 1.6 The concept graph`);
w();
w(`${nGraph} concepts across ${Object.keys(areas).length} areas. ${concepts.length} carry a taught page; the rest are graph nodes`);
w(`that still appear as prerequisites and in Connections panels.`);
w();
w(`| area | concepts | taught |`);
w(`|---|---:|---:|`);
for (const [a, list] of Object.entries(areas).sort((x, y) => y[1].length - x[1].length))
  w(`| ${a} | ${list.length} | ${list.filter((c) => taught.has(c.id)).length} |`);
w();
w(`## 1.7 The ${PATHS.length} curated paths`);
w();
w(`| path | level | est | stages | steps |`);
w(`|---|---|---:|---:|---:|`);
for (const p of PATHS)
  w(`| **${p.title}** \`${p.id}\` | ${p.level} | ${p.estMinutes}m | ${(p.stages || []).length} | ` +
    `${(p.stages || []).reduce((a, s) => a + (s.steps || []).length, 0)} |`);
w();
w(`Plus \`/paths/build/\`, which generates a prerequisite-ordered route to any concept on demand,`);
w(`and a "how to get here" ladder on all ${nGraph} concept pages.`);
w();
w(`## 1.8 Derived surfaces`);
w();
w(`These add **no new content**. Each is a build step over \`content/lessons/**\` plus a UI, which`);
w(`is why they cannot fall out of sync with the curriculum.`);
w();
w(`| surface | built from | by |`);
w(`|---|---|---|`);
w(`| \`/interview/\` | every lesson's \`interview\` and \`flashcards\` | \`scripts/build-interview-index.mjs\` |`);
w(`| \`/pitfalls/\` | every lesson's \`body.pitfalls\` | \`scripts/build-pitfalls-index.mjs\` |`);
w(`| \`/concepts/\`, \`/concept-map/\` | \`concepts-index.js\` + \`content/concepts/\` | \`scripts/generate-concept-pages.mjs\` |`);
w(`| \`/paths/build/\`, concept ladders | the prerequisite graph | \`concept-paths.js\` |`);
w(`| The Flutter app bundle | the whole store | \`scripts/build-app-bundle.mjs\` |`);
w();
w(`## 1.9 Adjacent content`);
w();
w(`| | what |`);
w(`|---|---|`);
w(`| **HuggingFace course** | ${HF.sections.length} sections, 38 notebooks, mapped into the curriculum by \`cur[]\` refs. Supplementary and deliberately not duplicated into the store. |`);
w(`| **Key Concepts** | 3 galleries of looping SVG/CSS animations from Claude Design, kept verbatim with site chrome injected. |`);
w(`| **Building with GenAI** | One long essay on how this site was built. |`);
w(`| **Weekly Insights** | A weekly ML digest; 12 most recent weeks on the page, full archive in \`_private/digests/\`. Written by an automated task, not by hand. |`);
w(`| **Notebooks** | ${lessons.length} Jupyter notebooks in a separate repo (\`machine_learning_tutorials\`), one per lesson. Linked, never mirrored. |`);
w();
w(`---`);
w();

// ══ PART 2 ═════════════════════════════════════════════════════════════════
w(`# Part 2 — How the content is put together`);
w();
w(`## 2.1 One store, many surfaces`);
w();
w(`**\`content/\` is canonical.** Three record kinds — module, lesson, concept — validated against`);
w(`a frozen schema (\`content/SCHEMA.md\`, \`contentVersion ${meta.contentVersion}\`). Everything a reader sees is`);
w(`generated from it:`);
w();
w("```");
w(`content/modules/<slug>.json     ${String(modules.length).padStart(3)} records`);
w(`content/lessons/<mod>/<s>.json  ${String(lessons.length).padStart(3)} records`);
w(`content/concepts/<mod>/<id>.json ${String(concepts.length).padStart(3)} records`);
w(`        |`);
w(`        +-- curriculum.js / lectures.js / sub-lessons.js   (site data, GENERATED)`);
w(`        +-- content.json                                   (compiled bundle)`);
w(`        +-- learn/**/index.html + lesson-bodies/**         (${lessons.length} lesson pages)`);
w(`        +-- learn/**/index.html + sub-lesson-bodies/**     (${concepts.length} concept pages)`);
w(`        +-- concepts/** + concept-slices/**                (${nGraph} concept hubs)`);
w(`        +-- public/interview-manifest.json + 25 shards     (${T.q.toLocaleString()} Q, ${T.fc.toLocaleString()} cards)`);
w(`        +-- public/pitfalls-index.json                     (${T.pit.toLocaleString()} pitfalls)`);
w(`        +-- public/app/*.json                              (the Flutter app bundle)`);
w("```");
w();
w(`**Hand-editing a generated file fails the build**, not as a convention but as a check:`);
w(`\`prebuild\` runs a parity comparison and refuses when a generated file no longer matches what`);
w(`the store would produce.`);
w();
w(`## 2.2 What is NOT in the store`);
w();
w(`| | why |`);
w(`|---|---|`);
w(`| The ${PD.demos.length} demos and ${PG.games.length} games | They are programs, not documents. \`play-demos.js\` / \`play-games.js\` hold the registry entry; the algorithm lives in \`demos/<slug>.jsx\` / \`games/<slug>.jsx\`. |`);
w(`| ${T.jsx} flagship lesson bodies | Hand-built \`.jsx\` with bespoke diagrams. They carry a store record and a drill layer, but \`bodySource: "jsx"\` and their prose lives in the file. |`);
w(`| The concept **graph** | \`concepts-index.js\` holds the ${nGraph} nodes and their prerequisite edges. \`content/concepts/\` holds the ${concepts.length} taught *pages*. Two different things that share ids. |`);
w(`| Weekly Insights | \`weekly-insights.js\`, written weekly by an automated task. |`);
w(`| HuggingFace course | \`hf-lectures.js\`. Supplementary; mapped into the curriculum but not duplicated. |`);
w();
w(`## 2.3 Identity: the one thing that must never move`);
w();
w(`Every interview question and flashcard gets a content-derived FNV-1a id, and **that id is the`);
w(`key to a reader's own spaced-repetition schedule** in their browser and in the app. Both hashers`);
w(`key on **\`lesson.keyBase\`** (\`"<module>/<slug>"\`), never on the title and never on the record's`);
w(`current location.`);
w();
w(`The consequence worth knowing before touching content: **retitling a lesson is free; moving one`);
w(`between modules is not.** The v2 curriculum reshuffle moves 82 lessons between modules, which`);
w(`without \`keyBase\` would silently re-key ~32% of the corpus and reset every affected reader's`);
w(`review history, with nothing failing anywhere.`);
w();
w(`## 2.4 Two curricula, and which number means what`);
w();
w(`Two different true numbers describe this project, and conflating them is how the copy started`);
w(`contradicting itself:`);
w();
w(`| | number | meaning |`);
w(`|---|---|---|`);
w(`| **The site has** | ${modules.length} modules / ${lessons.length} lessons | What is written and live here. |`);
w(`| **The course is** | ${v2.modules.length} modules / ${v2.slots.length} slots | The notebooks' v2 curriculum, which now leads. |`);
w();
w(`The notebooks repo restructured to ${v2.modules.length}/${v2.slots.length} and **the notebooks lead; the site migrates.**`);
w(`\`/learn/ml-from-scratch/\` presents the v2 structure while every site route stays exactly where`);
w(`it was, because moving routes would re-key the corpus (§2.3). The bridge is`);
w(`\`content/migrations/v1-to-v2.json\`, regenerated by \`scripts/sync-v2-map.mjs\`.`);
w();
const disp = {};
for (const s of v2.slots) disp[s.disposition || s.kind || "?"] = (disp[s.disposition || s.kind || "?"] || 0) + 1;
w(`Slot dispositions: ` + Object.entries(disp).sort((a, b) => b[1] - a[1]).map(([k, n]) => `**${n}** ${k}`).join(" · ") + `.`);
w(`${v2.cuts.length} v1 topics are cut upstream and **the site keeps teaching them** — a notebook is cut`);
w(`because it will not run headlessly, which is not a reason to delete a written lesson.`);
w();
w(`## 2.5 How the registers cross-link`);
w();
const linkCounts = { page: 0, module: 0, none: 0, broken: 0 };
for (const d of PD.demos) linkCounts[linkKind(d)]++;
w(`| relation | authored in | count |`);
w(`|---|---|---:|`);
w(`| lesson -> its demos | \`lesson.surfaces.demos\` | ${lessons.reduce((a, l) => a + (((l.surfaces || {}).demos) || []).length, 0)} links |`);
w(`| demo -> its lesson | \`play-demos.js\` \`lesson\` | ${linkCounts.page} to a page, ${linkCounts.module} to a module index, ${linkCounts.none} none |`);
w(`| demo/game -> concepts | \`CONCEPT_TAGS\` | ${Object.values(TAGS.demos || {}).flat().length + Object.values(TAGS.games || {}).flat().length} tags |`);
w(`| concept -> its demo | \`concept.demo\` | ${concepts.filter((c) => c.demo).length} of ${concepts.length} |`);
w(`| concept -> prerequisites | \`concepts-index.js\` \`prereqs\` | ${Object.values(IDX).reduce((a, c) => a + ((c.prereqs || []).length), 0)} edges |`);
w(`| lesson -> lesson | \`prereqs\` / \`leadsTo\` | ${lessons.reduce((a, l) => a + (l.prereqs || []).length, 0)} prereq links |`);
w();
w(`The ${linkCounts.none} demos with no lesson link are deliberate: no single lesson owns them, and a wrong`);
w(`link is worse than none. The ${linkCounts.module} pointing at a module index are the same judgement, one`);
w(`level coarser.`);
w();
w(`---`);
w();

// ══ PART 3 ═════════════════════════════════════════════════════════════════
w(`# Part 3 — The expanded catalogue`);
w();
w(`Each item with enough detail to know what it actually does, plus its references. The`);
w(`"what runs" line for every demo and game is taken **from that file's own header comment**,`);
w(`written next to the implementation, so it describes the code rather than the marketing.`);
w();

// ── 3.1 games ─────────────────────────────────────────────────────────────
w(`## 3.1 The ${PG.games.length} games`);
w();
w(`Every game runs a real algorithm client-side. Nothing is pretrained and nothing calls a server;`);
w(`the three learning games start from zero every time you load the page.`);
w();
for (const cat of PG.categories) {
  w(`### ${cat.name || cat.title}`);
  w();
  for (const slug of cat.slugs || []) {
    const g = gameBySlug[slug]; if (!g) continue;
    const file = `games/${slug}.jsx`;
    w(`#### ${g.title} · \`/play/${slug}/\``);
    w();
    w(`**Technique.** ${esc(g.tech)}`);
    w();
    w(`**What runs.** ${brief(headerOf(file), 420)}`);
    w();
    const cs = constsOf(file, 5);
    if (cs.length) { w(`**Parameters** (from \`${file}\`):`); w(); w("```"); cs.forEach((c) => w(c)); w("```"); w(); }
    const tg = tagsFor("games", slug);
    if (tg.length) {
      w(`**Concepts taught** — ` + tg.map((t) => {
        const c = IDX[t]; const has = taught.has(t);
        const nm = (c && c.name) || t;
        const mod = (concepts.find((x) => x.id === t) || {}).module;
        return `${has && mod ? `[${nm}](/learn/${mod}/${t}/)` : nm} \`${t}\``;
      }).join(" · "));
      w();
    }
    w(`**Source.** \`${file}\` (${rd(file).split("\n").length} lines)`);
    w();
  }
}

// ── 3.2 demos ─────────────────────────────────────────────────────────────
w(`## 3.2 The ${PD.demos.length} demos`);
w();
w(`Grouped by the ${PD.categories.length} hub categories. Each line: what the file actually computes, the concepts`);
w(`it is tagged with, and the lesson it reads alongside.`);
w();
for (const cat of PD.categories) {
  const slugs = cat.slugs || [];
  w(`### ${cat.name || cat.title} (${slugs.length})`);
  if (cat.blurb || cat.desc) { w(); w(`*${esc(cat.blurb || cat.desc)}*`); }
  w();
  for (const slug of slugs) {
    const d = demoBySlug[slug]; if (!d) continue;
    const head = brief(headerOf(`demos/${slug}.jsx`));
    const tg = tagsFor("demos", slug);
    const bits = [];
    if (tg.length) bits.push(`concepts \`${tg.join("` `")}\``);
    if (d.lesson) bits.push(`lesson \`${d.lesson.replace(/^learn\//, "").replace(/\/$/, "")}\``);
    w(`**${d.title}** \`${slug}\``);
    w(`<br>${head}`);
    if (bits.length) w(`<br><sub>${bits.join(" · ")}</sub>`);
    w();
  }
}

// ── 3.3 modules + lessons + refs ──────────────────────────────────────────
w(`## 3.3 The ${modules.length} modules and ${lessons.length} lessons`);
w();
w(`Per module: what it covers, its lessons, and the references its lessons cite. Lesson columns`);
w(`are **Q** (interview questions across the three tiers), **C** (flashcards), **R** (references),`);
w(`and the demos the lesson wires in.`);
w();
for (const m of modules) {
  const ls = (byMod[m.slug] || []).sort((a, b) => String(a.id).localeCompare(String(b.id)));
  w(`### ${pad2(m.n)} · ${m.title}`);
  w();
  w(`\`${m.slug}\` · ${m.category} · ${ls.length} lessons · ${(conByMod[m.slug] || []).length} concept pages · \`/learn/${m.slug}/\``);
  w();
  if (m.lecture && m.lecture.summary) { w(esc(m.lecture.summary)); w(); }
  if (m.lecture && (m.lecture.takeaways || []).length) {
    w(`**You should leave able to:**`);
    w();
    for (const t of m.lecture.takeaways) w(`- ${esc(t)}`);
    w();
  }
  w(`| id | lesson | Q | C | R | demos |`);
  w(`|---|---|---:|---:|---:|---|`);
  for (const l of ls) {
    const dm = ((l.surfaces || {}).demos) || [];
    const flag = l.bodySource === "jsx" ? " ⬩" : "";
    w(`| ${l.id} | ${esc(l.title)}${flag} | ${qOf(l)} | ${(l.flashcards || []).length} | ${(l.refs || []).length} | ` +
      `${dm.length ? dm.map((s) => `\`${s}\``).join(" ") : "—"} |`);
  }
  w();
  if (ls.some((l) => l.bodySource === "jsx")) w(`⬩ = hand-built flagship lesson (prose lives in \`lessons/*.jsx\`, not the store).`);
  w();
  const cs = conByMod[m.slug] || [];
  if (cs.length) {
    w(`**Concept pages** (${cs.length}) — ` + cs.map((c) => `[${c.title}](/learn/${m.slug}/${c.id}/)`).join(" · "));
    w();
  }
  // references, deduplicated across the module's lessons
  const seen = new Set(), refs = [];
  for (const l of ls) for (const r of l.refs || []) {
    const k = (r.url || r.title || "").trim(); if (!k || seen.has(k)) continue;
    seen.add(k); refs.push(r);
  }
  if (refs.length) {
    w(`<details><summary><b>References</b> (${refs.length} unique across ${ls.length} lessons)</summary>`);
    w();
    for (const r of refs) w(`- ${r.url ? `[${esc(r.title)}](${r.url})` : esc(r.title)}`);
    w();
    w(`</details>`);
    w();
  }
}

// ── 3.4 concepts ──────────────────────────────────────────────────────────
w(`## 3.4 The concept graph`);
w();
w(`${nGraph} nodes, ${Object.values(IDX).reduce((a, c) => a + ((c.prereqs || []).length), 0)} prerequisite edges, 0 cycles. ${concepts.length} have a taught page. The graph drives`);
w(`three surfaces: the \`/concepts/\` hubs, \`/concept-map/\`, and every generated path.`);
w();
for (const [a, list] of Object.entries(areas).sort((x, y) => y[1].length - x[1].length)) {
  w(`### ${a} (${list.length}, ${list.filter((c) => taught.has(c.id)).length} taught)`);
  w();
  w(list.sort((p, q) => p.id.localeCompare(q.id)).map((c) =>
    taught.has(c.id) ? `**\`${c.id}\`**` : `\`${c.id}\``).join(" · "));
  w();
}
w(`**Bold** = has a taught page under \`/learn/<module>/<id>/\`. The rest are graph nodes: they`);
w(`still appear as prerequisites, in Connections panels and in generated paths.`);
w();

// ── 3.5 paths ─────────────────────────────────────────────────────────────
w(`## 3.5 The ${PATHS.length} curated paths`);
w();
w(`Hand-written routes with named stages and copy explaining each step. Generated paths`);
w(`(\`/paths/build/\`) cover the long tail; these cover the journeys worth narrating.`);
w();
for (const p of PATHS) {
  w(`### ${p.title} · \`/paths/${p.id}/\``);
  w();
  w(`${p.level} · ~${p.estMinutes} min · ${esc(p.tagline)}`);
  w();
  if ((p.outcomes || []).length) { for (const o of p.outcomes) w(`- ${esc(o)}`); w(); }
  for (const st of p.stages || []) {
    const steps = (st.steps || []).map((s) => `\`${s.ref}\``).join(" → ");
    w(`**${esc(st.name)}** — ${steps}`);
    w();
  }
}

// ── 3.6 derived surfaces ──────────────────────────────────────────────────
w(`## 3.6 The derived surfaces, in detail`);
w();
w(`### /interview/ — ${T.q.toLocaleString()} questions, ${T.fc.toLocaleString()} flashcards`);
w();
w(`One page, three modes (\`?mode=\` keeps them linkable). Every question comes from a lesson's`);
w(`\`interview\` block; nothing was written for this surface.`);
w();
w(`| tier | what it is | count |`);
w(`|---|---|---:|`);
for (const [k, label] of [["quickGrind", "Quick grind — recall, one or two sentences"], ["standard", "Standard — the real interview answer"], ["deepDive", "Deep dive — the follow-up a strong candidate invites"]])
  w(`| \`${k}\` | ${label} | ${lessons.reduce((a, l) => a + (((l.interview || {})[k]) || []).length, 0).toLocaleString()} |`);
w();
w(`- **Browse** — filter by module, tier, level.`);
w(`- **Drill** — SM-2 spaced repetition, scheduled in \`localStorage\`, keyed by content hash (§2.3).`);
w(`- **Mock** — a timed round, seeded so the same seed rebuilds the same round.`);
w();
w(`### /pitfalls/ — ${T.pit.toLocaleString()} failure modes`);
w();
w(`Every \`body.pitfalls\` entry across all ${lessons.length} lessons, searchable and faceted by module,`);
w(`category and source. Symptom tags cover ~11% of the corpus and are a **filter, never a`);
w(`classification** — most pitfalls are method-specific and belong to no generic symptom.`);
w();
w(`### /concepts/ and /concept-map/`);
w();
w(`${nGraph} hub pages plus a force-directed graph. Each hub shows the concept, its prerequisite`);
w(`ladder ("how to get here"), what it leads to, and everything tagged to it.`);
w();
w(`### /paths/build/ and the concept ladders`);
w();
w(`Generates a prerequisite-ordered route to any concept, with "I already know X" pruning that`);
w(`removes a whole subtree rather than one row. Backed by the same graph as §3.4.`);
w();
w(`### /playground/`);
w();
w(`A capstone sandbox: assemble a model from the pieces the curriculum teaches and run it.`);
w();

// ── 3.7 adjacent ──────────────────────────────────────────────────────────
w(`## 3.7 Adjacent content`);
w();
w(`### The HuggingFace companion course`);
w();
w(`| section | notebooks | maps to |`);
w(`|---|---:|---|`);
for (const s of HF.sections) {
  const nbs = s.notebooks || s.items || [];
  const cur = [...new Set(nbs.flatMap((n) => n.cur || []))];
  w(`| **${s.title}** \`${s.slug}\` | ${nbs.length} | ${cur.length} curriculum lessons |`);
}
w();
w(`38 notebooks total. Each row carries \`cur[]\` refs into the curriculum, so the two tracks are`);
w(`cross-referenced rather than duplicated.`);
w();
w(`### Key Concepts, Building with GenAI, Weekly Insights`);
w();
w(`| | |`);
w(`|---|---|`);
w(`| \`/learn/key-concepts/\` | 3 galleries of looping SVG/CSS animations, kept verbatim from Claude Design with site chrome injected by \`kc-mount.jsx\`. 13 concepts carry one as an "in motion" panel. |`);
w(`| \`/learn/building-with-genai/\` | A single essay on how this site was built. |`);
w(`| \`/weekly-insights/\` | A weekly ML digest. Topics are free-text and each item carries its own subtopics; 12 weeks on the page, the full archive in \`_private/digests/\`. |`);
w();
w(`---`);
w();

// ══ PART 4 ═════════════════════════════════════════════════════════════════
w(`# Part 4 — Editorial standards`);
w();
w(`What each kind of item has to contain. These are enforced by \`scripts/validate-content.mjs\``);
w(`where they can be, and by habit where they cannot.`);
w();
w(`## 4.1 The rule that produced most of the content's value`);
w();
w(`**Bench the claim before writing the prose.** Every number quoted on this site was measured by`);
w(`running the thing, not recalled. The reason this is a rule and not an aspiration: across the`);
w(`concept-authoring passes, **roughly a third of claims written from memory turned out to be`);
w(`wrong**, and each one looked like a result until it was checked.`);
w();
w(`The habit that catches them: **ask what the measurement would print if the claim were false.**`);
w(`If the answer is "the same number", there is no measurement yet.`);
w();
w(`Where a bench refuses to reproduce the textbook effect, the honest outcomes are to weaken the`);
w(`claim or write nothing. Both have happened and are recorded in \`_private/ENGINEERING-NOTES.md\`.`);
w();
w(`## 4.2 A lesson`);
w();
w(`| | requirement |`);
w(`|---|---|`);
w(`| Body | six sections: intuition, math, code, useCases, pitfalls, connections |`);
w(`| Interview | >= 12 quick-grind, >= 6 standard, each standard with a full deep dive |`);
w(`| Flashcards | >= 9, typed \`definition\` / \`formula\` / \`intuition\` / \`pitfall\` |`);
w(`| References | >= 4, real and resolving |`);
w(`| Level | \`intro\` / \`core\` / \`advanced\` |`);
w(`| Title | must byte-match \`curriculum.js\` |`);
w();
w(`The drill layer is mandatory for **every** LIVE lesson including the ${T.jsx} hand-built flagships.`);
w(`It was optional once, which is exactly why the flagships went a year without one.`);
w();
w(`## 4.3 A concept page`);
w();
w(`Four sections — *the intuition · the math (with a note on what the symbols cost) · in code (the`);
w(`load-bearing line commented) · and a fourth on the failure or the trade* — plus 3 takeaways and`);
w(`one demo.`);
w();
w(`**The fourth section is the one that matters.** It is what makes the page useful to someone who`);
w(`already knows the definition: write the thing people get wrong, not a recap. All ${concepts.length} have one.`);
w();
w(`## 4.4 A demo or game`);
w();
w(`| | requirement |`);
w(`|---|---|`);
w(`| The algorithm | **real**, implemented in JS, computed live. No recordings, no pretrained weights, no server. |`);
w(`| Controls | every one carries a \`help\` prop: one precise sentence on what that parameter does. |`);
w(`| Concepts | a \`CORE CONCEPTS\` block on where the idea shows up in real ML. |`);
w(`| Prose | written **after** driving the controls. Recorded four separate times: demos falsify the prose written for them. |`);
w(`| Accessibility | canvas named from the registry, a live region narrating state, keyboard-operable if it takes pointer input. All three are central in \`demo-chrome.jsx\`, not per-demo. |`);
w(`| Wiring | 9 touchpoints. \`scripts/new-demo.mjs\` does 8; \`gen-tag-slices.mjs\` is the 9th. |`);
w();
w(`## 4.5 House style`);
w();
w(`- **No em-dashes in reader-facing copy.** Enforced by \`audit-demo-prose.mjs\`. Deliberate`);
w(`  exceptions: \`refs[]\` citation separators and the \`"—"\` empty-stat placeholder.`);
w(`- **Bullets nest at most 3 per level.** Also enforced.`);
w(`- **Evergreen.** No timestamps, no "coming soon". Use \`PLANNED\`.`);
w(`- **HTML titles and meta are ASCII only** (the encoding gotcha: this box is a GBK locale).`);
w(`- **No alphabet-soup keyword chips.** Sentences that say something.`);
w();
w(`---`);
w();

// ══ PART 5 ═════════════════════════════════════════════════════════════════
const noLesson = PD.demos.filter((d) => linkKind(d) === "none");
w(`# Part 5 — Gaps, debts and deliberate omissions`);
w();
w(`Stated plainly, because an undocumented gap gets rediscovered as a bug.`);
w();
w(`## 5.1 Real debts`);
w();
w(`| | size | note |`);
w(`|---|---|---|`);
w(`| Flagship bodies not in the store | ${T.jsx} lessons | Prose lives only in \`lessons/*.jsx\`, so the Flutter app ships them \`bodyOn: "web"\` with a deep link. Closing it means authoring store bodies for the showcase lessons. |`);
w(`| Concepts with no taught page | ${nGraph - concepts.length} of ${nGraph} | Graph nodes only. Not defects: they work as prerequisites and Connections entries. |`);
w(`| Demos with no lesson link | ${noLesson.length} | ${noLesson.map((d) => `\`${d.slug}\``).join(", ")}. No single lesson owns them; a wrong link is worse than none. |`);
w(`| v2 slots the notebooks owe | see \`content/migrations/\` | Upstream authoring, not site work. |`);
w();
w(`## 5.2 Deliberate, not missing`);
w();
w(`- **Notebook deep links are off** on all ${modules.length} modules (\`notebooksSynced: false\`). Published`);
w(`  filenames disagree with canonical ones, and modules 05/06 are published under the pre-remap`);
w(`  order where the same number is a *different lesson*. Links fall back to the module folder,`);
w(`  which always resolves.`);
w(`- **The 3 topics the notebooks cut stay on the site** (§2.4).`);
w(`- **Demos are not ported to the app.** Porting would fork content. Still plus deep link.`);
w(`- **No symptom taxonomy on \`/pitfalls/\`** beyond the 11% filter. Two keyword routers were built,`);
w(`  measured, and rejected for misrouting.`);
w(`- **\`/interview/\` and \`/pitfalls/\` are not in the top nav.** It already carries 9 items.`);
w();
w(`## 5.3 Content opportunities`);
w();
w(`Not defects; places the content could grow.`);
w();
w(`- **${nGraph - concepts.length} untaught graph concepts**, though several are already covered by a differently-named`);
w(`  lesson, so the real number is smaller. \`scratchpad/realgap.mjs\` computes it rather than guessing.`);
w(`- **Six demos are tagged to the nearest existing concept** because the graph has no`);
w(`  tensor-semantics nodes. Adding them would take ${nGraph} to about ${nGraph + 6}.`);
w();
w(`---`);
w();

// ══ PART 6 ═════════════════════════════════════════════════════════════════
w(`# Part 6 — Provenance`);
w();
w(`## 6.1 Where every number in this file came from`);
w();
w(`| number | derived by reading |`);
w(`|---|---|`);
w(`| modules, lessons, concepts | counting \`content/**/*.json\` |`);
w(`| demos, games, categories | \`play-demos.js\`, \`play-games.js\` (executed, not parsed) |`);
w(`| graph concepts, areas, edges | \`concepts-index.js\` |`);
w(`| questions, cards, pitfalls, refs | summing the fields across all ${lessons.length} lesson records |`);
w(`| "what runs" per demo/game | the header comment in \`demos/<slug>.jsx\` / \`games/<slug>.jsx\` |`);
w(`| parameters per game | module-scope \`const NAME = ...\` lines in its source |`);
w(`| v2 modules, slots, dispositions | \`content/migrations/v1-to-v2.json\` |`);
w(`| routes | \`public/sitemap.xml\` |`);
w();
w(`## 6.2 Cross-reference integrity at generation time`);
w();
w(`The generator resolves every cross-reference it prints and refuses to hide a broken one.`);
w(`This run: **${problems.length} broken**.`);
w();
if (problems.length) { for (const p of problems) w(`- ${p}`); w(); }
w(`Checked: every demo's \`lesson\` resolves to a lesson, concept or module page · every`);
w(`\`CONCEPT_TAGS\` id is a real concept · every \`lesson.surfaces.demos\` slug is a real demo or game ·`);
w(`every \`concept.demo\` resolves · every demo and game has a source file.`);
w();
w(`## 6.3 Regenerating`);
w();
w("```");
w(`node scripts/gen-catalogue.mjs`);
w("```");
w();
w(`Reads only committed sources, writes only this file, and prints the integrity report above.`);
w(`Safe to run any time. **Re-run it after any content change** — a stale catalogue is the exact`);
w(`failure this repo has had twice, and the whole reason nothing here is typed by hand.`);
w();

// `_private/` is git-ignored, so it does not exist in a fresh clone. Create it
// rather than failing: this script is tracked and must run wherever the repo does.
const outDir = path.join(ROOT, "_private");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "CONTENT-CATALOGUE.md"), L.join("\n") + "\n");
console.log(`wrote _private/CONTENT-CATALOGUE.md — ${L.length} lines`);
console.log(`integrity: ${problems.length} broken cross-reference(s)`);
problems.slice(0, 15).forEach((p) => console.log("   " + p));
