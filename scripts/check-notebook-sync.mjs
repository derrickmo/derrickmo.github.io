// check-notebook-sync.mjs — decide, per module, whether it is safe to turn on
// per-lesson notebook deep links (content/modules/<slug>.json "notebooksSynced").
//
// Why this exists: CURRICULUM.notebookUrl() deep-links to
// modules/module_NN/<notebookFile> only when a module's gate is on. The store's
// notebookFile values are the CANONICAL names (post-B2 rename). GitHub holds
// whatever the drip published, which for several modules is an older naming — and
// in module 05/06 an older LESSON ORDER, where the same number is a different
// lesson. Flipping a gate on a module whose published names differ turns every
// one of its 10 lesson buttons into a 404, and nothing else in the build notices.
//
// Run:  node scripts/check-notebook-sync.mjs
//       node scripts/check-notebook-sync.mjs --verbose     (list every mismatch)
// Exit: 0 = no module is mis-gated; 1 = a gate is on for a module that would 404.
//
// Reads the notebooks repo through git, so it needs no working-tree checkout and
// never writes to it (D9: this repo is never pushed by tooling). Override the
// location with DM_NOTEBOOKS_REPO. Skips cleanly when the repo is absent.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const NB_REPO = process.env.DM_NOTEBOOKS_REPO || "C:/Users/Derrick/Desktop/Github/Machine Learning Tutorial";
const REF = process.env.DM_NOTEBOOKS_REF || "origin/main";
const VERBOSE = process.argv.includes("--verbose");

if (!existsSync(NB_REPO)) {
  console.log(`notebooks repo not found at ${NB_REPO} — skipping (set DM_NOTEBOOKS_REPO).`);
  process.exit(0);
}

// What the drip has actually published, straight from the ref. Excludes extras/.
let published;
try {
  published = new Set(
    execFileSync("git", ["-C", NB_REPO, "ls-tree", "-r", "--name-only", REF, "--", "modules"], { encoding: "utf8" })
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.endsWith(".ipynb") && !l.includes("/extras/"))
  );
} catch (e) {
  console.log(`could not read ${REF} from the notebooks repo — skipping. (${e.message.split("\n")[0]})`);
  process.exit(0);
}

const rows = [];
let misGated = 0;

for (const mf of readdirSync(join(ROOT, "content", "modules")).filter((f) => f.endsWith(".json"))) {
  const m = JSON.parse(readFileSync(join(ROOT, "content", "modules", mf), "utf8"));
  const dir = `modules/module_${m.n}/`;
  const lessons = readdirSync(join(ROOT, "content", "lessons", m.slug))
    .map((f) => JSON.parse(readFileSync(join(ROOT, "content", "lessons", m.slug, f), "utf8")))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));

  const wanted = lessons.filter((l) => l.surfaces && l.surfaces.notebookFile);
  const missing = wanted.filter((l) => !published.has(dir + l.surfaces.notebookFile));
  const publishedHere = [...published].filter((p) => p.startsWith(dir));
  const gate = m.notebooksSynced === true;
  const safe = wanted.length > 0 && missing.length === 0;

  if (gate && !safe) misGated++;
  rows.push({ n: m.n, slug: m.slug, want: wanted.length, pub: publishedHere.length, missing, gate, safe, dir });
}

rows.sort((a, b) => a.n.localeCompare(b.n));

console.log("module                       want  published  would-404  gate   verdict");
for (const r of rows) {
  const verdict = r.safe ? "SAFE to flip on" : r.pub === 0 ? "not published yet" : "MISMATCH — keep off";
  console.log(
    ` ${r.n} ${r.slug}`.padEnd(29),
    String(r.want).padEnd(5),
    String(r.pub).padEnd(10),
    String(r.missing.length).padEnd(10),
    String(r.gate).padEnd(6),
    r.gate && !r.safe ? `!! ${verdict} BUT GATE IS ON` : verdict
  );
}

if (VERBOSE) {
  for (const r of rows) {
    if (!r.missing.length || r.pub === 0) continue;
    console.log(`\n## module_${r.n} (${r.slug}) — ${r.missing.length} would 404`);
    for (const l of r.missing) {
      const atNumber = [...published].filter((p) => p.startsWith(r.dir + l.id)).map((p) => p.slice(r.dir.length));
      console.log(`   ${l.id}  store : ${l.surfaces.notebookFile}`);
      console.log(`          github: ${atNumber.length ? atNumber.join(", ") : "(nothing at this number)"}`);
    }
  }
}

const safeList = rows.filter((r) => r.safe).map((r) => r.slug);
console.log(`\nsafe to flip: ${safeList.length ? safeList.join(", ") : "none"}`);
console.log(`mis-gated (gate on but would 404): ${misGated}`);
if (!VERBOSE) console.log("re-run with --verbose to see every mismatched filename.");
process.exit(misGated ? 1 : 0);
