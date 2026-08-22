// validate-paths.mjs — sanity-check that every step ref in paths.js resolves
// against the real registries. Run: node scripts/validate-paths.mjs
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const win = {};
const fakeLS = { getItem: () => null, setItem: () => {} };
const load = (f) => { const txt = readFileSync(resolve(ROOT, f), "utf8"); new Function("window", "localStorage", txt)(win, fakeLS); };
["concepts-index.js", "play-demos.js", "play-games.js", "curriculum.js", "lectures.js", "hf-lectures.js", "paths.js"].forEach(load);

let problems = 0, steps = 0;
for (const p of win.LEARNING_PATHS) {
  for (const st of p.stages) for (const step of st.steps) {
    steps++;
    const r = win.DM_PATH_RESOLVE(step);
    const resolvableKinds = ["concept", "demo", "game", "module", "hf"];
    const failed = resolvableKinds.includes(step.kind) && r.title === step.ref && !step.title;
    if (failed) { console.log(`  ✗ ${p.id}: [${step.kind}] ref "${step.ref}" did NOT resolve`); problems++; }
    if (!r.href || r.href === "#") { console.log(`  ✗ ${p.id}: [${step.kind}] ref "${step.ref}" has no href`); problems++; }
  }
}
console.log(`Checked ${win.LEARNING_PATHS.length} paths, ${steps} steps. Problems: ${problems}`);
process.exit(problems ? 1 : 0);
