// migrate-seed.mjs — A4 seed migration: read the live window-global registries
// (curriculum.js, lectures.js, sub-lessons.js) and emit the canonical content
// store (content/). Idempotent: existing files are SKIPPED (use --force to
// overwrite). Run: node scripts/migrate-seed.mjs [--force]
// Then: node scripts/validate-content.mjs
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STORE = join(ROOT, "content");
const FORCE = process.argv.includes("--force");
const TODAY = "2026-06-10"; // seed date — content authored before the store existed

const win = {};
const load = (f) => { const txt = readFileSync(resolve(ROOT, f), "utf8"); new Function("window", "localStorage", txt)(win, { getItem: () => null, setItem: () => {} }); };
["concepts-index.js", "play-demos.js", "curriculum.js", "lectures.js", "sub-lessons.js"].forEach(load);

const CURR = win.CURRICULUM, LEC = win.LECTURES, CODE = win.LECTURE_CODE, SUB = win.SUB_LESSONS;

let written = 0, skipped = 0;
const notes = [];
function emit(rel, obj) {
  const p = join(STORE, rel);
  if (existsSync(p) && !FORCE) { skipped++; return; }
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8");
  written++;
}

for (const m of CURR.modules) {
  const lec = LEC[m.slug], code = CODE[m.slug], sub = SUB[m.slug];
  if (!lec) { notes.push(`!! module ${m.slug}: no lectures.js entry — skipped`); continue; }
  const flagships = lec.flagships || (lec.flagship ? [lec.flagship] : []);

  // ── module file ──────────────────────────────────────────────
  const mod = {
    kind: "module", schemaVersion: 1,
    n: m.n, slug: m.slug, title: m.title, category: m.category,
    blurb: m.blurb, status: m.status,
    lecture: {
      // lecture display title may diverge stylistically from the curriculum title
      ...(lec.title !== m.title ? { title: lec.title } : {}),
      summary: lec.summary, prereqs: lec.prereqs, takeaways: lec.takeaways,
      ...(flagships.length ? { flagships } : {}),
      notebooks: lec.notebooks,
    },
    snippet: code ? { caption: code.caption, code: code.code } : undefined,
    ...(sub ? { subLessons: { title: sub.title, intro: sub.intro, order: sub.order || Object.keys(sub.lessons) } } : {}),
    updatedAt: TODAY,
  };
  if (!code) notes.push(`!! module ${m.slug}: no LECTURE_CODE snippet`);
  emit(`modules/${m.slug}.json`, mod);

  // ── concept files (taught sub-lessons) ───────────────────────
  if (sub) for (const [cid, c] of Object.entries(sub.lessons)) {
    emit(`concepts/${m.slug}/${cid}.json`, {
      kind: "concept", schemaVersion: 1,
      id: cid, module: m.slug,
      title: c.title, oneLine: c.oneLine,
      sections: c.sections, takeaways: c.takeaways,
      demo: c.demo || null,
      updatedAt: TODAY,
    });
  }

  // ── lesson stubs ─────────────────────────────────────────────
  for (const l of m.lessons) {
    // match flagship by href slug, NOT by n — lectures.js flagship n follows the
    // GitHub notebook numbering, which has drifted from curriculum.js lesson n
    // (e.g. forward-pass: lectures "05-06" vs curriculum "05-05"). Phase B reconciles.
    const flag = flagships.find(f => f.href.replace(/\/$/, "").endsWith(`/${l.slug}`)) || null;
    if (l.status !== "PENDING" && !flag) notes.push(`?? ${m.slug}/${l.slug}: status ${l.status} but no flagship href`);
    emit(`lessons/${m.slug}/${l.slug}.json`, {
      kind: "lesson", schemaVersion: 1,
      id: l.n, slug: l.slug, module: m.slug,
      title: l.title, status: l.status,
      ...(flag && l.status === "LIVE" ? { bodySource: "jsx" } : {}),
      surfaces: {
        notebook: parseInt(m.n, 10) <= 20,   // modules 01-20 have notebooks on GitHub today
        flagship: flag ? flag.href : null,
        demos: [], concepts: [],
      },
      updatedAt: TODAY,
    });
  }
}

console.log(`migrate-seed: ${written} written, ${skipped} skipped (existing)`);
notes.forEach(n => console.log("  " + n));
