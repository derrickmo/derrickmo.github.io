#!/usr/bin/env node
// build-app-bundle.mjs — the Phase D / D2 data contract: the JSON the Flutter app consumes.
//
// Emits, all GENERATED and gitignored, built by `prebuild` so it cannot go stale the way
// content.json did (RC-0002). The split is BY SURFACE, because the app has four tabs and a
// file no single screen needs whole should not sit in the cold path:
//   public/app/version.json        ~600 B — the D8 update check, and nothing else
//   public/app/manifest.json       modules + all 250 topic stubs: Learn tab + global search
//   public/app/catalog.json        demos + categories + games: the Visualize surface
//   public/app/paths.json          the 11 curated learning paths
//   public/app/roadmap.json        both precomputed graphs, fetched only in roadmap mode
//   public/app/concepts.json       all 155 concepts
//   public/app/modules/<slug>.json x25 — the full lessons of one module
//
// The first cut put all of that in ONE manifest and measured 307 KB, of which the roadmap
// (80 KB) and the demo catalog (66 KB) are each needed by exactly one screen. Measured, then
// split — the same reasoning, and the same shape, as the site's own /interview/ index.
//
// ── WHY IT IS SHARDED AT ALL ────────────────────────────────────────────────
// content/content.json is 10.1 MB and 87% of it is lesson bodies + interview layers. A phone
// parsing 10 MB of JSON at launch is a visible stall, and the app renders one module at a
// time. Bundle the manifest and download shards on demand, or bundle everything for full
// offline — the app chooses; this contract supports both and reports the cost of each.
//
// ── ZERO FORKED CONTENT ─────────────────────────────────────────────────────
// Every field is DERIVED here from a canonical source and none is authored:
//   content/content.json  lessons, modules, concepts   (itself generated from content/)
//   play-demos.js         demo catalog + categories + the "why it matters" blurbs
//   play-games.js         the games
//   paths.js              the 11 curated learning paths
//   concepts-index.js     the concept graph (prereqs + the derived leadsTo transpose)
// If the app ever needs a field that does not exist upstream, add it upstream.
//
// ⚠ FINDING, and it is a real one: 25 of the 250 lessons are `bodySource: "jsx"` and carry NO
// body in the store — their prose lives only in the site's hand-built lessons/*.jsx. They are
// the 25 FLAGSHIP lessons, i.e. the showcase ones. The bundle ships them honestly, as
// `body: null` with `bodyOn: "web"` and a deep link, rather than pretending. APP-HANDOFF §5's
// "every topic has a lesson" box is therefore NOT met, and this script says so out loud.

import { readFileSync, writeFileSync, mkdirSync, rmSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (p) => join(ROOT, p);
const readGlobals = (file) => { const w = {}; new Function("window", readFileSync(R(file), "utf8"))(w); return w; };

const C = JSON.parse(readFileSync(R("content/content.json"), "utf8"));
const { PLAY_DEMOS } = readGlobals("play-demos.js");
const { PLAY_GAMES } = readGlobals("play-games.js");
const { LEARNING_PATHS } = readGlobals("paths.js");
const { CONCEPTS_INDEX } = readGlobals("concepts-index.js");

const SITE = "https://derrickmo.github.io";

// ── modules ─────────────────────────────────────────────────────────────────
const modules = C.modules.map((m) => ({
  n: m.n, slug: m.slug, title: m.title, track: m.track ?? null,
  blurb: m.blurb ?? null, status: m.status,
  // Deep links to a per-lesson notebook are gated per module and every gate is currently off
  // (scripts/check-notebook-sync.mjs enforces why). The app must fall back to the folder.
  notebooksSynced: m.notebooksSynced === true,
  repoDir: `modules/module_${String(m.n).padStart(2, "0")}`,
  web: `/learn/${m.slug}/`,
  shard: `modules/${m.slug}.json`,
}));

// ── topics (= lessons): a stub for the manifest, a body for the shard ───────
const stubs = [], bodies = {};
for (const l of C.lessons) {
  const iv = l.interview || {};
  stubs.push({
    id: l.id, slug: l.slug, module: l.module, title: l.title,
    status: l.status,
    level: l.level ?? null,                 // waived for legacy flagships; null, never invented
    bodyOn: l.bodySource === "jsx" ? "web" : "bundle",
    prereqs: l.prereqs || [],
    leadsTo: l.leadsTo || [],
    demos: l.surfaces?.demos || [],
    notebookFile: l.surfaces?.notebookFile ?? null,
    counts: {
      quick: (iv.quickGrind || []).length,
      standard: (iv.standard || []).length,
      // THREE tiers, not two. A standard question's deepDive is a separate question with its
      // own q/a, and there are 784 of them across the curriculum. Counting only quick +
      // standard reported 4,426 against the site's 5,210 — the app and the site would have
      // advertised different corpora. audit-app-bundle now cross-checks the total.
      deep: (iv.standard || []).filter((q) => q.deepDive && q.deepDive.a).length,
      cards: (l.flashcards || []).length,
      refs: (l.refs || []).length,
    },
    updatedAt: l.updatedAt ?? null,
    web: `/learn/${l.module}/${l.slug}/`,
  });
  (bodies[l.module] ||= []).push({
    id: l.id, slug: l.slug, title: l.title,
    body: l.body ?? null,                   // null for the 25 flagships — see the header note
    interview: l.interview ?? null,
    flashcards: l.flashcards || [],
    refs: l.refs || [],
  });
}

// ── categories + the demo catalog (the app shows a still + "open interactive on web") ────
const demoBySlug = Object.fromEntries(PLAY_DEMOS.demos.map((d) => [d.slug, d]));
const categories = PLAY_DEMOS.categories.map((c) => ({
  name: c.name, why: c.why,
  demos: c.slugs.filter((s) => demoBySlug[s]),
}));
const demos = PLAY_DEMOS.demos.map((d) => ({
  slug: d.slug, title: d.title, topic: d.topic, blurb: d.blurb, status: d.status,
  lesson: d.lesson ? "/" + d.lesson : null,
  web: `/visualize/${d.slug}/`,
  // Thumbnails are APP-HANDOFF §5's last unchecked box. Emit null rather than a path that
  // would 404 — an invented URL is the easiest self-inflicted broken image.
  thumb: null,
}));
const games = (PLAY_GAMES?.games || []).map((g) => ({
  slug: g.slug, title: g.title, status: g.status, web: `/play/${g.slug}/`,
}));

// ── paths ───────────────────────────────────────────────────────────────────
const paths = LEARNING_PATHS.map((p) => ({
  id: p.id, title: p.title, level: p.level, estMinutes: p.estMinutes,
  tagline: p.tagline, outcomes: p.outcomes || [],
  stages: (p.stages || []).map((s) => ({
    name: s.name,
    steps: (s.steps || []).map((st) => ({ kind: st.kind, ref: st.ref, note: st.note ?? null })),
  })),
}));

// ── roadmap: PRECOMPUTED nodes + edges, per APP-HANDOFF §2 ──────────────────
// Two graphs, because the site has two and they answer different questions: the CURRICULUM
// graph (250 lessons, the app's roadmap mode) and the CONCEPT graph (188 nodes, the site's
// /concept-map/). Edges point prereq -> dependent, so a topological read is a study order.
const lessonKey = (l) => `${l.module}/${l.slug}`;
const lessonKeys = new Set(C.lessons.map(lessonKey));
const lessonEdges = [];
for (const l of C.lessons) for (const p of l.prereqs || []) if (lessonKeys.has(p)) lessonEdges.push([p, lessonKey(l)]);

const conceptEdges = [];
for (const [id, c] of Object.entries(CONCEPTS_INDEX)) for (const p of c.prereqs || []) if (CONCEPTS_INDEX[p]) conceptEdges.push([p, id]);

const roadmap = {
  lessons: {
    nodes: C.lessons.map((l) => ({ id: lessonKey(l), n: l.id, module: l.module, title: l.title, level: l.level ?? null })),
    edges: lessonEdges,
  },
  concepts: {
    nodes: Object.values(CONCEPTS_INDEX).map((c) => ({ id: c.id, name: c.name, area: c.area })),
    edges: conceptEdges,
  },
};

// ── concepts, shipped whole (small, and several surfaces use them) ─────────
// A concept has NO `slug` — its id IS its slug, and the page lives at learn/<module>/<id>/.
// The first cut assumed c.slug and emitted 155 URLs reading /learn/<module>/undefined/;
// audit-app-bundle caught every one on its first run, which is the argument for writing the
// validator beside the builder rather than after it.
const concepts = C.concepts.map((c) => ({
  id: c.id, slug: c.id, module: c.module, title: c.title,
  oneLine: c.oneLine ?? null,
  sections: c.sections || [],
  takeaways: c.takeaways || [],
  demo: c.demo ?? null,
  web: `/learn/${c.module}/${c.id}/`,
}));

// ── write ───────────────────────────────────────────────────────────────────
const outDir = R("public/app");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(join(outDir, "modules"), { recursive: true });

const counts = {
  modules: modules.length, topics: stubs.length, concepts: concepts.length,
  demos: demos.length, games: games.length, paths: paths.length,
  topicsWithBundledBody: stubs.filter((s) => s.bodyOn === "bundle").length,
  topicsBodyOnWeb: stubs.filter((s) => s.bodyOn === "web").length,
  questions: stubs.reduce((a, s) => a + s.counts.quick + s.counts.standard + s.counts.deep, 0),
  cards: stubs.reduce((a, s) => a + s.counts.cards, 0),
};
const stamp = {
  contentVersion: C.meta.contentVersion,
  schemaVersion: C.meta.schemaVersion,
  updatedAt: C.meta.updatedAt,
  builtAt: new Date().toISOString().slice(0, 10),
};

const written = [];
const write = (rel, obj) => {
  const p = join(outDir, rel);
  writeFileSync(p, JSON.stringify(obj));
  const bytes = statSync(p).size;
  const gz = gzipSync(readFileSync(p)).length;      // Pages serves gzip; that is what crosses the wire
  written.push({ rel, bytes, gz });
  return { bytes, gz };
};

// D8: the update channel. Deliberately its own tiny file, so an app can poll for a version
// bump without pulling the manifest to discover that nothing changed.
write("version.json", {
  ...stamp, site: SITE, counts,
  files: {
    manifest: "manifest.json", catalog: "catalog.json", paths: "paths.json",
    roadmap: "roadmap.json", concepts: "concepts.json", moduleShard: "modules/{module}.json",
  },
});
write("manifest.json", { ...stamp, site: SITE, counts, modules, topics: stubs });
write("catalog.json", { ...stamp, categories, demos, games });
write("paths.json", { ...stamp, paths });
write("roadmap.json", { ...stamp, roadmap });
write("concepts.json", { ...stamp, concepts });

let shardTotal = 0, shardGz = 0, biggest = { slug: null, bytes: 0 };
for (const m of modules) {
  const { bytes, gz } = write(`modules/${m.slug}.json`, {
    ...stamp,
    module: m.slug,
    lessons: (bodies[m.slug] || []).sort((a, b) => a.id.localeCompare(b.id)),
  });
  shardTotal += bytes;
  shardGz += gz;
  if (bytes > biggest.bytes) biggest = { slug: m.slug, bytes, gz };
}

const kb = (b) => (b / 1024).toFixed(0) + " KB";
const mb = (b) => (b / 1024 / 1024).toFixed(2) + " MB";
const of = (rel) => written.find((w) => w.rel === rel);
console.log(`app bundle: contentVersion ${stamp.contentVersion}   (raw store 10.13 MB)`);
for (const rel of ["version.json", "manifest.json", "catalog.json", "paths.json", "roadmap.json", "concepts.json"]) {
  const w = of(rel);
  console.log(`  ${rel.padEnd(15)} ${kb(w.bytes).padStart(8)}  ${kb(w.gz).padStart(8)} gz`);
}
console.log(`  ${String(modules.length).padStart(2)} module shards ${mb(shardTotal).padStart(8)}  ${mb(shardGz).padStart(8)} gz   (avg ${kb(shardTotal / modules.length)}, largest ${biggest.slug} ${kb(biggest.bytes)})`);
console.log(`  COLD START   manifest + the largest module = ${kb(of("manifest.json").gz + biggest.gz)} over the wire`);
console.log(`  FULL OFFLINE ${mb(written.reduce((a, w) => a + w.bytes, 0))} raw / ${mb(written.reduce((a, w) => a + w.gz, 0))} gz`);
console.log(`  roadmap: ${roadmap.lessons.nodes.length} lesson nodes / ${roadmap.lessons.edges.length} edges · ${roadmap.concepts.nodes.length} concept nodes / ${roadmap.concepts.edges.length} edges`);
if (counts.topicsBodyOnWeb) {
  console.log(`  ⚠ ${counts.topicsBodyOnWeb} topics carry NO body (bodySource "jsx" — flagship prose lives in the site's .jsx). Shipped as bodyOn:"web" + a deep link.`);
}
