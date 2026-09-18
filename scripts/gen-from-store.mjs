// gen-from-store.mjs — A5: generate the site's window-global data files FROM the
// canonical content store (content/). The store is the source of truth; the three
// generated files (curriculum.js, lectures.js, sub-lessons.js) must never be hand-
// edited again — edit content/ and re-run this.
//
//   node scripts/gen-from-store.mjs            emit to .gen-out/ + parity check
//   node scripts/gen-from-store.mjs --write    overwrite the real files + content/content.json
//
// Parity = deep-equality of the loaded window globals (SUB_LESSONS, LECTURES,
// LECTURE_CODE, CURRICULUM.modules). Helper functions are verbatim templates below —
// if you change a helper in the site, change it HERE.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STORE = join(ROOT, "content");
const OUT = join(ROOT, ".gen-out");
const WRITE = process.argv.includes("--write");
const FORCE = process.argv.includes("--force"); // allow --write despite data diffs (intentional store changes)

// ── read the store ───────────────────────────────────────────────────────────
const readJ = (p) => JSON.parse(readFileSync(p, "utf8"));
const meta = readJ(join(STORE, "meta.json"));
const modules = readdirSync(join(STORE, "modules")).filter(f => f.endsWith(".json"))
  .map(f => readJ(join(STORE, "modules", f))).sort((a, b) => a.n.localeCompare(b.n));
const lessonsByModule = {}, conceptsByModule = {};
for (const m of modules) {
  const ld = join(STORE, "lessons", m.slug);
  lessonsByModule[m.slug] = existsSync(ld)
    ? readdirSync(ld).filter(f => f.endsWith(".json")).map(f => readJ(join(ld, f))).sort((a, b) => a.id.localeCompare(b.id))
    : [];
  const cd = join(STORE, "concepts", m.slug);
  conceptsByModule[m.slug] = existsSync(cd)
    ? readdirSync(cd).filter(f => f.endsWith(".json")).map(f => readJ(join(cd, f)))
    : [];
}

// ── build the in-memory globals from the store ──────────────────────────────
const CURR_MODULES = modules.map(m => {
  const mod = {
    n: m.n, slug: m.slug, title: m.title, category: m.category,
    blurb: m.blurb, status: m.status,
    lessons: lessonsByModule[m.slug].map(l => {
      const e = { n: l.id, slug: l.slug, title: l.title, status: l.status };
      if (l.surfaces && l.surfaces.notebookFile) e.nb = l.surfaces.notebookFile;   // v1.1 deep-link filename
      return e;
    }),
  };
  if (m.notebooksSynced === true) mod.nbSync = true;   // v1.1: GitHub folder synced to canonical filenames
  return mod;
});

const LECTURES = {}, LECTURE_CODE = {};
for (const m of modules) {
  const e = {
    n: m.n, title: m.lecture.title || m.title,
    summary: m.lecture.summary, prereqs: m.lecture.prereqs, takeaways: m.lecture.takeaways,
  };
  const fl = m.lecture.flagships || [];
  if (fl.length === 1) e.flagship = fl[0];
  else if (fl.length > 1) e.flagships = fl;
  e.notebooks = m.lecture.notebooks;
  LECTURES[m.slug] = e;
  if (m.snippet) LECTURE_CODE[m.slug] = { caption: m.snippet.caption, code: m.snippet.code };
}

const SUB_LESSONS = {};
for (const m of modules) {
  if (!m.subLessons) continue;
  const lessons = {};
  const byId = Object.fromEntries(conceptsByModule[m.slug].map(c => [c.id, c]));
  for (const cid of m.subLessons.order) {
    const c = byId[cid];
    if (!c) { console.error(`!! ${m.slug}: subLessons.order id "${cid}" has no concept file`); process.exit(1); }
    const entry = { title: c.title, oneLine: c.oneLine, sections: c.sections, takeaways: c.takeaways };
    if (c.demo) entry.demo = c.demo;
    lessons[cid] = entry;
  }
  for (const c of conceptsByModule[m.slug]) if (!m.subLessons.order.includes(c.id))
    console.error(`?? ${m.slug}: concept "${c.id}" not in subLessons.order (excluded)`);
  SUB_LESSONS[m.slug] = { title: m.subLessons.title, intro: m.subLessons.intro, order: m.subLessons.order, lessons };
}

// ── verbatim templates (header + helpers) ────────────────────────────────────
const GEN_NOTE = (src) => `// GENERATED from content/ by scripts/gen-from-store.mjs — DO NOT EDIT BY HAND.
// Edit the canonical store (content/${src}) and re-run the generator.
// contentVersion ${meta.contentVersion}
`;

const J = (v) => JSON.stringify(v, null, 2);

// ── the v2 curriculum, from content/migrations/ ─────────────────────────────
// The notebooks repo restructured to 26 modules / 282 slots and now LEADS
// (policy reversed 2026-09-17). The site presents that structure while its own
// routes stay put, so a v2 slot renders as a link to the page its content lives
// on TODAY — the mapping is data, not a move. Written by sync-v2-map.mjs.
// Absent artifact => no CURRICULUM_V2 and the hub falls back to the v1 grouping,
// so a clone without the notebooks repo still builds.
const V2_PATH = join(STORE, "migrations", "v1-to-v2.json");
const V2 = existsSync(V2_PATH) ? readJ(V2_PATH) : null;

const V2_MODULES = V2 ? V2.modules.map((m) => ({
  n: m.n, slug: m.slug, title: m.title, track: m.track, trackName: m.trackName,
  wasSlug: m.wasSlug,
  lessons: V2.slots
    .filter((s) => s.moduleSlug === m.slug)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((s) => ({
      n: s.id,
      title: s.title,
      kind: s.sourceKind,
      // `href` is the lesson's CURRENT page. null = planned, not written: the
      // 25 new + 7 promoted slots the notebooks declare and the site has no
      // content for. Rendering those as links would 404.
      href: s.site ? `learn/${s.site.module}/${s.site.slug}/` : null,
      on: s.site ? `${s.site.module}/${s.site.slug}` : null,
      // A merge draws on more than one written lesson; all of them stay
      // reachable from the syllabus or they are effectively unpublished.
      // Linking only the primary dropped 15 live pages out of the outline —
      // caught by audit-curriculum's orphan check on its first run.
      more: (s.sites || []).slice(1).map((x) => ({
        href: `learn/${x.module}/${x.slug}/`, on: `${x.module}/${x.slug}`, title: x.title,
      })),
    })),
})) : null;

// The 3 topics the notebooks CUT that the site still teaches. They belong to no
// v2 module, so without this they would silently vanish from the outline.
const V2_KEPT = V2 ? V2.cuts.filter((c) => c.site).map((c) => ({
  n: c.id, title: c.site.title, reason: c.reason,
  href: `learn/${c.site.module}/${c.site.slug}/`,
})) : null;

const curriculumJs = `${GEN_NOTE("modules/, lessons/")}// curriculum.js — window.CURRICULUM for all ${CURR_MODULES.length} modules + ${CURR_MODULES.reduce((a, m) => a + m.lessons.length, 0)} lessons.
// Loaded BEFORE any *-app.jsx. The learn / module / lesson page apps all
// consume window.CURRICULUM.
//
// status legend:
//   PENDING — not started, dim
//   DRAFT   — being written, link active
//   LIVE    — fully published, link active + bright

window.CURRICULUM = {
  modules: ${J(CURR_MODULES).replace(/\n/g, "\n  ")},

  // Helper lookups
  findModule(slug) { return this.modules.find(m => m.slug === slug); },
  findLesson(moduleSlug, lessonSlug) {
    const m = this.findModule(moduleSlug);
    return m ? m.lessons.find(l => l.slug === lessonSlug) : null;
  },
  prevNext(moduleSlug, lessonSlug) {
    const idx = this.modules.findIndex(m => m.slug === moduleSlug);
    if (idx < 0) return { prev: null, next: null };
    const m = this.modules[idx];
    const lidx = m.lessons.findIndex(l => l.slug === lessonSlug);
    if (lidx < 0) return { prev: null, next: null };

    let prev = null, next = null;
    if (lidx > 0) {
      prev = { module: m, lesson: m.lessons[lidx - 1] };
    } else if (idx > 0) {
      const pm = this.modules[idx - 1];
      prev = { module: pm, lesson: pm.lessons[pm.lessons.length - 1] };
    }
    if (lidx < m.lessons.length - 1) {
      next = { module: m, lesson: m.lessons[lidx + 1] };
    } else if (idx < this.modules.length - 1) {
      const nm = this.modules[idx + 1];
      next = { module: nm, lesson: nm.lessons[0] };
    }
    return { prev, next };
  },

  // Repo URL helpers
  repo: "https://github.com/derrickmo/machine_learning_tutorials",
  notebookUrl(moduleSlug, lessonSlug) {
    // B4: per-lesson deep link when the module's GitHub folder has been synced to
    // the canonical filenames (nbSync, from the store's notebooksSynced) AND the
    // lesson carries its filename (nb). Otherwise fall back to the module folder,
    // which always resolves once the drip creates it (the pre-B4 behavior).
    const m = this.findModule(moduleSlug);
    if (!m) return this.repo;
    const l = lessonSlug ? m.lessons.find(x => x.slug === lessonSlug) : null;
    if (m.nbSync && l && l.nb) return \`\${this.repo}/blob/main/modules/module_\${m.n}/\${l.nb}\`;
    return \`\${this.repo}/tree/main/modules/module_\${m.n}\`;
  },
  colabUrl(moduleSlug, lessonSlug) {
    return this.notebookUrl(moduleSlug, lessonSlug)
      .replace("github.com", "colab.research.google.com/github")
      .replace("/blob/main/", "/blob/main/");
  },
};
${V2_MODULES ? `
// ── window.CURRICULUM_V2 — the notebooks' 26-module / ${V2.to.slots}-slot curriculum ──
// The structure the course is being rebuilt to. Consumed by learn-app.jsx to
// render the syllabus; every lesson links to the page it lives on TODAY, so no
// route here is new. \`href: null\` means the notebooks declare the slot and the
// site has not written it — ${V2_MODULES.reduce((a, m) => a + m.lessons.filter((l) => !l.href).length, 0)} of ${V2.to.slots}.
// GENERATED from content/migrations/v1-to-v2.json — re-run sync-v2-map.mjs.
window.CURRICULUM_V2 = {
  modules: ${J(V2_MODULES).replace(/\n/g, "\n  ")},

  // Kept on the site, cut from the notebooks — see the block comment above.
  kept: ${J(V2_KEPT).replace(/\n/g, "\n  ")},

  tracks() {
    const out = [];
    for (const m of this.modules) {
      let t = out.find(x => x.id === m.track);
      if (!t) { t = { id: m.track, name: m.trackName, modules: [] }; out.push(t); }
      t.modules.push(m);
    }
    return out;
  },
  counts() {
    const slots = this.modules.reduce((a, m) => a + m.lessons.length, 0);
    const written = this.modules.reduce((a, m) => a + m.lessons.filter(l => l.href).length, 0);
    return { modules: this.modules.length, slots, written, planned: slots - written };
  },
};
` : ""}`;

const lecturesJs = `${GEN_NOTE("modules/")}// lectures.js — condensed on-site lectures for the ${modules.length} ML-from-Scratch modules.
// Each is a high-level distillation; the full runnable notebooks live on GitHub.
// Consumed by module-app.jsx. Keyed by the curriculum slug (see curriculum.js).
// notebook fields: n=number, t=topic, d=dataset, m=time.

window.LECTURES = ${J(LECTURES)};

// Minimal code illustration per module — the one idea, in a few lines.
window.LECTURE_CODE = ${J(LECTURE_CODE)};

window.LECTURES_REPO = "https://github.com/derrickmo/machine_learning_tutorials";
window.lectureFolder = function (n) { return \`\${window.LECTURES_REPO}/tree/main/modules/module_\${n}\`; };
`;

const subLessonsJs = `${GEN_NOTE("concepts/, modules/*.subLessons")}// sub-lessons.js — per-concept sub-lessons that break each ML-from-scratch module
// down into the concepts it teaches. Each module page (module-app.jsx) renders its
// concept sequence as a "Concept by concept" syllabus; each concept gets its own
// taught lesson page at learn/<module>/<concept>/ (concept-lesson-app.jsx).
// Pages are generated by scripts/gen-sublesson-pages.mjs.

window.SUB_LESSONS = ${J(SUB_LESSONS)};

// resolve a sub-lesson + its module context; null if missing.
window.DM_SUBLESSON = function (moduleSlug, conceptId) {
  const m = (window.SUB_LESSONS || {})[moduleSlug];
  if (!m) return null;
  const lesson = m.lessons[conceptId];
  if (!lesson) return null;
  const order = m.order || Object.keys(m.lessons);
  const i = order.indexOf(conceptId);
  return {
    module: m, moduleSlug, conceptId, lesson, order, index: i,
    prev: i > 0 ? order[i - 1] : null,
    next: i >= 0 && i < order.length - 1 ? order[i + 1] : null,
  };
};
`;

// ── compiled content.json (app / notebooks artifact) ─────────────────────────
const contentJson = JSON.stringify({
  meta,
  modules,
  lessons: modules.flatMap(m => lessonsByModule[m.slug]),
  concepts: modules.flatMap(m => conceptsByModule[m.slug]),
}, null, 2) + "\n";

// ── parity check: deep-equal generated vs current globals ───────────────────
const loadJs = (txt) => { const w = {}; new Function("window", "localStorage", txt)(w, { getItem: () => null, setItem: () => {} }); return w; };
const cur = {};
for (const f of ["curriculum.js", "lectures.js", "sub-lessons.js"]) Object.assign(cur, loadJs(readFileSync(join(ROOT, f), "utf8")));
const gen = {};
for (const txt of [curriculumJs, lecturesJs, subLessonsJs]) Object.assign(gen, loadJs(txt));

let diffs = 0;
function deepEq(a, b, path) {
  if (typeof a === "function" && typeof b === "function") return;       // helpers compared by behavior below
  if (a === b) return;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) { console.log(`  DIFF ${path}: array length ${a.length} vs ${b.length}`); diffs++; return; }
    a.forEach((v, i) => deepEq(v, b[i], `${path}[${i}]`));
    return;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      if (a[k] === undefined && b[k] === undefined) continue;
      deepEq(a[k], b[k], `${path}.${k}`);
    }
    return;
  }
  console.log(`  DIFF ${path}: ${JSON.stringify(a)?.slice(0, 60)} vs ${JSON.stringify(b)?.slice(0, 60)}`); diffs++;
}
deepEq(cur.CURRICULUM.modules, gen.CURRICULUM.modules, "CURRICULUM.modules");
deepEq(cur.LECTURES, gen.LECTURES, "LECTURES");
deepEq(cur.LECTURE_CODE, gen.LECTURE_CODE, "LECTURE_CODE");
deepEq(cur.SUB_LESSONS, gen.SUB_LESSONS, "SUB_LESSONS");
// ⚠ A GLOBAL NOT LISTED HERE IS NOT CHECKED. Parity loads every global the
// generated text defines, but only compares the ones named on these lines — so
// CURRICULUM_V2 was invisible to it the moment it was added, and a curriculum.js
// stale against content/migrations/ would have reported "parity: 0 diffs".
// Same class as content.json drifting while parity stayed clean (RC-0002).
// Compared both ways so ADDING or REMOVING the bridge is also a diff.
deepEq(
  cur.CURRICULUM_V2 ? cur.CURRICULUM_V2.modules : null,
  gen.CURRICULUM_V2 ? gen.CURRICULUM_V2.modules : null,
  "CURRICULUM_V2.modules",
);
deepEq(
  cur.CURRICULUM_V2 ? cur.CURRICULUM_V2.kept : null,
  gen.CURRICULUM_V2 ? gen.CURRICULUM_V2.kept : null,
  "CURRICULUM_V2.kept",
);
// helper behavior spot-checks — WARN only (helpers change intentionally via this
// template; data diffs above are the hard gate)
let helperDiffs = 0;
const eq = (a, b, what) => { if (JSON.stringify(a) !== JSON.stringify(b)) { console.log(`  helper changed: ${what} (intentional template edits are OK)`); helperDiffs++; } };
eq(cur.CURRICULUM.notebookUrl("transformers", "self-attention"), gen.CURRICULUM.notebookUrl("transformers", "self-attention"), "notebookUrl");
eq(cur.CURRICULUM.prevNext("foundations", "linear-algebra"), gen.CURRICULUM.prevNext("foundations", "linear-algebra"), "prevNext");
eq(cur.lectureFolder("05"), gen.lectureFolder("05"), "lectureFolder");
eq(cur.DM_SUBLESSON("transformers", "attention"), gen.DM_SUBLESSON("transformers", "attention"), "DM_SUBLESSON");

console.log(`parity: ${diffs} diffs`);

// ── emit ─────────────────────────────────────────────────────────────────────
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "curriculum.js"), curriculumJs, "utf8");
writeFileSync(join(OUT, "lectures.js"), lecturesJs, "utf8");
writeFileSync(join(OUT, "sub-lessons.js"), subLessonsJs, "utf8");
writeFileSync(join(OUT, "content.json"), contentJson, "utf8");
console.log(`emitted to .gen-out/`);

if (WRITE) {
  if (diffs && !FORCE) { console.error("refusing --write with parity diffs (re-run with --force for intentional store changes)"); process.exit(1); }
  if (diffs && FORCE) console.log(`--force: writing ${diffs} intentional data diffs`);
  writeFileSync(join(ROOT, "curriculum.js"), curriculumJs, "utf8");
  writeFileSync(join(ROOT, "lectures.js"), lecturesJs, "utf8");
  writeFileSync(join(ROOT, "sub-lessons.js"), subLessonsJs, "utf8");
  writeFileSync(join(STORE, "content.json"), contentJson, "utf8");
  console.log("WROTE curriculum.js, lectures.js, sub-lessons.js, content/content.json");
}
process.exit(diffs && !(WRITE && FORCE) ? 1 : 0);
