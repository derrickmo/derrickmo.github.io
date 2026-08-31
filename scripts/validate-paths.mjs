// validate-paths.mjs — every step ref in paths.js must resolve against the real
// registries, AND land on a page that exists. Run: node scripts/validate-paths.mjs
//
// paths.js holds 123 hand-written steps across 11 curated paths, each naming an id in
// another registry (demo / game / module / concept / lesson / hf). Nothing generates
// them, so it is the same drift risk as CONCEPT_TAGS — which had two live instances of
// exactly that (see CLAUDE.md 2026-08-30).
//
// ⚠ WHY THIS WAS REWRITTEN: the original inferred failure from the RESOLVER echoing the
// ref back as the title. That works for kinds whose resolver does a lookup, and silently
// misses `lesson`, because DM_PATH_RESOLVE builds a lesson href by string concatenation
// with no lookup at all (paths.js:374) — so a bad lesson ref produced a valid-looking
// link to a 404 and both of the old tests passed. Negative-tested: the old version caught
// demo/module/concept and MISSED lesson. This version tests set membership directly for
// every kind, and then checks the page is really on disk, which also covers any kind
// added later that nobody remembers to add to a list here.

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const win = {};
const fakeLS = { getItem: () => null, setItem: () => {} };
const load = (f) => { const txt = readFileSync(resolve(ROOT, f), "utf8"); new Function("window", "localStorage", txt)(win, fakeLS); };
["concepts-index.js", "play-demos.js", "play-games.js", "curriculum.js", "lectures.js", "hf-lectures.js", "paths.js"].forEach(load);

const CUR = win.CURRICULUM || { modules: [] };
const lessons = new Set();
for (const m of CUR.modules || []) for (const l of m.lessons || []) lessons.add(m.slug + "/" + l.slug);

// kind -> [the set of valid refs, where that kind's page lives]
const KINDS = {
  concept: [new Set(Object.keys(win.CONCEPTS_INDEX || {})), "concepts"],
  demo: [new Set(((win.PLAY_DEMOS || {}).demos || []).map((d) => d.slug)), "visualize"],
  game: [new Set(((win.PLAY_GAMES || {}).games || []).map((d) => d.slug)), "play"],
  module: [new Set((CUR.modules || []).map((m) => m.slug)), "learn"],
  lesson: [lessons, "learn"],
  hf: [new Set(((win.HF || {}).sections || []).map((s) => s.slug)), "learn/huggingface"],
};

let problems = 0, steps = 0;
const seenKinds = {};
const bad = (m) => { console.log("  ✗ " + m); problems++; };

for (const p of win.LEARNING_PATHS || []) {
  for (const st of p.stages || []) for (const step of st.steps || []) {
    steps++;
    seenKinds[step.kind] = (seenKinds[step.kind] || 0) + 1;
    const entry = KINDS[step.kind];
    if (!entry) { bad(`${p.id}: unknown step kind "${step.kind}" (ref "${step.ref}")`); continue; }
    const [valid, pageDir] = entry;

    // 1. the ref must name something that exists in its registry
    if (!valid.has(step.ref)) bad(`${p.id} / ${st.name}: [${step.kind}] ref "${step.ref}" is not in the registry`);

    // 2. and the page it links to must actually be on disk. Checked against source so it
    //    runs before a build; dist/ is accepted too so it also works on a built tree.
    const rel = join(pageDir, step.ref, "index.html");
    if (!existsSync(join(ROOT, rel)) && !existsSync(join(ROOT, "dist", rel)))
      bad(`${p.id} / ${st.name}: [${step.kind}] "${step.ref}" has no page at ${pageDir}/${step.ref}/`);

    // 3. the resolver must still produce a usable href
    const r = win.DM_PATH_RESOLVE(step);
    if (!r.href || r.href === "#") bad(`${p.id}: [${step.kind}] ref "${step.ref}" has no href`);
  }
}

// a path with no stages, or a stage with no steps, renders as an empty ladder
for (const p of win.LEARNING_PATHS || []) {
  if (!(p.stages || []).length) bad(`${p.id}: no stages`);
  for (const st of p.stages || []) if (!(st.steps || []).length) bad(`${p.id}: stage "${st.name}" has no steps`);
}

console.log(`  kinds used: ${Object.entries(seenKinds).map(([k, v]) => `${k} ${v}`).join(", ")}`);
console.log(`Checked ${(win.LEARNING_PATHS || []).length} paths, ${steps} steps. Problems: ${problems}`);
if (problems) process.exit(1);
console.log("OK — every learning-path step names a real item and reaches a real page.");
