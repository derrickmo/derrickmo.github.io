#!/usr/bin/env node
// audit-headings.mjs — keep the document outline from silently regressing.
//
// Why this exists: for a long time the concept templates rendered every section
// name as a styled <span> mono label, so 155 sub-lesson pages and 187 concept hub
// pages were an <h1> followed by nothing at all. The whole toolchain was green the
// entire time — build, validate, parity, every audit — because no check had ever
// looked at heading structure. This is that check.
//
// It is a ratchet, not a classifier. Each page app records the heading levels it
// is known to render; the audit fails if one disappears. Adding headings always
// passes. That deliberately avoids guessing which mono labels "should" be
// headings — plenty of them are legitimately controls, card eyebrows and stat
// captions, and an audit that nagged about those would be noise.
//
// Run: node scripts/audit-headings.mjs   (part of `npm run audit`)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// file -> heading levels it must keep rendering.
// Derived from the state after the 2026-08-27 outline sweep. Raise these when a
// page gains structure; never lower one to make the audit pass.
const BASELINE = {
  "about-app.jsx": ["h1", "h2"],
  "cases-app.jsx": ["h1", "h2", "h3"],
  "chrome.jsx": ["h2"],
  "concept-app.jsx": ["h1", "h2"],
  "concept-lesson-app.jsx": ["h1", "h2"],
  "concept-map-app.jsx": ["h1", "h3"],
  "concepts-app.jsx": ["h1", "h2"],
  "demo-chrome.jsx": ["h1"],
  "games-app.jsx": ["h1", "h2", "h3"],
  "genai-course-app.jsx": ["h1", "h2"],
  "hf-hub-app.jsx": ["h1", "h2", "h3"],
  "hf-section-app.jsx": ["h1", "h2"],
  "interview-app.jsx": ["h1"],
  "landing-app.jsx": ["h1", "h2", "h3"],
  "learn-app.jsx": ["h1", "h2", "h3"],
  "learn-hub-app.jsx": ["h1", "h3"],
  "lesson-app.jsx": ["h1", "h2", "h3", "h4"],
  "module-app.jsx": ["h1", "h2"],
  "notes-app.jsx": ["h1", "h2"],
  "path-app.jsx": ["h1", "h2"],
  "path-builder-app.jsx": ["h1"],
  "paths-hub-app.jsx": ["h1", "h3"],
  "pitfalls-app.jsx": ["h1"],
  "playground-app.jsx": ["h1"],
  "research-app.jsx": ["h1", "h2", "h3"],
  "visualize-app.jsx": ["h1", "h2", "h3"],
  "weekly-insights-app.jsx": ["h1", "h2", "h3"],
  "work-app.jsx": ["h1", "h3"],
};

const errors = [];
const notes = [];

// ── 1. every page app still renders an h1 ────────────────────────────────────
// chrome.jsx is the shared nav/footer and kc-mount.jsx is a mount helper; neither
// owns a page, so neither owes an h1.
const NO_H1_OK = new Set(["chrome.jsx", "kc-mount.jsx"]);

const apps = fs
  .readdirSync(ROOT)
  .filter((f) => f.endsWith(".jsx"))
  .sort();

const has = (src, tag) => src.includes("<" + tag + " ") || src.includes("<" + tag + ">");

// Comments in this repo talk about markup ("the page is an <h1> and then nothing"),
// which both checks below would otherwise read as markup. Blank full-line comments
// with equal-length spaces so offsets — and therefore reported line numbers — hold.
const readSource = (f) =>
  fs
    .readFileSync(path.join(ROOT, f), "utf8")
    .split("\n")
    .map((line) => (/^\s*\/\//.test(line) ? " ".repeat(line.length) : line))
    .join("\n");

for (const f of apps) {
  const src = readSource(f);
  if (!NO_H1_OK.has(f) && !has(src, "h1")) {
    errors.push(f + ": renders no <h1> — every page needs one");
  }
}

// ── 2. the ratchet ───────────────────────────────────────────────────────────
for (const [f, levels] of Object.entries(BASELINE)) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) {
    notes.push(f + ": in the baseline but no longer on disk — drop it from BASELINE");
    continue;
  }
  const src = readSource(f);
  for (const lv of levels) {
    if (!has(src, lv)) {
      errors.push(f + ": lost its <" + lv + "> — a section name moved back out of a heading?");
    }
  }
}

for (const f of apps) {
  if (BASELINE[f] || NO_H1_OK.has(f)) continue;
  notes.push(f + ": new page app, not in BASELINE — add it once its structure settles");
}

// ── 3. "//" inside a heading must be marked decorative ───────────────────────
// The mono labels read "// THE MATH". The slashes are ornament; left unmarked a
// screen reader announces them. The convention is <span aria-hidden="true">// </span>.
const HEAD_OPEN = /<(h[1-6])\b[^>]*>/g;
for (const f of apps) {
  const src = readSource(f);
  let m;
  HEAD_OPEN.lastIndex = 0;
  while ((m = HEAD_OPEN.exec(src))) {
    const after = src.slice(m.index + m[0].length, m.index + m[0].length + 160);
    const upToClose = after.split("</" + m[1] + ">")[0];
    if (!upToClose.includes("//")) continue;
    // fine if the slashes live inside an aria-hidden span, or come from data
    // that the template strips (the startsWith("// ") branch).
    const decorated = /aria-hidden="true"[^>]*>\s*\/\//.test(upToClose);
    const fromData = upToClose.includes("startsWith");
    if (!decorated && !fromData) {
      const line = src.slice(0, m.index).split("\n").length;
      errors.push(f + ":" + line + ": <" + m[1] + '> contains an undecorated "//" — wrap it in <span aria-hidden="true">');
    }
  }
}

// ── report ───────────────────────────────────────────────────────────────────
for (const n of notes) console.log("[note] " + n);
if (errors.length) {
  console.error("");
  for (const e of errors) console.error("  " + e);
  console.error("\n" + errors.length + " heading problem(s).");
  process.exit(1);
}
console.log(
  "OK — " +
    Object.keys(BASELINE).length +
    " page apps keep their heading levels, and no heading reads its slashes aloud."
);
