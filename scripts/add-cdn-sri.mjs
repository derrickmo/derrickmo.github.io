// add-cdn-sri.mjs — put subresource-integrity hashes on the jsDelivr tags (PF-0003).
//
// KaTeX and Prism are version-pinned but shipped with no `integrity`, so a compromised
// or hijacked CDN could serve altered script to every reader. The tags are duplicated
// across hundreds of static HTML files, so this does it mechanically and idempotently.
//
// It also unifies KaTeX on one version: the static tags pinned 0.16.10 while chrome.jsx's
// lazy loader pinned 0.16.11, so which version a reader got depended on whether the page
// had a static tag. Both now use 0.16.11.
//
// SRI on a cross-origin resource REQUIRES crossorigin="anonymous" — without it the browser
// cannot check the hash and blocks the resource. The Prism tags did not have it.
//
// Run:  node scripts/add-cdn-sri.mjs [--check]
//   --check reports what would change and exits 1 if anything would, for CI.
//
// Regenerating a hash after a version bump (compute it, never paste one):
//   curl -sL <url> | openssl dgst -sha384 -binary | openssl base64 -A
// A wrong hash makes the browser refuse the resource, so verify a built page in a browser.

import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");

const SRI = {
  "katex@0.16.11/dist/katex.min.css": "sha384-nB0miv6/jRmo5UMMR1wu3Gz6NLsoTkbqJghGIsx//Rlm+ZU03BU6SQNC66uf4l5+",
  "katex@0.16.11/dist/katex.min.js": "sha384-7zkQWkzuo3B5mTepMUcHkMB5jZaolc2xDwL6VFqjFALcbeS9Ggm/Yr2r3Dy4lfFg",
  "prismjs@1.29.0/themes/prism-tomorrow.min.css": "sha384-wFjoQjtV1y5jVHbt0p35Ui8aV8GVpEZkyF99OXWqP/eNJDU93D3Ugxkoyh6Y2I4A",
  "prismjs@1.29.0/prism.min.js": "sha384-BGaNxfftg+9+TtC098wxawPFVEUpKYvaiCgbB0iqAMjK/4jDdmUY+oGxrPNvnXEf",
  "prismjs@1.29.0/components/prism-python.min.js": "sha384-WJdEkJKrbsqw0evQ4GB6mlsKe5cGTxBOw4KAEIa52ZLB7DDpliGkwdme/HMa5n1m",
  "prismjs@1.29.0/components/prism-bash.min.js": "sha384-9WmlN8ABpoFSSHvBGGjhvB3E/D8UkNB9HpLJjBQFC2VSQsM1odiQDv4NbEo+7l15",
};

const files = execFileSync("git", ["-C", ROOT, "ls-files", "*.html"], { encoding: "utf8" })
  .split("\n").map((s) => s.trim()).filter(Boolean);

let changedFiles = 0, tagsTouched = 0, versionBumps = 0;

for (const rel of files) {
  const p = join(ROOT, rel);
  let html = readFileSync(p, "utf8");
  const before = html;

  // 0.16.10 -> 0.16.11 so both load paths agree
  const bumped = html.replace(/katex@0\.16\.10\//g, "katex@0.16.11/");
  if (bumped !== html) { versionBumps++; html = bumped; }

  for (const [path, hash] of Object.entries(SRI)) {
    // Match a whole <link>/<script> tag whose src/href is this exact resource.
    const re = new RegExp(`<(link|script)\\b([^>]*?)(https://cdn\\.jsdelivr\\.net/npm/${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})([^>]*?)>`, "g");
    html = html.replace(re, (tag, el, pre, url, post) => {
      if (/\bintegrity=/.test(pre + post)) return tag;      // already done — idempotent
      let attrs = `${pre}${url}${post}`;
      // A self-closing tag ends in " /" — that slash has to stay LAST, or appending an
      // attribute after it produces `... / integrity="..."`, which is malformed.
      const selfClosing = /\/\s*$/.test(attrs);
      attrs = attrs.replace(/\s*\/?\s*$/, "");
      let extra = ` integrity="${hash}"`;
      if (!/\bcrossorigin=/.test(attrs)) extra += ` crossorigin="anonymous"`;
      tagsTouched++;
      return `<${el}${attrs}${extra}${selfClosing ? " /" : ""}>`;
    });
  }

  if (html !== before) {
    changedFiles++;
    if (!CHECK) writeFileSync(p, html, "utf8");
  }
}

console.log(`${CHECK ? "[check] " : ""}files ${CHECK ? "needing change" : "updated"}: ${changedFiles}  ·  tags given integrity: ${tagsTouched}  ·  katex 0.16.10->0.16.11 in ${versionBumps} files`);
if (CHECK && changedFiles) { console.error("CDN tags are missing SRI — run: node scripts/add-cdn-sri.mjs"); process.exit(1); }
