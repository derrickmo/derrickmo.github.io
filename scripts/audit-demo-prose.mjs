#!/usr/bin/env node
// Demo + game explainer copy: three rules, all of which started as real defects.
//
//  1. JSX JOINS. A newline sitting next to an inline tag is DELETED by JSX, not
//     collapsed to a space, so `<b>Adam</b>\ncombines` renders "Adamcombines".
//     54 of these shipped. Fix by ending the line with {" "}.
//  2. EM-DASHES in reader-facing copy. House voice is short direct sentences.
//     The standalone "—" placeholder in a stat readout is NOT copy and is exempt.
//  3. BULLET WIDTH. At most three <DemoLI> per <DemoUL> level; nest beyond that.
//     A longer list is a paragraph nobody has edited yet.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const files = [];
for (const dir of ["demos", "games"])
  for (const f of readdirSync(join(ROOT, dir))) if (f.endsWith(".jsx")) files.push(join(dir, f));

const joins = [], dashes = [], wide = [];

for (const rel of files) {
  const src = readFileSync(join(ROOT, rel), "utf8");
  const lines = src.split("\n");

  // ── 1. joins ────────────────────────────────────────────────────────────
  for (let i = 0; i < lines.length - 1; i++) {
    const a = lines[i].replace(/\s+$/, ""), b = lines[i + 1].replace(/^\s+/, "");
    if (!a || !b) continue;
    const close = a.match(/<(b|i|strong|em|code)(?:\s[^>]*)?>([^<]*)<\/\1>$/);
    const open = b.match(/^<(b|i|strong|em|code)(?:\s[^>]*)?>([^<]*)<\/\1>/);
    if (close && /[A-Za-z0-9)%.]$/.test(close[2]) && /^[A-Za-z0-9]/.test(b))
      joins.push(`${rel}:${i + 1}  ...${close[2].slice(-14)}|${b.slice(0, 14)}...`);
    if (open && /[A-Za-z0-9]$/.test(a) && /^[A-Za-z0-9]/.test(open[2]))
      joins.push(`${rel}:${i + 1}  ...${a.slice(-14)}|${open[2].slice(0, 14)}...`);
  }

  // ── 2. em-dashes in copy ────────────────────────────────────────────────
  lines.forEach((ln, i) => {
    // strip a whole-line source comment and the empty-value placeholder glyph
    const stripped = ln.replace(/^\s*\/\/.*$/, "").replace(/"—"/g, '""');
    // count OCCURRENCES, not lines: a line can carry two and the first version
    // of this check reported 1090 where the real number was 1162.
    for (let k = 0; k < (stripped.match(/—/g) || []).length; k++)
      dashes.push(`${rel}:${i + 1}  ${ln.trim().slice(0, 74)}`);
  });

  // ── 3. bullet width ─────────────────────────────────────────────────────
  // Count <DemoLI> at each <DemoUL> depth by walking the tags in order.
  const stack = [];
  for (const m of src.matchAll(/<(\/?)Demo(UL|LI)\b/g)) {
    const closing = m[1] === "/", kind = m[2];
    if (kind === "UL") { if (closing) { const top = stack.pop(); if (top && top.n > 3) wide.push(`${rel}  a DemoUL holds ${top.n} items (max 3)`); } else stack.push({ n: 0 }); }
    else if (!closing && stack.length) stack[stack.length - 1].n++;
  }
}

const say = (name, rows, cap) => {
  if (!rows.length) return 0;
  console.log(`\n${name} (${rows.length})`);
  for (const r of rows.slice(0, cap)) console.log("  " + r);
  if (rows.length > cap) console.log(`  … ${rows.length - cap} more`);
  return rows.length;
};

const strict = process.argv.includes("--strict");
say("JSX joins - words glued together in the rendered page", joins, 20);
say("em-dashes in reader-facing copy", dashes, 12);
say("bullet lists wider than three items", wide, 12);

console.log(`\ndemo prose: ${files.length} files · joins ${joins.length} · em-dashes ${dashes.length} · wide lists ${wide.length}`);
// Joins and wide lists always fail. Em-dashes fail only under --strict while the
// rewrite is in progress, so the check is useful before the backlog is finished.
const hard = joins.length + wide.length;
if (hard || (strict && dashes.length)) { console.log("FAIL"); process.exit(1); }
console.log("OK — no glued words and no over-wide bullet lists.");
