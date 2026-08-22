// scripts/gen-sitemap.mjs — walk dist/**/index.html and rebuild
// public/sitemap.xml. Run after `npm run build`.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const dist = path.join(root, "dist");
const base = "https://derrickmo.github.io";

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else if (e.name === "index.html") acc.push(full);
  }
  return acc;
}

const files = walk(dist).map(f => {
  let rel = path.relative(dist, path.dirname(f)).replace(/\\/g, "/");
  if (rel === "") return "/";
  return "/" + rel + "/";
}).sort();

function priority(u) {
  if (u === "/") return "1.0";
  if (/^\/(about|cases|learn|play|visualize|research|work|concepts)\/$/.test(u)) return "0.8";
  return "0.6";
}

let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
for (const u of files) {
  xml += `  <url><loc>${base}${u}</loc><priority>${priority(u)}</priority></url>\n`;
}
xml += `</urlset>\n`;
fs.writeFileSync(path.join(root, "public", "sitemap.xml"), xml, "utf8");
console.log(`wrote public/sitemap.xml — ${files.length} urls`);
