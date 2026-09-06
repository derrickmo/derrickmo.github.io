// verify-build-output.mjs — assert dist/ is publishable before it ships (PF-0008).
//
// The deploy workflow published dist/ unconditionally, so a whole class of failure was
// invisible until a reader hit it: a file that never reached the deploy, a route count
// that silently collapsed, an SRI regression. Every check here corresponds to a bug this
// repo has actually had.
//
// Run:  node scripts/verify-build-output.mjs      (after npm run build)
// Exit: 0 publishable, 1 with the reason.

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const problems = [];
const note = (s) => console.log("  " + s);

if (!existsSync(DIST)) { console.error("dist/ does not exist — run npm run build first"); process.exit(1); }

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}
const files = walk(DIST);
// Routes are index.html only — gen-sitemap.mjs walks the same set. 404.html and the
// sandboxed public/viz/*.html iframe animations are pages but not routes, and are
// correctly absent from the sitemap.
const html = files.filter((f) => f.endsWith("index.html"));
const allHtml = files.filter((f) => f.endsWith(".html"));

// 1. Routes against the sitemap. These are two independently produced sets, so a mismatch
//    means a page was added or lost without the sitemap being regenerated.
//    Compared as SETS, not counts: a rename changes both sides by one and leaves the counts
//    equal, so a count check passes while the sitemap advertises a 404 and omits a real page.
const routePath = (f) => {
  const rel = f.slice(DIST.length).replace(/\\/g, "/").replace(/\/index\.html$/, "/");
  return rel === "/" || rel.endsWith("/") ? rel || "/" : rel + "/";
};
const smPath = join(DIST, "sitemap.xml");
if (!existsSync(smPath)) problems.push("dist/sitemap.xml missing");
else {
  const sm = readFileSync(smPath, "utf8");
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  let smPaths = [];
  try {
    smPaths = locs.map((u) => new URL(u).pathname);
  } catch {
    problems.push("sitemap contains a <loc> that is not an absolute URL");
  }
  note(`routes built: ${html.length}   sitemap urls: ${locs.length}`);
  if (html.length < 700) problems.push(`only ${html.length} routes built — expected ~780`);

  const onDisk = new Set(html.map(routePath));
  const inMap = new Set(smPaths);
  const ghosts = [...inMap].filter((u) => !onDisk.has(u));
  const unlisted = [...onDisk].filter((u) => !inMap.has(u));
  const dupes = smPaths.filter((u, i) => smPaths.indexOf(u) !== i);

  if (ghosts.length)
    problems.push(`sitemap lists ${ghosts.length} URL(s) with no page on disk (a crawler gets a 404): ${ghosts.slice(0, 4).join(", ")}${ghosts.length > 4 ? " …" : ""} — re-run scripts/gen-sitemap.mjs after building`);
  if (unlisted.length)
    problems.push(`${unlisted.length} built page(s) missing from the sitemap: ${unlisted.slice(0, 4).join(", ")}${unlisted.length > 4 ? " …" : ""} — re-run scripts/gen-sitemap.mjs after building`);
  if (dupes.length)
    problems.push(`sitemap repeats ${dupes.length} URL(s): ${[...new Set(dupes)].slice(0, 4).join(", ")}`);
}

// 1b. Every destination the command palette advertises must resolve. 670 entries, 189 of
//     them script-generated; rename a page and the palette silently offers a 404 with
//     nothing to catch it. Exact check, so it can never be noisy.
const siPath = join(DIST, "search-index.js");
if (existsSync(siPath)) {
  const win = {};
  try {
    new Function("window", readFileSync(siPath, "utf8"))(win);
  } catch (e) {
    problems.push("search-index.js does not evaluate: " + e.message);
  }
  const idx = win.DM_NAV_INDEX;
  if (!Array.isArray(idx)) problems.push("search-index.js defines no DM_NAV_INDEX array");
  else {
    const onDisk = new Set(html.map(routePath));
    const dead = [];
    const seen = new Map();
    for (const e of idx) {
      const clean = String(e.href || "").split("#")[0].split("?")[0];
      if (!clean.startsWith("/")) { dead.push(`${e.label} -> ${e.href} (not root-relative)`); continue; }
      const asRoute = clean.endsWith("/") ? clean : clean + "/";
      const asFile = join(DIST, clean.replace(/^\/+/, ""));
      if (!onDisk.has(asRoute) && !(existsSync(asFile) && statSync(asFile).isFile())) {
        dead.push(`${e.label} -> ${e.href}`);
      }
      seen.set(e.href, (seen.get(e.href) || 0) + 1);
    }
    const dupHref = [...seen].filter(([, n]) => n > 1);
    note(`command palette: ${idx.length} destinations`);
    if (dead.length)
      problems.push(`${dead.length} command-palette destination(s) 404: ${dead.slice(0, 4).join("; ")}${dead.length > 4 ? " …" : ""}`);
    if (dupHref.length)
      problems.push(`command palette lists ${dupHref.length} href(s) twice: ${dupHref.slice(0, 4).map(([h]) => h).join(", ")}`);
  }
}

// 2. Files that must reach the deploy. og-default.png is here because it spent months at the
//    repo root, where Vite never copies from, so every social card on the site was a 404.
for (const f of ["og-default.png", "sitemap.xml", "robots.txt", "404.html", "search-index.js", "favicon.svg"]) {
  if (!existsSync(join(DIST, f))) problems.push(`missing dist/${f}`);
}

// 3. React must be the production build AND still carry its integrity hash. The build used
//    to strip SRI when swapping to production, leaving only localhost protected.
const home = existsSync(join(DIST, "index.html")) ? readFileSync(join(DIST, "index.html"), "utf8") : "";
if (!/react@[\d.]+\/umd\/react\.production\.min\.js/.test(home)) problems.push("home page does not load production React");
if (!/react\.production\.min\.js"[^>]*integrity="sha384-/.test(home)) problems.push("production React has no integrity hash (SRI stripped?)");

// 4. The search index must stay lazily loaded. If a page ever references it statically, the
//    ~140 KB is back on every route and the PF-0021 win is silently undone.
const eager = allHtml.filter((f) => /<script[^>]+src="[^"]*search-index\.js"/.test(readFileSync(f, "utf8")));
if (eager.length) problems.push(`${eager.length} page(s) load search-index.js statically — it must be fetched on demand`);

// 5. No page should ship a stray lesson-body bundle from the template it was cloned from.
const strays = allHtml.filter((f) => (readFileSync(f, "utf8").match(/lesson-bodies\/[^"]+\.js/g) || []).length > 1);
if (strays.length) problems.push(`${strays.length} page(s) load more than one lesson-bodies bundle`);

// 6. The /interview/ corpus is generated and gitignored, so nothing in the repo
//    proves it shipped. If prebuild is reordered or the builder fails quietly, the
//    page deploys and every fetch 404s -- the reader just sees an empty hub. Assert
//    the manifest, one shard per module, and that the manifest agrees with itself.
const manPath = join(DIST, "interview-manifest.json");
if (!existsSync(manPath)) {
  problems.push("interview-manifest.json is missing from dist/ -- the drill hub would load nothing");
} else {
  const man = JSON.parse(readFileSync(manPath, "utf8"));
  const missing = man.modules.filter((m) => !existsSync(join(DIST, "interview", m.slug + ".json")));
  if (missing.length) problems.push(missing.length + " interview shard(s) missing from dist/: " + missing.slice(0, 3).map((m) => m.slug).join(", "));
  const declared = man.modules.reduce((a, m) => a + m.questions, 0);
  if (declared !== man.counts.questions) problems.push("interview manifest disagrees with itself: modules sum to " + declared + ", counts say " + man.counts.questions);
  if (!man.counts.questions) problems.push("interview manifest declares zero questions");
  note("interview corpus: " + man.counts.questions + " questions, " + man.counts.cards + " cards, " + man.modules.length + " shards");
}

// 7. Same reasoning for the /pitfalls/ index: generated, gitignored, and the page
//    is useless without it.
const pfPath = join(DIST, "pitfalls-index.json");
if (!existsSync(pfPath)) {
  problems.push("pitfalls-index.json is missing from dist/ -- the failure-mode index would load nothing");
} else {
  const pf = JSON.parse(readFileSync(pfPath, "utf8"));
  if (!pf.rows || !pf.rows.length) problems.push("pitfalls index has no rows");
  else if (pf.rows.length !== pf.counts.total) problems.push("pitfalls index disagrees with itself: " + pf.rows.length + " rows vs counts.total " + pf.counts.total);
  else note("pitfalls index: " + pf.counts.total + " entries across " + pf.modules.length + " modules");
}

// 8. The Phase D app bundle. Same reasoning as 6 and 7 -- generated, gitignored, and
//    invisible to the repo -- but the consequence is worse: an app that shipped against a
//    missing endpoint fails on a device, after a store review, with no way to hot-fix it.
//    Assert the version stamp, one shard per module, and that the manifest agrees with itself.
const appVer = join(DIST, "app", "version.json");
if (!existsSync(appVer)) {
  problems.push("app/version.json is missing from dist/ -- the app update channel would 404");
} else {
  const v = JSON.parse(readFileSync(appVer, "utf8"));
  const man = existsSync(join(DIST, "app", "manifest.json")) ? JSON.parse(readFileSync(join(DIST, "app", "manifest.json"), "utf8")) : null;
  if (!man) problems.push("app/manifest.json is missing from dist/");
  else {
    if (man.contentVersion !== v.contentVersion) problems.push("app bundle disagrees with itself: manifest " + man.contentVersion + " vs version.json " + v.contentVersion);
    if (man.topics.length !== v.counts.topics) problems.push("app manifest declares " + v.counts.topics + " topics and carries " + man.topics.length);
    const missing = man.modules.filter((m) => !existsSync(join(DIST, "app", "modules", m.slug + ".json")));
    if (missing.length) problems.push(missing.length + " app module shard(s) missing from dist/: " + missing.slice(0, 3).map((m) => m.slug).join(", "));
    for (const f of ["catalog.json", "paths.json", "roadmap.json", "concepts.json"]) {
      if (!existsSync(join(DIST, "app", f))) problems.push("app/" + f + " is missing from dist/");
    }
    note("app bundle: contentVersion " + v.contentVersion + ", " + v.counts.topics + " topics, " + man.modules.length + " shards");
  }
}

if (problems.length) {
  console.error("\nBUILD NOT PUBLISHABLE:");
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}
console.log("\nOK — dist/ is publishable.");
