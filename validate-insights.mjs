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
//   - exactly the three sections, in order, each with a non-empty intro
//   - every section item has whatsNew / howItWorks / impact + a primary http(s) source
//   - watching items (if present) have text + source

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const path = process.argv[2]
  ? process.argv[2]
  : fileURLToPath(new URL("./weekly-insights.js", import.meta.url));

const REQUIRED_SECTIONS = ["// ACADEMIC RESEARCH", "// INDUSTRY PRACTICES", "// NEW FRAMEWORKS"];
const MAX_ENTRIES = 12;

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

function validateItem(it, where) {
  if (!it || typeof it !== "object") return err(`${where}: not an object`);
  for (const f of ["whatsNew", "howItWorks", "impact"]) {
    if (!nonEmpty(it[f])) err(`${where}: missing or empty ${f}`);
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
  const headers = e.sections.map((s) => s && s.header);
  const orderOk =
    e.sections.length === REQUIRED_SECTIONS.length &&
    REQUIRED_SECTIONS.every((h, k) => headers[k] === h);
  if (!orderOk) {
    err(`${w}: sections must be exactly [${REQUIRED_SECTIONS.join(", ")}] in order, got [${headers.join(", ")}]`);
  }
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
