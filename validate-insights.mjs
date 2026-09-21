#!/usr/bin/env node
// Validates weekly-insights.js against the Weekly Insights schema.
//
//   node validate-insights.mjs [path-to-weekly-insights.js]
//
// Exits 0 if valid, 1 if not, printing every problem. This is the cheap,
// dependency-free gate used by CI and by the Sunday digest task in place of a
// full `npm run build` (no bundler or npm registry needed). It enforces:
//   - newest-first, unique dates, at most 12 entries
//   - each entry: ISO date, range, 3-6 tldr bullets
//   - 2 to 6 topic sections, each with a non-empty header and intro
//   - every item has a primary http(s) source and a body in one of two shapes
//   - watching items (if present) have text + source
//
// TWO ITEM SHAPES, both valid forever:
//
//   LEGACY (every entry through 2026-09-20): fixed fields whatsNew /
//   howItWorks / impact, each a string or an array of sub-bullets. These weeks
//   also used exactly three fixed section headers.
//
//   CURRENT (2026-09-27 onward): `parts`, an array of { label, bullets } so
//   each topic names its own subtopics — a foundation-model item can run
//   "New releases / Innovations / Benchmark evaluation" while a research item
//   runs "What's new / Method / Impact vs prior work".
//
// Deliberately NOT enforced: section headers (topics are chosen weekly to fit
// what happened), and prose length (a validator should not fail a build over
// word count; the runbook carries the scannability guidance instead).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const path = process.argv[2]
  ? process.argv[2]
  : fileURLToPath(new URL("./weekly-insights.js", import.meta.url));

// The three headers every entry through 2026-09-20 used. Still accepted; no
// longer required, since topics are now chosen to fit the week.
const LEGACY_SECTIONS = ["// ACADEMIC RESEARCH", "// INDUSTRY PRACTICES", "// NEW FRAMEWORKS"];
const MAX_ENTRIES = 12;
const MIN_SECTIONS = 2;
const MAX_SECTIONS = 6;
const MAX_PARTS = 5;      // subtopics per item
const MAX_BULLETS = 6;    // bullets per subtopic

const errors = [];
const err = (m) => errors.push(m);
const isHttpUrl = (u) => typeof u === "string" && /^https?:\/\/\S+$/.test(u);
const isIsoDate = (d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);
const nonEmpty = (s) => typeof s === "string" && s.trim().length > 0;

function loadEntries(file) {
  let src = readFileSync(file, "utf8");
  // A lagging filesystem mount can append a run of NUL (char code 0) padding.
  // Strip a trailing NUL run; treat any embedded NUL as real corruption.
  let end = src.length;
  while (end > 0 && src.charCodeAt(end - 1) === 0) end--;
  src = src.slice(0, end);
  for (let i = 0; i < src.length; i++) {
    if (src.charCodeAt(i) === 0) throw new Error("file contains embedded NUL bytes (corruption)");
  }
  const win = {};
  // eslint-disable-next-line no-new-func
  new Function("window", src)(win);
  if (!Array.isArray(win.WEEKLY_INSIGHTS)) throw new Error("window.WEEKLY_INSIGHTS is not an array");
  return win.WEEKLY_INSIGHTS;
}

function validateSource(src, where) {
  if (!src || typeof src !== "object") return err(`${where}: missing source`);
  if (!nonEmpty(src.label)) err(`${where}: source.label missing`);
  if (!isHttpUrl(src.url)) err(`${where}: source.url is not an http(s) URL`);
}

// A legacy pattern field: non-empty string, or array of non-empty sub-bullets.
// No word cap — length is an editorial matter, not a build gate.
function validatePatternField(v, where, field) {
  if (Array.isArray(v)) {
    if (v.length === 0) return err(`${where}: ${field} is an empty array`);
    if (v.length > MAX_BULLETS) {
      err(`${where}: ${field} has ${v.length} sub-bullets, max ${MAX_BULLETS}`);
    }
    v.forEach((b, i) => {
      if (!nonEmpty(b)) err(`${where}: ${field}[${i}] is empty or not a string`);
    });
    return;
  }
  if (!nonEmpty(v)) err(`${where}: missing or empty ${field}`);
}

// Current shape: parts: [ { label, bullets: [...] } ]. Labels are free text so
// each topic can name its own subtopics.
function validateParts(parts, where) {
  if (!Array.isArray(parts) || parts.length === 0) {
    return err(`${where}: parts must be a non-empty array`);
  }
  if (parts.length > MAX_PARTS) {
    err(`${where}: ${parts.length} parts, max ${MAX_PARTS}`);
  }
  const seen = new Set();
  parts.forEach((p, i) => {
    const pw = `${where} parts[${i}]`;
    if (!p || typeof p !== "object") return err(`${pw}: not an object`);
    if (!nonEmpty(p.label)) err(`${pw}: missing label`);
    else {
      const key = p.label.trim().toLowerCase();
      if (seen.has(key)) err(`${pw}: duplicate label "${p.label}"`);
      seen.add(key);
    }
    if (!Array.isArray(p.bullets) || p.bullets.length === 0) {
      return err(`${pw}: bullets must be a non-empty array`);
    }
    if (p.bullets.length > MAX_BULLETS) {
      err(`${pw}: ${p.bullets.length} bullets, max ${MAX_BULLETS}`);
    }
    p.bullets.forEach((b, j) => {
      if (!nonEmpty(b)) err(`${pw}.bullets[${j}]: empty or not a string`);
    });
  });
}

function validateItem(it, where) {
  if (!it || typeof it !== "object") return err(`${where}: not an object`);
  const hasParts = it.parts !== undefined;
  const hasLegacy = ["whatsNew", "howItWorks", "impact"].some((f) => it[f] !== undefined);
  if (hasParts && hasLegacy) {
    err(`${where}: has both parts and legacy whatsNew/howItWorks/impact — pick one shape`);
  } else if (hasParts) {
    validateParts(it.parts, where);
  } else if (hasLegacy) {
    for (const f of ["whatsNew", "howItWorks", "impact"]) {
      validatePatternField(it[f], where, f);
    }
  } else {
    err(`${where}: no body — needs parts[] (current) or whatsNew/howItWorks/impact (legacy)`);
  }
  validateSource(it.source, where);
}

function validateEntry(e, i) {
  const w = `entry[${i}] (${e && e.date})`;
  if (!isIsoDate(e.date)) err(`${w}: date must be YYYY-MM-DD`);
  if (!nonEmpty(e.range)) err(`${w}: range missing`);
  if (!Array.isArray(e.tldr) || e.tldr.length < 3 || e.tldr.length > 6) {
    err(`${w}: tldr must be 3-6 bullets`);
  }
  if (!Array.isArray(e.sections)) {
    err(`${w}: sections missing`);
    return;
  }
  // Topics are chosen weekly, so headers are free text. What is enforced is a
  // sane count, a non-empty header, and no duplicate topics in one week.
  if (e.sections.length < MIN_SECTIONS || e.sections.length > MAX_SECTIONS) {
    err(`${w}: ${e.sections.length} sections, expected ${MIN_SECTIONS}-${MAX_SECTIONS}`);
  }
  const headers = e.sections.map((s) => (s && s.header) || "");
  headers.forEach((h, k) => {
    if (!nonEmpty(h)) err(`${w}: section[${k}] has no header`);
  });
  const dupes = headers.filter((h, k) => h && headers.indexOf(h) !== k);
  if (dupes.length) err(`${w}: duplicate section header(s): ${[...new Set(dupes)].join(", ")}`);
  e.sections.forEach((s, k) => {
    const sw = `${w} ${(s && s.header) || "section[" + k + "]"}`;
    if (!nonEmpty(s.intro)) err(`${sw}: missing intro`);
    if (!Array.isArray(s.items) || s.items.length === 0) {
      err(`${sw}: no items`);
      return;
    }
    s.items.forEach((it, j) => validateItem(it, `${sw} item[${j}]`));
  });
  if (e.watching !== undefined) {
    if (!Array.isArray(e.watching)) {
      err(`${w}: watching must be an array`);
    } else {
      e.watching.forEach((it, j) => {
        if (!nonEmpty(it.text)) err(`${w} watching[${j}]: missing text`);
        validateSource(it.source, `${w} watching[${j}]`);
      });
    }
  }
}

let entries;
try {
  entries = loadEntries(path);
} catch (e) {
  console.error(`FAIL: could not load ${path}: ${e.message}`);
  process.exit(1);
}

if (entries.length === 0) err("no entries");
if (entries.length > MAX_ENTRIES) err(`too many entries: ${entries.length} > ${MAX_ENTRIES}`);

const dates = entries.map((e) => e.date);
if (JSON.stringify(dates) !== JSON.stringify([...dates].sort().reverse())) {
  err("entries must be newest-first (descending by date)");
}
if (new Set(dates).size !== dates.length) err("duplicate entry dates");

entries.forEach(validateEntry);

if (errors.length) {
  console.error(`FAIL: ${errors.length} problem(s) in ${path}:`);
  for (const m of errors) console.error("  - " + m);
  process.exit(1);
}
console.log(`OK: ${entries.length} entr${entries.length === 1 ? "y" : "ies"}, schema valid (${path})`);
