#!/usr/bin/env node
// audit-jsx-braces.mjs — catch prose that accidentally became a JavaScript expression.
//
// Why this exists: a lesson wrote about prompt templates and said
//
//     Swap "a photo of a {label}" for "a blurry photo of a {label}"
//
// In JSX those braces are an EXPRESSION, not text. It compiled without a murmur and threw
// `ReferenceError: label is not defined` at render, so /learn/multimodal/clip/ served a
// completely blank page. The build cannot catch this — a reference to an undefined variable
// is perfectly legal JavaScript, and this repo's whole architecture is window globals, so a
// bare identifier really might be defined elsewhere.
//
// The rule that separates prose from code with no guessing: an identifier that appears in a
// file ONLY inside JSX-text braces, and nowhere else in that file, cannot be a variable. A
// real variable is declared, imported, destructured or assigned somewhere. Prose is not.
//
// Run: node scripts/audit-jsx-braces.mjs   (part of `npm run audit`)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const DIRS = ["", "demos", "lessons", "components"];
const files = [];
for (const d of DIRS) {
  const full = path.join(ROOT, d);
  if (!fs.existsSync(full)) continue;
  for (const f of fs.readdirSync(full)) {
    if (f.endsWith(".jsx")) files.push(path.join(full, f));
  }
}

// Blank out regions where braces are NOT JSX expressions, padding with spaces so that
// offsets — and therefore reported line numbers — stay honest.
const blank = (s) => " ".repeat(s.length);
function stripNonJsx(src) {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    // line comment
    if (ch === "/" && src[i + 1] === "/") {
      const end = src.indexOf("\n", i);
      const stop = end === -1 ? src.length : end;
      out += blank(src.slice(i, stop));
      i = stop;
      continue;
    }
    // block comment
    if (ch === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      const stop = end === -1 ? src.length : end + 2;
      out += src.slice(i, stop).replace(/[^\n]/g, " ");
      i = stop;
      continue;
    }
    // template literal — braces inside are literal text unless ${}
    if (ch === "`") {
      let j = i + 1;
      while (j < src.length && !(src[j] === "`" && src[j - 1] !== "\\")) j++;
      out += src.slice(i, j + 1).replace(/[^\n]/g, " ");
      i = j + 1;
      continue;
    }
    // Quotes are deliberately NOT handled. Whether a quote opens a JS string or is just a
    // character in JSX prose cannot be decided without a real parser, and two attempts at a
    // context rule both went wrong in ways that mattered:
    //   - blanking every quoted run hid the motivating bug, which was written
    //     "a photo of a {label}" — the check went silent on its own example;
    //   - keying off the preceding character mis-read the CLOSING quote of
    //     "how do I reduce overfitting?" as an opening one, because a '?' before a quote
    //     looks exactly like a ternary. That swallowed three lines of multi-query.jsx and
    //     deleted the binding that made {v} legitimate.
    // Instead, JSX text is located structurally below (a '>' … '<' span), which needs no
    // knowledge of quotes at all.
    out += ch;
    i++;
  }
  return out;
}

// {"{label}"} is the correct way to write literal braces in JSX — it is the fix this check
// recommends. Since quotes are no longer stripped, the inner {label} would otherwise be read
// as a bare expression and the check would flag its own remedy. Blank the whole construct,
// preserving length so line numbers stay honest.
const escapeHatch = (s) =>
  s.replace(/\{\s*"(?:[^"\\]|\\.)*"\s*\}/g, (m) => m.replace(/[^\n]/g, " "))
   .replace(/\{\s*'(?:[^'\\]|\\.)*'\s*\}/g, (m) => m.replace(/[^\n]/g, " "));

// Globals the window-architecture legitimately supplies, plus JS builtins.
const KNOWN = new Set(["window", "document", "console", "navigator", "location", "undefined", "null", "true", "false"]);

// Is `id` bound anywhere in this (comment/string/template-stripped) source? Covers the
// shapes this codebase actually uses: declarations, function and arrow parameters, object
// and array destructuring, for-of heads, catch clauses and plain assignment.
function isBound(src, id) {
  const b = "\\b" + id + "\\b";
  const pats = [
    "\\b(?:const|let|var|function|class)\\s+" + b,          // const x / function x
    "\\bfunction\\s*[\\w$]*\\s*\\([^)]*" + b,               // function f(x)
    "\\([^()]*" + b + "[^()]*\\)\\s*=>",                    // (x, i) => …
    b + "\\s*=>",                                           // x => …
    "\\{[^{}]*" + b + "[^{}]*\\}\\s*(?:=|\\)|,|=>)",        // { x } = … or ({ x }) =>
    "\\[[^\\]]*" + b + "[^\\]]*\\]\\s*=",                   // [x] = …
    "\\bcatch\\s*\\(\\s*" + b,                              // catch (x)
    "\\bfor\\s*\\(\\s*(?:const|let|var)?\\s*" + b,          // for (const x of …)
    b + "\\s*=[^=>]",                                       // x = … (not == or =>)
  ];
  return pats.some((p) => new RegExp(p).test(src));
}

// `--dump <file>` prints the stripped source with line numbers. The stripping is the part
// of this check most likely to be wrong, and reading its output is the fastest way to see
// why a hit fired or did not.
const dumpIdx = process.argv.indexOf("--dump");
if (dumpIdx !== -1 && process.argv[dumpIdx + 1]) {
  const target = path.resolve(ROOT, process.argv[dumpIdx + 1]);
  const stripped = stripNonJsx(fs.readFileSync(target, "utf8"));
  stripped.split("\n").forEach((l, i) => console.log(String(i + 1).padStart(4) + " | " + l));
  process.exit(0);
}

const problems = [];
let scanned = 0;

for (const file of files) {
  const raw = fs.readFileSync(file, "utf8");
  const src = escapeHatch(stripNonJsx(raw));
  scanned++;

  // `{ident}` has three very different meanings depending on what surrounds it, and only
  // one of them is a JSX text expression:
  //   foo={ident}            an attribute value          -> preceded by '='
  //   function P({ children })  a destructured parameter  -> preceded by '(' or ',',
  //                                                          followed by ')' or ','
  //   const { Section } = window   destructured binding    -> followed by '='
  //   ...text {ident} text...   THE ONE WE WANT
  // Counting occurrences cannot separate these: a destructured parameter is textually
  // identical to the thing we are hunting, which is exactly how this check's own first
  // run produced four false positives on `function P({ children })`.
  // JSX text is what sits between a tag's '>' and the next '<'. Attribute values never
  // qualify (they live before the '>'), and neither does ordinary JS, which is what makes
  // this a structural test rather than a guess about punctuation.
  const jsxText = [];
  const idRe = /\{\s*([a-z][A-Za-z0-9_]*)\s*\}/g;
  let gt = src.indexOf(">");
  while (gt !== -1) {
    const lt = src.indexOf("<", gt + 1);
    if (lt === -1) break;
    const region = src.slice(gt + 1, lt);
    idRe.lastIndex = 0;
    let m;
    while ((m = idRe.exec(region))) {
      if (KNOWN.has(m[1])) continue;
      jsxText.push({ id: m[1], index: gt + 1 + m.index });
    }
    gt = src.indexOf(">", lt + 1);
  }

  for (const hit of jsxText) {
    // Ask whether the identifier is actually BOUND, not merely whether the word appears.
    // "Appears elsewhere in the file" is not good enough: clip.jsx discusses labels in
    // prose ("a fixed label set"), and that made the real {label} bug look like a variable.
    // Binding patterns are matched against the stripped source, so prose and comments
    // cannot satisfy them.
    if (isBound(src, hit.id)) continue;

    const line = src.slice(0, hit.index).split("\n").length;
    problems.push(
      path.relative(ROOT, file).replace(/\\/g, "/") + ":" + line +
      `: {${hit.id}} in JSX text is an expression, and ${hit.id} is defined nowhere in this file — ` +
      `the page will throw at render. Write {"{${hit.id}}"} for literal braces.`
    );
  }
}

if (problems.length) {
  console.error("");
  for (const p of problems) console.error("  " + p);
  console.error("\n" + problems.length + " JSX brace problem(s).");
  process.exit(1);
}
console.log("OK — " + scanned + " jsx files: no prose accidentally parsed as an expression.");
