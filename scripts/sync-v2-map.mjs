#!/usr/bin/env node
// sync-v2-map.mjs — the bridge between the notebooks repo's v2 curriculum and
// this store.
//
// The notebooks repo restructured 25 modules / 250 notebooks into 26 / 282
// (docs/CURRICULUM.yaml: target_modules 26, target_slots 282). This script
// reads that repo's own machine-readable output and records, for every lesson
// in content/, where it lands in v2 — WITHOUT moving anything.
//
//   node scripts/sync-v2-map.mjs            # report only
//   node scripts/sync-v2-map.mjs --write    # also write content/migrations/v1-to-v2.json
//   node scripts/sync-v2-map.mjs --apply    # also write the additive `v2` block into the store
//   node scripts/sync-v2-map.mjs --check    # exit 1 if the store disagrees with the map
//
// WHY A SCRIPT AND NOT A ONE-OFF EDIT: Derrick has said the curriculum will
// move again. Every future restructure should be this script re-run against a
// new index.json, not a second hand migration.
//
// CLONE-SAFE: exits 0 with a SKIPPED line when the notebooks repo is absent,
// the same contract as check-notebook-sync.mjs, so CI without that checkout
// stays green.
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (p) => join(ROOT, p);

const NB = process.env.DM_NOTEBOOKS_REPO
  || "C:/Users/Derrick/Desktop/Github/Machine Learning Tutorial";

const args = new Set(process.argv.slice(2));
const WRITE = args.has("--write") || args.has("--apply");
const APPLY = args.has("--apply");
const CHECK = args.has("--check");

const MAP_OUT = R("content/migrations/v1-to-v2.json");

// ── the notebooks repo's own outputs ──────────────────────────────────────
const INDEX = join(NB, "docs/curriculum/index.json");
const RENUM = join(NB, "docs/migration/RENUMBER_MAP.csv");
const YAML  = join(NB, "docs/CURRICULUM.yaml");

if (!existsSync(INDEX) || !existsSync(RENUM)) {
  console.log(`SKIPPED sync-v2-map: notebooks repo not readable at ${NB}`);
  console.log("  (set DM_NOTEBOOKS_REPO to run this check)");
  process.exit(0);
}

// ── a CSV parser that handles the quoted titles in RENUMBER_MAP ───────────
// new_title carries commas ("Linear algebra I: vectors, matrices, geometry"),
// so split(",") silently shifts every later column. Parse properly.
function parseCSV(text) {
  const rows = [];
  let field = "", row = [], inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\r") { /* skip */ }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const head = rows.shift();
  return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

const slots = parseCSV(readFileSync(RENUM, "utf8"));
const index = JSON.parse(readFileSync(INDEX, "utf8"));
// `notebooks` is an OBJECT keyed by slot id, not an array — it carries per-slot
// `path`, `slug`, `prerequisites` and authoring `metrics` (a stub reads
// cells:1 / logic_lines:0, which is how the 33 unwritten slots are detectable).
const entries = Array.isArray(index.notebooks)
  ? index.notebooks
  : Object.values(index.notebooks);

// ── module set, from the YAML that declares the target ────────────────────
const yaml = readFileSync(YAML, "utf8");
const targetModules = Number((yaml.match(/^target_modules:\s*(\d+)/m) || [])[1]);
const targetSlots = Number((yaml.match(/^target_slots:\s*(\d+)/m) || [])[1]);

// Five tracks, declared as `I: {name: ..., modules: [1, 2]}`. They are how the
// Learn hub groups its rows — the site's own six hand-written ranges are what
// silently dropped a module 26, so take the grouping from upstream instead of
// re-deciding it here.
const trackOf = new Map();
const trackNames = new Map();
{
  // ⚠ The name is UNQUOTED and two of the five contain commas ("Classical ML,
  // evaluation and causality"), so `[^,]+` silently matches only 3 tracks and
  // leaves the rest null. Take everything up to `, modules:` instead.
  const re = /^\s{2}([IVX]+):\s*\{name:\s*(.+?),\s*modules:\s*\[([^\]]+)\]\}/gm;
  let m;
  while ((m = re.exec(yaml))) {
    const [, id, name, list] = m;
    trackNames.set(id, name.trim());
    for (const n of list.split(",")) trackOf.set(String(Number(n.trim())).padStart(2, "0"), id);
  }
}

const modules = [];
{
  const re = /^  - number:\s*(\d+)\s*$/gm;
  let m;
  while ((m = re.exec(yaml))) {
    const start = m.index + m[0].length;
    const rest = yaml.slice(start);
    const nextAt = rest.search(/^  - number:/m);
    const block = nextAt === -1 ? rest : rest.slice(0, nextAt);
    const g = (k) => {
      const hit = block.match(new RegExp(`^\\s+${k}:\\s*(.+)$`, "m"));
      return hit ? hit[1].trim().replace(/^["']|["']$/g, "") : "";
    };
    const n = String(m[1]).padStart(2, "0");
    modules.push({
      n, slug: g("slug"), title: g("title"),
      track: trackOf.get(n) || null,
      trackName: trackNames.get(trackOf.get(n)) || null,
    });
  }
}

// ── the cuts, declared in the YAML rather than the CSV ────────────────────
// The CSV lists surviving slots only, so a cut topic is invisible there. It is
// the one class that would be silently dropped from the site.
// They are inline-flow mappings spanning two lines:
//   - {id: "09-04", title: "MediaPipe real-time vision",
//      reason: "Needs a webcam, so it cannot execute headlessly. …"}
// `reason:` appears only in this block (verified: 3 occurrences, all cuts), so
// the mapping shape is the whole selector — no need to slice the section out.
const cuts = [];
{
  const re = /\{\s*id:\s*"([^"]+)",\s*title:\s*"([^"]+)",\s*reason:\s*"([^"]*)"\s*\}/g;
  let m;
  while ((m = re.exec(yaml))) cuts.push({ id: m[1], title: m[2], reason: m[3] });
}

// ── the store ─────────────────────────────────────────────────────────────
const storeLessons = [];
for (const mod of readdirSync(R("content/lessons"))) {
  for (const f of readdirSync(R(`content/lessons/${mod}`))) {
    if (!f.endsWith(".json")) continue;
    const path = R(`content/lessons/${mod}/${f}`);
    storeLessons.push({ path, mod, json: JSON.parse(readFileSync(path, "utf8")) });
  }
}
const byId = new Map(storeLessons.map((l) => [l.json.id, l]));

// ── join on the v1 SLOT ID, not the filename ──────────────────────────────
// `from` is authoritative and carries every source: "01-06", "06-03+extras/vggnet+06-08",
// "extras/weight_initialisation", or "new". Joining on old_path's basename
// instead loses every secondary source of a merge — 19 lessons, measured.
const parseFrom = (s) => (s === "new" || !s ? [] : s.split("+").map((x) => x.trim()).filter(Boolean));

const usedBy = new Map();   // v1 slot id -> [v2 slot ids]
for (const s of slots) {
  for (const src of parseFrom(s.from)) {
    if (src.startsWith("extras/")) continue;
    if (!usedBy.has(src)) usedBy.set(src, []);
    usedBy.get(src).push(s.new_id);
  }
}

const bySlotId = new Map(entries.map((e) => [e.id, e]));

const records = slots.map((s) => {
  const sources = parseFrom(s.from).filter((x) => !x.startsWith("extras/"));
  const extras = parseFrom(s.from).filter((x) => x.startsWith("extras/"));
  // `disposition` is upstream's own classification and stays authoritative for
  // new/promote/merge — note 6 rows marked `merge` fold one v1 lesson into an
  // `extras/` notebook, so counting sources instead would call them clean.
  // `split` is the one kind upstream does NOT label: it is the consequence of
  // one v1 lesson feeding two v2 slots, and missing it would copy the same
  // body to two URLs.
  let kind;
  if (s.disposition === "new") kind = "new";
  else if (s.disposition === "promote") kind = "promote";
  else if (s.disposition === "merge") kind = "merge";
  else if (sources.length > 1) kind = "merge";
  else if (sources.length === 1 && usedBy.get(sources[0]).length > 1) kind = "split";
  else kind = "clean";

  const idx = bySlotId.get(s.new_id) || {};
  return {
    id: s.new_id,
    module: String(s.new_module).padStart(2, "0"),
    moduleSlug: s.new_slug,
    title: s.new_title,
    tier: s.tier,
    notebookFile: idx.path ? basename(idx.path) : null,
    disposition: s.disposition,
    sourceKind: kind,
    sources,
    extras,
  };
});

// ── report ────────────────────────────────────────────────────────────────
const tally = (key) => records.reduce((a, r) => ((a[r[key]] = (a[r[key]] || 0) + 1), a), {});
const unmatchedSources = new Set();
for (const r of records) for (const src of r.sources) if (!byId.has(src)) unmatchedSources.add(src);

const homeless = storeLessons.filter((l) => !usedBy.has(l.json.id));

console.log(`notebooks repo : ${NB}`);
console.log(`declared target: ${targetModules} modules / ${targetSlots} slots`);
console.log(`parsed         : ${modules.length} modules / ${records.length} slots / ${entries.length} index entries`);
console.log(`tracks         : ${[...trackNames].map(([k, v]) => `${k} ${v}`).join(" · ")}`);
console.log(`dispositions   : ${JSON.stringify(tally("disposition"))}`);
console.log(`source kinds   : ${JSON.stringify(tally("sourceKind"))}`);
console.log(`store lessons  : ${storeLessons.length}`);
console.log(`cuts declared  : ${cuts.length}${cuts.length ? " — " + cuts.map((c) => c.id).join(", ") : ""}`);
console.log(`\nstore lessons with NO v2 home: ${homeless.length}`);
for (const l of homeless) console.log(`  ${l.json.id}  ${l.mod}/${l.json.slug}`);
if (unmatchedSources.size) {
  console.log(`\n⚠ v2 slots name a v1 source the store does not have: ${[...unmatchedSources].join(", ")}`);
}

// ── write the artifact ────────────────────────────────────────────────────
if (WRITE) {
  mkdirSync(dirname(MAP_OUT), { recursive: true });
  const siteModules = new Map(
    readdirSync(R("content/modules")).map((f) => {
      const j = JSON.parse(readFileSync(R(`content/modules/${f}`), "utf8"));
      return [j.slug, j];
    })
  );
  // A v2 module "was" the site module that supplies most of its clean carries.
  const wasFor = {};
  for (const r of records) {
    if (r.sourceKind !== "clean") continue;
    const src = byId.get(r.sources[0]);
    if (!src) continue;
    ((wasFor[r.moduleSlug] ||= {})[src.json.module] ||= 0, wasFor[r.moduleSlug][src.json.module]++);
  }
  const artifact = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString().slice(0, 10),
    generatedBy: "scripts/sync-v2-map.mjs",
    source: { repo: "machine_learning_tutorials", file: "docs/CURRICULUM.yaml" },
    from: { modules: siteModules.size, slots: storeLessons.length },
    to: { modules: targetModules, slots: targetSlots },
    modules: modules.map((m) => {
      const counts = wasFor[m.slug] || {};
      const was = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      return { ...m, wasSlug: was ? was[0] : null, slots: records.filter((r) => r.moduleSlug === m.slug).length };
    }),
    // Where a v2 slot points TODAY. Site routes deliberately do not move yet,
    // so a slot's page is its PRIMARY source lesson's existing URL. A slot with
    // no source (new / promote) has none and renders as planned-not-written.
    slots: records.map((r) => {
      // EVERY source, not just the primary. A merge folds 2-3 written
      // lessons into one v2 slot, and linking only the first dropped 15 live
      // pages out of the syllabus entirely — caught by audit-curriculum.
      const resolved = r.sources.map((id) => byId.get(id)).filter(Boolean)
        .map((l) => ({ module: l.json.module, slug: l.json.slug, title: l.json.title, status: l.json.status }));
      const src = r.sources.length ? byId.get(r.sources[0]) : null;
      return {
        ...r,
        site: src
          ? { module: src.json.module, slug: src.json.slug, title: src.json.title, status: src.json.status }
          : null,
        sites: resolved,
      };
    }),
    cuts: cuts.map((c) => {
      const l = byId.get(c.id);
      return {
        ...c,
        // A cut notebook does not delete a written lesson — the site keeps it.
        site: l ? { module: l.json.module, slug: l.json.slug, title: l.json.title } : null,
      };
    }),
  };
  writeFileSync(MAP_OUT, JSON.stringify(artifact, null, 2) + "\n");
  console.log(`\nwrote ${MAP_OUT.replace(ROOT, ".")}`);
}

// ── apply the additive `v2` block to the store ────────────────────────────
// Additive only. No id, slug, module or route changes — the v2 identity is
// recorded ALONGSIDE the live one so the eventual move is a script, not a
// judgement call. content/SCHEMA.md permits additive fields behind a
// contentVersion bump; that is how surfaces.notebookFile arrived at 1.1.0.
if (APPLY) {
  let touched = 0;
  const homeFor = new Map();
  for (const r of records) for (const src of r.sources) {
    if (!homeFor.has(src)) homeFor.set(src, []);
    homeFor.get(src).push(r);
  }
  for (const l of storeLessons) {
    const homes = homeFor.get(l.json.id) || [];
    const cut = cuts.find((c) => c.id === l.json.id);
    const v2 = homes.length
      ? {
          id: homes[0].id,
          module: homes[0].moduleSlug,
          disposition: homes[0].sourceKind,
          notebookFile: homes[0].notebookFile,
          ...(homes.length > 1 ? { alsoFeeds: homes.slice(1).map((h) => h.id) } : {}),
        }
      : { id: null, module: null, disposition: cut ? "cut" : "unmapped", notebookFile: null };
    if (JSON.stringify(l.json.v2) === JSON.stringify(v2)) continue;
    l.json.v2 = v2;
    writeFileSync(l.path, JSON.stringify(l.json, null, 2) + "\n");
    touched++;
  }
  console.log(`applied v2 blocks to ${touched} lesson file(s)`);
}

// ── check mode ────────────────────────────────────────────────────────────
if (CHECK) {
  const stale = storeLessons.filter((l) => !l.json.v2);
  if (stale.length) {
    console.error(`\nFAIL: ${stale.length} lesson(s) carry no v2 block — run --apply`);
    process.exit(1);
  }
  if (records.length !== targetSlots || modules.length !== targetModules) {
    console.error(`\nFAIL: parsed ${modules.length}/${records.length}, declared ${targetModules}/${targetSlots}`);
    process.exit(1);
  }
  console.log("\nv2 map OK");
}
