#!/usr/bin/env node
// audit-window-globals.mjs — guards PF-0020, the defect class that has blanked three
// pages on this site.
//
// THE BUG: a page's `.jsx`/`.js` files talk to each other through `window` side effects
// and are loaded as separate <script type="module"> tags in DOM order. Vite BUNDLES them
// and orders execution by the IMPORT graph, and these files import nothing from each
// other. So capturing a sibling-set global in a module-scope const is a bet on an
// ordering nobody controls -- and the bet loses whenever a file's SHARING pattern
// changes, because that is what moves it between a shared chunk and a page entry chunk.
//
// It has lost three times: lesson bodies going per-lesson, the concept index going
// per-concept, and concept-paths.js being renamed -- each time silently, with a page
// rendering its nav and nothing else, and every other check green.
//
// THE RULE: read a sibling-set global at USE time, not at module scope.
//     const curr = () => window.CURRICULUM;      // yes
//     const CURR = window.CURRICULUM;            // no
//
// NOT flagged: the __DM_* family, which an inline <script> in each page's <head> sets.
// Inline scripts run before every module script, so those captures are safe by
// construction.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKIP = new Set(["node_modules", "dist", ".git", ".gen-out", "_review", "_expansion",
                      "_private", "content", "scripts", "tools", "public"]);

// Known, deliberate exceptions: module scope, but GUARDED, so an unlucky order degrades
// the page instead of throwing. Converting them would mean renaming a token that also
// appears as literal JSX display text. Reviewed 2026-09-03; see CLAUDE.md.
const ALLOW = new Set([
  "module-app.jsx:LECTURES",
  "module-app.jsx:lectureFolder",
  "module-app.jsx:LECTURES_REPO",
]);

const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    if (SKIP.has(f)) continue;
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(jsx|js)$/.test(f)) files.push(p);
  }
})(ROOT);

// who PRODUCES each global
const producedBy = new Map();
const note = (g, f) => { if (!producedBy.has(g)) producedBy.set(g, new Set()); producedBy.get(g).add(f); };
for (const f of files) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=/g)) note(m[1], f);
  for (const m of src.matchAll(/Object\.assign\(\s*window\s*,\s*\{([^}]*)\}/g))
    for (const k of m[1].split(",")) {
      const n = k.split(":")[0].trim();
      if (/^[A-Za-z_$][\w$]*$/.test(n)) note(n, f);
    }
}

// module-scope captures (depth 0 declarations that are not arrow-function getters)
const findings = [];
for (const f of files) {
  const rel = relative(ROOT, f).split("\\").join("/");
  const base = rel.split("/").pop();
  let depth = 0, inBlock = false;
  readFileSync(f, "utf8").split("\n").forEach((raw, i) => {
    let line = raw;
    if (inBlock) { if (!line.includes("*/")) return; inBlock = false; line = line.slice(line.indexOf("*/") + 2); }
    if (line.includes("/*") && !line.includes("*/")) inBlock = true;
    const noStr = line.replace(/"[^"]*"|'[^']*'|`[^`]*`/g, '""');
    const code = noStr.split("//")[0];
    if (depth === 0 && /^(const|let|var)\s/.test(code.trim()) && !/=>/.test(code)) {
      for (const m of code.matchAll(/window\.([A-Za-z_$][\w$]*)/g)) {
        const g = m[1];
        if (g.startsWith("__DM_")) continue;
        const prod = producedBy.get(g);
        if (!prod) continue;
        if ([...prod].every((p) => p === f)) continue;      // only this file sets it
        if (ALLOW.has(`${base}:${g}`)) continue;
        findings.push({ rel, line: i + 1, g, text: raw.trim().slice(0, 92) });
      }
    }
    for (const ch of code) { if (ch === "{" || ch === "(") depth++; else if (ch === "}" || ch === ")") depth--; }
    if (depth < 0) depth = 0;
  });
}

console.log(`window globals: scanned ${files.length} files, ${producedBy.size} globals produced, ${ALLOW.size} reviewed exception(s)`);
if (findings.length) {
  console.log(`\n${findings.length} module-scope capture(s) of a sibling-set global (PF-0020):`);
  for (const f of findings) console.log(`  ✗ ${f.rel}:${f.line}  window.${f.g}\n      ${f.text}`);
  console.log("\n  Fix: read at use — const x = () => window.X;  (see CLAUDE.md PF-0020)");
  process.exit(1);
}
console.log("OK — no page app captures a sibling-set window global at module scope.");
