#!/usr/bin/env node
// capture-thumbs.mjs — a one-shot local server for exporting demo thumbnails.
//
// APP-HANDOFF §2: "the app does NOT run the React demos; it shows a still + 'open interactive
// on web' deep link". §5's last unchecked box is that still-image set. Producing it needs a
// browser, because the images ARE the demos rendering — which is also why thumbnails are
// COMMITTED assets rather than a build step: CI has no browser, so a generated-in-CI thumb
// would be a permanently empty directory.
//
// This serves dist/ and accepts the captures back:
//   GET  /*                      static from dist/
//   GET  /_capture/list.json     the demo + game slugs to walk, from the registries
//   POST /_thumb/<slug>.webp     writes public/thumbs/<slug>.webp
//   POST /_done                  prints the tally and exits
//
// Run it, then drive it from a page on the SAME ORIGIN (see scripts/capture-thumbs.README
// in the header of the driver below). Nothing leaves this machine and no service is involved:
// the free-tier constraint holds, and the alternative — passing 200 base64 images through a
// tool response — would cost megabytes of context to achieve the same files.
//
// ⚠ The slug is validated against the registries before it becomes a path. A POST body naming
// "../../.gitignore" is exactly the kind of thing a local dev server is expected to shrug off.

import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join, dirname, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R = (p) => join(ROOT, p);
const DIST = R("dist");
const OUT = R("public/thumbs");
const PORT = Number(process.env.THUMB_PORT || 4181);

if (!existsSync(DIST)) { console.error("!! dist/ is missing — run `npm run build` first"); process.exit(1); }
mkdirSync(OUT, { recursive: true });

const readGlobals = (file) => { const w = {}; new Function("window", readFileSync(R(file), "utf8"))(w); return w; };
const { PLAY_DEMOS } = readGlobals("play-demos.js");
const { PLAY_GAMES } = readGlobals("play-games.js");
const targets = [
  ...PLAY_DEMOS.demos.map((d) => ({ slug: d.slug, url: `/visualize/${d.slug}/`, title: d.title })),
  ...(PLAY_GAMES?.games || []).map((g) => ({ slug: g.slug, url: `/play/${g.slug}/`, title: g.title })),
];
const allowed = new Set(targets.map((t) => t.slug));

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2", ".txt": "text/plain",
};

let saved = 0, skipped = 0, bytes = 0;
const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const send = (code, body, type = "application/json") => { res.writeHead(code, { "content-type": type }); res.end(body); };

  if (req.method === "GET" && url.pathname === "/_capture/list.json") {
    return send(200, JSON.stringify({ targets, existing: targets.filter((t) => existsSync(join(OUT, t.slug + ".webp"))).map((t) => t.slug) }));
  }

  if (req.method === "POST" && url.pathname.startsWith("/_thumb/")) {
    const name = decodeURIComponent(url.pathname.slice("/_thumb/".length));
    const slug = name.replace(/\.webp$/, "");
    if (!allowed.has(slug)) { console.log(`  refused "${name}" — not a registered slug`); return send(400, JSON.stringify({ ok: false, reason: "unknown slug" })); }
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const buf = Buffer.concat(chunks);
      if (buf.length < 400) { skipped++; console.log(`  skip ${slug} (${buf.length} B — blank or failed)`); return send(200, JSON.stringify({ ok: false, reason: "too small" })); }
      writeFileSync(join(OUT, slug + ".webp"), buf);
      saved++; bytes += buf.length;
      console.log(`  ${String(saved).padStart(3)} ${slug.padEnd(28)} ${(buf.length / 1024).toFixed(1)} KB`);
      send(200, JSON.stringify({ ok: true, bytes: buf.length }));
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/_done") {
    send(200, JSON.stringify({ saved, skipped }));
    console.log(`\ncaptured ${saved} thumbnails, ${(bytes / 1024 / 1024).toFixed(2)} MB total, avg ${(bytes / Math.max(1, saved) / 1024).toFixed(1)} KB · ${skipped} skipped`);
    console.log("next: node scripts/build-app-bundle.mjs   (the bundle picks up whatever exists)");
    setTimeout(() => process.exit(0), 120);
    return;
  }

  // static from dist/, with the path normalised so nothing escapes it
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith("/")) rel += "index.html";
  const p = join(DIST, normalize(rel).replace(/^(\.\.[/\\])+/, ""));
  if (!p.startsWith(DIST) || !existsSync(p) || statSync(p).isDirectory()) return send(404, "not found", "text/plain");
  res.writeHead(200, { "content-type": MIME[extname(p)] || "application/octet-stream" });
  res.end(readFileSync(p));
});

server.listen(PORT, () => {
  console.log(`thumb capture server on http://localhost:${PORT}`);
  console.log(`  ${targets.length} targets · writing to public/thumbs/`);
  console.log(`  open http://localhost:${PORT}/ and run the capture driver from the console`);
});
